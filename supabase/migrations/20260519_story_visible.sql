-- PROD-02: Add story_visible flag to trips.
-- Default true (existing trips continue to show their story publicly).
-- Trip creators can set this to false to hide their story from the public /t/[code]/story route.

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS story_visible boolean NOT NULL DEFAULT true;

-- Comment documents the column purpose
COMMENT ON COLUMN public.trips.story_visible IS
  'When false, the public /t/[code]/story route shows a "Story Hidden" placeholder instead of the full lore. Only the trip creator can toggle this. Default true.';
