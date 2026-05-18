-- =============================================================================
-- Atomic lore generation claim — eliminates race condition in generateLore
-- =============================================================================
-- Problem: the tRPC generateLore mutation checks activeJobs count and then
-- atomically claims the trip in two separate queries. Two concurrent calls
-- from the same user on different trips can both pass the activeJobs=0 check
-- and launch simultaneous pipelines, doubling token cost.
--
-- Solution: single SECURITY DEFINER function that checks-and-claims in one
-- transaction. The FOR UPDATE lock on the trips row prevents concurrent claims.
-- Returns 'claimed' on success, 'already_processing' if the user has another
-- active pipeline, 'not_eligible' if the trip is not in a claimable state.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.claim_lore_generation(
  p_trip_id   uuid,
  p_user_id   uuid
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_active_count  INT;
  v_trip_status   TEXT;
  v_creator_id    uuid;
  v_rows_updated  INT;
BEGIN
  -- Lock the specific trip row first to serialize concurrent calls on the same trip.
  SELECT lore_status, creator_id
  INTO   v_trip_status, v_creator_id
  FROM   public.trips
  WHERE  id = p_trip_id
  FOR UPDATE;

  -- Ownership check
  IF v_creator_id IS NULL OR v_creator_id != p_user_id THEN
    RETURN 'forbidden';
  END IF;

  -- Already processing or ready — fast reject
  IF v_trip_status = 'processing' THEN
    RETURN 'already_processing';
  END IF;

  -- Cross-trip check: does this user have ANY other trip currently processing?
  -- This runs inside the same transaction with the trip row locked, making it
  -- serializable with any other concurrent claim for this user.
  SELECT COUNT(*)
  INTO   v_active_count
  FROM   public.trips
  WHERE  creator_id = p_user_id
    AND  lore_status = 'processing'
    AND  id != p_trip_id;

  IF v_active_count > 0 THEN
    RETURN 'already_processing';
  END IF;

  -- Atomically transition to 'processing'
  UPDATE public.trips
  SET    lore_status          = 'processing',
         processing_started_at = NOW()
  WHERE  id = p_trip_id
    AND  lore_status != 'processing';

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  IF v_rows_updated = 0 THEN
    -- Another concurrent call beat us to it
    RETURN 'already_processing';
  END IF;

  RETURN 'claimed';
END;
$$;

-- Grant execute only to service_role (called from tRPC server-side via admin client)
REVOKE ALL ON FUNCTION public.claim_lore_generation(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_lore_generation(uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.claim_lore_generation IS
  'Atomically validates and claims a lore generation slot for a user. '
  'Returns: claimed | already_processing | forbidden. '
  'Eliminates the check-then-act race condition in the tRPC generateLore mutation.';
