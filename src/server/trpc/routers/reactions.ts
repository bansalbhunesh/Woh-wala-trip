import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../init';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

const VALID_EMOJIS = ['🔥', '😂', '💔', '👑', '😭'] as const;

export const reactionsRouter = router({
  // Add a reaction (requires auth) — user-scoped client so RLS enforces ownership
  add: protectedProcedure
    .input(z.object({
      tripId: z.string().uuid(),
      slideType: z.string(),
      slideIdx: z.number().optional(),
      emoji: z.enum(VALID_EMOJIS),
    }))
    .mutation(async ({ ctx, input }) => {
      const supabase = ctx.supabase as any;
      await supabase.from('lore_reactions').upsert({
        trip_id: input.tripId,
        user_id: ctx.user.id,
        slide_type: input.slideType,
        slide_idx: input.slideIdx ?? null,
        emoji: input.emoji,
      }, { onConflict: 'trip_id,user_id,slide_type,slide_idx' });
      return { ok: true };
    }),

  // Get reaction counts for a trip (public — service role to read across all users)
  getCounts: publicProcedure
    .input(z.object({ tripId: z.string().uuid() }))
    .query(async ({ input }) => {
      const admin = createSupabaseServiceClient();
      const { data } = await admin
        .from('lore_reactions' as never)
        .select('slide_type, slide_idx, emoji')
        .eq('trip_id' as never, input.tripId);

      // Aggregate counts client-side
      const counts: Record<string, number> = {};
      for (const row of (data as any[] || [])) {
        const key = `${row.slide_type}:${row.slide_idx ?? -1}:${row.emoji}`;
        counts[key] = (counts[key] || 0) + 1;
      }
      return counts;
    }),
});
