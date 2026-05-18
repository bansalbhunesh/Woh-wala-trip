-- Phase 1: Observability columns
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS lore_trace_id         TEXT,
  ADD COLUMN IF NOT EXISTS lore_pipeline_state   JSONB,
  ADD COLUMN IF NOT EXISTS generation_cost_by_step JSONB,
  ADD COLUMN IF NOT EXISTS lore_error            JSONB;

-- Phase 3: Quality evaluation columns
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS lore_eval_json        JSONB,
  ADD COLUMN IF NOT EXISTS lore_needs_review     BOOLEAN DEFAULT FALSE;

-- Phase 2: Durable background jobs table for image generation
-- (separate from generation_jobs which is the lore pipeline queue)
CREATE TABLE IF NOT EXISTS background_jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  job_type    TEXT NOT NULL,          -- 'image_generation'
  status      TEXT NOT NULL DEFAULT 'pending',  -- pending | claimed | done | failed
  trace_id    TEXT,
  error       TEXT,
  claimed_at  TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS background_jobs_pending_idx
  ON background_jobs (status, created_at)
  WHERE status = 'pending';

-- RLS: service role only (worker uses service key)
ALTER TABLE background_jobs ENABLE ROW LEVEL SECURITY;
