-- Migration: add processing_started_at to trips
-- Required by the stuck-jobs cron (/api/cron/stuck-jobs) which resets trips
-- stuck in 'processing' state for more than 25 minutes.
--
-- Run this in Supabase Dashboard → SQL Editor, or via `supabase db push`.

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;

-- Index so the stuck-jobs cron query is fast even with many trips
CREATE INDEX IF NOT EXISTS trips_processing_started_at_idx
  ON public.trips (processing_started_at)
  WHERE lore_status = 'processing';

COMMENT ON COLUMN public.trips.processing_started_at IS
  'Set when lore_status transitions to ''processing''. Used by stuck-job cron to detect and reset stalled AI pipeline runs.';
