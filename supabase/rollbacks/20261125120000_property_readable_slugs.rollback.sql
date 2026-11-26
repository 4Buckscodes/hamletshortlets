-- Undo for 20261125120000_property_readable_slugs.sql. Not a migration: run it by hand only if
-- the slug migration has to be reversed, and redeploy the previous app version first
-- (the new app selects the slug column and the public view would fail without it).
-- Restores public.public_properties exactly as it was before the slug migration
-- (captured from production on 2026-11-26) and removes the slug column, trigger and functions.
begin;

drop trigger if exists properties_set_slug on public.properties;

drop view if exists public.public_properties;
create view public.public_properties
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
        case when jsonb_typeof(p.mandatory_charges) = 'array'
          then p.mandatory_charges else '[]'::jsonb end
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
  p.updated_at,
  p.tour_video_provider,
  p.tour_video_id
from public.properties as p
where p.status = 'approved';

comment on view public.public_properties is
  'Commercial-redacted approved inventory for unauthenticated marketplace discovery. Excludes owner base rates, partner/owner identifiers and contacts, calendar-responsible contact details, admin review notes, and internal commercial allocations.';
revoke all on public.public_properties from public, anon, authenticated;
grant select on public.public_properties to anon, authenticated;
grant select on public.public_properties to service_role;

-- Dropping the column also drops properties_slug_unique_idx.
alter table public.properties drop column if exists slug;
drop function if exists public.set_property_slug();
drop function if exists public.hamlet_property_slug_base(text, text);

commit;
