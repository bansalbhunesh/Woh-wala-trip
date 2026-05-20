-- =============================================================================
-- Supabase Schema Security Hardening Migration
-- =============================================================================

-- 1. Secure Views by Setting security_invoker = true
ALTER VIEW public.lore_reaction_counts SET (security_invoker = true);
ALTER VIEW public.photo_view_stats SET (security_invoker = true);
ALTER VIEW public.public_profiles SET (security_invoker = true);

-- 2. Restrict Direct Public/User Select Access on Materialized Views
REVOKE SELECT ON TABLE public.chaos_distribution_cache FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.chaos_distribution_cache TO service_role;

-- 3. Harden Search Paths on All Custom Functions to Prevent Hijacking
ALTER FUNCTION public.is_member_of_trip(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_trip_photo_count() SET search_path = public, pg_temp;
ALTER FUNCTION public.schedule_trip_anniversary() SET search_path = public, pg_temp;
ALTER FUNCTION public.refresh_chaos_distribution() SET search_path = public, pg_temp;
ALTER FUNCTION public.upsert_user_archetype(uuid, uuid, text, text, integer, text, text, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.claim_generation_job() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_trip_full(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_archetype_history(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_member_archetype_summary(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.claim_lore_generation(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.canonical_group_hash(uuid[]) SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_trip_storage_bytes() SET search_path = public, pg_temp;
ALTER FUNCTION public.cleanup_expired_otp_codes() SET search_path = public, pg_temp;
ALTER FUNCTION public.submit_confession(uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_nostalgia_moments(uuid, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.list_user_trips(uuid, timestamp with time zone, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.resolve_expired_disputes() SET search_path = public, pg_temp;
ALTER FUNCTION public.join_trip_by_code(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.find_similar_photos(uuid, uuid, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_user_token_usage() SET search_path = public, pg_temp;

-- 4. Revoke Default Public Execute Privilege on All Functions
REVOKE EXECUTE ON FUNCTION public.is_member_of_trip(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_trip_photo_count() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.schedule_trip_anniversary() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.refresh_chaos_distribution() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.upsert_user_archetype(uuid, uuid, text, text, integer, text, text, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_generation_job() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_trip_full(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_archetype_history(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_member_archetype_summary(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_lore_generation(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.canonical_group_hash(uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_trip_storage_bytes() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_otp_codes() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_confession(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_nostalgia_moments(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_user_trips(uuid, timestamp with time zone, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resolve_expired_disputes() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.join_trip_by_code(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.find_similar_photos(uuid, uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_user_token_usage() FROM PUBLIC;

-- 5. Grant Explicit Execution Privileges for System / Trigger Functions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.increment_user_token_usage() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.sync_trip_photo_count() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.schedule_trip_anniversary() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.sync_trip_storage_bytes() TO postgres, service_role;

-- 6. Grant Explicit Execution Privileges for Service-Role Only Functions
GRANT EXECUTE ON FUNCTION public.refresh_chaos_distribution() TO service_role;
GRANT EXECUTE ON FUNCTION public.upsert_user_archetype(uuid, uuid, text, text, integer, text, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_generation_job() TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_lore_generation(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_expired_disputes() TO service_role;

-- 7. Grant Explicit Execution Privileges for User / Backend tRPC Functions
GRANT EXECUTE ON FUNCTION public.is_member_of_trip(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_trip_full(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_archetype_history(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_member_archetype_summary(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_confession(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_nostalgia_moments(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_user_trips(uuid, timestamp with time zone, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.join_trip_by_code(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.find_similar_photos(uuid, uuid, integer) TO authenticated, service_role;

-- 8. Grant Explicit Execution Privileges for Utility / Public Access Helpers
GRANT EXECUTE ON FUNCTION public.canonical_group_hash(uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_otp_codes() TO authenticated, service_role;
