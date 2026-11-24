-- Optional tour video per property: YouTube, Vimeo or Instagram (post / reel).
-- Only a validated provider + id is stored, never a URL, so the public site can only ever embed
-- or link to a real video on an allowlisted site. Formats are enforced here as well as in
-- src/lib/tourVideo.ts. Written through a narrow RPC rather than by widening the property
-- submission functions, and exposed to guests through the existing security-barrier view.

alter table public.properties
  add column if not exists tour_video_provider text,
  add column if not exists tour_video_id text;

alter table public.properties
  drop constraint if exists properties_tour_video_format;
alter table public.properties
  add constraint properties_tour_video_format
  check (
    (tour_video_provider is null and tour_video_id is null)
    or (
      tour_video_provider = 'youtube'
      and tour_video_id ~ '^[A-Za-z0-9_-]{11}$'
    )
    or (
      tour_video_provider = 'vimeo'
      and tour_video_id ~ '^[0-9]{5,12}(:[a-f0-9]{6,16})?$'
    )
    or (
      tour_video_provider = 'instagram'
      and tour_video_id ~ '^(p|reel|tv):[A-Za-z0-9_-]{6,30}$'
    )
  );

create or replace function public.set_partner_property_video(
  target_property_id text,
  video_provider text,
  video_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  clean_provider text := nullif(btrim(coalesce(video_provider, '')), '');
  clean_id text := nullif(btrim(coalesce(video_id, '')), '');
begin
  if actor_id is null or not (public.has_role('partner') or public.has_role('admin')) then
    raise exception 'Only partners can attach a video to a property.';
  end if;

  if not public.is_account_active() then
    raise exception 'Your partner account is currently suspended. Contact HAMLET operations.';
  end if;

  -- Blank provider and id together clears the video; anything else must satisfy the table check.
  if (clean_provider is null) <> (clean_id is null) then
    raise exception 'That does not look like a valid video link.';
  end if;

  -- Approved listings are live: changing their media goes through admin review, not this RPC.
  begin
    update public.properties
       set tour_video_provider = clean_provider,
           tour_video_id = clean_id,
           updated_at = now()
     where id = target_property_id
       and status in ('draft', 'submitted', 'needs_correction')
       and public.can_manage_property(id);
  exception when check_violation then
    raise exception 'That does not look like a valid YouTube, Vimeo or Instagram video link.';
  end;

  if not found then
    raise exception 'Property not found, not editable, or you cannot manage it.';
  end if;
end;
$$;

revoke all on function public.set_partner_property_video(text, text, text) from public, anon;
grant execute on function public.set_partner_property_video(text, text, text) to authenticated, service_role;

-- Expose the video on the public view. CREATE OR REPLACE VIEW only allows new columns at the end,
-- so the column list below is the existing view with the two video columns appended.
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
  p.updated_at,
  p.tour_video_provider,
  p.tour_video_id
from public.properties as p
where p.status = 'approved';

revoke all on public.public_properties from public, anon, authenticated;
grant select on public.public_properties to anon, authenticated;
grant select on public.public_properties to service_role;
