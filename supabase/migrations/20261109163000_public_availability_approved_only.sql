-- Public availability lookups must not disclose identifiers for unpublished listings.
-- Keep the booking-conflict calculation intact for approved marketplace properties.
create or replace function public.get_unavailable_property_ids(
  requested_check_in date,
  requested_check_out date
)
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select distinct p.id
  from public.properties p
  where p.status = 'approved'
    and requested_check_in is not null
    and requested_check_out is not null
    and requested_check_out > requested_check_in
    and (
      (p.first_available_date is not null and requested_check_in < p.first_available_date)
      or exists (
        select 1
        from public.bookings b
        where b.property_id = p.id
          and b.check_in < requested_check_out
          and b.check_out > requested_check_in
          and (
            b.status = 'confirmed'
            or (
              b.status = 'awaiting_payment'
              and (b.payment_deadline is null or b.payment_deadline > now())
            )
          )
      )
      or exists (
        select 1
        from public.property_availability_blocks blk
        where blk.property_id = p.id
          and blk.start_date < requested_check_out
          and blk.end_date > requested_check_in
      )
    );
$$;

grant execute on function public.get_unavailable_property_ids(date, date)
  to anon, authenticated, service_role;
