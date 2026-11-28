-- One-time 30-minute payment extension, approved by the property owner or manager.
--
-- Policy:
--   * While a booking is awaiting payment and before its payment deadline, the
--     guest may ask once for 30 more minutes (request_payment_extension).
--   * Someone who manages the property (an active property partner, or an admin)
--     approves or declines it before the deadline (decide_payment_extension).
--     Approval moves payment_deadline 30 minutes later. The booking's own guest
--     can never decide their own request.
--   * Each booking gets at most one request; a decision is final.
--   * If nobody decides before the deadline, nothing changes: the booking
--     expires at its deadline as usual (run_booking_payment_window_jobs).
--   * Emails: the partner is told about the request; the guest gets a
--     confirmation, then the approval or decline. Operations is not emailed.
--
-- enqueue_booking_event_notifications() is patched in place from its live
-- definition (like 20261127090000), anchored on code rather than comments
-- because deployed definitions can have comments stripped.

-- ── Policy constant ───────────────────────────────────────────────────────────
create or replace function public.booking_payment_extension()
returns interval
language sql
immutable
set search_path = ''
as $$ select interval '30 minutes' $$;

comment on function public.booking_payment_extension() is
  'How much time an approved one-time payment extension adds to the payment deadline.';

-- ── Booking columns ───────────────────────────────────────────────────────────
alter table public.bookings
  add column if not exists payment_extension_status text,
  add column if not exists payment_extension_requested_at timestamptz,
  add column if not exists payment_extension_decided_at timestamptz,
  add column if not exists payment_extension_decided_by uuid references public.profiles (id) on delete set null;

do $constraint$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.bookings'::regclass
      and conname = 'bookings_payment_extension_status_check'
  ) then
    alter table public.bookings
      add constraint bookings_payment_extension_status_check
      check (payment_extension_status is null or payment_extension_status in ('requested', 'approved', 'declined'));
  end if;
end;
$constraint$;

comment on column public.bookings.payment_extension_status is
  'One-time 30-minute payment extension: null (never asked), requested, approved or declined.';

-- ── Notification types ────────────────────────────────────────────────────────
do $constraint$
declare
  rec record;
begin
  for rec in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.booking_notifications'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%event_type%'
  loop
    execute format('alter table public.booking_notifications drop constraint if exists %I', rec.conname);
  end loop;
end;
$constraint$;

alter table public.booking_notifications
  add constraint booking_notifications_event_type_check check (
    event_type in (
      'booking_request_created',
      'booking_availability_confirmed',
      'booking_availability_declined',
      'booking_payment_reminder',
      'booking_extension_requested',
      'booking_extension_approved',
      'booking_extension_declined',
      'booking_payment_confirmed',
      'booking_cancelled',
      'booking_expired',
      'booking_refunded'
    )
  );

create or replace function pg_temp.hamlet_replace_once(
  definition text,
  old_text text,
  new_text text,
  label text
)
returns text
language plpgsql
as $$
begin
  if (length(definition) - length(replace(definition, old_text, ''))) / length(old_text) <> 1 then
    raise exception '%: expected text not recognised; patch it manually. Looking for: %', label, old_text;
  end if;
  return replace(definition, old_text, new_text);
end;
$$;

do $migration$
declare
  definition text;
  patched text;
begin
  definition := pg_get_functiondef('public.enqueue_booking_event_notifications(text,text,text)'::regprocedure);
  if position('booking_extension_requested' in definition) = 0 then
    -- Accept the three extension event types.
    patched := pg_temp.hamlet_replace_once(
      definition,
      'if target_event_type not in (
    ''booking_payment_reminder'',',
      'if target_event_type not in (
    ''booking_payment_reminder'',
    ''booking_extension_requested'',
    ''booking_extension_approved'',
    ''booking_extension_declined'',',
      'enqueue_booking_event_notifications() event list'
    );
    -- Tell the property partner(s) when a guest asks for more time.
    patched := pg_temp.hamlet_replace_once(
      patched,
      '  if target_event_type in (
    ''booking_request_created'',
    ''booking_payment_confirmed'',',
      '  if target_event_type in (
    ''booking_extension_requested'',
    ''booking_request_created'',
    ''booking_payment_confirmed'',',
      'enqueue_booking_event_notifications() partner list'
    );
    -- No operations email for reminders or extension events.
    patched := pg_temp.hamlet_replace_once(
      patched,
      'if target_event_type = ''booking_payment_reminder'' then
    return enqueued_count;
  end if;',
      'if target_event_type in (
    ''booking_payment_reminder'',
    ''booking_extension_requested'',
    ''booking_extension_approved'',
    ''booking_extension_declined''
  ) then
    return enqueued_count;
  end if;',
      'enqueue_booking_event_notifications() operations guard'
    );
    execute patched;
  end if;
end;
$migration$;

-- ── Guest: ask for 30 more minutes ────────────────────────────────────────────
create or replace function public.request_payment_extension(target_booking_id text)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  booking_row public.bookings%rowtype;
begin
  if actor_id is null then
    raise exception 'Sign in to ask for more time to pay.';
  end if;

  select * into booking_row
    from public.bookings
    where id = target_booking_id
    for update;

  if not found or booking_row.guest_id <> actor_id then
    raise exception 'Booking not found for your guest account.';
  end if;

  if booking_row.status <> 'awaiting_payment' then
    raise exception 'Only a booking that is awaiting payment can get more time.';
  end if;

  if booking_row.payment_deadline is null or booking_row.payment_deadline <= now() then
    raise exception 'The payment window for this booking has already closed.';
  end if;

  if booking_row.payment_extension_status is not null then
    raise exception 'You can ask for more time only once per booking.';
  end if;

  update public.bookings
    set payment_extension_status = 'requested',
        payment_extension_requested_at = now(),
        timeline = coalesce(timeline, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
          'at', now(),
          'label', 'Guest asked for 30 more minutes to pay',
          'actor', 'Guest',
          'detail', 'Waiting for the property partner to approve or decline before the current deadline.'
        ))
    where id = booking_row.id;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
  values (actor_id, 'guest', 'payment_extension_requested', booking_row.reference,
    'Guest asked for a one-time 30-minute payment extension.');

  perform public.enqueue_booking_event_notifications(booking_row.id, 'booking_extension_requested', null);

  return booking_row.payment_deadline;
end;
$$;

revoke all on function public.request_payment_extension(text) from public, anon;
grant execute on function public.request_payment_extension(text) to authenticated;

-- ── Partner or admin: approve or decline ──────────────────────────────────────
create or replace function public.decide_payment_extension(
  target_booking_id text,
  approve boolean,
  decision_note text default null
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role text;
  actor_name text;
  booking_row public.bookings%rowtype;
  clean_note text := nullif(btrim(coalesce(decision_note, '')), '');
  new_deadline timestamptz;
begin
  if actor_id is null then
    raise exception 'Sign in to respond to this request.';
  end if;

  if not public.is_account_active() then
    raise exception 'Your account is not active.';
  end if;

  select role, full_name into actor_role, actor_name
    from public.profiles
    where id = actor_id;

  select * into booking_row
    from public.bookings
    where id = target_booking_id
    for update;

  if not found then
    raise exception 'Booking not found.';
  end if;

  if booking_row.guest_id = actor_id or not public.can_manage_property(booking_row.property_id) then
    raise exception 'You are not authorised to manage this property booking.';
  end if;

  if booking_row.payment_extension_status is distinct from 'requested' then
    raise exception 'There is no pending request for more time on this booking.';
  end if;

  if booking_row.status <> 'awaiting_payment' then
    raise exception 'This booking is no longer awaiting payment.';
  end if;

  if booking_row.payment_deadline is null or booking_row.payment_deadline <= now() then
    raise exception 'The payment deadline has already passed, so the request can no longer be approved or declined.';
  end if;

  new_deadline := case
    when approve then booking_row.payment_deadline + public.booking_payment_extension()
    else booking_row.payment_deadline
  end;

  update public.bookings
    set payment_extension_status = case when approve then 'approved' else 'declined' end,
        payment_extension_decided_at = now(),
        payment_extension_decided_by = actor_id,
        payment_deadline = new_deadline,
        timeline = coalesce(timeline, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
          'at', now(),
          'label', case when approve then 'Extra 30 minutes to pay approved' else 'Request for more time declined' end,
          'actor', coalesce(nullif(actor_name, ''), 'Property partner') || ' (' || coalesce(actor_role, 'partner') || ')',
          'detail', case
            when approve then 'New payment deadline: ' || to_char(new_deadline, 'YYYY-MM-DD HH24:MI:SS TZ')
            else 'The original payment deadline stands.'
          end || case when clean_note is null then '' else ' · ' || clean_note end
        ))
    where id = booking_row.id;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
  values (
    actor_id,
    coalesce(actor_role, 'partner'),
    case when approve then 'payment_extension_approved' else 'payment_extension_declined' end,
    booking_row.reference,
    case when approve then 'Payment deadline moved to ' || to_char(new_deadline, 'YYYY-MM-DD HH24:MI:SS TZ') || '.'
      else 'Original payment deadline kept.' end
  );

  perform public.enqueue_booking_event_notifications(
    booking_row.id,
    case when approve then 'booking_extension_approved' else 'booking_extension_declined' end,
    clean_note
  );

  return new_deadline;
end;
$$;

revoke all on function public.decide_payment_extension(text, boolean, text) from public, anon;
grant execute on function public.decide_payment_extension(text, boolean, text) to authenticated;
