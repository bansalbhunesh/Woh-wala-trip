# Anti-Spam & Security Report — Yaarlore

Generated: 2026-05-17

---

## Threat Model

| Threat                       | Attack Vector                                            | Mitigation                                                        |
| ---------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------- |
| Disposable email signups     | Fake/throwaway email addresses                           | Blocklist (60+ domains) + 3 API providers                         |
| Role account signups         | System emails (admin@, noreply@) that can't receive OTPs | `isRoleAccount()` blocklist (30 prefixes) — fast-exit Layer 2.5   |
| OTP brute-force              | Rapid code guessing                                      | 5 attempts/15min DB limit + 10 req/min IP burst                   |
| Bot signups                  | Automated form submission                                | HTML5 required fields, no auto-submit, no honeypot needed         |
| Invite code brute-force      | Guessing 6-8 char codes                                  | Rate limit on joinByCode (tRPC level)                             |
| SQL injection via code input | Malicious string in invite code                          | Input capped to 8 chars, uppercased, no DB interpolation          |
| OTP leakage                  | OTP in API response                                      | Never returned in HTTP response, hashed in DB                     |
| Error info leakage           | Stack traces in 400 errors                               | All error messages are human-facing strings only                  |
| IP spoofing                  | X-Forwarded-For manipulation                             | Used as defense-in-depth only; DB rate limit is the primary guard |

---

## Anti-Spam Implementation

### Layer 1: Format Validation (instant, local)

```ts
/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
```

Blocks: empty, no-@, missing TLD, spaces in local part.

### Layer 2: Disposable Domain Blocklist (instant, local)

60+ domains hardcoded in `src/lib/anti-spam.ts`:

- mailinator.com, guerrillamail._, yopmail._, trashmail.\*
- 10minutemail.com, maildrop.cc, spam4.me, getnada.com
- mailsac.com, and 50+ more

**Trade-off**: Static list requires manual updates. Third-party APIs fill the gap.

### Layer 3: Domain Typo Detection (instant, local)

Levenshtein distance ≤2 against 12 common domains (gmail, outlook, yahoo, icloud, proton, fastmail, hey, rediffmail). Returns suggestion, does NOT block — allows users to self-correct.

### Layer 4: Third-Party API Validation (async, opt-in)

| Provider         | Auth Required      | Timeout | Blocks If                                                |
| ---------------- | ------------------ | ------- | -------------------------------------------------------- |
| **Disify**       | None (free)        | 3s      | `disposable: true`                                       |
| **Abstract API** | `ABSTRACT_API_KEY` | 4s      | `is_disposable_email.value: true` OR quality_score < 0.3 |
| **Kickbox**      | `KICKBOX_API_KEY`  | 5s      | `disposable: true` OR `result != "deliverable"`          |

All three run in parallel via `Promise.all`. Any single provider blocking → block the signup. API failures are silently swallowed (never throws).

### Layer 5: Composite Fraud Score (0-100)

```
fraudScore = 0
+ 100  if format invalid
+ 80   if disposableLocal
+ 80   if disposableApi
+ 0-40 based on average API risk scores (for borderline cases)

action:
  ≥70 → block
  ≥30 → warn (allow but flag)
  <30 → allow
```

### Layer 6: Rate Limiting

| Layer                | Limit      | Window           | Storage                    |
| -------------------- | ---------- | ---------------- | -------------------------- |
| IP burst (in-memory) | 10 req     | 1 min            | Process memory             |
| DB per-email OTP     | 5 sends    | 15 min           | Supabase `otp_codes` table |
| Verify OTP           | 5 attempts | per-OTP lifetime | OTP `used` flag            |

### Layer 7: Observability

All blocked events are traced to Langfuse via `traceSecurityEvent()`:

- `security:disposable_email` — fraud score, IP, signal breakdown
- `security:rate_limited` — IP, reason (ip_burst | db_otp_limit)
- `security:api_fraud_score` — full signal object

Also logged to console (`[anti-spam] blocked:`) for local debugging.

---

## Tests for Anti-Spam

### Unit tests (Vitest, `tests/unit/anti-spam.test.ts`)

| Test                                            | Count |
| ----------------------------------------------- | ----- |
| Format validation                               | 10    |
| Disposable blocklist (9 known domains + 6 real) | 16    |
| Typo detection                                  | 4     |
| Disify API mock                                 | 3     |
| Abstract API mock                               | 3     |
| Kickbox (no key)                                | 1     |
| Fraud score composition                         | 6     |
| Block log masking + recording                   | 3     |
| Rate limiter                                    | 4     |
| checkEmail async facade                         | 4     |

**Total: 54 anti-spam unit tests**

### Integration tests (`tests/integration/otp-route.test.ts`, `api-contracts.test.ts`)

- 200/400/429/500 shapes for all error conditions
- OTP not returned in response body
- Error messages never contain stack traces

### E2E tests (Playwright, `tests/e2e/anti-spam.spec.ts`)

- 5 disposable email domains blocked end-to-end
- Empty email blocked by HTML5 validation
- Malformed email (no @) blocked
- Rapid repeated requests → 429 shown in UI
- Domain typo suggestion flow
- Form does NOT auto-submit on page load (bot resistance)
- URL code injection does not auto-submit join form
- Invite code input ignores SQL injection (8-char cap)
- Error messages never expose stack traces

---

## Fraud-Scoring Architecture (Production-Ready Extension)

The current implementation is structured for easy extension to a full fraud scoring service:

```
computeFraudScore(email)
    ↓
FraudCheckResult {
    allowed: boolean,
    action: 'allow' | 'warn' | 'block',
    fraudScore: number (0-100),
    signals: {
        formatInvalid, disposableLocal, disposableApi,
        typoSuggestion, apiResults[]
    }
}
```

**To extend with additional signals**:

1. Add a new signal to `FraudCheckResult.signals`
2. Add weight to `fraudScore` calculation
3. Add corresponding test case

**Implemented signals**:

- ~~`isRoleAccount`~~ ✅ **Done** — Layer 2.5 in `anti-spam.ts`; blocks postmaster@, abuse@, noreply@, admin@, webmaster@, security@, billing@, etc. (30 role prefixes); fast-exit at fraudScore 80

**Recommended future signals**:

- `dnsVerified` — MX record check for the domain
- `ipReputation` — IP reputation API (Cloudflare, AbuseIPDB)
- `geoRisk` — High-risk country codes (needs legal review)
- `velocityScore` — N new signups from same IP in 24h

---

## Configuration

Set in `.env.local`:

```bash
ABSTRACT_API_KEY=your_key_here          # Abstract API (optional)
KICKBOX_API_KEY=your_key_here           # Kickbox (optional)
# Disify: no key needed — free API

LANGFUSE_PUBLIC_KEY=your_key_here       # Langfuse (optional)
LANGFUSE_SECRET_KEY=your_key_here
LANGFUSE_HOST=https://cloud.langfuse.com
```

When no third-party keys are configured: only the local blocklist + format check runs. No errors, no degraded UX.
