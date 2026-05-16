-- ─────────────────────────────────────────────────────────────────────────────
-- CROSS-TRIP FEATURES: user archetypes, yearly wraps, public profiles
-- Run in Supabase SQL editor:
--   https://app.supabase.com/project/lngtsccftumhbycywerg/sql
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. user_archetypes — tracks each user's character role per trip
-- Powers the "recurring character" system (Rohit always disappearing...)
CREATE TABLE IF NOT EXISTS public.user_archetypes (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id            uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  role_title         text,
  role_archetype_tag text,
  role_chaos_rating  int,
  trip_name          text,
  trip_destination   text,
  trip_year          int,
  created_at         timestamptz DEFAULT now(),
  UNIQUE(user_id, trip_id)
);

ALTER TABLE public.user_archetypes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read own archetypes"
  ON public.user_archetypes FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "service role manages archetypes"
  ON public.user_archetypes FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 2. yearly_wraps — AI-generated yearly friendship summary
CREATE TABLE IF NOT EXISTS public.yearly_wraps (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year       int  NOT NULL,
  wrap_json  jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, year)
);

ALTER TABLE public.yearly_wraps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read own wraps"
  ON public.yearly_wraps FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "public can read wraps"
  ON public.yearly_wraps FOR SELECT TO anon
  USING (true);

CREATE POLICY "service role manages wraps"
  ON public.yearly_wraps FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 3. Add username + bio to profiles; add is_public flag to trips
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio     text;
ALTER TABLE public.trips    ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;

-- Case-insensitive unique index for username lookups
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_idx
  ON public.profiles(lower(username))
  WHERE username IS NOT NULL;

-- 4. Function: upsert user archetype after lore generation
-- Called by the app once lore is ready to persist the character role.
CREATE OR REPLACE FUNCTION public.upsert_user_archetype(
  p_user_id          uuid,
  p_trip_id          uuid,
  p_role_title       text,
  p_archetype_tag    text,
  p_chaos_rating     int,
  p_trip_name        text,
  p_trip_destination text,
  p_trip_year        int
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_archetypes
    (user_id, trip_id, role_title, role_archetype_tag, role_chaos_rating,
     trip_name, trip_destination, trip_year)
  VALUES
    (p_user_id, p_trip_id, p_role_title, p_archetype_tag, p_chaos_rating,
     p_trip_name, p_trip_destination, p_trip_year)
  ON CONFLICT (user_id, trip_id) DO UPDATE SET
    role_title         = EXCLUDED.role_title,
    role_archetype_tag = EXCLUDED.role_archetype_tag,
    role_chaos_rating  = EXCLUDED.role_chaos_rating;
END;
$$;

-- 5. Function: get user's full archetype history (all trips, newest first)
CREATE OR REPLACE FUNCTION public.get_user_archetype_history(p_user_id uuid)
RETURNS TABLE(
  trip_id            uuid,
  trip_name          text,
  trip_destination   text,
  trip_year          int,
  role_title         text,
  role_archetype_tag text,
  role_chaos_rating  int,
  created_at         timestamptz
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    trip_id, trip_name, trip_destination, trip_year,
    role_title, role_archetype_tag, role_chaos_rating, created_at
  FROM public.user_archetypes
  WHERE user_id = p_user_id
  ORDER BY created_at DESC;
$$;

-- 6. View: safe public profile data
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  p.id,
  p.username,
  p.display_name,
  p.bio,
  COUNT(DISTINCT tm.trip_id) FILTER (WHERE t.is_public = true) AS public_trip_count,
  MAX(ua.role_chaos_rating)        AS peak_chaos_rating,
  ROUND(AVG(ua.role_chaos_rating)) AS avg_chaos_rating
FROM public.profiles p
LEFT JOIN public.trip_members    tm ON tm.user_id = p.id
LEFT JOIN public.trips            t ON t.id = tm.trip_id
LEFT JOIN public.user_archetypes ua ON ua.user_id = p.id
WHERE p.username IS NOT NULL
GROUP BY p.id, p.username, p.display_name, p.bio;

GRANT SELECT ON public.public_profiles TO anon, authenticated;
