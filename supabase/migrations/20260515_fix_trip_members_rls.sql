-- Fix infinite recursion in trip_members RLS
-- Run in: https://app.supabase.com/project/lngtsccftumhbycywerg/sql

-- Drop the recursive policy (subquery on trip_members inside trip_members policy = infinite loop)
DROP POLICY IF EXISTS "users can read trip memberships they belong to" ON public.trip_members;

-- Simple non-recursive policy: users can read their own membership rows
CREATE POLICY "users can read own memberships"
ON public.trip_members FOR SELECT TO authenticated
USING (user_id = auth.uid());
