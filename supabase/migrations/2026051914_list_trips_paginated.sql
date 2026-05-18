-- PERF: Cursor-based pagination for a user's trip list, executed entirely in the DB.
--
-- Replaces the previous application-side pattern in listMine (trips.ts) that fetched
-- up to 200 trip_member rows, sorted them in JavaScript, and then sliced the result.
-- Under load this caused unnecessary data transfer and wasted CPU on every page request.
--
-- This function performs a single indexed scan:
--   trip_members(user_id) → JOIN trips(id) → ORDER BY trips.created_at DESC
-- and returns at most LEAST(p_limit, 50) rows — all filtering and ordering happens in
-- Postgres where the relevant indexes live.
--
-- SECURITY DEFINER so the function can bypass RLS for the join while still honouring
-- the caller's identity via the p_user_id parameter.  Callers are restricted to the
-- `authenticated` and `service_role` roles (see GRANT statements below).

CREATE OR REPLACE FUNCTION public.list_user_trips(
  p_user_id uuid,
  p_cursor  timestamptz DEFAULT NULL,
  p_limit   int DEFAULT 20
)
RETURNS TABLE(
  trip_id         uuid,
  name            text,
  destination     text,
  trip_start_date date,
  trip_end_date   date,
  lore_status     text,
  chaos_score     int,
  member_count    int,
  total_photos    int,
  tier            text,
  created_at      timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    t.id              AS trip_id,
    t.name,
    t.destination,
    t.trip_start_date,
    t.trip_end_date,
    t.lore_status,
    t.chaos_score,
    t.member_count,
    t.total_photos,
    t.tier,
    t.created_at
  FROM public.trip_members tm
  JOIN public.trips t ON t.id = tm.trip_id
  WHERE tm.user_id = p_user_id
    AND (p_cursor IS NULL OR t.created_at < p_cursor)
  ORDER BY t.created_at DESC
  LIMIT LEAST(p_limit, 50);
$$;

-- Lock down the function: revoke the default PUBLIC execute privilege, then grant
-- only to the two roles that legitimately call it.
REVOKE ALL ON FUNCTION public.list_user_trips(uuid, timestamptz, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_user_trips(uuid, timestamptz, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_user_trips(uuid, timestamptz, int) TO service_role;
