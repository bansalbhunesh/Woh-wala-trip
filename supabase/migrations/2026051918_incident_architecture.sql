-- ============================================================
-- Incident Architecture: Structured Memory Reconstruction
-- ============================================================
-- Replaces the "giant lore blob" model with discrete, explorable
-- incident records. Each incident has confidence levels, evidence
-- citations, and contestation status.
-- See docs/STORYTELLING.md for the design philosophy.

-- ── Structured incidents ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS trip_incidents (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id          uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  incident_ref     text NOT NULL,  -- "INC-001" — human-readable reference
  title            text NOT NULL,
  timeframe        text,           -- "Day 2, approximately 11 PM"
  -- Epistemic status: what the record actually knows
  confidence       text NOT NULL CHECK (
    confidence IN ('VERIFIED', 'INFERRED', 'CONTESTED', 'EVIDENCE_GAP', 'UNVERIFIED')
  ),
  verified_facts   text[] DEFAULT '{}',    -- what the evidence confirms
  inferred_elements text[] DEFAULT '{}',   -- what must be inferred (marked [INFERRED])
  unknown_elements  text[] DEFAULT '{}',   -- what cannot be determined
  -- Social metadata
  participant_names text[] DEFAULT '{}',   -- names of people involved
  is_contested     bool NOT NULL DEFAULT false,
  -- Mythology metadata
  callback_potential text DEFAULT 'LOW' CHECK (
    callback_potential IN ('HIGH', 'MEDIUM', 'LOW', 'NONE')
  ),
  mythology_status text DEFAULT 'pending' CHECK (
    mythology_status IN ('pending', 'canonical', 'disputed', 'mystery')
  ),
  invocation_count int DEFAULT 0,  -- how many times referenced in later lore
  -- Raw narrative (from investigator extraction)
  investigator_note text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ── Evidence gaps ────────────────────────────────────────────
-- Explicit records of what the history DOESN'T know.
-- The absence of information is itself information.
CREATE TABLE IF NOT EXISTS evidence_gaps (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  gap_ref      text NOT NULL,  -- "GAP-001"
  timeframe    text NOT NULL,
  what_we_know text,
  what_we_dont text NOT NULL,
  significance text DEFAULT 'LOW' CHECK (significance IN ('HIGH', 'MEDIUM', 'LOW')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── Recurring references ─────────────────────────────────────
-- Phrases, behaviors, and moments with callback potential.
-- These become the mythology's long-term vocabulary.
CREATE TABLE IF NOT EXISTS recurring_references (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_trip_id       uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  origin_incident_id   uuid REFERENCES trip_incidents(id),
  phrase               text NOT NULL,
  context              text,
  activation_condition text,  -- what would trigger this reference in a future trip
  invocation_count     int DEFAULT 0,
  last_referenced_at   timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- ── Incident references (cross-trip callbacks) ───────────────
-- Tracks when a future trip's lore references a past incident.
CREATE TABLE IF NOT EXISTS incident_references (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_incident_id  uuid NOT NULL REFERENCES trip_incidents(id),
  referencing_trip_id uuid NOT NULL REFERENCES trips(id),
  reference_type      text CHECK (
    reference_type IN ('explicit', 'pattern_match', 'callback', 'prophecy')
  ),
  reference_context   text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ── Timeline events ──────────────────────────────────────────
-- Hour-by-hour reconstruction with confidence weights.
CREATE TABLE IF NOT EXISTS trip_timeline_events (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id            uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  estimated_time     timestamptz,
  time_confidence    float DEFAULT 0.5,  -- 0-1: how certain is the timestamp
  event_description  text NOT NULL,
  evidence_type      text CHECK (
    evidence_type IN ('photo_exif', 'inferred', 'testimony', 'gap', 'contested')
  ),
  photo_count        int DEFAULT 0,
  incident_id        uuid REFERENCES trip_incidents(id),
  day_number         int,  -- Day 1, Day 2, etc.
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE trip_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_timeline_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_incidents" ON trip_incidents;
CREATE POLICY "service_role_incidents" ON trip_incidents FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_evidence_gaps" ON evidence_gaps;
CREATE POLICY "service_role_evidence_gaps" ON evidence_gaps FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_recurring_refs" ON recurring_references;
CREATE POLICY "service_role_recurring_refs" ON recurring_references FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_incident_refs" ON incident_references;
CREATE POLICY "service_role_incident_refs" ON incident_references FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_timeline" ON trip_timeline_events;
CREATE POLICY "service_role_timeline" ON trip_timeline_events FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Trip members can read incidents for their trips
DROP POLICY IF EXISTS "trip_member_read_incidents_v2" ON trip_incidents;
CREATE POLICY "trip_member_read_incidents_v2" ON trip_incidents
  FOR SELECT TO authenticated
  USING (trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "trip_member_read_gaps" ON evidence_gaps;
CREATE POLICY "trip_member_read_gaps" ON evidence_gaps
  FOR SELECT TO authenticated
  USING (trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "trip_member_read_timeline" ON trip_timeline_events;
CREATE POLICY "trip_member_read_timeline" ON trip_timeline_events
  FOR SELECT TO authenticated
  USING (trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid()));

-- Recurring references are readable if you're a member of the origin trip
DROP POLICY IF EXISTS "trip_member_read_refs" ON recurring_references;
CREATE POLICY "trip_member_read_refs" ON recurring_references
  FOR SELECT TO authenticated
  USING (origin_trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid()));

-- ── Indices ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_incidents_trip_confidence ON trip_incidents(trip_id, confidence);
CREATE INDEX IF NOT EXISTS idx_incidents_callback ON trip_incidents(callback_potential) WHERE callback_potential IN ('HIGH', 'MEDIUM');
CREATE INDEX IF NOT EXISTS idx_evidence_gaps_trip ON evidence_gaps(trip_id);
CREATE INDEX IF NOT EXISTS idx_recurring_refs_trip ON recurring_references(origin_trip_id);
CREATE INDEX IF NOT EXISTS idx_timeline_trip_day ON trip_timeline_events(trip_id, day_number, estimated_time);
