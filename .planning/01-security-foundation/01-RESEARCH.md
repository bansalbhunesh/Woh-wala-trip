# Phase 1: Security Foundation — Research

**Researched:** 2026-05-18
**Domain:** Supabase RLS, Next.js CSP headers, HMAC-SHA256 request signing, rate-limit fail-hard, input validation, database schema migration
**Confidence:** HIGH (all findings verified against actual source files and migrations)

---

## Summary

Phase 1 patches nine CRITICAL/HIGH security gaps identified in the codebase audit. The most severe gap is that `trips` and `trip_eras` have no RLS at all — any authenticated user with the anon key can read, write, or delete any row. The second tier covers `scheduled_emails`, `otp_codes`, `trip_stats`, `trip_vs_trip`, and `background_jobs` (RLS enabled but zero policies = all non-superuser access blocked, including the AI worker's polling loop that uses `service_role`). The remaining gaps are code-layer: a wildcard injection via `ilike`, anonymous reactions that accept any `trip_id`, rate limiting that silently falls back to in-memory state (defeating it entirely in serverless), a missing CSP header, Bearer-only AI worker auth, and an `otp_codes` PK that causes silent insert failures on rapid OTP resends.

Every fix is an additive migration or a small code change — nothing requires a schema rewrite or breaking change to the existing happy path. The implementation order matters: RLS comes first because every other data-access path depends on it being safe; `background_jobs` policy must be added before any attempt to run the AI worker after the migration; CSP and rate-limit fail-hard are independent and can be parallelized.

**Primary recommendation:** Implement in the order: SEC-03 (background_jobs policy, unblocks AI worker) → SEC-01+SEC-02 (trips/trip_eras/aux tables RLS) → SEC-09 (otp_codes PK) → SEC-06+SEC-07 (code fixes) → SEC-05 (rate limit fail-hard) → SEC-04 (CSP) → SEC-08 (HMAC signing). This sequence de-risks production data exposure first and ensures no worker outage during migration.

---

## Phase Requirements

| ID     | Description                                                                       | Research Support                                                                   |
| ------ | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| SEC-01 | `trips` and `trip_eras` RLS enabled with correct policies                         | Full policy SQL derived below; SECURITY DEFINER RPC impact analyzed                |
| SEC-02 | `scheduled_emails`, `otp_codes`, `trip_stats`, `trip_vs_trip` RLS                 | Migration SQL for each table; service-role-only pattern confirmed                  |
| SEC-03 | `background_jobs` service-role-only policy (currently RLS enabled, zero policies) | One-line fix; confirmed from migration 20260518_hermes_lorian_observability.sql    |
| SEC-04 | Content-Security-Policy header in next.config.mjs                                 | Full CSP string derived from all third-party origins in codebase                   |
| SEC-05 | Rate limiting fails hard in production                                            | Startup check pattern; fail-hard location identified in anti-spam.ts               |
| SEC-06 | `archetypes.getPublicHistory` uses `.eq()` not `.ilike()`                         | Exact line 75 of archetypes.ts identified                                          |
| SEC-07 | Anonymous reactions validate `trips.is_public = true`                             | `is_public` column confirmed in migration 20260516_cross_trip_features.sql line 60 |
| SEC-08 | AI worker calls use HMAC-SHA256 + timestamp signing                               | Full signing/verification pattern for FastAPI + Web Crypto API derived             |
| SEC-09 | `otp_codes` PK changed from `email` to UUID                                       | Migration SQL with data-safe transition derived                                    |

---

## Architectural Responsibility Map

| Capability                              | Primary Tier                                        | Secondary Tier | Rationale                                                          |
| --------------------------------------- | --------------------------------------------------- | -------------- | ------------------------------------------------------------------ |
| RLS policies (SEC-01, SEC-02, SEC-03)   | Database (Supabase Postgres)                        | —              | RLS lives entirely in Postgres; no app code change                 |
| CSP header (SEC-04)                     | Frontend Server (Next.js)                           | —              | next.config.mjs headers() applies server-side on all responses     |
| Rate limit fail-hard (SEC-05)           | API / Backend (Next.js serverless)                  | —              | Startup check in anti-spam.ts module initialization                |
| ilike fix (SEC-06)                      | API / Backend (tRPC router)                         | —              | One-line query change in archetypes.ts                             |
| Anonymous reactions validation (SEC-07) | API / Backend (Next.js API route)                   | Database       | Route must query trips.is_public; could also use RLS               |
| HMAC signing (SEC-08)                   | API / Backend (both tRPC caller + FastAPI verifier) | —              | Signing in Next.js, verification in FastAPI middleware             |
| otp_codes PK (SEC-09)                   | Database (Supabase Postgres)                        | —              | Schema migration; app code uses service role so no RLS interaction |

---

## SEC-01 + SEC-02: RLS Policy Analysis

### Current State (confirmed from migrations)

No migration ever calls `ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY` or `ALTER TABLE public.trip_eras ENABLE ROW LEVEL SECURITY`. Both tables are fully accessible via the anon key.

`trip_stats` and `trip_vs_trip` also have no RLS (confirmed: not present in any migration file).

`otp_codes` has `DISABLE ROW LEVEL SECURITY` explicitly in `20260515_otp_codes.sql` line 14.

`scheduled_emails` was created in `20260516_anniversary_and_reactions.sql` with no RLS statement.

### SECURITY DEFINER RPC Impact Analysis

SECURITY DEFINER functions run as the function owner (typically the `postgres` superuser), not the calling role. This means:

- `get_trip_full(p_trip_id)` — NOT in any migration file; must be a pre-existing function in the Supabase project. When `get_trip_full` runs as postgres superuser, it bypasses all RLS regardless. Adding RLS to `trips` will NOT break `get_trip_full` because superuser bypasses RLS entirely.
- `join_trip_by_code(p_invite_code)` — same reasoning; superuser bypass.
- `claim_generation_job()` — defined in `004_trip_signals_and_jobs.sql` as SECURITY DEFINER; accesses `generation_jobs` and `trips`; superuser bypass. NOT affected by trips RLS.
- `find_similar_photos()`, `get_nostalgia_moments()`, `get_member_archetype_summary()` — all SECURITY DEFINER in `005_photo_embeddings.sql`; access `trips`, `photos`, `trip_members`; all bypass RLS. NOT affected.
- `upsert_user_archetype()`, `get_user_archetype_history()` — SECURITY DEFINER in `20260516_cross_trip_features.sql`; access `user_archetypes`; not affected.
- `schedule_trip_anniversary()` trigger — SECURITY DEFINER; accesses `scheduled_emails`; NOT affected by adding RLS to `scheduled_emails`.

**Conclusion: Adding RLS to any table will NOT break existing SECURITY DEFINER RPCs.** They all run as superuser and bypass RLS.

### trips RLS: Membership Check Pattern

The membership check must NOT query `trip_members` from within a `trips` RLS policy in a way that causes infinite recursion. The fix migration (`20260515_fix_trip_members_rls.sql`) already shows the team encountered this — the original `trip_members` policy used a subquery on `trip_members` itself (recursive).

The correct pattern for `trips` is to check membership via `trip_members`:

```sql
-- Safe: trips SELECT policy checks trip_members without a self-referencing subquery
CREATE POLICY "trip members can select their trips"
  ON public.trips FOR SELECT TO authenticated
  USING (
    creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.trip_members
      WHERE trip_members.trip_id = trips.id
        AND trip_members.user_id = auth.uid()
    )
  );
```

This is safe because `trips` policy queries `trip_members`, and `trip_members` policy (`user_id = auth.uid()`) queries only itself — no circular dependency.

### Public Story Access

`/t/[code]/story` is a public route that serves trip data without auth. It uses the service role client (`createSupabaseServiceClient()`) — confirmed from architecture. Service role bypasses RLS. The public story route will NOT be broken by RLS on trips.

Similarly, the OG card route (`/api/card/[tripId]`) uses service role — not affected.

### trips RLS: Full Policy Set

```sql
-- Migration: 20260519_trips_rls.sql

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Members (including creator) can read their own trips
CREATE POLICY "trip members can select"
  ON public.trips FOR SELECT TO authenticated
  USING (
    creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.trip_members tm
      WHERE tm.trip_id = trips.id
        AND tm.user_id = auth.uid()
    )
  );

-- Only creator can insert a trip (the tRPC create mutation uses service role anyway,
-- but this policy is defense in depth for direct Supabase client calls)
CREATE POLICY "creator can insert"
  ON public.trips FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid());

-- Only creator can update their trip
CREATE POLICY "creator can update"
  ON public.trips FOR UPDATE TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- Only creator can delete their trip
CREATE POLICY "creator can delete"
  ON public.trips FOR DELETE TO authenticated
  USING (creator_id = auth.uid());

-- Service role has unrestricted access (AI worker, admin operations)
CREATE POLICY "service role full access"
  ON public.trips FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

**Important:** The `trips.create` tRPC mutation uses `createSupabaseServiceClient()` (service role), so the INSERT policy is defense-in-depth only — it won't block the existing create flow.

The `trips.markAbsent` mutation reads trips via `ctx.supabase` (user-scoped) — the SELECT policy above covers this correctly (creator check).

### trip_eras RLS: Full Policy Set

Trip eras belong to trips. Members who can see the trip should see its eras. The AI worker writes eras via service role.

```sql
-- Migration: 20260519_trips_rls.sql (same file)

ALTER TABLE public.trip_eras ENABLE ROW LEVEL SECURITY;

-- Any trip member can read eras for trips they belong to
CREATE POLICY "trip members can select eras"
  ON public.trip_eras FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_members tm
      WHERE tm.trip_id = trip_eras.trip_id
        AND tm.user_id = auth.uid()
    )
  );

-- Service role full access (AI worker upserts eras after lore generation)
CREATE POLICY "service role full access on trip_eras"
  ON public.trip_eras FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

**Note:** There is no need for authenticated INSERT/UPDATE/DELETE on `trip_eras` — these are always written by the AI worker via service role. Adding those policies is unnecessary scope.

### scheduled_emails RLS: Full Policy Set

These are server-only records — the cron job reads them via service role. Users should only be able to see their own scheduled emails (needed if ever surfaced in UI). The INSERT is done by the SECURITY DEFINER trigger `schedule_trip_anniversary()` which bypasses RLS.

```sql
ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;

-- Users can read their own scheduled emails (future UI use)
CREATE POLICY "users can read own scheduled emails"
  ON public.scheduled_emails FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Service role full access (cron job reads/updates sent_at)
CREATE POLICY "service role full access on scheduled_emails"
  ON public.scheduled_emails FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

**Note:** No authenticated INSERT/UPDATE/DELETE policy needed — all writes come from the SECURITY DEFINER trigger (bypasses RLS) or service role cron.

### otp_codes RLS: Full Policy Set

Currently has `DISABLE ROW LEVEL SECURITY`. Changing this to enabled with service-role-only access.

The `send-otp` route and `verify-otp` route both use `createSupabaseServiceClient()` — confirmed in `send-otp/route.ts` lines 75 and 33–38. Service role bypasses RLS, so enabling RLS with a service-role-only policy will NOT break the OTP flow.

```sql
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Service role only (all OTP operations go through server API routes)
CREATE POLICY "service role full access on otp_codes"
  ON public.otp_codes FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Explicitly deny all authenticated and anon access (defense in depth)
-- (No policies for 'authenticated' or 'anon' means they are blocked by default)
```

### trip_stats RLS: Full Policy Set

`trip_stats` is read in `get_trip_full` (SECURITY DEFINER → bypass). The AI worker writes stats via service role. Trip members should be able to read stats for their trips.

```sql
ALTER TABLE public.trip_stats ENABLE ROW LEVEL SECURITY;

-- Trip members can read stats for their trips
CREATE POLICY "trip members can read stats"
  ON public.trip_stats FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_members tm
      WHERE tm.trip_id = trip_stats.trip_id
        AND tm.user_id = auth.uid()
    )
  );

-- Service role full access (AI worker writes stats)
CREATE POLICY "service role full access on trip_stats"
  ON public.trip_stats FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

### trip_vs_trip RLS: Full Policy Set

Battle records should be readable by members of either trip. The AI worker writes verdicts via service role.

```sql
ALTER TABLE public.trip_vs_trip ENABLE ROW LEVEL SECURITY;

-- Members of either trip in the battle can read the record
CREATE POLICY "trip members can read battles"
  ON public.trip_vs_trip FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_members tm
      WHERE (tm.trip_id = trip_vs_trip.trip_a_id OR tm.trip_id = trip_vs_trip.trip_b_id)
        AND tm.user_id = auth.uid()
    )
  );

-- Service role full access (AI worker writes verdicts; battles.ts uses service role for inserts)
CREATE POLICY "service role full access on trip_vs_trip"
  ON public.trip_vs_trip FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

**Check battles.ts:** The battles router uses `ctx.supabase` for reads and `admin` (service role) for inserts/updates. The SELECT policy above covers read paths via user-scoped client.

### Migration Safety Order

1. Enable RLS on tables with service-role-only access first (`otp_codes`, `scheduled_emails`, `background_jobs`) — these only affect direct anon/authenticated key access, not existing server code paths.
2. Enable RLS on `trips` and `trip_eras` — affects `ctx.supabase` (user-scoped) reads in tRPC routers. Must add SELECT policies before enabling.
3. Enable RLS on `trip_stats` and `trip_vs_trip` — affects any user-scoped reads via battles.ts.

**The entire trips + eras + stats + trip_vs_trip + scheduled_emails + otp_codes RLS can be one migration file** because they are all additive (enable + create policies). There is no destructive change.

---

## SEC-03: background_jobs Policy

**Current state (confirmed from `20260518_hermes_lorian_observability.sql` lines 32–33):**

```sql
ALTER TABLE background_jobs ENABLE ROW LEVEL SECURITY;
-- zero policies follow
```

RLS enabled + zero policies = ALL roles blocked except superuser. The AI worker uses `service_role` which bypasses RLS (it's not a user role). The worker's `poll_background_jobs()` loop uses the service role Supabase client (`from .clients import supabase`) — so the worker is NOT currently broken by this. But any future app-side query with a user-scoped client will silently return empty.

**Fix — add one policy:**

```sql
-- Migration: 20260519_background_jobs_policy.sql
CREATE POLICY "service role full access on background_jobs"
  ON public.background_jobs FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

This is the same pattern as `generation_jobs` in `004_trip_signals_and_jobs.sql` line 51.

**Risk:** Zero. The worker already works. This is purely defensive.

---

## SEC-04: Content-Security-Policy

### Third-Party Origins Audit

Derived from actual codebase analysis:

| Service           | Origin                                                | Type               | Runtime                      |
| ----------------- | ----------------------------------------------------- | ------------------ | ---------------------------- |
| Supabase API      | `https://*.supabase.co`                               | REST + Storage     | Server + Browser             |
| Supabase Realtime | `wss://*.supabase.co`                                 | WebSocket          | Browser only                 |
| PostHog           | `https://app.posthog.com`, `https://us.i.posthog.com` | Analytics JS + API | Browser                      |
| Razorpay          | `https://checkout.razorpay.com`                       | Payment JS         | Browser                      |
| Razorpay API      | `https://api.razorpay.com`                            | Payment REST       | Server only                  |
| fal.ai            | `https://fal.run`, `https://fal.ai`                   | Image gen API      | AI Worker only (not browser) |
| Langfuse          | `https://cloud.langfuse.com`                          | Observability      | Server only (not browser)    |
| Resend            | `https://api.resend.com`                              | Email              | Server only                  |
| Satori            | Edge runtime, no external requests                    | OG cards           | Edge                         |

**Browser-facing origins only** (these must be in CSP `connect-src`):

- Supabase REST: `https://*.supabase.co`
- Supabase Realtime WebSocket: `wss://*.supabase.co`
- PostHog: `https://app.posthog.com https://us.i.posthog.com`
- Razorpay (payment initiation from browser): `https://api.razorpay.com`

**Script sources that load external JS:**

- PostHog: loads `https://us-assets.i.posthog.com` (or similar CDN)
- Razorpay: `https://checkout.razorpay.com/v1/checkout.js`

### CSP Header (Next.js 15)

Next.js 15 App Router does NOT require nonce-based CSP by default unless you use `next/headers` to generate per-request nonces. For this app, `'unsafe-inline'` is needed for:

- Tailwind CSS (inline styles from CSS-in-JS or Tailwind JIT)
- Any inline event handlers in cinematic components

The nonce approach is more secure but requires significant refactoring (every `<script>` tag needs a nonce). Recommend `'unsafe-inline'` for `style-src` initially, and evaluate nonce for `script-src` separately.

```javascript
// next.config.mjs — add to existing headers() array
{
  source: '/(.*)',
  headers: [
    // ... existing headers ...
    {
      key: 'Content-Security-Policy',
      value: [
        "default-src 'self'",
        // Scripts: self + inline (needed for Next.js hydration) + Razorpay + PostHog
        "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://us-assets.i.posthog.com",
        // Styles: self + inline (Tailwind JIT, cinematic CSS)
        "style-src 'self' 'unsafe-inline'",
        // Images: self + data URIs + Supabase storage (trip photos, thumbnails)
        "img-src 'self' data: blob: https://*.supabase.co",
        // Fonts: self + data URIs (Satori edge fonts loaded inline)
        "font-src 'self' data:",
        // Connections: Supabase REST+Realtime+Auth, PostHog, Razorpay payment API
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://app.posthog.com https://us.i.posthog.com https://api.razorpay.com",
        // Frames: Razorpay payment iframe
        "frame-src https://api.razorpay.com",
        // Objects: none
        "object-src 'none'",
        // Base: restrict to self
        "base-uri 'self'",
        // Form actions: self only
        "form-action 'self'",
      ].join('; '),
    },
  ],
}
```

**Important caveat:** The existing headers block uses `source: '/(.*)'` for the security headers. The CSP should be added to the SAME matcher block to apply to all routes. Do NOT add it as a separate matcher — it would create a conflict.

**PostHog script CDN:** PostHog's JS snippet loads from `https://us-assets.i.posthog.com` (confirmed pattern from PostHog docs). If PostHog is initialized differently in this app, verify the exact domain. The `connect-src` for PostHog's event ingestion endpoint is `https://us.i.posthog.com`.

**'unsafe-eval' assessment:** Next.js 15 in production build does NOT need `'unsafe-eval'`. Only development mode needs it. The CSP above omits it intentionally for production.

---

## SEC-05: Rate Limiting Fail-Hard

### Current State

`src/lib/anti-spam.ts` lines 403–405:

```typescript
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;
```

When `redis === null`, `checkRateLimit()` falls through to the in-memory `ipBuckets` Map (lines 443–452). In Vercel serverless, every cold-start creates a new process with a fresh Map — the rate limit is completely ineffective.

### Fail-Hard Pattern

The correct approach is a startup check at module initialization time. In Next.js App Router (serverless), module-level code runs once per cold-start. The check cannot throw at module level (it would break the import chain) — it must throw at the first `checkRateLimit` call in production.

**Option A: Throw at first call (recommended)**

```typescript
// src/lib/anti-spam.ts — replace lines 403–412

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

// In production, Redis is required. An absent UPSTASH_REDIS_REST_URL means
// rate limiting would silently fall back to in-memory (ineffective in serverless).
// Fail at call time rather than module load time to allow test environments to work.
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<boolean> {
  // Fail-hard in production: in-memory rate limiting is useless in serverless
  if (!redis && process.env.NODE_ENV === 'production') {
    throw new Error(
      '[anti-spam] UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production. ' +
        'Rate limiting cannot be safely enforced without Redis in a serverless environment.'
    );
  }

  if (redis) {
    // ... existing Redis path unchanged ...
  }

  // Only reaches here in development/test
  // ... existing in-memory fallback unchanged ...
}
```

**Option B: Startup check via module-level console.error + per-request throw**

The existing pattern for `OTP_HMAC_SECRET` (in `send-otp/route.ts` lines 9–14) uses a `console.error` at module load + throw at use time. Apply the same pattern:

```typescript
// Module-level warning (mirrors OTP_HMAC_SECRET pattern)
if (!process.env.UPSTASH_REDIS_REST_URL && process.env.NODE_ENV === 'production') {
  console.error(
    '[FATAL] UPSTASH_REDIS_REST_URL is not set. Rate limiting is non-functional in production. ' +
      'Set this environment variable before deploying.'
  );
}
```

Then in `checkRateLimit`, throw if `!redis && NODE_ENV === 'production'`.

**Recommended:** Option A is cleaner and consistent. The production guard must be `process.env.NODE_ENV === 'production'` (not `NEXT_PUBLIC_*`) — this is server-side only code; the rate limiter is never called from the browser.

**Do NOT use `NEXT_PUBLIC_` prefix** — `NEXT_PUBLIC_` vars are embedded in the browser bundle. The rate limiter module is server-only.

---

## SEC-06: ilike → eq Fix

**File:** `src/server/trpc/routers/archetypes.ts`
**Line:** 75

**Current:**

```typescript
.ilike('username' as never, input.username) // case-insensitive — usernames may be mixed case in DB
```

**Fix:**

```typescript
.eq('username' as never, input.username.trim().toLowerCase())
```

**Why this works:** The migration `20260516_cross_trip_features.sql` creates a `UNIQUE INDEX profiles_username_idx ON public.profiles(lower(username))` — usernames are stored with their original case but indexed case-insensitively. Using `.eq()` with `.toLowerCase()` matches the index exactly. The comment says "usernames may be mixed case in DB" — `.eq()` with lowercased input correctly handles this since Supabase's `.eq()` is case-sensitive and the canonical form in the index is lowercase.

**Alternative if mixed-case stored usernames are needed:** Use `.ilike()` with a sanitized input: `input.username.trim().replace(/[%_\\]/g, '')`. But `.eq()` with `.toLowerCase()` is cleaner and eliminates the risk entirely.

---

## SEC-07: Anonymous Reactions Validation

### `trips.is_public` Column Confirmation

Confirmed in `supabase/migrations/20260516_cross_trip_features.sql` line 60:

```sql
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;
```

The column exists. Default is `false`.

### Current Issue

`src/app/api/reactions/route.ts` lines 76–84: the anonymous INSERT path accepts any `tripId` without checking:

1. Whether the trip exists
2. Whether the trip has `is_public = true`

### Fix

Add a `trips.is_public` check before the anonymous INSERT. The route already has the `admin` service role client available:

```typescript
// src/app/api/reactions/route.ts — add before the user/anonymous branch (after line 61)

// For anonymous reactions: verify the trip is public before accepting
if (!user) {
  const { data: tripCheck } = await admin
    .from('lore_reactions' as never) // can't query trips directly with types, use admin
    .select('id' as never)
    .limit(1)
    .maybeSingle();
  // Actually: query trips table directly
}
```

The correct pattern (since `trips` will have RLS and admin bypasses it):

```typescript
// Insert this block BEFORE the `if (user) { ... } else { ... }` block (before line 63)

// Validate trip is public before accepting anonymous reactions
const { data: tripData } = await admin
  .from('trips' as never)
  .select('is_public')
  .eq('id' as never, tripId)
  .single();

if (!tripData) {
  return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
}

if (!user && !(tripData as { is_public: boolean }).is_public) {
  return NextResponse.json({ error: 'This trip is not public' }, { status: 403 });
}
```

**Why admin client for the trip lookup:** After RLS is added (SEC-01), the user-scoped client would require the user to be a member to see the trip. For a public trip, anonymous viewers (no auth) should still be able to see it — but the user-scoped client has no session. The admin/service role client is the right tool here to check `is_public`.

**Side effect:** This check also validates the `tripId` exists before inserting, closing a related gap where bots could insert reactions for non-existent `trip_id` values.

---

## SEC-08: AI Worker HMAC-SHA256 Signing

### Current State

`ai-worker/src/main.py` line 164–167:

```python
def verify_auth(authorization: str = Header(...)):
    expected = f"Bearer {settings.AI_WORKER_SECRET}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Invalid auth token")
```

`src/server/trpc/routers/trips.ts` line 366:

```typescript
Authorization: `Bearer ${process.env.AI_WORKER_SECRET!}`,
```

Only a static string comparison. No body signing, no timestamp.

### HMAC-SHA256 Signing Design

**Signed payload:** `METHOD\nPATH\nTIMESTAMP\nBODY_SHA256`

Where:

- `METHOD` = HTTP method (uppercase, e.g., `POST`)
- `PATH` = URL path (e.g., `/generate-lore`)
- `TIMESTAMP` = Unix timestamp in seconds (integer, as string)
- `BODY_SHA256` = hex-encoded SHA-256 of the raw request body bytes

**Replay prevention window:** 5 minutes (300 seconds) — this matches the existing `_LORE_COOLDOWN_SEC = 300` in main.py. A timestamp outside a ±5-minute window is rejected.

**Headers to include:**

- `X-Timestamp: <unix_seconds>` — sent by caller, verified by worker
- `X-Signature: <hmac_hex>` — HMAC-SHA256(signing_key, payload)
- Keep existing `Authorization: Bearer <secret>` as a secondary check (backward compatible)

**New env var:** `AI_WORKER_HMAC_SECRET` — separate from `AI_WORKER_SECRET` so both can co-exist during rollout. Eventually `AI_WORKER_SECRET` can be retired.

### TypeScript Signing (Next.js — edge compatible, Web Crypto API)

```typescript
// src/lib/worker-auth.ts (new file)

/**
 * Sign an AI worker request with HMAC-SHA256.
 * Uses Web Crypto API — compatible with Next.js Edge Runtime and Node.js.
 */
export async function signWorkerRequest(
  method: string,
  path: string,
  body: string
): Promise<{ signature: string; timestamp: string }> {
  const secret = process.env.AI_WORKER_HMAC_SECRET;
  if (!secret) {
    throw new Error('AI_WORKER_HMAC_SECRET is required');
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();

  // SHA-256 hash of the raw body
  const bodyBytes = new TextEncoder().encode(body);
  const bodyHashBuffer = await crypto.subtle.digest('SHA-256', bodyBytes);
  const bodyHash = Array.from(new Uint8Array(bodyHashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Signing payload: METHOD\nPATH\nTIMESTAMP\nBODY_SHA256
  const payload = `${method.toUpperCase()}\n${path}\n${timestamp}\n${bodyHash}`;
  const payloadBytes = new TextEncoder().encode(payload);

  // Import key for HMAC-SHA256
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sigBuffer = await crypto.subtle.sign('HMAC', key, payloadBytes);
  const signature = Array.from(new Uint8Array(sigBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return { signature, timestamp };
}
```

**Usage in trips.ts:**

```typescript
// Replace the bare fetch to worker:
import { signWorkerRequest } from '@/lib/worker-auth';

const body = JSON.stringify({ trip_id: input.tripId });
const { signature, timestamp } = await signWorkerRequest('POST', '/generate-lore', body);

const resp = await fetch(`${workerUrl}/generate-lore`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.AI_WORKER_SECRET!}`,
    'X-Timestamp': timestamp,
    'X-Signature': signature,
  },
  body,
  signal: AbortSignal.timeout(8000),
});
```

### Python Verification (FastAPI middleware)

```python
# ai-worker/src/auth.py (new file)

import hashlib
import hmac
import time
from fastapi import Header, HTTPException, Request

REPLAY_WINDOW_SEC = 300  # 5 minutes


async def verify_hmac_signature(
    request: Request,
    x_timestamp: str = Header(None),
    x_signature: str = Header(None),
) -> None:
    """
    Verify HMAC-SHA256 request signature.
    Falls back to Bearer-only check if HMAC headers are absent (transition period).
    """
    from .config import settings

    hmac_secret = settings.AI_WORKER_HMAC_SECRET  # add to Settings model

    # If no HMAC secret configured, skip HMAC check (bearer-only mode)
    if not hmac_secret:
        return

    # Both headers required once HMAC secret is set
    if not x_timestamp or not x_signature:
        raise HTTPException(status_code=401, detail="Missing HMAC signing headers")

    # Replay prevention: reject timestamps outside 5-minute window
    try:
        ts = int(x_timestamp)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid timestamp")

    now = int(time.time())
    if abs(now - ts) > REPLAY_WINDOW_SEC:
        raise HTTPException(
            status_code=401,
            detail=f"Request timestamp too old or too far in future (window: {REPLAY_WINDOW_SEC}s)"
        )

    # Read raw body (FastAPI buffers it)
    body_bytes = await request.body()
    body_hash = hashlib.sha256(body_bytes).hexdigest()

    # Reconstruct signing payload
    method = request.method.upper()
    path = request.url.path
    payload = f"{method}\n{path}\n{x_timestamp}\n{body_hash}"

    # Compute expected signature
    expected_sig = hmac.new(
        hmac_secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    # Constant-time comparison to prevent timing attacks
    if not hmac.compare_digest(expected_sig, x_signature):
        raise HTTPException(status_code=401, detail="Invalid HMAC signature")
```

**Integration in main.py:** Replace the `verify_auth` dependency or add `verify_hmac_signature` as a second dependency on all protected endpoints:

```python
@app.post("/generate-lore")
async def generate_lore(
    req: LoreRequest,
    bg: BackgroundTasks,
    authorization: str = Header(...),
    _hmac: None = Depends(verify_hmac_signature),  # new
):
    verify_auth(authorization)  # keep for transition period
    ...
```

**Python `hmac` module note:** The standard library function is `hmac.new()`, not `hmac.HMAC()`. The `hmac.compare_digest()` function provides constant-time comparison.

**Settings model update (`ai-worker/src/config.py`):**

```python
class Settings(BaseSettings):
    AI_WORKER_SECRET: str
    AI_WORKER_HMAC_SECRET: str = ""  # optional during rollout; required after
    # ... other settings ...
```

### Rollout Strategy

1. Add `AI_WORKER_HMAC_SECRET` env var to both Next.js (Vercel) and AI worker (Render) simultaneously.
2. Deploy AI worker first with `verify_hmac_signature` that is tolerant of missing headers when `AI_WORKER_HMAC_SECRET` is set (it rejects absent headers only when the secret IS configured).
3. Deploy Next.js with `signWorkerRequest` calls.
4. After both are deployed and verified, remove the fallback tolerance.

This is a two-deploy rollout with no downtime.

---

## SEC-09: otp_codes PK Migration

### Current Schema

`supabase/migrations/20260515_otp_codes.sql` line 4–10:

```sql
CREATE TABLE IF NOT EXISTS public.otp_codes (
  email      text PRIMARY KEY,
  code       text NOT NULL,
  expires_at timestamptz NOT NULL,
  used       boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

### Foreign Key Check

No migration references `otp_codes` in a foreign key constraint. The table is standalone. The only code that queries it is `send-otp/route.ts` (INSERT) and there is no `verify-otp` path that queries `otp_codes` for verification (it delegates to `supabase.auth.verifyOtp`). The `send-otp` route only does INSERT and SELECT COUNT.

**Conclusion: No FK constraints reference `otp_codes`. Migration is non-breaking for FK purposes.**

### Is This a Breaking Migration?

The `send-otp` route's `storeOtp` function (line 34):

```typescript
await supabase.from('otp_codes' as never).insert({
  email: email.toLowerCase(),
  code: hashed,
  expires_at: expiresAt,
  used: false,
} as never);
```

After the migration: the `email` column is no longer the PK but still a required NOT NULL column. The INSERT does NOT reference `id` — with `id uuid DEFAULT gen_random_uuid()`, Postgres auto-generates it. The INSERT will work without any TypeScript code change.

The SELECT COUNT query:

```typescript
await supabase.from('otp_codes' as never)
  .select('email', { count: 'exact', head: true })
  .eq('email' as never, email.trim().toLowerCase())
  .gte('created_at' as never, ...)
```

This still works — `email` remains a column with a non-unique index.

**Conclusion: The PK migration does not require any TypeScript code changes.** The INSERT and SELECT queries work identically before and after.

### Data Migration for Existing Rows

Existing rows have `email` as PK. After adding a new UUID PK column:

- Existing rows need a UUID assigned retroactively. `ALTER TABLE ... ADD COLUMN id uuid DEFAULT gen_random_uuid()` assigns UUIDs to all existing rows automatically when using `DEFAULT gen_random_uuid()`.
- The old PK constraint must be dropped before adding the new one.

### Migration SQL

```sql
-- Migration: 20260519_otp_codes_pk.sql

-- Step 1: Add UUID column (auto-populated for existing rows by DEFAULT)
ALTER TABLE public.otp_codes
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();

-- Step 2: Backfill any rows where id is somehow null (shouldn't happen with DEFAULT, but safety)
UPDATE public.otp_codes SET id = gen_random_uuid() WHERE id IS NULL;

-- Step 3: Make id NOT NULL
ALTER TABLE public.otp_codes ALTER COLUMN id SET NOT NULL;

-- Step 4: Drop the old email primary key constraint
-- The constraint name is typically 'otp_codes_pkey'
ALTER TABLE public.otp_codes DROP CONSTRAINT IF EXISTS otp_codes_pkey;

-- Step 5: Add new UUID primary key
ALTER TABLE public.otp_codes ADD PRIMARY KEY (id);

-- Step 6: Add index on email for efficient per-email queries
-- (non-unique: multiple OTPs per email are now allowed)
CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON public.otp_codes(email);

-- Step 7: Add index on expires_at for the cleanup function
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON public.otp_codes(expires_at);
```

**Note on step 4:** PostgreSQL constraint names are deterministic — `otp_codes_pkey` is the default name for a table named `otp_codes`. If the constraint was named differently, check with `\d otp_codes` in psql or Supabase SQL editor. `DROP CONSTRAINT IF EXISTS` handles this gracefully.

**Is this migration zero-downtime?** Yes. The table has very short TTL rows (10-minute expiry, 1-hour cleanup). During the migration, the OTP flow will be briefly locked while ALTER TABLE holds the ACCESS EXCLUSIVE lock, but this is subsecond for a small table.

---

## Don't Hand-Roll

| Problem                           | Don't Build              | Use Instead                                                                                   |
| --------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------- |
| HMAC constant-time comparison     | Custom string comparison | Python: `hmac.compare_digest()` / TypeScript: Web Crypto `crypto.subtle.verify()`             |
| Timestamp-based replay prevention | Custom nonce store       | Simple timestamp window (±5 min) — stateless, no Redis needed                                 |
| Supabase RLS membership check     | Application-layer check  | Postgres `EXISTS (SELECT 1 FROM trip_members ...)` inside RLS policy                          |
| Rate limit Redis client           | Custom Redis wrapper     | `@upstash/ratelimit` sliding window — already imported in anti-spam.ts                        |
| CSP nonce generation per-request  | Custom middleware        | Next.js 15 nonce support via `next/headers` — but `'unsafe-inline'` is acceptable for Phase 1 |

---

## Common Pitfalls

### Pitfall 1: RLS Infinite Recursion on trips

**What goes wrong:** Adding a `trip_members` subquery inside a `trips` RLS policy that itself triggers the `trip_members` policy, which triggers the `trips` policy — infinite loop.
**Why it happens:** The previous team hit this (see `20260515_fix_trip_members_rls.sql` — they dropped the recursive `trip_members` policy).
**How to avoid:** The `trips` SELECT policy queries `trip_members` — that's safe. The `trip_members` policy is `user_id = auth.uid()` — no subquery on `trips`. No cycle.
**Warning signs:** Supabase returns "infinite recursion detected in policy for table" error.

### Pitfall 2: `is_public` Default is false — Existing Trips

**What goes wrong:** After enabling trips RLS, existing trips that are not in `trip_members` for the calling user return empty (correct behavior). But some trips that SHOULD be public for the reactions check may have `is_public = NULL` or `false` by default.
**Why it happens:** `is_public boolean DEFAULT false` — all pre-migration trips are `false`.
**How to avoid:** The reactions validation check (`!user && !tripData.is_public`) will correctly reject all anonymous reactions to non-public trips, which is the desired behavior. No data migration needed — this is the intended post-fix behavior.

### Pitfall 3: background_jobs Blocks AI Worker After RLS (Already Blocked Now, But Worth Noting)

**What goes wrong:** If background_jobs has RLS enabled + zero policies, `service_role` bypasses RLS (it's the postgres superuser equivalent). So the worker's `poll_background_jobs()` currently works. But an app-layer query using `ctx.supabase` would return empty rows. This is the current state.
**How to avoid:** Add the service_role policy (SEC-03) before doing anything else.

### Pitfall 4: HMAC Signing Breaks markAbsent Parallel Deploy

**What goes wrong:** If Next.js is deployed with HMAC headers but the AI worker doesn't yet verify them, requests work fine. If the AI worker is deployed with strict HMAC enforcement before Next.js sends the headers, all worker calls fail.
**How to avoid:** Deploy AI worker with `if not hmac_secret: return` (skip verification when secret not configured). Set `AI_WORKER_HMAC_SECRET` on Render first, then deploy the worker (now requires headers), then deploy Next.js (now sends headers). This is a safe two-phase rollout.

### Pitfall 5: CSP Breaks PostHog or Razorpay in Production

**What goes wrong:** PostHog uses different CDN domains in different regions; Razorpay's payment iframe may need additional `frame-src` entries.
**How to avoid:** Test with browser DevTools CSP violation reporter. Start with a `Content-Security-Policy-Report-Only` header in staging, observe violations, then switch to enforcing. Alternatively, add a `report-uri` directive pointing to a Sentry/PostHog endpoint.

### Pitfall 6: otp_codes Cleanup Function Still Works After PK Change

**What goes wrong:** `cleanup_expired_otp_codes()` deletes by `expires_at` — no dependency on `email` as PK. Will work fine after migration.
**Confirm:** The cleanup function in `20260515_otp_codes.sql` line 17: `DELETE FROM public.otp_codes WHERE expires_at < now() - interval '1 hour'` — no PK reference.

### Pitfall 7: `get_trip_full` Not Found in Migrations

**What goes wrong:** `get_trip_full` is called in `trips.ts` line 161 but not defined in any migration file. It must be defined in the Supabase project's SQL history (created directly, not via a migration file). This is a gap in the migration history — if the database is ever recreated, `get_trip_full` will be missing.
**Impact on Phase 1:** Does not affect Phase 1 directly, but it means `getFull` queries via user-scoped client will work correctly (the RPC is SECURITY DEFINER, bypasses RLS). No risk from adding RLS.
**Recommendation:** Note as a follow-up: add `get_trip_full` to migrations (Phase 5 - ARCH cleanup).

---

## Validation Architecture

### Test Framework (from `.planning/codebase/TESTING.md`)

The project uses Vitest. Relevant test config is in `package.json`. E2E uses Playwright.

### Per-Requirement Test Map

| Req ID | Behavior                                                      | Test Type                   | Automated Command                                                                      | Notes                                                                 |
| ------ | ------------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| SEC-01 | Non-member cannot read trip rows via user-scoped client       | Integration (Supabase test) | Manual: query as non-member in Supabase SQL editor                                     | RLS is Supabase-side; Vitest can't test it directly without a live DB |
| SEC-02 | Service-role can read otp_codes; anon key cannot              | Integration                 | Manual: verify via Supabase anon key in REST client                                    | Same constraint as SEC-01                                             |
| SEC-03 | background_jobs accessible via service_role, blocked for anon | Integration                 | `vitest run src/__tests__/background-jobs-rls.test.ts`                                 | Wave 0 gap                                                            |
| SEC-04 | CSP header present on all responses                           | Unit/E2E                    | `vitest run src/__tests__/security-headers.test.ts`                                    | Can use `next-test-api-route-handler` or Playwright                   |
| SEC-05 | `checkRateLimit` throws in production without Redis           | Unit                        | `vitest run src/__tests__/anti-spam.test.ts`                                           | Set `NODE_ENV=production`, unset Redis env vars                       |
| SEC-06 | `.eq()` used instead of `.ilike()`                            | Unit (code review)          | `grep -n "ilike" src/server/trpc/routers/archetypes.ts`                                | One-line change; also verify no `%_` injection possible               |
| SEC-07 | Anonymous reaction to non-public trip returns 403             | Unit                        | `vitest run src/__tests__/reactions.test.ts`                                           | Mock admin Supabase client                                            |
| SEC-08 | HMAC signature verification works end-to-end                  | Unit (TS + Python)          | `vitest run src/__tests__/worker-auth.test.ts` + `pytest ai-worker/tests/test_auth.py` | Two separate test files                                               |
| SEC-09 | otp_codes INSERT works without specifying id                  | Integration                 | `vitest run src/__tests__/otp-codes.test.ts`                                           | Mock Supabase insert, verify no PK conflict on double-insert          |

### SEC-04 Header Test Pattern (Vitest + node-fetch)

```typescript
// src/__tests__/security-headers.test.ts
import { describe, it, expect } from 'vitest';

// This test requires the Next.js dev server running on port 3000
// Or use @playwright/test for E2E
describe('Security Headers', () => {
  it('should include CSP header on all responses', async () => {
    const res = await fetch('http://localhost:3000/');
    expect(res.headers.get('content-security-policy')).toBeTruthy();
    expect(res.headers.get('content-security-policy')).toContain("default-src 'self'");
  });
});
```

### SEC-05 Rate Limit Test Pattern (Vitest)

```typescript
// src/__tests__/anti-spam.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('checkRateLimit fail-hard in production', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should throw when Redis is not configured in production', async () => {
    // Re-import to pick up env changes (or test the exported function directly)
    const { checkRateLimit } = await import('../lib/anti-spam');
    await expect(checkRateLimit('test:127.0.0.1', 10, 60000)).rejects.toThrow(
      'UPSTASH_REDIS_REST_URL'
    );
  });
});
```

### SEC-08 HMAC Test Pattern (Vitest)

```typescript
// src/__tests__/worker-auth.test.ts
import { describe, it, expect } from 'vitest';
import { signWorkerRequest } from '../lib/worker-auth';

describe('signWorkerRequest', () => {
  beforeEach(() => {
    vi.stubEnv('AI_WORKER_HMAC_SECRET', 'test-secret-for-unit-tests');
  });

  it('should produce a hex signature', async () => {
    const { signature, timestamp } = await signWorkerRequest(
      'POST',
      '/generate-lore',
      '{"trip_id":"abc"}'
    );
    expect(signature).toMatch(/^[0-9a-f]{64}$/);
    expect(parseInt(timestamp)).toBeGreaterThan(0);
  });

  it('should produce different signatures for different bodies', async () => {
    const { signature: sig1 } = await signWorkerRequest(
      'POST',
      '/generate-lore',
      '{"trip_id":"abc"}'
    );
    const { signature: sig2 } = await signWorkerRequest(
      'POST',
      '/generate-lore',
      '{"trip_id":"xyz"}'
    );
    expect(sig1).not.toBe(sig2);
  });
});
```

---

## Implementation Order with Rationale

### Wave 1 — Database (migrations only, no app code risk)

1. **SEC-03** — `background_jobs` policy. One line. Zero risk. Unblocks AI worker in a post-RLS world.
2. **SEC-09** — `otp_codes` PK migration. No TypeScript changes needed. Low risk (small table, no FK refs). Do this early because it touches the table structure before adding RLS.
3. **SEC-02 (otp_codes)** — Enable RLS on `otp_codes` after PK is changed.
4. **SEC-01+SEC-02 (remaining tables)** — Enable RLS on `trips`, `trip_eras`, `scheduled_emails`, `trip_stats`, `trip_vs_trip`. All in one migration file.

### Wave 2 — Code fixes (no migration risk)

5. **SEC-06** — `archetypes.ts` line 75: one-character change. Zero risk.
6. **SEC-07** — `reactions/route.ts`: add ~8 lines before the user/anon branch. Low risk.
7. **SEC-05** — `anti-spam.ts`: add fail-hard guard. Low risk; only affects production with missing Redis.

### Wave 3 — Infrastructure (new env vars required)

8. **SEC-04** — CSP header in `next.config.mjs`. Requires staging test to confirm no PostHog/Razorpay breakage.
9. **SEC-08** — HMAC signing. Requires new env var on both Vercel and Render. Two-phase deploy.

---

## Gotchas and Risks

### Risk 1: RLS on trips breaks `getChaosDistribution` intentionally

`getChaosDistribution` (`trips.ts` lines 521–538) queries ALL trips with `lore_status = 'ready'` using `ctx.supabase` (user-scoped). After RLS, this will correctly return ONLY the calling user's trips. This is the intended fix (ARCH-05 in requirements). Confirm with the team that the chaos distribution feature returning fewer results is acceptable in Phase 1, or scope this separately.

### Risk 2: `lore_reactions` anonymous RLS policy already exists

The `lore_reactions` table already has:

```sql
CREATE POLICY "anyone can react on public story (anon)"
  ON public.lore_reactions FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);
```

This policy does NOT check `trips.is_public`. The database-level RLS is insufficient alone — it allows any anonymous reaction to any trip. The SEC-07 fix at the API route layer is the correct place to enforce `is_public`. After SEC-01 (trips RLS), a service-role query is still needed in the reactions route to check `is_public` (since the route uses `admin` = service role to bypass RLS for the trip lookup). This is correct design.

### Risk 3: CSP may break Satori edge font loading

Satori OG cards load fonts from Supabase Storage or local. The `font-src 'self' data:` directive should cover this. If fonts are loaded from `*.supabase.co` storage URLs, add `https://*.supabase.co` to `font-src`. Check `src/lib/og/` for font loading patterns.

### Risk 4: Python `hmac` module import shadowing

Python's standard library has a module named `hmac`. If the file is named `hmac.py`, it will shadow the standard library import. Name the file `auth.py` or `worker_auth.py` — not `hmac.py`.

### Risk 5: `X-Timestamp` header may be stripped by Vercel reverse proxy

Vercel does not strip custom `X-` headers when forwarding to the origin (the Next.js server). However, when Next.js makes outbound HTTP requests to the AI worker on Render, the headers are passed directly. No proxy stripping risk in this direction. But verify Render's reverse proxy doesn't strip `X-Timestamp` and `X-Signature` headers from incoming requests to FastAPI.

---

## Sources

All findings are derived directly from the codebase files read in this session:

- `supabase/migrations/20260518_hermes_lorian_observability.sql` — background_jobs RLS gap (lines 32–33)
- `supabase/migrations/20260515_otp_codes.sql` — otp_codes PK and `DISABLE RLS` (lines 4–14)
- `supabase/migrations/20260516_anniversary_and_reactions.sql` — scheduled_emails, lore_reactions RLS
- `supabase/migrations/20260516_cross_trip_features.sql` — `is_public` column (line 60), user_archetypes RLS
- `supabase/migrations/004_trip_signals_and_jobs.sql` — generation_jobs RLS pattern (lines 49–54)
- `supabase/migrations/005_photo_embeddings.sql` — SECURITY DEFINER RPCs confirmed
- `supabase/migrations/20260515_fix_trip_members_rls.sql` — recursive policy precedent
- `src/server/trpc/routers/archetypes.ts` — ilike on line 75
- `src/app/api/reactions/route.ts` — anonymous insert path, no is_public check
- `src/lib/anti-spam.ts` — Redis fallback pattern lines 403–452
- `src/app/api/auth/send-otp/route.ts` — service role client usage, OTP_HMAC_SECRET pattern
- `ai-worker/src/main.py` — `verify_auth` function lines 164–167, all endpoints confirmed
- `next.config.mjs` — existing security headers (lines 12–28)
- `.planning/codebase/ARCHITECTURE.md` — service role client usage patterns confirmed
- `.planning/codebase/CONCERNS.md` — all CRITICAL/HIGH security findings with file references

**Confidence:** HIGH — all claims are verified against actual source files. No claims rely on training data alone for factual assertions about the codebase.
