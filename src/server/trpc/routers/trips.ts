import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../init';
import { TRPCError } from '@trpc/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { langfuse } from '@/lib/langfuse';
import { logger } from '@/lib/logger';
import crypto from 'crypto';
import { signWorkerRequest } from '@/lib/worker-auth';

// COST-05: Server-side warmupWorker cache.
// Maps userId → Unix timestamp (ms) of the last successful warmup call.
// Resets on cold start (acceptable — this is purely an optimisation to reduce
// redundant Render /health calls, not a correctness requirement).
const _warmupCache = new Map<string, number>();
const WARMUP_TTL_MS = 10 * 60 * 1000; // 10 minutes

// PERF-03: in-memory cache for getChaosDistribution (10-minute TTL).
// Prevents a full-table scan on every /trips page load.
// Uses a single cache key since the distribution is global (all ready trips).
const chaosDistCache = new Map<
  'global',
  { data: { p50: number; p75: number; p90: number; total: number } | null; expiry: number }
>();
const CHAOS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// TYPE-02/03: local type overrides for tables / columns added after last Supabase codegen.
// Remove once supabase gen types is re-run (TYPE-01).
type BackgroundJobInsert = {
  trip_id: string;
  job_type: string;
  status: string;
  payload?: Record<string, unknown>;
};

// TripStatusUpdate: columns added post-codegen that TypeScript doesn't know about.
type TripStatusUpdate = {
  lore_status?: string;
  processing_started_at?: string | null;
  lore_status_override?: string;
};

// ProfileReferralUpdate: referral columns added post-codegen.
type ProfileReferralUpdate = {
  referral_counted?: boolean;
  referral_count?: number;
  referral_bonus_unlocked?: boolean;
  invited_by_user_id?: string;
};

// RPC return type shapes (RPCs return Json — cast to these after error checking)
interface GetTripFullResult {
  trip: Record<string, unknown>;
  members: unknown[];
  stats: unknown[];
  eras: unknown[];
  cover_photo: unknown | null;
  error?: string;
}
interface JoinTripResult {
  trip_id: string;
  error?: string;
}
interface ConfessionResult {
  success?: boolean;
  error?: string;
}
// Explicit trip column shapes — Supabase type inference fails when columns were added after codegen
interface TripCreatorRow {
  creator_id: string;
}
interface TripUpgradeRow {
  creator_id: string;
  tier: string;
}
interface TripSummary {
  id: string;
  name: string;
  destination?: string | null;
  trip_start_date?: string | null;
  trip_end_date?: string | null;
  lore_status?: string | null;
  lore_json?: unknown;
  chaos_score?: number | null;
  member_count?: number | null;
  total_photos?: number | null;
  tier?: string | null;
  created_at?: string | null;
}

const TripCreateInput = z.object({
  name: z.string().min(2).max(80),
  destination: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const tripsRouter = router({
  create: protectedProcedure.input(TripCreateInput).mutation(async ({ ctx, input }) => {
    // Use service role for writes — auth is already validated by protectedProcedure
    // This bypasses RLS on trips/profiles/trip_members which can fail if the
    // user's JWT isn't forwarded correctly to Supabase on Vercel
    const admin = createSupabaseServiceClient();
    const userId = ctx.user.id;

    // Ensure profile row exists
    await admin.from('profiles').upsert(
      {
        id: userId,
        email: ctx.user.email ?? null,
        display_name: ctx.user.user_metadata?.name ?? ctx.user.email?.split('@')[0] ?? null,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    );

    const { data, error } = await admin
      .from('trips')
      .insert({
        name: input.name,
        destination: input.destination,
        trip_start_date: input.startDate,
        trip_end_date: input.endDate,
        creator_id: userId,
        tier: 'free',
      })
      .select()
      .single();

    if (error) {
      logger.error(
        { procedure: 'trips.create', userId, errorCode: error.code },
        `trip create failed: ${error.message}`
      );
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Could not create season: ${error.message}`,
      });
    }

    if (!data) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Trip creation returned no data',
      });
    }

    const trip = data;

    // Add creator as member — rollback trip if this fails
    const { error: memberErr } = await admin.from('trip_members').insert({
      trip_id: trip.id,
      user_id: userId,
      status: 'joined',
    });
    if (memberErr) {
      await admin.from('trips').delete().eq('id', trip.id);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to join your own trip. Try again.',
      });
    }

    // Referral mechanic: if this is the user's first trip AND they were referred,
    // credit the referrer. referral_counted prevents double-counting on subsequent trips.
    try {
      const { data: profile } = (await admin
        .from('profiles')
        .select('invited_by_user_id, referral_counted')
        .eq('id', userId)
        .single()) as unknown as {
        data: { invited_by_user_id: string | null; referral_counted: boolean } | null;
      };

      if (profile?.invited_by_user_id && !profile.referral_counted) {
        // Mark this user as counted so future trips don't fire again
        // TYPE-02: ProfileReferralUpdate is a local type — columns added post-codegen.
        type ProfileUpdateClient = {
          from: (t: 'profiles') => {
            update: (d: ProfileReferralUpdate) => {
              eq: (c: string, v: string) => Promise<unknown>;
            };
          };
        };
        await (admin as unknown as ProfileUpdateClient)
          .from('profiles')
          .update({ referral_counted: true })
          .eq('id', userId);

        // Increment referrer's count and unlock bonus at 3
        const referrerId = profile.invited_by_user_id;
        const { data: referrer } = (await admin
          .from('profiles')
          .select('referral_count')
          .eq('id', referrerId)
          .single()) as unknown as { data: { referral_count: number } | null };
        const newCount = (referrer?.referral_count ?? 0) + 1;
        await (admin as unknown as ProfileUpdateClient)
          .from('profiles')
          .update({
            referral_count: newCount,
            ...(newCount >= 3 ? { referral_bonus_unlocked: true } : {}),
          })
          .eq('id', referrerId);
      }
    } catch {
      // Referral tracking must never break trip creation
    }

    return trip;
  }),

  getFull: protectedProcedure
    .input(z.object({ tripId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // TYPE-02: get_trip_full RPC not in generated types.
      type TripRpcClient = {
        rpc: (
          fn: string,
          args: Record<string, string>
        ) => Promise<{ data: unknown; error: { message: string } | null }>;
      };
      const { data, error } = await (ctx.supabase as unknown as TripRpcClient).rpc(
        'get_trip_full',
        {
          p_trip_id: input.tripId,
        }
      );

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      const res = data as unknown as GetTripFullResult;
      if (res && typeof res === 'object' && 'error' in res) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Trip not found or not a member',
        });
      }

      return res;
    }),

  joinByCode: protectedProcedure
    .input(z.object({ inviteCode: z.string().min(6).max(8) }))
    .mutation(async ({ ctx, input }) => {
      // TYPE-02: join_trip_by_code RPC not in generated types.
      type TripRpcClient = {
        rpc: (
          fn: string,
          args: Record<string, string>
        ) => Promise<{ data: unknown; error: { message: string } | null }>;
      };
      const { data, error } = await (ctx.supabase as unknown as TripRpcClient).rpc(
        'join_trip_by_code',
        {
          p_invite_code: input.inviteCode.trim().toUpperCase(),
        }
      );

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      const res = data as unknown as JoinTripResult;
      if (res?.error) {
        const errorMap: Record<string, string> = {
          invalid_or_expired_code: 'Yaar this code is literally not working (invalid or expired).',
          free_tier_member_limit_reached:
            'This trip is at its 6-member limit. Upgrade to let the whole group join.',
          not_authenticated: 'Please sign in first',
        };
        // Never expose raw RPC error strings — map to known errors or use generic fallback
        const knownError = errorMap[res.error];
        if (!knownError)
          logger.error(
            { procedure: 'trips.joinByCode', userId: ctx.user.id, rpcError: res.error },
            'unknown RPC error from join_trip_by_code'
          );
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: knownError ?? 'Could not join trip. Check the code and try again.',
        });
      }

      // Referral capture: record who brought this user to the platform (once, first join wins)
      const tripId = res.trip_id;
      try {
        const admin = createSupabaseServiceClient();
        const joinerId = ctx.user.id;

        // Get the trip creator
        const { data: trip } = await admin
          .from('trips')
          .select('creator_id')
          .eq('id', tripId)
          .single();
        const referrerId = trip?.creator_id ?? undefined;

        if (referrerId && referrerId !== joinerId) {
          // Set invited_by only if not already set (first platform join wins).
          // The referral counter fires when the joiner creates their first trip,
          // not at join time — see the create mutation.
          // TYPE-02: invited_by_user_id added post-codegen; use local ProfileReferralUpdate.
          type ProfileIsClient = {
            from: (t: 'profiles') => {
              update: (d: ProfileReferralUpdate) => {
                eq: (c: string, v: string) => { is: (c: string, v: null) => Promise<unknown> };
              };
            };
          };
          await (admin as unknown as ProfileIsClient)
            .from('profiles')
            .update({ invited_by_user_id: referrerId })
            .eq('id', joinerId)
            .is('invited_by_user_id', null);
        }
      } catch (referralErr) {
        // Referral tracking must never break the join flow
        logger.error(
          { procedure: 'trips.joinByCode', userId: ctx.user.id, tripId },
          `referral tracking failed: ${(referralErr as Error).message}`
        );
      }

      return { tripId };
    }),

  listMine: protectedProcedure
    .input(
      z.object({
        // ISO timestamp cursor: fetch trips created strictly before this timestamp.
        cursor: z.string().datetime().optional(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      // Supabase PostgREST does not support filtering on columns of embedded foreign-table
      // selects via the JS client (e.g. `.lt('trips.created_at', cursor)` is not valid).
      // Instead, we fetch the user's trip_member rows (capped at 200 — a user who genuinely
      // has 200+ trips is an edge case that can be addressed with a dedicated RPC later),
      // sort by the nested trip's created_at descending in application code, then apply
      // the cursor filter and page slice.  For the typical user (5–20 trips) this is
      // indistinguishable from a DB-side cursor.
      const { data, error } = await ctx.supabase
        .from('trip_members')
        .select(
          `
          trip_id,
          status,
          trips:trip_id (
            id,
            name,
            destination,
            trip_start_date,
            trip_end_date,
            lore_status,
            lore_json,
            chaos_score,
            member_count,
            total_photos,
            tier,
            created_at
          )
        `
        )
        .eq('user_id', ctx.user.id)
        .limit(200); // hard upper bound to prevent runaway queries on pathological accounts

      if (error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });

      // Flatten, drop nulls, sort newest-first
      const allTrips = (data || [])
        .map(row => (row as unknown as { trips: TripSummary | null }).trips)
        .filter((t): t is TripSummary => t !== null)
        .sort((a, b) => {
          const ta = a.created_at ?? '';
          const tb = b.created_at ?? '';
          return tb.localeCompare(ta); // descending
        });

      // Apply cursor: skip all trips created at or after the cursor timestamp
      const afterCursor = input.cursor
        ? allTrips.filter(t => (t.created_at ?? '') < input.cursor!)
        : allTrips;

      // Page slice
      const page = afterCursor.slice(0, input.limit);

      // Next cursor = created_at of the last trip on this page (undefined if last page)
      const nextCursor =
        page.length === input.limit ? (page[page.length - 1].created_at ?? undefined) : undefined;

      return { trips: page, nextCursor };
    }),

  generateLore: protectedProcedure
    .input(z.object({ tripId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: tripRaw } = await ctx.supabase
        .from('trips')
        .select('creator_id')
        .eq('id', input.tripId)
        .single();
      const trip = tripRaw as TripCreatorRow | null;

      if (!trip || trip.creator_id !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the creator can trigger generation',
        });
      }

      // Count actual photos — don't trust the cached total_photos column
      const { count: photoCount } = await ctx.supabase
        .from('photos')
        .select('id', { count: 'exact', head: true })
        .eq('trip_id', input.tripId);

      if ((photoCount || 0) < 5) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Need at least 5 photos to generate lore. You have ${photoCount || 0} — upload ${5 - (photoCount || 0)} more.`,
        });
      }

      const workerUrl = process.env.AI_WORKER_URL;
      if (!workerUrl || workerUrl.includes('localhost')) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message:
            'Lore engine is offline. Make sure AI_WORKER_URL is set to your deployed worker.',
        });
      }

      // Rate limit: max 1 active lore generation per user across all their trips
      const { count: activeJobs } = await ctx.supabase
        .from('trips')
        .select('id', { count: 'exact', head: true })
        .eq('creator_id', ctx.user.id)
        .eq('lore_status', 'processing');

      if ((activeJobs || 0) > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'You already have a trip generating lore. Wait for it to finish before starting another.',
        });
      }

      // FREEMIUM-01: First trip generation is always free — skip the monthly token cap check.
      // Count trips where lore_status = 'ready' for this user (completed generations).
      const admin = createSupabaseServiceClient();
      const { count: completedTrips } = await admin
        .from('trips')
        .select('id', { count: 'exact', head: true })
        .eq('creator_id', ctx.user.id)
        .eq('lore_status', 'ready');

      const isFirstGeneration = (completedTrips ?? 0) === 0;

      // COST-01: Monthly token cap per user.
      // Configurable via MONTHLY_TOKEN_CAP_PER_USER env var (default 500,000 tokens
      // ≈ 8 full pipeline runs at ~60k tokens each).  The profiles trigger
      // (trg_increment_user_token_usage) keeps generation_tokens_used_this_month
      // current without requiring an extra write here.
      if (!isFirstGeneration) {
        const monthlyCap = parseInt(process.env.MONTHLY_TOKEN_CAP_PER_USER ?? '500000', 10);
        const { data: profileRaw } = await admin
          .from('profiles')
          .select('generation_tokens_used_this_month, generation_tokens_month')
          .eq('id', ctx.user.id)
          .single();
        const profile = profileRaw as {
          generation_tokens_used_this_month: number | null;
          generation_tokens_month: string | null;
        } | null;

        if (profile) {
          // Reset counter if it's from a previous month
          const thisMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
          const profileMonth = profile.generation_tokens_month?.slice(0, 7) ?? null;
          const tokensThisMonth =
            profileMonth === thisMonth ? (profile.generation_tokens_used_this_month ?? 0) : 0;

          if (tokensThisMonth >= monthlyCap) {
            throw new TRPCError({
              code: 'TOO_MANY_REQUESTS',
              message: `Monthly generation limit reached (${tokensThisMonth.toLocaleString()} / ${monthlyCap.toLocaleString()} tokens). Resets next month.`,
            });
          }
        }
      }

      // Atomically claim 'processing' only if not already processing — prevents double-fire race.
      // Also set processing_started_at so the stuck-job cron can detect and reset stalled runs.
      // TYPE-02: lore_status and processing_started_at added post-codegen; use TripStatusUpdate.
      type TripUpdateClient = {
        from: (t: 'trips') => {
          update: (d: TripStatusUpdate) => {
            eq: (
              c: string,
              v: string
            ) => {
              neq: (
                c: string,
                v: string
              ) => { select: (c: string) => Promise<{ data: { id: string }[] | null }> };
            };
          };
        };
      };
      const { data: claimed } = await (ctx.supabase as unknown as TripUpdateClient)
        .from('trips')
        .update({
          lore_status: 'processing',
          processing_started_at: new Date().toISOString(),
        })
        .eq('id', input.tripId)
        .neq('lore_status', 'processing')
        .select('id');

      if (!claimed || claimed.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Lore generation is already running. Check back in a few minutes.',
        });
      }

      const span = langfuse.span({
        name: 'generate-lore-trigger',
        input: { tripId: input.tripId, photoCount },
        metadata: { userId: ctx.user.id },
      });

      try {
        const body = JSON.stringify({ trip_id: input.tripId });
        const { signature, timestamp } = await signWorkerRequest('POST', '/generate-lore', body);
        const resp = await fetch(`${workerUrl}/generate-lore`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.AI_WORKER_SECRET!}`,
            'X-Timestamp': timestamp,
            'X-Signature': signature,
          },
          body,
          signal: AbortSignal.timeout(8000), // 8s connection timeout
        });
        if (!resp.ok) throw new Error(`Worker returned ${resp.status}`);
        span.end({ output: { status: 'processing' } });
        return { status: 'processing' as const, isFirstTrip: isFirstGeneration };
      } catch (err) {
        // HTTP trigger failed — queue the job so the worker's polling loop picks it up
        // within 60 seconds. Don't reset lore_status to 'pending': it stays 'processing'
        // so the generating page keeps polling and the stuck-job cron handles any crash.
        // Note: `admin` is already declared in the outer scope above (COST-01 check).
        // TYPE-02: generation_jobs not in generated types; use local type.
        type GenerationJobUpsert = { trip_id: string; status: string };
        type GenJobClient = {
          from: (t: 'generation_jobs') => {
            upsert: (d: GenerationJobUpsert, opts: { onConflict: string }) => Promise<unknown>;
          };
        };
        await (admin as unknown as GenJobClient)
          .from('generation_jobs')
          .upsert({ trip_id: input.tripId, status: 'pending' }, { onConflict: 'trip_id' });
        logger.warn(
          { procedure: 'trips.generateLore', userId: ctx.user.id, tripId: input.tripId },
          `worker unreachable, queued for polling: ${(err as Error).message}`
        );
        span.end({ output: { status: 'queued' }, usage: undefined });
        // Return normally — the generating page will receive the status update via Realtime
        return { status: 'queued' as const, isFirstTrip: isFirstGeneration };
      }
    }),

  submitConfession: protectedProcedure
    .input(
      z.object({
        tripId: z.string().uuid(),
        confession: z.string().min(10).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // TYPE-02: submit_confession RPC not in generated types.
      type RpcClient = {
        rpc: (
          fn: string,
          args: Record<string, string>
        ) => Promise<{ data: unknown; error: { message: string } | null }>;
      };
      const { data, error } = await (ctx.supabase as unknown as RpcClient).rpc(
        'submit_confession',
        {
          p_trip_id: input.tripId,
          p_confession: input.confession,
        }
      );

      const res = data as unknown as ConfessionResult;
      if (error || res?.error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: res?.error || error?.message || 'Failed',
        });
      }

      return { success: true };
    }),

  markAbsent: protectedProcedure
    .input(
      z.object({
        tripId: z.string().uuid(),
        userId: z.string().uuid(),
        reason: z.string().max(200).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data: tripRawAbsent } = await ctx.supabase
        .from('trips')
        .select('creator_id')
        .eq('id', input.tripId)
        .single();
      const trip = tripRawAbsent as TripCreatorRow | null;

      if (!trip || trip.creator_id !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      // Verify the target user is actually a member of this trip
      const { data: targetMember } = await ctx.supabase
        .from('trip_members')
        .select('id')
        .eq('trip_id', input.tripId)
        .eq('user_id', input.userId)
        .single();

      if (!targetMember) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'That user is not a member of this trip',
        });
      }

      // TYPE-02: absence_reason added post-codegen; use local type override.
      type TripMemberAbsenceUpdate = { status: string; absence_reason?: string };
      type TripMemberUpdateClient = {
        from: (t: 'trip_members') => {
          update: (d: TripMemberAbsenceUpdate) => {
            eq: (c: string, v: string) => { eq: (c: string, v: string) => Promise<unknown> };
          };
        };
      };
      await (ctx.supabase as unknown as TripMemberUpdateClient)
        .from('trip_members')
        .update({
          status: 'absent',
          absence_reason: input.reason,
        })
        .eq('trip_id', input.tripId)
        .eq('user_id', input.userId);

      // REL-01: durable queue — survives worker cold-starts on Render free tier.
      // background_jobs.trip_id is NOT NULL so we use input.tripId.
      // payload carries absent_user_id so the worker's generate_missing_person() call has it.
      // Using service client because background_jobs has service-role-only RLS (Phase 1).
      const admin = createSupabaseServiceClient();
      // TYPE-02: BackgroundJobInsert is a local type — background_jobs added post-codegen.
      type BackgroundJobClient = {
        from: (t: 'background_jobs') => {
          insert: (d: BackgroundJobInsert) => Promise<{ error: { message: string } | null }>;
        };
      };
      const { error: jobError } = await (admin as unknown as BackgroundJobClient)
        .from('background_jobs')
        .insert({
          trip_id: input.tripId,
          job_type: 'missing_person_card',
          status: 'pending',
          payload: { absent_user_id: input.userId },
        });

      if (jobError) {
        // Non-fatal: the member is already marked absent. Log so Langfuse/Render logs surface it.
        logger.error(
          { procedure: 'trips.markAbsent', userId: ctx.user.id, tripId: input.tripId },
          `failed to enqueue background job: ${jobError.message}`
        );
      }

      return { success: true };
    }),

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
      // TYPE-02: lore_status and processing_started_at added post-codegen.
      type TripResetClient = {
        from: (t: 'trips') => {
          update: (d: TripStatusUpdate) => {
            eq: (c: string, v: string) => { eq: (c: string, v: string) => Promise<unknown> };
          };
        };
      };
      await (admin as unknown as TripResetClient)
        .from('trips')
        .update({ lore_status: 'failed', processing_started_at: null })
        .eq('id', input.tripId)
        .eq('lore_status', 'processing'); // atomic guard against race with worker completing

      return { reset: true };
    }),

  upgradeTier: protectedProcedure
    .input(
      z.object({
        tripId: z.string().uuid(),
        tier: z.enum(['digital', 'print']),
        paymentId: z.string(),
        orderId: z.string(),
        signature: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Ownership + idempotency check BEFORE touching the payment signature —
      // prevents replaying a valid signature from trip A against trip B.
      const { data: tripRawUpgrade } = await ctx.supabase
        .from('trips')
        .select('creator_id, tier')
        .eq('id', input.tripId)
        .single();
      const trip = tripRawUpgrade as TripUpgradeRow | null;
      if (!trip || trip.creator_id !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorised for this trip' });
      }
      if (trip.tier !== 'free') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Trip already upgraded' });
      }

      // Verify Razorpay signature
      const expectedSig = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
        .update(input.orderId + '|' + input.paymentId)
        .digest('hex');
      if (expectedSig !== input.signature) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Payment signature invalid' });
      }

      // payment_id / expires_at may not yet be in generated types — use service role for update
      // TYPE-02: payment_id and expires_at added post-codegen.
      type TripPaymentUpdate = { tier: string; payment_id: string; expires_at: null };
      type TripPaymentClient = {
        from: (t: 'trips') => {
          update: (d: TripPaymentUpdate) => {
            eq: (
              c: string,
              v: string
            ) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> };
          };
        };
      };
      const admin = createSupabaseServiceClient();
      const { error } = await (admin as unknown as TripPaymentClient)
        .from('trips')
        .update({ tier: input.tier, payment_id: input.paymentId, expires_at: null })
        .eq('id', input.tripId)
        .eq('creator_id', ctx.user.id);

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

      return { success: true };
    }),

  // PROD-02: Allow trip creator to show/hide the public /t/[code]/story page.
  // Only the trip creator can toggle this; members cannot hide someone else's story.
  updateStoryVisibility: protectedProcedure
    .input(
      z.object({
        tripId: z.string().uuid(),
        visible: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify caller is the trip creator before touching story_visible.
      const { data: tripVisRaw } = await ctx.supabase
        .from('trips')
        .select('creator_id')
        .eq('id', input.tripId)
        .single();

      const tripVisCheck = tripVisRaw as TripCreatorRow | null;
      if (!tripVisCheck || tripVisCheck.creator_id !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the trip creator can change story visibility.',
        });
      }

      // TYPE-02: story_visible added post-codegen; use local type override.
      type StoryVisibilityUpdate = { story_visible: boolean };
      type StoryVisibilityClient = {
        from: (t: 'trips') => {
          update: (d: StoryVisibilityUpdate) => {
            eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
          };
        };
      };
      const adminVis = createSupabaseServiceClient();
      const { error: visError } = await (adminVis as unknown as StoryVisibilityClient)
        .from('trips')
        .update({ story_visible: input.visible })
        .eq('id', input.tripId);

      if (visError)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: visError.message });

      return { success: true, visible: input.visible };
    }),

  getChaosDistribution: protectedProcedure.query(async ({ ctx }) => {
    // PERF-03: return cached distribution if within 10-minute TTL.
    const cached = chaosDistCache.get('global');
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }

    // PERF-03 / SCALABILITY: query chaos_distribution_cache materialized view instead of
    // doing a full `trips` table scan.  The view is refreshed hourly by /api/cron/refresh-chaos.
    // Fall back to the trips table if the view isn't populated yet (e.g. fresh deployment).
    //
    // ARCH-05: the materialized view contains ALL ready trips (not scoped to the user).
    // We use it for the global percentile distribution (p50/p75/p90) which is intentionally
    // anonymous — it tells a user where their trip ranks among all trips on the platform.
    // No trip names or user IDs are exposed; chaos_score alone is returned.
    // TYPE-02: chaos_distribution_cache not in generated types; use local cast.
    type CacheRow = { chaos_score: number };
    const { data: viewData, error: viewError } = await createSupabaseServiceClient()
      .from('chaos_distribution_cache' as never)
      .select('chaos_score');

    // If the view doesn't exist yet (pre-migration deployment), fall back to direct query.
    const rawData: CacheRow[] =
      !viewError && viewData
        ? (viewData as unknown as CacheRow[])
        : await (async () => {
            const { data: fallback } = await ctx.supabase
              .from('trips')
              .select('chaos_score')
              .eq('lore_status', 'ready')
              .not('chaos_score', 'is', null);
            return (fallback || []) as CacheRow[];
          })();

    const scores = rawData
      .map(r => r.chaos_score)
      .filter((s): s is number => s != null && s > 0)
      .sort((a, b) => a - b);

    if (scores.length < 10) {
      // Cache the null result too to avoid hammering the DB on new installs
      chaosDistCache.set('global', { data: null, expiry: Date.now() + CHAOS_CACHE_TTL_MS });
      return null;
    }

    const at = (pct: number) =>
      scores[Math.min(Math.floor((scores.length * pct) / 100), scores.length - 1)];
    const result = { p50: at(50), p75: at(75), p90: at(90), total: scores.length };

    // PERF-03: persist computed result with TTL.
    chaosDistCache.set('global', { data: result, expiry: Date.now() + CHAOS_CACHE_TTL_MS });

    return result;
  }),

  // FREEMIUM-01: Let the generating page check whether this is the user's first completed trip.
  // Used to show "Your first trip is on us" messaging during generation.
  isFirstGeneration: protectedProcedure.query(async ({ ctx }) => {
    const admin = createSupabaseServiceClient();
    const { count: completedTrips } = await admin
      .from('trips')
      .select('id', { count: 'exact', head: true })
      .eq('creator_id', ctx.user.id)
      .eq('lore_status', 'ready');
    return { isFirstTrip: (completedTrips ?? 0) === 0 };
  }),

  // Warm up the AI worker before the user clicks "Generate Lore".
  // Called client-side when photoCount first reaches 5 — gives Render free tier
  // 30-60s to exit cold start before the actual generation request fires.
  //
  // COST-05: Skip the /health call if the worker was successfully warmed within
  // the last 10 minutes for this user.  The cache is module-level and resets on
  // cold start, which is acceptable — this is a pure traffic-reduction optimisation.
  warmupWorker: protectedProcedure.mutation(async ({ ctx }) => {
    const workerUrl = process.env.AI_WORKER_URL;
    if (!workerUrl || workerUrl.includes('localhost')) return { ok: false, cached: false };

    const userId = ctx.user.id;
    const lastWarmed = _warmupCache.get(userId) ?? 0;
    const now = Date.now();

    if (now - lastWarmed < WARMUP_TTL_MS) {
      // Still within the 10-minute window — skip the HTTP call
      return { ok: true, cached: true };
    }

    try {
      const resp = await fetch(`${workerUrl}/health`, { signal: AbortSignal.timeout(5000) });
      if (resp.ok) {
        _warmupCache.set(userId, now);
      }
      return { ok: resp.ok, cached: false };
    } catch {
      return { ok: false, cached: false };
    }
  }),

  // ONBOARDING: Cross-trip "On This Day" nostalgia feed.
  // Returns photos from trips taken around the same time in prior years.
  // Delegates to the get_nostalgia_moments RPC (defined in 005_photo_embeddings.sql).
  getNostalgiaFeed: protectedProcedure.query(async ({ ctx }) => {
    // TYPE-02: get_nostalgia_moments RPC not in generated types (added post-codegen).
    type NostalgiaRpcClient = {
      rpc: (
        fn: string,
        args: Record<string, unknown>
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    };
    const { data, error } = await (ctx.supabase as unknown as NostalgiaRpcClient).rpc(
      'get_nostalgia_moments',
      {
        p_user_id: ctx.user.id,
        p_limit: 4,
      }
    );
    if (error) {
      // Non-fatal: return empty list rather than surfacing a 500 to the trips dashboard
      logger.warn(
        { procedure: 'trips.getNostalgiaFeed', userId: ctx.user.id },
        `get_nostalgia_moments RPC failed: ${error.message}`
      );
      return [];
    }
    const rows =
      (data as unknown as Array<{
        photo_id: string;
        trip_id: string;
        trip_name: string;
        trip_year: number;
        destination: string | null;
        storage_path: string;
        thumbnail_path: string | null;
        chaos_score: number | null;
        years_ago: number;
        lore_tagline: string | null;
      }> | null) ?? [];
    if (rows.length === 0) return [];

    // Generate signed URLs so thumbnails render client-side
    const adminSupabase = createSupabaseServiceClient();
    const paths = rows.flatMap(r => [r.storage_path, r.thumbnail_path].filter(Boolean)) as string[];
    const { data: signed } = await adminSupabase.storage
      .from('trip-photos')
      .createSignedUrls(paths, 3600);
    const urlByPath = new Map<string, string>();
    (signed ?? []).forEach(u => {
      if (u.signedUrl && u.path) urlByPath.set(u.path, u.signedUrl);
    });

    return rows.map(r => ({
      ...r,
      url: urlByPath.get(r.storage_path) ?? null,
      thumbnailUrl: r.thumbnail_path ? (urlByPath.get(r.thumbnail_path) ?? null) : null,
    }));
  }),

  // MOAT: Similar public trips discovery using CLIP embeddings.
  // Finds public trips with visually similar photos to a given trip.
  getSimilarPublicTrips: protectedProcedure
    .input(z.object({ tripId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const adminSupabase = createSupabaseServiceClient();

      // Get a representative photo from this trip — first one with a completed embedding
      const { data: photos } = await adminSupabase
        .from('photos')
        .select('id')
        .eq('trip_id', input.tripId)
        .eq('embedding_status', 'complete')
        .limit(1);

      if (!photos?.[0]) return [];

      // Find visually similar photos (RPC filters to trips the user is a member of).
      // We use the service client here so we also discover public trips outside the
      // user's membership — the RLS bypass is intentional for this discovery surface.
      type SimilarRpcClient = {
        rpc: (
          fn: string,
          args: Record<string, unknown>
        ) => Promise<{ data: unknown; error: { message: string } | null }>;
      };
      const { data: similarPhotos, error: rpcError } = await (
        adminSupabase as unknown as SimilarRpcClient
      ).rpc('find_similar_photos', {
        p_photo_id: photos[0].id,
        p_user_id: ctx.user.id,
        p_limit: 10, // over-fetch to allow for public-trip filtering
      });

      if (rpcError) {
        logger.warn(
          { procedure: 'trips.getSimilarPublicTrips', userId: ctx.user.id, tripId: input.tripId },
          `find_similar_photos RPC failed: ${rpcError.message}`
        );
        return [];
      }

      const rows =
        (similarPhotos as unknown as Array<{
          photo_id: string;
          trip_id: string;
          trip_name: string;
          storage_path: string;
          thumbnail_path: string | null;
          similarity: number;
          trip_year: number;
          destination: string | null;
        }> | null) ?? [];

      // Deduplicate by trip_id, exclude the source trip
      const seen = new Set<string>([input.tripId]);
      const unique = rows.filter(r => {
        if (seen.has(r.trip_id)) return false;
        seen.add(r.trip_id);
        return true;
      });

      if (unique.length === 0) return [];

      // Fetch trip metadata — only return public, ready trips with a visible story
      const tripIds = unique.map(r => r.trip_id);
      const { data: tripMeta } = await adminSupabase
        .from('trips')
        .select('id, name, destination, chaos_score, lore_json')
        .in('id', tripIds)
        .eq('lore_status', 'ready')
        .eq('story_visible', true);

      if (!tripMeta || tripMeta.length === 0) return [];

      const metaById = new Map(
        (
          tripMeta as Array<{
            id: string;
            name: string;
            destination: string | null;
            chaos_score: number | null;
            lore_json: unknown;
          }>
        ).map(t => [t.id, t])
      );

      // Generate thumbnail signed URLs for the representative photos
      const repPhotos = unique.slice(0, 3);
      const thumbPaths = repPhotos.flatMap(r =>
        [r.thumbnail_path, r.storage_path].filter(Boolean)
      ) as string[];
      const { data: signed } = await adminSupabase.storage
        .from('trip-photos')
        .createSignedUrls(thumbPaths, 3600);
      const urlByPath = new Map<string, string>();
      (signed ?? []).forEach(u => {
        if (u.signedUrl && u.path) urlByPath.set(u.path, u.signedUrl);
      });

      return repPhotos
        .map(r => {
          const meta = metaById.get(r.trip_id);
          if (!meta) return null;
          return {
            tripId: r.trip_id,
            tripName: meta.name,
            destination: meta.destination ?? 'Unknown',
            chaosScore: meta.chaos_score ?? 0,
            tagline: (meta.lore_json as any)?.tagline ?? null,
            thumbnailUrl:
              (r.thumbnail_path ? urlByPath.get(r.thumbnail_path) : null) ??
              urlByPath.get(r.storage_path) ??
              null,
            similarity: r.similarity,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .slice(0, 3);
    }),

  // VIRAL-01: Public showcase feed for the landing page — no auth required.
  // Returns anonymised top-chaos trips so visitors see real social proof.
  getPublicShowcase: publicProcedure.query(async ({ ctx }) => {
    const admin = createSupabaseServiceClient();
    const { data } = await admin
      .from('trips')
      .select('id, name, destination, chaos_score, lore_json')
      .eq('lore_status', 'ready')
      .eq('story_visible', true)
      .order('chaos_score', { ascending: false })
      .limit(6);

    return (data ?? []).map((t: any) => ({
      id: t.id as string,
      destination: (t.destination as string | null) ?? 'Unknown',
      chaosScore: (t.chaos_score as number | null) ?? 0,
      tagline: (t.lore_json as any)?.tagline ?? null,
    }));
  }),
});
