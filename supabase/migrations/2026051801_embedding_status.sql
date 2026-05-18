-- Track CLIP embedding status per photo so the frontend can detect silent failures.
-- null  = not yet attempted (worker hasn't processed this photo yet)
-- ready = embedding stored in clip_embedding column and ready for similarity search
-- failed = worker attempted but could not extract embedding (HEIC decode error, etc.)
--
-- If > 20% of a trip's photos have status = 'failed', the findSimilar UI is hidden
-- rather than showing misleadingly sparse results.

ALTER TABLE public.photos
  ADD COLUMN IF NOT EXISTS embedding_status TEXT
  CHECK (embedding_status IN ('ready', 'failed'));

-- Index for the trip-level health check query
CREATE INDEX IF NOT EXISTS idx_photos_embedding_status
  ON public.photos(trip_id, embedding_status)
  WHERE embedding_status IS NOT NULL;

-- Backfill: photos that already have a clip_embedding are implicitly 'ready'
UPDATE public.photos
SET embedding_status = 'ready'
WHERE clip_embedding IS NOT NULL
  AND embedding_status IS NULL;
