import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import { TRPCError } from '@trpc/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { langfuse } from '@/lib/langfuse';
import crypto from 'crypto';
import { signWorkerRequest } from '@/lib/worker-auth';

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
      console.error('trip create failed', error.message, error.code);
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
        await admin
          .from('profiles')
          .update({ referral_counted: true } as never)
          .eq('id', userId);

        // Increment referrer's count and unlock bonus at 3
        const referrerId = profile.invited_by_user_id;
        const { data: referrer } = (await admin
          .from('profiles')
          .select('referral_count')
          .eq('id', referrerId)
          .single()) as unknown as { data: { referral_count: number } | null };
        const newCount = (referrer?.referral_count ?? 0) + 1;
        await admin
          .from('profiles')
          .update({
            referral_count: newCount,
            ...(newCount >= 3 ? { referral_bonus_unlocked: true } : {}),
          } as never)
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
      const { data, error } = await ctx.supabase.rpc('get_trip_full', {
        p_trip_id: input.tripId,
      } as never);

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
      const { data, error } = await ctx.supabase.rpc('join_trip_by_code', {
        p_invite_code: input.inviteCode.trim().toUpperCase(),
      } as never);

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
        if (!knownError) console.error('[joinByCode] unknown RPC error:', res.error);
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
          await admin
            .from('profiles')
            .update({ invited_by_user_id: referrerId } as never)
            .eq('id', joinerId)
            .is('invited_by_user_id' as never, null);
        }
      } catch (referralErr) {
        // Referral tracking must never break the join flow
        console.error('[joinByCode] referral tracking failed:', referralErr);
      }

      return { tripId };
    }),

  listMine: protectedProcedure.query(async ({ ctx }) => {
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
      .eq('user_id', ctx.user.id);

    if (error)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });

    return (data || [])
      .map(row => (row as unknown as { trips: TripSummary | null }).trips)
      .filter((t): t is TripSummary => t !== null);
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

      // Atomically claim 'processing' only if not already processing — prevents double-fire race.
      // Also set processing_started_at so the stuck-job cron can detect and reset stalled runs.
      const { data: claimed } = await ctx.supabase
        .from('trips')
        .update({
          lore_status: 'processing',
          processing_started_at: new Date().toISOString(),
        } as never)
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
        return { status: 'processing' as const };
      } catch (err) {
        // HTTP trigger failed — queue the job so the worker's polling loop picks it up
        // within 60 seconds. Don't reset lore_status to 'pending': it stays 'processing'
        // so the generating page keeps polling and the stuck-job cron handles any crash.
        const admin = createSupabaseServiceClient();
        await admin
          .from('generation_jobs' as never)
          .upsert({ trip_id: input.tripId, status: 'pending' } as never, { onConflict: 'trip_id' });
        console.warn(
          '[generateLore] worker unreachable, queued for polling:',
          (err as Error).message
        );
        span.end({ output: { status: 'queued' }, usage: undefined });
        // Return normally — the generating page will receive the status update via Realtime
        return { status: 'queued' as const };
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
      const { data, error } = await ctx.supabase.rpc('submit_confession', {
        p_trip_id: input.tripId,
        p_confession: input.confession,
      } as never);

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

      await ctx.supabase
        .from('trip_members')
        .update({
          status: 'absent',
          absence_reason: input.reason,
        } as never)
        .eq('trip_id', input.tripId)
        .eq('user_id', input.userId);

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

      return { success: true };
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
      const admin = createSupabaseServiceClient();
      const { error } = await admin
        .from('trips')
        .update({ tier: input.tier, payment_id: input.paymentId, expires_at: null } as never)
        .eq('id', input.tripId)
        .eq('creator_id', ctx.user.id);

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

      return { success: true };
    }),

  getChaosDistribution: protectedProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase
      .from('trips')
      .select('chaos_score')
      .eq('lore_status', 'ready')
      .not('chaos_score', 'is', null);

    const scores = ((data || []) as { chaos_score: number }[])
      .map(r => r.chaos_score)
      .filter((s): s is number => s != null && s > 0)
      .sort((a, b) => a - b);

    if (scores.length < 10) return null;

    const at = (pct: number) =>
      scores[Math.min(Math.floor((scores.length * pct) / 100), scores.length - 1)];
    return { p50: at(50), p75: at(75), p90: at(90), total: scores.length };
  }),

  // Warm up the AI worker before the user clicks "Generate Lore".
  // Called client-side when photoCount first reaches 5 — gives Render free tier
  // 30-60s to exit cold start before the actual generation request fires.
  warmupWorker: protectedProcedure.mutation(async () => {
    const workerUrl = process.env.AI_WORKER_URL;
    if (!workerUrl || workerUrl.includes('localhost')) return { ok: false };
    try {
      const resp = await fetch(`${workerUrl}/health`, { signal: AbortSignal.timeout(5000) });
      return { ok: resp.ok };
    } catch {
      return { ok: false };
    }
  }),
});
