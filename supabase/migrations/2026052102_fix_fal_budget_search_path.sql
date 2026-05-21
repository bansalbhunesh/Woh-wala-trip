-- SEC: Fix mutable search_path on claim_fal_budget_slot (advisor lint 0011).
-- Also revoke PUBLIC execute — the =X/postgres grant allowed any role
-- (including anon via inheritance) to call this function.
-- After recreating, only service_role (AI worker) retains execute.

REVOKE EXECUTE ON FUNCTION public.claim_fal_budget_slot(text, integer) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.claim_fal_budget_slot(p_date text, p_cap integer)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $function$
DECLARE
  v_new_count int;
BEGIN
  INSERT INTO public.fal_budget (date, calls_count)
  VALUES (p_date, 1)
  ON CONFLICT (date) DO UPDATE
    SET calls_count = fal_budget.calls_count + 1
    WHERE fal_budget.calls_count < p_cap
  RETURNING calls_count INTO v_new_count;

  RETURN v_new_count IS NOT NULL;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.claim_fal_budget_slot(text, integer) TO service_role;
