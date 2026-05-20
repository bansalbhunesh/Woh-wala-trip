-- Atomic fal.ai budget slot claim.
-- Replaces the read-then-increment pattern in image_gen.py that has a TOCTOU race.
-- Returns TRUE if a slot was claimed (counter incremented), FALSE if cap reached.

CREATE OR REPLACE FUNCTION public.claim_fal_budget_slot(p_date text, p_cap int)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_count int;
BEGIN
  -- Insert first call of the day; on conflict increment atomically.
  -- The WHERE clause prevents incrementing past the cap.
  INSERT INTO public.fal_budget (date, calls_count)
  VALUES (p_date, 1)
  ON CONFLICT (date) DO UPDATE
    SET calls_count = fal_budget.calls_count + 1
    WHERE fal_budget.calls_count < p_cap
  RETURNING calls_count INTO v_new_count;

  -- If no row was updated/inserted (cap reached), v_new_count is NULL.
  RETURN v_new_count IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_fal_budget_slot(text, int) TO service_role;
