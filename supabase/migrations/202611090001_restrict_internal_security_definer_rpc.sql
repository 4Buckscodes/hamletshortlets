-- Restrict internal SECURITY DEFINER helpers from direct PostgREST RPC execution.
-- Trigger execution does not depend on caller EXECUTE privileges; trigger functions remain
-- attached to their existing triggers and continue to run as their function owner.
-- Authenticated callers retain access to role/property authorization predicates used by RLS.
--
-- Use to_regprocedure so this migration is safe across supported schema histories where
-- optional legacy helpers may not exist. Only existing exact signatures are revoked.

do $migration$
declare
  helper_signature text;
  helper_function regprocedure;
begin
  foreach helper_signature in array array[
    'public.approve_partner_application()',
    'public.assign_profile_referral_code_on_role()',
    'public.create_profile_for_new_user()',
    'public.enforce_booking_request_integrity()',
    'public.enqueue_partner_application_customer_email()',
    'public.enqueue_property_lifecycle_emails()',
    'public.enqueue_registration_welcome_after_confirmation()',
    'public.enqueue_registration_welcome_from_profile()',
    'public.grant_submitter_property_access()',
    'public.handle_booking_notification_trigger()',
    'public.initialize_booking_caution_deposit()',
    'public.initialize_booking_issue_timeline()',
    'public.record_share_booking_lifecycle_events()',
    'public.resolve_share_attribution_before_booking()',
    'public.validate_partner_application_referral()',
    'public.generate_unique_referral_code(text)'
  ]
  loop
    helper_function := to_regprocedure(helper_signature);
    if helper_function is not null then
      execute format(
        'revoke execute on function %s from public, anon, authenticated',
        helper_function
      );
    end if;
  end loop;

  -- These predicates are required by authenticated RLS policies, but have no anonymous use.
  helper_function := to_regprocedure('public.can_manage_property(text)');
  if helper_function is not null then
    execute format('revoke execute on function %s from public, anon', helper_function);
  end if;

  helper_function := to_regprocedure('public.has_role(text)');
  if helper_function is not null then
    execute format('revoke execute on function %s from public, anon', helper_function);
  end if;
end;
$migration$;
