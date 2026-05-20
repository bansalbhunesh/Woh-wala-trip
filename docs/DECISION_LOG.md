# Decision Log — Yaarlore

## Why tRPC 11 + Next.js 15 (not REST, not GraphQL)

**Decision:** Use tRPC 11 release candidate with Next.js 15 App Router.

**Reasoning visible from codebase:**

- tRPC provides end-to-end type safety between the Next.js server and browser client without code generation steps (no OpenAPI spec, no GraphQL schema)
- With a React 19 + TanStack Query stack, tRPC's `useQuery`/`useMutation` hooks are a natural fit — no separate REST client library needed
- The App Router's server functions + tRPC gives a clean separation: server procedures define the contract, the client consumes it fully typed
- SuperJSON transformer handles Date, Map, Set serialization automatically — critical for the ISO timestamp cursors used in `listMine` pagination

**Why not REST:** REST would require maintaining separate endpoint documentation and TypeScript types. With a small team (likely 1–2 engineers), type drift between API and client is a real risk. tRPC eliminates this entirely.

**Why not GraphQL:** GraphQL's flexibility (arbitrary query shapes) is valuable for public APIs consumed by many clients. Yaarlore has exactly one client (the Next.js app itself). The overhead of a schema, resolvers, and a GraphQL client is unjustified. tRPC v11's streaming support covers any advanced use case.

**Trade-off accepted:** tRPC 11 was in RC at the time of writing (`^11.0.0-rc.446`). This means breaking changes are possible. The entire API layer has to be migrated simultaneously if tRPC releases a breaking stable version. Acceptable for pre-launch stage.

---

## Why Supabase (vs Firebase, PlanetScale, Neon)

**Decision:** Supabase for database, auth, storage, and realtime.

**Reasoning:**

1. **Single platform for 4 services:** Database (Postgres + pgvector), Auth (JWT sessions + magic links), Storage (signed URLs + buckets), Realtime (WebSocket subscriptions). Using Supabase eliminates 3 additional service integrations (Auth0, S3/Cloudinary, Pusher).

2. **pgvector native.** The CLIP embedding feature for photo similarity search requires pgvector. Supabase ships pgvector natively. PlanetScale is MySQL (no pgvector); Firebase is NoSQL (no vectors without separate index); Neon is Postgres with pgvector but doesn't include auth/storage/realtime.

3. **SECURITY DEFINER functions.** The atomic lore claim (`claim_lore_generation`), the paginated trip list (`list_user_trips`), the job queue claim (`claim_generation_job`) all require Postgres functions with `FOR UPDATE SKIP LOCKED` or `DO UPDATE` semantics. Supabase exposes the full Postgres surface.

4. **RLS for multi-tenant auth.** Row-Level Security lets the same DB serve multiple users with policies enforcing data isolation. This eliminates entire classes of auth bugs. (That said, the `trips` table initially shipped without RLS — SEC-01 — which required Phase 1 to fix.)

5. **Storage + RLS is a known footgun.** Decision noted in code comments: all Supabase Storage operations require the service role client because the user session is blocked by storage.objects RLS. This is documented as a deliberate trade-off (use service client + explicit auth checks) not a bug.

**Why not Firebase:** Firestore is a NoSQL document database. The trip data model is inherently relational (trips → trip_members → photos → embeddings → incidents). Expressing this in Firestore requires either denormalization (data consistency risk) or multiple round trips per query. Postgres is the right tool.

**Why not PlanetScale (MySQL):** No pgvector support. No `SECURITY DEFINER` functions (PlanetScale doesn't support stored procedures in the same way). Vitess sharding architecture adds complexity for a single-table-per-tenant model.

---

## Why FastAPI Python AI Worker (vs Inline Next.js)

**Decision:** Separate Python FastAPI service on Render for all AI/ML work.

**Reasoning:**

1. **Anthropic Python SDK is superior for vision.** At the time of building, the Python Anthropic SDK had better support for multi-image vision messages (passing arrays of base64-encoded image blocks with the right content types). The Node.js SDK was at parity but the Python ecosystem for ML (numpy, PIL, httpx async) is more mature.

2. **Voyage AI embedding client is Python-first.** The Voyage AI Python client has a more complete multimodal embedding API. Using it from Python avoids wrapping a REST API in TypeScript.

3. **Vercel function timeout.** Vercel serverless functions have a 10-second timeout on the free plan (60s on Pro). A full lore pipeline (8 steps, vision analysis, multiple LLM calls) takes 60–180 seconds. Running this inline in a Next.js route would hit the timeout. A separate long-running process on Render has no timeout.

4. **Memory.** Downloading and base64-encoding 80 photos (each up to 8MB) requires significant memory. Vercel serverless functions have 1GB RAM limit and cannot hold large objects across requests. The Python worker (512 MB on Render free tier, but constant process) can manage this better.

5. **Background task architecture.** FastAPI's `BackgroundTasks` and `asyncio.create_task` allow the pipeline to acknowledge the HTTP request immediately and process asynchronously. Vercel Edge functions don't support long-lived background processing.

**Trade-off accepted:** Dual runtime complexity. The TypeScript app must communicate with the Python worker via HTTP (HMAC-signed). Type safety across the boundary is enforced by conventions and HMAC signature verification, not compile-time checks. Worker cold starts on Render free tier add latency to first generation.

---

## Why fal.ai Sana Sprint for Images

**Decision:** fal.ai's Sana Sprint model for AI image generation (trip covers, portraits, era thumbnails).

**Reasoning visible from code:**

1. **Speed.** Sana Sprint is designed for fast inference (18 steps, 4.5 guidance scale in the codebase). For a product where images appear after lore is generated (background task), generation speed matters for time-to-visual.

2. **API simplicity.** The fal.ai REST API (`https://fal.run/fal-ai/sana-sprint`) accepts a simple JSON payload with prompt + settings. No model hosting, no fine-tuning pipeline needed.

3. **Cost.** fal.ai pricing is per-image, billed in milliseconds of GPU time. For a budget of 200 images/day at low inference steps, this is significantly cheaper than DALL-E 3 or Midjourney API.

**Why not DALL-E 3 or Stable Diffusion:** DALL-E 3 is more expensive and not available via a simple REST API without OpenAI platform setup. Stable Diffusion self-hosting requires GPU infrastructure. Sana Sprint via fal.ai is the fastest path to production-quality AI images without infra overhead.

**Trade-off accepted:** Less fine-grained control over style compared to custom-trained models. The negative prompt ("no people, no faces, no text, no western faces") is the primary style control. This limits but doesn't eliminate stylistic inconsistency across generated images.

---

## Why Langfuse for Observability

**Decision:** Langfuse for AI call tracing and cost monitoring.

**Reasoning:**

1. **LLM-specific tracing.** Langfuse tracks spans with token usage, model, input/output, latency. Generic APMs (Datadog, New Relic) don't have first-class LLM cost breakdowns.

2. **Per-step cost visibility.** `generation_cost_by_step` stored in the DB was motivated by Langfuse traces — each pipeline step's token count is recorded (OBS-04) so the team can see exactly which step is expensive.

3. **Security event tracing.** `traceSecurityEvent()` in `src/lib/langfuse.ts` traces auth-blocking events (disposable email, rate limited, fraud score) to Langfuse. This gives a single dashboard for both AI quality and security monitoring.

4. **Free tier available.** Langfuse has a self-hosted option and a generous free cloud tier. For a pre-launch product, cost-free observability is essential.

**The implementation is custom HTTP (not the official Langfuse SDK):** `src/lib/langfuse.ts` makes direct HTTP calls to the Langfuse ingestion API rather than importing the `langfuse` npm package. This eliminates a dependency and makes the client a no-op stub when keys are missing, rather than throwing on import. The trade-off is that it doesn't use the SDK's built-in batching and retry logic.

---

## Why Razorpay (India-Specific)

**Decision:** Razorpay for all payments.

**Reasoning:**

1. **Indian payment methods.** UPI, netbanking, wallets (PhonePe, Paytm), and Indian card networks (RuPay) are first-class in Razorpay. Stripe does not support UPI natively in India.

2. **INR billing.** Razorpay charges in INR natively. Stripe's India offering requires international card acceptance which has higher failure rates for Indian users.

3. **No currency conversion.** Razorpay disburses in INR to Indian bank accounts. No multi-currency complexity.

4. **Market standard.** Razorpay is the dominant payment gateway for Indian startups. Integration help, documentation, and community support are India-focused.

**Why not Stripe:** Stripe has limited UPI support, higher card failure rates for India, and requires additional KYC for Indian settlements. For an India-first product, Razorpay is the correct choice.

---

## Background Jobs Queue Design Decisions

**Two queues, not one:**

1. `generation_jobs` — specifically for main lore pipeline. Uses `claim_generation_job()` RPC with `FOR UPDATE SKIP LOCKED` for multi-instance safety.

2. `background_jobs` — for all other async work: image generation, missing person cards, battle judging, photo embedding, yearly wrap.

**Why separate?** The lore pipeline has a very specific state machine (`lore_status` on the `trips` table). The `generation_jobs` table is directly coupled to this state machine. Mixing it with image generation or battle judging would create ordering and state management complexity.

**Atomic claim vs. simple UPDATE:** The `poll_background_jobs()` function uses an explicit `UPDATE ... SET status='claimed' WHERE status='pending'` check to verify exactly one row was claimed (not zero, which would indicate a race). This is simpler than a `FOR UPDATE SKIP LOCKED` but requires checking `rows_claimed`. On a single-instance deployment (current), both approaches are safe; the `rows_claimed` check is more robust for future multi-instance.

---

## Known Unresolved Architecture Debates

1. **Trips god table vs. decomposed schema.** ARCH-V2-01 proposes extracting lore columns to `trip_lore` and payment columns to `trip_payment`. The counter-argument (kept as-is in v1) is that decomposition adds JOIN overhead on every query and increases schema migration complexity. Deferred to v2.

2. **Worker on Render vs. serverless AI.** An alternative design would use Vercel AI SDK with streaming for the lore pipeline (keeping everything in TypeScript). Rejected because: (a) 60s+ execution time exceeds Vercel function limits, (b) Python AI ecosystem maturity, (c) the existing worker architecture is working. Revisit if Render becomes a scaling bottleneck.

3. **Cron scheduling strategy.** With `vercel.json` empty, crons need an external scheduler. Options: Vercel Pro (adds sub-daily crons natively), GitHub Actions cron (free, reliable), Render cron jobs (co-located with worker), Supabase pg_cron (DB-level). No decision made yet — this is the active tech debt item CRON-01.

4. **Thumbnail generation as fire-and-forget vs. queue.** Currently fire-and-forget (THUMB-01 in tech debt). The argument for keeping it fire-and-forget: thumbnails are non-critical (users can still see photos without thumbnails), and queueing adds 60-second latency vs. near-instant HTTP. The argument for queuing: reliability. Unresolved.

5. **Lore eval sampling rate.** `LORE_EVAL_SAMPLE_RATE=1.0` in the config file comments ("Haiku cost is negligible at $0.000125/run. Reduce only if Anthropic rate limits become a concern at scale"). The `REQUIREMENTS.md` specifies 20% sampling in production (COST-03). The code uses 100% by default. This configuration inconsistency is unresolved — whoever deploys sets the env var.
