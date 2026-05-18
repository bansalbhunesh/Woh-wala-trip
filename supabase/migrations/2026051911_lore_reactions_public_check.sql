-- =============================================================================
-- Defense-in-depth: anonymous reactions can only be inserted for public trips.
--
-- The API route (reactions/route.ts) already enforces this at the application
-- layer, but that guard can be bypassed if someone posts directly to the
-- Supabase REST API (PostgREST) with the anon key.
--
-- This policy adds a second enforcement layer at the database level so that
-- even a direct API call cannot insert an anonymous reaction on a private trip.
-- =============================================================================

DROP POLICY IF EXISTS "anyone can react on public story (anon)" ON public.lore_reactions;
DROP POLICY IF EXISTS "anon can insert reactions" ON public.lore_reactions;

CREATE POLICY "anon can insert reactions on public trips only"
  ON public.lore_reactions FOR INSERT TO anon
  WITH CHECK (
    user_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.trips
      WHERE id = lore_reactions.trip_id
        AND is_public = true
    )
  );
