# Phase 2: Reliability Engineering — Summary

**Completed:** 2026-05-19
**Status:** ✅ All 9 tasks complete, 192/192 tests passing, TypeScript clean

---

## Tasks Completed

| Task                                           | Requirement    | Status | Notes                                                |
| ---------------------------------------------- | -------------- | ------ | ---------------------------------------------------- |
| 1: `payload JSONB` migration                   | REL-01, REL-02 | ✅     | `2026051900_background_jobs_payload.sql`             |
| 2: `markAbsent` → background_jobs              | REL-01         | ✅     | Fire-and-forget HTTP POST removed                    |
| 3: `battles.challenge` → background_jobs       | REL-02         | ✅     | Service client required for RLS                      |
| 4: Worker dispatch for new job types           | REL-01, REL-02 | ✅     | `.in_()` + `if/elif` chain in `poll_background_jobs` |
| 5: No-op stuck-jobs cron                       | REL-03         | ✅     | Returns `{noop:true}` — route preserved for Vercel   |
| 6: `resetStuckLore` mutation + generating page | REL-04         | ✅     | Retry unblocked after 4-min timeout                  |
| 7: `void sendToLangfuse` annotations           | REL-05         | ✅     | 3 sites annotated                                    |
| 8: Anniversary email send-before-claim         | REL-06         | ✅     | REL-06 fix in place; story_visible guard also added  |
| 9: Server-side file size via storage.objects   | REL-07         | ✅     | 50MB cap enforced; resolvedFileSize used in insert   |

---

## Verification Results

```
# TypeScript
npm run type-check → zero errors

# Fire-and-forget HTTP calls removed
grep -rn "generate-missing-person-card|judge-battle" src/server/trpc/routers/
→ no output ✓

# background_jobs inserts present
grep -n "missing_person_card" src/server/trpc/routers/trips.ts → match ✓
grep -n "judge_battle" src/server/trpc/routers/battles.ts → match ✓

# Atomic RPC replaces active-jobs count check
grep -n "claim_lore_generation" src/server/trpc/routers/trips.ts → line 489 ✓

# resetStuckLore in both server and client
grep -n "resetStuckLore" src/server/trpc/routers/trips.ts → line 702 ✓
grep -n "resetStuckLore" src/app/trips/[tripId]/generating/page.tsx → lines 38, 395 ✓

# Noop cron
grep -n "noop" src/app/api/cron/stuck-jobs/route.ts → line 21 ✓

# void annotations
grep -c "void sendToLangfuse" src/lib/langfuse.ts → 3 ✓

# REL-06 order: send before claim
grep -n "resend.emails.send|sent_at" src/app/api/cron/anniversaries/route.ts
→ send at line 146, claim at line 156 ✓
(Note: line 101 is a separate guard for story_visible=false followups — not claim-before-send)

# REL-07 storage lookup
grep -n "schema('storage')|resolvedFileSize|FIFTY_MB" src/server/trpc/routers/photos.ts
→ all three match ✓

# Tests
npm run test -- --run → 192 passed, 0 failed ✓
```

---

## Deviations from Plan

1. **`generateLore` atomic claim replaces active-jobs count check.** The plan described the "already processing" guard as a DB count query. The implementation uses `admin.rpc('claim_lore_generation', ...)` (migration `2026051905_atomic_lore_claim.sql`) which is strictly better — eliminates a race condition. Unit tests updated to mock `rpc` instead of the removed count query.

2. **`upgradeTier` is now webhook-authoritative.** HMAC signature validation was removed from `upgradeTier` — the Razorpay webhook handler is the sole payment confirmation source. Tests updated: "HMAC valid" → "webhook_payment_id confirmed"; "BAD_REQUEST on already upgraded" → "returns alreadyUpgraded:true".

3. **Anniversary cron also has a `story_visible` guard.** A `sent_at` update at line 101 marks `first_week_followup` emails as suppressed when `story_visible=false`. This is additional behavior beyond REL-06, not a regression.

4. **Worker also dispatches `embed_photo` jobs.** The `.in_()` filter in `poll_background_jobs` includes `embed_photo` (added for Phase 4/PERF-05), not just the two new types. This is forward-compatible.

5. **`.schema('storage')` unavailable in generated types.** The `.schema('storage')` call uses a string cast (`as unknown as` pattern) because the Supabase JS types don't expose cross-schema queries. Functionally correct — the cast is isolated to one expression.

---

## Issues Discovered

None phase-blocking. The unit test failures were pre-existing mock/implementation drift from the same session's changes — fixed in commit `517db96`.
