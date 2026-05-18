# Phase 1: Security Foundation — Plan

**Phase:** 1
**Status:** Planned
**Created:** 2026-05-18
**Requirements:** SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, SEC-07, SEC-08, SEC-09

---

## Goal

Every CRITICAL and HIGH security vulnerability is patched before any real user data touches
production — RLS protects all tables, rate limiting fails hard in production, anonymous inputs are
validated against `trips.is_public`, and AI worker calls carry HMAC-SHA256 signed request headers.

---

## Plans

### Plan 1: Database RLS Migrations

**Objective:** Enable RLS on all unprotected tables and add the required policy set so that
authenticated Supabase clients receive only authorized rows.

**Requirements:** SEC-01, SEC-02, SEC-03, SEC-09

**Wave:** 1 (no code dependencies — pure SQL migration)

**File created:** `supabase/migrations/20260519_security_rls_hardening.sql`

---

#### Tasks

##### Task 1: background_jobs service-role policy + otp_codes PK migration (SEC-03, SEC-09)

**Type:** migration

**File(s):**

- `supabase/migrations/20260519_security_rls_hardening.sql` (create new)

**Description:**

Create the migration file and add the first two independent fixes as the opening block. These touch
separate tables with no interdependency, and both need to land before the broader RLS block in
Task 2.

The `background_jobs` fix is one line: the table has RLS enabled but zero policies (confirmed in
`20260518_hermes_lorian_observability.sql` line 32), which blocks all non-superuser access. The
service-role client used by the AI worker bypasses RLS so the worker is not currently broken, but
any future app-layer query via `ctx.supabase` will silently return zero rows.

The `otp_codes` PK fix changes the primary key from `email text` to `id uuid`. The existing
`send-otp` INSERT does NOT specify `id` — with `DEFAULT gen_random_uuid()` Postgres auto-fills it,
so no TypeScript changes are required after this migration. The SELECT COUNT query on `email` keeps
working because a non-unique index on `email` is added. The `cleanup_expired_otp_codes()` function
deletes by `expires_at` — no PK dependency.

Write the following SQL as the complete initial content of the file:

```sql
-- =============================================================================
-- Phase 1 Security Hardening: RLS Policies + otp_codes PK Migration
-- =============================================================================

-- -----------------------------------------------------------------------------
-- SEC-03: background_jobs — add service-role-only policy
-- (RLS was enabled in 20260518_hermes_lorian_observability.sql with zero policies)
-- -----------------------------------------------------------------------------

CREATE POLICY "service role full access on background_jobs"
  ON public.background_jobs FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- -----------------------------------------------------------------------------
-- SEC-09: otp_codes — change PK from email to UUID
-- (allows multiple active OTPs per email; rapid re-send no longer throws PK violation)
-- -----------------------------------------------------------------------------

-- Step 1: Add UUID column with auto-generated default (backfills existing rows immediately)
ALTER TABLE public.otp_codes
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();

-- Step 2: Safety: backfill any row where id is still null
UPDATE public.otp_codes SET id = gen_random_uuid() WHERE id IS NULL;

-- Step 3: Enforce NOT NULL on the new column
ALTER TABLE public.otp_codes ALTER COLUMN id SET NOT NULL;

-- Step 4: Drop the old email primary key constraint
ALTER TABLE public.otp_codes DROP CONSTRAINT IF EXISTS otp_codes_pkey;

-- Step 5: Promote id to primary key
ALTER TABLE public.otp_codes ADD PRIMARY KEY (id);

-- Step 6: Non-unique index on email for efficient per-email lookups
CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON public.otp_codes(email);

-- Step 7: Index on expires_at for the cleanup function
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON public.otp_codes(expires_at);
```

**Acceptance:**

- Run the migration against a local Supabase instance via `supabase db reset` or paste into the
  Supabase SQL editor.
- Confirm `\d public.otp_codes` shows `id uuid NOT NULL PRIMARY KEY` and `email text NOT NULL`
  with no PK on email.
- Confirm `SELECT policyname FROM pg_policies WHERE tablename = 'background_jobs'` returns
  `service role full access on background_jobs`.
- Confirm an INSERT into `otp_codes` without specifying `id` succeeds and a second INSERT for the
  same email also succeeds (two rows, different UUIDs).

**Dependencies:** None — first task in wave 1.

---

##### Task 2: RLS enable + full policy set for trips, trip_eras, scheduled_emails, otp_codes, trip_stats, trip_vs_trip (SEC-01, SEC-02)

**Type:** migration

**File(s):**

- `supabase/migrations/20260519_security_rls_hardening.sql` (append to file from Task 1)

**Description:**

Append the following SQL block to the migration file created in Task 1. This is a single append —
do NOT create a second migration file.

The ordering within this block matters: enable RLS on service-role-only tables first
(`otp_codes`, `scheduled_emails`) before the trip-membership tables. This minimises the exposure
window if the migration is applied incrementally.

Key design decisions (do not deviate):

- `trips` SELECT policy: `creator_id = auth.uid() OR EXISTS (trip_members where trip_id matches AND
user_id matches)`. This avoids the recursive-policy bug the team already hit
  (see `20260515_fix_trip_members_rls.sql`). The `trip_members` policy is `user_id = auth.uid()` —
  no subquery on `trips` — so there is no cycle.
- `trips` INSERT/UPDATE/DELETE policies: defense-in-depth for direct Supabase client calls. The
  tRPC `trips.create` mutation uses service role anyway, so the INSERT policy does not break
  existing flows.
- `trip_eras`: SELECT for trip members only; no authenticated write policies needed because the AI
  worker writes eras via service role.
- `scheduled_emails`: SELECT scoped to `user_id = auth.uid()` (for future UI); INSERT/UPDATE via
  SECURITY DEFINER trigger and cron (both bypass RLS — unaffected).
- `otp_codes`: service-role-only (all OTP paths use `createSupabaseServiceClient()`).
- `trip_stats`: SELECT for trip members; service role writes.
- `trip_vs_trip`: SELECT for members of either trip; service role writes.

Append this block verbatim:

```sql

-- -----------------------------------------------------------------------------
-- SEC-02: otp_codes — enable RLS (was DISABLE RLS in 20260515_otp_codes.sql)
-- Service-role-only: all OTP operations use createSupabaseServiceClient()
-- -----------------------------------------------------------------------------

ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role full access on otp_codes"
  ON public.otp_codes FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- -----------------------------------------------------------------------------
-- SEC-02: scheduled_emails — enable RLS (no RLS in 20260516_anniversary_and_reactions.sql)
-- -----------------------------------------------------------------------------

ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;

-- Users can read their own upcoming anniversary emails (future UI surface)
CREATE POLICY "users can read own scheduled emails"
  ON public.scheduled_emails FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Service role full access: cron job reads/updates sent_at; SECURITY DEFINER trigger inserts
CREATE POLICY "service role full access on scheduled_emails"
  ON public.scheduled_emails FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- -----------------------------------------------------------------------------
-- SEC-01: trips — enable RLS (no RLS exists anywhere in migrations)
-- IMPORTANT: SELECT policy uses trip_members subquery, NOT a self-referencing trips subquery.
-- trip_members policy is "user_id = auth.uid()" — no cycle.
-- -----------------------------------------------------------------------------

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Trip members (including creator) can read their own trips
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

-- Defense-in-depth: creator can insert (tRPC create uses service role, so this won't block it)
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

-- Service role full access (AI worker, tRPC service-role mutations, OG card route)
CREATE POLICY "service role full access on trips"
  ON public.trips FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- -----------------------------------------------------------------------------
-- SEC-01: trip_eras — enable RLS (no RLS exists anywhere in migrations)
-- -----------------------------------------------------------------------------

ALTER TABLE public.trip_eras ENABLE ROW LEVEL SECURITY;

-- Trip members can read eras for trips they belong to
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


-- -----------------------------------------------------------------------------
-- SEC-02: trip_stats — enable RLS (no RLS in any migration)
-- -----------------------------------------------------------------------------

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


-- -----------------------------------------------------------------------------
-- SEC-02: trip_vs_trip — enable RLS (no RLS in any migration)
-- Members of either trip in a battle can read the record.
-- -----------------------------------------------------------------------------

ALTER TABLE public.trip_vs_trip ENABLE ROW LEVEL SECURITY;

-- Members of either trip can read the battle record
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

**Acceptance:**

- Apply the full migration file. Zero SQL errors.
- Run `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('trips','trip_eras','scheduled_emails','otp_codes','trip_stats','trip_vs_trip','background_jobs')` — all seven rows show `rowsecurity = true`.
- Run `SELECT tablename, policyname FROM pg_policies WHERE tablename IN ('trips','trip_eras','scheduled_emails','otp_codes','trip_stats','trip_vs_trip','background_jobs') ORDER BY tablename, policyname` — verify expected policy names are present for each table.
- Query `trips` as an authenticated user who is NOT a member of the trip — zero rows returned.
- Query `trips` as an authenticated user who IS a creator or member — correct rows returned.
- Confirm `get_trip_full` RPC (SECURITY DEFINER) still returns full trip data — it runs as the
  postgres superuser and bypasses RLS; it must not be broken.

**Dependencies:** Task 1 must complete first (same file).

---

### Plan 2: CSP Header, ilike Fix, and Anonymous Reactions Validation

**Objective:** Add the Content-Security-Policy header to all Next.js responses, fix the wildcard
username enumeration vector in archetypes, and enforce `is_public` validation before accepting
anonymous reactions.

**Requirements:** SEC-04, SEC-06, SEC-07

**Wave:** 2 (no migration dependencies; runs in parallel with Plan 3 and Plan 4 after Plan 1
migrations are applied)

**Files modified:**

- `next.config.mjs`
- `src/server/trpc/routers/archetypes.ts`
- `src/app/api/reactions/route.ts`

---

#### Tasks

##### Task 1: Add Content-Security-Policy header to next.config.mjs (SEC-04)

**Type:** config

**File(s):**

- `next.config.mjs`

**Description:**

The current `next.config.mjs` headers block (lines 12–28) has a single `source: '/(.*)'` matcher
with four security headers. The CSP must be added as a fifth entry in the SAME header array under
the SAME `source: '/(.*)'` matcher. Do NOT create a second `source: '/(.*)'` object — it would
conflict.

Replace the existing `headers()` return value with the following. The four existing headers are
preserved verbatim; only the fifth CSP entry is new:

```javascript
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://us-assets.i.posthog.com",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https://*.supabase.co",
            "font-src 'self' data:",
            "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://app.posthog.com https://us.i.posthog.com https://api.razorpay.com",
            "frame-src https://api.razorpay.com",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join('; '),
        },
      ],
    },
    {
      source: '/api/(.*)',
      headers: [{ key: 'Cache-Control', value: 'no-store' }],
    },
  ];
},
```

Rationale for each directive:

- `script-src 'unsafe-inline'`: Required for Next.js 15 hydration inline scripts. Adding a nonce
  approach is a follow-up and not in scope for Phase 1.
- `https://checkout.razorpay.com`: Razorpay JS SDK loaded via script tag.
- `https://us-assets.i.posthog.com`: PostHog analytics JS bundle CDN.
- `connect-src wss://*.supabase.co`: Supabase Realtime WebSocket for lore generation live updates.
- `connect-src https://api.razorpay.com`: Browser-side Razorpay payment initiation.
- `frame-src https://api.razorpay.com`: Razorpay payment iframe.
- `object-src 'none'`: Blocks Flash/plugin injection.

Do NOT add `'unsafe-eval'` — Next.js 15 production builds do not need it.

**Acceptance:**

- Run `npm run dev`, then `curl -s -I http://localhost:3000/ | grep -i content-security-policy` —
  the CSP header must be present.
- Verify the header value contains `default-src 'self'` and `connect-src` with Supabase WSS.
- `npm run build` completes without error.
- In browser DevTools, open Console and verify no CSP violation errors when loading the home page,
  a trip page, and the public story page.

**Dependencies:** None.

---

##### Task 2: Fix ilike injection in archetypes.getPublicHistory (SEC-06)

**Type:** code

**File(s):**

- `src/server/trpc/routers/archetypes.ts`

**Description:**

Line 75 currently reads:

```typescript
.ilike('username' as never, input.username) // case-insensitive — usernames may be mixed case in DB
```

Replace that single line with:

```typescript
.eq('username' as never, input.username.trim().toLowerCase())
```

Remove the comment. The `UNIQUE INDEX profiles_username_idx ON public.profiles(lower(username))`
index (added in `20260516_cross_trip_features.sql`) means the canonical stored form is lowercase-
indexed. Using `.eq()` with `.toLowerCase()` matches the index and eliminates the wildcard
enumeration risk entirely.

No other lines in `archetypes.ts` change.

**Acceptance:**

- `grep -n "ilike" src/server/trpc/routers/archetypes.ts` returns no results.
- `grep -n "\.eq\('username'" src/server/trpc/routers/archetypes.ts` returns the updated line 75.
- `npm run type-check` passes.
- Calling `trpc.archetypes.getPublicHistory({ username: 'ALICE' })` correctly returns results for
  a user stored as `alice` (lowercased before query). Calling with `username: 'ali%'` returns no
  results (no wildcard matching).

**Dependencies:** None (independent of Task 1 in this plan).

---

##### Task 3: Validate trips.is_public before accepting anonymous reactions (SEC-07)

**Type:** code

**File(s):**

- `src/app/api/reactions/route.ts`

**Description:**

The anonymous reaction path (lines 75–84) currently inserts for any `tripId` without checking
whether the trip is public. After Plan 1's RLS migration, `trips` has RLS enabled — but the
route uses `admin` (service role, bypasses RLS) for all Supabase operations, so a direct trip
lookup via `admin` is still needed to check `is_public`.

Insert the following block AFTER the `emoji` validation (after line 39, which ends with `status:
400 }`) and BEFORE the `admin` client instantiation (before line 42). The `admin` constant is
declared below this insertion point — move it up to before the trip check or declare it before the
insert point.

Concretely, restructure the `POST` handler body after the rate-limit and input-validation block as
follows. The sections that change are the trip validation block and the admin client declaration.
Everything else (cookie/session logic, upsert for auth'd users, insert for anonymous) stays the
same:

```typescript
// POST /api/reactions — after rate-limit and input validation, before user branch

const admin = createSupabaseServiceClient();

// Validate trip exists and check is_public before accepting any reaction.
// Uses admin (service role) because after RLS is enabled, a user-scoped client
// cannot read trips the current (possibly anonymous) user is not a member of.
const { data: tripData } = await admin
  .from('trips' as never)
  .select('is_public')
  .eq('id' as never, tripId)
  .single();

if (!tripData) {
  return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
}

// Resolve user session before the public-trip guard so that authenticated
// trip members can still react on private trips.
const cookieStore = await cookies();
const { createServerClient } = await import('@supabase/ssr');
const supabaseSSR = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {},
    },
  }
);
const {
  data: { user },
} = await supabaseSSR.auth.getUser();

// Anonymous users can only react on public trips
if (!user && !(tripData as { is_public: boolean }).is_public) {
  return NextResponse.json({ error: 'This trip is not public' }, { status: 403 });
}

if (user) {
  // Auth'd users: upsert to deduplicate per slide (existing logic unchanged)
  await admin.from('lore_reactions' as never).upsert(
    {
      trip_id: tripId,
      user_id: user.id,
      slide_type: slideType,
      slide_idx: slideIdx ?? null,
      emoji,
    } as never,
    { onConflict: 'trip_id,user_id,slide_type,slide_idx' } as never
  );
} else {
  // Anonymous: insert (existing logic unchanged)
  await admin.from('lore_reactions' as never).insert({
    trip_id: tripId,
    user_id: null,
    slide_type: slideType,
    slide_idx: slideIdx ?? null,
    emoji,
  } as never);
}
```

Remove the original `const admin = createSupabaseServiceClient();` at line 42 since it is now
declared earlier. Remove the original cookie/session block starting at line 44 since it is now
declared above. The `if (user) { ... } else { ... }` block at lines 63–84 is replaced by the
block above.

**Acceptance:**

- `npm run type-check` passes.
- POST to `/api/reactions` with a valid `tripId` for a trip where `is_public = false` and no auth
  cookie → HTTP 403 with `{ "error": "This trip is not public" }`.
- POST with a non-existent `tripId` → HTTP 404.
- POST with a valid `tripId` where `is_public = true` and no auth → HTTP 200 (reaction inserted).
- POST with valid auth session regardless of `is_public` → HTTP 200 (no public guard for auth'd users).

**Dependencies:** None (runs in parallel with Tasks 1 and 2).

---

### Plan 3: Rate Limiting Fail-Hard

**Objective:** Make `checkRateLimit` throw in production when Redis env vars are absent, preventing
silent in-memory fallback in a serverless environment where per-cold-start state is useless.

**Requirements:** SEC-05

**Wave:** 2 (independent of Plans 1 and 2; runs in parallel)

**Files modified:**

- `src/lib/anti-spam.ts`

---

#### Tasks

##### Task 1: Add production fail-hard guard to checkRateLimit (SEC-05)

**Type:** code

**File(s):**

- `src/lib/anti-spam.ts`

**Description:**

Current state at lines 399–453:

- Lines 403–405: Redis is initialized only if both env vars are present; otherwise `redis = null`.
- Lines 415–453: `checkRateLimit` falls through to the in-memory `ipBuckets` Map when `redis`
  is null. In Vercel serverless, every cold-start creates a fresh process — the Map resets,
  making rate limiting completely ineffective.

Two changes to make:

**Change 1** — Add a module-level warning (mirrors the `OTP_HMAC_SECRET` pattern in
`src/app/api/auth/send-otp/route.ts`). Insert immediately after the `const redis = ...` line
(after line 405):

```typescript
if (!redis && process.env.NODE_ENV === 'production') {
  console.error(
    '[FATAL] UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are not set. ' +
      'Rate limiting will throw on the first call in production. ' +
      'Set these environment variables before deploying.'
  );
}
```

**Change 2** — Add a fail-hard guard as the FIRST statement inside `checkRateLimit` (line 420,
before the `if (redis) {` block):

```typescript
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<boolean> {
  // Fail hard in production: in-memory rate limiting is useless in serverless (no persistent state).
  // UPSTASH_REDIS_REST_URL must be set before deploying.
  if (!redis && process.env.NODE_ENV === 'production') {
    throw new Error(
      '[anti-spam] UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production. ' +
        'Rate limiting cannot be safely enforced without Redis in a serverless environment.'
    );
  }

  if (redis) {
    // ... rest of existing Redis path unchanged ...
  }

  // Only reaches here in development/test with no Redis configured
  // ... existing in-memory fallback unchanged ...
}
```

Do NOT use `NEXT_PUBLIC_` prefix on any env var reference — this file is server-only and
`NEXT_PUBLIC_` vars are embedded in the browser bundle.

Do NOT remove the in-memory fallback code. It is still valid for local development and tests.

**Acceptance:**

- `NODE_ENV=production UPSTASH_REDIS_REST_URL='' npx vitest run src/__tests__/anti-spam.test.ts`
  (once that test is created in Plan 5) passes.
- In a local test with `NODE_ENV` temporarily set to `'production'` and both Upstash env vars
  unset, calling `checkRateLimit('test', 10, 60000)` throws with a message containing
  `'UPSTASH_REDIS_REST_URL'`.
- With `NODE_ENV=development` and no Redis env vars, calling `checkRateLimit` falls through to
  in-memory bucket (existing behavior, unchanged).
- `npm run type-check` passes.

**Dependencies:** None.

---

### Plan 4: AI Worker HMAC Request Signing

**Objective:** Replace bare Bearer-token auth on AI worker calls with HMAC-SHA256 signed requests
that include a timestamp, preventing replay attacks from leaked bearer tokens.

**Requirements:** SEC-08

**Wave:** 2 (independent code change; runs in parallel with Plans 2 and 3)

**Files modified / created:**

- `src/lib/worker-auth.ts` (new)
- `src/server/trpc/routers/trips.ts` (modify)
- `src/server/trpc/routers/photos.ts` (modify)
- `src/server/trpc/routers/battles.ts` (modify)
- `ai-worker/src/auth.py` (new)
- `ai-worker/src/config.py` (modify)
- `ai-worker/src/main.py` (modify)
- `.env.example` (modify, if present; otherwise note the var in Execution Notes)

---

#### Tasks

##### Task 1: TypeScript HMAC signing helper (SEC-08 — Next.js side)

**Type:** code

**File(s):**

- `src/lib/worker-auth.ts` (create new file)

**Description:**

Create a new file `src/lib/worker-auth.ts`. This file must use the Web Crypto API (`crypto.subtle`)
which is compatible with both Next.js Edge Runtime and Node.js — do NOT use the `crypto` Node.js
module directly.

The signing payload format is: `METHOD\nPATH\nTIMESTAMP\nBODY_SHA256` where:

- `METHOD` is the HTTP method in uppercase (always `POST` for worker calls)
- `PATH` is the URL path without the host (e.g., `/generate-lore`)
- `TIMESTAMP` is Unix seconds as a string (integer, no decimals)
- `BODY_SHA256` is the lowercase hex-encoded SHA-256 digest of the raw request body string

The function must throw if `AI_WORKER_HMAC_SECRET` is not set — it is a required env var in
production. The graceful-skip behavior for safe rollout is implemented on the Python side
(Task 3), not here.

Write the file with exactly this implementation:

```typescript
/**
 * HMAC-SHA256 signing for AI worker requests.
 * Uses Web Crypto API — compatible with Next.js Edge Runtime and Node.js.
 *
 * Signing payload: "METHOD\nPATH\nTIMESTAMP\nBODY_SHA256"
 * Headers added:   X-Timestamp, X-Signature
 * Env var:         AI_WORKER_HMAC_SECRET (required; separate from AI_WORKER_SECRET)
 */
export async function signWorkerRequest(
  method: string,
  path: string,
  body: string
): Promise<{ signature: string; timestamp: string }> {
  const secret = process.env.AI_WORKER_HMAC_SECRET;
  if (!secret) {
    throw new Error(
      '[worker-auth] AI_WORKER_HMAC_SECRET is not set. ' +
        'This env var is required for HMAC request signing.'
    );
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();

  // SHA-256 of the raw request body
  const bodyBytes = new TextEncoder().encode(body);
  const bodyHashBuffer = await crypto.subtle.digest('SHA-256', bodyBytes);
  const bodyHash = Array.from(new Uint8Array(bodyHashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Signing string
  const payload = `${method.toUpperCase()}\n${path}\n${timestamp}\n${bodyHash}`;
  const payloadBytes = new TextEncoder().encode(payload);

  // Import HMAC key
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

**Acceptance:**

- `npm run type-check` passes with no errors on the new file.
- The function is exported as a named export.
- File does not import from `'crypto'` (Node.js built-in) — only uses the global `crypto` Web API.

**Dependencies:** None.

---

##### Task 2: Wire HMAC signing into all Next.js → AI worker calls (SEC-08)

**Type:** code

**File(s):**

- `src/server/trpc/routers/trips.ts`
- `src/server/trpc/routers/photos.ts`
- `src/server/trpc/routers/battles.ts`

**Description:**

Add `import { signWorkerRequest } from '@/lib/worker-auth';` to each of the three router files.

For each `fetch` call to the AI worker, compute the HMAC headers before the fetch and add
`X-Timestamp` and `X-Signature` headers. The existing `Authorization: Bearer` header is
KEPT — both headers coexist during the rollout transition period.

**trips.ts — three call sites:**

1. `generateLore` (around line 362) — body is `JSON.stringify({ trip_id: input.tripId })`:

```typescript
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

Replace the existing `body: JSON.stringify({ trip_id: input.tripId })` inline and the existing
headers object with the above pattern. Assign the body to a `const body` variable first.

2. `markAbsent` (around line 461) — fire-and-forget call to `/generate-missing-person-card`.
   Body is `JSON.stringify({ trip_id: input.tripId, absent_user_id: input.userId })`.
   Because this is fire-and-forget, `signWorkerRequest` must be awaited before the fetch:

```typescript
const markAbsentBody = JSON.stringify({ trip_id: input.tripId, absent_user_id: input.userId });
signWorkerRequest('POST', '/generate-missing-person-card', markAbsentBody)
  .then(({ signature, timestamp }) => {
    fetch(`${process.env.AI_WORKER_URL ?? ''}/generate-missing-person-card`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.AI_WORKER_SECRET!}`,
        'X-Timestamp': timestamp,
        'X-Signature': signature,
      },
      body: markAbsentBody,
    }).catch(e => console.error('[markAbsent] worker call failed:', e.message));
  })
  .catch(e => console.error('[markAbsent] HMAC signing failed:', e.message));
```

3. The `warmupWorker` health check at line 547 has NO body and is a GET — do NOT add HMAC signing
   to this call. Only sign POST requests with a body.

**photos.ts — one call site (around lines 200–211):**

The `workerHeaders` object is shared between `/generate-thumbnail` and `/embed-photo`. The
body for both is `const photoBody = JSON.stringify({ photo_id: data.id })` (line 199).
Since both calls use the same body, compute HMAC once and reuse:

```typescript
const photoBody = JSON.stringify({ photo_id: data.id });
// Sign once — same body used for both thumbnail and embed calls
signWorkerRequest('POST', '/generate-thumbnail', photoBody)
  .then(({ signature: thumbSig, timestamp: thumbTs }) => {
    fetch(`${workerUrl}/generate-thumbnail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.AI_WORKER_SECRET!}`,
        'X-Timestamp': thumbTs,
        'X-Signature': thumbSig,
      },
      body: photoBody,
      signal: AbortSignal.timeout(6000),
    }).catch(e => console.warn('[thumbnail] worker unreachable:', (e as Error).message));
  })
  .catch(e => console.warn('[thumbnail] HMAC signing failed:', (e as Error).message));

signWorkerRequest('POST', '/embed-photo', photoBody)
  .then(({ signature: embedSig, timestamp: embedTs }) => {
    fetch(`${workerUrl}/embed-photo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.AI_WORKER_SECRET!}`,
        'X-Timestamp': embedTs,
        'X-Signature': embedSig,
      },
      body: photoBody,
      signal: AbortSignal.timeout(6000),
    }).catch(e => console.warn('[embed] worker unreachable:', (e as Error).message));
  })
  .catch(e => console.warn('[embed] HMAC signing failed:', (e as Error).message));
```

Remove the old shared `workerHeaders` constant since each request now has its own headers object.

**battles.ts — one call site (around line 108):**

Body is `JSON.stringify({ battle_id: (battle as BattleRow).id })`:

```typescript
const battleBody = JSON.stringify({ battle_id: (battle as BattleRow).id });
signWorkerRequest('POST', '/judge-battle', battleBody)
  .then(({ signature, timestamp }) => {
    fetch(`${process.env.AI_WORKER_URL ?? ''}/judge-battle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.AI_WORKER_SECRET!}`,
        'X-Timestamp': timestamp,
        'X-Signature': signature,
      },
      body: battleBody,
      signal: AbortSignal.timeout(8000),
    }).catch(e => console.error('[challenge] worker failed:', (e as Error).message));
  })
  .catch(e => console.error('[challenge] HMAC signing failed:', e.message));
```

**Acceptance:**

- `npm run type-check` passes across all three files.
- All modified fetch calls include `'X-Timestamp'` and `'X-Signature'` headers.
- `grep -r "X-Timestamp" src/server/trpc/routers/` returns matches in trips.ts, photos.ts, battles.ts.
- The `warmupWorker` GET call to `/health` has NO `X-Signature` header (it is not modified).

**Dependencies:** Task 1 (worker-auth.ts must exist before importing it).

---

##### Task 3: Python HMAC verification in AI worker (SEC-08 — Python side)

**Type:** code

**File(s):**

- `ai-worker/src/auth.py` (create new file)
- `ai-worker/src/config.py` (modify — add `AI_WORKER_HMAC_SECRET` field)
- `ai-worker/src/main.py` (modify — add `_hmac` dependency to all protected endpoints)

**Description:**

**File 1: `ai-worker/src/auth.py`** (new — do NOT name it `hmac.py` — that shadows the stdlib)

```python
"""
HMAC-SHA256 request signature verification for the AI worker.

Fallback behaviour during rollout:
  - If AI_WORKER_HMAC_SECRET is empty/absent in Settings, HMAC check is skipped entirely.
  - Once the secret is set on both Vercel and Render, all requests without valid headers are rejected.

Signing payload (must match TypeScript src/lib/worker-auth.ts):
  "METHOD\nPATH\nTIMESTAMP\nBODY_SHA256"
"""

import hashlib
import hmac
import time

from fastapi import Header, HTTPException, Request


REPLAY_WINDOW_SEC = 300  # 5 minutes — matches _LORE_COOLDOWN_SEC in main.py


async def verify_hmac_signature(
    request: Request,
    x_timestamp: str = Header(None, alias="x-timestamp"),
    x_signature: str = Header(None, alias="x-signature"),
) -> None:
    """
    FastAPI dependency: verify HMAC-SHA256 signature on incoming requests.
    Inject with: _hmac: None = Depends(verify_hmac_signature)
    """
    from .config import settings

    hmac_secret: str = settings.AI_WORKER_HMAC_SECRET

    # Graceful skip: if no HMAC secret is configured, operate in bearer-only mode.
    # This enables a safe two-deploy rollout: set the secret on Render first,
    # then deploy Next.js with signing, then enforce here.
    if not hmac_secret:
        return

    # Once the secret is set, both headers are required.
    if not x_timestamp or not x_signature:
        raise HTTPException(status_code=401, detail="Missing HMAC signing headers")

    # Replay prevention: reject timestamps outside a 5-minute window.
    try:
        ts = int(x_timestamp)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid timestamp format")

    now = int(time.time())
    if abs(now - ts) > REPLAY_WINDOW_SEC:
        raise HTTPException(
            status_code=401,
            detail=f"Request timestamp rejected (window: {REPLAY_WINDOW_SEC}s)",
        )

    # Read raw body (FastAPI buffers the body for Pydantic parsing; reading here is safe).
    body_bytes = await request.body()
    body_hash = hashlib.sha256(body_bytes).hexdigest()

    # Reconstruct the signing payload.
    method = request.method.upper()
    path = request.url.path
    payload = f"{method}\n{path}\n{x_timestamp}\n{body_hash}"

    # Compute expected signature.
    expected_sig = hmac.new(
        hmac_secret.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    # Constant-time comparison prevents timing attacks.
    if not hmac.compare_digest(expected_sig, x_signature):
        raise HTTPException(status_code=401, detail="Invalid HMAC signature")
```

**File 2: `ai-worker/src/config.py`** — add one field to the `Settings` class:

```python
# Add after AI_WORKER_SECRET:
AI_WORKER_HMAC_SECRET: str = ""  # Required after rollout; empty = bearer-only mode (transition)
```

**File 3: `ai-worker/src/main.py`** — update endpoint signatures.

First, add the import at the top of the file (with other local imports):

```python
from .auth import verify_hmac_signature
```

Then update each protected endpoint decorator to add `_hmac: None = Depends(verify_hmac_signature)`
as a parameter. The `verify_auth(authorization)` call is KEPT — both checks run in parallel:

```python
@app.post("/generate-lore")
async def generate_lore(
    req: LoreRequest,
    bg: BackgroundTasks,
    authorization: str = Header(...),
    _hmac: None = Depends(verify_hmac_signature),
):
    verify_auth(authorization)
    ...
```

Apply the same `_hmac: None = Depends(verify_hmac_signature)` addition to ALL endpoints that
currently call `verify_auth(authorization)`:

- `/generate-lore`
- `/generate-thumbnail`
- `/embed-photo`
- `/backfill-embeddings`
- `/generate-missing-person-card`
- `/judge-battle`
- `/generate-trip-cover`
- `/generate-character-portraits`
- `/generate-era-thumbnails`

Do NOT add the dependency to `/health` — it has no authorization check.

Ensure `Depends` is imported: add to the `fastapi` import line if not already present:

```python
from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException
```

**Acceptance:**

- `cd ai-worker && python -m pytest tests/ -x` (or `./run_tests.sh`) passes.
- `python -c "from src.auth import verify_hmac_signature; print('ok')"` in the ai-worker
  directory completes without error.
- With `AI_WORKER_HMAC_SECRET=""` in `.env`, a request with no HMAC headers → 200 (skip mode).
- With `AI_WORKER_HMAC_SECRET="test-secret"` set, a request with no HMAC headers → 401.
- With correct HMAC headers (matching the TypeScript signing logic) → auth passes and the
  endpoint proceeds normally.

**Dependencies:** Tasks 1 and 2 of this plan (to test end-to-end signing + verification).

---

### Plan 5: Tests and Verification

**Objective:** Automated Vitest tests covering the two most testable behaviors (rate-limit
fail-hard and HMAC signing), a migration verification SQL script, and an updated `.env.example`
documenting the new env var.

**Requirements:** SEC-03, SEC-04, SEC-05, SEC-08, SEC-09 (verification coverage)

**Wave:** 3 (depends on Plans 3 and 4 completing)

**Files modified / created:**

- `src/__tests__/anti-spam.test.ts` (create new)
- `src/__tests__/worker-auth.test.ts` (create new)
- `supabase/migrations/verify_rls_policies.sql` (create new — manual verification script)
- `.env.example` (modify or create)

---

#### Tasks

##### Task 1: Vitest test — rate limit fail-hard (SEC-05)

**Type:** test

**File(s):**

- `src/__tests__/anti-spam.test.ts` (create new)

**Description:**

Create a Vitest test file that verifies:

1. `checkRateLimit` throws the expected error when called in a production environment without Redis.
2. `checkRateLimit` falls through to in-memory (returns a boolean, does not throw) in development
   without Redis.

Important implementation note: `anti-spam.ts` initializes `redis` at module load time using the
env vars present at that moment. Vitest module caching means you cannot simply `stubEnv` and
re-import to get a fresh module instance within the same test file. The correct approach is to
test the throw behavior by calling the exported `checkRateLimit` function directly after stubbing
`NODE_ENV` to `'production'` AND ensuring `UPSTASH_REDIS_REST_URL` is absent.

The test must NOT depend on the module being re-imported. Because `redis` is initialized at module
load, the test should verify the production guard inside `checkRateLimit` by:

- Calling `checkRateLimit` directly with `NODE_ENV` stubbed to `'production'`
- The function throws when `redis` is null AND `NODE_ENV === 'production'`

If the test environment initializes with Redis env vars present (from `.env.test`), the test
should be skipped or use a different approach. Document this caveat in a comment.

Write the test file as:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests for checkRateLimit fail-hard behavior in production.
 *
 * Note: anti-spam.ts initializes `redis` at module load time.
 * These tests verify the production guard inside checkRateLimit
 * by stubbing NODE_ENV after module load. They require that
 * UPSTASH_REDIS_REST_URL is NOT set in the test environment.
 * If it is set (e.g., in CI with real Redis), these tests are skipped.
 */
describe('checkRateLimit — production fail-hard (SEC-05)', () => {
  const hasRedis = Boolean(process.env.UPSTASH_REDIS_REST_URL);

  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.skipIf(hasRedis)('throws when Redis is not configured in production', async () => {
    const { checkRateLimit } = await import('../lib/anti-spam');
    await expect(checkRateLimit('test:127.0.0.1', 10, 60_000)).rejects.toThrow(
      'UPSTASH_REDIS_REST_URL'
    );
  });

  it.skipIf(hasRedis)('error message mentions the missing env var by name', async () => {
    const { checkRateLimit } = await import('../lib/anti-spam');
    await expect(checkRateLimit('test:127.0.0.1', 10, 60_000)).rejects.toThrow(
      /UPSTASH_REDIS_REST_URL.*UPSTASH_REDIS_REST_TOKEN/
    );
  });
});

describe('checkRateLimit — development in-memory fallback', () => {
  const hasRedis = Boolean(process.env.UPSTASH_REDIS_REST_URL);

  it.skipIf(hasRedis)(
    'returns a boolean (does not throw) in development without Redis',
    async () => {
      vi.stubEnv('NODE_ENV', 'development');
      const { checkRateLimit } = await import('../lib/anti-spam');
      const result = await checkRateLimit('test:127.0.0.1', 10, 60_000);
      expect(typeof result).toBe('boolean');
      vi.unstubAllEnvs();
    }
  );
});
```

**Acceptance:**

- `npx vitest run src/__tests__/anti-spam.test.ts` passes (tests either pass or are skipped; no failures).
- When Redis env vars are absent: production tests pass with the throw assertion.
- When Redis env vars are present: tests are skipped (no false failures in CI with real Redis).

**Dependencies:** Plan 3 Task 1 must be complete (anti-spam.ts must have the fail-hard guard).

---

##### Task 2: Vitest test — HMAC signing helper (SEC-08)

**Type:** test

**File(s):**

- `src/__tests__/worker-auth.test.ts` (create new)

**Description:**

Create a Vitest test file for `src/lib/worker-auth.ts`. The tests verify:

1. `signWorkerRequest` returns a 64-character lowercase hex signature and a positive integer timestamp.
2. Different bodies produce different signatures (body is included in the signing payload).
3. Different paths produce different signatures (path is included in the signing payload).
4. `signWorkerRequest` throws when `AI_WORKER_HMAC_SECRET` is not set.

Write the test file as:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('signWorkerRequest (SEC-08)', () => {
  beforeEach(() => {
    vi.stubEnv('AI_WORKER_HMAC_SECRET', 'test-secret-for-unit-tests-only');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('produces a 64-character lowercase hex signature', async () => {
    const { signWorkerRequest } = await import('../lib/worker-auth');
    const { signature } = await signWorkerRequest('POST', '/generate-lore', '{"trip_id":"abc"}');
    expect(signature).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces a positive integer timestamp string', async () => {
    const { signWorkerRequest } = await import('../lib/worker-auth');
    const { timestamp } = await signWorkerRequest('POST', '/generate-lore', '{"trip_id":"abc"}');
    expect(parseInt(timestamp, 10)).toBeGreaterThan(0);
    expect(timestamp).toMatch(/^\d+$/);
  });

  it('produces different signatures for different bodies', async () => {
    const { signWorkerRequest } = await import('../lib/worker-auth');
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

  it('produces different signatures for different paths', async () => {
    const { signWorkerRequest } = await import('../lib/worker-auth');
    const { signature: sig1 } = await signWorkerRequest(
      'POST',
      '/generate-lore',
      '{"trip_id":"abc"}'
    );
    const { signature: sig2 } = await signWorkerRequest(
      'POST',
      '/judge-battle',
      '{"trip_id":"abc"}'
    );
    expect(sig1).not.toBe(sig2);
  });

  it('throws when AI_WORKER_HMAC_SECRET is not set', async () => {
    vi.stubEnv('AI_WORKER_HMAC_SECRET', '');
    const { signWorkerRequest } = await import('../lib/worker-auth');
    await expect(signWorkerRequest('POST', '/generate-lore', '{}')).rejects.toThrow(
      'AI_WORKER_HMAC_SECRET'
    );
  });
});
```

**Acceptance:**

- `npx vitest run src/__tests__/worker-auth.test.ts` passes — all 5 tests green.

**Dependencies:** Plan 4 Task 1 (worker-auth.ts must exist).

---

##### Task 3: Migration verification script and .env.example update

**Type:** migration + config

**File(s):**

- `supabase/migrations/verify_rls_policies.sql` (create new — for manual verification; NOT run as
  a migration)
- `.env.example` (modify or create if absent)

**Description:**

**File 1: `supabase/migrations/verify_rls_policies.sql`**

This is a read-only verification script to be pasted into the Supabase SQL editor after running
the main migration. It confirms RLS is enabled and the expected policies exist. It is NOT a
migration (do not add it to the migration sequence):

```sql
-- =============================================================================
-- Phase 1 Security Foundation: RLS Verification Script
-- Run this in the Supabase SQL editor AFTER applying 20260519_security_rls_hardening.sql
-- Expected: all rows show rowsecurity = true and all expected policies appear.
-- =============================================================================

-- 1. Check RLS is enabled on all target tables
SELECT
  tablename,
  rowsecurity,
  CASE WHEN rowsecurity THEN 'OK' ELSE 'FAIL — RLS NOT ENABLED' END AS status
FROM pg_tables
WHERE
  schemaname = 'public'
  AND tablename IN (
    'trips', 'trip_eras', 'scheduled_emails',
    'otp_codes', 'trip_stats', 'trip_vs_trip', 'background_jobs'
  )
ORDER BY tablename;


-- 2. List all policies on target tables
SELECT
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE
  schemaname = 'public'
  AND tablename IN (
    'trips', 'trip_eras', 'scheduled_emails',
    'otp_codes', 'trip_stats', 'trip_vs_trip', 'background_jobs'
  )
ORDER BY tablename, policyname;


-- 3. Confirm otp_codes PK is now on the uuid column (not email)
SELECT
  kcu.column_name,
  tc.constraint_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE
  tc.table_schema = 'public'
  AND tc.table_name = 'otp_codes'
  AND tc.constraint_type = 'PRIMARY KEY';
-- Expected: column_name = 'id'


-- 4. Confirm otp_codes email index exists (for efficient per-email queries)
SELECT indexname, indexdef
FROM pg_indexes
WHERE
  schemaname = 'public'
  AND tablename = 'otp_codes'
  AND indexname = 'idx_otp_codes_email';
-- Expected: one row


-- 5. Spot-check: verify non-member cannot read trips via user-scoped client
-- (Run this as an authenticated user who is NOT a member of any trip)
-- SELECT id, name FROM public.trips LIMIT 5;
-- Expected: 0 rows
```

**File 2: `.env.example`**

Locate the existing `.env.example` (or create it at the project root if absent). Add the following
entry in the AI Worker section (near `AI_WORKER_SECRET`). Do not modify any existing entries:

```
# AI Worker HMAC signing (Phase 1 Security Foundation — SEC-08)
# Generate a strong random secret: openssl rand -hex 32
# Must be set on BOTH Vercel (Next.js) and Render (AI worker) simultaneously during rollout.
AI_WORKER_HMAC_SECRET=
```

**Acceptance:**

- `verify_rls_policies.sql` query 1 shows `rowsecurity = true` for all 7 tables.
- Query 2 shows at least one policy per table (trips has 5, trip_eras has 2, etc.).
- Query 3 returns `column_name = 'id'` for otp_codes PK.
- `.env.example` contains the `AI_WORKER_HMAC_SECRET=` line.
- The verification SQL file does NOT appear in `supabase/migrations/` as an active migration
  (it should be committed to the repo but not applied by `supabase db reset`; rename to
  `verify_rls_policies.sql` with no timestamp prefix to signal it is not a migration).

**Dependencies:** Plan 1 Tasks 1 and 2 (migration must be applied before verifying), Plan 4 Task 1
(worker-auth.ts must exist for .env.example to be meaningful).

---

## Success Criteria

The following must ALL be true before Phase 1 is considered complete:

1. **Any authenticated Supabase client querying `trips`, `trip_eras`, `scheduled_emails`,
   `otp_codes`, `trip_stats`, or `trip_vs_trip` directly (bypassing tRPC) receives only
   authorized rows.** A user who is not a member of trip X receives zero rows when querying
   `trips` filtered to that trip. Verified by: running the spot-check SQL in
   `verify_rls_policies.sql` query 5 as a non-member.

2. **`background_jobs` RLS enabled with service-role-only policy.** The AI worker's
   `poll_background_jobs()` loop continues to function after the migration. Verified by:
   `pg_policies` query showing the policy, and the worker's polling loop producing no 403 errors.

3. **Sending a request to `/api/reactions` with a `tripId` for a private trip (or a non-existent
   tripId) returns 403 or 404 respectively, not an inserted row.** Verified by: manual HTTP
   request or Vitest mock test (Plan 5).

4. **`UPSTASH_REDIS_REST_URL` absent in production causes `checkRateLimit` to throw rather than
   silently fall back to in-memory.** Verified by: `vitest run src/__tests__/anti-spam.test.ts`
   passing in an environment without Redis env vars.

5. **AI worker requests without valid HMAC-SHA256 signature and recent timestamp are rejected
   with 401 once `AI_WORKER_HMAC_SECRET` is set on both sides.** Verified by: `vitest run
src/__tests__/worker-auth.test.ts` passing; manual test against the local AI worker with
   the secret set.

6. **CSP header is present on all Next.js responses.** Verified by:
   `curl -sI http://localhost:3000/ | grep content-security-policy` returning a value.

7. **`archetypes.getPublicHistory` uses `.eq()` not `.ilike()`.** Verified by:
   `grep -n "ilike" src/server/trpc/routers/archetypes.ts` returning zero results.

8. **`otp_codes` PK is UUID.** Verified by: `verify_rls_policies.sql` query 3 returning
   `column_name = id`; two OTP inserts for the same email succeeding without PK violation.

---

## Risks

### Risk 1 — RLS on trips breaks `getChaosDistribution` cross-user query (by design)

`getChaosDistribution` (`trips.ts` lines 521–538) queries ALL trips with `lore_status = 'ready'`
using `ctx.supabase` (user-scoped client). After RLS, this correctly returns only the calling
user's trips. This is the intended fix (ARCH-05) but may produce a visually less interesting chaos
distribution for new users with few trips. This is a known acceptable regression for Phase 1.

**Mitigation:** None required in Phase 1. Phase 5 adds caching (PERF-03) and proper scoping
(ARCH-05). Notify the team that the distribution may appear empty for users with zero completed
trips.

### Risk 2 — CSP breaks PostHog or Razorpay in production (staging required)

The CSP as written covers known CDN origins, but PostHog may load additional sub-resources from
unlisted origins in certain regions or product configurations.

**Mitigation:** Before switching from development to production traffic, test with browser DevTools
Console open on the `/trips` and story pages. Any CSP violation appears immediately as a console
error. If PostHog or Razorpay breaks, add the missing origin to `connect-src` or `script-src` and
redeploy. Start with a small traffic percentage if possible.

### Risk 3 — HMAC rollout requires coordinated two-deploy sequence

`signWorkerRequest` throws if `AI_WORKER_HMAC_SECRET` is absent. This means deploying the updated
Next.js routers WITHOUT the env var set on Vercel will break ALL AI worker calls immediately.

**Mitigation — follow this exact sequence (no deviations):**

1. Deploy `ai-worker/src/auth.py` to Render WITHOUT setting `AI_WORKER_HMAC_SECRET` on Render yet.
   Worker is in graceful-skip mode — HMAC headers are ignored, all existing requests pass through.
2. Set `AI_WORKER_HMAC_SECRET` on Render. Worker now requires HMAC on requests — but Next.js
   still sends no HMAC headers, so worker uses graceful-skip (still passes all requests since
   the header is absent, not invalid).
3. Set `AI_WORKER_HMAC_SECRET` on Vercel (same value as Render).
4. Deploy Next.js with `src/lib/worker-auth.ts` and updated routers. `signWorkerRequest` can now
   sign requests because the env var is present. HMAC enforcement is active on both sides.

**Do NOT deploy Next.js code changes (Plan 4 Task 2) before step 3.** The env var must be set on
Vercel before the Next.js deployment or all AI worker calls will throw.

### Risk 4 — otp_codes migration holds ACCESS EXCLUSIVE lock

The `ALTER TABLE` operations hold an `ACCESS EXCLUSIVE` lock on `otp_codes`. The table stores
short-TTL rows (10-minute OTP expiry) and is small. The lock duration is subsecond. During the
lock window, any in-flight OTP send or verify request that hits the database will queue until the
lock releases.

**Mitigation:** Apply the migration during a low-traffic window (early morning IST). The risk of
disrupting an OTP flow in flight is low given the migration is subsecond.

### Risk 5 — `get_trip_full` RPC not in migrations (informational)

`get_trip_full` is called in `trips.ts` but is not defined in any migration file. It runs as
SECURITY DEFINER (postgres superuser) and is therefore unaffected by the new RLS policies. This
is noted here for completeness; it does NOT require action in Phase 1. Track as a follow-up for
Phase 5 (ARCH cleanup).

---

## Execution Notes

### Recommended execution order

1. **Apply Plan 1 migration to staging first.** Paste `20260519_security_rls_hardening.sql` into
   the Supabase SQL editor for a staging project. Run `verify_rls_policies.sql` and confirm all
   checks pass. Test `getChaosDistribution`, `trips.list`, `battles.get`, and the public story
   route (`/t/[code]/story`) on staging before applying to production.

2. **Plans 2, 3, and 4 can be coded in parallel** — they are independent code changes with no
   file conflicts.

3. **Deploy AI worker changes (Plan 4 Task 3) before setting `AI_WORKER_HMAC_SECRET`** on either
   environment. With the secret absent, the worker skips HMAC verification and operates as before.
   Only after BOTH sides are deployed should you set the env var — first on Render, then on Vercel.
   After setting the Vercel env var, trigger a redeployment so Next.js picks up the secret and
   `signWorkerRequest` can actually sign requests.

4. **Apply the production migration only after staging is verified.** RLS on `trips` is the
   highest-impact change — it will immediately enforce data isolation for all subsequent queries
   from user-scoped clients.

5. **Plan 5 tests run last** — they verify the behavior that Plans 3 and 4 implemented.

### Post-Plan 1 manual checks

After applying the database migration to production:

- Log in as User A, get a `trip_id` from User B. Open Supabase Table Editor as User A's JWT
  (or use the Supabase API with User A's anon key + JWT) — confirm zero rows returned for User
  B's trip.
- Trigger lore generation on a test trip to confirm the AI worker can still read/write trips via
  service role after RLS is enabled.
- Send an OTP, then send a second OTP for the same email within a few seconds — confirm both
  succeed without a PK error (the UUID PK fix is live).

### Post-Plan 2 manual checks

- Open the public story page (`/t/[code]/story`) in an incognito browser. Confirm it loads
  (service role reads are unaffected by RLS).
- Open DevTools → Console on the trips page and the story page. Confirm zero CSP violation errors.
- POST to `/api/reactions` with a non-existent `tripId` via curl — expect 404.
- POST to `/api/reactions` with a private `tripId` and no auth — expect 403.

### Post-Plan 4 manual checks

- With `AI_WORKER_HMAC_SECRET` set on both sides and the worker running locally, trigger lore
  generation on a test trip. Confirm the generation succeeds (signed request accepted).
- Check AI worker logs for `[HMAC]` or verify that no 401 errors appear.
- Temporarily set an incorrect secret on one side — confirm the worker returns 401.
