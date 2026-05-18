<!-- refreshed: 2026-05-18 -->

# Architecture

**Analysis Date:** 2026-05-18

## System Overview

```text
┌────────────────────────────────────────────────────────────────────────┐
│                     Next.js 15 App (Vercel)                            │
│                                                                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────┐   │
│  │  RSC Pages       │  │  tRPC API Layer  │  │  Next.js API      │   │
│  │  (server-render) │  │  /api/trpc/[t]   │  │  Routes           │   │
│  │  src/app/*/      │  │  src/server/trpc/│  │  src/app/api/     │   │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬──────────┘   │
│           │                     │                      │               │
│           ▼                     ▼                      ▼               │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │               Supabase Client Layer                             │   │
│  │   createSupabaseServerClient()   createSupabaseServiceClient() │   │
│  │   src/lib/supabase/server.ts      (service role — bypasses RLS)│   │
│  └────────────────────────────┬───────────────────────────────────┘   │
└───────────────────────────────│────────────────────────────────────────┘
                                │
              ┌─────────────────┼──────────────────────┐
              ▼                 ▼                       ▼
     ┌────────────┐   ┌─────────────────┐   ┌──────────────────┐
     │  Supabase  │   │  AI Worker      │   │  External        │
     │  Postgres  │   │  (FastAPI on    │   │  Services        │
     │  + Storage │   │   Render)       │   │  Resend, Razor-  │
     │  + Realtime│   │  ai-worker/     │   │  pay, PostHog,   │
     │  + Auth    │   │  Python 3.12    │   │  Langfuse, fal.ai│
     └────────────┘   └─────────────────┘   └──────────────────┘
```

## Component Responsibilities

| Component                     | Responsibility                                                       | Path                               |
| ----------------------------- | -------------------------------------------------------------------- | ---------------------------------- |
| Next.js App (Vercel)          | UI, API gateway, SSR, cron jobs                                      | `src/`                             |
| tRPC Router                   | Type-safe RPC layer for all client→server calls                      | `src/server/trpc/`                 |
| Next.js API Routes            | Auth OTP, OG image cards, payments, cron, reactions                  | `src/app/api/`                     |
| Supabase                      | Auth (OTP email), Postgres DB, file storage, Realtime WebSocket, RLS | managed                            |
| AI Worker (FastAPI on Render) | Photo vision analysis, lore generation, image gen, embeddings        | `ai-worker/`                       |
| OG Image Pipeline             | Edge-rendered PNG cards (Satori/react-to-image)                      | `src/lib/og/`, `src/app/api/card/` |

## Pattern Overview

**Overall:** Monolith with a sidecar AI worker

**Key Characteristics:**

- Next.js App Router with mixed RSC (server) and client components
- tRPC v11 + TanStack Query for all data fetching in client components
- Supabase for auth, DB, storage, and Realtime push
- AI work runs in a separate Python FastAPI service (deployed to Render) — decoupled from the Next.js request lifecycle
- Two-path lore dispatch: HTTP trigger (fast) → DB queue fallback (durable polling)
- Service role client used for all writes; user session client for reads with RLS

## Layers

**Presentation Layer:**

- Purpose: Pages, route layouts, cinematic UI components
- Location: `src/app/`, `src/components/`
- Contains: RSC pages (data fetching), Client Components (interactivity)
- Depends on: tRPC client, Supabase browser client
- Used by: End users via browser

**API Layer:**

- Purpose: tRPC procedures + REST routes for non-tRPC concerns
- Location: `src/server/trpc/`, `src/app/api/`
- Contains: tRPC routers, auth routes, OG card routes, payment routes, cron handlers
- Depends on: Supabase server/service clients, Langfuse, AI Worker HTTP
- Used by: Client components (tRPC), external services (cron), AI worker (callbacks)

**Data Access Layer:**

- Purpose: Supabase client abstractions — two distinct clients
- Location: `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`
- Contains: `createSupabaseServerClient()` (cookie-based SSR, respects RLS), `createSupabaseServiceClient()` (service role, bypasses RLS), `createSupabaseBrowserClient()` (client-side Realtime)
- Depends on: `@supabase/ssr`, `@supabase/supabase-js`
- Used by: tRPC routers, API routes, RSC pages

**AI Worker:**

- Purpose: All long-running AI computation — vision, lore generation, image gen, embeddings
- Location: `ai-worker/`
- Contains: FastAPI app, LoreOrchestrator, polling loops, embedding pipeline
- Depends on: Anthropic Claude API, Supabase service role, fal.ai (image gen)
- Used by: Next.js tRPC routers (HTTP fire-and-forget), Postgres job queue (polling)

## Data Flow

### Lore Generation Pipeline

```
User clicks "Generate Lore"
  │
  ▼
trpc.trips.generateLore.mutate (src/server/trpc/routers/trips.ts:282)
  │
  ├─ Auth check (protectedProcedure)
  ├─ Creator ownership check
  ├─ Photo count >= 5 check
  ├─ Rate limit: max 1 active job per user
  ├─ Atomic claim: trips.lore_status = 'processing' (neq guard prevents double-fire)
  ├─ Langfuse span created
  │
  ├─ [PRIMARY PATH] HTTP POST to AI_WORKER_URL/generate-lore (8s timeout)
  │    Returns {status:'processing'} immediately → client polls/Realtime
  │
  └─ [FALLBACK PATH] On HTTP failure: upsert generation_jobs row (status='pending')
       AI worker polls this table every 60s via claim_generation_job() RPC
```

```
AI Worker: LoreOrchestrator.run_full_pipeline(trip_id)
  (ai-worker/src/lore/orchestrator.py:174)
  │
  ├─ Step 1: Fetch trip + photos + members (parallel asyncio.gather)
  ├─ Step 2: Vision analysis
  │    ├─ _compute_trip_signals (structural: clusters, night ratio, dwell)
  │    └─ _analyze_photo_batches (Claude vision, up to 4 batches × 20 photos)
  ├─ Step 3: _aggregate_signals (Claude Sonnet, 2000 tokens)
  ├─ Step 4: _generate_lore_with_retry (Claude Sonnet, up to 3 attempts)
  │    └─ _quality_gate (Claude Haiku evaluator, retry once if overall < 0.55)
  ├─ Step 5-7: Parallel enrichment (asyncio.gather)
  │    ├─ _generate_all_roles (Claude Haiku, 1 call per member, max 3 concurrent)
  │    ├─ _generate_receipt_stats (Claude Haiku)
  │    └─ _generate_superlatives (Claude Haiku)
  ├─ Step 8: Persist to Supabase
  │    ├─ trips.lore_json, trips.lore_status = 'ready'
  │    ├─ trip_eras upsert
  │    └─ trip_members role_title/role_description update
  │
  └─ Supabase Realtime pushes UPDATE event → client generating page routes to story
```

### Photo Upload Flow

```
User selects photo
  │
  ▼
trpc.photos.getUploadUrl.mutate
  ├─ Membership check
  ├─ Free tier limits (50 photos, 500 MB)
  └─ Returns signed upload URL (Supabase Storage, service role)
  │
  ▼
Client uploads file directly to Supabase Storage (PUT to signedUrl)
  │
  ▼
trpc.photos.confirmUpload.mutate
  ├─ Storage path prefix validation (cross-trip injection prevention)
  ├─ Idempotency: returns existing photo if path already exists
  ├─ Insert photos row
  └─ Fire-and-forget to AI worker:
       ├─ /generate-thumbnail (resizes image, stores thumbnail_path)
       └─ /embed-photo (CLIP embedding → photo_embeddings table)
```

### Authentication Flow (Custom OTP)

```
User enters email on /login
  │
  ▼
POST /api/auth/send-otp
  ├─ IP burst check (Upstash Redis or in-memory fallback, 10 req/60s)
  ├─ computeFraudScore(): format + disposable domain + role account + Disify/Abstract/Kickbox APIs
  ├─ DB rate limit: max 5 OTP sends per email per 15 min (otp_codes table)
  ├─ supabase.auth.admin.generateLink({type:'magiclink'}) → gets OTP token
  ├─ Store HMAC-SHA256 hashed OTP in otp_codes table (10 min TTL)
  └─ Send via Resend API (branded email)
  │
  ▼
User enters 6-digit code
  │
  ▼
POST /api/auth/verify-otp
  ├─ supabase.auth.verifyOtp({email, token, type:'email'})
  ├─ Marks otp_codes row as used (fire-and-forget, non-critical)
  └─ Supabase sets session cookies via @supabase/ssr
  │
  ▼
GET /auth/callback (redirect target for magic links)
  ├─ supabase.auth.exchangeCodeForSession(code)
  └─ Redirect to /trips
```

### Real-time Status Updates

```
Client opens /trips/[tripId]/generating
  │
  ├─ tRPC trips.getFull initial query
  └─ Supabase Realtime channel: postgres_changes on trips table (filter: id=eq.{tripId})
       When lore_status → 'ready': refetch → redirect to story
       When lore_status → 'failed': redirect to trip detail
```

### OG Card Rendering

```
GET /api/card/[tripId]
  ├─ Service role Supabase read (trips.lore_json)
  ├─ Load edge fonts (Supabase storage or local)
  ├─ Generate QR code from invite_code
  └─ Satori-based React→PNG render (runtime: 'edge')
       Components: src/lib/og/components.tsx
       Returns PNG (or with ?download=1: attachment download)
```

## Authentication Architecture

**Provider:** Supabase Auth with custom OTP via Resend

**Session storage:** HttpOnly cookies set by `@supabase/ssr`

**Two client modes:**

- `createSupabaseServerClient()` (`src/lib/supabase/server.ts`) — reads cookies from `next/headers`, user session, respects RLS. Used in tRPC context and RSC pages.
- `createSupabaseServiceClient()` (`src/lib/supabase/server.ts`) — service role key, bypasses RLS entirely. Used for writes where RLS is too restrictive (trip creation, storage operations, AI worker callbacks).

**tRPC auth guard:** `protectedProcedure` (`src/server/trpc/init.ts:35`) — throws `UNAUTHORIZED` if `ctx.user` is null. All mutating procedures use this. `publicProcedure` is used only for `battles.get`.

**Anti-spam layers:** Format check → disposable domain blocklist (60+ domains) → role account detection → third-party APIs (Disify/Abstract/Kickbox, parallel, opt-in) → composite fraud score → block/warn/allow. Security events traced to Langfuse (`src/lib/langfuse.ts`).

## AI Worker Architecture

**Runtime:** FastAPI (Python 3.12) deployed on Render

**Entry point:** `ai-worker/src/main.py`

**Two async background loops on startup:**

1. `poll_job_queue()` — polls `generation_jobs` table every 60s via `claim_generation_job()` Postgres RPC (SKIP LOCKED for multi-instance safety). Handles lore generation when HTTP trigger fails.
2. `poll_background_jobs()` — polls `background_jobs` table every 60s for `image_generation` jobs enqueued after lore completes.

**HTTP endpoints (all require `Authorization: Bearer {AI_WORKER_SECRET}`):**

| Endpoint                             | Purpose                            | Execution       |
| ------------------------------------ | ---------------------------------- | --------------- |
| `POST /generate-lore`                | Trigger full lore pipeline         | Background task |
| `POST /generate-thumbnail`           | Resize photo, store thumbnail      | Background task |
| `POST /embed-photo`                  | CLIP embedding → pgvector          | Background task |
| `POST /backfill-embeddings`          | Batch-embed all trip photos        | Background task |
| `POST /generate-missing-person-card` | AI card for absent member          | Background task |
| `POST /judge-battle`                 | AI verdict for trip vs trip battle | Background task |
| `POST /generate-trip-cover`          | fal.ai image for trip              | Background task |
| `POST /generate-character-portraits` | fal.ai portraits per member        | Background task |
| `POST /generate-era-thumbnails`      | fal.ai era images                  | Background task |
| `GET /health`                        | Warmup + liveness check            | Sync            |

**`LoreOrchestrator` (`ai-worker/src/lore/orchestrator.py`):**

Key design patterns:

- `PipelineBudget`: 60,000 token hard ceiling per pipeline run. Raises before a call that would exceed.
- `PipelineRateLimiter`: Global semaphore (max 8 concurrent LLM calls across all orchestrator instances).
- `_RETRY_CONFIG`: Per-error-class retry policy (rate limit: 4 attempts; overload: 3; timeout: 3; content policy: 1 — never retry).
- `LoreEvaluator`: Claude Haiku quality scorer. If overall score < 0.55, retries lore generation once with the evaluator's feedback injected into the prompt.
- `reset_stuck_pipelines()`: Called every 30 poll ticks. Finds trips stuck `processing` >30 min and marks them `failed`.
- `_enqueue_image_job()`: After lore complete, inserts `background_jobs` row for image generation (durable, not fire-and-forget).
- `lore_pipeline_state` JSONB column on `trips` tracks step-level progress for observability.

**AI models used:**

- `claude-sonnet-4-6` — vision analysis, signal aggregation, core lore generation, battle judging, missing person cards
- `claude-haiku-4-5-20251001` — character roles, receipt stats, superlatives, quality evaluation

## Database Architecture

**Platform:** Supabase (Postgres + pgvector)

**Core tables:**

| Table              | Purpose                                    | Key columns                                                                                                                                    |
| ------------------ | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `trips`            | Central entity — trip metadata + AI output | `id, name, destination, creator_id, tier, lore_status, lore_json, chaos_score, invite_code, lore_pipeline_state, lore_eval_json, trip_signals` |
| `trip_members`     | Users ↔ trips join                         | `trip_id, user_id, status, role_title, role_description, role_chaos_rating, confession_text`                                                   |
| `photos`           | Photo metadata + signed URL cache          | `id, trip_id, user_id, storage_path, thumbnail_path, signed_url, thumb_signed_url, url_expires_at, embedding_status`                           |
| `profiles`         | User profile                               | `id, email, display_name, username, bio, referral_count, referral_bonus_unlocked`                                                              |
| `trip_eras`        | AI-generated narrative eras per trip       | `trip_id, era_name, timeframe, description, display_order`                                                                                     |
| `trip_stats`       | AI receipt stats                           | `trip_id, label, value, unit, display_order`                                                                                                   |
| `trip_vs_trip`     | Battle records                             | `trip_a_id, trip_b_id, status, voting_ends_at, ai_verdict_json, ai_winner`                                                                     |
| `generation_jobs`  | Durable lore pipeline queue                | `trip_id, status (pending/claimed/done/failed), claimed_at`                                                                                    |
| `background_jobs`  | Durable image gen queue                    | `trip_id, job_type, status, trace_id`                                                                                                          |
| `lore_reactions`   | Emoji reactions per slide                  | `trip_id, user_id, slide_type, slide_idx, emoji`                                                                                               |
| `otp_codes`        | OTP rate limiting (hashed codes)           | `email, code, expires_at, used`                                                                                                                |
| `scheduled_emails` | Anniversary email queue                    | `trip_id, user_id, email_type, send_at, sent_at`                                                                                               |
| `photo_views`      | Dwell-time telemetry for lore signals      | `photo_id, trip_id, user_id, view_duration_ms`                                                                                                 |
| `user_archetypes`  | Per-trip character role history            | `user_id, trip_id, role_title, role_archetype_tag, role_chaos_rating`                                                                          |
| `yearly_wraps`     | AI yearly friendship summary               | `user_id, year, wrap_json`                                                                                                                     |

**Key Postgres RPCs (SECURITY DEFINER functions):**

- `get_trip_full(p_trip_id)` — returns trip + members + stats + eras + cover_photo in one call
- `join_trip_by_code(p_invite_code)` — atomic invite code join with tier limit enforcement
- `claim_generation_job()` — SKIP LOCKED atomic job claim for AI worker polling
- `cast_vs_vote(p_battle_id, p_voted_for_trip_id, p_fingerprint)` — deduplicated vote insert
- `submit_confession(p_trip_id, p_confession)` — member confession insert
- `find_similar_photos(p_photo_id, p_user_id, p_limit)` — pgvector cosine similarity search
- `get_nostalgia_moments(p_user_id, p_limit)` — "on this day" photos from past trips

**RLS patterns:**

- Most tables: authenticated users can read/write their own rows. Service role has full access.
- `lore_reactions`: anon can read and insert (null user_id for anonymous reactions on public stories).
- `generation_jobs` and `background_jobs`: service role only.
- `otp_codes`: RLS disabled (server-only access via API routes).
- Storage bucket `trip-photos`: RLS blocks user session client. All storage operations use the service role client.

**Key Postgres triggers:**

- `002_total_photos_trigger.sql` — increments `trips.total_photos` atomically on photo insert/delete.
- `on_lore_ready_schedule_anniversary` — when `trips.lore_status` transitions to `'ready'`, inserts rows in `scheduled_emails` for all trip members (1-year anniversary).

**Signed URL caching:** `photos.signed_url`, `photos.thumb_signed_url`, `photos.url_expires_at` — signed URLs persisted to DB for 1 hour. `photos.list` reuses valid cached URLs (>10 min remaining), only regenerating for stale entries. Reduces Supabase Storage API calls ~80% for active trips.

## Tier / Monetization Architecture

**Tiers:** `free`, `digital`, `print` stored on `trips.tier`

**Free limits enforced in tRPC:**

- 50 photos per trip (`photos.getUploadUrl`)
- 500 MB storage per trip (`photos.getUploadUrl`)
- 6 members per trip (enforced in `join_trip_by_code` RPC)

**Payment flow:** Razorpay order created via `POST /api/payments/create-order`, client-side Razorpay checkout, `trips.upgradeTier` mutation verifies HMAC-SHA256 signature before writing tier to DB.

## Cron Jobs

Configured in `vercel.json` and protected by `CRON_SECRET` header:

| Route                         | Schedule                    | Purpose                                                               |
| ----------------------------- | --------------------------- | --------------------------------------------------------------------- |
| `GET /api/cron/anniversaries` | `0 6 * * *` (daily 6am UTC) | Send anniversary emails via Resend; push fatigue limit: 1/user/7 days |
| `GET /api/cron/stuck-jobs`    | `0 7 * * *` (daily 7am UTC) | Reset trips stuck in `processing` >10 min back to `failed`            |

## Architectural Constraints

- **Threading:** Next.js runs in Node.js single-threaded event loop (Vercel serverless). AI Worker runs FastAPI async with `asyncio.gather` for concurrency; CPU-bound Supabase calls use `asyncio.to_thread`.
- **Global state (AI Worker):** `_lore_last_triggered` dict (per-trip cooldown, in-memory), `_GLOBAL_RATE_LIMITER` semaphore, `upstashLimiters` map in `anti-spam.ts` — all reset on process restart.
- **Service role scope:** Any code path touching `createSupabaseServiceClient()` bypasses ALL RLS. Callers must validate user authorization before invoking service-role writes.
- **AI Worker secret:** All calls to `AI_WORKER_URL` must include `Authorization: Bearer {AI_WORKER_SECRET}`. The worker verifies this header on every endpoint. The secret is never exposed to the browser.
- **Edge runtime:** OG card routes (`src/app/api/card/*/route.tsx`) run on the Vercel edge runtime (`export const runtime = 'edge'`). Cannot use Node.js APIs.

## Anti-Patterns

### Using user session client for storage operations

**What happens:** Code tries to call Supabase Storage with `createSupabaseServerClient()`.
**Why it's wrong:** RLS on `storage.objects` blocks the user session. Will return 403.
**Do this instead:** Always use `createSupabaseServiceClient()` for storage operations. See `src/server/trpc/routers/photos.ts:106`.

### Accepting user-supplied storage paths without prefix validation

**What happens:** Client provides `storagePath` that doesn't start with `{tripId}/{userId}/`.
**Why it's wrong:** Allows cross-trip photo injection via the service role client.
**Do this instead:** Validate prefix before calling service client. See `src/server/trpc/routers/photos.ts:140–146`.

### Fire-and-forget AI worker calls for lore generation

**What happens:** Using only the HTTP trigger without the DB queue fallback.
**Why it's wrong:** Render free tier has cold starts; HTTP call can timeout. Trip stays stuck in `processing`.
**Do this instead:** On HTTP failure, upsert `generation_jobs` row. See `src/server/trpc/routers/trips.ts:379–389`.

## Error Handling

**Strategy:** Fail-fast with typed errors. Never expose raw Supabase/worker error strings to clients.

**Patterns:**

- tRPC throws `TRPCError` with mapped `code` and user-safe `message`. Raw DB/RPC error codes logged server-side.
- AI worker uses `LoreApiError` with `FailoverReason` enum. Per-reason retry config with exponential backoff (max 60s).
- `lore_status = 'failed'` written to DB on any pipeline error; `lore_error` JSONB stores step + message + trace_id.
- Supabase Realtime pushes the status change — generating page routes to trip detail on `'failed'`.
- OTP security events traced to Langfuse as `security:{eventType}` events.

## Cross-Cutting Concerns

**Logging:** `console.error/warn/log` in Next.js; structured `logging.getLogger("wwt.*")` in Python worker.
**Observability:** Langfuse for AI pipeline traces (lore trigger spans, security events). PostHog for product analytics (trip_created, generation_completed, story_shared).
**Validation:** Zod schemas on all tRPC inputs. Pydantic models on all AI worker HTTP bodies.
**Authentication:** Every tRPC procedure that modifies data uses `protectedProcedure`. Public reads use `publicProcedure` only for `battles.get`.

---

_Architecture analysis: 2026-05-18_
