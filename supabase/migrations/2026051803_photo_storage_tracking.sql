-- Track per-photo file size and aggregate storage usage per trip.
-- Enables a 500 MB soft limit on free-tier trips before the confirmUpload path.

ALTER TABLE public.photos
  ADD COLUMN IF NOT EXISTS file_size BIGINT;

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS storage_used_bytes BIGINT NOT NULL DEFAULT 0;

-- Atomically maintain storage_used_bytes whenever a photo is inserted or deleted.
CREATE OR REPLACE FUNCTION public.sync_trip_storage_bytes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.trip_id IS NOT NULL AND NEW.file_size IS NOT NULL THEN
    UPDATE public.trips
    SET storage_used_bytes = storage_used_bytes + NEW.file_size
    WHERE id = NEW.trip_id;
  ELSIF TG_OP = 'DELETE' AND OLD.trip_id IS NOT NULL AND OLD.file_size IS NOT NULL THEN
    UPDATE public.trips
    SET storage_used_bytes = GREATEST(0, storage_used_bytes - OLD.file_size)
    WHERE id = OLD.trip_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS photos_storage_trigger ON public.photos;
CREATE TRIGGER photos_storage_trigger
  AFTER INSERT OR DELETE ON public.photos
  FOR EACH ROW EXECUTE FUNCTION public.sync_trip_storage_bytes();

-- Backfill existing trips from current photo data
UPDATE public.trips t
SET storage_used_bytes = (
  SELECT COALESCE(SUM(file_size), 0)
  FROM public.photos p
  WHERE p.trip_id = t.id
    AND p.file_size IS NOT NULL
);
