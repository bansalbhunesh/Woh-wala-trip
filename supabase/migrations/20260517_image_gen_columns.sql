-- Image generation columns (Sana via fal.ai)
-- Run in Supabase SQL editor

alter table public.trips
  add column if not exists cover_image_url text;

alter table public.trip_members
  add column if not exists portrait_url text;

alter table public.trip_eras
  add column if not exists thumbnail_url text;

-- Storage buckets (run in Supabase dashboard → Storage → New bucket,
-- or via supabase CLI: supabase storage create trip-covers --public)
-- Buckets needed (all public):
--   trip-covers
--   trip-portraits
--   trip-era-thumbnails
