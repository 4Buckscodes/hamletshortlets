-- HAMLET property SEO slugs
-- Additive migration: creates stable, unique public slugs for property detail pages.
-- Do not apply to production until the database backup and staging checks in
-- docs/DATABASE_RELEASE_CHECKLIST.md have been completed and approved.

create or replace function public.hamlet_property_slug_base(property_title text, property_area text)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    nullif(
      trim(both '-' from regexp_replace(
        lower(
          coalesce(property_title, '') || '-' || coalesce(property_area, '')
        ),
        '[^a-z0-9]+',
        '-',
        'g'
      )),
      ''
    ),
    'shortlet-property'
  );
$$;

alter table public.properties
  add column if not exists slug text;

-- Backfill readable slugs. Duplicate bases receive a stable property-ID suffix.
with candidates as (
  select
    id,
    public.hamlet_property_slug_base(title, area) as base_slug,
    count(*) over (
      partition by public.hamlet_property_slug_base(title, area)
    ) as duplicate_count
  from public.properties
),
backfilled as (
  select
    id,
    case
      when duplicate_count > 1
        then base_slug || '-' || left(regexp_replace(id, '[^a-zA-Z0-9]', '', 'g'), 8)
      else base_slug
    end as next_slug
  from candidates
)
update public.properties p
set slug = b.next_slug
from backfilled b
where p.id = b.id
  and (p.slug is null or btrim(p.slug) = '');

-- A final collision guard for unusual IDs or previously assigned values.
with ranked as (
  select
    id,
    slug,
    row_number() over (partition by slug order by id) as duplicate_number
  from public.properties
)
update public.properties p
set slug = r.slug || '-' || left(regexp_replace(p.id, '[^a-zA-Z0-9]', '', 'g'), 12)
from ranked r
where r.id = p.id
  and r.duplicate_number > 1;

alter table public.properties
  alter column slug set not null;

create unique index if not exists properties_slug_unique_idx
  on public.properties (slug);

create index if not exists properties_public_slug_status_idx
  on public.properties (status, slug);

create or replace function public.set_property_public_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  candidate text;
begin
  if new.slug is null or btrim(new.slug) = '' then
    candidate := public.hamlet_property_slug_base(new.title, new.area);

    if exists (
      select 1
      from public.properties p
      where p.slug = candidate
        and p.id <> coalesce(new.id, '')
    ) then
      candidate := candidate || '-' ||
        left(regexp_replace(coalesce(new.id, gen_random_uuid()::text), '[^a-zA-Z0-9]', '', 'g'), 12);
    end if;

    new.slug := candidate;
  end if;

  return new;
end;
$$;

drop trigger if exists properties_set_public_slug on public.properties;
create trigger properties_set_public_slug
before insert or update of title, area, slug
on public.properties
for each row
execute function public.set_property_public_slug();

comment on column public.properties.slug is
  'Stable public SEO slug. Generated on insert and preserved when title or area changes.';
