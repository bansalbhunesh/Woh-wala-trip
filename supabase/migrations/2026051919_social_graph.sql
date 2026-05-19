-- ============================================================
-- Social Graph: Living Relationship Infrastructure
-- ============================================================
-- The product evolves from "trip memory" to "relationship memory."
-- These tables capture how specific relationships between people
-- evolve across years of documented trips.
-- Not generic "friend connections" — emotional weight, incident
-- history, conflict patterns, and mythology influence.

-- ── Relationship dynamics per trip ───────────────────────────
-- Records the dynamic between each pair of users on each trip.
-- The trajectory across trips is the relationship history.

CREATE TABLE IF NOT EXISTS relationship_dynamics (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trip_id    uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  -- Incident co-participation
  shared_incident_count     int DEFAULT 0,
  opposing_dispute_count    int DEFAULT 0,  -- voted against each other
  alliance_dispute_count    int DEFAULT 0,  -- voted same side
  -- Behavioral distance
  chaos_delta               float,   -- |chaos_a - chaos_b|
  archetype_similarity      text CHECK (archetype_similarity IN ('same','complementary','opposing','unknown')),
  -- Narrative metadata
  duo_descriptor            text,    -- AI: "the planners", "the collision pair"
  is_notable_pairing        bool DEFAULT false,  -- flagged by AI as noteworthy
  snapshot_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_a, user_b, trip_id),
  CHECK (user_a < user_b)  -- canonical ordering prevents duplicate pairs
);

-- ── User reputation (multi-dimensional behavioral profile) ───
CREATE TABLE IF NOT EXISTS user_reputation (
  user_id                   uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  -- Behavioral tendencies (0-100)
  chaos_percentile          int,           -- vs. all documented users
  reliability_score         int,           -- shows up, follows through
  planner_tendency          float,         -- initiates logistics
  stabilizer_tendency       float,         -- prevents/resolves crisis
  documenter_tendency       float,         -- behind camera tendency
  -- Social dynamics
  dispute_win_rate          float,         -- group agrees with them
  alliance_consistency      float,         -- alliances hold over time
  -- Mythology metrics
  mythology_influence       float,         -- referenced in how much lore
  incident_centrality       float,         -- centrality in incident network
  -- Longitudinal
  total_trips_documented    int DEFAULT 0,
  chaos_trend               text CHECK (chaos_trend IN ('rising','falling','stable','volatile')),
  archetype_stability       text CHECK (archetype_stability IN ('consistent','shifting','volatile')),
  last_updated              timestamptz NOT NULL DEFAULT now()
);

-- ── Social role assignments ───────────────────────────────────
-- Behavioral roles distinct from archetype labels.
-- These track WHAT PEOPLE DO, not who they are.

CREATE TABLE IF NOT EXISTS social_role_assignments (
  trip_id    uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_type  text NOT NULL CHECK (role_type IN (
    'logistics_lead',    -- who planned/organized
    'chaos_initiator',   -- who started the main incident
    'crisis_resolver',   -- who resolved the main crisis
    'documenter',        -- who took most photos
    'social_glue',       -- who maintained group cohesion
    'dissenter',         -- who objected but came anyway
    'absent_presence',   -- present but barely participating
    'wildcard'           -- unpredictable, broke from usual pattern
  )),
  confidence float DEFAULT 1.0,
  PRIMARY KEY (trip_id, user_id, role_type)
);

-- ── Mythology nodes (persons, incidents, phrases, dynamics) ──
-- The memory graph — what connects to what.

CREATE TABLE IF NOT EXISTS mythology_nodes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_group_key text NOT NULL,   -- canonical identifier for the friend group
  node_type      text NOT NULL CHECK (node_type IN (
    'person','incident','phrase','place','dynamic','era'
  )),
  node_ref       text,            -- user_id, incident_ref, etc.
  label          text NOT NULL,
  mythology_weight float DEFAULT 1.0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ── Mythology edges (relationships between nodes) ────────────
CREATE TABLE IF NOT EXISTS mythology_edges (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_node  uuid NOT NULL REFERENCES mythology_nodes(id) ON DELETE CASCADE,
  target_node  uuid NOT NULL REFERENCES mythology_nodes(id) ON DELETE CASCADE,
  edge_type    text NOT NULL CHECK (edge_type IN (
    'caused','resolved','witnessed','referenced',
    'evolved_from','contradicts','alliances_with','conflicts_with'
  )),
  weight       float DEFAULT 1.0,
  trip_id      uuid REFERENCES trips(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── Group Lore OS ─────────────────────────────────────────────
-- The living mythology document for a friend group.
-- Updated after every trip. The single source of truth for
-- the group's accumulated identity and mythology.

CREATE TABLE IF NOT EXISTS group_lore_os (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Canonical group identity: sorted array of user_ids
  canonical_members  uuid[] NOT NULL,
  -- group_hash is set by the application (canonical_group_hash() function below).
  -- Cannot use GENERATED ALWAYS AS because sha256() is not IMMUTABLE in Postgres.
  group_hash         text,
  -- Living mythology state
  mythology_state    jsonb DEFAULT '{
    "identity": null,
    "era_current": null,
    "mythology_arc": null,
    "canon_incidents": [],
    "canonical_phrases": [],
    "recurring_patterns": [],
    "relationship_map": {},
    "member_trajectories": {}
  }',
  trip_count         int DEFAULT 0,
  last_trip_id       uuid REFERENCES trips(id),
  last_updated       timestamptz DEFAULT now(),
  UNIQUE (group_hash)
);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE relationship_dynamics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mythology_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mythology_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_lore_os ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_rel_dynamics" ON relationship_dynamics;
CREATE POLICY "service_role_rel_dynamics"   ON relationship_dynamics   FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_reputation" ON user_reputation;
CREATE POLICY "service_role_reputation"     ON user_reputation         FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_social_roles" ON social_role_assignments;
CREATE POLICY "service_role_social_roles"   ON social_role_assignments FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_myth_nodes" ON mythology_nodes;
CREATE POLICY "service_role_myth_nodes"     ON mythology_nodes         FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_myth_edges" ON mythology_edges;
CREATE POLICY "service_role_myth_edges"     ON mythology_edges         FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_group_lore_os" ON group_lore_os;
CREATE POLICY "service_role_group_lore_os"  ON group_lore_os           FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Users can read relationship dynamics for trips they're in
DROP POLICY IF EXISTS "member_read_dynamics" ON relationship_dynamics;
CREATE POLICY "member_read_dynamics" ON relationship_dynamics
  FOR SELECT TO authenticated
  USING (
    trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid())
    AND (user_a = auth.uid() OR user_b = auth.uid())
  );

DROP POLICY IF EXISTS "own_reputation_read" ON user_reputation;
CREATE POLICY "own_reputation_read" ON user_reputation
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "member_read_roles" ON social_role_assignments;
CREATE POLICY "member_read_roles" ON social_role_assignments
  FOR SELECT TO authenticated
  USING (trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid()));

-- Group lore OS: readable by any current member of the group
DROP POLICY IF EXISTS "group_member_read_os" ON group_lore_os;
CREATE POLICY "group_member_read_os" ON group_lore_os
  FOR SELECT TO authenticated
  USING (auth.uid() = ANY(canonical_members));

-- ── Indices ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rel_dynamics_pair        ON relationship_dynamics(user_a, user_b, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_rel_dynamics_trip        ON relationship_dynamics(trip_id);
CREATE INDEX IF NOT EXISTS idx_social_roles_user        ON social_role_assignments(user_id, role_type);
CREATE INDEX IF NOT EXISTS idx_social_roles_trip        ON social_role_assignments(trip_id);
CREATE INDEX IF NOT EXISTS idx_myth_nodes_group         ON mythology_nodes(trip_group_key, mythology_weight DESC);
CREATE INDEX IF NOT EXISTS idx_myth_edges_source        ON mythology_edges(source_node, edge_type);
CREATE INDEX IF NOT EXISTS idx_group_lore_hash          ON group_lore_os(group_hash);

-- ── Helper: compute canonical group hash ─────────────────────
-- Given an array of user_ids, returns the sorted canonical hash
-- for looking up or creating a group_lore_os record.
CREATE OR REPLACE FUNCTION canonical_group_hash(member_ids uuid[])
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(sha256(array_to_string(array(
    SELECT unnest(member_ids) ORDER BY 1
  ), ',')::bytea), 'hex')
$$;
