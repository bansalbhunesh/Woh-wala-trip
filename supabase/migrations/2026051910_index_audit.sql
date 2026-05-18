-- Missing indexes identified during scalability audit
-- Addresses high-frequency query patterns without covering indexes.

-- trips: filter by creator + status (used in generateLore guard, cost cap check)
CREATE INDEX IF NOT EXISTS idx_trips_creator_status
ON public.trips (creator_id, lore_status);

-- trips: filter by status + chaos score (getChaosDistribution, showcase)
-- Partial index: only rows that are fully generated (ready) are queried here.
CREATE INDEX IF NOT EXISTS idx_trips_status_chaos
ON public.trips (lore_status, chaos_score)
WHERE lore_status = 'ready';

-- scheduled_emails: filter by unsent + type (battle-notifications cron)
-- Partial index: only unsent rows matter; sent rows are never re-queried.
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_unsent
ON public.scheduled_emails (email_type, send_at)
WHERE sent_at IS NULL;

-- background_jobs: filter by status + type (poll_background_jobs in AI worker)
-- Partial index: pending rows are the hot path; done/failed rows are cold.
CREATE INDEX IF NOT EXISTS idx_background_jobs_pending
ON public.background_jobs (job_type, status, created_at)
WHERE status = 'pending';

-- photos: filter by trip + embedding status (getSimilarPublicTrips vector search)
CREATE INDEX IF NOT EXISTS idx_photos_trip_embedding
ON public.photos (trip_id, embedding_status);
