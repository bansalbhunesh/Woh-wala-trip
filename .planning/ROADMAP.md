# Roadmap: Yaarlore Production Hardening

**Project:** Yaarlore (Woh-wala-trip)
**Goal:** Deeply audit, stabilize, simplify, and productionize the codebase without breaking the cinematic UX, virality mechanics, or documentary-style storytelling.
**Created:** 2026-05-18

---

## Overview

Yaarlore has a working product with real emotional magic — the AI storytelling pipeline transforms raw group trip photos into cinematic documentaries that users share. This hardening milestone seals the open security holes before any users hit production, then systematically replaces fragile fire-and-forget patterns with durable queues, adds cost circuit breakers before viral growth arrives, cleans up N+1 hot paths and type debt, removes dead code, builds the observability and test harness that makes future changes safe, and finally completes the UX safety gaps around confessions and story visibility.

---

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Security Foundation** - Fix all CRITICAL/HIGH security vulnerabilities before any production traffic
- [x] **Phase 2: Reliability Engineering** - Replace fire-and-forget patterns with durable queues; fix stuck-pipeline recovery
- [ ] **Phase 3: Cost Controls** - Add circuit breakers to stop unbounded AI spend before viral growth
- [ ] **Phase 4: Performance and Type Safety** - Fix hot-path N+1s, drop unused vector columns, eliminate as-any debt
- [ ] **Phase 5: Architecture Cleanup** - Remove dead code, fix data leaks, cap unbounded memory, correct scoping bugs
- [ ] **Phase 6: Testing and Observability** - Build the safety net that makes production changes sustainable
- [ ] **Phase 7: Product Polish** - Complete the UX safety gaps around confessions, story visibility, and anonymous reactions

---

## Phase Details

### Phase 1: Security Foundation

**Goal**: Every CRITICAL and HIGH security vulnerability is patched before any real user data touches production — RLS protects all tables, rate limiting fails hard, anonymous inputs are validated, and AI worker calls are signed
**Depends on**: Nothing (first phase)
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, SEC-07, SEC-08, SEC-09
**Success Criteria** (what must be TRUE):

1. Any authenticated Supabase client querying `trips`, `trip_eras`, `scheduled_emails`, `otp_codes`, `trip_stats`, or `trip_vs_trip` directly (bypassing tRPC) receives only rows it is authorized to see — a user cannot read or write another user's trip data via the anon key
2. `background_jobs` table with RLS enabled but zero policies no longer silently blocks all app-layer access — a service-role-only policy grants the worker full access while denying all other roles
3. Sending an OTP while `UPSTASH_REDIS_REST_URL` is unset in a production environment throws a startup error rather than silently degrading to an in-memory map that resets on every cold start
4. Navigating to `/api/reactions` with a `tripId` for a private trip returns a 403 rather than accepting the anonymous reaction insert
5. AI worker requests that arrive without a valid HMAC-SHA256 signature and a recent timestamp are rejected with 401 — a replayed or leaked bearer token alone is not sufficient
6. A CSP header is present on every Next.js response; `archetypes.getPublicHistory` uses `.eq()` not `.ilike()` so wildcard username enumeration is closed; `otp_codes` PK is a UUID so rapid OTP re-sends no longer throw a PK violation
   **Plans**: TBD
   **UI hint**: no

---

### Phase 2: Reliability Engineering

**Goal**: No job can silently disappear — `markAbsent`, battle judging, and all background AI work enter the durable `background_jobs` queue; stuck-pipeline recovery is consolidated to a single mechanism; the generating-page timeout actually unblocks retry; Langfuse never blocks auth flows; anniversary emails mark sent only after confirmed delivery
**Depends on**: Phase 1
**Requirements**: REL-01, REL-02, REL-03, REL-04, REL-05, REL-06, REL-07
**Success Criteria** (what must be TRUE):

1. When the AI worker is cold-starting or unreachable, `trips.markAbsent` and `battles.challenge` still produce their outcomes — the `background_jobs` row is inserted and the worker picks it up on the next poll rather than silently dropping the work
2. A trip stuck in `lore_status = 'processing'` for more than 30 minutes is reset to `failed` by exactly one mechanism (the AI worker's built-in recovery); the conflicting daily cron is either removed or converted to a no-op on systems with the worker running
3. After the generating page's 4-minute timeout fires, pressing the retry button on the trip room actually starts a new generation instead of hitting the "already processing" guard
4. Langfuse `sendToLangfuse` calls are fire-and-forget — a Langfuse outage adds zero latency to OTP send or lore generation flows
5. Anniversary emails that fail to send via Resend remain un-marked in `sent_at`; a re-run of the cron will re-attempt them rather than silently losing them; `confirmUpload` rejects uploads whose actual server-side file size in `storage.objects` exceeds the declared limit
   **Plans**: TBD
   **UI hint**: no

---

### Phase 3: Cost Controls

**Goal**: No single user or viral event can exhaust the Anthropic or fal.ai budget without hitting a hard stop — monthly per-user token caps, persistent fal.ai counters, sampled evaluation, and a cached warmup call collectively bound worst-case AI spend
**Depends on**: Phase 2
**Requirements**: COST-01, COST-02, COST-03, COST-04, COST-05
**Success Criteria** (what must be TRUE):

1. A user who has exceeded their monthly generation token allocation receives a clear blocked-generation error from `generateLore` rather than silently consuming more Claude tokens — the cap is tracked in `profiles.generation_tokens_used_this_month`
2. Restarting the Render AI worker mid-day does not reset the fal.ai daily budget counter — `_fal_calls_today` is read from and written to the `fal_budget` Supabase table, so the counter survives process restarts
3. `LoreEvaluator.evaluate()` fires on roughly 20% of pipeline runs in production — the sampling flag exists in `config.py` and reduces Haiku call volume by ~80% at scale
4. Calling `warmupWorker` within 10 minutes of the last warmup returns immediately without making an HTTP call to the Render worker — the server-side cache prevents redundant warmup traffic from concurrent users
5. Anthropic dashboard spend alert configuration is documented in a runbook so an on-call response is possible before costs become unrecoverable
   **Plans**: TBD
   **UI hint**: no

---

### Phase 4: Performance and Type Safety

**Goal**: Hot paths no longer generate N+1 database writes or transfer megabytes of unused embedding data; the type system accurately reflects the current schema so the 59 `as any` casts can be removed; async photo downloads cap per-image memory use on the AI worker
**Depends on**: Phase 2
**Requirements**: PERF-01, PERF-02, PERF-03, PERF-04, PERF-05, TYPE-01, TYPE-02, TYPE-03
**Success Criteria** (what must be TRUE):

1. Loading a trip with 50 photos produces one `upsert` call to persist signed URL cache rather than 50 concurrent UPDATE calls — Supabase write pressure from cache refresh is reduced by ~98% on active trips
2. The `photos.list` response payload no longer contains `clip_embedding` vectors — the select is explicit and each row is ~2KB lighter, confirmed by inspecting the tRPC response shape
3. `/trips` page load no longer triggers a full-table scan of all ready trips to compute chaos percentiles — the result is served from a Redis or Edge Config cache with a 10-minute TTL
4. Photo downloads in `_analyze_one_batch` use `httpx.AsyncClient` concurrently; any single image exceeding 8MB is skipped with a warning rather than causing an OOM on the Render free tier
5. Photo embeddings for bulk uploads are queued in Supabase and polled by the worker every 30 seconds — `confirmUpload` no longer fires 40 individual HTTP requests to the worker for a 20-photo upload
6. `supabase gen types typescript` has been re-run and `src/lib/database.types.ts` reflects all migrations; all 59 `as any` casts in tRPC routers are removed; `as never` and `as unknown as X` escapes are replaced with proper Zod/TypeScript types
   **Plans**: TBD
   **UI hint**: no

---

### Phase 5: Architecture Cleanup

**Goal**: Dead code is deleted, the wrap route either works or redirects, unbounded in-memory structures are capped, `getChaosDistribution` is scoped to the caller's own trips, and battle rate limiting cannot be bypassed via multi-trip ownership
**Depends on**: Phase 2
**Requirements**: ARCH-01, ARCH-02, ARCH-03, ARCH-04, ARCH-05, ARCH-06
**Success Criteria** (what must be TRUE):

1. `src/proxy.ts` either has an explanatory comment describing its purpose and where it is used, or it is deleted — the codebase has no mystery files
2. Navigating to `/wrap/[year]` either renders real yearly wrap data or redirects to `/trips` — users cannot land on a broken dead-end page; the `yearly_wraps` table is either populated by a generation path or dropped from the schema
3. The `ipBuckets` Map in `anti-spam.ts` evicts entries beyond 10,000 using LRU semantics — memory growth from unique IPs is bounded regardless of traffic volume
4. `getChaosDistribution` returns percentile data scoped to trips where the calling user is a member — it no longer leaks chaos scores from other users' trips
5. Battle rate limiting counts all battles where the user is a participant (as challenger or challenged), not only battles initiated by trips the user created — the 3-per-24h cap cannot be bypassed by owning multiple trips
   **Plans**: TBD
   **UI hint**: no

---

### Phase 6: Testing and Observability

**Goal**: Every PR runs type-check, lint, and unit tests automatically; the four highest-risk tRPC procedures have test coverage; auth E2E tests are unblocked from CI-skip; structured logging replaces console calls; AI pipeline step durations and Langfuse cost breakdowns are tracked per step
**Depends on**: Phase 4
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04, OBS-01, OBS-02, OBS-03, OBS-04
**Success Criteria** (what must be TRUE):

1. Opening a PR triggers a CI run that executes `tsc --noEmit`, `eslint`, and `vitest run` — a PR with a type error or failing test cannot be merged without a green CI status
2. Unit tests exist for `trips.generateLore`, `trips.upgradeTier`, `photos.confirmUpload`, and `battles.challenge` — each test exercises the core authorization, validation, and state-machine logic of its procedure
3. Auth OTP E2E tests (send → verify → session) run in CI without being skipped; `lore-utils.test.ts` imports and tests the actual source exports rather than locally-redefined stubs
4. tRPC routers emit structured pino log entries rather than `console.log/error` — log lines include request context (procedure name, user id, trip id where applicable) in a machine-parseable format
5. Langfuse traces for completed pipeline runs include per-step token costs sourced from `generation_cost_by_step`; `lore_pipeline_state` JSONB tracks step start/end timestamps for every pipeline step; `scripts/prepare.mjs` has been audited and contains no secrets or dangerous shell operations
   **Plans**: TBD
   **UI hint**: no

---

### Phase 7: Product Polish

**Goal**: Users understand that confessions are included in the public AI story before they submit; trip creators can hide their story from public view; anonymous reaction deduplication is either correctly enforced or explicitly accepted as unlimited
**Depends on**: Phase 1
**Requirements**: PROD-01, PROD-02, PROD-03
**Success Criteria** (what must be TRUE):

1. The confession submission UI shows a visible, explicit warning that confessions may appear verbatim in the AI-generated public story before the user confirms submission — no user can claim surprise after the fact
2. A trip creator can toggle a `story_visible` flag on their trip from the trip settings UI — when disabled, the `/t/[code]/story` route returns a 404 or a "story hidden" placeholder rather than the full lore
3. Anonymous reactions either correctly deduplicate per-IP fingerprint via UPSERT (preventing infinite inflation) or the unlimited-anonymous-reactions behavior is explicitly documented and accepted as a product decision — there is no silent schema/code contradiction
   **Plans**: TBD
   **UI hint**: yes

---

## Progress

**Execution Order:**
Phases execute in dependency order. Phases 3, 4, and 5 can run in parallel after Phase 2 completes. Phase 6 can start in parallel with Phase 5. Phase 7 needs only Phase 1 complete.

| Phase                          | Plans Complete | Status      | Completed  |
| ------------------------------ | -------------- | ----------- | ---------- |
| 1. Security Foundation         | 5/5            | ✅ Complete | 2026-05-18 |
| 2. Reliability Engineering     | 0/TBD          | Not started | -          |
| 3. Cost Controls               | 0/TBD          | Not started | -          |
| 4. Performance and Type Safety | 0/TBD          | Not started | -          |
| 5. Architecture Cleanup        | 0/TBD          | Not started | -          |
| 6. Testing and Observability   | 1/1            | ✅ Complete | 2026-05-18 |
| 7. Product Polish              | 0/TBD          | Not started | -          |

---

## Phase Overview

| Phase | Name                        | Goal                                                                | Requirements                                              | Est. Complexity |
| ----- | --------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------- | --------------- |
| 1     | Security Foundation         | Patch all CRITICAL/HIGH security vulnerabilities                    | SEC-01 through SEC-09 (9 reqs)                            | High            |
| 2     | Reliability Engineering     | Durable queues for all background work; single recovery mechanism   | REL-01 through REL-07 (7 reqs)                            | High            |
| 3     | Cost Controls               | Hard caps on AI spend per user and per service restart              | COST-01 through COST-05 (5 reqs)                          | Medium          |
| 4     | Performance and Type Safety | N+1 fixes, drop clip_embedding from selects, regenerate types       | PERF-01 through PERF-05, TYPE-01 through TYPE-03 (8 reqs) | High            |
| 5     | Architecture Cleanup        | Delete dead code, fix scope bugs, cap memory, fix rate limit bypass | ARCH-01 through ARCH-06 (6 reqs)                          | Medium          |
| 6     | Testing and Observability   | CI enforcement, unit tests, structured logging, pipeline telemetry  | TEST-01 through TEST-04, OBS-01 through OBS-04 (8 reqs)   | Medium          |
| 7     | Product Polish              | Confession warning, story visibility toggle, reaction deduplication | PROD-01 through PROD-03 (3 reqs)                          | Low             |

**Total v1 requirements mapped: 37/37**

---

## Phase Dependencies

```
Phase 1: Security Foundation
    └─► Phase 2: Reliability Engineering
            ├─► Phase 3: Cost Controls         (can run in parallel with 4 and 5)
            ├─► Phase 4: Performance + Types   (can run in parallel with 3 and 5)
            │       └─► Phase 6: Testing + Obs (can start in parallel with Phase 5)
            └─► Phase 5: Architecture Cleanup  (can run in parallel with 3 and 4)

Phase 1: Security Foundation
    └─► Phase 7: Product Polish                (independent of Phases 3-6)
```

**Dependency rules:**

- Phase 1 is a hard gate — no phase can start before Phase 1 is complete
- Phase 2 is a hard gate for Phases 3, 4, and 5
- Phase 6 requires Phase 4 (type regeneration is a prerequisite for meaningful test authorship)
- Phase 7 requires only Phase 1 (security + RLS must be in place before exposing story visibility controls)
- Phases 3, 4, and 5 have no dependency on each other and can be parallelized

---

## Execution Notes

**Phase 1 is a hard prerequisite for any production traffic.**
The RLS holes in `trips` and related tables mean any authenticated user can read or write any other user's trip data via the Supabase anon key. This must be closed before any real users are onboarded. SEC-01 through SEC-09 are non-negotiable before go-live.

**Phases 3, 4, and 5 can be parallelized after Phase 2 completes.**
These three phases touch largely disjoint parts of the codebase: Phase 3 is AI worker config and `profiles` schema; Phase 4 is `photos.ts` router, type generation, and `ai-worker/src/lore/orchestrator.py`; Phase 5 is dead code, scoping fixes, and `anti-spam.ts`. Running them concurrently halves elapsed time on this milestone.

**Phase 6 can start in parallel with Phase 5.**
Type regeneration (TYPE-01) is a prerequisite for meaningful test authorship (TEST-02) since tests would otherwise paper over the same type errors. Once Phase 4 completes, Phase 6 can begin while Phase 5 is still in flight. CI harness setup (TEST-04) and structured logging (OBS-01) have no dependency on Phase 5 at all.

**Phase 7 is independent of Phases 5 and 6.**
The product polish changes (confession warning, story visibility toggle, anonymous reaction design) only need the security foundation in place (Phase 1) to ensure the new `story_visible` column is protected by RLS. They can be executed any time after Phase 1 — even concurrently with Phases 3-6 if capacity allows.

**Prefer incremental commits over big-bang migrations.**
Each RLS migration should be deployed and verified in staging before the next one lands. Type regeneration and `as any` removal should happen in one focused PR (TYPE-01 first, then TYPE-02 and TYPE-03 follow naturally). Fire-and-forget → background_jobs conversions (REL-01, REL-02) should be tested with the worker in a degraded state to confirm the queue pickup path works before removing the HTTP fallback.
