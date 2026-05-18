-- Cost Controls: Phase 3
-- COST-01: Monthly token cap per user
-- COST-02: fal.ai budget persistence
-- COST-05: warmupWorker server-side cache

-- -----------------------------------------------------------------------
-- COST-01: Per-user monthly generation token tracking on profiles
-- -----------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS generation_tokens_used_this_month INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS generation_tokens_month           DATE;

-- -----------------------------------------------------------------------
-- COST-01: Trigger — after trips.generation_cost_tokens is written by the
-- AI worker (when lore_status flips to 'ready'), increment the creator's
-- monthly counter.  Resets counter automatically when the month changes.
-- -----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.increment_user_token_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tokens   INTEGER;
  v_month    DATE;
  v_today    DATE := date_trunc('month', now())::date;
BEGIN
  -- Only fire when lore_status transitions to 'ready' and tokens > 0
  IF NEW.lore_status IS DISTINCT FROM 'ready' THEN
    RETURN NEW;
  END IF;
  IF OLD.lore_status = 'ready' THEN
    RETURN NEW;  -- already counted on a previous ready transition
  END IF;

  v_tokens := COALESCE(NEW.generation_cost_tokens, 0);
  IF v_tokens <= 0 THEN
    RETURN NEW;
  END IF;

  -- Read current month on the profile row to detect month rollover
  SELECT generation_tokens_month
    INTO v_month
    FROM public.profiles
   WHERE id = NEW.creator_id;

  IF v_month IS DISTINCT FROM v_today THEN
    -- New month — reset counter
    UPDATE public.profiles
       SET generation_tokens_used_this_month = v_tokens,
           generation_tokens_month           = v_today
     WHERE id = NEW.creator_id;
  ELSE
    -- Same month — increment
    UPDATE public.profiles
       SET generation_tokens_used_this_month = generation_tokens_used_this_month + v_tokens
     WHERE id = NEW.creator_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_increment_user_token_usage ON public.trips;
CREATE TRIGGER trg_increment_user_token_usage
  AFTER UPDATE OF lore_status ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_user_token_usage();

-- -----------------------------------------------------------------------
-- COST-02: fal.ai budget table — persists daily call count across restarts
-- -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fal_budget (
  date        DATE PRIMARY KEY DEFAULT CURRENT_DATE,
  calls_count INTEGER NOT NULL DEFAULT 0
);

-- Service role has full access (no anon/authenticated access needed)
ALTER TABLE public.fal_budget ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service role full access" ON public.fal_budget;
CREATE POLICY "service role full access"
  ON public.fal_budget FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- -----------------------------------------------------------------------
-- COST-05: warmupWorker — worker_warmed_at timestamp on profiles
-- -----------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS worker_warmed_at TIMESTAMPTZ;
