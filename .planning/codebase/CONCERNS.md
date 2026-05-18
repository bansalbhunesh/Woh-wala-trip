# Codebase Concerns

**Analysis Date:** 2026-05-18

---

## Security Concerns

### CRITICAL — `trips` and `trip_eras` tables have no RLS enabled

**Risk:** Any authenticated user can read, update, or delete any trip and any era row via the Supabase anon key directly (e.g., from the browser using `@supabase/ssr`).
**Files:** `supabase/migrations/` — no migration ever calls `ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY` or `ALTER TABLE public.trip_eras ENABLE ROW LEVEL SECURITY`.
**Impact:** All lore data, chaos scores, invite codes, and payment tier flags are fully readable and writable by any signed-in user. A user who knows a `trip_id` UUID can update `tier = 'digital'` without paying.
**Fix approach:** Add RLS to `trips` (members can SELECT, creator can INSERT/UPDATE, service role has full access) and `trip_eras` similarly.

---

### CRITICAL — `scheduled_emails`, `otp_codes`, `trip_stats`, `trip_vs_trip` have no RLS

**Risk:** Tables created without `ENABLE ROW LEVEL SECURITY`. The anon or authenticated Supabase key gives unauthenticated/foreign-user read access to anniversary email schedules, hashed OTP codes, trip stats, and battle records.
**Files:**

- `supabase/migrations/20260515_otp_codes.sql` — `DISABLE ROW LEVEL SECURITY` is explicit.
- `supabase/migrations/20260516_anniversary_and_reactions.sql` — `scheduled_emails` has no RLS at all.
- `trip_stats` and `trip_vs_trip` — created by the orchestrator at runtime or implicitly; no migration enables RLS.
  **Note on `otp_codes`:** The migration comment says "No RLS needed since this is server-only access via API routes." This is incorrect — any Supabase client with the anon key can read all hashed OTP codes directly without going through the API.
  **Fix approach:** Enable RLS with service-role-only policies on `otp_codes` and `scheduled_emails`. Add read policies scoped to trip members for `trip_vs_trip`.

---

### HIGH — `reactions/route.ts` accepts unauthenticated write with no trip-membership check

**Risk:** Anonymous users can inject reactions for any `trip_id` they guess, with no validation that the trip exists or is public. Combined with missing trips RLS, reaction counts can be inflated by bots.
**File:** `src/app/api/reactions/route.ts` lines 76–84 — anonymous INSERT path inserts with `user_id: null` and accepts any `tripId` without verifying it exists.
**Fix approach:** Require `trip.is_public = true` before accepting anonymous reactions, or reject anonymous reactions entirely.

---

### HIGH — Service role client used without downstream ownership check in `photos.list`

**Risk:** `photos.list` in `src/server/trpc/routers/photos.ts` (line 316 onward) queries `photos` using the user-scoped client (which relies on `trip_members` RLS), but then writes back signed URLs and refreshes using the **service role** client (`adminSupabase`) without re-verifying trip membership. If the underlying `trip_members` RLS policy has a bug or is bypassed, the signed URL cache write path uses unrestricted service-role writes.
**File:** `src/server/trpc/routers/photos.ts` lines 351–410.
**Fix approach:** The membership check at the `protectedProcedure` layer is correct, but consider adding an explicit assertion before the service-role write block.

---

### HIGH — `getChaosDistribution` leaks data cross-user via unscoped service query

**Risk:** `trips.getChaosDistribution` (a `protectedProcedure`) queries ALL trips with `lore_status = 'ready'` using `ctx.supabase` (user-scoped client). Because `trips` has no RLS, this returns `chaos_score` values from trips the calling user is not a member of.
**File:** `src/server/trpc/routers/trips.ts` lines 521–538.
**Impact:** Aggregate data leak (chaos scores only), but confirms trips exist.
**Fix approach:** Add RLS to the `trips` table; OR scope the query to trips where the user is a member.

---

### HIGH — No Content-Security-Policy header

**Risk:** `next.config.mjs` sets `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy`, but there is no `Content-Security-Policy` header. This leaves the app vulnerable to XSS if any user-controlled data is ever unsafely rendered.
**File:** `next.config.mjs` lines 12–28.
**Fix approach:** Add a strict CSP. At minimum: `default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co https://cloud.langfuse.com; img-src 'self' data: https://*.supabase.co; style-src 'self' 'unsafe-inline'`.

---

### MEDIUM — `archetypes.getPublicHistory` uses `ilike` on username with no input sanitization

**Risk:** The username input from the URL is passed directly to `.ilike('username', input.username)`. While Supabase parameterizes this, `ilike` with a user-supplied value containing `%` or `_` is a wildcard injection that can enumerate all users matching a pattern rather than exact username.
**File:** `src/server/trpc/routers/archetypes.ts` line 75.
**Fix approach:** Use `.eq('username', input.username.toLowerCase())` or add a `.trim().replace(/[%_]/g, '')` guard.

---

### MEDIUM — IP rate limiting falls back to in-memory, non-persistent state

**Risk:** The `checkRateLimit` function in `src/lib/anti-spam.ts` uses Upstash Redis when configured, but falls back to an in-memory `Map`. In a serverless environment (Vercel), each function invocation has a fresh cold-start process — the in-memory map resets on every cold start, making the rate limit completely ineffective without Redis.
**File:** `src/lib/anti-spam.ts` lines 410–453.
**Fix approach:** Make `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` required (fail-hard) in production rather than silently degrading to memory.

---

### MEDIUM — `stuck-jobs` cron runs once daily, not every 15 minutes

**Risk:** The route comment (`src/app/api/cron/stuck-jobs/route.ts` line 5) says "Runs every 15 minutes" but `vercel.json` schedules it at `0 7 * * *` (once per day at 7 AM UTC). A pipeline that crashes at 8 AM stays stuck with `lore_status = 'processing'` for ~23 hours, blocking the user's retry.
**Files:** `src/app/api/cron/stuck-jobs/route.ts` vs `vercel.json`.
**Fix approach:** Change `vercel.json` cron schedule to `*/15 * * * *` (every 15 minutes) as intended. Note that Vercel free plan only supports once-per-day crons; upgrade to Pro or use a third-party scheduler.

---

### LOW — `AI_WORKER_SECRET` is used as a simple Bearer token with no request signing

**Risk:** The AI worker verifies `Authorization: Bearer <secret>` as a static string. There is no request body signing, timestamp, or nonce. If the secret leaks (e.g., in logs), any attacker can trigger lore generation, battle judging, or image generation for any trip_id.
**Files:** `ai-worker/src/main.py` line 164; `src/server/trpc/routers/trips.ts` lines 365, 461.
**Fix approach:** Add HMAC-SHA256 request signing (sign `trip_id + timestamp`) and verify on the worker side. At minimum add request timestamp validation to prevent replay attacks.

---

## Performance Concerns

### HIGH — N+1 signed URL updates in `photos.list`

**Problem:** After fetching up to 100 photos, the list handler fires one UPDATE per photo row in parallel via `Promise.all` to persist refreshed signed URLs — up to 100 concurrent Supabase writes per page load.
**File:** `src/server/trpc/routers/photos.ts` lines 393–410.
**Impact:** On a trip with 50+ photos and high traffic, this generates a thundering herd of writes on every cache-miss load. Supabase will throttle these on free-tier plans.
**Fix approach:** Batch the URL cache writes using a single `upsert` call with all rows, or write the cache asynchronously (fire-and-forget) so it never blocks the response.

---

### HIGH — AI worker in-memory budget counters reset on process restart

**Problem:** `_fal_calls_today` and `_trip_window` in `ai-worker/src/image_gen.py` are plain Python module-level variables. A Render free-tier dyno restarts frequently (every 15 minutes of inactivity). Every restart resets the daily budget counter to zero, allowing the configured `FAL_DAILY_BUDGET` cap to be bypassed by N restarts.
**File:** `ai-worker/src/image_gen.py` lines 41–83.
**Fix approach:** Persist budget state to Supabase (a simple `fal_budget` table with date + count) or Redis.

---

### HIGH — `photos.list` fetches `select('*')` including heavy embedding columns

**Problem:** `photos.list` uses `select('*')` which includes `clip_embedding` (a 512-dimension vector) and `signed_url`, `thumb_signed_url` columns on every row. The `clip_embedding` column alone is ~2KB per row; at 100 photos that's 200KB of vector data returned per API call but never used by the client.
**File:** `src/server/trpc/routers/photos.ts` line 326.
**Fix approach:** Replace `select('*')` with an explicit column list that excludes `clip_embedding`.

---

### MEDIUM — `photo_views` table has no SELECT policy, only INSERT + service_role

**Problem:** `photo_views` has no SELECT RLS policy for authenticated users. The orchestrator queries `photo_views` directly using the Supabase service client to compute dwell time signals — this works. But any future app-layer SELECT via the user client will silently return nothing rather than error, causing silent signal loss.
**File:** `supabase/migrations/003_photo_views.sql` lines 29–47.
**Fix approach:** Add `CREATE POLICY "trip members can read own view data" ON photo_views FOR SELECT TO authenticated USING (user_id = auth.uid())`.

---

### MEDIUM — `getChaosDistribution` fetches ALL ready trips with no pagination

**Problem:** The procedure fetches every trip row with `lore_status = 'ready'` across all users to compute a percentile distribution. As trip count grows to thousands, this becomes an unbounded full-table scan on every page load of `/trips`.
**File:** `src/server/trpc/routers/trips.ts` lines 523–527.
**Fix approach:** Pre-compute the distribution in the database as a materialized view refreshed hourly, or cache the result in Redis/Edge Config with a 10-minute TTL.

---

### MEDIUM — Vision analysis downloads full-resolution photos via `httpx` synchronously

**Problem:** `_analyze_one_batch` in `ai-worker/src/lore/orchestrator.py` downloads each photo via `httpx.get(signed_url, timeout=15)` synchronously inside `asyncio.to_thread`. A batch of 20 photos with 5MB each = 100MB of network I/O before the Claude call fires. On Render free tier (1GB RAM), this risks OOM on large trips.
**File:** `ai-worker/src/lore/orchestrator.py` lines 516–527.
**Fix approach:** Stream images directly or use `httpx.AsyncClient` instead of the sync client inside `to_thread`. Add a per-image size cap (e.g., 8MB) and reject oversized images.

---

### LOW — Signed URL cache TTL mismatch: URLs expire in 3600s but cache considers 600s expired

**Problem:** Signed URLs are generated with `expiry=3600` seconds but the cache refresh threshold is "10 minutes remaining." This is fine, but the `url_expires_at` column stores the expiry as `Date.now() + 3600 * 1000` while storage URLs technically expire at `now + 3600s` from Supabase's clock. Clock skew between the Next.js server and Supabase can cause premature cache misses.
**File:** `src/server/trpc/routers/photos.ts` lines 355–394.
**Fix approach:** Minor — acceptable in practice, but consider using `3540s` (59 minutes) as the cache TTL to add headroom.

---

## Scalability Concerns

### HIGH — AI pipeline is single-instance with no horizontal scaling

**Problem:** The AI worker runs one poll loop (`poll_job_queue`) and one `poll_background_jobs` loop per process. The `claim_generation_job` Postgres function uses `FOR UPDATE SKIP LOCKED` which is correct for N workers. However, the `_GLOBAL_RATE_LIMITER` semaphore and `_lore_last_triggered` cooldown dict are in-process. Running 2 Render instances would have 2 independent rate limiter states — each allows 8 concurrent LLM calls, so 2 instances = 16 concurrent Claude calls with no cross-instance coordination.
**File:** `ai-worker/src/main.py` lines 143, 160; `ai-worker/src/lore/orchestrator.py` line 143.
**Fix approach:** Move the cooldown state to Redis or Supabase. Until then, document that the worker must run as a single instance.

---

### HIGH — No per-user cap on total lore generation runs

**Problem:** `generateLore` only prevents concurrent runs (max 1 active at a time). There is no limit on total historical generations per user. A user can generate lore on 100 trips serially, consuming unlimited Claude tokens. The per-pipeline budget (`PipelineBudget`, 60k tokens) limits one run but not aggregate usage.
**File:** `src/server/trpc/routers/trips.ts` lines 282–390; `ai-worker/src/lore/orchestrator.py` lines 69–88.
**Fix approach:** Add a monthly token budget per user tracked in `profiles.generation_tokens_used_this_month`. Block generation when exceeded.

---

### MEDIUM — Battle challenge rate limit is bypassable via trip ownership transfer

**Problem:** The battle rate limit (3 battles per user per 24h) checks only trips where `creator_id = ctx.user.id`. A user with multiple trips could spread challenges — the in/out trip_a_id filter only counts battles initiated by the user's owned trips. If a user owns 10 trips and fires 3 battles from each, they get 30 battles with no cap.
**File:** `src/server/trpc/routers/battles.ts` lines 56–74.
**Fix approach:** Count battles `WHERE trip_a_id IN (owned_ids) OR trip_b_id IN (owned_ids)` OR enforce the cap globally per `user_id` via a `user_battle_count` Redis counter.

---

### MEDIUM — Photo embedding batch polling does no batching

**Problem:** Each `confirmUpload` fires two fire-and-forget HTTP POST requests to the AI worker (`/generate-thumbnail` and `/embed-photo`). On bulk uploads (20 photos), this sends 40 requests in rapid succession to the Render free-tier worker, which can cause request queuing / dropped connections since FastAPI's `BackgroundTasks` is single-threaded.
**File:** `src/server/trpc/routers/photos.ts` lines 200–212.
**Fix approach:** Queue photo IDs in Supabase and have the worker poll for pending embeddings every 30s, rather than individual HTTP triggers per photo.

---

### LOW — In-memory `ipBuckets` Map in anti-spam grows unbounded

**Problem:** `ipBuckets` in `src/lib/anti-spam.ts` line 410 never evicts stale entries. In high-traffic scenarios (millions of unique IPs), this Map grows forever in the serverless process memory until the function cold-starts and resets.
**File:** `src/lib/anti-spam.ts` lines 410–452.
**Fix approach:** Add LRU eviction (keep max 10,000 entries) or rely exclusively on Upstash Redis.

---

## Reliability Concerns

### HIGH — `stuck-jobs` cron scheduled once daily but pipeline timeout is 10 minutes

**Problem:** The `stuck-jobs` cron (see Security section above) is documented to reset pipelines stuck > 10 minutes, but it runs only once daily at 7 AM UTC. A pipeline that crashes at 8 AM stays stuck for ~23 hours. The AI worker has its own `reset_stuck_pipelines` that runs every 30 poll ticks (~30 minutes) — but only if the worker process is running. If the worker itself crashes, neither mechanism fires.
**Files:** `vercel.json`, `src/app/api/cron/stuck-jobs/route.ts`, `ai-worker/src/main.py` lines 65–71.
**Fix approach:** Fix the cron schedule to `*/15 * * * *` or implement Supabase realtime to trigger a webhook when `processing_started_at` is older than 15 minutes.

---

### HIGH — `markAbsent` worker call is fire-and-forget with no success tracking

**Problem:** `trips.markAbsent` fires a `fetch` to `/generate-missing-person-card` and `.catch(e => console.error(...))` — no retry, no job queue entry, no status update on failure. If the worker is cold-starting or unreachable, the missing-person card silently never gets generated.
**File:** `src/server/trpc/routers/trips.ts` lines 461–468.
**Fix approach:** Use the same `generation_jobs` queue pattern: insert a `background_jobs` row of type `missing_person_card` and let the worker poll it.

---

### HIGH — `battles.challenge` fires `/judge-battle` fire-and-forget; battle stays `pending` forever on worker failure

**Problem:** Same pattern as `markAbsent`. The worker call fires and if it fails (worker cold-start, crash, or timeout), the battle stays in `status: 'pending'` indefinitely. There is no cron or retry to recover stuck battles.
**File:** `src/server/trpc/routers/battles.ts` lines 108–116.
**Fix approach:** Insert into `background_jobs` table with `job_type = 'judge_battle'` instead of HTTP trigger. Add a cleanup for battles stuck pending > 1 hour.

---

### MEDIUM — No circuit breaker on Langfuse observability calls

**Problem:** `src/lib/langfuse.ts` fires `fetch` to `https://cloud.langfuse.com` on every AI call trace. The `try/catch` suppresses errors but does not implement backoff. If Langfuse is down, every security event trace in `send-otp` and `generate-lore` makes a blocking network call before continuing.
**File:** `src/lib/langfuse.ts` lines 57–66.
**Impact:** Adds latency to auth flows (send-otp calls `traceSecurityEvent` inline before returning).
**Fix approach:** Make `sendToLangfuse` fire-and-forget (don't `await` it) or use a background queue.

---

### MEDIUM — `confirmUpload` has no server-side file size validation

**Problem:** `photos.confirmUpload` accepts `fileSize` from the client without server-side verification. A malicious client can call `confirmUpload` with `fileSize: 0` on a large upload to evade the 500MB storage soft limit. The actual file in Supabase Storage may be larger than `file_size` recorded in the DB.
**File:** `src/server/trpc/routers/photos.ts` lines 126–216.
**Fix approach:** Use a Supabase Storage webhook to get authoritative file size after upload, or query `storage.objects` for the actual size during `confirmUpload`.

---

### LOW — Anniversary email loop does not handle `resend.emails.send` partial failures

**Problem:** The anniversary cron sends emails in a serial for-loop. If `resend.emails.send` throws after `sent_at` is already updated to prevent duplicate sends, the email is marked sent but never actually delivered. There is no dead-letter queue or retry.
**File:** `src/app/api/cron/anniversaries/route.ts` lines 101–176.
**Fix approach:** Move the `sent_at` claim to after `resend.emails.send` completes successfully. Accept that rare race conditions (dual send) are better than silent drops.

---

## Maintainability Concerns

### HIGH — Pervasive `as any` / `as never` / `as unknown` casts suppress type safety

**Problem:** 59 occurrences of `as any` across 20 source files, plus numerous `as never` and `as unknown as X` casts in routers. The root cause is that Supabase's generated types (`src/lib/database.types.ts`) are stale — they don't include columns added by recent migrations (signed URL cache, embedding status, referral fields, etc.). The casts paper over the mismatch instead of regenerating types.
**Files:** `src/server/trpc/routers/trips.ts`, `src/server/trpc/routers/photos.ts`, `src/app/api/cron/anniversaries/route.ts`, and 17 other files.
**Fix approach:** Run `supabase gen types typescript --project-id <id>` to regenerate `src/lib/database.types.ts`, then remove the casts.

---

### HIGH — `otp_codes` table uses email as PRIMARY KEY

**Problem:** `supabase/migrations/20260515_otp_codes.sql` defines `email text PRIMARY KEY`. This means only one active OTP can exist per email at a time. Rapid OTP re-sends (within 15 minutes) would conflict on insert. The code uses `insert` not `upsert` — a second OTP send within the window will throw a PK violation (caught but silently swallowed).
**File:** `supabase/migrations/20260515_otp_codes.sql` line 5.
**Fix approach:** Change the PK to `gen_random_uuid()` and add a non-unique index on `email`.

---

### MEDIUM — `yearly_wraps` table exists but no generation code is wired up

**Problem:** `supabase/migrations/20260516_cross_trip_features.sql` creates the `yearly_wraps` table and its RLS policies, and `src/app/wrap/[year]/page.tsx` exists as a route, but no tRPC router, no API endpoint, and no AI worker path generates yearly wraps. The feature is scaffolded but entirely non-functional.
**Files:** `supabase/migrations/20260516_cross_trip_features.sql` lines 34–55; `src/app/wrap/[year]/page.tsx`.
**Fix approach:** Either wire up generation or delete the dead table and route to reduce confusion.

---

### MEDIUM — `background_jobs` table has no RLS policy defined

**Problem:** `supabase/migrations/20260518_hermes_lorian_observability.sql` calls `ALTER TABLE background_jobs ENABLE ROW LEVEL SECURITY` but adds zero policies. A table with RLS enabled and no policies blocks ALL access from any role except superuser. The worker uses the service role key (bypasses RLS) so it works, but any future app-side query will silently return nothing.
**File:** `supabase/migrations/20260518_hermes_lorian_observability.sql` lines 32–33.
**Fix approach:** Add `CREATE POLICY "service role full access" ON background_jobs FOR ALL TO service_role USING (true) WITH CHECK (true);`.

---

### MEDIUM — `vercel.json` cron comment vs. reality discrepancy

**Problem:** `src/app/api/cron/stuck-jobs/route.ts` documents "Runs every 15 minutes" but `vercel.json` schedules it once daily. This is a silent operational bug that would only be discovered when a production incident reveals stuck pipelines lasting hours.
**Files:** `vercel.json`, `src/app/api/cron/stuck-jobs/route.ts`.
**Fix approach:** Fix schedule (requires Vercel Pro) or update the comment to say "Runs once daily."

---

### LOW — `src/proxy.ts` exists but its purpose is undocumented

**Problem:** `src/proxy.ts` exists at the top level of `src/` but is not imported by any route, router, or component found in the codebase search. Its purpose is unknown.
**File:** `src/proxy.ts`.
**Fix approach:** Audit whether this is dead code. Delete if unused.

---

### LOW — `scripts/prepare.mjs` unchecked

**Problem:** `scripts/prepare.mjs` was not read. It may contain setup scripts with hard-coded values, dangerous operations, or secrets.
**File:** `scripts/prepare.mjs`.
**Fix approach:** Review contents; ensure no secrets or dangerous shell commands are present.

---

## Cost Risks

### HIGH — No monthly aggregate token cap across all users

**Problem:** The `PipelineBudget(max_tokens=60_000)` in `ai-worker/src/lore/orchestrator.py` caps a single pipeline run but not total spend. There are no alerts or hard stops at the account level. A viral growth event (1,000 users generating lore in one day at ~40k tokens each) would cost ~$1,200 in a single day with no safeguard.
**Files:** `ai-worker/src/lore/orchestrator.py` lines 69–88; `ai-worker/src/config.py`.
**Fix approach:** Track `generation_cost_tokens` already stored in `trips` table; add a daily aggregate query to block generation if total tokens today > configurable ceiling. Set Anthropic dashboard spend alerts.

---

### HIGH — fal.ai budget counters reset on worker restart (see Performance section)

**Problem:** The `FAL_DAILY_BUDGET` cap is enforced by an in-memory counter that resets on every Render restart. On Render free tier, dynos sleep after 15 minutes of inactivity and restart on the next request. This means the daily image-gen budget is effectively per-wakeup, not per-day.
**File:** `ai-worker/src/image_gen.py` lines 41–63.
**Fix approach:** Persist the `_fal_calls_today` counter to Supabase.

---

### MEDIUM — LoreEvaluator fires an extra Claude Haiku call on EVERY pipeline run

**Problem:** Every successful lore generation calls `LoreEvaluator.evaluate()` which fires a `claude-haiku` call to score quality. This means every trip costs 1 extra Haiku call (~400 tokens) even when lore quality is fine. At scale this adds meaningful cost.
**File:** `ai-worker/src/lore/orchestrator.py` lines 106–136, called at line 241.
**Fix approach:** Sample evaluation at 20% of runs in production. Only run full evaluation when `lore_eval_json` is absent or > 7 days stale.

---

### MEDIUM — `warmupWorker` mutation is called client-side on every upload reaching 5 photos

**Problem:** `warmupWorker` fires a tRPC mutation which calls `fetch(`${workerUrl}/health`)` with a 5-second timeout — this creates a real HTTP connection to the Render worker on every user's first 5-photo threshold. Multiple concurrent users in a session each trigger their own warmup, generating unnecessary traffic.
**File:** `src/server/trpc/routers/trips.ts` lines 543–552; `src/app/trips/[tripId]/page.tsx` lines 1018–1024.
**Fix approach:** Add a 10-minute server-side cache on the warmup response (e.g., set `warmed_at` in a KV store); skip the worker call if already warmed recently.

---

## Architecture Concerns

### HIGH — `trips` table used as a job state machine, lore store, AND payment record

**Problem:** The `trips` table carries: lore content (`lore_json`, `chaos_score`), pipeline state (`lore_status`, `lore_pipeline_state`, `processing_started_at`, `lore_error`), quality metadata (`lore_eval_json`, `lore_needs_review`), payment state (`tier`, `payment_id`, `expires_at`), storage accounting (`storage_used_bytes`), image generation URLs (`cover_image_url`), and observability (`generation_cost_tokens`, `generation_cost_by_step`, `lore_trace_id`). This is a god table.
**Impact:** Every SELECT on trips pulls 25+ columns. Adding features requires touching the same table with no isolation.
**Fix approach:** Extract `lore_generation` columns into a `trip_lore` table (1:1 with `trips`) and `trip_payment` for billing state.

---

### MEDIUM — Two separate stuck-job recovery mechanisms running independently

**Problem:** Both `vercel.json` cron (`/api/cron/stuck-jobs`) and the AI worker's `reset_stuck_pipelines` (every 30 poll ticks ≈ 30 minutes) independently attempt to reset stuck pipelines. They use different cutoffs: 10 minutes (cron) vs 30 minutes (worker). If both fire simultaneously on the same trip, the second update is a no-op (idempotent due to `.eq('lore_status', 'processing')`), but this is accidental correctness.
**Files:** `src/app/api/cron/stuck-jobs/route.ts`; `ai-worker/src/lore/orchestrator.py` lines 324–349.
**Fix approach:** Consolidate to one recovery mechanism (prefer the worker-side one since it has better observability) and remove the cron duplication.

---

### MEDIUM — Anonymous reactions bypass the unique index via NULL coalescing

**Problem:** The unique index on `lore_reactions` coalesces `NULL` user_id to a constant UUID `'00000000-...'`, meaning only one anonymous reaction per slide per trip can be upserted — all anonymous reactions are deduplicated to the zero UUID. This means anonymous reaction counts are always at most 1 per slide.
**File:** `supabase/migrations/20260516_anniversary_and_reactions.sql` lines 56–57; `src/app/api/reactions/route.ts` line 77 (anonymous INSERT, not upsert).
**Actual behavior:** The `POST /api/reactions` anonymous path uses INSERT (not UPSERT), bypassing the index entirely. So anonymous reactions can be inserted infinitely but the index doesn't prevent duplicates for them. This is the opposite of what the schema intends.
**Fix approach:** Either enforce the unique constraint properly (use `UPSERT` with a fingerprint for anonymous users, e.g., hashed IP), or accept unlimited anonymous reactions and document it.

---

## Product Concerns

### HIGH — Wrap page (`/wrap/[year]`) is a dead route with no data

**Problem:** `src/app/wrap/[year]/page.tsx` exists and is presumably linked or accessible, but `yearly_wraps` data is never generated. Users who navigate to this URL will receive empty or error state.
**File:** `src/app/wrap/[year]/page.tsx`; `supabase/migrations/20260516_cross_trip_features.sql` lines 34–55.
**Fix approach:** Either generate wraps or redirect the route to `/trips`.

---

### MEDIUM — Generating page has client-side 4-minute timeout but offers no useful recovery

**Problem:** After 4 minutes, `src/app/trips/[tripId]/generating/page.tsx` shows a "Go back & retry" button. But the trip's `lore_status` is still `processing` — pressing retry from the trip room will hit the "already processing" guard and fail. The user is effectively stuck until the daily stuck-jobs cron fires.
**File:** `src/app/trips/[tripId]/generating/page.tsx` lines 86–96; `src/server/trpc/routers/trips.ts` lines 343–353.
**Fix approach:** After the 4-minute timeout, call a new tRPC procedure that resets `lore_status` to `failed` so the user can actually retry, OR fix the stuck-jobs cron to run every 15 minutes.

---

### MEDIUM — OTP verification does not re-check token expiry at the app layer

**Problem:** `verify-otp/route.ts` delegates expiry checking entirely to Supabase's `verifyOtp`. The `otp_codes` table rows are never queried during verification (the comment says "Single verification path — Supabase is authoritative"). If the Supabase token and the app's `otp_codes` row get out of sync (e.g., due to a clock issue or the OTP code being re-used before marking as `used`), there is no defense in depth.
**File:** `src/app/api/auth/verify-otp/route.ts` lines 39–46.
**Fix approach:** Acceptable as-is given Supabase's own expiry enforcement, but add a pre-check against `otp_codes.expires_at` as defense in depth before calling `verifyOtp`.

---

### LOW — `stories` public URL exposes all lore data including confessions without an opt-out

**Problem:** `/t/[code]/story` renders the full lore (including trip member roles, chaos scores, and narrative) to **anyone** with the invite code — no auth required. Confessions submitted by members (`submitConfession`) are included in the lore generation and potentially surface in the public story. There is no per-member privacy setting or story visibility toggle.
**Files:** `src/app/t/[code]/story/page.tsx`; `src/server/trpc/routers/trips.ts` lines 392–414.
**Fix approach:** Add a `story_visible` flag to trips (default true) and a `confession_anonymous` flag. Warn users at confession-submission time that confessions are included in the AI-generated public story.

---

_Concerns audit: 2026-05-18_
