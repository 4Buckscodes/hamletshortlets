-- The Lagos pilot-area validator is an internal helper called by partner listing RPCs.
-- PostgreSQL grants EXECUTE to PUBLIC on new functions by default; explicitly remove
-- the inherited public/anonymous access while preserving authenticated callers and
-- trusted server-side service-role calls.

revoke all on function public.assert_lagos_pilot_area(text) from public, anon;
grant execute on function public.assert_lagos_pilot_area(text) to authenticated, service_role;
