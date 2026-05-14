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
      const { data: trip, error } = await ctx.supabase
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

      if (error) {
        console.error('trip create failed', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Could not create trip',
        });
      }

      await ctx.supabase.from('trip_members').insert({
        trip_id: trip.id,
        user_id: ctx.user.id,
        status: 'joined',
      });

      return trip;
    }),

  getFull: protectedProcedure
    .input(z.object({ tripId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.rpc('get_trip_full', {
        p_trip_id: input.tripId,
      });

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      if (data && typeof data === 'object' && 'error' in data) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Trip not found or not a member',
        });
      }

      return data;
    }),

  joinByCode: protectedProcedure
    .input(z.object({ inviteCode: z.string().min(6).max(8) }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.rpc('join_trip_by_code', {
        p_invite_code: input.inviteCode.toUpperCase(),
      });

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      if (data?.error) {
        const errorMap: Record<string, string> = {
          invalid_or_expired_code: 'This invite code is invalid or expired',
          free_tier_member_limit_reached:
            'This trip is at its 6-member limit. The creator can upgrade to digital tier for unlimited members.',
          not_authenticated: 'Please sign in first',
        };
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: errorMap[data.error] || data.error,
        });
      }

      return { tripId: data.trip_id };
    }),

  listMine: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
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

    return data.map((row) => row.trips).filter(Boolean);
  }),

  generateLore: protectedProcedure
    .input(z.object({ tripId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: trip } = await ctx.supabase
        .from('trips')
        .select('creator_id, total_photos')
        .eq('id', input.tripId)
        .single();

      if (!trip || trip.creator_id !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the creator can trigger generation',
        });
      }

      if (trip.total_photos < 5) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Need at least 5 photos to generate lore',
        });
      }

      await ctx.supabase
        .from('trips')
        .update({ lore_status: 'processing' })
        .eq('id', input.tripId);

      await fetch(`${process.env.AI_WORKER_URL}/generate-lore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.AI_WORKER_SECRET}`,
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
      const { data, error } = await ctx.supabase.rpc('submit_confession', {
        p_trip_id: input.tripId,
        p_confession: input.confession,
      });

      if (error || data?.error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: data?.error || error?.message || 'Failed',
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
      const { data: trip } = await ctx.supabase
        .from('trips')
        .select('creator_id')
        .eq('id', input.tripId)
        .single();

      if (!trip || trip.creator_id !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      await ctx.supabase
        .from('trip_members')
        .update({
          status: 'absent',
          absence_reason: input.reason,
        })
        .eq('trip_id', input.tripId)
        .eq('user_id', input.userId);

      await fetch(`${process.env.AI_WORKER_URL}/generate-missing-person-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.AI_WORKER_SECRET}`,
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
      await ctx.supabase
        .from('trips')
        .update({
          tier: input.tier,
          payment_id: input.paymentId,
          expires_at: null,
        })
        .eq('id', input.tripId)
        .eq('creator_id', ctx.user.id);

      return { success: true };
    }),
});
