-- Migration: atomic total_photos counter via Postgres trigger
-- Replaces the application-level read-modify-write in confirmUpload which is
-- vulnerable to race conditions under concurrent uploads.
--
-- Run in Supabase Dashboard → SQL Editor, or via `supabase db push`.

CREATE OR REPLACE FUNCTION public.sync_trip_photo_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.trip_id IS NOT NULL THEN
    UPDATE public.trips
    SET total_photos = total_photos + 1
    WHERE id = NEW.trip_id;
  ELSIF TG_OP = 'DELETE' AND OLD.trip_id IS NOT NULL THEN
    UPDATE public.trips
    SET total_photos = GREATEST(0, total_photos - 1)
    WHERE id = OLD.trip_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Drop existing trigger if it exists so re-running is safe
DROP TRIGGER IF EXISTS photos_count_trigger ON public.photos;

CREATE TRIGGER photos_count_trigger
  AFTER INSERT OR DELETE ON public.photos
  FOR EACH ROW EXECUTE FUNCTION public.sync_trip_photo_count();

-- Backfill current counts from real row counts
UPDATE public.trips t
SET total_photos = (
  SELECT COUNT(*) FROM public.photos p WHERE p.trip_id = t.id
);
