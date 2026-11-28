-- Guests no longer read raw property rows (see 20261126100000), but their booking pages still need
-- the name, area and photos of the stays they booked, including stays that were later paused.
-- This function returns only those three public fields, only for the caller's own bookings.
-- Additive: apply before the app change and before 20261126100000.
create or replace function public.get_my_booking_property_summaries()
returns table (property_id text, title text, area text, image_urls text[])
language sql
stable
security definer
set search_path = ''
as $$
  select distinct on (p.id) p.id, p.title, p.area, p.image_urls
  from public.bookings b
  join public.properties p on p.id = b.property_id
  where b.guest_id = (select auth.uid())
  order by p.id
$$;

revoke all on function public.get_my_booking_property_summaries() from public, anon;
grant execute on function public.get_my_booking_property_summaries() to authenticated;
