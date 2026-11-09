-- Customer-facing transactional email lifecycle for HAMLET.
-- Emails are queued in Postgres and sent only by a trusted internal Edge Function.
-- This migration does not alter booking/payment processing or send historical emails.

create table if not exists public.customer_email_notifications (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in (
    'registration_completed',
    'partner_application_submitted',
    'partner_application_status_changed',
    'property_submitted',
    'property_status_changed'
  )),
  recipient_user_id uuid references auth.users(id) on delete set null,
  recipient_email text not null,
  recipient_name text not null default '',
  subject text not null,
  payload jsonb not null default '{}'::jsonb,
  delivery_status text not null default 'pending'
    check (delivery_status in ('pending', 'processing', 'sent', 'failed', 'skipped')),
  provider text not null default 'resend',
  provider_message_id text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 10),
  idempotency_key text not null unique,
  next_attempt_at timestamptz not null default now(),
  processing_started_at timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_email_notifications_due_idx
  on public.customer_email_notifications (delivery_status, next_attempt_at, created_at);

alter table public.customer_email_notifications enable row level security;
revoke all on public.customer_email_notifications from public, anon, authenticated;
grant select, insert, update on public.customer_email_notifications to service_role;

create or replace function public.enqueue_customer_email_notification(
  target_event_type text,
  target_user_id uuid,
  target_email text,
  target_name text,
  target_subject text,
  target_payload jsonb,
  target_idempotency_key text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if nullif(btrim(coalesce(target_email, '')), '') is null
     or position('@' in target_email) < 2
     or nullif(btrim(coalesce(target_idempotency_key, '')), '') is null then
    return;
  end if;

  insert into public.customer_email_notifications (
    event_type, recipient_user_id, recipient_email, recipient_name,
    subject, payload, idempotency_key
  )
  values (
    target_event_type, target_user_id, lower(btrim(target_email)),
    coalesce(target_name, ''), target_subject,
    coalesce(target_payload, '{}'::jsonb), target_idempotency_key
  )
  on conflict (idempotency_key) do nothing;
end;
$$;

revoke all on function public.enqueue_customer_email_notification(text, uuid, text, text, text, jsonb, text)
  from public, anon, authenticated;

create or replace function public.enqueue_registration_welcome_from_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_email text;
  confirmation_time timestamptz;
begin
  select u.email, u.email_confirmed_at
    into account_email, confirmation_time
  from auth.users u
  where u.id = new.id;

  if confirmation_time is not null and account_email is not null then
    perform public.enqueue_customer_email_notification(
      'registration_completed',
      new.id,
      account_email,
      new.full_name,
      'Welcome to HAMLET — your account is ready',
      jsonb_build_object('full_name', new.full_name),
      'registration-completed:' || new.id::text || ':' || lower(account_email)
    );
  end if;

  return new;
end;
$$;

create or replace function public.enqueue_registration_welcome_after_confirmation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text;
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null
     and new.email is not null then
    select p.full_name into profile_name
    from public.profiles p
    where p.id = new.id;

    perform public.enqueue_customer_email_notification(
      'registration_completed',
      new.id,
      new.email,
      coalesce(profile_name, new.raw_user_meta_data ->> 'full_name', ''),
      'Welcome to HAMLET — your account is ready',
      jsonb_build_object(
        'full_name', coalesce(profile_name, new.raw_user_meta_data ->> 'full_name', '')
      ),
      'registration-completed:' || new.id::text || ':' || lower(new.email)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists customer_registration_welcome_from_profile on public.profiles;
create trigger customer_registration_welcome_from_profile
  after insert on public.profiles
  for each row execute function public.enqueue_registration_welcome_from_profile();

drop trigger if exists customer_registration_welcome_after_confirmation on auth.users;
create trigger customer_registration_welcome_after_confirmation
  after update of email_confirmed_at on auth.users
  for each row execute function public.enqueue_registration_welcome_after_confirmation();

create or replace function public.enqueue_partner_application_customer_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_email text;
  profile_name text;
  event_subject text;
  event_payload jsonb;
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

    perform public.enqueue_customer_email_notification(
      'partner_application_submitted',
      new.applicant_id,
      coalesce(account_email, new.email),
      coalesce(profile_name, new.full_name),
      event_subject,
      event_payload,
      'partner-application-submitted:' || new.id::text
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

    perform public.enqueue_customer_email_notification(
      'partner_application_status_changed',
      new.applicant_id,
      coalesce(account_email, new.email),
      coalesce(profile_name, new.full_name),
      event_subject,
      event_payload,
      'partner-application-status:' || new.id::text || ':' || new.status
    );
  end if;

  return new;
end;
$$;

drop trigger if exists customer_partner_application_email on public.partner_applications;
create trigger customer_partner_application_email
  after insert or update of status on public.partner_applications
  for each row execute function public.enqueue_partner_application_customer_email();

create or replace function public.enqueue_property_lifecycle_emails()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  submitter_id uuid;
  recipient_email text;
  recipient_name text;
  event_name text;
  email_subject text;
  event_payload jsonb;
  status_changed boolean := false;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'submitted' then
      return new;
    end if;
    event_name := 'property_submitted';
  else
    status_changed := new.status is distinct from old.status;
    if not status_changed or new.status not in ('submitted', 'approved', 'needs_correction', 'rejected') then
      return new;
    end if;
    event_name := case
      when new.status = 'submitted' then 'property_submitted'
      else 'property_status_changed'
    end;
  end if;

  submitter_id := coalesce(
    new.property_introducer_id,
    new.authorised_manager_id,
    (
      select access_row.user_id
      from public.property_access access_row
      where access_row.property_id = new.id
        and access_row.access_role = 'submitter'
        and access_row.status = 'active'
      order by access_row.granted_at
      limit 1
    )
  );

  if submitter_id is null then
    return new;
  end if;

  select u.email, coalesce(p.full_name, '')
    into recipient_email, recipient_name
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = submitter_id;

  if event_name = 'property_submitted' then
    email_subject := 'Your HAMLET property has been submitted for review';
  else
    email_subject := 'There is an update on your HAMLET property';
  end if;

  event_payload := jsonb_build_object(
    'property_id', new.id,
    'property_title', new.title,
    'area', new.area,
    'status', new.status,
    'review_note', new.review_note
  );

  perform public.enqueue_customer_email_notification(
    event_name,
    submitter_id,
    recipient_email,
    recipient_name,
    email_subject,
    event_payload,
    'property-lifecycle:' || new.id || ':' || new.status || ':' || new.updated_at::text
  );

  -- A matching operations alert is kept in the existing admin communications queue.
  insert into public.admin_notifications (
    event_type, title, message, target_type, target_id, recipient_email, payload
  )
  values (
    event_name,
    case
      when event_name = 'property_submitted' then 'New property submitted for review'
      else 'Property review status changed'
    end,
    case
      when event_name = 'property_submitted' then 'A property has been submitted and is awaiting HAMLET review.'
      else 'A property review status has changed and may require operations attention.'
    end,
    'property',
    new.id,
    recipient_email,
    jsonb_build_object(
      'applicant_name', recipient_name,
      'applicant_email', recipient_email,
      'property_title', new.title,
      'property_id', new.id,
      'area', new.area,
      'status', new.status,
      'review_note', new.review_note
    )
  );

  return new;
end;
$$;

drop trigger if exists customer_property_lifecycle_email on public.properties;
create trigger customer_property_lifecycle_email
  after insert or update of status on public.properties
  for each row execute function public.enqueue_property_lifecycle_emails();

create or replace function public.claim_pending_customer_email_notifications(batch_limit integer default 20)
returns setof public.customer_email_notifications
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with due as (
    select n.id
    from public.customer_email_notifications n
    where (
      n.delivery_status in ('pending', 'failed')
      or (
        n.delivery_status = 'processing'
        and n.processing_started_at < now() - interval '10 minutes'
      )
    )
      and n.next_attempt_at <= now()
      and n.attempt_count < n.max_attempts
    order by n.created_at asc
    for update skip locked
    limit greatest(1, least(coalesce(batch_limit, 20), 50))
  )
  update public.customer_email_notifications n
  set delivery_status = 'processing',
      attempt_count = n.attempt_count + 1,
      processing_started_at = now(),
      updated_at = now()
  from due
  where n.id = due.id
  returning n.*;
end;
$$;

create or replace function public.complete_customer_email_notification(
  target_notification_id uuid,
  next_delivery_status text,
  resolved_recipient_email text default null,
  provider_message_id text default null,
  error_detail text default null,
  backoff_seconds integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if next_delivery_status not in ('sent', 'failed', 'skipped') then
    raise exception 'Unsupported customer email delivery status.';
  end if;

  update public.customer_email_notifications
  set delivery_status = next_delivery_status,
      recipient_email = coalesce(nullif(resolved_recipient_email, ''), recipient_email),
      provider_message_id = coalesce(provider_message_id, provider_message_id),
      sent_at = case when next_delivery_status = 'sent' then now() else sent_at end,
      last_error = case when next_delivery_status = 'failed' then left(coalesce(error_detail, 'Delivery failed.'), 480) else null end,
      next_attempt_at = case
        when next_delivery_status = 'failed'
          then now() + make_interval(secs => greatest(60, least(coalesce(backoff_seconds, 60), 3600)))
        else next_attempt_at
      end,
      processing_started_at = null,
      updated_at = now()
  where id = target_notification_id
    and delivery_status = 'processing';

  return found;
end;
$$;

revoke all on function public.claim_pending_customer_email_notifications(integer)
  from public, anon, authenticated;
revoke all on function public.complete_customer_email_notification(uuid, text, text, text, text, integer)
  from public, anon, authenticated;
grant execute on function public.claim_pending_customer_email_notifications(integer) to service_role;
grant execute on function public.complete_customer_email_notification(uuid, text, text, text, text, integer) to service_role;

comment on table public.customer_email_notifications is
  'Private idempotent customer transactional email queue; only the service-role dispatcher can read or mutate it.';
