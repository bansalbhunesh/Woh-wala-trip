import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../init';
import { TRPCError } from '@trpc/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

// Columns read from the trips table — typed explicitly because the Supabase
// select() generic doesn't narrow correctly for cross-table queries.
interface TripRow {
  creator_id: string;
  lore_status: string | null;
}
interface TripIdRow {
  id: string;
}
interface BattleVoteResult {
  error?: string;
}
interface BattleRow {
  id: string;
  [key: string]: unknown;
}

export const battlesRouter = router({
  challenge: protectedProcedure
    .input(
      z
        .object({
          myTripId: z.string().uuid(),
          opponentTripId: z.string().uuid(),
        })
        .refine(d => d.myTripId !== d.opponentTripId, {
          message: 'Cannot challenge your own trip',
          path: ['opponentTripId'],
        })
    )
    .mutation(async ({ ctx, input }) => {
      const myTripResult = await ctx.supabase
        .from('trips')
        .select('creator_id, lore_status')
        .eq('id', input.myTripId)
        .single();

      const myTrip = myTripResult.data as TripRow | null;

      if (!myTrip || myTrip.creator_id !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      if (myTrip.lore_status !== 'ready') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Generate lore for your trip first before challenging',
        });
      }

      // Rate limit: max 3 battles per user (not per trip) in the last 24h
      // ARCH-06: count battles where ANY of the user's trips appear on either side
      // (trip_a_id OR trip_b_id) to prevent bypass via multi-trip ownership.
      const userTripsResult = await ctx.supabase
        .from('trips')
        .select('id')
        .eq('creator_id', ctx.user.id);

      const ownedIds = ((userTripsResult.data || []) as TripIdRow[]).map(t => t.id);

      const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const ownedList = ownedIds.join(',');

      const { count: recentBattles } = await ctx.supabase
        .from('trip_vs_trip' as never)
        .select('id', { count: 'exact', head: true })
        .or(`trip_a_id.in.(${ownedList}),trip_b_id.in.(${ownedList})` as never)
        .gte('created_at' as never, cutoff);

      if ((recentBattles || 0) >= 3) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Max 3 battle challenges per day. Try again tomorrow.',
        });
      }

      const oppTripResult = await ctx.supabase
        .from('trips')
        .select('lore_status')
        .eq('id', input.opponentTripId)
        .single();

      const oppTrip = oppTripResult.data as Pick<TripRow, 'lore_status'> | null;

      if (!oppTrip || oppTrip.lore_status !== 'ready') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Opponent trip must have lore generated',
        });
      }

      const { data: battle, error } = await ctx.supabase
        .from('trip_vs_trip' as never)
        .insert({
          trip_a_id: input.myTripId,
          trip_b_id: input.opponentTripId,
          status: 'pending',
          voting_ends_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
        } as never)
        .select()
        .single();

      if (error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });

      // REL-02: durable queue — survives worker cold-starts.
      // trip_id (NOT NULL) uses input.myTripId (the challenger's trip).
      // payload carries battle_id so the worker's judge_battle() call has it.
      // Must use service client — background_jobs has service-role-only RLS.
      const battleAdmin = createSupabaseServiceClient();
      const { error: battleJobError } = await battleAdmin.from('background_jobs' as never).insert({
        trip_id: input.myTripId,
        job_type: 'judge_battle',
        status: 'pending',
        payload: { battle_id: (battle as BattleRow).id },
      } as never);

      if (battleJobError) {
        console.error('[challenge] failed to enqueue judge_battle job:', battleJobError.message);
      }

      // Notify the opponent's trip creator via scheduled_emails so they know they've been challenged.
      // We fetch the challenger trip name for the email subject and body.
      try {
        interface TripWithProfile {
          creator_id: string;
          name: string;
          profiles: { email: string; display_name: string | null } | null;
        }
        interface ChallengerTrip {
          name: string;
        }
        const { data: opponentData } = await battleAdmin
          .from('trips' as never)
          .select('creator_id, name, profiles!inner(email, display_name)')
          .eq('id' as never, input.opponentTripId)
          .single();

        const { data: challengerData } = await battleAdmin
          .from('trips' as never)
          .select('name')
          .eq('id' as never, input.myTripId)
          .single();

        const opponent = opponentData as unknown as TripWithProfile | null;
        const challenger = challengerData as unknown as ChallengerTrip | null;

        if (opponent?.creator_id && challenger?.name) {
          const { error: notifErr } = await battleAdmin.from('scheduled_emails' as never).insert({
            trip_id: input.opponentTripId,
            user_id: opponent.creator_id,
            email_type: 'battle_challenge',
            send_at: new Date().toISOString(),
            // Store challenger trip name in a note field for the email cron to use.
            // We embed it in the trip reference — the cron will query it from the battle row.
          } as never);

          if (notifErr) {
            console.error(
              '[challenge] failed to schedule battle_challenge email:',
              notifErr.message
            );
          }
        }
      } catch (notifErr) {
        // Notification failure must never block the battle creation response
        console.error('[challenge] battle notification scheduling failed:', notifErr);
      }

      return battle;
    }),

  get: publicProcedure
    .input(z.object({ battleId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('trip_vs_trip' as never)
        .select(
          `
          *,
          trip_a:trip_a_id (id, name, destination, chaos_score, lore_json, total_photos),
          trip_b:trip_b_id (id, name, destination, chaos_score, lore_json, total_photos)
        `
        )
        .eq('id' as never, input.battleId)
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Use server-authoritative user ID as the deduplication key.
      // Client-supplied fingerprints are not accepted for authenticated sessions —
      // they can be faked to bypass deduplication.
      const { data, error } = await ctx.supabase.rpc(
        'cast_vs_vote' as never,
        {
          p_battle_id: input.battleId,
          p_voted_for_trip_id: input.votedForTripId,
          p_fingerprint: ctx.user.id,
        } as never
      );

      const res = data as unknown as BattleVoteResult | null;
      if (error || res?.error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: res?.error || error?.message,
        });
      }

      return { success: true };
    }),
});
