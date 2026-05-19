-- ============================================================
-- Retention Machine v2: Prophecy + Memory Review + Arc Updates
-- ============================================================

-- ── Pre-trip prophecy ────────────────────────────────────────
-- AI-generated before the trip, evaluated after. Creates
-- anticipation, group chat content, and post-trip narrative closure.

ALTER TABLE trips ADD COLUMN IF NOT EXISTS pretrip_prophecy jsonb;
-- {
--   headline: string,          -- "The AI predicts chaos within 6 hours"
--   predictions: [{            -- per-member predictions
--     user_id: uuid,
--     display_name: string,
--     prediction: string,      -- "Rohan will cause the first incident"
--     confidence: "HIGH"|"MEDIUM"|"LOW"
--   }],
--   group_chaos_probability: number,   -- 0-100
--   generated_at: timestamptz
-- }

ALTER TABLE trips ADD COLUMN IF NOT EXISTS prophecy_accuracy jsonb;
-- Post-trip evaluation of which predictions came true

-- ── Memory review state ─────────────────────────────────────
-- 7-day window after lore generation for members to confirm/add
ALTER TABLE trips ADD COLUMN IF NOT EXISTS memory_review_closes_at timestamptz;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS review_confirmed_count int DEFAULT 0;

-- ── Character arc weekly updates ─────────────────────────────
-- Cached weekly narrative about a user's cross-trip identity
CREATE TABLE IF NOT EXISTS character_arc_updates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_of       date NOT NULL,  -- Monday of the week
  narrative     text NOT NULL,
  archetype_current text,
  chaos_trajectory text CHECK (chaos_trajectory IN ('rising', 'falling', 'stable')),
  chaos_delta   float,  -- change in avg chaos rating since last update
  trip_count    int DEFAULT 0,
  arc_pct       int DEFAULT 0,  -- 0-100: how "defined" the mythology is
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_of)
);

-- ── Prophecy display card fields ─────────────────────────────
-- Store prophecy WhatsApp share text so we don't regenerate every render
CREATE TABLE IF NOT EXISTS trip_prophecy_cards (
  trip_id       uuid PRIMARY KEY REFERENCES trips(id) ON DELETE CASCADE,
  whatsapp_text text NOT NULL,
  card_headline text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE character_arc_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_prophecy_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_arc_updates" ON character_arc_updates FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_prophecy_cards" ON trip_prophecy_cards FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "own_arc_read" ON character_arc_updates FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "trip_member_prophecy_read" ON trip_prophecy_cards FOR SELECT TO authenticated
  USING (trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid()));

-- Indices
CREATE INDEX IF NOT EXISTS idx_arc_updates_user_week ON character_arc_updates(user_id, week_of DESC);
CREATE INDEX IF NOT EXISTS idx_identity_snapshots_user_time ON user_identity_snapshots(user_id, snapshot_at DESC);
