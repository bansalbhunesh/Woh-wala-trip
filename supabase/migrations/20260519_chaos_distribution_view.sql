-- Materialized view for chaos score distribution.
-- Replaces the full `trips` table scan in getChaosDistribution with a
-- pre-aggregated view refreshed hourly by the /api/cron/refresh-chaos cron.
--
-- NOTE: REFRESH MATERIALIZED VIEW CONCURRENTLY requires at least one
-- unique index that includes all rows, which is impossible on a non-unique
-- column like chaos_score alone.  We use the system ctid as a tiebreaker —
-- ctid is unique per row by definition.
--
-- Run in: https://app.supabase.com/project/lngtsccftumhbycywerg/sql

-- 1. Materialized view — all ready trips' chaos scores
CREATE MATERIALIZED VIEW IF NOT EXISTS public.chaos_distribution_cache AS
SELECT chaos_score, id AS trip_id
FROM public.trips
WHERE lore_status = 'ready'
  AND chaos_score IS NOT NULL;

-- 2. Unique index required for CONCURRENT refresh (no duplicate trip_id)
CREATE UNIQUE INDEX IF NOT EXISTS chaos_dist_cache_trip_idx
  ON public.chaos_distribution_cache (trip_id);

-- 3. Optional index on chaos_score for fast percentile ORDER BY
CREATE INDEX IF NOT EXISTS chaos_dist_cache_score_idx
  ON public.chaos_distribution_cache (chaos_score);

-- 4. Refresh function called by the hourly cron
CREATE OR REPLACE FUNCTION public.refresh_chaos_distribution()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.chaos_distribution_cache;
END;
$$;

-- 5. RLS: service role only (view is read internally via service client)
ALTER MATERIALIZED VIEW public.chaos_distribution_cache OWNER TO postgres;
