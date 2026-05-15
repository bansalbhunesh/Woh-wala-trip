-- Storage bucket + photos table RLS policies
-- Run in: https://app.supabase.com/project/lngtsccftumhbycywerg/sql

-- 1. Create the trip-photos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'trip-photos',
  'trip-photos',
  false,
  52428800, -- 50MB limit
  ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage object policies — trip members can upload/read
CREATE POLICY "trip members can upload photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'trip-photos'
  AND EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_members.user_id = auth.uid()
    AND trip_members.trip_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "trip members can read photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'trip-photos'
  AND EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_members.user_id = auth.uid()
    AND trip_members.trip_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "trip members can delete own photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'trip-photos'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- 3. Photos table RLS
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trip members can insert photos"
ON public.photos FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_members.trip_id = photos.trip_id
    AND trip_members.user_id = auth.uid()
  )
);

CREATE POLICY "trip members can view photos"
ON public.photos FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_members.trip_id = photos.trip_id
    AND trip_members.user_id = auth.uid()
  )
);

-- 4. Trip members table RLS (must be readable for the above to work)
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read trip memberships they belong to"
ON public.trip_members FOR SELECT TO authenticated
USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM trip_members tm2
  WHERE tm2.trip_id = trip_members.trip_id
  AND tm2.user_id = auth.uid()
));

CREATE POLICY "users can insert their own membership"
ON public.trip_members FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());
