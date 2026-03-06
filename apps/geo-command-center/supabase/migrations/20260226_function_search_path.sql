-- Fix Supabase Security Advisor: Function Search Path Mutable (lint 0011)
-- Set immutable search_path on all public functions so they are not affected
-- by the caller's search_path. See: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

ALTER FUNCTION public.calculate_client_revenue_impact(uuid) SET search_path = public;
ALTER FUNCTION public.auto_set_service_start_date() SET search_path = public;
ALTER FUNCTION public.get_latest_rank_snapshot(uuid, text) SET search_path = public;
ALTER FUNCTION public.get_latest_review_snapshot(uuid) SET search_path = public;
ALTER FUNCTION public.get_review_velocity(uuid) SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.get_avg_ai_visibility_score(uuid, integer) SET search_path = public;
ALTER FUNCTION public.get_avg_search_visibility_score(uuid, integer) SET search_path = public;
ALTER FUNCTION public.get_ai_mention_count(uuid, integer) SET search_path = public;
ALTER FUNCTION public.get_serp_feature_coverage(uuid, integer) SET search_path = public;
ALTER FUNCTION public.get_user_agency_id() SET search_path = public;
ALTER FUNCTION public.get_user_client_id() SET search_path = public;
ALTER FUNCTION public.is_agency_member() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.update_updated_at() SET search_path = public;
