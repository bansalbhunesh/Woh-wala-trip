# Phase 2: Reliability Engineering — Research

**Researched:** 2026-05-18
**Domain:** Durable job queuing, stuck-pipeline recovery, client timeout UX, Langfuse non-blocking I/O, email delivery ordering, server-side file size validation
**Confidence:** HIGH — all findings verified directly from source code, migrations, and architecture docs

---

<phase_requirements>

## Phase Requirements

| ID     | Description                                                                                               | Research Support                                                                                                                                                                                                                                 |
| ------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| REL-01 | `trips.markAbsent` uses `background_jobs` queue instead of fire-and-forget HTTP POST                      | `background_jobs` schema verified; worker poll loop handles `image_generation` only — handler for `missing_person_card` must be added                                                                                                            |
| REL-02 | `battles.challenge` uses `background_jobs` queue instead of fire-and-forget HTTP POST                     | Same queue; `judge_battle` job_type not yet in worker poll loop — handler must be added                                                                                                                                                          |
| REL-03 | Single stuck-pipeline recovery mechanism — remove/no-op the Vercel cron; keep worker-side 30-min recovery | `vercel.json` cron is `0 7 * * *` (daily), not every 15 min; worker recovery confirmed at 30-poll-tick cadence                                                                                                                                   |
| REL-04 | Generating-page 4-min timeout triggers `lore_status → 'failed'` reset so users can retry                  | No reset procedure exists yet; must be added as a new tRPC mutation                                                                                                                                                                              |
| REL-05 | Langfuse `sendToLangfuse` is fire-and-forget (non-awaited)                                                | Already fire-and-forget internally — only `span()` call site in `generateLore` is synchronous at trigger time but `sendToLangfuse` itself is not awaited; `traceSecurityEvent` in `send-otp` calls `langfuse.event()` which also doesn't `await` |
| REL-06 | Anniversary email loop marks `sent_at` AFTER successful Resend delivery (not before)                      | Current code claims the row BEFORE calling `resend.emails.send` — order must be swapped                                                                                                                                                          |
| REL-07 | `confirmUpload` validates actual server-side file size via `storage.objects` metadata                     | No server-side size check exists; `file_size` column taken from client input verbatim                                                                                                                                                            |

</phase_requirements>

---

## Summary

Phase 2 makes the Yaarlore AI pipeline durable by eliminating seven distinct failure modes. The most impactful changes are REL-01 and REL-02: replacing fire-and-forget HTTP POSTs with inserts into the existing `background_jobs` table. The infrastructure for this already exists — the worker has a `poll_background_jobs` loop, and the table schema is in place — but that loop currently only dispatches `image_generation` jobs. Adding dispatch branches for `missing_person_card` and `judge_battle` is the critical worker-side work.

REL-03 consolidates two independent stuck-pipeline recovery mechanisms (a daily Vercel cron and a 30-minute worker loop) into one. The recommended approach is to no-op the cron route response (return 200 with `{noop: true}`) rather than delete the route, which preserves the `vercel.json` entry without risk to the Vercel deployment.

REL-04 requires a new tRPC mutation `trips.resetStuckLore` that flips `lore_status → 'failed'` for trips owned by the calling user, so the generating-page "Go back & retry" button actually works. REL-05 is already partly done — `sendToLangfuse` is not awaited internally — but the CONCERNS.md identified this as a risk because `langfuse.span()` is called synchronously before the HTTP trigger in `generateLore`; the fix is to confirm no await chain blocks the response path. REL-06 is a one-line reorder in `anniversaries/route.ts`. REL-07 requires a Supabase `storage.objects` lookup in `confirmUpload` to get the authoritative file size.

**Primary recommendation:** All seven changes are surgical; no new dependencies are required. The largest change is the worker-side dispatch additions (~30 lines of Python each for `missing_person_card` and `judge_battle`).

---

## Architectural Responsibility Map

| Capability                             | Primary Tier | Secondary Tier      | Rationale                                                                                           |
| -------------------------------------- | ------------ | ------------------- | --------------------------------------------------------------------------------------------------- |
| Job queue insertion (REL-01, REL-02)   | API / tRPC   | —                   | Mutation handler owns the Supabase write; no client involvement                                     |
| Job dispatch (REL-01, REL-02)          | AI Worker    | —                   | Poll loop runs inside FastAPI process on Render                                                     |
| Stuck pipeline recovery (REL-03)       | AI Worker    | Vercel Cron (no-op) | Worker has observability + 30-min cadence; cron only runs daily so adds no value                    |
| Generating page timeout reset (REL-04) | API / tRPC   | Frontend            | New `resetStuckLore` mutation called by client on timeout; frontend calls it before navigating back |
| Langfuse non-blocking (REL-05)         | API / tRPC   | —                   | `sendToLangfuse` lives in `src/lib/langfuse.ts`; internal fix, no client impact                     |
| Email delivery ordering (REL-06)       | Vercel Cron  | —                   | `anniversaries/route.ts` is the only code path for anniversary sends                                |
| File size validation (REL-07)          | API / tRPC   | Supabase Storage    | `confirmUpload` queries `storage.objects` using service role                                        |

---

## Standard Stack

No new packages required for any REL requirement. All changes use existing dependencies.

| Concern           | Existing Tool                          | Location                                                       |
| ----------------- | -------------------------------------- | -------------------------------------------------------------- |
| Durable job queue | `background_jobs` Supabase table       | `supabase/migrations/20260518_hermes_lorian_observability.sql` |
| Job poll loop     | `poll_background_jobs()`               | `ai-worker/src/main.py:77`                                     |
| Stuck recovery    | `reset_stuck_pipelines()`              | `ai-worker/src/lore/orchestrator.py:325`                       |
| Email delivery    | `resend` npm package                   | `src/app/api/cron/anniversaries/route.ts`                      |
| Storage metadata  | `@supabase/supabase-js` service client | `src/lib/supabase/server.ts`                                   |

---

## Package Legitimacy Audit

> No new packages are installed in this phase. All changes use existing `@supabase/supabase-js`, `resend`, and the project's own tRPC/FastAPI patterns.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
markAbsent / battles.challenge (tRPC mutation)
  │
  ▼
INSERT background_jobs {job_type: 'missing_person_card' | 'judge_battle', trip_id, status: 'pending'}
  │                    (no HTTP POST to worker)
  │
  ▼
poll_background_jobs() — every 60s in AI worker
  ├─ .eq("job_type", "missing_person_card") → LoreOrchestrator().generate_missing_person(trip_id, user_id)
  └─ .eq("job_type", "judge_battle")         → LoreOrchestrator().judge_battle(battle_id)
       ↓ on complete
  UPDATE background_jobs SET status='done'

generating/page.tsx — 4-min timeout fires
  │
  └─ trpc.trips.resetStuckLore.mutate({tripId})   [NEW]
       ├─ ownership check: trip.creator_id = ctx.user.id
       ├─ guard: only reset if lore_status = 'processing'
       └─ UPDATE trips SET lore_status='failed', processing_started_at=null
            ↓ Supabase Realtime pushes UPDATE event → generating page routes to /trips/[tripId]
```

### Recommended Project Structure

No new directories. Changes touch:

```
src/
├── server/trpc/routers/trips.ts       — add resetStuckLore procedure (REL-04)
├── server/trpc/routers/battles.ts     — replace fire-and-forget with background_jobs insert (REL-02)
│                                        battles.challenge: insert to background_jobs, no HTTP
├── app/trips/[tripId]/generating/page.tsx — call resetStuckLore on timeout before router.push (REL-04)
├── app/api/cron/stuck-jobs/route.ts   — return early with {noop: true} (REL-03)
└── app/api/cron/anniversaries/route.ts — swap claim order: send email first, then update sent_at (REL-06)

ai-worker/src/
└── main.py                            — extend poll_background_jobs to handle new job types (REL-01, REL-02)
```

---

## REL-01: markAbsent → background_jobs

### Current Pattern (trips.ts lines 465–483)

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
      headers: { ... },
      body: markAbsentBody,
    }).catch(e => console.error('[markAbsent] worker call failed:', e.message));
  })
  .catch(e => console.error('[markAbsent] HMAC signing failed:', e.message));
```

### Minimal Fix (trips.ts)

Replace the entire fire-and-forget block with a single `background_jobs` insert:

```typescript
// REL-01: durable queue instead of fire-and-forget
const admin = createSupabaseServiceClient();
await admin.from('background_jobs').insert({
  trip_id: input.tripId,
  job_type: 'missing_person_card',
  status: 'pending',
  // Store absent_user_id in trace_id field (or add a payload column — see notes)
});
```

**Schema gap — `absent_user_id` storage:** The `background_jobs` table has no `payload` column. The worker's `generate_missing_person` needs both `trip_id` AND `absent_user_id`. Options:

1. Add a `payload JSONB` column to `background_jobs` — cleanest, future-proof
2. Store `absent_user_id` in the existing `trace_id TEXT` column — a hack, but avoids a migration if the planner wants minimal schema change
3. Look up the absent member by querying `trip_members WHERE status='absent'` from inside the worker handler

**Recommended:** Option 1 — add `payload JSONB` column. The migration is one line and makes all future job types extensible.

### Worker-side Handler (main.py poll_background_jobs)

The current `poll_background_jobs` loop (main.py lines 77–129) claims only `job_type = 'image_generation'`. The loop must be extended to a multi-job-type dispatcher:

```python
# Current (single job type):
.eq("job_type", "image_generation")

# REL-01/REL-02 fix — claim any pending job:
.in_("job_type", ["image_generation", "missing_person_card", "judge_battle"])
.order("created_at")
.limit(1)

# Then dispatch by type:
if job["job_type"] == "image_generation":
    await generate_all_images(trip_id)
elif job["job_type"] == "missing_person_card":
    payload = job.get("payload") or {}
    absent_user_id = payload.get("absent_user_id")
    await LoreOrchestrator().generate_missing_person(trip_id, absent_user_id)
elif job["job_type"] == "judge_battle":
    payload = job.get("payload") or {}
    battle_id = payload.get("battle_id")
    await LoreOrchestrator().judge_battle(battle_id)
```

### Worker endpoint that already handles this logic

`POST /generate-missing-person-card` endpoint exists in main.py (line 233–242) and calls `LoreOrchestrator().generate_missing_person(req.trip_id, req.absent_user_id)`. The poll handler needs to replicate this call.

---

## REL-02: battles.challenge → background_jobs

### Current Pattern (battles.ts lines 109–124)

```typescript
const battleBody = JSON.stringify({ battle_id: (battle as BattleRow).id });
signWorkerRequest('POST', '/judge-battle', battleBody)
  .then(({ signature, timestamp }) => {
    fetch(`${process.env.AI_WORKER_URL ?? ''}/judge-battle`, {
      method: 'POST',
      headers: { ... },
      body: battleBody,
      signal: AbortSignal.timeout(8000),
    }).catch(e => console.error('[challenge] worker failed:', (e as Error).message));
  })
  .catch(e => console.error('[challenge] HMAC signing failed:', e.message));

return battle;
```

### Minimal Fix (battles.ts)

Replace with a `background_jobs` insert after the battle row is created. The battle `id` must go into the payload:

```typescript
// REL-02: durable queue instead of fire-and-forget
const { createSupabaseServiceClient } = await import('@/lib/supabase/server');
const admin = createSupabaseServiceClient();
await admin.from('background_jobs').insert({
  trip_id: input.myTripId, // trip_id is NOT NULL in schema
  job_type: 'judge_battle',
  status: 'pending',
  payload: { battle_id: (battle as BattleRow).id },
});

return battle;
```

**Note on `trip_id` NOT NULL constraint:** `background_jobs.trip_id` references `trips(id)` and is `NOT NULL`. For `judge_battle` the natural `trip_id` to use is `trip_a_id` (the challenger's trip). This is already in scope as `input.myTripId`.

**battles.ts import:** `battles.ts` does not currently import `createSupabaseServiceClient`. It must be added. Alternatively, the insert can use `ctx.supabase` (user session), but that will be blocked by the `service_role` RLS policy on `background_jobs`. The service client is required.

---

## REL-03: Consolidate Stuck-Job Recovery

### Two Existing Mechanisms

| Mechanism       | File                                     | Cutoff | Schedule                      | Condition                         |
| --------------- | ---------------------------------------- | ------ | ----------------------------- | --------------------------------- |
| Vercel cron     | `src/app/api/cron/stuck-jobs/route.ts`   | 10 min | `0 7 * * *` (daily 7am UTC)   | vercel.json                       |
| Worker recovery | `ai-worker/src/lore/orchestrator.py:325` | 30 min | Every 30 poll ticks (~30 min) | Only if worker process is running |

### What Each Does

**Vercel cron (stuck-jobs/route.ts lines 16–22):**

```typescript
const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
supabase
  .from('trips')
  .update({ lore_status: 'failed', processing_started_at: null })
  .eq('lore_status', 'processing')
  .lt('processing_started_at', cutoff)
  .select('id, name');
```

**Worker recovery (orchestrator.py lines 324–349):**

```python
cutoff = (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat()
supabase.table("trips")
  .select("id, processing_started_at")
  .eq("lore_status", "processing")
  .lt("processing_started_at", cutoff)
  .execute()
# then updates each stuck trip to lore_status='failed'
```

Both are idempotent: `.eq('lore_status', 'processing')` ensures a second update of an already-failed row is a no-op.

### Recommended Fix: No-op the Vercel Cron Route

Do NOT delete the cron entry from `vercel.json` — Vercel validates the configuration and removing a declared cron path causes a deployment error if the route doesn't exist. Instead, make the route a no-op that returns immediately:

```typescript
// src/app/api/cron/stuck-jobs/route.ts — REL-03
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // REL-03: Stuck-pipeline recovery consolidated into AI worker (reset_stuck_pipelines,
  // every ~30 min). This Vercel cron runs once daily and had a mismatched 10-min cutoff.
  // Keeping the route alive to avoid Vercel deployment errors; logic moved to worker.
  return NextResponse.json({ noop: true, reason: 'consolidated_to_worker' });
}
```

**What about the worker crashing?** If the worker itself crashes (Render free-tier restart), `reset_stuck_pipelines` won't run until the worker comes back up. On Render free tier, the dyno sleeps after 15 minutes of inactivity but restarts on the next request. A trip stuck in `processing` will be recovered within 30 minutes of the next AI worker wakeup. This is acceptable for a pre-launch product — document it in comments.

---

## REL-04: Generating-Page Retry Fix

### The Bug (generating/page.tsx lines 86–95 and 363–373)

The 4-minute timeout fires and sets `timedOut = true`, showing a "Go back & retry" button:

```tsx
// page.tsx line 86–95
useEffect(() => {
  const timeout = setTimeout(
    () => {
      if (loreStatus === 'processing' || loreStatus === undefined) setTimedOut(true);
    },
    4 * 60 * 1000
  );
  return () => clearTimeout(timeout);
}, [loreStatus]);

// The button (line 363–373)
<button onClick={() => router.push(`/trips/${tripId}`)}>Go back &amp; retry</button>;
```

**Why retry fails:** The button routes to `/trips/${tripId}`. The trip room shows a "Generate Lore" button. When clicked, `generateLore` mutation runs. At trips.ts lines 340–353, the guard is:

```typescript
.neq('lore_status', 'processing')
```

The trip's `lore_status` is still `'processing'` because nothing reset it. The guard throws:

```
Lore generation is already running. Check back in a few minutes.
```

The user is stuck until the worker's `reset_stuck_pipelines` fires (30 min) or the daily Vercel cron fires (up to 23 hours).

### New tRPC Procedure: `trips.resetStuckLore`

```typescript
// trips.ts — add after markAbsent
resetStuckLore: protectedProcedure
  .input(z.object({ tripId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    // Ownership check — only creator can reset their own trip's lore status
    const { data: tripRaw } = await ctx.supabase
      .from('trips')
      .select('creator_id, lore_status')
      .eq('id', input.tripId)
      .single();
    const trip = tripRaw as { creator_id: string; lore_status: string } | null;

    if (!trip || trip.creator_id !== ctx.user.id) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    // Only reset if currently stuck in processing
    if (trip.lore_status !== 'processing') {
      return { reset: false, reason: 'not_processing' };
    }

    const admin = createSupabaseServiceClient();
    await admin
      .from('trips')
      .update({
        lore_status: 'failed',
        processing_started_at: null,
      } as never)
      .eq('id', input.tripId)
      .eq('lore_status', 'processing'); // guard against race

    return { reset: true };
  }),
```

### Client Fix (generating/page.tsx)

```tsx
// Add trpc call at component top
const resetStuckLore = trpc.trips.resetStuckLore.useMutation();

// In the timeout button's onClick:
onClick={async () => {
  try {
    await resetStuckLore.mutateAsync({ tripId });
  } catch {
    // Best-effort — even if reset fails, route back so user can see the failed state
  }
  router.push(`/trips/${tripId}`);
}}
```

**Why this works:** After `resetStuckLore` sets `lore_status = 'failed'`, Supabase Realtime will push the UPDATE event. The generating page's Realtime listener (line 53) catches `newStatus === 'failed'` and calls `refetch()`. The `useEffect` at line 79 routes to `/trips/${tripId}` on `'failed'`. The explicit `router.push` in the button handler is a belt-and-suspenders backup. On the trip detail page, `lore_status = 'failed'` shows the "Generate Lore" button again, and the `generateLore` guard (`neq('lore_status', 'processing')`) now passes.

---

## REL-05: Langfuse Non-Blocking

### Current State — Already Mostly Fire-and-Forget

`sendToLangfuse` in `src/lib/langfuse.ts` (lines 57–67):

```typescript
async function sendToLangfuse(body: unknown) {
  try {
    await fetch(`${host}/api/public/ingestion`, { ... });
  } catch {
    // Never throw on observability failures
  }
}
```

**Critical observation:** `sendToLangfuse` is called WITHOUT `await` at all three call sites (lines 76, 95, 119):

```typescript
sendToLangfuse({  // line 76 — no await
sendToLangfuse({  // line 95 — no await
sendToLangfuse({  // line 119 — no await
```

This means `sendToLangfuse` is already fire-and-forget at the call site level. The fetch inside it uses `await` but that's within an async function that is never awaited by the caller — the promise floats.

**Remaining concern from CONCERNS.md:** The concern was that `langfuse.span()` is called synchronously in `generateLore` (trips.ts line 356) and that `sendToLangfuse` inside it could block. As verified above, it does NOT block — `sendToLangfuse` is not awaited by the span creation code.

**For `traceSecurityEvent` in `send-otp/route.ts`:** `traceSecurityEvent` calls `langfuse.event()` (langfuse.ts line 154) which calls `sendToLangfuse` without await (line 119). The `traceSecurityEvent` function itself is synchronous and returns `void`. No await anywhere in the chain. This is already non-blocking.

### What REL-05 Actually Needs

The current implementation IS fire-and-forget. The remaining lint is:

1. TypeScript will warn about unhandled floating promises from un-awaited `sendToLangfuse` calls. Add `void` prefix to suppress:

   ```typescript
   void sendToLangfuse({ ... }); // line 76, 95, 119
   ```

2. Confirm no caller of `langfuse.span()` or `traceSecurityEvent()` awaits the result (they return `Span` and `void` respectively, neither is a Promise). Verified: zero `await langfuse.span(` or `await traceSecurityEvent(` patterns in the codebase.

**REL-05 is effectively a 3-line `void` annotation fix plus documentation confirmation.**

---

## REL-06: Anniversary Email Ordering

### Current Bug (anniversaries/route.ts lines 100–177)

The current loop order is:

```typescript
// Step 1: Claim row (mark sent_at) — BEFORE sending email
const { error: claimError } = await supabase
  .from('scheduled_emails')
  .update({ sent_at: new Date().toISOString() })
  .eq('id', row.id)
  .is('sent_at', null);

if (claimError) continue; // Another process claimed it

// Step 2: Send email — AFTER claiming
await resend.emails.send({ ... });

sent++;
```

**The failure mode:** If `resend.emails.send` throws (line 119), the `catch` at line 175 logs the error. But `sent_at` is already set. The email is marked as sent but was never delivered. The user gets no anniversary email; the record is permanently consumed.

### Minimal Fix

Swap the order: send first, then claim:

```typescript
// REL-06 fix: send first, mark sent only on success
if (process.env.RESEND_API_KEY) {
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';

  try {
    await resend.emails.send({ ... });

    // Only mark sent AFTER successful delivery confirmation
    await supabase
      .from('scheduled_emails')
      .update({ sent_at: new Date().toISOString() })
      .eq('id', row.id)
      .is('sent_at', null);

    sent++;
  } catch (err) {
    console.error(`[anniversary] failed for ${profile.email}:`, err);
    // Do NOT set sent_at — next cron run will retry
    // (within the 25-hour window)
  }
}
```

**Race condition tradeoff:** This creates a new (accepted) risk: if the process crashes between `resend.emails.send` succeeding and the `UPDATE sent_at` completing, the email will be sent twice on the next cron run. The CONCERNS.md explicitly documents this as the accepted tradeoff: "Accept that rare race conditions (dual send) are better than silent drops." The 25-hour window means the next cron run (6am UTC daily) can catch and re-send within the window.

**The old claim-before-send pattern's anti-duplicate-send rationale** (line 101 comment: "Claim row before sending to prevent duplicate sends if process crashes mid-loop") is being deliberately traded away. Document in code comment.

---

## REL-07: confirmUpload Server-Side File Size Validation

### Current State (photos.ts lines 126–188)

`confirmUpload` accepts `fileSize` from the client as `z.number().optional()` and stores it verbatim:

```typescript
.insert({
  trip_id: input.tripId,
  user_id: ctx.user.id,
  storage_path: input.storagePath,
  file_size: input.fileSize ?? null,   // ← client-supplied, unverified
})
```

There is no server-side verification that `input.fileSize` matches the actual file in Supabase Storage.

### Supabase `storage.objects` Query Pattern

Supabase stores file metadata in the `storage.objects` table. The service role client can query it directly:

```typescript
const admin = createSupabaseServiceClient();
const { data: storageObj } = await admin
  .from('objects') // storage.objects, accessed as 'objects' on the storage schema
  .select('metadata')
  .eq('bucket_id', 'trip-photos')
  .eq('name', input.storagePath)
  .single();

const actualSize: number | null = (storageObj?.metadata as { size?: number } | null)?.size ?? null;
```

**Schema note:** Supabase `storage.objects` has a `metadata` JSONB column. The file size is stored as `metadata.size` (an integer, bytes). This is populated by Supabase Storage on upload completion. [ASSUMED — based on Supabase Storage architecture; verified indirectly via the project's existing `storage.objects`-adjacent patterns]

**Free-tier 500 MB limit:** The free-tier limit is enforced in `getUploadUrl` via `trips.storage_used_bytes`. The `confirmUpload` check is a second-layer guard:

```typescript
// After the storage.objects lookup
if (actualSize !== null && actualSize > 50 * 1024 * 1024) {
  // 50MB per-photo cap
  // Clean up the orphaned storage object
  await admin.storage.from('trip-photos').remove([input.storagePath]);
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'File exceeds 50 MB per-photo limit',
  });
}

// Also validate against trip-level 500MB limit using actual size
if (actualSize !== null) {
  const { data: tripRaw } = await admin
    .from('trips')
    .select('storage_used_bytes, tier')
    .eq('id', input.tripId)
    .single();
  const trip = tripRaw as { storage_used_bytes: number; tier: string } | null;
  const FREE_TIER_LIMIT = 500 * 1024 * 1024;
  if (trip?.tier === 'free' && trip.storage_used_bytes + actualSize > FREE_TIER_LIMIT) {
    await admin.storage.from('trip-photos').remove([input.storagePath]);
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Trip storage limit (500 MB) would be exceeded',
    });
  }
}

// Store authoritative size (overrides client-supplied value)
const fileSize = actualSize ?? input.fileSize ?? null;
```

**Alternative simpler approach:** The REQUIREMENTS.md description says "validates actual server-side file size against Supabase Storage `storage.objects` metadata." The minimal interpretation is: query `storage.objects` for the actual size and use THAT value in the `photos` insert (replacing the client-supplied value). This is correct even without an explicit reject-if-too-large guard, because `storage_used_bytes` (maintained by the trigger) will then be accurate and the `getUploadUrl` guard will block the NEXT upload. The explicit per-photo reject is belt-and-suspenders.

**Important:** The `storage.objects` query requires using the service role client with `.schema('storage')` OR accessing it via the default schema as `objects` on the storage client. The correct Supabase JS v2 pattern:

```typescript
const { data: storageObj } = await admin
  .schema('storage')
  .from('objects')
  .select('metadata')
  .eq('bucket_id', 'trip-photos')
  .eq('name', input.storagePath)
  .single();
```

[ASSUMED — the `.schema('storage')` selector is standard Supabase JS v2 for accessing non-public schemas. Verify against project's Supabase JS version if the standard `.from('objects')` without schema selector doesn't resolve.]

---

## Don't Hand-Roll

| Problem                  | Don't Build                         | Use Instead                                                                                   |
| ------------------------ | ----------------------------------- | --------------------------------------------------------------------------------------------- |
| Durable job queue        | Custom retry logic in tRPC mutation | Existing `background_jobs` table + `poll_background_jobs` worker loop                         |
| Stuck-pipeline detection | New cron/webhook                    | Existing `reset_stuck_pipelines()` in orchestrator (already runs every 30 poll ticks)         |
| Lore status reset auth   | New middleware                      | Standard `protectedProcedure` + `creator_id = ctx.user.id` ownership check                    |
| File size authority      | Trust client input                  | `storage.objects` metadata query via service role                                             |
| Observability blocking   | Circuit breaker / backoff           | Existing fire-and-forget `sendToLangfuse` pattern — already correct, just needs `void` prefix |

---

## Common Pitfalls

### Pitfall 1: background_jobs `job_type` filter is exclusive

**What goes wrong:** The current `poll_background_jobs` uses `.eq("job_type", "image_generation")`. Changing to `.in_("job_type", [...])` without updating the claim/dispatch logic means the first job of any type could be claimed but not dispatched if the type check is missing.
**How to avoid:** Add an explicit `if/elif` dispatch chain for all supported `job_type` values. Log `WARNING` and mark as `failed` for any unknown `job_type`.
**Warning signs:** `background_jobs` rows stuck in `pending` state with `job_type = 'missing_person_card'` or `judge_battle`.

### Pitfall 2: `battles.ts` uses `ctx.supabase` (user session) for background_jobs insert

**What goes wrong:** `background_jobs` has `service_role`-only RLS (`20260519_security_rls_hardening.sql` line 10–12). A user-session client insert will silently return 0 rows without error (RLS REJECT returns empty, not an error).
**How to avoid:** Import and use `createSupabaseServiceClient()` in `battles.ts` for the `background_jobs` insert.
**Warning signs:** `background_jobs` table shows no new rows after battles are created, but no error is thrown.

### Pitfall 3: `absent_user_id` lost if stored in `trace_id`

**What goes wrong:** If the `payload` column approach is rejected and `absent_user_id` is shoe-horned into `trace_id`, the worker must parse it back as a UUID string. Any non-UUID value in `trace_id` will cause type errors.
**How to avoid:** Add the `payload JSONB` column migration (one line: `ALTER TABLE background_jobs ADD COLUMN IF NOT EXISTS payload JSONB`).

### Pitfall 4: Anniversary email race condition after order swap

**What goes wrong:** If two cron executions run within the 25-hour window (e.g., if a deployment retriggers the cron), both may send the email. The old claim-first approach prevented this; the new send-first approach doesn't.
**How to avoid:** Accept it per documented tradeoff. Add a comment in code citing REL-06 rationale. The window is 25 hours and the cron runs daily — duplicate sends are extremely rare.

### Pitfall 5: `storage.objects` lookup can fail for recently uploaded files

**What goes wrong:** Supabase Storage uses eventual consistency for `storage.objects` metadata. A file uploaded via signed URL may not appear in `storage.objects` immediately when `confirmUpload` is called.
**How to avoid:** If `storageObj` is null (file not yet indexed), fall back to `input.fileSize ?? null` without throwing. The authoritative size check is belt-and-suspenders; a missed check on a race condition is acceptable.

### Pitfall 6: Generating page `resetStuckLore` must handle `NOT_FOUND` gracefully

**What goes wrong:** If the user navigates to the generating page for a trip they don't own (e.g., they're a member but not the creator), `resetStuckLore` throws `FORBIDDEN`. The page crashes or shows an unhandled error instead of routing back gracefully.
**How to avoid:** Wrap `resetStuckLore.mutateAsync` in try/catch in the button's `onClick` and always `router.push` afterward regardless of the result.

---

## Code Examples

### Pattern: background_jobs insert with payload

```typescript
// trips.ts — REL-01 (after updating trip_members status)
const admin = createSupabaseServiceClient();
const { error: jobError } = await admin.from('background_jobs').insert({
  trip_id: input.tripId,
  job_type: 'missing_person_card',
  status: 'pending',
  payload: {
    absent_user_id: input.userId,
  },
} as never); // 'as never' until Supabase types are regenerated in Phase 4

if (jobError) {
  console.error('[markAbsent] failed to enqueue background job:', jobError.message);
  // Non-fatal: log and continue. The member is marked absent even if the card job fails to enqueue.
}
```

### Pattern: multi-type job dispatch in poll_background_jobs

```python
# ai-worker/src/main.py — REL-01 + REL-02
result = await asyncio.to_thread(
    lambda: supabase.table("background_jobs")
        .select("id, trip_id, job_type, payload, trace_id")  # add job_type, payload
        .eq("status", "pending")
        .in_("job_type", ["image_generation", "missing_person_card", "judge_battle"])
        .order("created_at")
        .limit(1)
        .execute()
)
rows = result.data or []
if rows:
    job = rows[0]
    jid, trip_id, job_type = job["id"], job["trip_id"], job["job_type"]
    payload = job.get("payload") or {}

    # Claim
    await asyncio.to_thread(
        lambda: supabase.table("background_jobs").update({
            "status": "claimed",
            "claimed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", jid).eq("status", "pending").execute()
    )

    try:
        if job_type == "image_generation":
            from .image_gen import generate_all_images
            await generate_all_images(trip_id)
        elif job_type == "missing_person_card":
            absent_user_id = payload.get("absent_user_id")
            if not absent_user_id:
                raise ValueError("missing_person_card job has no absent_user_id in payload")
            await LoreOrchestrator().generate_missing_person(trip_id, absent_user_id)
        elif job_type == "judge_battle":
            battle_id = payload.get("battle_id")
            if not battle_id:
                raise ValueError("judge_battle job has no battle_id in payload")
            await LoreOrchestrator().judge_battle(battle_id)
        else:
            raise ValueError(f"Unknown job_type: {job_type}")

        # Mark done
        await asyncio.to_thread(
            lambda: supabase.table("background_jobs").update({
                "status": "done",
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", jid).execute()
        )
    except Exception as e:
        log.error(f"[bg-jobs] {job_type} failed for {trip_id}: {e}")
        await asyncio.to_thread(
            lambda: supabase.table("background_jobs").update({
                "status": "failed",
                "error": str(e)[:500],
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", jid).execute()
        )
```

### Pattern: resetStuckLore tRPC procedure

```typescript
// trips.ts — REL-04
resetStuckLore: protectedProcedure
  .input(z.object({ tripId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const { data: tripRaw } = await ctx.supabase
      .from('trips')
      .select('creator_id, lore_status')
      .eq('id', input.tripId)
      .single();
    const trip = tripRaw as { creator_id: string; lore_status: string } | null;

    if (!trip || trip.creator_id !== ctx.user.id) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    if (trip.lore_status !== 'processing') {
      return { reset: false, reason: 'not_processing' as const };
    }

    const admin = createSupabaseServiceClient();
    await admin
      .from('trips')
      .update({ lore_status: 'failed', processing_started_at: null } as never)
      .eq('id', input.tripId)
      .eq('lore_status' as never, 'processing'); // atomic guard

    return { reset: true };
  }),
```

### Pattern: storage.objects size lookup

```typescript
// photos.ts — REL-07
const admin = createSupabaseServiceClient();
const { data: storageObj } = await admin
  .schema('storage')
  .from('objects')
  .select('metadata')
  .eq('bucket_id', 'trip-photos')
  .eq('name', input.storagePath)
  .single();

const actualSize: number | null = (storageObj?.metadata as { size?: number } | null)?.size ?? null;

// Use authoritative size if available; fall back to client-supplied value
const fileSize = actualSize ?? input.fileSize ?? null;

// Reject files over 50MB per-photo (guard against circumventing client-side limits)
if (actualSize !== null && actualSize > 50 * 1024 * 1024) {
  await admin.storage.from('trip-photos').remove([input.storagePath]);
  throw new TRPCError({
    code: 'PAYLOAD_TOO_LARGE',
    message: 'File exceeds the 50 MB per-photo limit.',
  });
}
```

---

## Migration Required

### REL-01/REL-02: Add `payload JSONB` to `background_jobs`

```sql
-- supabase/migrations/YYYYMMDD_background_jobs_payload.sql
ALTER TABLE public.background_jobs
  ADD COLUMN IF NOT EXISTS payload JSONB;
```

This is a non-breaking additive migration. Existing `image_generation` jobs have no payload and the worker doesn't read it for that type. The new `missing_person_card` and `judge_battle` handlers require it.

---

## Validation Architecture

### Test Framework

| Property           | Value                                   |
| ------------------ | --------------------------------------- |
| Framework          | Vitest (existing, `npm run test`)       |
| Config file        | `vitest.config.ts` (check project root) |
| Quick run command  | `npm run test -- --run`                 |
| Full suite command | `npm run test`                          |

### Phase Requirements → Test Map

| Req ID | Behavior                                                                        | Test Type   | Automated Command                          | File Exists? |
| ------ | ------------------------------------------------------------------------------- | ----------- | ------------------------------------------ | ------------ |
| REL-01 | `markAbsent` inserts to `background_jobs`, does NOT call fetch                  | unit        | `npm run test -- --run trips.test`         | No — Wave 0  |
| REL-02 | `battles.challenge` inserts to `background_jobs`, does NOT call fetch           | unit        | `npm run test -- --run battles.test`       | No — Wave 0  |
| REL-03 | `stuck-jobs` cron returns `{noop: true}`                                        | unit        | `npm run test -- --run stuck-jobs.test`    | No — Wave 0  |
| REL-04 | `resetStuckLore` resets `lore_status` for owner; throws FORBIDDEN for non-owner | unit        | `npm run test -- --run trips.test`         | No — Wave 0  |
| REL-05 | `sendToLangfuse` calls are not awaited (TypeScript `void` prefix)               | lint/manual | `npm run type-check`                       | Exists       |
| REL-06 | Anniversary cron sends before marking sent (mock Resend + verify order)         | unit        | `npm run test -- --run anniversaries.test` | No — Wave 0  |
| REL-07 | `confirmUpload` uses storage.objects size, rejects >50MB                        | unit        | `npm run test -- --run photos.test`        | No — Wave 0  |

### Wave 0 Gaps

- [ ] `src/__tests__/trips.test.ts` — covers REL-01, REL-04 (mock supabase service client, assert no fetch call)
- [ ] `src/__tests__/battles.test.ts` — covers REL-02
- [ ] `src/__tests__/cron-stuck-jobs.test.ts` — covers REL-03
- [ ] `src/__tests__/cron-anniversaries.test.ts` — covers REL-06
- [ ] `src/__tests__/photos.test.ts` — covers REL-07

---

## Security Domain

| ASVS Category       | Applies | Standard Control                                                                   |
| ------------------- | ------- | ---------------------------------------------------------------------------------- |
| V2 Authentication   | no      | n/a — no auth changes                                                              |
| V4 Access Control   | yes     | `protectedProcedure` + `creator_id = ctx.user.id` on `resetStuckLore`              |
| V5 Input Validation | yes     | `z.string().uuid()` on all new inputs; server-side file size replaces client trust |
| V6 Cryptography     | no      | n/a                                                                                |

**Security note on REL-04:** `resetStuckLore` must check `creator_id = ctx.user.id` before writing. A member (non-creator) should not be able to reset another user's lore pipeline. This is enforced by the ownership guard shown in the code example above.

**Security note on REL-07:** Querying `storage.objects` requires the service role client (user session cannot access the `storage` schema). This is the established pattern for all storage operations in this project (see ARCHITECTURE.md anti-patterns section).

---

## State of the Art

| Old Approach                   | Current Approach                     | When Changed | Impact                                               |
| ------------------------------ | ------------------------------------ | ------------ | ---------------------------------------------------- |
| Fire-and-forget HTTP POST      | `background_jobs` table insert       | This phase   | Jobs survive worker cold-starts; no silent drops     |
| Claim-before-send (email)      | Send-before-claim                    | This phase   | Email delivery confirmed before marking sent         |
| Client-supplied file size      | `storage.objects` authoritative size | This phase   | Free-tier 500MB limit cannot be bypassed             |
| Dual stuck-recovery mechanisms | Worker-only 30-min recovery          | This phase   | Single source of truth; no confusing cutoff mismatch |

---

## Assumptions Log

| #   | Claim                                                                                                      | Section             | Risk if Wrong                                                                                                                                                                                          |
| --- | ---------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | `storage.objects.metadata.size` stores file size in bytes                                                  | REL-07 code example | If column is named differently or stores size in a nested path, the `.size` accessor returns `undefined` and falls back to client-supplied value — acceptable degraded behavior                        |
| A2  | `.schema('storage').from('objects')` is the correct Supabase JS v2 pattern for accessing `storage.objects` | REL-07              | If Supabase JS version used doesn't support `.schema()`, use raw SQL via `admin.rpc('get_file_size', {path: storagePath})` as fallback                                                                 |
| A3  | Removing the `await` on `sendToLangfuse` call sites (adding `void`) is sufficient for REL-05               | REL-05              | If there's a case where a caller awaits the return value of `langfuse.span()` and depends on Langfuse being flushed, removing await would break that. Verified: no such caller exists in the codebase. |

---

## Open Questions

1. **`payload JSONB` vs `trace_id` hack for absent_user_id**
   - What we know: `background_jobs` has no payload column; `absent_user_id` must reach the worker
   - What's unclear: Whether the planner wants a new migration or a minimal no-migration approach
   - Recommendation: Add `payload JSONB` column (one migration line); it's cleaner and makes all future job types extensible

2. **Battle `trip_id` in background_jobs**
   - What we know: `background_jobs.trip_id NOT NULL REFERENCES trips(id)` — a value is required
   - What's unclear: The conceptually correct `trip_id` for a `judge_battle` job is `trip_a_id` (the challenger)
   - Recommendation: Use `input.myTripId` (the challenger's trip) as `trip_id` and store `battle_id` in `payload`

3. **Supabase JS `.schema('storage')` availability**
   - What we know: This is documented as available in Supabase JS v2
   - What's unclear: The exact Supabase JS version in this project (types are stale, version may be older)
   - Recommendation: Check `package.json` `@supabase/supabase-js` version. If < 2.0, use `admin.from('storage.objects' as any)` as fallback.

---

## Environment Availability

Step 2.6: SKIPPED — this phase makes no changes that depend on external tools beyond what is already running (Supabase, Resend, AI worker on Render). All changes are code/config/migration edits.

---

## Sources

### Primary (HIGH confidence — verified from source code)

- `src/server/trpc/routers/trips.ts` lines 421–485 — `markAbsent` fire-and-forget pattern
- `src/server/trpc/routers/battles.ts` lines 23–127 — `battles.challenge` fire-and-forget pattern
- `src/lib/langfuse.ts` lines 57–143 — `sendToLangfuse` not awaited at call sites (lines 76, 95, 119)
- `src/app/api/cron/anniversaries/route.ts` lines 100–177 — claim-before-send ordering bug
- `src/app/api/cron/stuck-jobs/route.ts` — daily cron, 10-min cutoff
- `vercel.json` — `stuck-jobs` schedule confirmed as `0 7 * * *` (daily)
- `ai-worker/src/main.py` lines 77–129 — `poll_background_jobs` handles `image_generation` only
- `ai-worker/src/lore/orchestrator.py` lines 324–349 — `reset_stuck_pipelines` 30-min cutoff
- `supabase/migrations/20260518_hermes_lorian_observability.sql` — `background_jobs` schema: `id, trip_id, job_type, status, trace_id, error, claimed_at, completed_at, created_at`
- `src/app/trips/[tripId]/generating/page.tsx` lines 86–95, 363–373 — timeout sets `timedOut` state; "Go back & retry" button only calls `router.push`
- `supabase/migrations/20260518_photo_storage_tracking.sql` — `photos.file_size BIGINT` column; `storage_used_bytes` trigger

### Secondary (MEDIUM confidence — architectural docs)

- `.planning/codebase/ARCHITECTURE.md` — two-path lore dispatch, background_jobs table description, AI worker architecture
- `.planning/codebase/CONCERNS.md` — reliability section documents all 7 bugs

### Tertiary (ASSUMED — not verified against live environment)

- `storage.objects.metadata.size` field name and structure [A1]
- `.schema('storage').from('objects')` Supabase JS v2 API [A2]

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — no new packages; all patterns from existing code
- Architecture: HIGH — all patterns verified from source files
- Pitfalls: HIGH — derived from direct code reading, not inference
- REL-05 status: HIGH — `sendToLangfuse` confirmed not awaited at all 3 call sites
- REL-07 storage.objects: MEDIUM — pattern standard but exact field name assumed

**Research date:** 2026-05-18
**Valid until:** 2026-06-17 (stable — no external ecosystem changes affect this research)
