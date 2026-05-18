-- =============================================================================
-- Critical DB Indices — Phase 1 Production Hardening
-- =============================================================================
-- These indices fix known slow query paths identified in the Phase 1 audit.
-- Each index is created CONCURRENTLY to avoid locking production tables.
-- Run EXPLAIN ANALYZE on these queries after applying to verify index usage.
-- =============================================================================

-- ── trips table ──────────────────────────────────────────────────────────────

-- Most common trip query: dashboard loads all trips for a user
-- Query: trips WHERE creator_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_trips_creator_created_at
  ON public.trips(creator_id, created_at DESC);

-- Lore generation race condition check (now in claim_lore_generation function)
-- Query: trips WHERE creator_id = ? AND lore_status = 'processing'
CREATE INDEX IF NOT EXISTS idx_trips_creator_lore_status
  ON public.trips(creator_id, lore_status)
  WHERE lore_status IN ('processing', 'pending', 'failed');

-- Stuck job cron: trips WHERE lore_status = 'processing' AND processing_started_at < cutoff
CREATE INDEX IF NOT EXISTS idx_trips_processing_started_at
  ON public.trips(processing_started_at)
  WHERE lore_status = 'processing';

-- Public showcase: ORDER BY chaos_score DESC WHERE lore_status = 'ready' AND story_visible = true
CREATE INDEX IF NOT EXISTS idx_trips_public_showcase
  ON public.trips(chaos_score DESC)
  WHERE lore_status = 'ready' AND story_visible = true;

-- Cost tracking: monthly token usage per creator
CREATE INDEX IF NOT EXISTS idx_trips_creator_lore_ready
  ON public.trips(creator_id)
  WHERE lore_status = 'ready';

-- ── photos table ─────────────────────────────────────────────────────────────

-- Photo count check before lore generation
-- Query: photos WHERE trip_id = ? (COUNT)
CREATE INDEX IF NOT EXISTS idx_photos_trip_id
  ON public.photos(trip_id);

-- Embedding status queries for CLIP pipeline
-- Query: photos WHERE trip_id = ? AND embedding_status = 'complete' LIMIT 1
CREATE INDEX IF NOT EXISTS idx_photos_trip_embedding_status
  ON public.photos(trip_id, embedding_status)
  WHERE embedding_status = 'complete';

-- Embedding backfill: find photos without embeddings
CREATE INDEX IF NOT EXISTS idx_photos_embedding_pending
  ON public.photos(trip_id, created_at)
  WHERE embedding_status IS NULL OR embedding_status = 'pending';

-- ── trip_members table ────────────────────────────────────────────────────────

-- Core membership lookup (used in every tRPC mutation guard)
-- Query: trip_members WHERE trip_id = ? AND user_id = ?
CREATE INDEX IF NOT EXISTS idx_trip_members_trip_user
  ON public.trip_members(trip_id, user_id);

-- listMine pagination (used in list_user_trips RPC)
-- Query: trip_members WHERE user_id = ? (JOIN trips ORDER BY created_at)
CREATE INDEX IF NOT EXISTS idx_trip_members_user_id
  ON public.trip_members(user_id);

-- ── otp_codes table ───────────────────────────────────────────────────────────

-- DB-backed rate limit: 5 OTPs per email per 15 min
-- Index was added in 2026051902 — verify it exists, add if not
CREATE INDEX IF NOT EXISTS idx_otp_codes_email
  ON public.otp_codes(email);

-- Cleanup: find expired OTPs for purging
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at
  ON public.otp_codes(expires_at)
  WHERE used = false;

-- ── background_jobs table ────────────────────────────────────────────────────

-- Job queue poll: pending jobs ordered by creation time
-- Query: background_jobs WHERE status = 'pending' ORDER BY created_at LIMIT 1
CREATE INDEX IF NOT EXISTS idx_background_jobs_pending
  ON public.background_jobs(created_at)
  WHERE status = 'pending';

-- ── lore_reactions table ─────────────────────────────────────────────────────

-- Reaction aggregation per trip (used in trip signals computation)
CREATE INDEX IF NOT EXISTS idx_lore_reactions_trip_id
  ON public.lore_reactions(trip_id);

-- ── trip_vs_trip (battles) table ─────────────────────────────────────────────

-- Battle lookup by member's trip IDs
CREATE INDEX IF NOT EXISTS idx_trip_vs_trip_trip_a_id
  ON public.trip_vs_trip(trip_a_id);

CREATE INDEX IF NOT EXISTS idx_trip_vs_trip_trip_b_id
  ON public.trip_vs_trip(trip_b_id);

-- Recent battles rate-limiting check
CREATE INDEX IF NOT EXISTS idx_trip_vs_trip_created_at
  ON public.trip_vs_trip(created_at DESC);

-- ── profiles table ────────────────────────────────────────────────────────────

-- Referral lookup by username
CREATE INDEX IF NOT EXISTS idx_profiles_username
  ON public.profiles(username)
  WHERE username IS NOT NULL;

-- ── scheduled_emails table ────────────────────────────────────────────────────

-- Anniversary cron: find emails scheduled for today
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_send_at
  ON public.scheduled_emails(send_at)
  WHERE sent_at IS NULL;

COMMENT ON INDEX idx_trips_creator_created_at IS 'Dashboard list query — creator trips paginated by creation date';
COMMENT ON INDEX idx_trips_public_showcase IS 'Landing page showcase — top chaos trips with visible stories';
COMMENT ON INDEX idx_photos_trip_embedding_status IS 'CLIP embedding pipeline — find embedded photos for similarity search';
COMMENT ON INDEX idx_background_jobs_pending IS 'Job queue poll — FIFO ordering for pending background jobs';
