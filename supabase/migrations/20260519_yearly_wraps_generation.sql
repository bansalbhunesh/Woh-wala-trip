-- FEAT-V2-01: Yearly Wraps generation pipeline support.
-- Creates the yearly_wraps table if it does not already exist.
-- Safe to run multiple times (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS public.yearly_wraps (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  year        integer NOT NULL CHECK (year >= 2020 AND year <= 2030),
  trip_ids    uuid[] NOT NULL DEFAULT '{}',
  wrap_json   jsonb,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT yearly_wraps_user_year_unique UNIQUE (user_id, year)
);

-- Updated_at trigger (reuse the existing moddatetime extension if present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_yearly_wraps_updated_at'
  ) THEN
    CREATE TRIGGER set_yearly_wraps_updated_at
      BEFORE UPDATE ON public.yearly_wraps
      FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
  END IF;
EXCEPTION WHEN others THEN
  -- moddatetime extension not available — skip trigger
  NULL;
END;
$$;

-- Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS idx_yearly_wraps_user_year ON public.yearly_wraps (user_id, year DESC);

-- RLS: users can only see and manage their own wraps
ALTER TABLE public.yearly_wraps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can manage own yearly wraps" ON public.yearly_wraps;
CREATE POLICY "users can manage own yearly wraps"
  ON public.yearly_wraps
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
