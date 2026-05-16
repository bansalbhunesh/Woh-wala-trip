import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import { TRPCError } from '@trpc/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

const TripCreateInput = z.object({
  name: z.string().min(2).max(80),
  destination: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const tripsRouter = router({
  create: protectedProcedure
    .input(TripCreateInput)
    .mutation(async ({ ctx, input }) => {
      // Use service role for writes — auth is already validated by protectedProcedure
      // This bypasses RLS on trips/profiles/trip_members which can fail if the
      // user's JWT isn't forwarded correctly to Supabase on Vercel
      const admin = createSupabaseServiceClient();
      const userId = ctx.user.id;

      // Ensure profile row exists
      await admin.from('profiles').upsert({
        id: userId,
        email: ctx.user.email ?? null,
        display_name: ctx.user.user_metadata?.name ?? ctx.user.email?.split('@')[0] ?? null,
      }, { onConflict: 'id', ignoreDuplicates: true });

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

      const trip = data as any;

      if (error) {
        console.error('trip create failed', error.message, error.code);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Could not create season: ${error.message}`,
        });
      }

      if (!trip) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Trip creation returned no data' });
      }

      // Add creator as member — rollback trip if this fails
      const { error: memberErr } = await admin.from('trip_members').insert({
        trip_id: trip.id,
        user_id: userId,
        status: 'joined',
      });
      if (memberErr) {
        await admin.from('trips').delete().eq('id', trip.id);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to join your own trip. Try again.' });
      }

      return trip;
    }),

  getFull: protectedProcedure
    .input(z.object({ tripId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const supabase = ctx.supabase as any;
      const { data, error } = await supabase.rpc('get_trip_full', {
        p_trip_id: input.tripId,
      });

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      const res = data as any;
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
      const supabase = ctx.supabase as any;
      const { data, error } = await supabase.rpc('join_trip_by_code', {
        p_invite_code: input.inviteCode.trim().toUpperCase(),
      });

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      const res = data as any;
      if (res?.error) {
        const errorMap: Record<string, string> = {
          invalid_or_expired_code: 'Yaar this code is literally not working (invalid or expired).',
          free_tier_member_limit_reached: 'This trip is at its 6-member limit. Upgrade to let the whole group join.',
          not_authenticated: 'Please sign in first',
        };
        // Never expose raw RPC error strings — map to known errors or use generic fallback
        const knownError = errorMap[res.error as string];
        if (!knownError) console.error('[joinByCode] unknown RPC error:', res.error);
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: knownError ?? 'Could not join trip. Check the code and try again.',
        });
      }

      return { tripId: res.trip_id };
    }),

  listMine: protectedProcedure.query(async ({ ctx }) => {
    const supabase = ctx.supabase as any;
    const { data, error } = await supabase
      .from('trip_members')
      .select(`
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
      `)
      .eq('user_id', ctx.user.id);

    if (error)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });

    return (data as any[] || []).map((row) => row.trips).filter(Boolean);
  }),

  generateLore: protectedProcedure
    .input(z.object({ tripId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const supabase = ctx.supabase as any;
      const { data } = await supabase
        .from('trips')
        .select('creator_id')
        .eq('id', input.tripId)
        .single();

      const trip = data as any;

      if (!trip || trip.creator_id !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the creator can trigger generation',
        });
      }

      // Count actual photos — don't trust the cached total_photos column
      const { count: photoCount } = await supabase
        .from('photos')
        .select('id', { count: 'exact', head: true })
        .eq('trip_id', input.tripId);

      if ((photoCount || 0) < 5) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Need at least 5 photos to generate lore. You have ${photoCount || 0} — upload ${5 - (photoCount || 0)} more.`,
        });
      }

      // Only set processing AFTER confirming worker is reachable
      const workerUrl = process.env.AI_WORKER_URL;
      if (!workerUrl || workerUrl.includes('localhost')) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Lore engine is offline. Make sure AI_WORKER_URL is set to your deployed worker.',
        });
      }

      await supabase
        .from('trips')
        .update({ lore_status: 'processing' })
        .eq('id', input.tripId);

      try {
        const resp = await fetch(`${workerUrl}/generate-lore`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.AI_WORKER_SECRET!}`,
          },
          body: JSON.stringify({ trip_id: input.tripId }),
          signal: AbortSignal.timeout(8000), // 8s connection timeout
        });
        if (!resp.ok) throw new Error(`Worker returned ${resp.status}`);
      } catch (err) {
        // Reset status so user can retry
        await supabase
          .from('trips')
          .update({ lore_status: 'pending' })
          .eq('id', input.tripId);
        console.error('[generateLore] worker failed:', err);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Lore engine failed to start. Check AI_WORKER_URL is reachable and retry.',
        });
      }

      return { status: 'processing' };
    }),

  submitConfession: protectedProcedure
    .input(
      z.object({
        tripId: z.string().uuid(),
        confession: z.string().min(10).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const supabase = ctx.supabase as any;
      const { data, error } = await supabase.rpc('submit_confession', {
        p_trip_id: input.tripId,
        p_confession: input.confession,
      });

      const res = data as any;
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
      const supabase = ctx.supabase as any;
      const { data } = await supabase
        .from('trips')
        .select('creator_id')
        .eq('id', input.tripId)
        .single();

      const trip = data as any;

      if (!trip || trip.creator_id !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      await supabase
        .from('trip_members')
        .update({
          status: 'absent',
          absence_reason: input.reason,
        })
        .eq('trip_id', input.tripId)
        .eq('user_id', input.userId);

      // Fire-and-forget — don't block on worker, but log failures
      fetch(`${process.env.AI_WORKER_URL ?? ''}/generate-missing-person-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.AI_WORKER_SECRET!}`,
        },
        body: JSON.stringify({ trip_id: input.tripId, absent_user_id: input.userId }),
      }).catch(e => console.error('[markAbsent] worker call failed:', e.message));

      return { success: true };
    }),

  upgradeTier: protectedProcedure
    .input(
      z.object({
        tripId: z.string().uuid(),
        tier: z.enum(['digital', 'print']),
        paymentId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const supabase = ctx.supabase as any;
      const { error } = await supabase
        .from('trips')
        .update({
          tier: input.tier,
          payment_id: input.paymentId,
          expires_at: null,
        } as any)
        .eq('id', input.tripId)
        .eq('creator_id', ctx.user.id);

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

      return { success: true };
    }),
});
