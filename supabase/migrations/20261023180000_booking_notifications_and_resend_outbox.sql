-- ============================================================================
-- HAMLET Release 1 — Transactional Booking Notification Outbox, Idempotent
-- Delivery Logging, Least-Privilege RLS, and Lifecycle Trigger Enqueueing
-- ============================================================================

create table if not exists public.booking_notifications (
  id uuid primary key default gen_random_uuid(),
  booking_id text not null references public.bookings (id) on delete cascade,
  booking_reference text not null,
  property_id text not null references public.properties (id) on delete cascade,
  event_type text not null check (
    event_type in (
      'booking_request_created',
      'booking_availability_confirmed',
      'booking_availability_declined',
      'booking_payment_confirmed',
      'booking_cancelled',
      'booking_expired',
      'booking_refunded'
    )
  ),
  recipient_type text not null check (
    recipient_type in ('guest', 'partner', 'operations')
  ),
  recipient_user_id uuid references public.profiles (id) on delete set null,
  recipient_email text,
  subject text,
  delivery_status text not null default 'pending' check (
    delivery_status in ('pending', 'processing', 'sent', 'failed', 'skipped')
  ),
  provider text not null default 'resend',
  provider_message_id text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 3 check (max_attempts >= 1),
  last_error text,
  idempotency_key text not null unique,
  payload jsonb not null default '{}'::jsonb,
  next_attempt_at timestamptz not null default now(),
  processing_started_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists booking_notifications_booking_idx
  on public.booking_notifications (booking_id, created_at desc);

create index if not exists booking_notifications_pending_dispatch_idx
  on public.booking_notifications (delivery_status, next_attempt_at, created_at asc)
  where delivery_status in ('pending', 'failed', 'processing');

alter table public.booking_notifications enable row level security;

-- Strictly admin-only read access for authenticated clients; guests and partners
-- cannot inspect notification logs or see other parties' email addresses.
drop policy if exists "Admins can read booking notifications" on public.booking_notifications;
create policy "Admins can read booking notifications"
  on public.booking_notifications for select to authenticated
  using (public.has_role('admin'));

revoke all on public.booking_notifications from public, anon, authenticated;
grant select on public.booking_notifications to authenticated;
grant all on public.booking_notifications to service_role;

-- ─── Internal Outbox Enqueue Helper ──────────────────────────────────────────

create or replace function public.enqueue_booking_event_notifications(
  target_booking_id text,
  target_event_type text,
  decision_note text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking_row public.bookings%rowtype;
  property_row public.properties%rowtype;
  guest_name text := 'Guest';
  guest_email text;
  first_image_url text;
  stay_nights integer;
  clean_note text := nullif(btrim(coalesce(decision_note, '')), '');
  base_payload jsonb;
  partner_rec record;
  partner_count integer := 0;
  enqueued_count integer := 0;
  row_inserted integer := 0;
begin
  if target_event_type not in (
    'booking_request_created',
    'booking_availability_confirmed',
    'booking_availability_declined',
    'booking_payment_confirmed',
    'booking_cancelled',
    'booking_expired',
    'booking_refunded'
  ) then
    raise exception 'Unsupported booking notification event type %.', target_event_type;
  end if;

  select * into booking_row
    from public.bookings
    where id = target_booking_id or reference = target_booking_id;

  if not found then
    return 0;
  end if;

  select * into property_row
    from public.properties
    where id = booking_row.property_id;

  select
    coalesce(nullif(btrim(p.full_name), ''), 'Guest'),
    nullif(btrim(coalesce(u.email, '')), '')
    into guest_name, guest_email
    from public.profiles p
    left join auth.users u on u.id = p.id
    where p.id = booking_row.guest_id;

  if property_row.image_urls is not null and coalesce(array_length(property_row.image_urls, 1), 0) > 0 then
    first_image_url := nullif(btrim(coalesce(property_row.image_urls[1], '')), '');
  end if;

  stay_nights := greatest(1, booking_row.check_out - booking_row.check_in);

  base_payload := jsonb_build_object(
    'booking_id', booking_row.id,
    'booking_reference', booking_row.reference,
    'property_id', booking_row.property_id,
    'property_title', coalesce(property_row.title, 'HAMLET Verified Stay'),
    'property_type', coalesce(property_row.property_type, 'Apartment'),
    'property_area', coalesce(property_row.area, 'Lagos'),
    'property_address', coalesce(property_row.public_address, 'Lagos, Nigeria'),
    'property_image_url', first_image_url,
    'guest_name', coalesce(guest_name, 'Guest'),
    'check_in', booking_row.check_in::text,
    'check_out', booking_row.check_out::text,
    'nights', stay_nights,
    'guest_count', booking_row.guest_count,
    'accommodation_subtotal', booking_row.accommodation_subtotal,
    'mandatory_total', booking_row.mandatory_total,
    'hamlet_guest_fee', booking_row.hamlet_guest_fee,
    'guest_total', booking_row.guest_total,
    'refundable_deposit', booking_row.refundable_deposit,
    'status', booking_row.status,
    'payment_deadline', booking_row.payment_deadline,
    'special_requests', nullif(btrim(coalesce(booking_row.special_requests, '')), ''),
    'decision_note', clean_note,
    'cancel_reason', nullif(btrim(coalesce(booking_row.cancel_reason, '')), ''),
    'refund_amount', booking_row.refund_amount
  );

  -- 1. Guest notification (all booking lifecycle events notify the booking guest)
  insert into public.booking_notifications (
    booking_id,
    booking_reference,
    property_id,
    event_type,
    recipient_type,
    recipient_user_id,
    recipient_email,
    delivery_status,
    last_error,
    idempotency_key,
    payload
  )
  values (
    booking_row.id,
    booking_row.reference,
    booking_row.property_id,
    target_event_type,
    'guest',
    booking_row.guest_id,
    guest_email,
    case when guest_email is null then 'failed' else 'pending' end,
    case when guest_email is null then 'Guest account has no email address configured.' else null end,
    booking_row.id || ':' || target_event_type || ':guest',
    base_payload
  )
  on conflict (idempotency_key) do nothing;

  get diagnostics row_inserted = row_count;
  enqueued_count := enqueued_count + row_inserted;

  -- 2. Authorized property partner notification(s)
  -- Sent on initial booking request creation and supported for confirmation/cancellation/expiry/refund events.
  if target_event_type in (
    'booking_request_created',
    'booking_payment_confirmed',
    'booking_cancelled',
    'booking_expired',
    'booking_refunded'
  ) then
    for partner_rec in
      select distinct on (lower(btrim(u.email)))
        pa.user_id,
        btrim(u.email) as email,
        coalesce(nullif(btrim(p.full_name), ''), 'Property Partner') as partner_name,
        coalesce(nullif(btrim(pa.access_role), ''), 'Partner') as access_role
      from public.property_access pa
      join public.profiles p on p.id = pa.user_id
      join auth.users u on u.id = pa.user_id
      where pa.property_id = booking_row.property_id
        and pa.status = 'active'
        and p.account_status = 'active'
        and p.role = 'partner'
        and nullif(btrim(coalesce(u.email, '')), '') is not null
      order by lower(btrim(u.email)), pa.granted_at asc
    loop
      partner_count := partner_count + 1;

      insert into public.booking_notifications (
        booking_id,
        booking_reference,
        property_id,
        event_type,
        recipient_type,
        recipient_user_id,
        recipient_email,
        delivery_status,
        idempotency_key,
        payload
      )
      values (
        booking_row.id,
        booking_row.reference,
        booking_row.property_id,
        target_event_type,
        'partner',
        partner_rec.user_id,
        partner_rec.email,
        'pending',
        booking_row.id || ':' || target_event_type || ':partner:' || partner_rec.user_id::text,
        base_payload || jsonb_build_object(
          'partner_name', partner_rec.partner_name,
          'partner_role', partner_rec.access_role
        )
      )
      on conflict (idempotency_key) do nothing;

      get diagnostics row_inserted = row_count;
      enqueued_count := enqueued_count + row_inserted;
    end loop;

    if partner_count = 0 and target_event_type = 'booking_request_created' then
      insert into public.booking_notifications (
        booking_id,
        booking_reference,
        property_id,
        event_type,
        recipient_type,
        recipient_email,
        delivery_status,
        last_error,
        idempotency_key,
        payload
      )
      values (
        booking_row.id,
        booking_row.reference,
        booking_row.property_id,
        target_event_type,
        'partner',
        null,
        'failed',
        'No active authorized property partner email found for property.',
        booking_row.id || ':' || target_event_type || ':partner:unassigned',
        base_payload
      )
      on conflict (idempotency_key) do nothing;

      get diagnostics row_inserted = row_count;
      enqueued_count := enqueued_count + row_inserted;
    end if;
  end if;

  -- 3. HAMLET internal operations notification (recipient resolved server-side from HAMLET_BOOKINGS_EMAIL)
  insert into public.booking_notifications (
    booking_id,
    booking_reference,
    property_id,
    event_type,
    recipient_type,
    recipient_email,
    delivery_status,
    idempotency_key,
    payload
  )
  values (
    booking_row.id,
    booking_row.reference,
    booking_row.property_id,
    target_event_type,
    'operations',
    null,
    'pending',
    booking_row.id || ':' || target_event_type || ':operations',
    base_payload
  )
  on conflict (idempotency_key) do nothing;

  get diagnostics row_inserted = row_count;
  enqueued_count := enqueued_count + row_inserted;

  return enqueued_count;
end;
$$;

revoke all on function public.enqueue_booking_event_notifications(text, text, text)
  from public, anon, authenticated;
grant execute on function public.enqueue_booking_event_notifications(text, text, text)
  to service_role;

-- ─── Automatic Lifecycle Trigger on public.bookings ──────────────────────────

create or replace function public.handle_booking_notification_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  latest_detail text;
  extracted_note text;
  separator_pos integer;
begin
  if tg_op = 'INSERT' then
    if new.status = 'requested' then
      perform public.enqueue_booking_event_notifications(new.id, 'booking_request_created', null);
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    if jsonb_typeof(new.timeline) = 'array' and jsonb_array_length(new.timeline) > 0 then
      latest_detail := nullif(btrim(coalesce((new.timeline -> (jsonb_array_length(new.timeline) - 1)) ->> 'detail', '')), '');
    end if;

    if old.status in ('requested', 'checking') and new.status = 'awaiting_payment' then
      if latest_detail is not null then
        separator_pos := position(' · ' in latest_detail);
        if separator_pos > 0 then
          extracted_note := nullif(btrim(substring(latest_detail from separator_pos + 3)), '');
        end if;
      end if;
      perform public.enqueue_booking_event_notifications(new.id, 'booking_availability_confirmed', extracted_note);
    elsif old.status in ('requested', 'checking') and new.status = 'declined' then
      perform public.enqueue_booking_event_notifications(new.id, 'booking_availability_declined', latest_detail);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enqueue_booking_lifecycle_notifications on public.bookings;
create trigger enqueue_booking_lifecycle_notifications
  after insert or update of status on public.bookings
  for each row execute function public.handle_booking_notification_trigger();

-- ─── Server-Side Edge Function Worker Authorization & Outbox Claim RPCs ─────

create or replace function public.authorize_booking_notification_dispatch(
  target_booking_id text,
  caller_user_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_role text;
  caller_status text;
  booking_row public.bookings%rowtype;
begin
  if caller_user_id is null then
    return jsonb_build_object('authorized', false, 'reason', 'unauthenticated');
  end if;

  select role, account_status
    into caller_role, caller_status
    from public.profiles
    where id = caller_user_id;

  if not found or caller_status <> 'active' then
    return jsonb_build_object('authorized', false, 'reason', 'forbidden');
  end if;

  if nullif(btrim(coalesce(target_booking_id, '')), '') is null then
    if caller_role = 'admin' then
      return jsonb_build_object('authorized', true, 'role', caller_role, 'booking_id', null);
    end if;
    return jsonb_build_object('authorized', false, 'reason', 'forbidden');
  end if;

  select * into booking_row
    from public.bookings
    where id = btrim(target_booking_id) or reference = btrim(target_booking_id);

  if not found then
    return jsonb_build_object('authorized', false, 'reason', 'forbidden');
  end if;

  if caller_role = 'admin' then
    return jsonb_build_object('authorized', true, 'role', caller_role, 'booking_id', booking_row.id);
  end if;

  if caller_role = 'guest' and booking_row.guest_id = caller_user_id then
    return jsonb_build_object('authorized', true, 'role', caller_role, 'booking_id', booking_row.id);
  end if;

  if caller_role = 'partner' and exists (
    select 1
    from public.property_access pa
    where pa.property_id = booking_row.property_id
      and pa.user_id = caller_user_id
      and pa.status = 'active'
  ) then
    return jsonb_build_object('authorized', true, 'role', caller_role, 'booking_id', booking_row.id);
  end if;

  return jsonb_build_object('authorized', false, 'reason', 'forbidden');
end;
$$;

revoke all on function public.authorize_booking_notification_dispatch(text, uuid)
  from public, anon, authenticated;
grant execute on function public.authorize_booking_notification_dispatch(text, uuid)
  to service_role;

create or replace function public.claim_pending_booking_notifications(
  target_booking_id text default null,
  batch_limit integer default 20,
  ignore_backoff boolean default false
)
returns setof public.booking_notifications
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_booking text := nullif(btrim(coalesce(target_booking_id, '')), '');
  effective_limit integer := greatest(1, least(coalesce(batch_limit, 20), 50));
begin
  return query
  with claimable as (
    select bn.id
    from public.booking_notifications bn
    where (
        clean_booking is null
        or bn.booking_id = clean_booking
        or bn.booking_reference = clean_booking
      )
      and bn.attempt_count < bn.max_attempts
      and (
        (
          bn.delivery_status in ('pending', 'failed')
          and (coalesce(ignore_backoff, false) or bn.next_attempt_at <= now())
        )
        or (
          bn.delivery_status = 'processing'
          and bn.processing_started_at <= now() - interval '5 minutes'
        )
      )
    order by bn.created_at asc
    limit effective_limit
    for update skip locked
  )
  update public.booking_notifications bn
    set delivery_status = 'processing',
        attempt_count = bn.attempt_count + 1,
        processing_started_at = now(),
        updated_at = now()
    from claimable
    where bn.id = claimable.id
    returning bn.*;
end;
$$;

revoke all on function public.claim_pending_booking_notifications(text, integer, boolean)
  from public, anon, authenticated;
grant execute on function public.claim_pending_booking_notifications(text, integer, boolean)
  to service_role;

create or replace function public.complete_booking_notification(
  target_notification_id uuid,
  next_delivery_status text,
  resolved_recipient_email text default null,
  rendered_subject text default null,
  message_id text default null,
  error_detail text default null,
  backoff_seconds integer default 60
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_email text := nullif(btrim(coalesce(resolved_recipient_email, '')), '');
  clean_subject text := nullif(btrim(coalesce(rendered_subject, '')), '');
  clean_msg_id text := nullif(btrim(coalesce(message_id, '')), '');
  clean_err text := nullif(left(btrim(coalesce(error_detail, '')), 500), '');
begin
  if next_delivery_status not in ('sent', 'failed', 'skipped') then
    raise exception 'Unsupported final notification delivery status %.', next_delivery_status;
  end if;

  update public.booking_notifications
    set delivery_status = next_delivery_status,
        recipient_email = coalesce(clean_email, recipient_email),
        subject = coalesce(clean_subject, subject),
        provider_message_id = case
          when next_delivery_status = 'sent' then coalesce(clean_msg_id, provider_message_id)
          else provider_message_id
        end,
        last_error = case
          when next_delivery_status = 'sent' then null
          else clean_err
        end,
        sent_at = case
          when next_delivery_status = 'sent' then coalesce(sent_at, now())
          else sent_at
        end,
        next_attempt_at = case
          when next_delivery_status = 'failed'
            then now() + make_interval(secs => greatest(0, coalesce(backoff_seconds, 60)))
          else next_attempt_at
        end,
        updated_at = now()
    where id = target_notification_id;
end;
$$;

revoke all on function public.complete_booking_notification(uuid, text, text, text, text, text, integer)
  from public, anon, authenticated;
grant execute on function public.complete_booking_notification(uuid, text, text, text, text, text, integer)
  to service_role;
