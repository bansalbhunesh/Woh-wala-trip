-- Fix infinite recursion on public.trip_members SELECT RLS policy
-- By introducing a security definer helper function that bypasses RLS,
-- we can securely check if the authenticated user is a member of the trip
-- without causing recursive SELECT policy checks.

-- 1. Create the security definer function
CREATE OR REPLACE FUNCTION public.is_member_of_trip(p_trip_id uuid)
RETURNS boolean SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_id = p_trip_id AND user_id = auth.uid()
  );
END;
$$;

-- 2. Drop the recursive SELECT policies on public.trip_members
DROP POLICY IF EXISTS "users can read trip memberships they belong to" ON public.trip_members;
DROP POLICY IF EXISTS "users can read own memberships" ON public.trip_members;

-- 3. Create the optimized SELECT policy on public.trip_members using our helper function
CREATE POLICY "users can read trip memberships they belong to"
ON public.trip_members FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_member_of_trip(trip_id)
);

-- 4. Re-apply trips SELECT policy to also use the helper function
DROP POLICY IF EXISTS "trip members can select" ON public.trips;
CREATE POLICY "trip members can select"
  ON public.trips FOR SELECT TO authenticated
  USING (
    creator_id = auth.uid()
    OR public.is_member_of_trip(id)
  );
