-- ============================================================================
-- HAMLET Release 1 — Endpoint Hardening, Role Grant Parity & Booking Hold Parity
-- ============================================================================

-- ─── 1. Ensure service_role has explicit table & worker RPC privileges ────────
-- Edge Functions (paystack-initialize, paystack-webhook, booking-notifications)
-- authenticate with SUPABASE_SERVICE_ROLE_KEY. Explicit grants ensure table
-- reads and scheduled sweeps succeed across all PostgreSQL environments.

grant all on
  public.profiles,
  public.properties,
  public.property_access,
  public.property_private_records,
  public.bookings,
  public.booking_issues,
  public.booking_payment_records,
  public.partner_applications,
  public.admin_audit_log,
  public.booking_feedback,
  public.booking_notifications
to service_role;

grant execute on function public.expire_overdue_bookings()
  to authenticated, service_role;

create or replace function public.expire_overdue_bookings()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  caller_jwt_role text := coalesce((select auth.role()), '');
  actor_role text;
  expired_count integer;
begin
  if caller_jwt_role <> 'service_role' then
    if actor_id is null then
      raise exception 'Sign in to process booking expiry.';
    end if;

    select role into actor_role
      from public.profiles
      where id = actor_id;

    if actor_role is null then
      raise exception 'A valid HAMLET profile is required.';
    end if;
  end if;

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
        and payment_deadline <= now()
      returning reference, guest_id
  ),
  logged as (
    insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
      select coalesce(actor_id, expired.guest_id), 'system', 'booking_expired', expired.reference,
        'Payment deadline elapsed; booking expired and availability released.'
      from expired
      returning 1
  )
  select count(*) into expired_count from logged;

  return coalesce(expired_count, 0);
end;
$$;

revoke all on function public.expire_overdue_bookings() from public, anon;
grant execute on function public.expire_overdue_bookings() to authenticated, service_role;

-- ─── 2. Align booking INSERT conflict check with availability & webhook RPCs ──
-- Previously enforce_booking_request_integrity() treated expired awaiting_payment
-- rows as active conflicts even after their 48-hour payment_deadline had elapsed
-- (causing POST /rest/v1/bookings to fail on dates reported available by
-- get_unavailable_property_ids), and did not verify is_account_active().

create or replace function public.enforce_booking_request_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  listing public.properties%rowtype;
  stay_nights integer;
  charges jsonb;
  charges_total integer;
  accommodation_total integer;
  guest_fee integer;
begin
  if (select auth.uid()) is null
    or new.guest_id <> (select auth.uid())
    or not public.has_role('guest') then
    raise exception 'A booking must belong to the signed-in guest.';
  end if;

  if not public.is_account_active() then
    raise exception 'Your account is currently suspended. Contact HAMLET operations.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.property_id, 0));

  select * into listing
  from public.properties
  where id = new.property_id and status = 'approved';

  if not found then
    raise exception 'This stay is not available for booking requests.';
  end if;

  if new.guest_count > listing.capacity then
    raise exception 'Guest count exceeds this property capacity.';
  end if;

  stay_nights := new.check_out - new.check_in;
  if stay_nights < 1 or stay_nights > 60 then
    raise exception 'Stay dates must be between 1 and 60 nights.';
  end if;

  if new.check_in < current_date then
    raise exception 'Check-in cannot be in the past.';
  end if;

  if exists (
    select 1 from public.bookings existing
    where existing.property_id = new.property_id
      and existing.check_in < new.check_out
      and existing.check_out > new.check_in
      and (
        existing.status = 'confirmed'
        or (
          existing.status = 'awaiting_payment'
          and (existing.payment_deadline is null or existing.payment_deadline > now())
        )
      )
  ) then
    raise exception 'Those dates conflict with an existing booking.';
  end if;

  charges := coalesce(listing.mandatory_charges, '[]'::jsonb);
  charges_total := coalesce((
    select sum(greatest(0, round((charge ->> 'amount')::numeric)::integer))
    from jsonb_array_elements(charges) as item(charge)
  ), 0);
  accommodation_total := stay_nights * listing.nightly_rate;
  guest_fee := round(accommodation_total * 0.03);

  new.accommodation_subtotal := accommodation_total;
  new.mandatory_charges := charges;
  new.mandatory_total := charges_total;
  new.hamlet_guest_fee := guest_fee;
  new.guest_total := accommodation_total + charges_total + guest_fee;
  new.refundable_deposit := listing.refundable_deposit;
  new.status := 'requested';
  new.timeline := jsonb_build_array(jsonb_build_object(
    'at', now(),
    'label', 'Booking requested',
    'actor', 'Guest',
    'detail', 'Awaiting availability and terms check'
  ));

  return new;
end;
$$;

-- ─── 3. Close direct PostgREST table mutation bypasses ────────────────────────
-- Partners must submit and update properties via submit_partner_property,
-- resubmit_partner_property, and update_and_resubmit_partner_property so
-- Lagos-only geography checks, verification state sanitization, active-account
-- checks, and audit logging cannot be bypassed via direct REST table writes.

drop policy if exists "Partners can submit properties for review" on public.properties;
drop policy if exists "Partners can edit their unapproved submissions" on public.properties;

-- Partner application reviews must go through review_partner_application() so
-- reviewer notes, state transitions, and admin_audit_log entries are enforced.
revoke update on public.partner_applications from anon, authenticated;
drop policy if exists "Admins can review partner applications" on public.partner_applications;

drop policy if exists "Applicants can create their own application" on public.partner_applications;
create policy "Applicants can create their own application"
  on public.partner_applications for insert to authenticated
  with check (
    applicant_id = (select auth.uid())
    and public.has_role('guest')
    and public.is_account_active()
  );

-- Remove dead UPDATE policy on booking_issues (updates go via transition_booking_issue)
-- and require an active guest account when reporting issues.
drop policy if exists "Property managers and admins can update booking issues" on public.booking_issues;
drop policy if exists "Guests can report issues on their bookings" on public.booking_issues;
create policy "Guests can report issues on their bookings"
  on public.booking_issues for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and public.is_account_active()
    and exists (
      select 1 from public.bookings
      where id = booking_id and guest_id = (select auth.uid())
    )
  );
