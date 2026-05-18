-- OTP codes table for custom email authentication
-- Run this in your Supabase SQL editor: https://app.supabase.com/project/lngtsccftumhbycywerg/sql

CREATE TABLE IF NOT EXISTS public.otp_codes (
  email      text PRIMARY KEY,
  code       text NOT NULL,
  expires_at timestamptz NOT NULL,
  used       boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Allow the anon/service role to insert and read OTP codes
-- (No RLS needed since this is server-only access via API routes)
ALTER TABLE public.otp_codes DISABLE ROW LEVEL SECURITY;

-- Auto-cleanup: remove codes older than 1 hour
CREATE OR REPLACE FUNCTION cleanup_expired_otp_codes()
RETURNS void LANGUAGE sql AS $$
  DELETE FROM public.otp_codes WHERE expires_at < now() - interval '1 hour';
$$;
