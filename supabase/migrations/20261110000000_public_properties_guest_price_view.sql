-- Commercial confidentiality boundary for unauthenticated property discovery.
-- Public listing discovery must never grant the anon PostgREST role direct access to
-- public.properties, because RLS protects rows but does not redact individual columns.
-- The security-barrier view below is the sole public listing surface and deliberately
-- exposes a guest-facing nightly price computed with the same integer basis-point rule as
-- src/lib/pricing.ts::guestFacingNightlyNgn; the private owner nightly_rate is never selected.

create or replace view public.public_properties
with (security_barrier = true)
as
select
  p.id,
  p.title,
  p.property_type,
  p.area,
  p.public_address,
  (
    p.nightly_rate::bigint
    + floor((p.nightly_rate::bigint * 2000 + 5000)::numeric / 10000)::bigint
  )::integer as guest_nightly_ngn,
  p.cleaning_fee,
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'label', coalesce(nullif(btrim(charge.value ->> 'label'), ''), 'Mandatory charge'),
          'amount', greatest(0, coalesce(nullif(charge.value ->> 'amount', '')::integer, 0))
        )
        order by charge.ordinality
      )
      from jsonb_array_elements(
        case
          when jsonb_typeof(p.mandatory_charges) = 'array' then p.mandatory_charges
          else '[]'::jsonb
        end
      ) with ordinality as charge(value, ordinality)
      where jsonb_typeof(charge.value) = 'object'
    ),
    '[]'::jsonb
  ) as mandatory_charges,
  p.refundable_deposit,
  p.bedrooms,
  p.bathrooms,
  p.capacity,
  p.bed_setup,
  p.amenities,
  p.image_urls,
  p.house_rules,
  p.status,
  jsonb_build_object(
    'ownership', p.verification ->> 'ownership',
    'identity', p.verification ->> 'identity',
    'authority', p.verification ->> 'authority',
    'inspection', p.verification ->> 'inspection'
  ) as verification,
  p.trust_label,
  p.first_available_date,
  p.availability_confirmation_status,
  nullif(to_jsonb(p) ->> 'city', '') as city,
  nullif(to_jsonb(p) ->> 'public_location_summary', '') as public_location_summary,
  case
    when jsonb_typeof(to_jsonb(p) -> 'public_landmarks') = 'array'
      then array(select jsonb_array_elements_text(to_jsonb(p) -> 'public_landmarks'))
    else null::text[]
  end as public_landmarks,
  nullif(to_jsonb(p) ->> 'location_accuracy', '') as location_accuracy,
  nullif(to_jsonb(p) ->> 'wayfinder_status', '') as wayfinder_status,
  p.created_at,
  p.updated_at
from public.properties as p
where p.status = 'approved';

comment on view public.public_properties is
  'Commercial-redacted approved inventory for unauthenticated marketplace discovery. Excludes owner base rates, partner/owner identifiers and contacts, calendar-responsible contact details, admin review notes, and internal commercial allocations.';

-- RLS is row-level only; remove direct anon SELECT so the PostgREST table endpoint cannot
-- expose private columns such as nightly_rate or calendar_responsible_person. Authenticated
-- owner/manager/admin access remains governed by existing property RLS policies; anon users
-- receive only the allowlisted public_properties view above.
revoke select on public.properties from public, anon;
revoke all on public.public_properties from public, anon, authenticated;
grant select on public.public_properties to anon, authenticated;
-- Preserve trusted server-side reads (service-role JWT remains server-only).
grant select on public.properties to service_role;
