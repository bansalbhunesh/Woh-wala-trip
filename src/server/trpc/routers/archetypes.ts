import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../init';
import { TRPCError } from '@trpc/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

export const archetypesRouter = router({
  // Get a user's archetype history across all trips
  getHistory: protectedProcedure.query(async ({ ctx }) => {
    const admin = createSupabaseServiceClient();
    const { data } = await admin
      .from('user_archetypes' as never)
      .select('*')
      .eq('user_id' as never, ctx.user.id)
      .order('created_at' as never, { ascending: false });
    return (data as any[]) || [];
  }),

  // Sync archetype from a trip's lore into user_archetypes
  syncFromTrip: protectedProcedure
    .input(z.object({ tripId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const admin = createSupabaseServiceClient();

      // Get the trip member record for this user
      const { data: member } = await admin
        .from('trip_members' as never)
        .select('*, trips:trip_id(name, destination, trip_start_date, lore_status)')
        .eq('trip_id' as never, input.tripId)
        .eq('user_id' as never, ctx.user.id)
        .single();

      const m = member as any;
      if (!m?.role_title) return { synced: false, reason: 'no role assigned yet' };
      if (m?.trips?.lore_status !== 'ready') return { synced: false, reason: 'lore not ready' };

      const tripYear = m.trips.trip_start_date
        ? new Date(m.trips.trip_start_date).getFullYear()
        : new Date().getFullYear();

      await admin.rpc('upsert_user_archetype' as never, {
        p_user_id: ctx.user.id,
        p_trip_id: input.tripId,
        p_role_title: m.role_title,
        p_archetype_tag: m.role_archetype_tag ?? m.role_title,
        p_chaos_rating: m.role_chaos_rating ?? 5,
        p_trip_name: m.trips.name,
        p_trip_destination: m.trips.destination ?? '',
        p_trip_year: tripYear,
      } as never);

      return { synced: true };
    }),

  // Get public archetype history by username (for public profile)
  getPublicHistory: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ input }) => {
      const admin = createSupabaseServiceClient();
      // Find user by username
      const { data: profile } = await admin
        .from('profiles' as never)
        .select('id')
        .eq('username' as never, input.username.toLowerCase())
        .single();
      if (!profile) return [];
      const { data } = await admin
        .from('user_archetypes' as never)
        .select('*')
        .eq('user_id' as never, (profile as any).id)
        .order('created_at' as never, { ascending: false });
      return (data as any[]) || [];
    }),
});
