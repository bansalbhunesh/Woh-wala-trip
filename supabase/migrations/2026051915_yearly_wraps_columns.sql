-- Add trip_ids and status columns to yearly_wraps that were previously
-- written via as-unknown-as casts (exposed by Supabase types regeneration).
ALTER TABLE public.yearly_wraps
  ADD COLUMN IF NOT EXISTS trip_ids  uuid[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS status    text    DEFAULT 'pending';

COMMENT ON COLUMN public.yearly_wraps.trip_ids IS 'Array of trip IDs included in this yearly wrap';
COMMENT ON COLUMN public.yearly_wraps.status IS 'processing | ready | failed';
