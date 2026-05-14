import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import { TRPCError } from '@trpc/server';

export const cardsRouter = router({
  /**
   * List all available cards for a trip — used by the share selector UX.
   */
  listForTrip: protectedProcedure
    .input(z.object({ tripId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: trip, error } = await ctx.supabase
        .from('trips')
        .select('id, lore_json, lore_status')
        .eq('id', input.tripId)
        .single();

      if (error || !trip) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      if (trip.lore_status !== 'ready') {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Lore not ready',
        });
      }

      const { data: members } = await ctx.supabase
        .from('trip_members')
        .select('user_id, role_title, role_chaos_rating, profiles:user_id(display_name)')
        .eq('trip_id', input.tripId);

      const lore = trip.lore_json as Record<string, unknown> | null;
      const superlatives =
        (lore?.superlatives as Array<{
          winner_user_id: string;
          winner_name: string;
          question: string;
        }>) || [];
      const hasReceipt =
        Array.isArray(lore?.receipt_stats) &&
        (lore.receipt_stats as unknown[]).length > 0;

      const cards: Array<{
        id: string;
        type: 'trip' | 'character' | 'superlative' | 'receipt';
        url: string;
        label: string;
        sublabel?: string;
        isYours?: boolean;
        memberId?: string;
      }> = [];

      cards.push({
        id: 'trip',
        type: 'trip',
        url: `/api/card/${input.tripId}`,
        label: 'Trip card',
        sublabel: 'The main one',
      });

      for (const m of members || []) {
        if (!m.role_title) continue;
        cards.push({
          id: `character-${m.user_id}`,
          type: 'character',
          url: `/api/card/character/${input.tripId}/${m.user_id}`,
          label: m.role_title,
          sublabel: (m.profiles as { display_name: string } | null)?.display_name,
          isYours: m.user_id === ctx.user.id,
          memberId: m.user_id,
        });
      }

      superlatives.forEach((s, i) => {
        cards.push({
          id: `superlative-${i}`,
          type: 'superlative',
          url: `/api/card/superlative/${input.tripId}/${i}`,
          label: `most likely to ${s.question}`,
          sublabel: s.winner_name,
          isYours: s.winner_user_id === ctx.user.id,
          memberId: s.winner_user_id,
        });
      });

      if (hasReceipt) {
        cards.push({
          id: 'receipt',
          type: 'receipt',
          url: `/api/card/receipt/${input.tripId}`,
          label: 'The receipt',
          sublabel: 'Stats card',
        });
      }

      return cards;
    }),
});
