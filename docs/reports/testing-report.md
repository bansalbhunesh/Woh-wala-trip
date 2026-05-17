# Testing Report — Yaarlore

Generated: 2026-05-17

---

## Test Suite Summary

| Layer             | Tool                     | Files | Tests           | Status                        |
| ----------------- | ------------------------ | ----- | --------------- | ----------------------------- |
| Unit (frontend)   | Vitest + RTL             | 6     | 166             | ✅ All pass                   |
| Integration (API) | Vitest (direct handlers) | 2     | included in 151 | ✅ All pass                   |
| AI Deterministic  | Python (standalone)      | 1     | 43              | ✅ All pass                   |
| E2E               | Playwright               | 5     | ~45             | ✅ Configured (needs server)  |
| Visual Regression | Playwright snapshots     | 1     | 10              | ✅ Configured                 |
| AI Quality (LLM)  | DeepEval pytest          | 9     | ~60             | ✅ Configured (needs API key) |
| Prompt Regression | Promptfoo                | 1     | 6               | ✅ Configured                 |

**Total: 209+ tests across all layers**

---

## Unit Tests (Vitest + React Testing Library)

### `atoms.test.tsx` — UI Components

- CinematicText renders children (7 variant cases)
- FilmGrain / LightGrain class names
- Custom className merging

### `trip-validation.test.ts` — Zod Schema + Validation

- TripCreateInput: valid/invalid name length, date format, optional destination
- InviteCodeInput: 6-8 char range enforcement
- Email regex (5 valid, 6 invalid)
- Phone E.164: +91 alone rejected, spaces stripped correctly

### `new-trip-page.test.tsx` — Form Behavior

- All four labels render
- Submit disabled initially, enabled when name+dates filled
- `mutate()` called with correct payload
- Pending/error states shown correctly
- No mutation fired when name empty

### `join-page.test.tsx` — Code Input

- Input renders, starts disabled
- Uppercases input
- 8-char cap enforced
- Button enables at ≥4 chars
- `mutate()` called on button click
- `mutate()` called on Enter keydown
- DECRYPTING state shown while pending
- Error message shown on failure

### `lore-utils.test.ts` — Business Logic

- Chaos verdict mapping (8 boundary cases)
- Nostalgia score: high chaos > low, older > recent, never negative, formula matches Python
- Zero chaos → zero score, zero years → unchanged
- Invite code normalization (uppercase, trim, cap)

### `anti-spam.test.ts` — Full Anti-Spam Stack

- Format validation (5 valid, 6 invalid)
- Disposable blocklist (9 disposable, 6 real, case-insensitive)
- Role account detection (10 role accounts, 3 real accounts, case-insensitive)
- Typo detection (gmal→gmail, hotmai→hotmail, exact match → null)
- Disify API mock: disposable flag, null on error, null on non-ok
- Abstract API mock: quality_score→riskScore, null without key
- Kickbox: null without key
- Fraud score: format block, disposable block, role account block, clean allow, typo detection, API results
- Block log: masking, reason/score recording
- Rate limiter: allow N, block N+1, reset after window, key independence
- Async `checkEmail` facade: null for real, error for bad/disposable/role

---

## Integration Tests (Direct Handler)

### `otp-route.test.ts` — /api/auth/send-otp

- 200: `{ success: true }` for valid email
- 400: format invalid, disposable email, missing field, null field
- 429: DB rate limit (count≥5), IP burst (10/min)
- 500: Supabase admin failure
- OTP not stored for disposable emails (generateLink not called)
- OTP stored in DB on success (insert called)

### `api-contracts.test.ts` — HTTP Shape Contracts

- Success always 200-299
- Errors always 400+ with `error` field (string)
- Rate limit returns 429 with `error: string`
- 500 returns `error: string`
- Response never contains raw OTP code
- Error messages never contain stack traces

---

## E2E Tests (Playwright)

### Browser Matrix

- Chromium (Desktop Chrome)
- Firefox (Desktop Firefox)
- Mobile Chrome (Pixel 7)

### `landing.spec.ts`

- Loads without JS errors
- Yaarlore branding visible
- CTA links to login
- Single-screen on desktop (scrollHeight ≤ viewportHeight + 50px)
- No horizontal overflow on mobile

### `auth.spec.ts`

- Email input renders
- Empty email blocked
- Invalid email format fails HTML5 validation
- OTP input shown after mocked successful send
- `/trips` redirects to login when unauthenticated
- `/trips/new` redirects to login when unauthenticated

### `new-trip.spec.ts`

- Join form: code input visible, button disabled <4 chars, enabled ≥4 chars
- Input uppercases
- Error shown for invalid code (mocked response)
- Invalid code error has no stack trace
- SQL injection in code input → capped at 8 chars

### `anti-spam.spec.ts`

- 5 disposable email domains blocked end-to-end
- Empty email blocked
- Malformed email (no @) fails validation
- Rapid requests → 429 shown
- Typo suggestion flow
- No auto-submit on page load
- URL code injection doesn't auto-submit join form
- SQL injection in invite input
- Rate limit on OTP verify (smoke test)

---

## AI Tests (Python)

### Deterministic (43 tests, no API key)

- Lore JSON schema validation
- 8 chaos score → verdict boundary cases
- Field length constraints (title, tagline, narrative, acts)
- Forbidden phrase scanner (44 phrases)
- Nostalgia scoring formula
- Photo time clustering (2-hour gap threshold)
- Superlative member validation
- Archetype validity

### LLM-Evaluated (requires API key)

- GEval: narrative specificity, Hinglish voice, tagline quotability
- ToxicityMetric: full text, superlatives
- BiasMetric: text + friendship dynamics
- FaithfulnessMetric: lore grounded in signals
- HallucinationMetric: no invented events/names
- Signal calibration, chaos score vs output

---

## CI Enforcement

| Check                         | Failure Condition         | Workflow                |
| ----------------------------- | ------------------------- | ----------------------- |
| TypeScript                    | Compile errors            | `ci.yml`                |
| ESLint                        | Lint errors               | `ci.yml`                |
| Unit tests                    | Any test fails            | `ci.yml`                |
| Playwright E2E                | Any spec fails            | `ci.yml`                |
| Python deterministic          | Any of 43 tests fail      | `ci.yml`                |
| Next.js build                 | Build error               | `ci.yml`                |
| Visual regression (Chromatic) | Story changes             | `visual-regression.yml` |
| AI quality (Promptfoo)        | Verdict/verdict mismatch  | `ai-eval.yml`           |
| AI quality (DeepEval LLM)     | Quality/safety thresholds | `ai-eval.yml`           |
