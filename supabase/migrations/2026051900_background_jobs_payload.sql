-- Phase 2: Reliability Engineering
-- Add payload JSONB to background_jobs so new job types can carry
-- job-specific data (absent_user_id for missing_person_card, battle_id for judge_battle).
-- This is a non-breaking additive migration; existing image_generation rows are unaffected.

ALTER TABLE public.background_jobs
  ADD COLUMN IF NOT EXISTS payload JSONB;
