-- Cache signed storage URLs on photo rows to avoid regenerating them on every list call.
-- Signed URLs are valid for 3600s; we reuse them if > 10 min remain (url_expires_at > now + 10m).
-- On a trip with 50 photos opened 5× per hour this reduces Storage API calls by ~80%.

ALTER TABLE public.photos
  ADD COLUMN IF NOT EXISTS signed_url      TEXT,
  ADD COLUMN IF NOT EXISTS thumb_signed_url TEXT,
  ADD COLUMN IF NOT EXISTS url_expires_at  TIMESTAMPTZ;

-- Index for the "which rows need a refresh?" query in photos.list
CREATE INDEX IF NOT EXISTS idx_photos_url_expires_at
  ON public.photos(trip_id, url_expires_at)
  WHERE url_expires_at IS NOT NULL;
