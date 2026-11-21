-- Commercial confidentiality: anonymous callers must not read or write public.properties directly.
-- RLS limits rows, not columns, and anon held SELECT on private columns (nightly_rate,
-- calendar_responsible_person, review_note, authorised_manager_id, property_introducer_id).
-- Public listing discovery uses public.public_properties (previous migration). Authenticated
-- partner/admin access stays governed by the existing property RLS policies; server-role reads
-- are preserved. Security-definer RPCs (calendar, availability, enquiry) are unaffected.
revoke all on public.properties from public, anon;
grant select on public.properties to service_role;
