-- =============================================================================
-- Phase 1 Security Foundation: RLS Verification Script
-- Run this in the Supabase SQL editor AFTER applying 20260519_security_rls_hardening.sql
-- Expected: all rows show rowsecurity = true and all expected policies appear.
-- NOTE: This is a verification script, not a migration. Do NOT apply via supabase db reset.
-- =============================================================================

-- 1. Check RLS is enabled on all target tables
SELECT
  tablename,
  rowsecurity,
  CASE WHEN rowsecurity THEN 'OK' ELSE 'FAIL — RLS NOT ENABLED' END AS status
FROM pg_tables
WHERE
  schemaname = 'public'
  AND tablename IN (
    'trips', 'trip_eras', 'scheduled_emails',
    'otp_codes', 'trip_stats', 'trip_vs_trip', 'background_jobs'
  )
ORDER BY tablename;


-- 2. List all policies on target tables
SELECT
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE
  schemaname = 'public'
  AND tablename IN (
    'trips', 'trip_eras', 'scheduled_emails',
    'otp_codes', 'trip_stats', 'trip_vs_trip', 'background_jobs'
  )
ORDER BY tablename, policyname;


-- 3. Confirm otp_codes PK is now on the uuid column (not email)
SELECT
  kcu.column_name,
  tc.constraint_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE
  tc.table_schema = 'public'
  AND tc.table_name = 'otp_codes'
  AND tc.constraint_type = 'PRIMARY KEY';
-- Expected: column_name = 'id'


-- 4. Confirm otp_codes email index exists (for efficient per-email queries)
SELECT indexname, indexdef
FROM pg_indexes
WHERE
  schemaname = 'public'
  AND tablename = 'otp_codes'
  AND indexname = 'idx_otp_codes_email';
-- Expected: one row


-- 5. Spot-check: verify non-member cannot read trips via user-scoped client
-- (Run this as an authenticated user who is NOT a member of any trip)
-- SELECT id, name FROM public.trips LIMIT 5;
-- Expected: 0 rows
