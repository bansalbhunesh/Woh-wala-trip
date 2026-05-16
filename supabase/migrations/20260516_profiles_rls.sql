-- Add RLS to profiles table
-- Run in: https://app.supabase.com/project/lngtsccftumhbycywerg/sql

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read any profile (needed for trip member display names)
CREATE POLICY "profiles are publicly readable by authenticated users"
ON public.profiles FOR SELECT TO authenticated
USING (true);

-- Users can only update their own profile
CREATE POLICY "users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Users can insert their own profile (handle_new_user trigger also does this)
CREATE POLICY "users can insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());
