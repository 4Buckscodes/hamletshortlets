-- HAMLET Customer Communications: private, idempotent transactional email outbox.
-- This migration does not send email. The Vercel server-only dispatcher sends queued events via Resend.
-- Resend credentials stay in Vercel encrypted environment variables; the database stores only a SHA-256 dispatch-secret hash.

create table if not exists public.communications_outbox (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  actor_user_id uuid references auth.users(id) on delete set null,
  recipient_user_id uuid references auth.users(id) on delete set null,
  recipient_email text not null,
  recipient_type text not null check (recipient_type in ('customer','guest','partner','operations')),
  event_type text not null,
  subject text not null,
  payload jsonb not null default '{}'::jsonb,
  delivery_status text not null default 'pending'
    check (delivery_status in ('pending','processing','sent','failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 10),
  next_attempt_at timestamptz not null default now(),
  provider_message_id text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists communications_outbox_dispatch_idx
  on public.communications_outbox (next_attempt_at, created_at)
  where delivery_status in ('pending','failed');

create index if not exists communications_outbox_actor_idx
  on public.communications_outbox (actor_user_id, created_at desc);

alter table public.communications_outbox enable row level security;
revoke all on public.communications_outbox from public, anon, authenticated;
grant all on public.communications_outbox to service_role;

create table if not exists public.communications_dispatch_config (
  singleton boolean primary key default true check (singleton),
  secret_hash text not null check (length(secret_hash) = 64),
  updated_at timestamptz not null default now()
);
alter table public.communications_dispatch_config enable row level security;
revoke all on public.communications_dispatch_config from public, anon, authenticated, service_role;
grant all on public.communications_dispatch_config to service_role;

insert into public.communications_dispatch_config (singleton, secret_hash)
values (
  true,
  'e59e4dc378a452f205d8c60ada27775ee4df1e809cfeb95c3d0bc936c71c4bea'
)
on conflict (singleton) do update
set secret_hash = excluded.secret_hash,
    updated_at = now();

create or replace function public.enqueue_communications_message(
  p_event_key text,
  p_actor_user_id uuid,
  p_recipient_user_id uuid,
  p_recipient_email text,
  p_recipient_type text,
  p_event_type text,
  p_subject text,
  p_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if nullif(btrim(coalesce(p_recipient_email, '')), '') is null then
    return;
  end if;
  if p_recipient_type not in ('customer','guest','partner','operations') then
    raise exception 'Unsupported communications recipient type.';
  end if;
  insert into public.communications_outbox (
    event_key, actor_user_id, recipient_user_id, recipient_email,
    recipient_type, event_type, subject, payload
  )
  values (
    p_event_key, p_actor_user_id, p_recipient_user_id, lower(btrim(p_recipient_email)),
    p_recipient_type, p_event_type, p_subject, coalesce(p_payload, '{}'::jsonb)
  )
  on conflict (event_key) do nothing;
end;
$$;

revoke all on function public.enqueue_communications_message(text, uuid, uuid, text, text, text, text, jsonb)
  from public, anon, authenticated;

create or replace function public.enqueue_communications_admin_alerts(
  p_event_key text,
  p_actor_user_id uuid,
  p_event_type text,
  p_subject text,
  p_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_rec record;
begin
  for admin_rec in
    select p.id as user_id, lower(btrim(u.email)) as email
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.role = 'admin'
      and coalesce(p.account_status, 'active') = 'active'
      and nullif(btrim(coalesce(u.email, '')), '') is not null
  loop
    perform public.enqueue_communications_message(
      p_event_key || ':admin:' || admin_rec.user_id::text,
      p_actor_user_id,
      admin_rec.user_id,
      admin_rec.email,
      'operations',
      p_event_type,
      p_subject,
      coalesce(p_payload, '{}'::jsonb)
    );
  end loop;
end;
$$;

revoke all on function public.enqueue_communications_admin_alerts(text, uuid, text, text, jsonb)
  from public, anon, authenticated;

-- Trigger after profile creation: send the welcome only once the email is confirmed.
-- Operations are alerted immediately when a user record is created.
create or replace function public.enqueue_auth_user_communications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  full_name text;
begin
  select coalesce(nullif(btrim(p.full_name), ''), nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), 'there')
    into full_name
  from public.profiles p
  where p.id = new.id;

  if tg_op = 'INSERT' then
    if new.email_confirmed_at is not null then
      perform public.enqueue_communications_message(
        'user:' || new.id::text || ':welcome',
        new.id, new.id, new.email, 'customer',
        'welcome_registration', 'Welcome to HAMLET — your account is ready',
        jsonb_build_object('user_id', new.id, 'name', full_name)
      );
    end if;

    perform public.enqueue_communications_admin_alerts(
      'user:' || new.id::text || ':registered',
      new.id,
      'operations_new_registration',
      '[HAMLET Operations] New account registration',
      jsonb_build_object('user_id', new.id, 'name', full_name, 'email', new.email)
    );
  elsif old.email_confirmed_at is null and new.email_confirmed_at is not null then
    perform public.enqueue_communications_message(
      'user:' || new.id::text || ':welcome',
      new.id, new.id, new.email, 'customer',
      'welcome_registration', 'Welcome to HAMLET — your account is ready',
      jsonb_build_object('user_id', new.id, 'name', full_name)
    );
  end if;
  return new;
end;
$$;

revoke all on function public.enqueue_auth_user_communications()
  from public, anon, authenticated;

drop trigger if exists z_communications_auth_user_created on auth.users;
create trigger z_communications_auth_user_created
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.enqueue_auth_user_communications();

-- Partner application acknowledgement and decisions to the applicant, plus an operations email.
create or replace function public.enqueue_partner_application_communications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_name text;
  email_subject text;
  actor uuid;
  applicant_payload jsonb;
begin
  actor := coalesce(auth.uid(), new.reviewed_by, new.applicant_id);
  applicant_payload := jsonb_build_object(
    'application_id', new.id,
    'name', new.full_name,
    'company', new.company,
    'role', new.role,
    'status', new.status,
    'review_note', new.review_note
  );

  if tg_op = 'INSERT' then
    event_name := 'partner_application_received';
    email_subject := 'We have received your HAMLET partner application';
    perform public.enqueue_communications_message(
      'partner-application:' || new.id::text || ':received:applicant',
      new.applicant_id, new.applicant_id, new.email, 'partner',
      event_name, email_subject, applicant_payload
    );
    perform public.enqueue_communications_admin_alerts(
      'partner-application:' || new.id::text || ':received:operations',
      new.applicant_id,
      'operations_partner_application_received',
      '[HAMLET Operations] New partner application',
      applicant_payload || jsonb_build_object('email', new.email)
    );
    return new;
  end if;

  if old.status is not distinct from new.status then
    return new;
  end if;

  if new.status = 'approved' then
    event_name := 'partner_application_approved';
    email_subject := 'Your HAMLET partner application has been approved';
  elsif new.status = 'needs_correction' then
    event_name := 'partner_application_needs_correction';
    email_subject := 'Action required: update your HAMLET partner application';
  elsif new.status = 'rejected' then
    event_name := 'partner_application_rejected';
    email_subject := 'An update on your HAMLET partner application';
  elsif new.status = 'pending' then
    event_name := 'partner_application_resubmitted';
    email_subject := 'Your updated HAMLET partner application is under review';
  else
    event_name := 'partner_application_status_updated';
    email_subject := 'Your HAMLET partner application has been updated';
  end if;

  perform public.enqueue_communications_message(
    'partner-application:' || new.id::text || ':status:' || new.status || ':applicant',
    actor, new.applicant_id, new.email, 'partner',
    event_name, email_subject, applicant_payload
  );
  perform public.enqueue_communications_admin_alerts(
    'partner-application:' || new.id::text || ':status:' || new.status || ':operations',
    actor,
    'operations_' || event_name,
    '[HAMLET Operations] Partner application status changed',
    applicant_payload || jsonb_build_object('email', new.email)
  );
  return new;
end;
$$;

revoke all on function public.enqueue_partner_application_communications()
  from public, anon, authenticated;

drop trigger if exists z_communications_partner_application on public.partner_applications;
create trigger z_communications_partner_application
  after insert or update of status on public.partner_applications
  for each row execute function public.enqueue_partner_application_communications();

-- Property submission and review lifecycle emails to every active property access holder.
create or replace function public.enqueue_property_lifecycle_communications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_name text;
  email_subject text;
  actor uuid;
  recipient record;
  event_key text;
  property_payload jsonb;
begin
  actor := coalesce(
    auth.uid(),
    new.property_introducer_id,
    new.authorised_manager_id,
    new.calendar_responsible_user_id
  );

  property_payload := jsonb_build_object(
    'property_id', new.id,
    'property_title', new.title,
    'property_area', new.area,
    'status', new.status,
    'review_note', new.review_note
  );

  if tg_op = 'INSERT' then
    if new.status not in ('submitted','needs_correction') then
      return new;
    end if;
    event_name := 'property_submitted';
    email_subject := 'Your property listing has been submitted to HAMLET';
    event_key := 'property:' || new.id || ':submitted';
  else
    if old.status is not distinct from new.status then
      return new;
    end if;
    if new.status = 'approved' then
      event_name := 'property_approved';
      email_subject := 'Your property is approved on HAMLET';
    elsif new.status = 'needs_correction' then
      event_name := 'property_needs_correction';
      email_subject := 'Action required: corrections to your HAMLET property listing';
    elsif new.status = 'rejected' then
      event_name := 'property_rejected';
      email_subject := 'An update on your HAMLET property submission';
    elsif new.status = 'submitted' then
      event_name := 'property_resubmitted';
      email_subject := 'Your corrected property listing has been resubmitted';
    elsif new.status = 'suspended' then
      event_name := 'property_suspended';
      email_subject := 'Your HAMLET property listing has been suspended';
    elsif new.status = 'paused' then
      event_name := 'property_paused';
      email_subject := 'Your HAMLET property listing has been paused';
    elsif new.status = 'archived' then
      event_name := 'property_archived';
      email_subject := 'Your HAMLET property listing has been archived';
    else
      event_name := 'property_status_updated';
      email_subject := 'Your HAMLET property listing has been updated';
    end if;
    event_key := 'property:' || new.id || ':status:' || new.status;
  end if;

  for recipient in
    select distinct u.id as user_id, lower(btrim(u.email)) as email
    from (
      select pa.user_id
      from public.property_access pa
      where pa.property_id = new.id and pa.status = 'active'
      union
      select candidate.user_id
      from (values
        (new.property_introducer_id),
        (new.authorised_manager_id),
        (new.calendar_responsible_user_id)
      ) as candidate(user_id)
      where candidate.user_id is not null
    ) property_users
    join auth.users u on u.id = property_users.user_id
    where nullif(btrim(coalesce(u.email, '')), '') is not null
  loop
    perform public.enqueue_communications_message(
      event_key || ':user:' || recipient.user_id::text,
      actor, recipient.user_id, recipient.email, 'partner',
      event_name, email_subject, property_payload
    );
  end loop;

  perform public.enqueue_communications_admin_alerts(
    event_key || ':operations',
    actor,
    'operations_' || event_name,
    '[HAMLET Operations] Property listing status: ' || new.status,
    property_payload
  );

  return new;
end;
$$;

revoke all on function public.enqueue_property_lifecycle_communications()
  from public, anon, authenticated;

drop trigger if exists z_communications_property_lifecycle on public.properties;
create trigger z_communications_property_lifecycle
  after insert or update of status on public.properties
  for each row execute function public.enqueue_property_lifecycle_communications();

-- Mirror new booking notification recipients into the same outbox so all email goes through one
-- Resend sender, idempotency policy, and retry mechanism. Existing historical failures are not backfilled.
create or replace function public.mirror_booking_notification_to_communications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid;
  payload jsonb;
  recipient_type text;
begin
  if nullif(btrim(coalesce(new.recipient_email, '')), '') is null then
    return new;
  end if;

  select b.guest_id into actor
  from public.bookings b
  where b.id = new.booking_id;

  recipient_type := case
    when new.recipient_type = 'operations' then 'operations'
    when new.recipient_type = 'partner' then 'partner'
    else 'guest'
  end;

  payload := coalesce(new.payload, '{}'::jsonb) || jsonb_build_object(
    'booking_id', new.booking_id,
    'booking_reference', new.booking_reference,
    'property_id', new.property_id
  );

  perform public.enqueue_communications_message(
    'booking-notification:' || new.id::text,
    actor,
    new.recipient_user_id,
    new.recipient_email,
    recipient_type,
    new.event_type,
    coalesce(nullif(btrim(new.subject), ''), 'HAMLET booking update'),
    payload
  );
  return new;
end;
$$;

revoke all on function public.mirror_booking_notification_to_communications()
  from public, anon, authenticated;

drop trigger if exists z_communications_booking_notification on public.booking_notifications;
create trigger z_communications_booking_notification
  after insert on public.booking_notifications
  for each row execute function public.mirror_booking_notification_to_communications();

-- Authenticated applicants/partners can process only their own customer messages.
-- Admins can process the full queue. The Vercel cron can process all rows with the
-- separate server-only dispatch secret and p_system_run=true.
create or replace function public.claim_communications_outbox(
  p_dispatch_secret text,
  p_batch_limit integer default 20,
  p_system_run boolean default false
)
returns setof public.communications_outbox
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_hash text;
  caller_id uuid := auth.uid();
  caller_is_admin boolean := false;
begin
  select secret_hash into expected_hash
  from public.communications_dispatch_config
  where singleton = true;

  if expected_hash is null
    or p_dispatch_secret is null
    or encode(extensions.digest(convert_to(p_dispatch_secret, 'UTF8'), 'sha256'), 'hex') <> expected_hash then
    raise exception 'Communications dispatch is unauthorized.';
  end if;

  if not p_system_run then
    if caller_id is null then
      raise exception 'Sign in before dispatching account notifications.';
    end if;
    select exists (
      select 1 from public.profiles p
      where p.id = caller_id and p.role = 'admin'
    ) into caller_is_admin;
  end if;

  return query
  with candidates as (
    select o.id
    from public.communications_outbox o
    where o.delivery_status in ('pending','failed')
      and o.next_attempt_at <= now()
      and o.attempt_count < o.max_attempts
      and (
        p_system_run
        or caller_is_admin
        or (o.recipient_user_id = caller_id and o.recipient_type <> 'operations')
      )
    order by o.created_at asc
    limit greatest(1, least(coalesce(p_batch_limit, 20), 50))
    for update skip locked
  )
  update public.communications_outbox o
  set delivery_status = 'processing',
      attempt_count = o.attempt_count + 1,
      updated_at = now()
  from candidates c
  where o.id = c.id
  returning o.*;
end;
$$;

revoke all on function public.claim_communications_outbox(text, integer, boolean)
  from public;
grant execute on function public.claim_communications_outbox(text, integer, boolean)
  to anon, authenticated, service_role;

create or replace function public.complete_communications_outbox(
  p_dispatch_secret text,
  p_notification_id uuid,
  p_delivery_status text,
  p_provider_message_id text default null,
  p_error text default null,
  p_retry_after_seconds integer default 60,
  p_system_run boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_hash text;
  caller_id uuid := auth.uid();
  caller_is_admin boolean := false;
  updated_count integer;
begin
  select secret_hash into expected_hash
  from public.communications_dispatch_config
  where singleton = true;

  if expected_hash is null
    or p_dispatch_secret is null
    or encode(extensions.digest(convert_to(p_dispatch_secret, 'UTF8'), 'sha256'), 'hex') <> expected_hash then
    raise exception 'Communications dispatch is unauthorized.';
  end if;

  if p_delivery_status not in ('sent','failed') then
    raise exception 'Unsupported communications delivery status.';
  end if;

  if not p_system_run then
    if caller_id is null then
      raise exception 'Sign in before updating account notifications.';
    end if;
    select exists (
      select 1 from public.profiles p
      where p.id = caller_id and p.role = 'admin'
    ) into caller_is_admin;
  end if;

  update public.communications_outbox o
  set delivery_status = p_delivery_status,
      provider_message_id = case when p_delivery_status = 'sent' then p_provider_message_id else null end,
      last_error = case when p_delivery_status = 'failed' then left(coalesce(p_error, 'Email delivery failed.'), 480) else null end,
      sent_at = case when p_delivery_status = 'sent' then now() else null end,
      next_attempt_at = case
        when p_delivery_status = 'failed' then now() + make_interval(secs => greatest(60, least(coalesce(p_retry_after_seconds,60), 3600)))
        else o.next_attempt_at
      end,
      updated_at = now()
  where o.id = p_notification_id
    and o.delivery_status = 'processing'
    and (
      p_system_run
      or caller_is_admin
      or (o.recipient_user_id = caller_id and o.recipient_type <> 'operations')
    );

  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;

revoke all on function public.complete_communications_outbox(text, uuid, text, text, text, integer, boolean)
  from public;
grant execute on function public.complete_communications_outbox(text, uuid, text, text, text, integer, boolean)
  to anon, authenticated, service_role;

comment on table public.communications_outbox is
  'Private idempotent transactional email outbox for HAMLET account, partner, property, and booking lifecycle events.';

comment on function public.claim_communications_outbox(text, integer, boolean) is
  'Claims pending HAMLET email events. Non-admin users can claim only their own non-operations messages; the Vercel worker requires the server-only dispatch secret.';
