-- Exposes only a boolean availability check; booking rows remain protected by RLS.
-- Apply this migration before enabling booking requests in production.
create or replace function public.has_booking_overlap(
  target_property_id text,
  target_check_in date,
  target_check_out date
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.bookings b
    where b.property_id = target_property_id
      and b.status in ('requested', 'checking', 'awaiting_payment', 'confirmed', 'disputed')
      and b.check_in < target_check_out
      and b.check_out > target_check_in
  );
$$;

revoke all on function public.has_booking_overlap(text, date, date) from public;
grant execute on function public.has_booking_overlap(text, date, date) to authenticated;
