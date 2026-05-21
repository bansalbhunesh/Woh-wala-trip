import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../init';
import { TRPCError } from '@trpc/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { langfuse } from '@/lib/langfuse';
import { logger } from '@/lib/logger';
import { signWorkerRequest } from '@/lib/worker-auth';
import { Redis } from '@upstash/redis';
// TYPE-01 resolved: database.types.ts regenerated 2026-05-19.
// Only RPC result shapes remain in supabase-extended.types.ts.
import type {
  SupabaseRpcClient,
  ListUserTripsArgs,
  ListUserTripsRow,
  GetTripFullResult,
  JoinTripResult,
  ConfessionResult,
  NostalgiaRow,
  SimilarPhotoRow,
  ClaimLoreResult,
} from '@/lib/supabase-extended.types';
import type { Database } from '@/lib/database.types';
import type { LoreJson } from '@/lib/types';

// Convenience aliases from the generated Database type — TYPE-01 fully resolved.
type TripRow = Database['public']['Tables']['trips']['Row'];
type TripUpdate = Database['public']['Tables']['trips']['Update'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
type TripMemberUpdate = Database['public']['Tables']['trip_members']['Update'];
type BackgroundJobInsert = Database['public']['Tables']['background_jobs']['Insert'];
type YearlyWrapRow = Database['public']['Tables']['yearly_wraps']['Row'];
type YearlyWrapInsert = Database['public']['Tables']['yearly_wraps']['Insert'];
type GenerationJobInsert = Database['public']['Tables']['generation_jobs']['Insert'];
type ChaosDistributionRow = Database['public']['Views']['chaos_distribution_cache']['Row'];

// Structural aliases — subset of generated row types used for query result shapes
type TripCreatorRow = Pick<TripRow, 'creator_id'>;
type TripUpgradeRow = Pick<TripRow, 'creator_id' | 'tier'>;
type TripSummary = Pick<
  TripRow,
  | 'id'
  | 'name'
  | 'destination'
  | 'trip_start_date'
  | 'trip_end_date'
  | 'lore_status'
  | 'lore_json'
  | 'chaos_score'
  | 'member_count'
  | 'total_photos'
  | 'tier'
  | 'created_at'
>;
type ProfileReferralUpdate = Pick<
  ProfileUpdate,
  'referral_counted' | 'referral_count' | 'referral_bonus_unlocked' | 'invited_by_user_id'
>;
type ProfileTokenUsage = Pick<
  ProfileRow,
  'referral_bonus_unlocked' | 'generation_tokens_used_this_month' | 'generation_tokens_month'
>;
type TripMemberAbsenceUpdate = Pick<TripMemberUpdate, 'status' | 'absence_reason'>;
type TripStatusUpdate = Pick<TripUpdate, 'lore_status' | 'processing_started_at'>;
type TripPaymentUpdate = Pick<TripUpdate, 'tier' | 'payment_id' | 'expires_at'>;
type StoryVisibilityUpdate = Pick<TripUpdate, 'story_visible'>;
// YearlyWrapUpsert extends the generated Insert type with trip_ids/status columns
// added in migration 2026051908_yearly_wraps_columns.sql
type YearlyWrapUpsert = YearlyWrapInsert & { trip_ids?: string[]; status?: string };
type GenerationJobUpsert = GenerationJobInsert;

// ListUserTripsClient: typed RPC wrapper for the list_user_trips pagination function
type ListUserTripsClient = {
  rpc: (
    fn: 'list_user_trips',
    args: ListUserTripsArgs
  ) => Promise<{ data: ListUserTripsRow[] | null; error: { message: string } | null }>;
};

// COST-05: Server-side warmupWorker cache.
// Maps userId → Unix timestamp (ms) of the last successful warmup call.
// Resets on cold start (acceptable — this is purely an optimisation to reduce
// redundant Render /health calls, not a correctness requirement).
const _warmupCache = new Map<string, number>();
const WARMUP_TTL_MS = 10 * 60 * 1000; // 10 minutes

// PERF-03: Redis-backed cache for getChaosDistribution (10-minute TTL).
// In production each Vercel function instance shares the same Upstash Redis store, so a
// single DB query populates the cache for all concurrent instances simultaneously —
// replacing the old module-level Map that gave every cold-start instance its own empty
// cache and triggered 50 simultaneous full-table scans under traffic.
//
// Fallback strategy (matches the pattern in @/lib/anti-spam.ts):
//   - Redis configured → always use Redis; never fall back to in-memory in production.
//   - Redis absent    → in-memory fallback, accepted in dev; blocked in production by the
//     existing UPSTASH_* requirement that anti-spam already enforces.
const CHAOS_REDIS_KEY = 'chaos_dist:global';
const CHAOS_CACHE_TTL_S = 600; // 10 min (Redis `ex` param, in seconds)
const CHAOS_CACHE_TTL_MS = CHAOS_CACHE_TTL_S * 1000; // for in-memory fallback only

// Initialise the Redis client once per module so it is reused across warm invocations.
const _redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const _redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const chaosCacheRedis =
  _redisUrl && _redisToken ? new Redis({ url: _redisUrl, token: _redisToken }) : null;

type ChaosDist = { p50: number; p75: number; p90: number; total: number };

// Module-level in-memory fallback — used ONLY when Redis is not configured (dev only).
const _chaosDistMemCache = new Map<'global', { data: ChaosDist | null; expiry: number }>();
const _publicShowcaseMemCache = new Map<'global', { data: any[]; expiry: number }>();
const _similarPublicTripsMemCache = new Map<string, { data: any[]; expiry: number }>();

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
        // Mark this user as counted so future trips don't fire again.
        // ProfileEqUpdateClient uses ProfileReferralUpdate from supabase-extended.types.ts.
        type ProfileEqUpdateClient = {
          from: (t: 'profiles') => {
            update: (d: ProfileReferralUpdate) => {
              eq: (c: string, v: string) => Promise<unknown>;
            };
          };
        };
        await (admin as unknown as ProfileEqUpdateClient)
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
        await (admin as unknown as ProfileEqUpdateClient)
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
      // SupabaseRpcClient from supabase-extended.types.ts — generic RPC wrapper.
      const { data, error } = await (ctx.supabase as unknown as SupabaseRpcClient).rpc(
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

      // GetTripFullResult from supabase-extended.types.ts
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
      // SupabaseRpcClient from supabase-extended.types.ts
      const { data, error } = await (ctx.supabase as unknown as SupabaseRpcClient).rpc(
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

      // JoinTripResult from supabase-extended.types.ts
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
          // ProfileEqIsUpdateClient uses ProfileReferralUpdate from supabase-extended.types.ts.
          type ProfileEqIsUpdateClient = {
            from: (t: 'profiles') => {
              update: (d: ProfileReferralUpdate) => {
                eq: (c: string, v: string) => { is: (c: string, v: null) => Promise<unknown> };
              };
            };
          };
          await (admin as unknown as ProfileEqIsUpdateClient)
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
      // PERF: Delegate sorting, cursor filtering, and page slicing to the DB via the
      // list_user_trips SECURITY DEFINER function (migration 2026051906_list_trips_paginated.sql).
      // This replaces the previous pattern of fetching up to 200 trip_member rows and
      // sorting/slicing them in application code.
      //
      // The function uses a single indexed scan (trip_members.user_id + trips.created_at DESC)
      // and returns at most LEAST(p_limit, 50) rows — no JS-side sort or filter needed.
      //
      // ListUserTripsClient + ListUserTripsArgs from supabase-extended.types.ts.
      const rpcArgs: ListUserTripsArgs = {
        p_user_id: ctx.user.id,
        p_limit: input.limit,
        ...(input.cursor ? { p_cursor: input.cursor } : {}),
      };

      const { data, error } = await (ctx.supabase as unknown as ListUserTripsClient).rpc(
        'list_user_trips',
        rpcArgs
      );

      if (error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });

      // TripSummary from supabase-extended.types.ts — cast and preserve the existing
      // return contract so all callers remain unaffected.
      const page = (data as unknown as TripSummary[]) ?? [];

      // Next cursor = created_at of the last trip on this page (undefined if last page).
      // When the page is shorter than the requested limit we are on the last page.
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
      // TripCreatorRow from supabase-extended.types.ts
      const trip = tripRaw as TripCreatorRow | null;

      if (!trip || trip.creator_id !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the creator can trigger generation',
        });
      }

      // Count actual photos via service client — avoids silent RLS failures on
      // ctx.supabase (user-scoped) returning null when photos exist but RLS
      // policies haven't propagated yet on a fresh session.
      const adminForCount = createSupabaseServiceClient();
      const { count: photoCount } = await adminForCount
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
      if (!workerUrl) {
        logger.error(
          { procedure: 'trips.generateLore', userId: ctx.user.id },
          'AI_WORKER_URL not set — lore engine unavailable'
        );
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Lore engine is temporarily unavailable. Please try again in a few minutes.',
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

      // REFERRAL-03: Check if user has an unclaimed referral bonus (3 successful referrals).
      // If so, this generation is free — skip the monthly token cap check.
      // The bonus is consumed (set to false) after a successful generation trigger below.
      // ProfileTokenUsage from supabase-extended.types.ts.
      const { data: profileRefRaw } = (await admin
        .from('profiles')
        .select(
          'referral_bonus_unlocked, generation_tokens_used_this_month, generation_tokens_month'
        )
        .eq('id', ctx.user.id)
        .single()) as unknown as { data: ProfileTokenUsage | null };
      const referralBonusActive = profileRefRaw?.referral_bonus_unlocked === true;

      // COST-01: Monthly token cap per user.
      // Configurable via MONTHLY_TOKEN_CAP_PER_USER env var (default 500,000 tokens
      // ≈ 8 full pipeline runs at ~60k tokens each).  The profiles trigger
      // (trg_increment_user_token_usage) keeps generation_tokens_used_this_month
      // current without requiring an extra write here.
      // Skip cap check if this is the first generation OR user has a referral bonus.
      if (!isFirstGeneration && !referralBonusActive) {
        const monthlyCap = parseInt(process.env.MONTHLY_TOKEN_CAP_PER_USER ?? '500000', 10);
        const profile = profileRefRaw;

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

      // Atomically claim the lore generation slot using a Postgres SECURITY DEFINER function.
      // This eliminates the race condition between the cross-trip activeJobs check and the
      // trip-level claim — both happen in a single serialized transaction with FOR UPDATE.
      // See migration: 2026051905_atomic_lore_claim.sql
      // SupabaseRpcClient from supabase-extended.types.ts; result narrowed below.
      const { data: claimResultRaw, error: claimError } = await (
        admin as unknown as SupabaseRpcClient
      ).rpc('claim_lore_generation', { p_trip_id: input.tripId, p_user_id: ctx.user.id });
      const claimResult = claimResultRaw as string | null;

      if (claimError) {
        logger.error(
          { procedure: 'trips.generateLore', userId: ctx.user.id, tripId: input.tripId },
          `claim_lore_generation RPC failed: ${claimError.message}`
        );
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to start generation',
        });
      }

      if (claimResult === 'already_processing') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'You already have a trip generating lore. Wait for it to finish before starting another.',
        });
      }

      if (claimResult === 'forbidden') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the creator can trigger generation',
        });
      }

      if (claimResult !== 'claimed') {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Unexpected claim result' });
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

        // REFERRAL-03: Consume the referral bonus after successful trigger.
        // Best-effort: never break generation if this fails.
        // ProfileEqUpdateClient uses ProfileReferralUpdate from supabase-extended.types.ts.
        if (referralBonusActive) {
          type ProfileEqUpdateClient = {
            from: (t: 'profiles') => {
              update: (d: ProfileReferralUpdate) => {
                eq: (c: string, v: string) => Promise<unknown>;
              };
            };
          };
          await (admin as unknown as ProfileEqUpdateClient)
            .from('profiles')
            .update({ referral_bonus_unlocked: false })
            .eq('id', ctx.user.id);
        }

        return {
          status: 'processing' as const,
          isFirstTrip: isFirstGeneration,
          usedReferralBonus: referralBonusActive,
        };
      } catch (err) {
        // HTTP trigger failed — queue the job so the worker's polling loop picks it up
        // within 60 seconds. Don't reset lore_status to 'pending': it stays 'processing'
        // so the generating page keeps polling and the stuck-job cron handles any crash.
        // Note: `admin` is already declared in the outer scope above (COST-01 check).
        // GenerationJobUpsertClient uses GenerationJobUpsert from supabase-extended.types.ts.
        type GenerationJobUpsertClient = {
          from: (t: 'generation_jobs') => {
            upsert: (d: GenerationJobUpsert, opts: { onConflict: string }) => Promise<unknown>;
          };
        };
        await (admin as unknown as GenerationJobUpsertClient)
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
      // SupabaseRpcClient from supabase-extended.types.ts; ConfessionResult for return shape.
      const { data, error } = await (ctx.supabase as unknown as SupabaseRpcClient).rpc(
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

      // TripMemberAbsenceUpdateClient uses TripMemberAbsenceUpdate from supabase-extended.types.ts.
      type TripMemberAbsenceUpdateClient = {
        from: (t: 'trip_members') => {
          update: (d: TripMemberAbsenceUpdate) => {
            eq: (c: string, v: string) => { eq: (c: string, v: string) => Promise<unknown> };
          };
        };
      };
      await (ctx.supabase as unknown as TripMemberAbsenceUpdateClient)
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
      // BackgroundJobInsertClient uses BackgroundJobInsert from supabase-extended.types.ts.
      const admin = createSupabaseServiceClient();
      type BackgroundJobInsertClient = {
        from: (t: 'background_jobs') => {
          insert: (d: BackgroundJobInsert) => Promise<{ error: { message: string } | null }>;
        };
      };
      const { error: jobError } = await (admin as unknown as BackgroundJobInsertClient)
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

      // TripStatusResetClient uses TripStatusUpdate from supabase-extended.types.ts.
      const admin = createSupabaseServiceClient();
      type TripStatusResetClient = {
        from: (t: 'trips') => {
          update: (d: TripStatusUpdate) => {
            eq: (c: string, v: string) => { eq: (c: string, v: string) => Promise<unknown> };
          };
        };
      };
      await (admin as unknown as TripStatusResetClient)
        .from('trips')
        .update({ lore_status: 'failed', processing_started_at: null })
        .eq('id', input.tripId)
        .eq('lore_status', 'processing'); // atomic guard against race with worker completing

      return { reset: true };
    }),

  resetLoreStatusToUpload: protectedProcedure
    .input(z.object({ tripId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: tripRaw } = await ctx.supabase
        .from('trips')
        .select('creator_id')
        .eq('id', input.tripId)
        .single();
      const trip = tripRaw as { creator_id: string } | null;

      if (!trip || trip.creator_id !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      type TripStatusResetSingleClient = {
        from: (t: 'trips') => {
          update: (d: TripStatusUpdate) => {
            eq: (c: string, v: string) => Promise<unknown>;
          };
        };
      };

      await (ctx.supabase as unknown as TripStatusResetSingleClient)
        .from('trips')
        .update({ lore_status: null, processing_started_at: null })
        .eq('id', input.tripId);

      return { success: true };
    }),

  upgradeTier: protectedProcedure
    .input(
      z.object({
        tripId: z.string().uuid(),
        // tier is still accepted so the client can hint what it expected, but the actual
        // tier is authoritative from the webhook write — we never trust client input for this.
        tier: z.enum(['digital', 'print']),
        paymentId: z.string(),
        // orderId and signature are intentionally removed: the webhook is the sole source of
        // truth for payment confirmation. Accepting a client-provided signature here created a
        // race condition (client could call before webhook) and a false sense of security
        // (signature only proves the order exists, not that money settled).
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Ownership check — prevents one user from polling another user's payment status.
      // TripUpgradeRow from supabase-extended.types.ts; extended with webhook_payment_id column.
      type TripUpgradeWithWebhook = TripUpgradeRow & { webhook_payment_id: string | null };
      type TripWebhookSelectClient = {
        from: (t: 'trips') => {
          select: (cols: string) => {
            eq: (
              c: string,
              v: string
            ) => {
              single: () => Promise<{ data: TripUpgradeWithWebhook | null }>;
            };
          };
        };
      };
      const admin = createSupabaseServiceClient();
      const { data: tripRow } = await (admin as unknown as TripWebhookSelectClient)
        .from('trips')
        .select('creator_id, tier, webhook_payment_id')
        .eq('id', input.tripId)
        .single();

      const trip = tripRow as TripUpgradeWithWebhook | null;
      if (!trip || trip.creator_id !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorised for this trip' });
      }

      // If the trip is already upgraded (any non-free tier), return success idempotently.
      // This handles the case where the webhook fired before the client called this mutation.
      if (trip.tier !== 'free') {
        return { success: true, alreadyUpgraded: true };
      }

      // webhook_payment_id is stamped by the webhook handler (route.ts) when Razorpay confirms
      // the payment. If it is not set, the webhook has not fired yet — the payment is pending.
      // The client should poll this mutation or wait for a real-time DB subscription update.
      if (!trip.webhook_payment_id) {
        // Payment pending — webhook hasn't confirmed yet. Return a typed pending state so the
        // client can show a "confirming payment…" UI rather than a hard error.
        return { success: false, pending: true } as const;
      }

      // Webhook has confirmed: webhook_payment_id is set, meaning Razorpay's authoritative
      // signal (payment.captured or subscription.charged) already wrote the upgrade.
      // The tier on this row should already be non-free, but guard defensively.
      // If for some reason the tier wasn't updated (e.g. a partial DB failure on the webhook
      // path), we can complete the upgrade now using the webhook_payment_id as proof.
      // TripPaymentUpdateClient uses TripPaymentUpdate from supabase-extended.types.ts.
      type TripPaymentUpdateClient = {
        from: (t: 'trips') => {
          update: (d: TripPaymentUpdate) => {
            eq: (
              c: string,
              v: string
            ) => {
              eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
            };
          };
        };
      };
      const { error } = await (admin as unknown as TripPaymentUpdateClient)
        .from('trips')
        .update({ tier: input.tier, payment_id: trip.webhook_payment_id, expires_at: null })
        .eq('id', input.tripId)
        .eq('creator_id', ctx.user.id);

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

      return { success: true, alreadyUpgraded: false };
    }),

  // REFERRAL-01: Capture referral linkage when a new user arrives via ?ref=USERNAME.
  // Called client-side on first auth (OTP verify / OAuth) with the referrer's username
  // extracted from the landing URL. Idempotent — sets invited_by_user_id only once
  // (first call wins; subsequent calls with the same or a different username are no-ops).
  applyReferral: protectedProcedure
    .input(z.object({ referrerUsername: z.string().min(1).max(60) }))
    .mutation(async ({ ctx, input }) => {
      const admin = createSupabaseServiceClient();
      const joinerId = ctx.user.id;

      // Look up the referrer by username
      const { data: referrerProfile } = (await admin
        .from('profiles')
        .select('id')
        .eq('username', input.referrerUsername)
        .maybeSingle()) as unknown as { data: { id: string } | null };

      if (!referrerProfile) {
        // Not a hard error — bad referral codes should not break signup
        return { applied: false, reason: 'referrer_not_found' as const };
      }

      // Prevent self-referral
      if (referrerProfile.id === joinerId) {
        return { applied: false, reason: 'self_referral' as const };
      }

      // Idempotent update: only set invited_by_user_id if not already set (first join wins).
      // ProfileEqIsUpdateClient uses ProfileReferralUpdate from supabase-extended.types.ts.
      type ProfileEqIsUpdateClient = {
        from: (t: 'profiles') => {
          update: (d: ProfileReferralUpdate) => {
            eq: (
              c: string,
              v: string
            ) => { is: (c: string, v: null) => Promise<{ error: { message: string } | null }> };
          };
        };
      };
      const { error } = (await (admin as unknown as ProfileEqIsUpdateClient)
        .from('profiles')
        .update({ invited_by_user_id: referrerProfile.id })
        .eq('id', joinerId)
        .is('invited_by_user_id', null)) as { error: { message: string } | null };

      if (error) {
        logger.error(
          { procedure: 'trips.applyReferral', userId: joinerId },
          `referral apply failed: ${error.message}`
        );
        return { applied: false, reason: 'db_error' as const };
      }

      return { applied: true };
    }),

  // REFERRAL-02: Return current user's profile info needed for the referral share UI
  // (username, referral_count, referral_bonus_unlocked).
  getReferralStatus: protectedProcedure.query(async ({ ctx }) => {
    const admin = createSupabaseServiceClient();
    const { data } = (await admin
      .from('profiles')
      .select('username, referral_count, referral_bonus_unlocked')
      .eq('id', ctx.user.id)
      .single()) as unknown as {
      data: {
        username: string | null;
        referral_count: number;
        referral_bonus_unlocked: boolean;
      } | null;
    };
    return {
      username: data?.username ?? null,
      referralCount: data?.referral_count ?? 0,
      bonusUnlocked: data?.referral_bonus_unlocked ?? false,
    };
  }),

  // PROD-02: Allow trip creator to show/hide the public /t/[code]/story page.
  // Only the trip creator can toggle this; members cannot hide someone else's story.
  setStoryVisible: protectedProcedure
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

      type StoryVisibilityUpdateClient = {
        from: (t: 'trips') => {
          update: (d: StoryVisibilityUpdate) => {
            eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
          };
        };
      };
      const adminVis = createSupabaseServiceClient();
      const { error: visError } = await (adminVis as unknown as StoryVisibilityUpdateClient)
        .from('trips')
        .update({ story_visible: input.visible })
        .eq('id', input.tripId);

      if (visError)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: visError.message });

      return { success: true, visible: input.visible };
    }),

  exportArchive: protectedProcedure
    .input(z.object({ tripId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: member } = await ctx.supabase
        .from('trip_members')
        .select('id')
        .eq('trip_id', input.tripId)
        .eq('user_id', ctx.user.id)
        .single();

      if (!member) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not a member of this trip',
        });
      }

      const { data: trip } = await ctx.supabase
        .from('trips')
        .select('name, destination, lore_json, invite_code, tier, chaos_score')
        .eq('id', input.tripId)
        .single();

      if (!trip) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Trip not found',
        });
      }

      const { data: photos } = await ctx.supabase
        .from('photos')
        .select('storage_path, created_at')
        .eq('trip_id', input.tripId);

      const adminSupabase = createSupabaseServiceClient();
      const photoPaths = ((photos || []) as any[]).map(p => p.storage_path);
      let signedPhotos: { path: string; signedUrl: string }[] = [];

      if (photoPaths.length > 0) {
        const { data: signed } = await adminSupabase.storage
          .from('trip-photos')
          .createSignedUrls(photoPaths, 86400);
        signedPhotos = (signed || []).map(s => ({
          path: s.path ?? '',
          signedUrl: s.signedUrl ?? '',
        }));
      }

      const t = trip as any;
      return {
        trip: {
          name: t.name,
          destination: t.destination,
          lore_json: t.lore_json,
          invite_code: t.invite_code,
          tier: t.tier,
          chaos_score: t.chaos_score,
        },
        photos: signedPhotos,
      };
    }),

  getChaosDistribution: protectedProcedure.query(async ({ ctx }) => {
    // PERF-03: check Redis cache first (shared across all Vercel instances).
    // Falls back to the module-level in-memory Map only in dev when Redis is absent.
    if (chaosCacheRedis) {
      try {
        const cached = await chaosCacheRedis.get<ChaosDist | null>(CHAOS_REDIS_KEY);
        // Redis.get returns null on cache miss; any other value means a cache hit.
        // The sentinel string 'null' is used to cache the "not enough data" result.
        if (cached !== null) {
          // 'null' sentinel → not enough trips yet; return null to callers.
          return (cached as unknown) === 'null' ? null : (cached as ChaosDist);
        }
        // Cache miss — fall through to DB query below.
      } catch (redisErr) {
        // Redis read failure — log and fall through to recompute from DB.
        // In production we never silently fall back to in-memory (each instance
        // would recompute independently, defeating the purpose of the cache).
        logger.warn(
          { procedure: 'trips.getChaosDistribution' },
          `Redis GET failed, recomputing from DB: ${(redisErr as Error).message}`
        );
      }
    } else {
      // Development-only in-memory fallback (Redis not configured).
      const memCached = _chaosDistMemCache.get('global');
      if (memCached && Date.now() < memCached.expiry) {
        return memCached.data;
      }
    }

    // PERF-03 / SCALABILITY: query chaos_distribution_cache materialized view instead of
    // doing a full `trips` table scan.  The view is refreshed hourly by /api/cron/refresh-chaos.
    // Fall back to the trips table if the view isn't populated yet (e.g. fresh deployment).
    //
    // ARCH-05: the materialized view contains ALL ready trips (not scoped to the user).
    // We use it for the global percentile distribution (p50/p75/p90) which is intentionally
    // anonymous — it tells a user where their trip ranks among all trips on the platform.
    // No trip names or user IDs are exposed; chaos_score alone is returned.
    // ChaosDistributionRow from supabase-extended.types.ts covers the materialized view row shape.
    const { data: viewData, error: viewError } = await createSupabaseServiceClient()
      .from('chaos_distribution_cache')
      .select('chaos_score');

    // If the view doesn't exist yet (pre-migration deployment), fall back to direct query.
    const rawData: ChaosDistributionRow[] =
      !viewError && viewData
        ? (viewData as unknown as ChaosDistributionRow[])
        : await (async () => {
            const { data: fallback } = await ctx.supabase
              .from('trips')
              .select('chaos_score')
              .eq('lore_status', 'ready')
              .not('chaos_score', 'is', null);
            return (fallback || []) as ChaosDistributionRow[];
          })();

    const scores = rawData
      .map(r => r.chaos_score)
      .filter((s): s is number => s != null && s > 0)
      .sort((a, b) => a - b);

    // PERF-03: persist computed result with TTL.
    if (scores.length < 10) {
      // Cache the null result too (as the sentinel string 'null') to avoid
      // hammering the DB on new installs where there aren't enough trips yet.
      if (chaosCacheRedis) {
        try {
          await chaosCacheRedis.set(CHAOS_REDIS_KEY, 'null', { ex: CHAOS_CACHE_TTL_S });
        } catch (e) {
          logger.warn(
            { procedure: 'trips.getChaosDistribution' },
            `Redis SET failed: ${(e as Error).message}`
          );
        }
      } else {
        _chaosDistMemCache.set('global', { data: null, expiry: Date.now() + CHAOS_CACHE_TTL_MS });
      }
      return null;
    }

    const at = (pct: number) =>
      scores[Math.min(Math.floor((scores.length * pct) / 100), scores.length - 1)];
    const result: ChaosDist = { p50: at(50), p75: at(75), p90: at(90), total: scores.length };

    if (chaosCacheRedis) {
      try {
        await chaosCacheRedis.set(CHAOS_REDIS_KEY, JSON.stringify(result), {
          ex: CHAOS_CACHE_TTL_S,
        });
      } catch (e) {
        logger.warn(
          { procedure: 'trips.getChaosDistribution' },
          `Redis SET failed: ${(e as Error).message}`
        );
      }
    } else {
      _chaosDistMemCache.set('global', { data: result, expiry: Date.now() + CHAOS_CACHE_TTL_MS });
    }

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
    // SupabaseRpcClient from supabase-extended.types.ts; NostalgiaRow for result shape.
    const { data, error } = await (ctx.supabase as unknown as SupabaseRpcClient).rpc(
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
    // NostalgiaRow from supabase-extended.types.ts
    const rows = (data as unknown as NostalgiaRow[] | null) ?? [];
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
      const cacheKey = `similar_trips:${input.tripId}:${ctx.user.id}`;
      if (chaosCacheRedis) {
        try {
          const cached = await chaosCacheRedis.get<any[] | null>(cacheKey);
          if (cached !== null) {
            return cached;
          }
        } catch (redisErr) {
          logger.warn(
            { procedure: 'trips.getSimilarPublicTrips', userId: ctx.user.id, tripId: input.tripId },
            `Redis GET failed, recomputing from DB: ${(redisErr as Error).message}`
          );
        }
      } else {
        const memCached = _similarPublicTripsMemCache.get(cacheKey);
        if (memCached && Date.now() < memCached.expiry) {
          return memCached.data;
        }
      }

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
      // SupabaseRpcClient from supabase-extended.types.ts.
      const { data: similarPhotos, error: rpcError } = await (
        adminSupabase as unknown as SupabaseRpcClient
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

      // SimilarPhotoRow from supabase-extended.types.ts
      const rows = (similarPhotos as unknown as SimilarPhotoRow[] | null) ?? [];

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

      const result = repPhotos
        .map(r => {
          const meta = metaById.get(r.trip_id);
          if (!meta) return null;
          return {
            tripId: r.trip_id,
            tripName: meta.name,
            destination: meta.destination ?? 'Unknown',
            chaosScore: meta.chaos_score ?? 0,
            tagline: (meta.lore_json as LoreJson | null)?.tagline ?? null,
            thumbnailUrl:
              (r.thumbnail_path ? urlByPath.get(r.thumbnail_path) : null) ??
              urlByPath.get(r.storage_path) ??
              null,
            similarity: r.similarity,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .slice(0, 3);

      if (chaosCacheRedis) {
        try {
          await chaosCacheRedis.set(cacheKey, JSON.stringify(result), {
            ex: CHAOS_CACHE_TTL_S,
          });
        } catch (e) {
          logger.warn(
            { procedure: 'trips.getSimilarPublicTrips', userId: ctx.user.id, tripId: input.tripId },
            `Redis SET failed: ${(e as Error).message}`
          );
        }
      } else {
        _similarPublicTripsMemCache.set(cacheKey, {
          data: result,
          expiry: Date.now() + CHAOS_CACHE_TTL_MS,
        });
      }

      return result;
    }),

  // FEAT-V2-01: Generate a yearly wrap for the calling user.
  // Fetches all their lore-ready trips from the given year, triggers the AI worker,
  // and returns the trip count so the UI can show a "processing" state.
  generateYearlyWrap: protectedProcedure
    .input(z.object({ year: z.number().int().min(2020).max(2030) }))
    .mutation(async ({ ctx, input }) => {
      const admin = createSupabaseServiceClient();
      const { data: yearTrips } = await admin
        .from('trips')
        .select('id, name, destination, chaos_score')
        .eq('creator_id', ctx.user.id)
        .eq('lore_status', 'ready')
        .gte('created_at', `${input.year}-01-01`)
        .lt('created_at', `${input.year + 1}-01-01`);

      if (!yearTrips?.length) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `No completed trips found for ${input.year}. Generate lore for at least one trip first.`,
        });
      }

      // Upsert a 'processing' row so the page can poll.
      // YearlyWrapUpsertClient uses YearlyWrapUpsert from supabase-extended.types.ts —
      // the generated Insert type is missing the trip_ids (text[]) column.
      type YearlyWrapUpsertClient = {
        from: (t: 'yearly_wraps') => {
          upsert: (d: YearlyWrapUpsert, opts: { onConflict: string }) => Promise<unknown>;
        };
      };
      await (admin as unknown as YearlyWrapUpsertClient).from('yearly_wraps').upsert(
        {
          user_id: ctx.user.id,
          year: input.year,
          trip_ids: yearTrips.map(t => t.id),
          status: 'processing',
        },
        { onConflict: 'user_id,year' }
      );

      const workerUrl = process.env.AI_WORKER_URL;
      const tripIds = yearTrips.map(t => t.id);

      // Try the HTTP trigger first (fast path). The worker's /generate-yearly-wrap
      // endpoint requires the same HMAC signature as /generate-lore.
      let httpOk = false;
      if (workerUrl && !workerUrl.includes('localhost')) {
        try {
          const body = JSON.stringify({
            trip_ids: tripIds,
            user_id: ctx.user.id,
            year: input.year,
          });
          const { signature, timestamp } = await signWorkerRequest(
            'POST',
            '/generate-yearly-wrap',
            body
          );
          const resp = await fetch(`${workerUrl}/generate-yearly-wrap`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.AI_WORKER_SECRET!}`,
              'X-Timestamp': timestamp,
              'X-Signature': signature,
            },
            body,
            signal: AbortSignal.timeout(8000),
          });
          httpOk = resp.ok;
          if (!httpOk) {
            logger.warn(
              { procedure: 'trips.generateYearlyWrap', userId: ctx.user.id, status: resp.status },
              'worker http trigger returned non-OK'
            );
          }
        } catch (err) {
          logger.warn(
            { procedure: 'trips.generateYearlyWrap', userId: ctx.user.id },
            `worker http trigger failed: ${(err as Error).message}`
          );
        }
      }

      // Durable queue fallback: if the HTTP trigger failed (cold start, network
      // hiccup, missing env), enqueue a background_jobs row that the worker's
      // poll loop will pick up on its next tick (≤60s). Without this, a stuck
      // worker leaves users polling "Processing…" forever.
      if (!httpOk) {
        type BackgroundJobInsertClient = {
          from: (t: 'background_jobs') => {
            insert: (d: BackgroundJobInsert) => Promise<{ error: { message: string } | null }>;
          };
        };
        const { error: jobErr } = await (admin as unknown as BackgroundJobInsertClient)
          .from('background_jobs')
          .insert({
            // background_jobs.trip_id is NOT NULL; use the first trip of the year.
            // The actual scope is in payload.trip_ids.
            trip_id: tripIds[0],
            job_type: 'yearly_wrap',
            status: 'pending',
            payload: {
              user_id: ctx.user.id,
              year: input.year,
              trip_ids: tripIds,
            },
          });
        if (jobErr) {
          logger.error(
            { procedure: 'trips.generateYearlyWrap', userId: ctx.user.id, year: input.year },
            `failed to enqueue yearly_wrap fallback job: ${jobErr.message}`
          );
        }
      }

      return { status: 'processing' as const, tripCount: yearTrips.length };
    }),

  // FEAT-V2-01: Fetch the yearly wrap for the calling user.
  getYearlyWrap: protectedProcedure
    .input(z.object({ year: z.number().int().min(2020).max(2030) }))
    .query(async ({ ctx, input }) => {
      // YearlyWrapSelectClient uses YearlyWrapRow from supabase-extended.types.ts —
      // trip_ids column is missing from the generated Row type.
      const admin = createSupabaseServiceClient();
      type YearlyWrapSelectClient = {
        from: (t: 'yearly_wraps') => {
          select: (c: string) => {
            eq: (
              c: string,
              v: unknown
            ) => {
              eq: (
                c: string,
                v: unknown
              ) => {
                maybeSingle: () => Promise<{
                  data: YearlyWrapRow | null;
                  error: { message: string } | null;
                }>;
              };
            };
          };
        };
      };
      const { data, error } = await (admin as unknown as YearlyWrapSelectClient)
        .from('yearly_wraps')
        .select('*')
        .eq('user_id', ctx.user.id)
        .eq('year', input.year)
        .maybeSingle();
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      return data ?? null;
    }),

  // EXPORT-01: Trip archive data export — returns all trip data as a JSON bundle.
  // Includes lore JSON, all photo signed URLs (24h), metadata, members, eras, stats.
  // The client downloads this as a `.json` file via a Blob download.
  exportData: protectedProcedure
    .input(z.object({ tripId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const admin = createSupabaseServiceClient();

      // Verify caller is a member of this trip
      const { data: membership } = await admin
        .from('trip_members')
        .select('user_id')
        .eq('trip_id', input.tripId)
        .eq('user_id', ctx.user.id)
        .maybeSingle();

      if (!membership) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not a member of this trip.',
        });
      }

      // Fetch full trip with all related data
      const { data: trip, error } = await admin
        .from('trips')
        .select('*, photos(*), trip_members(*), trip_eras(*), trip_stats(*)')
        .eq('id', input.tripId)
        .single();

      if (error || !trip) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Trip not found.',
        });
      }

      // TYPE-02: trip is from a wildcard join select; cast to a local shape for nested access.
      type TripWithRelations = typeof trip & {
        photos: Array<{ storage_path: string; thumbnail_path?: string | null }>;
      };
      const typedTrip = trip as unknown as TripWithRelations;

      // Generate fresh signed URLs for all photos (24-hour expiry)
      const photos = typedTrip.photos ?? [];
      const storagePaths = photos.map((p: any) => p.storage_path).filter(Boolean);
      const signedUrlMap = new Map<string, string>();

      if (storagePaths.length > 0) {
        const { data: signed } = await admin.storage
          .from('trip-photos')
          .createSignedUrls(storagePaths, 86400); // 24 hours
        (signed ?? []).forEach(u => {
          if (u.signedUrl && u.path) signedUrlMap.set(u.path, u.signedUrl);
        });
      }

      return {
        exportedAt: new Date().toISOString(),
        trip: {
          name: typedTrip.name,
          destination: typedTrip.destination ?? null,
          chaosScore: typedTrip.chaos_score ?? null,
          lore: typedTrip.lore_json ?? null,
          eras: typedTrip.trip_eras ?? [],
          stats: typedTrip.trip_stats ?? [],
          members: (typedTrip.trip_members ?? []).map((m: any) => ({
            userId: m.user_id,
            status: m.status,
            roleTitle: m.role_title ?? null,
            roleChaosRating: m.role_chaos_rating ?? null,
          })),
        },
        photos: photos.map((p: any) => ({
          storagePath: p.storage_path,
          signedUrl: signedUrlMap.get(p.storage_path) ?? null,
          uploadedAt: p.created_at,
        })),
      };
    }),

  // VIRAL-01: Public showcase feed for the landing page — no auth required.
  // Returns anonymised top-chaos trips so visitors see real social proof.
  getPublicShowcase: publicProcedure.query(async ({ ctx }) => {
    const cacheKey = 'public_showcase:global';
    if (chaosCacheRedis) {
      try {
        const cached = await chaosCacheRedis.get<any[] | null>(cacheKey);
        if (cached !== null) {
          return cached;
        }
      } catch (redisErr) {
        logger.warn(
          { procedure: 'trips.getPublicShowcase' },
          `Redis GET failed, recomputing from DB: ${(redisErr as Error).message}`
        );
      }
    } else {
      const memCached = _publicShowcaseMemCache.get('global');
      if (memCached && Date.now() < memCached.expiry) {
        return memCached.data;
      }
    }

    const admin = createSupabaseServiceClient();
    const { data } = await admin
      .from('trips')
      .select('id, name, destination, chaos_score, lore_json')
      .eq('lore_status', 'ready')
      .eq('story_visible', true)
      .order('chaos_score', { ascending: false })
      .limit(6);

    const result = (data ?? []).map((t: any) => ({
      id: t.id as string,
      destination: (t.destination as string | null) ?? 'Unknown',
      chaosScore: (t.chaos_score as number | null) ?? 0,
      tagline: (t.lore_json as LoreJson | null)?.tagline ?? null,
    }));

    if (chaosCacheRedis) {
      try {
        await chaosCacheRedis.set(cacheKey, JSON.stringify(result), {
          ex: CHAOS_CACHE_TTL_S,
        });
      } catch (e) {
        logger.warn(
          { procedure: 'trips.getPublicShowcase' },
          `Redis SET failed: ${(e as Error).message}`
        );
      }
    } else {
      _publicShowcaseMemCache.set('global', {
        data: result,
        expiry: Date.now() + CHAOS_CACHE_TTL_MS,
      });
    }

    return result;
  }),

  // ── RETENTION MACHINE ──────────────────────────────────────────────────────
  // The Dispute + Canon Vote system: the single strongest retention loop.
  // Disputes create social pressure, WhatsApp content, and permanent mythology
  // records that compound over trips. See docs/RETENTION.md.

  // File a dispute against the AI's assessment of your character
  disputeCharacterRole: protectedProcedure
    .input(
      z.object({
        tripId: z.string().uuid(),
        disputeType: z.enum(['character_role', 'chaos_rating', 'verdict', 'superlative']),
        aiClaim: z.string().min(1).max(500),
        userClaim: z.string().min(10).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const admin = createSupabaseServiceClient();

      // Verify user is a member of this trip
      const { data: memberRaw } = await ctx.supabase
        .from('trip_members')
        .select('id, user_id')
        .eq('trip_id', input.tripId)
        .eq('user_id', ctx.user.id)
        .single();
      if (!memberRaw) throw new TRPCError({ code: 'FORBIDDEN' });

      // Count eligible voters (all trip members except self)
      const { count: memberCount } = await admin
        .from('trip_members')
        .select('id', { count: 'exact', head: true })
        .eq('trip_id', input.tripId);
      const totalEligible = Math.max((memberCount ?? 1) - 1, 1);

      // Create dispute — UNIQUE constraint prevents duplicate active disputes
      const { data: dispute, error } = await admin
        .from('lore_disputes')
        .insert({
          trip_id: input.tripId,
          user_id: ctx.user.id,
          dispute_type: input.disputeType,
          ai_claim: input.aiClaim,
          user_claim: input.userClaim,
          total_eligible: totalEligible,
        } as never)
        .select('id')
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'You already have an active dispute for this trip.',
          });
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }

      // Get all member user_ids for pulse event visibility
      const { data: members } = await admin
        .from('trip_members')
        .select('user_id')
        .eq('trip_id', input.tripId);
      const visibleTo = (members ?? []).map((m: any) => m.user_id as string);

      // Emit group pulse event — surfaces on everyone's home screen
      await admin.from('group_pulse_events').insert({
        trip_id: input.tripId,
        event_type: 'dispute_filed',
        actor_user_id: ctx.user.id,
        payload: {
          dispute_id: (dispute as any).id,
          dispute_type: input.disputeType,
          ai_claim: input.aiClaim.slice(0, 100),
        },
        visible_to: visibleTo,
      } as never);

      return { disputeId: (dispute as any).id as string };
    }),

  // Vote on an active dispute (ai vs. user)
  voteOnDispute: protectedProcedure
    .input(
      z.object({
        disputeId: z.string().uuid(),
        vote: z.enum(['ai', 'user']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const admin = createSupabaseServiceClient();

      // Load dispute to check trip membership and deadline
      const { data: disputeRaw } = await admin
        .from('lore_disputes')
        .select(
          'id, trip_id, user_id, status, vote_deadline, ai_vote_count, user_vote_count, total_eligible'
        )
        .eq('id', input.disputeId)
        .single();
      const dispute = disputeRaw as any;

      if (!dispute) throw new TRPCError({ code: 'NOT_FOUND' });
      if (dispute.status !== 'voting') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This dispute has already been resolved.',
        });
      }
      if (new Date(dispute.vote_deadline) < new Date()) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Voting period has ended.' });
      }

      // Can't vote on your own dispute
      if (dispute.user_id === ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: "You can't vote on your own dispute." });
      }

      // Verify trip membership
      const { data: memberRaw } = await ctx.supabase
        .from('trip_members')
        .select('id')
        .eq('trip_id', dispute.trip_id)
        .eq('user_id', ctx.user.id)
        .single();
      if (!memberRaw) throw new TRPCError({ code: 'FORBIDDEN' });

      // Record vote — PK prevents double-voting
      const { error: voteError } = await admin.from('dispute_votes').insert({
        dispute_id: input.disputeId,
        voter_user_id: ctx.user.id,
        vote: input.vote,
      } as never);

      if (voteError) {
        if (voteError.code === '23505') {
          throw new TRPCError({ code: 'CONFLICT', message: "You've already voted." });
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: voteError.message });
      }

      // Update vote counters atomically
      const newAi = dispute.ai_vote_count + (input.vote === 'ai' ? 1 : 0);
      const newUser = dispute.user_vote_count + (input.vote === 'user' ? 1 : 0);
      const totalVotes = newAi + newUser;

      // Check if all eligible voters have voted → resolve immediately
      let newStatus = 'voting';
      if (totalVotes >= dispute.total_eligible) {
        newStatus = newAi > newUser ? 'ai_wins' : newUser > newAi ? 'user_wins' : 'tied';
      }

      await admin
        .from('lore_disputes')
        .update({
          ai_vote_count: newAi,
          user_vote_count: newUser,
          status: newStatus,
          ...(newStatus !== 'voting' ? { resolved_at: new Date().toISOString() } : {}),
        } as never)
        .eq('id', input.disputeId);

      // Emit pulse event for the vote
      const { data: members } = await admin
        .from('trip_members')
        .select('user_id')
        .eq('trip_id', dispute.trip_id);
      const visibleTo = (members ?? []).map((m: any) => m.user_id as string);

      await admin.from('group_pulse_events').insert({
        trip_id: dispute.trip_id,
        event_type: newStatus !== 'voting' ? 'dispute_resolved' : 'vote_cast',
        actor_user_id: ctx.user.id,
        payload: {
          dispute_id: input.disputeId,
          vote: input.vote,
          ai_votes: newAi,
          user_votes: newUser,
          total_eligible: dispute.total_eligible,
          resolved: newStatus !== 'voting',
          winner: newStatus !== 'voting' ? newStatus : null,
        },
        visible_to: visibleTo,
      } as never);

      // Send push notification to the dispute owner when their dispute is resolved
      if (newStatus !== 'voting') {
        const winnerLabel =
          newStatus === 'ai_wins'
            ? 'The AI was right.'
            : newStatus === 'user_wins'
              ? 'You win.'
              : 'Tied.';
        // Fire and forget — non-fatal
        import('@/lib/push')
          .then(({ sendPushToUser }) =>
            sendPushToUser(dispute.user_id, {
              title: `Dispute resolved — ${winnerLabel}`,
              body: `The crew voted on your mythology dispute. ${winnerLabel}`,
              url: `/trips/${dispute.trip_id}`,
              tripId: dispute.trip_id,
              tag: `dispute-resolved-${input.disputeId}`,
            })
          )
          .catch(e => logger.warn({ err: e }, 'push failed for dispute resolution'));
      }

      return {
        newStatus,
        aiVotes: newAi,
        userVotes: newUser,
        totalEligible: dispute.total_eligible,
        resolved: newStatus !== 'voting',
      };
    }),

  // Get all disputes for a trip, with current vote state
  getDisputes: protectedProcedure
    .input(z.object({ tripId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const admin = createSupabaseServiceClient();

      // Verify membership
      const { data: memberRaw } = await ctx.supabase
        .from('trip_members')
        .select('id')
        .eq('trip_id', input.tripId)
        .eq('user_id', ctx.user.id)
        .single();
      if (!memberRaw) throw new TRPCError({ code: 'FORBIDDEN' });

      // Resolve expired disputes first
      await admin.rpc('resolve_expired_disputes');

      const { data } = await admin
        .from('lore_disputes')
        .select(
          'id, user_id, dispute_type, ai_claim, user_claim, status, vote_deadline, ai_vote_count, user_vote_count, total_eligible, created_at, resolved_at'
        )
        .eq('trip_id', input.tripId)
        .order('created_at', { ascending: false });

      // Get which disputes this user has already voted on
      const disputeIds = ((data as any[]) ?? []).map((d: any) => d.id);
      let votedDisputeIds = new Set<string>();
      if (disputeIds.length > 0) {
        const { data: votes } = await admin
          .from('dispute_votes')
          .select('dispute_id')
          .eq('voter_user_id', ctx.user.id)
          .in('dispute_id', disputeIds);
        votedDisputeIds = new Set(((votes as any[]) ?? []).map((v: any) => v.dispute_id));
      }

      return ((data as any[]) ?? []).map((d: any) => ({
        id: d.id as string,
        userId: d.user_id as string,
        disputeType: d.dispute_type as string,
        aiClaim: d.ai_claim as string,
        userClaim: d.user_claim as string,
        status: d.status as string,
        voteDeadline: d.vote_deadline as string,
        aiVotes: d.ai_vote_count as number,
        userVotes: d.user_vote_count as number,
        totalEligible: d.total_eligible as number,
        createdAt: d.created_at as string,
        resolvedAt: d.resolved_at as string | null,
        hasVoted: votedDisputeIds.has(d.id),
        isOwn: d.user_id === ctx.user.id,
      }));
    }),

  // Group pulse feed — the living home screen social feed
  getGroupPulse: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const admin = createSupabaseServiceClient();

      let query = admin
        .from('group_pulse_events')
        .select('id, trip_id, event_type, actor_user_id, payload, created_at')
        .contains('visible_to', [ctx.user.id])
        .order('created_at', { ascending: false })
        .limit(input.limit);

      if (input.cursor) {
        query = (query as any).lt('created_at', input.cursor);
      }

      const { data } = await (query as any);
      const events = (data as any[]) ?? [];

      // Fetch display names for actors (batch)
      const actorIds = [...new Set(events.map((e: any) => e.actor_user_id).filter(Boolean))];
      let actorNames: Record<string, string> = {};
      if (actorIds.length > 0) {
        const { data: profiles } = await admin
          .from('profiles')
          .select('id, display_name')
          .in('id', actorIds);
        actorNames = Object.fromEntries(
          ((profiles as any[]) ?? []).map((p: any) => [p.id, p.display_name ?? 'Someone'])
        );
      }

      // Fetch trip names (batch)
      const tripIds = [...new Set(events.map((e: any) => e.trip_id))];
      let tripNames: Record<string, string> = {};
      if (tripIds.length > 0) {
        const { data: trips } = await admin.from('trips').select('id, name').in('id', tripIds);
        tripNames = Object.fromEntries(
          ((trips as any[]) ?? []).map((t: any) => [t.id, t.name ?? 'Your Trip'])
        );
      }

      return events.map((e: any) => ({
        id: e.id as string,
        tripId: e.trip_id as string,
        tripName: tripNames[e.trip_id] ?? 'Your Trip',
        eventType: e.event_type as string,
        actorUserId: e.actor_user_id as string | null,
        actorName: e.actor_user_id ? (actorNames[e.actor_user_id] ?? 'Someone') : null,
        payload: e.payload as Record<string, unknown>,
        createdAt: e.created_at as string,
      }));
    }),

  // Incident button — flag a mythology-worthy moment during a trip
  flagIncident: protectedProcedure
    .input(
      z.object({
        tripId: z.string().uuid(),
        note: z.string().max(200).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const admin = createSupabaseServiceClient();

      const { data: memberRaw } = await ctx.supabase
        .from('trip_members')
        .select('id')
        .eq('trip_id', input.tripId)
        .eq('user_id', ctx.user.id)
        .single();
      if (!memberRaw) throw new TRPCError({ code: 'FORBIDDEN' });

      await admin.from('pending_incidents').insert({
        trip_id: input.tripId,
        triggered_by: ctx.user.id,
        note: input.note ?? null,
      } as never);

      // Get trip members for pulse event
      const { data: members } = await admin
        .from('trip_members')
        .select('user_id')
        .eq('trip_id', input.tripId);
      const visibleTo = (members ?? []).map((m: any) => m.user_id as string);

      const { data: profile } = await admin
        .from('profiles')
        .select('display_name')
        .eq('id', ctx.user.id)
        .single();

      await admin.from('group_pulse_events').insert({
        trip_id: input.tripId,
        event_type: 'incident_flagged',
        actor_user_id: ctx.user.id,
        payload: {
          note: input.note ?? null,
          actor_name: (profile as any)?.display_name ?? 'Someone',
        },
        visible_to: visibleTo,
      } as never);

      return { ok: true };
    }),

  // ── Incident Log — explorable memory reconstruction ───────────────────────
  // Returns structured incidents and evidence gaps for a trip.
  // These power the explorable history view (not the consumable narrative).
  getIncidentLog: protectedProcedure
    .input(z.object({ tripId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const admin = createSupabaseServiceClient();

      const { data: member } = await ctx.supabase
        .from('trip_members')
        .select('id')
        .eq('trip_id', input.tripId)
        .eq('user_id', ctx.user.id)
        .single();
      if (!member) throw new TRPCError({ code: 'FORBIDDEN' });

      const [{ data: incidents }, { data: gaps }] = await Promise.all([
        admin
          .from('trip_incidents')
          .select(
            'id, incident_ref, title, timeframe, confidence, verified_facts, inferred_elements, unknown_elements, participant_names, is_contested, callback_potential, mythology_status, investigator_note'
          )
          .eq('trip_id', input.tripId)
          .order('incident_ref'),
        admin
          .from('evidence_gaps')
          .select('id, gap_ref, timeframe, what_we_know, what_we_dont, significance')
          .eq('trip_id', input.tripId)
          .order('gap_ref'),
      ]);

      return {
        incidents: ((incidents as any[]) ?? []).map((i: any) => ({
          id: i.id as string,
          incidentRef: i.incident_ref as string,
          title: i.title as string,
          timeframe: i.timeframe as string | null,
          confidence: i.confidence as string,
          verifiedFacts: (i.verified_facts ?? []) as string[],
          inferredElements: (i.inferred_elements ?? []) as string[],
          unknownElements: (i.unknown_elements ?? []) as string[],
          participantNames: (i.participant_names ?? []) as string[],
          isContested: i.is_contested as boolean,
          callbackPotential: i.callback_potential as string,
          mythologyStatus: i.mythology_status as string,
          investigatorNote: i.investigator_note as string | null,
        })),
        gaps: ((gaps as any[]) ?? []).map((g: any) => ({
          id: g.id as string,
          gapRef: g.gap_ref as string,
          timeframe: g.timeframe as string,
          whatWeKnow: g.what_we_know as string | null,
          whatWeDont: g.what_we_dont as string,
          significance: g.significance as string,
        })),
      };
    }),

  // ── Character Arc — cross-trip identity evolution ──────────────────────────
  // The identity data that makes switching cost emotional, not technical.
  getMyCharacterArc: protectedProcedure.query(async ({ ctx }) => {
    const admin = createSupabaseServiceClient();

    const { data: snapshots } = await admin
      .from('user_identity_snapshots')
      .select('archetype, chaos_rating, role_title, signature_behavior, snapshot_at, trip_id')
      .eq('user_id', ctx.user.id)
      .order('snapshot_at', { ascending: true });

    const snaps = (snapshots as any[]) ?? [];
    if (snaps.length === 0) return { hasData: false, snapshots: [] };

    // Compute trajectory
    const recent = snaps.slice(-3);
    const avgChaos = recent.reduce((s: number, n: any) => s + n.chaos_rating, 0) / recent.length;
    const firstChaos = snaps[0].chaos_rating as number;
    const trajectory =
      avgChaos > firstChaos + 1 ? 'rising' : avgChaos < firstChaos - 1 ? 'falling' : 'stable';

    // Most common archetype
    const archetypeCounts: Record<string, number> = {};
    for (const s of snaps) {
      archetypeCounts[s.archetype] = (archetypeCounts[s.archetype] ?? 0) + 1;
    }
    const dominantArchetype = Object.entries(archetypeCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    // Arc definition: 100% when 5+ trips, same archetype 3+ times, trajectory clear
    const arcPct = Math.min(
      100,
      Math.round(
        (snaps.length / 5) * 40 +
          ((archetypeCounts[dominantArchetype] ?? 0) / snaps.length) * 40 +
          (trajectory !== 'stable' ? 20 : 0)
      )
    );

    return {
      hasData: true,
      tripCount: snaps.length,
      dominantArchetype,
      trajectory,
      currentChaos: recent[recent.length - 1]?.chaos_rating ?? 5,
      firstChaos: snaps[0].chaos_rating,
      arcPct,
      snapshots: snaps.map((s: any) => ({
        archetype: s.archetype as string,
        chaosRating: s.chaos_rating as number,
        roleTitle: s.role_title as string | null,
        snapshotAt: s.snapshot_at as string,
        tripId: s.trip_id as string,
      })),
    };
  }),

  // ── Memory Review — 7-day window to confirm/add context ───────────────────
  addMemoryContribution: protectedProcedure
    .input(
      z.object({
        tripId: z.string().uuid(),
        contributionType: z.enum(['confirm', 'addition']),
        targetSection: z.string().optional(),
        content: z.string().min(1).max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const admin = createSupabaseServiceClient();

      // Verify membership
      const { data: member } = await ctx.supabase
        .from('trip_members')
        .select('id')
        .eq('trip_id', input.tripId)
        .eq('user_id', ctx.user.id)
        .single();
      if (!member) throw new TRPCError({ code: 'FORBIDDEN' });

      // Check review window is still open
      const { data: tripRaw } = await admin
        .from('trips')
        .select('memory_review_closes_at')
        .eq('id', input.tripId)
        .single();
      const reviewClosesAt = (tripRaw as any)?.memory_review_closes_at;
      if (reviewClosesAt && new Date(reviewClosesAt) < new Date()) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Memory review window has closed.' });
      }

      await admin.from('memory_contributions').insert({
        trip_id: input.tripId,
        user_id: ctx.user.id,
        contribution_type: input.contributionType,
        target_section: input.targetSection ?? null,
        content: input.content ?? null,
      } as never);

      // Pulse event for additions
      if (input.contributionType === 'addition' && input.content) {
        const { data: members } = await admin
          .from('trip_members')
          .select('user_id')
          .eq('trip_id', input.tripId);
        const visibleTo = (members ?? []).map((m: any) => m.user_id as string);
        await admin.from('group_pulse_events').insert({
          trip_id: input.tripId,
          event_type: 'memory_added',
          actor_user_id: ctx.user.id,
          payload: { preview: input.content.slice(0, 80), section: input.targetSection },
          visible_to: visibleTo,
        } as never);
      }

      return { ok: true };
    }),

  // Get memory review status for a trip
  getMemoryReviewStatus: protectedProcedure
    .input(z.object({ tripId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const admin = createSupabaseServiceClient();

      const { data: tripRaw } = await admin
        .from('trips')
        .select('memory_review_closes_at, review_confirmed_count, member_count')
        .eq('id', input.tripId)
        .single();
      const trip = tripRaw as any;

      if (!trip?.memory_review_closes_at) return { isOpen: false };

      const closesAt = new Date(trip.memory_review_closes_at);
      const isOpen = closesAt > new Date();
      const hoursLeft = Math.max(0, Math.round((closesAt.getTime() - Date.now()) / 3600000));

      // Has this user contributed?
      const { data: myContrib } = await admin
        .from('memory_contributions')
        .select('id')
        .eq('trip_id', input.tripId)
        .eq('user_id', ctx.user.id)
        .limit(1);

      // Get all contributions
      const { data: allContribs } = await admin
        .from('memory_contributions')
        .select('user_id, contribution_type, content, created_at')
        .eq('trip_id', input.tripId)
        .order('created_at', { ascending: false });

      return {
        isOpen,
        hoursLeft,
        closesAt: closesAt.toISOString(),
        totalMembers: trip.member_count ?? 0,
        confirmedCount: trip.review_confirmed_count ?? 0,
        hasContributed: ((myContrib as any[]) ?? []).length > 0,
        contributions: ((allContribs as any[]) ?? []).map((c: any) => ({
          userId: c.user_id as string,
          type: c.contribution_type as string,
          content: c.content as string | null,
          createdAt: c.created_at as string,
        })),
      };
    }),

  // ── Pre-trip Prophecy ──────────────────────────────────────────────────────
  // Called after trip creation when returning members are detected.
  // Uses cross-trip identity data to generate behavioral predictions.
  generatePretripProphecy: protectedProcedure
    .input(z.object({ tripId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const admin = createSupabaseServiceClient();

      // Only creator can generate prophecy
      const { data: tripRaw } = await ctx.supabase
        .from('trips')
        .select('creator_id, name, destination, pretrip_prophecy')
        .eq('id', input.tripId)
        .single();
      const trip = tripRaw as any;
      if (!trip || trip.creator_id !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
      if (trip.pretrip_prophecy) return { alreadyExists: true };

      // Get all members and their cross-trip identity
      const { data: members } = await admin
        .from('trip_members')
        .select('user_id')
        .eq('trip_id', input.tripId);
      const memberIds = ((members as any[]) ?? []).map((m: any) => m.user_id as string);

      // Fetch identity snapshots for all members (last 3 trips each)
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, display_name')
        .in('id', memberIds);

      const profileMap: Record<string, string> = {};
      for (const p of (profiles as any[]) ?? []) {
        profileMap[p.id] = p.display_name ?? 'Unknown';
      }

      const { data: allSnaps } = await admin
        .from('user_identity_snapshots')
        .select('user_id, archetype, chaos_rating, role_title, snapshot_at')
        .in('user_id', memberIds)
        .order('snapshot_at', { ascending: false });

      // Group by user, take last 3 per user
      const snapsByUser: Record<string, any[]> = {};
      for (const snap of (allSnaps as any[]) ?? []) {
        const uid = snap.user_id as string;
        if (!snapsByUser[uid]) snapsByUser[uid] = [];
        if (snapsByUser[uid].length < 3) snapsByUser[uid].push(snap);
      }

      // Build member histories
      const memberHistories = memberIds
        .filter(uid => snapsByUser[uid]?.length > 0)
        .map(uid => ({
          name: profileMap[uid] ?? 'Unknown',
          trips: snapsByUser[uid].length,
          avgChaos: Math.round(
            snapsByUser[uid].reduce((s: number, n: any) => s + n.chaos_rating, 0) /
              snapsByUser[uid].length
          ),
          currentArchetype: snapsByUser[uid][0]?.archetype ?? 'Unknown',
          trajectory:
            snapsByUser[uid].length > 1
              ? snapsByUser[uid][0].chaos_rating >
                snapsByUser[uid][snapsByUser[uid].length - 1].chaos_rating
                ? 'rising'
                : 'falling'
              : 'stable',
        }));

      if (memberHistories.length === 0) {
        return { alreadyExists: false, newGroup: true };
      }

      // Group chaos probability based on average of members
      const avgGroupChaos =
        memberHistories.reduce((s, m) => s + m.avgChaos, 0) / memberHistories.length;
      const groupChaosPct = Math.min(99, Math.round(avgGroupChaos * 10));

      // Generate prophecy narrative via AI
      const prophecyPrompt = `You are the Yaarlore AI Historian, generating a pre-trip prophecy for a returning friend group.

Trip: "${trip.name}" to ${trip.destination ?? 'an undisclosed location'}

Member histories (documented across previous trips):
${memberHistories
  .map(
    m =>
      `- ${m.name}: ${m.trips} documented trips, avg chaos ${m.avgChaos}/10, current archetype: ${m.currentArchetype}, trajectory: ${m.trajectory}`
  )
  .join('\n')}

Generate a SHORT prophecy JSON with:
- A dramatic headline (max 15 words)
- Per-member predictions (one per person with mythology history, max 25 words each, HIGH/MEDIUM/LOW confidence)
- A whatsapp_text: what someone would forward in the group chat to hype up the trip (Hinglish, internet-native, max 40 words)

Format:
{
  "headline": "...",
  "predictions": [{"name": "...", "prediction": "...", "confidence": "HIGH|MEDIUM|LOW"}],
  "group_chaos_probability": ${groupChaosPct},
  "whatsapp_text": "..."
}

Raw JSON only. No markdown.`;

      try {
        const { Anthropic } = await import('@anthropic-ai/sdk');
        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const msg = await client.messages.create({
          model: 'claude-haiku-20241022',
          max_tokens: 512,
          messages: [{ role: 'user', content: prophecyPrompt }],
        });
        const raw = (msg.content[0] as any).text as string;
        const prophecy = JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim());

        // Store prophecy on trip
        await admin
          .from('trips')
          .update({
            pretrip_prophecy: { ...prophecy, generated_at: new Date().toISOString() },
          } as never)
          .eq('id', input.tripId);

        // Store WhatsApp card
        await admin.from('trip_prophecy_cards').upsert({
          trip_id: input.tripId,
          whatsapp_text: prophecy.whatsapp_text ?? prophecy.headline,
          card_headline: prophecy.headline,
        } as never);

        // Pulse event
        const { data: allMembers } = await admin
          .from('trip_members')
          .select('user_id')
          .eq('trip_id', input.tripId);
        const visibleTo = ((allMembers as any[]) ?? []).map((m: any) => m.user_id as string);
        await admin.from('group_pulse_events').insert({
          trip_id: input.tripId,
          event_type: 'lore_generated',
          actor_user_id: null,
          payload: { type: 'prophecy', headline: prophecy.headline },
          visible_to: visibleTo,
        } as never);

        return { ok: true, prophecy };
      } catch (e) {
        return { ok: false, error: 'Could not generate prophecy' };
      }
    }),

  // Get prophecy for a trip
  getPretripProphecy: protectedProcedure
    .input(z.object({ tripId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('trips')
        .select('pretrip_prophecy, name, destination')
        .eq('id', input.tripId)
        .single();
      return { prophecy: (data as any)?.pretrip_prophecy ?? null };
    }),

  // ── Social Graph ───────────────────────────────────────────────────────────
  // The living relationship memory — how specific people's dynamics have
  // evolved across all documented trips together.

  // Friendship timeline: all trips this user has shared with their groups,
  // with relationship dynamics and mythology evolution across time.
  getFriendshipTimeline: protectedProcedure.query(async ({ ctx }) => {
    const admin = createSupabaseServiceClient();

    // All trips the user is a member of, ordered chronologically
    const { data: memberships } = await admin
      .from('trip_members')
      .select(
        'trip_id, trips(id, name, destination, trip_start_date, chaos_score, lore_status, lore_json, member_count)'
      )
      .eq('user_id', ctx.user.id)
      .eq('trips.lore_status', 'ready')
      .order('trips(trip_start_date)' as never, { ascending: true });

    const trips = ((memberships as any[]) ?? []).map((m: any) => m.trips).filter(Boolean) as any[];

    if (trips.length === 0) return { entries: [], totalTrips: 0 };

    // For each trip, get identity snapshot for this user
    const tripIds = trips.map((t: any) => t.id as string);
    const { data: snapshots } = await admin
      .from('user_identity_snapshots')
      .select('trip_id, archetype, chaos_rating, role_title')
      .eq('user_id', ctx.user.id)
      .in('trip_id', tripIds);

    const snapshotByTrip = new Map<string, any>();
    for (const snap of (snapshots as any[]) ?? []) {
      snapshotByTrip.set(snap.trip_id, snap);
    }

    // Get canonical incidents per trip (high callback potential)
    const { data: incidents } = await admin
      .from('trip_incidents')
      .select('trip_id, incident_ref, title, callback_potential, mythology_status')
      .in('trip_id', tripIds)
      .in('callback_potential', ['HIGH'])
      .order('incident_ref');

    const incidentsByTrip = new Map<string, any[]>();
    for (const inc of (incidents as any[]) ?? []) {
      if (!incidentsByTrip.has(inc.trip_id)) incidentsByTrip.set(inc.trip_id, []);
      incidentsByTrip.get(inc.trip_id)!.push(inc);
    }

    const entries = trips.map((trip: any) => {
      const snap = snapshotByTrip.get(trip.id);
      const lore = trip.lore_json as LoreJson | null;
      return {
        tripId: trip.id as string,
        tripName: trip.name as string,
        destination: (trip.destination as string | null) ?? 'Unknown',
        tripDate: trip.trip_start_date as string | null,
        chaosScore: (trip.chaos_score as number | null) ?? 0,
        verdict: lore?.cooked_verdict ?? null,
        tagline: lore?.tagline ?? null,
        memberCount: (trip.member_count as number) ?? 0,
        // This user's identity snapshot for this trip
        myArchetype: (snap?.archetype as string | null) ?? null,
        myChaosRating: (snap?.chaos_rating as number | null) ?? null,
        myRoleTitle: (snap?.role_title as string | null) ?? null,
        // Legendary incidents from this trip
        legendaryIncidents: (incidentsByTrip.get(trip.id) ?? []).map((i: any) => ({
          ref: i.incident_ref as string,
          title: i.title as string,
          status: i.mythology_status as string,
        })),
      };
    });

    return { entries, totalTrips: trips.length };
  }),

  getSlambookUrl: protectedProcedure
    .input(z.object({ tripId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Gate: only print-tier members can access the slambook.
      const { data: memberRaw } = await ctx.supabase
        .from('trip_members')
        .select('id')
        .eq('trip_id', input.tripId)
        .eq('user_id', ctx.user.id)
        .single();
      if (!memberRaw) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a member of this trip' });
      }

      const { data: tripRaw } = await ctx.supabase
        .from('trips')
        .select('tier, slambook_path')
        .eq('id', input.tripId)
        .single();

      type SlambookTripRow = { tier: string; slambook_path: string | null };
      const trip = tripRaw as SlambookTripRow | null;

      if (!trip || trip.tier !== 'print') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Slambook is only available on the Print tier (₹799)',
        });
      }

      if (!trip.slambook_path) {
        // Generation is in progress or pending — return status without URL.
        return { status: 'generating', url: null };
      }

      // Generate a signed URL valid for 24 hours.
      const admin = createSupabaseServiceClient();
      const { data: signed, error } = await admin.storage
        .from('trip-photos')
        .createSignedUrl(trip.slambook_path, 86400);

      if (error || !signed?.signedUrl) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error?.message ?? 'Failed to generate slambook URL',
        });
      }

      return { status: 'ready', url: signed.signedUrl };
    }),
});
