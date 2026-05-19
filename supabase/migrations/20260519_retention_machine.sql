-- ============================================================
-- Retention Machine: Dispute System + Group Pulse + Identity
-- ============================================================
-- The single strongest retention loop: Dispute → Canon Vote
-- Every dispute creates social pressure, WhatsApp content,
-- and a permanent mythology record. See docs/RETENTION.md.

-- ── Lore disputes ────────────────────────────────────────────
-- When a user contests the AI's assessment of them, they file
-- a dispute. The group votes to determine canon.

CREATE TABLE IF NOT EXISTS lore_disputes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id        uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dispute_type   text NOT NULL CHECK (
    dispute_type IN ('character_role', 'chaos_rating', 'incident', 'verdict', 'superlative')
  ),
  -- What the AI said (the original claim being disputed)
  ai_claim       text NOT NULL,
  -- What the user says instead
  user_claim     text NOT NULL,
  -- Voting state
  status         text NOT NULL DEFAULT 'voting' CHECK (
    status IN ('voting', 'ai_wins', 'user_wins', 'tied', 'expired')
  ),
  vote_deadline  timestamptz NOT NULL DEFAULT (now() + interval '48 hours'),
  ai_vote_count  int NOT NULL DEFAULT 0,
  user_vote_count int NOT NULL DEFAULT 0,
  total_eligible int NOT NULL DEFAULT 0,  -- populated on creation from trip member count
  -- Canonical outcome (written to lore after vote closes)
  canonical_text text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  resolved_at    timestamptz,
  UNIQUE (trip_id, user_id, dispute_type)  -- one active dispute per user per type per trip
);

-- ── Dispute votes ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dispute_votes (
  dispute_id    uuid NOT NULL REFERENCES lore_disputes(id) ON DELETE CASCADE,
  voter_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vote          text NOT NULL CHECK (vote IN ('ai', 'user')),
  voted_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (dispute_id, voter_user_id)
);

-- ── Group pulse events ───────────────────────────────────────
-- The living social feed: what just happened in your groups.
-- Home screen shows this instead of a static gallery.

CREATE TABLE IF NOT EXISTS group_pulse_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id       uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  event_type    text NOT NULL CHECK (event_type IN (
    'dispute_filed',       -- someone contested their role
    'dispute_resolved',    -- vote closed, canon decided
    'vote_cast',           -- someone voted on a dispute
    'memory_added',        -- someone added context to an incident
    'memory_confirmed',    -- someone confirmed lore is accurate
    'incident_flagged',    -- incident button pressed during trip
    'lore_generated',      -- new lore ready
    'battle_started',      -- trip challenged another
    'battle_resolved',     -- battle verdict arrived
    'anniversary'          -- on-this-day event
  )),
  actor_user_id uuid REFERENCES profiles(id),  -- null for system events
  payload       jsonb NOT NULL DEFAULT '{}',
  -- Who should see this event (trip members)
  visible_to    uuid[] NOT NULL DEFAULT '{}',
  seen_by       uuid[] NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Memory contributions ─────────────────────────────────────
-- After lore generation a 7-day review window opens.
-- Members can confirm, dispute, or add context.

CREATE TABLE IF NOT EXISTS memory_contributions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id             uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contribution_type   text NOT NULL CHECK (
    contribution_type IN ('confirm', 'addition', 'photo_pin')
  ),
  target_section      text,  -- 'character_role', 'incident', 'verdict', 'timeline'
  content             text,
  photo_id            uuid REFERENCES photos(id),
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ── User identity snapshots ──────────────────────────────────
-- After every lore generation, record a behavioral snapshot
-- per member. This is the cross-trip identity data — the moat.

CREATE TABLE IF NOT EXISTS user_identity_snapshots (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trip_id                uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  archetype              text NOT NULL,
  chaos_rating           int NOT NULL CHECK (chaos_rating BETWEEN 0 AND 10),
  role_title             text,
  signature_behavior     text,
  archetype_confidence   float DEFAULT 1.0,  -- drops if disputed
  dispute_count          int DEFAULT 0,      -- how often user disputes their role
  snapshot_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, trip_id)
);

-- ── Pending incidents (during-trip markers) ──────────────────
-- The Incident Button: flag a moment as mythology-worthy
-- in real time. Incorporated into lore generation.

CREATE TABLE IF NOT EXISTS pending_incidents (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id            uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  triggered_by       uuid NOT NULL REFERENCES profiles(id),
  note               text,
  triggered_at       timestamptz NOT NULL DEFAULT now(),
  incorporated       bool NOT NULL DEFAULT false
);

-- ── RLS ─────────────────────────────────────────────────────

ALTER TABLE lore_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_pulse_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_identity_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_incidents ENABLE ROW LEVEL SECURITY;

-- Service role: full access to all retention tables
CREATE POLICY "service_role_lore_disputes"       ON lore_disputes           FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_dispute_votes"       ON dispute_votes           FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_group_pulse"         ON group_pulse_events      FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_memory_contrib"      ON memory_contributions    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_identity_snapshots"  ON user_identity_snapshots FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_pending_incidents"   ON pending_incidents       FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Trip members: read disputes and pulse events for their trips
CREATE POLICY "trip_member_read_disputes" ON lore_disputes
  FOR SELECT TO authenticated
  USING (
    trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "trip_member_read_pulse" ON group_pulse_events
  FOR SELECT TO authenticated
  USING (auth.uid() = ANY(visible_to));

CREATE POLICY "trip_member_read_memory" ON memory_contributions
  FOR SELECT TO authenticated
  USING (
    trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
    )
  );

-- Users can read their own identity snapshots
CREATE POLICY "own_identity_read" ON user_identity_snapshots
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can read incidents for trips they're members of
CREATE POLICY "trip_member_read_incidents" ON pending_incidents
  FOR SELECT TO authenticated
  USING (
    trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
    )
  );

-- ── Indices ──────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_lore_disputes_trip      ON lore_disputes(trip_id, status);
CREATE INDEX IF NOT EXISTS idx_lore_disputes_user      ON lore_disputes(user_id);
CREATE INDEX IF NOT EXISTS idx_dispute_votes_dispute   ON dispute_votes(dispute_id);
CREATE INDEX IF NOT EXISTS idx_group_pulse_trip        ON group_pulse_events(trip_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_pulse_visible     ON group_pulse_events USING GIN(visible_to);
CREATE INDEX IF NOT EXISTS idx_identity_user           ON user_identity_snapshots(user_id, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_pending_incidents_trip  ON pending_incidents(trip_id, incorporated);

-- ── Helper: resolve expired disputes ────────────────────────
-- Called by a cron or the next API call if deadline passed.
CREATE OR REPLACE FUNCTION resolve_expired_disputes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE lore_disputes
  SET
    status = CASE
      WHEN ai_vote_count > user_vote_count THEN 'ai_wins'
      WHEN user_vote_count > ai_vote_count THEN 'user_wins'
      ELSE 'tied'
    END,
    resolved_at = now()
  WHERE status = 'voting'
    AND vote_deadline < now();
END;
$$;
