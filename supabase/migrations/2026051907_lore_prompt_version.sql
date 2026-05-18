ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS lore_prompt_version text;
COMMENT ON COLUMN public.trips.lore_prompt_version IS 'Prompt version that generated this lore — see ai-worker/src/lore/prompts.py PROMPT_VERSION';

ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS lore_quality_retried boolean;
COMMENT ON COLUMN public.trips.lore_quality_retried IS 'True when the quality gate triggered a retry on lore generation';

ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS lore_quality_retry_score_before numeric;
COMMENT ON COLUMN public.trips.lore_quality_retry_score_before IS 'Quality gate overall score before the retry (0.0–1.0)';

ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS lore_quality_retry_score_after numeric;
COMMENT ON COLUMN public.trips.lore_quality_retry_score_after IS 'Quality gate overall score after the retry (0.0–1.0)';
