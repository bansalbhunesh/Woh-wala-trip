-- SEC: Remove anon EXECUTE from all SECURITY DEFINER functions.
-- Per Supabase advisor lint 0028/0029: all of these were callable by
-- unauthenticated REST requests. None require anon access:
--   - AI worker functions → service_role only
--   - Cron/internal functions → service_role only
--   - User-facing functions → authenticated or service_role via tRPC

REVOKE EXECUTE ON FUNCTION public.claim_fal_budget_slot(text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_generation_job() FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_lore_generation(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.find_similar_photos(uuid, uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_member_archetype_summary(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_nostalgia_moments(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_trip_full(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_archetype_history(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_user_token_usage() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_member_of_trip(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.join_trip_by_code(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.list_user_trips(uuid, timestamptz, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.refresh_chaos_distribution() FROM anon;
REVOKE EXECUTE ON FUNCTION public.resolve_expired_disputes() FROM anon;
REVOKE EXECUTE ON FUNCTION public.schedule_trip_anniversary() FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_confession(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.upsert_user_archetype(uuid, uuid, text, text, integer, text, text, integer) FROM anon;

-- Also revoke authenticated from cron/internal-only functions.
-- These are called exclusively by the AI worker or Vercel cron routes (service_role).
REVOKE EXECUTE ON FUNCTION public.claim_fal_budget_slot(text, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_generation_job() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_chaos_distribution() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.resolve_expired_disputes() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.schedule_trip_anniversary() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.upsert_user_archetype(uuid, uuid, text, text, integer, text, text, integer) FROM authenticated;
