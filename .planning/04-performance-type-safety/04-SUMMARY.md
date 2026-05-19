# Phase 4: Performance and Type Safety — Summary

**Completed:** 2026-05-19
**Status:** ✅ All requirements complete

---

## Requirements Status

| ID      | Requirement                                                     | Status  | Evidence                                                                            |
| ------- | --------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------- |
| PERF-01 | `photos.list` batch upsert for signed URL cache                 | ✅ Done | `photos.ts:537-550` — single `adminSupabase.from('photos').upsert(urlsToUpsert)`    |
| PERF-02 | `photos.list` explicit column select excluding `clip_embedding` | ✅ Done | `photos.ts:466-469` — `PHOTO_COLUMNS` constant, no `clip_embedding`                 |
| PERF-03 | `getChaosDistribution` Redis-cached 10-min TTL                  | ✅ Done | `trips.ts:96-104` — Upstash Redis, `CHAOS_CACHE_TTL_S = 600`                        |
| PERF-04 | AI worker async photo download + 8MB cap                        | ✅ Done | `orchestrator.py:767-777` — `httpx.AsyncClient`, `_MAX_IMAGE_BYTES = 8MB`           |
| PERF-05 | Photo embedding batch queue (not per-photo HTTP)                | ✅ Done | `photos.ts:296-327` — `embed_photo` job inserted to `background_jobs`; worker polls |
| TYPE-01 | Supabase types regenerated                                      | ✅ Done | `src/lib/database.types.ts` — 1000+ lines, all modern columns present               |
| TYPE-02 | `as any` casts removed from tRPC routers                        | ✅ Done | 3 remaining fixed 2026-05-19: `lore_json as LoreJson` casts + `anyTrip → typedTrip` |
| TYPE-03 | `as never`/`as unknown as` escape hatches audited               | ✅ Done | 81 remaining are all intentional + paired with local type defs documenting the gap  |

---

## Key Implementation Details

**PERF-01**: `photos.list` collects all stale signed URLs into `urlsToUpsert[]`, then issues a single `.upsert()` at the end. Eliminated N parallel UPDATE calls that caused Supabase write pressure on active trips.

**PERF-02**: `PHOTO_COLUMNS = 'id, trip_id, user_id, storage_path, thumbnail_path, signed_url, thumb_signed_url, url_expires_at, embedding_status, created_at, file_size, is_private'` — explicitly excludes `clip_embedding`. Each row is ~2KB lighter.

**PERF-03**: Redis key `chaos_dist:global`, 600s TTL. Falls back to in-memory Map in development (no Upstash env vars). Cache also stores `null` sentinel for "not enough data" to prevent repeated full-table scans.

**PERF-04**: `_analyze_one_batch` uses `async with httpx.AsyncClient(timeout=15, follow_redirects=True)`. Images over 8MB are skipped with a warning log rather than causing OOM.

**PERF-05**: `confirmUpload` inserts `{ job_type: 'embed_photo', payload: { photo_id } }` to `background_jobs`. Worker's `poll_background_jobs` loop (60s interval) calls `embed_photo(photo_id)` via `ai-worker/src/embeddings.py`.

**TYPE-01/02/03**: Types regenerated from live DB (`project_id: lngtsccftumhbycywerg`). All 59 original `as any` casts removed. Remaining `as never`/`as unknown as` casts are paired with explicit local inline types (`TripPaymentUpdateClient`, `ProfileEqUpdateClient`, etc.) that document each missing column set. The `LoreJson` type from `@/lib/types.ts` now covers all `lore_json` property accesses.

---

## Changes Made 2026-05-19

- Imported `LoreJson` from `@/lib/types` into `trips.ts`
- Replaced `(meta.lore_json as any)?.tagline` → `(meta.lore_json as LoreJson | null)?.tagline`
- Replaced `anyTrip = trip as any` → `typedTrip = trip as unknown as TripWithRelations` (typed local shape)
- Replaced `(t.lore_json as any)?.tagline` → `(t.lore_json as LoreJson | null)?.tagline`
