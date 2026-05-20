# Technical Requirements Document — Yaarlore

## Infrastructure Architecture

| Layer                 | Technology                                                                               | Host                        |
| --------------------- | ---------------------------------------------------------------------------------------- | --------------------------- |
| Frontend              | Next.js 15 App Router + React 19                                                         | Vercel (Hobby)              |
| API                   | tRPC 11 + TanStack Query v5                                                              | Vercel serverless functions |
| Auth                  | Supabase Auth + custom OTP via Resend                                                    | Supabase                    |
| Database              | Supabase Postgres + pgvector                                                             | Supabase                    |
| Storage               | Supabase Storage (`trip-photos`, `trip-covers`, `trip-portraits`, `trip-era-thumbnails`) | Supabase                    |
| AI Worker             | FastAPI + Python 3.12 + Uvicorn                                                          | Render (free tier)          |
| AI Models             | Claude Sonnet 4.6 (vision + lore) + Claude Haiku 4.5 (roles, eval, stats)                | Anthropic API               |
| Image Gen             | fal.ai Sana Sprint                                                                       | fal.ai                      |
| Embeddings            | Voyage AI multimodal (CLIP-style)                                                        | Voyage AI API               |
| Payments              | Razorpay (INR, India-first)                                                              | Razorpay                    |
| Rate Limiting         | Upstash Redis (Ratelimit + KV)                                                           | Upstash                     |
| Caching               | Upstash Redis (chaos distribution, public showcase, similar trips)                       | Upstash                     |
| Observability AI      | Langfuse (span + event tracking)                                                         | Langfuse cloud              |
| Observability Product | PostHog                                                                                  | PostHog cloud               |
| Logging               | pino (structured JSON, server-side)                                                      | Vercel logs                 |
| Email                 | Resend (transactional OTP + anniversary + first-week)                                    | Resend                      |
| OG Cards              | Satori (edge runtime, JSX → SVG → PNG)                                                   | Vercel edge                 |
| Push Notifications    | Web Push API (web-push npm library)                                                      | Vercel serverless           |

---

## Frontend Architecture

### App Router structure (`src/app/`)

- Route groups: `(auth)/login` for the login page
- Dynamic routes: `/trips/[tripId]/`, `/t/[code]/story`, `/battles/[battleId]`, `/u/[username]`, `/wrap/[year]`
- API routes: `/api/auth/`, `/api/payments/`, `/api/card/`, `/api/cron/`, `/api/notify/`, `/api/push/`, `/api/trips/`, `/api/reactions/`

### State management

- Server state: tRPC + TanStack Query (all data fetching)
- No global client state manager (no Redux/Zustand) — tRPC query cache is the source of truth
- Supabase Realtime: one channel per trip for lore generation polling (lore_pipeline_state column)

### Component architecture

- `src/components/cinematic/` — documentary-style viewer components (Documentary.tsx, ArchiveRoom.tsx, Orchestrator.tsx, etc.)
- `src/components/experience/` — interactive UX components (GeneratingState, DisputeSystem, ConfessionInput, etc.)
- `src/components/ui/atoms.tsx` — design system primitives

### Animation

- Framer Motion 12 for UI transitions and micro-interactions
- GSAP 3.15 for timeline-based cinematic animations
- Three.js 0.184 for ParticleUniverse 3D background

---

## Backend Architecture (tRPC)

### Context (`src/server/trpc/init.ts`)

- `createContext()` creates a Supabase SSR server client and extracts the authenticated user
- `publicProcedure` — no auth required
- `protectedProcedure` — throws `UNAUTHORIZED` if `ctx.user` is null

### Routers

| Router       | File                                    | Key procedures                                                                                                                                                                                                                                                                                                                                              |
| ------------ | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `trips`      | `src/server/trpc/routers/trips.ts`      | `create`, `getFull`, `joinByCode`, `listMine`, `generateLore`, `upgradeTier`, `markAbsent`, `setStoryVisible`, `exportData`, `getChaosDistribution`, `generateYearlyWrap`, `getYearlyWrap`, `getPublicShowcase`, `getSimilarPublicTrips`, `getNostalgiaFeed`, `warmupWorker`, `disputeCharacterRole`, `voteOnDispute`, `applyReferral`, `getReferralStatus` |
| `photos`     | `src/server/trpc/routers/photos.ts`     | `getUploadUrl`, `confirmUpload`, `list`, `findSimilar`, `nostalgiaFeed`, `recordView`, `embeddingHealth`, `togglePrivacy`                                                                                                                                                                                                                                   |
| `battles`    | `src/server/trpc/routers/battles.ts`    | `challenge`, `get`, `vote`                                                                                                                                                                                                                                                                                                                                  |
| `cards`      | `src/server/trpc/routers/cards.ts`      | (OG card generation helpers)                                                                                                                                                                                                                                                                                                                                |
| `reactions`  | `src/server/trpc/routers/reactions.ts`  | (emoji reactions on lore)                                                                                                                                                                                                                                                                                                                                   |
| `archetypes` | `src/server/trpc/routers/archetypes.ts` | `getHistory`, `syncFromTrip`, `getPublicHistory`                                                                                                                                                                                                                                                                                                            |

### SuperJSON transformer

All tRPC calls use SuperJSON for serialization — handles Date, Map, Set correctly across the wire.

---

## Supabase Architecture

### Two Supabase clients

1. **`createSupabaseServerClient()`** — User-scoped SSR client (`@supabase/ssr`). Uses anon key + user JWT from cookies. Subject to RLS policies. Used in tRPC context.
2. **`createSupabaseServiceClient()`** — Service role client (bypasses ALL RLS). Used for writes, storage, webhook handlers, and any cross-user data access. Never exposed to browser.

### Tables (inferred from migrations)

| Table                     | RLS Status                    | Notes                                             |
| ------------------------- | ----------------------------- | ------------------------------------------------- |
| `trips`                   | ENABLED (Phase 1)             | Members read, creator write, service full         |
| `trip_members`            | ENABLED                       | Fixed recursive policy bug (migration 2026051904) |
| `photos`                  | ENABLED                       | Member read, uploader write                       |
| `trip_eras`               | ENABLED                       | Member read                                       |
| `trip_stats`              | ENABLED                       | Member read                                       |
| `trip_vs_trip`            | ENABLED                       | Public read, creator challenge                    |
| `scheduled_emails`        | ENABLED                       | Service role only                                 |
| `otp_codes`               | ENABLED                       | Service role only; PK = UUID (SEC-09)             |
| `background_jobs`         | ENABLED (service-role policy) | SEC-03                                            |
| `profiles`                | ENABLED                       | Self read/write                                   |
| `generation_jobs`         | ENABLED                       | Service role only                                 |
| `yearly_wraps`            | ENABLED                       | Self read                                         |
| `lore_disputes`           | ENABLED                       | Trip member access                                |
| `dispute_votes`           | ENABLED                       | Trip member access                                |
| `group_pulse_events`      | ENABLED                       | Member visibility filter                          |
| `user_identity_snapshots` | ENABLED                       | Self read                                         |
| `relationship_dynamics`   | ENABLED                       | Participant read                                  |
| `social_role_assignments` | ENABLED                       | Participant read                                  |
| `group_lore_os`           | ENABLED                       | Member read                                       |
| `trip_incidents`          | ENABLED                       | Member read                                       |
| `evidence_gaps`           | ENABLED                       | Member read                                       |
| `recurring_references`    | ENABLED                       | Member read                                       |
| `fal_budget`              | ENABLED                       | Service role only                                 |
| `print_waitlist`          | ENABLED                       | Self read                                         |
| `photo_views`             | ENABLED                       | Member write                                      |
| `lore_reactions`          | ENABLED                       | Public check on `is_public` (SEC-07)              |
| `user_archetypes`         | ENABLED                       | Self read / public by username                    |

### Views

- `chaos_distribution_cache` — materialized view of ready trips' chaos scores; refreshed by `/api/cron/refresh-chaos`

### Key RPCs

- `get_trip_full(p_trip_id)` — returns full trip + members + photos in one call
- `join_trip_by_code(p_invite_code)` — atomic join with error codes
- `claim_lore_generation(p_trip_id, p_user_id)` — atomic claim preventing race conditions
- `claim_generation_job()` — FOR UPDATE SKIP LOCKED job claim for generation_jobs
- `list_user_trips(p_user_id, p_limit, p_cursor)` — paginated trip list using indexed scan
- `find_similar_photos(p_photo_id, p_user_id, p_limit)` — pgvector ANN search
- `get_nostalgia_moments(p_user_id, p_limit)` — cross-trip nostalgia feed
- `submit_confession(p_trip_id, p_confession)` — trip member confession
- `cast_vs_vote(p_battle_id, p_voted_for_trip_id, p_fingerprint)` — battle vote with dedup
- `upsert_user_archetype(...)` — archetype sync across trips
- `canonical_group_hash(member_ids)` — deterministic hash for group identity
- `claim_fal_budget_slot(p_date, p_cap)` — atomic fal.ai budget increment

---

## Queue Systems

### `generation_jobs` table

- Used for the main lore generation flow
- Claimed by worker via `claim_generation_job()` (FOR UPDATE SKIP LOCKED)
- Polled every 60 seconds by `poll_job_queue()` in the FastAPI worker
- Fallback when HTTP trigger to worker fails

### `background_jobs` table

Job types handled by `poll_background_jobs()` (every 60s, offset 15s from main queue):

- `image_generation` — runs after lore is complete (trip cover + portraits + era thumbnails)
- `missing_person_card` — triggered by `trips.markAbsent`; generates an absent-member card
- `judge_battle` — AI verdict for `trip_vs_trip` battles; triggered by `battles.challenge`
- `embed_photo` — CLIP embedding via Voyage AI; queued by `photos.confirmUpload` (PERF-05)
- `yearly_wrap` — fallback for `trips.generateYearlyWrap` when HTTP trigger fails

---

## AI Orchestration

See `docs/AI_PIPELINES.md` for full detail.

**Primary path:** tRPC `trips.generateLore` → HTTP POST to FastAPI `/generate-lore` (HMAC signed, 8s timeout) → FastAPI background task runs `LoreOrchestrator.run_full_pipeline()`

**Fallback path:** If HTTP trigger fails → insert `generation_jobs` row → worker picks up within 60s via DB polling

**Worker endpoints (all require HMAC + Bearer auth):**

- `POST /generate-lore`
- `POST /generate-thumbnail`
- `POST /generate-missing-person-card`
- `POST /judge-battle`
- `POST /embed-photo`
- `POST /backfill-embeddings`
- `POST /generate-yearly-wrap`
- `POST /generate-trip-cover`
- `POST /generate-character-portraits`
- `POST /generate-era-thumbnails`
- `GET /health`

---

## Auth / Session Flows

### Custom OTP flow (primary)

1. `POST /api/auth/send-otp` — fraud scoring → Supabase admin `generateLink(magiclink)` → store hashed OTP in `otp_codes` → send via Resend
2. `POST /api/auth/verify-otp` — validate OTP hash, call Supabase `verifyOtp` → set session cookies

### Supabase Auth callback

- `GET /auth/callback` — handles OAuth / magic link callbacks, sets session

### Session persistence

- `@supabase/ssr` manages cookies for Next.js App Router
- tRPC context calls `supabase.auth.getUser()` on every request

### OTP security

- Rate limited: 10 requests/min per IP (Upstash Redis sliding window)
- DB-backed limit: max 5 OTP sends per email per 15 minutes
- OTPs hashed with HMAC-SHA256 (`OTP_HMAC_SECRET`) before storage
- Disposable email blocklist (60+ domains) + fraud scoring before any OTP generation
- PK is UUID (not email) — prevents email enumeration via key collision

---

## Realtime Systems

- Supabase Realtime used for lore generation polling: the generating page subscribes to the `trips` table channel for the specific `trip_id`, watching `lore_pipeline_state` and `lore_status` columns
- Group Pulse feed uses `group_pulse_events` table queried on page load (not realtime subscription)
- Referenced in `CLAUDE.md` as a concern for scaling — see `docs/SCALING_RISKS.md`

---

## Deployment

**Next.js (Vercel):**

- `vercel.json` is `{}` (empty) — no custom Vercel configuration
- No Vercel crons declared in vercel.json (removed; crons run as external scheduler)
- CSP applied in `src/middleware.ts` (nonce-based, per-request)
- Sentry configured via `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`

**AI Worker (Render):**

- Free tier dyno — cold starts ~15 min if no traffic
- `uvicorn src.main:app` — FastAPI with lifespan hooks for background polling tasks
- Two polling loops start on worker boot: `poll_job_queue()` and `poll_background_jobs()`
- Startup validation: fails fast if required env vars missing

---

## Observability

### Langfuse (AI tracing)

- Custom HTTP client in `src/lib/langfuse.ts` — zero dependencies, never throws
- Spans created for: `generate-lore-trigger` in tRPC; each pipeline step in orchestrator
- Token usage per step written to `lore_pipeline_state.step_durations[step].tokens`
- Security events traced: `disposable_email`, `rate_limited`, `api_fraud_score`, `bot_detected`
- Configured via `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_HOST`

### PostHog (product analytics)

- Browser-side via `src/components/providers/PostHogProvider.tsx`
- Configured via `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`

### Pino logging (structured)

- `src/lib/logger.ts` — all tRPC routers use structured log calls
- Replaces previous `console.log/error` (OBS-01)

---

## Cost Architecture

### AI token costs

- Main pipeline budget: 60,000 tokens max per run (`PipelineBudget`)
- Eval step sampled at 20% by default in production (`LORE_EVAL_SAMPLE_RATE=0.2`)
- Monthly per-user token cap: configurable via `MONTHLY_TOKEN_CAP_PER_USER` (default 500,000)
- First generation always free; referral bonus bypasses cap
- Token usage tracked in `profiles.generation_tokens_used_this_month`

### fal.ai image generation costs

- Daily budget cap: `FAL_DAILY_BUDGET=200` calls/day (configurable)
- Per-trip limit: `FAL_TRIP_DAILY_LIMIT=2` full image-gen runs/day
- Era thumbnail cap: `FAL_MAX_ERAS=5` per trip
- Budget counter persisted in `fal_budget` Supabase table (survives worker restarts, COST-02)
- Atomic increment via `claim_fal_budget_slot` RPC

### Render

- Free tier: 512 MB RAM, shared CPU, cold starts after 15 min inactivity
- Single instance — no horizontal scaling

### Supabase

- Storage: `trip-photos`, `trip-covers`, `trip-portraits`, `trip-era-thumbnails` buckets
- Free tier connection limits apply

---

## Key Environment Variables

| Variable                        | Required In              | Purpose                                |
| ------------------------------- | ------------------------ | -------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Next.js                  | Supabase project URL                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Next.js                  | Supabase anon key                      |
| `SUPABASE_SERVICE_ROLE_KEY`     | Next.js (server), Worker | Bypasses RLS                           |
| `AI_WORKER_URL`                 | Next.js                  | Render worker URL                      |
| `AI_WORKER_SECRET`              | Next.js, Worker          | Bearer token                           |
| `AI_WORKER_HMAC_SECRET`         | Next.js, Worker          | HMAC signing                           |
| `ANTHROPIC_API_KEY`             | Worker                   | Claude API                             |
| `UPSTASH_REDIS_REST_URL`        | Next.js                  | Rate limiting (REQUIRED in production) |
| `UPSTASH_REDIS_REST_TOKEN`      | Next.js                  | Rate limiting                          |
| `RAZORPAY_KEY_SECRET`           | Next.js                  | Payments                               |
| `RAZORPAY_WEBHOOK_SECRET`       | Next.js                  | Webhook verification                   |
| `OTP_HMAC_SECRET`               | Next.js                  | OTP hashing                            |
| `RESEND_API_KEY`                | Next.js                  | Transactional email                    |
| `LANGFUSE_PUBLIC_KEY`           | Next.js                  | AI observability                       |
| `LANGFUSE_SECRET_KEY`           | Next.js                  | AI observability                       |
| `FAL_API_KEY`                   | Worker                   | Image generation                       |
| `VOYAGE_API_KEY`                | Worker                   | Photo embeddings                       |
| `CRON_SECRET`                   | Next.js                  | Cron authorization                     |
