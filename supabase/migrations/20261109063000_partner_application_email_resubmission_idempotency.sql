-- Preserve a distinct customer notification for every partner application review cycle.
-- Repeated correction -> resubmission cycles can otherwise collide on the same
-- application-id/status idempotency key and suppress a later resubmission email.

create or replace function public.enqueue_partner_application_customer_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  account_email text;
  profile_name text;
  event_subject text;
  event_payload jsonb;
  event_key text;
begin
  select u.email into account_email
  from auth.users u
  where u.id = new.applicant_id;

  select p.full_name into profile_name
  from public.profiles p
  where p.id = new.applicant_id;

  if tg_op = 'INSERT' then
    event_subject := 'We have received your HAMLET partner application';
    event_payload := jsonb_build_object(
      'full_name', coalesce(profile_name, new.full_name),
      'application_id', new.id,
      'partner_role', new.role,
      'status', new.status
    );

    event_key := 'partner-application-submitted:' || new.id::text;

    perform public.enqueue_customer_email_notification(
      'partner_application_submitted',
      new.applicant_id,
      account_email,
      coalesce(profile_name, new.full_name),
      event_subject,
      event_payload,
      event_key
    );
  elsif new.status is distinct from old.status then
    event_subject := 'There is an update on your HAMLET partner application';
    event_payload := jsonb_build_object(
      'full_name', coalesce(profile_name, new.full_name),
      'application_id', new.id,
      'partner_role', new.role,
      'status', new.status,
      'review_note', new.review_note
    );

    event_key := 'partner-application-status:' || new.id::text || ':' ||
      new.status || ':' ||
      case
        when new.status = 'pending' then new.submitted_at::text
        else coalesce(new.reviewed_at::text, clock_timestamp()::text)
      end;

    perform public.enqueue_customer_email_notification(
      'partner_application_status_changed',
      new.applicant_id,
      account_email,
      coalesce(profile_name, new.full_name),
      event_subject,
      event_payload,
      event_key
    );
  end if;

  return new;
end;
$function$;
