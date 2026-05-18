# External Integrations

**Analysis Date:** 2026-05-18

## APIs & External Services

### Supabase (Primary Data Store + Auth)

- **What it does:** PostgreSQL database, row-level security, auth (magic link / OTP), storage
- **SDK:** `@supabase/supabase-js ^2.45.0` (data + service-role), `@supabase/ssr ^0.5.0` (SSR cookies)
- **Server client:** `src/lib/supabase/server.ts` — two factory functions:
  - `createSupabaseServerClient()` — cookie-scoped user session (anon key)
  - `createSupabaseServiceClient()` — service-role, bypasses RLS, used in API routes and cron jobs
- **Browser client:** `src/lib/supabase/client.ts` — `createSupabaseBrowserClient()` (anon key)
- **Storage:** Images hosted at `*.supabase.co/storage/v1/object/public/**` (whitelisted in `next.config.mjs`)
- **Migrations:** `supabase/migrations/`
- **Python worker:** `supabase-py >=2.8.0` in `ai-worker/src/clients.py` using service-role key

### Anthropic Claude (AI / LLM)

- **What it does:** Photo vision analysis, lore generation, character archetype detection, nostalgia scoring
- **Next.js SDK:** `@anthropic-ai/sdk ^0.30.0` (installed but primary usage is in Python worker)
- **Python SDK:** `anthropic >=0.40.0` in `ai-worker/src/clients.py`
- **Models configured in `ai-worker/src/config.py`:**
  - Primary: `claude-sonnet-4-6` (vision + lore generation)
  - Secondary: `claude-haiku-4-5-20251001` (thumbnails + cheaper batch calls)
- **Proxy support:** `ANTHROPIC_BASE_URL` env var allows routing through a proxy (e.g., `aicredits.in`, OpenRouter)
- **Usage:** `ai-worker/src/lore/orchestrator.py` orchestrates multi-batch vision calls (up to 80 photos / 4 batches), character role generation, lore JSON assembly

### fal.ai — Sana Sprint (Image Generation)

- **What it does:** AI-generated trip cover images, character portraits, era thumbnails
- **Integration:** Direct HTTP calls in `ai-worker/src/image_gen.py` to `https://fal.run/fal-ai/sana-sprint`
- **Auth:** `FAL_API_KEY` env var in Python worker
- **Abuse guards:** daily budget cap (`FAL_DAILY_BUDGET`, default 200 calls/day), per-trip daily limit (`FAL_TRIP_DAILY_LIMIT`, default 2), era thumbnail cap (`FAL_MAX_ERAS`, default 5)
- **Fire-and-forget:** image gen errors never block the lore generation pipeline

### Langfuse (AI Observability)

- **What it does:** Tracing AI pipeline spans (lore generation), security event logging (blocked auth attempts, rate limits, disposable emails)
- **Integration:** Custom lightweight HTTP client in `src/lib/langfuse.ts` — no SDK dependency, calls `https://cloud.langfuse.com/api/public/ingestion` directly via `fetch`
- **Degrades gracefully:** Returns a no-op client when keys are absent — zero-dependency observability
- **Security tracing:** `traceSecurityEvent()` exported from `src/lib/langfuse.ts`, called in `src/app/api/auth/send-otp/route.ts`

### PostHog (Product Analytics)

- **What it does:** Client-side event tracking (trip created, photos uploaded, generation started/completed, story shared, friend invited, story revisited)
- **SDK:** `posthog-js ^1.373.5`
- **Init:** `src/lib/analytics.ts` — `initPostHog()` called on client only, `autocapture: false`
- **Events exposed:** `analytics.tripCreated`, `analytics.photosUploaded`, `analytics.generationStarted`, `analytics.generationCompleted`, `analytics.storyShared`, `analytics.friendInvited`, `analytics.storyRevisited`

### Razorpay (Payments)

- **What it does:** Creates INR payment orders for digital (₹399) and print (₹799) trip products
- **SDK:** `razorpay ^2.9.0` — dynamically imported server-side only
- **Endpoint:** `src/app/api/payments/create-order/route.ts`
- **Flow:** Verifies Supabase session + trip membership, creates Razorpay order, returns `{id, amount, currency}` to client
- **Currency:** INR (amounts in paise)

### Resend (Transactional Email)

- **What it does:** Sends OTP codes and 1-year anniversary reminder emails
- **SDK:** `resend ^6.12.3` — dynamically imported server-side only
- **Usage locations:**
  - `src/app/api/auth/send-otp/route.ts` — OTP delivery with branded HTML email
  - `src/app/api/cron/anniversaries/route.ts` — anniversary trip recap emails
- **Fallback:** When `RESEND_API_KEY` is absent in dev, OTP is printed to console

### Upstash Redis (Distributed Rate Limiting)

- **What it does:** Sliding-window rate limiting for the OTP send endpoint; falls back to in-memory buckets if Redis is unavailable
- **SDKs:** `@upstash/redis ^1.38.0`, `@upstash/ratelimit ^2.0.8`
- **Usage:** `src/lib/anti-spam.ts` — `checkRateLimit()` uses `Ratelimit.slidingWindow()`
- **Connection:** HTTP REST (no persistent socket), configured via `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`

### Email Validation APIs (Anti-Spam, Optional)

Three optional third-party email validation services in `src/lib/anti-spam.ts`:

| Service      | Key Required       | Endpoint                                      |
| ------------ | ------------------ | --------------------------------------------- |
| Disify       | None (free)        | `https://www.disify.com/api/email/{email}`    |
| Abstract API | `ABSTRACT_API_KEY` | `https://emailvalidation.abstractapi.com/v1/` |
| Kickbox      | `KICKBOX_API_KEY`  | `https://api.kickbox.com/v2/verify`           |

All three run in parallel (`Promise.all`) and contribute to a composite fraud score. Any individual failure is silently swallowed.

---

## Authentication

**Provider:** Supabase Auth (custom OTP flow, not Supabase's built-in magic link email)

**Flow:**

1. Client POSTs email to `src/app/api/auth/send-otp/route.ts`
2. Route runs anti-spam + rate limit checks (Upstash Redis + in-memory fallback)
3. Calls `supabase.auth.admin.generateLink({ type: 'magiclink' })` to generate a `email_otp` token
4. OTP is HMAC-SHA256 hashed (`OTP_HMAC_SECRET`) and stored in `otp_codes` table
5. Plain OTP sent to user via Resend; user submits it to `src/app/api/auth/verify-otp/`
6. Sessions managed via Supabase SSR cookies (`@supabase/ssr`)

**Auth middleware:** `src/proxy.ts` (path not fully read but exists alongside `src/` — likely Next.js middleware for session hydration)

**tRPC auth guard:** `protectedProcedure` in `src/server/trpc/init.ts` — throws `UNAUTHORIZED` if `ctx.user` is null

---

## Data Storage

**Database:** Supabase PostgreSQL

- Connection via `NEXT_PUBLIC_SUPABASE_URL` (public) + `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- Tables known from code: `trips`, `trip_members`, `otp_codes`, `scheduled_emails`, `generation_jobs`, `background_jobs`, `profiles`
- RLS enforced; service-role client bypasses it for admin operations

**File Storage:** Supabase Storage

- Public bucket accessed at `https://*.supabase.co/storage/v1/object/public/**`
- Used for trip photos (uploaded by Python worker)

**Caching:** Upstash Redis (rate limiting only — no general response cache detected)

---

## Background Jobs / Cron

**Vercel Cron (defined in `vercel.json`):**

| Path                      | Schedule                    | Purpose                                                              |
| ------------------------- | --------------------------- | -------------------------------------------------------------------- |
| `/api/cron/anniversaries` | `0 6 * * *` (daily 6am UTC) | Send 1-year trip anniversary emails via Resend                       |
| `/api/cron/stuck-jobs`    | `0 7 * * *` (daily 7am UTC) | Reset trips stuck in `processing` state for >10 min back to `failed` |

Both cron routes validate `Authorization: Bearer {CRON_SECRET}` header.

**AI Worker Job Queue (Python, `ai-worker/src/main.py`):**

- Polls `generation_jobs` Supabase table every 60 seconds using `claim_generation_job()` Postgres function (FOR UPDATE SKIP LOCKED for concurrency safety)
- Polls `background_jobs` every 60 seconds for pending image generation tasks
- HTTP trigger endpoint also exists (Next.js calls the worker directly on trip generation start)

---

## AI Worker Microservice

**Runtime:** Python 3.11+, FastAPI + Uvicorn
**Deployment config:** `ai-worker/render.yaml` (Render.com)
**Internal secret:** `AI_WORKER_SECRET` — required header for Next.js → worker calls
**Endpoint called from Next.js:** `AI_WORKER_URL` env var

**Pipeline (`ai-worker/src/lore/orchestrator.py`):**

1. Fetch trip photos from Supabase
2. Convert HEIF images (Pillow + pyheif)
3. Send photo batches to Claude vision (up to 20 photos/batch, 4 batches max)
4. Generate character archetypes, lore JSON, nostalgia scores
5. Store results back to Supabase
6. Trigger fal.ai image generation (fire-and-forget)

**ML Embeddings:** `ai-worker/src/embeddings.py` — uses HuggingFace `transformers` + `torch` for local embedding generation

---

## Monitoring & Observability

| Tool            | Purpose                                                                | Config                                                        |
| --------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------- |
| Langfuse        | AI pipeline tracing + security event logging                           | `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_HOST` |
| PostHog         | Product analytics (client-side events)                                 | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`         |
| Console logging | Structured logs in API routes and cron (prefixed with `[module-name]`) | —                                                             |

---

## CI / CD & Deployment

**Frontend hosting:** Vercel (inferred from `vercel.json`, `eslint-config-next`, `VERCEL_URL` env var)
**AI Worker hosting:** Render.com (`ai-worker/render.yaml`)
**Visual CI:** Chromatic (`CHROMATIC_PROJECT_TOKEN` via `npm run chromatic`)
**No CI pipeline file detected** (no `.github/workflows/` found) — CI likely configured in Vercel dashboard or external

---

## Environment Variables

### Next.js (public — exposed to browser)

| Variable                        | Purpose                                                   |
| ------------------------------- | --------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL                                      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key                                  |
| `NEXT_PUBLIC_POSTHOG_KEY`       | PostHog project API key                                   |
| `NEXT_PUBLIC_POSTHOG_HOST`      | PostHog ingest host (default: `https://us.i.posthog.com`) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID`   | Razorpay publishable key (sent to client for checkout)    |
| `NEXT_PUBLIC_SITE_URL`          | Canonical origin URL (used in email links, OTP redirect)  |

### Next.js (server-only — never exposed to browser)

| Variable                    | Purpose                                               |
| --------------------------- | ----------------------------------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (bypasses RLS)              |
| `RESEND_API_KEY`            | Resend transactional email API key                    |
| `RESEND_FROM_EMAIL`         | Sender address (default: `onboarding@resend.dev`)     |
| `RAZORPAY_KEY_SECRET`       | Razorpay secret key (server-side order creation)      |
| `OTP_HMAC_SECRET`           | HMAC-SHA256 secret for hashing OTP codes at rest      |
| `CRON_SECRET`               | Bearer token for Vercel Cron endpoint auth            |
| `AI_WORKER_URL`             | Python AI worker base URL                             |
| `AI_WORKER_SECRET`          | Shared secret for Next.js → AI worker calls           |
| `UPSTASH_REDIS_REST_URL`    | Upstash Redis REST URL                                |
| `UPSTASH_REDIS_REST_TOKEN`  | Upstash Redis auth token                              |
| `LANGFUSE_PUBLIC_KEY`       | Langfuse project public key                           |
| `LANGFUSE_SECRET_KEY`       | Langfuse project secret key                           |
| `LANGFUSE_HOST`             | Langfuse host (default: `https://cloud.langfuse.com`) |
| `ABSTRACT_API_KEY`          | Abstract API email validation key (optional)          |
| `KICKBOX_API_KEY`           | Kickbox email validation key (optional)               |
| `ADMIN_API_TOKEN`           | Token for admin API endpoints                         |
| `VERCEL_URL`                | Injected by Vercel — current deployment URL           |

### Python AI Worker (`ai-worker/.env`)

| Variable                    | Purpose                                                                |
| --------------------------- | ---------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY`         | Anthropic Claude API key                                               |
| `ANTHROPIC_BASE_URL`        | Optional proxy base URL (e.g., `aicredits.in`)                         |
| `SUPABASE_URL`              | Same Supabase project URL                                              |
| `SUPABASE_SERVICE_ROLE_KEY` | Same service-role key                                                  |
| `AI_WORKER_SECRET`          | Must match Next.js env var                                             |
| `FAL_API_KEY`               | fal.ai image generation key (optional)                                 |
| `FAL_DAILY_BUDGET`          | Max fal.ai calls per 24h (default: 200)                                |
| `FAL_TRIP_DAILY_LIMIT`      | Max full image-gen runs per trip per 24h (default: 2)                  |
| `FAL_MAX_ERAS`              | Max era thumbnails per trip (default: 5)                               |
| `CLAUDE_MODEL`              | Claude model ID for vision/lore (default: `claude-sonnet-4-6`)         |
| `CLAUDE_HAIKU_MODEL`        | Claude model ID for cheap calls (default: `claude-haiku-4-5-20251001`) |
| `DEBUG_ENABLED`             | Enables `/debug-pipeline` and `/test-claude` endpoints (dev only)      |

---

_Integration audit: 2026-05-18_
