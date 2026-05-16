import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../init';
import { TRPCError } from '@trpc/server';

export const battlesRouter = router({
  challenge: protectedProcedure
    .input(
      z.object({
        myTripId: z.string().uuid(),
        opponentTripId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const supabase = ctx.supabase as any;
      const { data: myTrip } = await supabase
        .from('trips')
        .select('creator_id, lore_status')
        .eq('id', input.myTripId)
        .single();

      if (!myTrip || myTrip.creator_id !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      if (myTrip.lore_status !== 'ready') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Generate lore for your trip first before challenging',
        });
      }

      const { data: oppTrip } = await supabase
        .from('trips')
        .select('lore_status')
        .eq('id', input.opponentTripId)
        .single();

      if (!oppTrip || oppTrip.lore_status !== 'ready') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Opponent trip must have lore generated',
        });
      }

      const { data: battle, error } = await supabase
        .from('trip_vs_trip')
        .insert({
          trip_a_id: input.myTripId,
          trip_b_id: input.opponentTripId,
          status: 'pending',
          voting_ends_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
        })
        .select()
        .single();

      if (error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });

      await fetch(`${process.env.AI_WORKER_URL!}/judge-battle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.AI_WORKER_SECRET!}`,
        },
        body: JSON.stringify({ battle_id: battle.id }),
      });

      return battle;
    }),

  get: publicProcedure
    .input(z.object({ battleId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const supabase = ctx.supabase as any;
      const { data, error } = await supabase
        .from('trip_vs_trip')
        .select(`
          *,
          trip_a:trip_a_id (id, name, destination, chaos_score, lore_json, total_photos),
          trip_b:trip_b_id (id, name, destination, chaos_score, lore_json, total_photos)
        `)
        .eq('id', input.battleId)
        .single();

      if (error || !data) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      return data;
    }),

  vote: protectedProcedure
    .input(
      z.object({
        battleId: z.string().uuid(),
        votedForTripId: z.string().uuid(),
        fingerprint: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const supabase = ctx.supabase as any;
      const { data, error } = await supabase.rpc('cast_vs_vote', {
        p_battle_id: input.battleId,
        p_voted_for_trip_id: input.votedForTripId,
        p_fingerprint: input.fingerprint || null,
      });

      const res = data as any;
      if (error || res?.error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: res?.error || error?.message,
        });
      }

      return { success: true };
    }),
});
