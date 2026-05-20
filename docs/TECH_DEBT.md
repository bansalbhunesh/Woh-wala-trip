# Technical Debt Inventory — Yaarlore

## Severity Ranking

- **P0** — Blocks production correctness; must fix before launch
- **P1** — Significant reliability/security/correctness risk; fix soon
- **P2** — Notable debt; manageable but should be addressed
- **P3** — Code quality; low risk but should clean up

---

## P0: Cron Jobs Never Run

**ID:** CRON-01  
**File:** `vercel.json` (empty `{}`)  
**Status:** BROKEN in production

`vercel.json` is `{}`. None of the 7 cron endpoints declared in `src/app/api/cron/` are triggered automatically. This means:

- Anniversary emails never send
- First-week follow-up emails never send
- `chaos_distribution_cache` view never refreshes (chaos percentile is always stale)
- Battle notifications never fire
- Nostalgia drops never fire

The `scheduled_emails` table grows unbounded with unsent rows.

**Fix:** Add cron configuration to `vercel.json` (requires Vercel Pro for sub-daily intervals) or set up an external scheduler.

---

## P0: Worker On Render Free Tier

**ID:** RENDER-01  
**File:** `ai-worker/src/main.py`  
**Status:** AT RISK

Render free tier means:

- Cold starts on first request after 15 min inactivity
- 512 MB RAM (pipeline can consume up to 640 MB with 80 photos at 8MB each)
- Single instance — no horizontal scaling
- No SLA

The warmup mechanism (`warmupWorker` tRPC mutation) mitigates cold starts for lore generation, but any other worker endpoint (battle judging, missing person card, etc.) has no warmup.

**Fix:** Upgrade to Render paid tier ($7/mo always-on). For scaling: Render autoscaling or move to containerized deployment with proper queue workers.

---

## P1: `as any` and `as never` Casts

**ID:** TYPE-02  
**Files:** Multiple tRPC routers  
**Status:** PARTIALLY RESOLVED

From REQUIREMENTS.md: "59 `as any` casts from stale Supabase types." After TYPE-01 (type regeneration, completed Phase 4), many have been resolved. However, several remain:

Notable `as never` / `as any` casts still in codebase:

- `battles.ts:69` — `(ctx.supabase as any).from('trip_vs_trip')`
- `battles.ts:97` — `.from('trip_vs_trip') ... .select() ... as any`
- `battles.ts:198` — `(ctx.supabase as any).rpc('cast_vs_vote', ...)`
- `trips.ts` — `as never` for `lore_disputes`, `dispute_votes`, `group_pulse_events` tables
- `archetypes.ts` — multiple `as never` casts for `user_archetypes`, `upsert_user_archetype`
- `photos.ts:197` — `(storageAdmin as any).from('storage.objects')`
- Many `as unknown as SpecificType` patterns throughout trips.ts

These silence TypeScript and create false confidence. A schema change will not cause compile errors.

**Fix:** After `supabase gen types typescript` regeneration, audit all remaining casts and replace with typed wrappers or Zod validation.

---

## P1: Thumbnail Generation Is Fire-and-Forget

**ID:** THUMB-01  
**File:** `src/server/trpc/routers/photos.ts:265-294`  
**Status:** ACCEPTED RISK (by design, but should be improved)

Thumbnail generation is called via `.then(fetch(...)).catch(log.warn)` — purely fire-and-forget. If the worker is cold when a photo is uploaded, the thumbnail job is dropped silently. No retry, no queue.

Unlike `embed_photo` (which was upgraded to a background_jobs queue in PERF-05), thumbnails still use the fire-and-forget pattern.

**Fix:** Queue thumbnail generation in `background_jobs` table like embeddings, so it retries on next poll tick.

---

## P1: Battle `console.error` Leaks

**ID:** LOG-01  
**File:** `src/server/trpc/routers/battles.ts:128`, `battles.ts:158`  
**Status:** DEBT

Battles router uses `console.error` and `console.log` instead of the structured `logger` (pino) used in the trips router. This means battle errors don't show up in structured log queries.

**Fix:** Replace `console.error/log` in `battles.ts` with `import { logger } from '@/lib/logger'`.

---

## P1: `group_pulse_events` Not Typed

**ID:** TYPE-03  
**Files:** `src/server/trpc/routers/trips.ts:1753`, `src/server/trpc/routers/battles.ts:149`  
**Status:** DEBT

`group_pulse_events` and `lore_disputes` tables are inserted via `as never` casts because they were added after the last type regeneration. This means any column mismatch is silently ignored.

---

## P2: God Table: `trips`

**ID:** ARCH-V2-01  
**File:** DB schema  
**Status:** KNOWN, OUT OF SCOPE FOR V1

The `trips` table carries lore columns (lore_json, lore_status, lore_trace_id, lore_pipeline_state, lore_eval_json, lore_error, lore_needs_review, lore_prompt_version, generation_cost_tokens, generation_cost_by_step), payment columns (tier, payment_id, webhook_payment_id, expires_at), signal columns (trip_signals), image columns (cover_image_url, image_gen_status), and all the core trip metadata.

This means every query that touches `trips` fetches a very wide row. It also makes schema evolution risky (adding a new column affects every query).

**Fix:** ARCH-V2-01 — extract lore columns to `trip_lore` (1:1 join) and payment columns to `trip_payment`. Tracked as v2 requirement.

---

## P2: Stale Supabase Types (TYPE-01 — Partially Resolved)

**ID:** TYPE-01  
**Status:** RESOLVED for core tables; residual custom types remain

`src/lib/database.types.ts` was regenerated in Phase 4 (TYPE-01). However, `src/lib/supabase-extended.types.ts` carries custom type definitions for RPC result shapes and tables added post-codegen. This file needs manual maintenance whenever new RPCs or tables are added.

Tables still only partially typed or using local overrides:

- `lore_disputes`
- `dispute_votes`
- `group_pulse_events`
- `lore_reactions` (partially)
- `user_archetypes`
- `group_lore_os`
- `social_role_assignments`
- `relationship_dynamics`

---

## P2: Worker Cooldown Not Cross-Instance

**ID:** ARCH-V2-03  
**File:** `ai-worker/src/main.py:236`  
**Status:** KNOWN RISK

`_lore_last_triggered: dict[str, float]` — the per-trip cooldown dictionary lives in the Python process memory. On Render, if multiple worker instances are running (possible on paid tier), each has its own empty cooldown state on startup.

The `check_and_set_cooldown()` function uses Redis `SET NX EX` when `REDIS_URL` is configured — this is the correct cross-instance approach. But the in-memory fallback means single-instance restarts reset the cooldown.

**Fix:** Always require `REDIS_URL` in production for cooldown coordination (ARCH-V2-03).

---

## P2: Print Tier Not Implemented

**ID:** PROD-PRINT  
**File:** `src/app/api/print-waitlist/route.ts`  
**Status:** WAITLIST ONLY

The "Print" tier (₹799) is advertised in the upgrade flow and creates Razorpay orders. However, actual print fulfillment doesn't exist. Orders go to a waitlist. No physical product currently ships.

This means users who pay ₹799 for print get... nothing concrete. The webhook handler will upgrade their trip tier to 'print' but no print pack is sent.

---

## P2: Cast Vote Uses `as any` Pattern

**ID:** TYPE-BATTLE  
**File:** `src/server/trpc/routers/battles.ts:198`  
**Status:** DEBT

```ts
const { data, error } = await (ctx.supabase as any).rpc('cast_vs_vote', { ... });
```

The `cast_vs_vote` RPC was added post-codegen. Uses `as any` which silences all type checking on the RPC arguments and result.

---

## P2: Yearly Wrap UI State Unknown

**ID:** WRAP-UI  
**File:** `src/app/wrap/[year]/page.tsx`  
**Status:** PARTIAL

The yearly wrap generation pipeline was wired (Phase 5/7), but the UI state and completeness of the `/wrap/[year]` page is not confirmed in this audit. The mutation and query tRPC endpoints exist and work. Whether the page renders the `wrap_json` result correctly is not verified from code alone.

---

## P3: Duplicated BackgroundJobInsert Type

**ID:** DUP-01  
**Files:** `trips.ts`, `photos.ts`, `battles.ts`  
**Status:** LOW RISK

The `BackgroundJobInsert` type definition is duplicated (slightly differently) in both `trips.ts` and `photos.ts` rather than being shared from a common location. Minor maintenance burden.

---

## P3: OG Card Test Directory

**ID:** OG-TEST  
**File:** `src/app/api/og-test/` directory  
**Status:** DEAD CODE

The directory `src/app/api/og-test/` exists but contains no `route.ts` file found in the file listing. Either it's an empty directory or contains a non-TypeScript file. If empty, can be removed.

---

## P3: Sentry Not Actively Configured

**ID:** OBS-SENTRY  
**Files:** `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`  
**Status:** STUB

All three Sentry config files are 179 bytes each — likely minimal stubs. Sentry is only active if `SENTRY_DSN` is set in environment. If not set, error reporting is only via Pino to Vercel logs.

---

## Summary Priority Table

| ID          | Priority | Description                               | Effort                                      |
| ----------- | -------- | ----------------------------------------- | ------------------------------------------- |
| CRON-01     | P0       | Cron jobs never run                       | Low — add vercel.json or external scheduler |
| RENDER-01   | P0       | Worker on free tier (cold starts, memory) | Medium — upgrade Render plan                |
| TYPE-02     | P1       | `as any`/`as never` casts                 | Medium — audit + replace                    |
| THUMB-01    | P1       | Thumbnail fire-and-forget (no retry)      | Low — queue like embed_photo                |
| LOG-01      | P1       | battles.ts uses console.error not logger  | Trivial                                     |
| TYPE-03     | P1       | Group pulse events + disputes not typed   | Medium                                      |
| ARCH-V2-01  | P2       | `trips` is a god-table                    | High — schema migration                     |
| TYPE-01     | P2       | Custom types for post-codegen tables      | Medium                                      |
| ARCH-V2-03  | P2       | Worker cooldown not cross-instance        | Low — require REDIS_URL                     |
| PROD-PRINT  | P2       | Print tier has no fulfillment             | High — business requirement                 |
| TYPE-BATTLE | P2       | battles.vote uses `as any`                | Low                                         |
| WRAP-UI     | P2       | Yearly wrap UI state unknown              | Medium — verify/test                        |
| DUP-01      | P3       | Duplicated BackgroundJobInsert type       | Trivial                                     |
| OG-TEST     | P3       | Dead directory                            | Trivial                                     |
| OBS-SENTRY  | P3       | Sentry stubs only                         | Low                                         |
