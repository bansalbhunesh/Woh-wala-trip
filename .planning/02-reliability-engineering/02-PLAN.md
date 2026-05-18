---
phase: 02-reliability-engineering
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/20260519_background_jobs_payload.sql
  - src/server/trpc/routers/trips.ts
  - src/server/trpc/routers/battles.ts
  - ai-worker/src/main.py
  - src/app/api/cron/stuck-jobs/route.ts
  - src/app/trips/[tripId]/generating/page.tsx
  - src/lib/langfuse.ts
  - src/app/api/cron/anniversaries/route.ts
  - src/server/trpc/routers/photos.ts
autonomous: true
requirements: [REL-01, REL-02, REL-03, REL-04, REL-05, REL-06, REL-07]

must_haves:
  truths:
    - "When the AI worker is unreachable, markAbsent still records a background_jobs row and the absent member's card is generated on next poll"
    - 'When the AI worker is unreachable, battles.challenge still records a background_jobs row and the verdict is delivered on next poll'
    - 'A trip stuck in lore_status=processing is reset to failed by exactly one mechanism (the AI worker reset_stuck_pipelines loop)'
    - 'After the 4-minute generating-page timeout, pressing Go back & retry starts a new generation instead of hitting the already-processing guard'
    - 'Langfuse outage adds zero latency to OTP send or lore generation — sendToLangfuse calls carry a void prefix and never block callers'
    - 'Anniversary emails that fail Resend delivery remain unsent in sent_at — next cron run will retry them'
    - 'confirmUpload uses the authoritative server-side file size from storage.objects; files over 50MB are rejected with cleanup'
  artifacts:
    - path: 'supabase/migrations/20260519_background_jobs_payload.sql'
      provides: 'payload JSONB column on background_jobs table'
      contains: 'ADD COLUMN IF NOT EXISTS payload JSONB'
    - path: 'src/server/trpc/routers/trips.ts'
      provides: 'markAbsent uses background_jobs insert; resetStuckLore mutation'
      contains: 'background_jobs'
    - path: 'src/server/trpc/routers/battles.ts'
      provides: 'challenge uses background_jobs insert via service client'
      contains: 'createSupabaseServiceClient'
    - path: 'ai-worker/src/main.py'
      provides: 'poll_background_jobs dispatches missing_person_card and judge_battle'
      contains: 'missing_person_card'
    - path: 'src/app/api/cron/stuck-jobs/route.ts'
      provides: 'no-op cron that returns {noop:true} without touching the DB'
      contains: 'noop'
    - path: 'src/app/trips/[tripId]/generating/page.tsx'
      provides: 'timeout button calls resetStuckLore before routing back'
      contains: 'resetStuckLore'
    - path: 'src/lib/langfuse.ts'
      provides: 'void prefix on all three sendToLangfuse call sites'
      contains: 'void sendToLangfuse'
    - path: 'src/app/api/cron/anniversaries/route.ts'
      provides: 'send email before marking sent_at'
      contains: 'resend.emails.send'
    - path: 'src/server/trpc/routers/photos.ts'
      provides: 'server-side size validation via storage.objects'
      contains: "schema('storage')"
  key_links:
    - from: 'src/server/trpc/routers/trips.ts (markAbsent)'
      to: 'background_jobs table'
      via: 'createSupabaseServiceClient() insert with payload.absent_user_id'
      pattern: 'background_jobs.*missing_person_card'
    - from: 'src/server/trpc/routers/battles.ts (challenge)'
      to: 'background_jobs table'
      via: 'createSupabaseServiceClient() insert with payload.battle_id'
      pattern: 'background_jobs.*judge_battle'
    - from: 'ai-worker/src/main.py (poll_background_jobs)'
      to: 'LoreOrchestrator().generate_missing_person / judge_battle'
      via: 'job_type dispatch in elif chain'
      pattern: 'elif job_type == .missing_person_card.'
    - from: 'src/app/trips/[tripId]/generating/page.tsx (timeout button)'
      to: 'trips.resetStuckLore tRPC mutation'
      via: 'resetStuckLore.mutateAsync({ tripId }) before router.push'
      pattern: 'resetStuckLore.mutateAsync'
---

<objective>
Phase 2: Reliability Engineering — 7 surgical changes that eliminate silent job drops, broken retry UX,
observability blocking, email loss, and client-trust of file sizes.

Purpose: Guarantee that no AI work unit (missing-person card, battle judging) can vanish when the worker
is cold-starting. Consolidate stuck-pipeline recovery to a single mechanism. Unblock the generating-page
retry path. Ensure Langfuse never adds latency to user-facing flows. Ensure anniversary emails only mark
sent after confirmed delivery. Validate server-side file sizes.

Output:

- supabase/migrations/20260519_background_jobs_payload.sql (schema prerequisite for Plans 1+2)
- Modified: trips.ts, battles.ts, ai-worker/src/main.py, stuck-jobs/route.ts, generating/page.tsx,
  langfuse.ts, anniversaries/route.ts, photos.ts
  </objective>

<execution_context>
@C:/Users/bhune/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/bhune/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@C:/Users/bhune/Woh-wala-trip/.planning/PROJECT.md
@C:/Users/bhune/Woh-wala-trip/.planning/ROADMAP.md
@C:/Users/bhune/Woh-wala-trip/.planning/REQUIREMENTS.md
@C:/Users/bhune/Woh-wala-trip/.planning/02-reliability-engineering/02-RESEARCH.md
@C:/Users/bhune/Woh-wala-trip/.planning/codebase/ARCHITECTURE.md
</context>

<tasks>

<!-- ============================================================ -->
<!-- PLAN 1 — Schema prerequisite (REL-01, REL-02 dependency)     -->
<!-- ============================================================ -->

### Task 1: Add `payload JSONB` column to `background_jobs` (migration)

**Type:** migration
**File(s):** `supabase/migrations/20260519_background_jobs_payload.sql`

**Description:**

The existing `background_jobs` table (created in `supabase/migrations/20260518_hermes_lorian_observability.sql`)
has columns: `id, trip_id, job_type, status, trace_id, error, claimed_at, completed_at, created_at`.
It has no column to carry job-specific data. Tasks 2 and 4 need to store `absent_user_id` and `battle_id`
in the row so the worker can dispatch correctly.

Create the file with this exact content — the `IF NOT EXISTS` guard makes the migration idempotent:

```sql
-- Phase 2: Reliability Engineering
-- Add payload JSONB to background_jobs so new job types can carry
-- job-specific data (absent_user_id for missing_person_card, battle_id for judge_battle).
-- This is a non-breaking additive migration; existing image_generation rows are unaffected.

ALTER TABLE public.background_jobs
  ADD COLUMN IF NOT EXISTS payload JSONB;
```

Apply via the Supabase CLI:

```
supabase db push
```

or directly in the Supabase SQL editor.

**Acceptance:**

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'background_jobs'
  AND column_name = 'payload';
-- Must return exactly one row: column_name='payload', data_type='jsonb'
```

**Dependencies:** None. This is the prerequisite for Tasks 2, 3, and 4.

---

<!-- ============================================================ -->
<!-- PLAN 2 — REL-01: markAbsent → background_jobs               -->
<!--          REL-02: battles.challenge → background_jobs         -->
<!-- ============================================================ -->

### Task 2: Replace `markAbsent` fire-and-forget with `background_jobs` insert (REL-01)

**Type:** code
**File(s):** `src/server/trpc/routers/trips.ts`

**Description:**

`createSupabaseServiceClient` is already imported at line 4 of `trips.ts`. The `markAbsent` procedure
lives at lines 421–486. The block to replace is lines 465–483 (the entire fire-and-forget fetch chain).

**Remove these lines (465–483):**

```typescript
// Fire-and-forget — don't block on worker, but log failures
const markAbsentBody = JSON.stringify({
  trip_id: input.tripId,
  absent_user_id: input.userId,
});
signWorkerRequest('POST', '/generate-missing-person-card', markAbsentBody)
  .then(({ signature, timestamp }) => {
    fetch(`${process.env.AI_WORKER_URL ?? ''}/generate-missing-person-card`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.AI_WORKER_SECRET!}`,
        'X-Timestamp': timestamp,
        'X-Signature': signature,
      },
      body: markAbsentBody,
    }).catch(e => console.error('[markAbsent] worker call failed:', e.message));
  })
  .catch(e => console.error('[markAbsent] HMAC signing failed:', e.message));
```

**Replace with (insert before `return { success: true };` at line 485):**

```typescript
// REL-01: durable queue — survives worker cold-starts on Render free tier.
// background_jobs.trip_id is NOT NULL so we use input.tripId.
// payload carries absent_user_id so the worker's generate_missing_person() call has it.
// Using service client because background_jobs has service-role-only RLS (Phase 1).
const admin = createSupabaseServiceClient();
const { error: jobError } = await admin.from('background_jobs').insert({
  trip_id: input.tripId,
  job_type: 'missing_person_card',
  status: 'pending',
  payload: { absent_user_id: input.userId },
} as never);

if (jobError) {
  // Non-fatal: the member is already marked absent. Log so Langfuse/Render logs surface it.
  console.error('[markAbsent] failed to enqueue background job:', jobError.message);
}
```

Also verify: the `signWorkerRequest` import (line ~7) is used only by `markAbsent` and `generateLore`.
If `generateLore` still uses it, keep the import. If `markAbsent` was the only other caller, verify
that no other procedures call `signWorkerRequest` before removing the import.

**Acceptance:**

1. Run `npm run type-check` — zero new errors in `trips.ts`.
2. Grep confirms no `generate-missing-person-card` HTTP call remains in `trips.ts`:
   ```
   grep -n "generate-missing-person-card" src/server/trpc/routers/trips.ts
   ```
   Must return no matches.
3. Grep confirms the background_jobs insert is present:
   ```
   grep -n "missing_person_card" src/server/trpc/routers/trips.ts
   ```
   Must return a match.

**Dependencies:** Task 1 (payload column must exist before insert).

---

### Task 3: Replace `battles.challenge` fire-and-forget with `background_jobs` insert (REL-02)

**Type:** code
**File(s):** `src/server/trpc/battles.ts`

**Description:**

`battles.ts` currently imports only `{ signWorkerRequest }` from `'@/lib/worker-auth'` (line 4).
It does NOT import `createSupabaseServiceClient`. This import must be added because
`background_jobs` has a service-role-only RLS policy (Phase 1, `20260518_security_rls_hardening.sql`)
— inserting via `ctx.supabase` (user session) would silently return 0 rows without error.

**Step A — Add import at the top of the file (after the existing imports, before the interface declarations):**

```typescript
import { createSupabaseServiceClient } from '@/lib/supabase/server';
```

**Step B — Remove lines 109–124 (the entire fire-and-forget fetch chain):**

```typescript
const battleBody = JSON.stringify({ battle_id: (battle as BattleRow).id });
signWorkerRequest('POST', '/judge-battle', battleBody)
  .then(({ signature, timestamp }) => {
    fetch(`${process.env.AI_WORKER_URL ?? ''}/judge-battle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.AI_WORKER_SECRET!}`,
        'X-Timestamp': timestamp,
        'X-Signature': signature,
      },
      body: battleBody,
      signal: AbortSignal.timeout(8000),
    }).catch(e => console.error('[challenge] worker failed:', (e as Error).message));
  })
  .catch(e => console.error('[challenge] HMAC signing failed:', e.message));
```

**Step C — Insert after the battle insert and before `return battle;` (currently line 126):**

```typescript
// REL-02: durable queue — survives worker cold-starts.
// trip_id (NOT NULL) uses input.myTripId (the challenger's trip).
// payload carries battle_id so the worker's judge_battle() call has it.
// Must use service client — background_jobs has service-role-only RLS.
const battleAdmin = createSupabaseServiceClient();
const { error: battleJobError } = await battleAdmin.from('background_jobs').insert({
  trip_id: input.myTripId,
  job_type: 'judge_battle',
  status: 'pending',
  payload: { battle_id: (battle as BattleRow).id },
} as never);

if (battleJobError) {
  console.error('[challenge] failed to enqueue judge_battle job:', battleJobError.message);
}
```

**Step D — Verify that `signWorkerRequest` is no longer used anywhere in `battles.ts`** after removing
the fire-and-forget block. If the only import was for `signWorkerRequest`, remove the import from line 4.

**Acceptance:**

1. `npm run type-check` — zero new errors in `battles.ts`.
2. Grep confirms no `judge-battle` HTTP call remains:
   ```
   grep -n "judge-battle" src/server/trpc/routers/battles.ts
   ```
   Must return no matches.
3. Grep confirms service client and background_jobs insert are present:
   ```
   grep -n "createSupabaseServiceClient\|judge_battle" src/server/trpc/routers/battles.ts
   ```
   Must return matches for both.

**Dependencies:** Task 1 (payload column), Task 2 is independent — Tasks 2 and 3 can be done in parallel.

---

### Task 4: Extend `poll_background_jobs` to dispatch `missing_person_card` and `judge_battle` (REL-01, REL-02)

**Type:** code
**File(s):** `ai-worker/src/main.py`

**Description:**

The `poll_background_jobs()` function at lines 77–129 of `main.py` currently claims only
`job_type = 'image_generation'` jobs via `.eq("job_type", "image_generation")` at line 89.

Replace the entire `poll_background_jobs()` function (lines 77–129) with the version below.
Key changes:

- `.eq("job_type", "image_generation")` → `.in_("job_type", ["image_generation", "missing_person_card", "judge_battle"])` to claim any supported job type
- Add `job_type` and `payload` to the select list
- Replace the single `generate_all_images` call with an `if/elif/else` dispatch chain
- Unknown `job_type` values are marked `failed` with a descriptive error rather than silently dropped

```python
async def poll_background_jobs():
    """Poll background_jobs every 60s for pending jobs.
    REL-01/REL-02: extended to handle missing_person_card and judge_battle in addition to image_generation.
    Survives worker cold-starts — jobs inserted while worker was down are claimed on next poll tick."""
    from .clients import supabase
    await asyncio.sleep(15)  # offset from main queue poll
    while True:
        try:
            # Claim one pending job of any supported type (FIFO by created_at)
            result = await asyncio.to_thread(
                lambda: supabase.table("background_jobs")
                    .select("id, trip_id, job_type, payload, trace_id")
                    .eq("status", "pending")
                    .in_("job_type", ["image_generation", "missing_person_card", "judge_battle"])
                    .order("created_at")
                    .limit(1)
                    .execute()
            )
            rows = result.data or []
            if rows:
                job = rows[0]
                jid = job["id"]
                trip_id = job["trip_id"]
                job_type = job["job_type"]
                payload = job.get("payload") or {}

                # Atomic claim — only proceeds if still pending (guard against duplicate workers)
                await asyncio.to_thread(
                    lambda: supabase.table("background_jobs").update({
                        "status":     "claimed",
                        "claimed_at": datetime.now(timezone.utc).isoformat(),
                    }).eq("id", jid).eq("status", "pending").execute()
                )
                log.info(f"[bg-jobs] claimed {job_type} job {jid} for trip {trip_id}")

                try:
                    if job_type == "image_generation":
                        from .image_gen import generate_all_images
                        await generate_all_images(trip_id)

                    elif job_type == "missing_person_card":
                        # REL-01: payload.absent_user_id inserted by trips.markAbsent
                        absent_user_id = payload.get("absent_user_id")
                        if not absent_user_id:
                            raise ValueError(
                                "missing_person_card job missing absent_user_id in payload"
                            )
                        await LoreOrchestrator().generate_missing_person(trip_id, absent_user_id)

                    elif job_type == "judge_battle":
                        # REL-02: payload.battle_id inserted by battles.challenge
                        battle_id = payload.get("battle_id")
                        if not battle_id:
                            raise ValueError(
                                "judge_battle job missing battle_id in payload"
                            )
                        await LoreOrchestrator().judge_battle(battle_id)

                    else:
                        # Unknown job type — mark failed so it doesn't block the queue
                        raise ValueError(f"Unknown job_type: {job_type!r}")

                    await asyncio.to_thread(
                        lambda: supabase.table("background_jobs").update({
                            "status":       "done",
                            "completed_at": datetime.now(timezone.utc).isoformat(),
                        }).eq("id", jid).execute()
                    )
                    log.info(f"[bg-jobs] {job_type} done for trip {trip_id}")

                except Exception as e:
                    log.error(f"[bg-jobs] {job_type} failed for {trip_id}: {e}")
                    await asyncio.to_thread(
                        lambda: supabase.table("background_jobs").update({
                            "status":       "failed",
                            "error":        str(e)[:500],
                            "completed_at": datetime.now(timezone.utc).isoformat(),
                        }).eq("id", jid).execute()
                    )

        except asyncio.CancelledError:
            break
        except Exception as e:
            log.exception(f"[bg-jobs] poll error: {e}")
        await asyncio.sleep(60)
```

**Acceptance:**

1. Start the worker locally (`cd ai-worker && uvicorn src.main:app --reload`) — no import errors.
2. Insert a test `missing_person_card` row manually in Supabase:
   ```sql
   INSERT INTO background_jobs (trip_id, job_type, status, payload)
   VALUES ('<any-valid-trip-id>', 'missing_person_card', 'pending', '{"absent_user_id": "00000000-0000-0000-0000-000000000001"}');
   ```
   Within 75 seconds (next poll tick) the row status transitions to `claimed` then `done` or `failed`.
   It must NOT remain `pending` indefinitely — that would indicate the `.in_()` filter is not working.
3. Grep confirms the new dispatch branches exist:
   ```
   grep -n "missing_person_card\|judge_battle" ai-worker/src/main.py
   ```
   Must return matches in both the `.in_()` filter and the `elif` dispatch chain.

**Dependencies:** Tasks 2 and 3 (background_jobs rows must be insertable before worker can pick them up).

---

<!-- ============================================================ -->
<!-- PLAN 3 — REL-03: no-op stuck-jobs cron                       -->
<!--          REL-04: resetStuckLore tRPC + generating page fix   -->
<!-- ============================================================ -->

### Task 5: No-op the `stuck-jobs` Vercel cron (REL-03)

**Type:** code
**File(s):** `src/app/api/cron/stuck-jobs/route.ts`

**Description:**

The route currently (lines 14–41) queries `trips` and resets stuck rows with a 10-minute cutoff.
The AI worker's `reset_stuck_pipelines()` (orchestrator.py lines 324–349) uses a 30-minute cutoff
and runs every ~30 minutes. Having both creates a confusing split — the cron's tighter 10-minute
cutoff can reset a trip that the worker is legitimately still processing (Phase 1 spin-up + pipeline
can exceed 10 minutes for large photo sets).

Do NOT delete the cron entry from `vercel.json` — Vercel validates declared cron paths on deploy.
Instead, replace the entire function body with an early return:

**Replace the full content of `src/app/api/cron/stuck-jobs/route.ts` with:**

```typescript
import { NextRequest, NextResponse } from 'next/server';

// REL-03: Stuck-pipeline recovery consolidated into the AI worker.
// ai-worker/src/lore/orchestrator.py:reset_stuck_pipelines() runs every ~30 minutes
// and uses a 30-minute cutoff (vs this cron's old 10-minute cutoff which could reset
// actively-running pipelines on large trips).
//
// This route is kept alive to satisfy the vercel.json cron declaration — removing a
// declared cron path causes a Vercel deployment error. The cron schedule (0 7 * * * —
// once daily at 7am UTC) means it fires at most once per day and returns immediately.
//
// Fallback note: if the Render worker crashes, reset_stuck_pipelines() won't run until
// the worker restarts (triggered by the next /generate-lore or poll event). On Render
// free tier, the dyno restarts within ~15 minutes of the next request. Trips stuck for
// longer than 30 min post-restart are recovered automatically. Acceptable pre-launch.
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ noop: true, reason: 'consolidated_to_worker' });
}
```

**Acceptance:**

```bash
# Simulate the cron call locally (dev mode skips auth)
NODE_ENV=development curl -s http://localhost:3000/api/cron/stuck-jobs | jq .
# Expected: {"noop":true,"reason":"consolidated_to_worker"}
```

TypeScript check: `npm run type-check` — no errors in `stuck-jobs/route.ts`.

**Dependencies:** None. Independent of all other tasks.

---

### Task 6: Add `trips.resetStuckLore` tRPC mutation + fix generating-page retry (REL-04)

**Type:** code
**File(s):**

- `src/server/trpc/routers/trips.ts`
- `src/app/trips/[tripId]/generating/page.tsx`

**Description:**

**Part A — New tRPC mutation in `trips.ts`:**

The bug: when the 4-minute timeout fires on `generating/page.tsx`, the "Go back & retry" button
calls `router.push(/trips/${tripId})` but `lore_status` is still `'processing'`. The `generateLore`
guard at trips.ts line ~348 uses `.neq('lore_status', 'processing')` and throws "Lore generation is
already running." The user can't retry until the worker's `reset_stuck_pipelines()` fires (~30 min)
or the once-daily cron (up to 23 hours).

Add the new `resetStuckLore` procedure to the `tripsRouter` object in `trips.ts`. Insert it after the
`markAbsent` procedure (after line 486, before `upgradeTier`). `createSupabaseServiceClient` is already
imported at line 4.

```typescript
  resetStuckLore: protectedProcedure
    .input(z.object({ tripId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // REL-04: reset lore_status from 'processing' → 'failed' so generateLore's
      // .neq('lore_status', 'processing') guard passes on the next attempt.
      // Only the trip creator can call this to prevent members from disrupting an
      // in-flight pipeline.
      const { data: tripRaw } = await ctx.supabase
        .from('trips')
        .select('creator_id, lore_status')
        .eq('id', input.tripId)
        .single();
      const trip = tripRaw as { creator_id: string; lore_status: string } | null;

      if (!trip || trip.creator_id !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      // Guard: only reset if the trip is actually stuck in processing.
      // Returns {reset:false} for any other lore_status so the client can handle gracefully.
      if (trip.lore_status !== 'processing') {
        return { reset: false, reason: 'not_processing' as const };
      }

      const admin = createSupabaseServiceClient();
      await admin
        .from('trips')
        .update({ lore_status: 'failed', processing_started_at: null } as never)
        .eq('id', input.tripId)
        .eq('lore_status' as never, 'processing'); // atomic guard against race with worker completing

      return { reset: true };
    }),
```

**Part B — Update `generating/page.tsx`:**

The timeout button is at lines 364–375. Two changes are needed:

1. Add the mutation hook near the top of the component (after the existing `trpc.trips.getFull.useQuery`
   call at line 28):

```typescript
const resetStuckLore = trpc.trips.resetStuckLore.useMutation();
```

2. Replace the button's `onClick` handler (currently `() => router.push('/trips/${tripId}')`) with an
   async handler that calls `resetStuckLore` first:

```typescript
              onClick={async () => {
                try {
                  await resetStuckLore.mutateAsync({ tripId });
                } catch {
                  // Best-effort — even if reset fails (e.g. not creator, or race),
                  // still route back so user sees the failed state and can try again
                }
                router.push(`/trips/${tripId}`);
              }}
```

**Why this unblocks retry:** After `resetStuckLore` sets `lore_status = 'failed'`, Supabase Realtime
pushes the UPDATE event. The generating page's listener at line 53 catches `newStatus === 'failed'`
and calls `refetch()`. The `useEffect` at line 79 routes to `/trips/${tripId}` on `'failed'`. The
explicit `router.push` in the button handler is belt-and-suspenders. On the trip detail page,
`lore_status = 'failed'` surfaces the "Generate Lore" button, and the `generateLore` guard
(`neq('lore_status', 'processing')`) now passes.

**Acceptance:**

1. `npm run type-check` — no errors in `trips.ts` or `generating/page.tsx`.
2. Grep for the new procedure:
   ```
   grep -n "resetStuckLore" src/server/trpc/routers/trips.ts
   ```
   Must return matches (procedure definition and the `creator_id` ownership check).
3. Grep for the client call:
   ```
   grep -n "resetStuckLore" src/app/trips/[tripId]/generating/page.tsx
   ```
   Must return matches (hook declaration + mutateAsync call).

**Dependencies:** None. Independent of Tasks 1–5.

---

<!-- ============================================================ -->
<!-- PLAN 4 — REL-05, REL-06, REL-07: small reliability fixes     -->
<!-- ============================================================ -->

### Task 7: Add `void` prefix to Langfuse call sites (REL-05)

**Type:** code
**File(s):** `src/lib/langfuse.ts`

**Description:**

`sendToLangfuse` is already fire-and-forget (the three call sites at lines 76, 95, and 119 do not
`await` the result), so Langfuse outages already add zero latency to callers. However, TypeScript
will produce "floating promise" lint warnings for un-awaited async function calls. Adding `void`
is the idiomatic TypeScript annotation that signals the floating promise is intentional, suppresses
the warning, and makes the "never block on Langfuse" intent explicit and searchable.

Edit lines 76, 95, and 119 of `src/lib/langfuse.ts` to prepend `void`:

Line 76 — in `span()`, the `span-create` send:

```typescript
      void sendToLangfuse({        // was: sendToLangfuse({
```

Line 95 — in `span.end()`, the `span-update` send:

```typescript
          void sendToLangfuse({   // was: sendToLangfuse({
```

Line 119 — in `event()`, the `event-create` send:

```typescript
      void sendToLangfuse({       // was: sendToLangfuse({
```

No other changes to this file.

**Acceptance:**

```bash
npm run type-check
# No floating-promise warnings from langfuse.ts
```

Grep confirms all three sites are annotated:

```
grep -n "void sendToLangfuse" src/lib/langfuse.ts
```

Must return exactly 3 matches (lines ~76, ~95, ~119).

**Dependencies:** None. Fully independent.

---

### Task 8: Swap send/claim order in anniversary cron (REL-06)

**Type:** code
**File(s):** `src/app/api/cron/anniversaries/route.ts`

**Description:**

The current loop at lines 100–177 claims the row (sets `sent_at`) BEFORE calling
`resend.emails.send`. If Resend throws, the row is permanently marked sent but the
email was never delivered — silent loss.

**The fix:** move the `sent_at` UPDATE to AFTER a successful `resend.emails.send` call.

Replace the `try` block starting at line 100 (from `try {` through `} catch (err) { ... }`) with:

```typescript
try {
  if (process.env.RESEND_API_KEY) {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';

    // REL-06: send FIRST, then mark sent — so a Resend failure leaves sent_at=null
    // and the next cron run will retry. Accepted tradeoff: if the process crashes
    // between successful send and the UPDATE below, the email may be sent twice on
    // the next run (within the 25-hour window). Duplicate send is preferred over
    // silent email loss.
    await resend.emails.send({
      from: `Yaarlore <${from}>`,
      to: profile.email,
      subject: `One year ago, ${name} was ${lore.cooked_verdict?.toLowerCase() ?? 'historically cooked'} 🔥`,
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a08;font-family:monospace;">
  <div style="max-width:480px;margin:0 auto;padding:48px 32px;">
    <p style="font-size:10px;letter-spacing:0.6em;text-transform:uppercase;color:rgba(255,77,77,0.5);margin:0 0 32px;">
      ● ONE YEAR ANNIVERSARY
    </p>

    <div style="background:#0e0e0c;border:1px solid rgba(255,77,77,0.15);border-radius:16px;padding:40px;text-align:center;margin-bottom:32px;">
      <p style="font-size:11px;letter-spacing:0.4em;text-transform:uppercase;color:rgba(245,240,232,0.3);margin:0 0 12px;">
        ${tripYear} — ${trip.name}
      </p>
      <h1 style="font-size:28px;font-weight:900;color:#F5F0E8;margin:0 0 8px;line-height:1.2;">
        ${lore.trip_title ?? trip.name}
      </h1>
      <p style="font-size:14px;font-style:italic;color:rgba(245,240,232,0.5);margin:0 0 24px;">
        &ldquo;${lore.tagline ?? ''}&rdquo;
      </p>
      <div style="font-size:64px;font-weight:900;color:#FF4D4D;line-height:1;margin:0 0 8px;">
        ${cookedLevel}
      </div>
      <p style="font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:rgba(255,77,77,0.7);margin:0;">
        ${lore.cooked_verdict ?? 'Historically Cooked'}
      </p>
    </div>

    <p style="font-size:14px;color:rgba(245,240,232,0.55);line-height:1.6;margin:0 0 8px;">
      ${name}, one year ago you and your crew created friendship mythology.
    </p>
    <p style="font-size:13px;color:rgba(245,240,232,0.35);line-height:1.6;margin:0 0 32px;font-style:italic;">
      &ldquo;${lore.closing_line ?? lore.cooked_verdict ?? ''}&rdquo;
    </p>

    <a href="${storyUrl}" style="display:block;background:rgba(255,77,77,0.12);border:1px solid rgba(255,77,77,0.4);color:rgba(255,77,77,0.9);text-align:center;padding:16px;border-radius:12px;font-size:11px;font-weight:bold;letter-spacing:0.35em;text-transform:uppercase;text-decoration:none;margin-bottom:32px;">
      RELIVE THE STORY →
    </a>

    <div style="border-top:1px solid rgba(245,240,232,0.05);padding-top:24px;">
      <p style="font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:rgba(245,240,232,0.15);margin:0;">
        YAARLORE · AI FRIENDSHIP ARCHIVE · ${tripYear + 1}
      </p>
    </div>
  </div>
</body>
</html>`,
    });

    // Only mark sent AFTER confirmed delivery from Resend
    const { error: claimError } = await supabase
      .from('scheduled_emails' as never)
      .update({ sent_at: new Date().toISOString() } as never)
      .eq('id' as never, (row as any).id)
      .is('sent_at' as never, null);

    if (claimError) {
      console.log(
        `[anniversary] row ${(row as any).id} claim failed after send (duplicate possible):`,
        claimError.message
      );
    }
  } else {
    console.log(`[anniversary] Would send to ${profile.email} for trip: ${trip.name}`);
  }

  sent++;
} catch (err) {
  console.error(`[anniversary] failed for ${profile.email}:`, err);
  // sent_at is NOT set — next cron run will retry within the 25-hour window
}
```

**Acceptance:**

1. `npm run type-check` — no errors in `anniversaries/route.ts`.
2. Grep confirms `resend.emails.send` call appears BEFORE the `sent_at` UPDATE:
   ```
   grep -n "resend.emails.send\|sent_at" src/app/api/cron/anniversaries/route.ts
   ```
   The `resend.emails.send` line number must be lower (earlier in file) than the `sent_at` update line number.
3. Grep confirms the old claim-before-send block is gone:
   ```
   grep -n "Claim row before sending" src/app/api/cron/anniversaries/route.ts
   ```
   Must return no matches.

**Dependencies:** None. Fully independent.

---

### Task 9: Server-side file size validation in `confirmUpload` (REL-07)

**Type:** code
**File(s):** `src/server/trpc/routers/photos.ts`

**Description:**

`confirmUpload` currently accepts `fileSize` from the client as `z.number().optional()` and stores it
verbatim at line 177 (`file_size: input.fileSize ?? null`). There is no server-side check that the
value matches the actual file in Supabase Storage.

`createSupabaseServiceClient` is already imported at line 4 of `photos.ts`. The insert at line 171
uses `ctx.supabase` (user session) for the photo insert — that is correct and should not change.

**Add the server-side size check between the idempotency check (line 169) and the insert (line 171).**

Insert this block after `if (existing) return { photoId: existing.id };` and before the
`const { data: insertedRaw, error } = await ctx.supabase.from('photos').insert(...)` call:

```typescript
// REL-07: query storage.objects for the authoritative file size.
// Client-supplied fileSize is not trusted — a malicious client could report 0
// to bypass the storage_used_bytes trigger and free-tier cap enforcement.
// Using .schema('storage') requires the service role client (user session cannot
// access the storage schema).
const storageAdmin = createSupabaseServiceClient();
const { data: storageObj } = await storageAdmin
  .schema('storage')
  .from('objects')
  .select('metadata')
  .eq('bucket_id', 'trip-photos')
  .eq('name', input.storagePath)
  .single();

const actualSize: number | null = (storageObj?.metadata as { size?: number } | null)?.size ?? null;

// Per-photo 50MB cap — reject and clean up the orphaned storage object.
// The trip-level 500MB cap is enforced upstream in getUploadUrl via storage_used_bytes;
// this is a belt-and-suspenders guard against clients that forge the size or bypass
// getUploadUrl entirely.
const FIFTY_MB = 50 * 1024 * 1024;
if (actualSize !== null && actualSize > FIFTY_MB) {
  // Remove the uploaded file before throwing so it doesn't orphan in storage
  await storageAdmin.storage.from('trip-photos').remove([input.storagePath]);
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'File exceeds the 50 MB per-photo limit.',
  });
}

// Use the authoritative server-side size; fall back to client-supplied value only
// if the storage.objects lookup returned nothing (race condition on eventual consistency).
const resolvedFileSize = actualSize ?? input.fileSize ?? null;
```

Then update the insert at line 177 to use `resolvedFileSize` instead of `input.fileSize ?? null`:

```typescript
          file_size: resolvedFileSize,   // was: input.fileSize ?? null
```

**Important note on `.schema('storage')` availability:** This is the Supabase JS v2 pattern for
cross-schema queries. Check `package.json` for `@supabase/supabase-js` version. If the version is
< 2.0 (unlikely given the project uses SSR package), use `storageAdmin.from('storage.objects' as any)`
as a fallback. The RESEARCH.md flags this as [ASSUMED] — verify it compiles without error after the
change.

**Acceptance:**

1. `npm run type-check` — no errors in `photos.ts`.
2. Grep confirms the storage.objects lookup is present before the insert:
   ```
   grep -n "schema('storage')\|resolvedFileSize\|FIFTY_MB" src/server/trpc/routers/photos.ts
   ```
   Must return matches for all three.
3. Grep confirms the insert uses `resolvedFileSize` and not `input.fileSize`:
   ```
   grep -n "file_size:" src/server/trpc/routers/photos.ts
   ```
   Must show `resolvedFileSize`, not `input.fileSize`.

**Dependencies:** None. Fully independent of Tasks 1–8.

</tasks>

<threat_model>

## Trust Boundaries

| Boundary                          | Description                                                          |
| --------------------------------- | -------------------------------------------------------------------- |
| client → tRPC (battles.challenge) | battle_id in payload is server-generated, not client-supplied — safe |
| client → tRPC (confirmUpload)     | fileSize is now overridden by server-side storage.objects lookup     |
| client → tRPC (resetStuckLore)    | tripId is user-supplied; ownership check prevents cross-user abuse   |
| Vercel cron → stuck-jobs route    | auth header check preserved even in no-op version                    |

## STRIDE Threat Register

| Threat ID | Category               | Component                             | Disposition | Mitigation Plan                                                                                                          |
| --------- | ---------------------- | ------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| T-02-01   | Tampering              | `confirmUpload` file_size             | mitigate    | REL-07: override client-supplied size with `storage.objects.metadata.size`; reject >50MB and delete orphan               |
| T-02-02   | Elevation of Privilege | `resetStuckLore` mutation             | mitigate    | Ownership check: `trip.creator_id !== ctx.user.id` → FORBIDDEN; only creator can reset their own trip                    |
| T-02-03   | Tampering              | `background_jobs` insert (battles.ts) | mitigate    | Uses `createSupabaseServiceClient()` not `ctx.supabase` — RLS service-role policy enforced from Phase 1                  |
| T-02-04   | Denial of Service      | `resetStuckLore` — member spam        | accept      | Only creator can call; member role cannot reach this mutation; rate limiting on tRPC is separate concern (Phase 3 scope) |
| T-02-05   | Information Disclosure | `stuck-jobs` cron no-op response      | accept      | Returns `{noop:true}` — no trip data, no internal state exposed; cron auth header still validated                        |
| T-02-SC   | Tampering              | npm/pip/cargo installs                | accept      | No new packages installed in this phase — Package Legitimacy Gate not triggered                                          |

</threat_model>

<verification>
After all 9 tasks are complete, run the following checks:

```bash
# TypeScript — zero errors across all modified files
npm run type-check

# Check no fire-and-forget HTTP worker calls remain in the two routers
grep -rn "generate-missing-person-card\|judge-battle" src/server/trpc/routers/
# Expected: no output

# Confirm background_jobs inserts in both routers
grep -n "missing_person_card" src/server/trpc/routers/trips.ts
grep -n "judge_battle" src/server/trpc/routers/battles.ts
# Both must return matches

# Confirm resetStuckLore exists in both server and client
grep -n "resetStuckLore" src/server/trpc/routers/trips.ts
grep -n "resetStuckLore" src/app/trips/[tripId]/generating/page.tsx
# Both must return matches

# Confirm noop cron
grep -n "noop" src/app/api/cron/stuck-jobs/route.ts
# Must return match

# Confirm void annotations
grep -c "void sendToLangfuse" src/lib/langfuse.ts
# Must print: 3

# Confirm REL-06 order: resend.emails.send line number < sent_at update line number
grep -n "resend.emails.send\|sent_at.*new Date" src/app/api/cron/anniversaries/route.ts

# Confirm REL-07 storage lookup and resolvedFileSize
grep -n "schema('storage')\|resolvedFileSize" src/server/trpc/routers/photos.ts
# Both must return matches

# Confirm worker dispatches both new job types
grep -n "missing_person_card\|judge_battle" ai-worker/src/main.py
# Must return matches in both the .in_() filter and the elif dispatch chain

# Run existing tests (they should still pass — no behavioral regressions)
npm run test -- --run
```

</verification>

<success_criteria>
Phase 2 is complete when ALL of the following are true:

1. **REL-01**: `grep -n "generate-missing-person-card" src/server/trpc/routers/trips.ts` returns no output;
   `grep -n "missing_person_card" src/server/trpc/routers/trips.ts` returns a match in a `background_jobs` insert.

2. **REL-02**: `grep -n "judge-battle" src/server/trpc/routers/battles.ts` returns no output;
   `grep -n "judge_battle" src/server/trpc/routers/battles.ts` returns a match in a `background_jobs` insert
   using `createSupabaseServiceClient`.

3. **REL-01 + REL-02 (worker)**: `grep -n "missing_person_card\|judge_battle" ai-worker/src/main.py`
   returns matches in both the `.in_()` filter and the `elif` dispatch chain.

4. **REL-03**: `grep -n "noop" src/app/api/cron/stuck-jobs/route.ts` returns a match;
   `vercel.json` still declares the `/api/cron/stuck-jobs` path unchanged.

5. **REL-04 (server)**: `grep -n "resetStuckLore" src/server/trpc/routers/trips.ts` returns matches
   including both the procedure declaration and the `creator_id !== ctx.user.id` ownership guard.

6. **REL-04 (client)**: `grep -n "resetStuckLore" src/app/trips/[tripId]/generating/page.tsx`
   returns matches for both the `useMutation()` hook and the `mutateAsync` call inside `onClick`.

7. **REL-05**: `grep -c "void sendToLangfuse" src/lib/langfuse.ts` prints `3`.

8. **REL-06**: The line number of `resend.emails.send` in `anniversaries/route.ts` is lower than
   the line number of the `sent_at` UPDATE.

9. **REL-07**: `grep -n "schema('storage')\|resolvedFileSize\|FIFTY_MB" src/server/trpc/routers/photos.ts`
   returns matches for all three; `grep -n "file_size:" src/server/trpc/routers/photos.ts` shows
   `resolvedFileSize` not `input.fileSize`.

10. `npm run type-check` passes with no errors.
11. `npm run test -- --run` passes with no regressions.
    </success_criteria>

<output>
When all tasks are complete, create:
`.planning/phases/02-reliability-engineering/02-SUMMARY.md`

The summary must record:

- Which tasks were completed and in what order
- Any deviations from the plan (e.g. if `.schema('storage')` was unavailable and the fallback was used)
- The exact grep/type-check verification results from the success criteria above
- Any new issues discovered during implementation (forward to STATE.md if phase-blocking)
  </output>
