-- Restrict guest reads of the raw properties table.
-- Public discovery remains available through public.public_properties, which exposes
-- the approved guest-facing projection and guest price.
--
-- This migration was applied to the HAMLET production database as version
-- 20261126172222. Keep this file in source control so fresh environments and
-- future migration audits reproduce the same database state.

begin;

drop policy if exists "Anyone can read approved property listings" on public.properties;

drop policy if exists "Guests can request approved properties" on public.bookings;
create policy "Guests can request approved properties"
  on public.bookings for insert to authenticated
  with check (
    guest_id = (select auth.uid())
    and status = 'requested'
    and exists (
      select 1
      from public.public_properties as listing
      where listing.id = bookings.property_id
        and listing.status = 'approved'
    )
  );

comment on policy "Guests can request approved properties" on public.bookings is
  'Guests may request only approved properties exposed through the redacted public_properties view; pricing and availability are revalidated by the database trigger.';

notify pgrst, 'reload schema';

commit;
