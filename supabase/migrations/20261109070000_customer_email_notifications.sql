-- Durable customer-facing transactional email queue for HAMLET.
-- This is separate from admin_notifications: customer addresses and messages never
-- appear in the admin inbox, and operations alerts keep their existing delivery path.

create table if not exists public.customer_email_notifications (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in (
    'registration_welcome',
    'partner_application_received',
    'partner_application_status_changed',
    'property_submitted',
    'property_status_changed'
  )),
  recipient_user_id uuid references public.profiles(id) on delete set null,
  recipient_email text not null,
  idempotency_key text not null unique,
  payload jsonb not null default '{}'::jsonb,
  delivery_status text not null default 'pending'
    check (delivery_status in ('pending', 'processing', 'sent', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 10),
  next_attempt_at timestamptz not null default now(),
  provider_message_id text,
  delivered_at timestamptz,
  last_delivery_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_email_notifications_dispatch_idx
  on public.customer_email_notifications (next_attempt_at, created_at)
  where delivery_status in ('pending', 'failed', 'processing');

alter table public.customer_email_notifications enable row level security;
revoke all on public.customer_email_notifications from public, anon, authenticated;
grant all on public.customer_email_notifications to service_role;

create or replace function public.claim_customer_email_notifications(
  batch_limit integer default 20
)
returns setof public.customer_email_notifications
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with candidates as (
    select id
    from public.customer_email_notifications
    where attempt_count < max_attempts
      and next_attempt_at <= now()
      and (
        delivery_status in ('pending', 'failed')
        or (delivery_status = 'processing' and updated_at < now() - interval '10 minutes')
      )
    order by created_at asc
    limit greatest(1, least(batch_limit, 50))
    for update skip locked
  )
  update public.customer_email_notifications n
  set delivery_status = 'processing',
      attempt_count = n.attempt_count + 1,
      updated_at = now()
  from candidates c
  where n.id = c.id
  returning n.*;
end;
$$;

revoke all on function public.claim_customer_email_notifications(integer)
  from public, anon, authenticated;
grant execute on function public.claim_customer_email_notifications(integer) to service_role;

create or replace function public.enqueue_customer_email_notification(
  target_event_type text,
  target_user_id uuid,
  target_email text,
  target_idempotency_key text,
  target_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if nullif(btrim(coalesce(target_email, '')), '') is null then
    return;
  end if;

  insert into public.customer_email_notifications (
    event_type,
    recipient_user_id,
    recipient_email,
    idempotency_key,
    payload
  ) values (
    target_event_type,
    target_user_id,
    lower(btrim(target_email)),
    target_idempotency_key,
    coalesce(target_payload, '{}'::jsonb)
  )
  on conflict (idempotency_key) do nothing;
end;
$$;

revoke all on function public.enqueue_customer_email_notification(text, uuid, text, text, jsonb)
  from public, anon, authenticated;

-- Send a welcome email only after the user's email address is confirmed.
-- The unique idempotency key prevents duplicate welcome emails on repeated auth updates.
create or replace function public.enqueue_registration_welcome_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text;
begin
  if new.email_confirmed_at is null or nullif(btrim(coalesce(new.email, '')), '') is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.email_confirmed_at is not null then
    return new;
  end if;

  select p.full_name into profile_name
  from public.profiles p
  where p.id = new.id;

  perform public.enqueue_customer_email_notification(
    'registration_welcome',
    new.id,
    new.email,
    'registration-welcome:' || new.id::text,
    jsonb_build_object(
      'full_name',
      coalesce(
        nullif(btrim(profile_name), ''),
        nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
        nullif(btrim(coalesce(new.raw_user_meta_data ->> 'name', '')), ''),
        'there'
      )
    )
  );

  return new;
end;
$$;

drop trigger if exists customer_registration_welcome_email on auth.users;
create trigger customer_registration_welcome_email
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.enqueue_registration_welcome_email();

-- Applicant confirmation and decision emails. The existing admin trigger separately
-- creates operations inbox notifications for the same lifecycle events.
create or replace function public.enqueue_partner_application_customer_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_key text;
begin
  if tg_op = 'INSERT' then
    event_key := 'partner-application-received:' || new.id::text;
    perform public.enqueue_customer_email_notification(
      'partner_application_received',
      new.applicant_id,
      new.email,
      event_key,
      jsonb_build_object(
        'application_id', new.id,
        'full_name', new.full_name,
        'company', new.company,
        'role', new.role
      )
    );
  elsif old.status is distinct from new.status then
    event_key := 'partner-application-status:' || new.id::text || ':' ||
      new.status || ':' || coalesce(new.reviewed_at::text, clock_timestamp()::text);
    perform public.enqueue_customer_email_notification(
      'partner_application_status_changed',
      new.applicant_id,
      new.email,
      event_key,
      jsonb_build_object(
        'application_id', new.id,
        'full_name', new.full_name,
        'company', new.company,
        'role', new.role,
        'status', new.status,
        'review_note', new.review_note
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists partner_application_customer_email on public.partner_applications;
create trigger partner_application_customer_email
  after insert or update of status on public.partner_applications
  for each row execute function public.enqueue_partner_application_customer_email();

-- Notify the authenticated submitter after the access record is created for a submitted
-- property. Draft records are intentionally excluded.
create or replace function public.enqueue_submitted_property_customer_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  property_row record;
  recipient text;
  owner_name text;
begin
  if new.access_role <> 'submitter' or new.status <> 'active' then
    return new;
  end if;

  select p.id, p.title, p.area, p.status, u.email, pr.full_name
    into property_row
    from public.properties p
    join auth.users u on u.id = new.user_id
    left join public.profiles pr on pr.id = new.user_id
    where p.id = new.property_id;

  if not found or property_row.status not in ('submitted', 'needs_correction') then
    return new;
  end if;

  recipient := property_row.email;
  owner_name := property_row.full_name;

  perform public.enqueue_customer_email_notification(
    'property_submitted',
    new.user_id,
    recipient,
    'property-submitted:' || new.property_id || ':' || new.user_id::text,
    jsonb_build_object(
      'property_id', new.property_id,
      'property_title', property_row.title,
      'area', property_row.area,
      'full_name', owner_name
    )
  );

  return new;
end;
$$;

drop trigger if exists property_submitter_customer_email on public.property_access;
create trigger property_submitter_customer_email
  after insert on public.property_access
  for each row execute function public.enqueue_submitted_property_customer_email();

-- Send only meaningful status decisions to the recorded submitter(s), not every edit.
create or replace function public.enqueue_property_status_customer_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient_row record;
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  for recipient_row in
    select pa.user_id, u.email, pr.full_name
    from public.property_access pa
    join auth.users u on u.id = pa.user_id
    left join public.profiles pr on pr.id = pa.user_id
    where pa.property_id = new.id
      and pa.access_role = 'submitter'
      and pa.status = 'active'
      and nullif(btrim(coalesce(u.email, '')), '') is not null
  loop
    perform public.enqueue_customer_email_notification(
      'property_status_changed',
      recipient_row.user_id,
      recipient_row.email,
      'property-status:' || new.id || ':' || recipient_row.user_id::text || ':' ||
        new.status || ':' || new.updated_at::text,
      jsonb_build_object(
        'property_id', new.id,
        'property_title', new.title,
        'area', new.area,
        'status', new.status,
        'review_note', new.review_note,
        'full_name', recipient_row.full_name
      )
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists property_status_customer_email on public.properties;
create trigger property_status_customer_email
  after update of status on public.properties
  for each row execute function public.enqueue_property_status_customer_email();

comment on table public.customer_email_notifications is
  'Private, durable queue for customer transactional emails; operations alerts remain in admin_notifications.';
