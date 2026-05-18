-- FEAT-V2-02: Per-member photo privacy controls.
-- Adds is_private boolean to photos table and updates the RLS SELECT policy.

ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

-- Update SELECT policy so private photos are only visible to the uploader.
-- The previous policy "trip members can view photos" is replaced with a version that
-- respects is_private. All other (INSERT / UPDATE / DELETE) policies are unchanged.
DROP POLICY IF EXISTS "trip members can view photos" ON public.photos;
CREATE POLICY "trip members can view photos"
  ON public.photos FOR SELECT TO authenticated
  USING (
    (
      is_private = false
      AND EXISTS (
        SELECT 1 FROM public.trip_members
        WHERE trip_id = photos.trip_id
          AND user_id = auth.uid()
      )
    )
    OR user_id = auth.uid()   -- uploader always sees their own photos
  );

-- Index so the uploader filter is fast even on large photo tables
CREATE INDEX IF NOT EXISTS idx_photos_user_private ON public.photos (user_id, is_private);
