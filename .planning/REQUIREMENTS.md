# Requirements: Yaarlore Production Hardening

**Defined:** 2026-05-18
**Core Value:** The AI storytelling pipeline — turning raw group trip photos into a cinematic documentary experience so emotionally resonant that users can't help but share it.

---

## v1 Requirements

### Security

- [ ] **SEC-01**: `trips` and `trip_eras` tables have RLS enabled with correct policies (members read, creator write, service role full access)
- [ ] **SEC-02**: `scheduled_emails`, `otp_codes`, `trip_stats`, `trip_vs_trip` tables have RLS enabled with appropriate policies
- [ ] **SEC-03**: `background_jobs` table has at least a service-role-only RLS policy (currently RLS enabled but zero policies = all access blocked)
- [ ] **SEC-04**: Content-Security-Policy header added to `next.config.mjs`
- [ ] **SEC-05**: Rate limiting fails hard in production — `UPSTASH_REDIS_REST_URL` required env var; no silent in-memory fallback
- [ ] **SEC-06**: `archetypes.getPublicHistory` uses `.eq()` instead of `.ilike()` to prevent wildcard username enumeration
- [ ] **SEC-07**: `reactions/route.ts` validates that anonymous reaction trips have `is_public = true` before accepting inserts
- [ ] **SEC-08**: `AI_WORKER_SECRET` bearer token supplemented with HMAC-SHA256 request signing and timestamp validation
- [ ] **SEC-09**: `otp_codes` table PK changed from `email text PRIMARY KEY` to `id uuid DEFAULT gen_random_uuid() PRIMARY KEY` with non-unique index on `email`

### Reliability

- [ ] **REL-01**: `trips.markAbsent` uses `background_jobs` queue insertion instead of fire-and-forget HTTP POST
- [ ] **REL-02**: `battles.challenge` uses `background_jobs` queue insertion instead of fire-and-forget HTTP POST
- [ ] **REL-03**: Single stuck-pipeline recovery mechanism — either fix the vercel.json cron to `*/15 * * * *` (requires Vercel Pro) OR remove the cron and rely solely on the AI worker's 30-minute recovery
- [ ] **REL-04**: Generating page 4-minute timeout triggers a `lore_status → 'failed'` reset so users can actually retry (not just show a broken "retry" button)
- [ ] **REL-05**: Langfuse `sendToLangfuse` is fire-and-forget (non-awaited) so observability calls never block auth or generation flows
- [ ] **REL-06**: Anniversary email loop marks `sent_at` AFTER successful Resend delivery (not before)
- [ ] **REL-07**: `confirmUpload` validates actual server-side file size against Supabase Storage `storage.objects` metadata

### Cost Controls

- [ ] **COST-01**: Monthly aggregate token cap per user tracked in `profiles.generation_tokens_used_this_month`; generation blocked when exceeded
- [ ] **COST-02**: `fal_budget` table in Supabase persists `_fal_calls_today` counter by date so it survives worker restarts
- [ ] **COST-03**: `LoreEvaluator.evaluate()` runs on 20% of pipeline runs in production (sample flag in `config.py`)
- [ ] **COST-04**: Anthropic dashboard spend alert configured at project level (not code, but documented requirement)
- [ ] **COST-05**: `warmupWorker` skips the Render health call if worker was warmed within the last 10 minutes (server-side KV or Supabase cache)

### Performance

- [ ] **PERF-01**: `photos.list` signed URL batch write replaced with single `upsert` call (not 100 individual UPDATE calls)
- [ ] **PERF-02**: `photos.list` uses explicit column select excluding `clip_embedding` (eliminates ~2KB per row of unused vector data)
- [ ] **PERF-03**: `getChaosDistribution` result cached with 10-minute TTL (Redis or Edge Config) instead of unbounded full-table scan on every `/trips` load
- [ ] **PERF-04**: AI worker photo download in `_analyze_one_batch` uses `httpx.AsyncClient` (async, not sync-in-thread); per-image 8MB size cap added
- [ ] **PERF-05**: Photo embedding trigger moved from per-photo HTTP fire-and-forget (40 requests for 20 uploads) to batch queue polling

### Type Safety

- [ ] **TYPE-01**: Supabase types regenerated via `supabase gen types typescript` to reflect all migrations added since last generation
- [ ] **TYPE-02**: All `as any` casts in tRPC routers removed after type regeneration (59 identified instances across 20 files)
- [ ] **TYPE-03**: `as never` and `as unknown as X` escape hatches audited and replaced with proper Zod/TypeScript types

### Architecture Cleanup

- [ ] **ARCH-01**: `src/proxy.ts` audited — deleted if dead code, documented if intentional
- [ ] **ARCH-02**: `wrap/[year]` route either wired up with generation logic or replaced with redirect to `/trips`
- [ ] **ARCH-03**: `yearly_wraps` table either populated by a generation path or dropped from schema
- [ ] **ARCH-04**: `ipBuckets` in-memory Map in `anti-spam.ts` capped at 10,000 entries (LRU eviction) to prevent unbounded memory growth
- [ ] **ARCH-05**: `getChaosDistribution` scoped to trips where calling user is a member (data leak fix + performance fix)
- [ ] **ARCH-06**: Battle rate limit counting fixed to count per user (not per owned trip) to prevent bypassing via multi-trip ownership

### Testing

- [x] **TEST-01**: tRPC router unit tests added for at minimum: `trips.generateLore`, `trips.upgradeTier`, `photos.confirmUpload`, `battles.challenge`
- [x] **TEST-02**: Auth E2E tests (OTP send → verify → session) unblocked from CI-skip status
- [x] **TEST-03**: `lore-utils.test.ts` fixed to test actual source exports (not locally-redefined stubs)
- [x] **TEST-04**: CI pipeline runs `tsc --noEmit`, `eslint`, and `vitest run` on every PR

### Observability

- [x] **OBS-01**: Structured logging in Next.js tRPC routers replaces `console.log/error` with a structured logger (pino or similar)
- [x] **OBS-02**: AI pipeline step durations tracked in `lore_pipeline_state` JSONB per step (currently partial)
- [x] **OBS-03**: `scripts/prepare.mjs` audited for secrets or dangerous operations
- [x] **OBS-04**: Langfuse traces include token cost breakdown per pipeline step (leverages existing `generation_cost_by_step`)

### Product

- [ ] **PROD-01**: Confession submission UI shows explicit warning that confessions may appear in the AI-generated public story
- [ ] **PROD-02**: `story_visible` flag added to trips (default true) with UI toggle for trip creator
- [ ] **PROD-03**: Anonymous reactions deduplicated correctly (UPSERT with hashed-IP fingerprint, or design documented and accepted)

---

## v2 Requirements

### Architecture

- **ARCH-V2-01**: Extract lore generation columns from `trips` into a separate `trip_lore` table (1:1 join) to reduce the god-table surface area
- **ARCH-V2-02**: Extract payment columns (`tier`, `payment_id`, `expires_at`) from `trips` into `trip_payment` table
- **ARCH-V2-03**: Multi-instance AI worker support — move `_lore_last_triggered` cooldown dict to Redis for cross-instance coordination

### Features

- **FEAT-V2-01**: Yearly wraps generation fully wired (AI pipeline + UI)
- **FEAT-V2-02**: Per-member photo privacy settings
- **FEAT-V2-03**: Trip archiving / export feature

---

## Out of Scope

| Feature                                        | Reason                                                               |
| ---------------------------------------------- | -------------------------------------------------------------------- |
| Full microservices decomposition               | Incremental hardening preferred; architecture is fundamentally sound |
| Supabase → alternative DB migration            | Auth + Realtime too deeply integrated; not justified by current pain |
| Python worker → Node.js rewrite                | Worker is working; Python is the right tool for Claude SDK + CLIP    |
| Kubernetes orchestration                       | Render is adequate for current scale; not a bottleneck yet           |
| Razorpay → Stripe/other                        | India-first product decision; Razorpay is correct for the market     |
| Complete trips table decomposition to services | Schema migration yes; service split is premature at this scale       |

---

## Traceability

| Requirement             | Phase   | Status   |
| ----------------------- | ------- | -------- |
| SEC-01 through SEC-09   | Phase 1 | Pending  |
| REL-01 through REL-07   | Phase 2 | Pending  |
| COST-01 through COST-05 | Phase 3 | Pending  |
| PERF-01 through PERF-05 | Phase 4 | Pending  |
| TYPE-01 through TYPE-03 | Phase 4 | Pending  |
| ARCH-01 through ARCH-06 | Phase 5 | Pending  |
| TEST-01 through TEST-04 | Phase 6 | Complete |
| OBS-01 through OBS-04   | Phase 6 | Complete |
| PROD-01 through PROD-03 | Phase 7 | Pending  |

**Coverage:**

- v1 requirements: 37 total
- Mapped to phases: 37
- Unmapped: 0 ✓

---

_Requirements defined: 2026-05-18_
_Last updated: 2026-05-18 — initial from codebase audit_
