import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import { TRPCError } from '@trpc/server';

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
      const supabase = ctx.supabase as any;
      const { data, error } = await supabase
        .from('trips')
        .insert({
          name: input.name,
          destination: input.destination,
          trip_start_date: input.startDate,
          trip_end_date: input.endDate,
          creator_id: ctx.user.id,
          tier: 'free',
        })
        .select()
        .single();

      const trip = data as any;

      if (error) {
        console.error('trip create failed', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Could not create trip',
        });
      }

      if (!trip) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Trip creation returned no data',
        });
      }

      await supabase.from('trip_members').insert({
        trip_id: trip.id,
        user_id: ctx.user.id,
        status: 'joined',
      });

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
        p_invite_code: input.inviteCode.toUpperCase(),
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
          invalid_or_expired_code: 'This invite code is invalid or expired',
          free_tier_member_limit_reached:
            'This trip is at its 6-member limit. The creator can upgrade to digital tier for unlimited members.',
          not_authenticated: 'Please sign in first',
        };
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: errorMap[res.error] || res.error,
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
        .select('creator_id, total_photos')
        .eq('id', input.tripId)
        .single();

      const trip = data as any;

      if (!trip || trip.creator_id !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the creator can trigger generation',
        });
      }

      if ((trip.total_photos || 0) < 5) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Need at least 5 photos to generate lore',
        });
      }

      await supabase
        .from('trips')
        .update({ lore_status: 'processing' })
        .eq('id', input.tripId);

      await fetch(`${process.env.AI_WORKER_URL!}/generate-lore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.AI_WORKER_SECRET!}`,
        },
        body: JSON.stringify({ trip_id: input.tripId }),
      });

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

      await fetch(`${process.env.AI_WORKER_URL!}/generate-missing-person-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.AI_WORKER_SECRET!}`,
        },
        body: JSON.stringify({
          trip_id: input.tripId,
          absent_user_id: input.userId,
        }),
      });

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
