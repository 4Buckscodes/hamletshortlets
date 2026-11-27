-- Two-hour payment window after availability is confirmed.
--
-- Policy (replaces the 48-hour pilot window):
--   * When the authorised owner or manager confirms availability, the guest has
--     2 hours to pay. The countdown starts at confirmation, not when the guest
--     opens the payment page.
--   * About 30 minutes before the deadline the guest gets a reminder email.
--   * New checkouts cannot start after the deadline (paystack-initialize).
--   * A payment already in flight at the deadline gets a 15-minute verification
--     grace: the Paystack webhook may still confirm it during that time, after
--     rechecking availability as before. An expired booking is never confirmed.
--   * Unpaid holds expire automatically once the deadline and the grace have
--     passed (pg_cron, every 5 minutes), and the guest and partner are emailed.
--
-- Bookings already awaiting payment keep the deadline they were given.
--
-- Functions changed here (transition_booking, confirm_booking_payment_webhook,
-- expire_overdue_bookings, enqueue_booking_event_notifications,
-- handle_booking_notification_trigger) are patched in place from their live
-- definitions, like 20261120052908, so earlier in-place patches are preserved.
-- Each patch fails instead of skipping if the expected text is not found, and is
-- a no-op once applied.

-- ── Policy constants ──────────────────────────────────────────────────────────
create or replace function public.booking_payment_window()
returns interval
language sql
immutable
set search_path = ''
as $$ select interval '2 hours' $$;

create or replace function public.booking_payment_grace()
returns interval
language sql
immutable
set search_path = ''
as $$ select interval '15 minutes' $$;

create or replace function public.booking_payment_reminder_lead()
returns interval
language sql
immutable
set search_path = ''
as $$ select interval '30 minutes' $$;

comment on function public.booking_payment_window() is
  'How long a guest has to pay after availability is confirmed.';
comment on function public.booking_payment_grace() is
  'Extra time after the payment deadline during which an in-flight Paystack payment may still be verified. New checkouts cannot start in this time.';
comment on function public.booking_payment_reminder_lead() is
  'How long before the payment deadline the guest reminder email is queued.';

-- ── Allow the reminder email type ─────────────────────────────────────────────
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
      'booking_payment_confirmed',
      'booking_cancelled',
      'booking_expired',
      'booking_refunded'
    )
  );

-- ── In-place patches ──────────────────────────────────────────────────────────
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
  -- transition_booking: 2-hour deadline; manual expiry waits for the grace too.
  definition := pg_get_functiondef('public.transition_booking(text,text,text)'::regprocedure);
  if position('public.booking_payment_window()' in definition) = 0 then
    patched := pg_temp.hamlet_replace_once(
      definition,
      'new_deadline := now() + interval ''48 hours'';',
      'new_deadline := now() + public.booking_payment_window();',
      'transition_booking() deadline'
    );
    patched := pg_temp.hamlet_replace_once(
      patched,
      'if booking_row.payment_deadline is null or booking_row.payment_deadline > now() then
        raise exception ''Cannot manually expire a booking before its payment deadline has elapsed.'';',
      'if booking_row.payment_deadline is null or booking_row.payment_deadline + public.booking_payment_grace() > now() then
        raise exception ''Cannot manually expire a booking before its payment deadline and payment-verification grace have elapsed.'';',
      'transition_booking() manual expiry'
    );
    execute patched;
  end if;

  -- confirm_booking_payment_webhook: verify in-flight payments during the grace.
  definition := pg_get_functiondef(
    'public.confirm_booking_payment_webhook(text,text,text,integer,integer,text)'::regprocedure
  );
  if position('public.booking_payment_grace()' in definition) = 0 then
    execute pg_temp.hamlet_replace_once(
      definition,
      'if booking_row.payment_deadline is not null and booking_row.payment_deadline <= now() then',
      'if booking_row.payment_deadline is not null and booking_row.payment_deadline + public.booking_payment_grace() <= now() then',
      'confirm_booking_payment_webhook() deadline'
    );
  end if;

  -- expire_overdue_bookings: release holds once the deadline and grace have passed.
  definition := pg_get_functiondef('public.expire_overdue_bookings()'::regprocedure);
  if position('public.booking_payment_grace()' in definition) = 0 then
    execute pg_temp.hamlet_replace_once(
      definition,
      'and payment_deadline <= now()',
      'and payment_deadline + public.booking_payment_grace() <= now()',
      'expire_overdue_bookings() deadline'
    );
  end if;

  -- enqueue_booking_event_notifications: support the guest-only reminder.
  definition := pg_get_functiondef('public.enqueue_booking_event_notifications(text,text,text)'::regprocedure);
  if position('booking_payment_reminder' in definition) = 0 then
    patched := pg_temp.hamlet_replace_once(
      definition,
      'if target_event_type not in (
    ''booking_request_created'',',
      'if target_event_type not in (
    ''booking_payment_reminder'',
    ''booking_request_created'',',
      'enqueue_booking_event_notifications() event list'
    );
    patched := pg_temp.hamlet_replace_once(
      patched,
      '  -- 3. HAMLET internal operations notification
  insert into public.booking_notifications (',
      '  -- 3. HAMLET internal operations notification (not for guest payment reminders)
  if target_event_type = ''booking_payment_reminder'' then
    return enqueued_count;
  end if;

  insert into public.booking_notifications (',
      'enqueue_booking_event_notifications() operations block'
    );
    execute patched;
  end if;

  -- handle_booking_notification_trigger: email guest and partner when a hold expires.
  definition := pg_get_functiondef('public.handle_booking_notification_trigger()'::regprocedure);
  if position('''booking_expired''' in definition) = 0 then
    execute pg_temp.hamlet_replace_once(
      definition,
      'perform public.enqueue_booking_event_notifications(new.id, ''booking_availability_declined'', latest_detail);
    end if;',
      'perform public.enqueue_booking_event_notifications(new.id, ''booking_availability_declined'', latest_detail);
    elsif old.status = ''awaiting_payment'' and new.status = ''expired'' then
      perform public.enqueue_booking_event_notifications(new.id, ''booking_expired'', null);
    end if;',
      'handle_booking_notification_trigger() expiry'
    );
  end if;
end;
$migration$;

-- ── Scheduled job: reminders and automatic expiry ─────────────────────────────
-- Runs without a signed-in user (pg_cron), so it is not exposed to clients.
create or replace function public.run_booking_payment_window_jobs()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  due record;
  reminders_queued integer := 0;
  expired_count integer := 0;
begin
  -- 1. Reminder about 30 minutes before the deadline (once per booking; the
  --    notification idempotency key prevents duplicates).
  for due in
    select b.id
    from public.bookings b
    where b.status = 'awaiting_payment'
      and b.payment_deadline is not null
      and b.payment_deadline > now()
      and b.payment_deadline <= now() + public.booking_payment_reminder_lead()
      and not exists (
        select 1 from public.booking_notifications n
        where n.idempotency_key = b.id || ':booking_payment_reminder:guest'
      )
  loop
    reminders_queued := reminders_queued
      + public.enqueue_booking_event_notifications(due.id, 'booking_payment_reminder', null);
  end loop;

  -- 2. Expire unpaid holds once the deadline and the verification grace have passed.
  with expired as (
    update public.bookings
      set status = 'expired',
          timeline = coalesce(timeline, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
            'at', now(),
            'label', 'Payment deadline expired — booking expired',
            'actor', 'HAMLET system',
            'detail', 'Availability released after the payment deadline.'
          ))
      where status = 'awaiting_payment'
        and payment_deadline is not null
        and payment_deadline + public.booking_payment_grace() <= now()
      returning reference, guest_id
  ),
  logged as (
    insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
      select expired.guest_id, 'system', 'booking_expired', expired.reference,
        'Payment deadline elapsed; booking expired and availability released.'
      from expired
      returning 1
  )
  select count(*) into expired_count from logged;

  return jsonb_build_object('reminders_queued', reminders_queued, 'expired', coalesce(expired_count, 0));
end;
$$;

revoke all on function public.run_booking_payment_window_jobs() from public, anon, authenticated;
grant execute on function public.run_booking_payment_window_jobs() to service_role;

comment on function public.run_booking_payment_window_jobs() is
  'Queues 30-minute payment reminders and expires unpaid holds after the deadline plus grace. Scheduled every 5 minutes by pg_cron.';

do $schedule$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute $cron$
      select cron.schedule(
        'hamlet-booking-payment-window',
        '*/5 * * * *',
        'select public.run_booking_payment_window_jobs()'
      )
    $cron$;
  end if;
end;
$schedule$;
