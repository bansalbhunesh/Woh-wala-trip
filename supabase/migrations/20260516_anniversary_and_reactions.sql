-- Anniversary emails + Lore reactions
-- Run in: https://app.supabase.com/project/lngtsccftumhbycywerg/sql

-- 1. Scheduled anniversary emails table
CREATE TABLE IF NOT EXISTS public.scheduled_emails (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email_type  text NOT NULL, -- 'anniversary_1yr'
  send_at     timestamptz NOT NULL,
  sent_at     timestamptz,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_emails_send_at ON scheduled_emails(send_at) WHERE sent_at IS NULL;

-- Auto-schedule 1-year anniversary when trip lore becomes ready
CREATE OR REPLACE FUNCTION schedule_trip_anniversary()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Only schedule when lore_status changes TO 'ready'
  IF NEW.lore_status = 'ready' AND (OLD.lore_status IS DISTINCT FROM 'ready') THEN
    -- Schedule for all trip members
    INSERT INTO public.scheduled_emails (trip_id, user_id, email_type, send_at)
    SELECT
      NEW.id,
      tm.user_id,
      'anniversary_1yr',
      COALESCE(NEW.trip_start_date::timestamptz, NEW.created_at) + interval '1 year'
    FROM public.trip_members tm
    WHERE tm.trip_id = NEW.id
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_lore_ready_schedule_anniversary ON public.trips;
CREATE TRIGGER on_lore_ready_schedule_anniversary
  AFTER UPDATE ON public.trips
  FOR EACH ROW EXECUTE PROCEDURE schedule_trip_anniversary();

-- 2. Lore reactions table
CREATE TABLE IF NOT EXISTS public.lore_reactions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id    uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  -- null user_id = anonymous reaction from public story view
  slide_type text NOT NULL, -- 'cooked', 'verdict', 'character', 'superlative', etc.
  slide_idx  int,           -- for indexed slides (era 0, superlative 2, etc.)
  emoji      text NOT NULL, -- '🔥', '😂', '💔', '👑', '😭'
  created_at timestamptz DEFAULT now()
);

-- One reaction per user per slide (upsert friendly)
CREATE UNIQUE INDEX IF NOT EXISTS idx_lore_reactions_unique
  ON lore_reactions(trip_id, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid), slide_type, COALESCE(slide_idx, -1));

-- Allow anonymous reads (public story reactions visible without login)
ALTER TABLE public.lore_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read reactions"
  ON public.lore_reactions FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "authenticated users can react"
  ON public.lore_reactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "anyone can react on public story (anon)"
  ON public.lore_reactions FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

-- Reaction counts view (efficient aggregation)
CREATE OR REPLACE VIEW lore_reaction_counts AS
SELECT
  trip_id,
  slide_type,
  slide_idx,
  emoji,
  count(*) as count
FROM lore_reactions
GROUP BY trip_id, slide_type, slide_idx, emoji;
