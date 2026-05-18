# Yaarlore (Woh-wala-trip)

## What This Is

Yaarlore is a cinematic AI-powered trip documentary platform for friend groups. Users upload travel photos together; the AI pipeline (Claude Sonnet + fal.ai) transforms them into a narrative documentary — character roles, chaos scores, trip eras, receipt stats, and a shareable public story. The platform is India-first (Razorpay, INR) with social virality mechanics (battles, reactions, invite codes, OG cards).

## Core Value

The AI storytelling pipeline — turning raw group trip photos into a cinematic documentary experience so emotionally resonant that users can't help but share it.

## Requirements

### Validated

<!-- Shipped and confirmed in existing codebase -->

- ✓ Custom OTP email auth (Supabase Auth + Resend + anti-fraud scoring) — existing
- ✓ Trip creation with invite-code member joining — existing
- ✓ Photo upload with free-tier limits (50 photos / 500 MB) — existing
- ✓ 8-step AI lore pipeline (Claude Sonnet vision + lore + enrichments) — existing
- ✓ Per-member character roles (Claude Haiku) — existing
- ✓ AI receipt stats + superlatives — existing
- ✓ Trip eras narrative structure — existing
- ✓ Razorpay payment tiers (free / digital / print) — existing
- ✓ Trip battles (vs-trip challenge + AI verdict) — existing
- ✓ Missing person card generation (AI) — existing
- ✓ AI cover image + character portraits (fal.ai Sana Sprint) — existing
- ✓ Real-time generation status via Supabase Realtime — existing
- ✓ Public story sharing via invite code (`/t/[code]/story`) — existing
- ✓ OG social cards (Satori edge-rendered PNG) — existing
- ✓ Langfuse AI observability + PostHog product analytics — existing
- ✓ Anniversary email scheduling (1-year trigger on lore ready) — existing
- ✓ Photo embeddings via CLIP + pgvector (cosine similarity search) — existing
- ✓ Nostalgia moments ("on this day" photos) — existing
- ✓ Confessions system per trip member — existing
- ✓ Emoji reactions on story slides — existing

### Active

<!-- Audit + productionization goals — this project's work -->

- [ ] RLS enabled on all Supabase tables (trips, trip_eras, scheduled_emails, otp_codes)
- [ ] Content-Security-Policy header in production
- [ ] Rate limiting fail-hard in production (no silent in-memory fallback)
- [ ] Fire-and-forget worker calls replaced with durable job queue (markAbsent, judging)
- [ ] stuck-jobs cron at correct 15-minute cadence (or consolidated into worker recovery)
- [ ] Monthly token budget cap per user (no runaway AI costs)
- [ ] fal.ai daily budget counter persisted to Supabase (not in-memory)
- [ ] N+1 signed URL batch writes fixed (single upsert)
- [ ] `select('*')` replaced with explicit column lists (drop clip_embedding from photos.list)
- [ ] Stale Supabase types regenerated; `as any` casts purged
- [ ] Dead code removed (proxy.ts, wrap/[year] route, yearly_wraps table)
- [ ] otp_codes PK changed from email to UUID
- [ ] background_jobs RLS policy added
- [ ] Lore evaluator sampling (20% in production vs 100% currently)
- [ ] getChaosDistribution scoped/cached (no full-table scan)
- [ ] Test coverage for tRPC routers and auth E2E flows
- [ ] CI pipeline hardened (types + lint + test on every PR)
- [ ] Structured logging in Next.js (replace console.log)
- [ ] CSP + security headers audit
- [ ] ilike wildcard injection fixed in archetypes.getPublicHistory
- [ ] Anonymous reactions properly deduplicated (UPSERT with IP fingerprint or doc the design)
- [ ] Wrap page redirected or feature fully wired
- [ ] Confession privacy controls + opt-out warning at submission time
- [ ] Warmup cache (skip warmup if warmed within 10 min)

### Out of Scope

- Full microservices decomposition — incremental cleanup preferred, not a rewrite
- Switching from Supabase to another DB — Supabase is load-bearing for auth + Realtime
- Switching from Python/FastAPI worker — the AI worker is working well; only stabilize
- Kubernetes orchestration — Render is adequate for current scale
- Replacing Razorpay — India-first payment stack is a product decision
- Full trips god-table decomposition to separate services — schema migration acceptable but service split not yet warranted

## Context

Codebase built rapidly with many systems integrated at once. Dual-runtime (TypeScript/Next.js + Python/FastAPI). Currently pre-launch / early-launch. Five CRITICAL/HIGH security vulnerabilities identified (no RLS on trips table, no CSP, in-memory rate limiting fallback, unbounded AI token costs). Two independent stuck-pipeline recovery mechanisms that aren't coordinated. 59 `as any` casts from stale generated types. Architecture is fundamentally sound (correct separation of concerns, good tRPC patterns) — issues are depth, not design.

## Constraints

- **Tech Stack**: TypeScript / Next.js 15 / tRPC 11 / Supabase / Python 3.12 / FastAPI / Render — no switching
- **Render Free Tier**: AI worker has cold-starts every 15 min inactivity; any state that needs to survive restarts must be in Supabase/Redis
- **Vercel Free Tier Crons**: Once-daily minimum; 15-minute crons require Vercel Pro or external scheduler
- **India-First**: INR payments via Razorpay; keep India-optimized UX decisions
- **Cinematic UX**: Visual identity, animations, and documentary-style storytelling must be preserved through all refactors
- **Incremental**: Prefer small migrations over big rewrites; never break the existing happy path

## Key Decisions

| Decision                                 | Rationale                                                                       | Outcome                                                               |
| ---------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Dual runtime (TS + Python)               | Python ecosystem better for Claude SDK + CLIP; Next.js better for full-stack UI | ✓ Good — clean separation                                             |
| Two-path lore dispatch (HTTP + DB queue) | HTTP is fast; DB queue is durable fallback for cold-start scenarios             | ✓ Good — but fallback triggers only on HTTP error, not on timeout     |
| Service role for all storage writes      | Supabase Storage RLS blocks user session                                        | ✓ Good — but requires explicit auth checks before service-role writes |
| Satori edge-rendered OG cards            | No Puppeteer dependency; fast cold starts                                       | ✓ Good                                                                |
| SKIP LOCKED job claim                    | Correct pattern for multi-worker safety                                         | ✓ Good                                                                |
| trips table as god table                 | Expedient during rapid development                                              | ⚠️ Revisit — extract lore + payment columns                           |
| fire-and-forget for markAbsent + battles | Expedient during rapid development                                              | ⚠️ Revisit — must use job queue                                       |
| otp_codes email as PK                    | Simpler initially                                                               | ⚠️ Revisit — causes PK conflict on rapid OTP resend                   |

---

_Last updated: 2026-05-18 — project initialization from codebase audit_
