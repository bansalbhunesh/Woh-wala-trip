# System Architecture — Yaarlore

## High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BROWSER / CLIENT                             │
│  Next.js 15 App Router (React 19 + tRPC client + TanStack Query)    │
│  Framer Motion / GSAP / Three.js (cinematic animations)             │
│  PostHog (product analytics)                                         │
└──────────────┬──────────────────────────────┬───────────────────────┘
               │  tRPC / HTTP                 │  Supabase Realtime
               │                              │  (WebSocket)
               ▼                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         VERCEL (Next.js)                             │
│                                                                      │
│  tRPC Router                   API Routes                           │
│  ├── trips.*                   ├── /api/auth/send-otp               │
│  ├── photos.*                  ├── /api/auth/verify-otp             │
│  ├── battles.*                 ├── /api/payments/create-order       │
│  ├── cards.*                   ├── /api/payments/webhook            │
│  ├── reactions.*               ├── /api/card/[tripId]               │
│  └── archetypes.*              ├── /api/card/story/[tripId]         │
│                                ├── /api/card/battle/[battleId]      │
│  Middleware (CSP nonce)         ├── /api/card/archetype/[tripId]    │
│  Langfuse client               ├── /api/card/wrap/[userId]/[year]  │
│  Pino logger                   ├── /api/cron/* (7 cron endpoints)  │
│  Anti-spam (Upstash Redis)     ├── /api/notify/lore-ready          │
│  Worker auth (HMAC)            ├── /api/push/subscribe             │
│                                └── /api/trips/[tripId]/export      │
└──────────────┬──────────────────────────────┬───────────────────────┘
               │                              │
     HTTP      │  HMAC-SHA256 signed          │  PostgREST / Auth / Storage
     POST      │  Bearer token                │
               ▼                              ▼
┌─────────────────────┐     ┌─────────────────────────────────────────┐
│   RENDER (Python)   │     │              SUPABASE                   │
│                     │     │                                         │
│  FastAPI worker     │◄────┤  Postgres (pgvector, 40+ tables)       │
│  LoreOrchestrator   │     │  Auth (session management)              │
│  image_gen.py       │     │  Storage (trip-photos, covers, etc.)    │
│  embeddings.py      │     │  Realtime (WebSocket subscriptions)     │
│  thumbnails.py      │     │  Edge Functions (not used currently)    │
│  nostalgia.py       │     │                                         │
│                     │     │  RLS on all tables                      │
│  poll_job_queue()   │     │  SECURITY DEFINER RPCs                 │
│  poll_bg_jobs()     │     │                                         │
└──────────┬──────────┘     └─────────────────────────────────────────┘
           │                              ▲
           │  API calls                   │  DB reads/writes
           ▼                              │
┌─────────────────────────────────────────┐
│         EXTERNAL SERVICES               │
│  Anthropic Claude Sonnet 4.6 + Haiku   │
│  fal.ai Sana Sprint (image gen)         │
│  Voyage AI (CLIP embeddings)            │
└─────────────────────────────────────────┘
```

---

## Dual Runtime Explanation

Yaarlore runs on two separate compute runtimes that communicate via HTTP:

**TypeScript Runtime (Vercel):**

- Handles all user-facing requests
- Session management, auth, business logic
- Writes jobs to `background_jobs` and `generation_jobs` tables
- Triggers the Python worker via HTTP when needed

**Python Runtime (Render/FastAPI):**

- Handles all AI-intensive work
- Runs asynchronously — triggered by HTTP or DB polling
- Uses the Anthropic SDK (Python) directly — the typed async Python client is better suited for multi-image vision workflows than the Node.js equivalent
- Holds the full 8-step pipeline logic, validators, and prompt management

**Why two runtimes?** The Python Anthropic SDK handles batched vision calls (multiple base64 images in one message) more ergonomically than the Node.js SDK at the time this was built. Python also has better support for Voyage AI's embedding client.

---

## Data Flow for Key Operations

### Photo Upload Flow

```
Browser → tRPC photos.getUploadUrl
  → Creates signed upload URL (Supabase Storage, service role)
  → Returns {uploadUrl, storagePath, token}
Browser → PUT {uploadUrl} (direct to Supabase Storage, bypasses Next.js)
Browser → tRPC photos.confirmUpload
  → Validates storagePath prefix matches tripId/userId
  → Queries storage.objects for authoritative file size
  → Inserts photos row
  → Fire-and-forget: POST /generate-thumbnail (worker)
  → Queues: background_jobs embed_photo
  → Returns {photoId}
```

### Lore Generation Flow

```
Browser → tRPC trips.generateLore
  → Check ≥5 photos (service client)
  → Check monthly token cap
  → Postgres RPC: claim_lore_generation (atomic, FOR UPDATE)
  → Langfuse span: generate-lore-trigger
  → HTTP POST /generate-lore (HMAC signed, 8s timeout)
    → If OK: return {status: 'processing'}
    → If fails: INSERT generation_jobs {status: 'pending'}
              → return {status: 'queued'}

Worker /generate-lore
  → BackgroundTask: LoreOrchestrator.run_full_pipeline(trip_id)
  → DB: lore_status = 'processing'
  → 8-step pipeline (see AI_PIPELINES.md)
  → DB: lore_status = 'ready', lore_json = {...}
  → POST /api/notify/lore-ready → Next.js fires push notification
  → Enqueue background_jobs: image_generation

Browser generating page
  → Supabase Realtime channel on trips.{tripId}
  → Polls lore_pipeline_state (step: fetch/vision/aggregate/lore/enrichment/persist)
  → On lore_status = 'ready' → redirect to /trips/{tripId}/story
```

### Battle Flow

```
Browser → tRPC battles.challenge
  → Ownership + lore_status check
  → Rate limit: max 3 battles per user per 24h
  → INSERT trip_vs_trip {status: 'pending', voting_ends_at: +48h}
  → INSERT background_jobs {job_type: 'judge_battle', payload: {battle_id}}
  → INSERT group_pulse_events {event_type: 'battle_started'} for both crews

Worker poll_background_jobs() picks up judge_battle
  → LoreOrchestrator.judge_battle(battle_id)
  → Claude Sonnet verdict → updates trip_vs_trip with winner + reasoning

Browser → tRPC battles.vote
  → Postgres RPC: cast_vs_vote (deduplication by user ID)
```

### Payment Flow

```
Browser → POST /api/payments/create-order
  → Verify membership
  → Razorpay orders.create(amount, currency='INR', receipt)
  → Return {orderId, amount}

Browser → Razorpay checkout JS (client-side)
  → User completes payment

Razorpay → POST /api/payments/webhook
  → HMAC-SHA256 signature verification (timingSafeEqual)
  → Amount validation (prevents price manipulation)
  → Tier rank check (prevents replay downgrade)
  → UPDATE trips SET tier=..., payment_id=..., webhook_payment_id=...
  → Return 200

Browser → tRPC trips.upgradeTier
  → Read-only: checks webhook_payment_id is set
  → Returns {success: true} if already upgraded
```

---

## Auth Boundaries

```
PUBLIC (no auth):
  - /t/[code]/story (public story page)
  - /api/card/* (OG image generation)
  - /battles/[battleId] (battle view)
  - tRPC: trips.getPublicShowcase, battles.get, archetypes.getPublicHistory

AUTHENTICATED (Supabase session required):
  - All other tRPC procedures via protectedProcedure
  - Trip creation, photo upload, lore generation
  - All personal data access

SERVICE ROLE (never browser):
  - Worker HTTP endpoints (HMAC + Bearer token)
  - Webhook handlers
  - Cron job handlers
  - All storage operations
  - background_jobs table access
```

---

## Storage Architecture

Supabase Storage buckets:

- `trip-photos` — user-uploaded photos (private, signed URLs, 1h expiry cached in DB)
- `trip-covers` — AI-generated trip cover art (public URL)
- `trip-portraits` — AI-generated character portrait cards (public URL)
- `trip-era-thumbnails` — AI-generated era chapter thumbnails (public URL)

All storage writes use `createSupabaseServiceClient()` because user session RLS blocks storage.objects. The `photos` table caches signed URLs with `url_expires_at` to avoid regenerating on every list call (PERF-01).

---

## Service Communication

**Next.js → AI Worker:**

- HMAC-SHA256 signed requests: `X-Signature` + `X-Timestamp` headers
- Bearer token: `Authorization: Bearer {AI_WORKER_SECRET}`
- 8s connection timeout on lore trigger; 5s on warmup; 6s on thumbnail
- Worker validates both HMAC and Bearer on every request

**AI Worker → Supabase:**

- Direct Supabase Python client with service role key
- Synchronous PostgREST for reads/writes; asyncio.to_thread for blocking calls

**AI Worker → Next.js:**

- `POST /api/notify/lore-ready` — fires after lore completes to trigger push notifications
- Requires same `AI_WORKER_SECRET` Bearer token

**Next.js → Upstash Redis:**

- Rate limiting (Ratelimit library): sliding window counters
- Chaos distribution cache: 10-minute TTL JSON cache
- Cross-instance lore generation cooldown (worker also uses Redis SET NX EX)
