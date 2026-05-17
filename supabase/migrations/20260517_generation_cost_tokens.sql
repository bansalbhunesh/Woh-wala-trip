-- Track total Claude tokens consumed per pipeline run
ALTER TABLE trips ADD COLUMN IF NOT EXISTS generation_cost_tokens INTEGER DEFAULT 0;
