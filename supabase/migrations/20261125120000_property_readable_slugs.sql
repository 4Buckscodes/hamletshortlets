-- Stable, readable property URLs. The database is authoritative: every listing,
-- including imports/admin-created records that bypass Horatio, receives a unique slug.
begin;

create or replace function public.hamlet_property_slug_base(input_title text, input_area text)
returns text
language sql
immutable
set search_path = public
as $$
  -- Readable part only: at most 60 characters, so a long title cannot make a long address.
  -- The 8-character id suffix added by the callers keeps every slug unique.
  select trim(both '-' from left(trim(both '-' from regexp_replace(
    regexp_replace(
      lower(coalesce(input_title, '') || ' ' || coalesce(input_area, '')),
      '[^a-z0-9]+', '-', 'g'
    ),
    '-{2,}', '-', 'g'
  )), 60));
$$;

alter table public.properties add column if not exists slug text;

-- Backfill deterministically. UUID suffix guarantees uniqueness without title-based races.
update public.properties p
set slug = coalesce(
  nullif(public.hamlet_property_slug_base(p.title, p.area), ''),
  'stay'
) || '-' || left(replace(p.id::text, '-', ''), 8)
where p.slug is null or btrim(p.slug) = '';

create unique index if not exists properties_slug_unique_idx
  on public.properties (slug);

create or replace function public.set_property_slug()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.slug is null or btrim(new.slug) = '' then
    new.slug := coalesce(
      nullif(public.hamlet_property_slug_base(new.title, new.area), ''),
      'stay'
    ) || '-' || left(replace(new.id::text, '-', ''), 8);
  end if;
  return new;
end;
$$;

drop trigger if exists properties_set_slug on public.properties;
create trigger properties_set_slug
before insert or update of title, area, slug
on public.properties
for each row execute function public.set_property_slug();

alter table public.properties alter column slug set not null;

-- Append slug at the end to preserve the existing public view's column order.
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
  p.tour_video_id,
  p.slug
from public.properties as p
where p.status = 'approved';

comment on view public.public_properties is
  'Commercial-redacted approved inventory for public discovery. Excludes private owner rates, identifiers, contacts, calendar-responsible contact details and internal review notes; includes stable public property slug.';

revoke all on public.public_properties from public, anon, authenticated;
grant select on public.public_properties to anon, authenticated;
grant select on public.public_properties to service_role;

commit;
