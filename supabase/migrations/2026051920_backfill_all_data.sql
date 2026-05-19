-- ============================================================
-- Full Data Backfill — populates all retention/social tables
-- for trips that existed before these systems were built.
-- ============================================================
-- Safe to run multiple times (all upserts use ON CONFLICT DO NOTHING).

-- ── 1. user_identity_snapshots ───────────────────────────────
-- Backfill from trip_members data. The archetype column doesn't exist
-- on trip_members; we infer it from chaos_rating thresholds.
-- role_title and role_chaos_rating are the real data.

INSERT INTO user_identity_snapshots (
  user_id,
  trip_id,
  archetype,
  chaos_rating,
  role_title,
  snapshot_at
)
SELECT
  tm.user_id,
  tm.trip_id,
  CASE
    WHEN tm.role_chaos_rating >= 8 THEN 'Chaos Initiator'
    WHEN tm.role_chaos_rating <= 3 THEN 'Stabilizer'
    WHEN tm.role_chaos_rating >= 6 THEN 'Active Participant'
    ELSE 'Group Member'
  END AS archetype,
  COALESCE(tm.role_chaos_rating, 5) AS chaos_rating,
  tm.role_title,
  COALESCE(t.trip_start_date::timestamptz, t.created_at)
FROM trip_members tm
JOIN trips t ON t.id = tm.trip_id
WHERE t.lore_status = 'ready'
  AND tm.user_id IS NOT NULL
  AND (tm.role_chaos_rating IS NOT NULL OR tm.role_title IS NOT NULL)
ON CONFLICT (user_id, trip_id) DO NOTHING;

-- ── 2. relationship_dynamics ─────────────────────────────────
-- Pairwise relationship records for all member pairs on trips with lore.

INSERT INTO relationship_dynamics (
  user_a,
  user_b,
  trip_id,
  chaos_delta,
  archetype_similarity,
  snapshot_at
)
SELECT
  LEAST(tm1.user_id, tm2.user_id)    AS user_a,
  GREATEST(tm1.user_id, tm2.user_id) AS user_b,
  tm1.trip_id,
  ABS(COALESCE(tm1.role_chaos_rating, 5) - COALESCE(tm2.role_chaos_rating, 5)) AS chaos_delta,
  CASE
    WHEN ABS(COALESCE(tm1.role_chaos_rating, 5) - COALESCE(tm2.role_chaos_rating, 5)) <= 1
      THEN 'same'
    WHEN ABS(COALESCE(tm1.role_chaos_rating, 5) - COALESCE(tm2.role_chaos_rating, 5)) >= 4
      THEN 'opposing'
    ELSE 'complementary'
  END AS archetype_similarity,
  COALESCE(t.trip_start_date::timestamptz, t.created_at)
FROM trip_members tm1
JOIN trip_members tm2
  ON tm1.trip_id = tm2.trip_id
  AND tm1.user_id < tm2.user_id
JOIN trips t ON t.id = tm1.trip_id
WHERE t.lore_status = 'ready'
  AND tm1.user_id IS NOT NULL
  AND tm2.user_id IS NOT NULL
ON CONFLICT (user_a, user_b, trip_id) DO NOTHING;

-- ── 3. social_role_assignments ───────────────────────────────
-- Heuristic behavioral roles based on chaos ratings.

INSERT INTO social_role_assignments (trip_id, user_id, role_type, confidence)
SELECT tm.trip_id, tm.user_id, 'chaos_initiator', 0.7
FROM trip_members tm
JOIN trips t ON t.id = tm.trip_id
WHERE t.lore_status = 'ready'
  AND tm.role_chaos_rating >= 8
  AND tm.user_id IS NOT NULL
ON CONFLICT (trip_id, user_id, role_type) DO NOTHING;

INSERT INTO social_role_assignments (trip_id, user_id, role_type, confidence)
SELECT tm.trip_id, tm.user_id, 'social_glue', 0.7
FROM trip_members tm
JOIN trips t ON t.id = tm.trip_id
WHERE t.lore_status = 'ready'
  AND tm.role_chaos_rating <= 3
  AND tm.role_chaos_rating IS NOT NULL
  AND tm.user_id IS NOT NULL
ON CONFLICT (trip_id, user_id, role_type) DO NOTHING;

-- ── 4. group_pulse_events — lore_generated for all ready trips ─

INSERT INTO group_pulse_events (
  trip_id,
  event_type,
  actor_user_id,
  payload,
  visible_to,
  created_at
)
SELECT
  t.id,
  'lore_generated',
  t.creator_id,
  jsonb_build_object(
    'chaos_score', t.chaos_score,
    'verdict',     COALESCE(t.lore_json->>'cooked_verdict', 'Unknown'),
    'tagline',     LEFT(COALESCE(t.lore_json->>'tagline', ''), 100),
    'backfilled',  true
  ),
  ARRAY(
    SELECT tm.user_id::uuid
    FROM trip_members tm
    WHERE tm.trip_id = t.id
      AND tm.user_id IS NOT NULL
  ),
  COALESCE(t.processing_started_at, t.created_at)
FROM trips t
WHERE t.lore_status = 'ready'
  AND t.creator_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM group_pulse_events gpe
    WHERE gpe.trip_id = t.id
      AND gpe.event_type = 'lore_generated'
  );

-- ── 5. user_reputation — from identity snapshots ─────────────
-- Simplified: aggregate per user, compute trend from first vs last chaos.

WITH user_stats AS (
  SELECT
    user_id,
    count(*)       AS trip_count,
    avg(chaos_rating)::float AS avg_chaos,
    min(chaos_rating) AS min_chaos,
    max(chaos_rating) AS max_chaos
  FROM user_identity_snapshots
  GROUP BY user_id
),
user_first_last AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    first_value(chaos_rating) OVER (PARTITION BY user_id ORDER BY snapshot_at ASC)  AS first_chaos,
    first_value(chaos_rating) OVER (PARTITION BY user_id ORDER BY snapshot_at DESC) AS last_chaos
  FROM user_identity_snapshots
)
INSERT INTO user_reputation (
  user_id,
  total_trips_documented,
  chaos_trend,
  archetype_stability,
  last_updated
)
SELECT
  us.user_id,
  us.trip_count,
  CASE
    WHEN fl.last_chaos > fl.first_chaos + 1 THEN 'rising'
    WHEN fl.last_chaos < fl.first_chaos - 1 THEN 'falling'
    ELSE 'stable'
  END AS chaos_trend,
  'consistent' AS archetype_stability,
  now()
FROM user_stats us
JOIN user_first_last fl ON fl.user_id = us.user_id
ON CONFLICT (user_id) DO UPDATE SET
  total_trips_documented = EXCLUDED.total_trips_documented,
  chaos_trend            = EXCLUDED.chaos_trend,
  archetype_stability    = EXCLUDED.archetype_stability,
  last_updated           = now();

-- ── 6. memory_review_closes_at for recent trips ──────────────

-- Open a 7-day review window for all ready trips that don't have one yet.
-- We open windows for ALL ready trips (not just recent ones) so existing
-- users can contribute to their historical trips immediately after deployment.
UPDATE trips
SET memory_review_closes_at = now() + interval '7 days'
WHERE lore_status = 'ready'
  AND memory_review_closes_at IS NULL;
