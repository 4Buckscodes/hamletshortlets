-- Restrict internal SECURITY DEFINER helpers from direct PostgREST RPC execution.
-- Trigger execution does not depend on caller EXECUTE privileges; trigger functions remain
-- attached to their existing triggers and continue to run as their function owner.
-- Authenticated callers retain access to role/property authorization predicates used by RLS.

revoke execute on function public.approve_partner_application() from public, anon, authenticated;
revoke execute on function public.assign_profile_referral_code_on_role() from public, anon, authenticated;
revoke execute on function public.create_profile_for_new_user() from public, anon, authenticated;
revoke execute on function public.enforce_booking_request_integrity() from public, anon, authenticated;
revoke execute on function public.enqueue_partner_application_customer_email() from public, anon, authenticated;
revoke execute on function public.enqueue_property_lifecycle_emails() from public, anon, authenticated;
revoke execute on function public.enqueue_registration_welcome_after_confirmation() from public, anon, authenticated;
revoke execute on function public.enqueue_registration_welcome_from_profile() from public, anon, authenticated;
revoke execute on function public.grant_submitter_property_access() from public, anon, authenticated;
revoke execute on function public.handle_booking_notification_trigger() from public, anon, authenticated;
revoke execute on function public.initialize_booking_caution_deposit() from public, anon, authenticated;
revoke execute on function public.initialize_booking_issue_timeline() from public, anon, authenticated;
revoke execute on function public.record_share_booking_lifecycle_events() from public, anon, authenticated;
revoke execute on function public.resolve_share_attribution_before_booking() from public, anon, authenticated;
revoke execute on function public.validate_partner_application_referral() from public, anon, authenticated;

-- Referral code generation is an internal trigger helper, not a public RPC.
revoke execute on function public.generate_unique_referral_code(text) from public, anon, authenticated;

-- These predicates are required by authenticated RLS policies, but have no anonymous use.
revoke execute on function public.can_manage_property(text) from public, anon;
revoke execute on function public.has_role(text) from public, anon;
