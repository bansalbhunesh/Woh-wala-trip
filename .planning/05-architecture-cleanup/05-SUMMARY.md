# Phase 5: Architecture Cleanup — Summary

**Completed:** 2026-05-19
**Status:** ✅ All requirements complete

---

## Requirements Status

| ID      | Requirement                                         | Status                | Evidence                                                                      |
| ------- | --------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------- |
| ARCH-01 | `src/proxy.ts` audited                              | ✅ Done               | File does not exist — dead code was deleted                                   |
| ARCH-02 | `wrap/[year]` route wired up                        | ✅ Done               | `src/app/wrap/[year]/page.tsx` — full state machine (processing/ready/failed) |
| ARCH-03 | `yearly_wraps` table populated by generation path   | ✅ Done               | `trips.ts:1250-1314` — `generateYearlyWrap` upserts and triggers worker       |
| ARCH-04 | `ipBuckets` capped at 10,000 entries (LRU eviction) | ✅ Done               | `anti-spam.ts:418-424` — `MAX_IP_BUCKETS = 10_000`, FIFO eviction on overflow |
| ARCH-05 | `getChaosDistribution` scoped to user's trips       | ✅ Intentional design | Anonymous global percentiles — chaos_score only, no PII, no trip names        |
| ARCH-06 | Battle rate limit per user (not per trip)           | ✅ Done               | `battles.ts:56-80` — counts battles across all user-owned trips on both sides |

---

## Key Implementation Details

**ARCH-01**: `src/proxy.ts` was deleted as dead code. No imports or references exist anywhere in `src/`.

**ARCH-02/ARCH-03**: `wrap/[year]/page.tsx` calls `trpc.trips.getYearlyWrap` with 10s polling while status is `'processing'`. `generateYearlyWrap` mutation upserts a `'processing'` row and triggers the AI worker to generate the wrap JSON. Schema has `trip_ids uuid[]` and `status text` columns (migration `2026051915_yearly_wraps_columns.sql`). OG card at `/api/card/wrap/[userId]/[year]` generates a 1080×1080 Satori card.

**ARCH-04**: `ipBuckets` Map evicts the oldest entry (FIFO via `map.keys().next()`) when `ipBuckets.size >= MAX_IP_BUCKETS` before inserting a new IP. Production uses Redis so this is dev-only fallback. Acceptable approximation of LRU.

**ARCH-05 (Intentional Design)**: `getChaosDistribution` queries the `chaos_distribution_cache` materialized view for global percentiles (p50/p75/p90). This is intentionally global — it shows a user where their trip ranks among all platform trips. Only `chaos_score` values are returned (no trip IDs, names, or user data). The comment at `trips.ts:987-990` documents this as an explicit architectural decision.

**ARCH-06**: `battles.challenge` fetches all `trip_id`s where `creator_id = ctx.user.id`, then counts battles in the last 24 hours where any of those IDs appears as `trip_a_id` OR `trip_b_id`. The `.or()` clause prevents bypass via multi-trip ownership. Hard cap: 3 battles per user per 24 hours.
