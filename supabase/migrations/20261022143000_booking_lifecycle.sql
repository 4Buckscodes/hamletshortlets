alter table public.bookings
  add column if not exists cancel_reason text;

revoke update on public.bookings from authenticated;

create or replace function public.transition_booking(
  target_booking_id text,
  next_status text,
  transition_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role text;
  actor_name text;
  booking_row public.bookings%rowtype;
  property_title text;
  event_label text;
  event_detail text;
  new_deadline timestamptz;
begin
  if actor_id is null then
    raise exception 'Sign in to update this booking.';
  end if;

  select role, full_name
    into actor_role, actor_name
    from public.profiles
    where id = actor_id;

  if actor_role is null then
    raise exception 'A valid HAMLET profile is required.';
  end if;

  select * into booking_row
    from public.bookings
    where id = target_booking_id
    for update;

  if not found then
    raise exception 'Booking not found.';
  end if;

  select title into property_title
    from public.properties
    where id = booking_row.property_id;

  if actor_role = 'guest' then
    if booking_row.guest_id <> actor_id
      or next_status <> 'cancelled'
      or booking_row.status not in ('requested', 'checking', 'awaiting_payment') then
      raise exception 'Guests may only cancel their own open booking requests.';
    end if;
    event_label := 'Booking cancelled by guest';
    event_detail := nullif(btrim(coalesce(transition_note, '')), '');
  elsif actor_role in ('partner', 'admin') then
    if not public.can_manage_property(booking_row.property_id) then
      raise exception 'You are not authorised to manage this property booking.';
    end if;

    if booking_row.status = 'requested' and next_status = 'checking' then
      event_label := 'Availability & terms being checked';
    elsif booking_row.status in ('requested', 'checking') and next_status = 'awaiting_payment' then
      perform 1
        from public.properties
        where id = booking_row.property_id
        for update;

      if booking_row.check_in < current_date then
        raise exception 'This booking has a check-in date in the past.';
      end if;

      if not exists (
        select 1 from public.properties
        where id = booking_row.property_id and status = 'approved'
      ) then
        raise exception 'This property is no longer approved for booking.';
      end if;

      if exists (
        select 1 from public.bookings existing
        where existing.id <> booking_row.id
          and existing.property_id = booking_row.property_id
          and existing.status in ('confirmed', 'awaiting_payment')
          and (existing.status <> 'awaiting_payment' or existing.payment_deadline > now())
          and existing.check_in < booking_row.check_out
          and existing.check_out > booking_row.check_in
      ) then
        raise exception 'These dates overlap another active booking. Recheck availability before accepting.';
      end if;

      new_deadline := now() + interval '48 hours';
      event_label := 'Accepted — awaiting payment';
      event_detail := 'Payment deadline: ' || to_char(new_deadline, 'YYYY-MM-DD HH24:MI:SS TZ')
        || case when nullif(btrim(coalesce(transition_note, '')), '') is null then ''
          else ' · ' || btrim(transition_note) end;
    elsif booking_row.status in ('requested', 'checking') and next_status = 'declined' then
      event_label := 'Declined by property partner';
      event_detail := nullif(btrim(coalesce(transition_note, '')), '');
    else
      raise exception 'Invalid booking transition from % to %.', booking_row.status, next_status;
    end if;
  else
    raise exception 'This account role cannot update bookings.';
  end if;

  update public.bookings
    set status = next_status,
        payment_deadline = case when next_status = 'awaiting_payment' then new_deadline else payment_deadline end,
        cancel_reason = case when next_status = 'cancelled' then event_detail else cancel_reason end,
        timeline = coalesce(timeline, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
          'at', now(),
          'label', event_label,
          'actor', coalesce(nullif(actor_name, ''), 'HAMLET user') || ' (' || actor_role || ')',
          'detail', event_detail
        ))
    where id = booking_row.id;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      actor_role,
      'booking_' || next_status,
      booking_row.reference,
      'Property: ' || coalesce(property_title, booking_row.property_id)
        || '; previous status: ' || booking_row.status
        || '; new status: ' || next_status
        || case when event_detail is null then '' else '; ' || event_detail end
    );
end;
$$;

revoke all on function public.transition_booking(text, text, text) from public, anon;
grant execute on function public.transition_booking(text, text, text) to authenticated;

create or replace function public.expire_overdue_bookings()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role text;
  expired_count integer;
begin
  if actor_id is null then
    raise exception 'Sign in to process booking expiry.';
  end if;

  select role into actor_role
    from public.profiles
    where id = actor_id;

  if actor_role is null then
    raise exception 'A valid HAMLET profile is required.';
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
      returning reference
  )
  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    select actor_id, 'system', 'booking_expired', reference,
      'Payment deadline elapsed; booking expired and availability released.'
    from expired;

  get diagnostics expired_count = row_count;
  return expired_count;
end;
$$;

revoke all on function public.expire_overdue_bookings() from public, anon;
grant execute on function public.expire_overdue_bookings() to authenticated;
