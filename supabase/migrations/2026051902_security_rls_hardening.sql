-- =============================================================================
-- Phase 1 Security Hardening: RLS Policies + otp_codes PK Migration
-- =============================================================================

-- -----------------------------------------------------------------------------
-- SEC-03: background_jobs — add service-role-only policy
-- (RLS was enabled in 20260518_hermes_lorian_observability.sql with zero policies)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "service role full access on background_jobs" ON public.background_jobs;
CREATE POLICY "service role full access on background_jobs"
  ON public.background_jobs FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- -----------------------------------------------------------------------------
-- SEC-09: otp_codes — change PK from email to UUID
-- (allows multiple active OTPs per email; rapid re-send no longer throws PK violation)
-- -----------------------------------------------------------------------------

-- Step 1: Add UUID column with auto-generated default (backfills existing rows immediately)
ALTER TABLE public.otp_codes
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();

-- Step 2: Safety: backfill any row where id is still null
UPDATE public.otp_codes SET id = gen_random_uuid() WHERE id IS NULL;

-- Step 3: Enforce NOT NULL on the new column
ALTER TABLE public.otp_codes ALTER COLUMN id SET NOT NULL;

-- Step 4: Drop the old email primary key constraint
ALTER TABLE public.otp_codes DROP CONSTRAINT IF EXISTS otp_codes_pkey;

-- Step 5: Promote id to primary key
ALTER TABLE public.otp_codes ADD PRIMARY KEY (id);

-- Step 6: Non-unique index on email for efficient per-email lookups
CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON public.otp_codes(email);

-- Step 7: Index on expires_at for the cleanup function
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON public.otp_codes(expires_at);


-- -----------------------------------------------------------------------------
-- SEC-02: otp_codes — enable RLS (was DISABLE RLS in 20260515_otp_codes.sql)
-- Service-role-only: all OTP operations use createSupabaseServiceClient()
-- -----------------------------------------------------------------------------

ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service role full access on otp_codes" ON public.otp_codes;
CREATE POLICY "service role full access on otp_codes"
  ON public.otp_codes FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- -----------------------------------------------------------------------------
-- SEC-02: scheduled_emails — enable RLS (no RLS in 20260516_anniversary_and_reactions.sql)
-- -----------------------------------------------------------------------------

ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;

-- Users can read their own upcoming anniversary emails (future UI surface)
DROP POLICY IF EXISTS "users can read own scheduled emails" ON public.scheduled_emails;
CREATE POLICY "users can read own scheduled emails"
  ON public.scheduled_emails FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Service role full access: cron job reads/updates sent_at; SECURITY DEFINER trigger inserts
DROP POLICY IF EXISTS "service role full access on scheduled_emails" ON public.scheduled_emails;
CREATE POLICY "service role full access on scheduled_emails"
  ON public.scheduled_emails FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- -----------------------------------------------------------------------------
-- SEC-01: trips — enable RLS (no RLS exists anywhere in migrations)
-- IMPORTANT: SELECT policy uses trip_members subquery, NOT a self-referencing trips subquery.
-- trip_members policy is "user_id = auth.uid()" — no cycle.
-- -----------------------------------------------------------------------------

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Trip members (including creator) can read their own trips
DROP POLICY IF EXISTS "trip members can select" ON public.trips;
CREATE POLICY "trip members can select"
  ON public.trips FOR SELECT TO authenticated
  USING (
    creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.trip_members tm
      WHERE tm.trip_id = trips.id
        AND tm.user_id = auth.uid()
    )
  );

-- Defense-in-depth: creator can insert (tRPC create uses service role, so this won't block it)
DROP POLICY IF EXISTS "creator can insert" ON public.trips;
CREATE POLICY "creator can insert"
  ON public.trips FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid());

-- Only creator can update their trip
DROP POLICY IF EXISTS "creator can update" ON public.trips;
CREATE POLICY "creator can update"
  ON public.trips FOR UPDATE TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- Only creator can delete their trip
DROP POLICY IF EXISTS "creator can delete" ON public.trips;
CREATE POLICY "creator can delete"
  ON public.trips FOR DELETE TO authenticated
  USING (creator_id = auth.uid());

-- Service role full access (AI worker, tRPC service-role mutations, OG card route)
DROP POLICY IF EXISTS "service role full access on trips" ON public.trips;
CREATE POLICY "service role full access on trips"
  ON public.trips FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- -----------------------------------------------------------------------------
-- SEC-01: trip_eras — enable RLS (no RLS exists anywhere in migrations)
-- -----------------------------------------------------------------------------

ALTER TABLE public.trip_eras ENABLE ROW LEVEL SECURITY;

-- Trip members can read eras for trips they belong to
DROP POLICY IF EXISTS "trip members can select eras" ON public.trip_eras;
CREATE POLICY "trip members can select eras"
  ON public.trip_eras FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_members tm
      WHERE tm.trip_id = trip_eras.trip_id
        AND tm.user_id = auth.uid()
    )
  );

-- Service role full access (AI worker upserts eras after lore generation)
DROP POLICY IF EXISTS "service role full access on trip_eras" ON public.trip_eras;
CREATE POLICY "service role full access on trip_eras"
  ON public.trip_eras FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- -----------------------------------------------------------------------------
-- SEC-02: trip_stats — enable RLS (no RLS in any migration)
-- -----------------------------------------------------------------------------

ALTER TABLE public.trip_stats ENABLE ROW LEVEL SECURITY;

-- Trip members can read stats for their trips
DROP POLICY IF EXISTS "trip members can read stats" ON public.trip_stats;
CREATE POLICY "trip members can read stats"
  ON public.trip_stats FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_members tm
      WHERE tm.trip_id = trip_stats.trip_id
        AND tm.user_id = auth.uid()
    )
  );

-- Service role full access (AI worker writes stats)
DROP POLICY IF EXISTS "service role full access on trip_stats" ON public.trip_stats;
CREATE POLICY "service role full access on trip_stats"
  ON public.trip_stats FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- -----------------------------------------------------------------------------
-- SEC-02: trip_vs_trip — enable RLS (no RLS in any migration)
-- Members of either trip in a battle can read the record.
-- -----------------------------------------------------------------------------

ALTER TABLE public.trip_vs_trip ENABLE ROW LEVEL SECURITY;

-- Members of either trip can read the battle record
DROP POLICY IF EXISTS "trip members can read battles" ON public.trip_vs_trip;
CREATE POLICY "trip members can read battles"
  ON public.trip_vs_trip FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_members tm
      WHERE (tm.trip_id = trip_vs_trip.trip_a_id OR tm.trip_id = trip_vs_trip.trip_b_id)
        AND tm.user_id = auth.uid()
    )
  );

-- Service role full access (AI worker writes verdicts; battles.ts uses service role for inserts)
DROP POLICY IF EXISTS "service role full access on trip_vs_trip" ON public.trip_vs_trip;
CREATE POLICY "service role full access on trip_vs_trip"
  ON public.trip_vs_trip FOR ALL TO service_role
  USING (true) WITH CHECK (true);

