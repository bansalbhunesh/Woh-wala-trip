-- BUG FIX: claim_generation_job excluded trips in 'processing' state, causing
-- a deadlock where fallback-queued generation jobs were never claimed.
--
-- Flow when HTTP trigger to Render fails:
--   1. claim_lore_generation → sets trips.lore_status = 'processing'
--   2. HTTP POST to AI worker fails → generation_jobs row created (status='pending')
--   3. claim_generation_job polled every 60s BUT filtered out 'processing' trips
--   4. Job sits pending forever; trip stays stuck in 'processing'
--
-- Fix: filter to lore_status = 'processing' (the only legitimate state for a
-- pending generation_job). Previously used NOT IN ('processing', 'ready') which
-- accidentally inverted the logic for the fallback path.

CREATE OR REPLACE FUNCTION public.claim_generation_job()
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  v_trip_id uuid;
BEGIN
  UPDATE generation_jobs
  SET status = 'claimed', claimed_at = now()
  WHERE id = (
    SELECT gj.id
    FROM generation_jobs gj
    JOIN trips t ON t.id = gj.trip_id
    WHERE gj.status = 'pending'
      AND t.lore_status = 'processing'
    ORDER BY gj.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING trip_id INTO v_trip_id;

  RETURN v_trip_id;
END;
$function$;
