-- Keep public listing discovery on the allowlisted, guest-priced public_properties view.
-- Authenticated guests must not inherit the old PUBLIC policy on properties: it exposes
-- owner base rates, calendar contacts and reviewer notes for every approved listing.
-- Authorized partners/admins retain the existing assigned-property / admin RLS policies.

begin;

drop policy if exists "Anyone can read approved property listings" on public.properties;

-- The booking form submits through the authenticated bookings table, but checking listing
-- eligibility must use the same approved-only public boundary rather than reopening raw
-- properties to all guests.
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
