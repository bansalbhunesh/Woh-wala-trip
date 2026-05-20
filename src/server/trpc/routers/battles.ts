import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../init';
import { TRPCError } from '@trpc/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/database.types';

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

// TYPE-02: trip_vs_trip, group_pulse_events, and cast_vs_vote were added after the last
// Supabase codegen. These typed wrappers replace `as any` until TYPE-01 is re-run.

type BackgroundJobInsert = Database['public']['Tables']['background_jobs']['Insert'];

type TripVsTripInsert = {
  trip_a_id: string;
  trip_b_id: string;
  status: string;
  voting_ends_at: string;
};

type TripVsTripCountClient = {
  from: (t: 'trip_vs_trip') => {
    select: (
      col: string,
      opts: { count: 'exact'; head: true }
    ) => {
      or: (filter: string) => {
        gte: (col: string, val: string) => Promise<{ count: number | null }>;
      };
    };
  };
};

type TripVsTripInsertClient = {
  from: (t: 'trip_vs_trip') => {
    insert: (d: TripVsTripInsert) => {
      select: () => {
        single: () => Promise<{ data: BattleRow | null; error: { message: string } | null }>;
      };
    };
  };
};

type TripVsTripSelectClient = {
  from: (t: 'trip_vs_trip') => {
    select: (cols: string) => {
      eq: (
        c: string,
        v: string
      ) => {
        single: () => Promise<{ data: unknown; error: { message: string } | null }>;
      };
    };
  };
};

type GroupPulseInsert = {
  trip_id: string;
  event_type: string;
  actor_user_id: string;
  payload: Record<string, unknown>;
  visible_to: string[];
};
type GroupPulseClient = {
  from: (t: 'group_pulse_events') => {
    insert: (d: GroupPulseInsert) => Promise<{ error: { message: string } | null }>;
  };
};

type BattleRpcClient = {
  rpc: (
    fn: 'cast_vs_vote',
    args: { p_battle_id: string; p_voted_for_trip_id: string; p_fingerprint: string }
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

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

      const { count: recentBattles } = await (ctx.supabase as unknown as TripVsTripCountClient)
        .from('trip_vs_trip')
        .select('id', { count: 'exact', head: true })
        .or(`trip_a_id.in.(${ownedList}),trip_b_id.in.(${ownedList})`)
        .gte('created_at', cutoff);

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

      const { data: battle, error } = await (ctx.supabase as unknown as TripVsTripInsertClient)
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

      // REL-02: durable queue — survives worker cold-starts.
      // trip_id (NOT NULL) uses input.myTripId (the challenger's trip).
      // payload carries battle_id so the worker's judge_battle() call has it.
      // Must use service client — background_jobs has service-role-only RLS.
      const battleAdmin = createSupabaseServiceClient();
      const battleJob: BackgroundJobInsert = {
        trip_id: input.myTripId,
        job_type: 'judge_battle',
        status: 'pending',
        payload: { battle_id: (battle as BattleRow).id },
      };
      const { error: battleJobError } = await battleAdmin.from('background_jobs').insert(battleJob);

      if (battleJobError) {
        console.error('[challenge] failed to enqueue judge_battle job:', battleJobError.message);
      }

      // NOTE: A battle-challenge notification email was previously scheduled here,
      // but the anniversaries cron only handles `anniversary_1yr` and
      // `first_week_followup` email_types — `battle_challenge` rows accumulated
      // forever and were never sent. The in-app group_pulse_events insert below
      // already surfaces battles in the opponent crew's feed, so the email path
      // was removed rather than implemented to keep the surface area small.

      // Emit battle_started pulse event so both crews see it in their Group Pulse feed
      try {
        const { data: bothTripsMembers } = await battleAdmin
          .from('trip_members')
          .select('user_id')
          .in('trip_id', [input.myTripId, input.opponentTripId]);

        const allMemberIds = [
          ...new Set(((bothTripsMembers ?? []) as { user_id: string }[]).map(m => m.user_id)),
        ];

        if (allMemberIds.length > 0) {
          await (battleAdmin as unknown as GroupPulseClient).from('group_pulse_events').insert({
            trip_id: input.myTripId,
            event_type: 'battle_started',
            actor_user_id: ctx.user.id,
            payload: {
              battle_id: (battle as BattleRow).id,
              opponent_trip_id: input.opponentTripId,
            },
            visible_to: allMemberIds,
          });
        }
      } catch (pulseErr) {
        // Non-fatal — battle creation must always succeed even if pulse fails
        console.error('[challenge] group_pulse_events insert failed:', pulseErr);
      }

      return battle;
    }),

  get: publicProcedure
    .input(z.object({ battleId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await (ctx.supabase as unknown as TripVsTripSelectClient)
        .from('trip_vs_trip')
        .select(
          `*,
          trip_a:trip_a_id (id, name, destination, chaos_score, lore_json, total_photos),
          trip_b:trip_b_id (id, name, destination, chaos_score, lore_json, total_photos)`
        )
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Use server-authoritative user ID as the deduplication key.
      // Client-supplied fingerprints are not accepted for authenticated sessions —
      // they can be faked to bypass deduplication.
      const { data, error } = await (ctx.supabase as unknown as BattleRpcClient).rpc(
        'cast_vs_vote',
        {
          p_battle_id: input.battleId,
          p_voted_for_trip_id: input.votedForTripId,
          p_fingerprint: ctx.user.id,
        }
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
