-- REL-07: 7-day re-engagement email scheduled alongside the 1-year anniversary.
-- When lore becomes ready, we now schedule BOTH:
--   • anniversary_1yr  — 1 year from trip_start_date (existing)
--   • first_week_followup — 7 days from NOW (new)
-- The cron handler at /api/cron/anniversaries dispatches both email_types.

CREATE OR REPLACE FUNCTION schedule_trip_anniversary()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Only schedule when lore_status transitions TO 'ready'
  IF NEW.lore_status = 'ready' AND (OLD.lore_status IS DISTINCT FROM 'ready') THEN

    -- 1-year anniversary (existing behaviour, preserved)
    INSERT INTO public.scheduled_emails (trip_id, user_id, email_type, send_at)
    SELECT
      NEW.id,
      tm.user_id,
      'anniversary_1yr',
      COALESCE(NEW.trip_start_date::timestamptz, NEW.created_at) + INTERVAL '1 year'
    FROM public.trip_members tm
    WHERE tm.trip_id = NEW.id
      AND tm.status IN ('joined', 'accepted')
    ON CONFLICT DO NOTHING;

    -- 7-day first-week follow-up (new)
    INSERT INTO public.scheduled_emails (trip_id, user_id, email_type, send_at)
    SELECT
      NEW.id,
      tm.user_id,
      'first_week_followup',
      NOW() + INTERVAL '7 days'
    FROM public.trip_members tm
    WHERE tm.trip_id = NEW.id
      AND tm.status IN ('joined', 'accepted')
    ON CONFLICT DO NOTHING;

  END IF;
  RETURN NEW;
END;
$$;

-- Re-create the trigger so it uses the updated function
DROP TRIGGER IF EXISTS on_lore_ready_schedule_anniversary ON public.trips;
CREATE TRIGGER on_lore_ready_schedule_anniversary
  AFTER UPDATE ON public.trips
  FOR EACH ROW EXECUTE PROCEDURE schedule_trip_anniversary();
