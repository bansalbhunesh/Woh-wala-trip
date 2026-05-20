# Scaling Risks — Yaarlore

## Current Architecture Constraints

The system is built for a single-digit-concurrency product (pre-launch, likely <100 active users). These are the risks that materialize as user count grows.

---

## CRITICAL: AI Worker Single Point of Failure

**Risk:** The entire lore generation system runs on a single Render free-tier dyno.

- One instance, 512 MB RAM, shared CPU
- Cold starts after 15 minutes of inactivity (~15-60 second delay)
- No horizontal scaling — all pipelines run serially on one process
- If the dyno crashes mid-pipeline, lore_status stays 'processing' until reset

**Mitigation in place:**

- `poll_job_queue()` provides DB-backed fallback if HTTP trigger fails
- `reset_stuck_pipelines()` runs every 30 min to recover crashed pipelines
- `warmupWorker` tRPC mutation pre-warms the dyno at 5 photos
- `resetStuckLore` tRPC mutation (creator self-service reset after 4-min timeout)
- `_ACTIVE_RUNS` set prevents a single trip being processed twice simultaneously

**What breaks at scale:**

- Multiple simultaneous lore generation requests will queue (generation_jobs) but only one runs at a time per worker instance
- Memory pressure: vision analysis downloads and base64-encodes up to 80 photos per pipeline. Each photo can be up to 8MB. At full cap: 80 × 8MB = 640MB — above Render free tier RAM
- At >10 concurrent pipelines, the 8-concurrent `PipelineRateLimiter` semaphore will queue work but the single dyno will still process serially

**Upgrade path:** Render paid tier ($7/mo) for always-on; Render auto-scaling (requires paid) for horizontal; Redis-backed `_lore_last_triggered` cooldown for multi-instance coordination (ARCH-V2-03 from requirements).

---

## CRITICAL: Cron Jobs Never Run

**Risk:** `vercel.json` is `{}` (empty). None of the 7 cron routes fire automatically.

Affected systems:

- Anniversary emails (1-year anniversary of trip) — `scheduled_emails` rows accumulate, never sent
- First-week follow-up emails — same
- Battle notifications — silent
- Nostalgia drops — silent
- Chaos distribution cache refresh — `chaos_distribution_cache` view never refreshed
- Weekly arc digest — silent

**Consequence:** Users who completed trips will never receive anniversary emails. The `scheduled_emails` table grows unbounded with unsent rows. The chaos distribution percentile uses a stale (or empty) materialized view.

**Fix:** Add cron declarations to `vercel.json` (requires Vercel Pro for sub-daily), or configure an external scheduler (GitHub Actions cron, Render cron job, Supabase pg_cron).

---

## Supabase Realtime Channel Scaling

**Risk:** The generating page subscribes one Realtime channel per active generation. On the Supabase free tier, concurrent Realtime connections are limited.

- Each trip in "generating" state has one active WebSocket subscription from the client browser
- Supabase free tier: 500 concurrent Realtime connections
- At 500 simultaneous users waiting for lore generation, all connections are consumed

**Mitigation in place:** None. The lore generation pipeline itself limits concurrency (one pipeline at a time per worker), so 500 simultaneous users is unlikely pre-launch. But Realtime connections are also held by any browser tab open to a trip page.

**Upgrade path:** Upgrade Supabase plan or switch to polling instead of Realtime for the generating page.

---

## Serverless Rate Limiting

**Status: FIXED (SEC-05).** Was previously broken (in-memory fallback). Current state:

- `checkRateLimit()` throws hard in production if Upstash Redis is absent
- In production, Redis is required — fail-closed
- Redis sliding window: shared across all Vercel function instances

**Residual risk:** If Upstash Redis has an outage, ALL OTP requests are rejected (fail-closed). This is the intended behavior for security, but it means Redis availability = auth availability.

---

## Supabase Connection Limits

**Risk:** Supabase free tier has a connection pool limit (typically 60 direct connections, but pooler is available).

- Every Vercel serverless invocation creates a new Supabase client
- `createSupabaseServerClient()` and `createSupabaseServiceClient()` are called fresh per request
- No connection pooling configured — uses Supabase's built-in pgbouncer via the REST API
- In practice, the PostgREST API is connection-efficient; direct `pg` connections are the concern

**Mitigation:** Supabase's PostgREST layer handles connection pooling. The risk only materializes with very high RPS.

---

## fal.ai Image Generation Bottlenecks

**Risk:** Image generation is rate-limited by design but those limits may be too conservative or too permissive.

- `FAL_DAILY_BUDGET=200` — platform-wide 200 images/day
- `FAL_TRIP_DAILY_LIMIT=2` — per-trip 2 full runs/day
- `FAL_MAX_ERAS=5` — max era thumbnails

**Concern 1:** Daily budget is platform-wide, not per-user. A single active power user who generates many trips can exhaust the budget for everyone.

**Concern 2:** Per-trip limit is in-memory (`_trip_window` dict in Python). On Render restart, this resets. A user can reset their trip limit by triggering a worker restart (ARCH-V2-03).

**Concern 3:** `_budget_ok()` uses a thread lock but the atomic RPC (`claim_fal_budget_slot`) is the production path. The fallback (read-then-increment) has a TOCTOU race under concurrent calls.

---

## DB Query Performance Risks

**Current known expensive queries:**

1. `getChaosDistribution` — was a full `trips` table scan, now cached in Redis (10min TTL). Falls back to `chaos_distribution_cache` materialized view. The view itself requires the `/api/cron/refresh-chaos` cron to run — which currently never fires automatically.

2. `battles.challenge` rate limit check — counts battles using `.or()` on a potentially large `trip_vs_trip` table. No index confirmed on `(trip_a_id, trip_b_id, created_at)`.

3. `find_similar_photos` RPC — pgvector ANN search. Performance degrades at O(photos) without proper HNSW index. Index exists (migration `2026051910_index_audit.sql`) but verify it covers this query.

4. `list_user_trips` — uses indexed scan via `list_user_trips` SECURITY DEFINER function. Well-optimized.

**Index audit migration:** `2026051910_index_audit.sql` was applied (Phase 4) — covers critical paths.

---

## Cost Explosion Scenarios

**Token costs (Anthropic):**

- Average pipeline: ~60,000 tokens (Claude Sonnet 4.6 ≈ $0.003/1k input → $0.18/pipeline)
- At 1,000 generations/day: $180/day
- Monthly cap per user (500k tokens) limits this, but only for returning users
- First generation is always free (intentional) — no cap check

**fal.ai costs:**

- 200 calls/day platform cap
- At 3 images/trip (cover + portrait + era thumbnail) × 200 trips = 600 calls needed
- Current cap of 200 means only ~66 trips get images per day

**Mitigation:** Monthly token cap, fal.ai daily budget, eval sampling (20%) all reduce costs. But there is no server-side circuit breaker for Anthropic costs beyond the per-user monthly cap.

---

## Storage Scaling

**Risk:** Photos accumulate indefinitely. No expiry or archival policy.

- Supabase free tier: 1 GB storage
- Each trip up to 500MB (free tier) or unlimited (paid tier)
- At 10 paid trips with unlimited uploads: could quickly exceed 1 GB
- AI-generated cover art, portraits, and era thumbnails go into separate buckets — no size cap

**Signed URL cache:** Signed URLs cached in `photos.signed_url` column with 1-hour expiry. Cache invalidated by `photos.list` on each call, not proactively. Stale signed URLs in `photo_views` or other contexts are non-functional but not cleaned up.

---

## Fire-and-Forget Reliability Risks

**Thumbnail generation** (`photos.confirmUpload:265-294`):

- Still fire-and-forget via `signWorkerRequest().then(fetch(...))`
- If worker is down, thumbnail is never generated
- No retry, no queue, no visibility
- User sees broken thumbnail until manually triggered

This is technically an accepted limitation noted in comments, but at scale results in a non-trivial percentage of photos without thumbnails.

---

## Redis Single Point of Dependency

**Production systems dependent on Redis:**

1. OTP rate limiting (fail-closed — auth breaks if Redis down)
2. Chaos distribution cache (fallback to DB on failure — degraded perf)
3. Public showcase cache (fallback to DB)
4. Similar trips cache (fallback to DB)
5. Worker lore generation cooldown (fallback to in-memory on worker)

**Concern:** All five use the same Upstash Redis instance. If Upstash has downtime:

- Auth fails (hard failure for item 1)
- Items 2-4 fall back gracefully to DB queries (acceptable)
- Item 5 falls back to in-memory (acceptable for single instance)
