-- Slugs are cut at a whole word, not mid-word ("...victoria-i" becomes "...victoria").
-- Run once, before any slug address is published: it also regenerates the slugs of existing
-- listings with the new rule. Do not re-run it after slug addresses are public.
create or replace function public.hamlet_property_slug_base(input_title text, input_area text)
returns text
language sql
immutable
set search_path = public
as $$
  select trim(both '-' from case
    when length(q.full_base) <= 60 then q.full_base
    when substr(q.full_base, 61, 1) = '-' then left(q.full_base, 60)
    else regexp_replace(left(q.full_base, 60), '-[^-]*$', '')
  end)
  from (
    select trim(both '-' from regexp_replace(
      regexp_replace(
        lower(coalesce(input_title, '') || ' ' || coalesce(input_area, '')),
        '[^a-z0-9]+', '-', 'g'
      ),
      '-{2,}', '-', 'g'
    )) as full_base
  ) q;
$$;

update public.properties p
set slug = coalesce(
  nullif(public.hamlet_property_slug_base(p.title, p.area), ''),
  'stay'
) || '-' || left(replace(p.id::text, '-', ''), 8)
where p.slug is distinct from (
  coalesce(nullif(public.hamlet_property_slug_base(p.title, p.area), ''), 'stay')
  || '-' || left(replace(p.id::text, '-', ''), 8)
);
