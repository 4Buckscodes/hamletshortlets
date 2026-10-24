-- ═════════════════════════════════════════════════════════════════════════════
-- HAMLET WAYFINDER: Verified Property Navigation & Door-to-Door Arrival Guidance
-- Migration: 20261024180000_hamlet_wayfinder_arrival_guidance.sql
--
-- Design & Safety Guarantees:
--   1. Non-destructive, backward-compatible extension of public.properties,
--      public.bookings, and public.booking_issues (all legacy listings continue
--      to load without requiring coordinates).
--   2. Strict separation between:
--        - Public property location metadata (city, public_landmarks,
--          public_location_summary, location_accuracy, wayfinder_status)
--        - Protected confirmed-guest arrival guides, waypoints, and door steps
--          (property_wayfinder_guides, property_wayfinder_waypoints,
--          property_wayfinder_steps)
--        - Time-bounded sensitive check-in codes (property_wayfinder_secrets —
--          never readable via direct guest SELECT; released exclusively via
--          server-enforced check-in window RPC get_guest_booking_wayfinder)
--   3. Post-approval partner edits queue into pending_submission JSONB so
--      unreviewed edits never overwrite approved live directions for travelling
--      guests. Confirmed bookings snapshot their guide revision on access.
--   4. Private storage bucket `arrival-guide-media` (public = false) protected
--      by RLS for corridor, building-identifier, and door photographs.
--
-- Rollback / Recovery Guidance:
--   To disable Wayfinder without data loss, set properties.wayfinder_status = 'disabled'
--   and property_wayfinder_guides.publication_status = 'disabled'.
--   Full schema rollback (staging/dev only):
--     drop function if exists public.record_wayfinder_event(text, text, jsonb);
--     drop function if exists public.flag_wayfinder_for_correction(text, text);
--     drop function if exists public.report_arrival_issue(text, text, text, text, text, jsonb);
--     drop function if exists public.get_guest_booking_wayfinder(text);
--     drop function if exists public.review_property_wayfinder(text, text, jsonb);
--     drop function if exists public.submit_property_wayfinder(text, jsonb, boolean);
--     drop function if exists public.can_guest_access_booking_wayfinder(text);
--     drop table if exists public.wayfinder_events;
--     drop table if exists public.property_wayfinder_verifications;
--     drop table if exists public.property_wayfinder_secrets;
--     drop table if exists public.property_wayfinder_steps;
--     drop table if exists public.property_wayfinder_waypoints;
--     drop table if exists public.property_wayfinder_guides;
-- ═════════════════════════════════════════════════════════════════════════════

-- ─── 1. Extend existing tables non-destructively ──────────────────────────────

alter table public.properties
  add column if not exists city text not null default 'Lagos',
  add column if not exists public_landmarks text[] not null default '{}',
  add column if not exists public_location_summary text not null default '',
  add column if not exists location_accuracy text not null default 'missing'
    check (location_accuracy in ('missing', 'approximate_area', 'street_level', 'verified_entrance')),
  add column if not exists wayfinder_status text not null default 'location_missing'
    check (wayfinder_status in (
      'location_missing',
      'location_submitted',
      'awaiting_verification',
      'location_verified',
      'guide_incomplete',
      'guide_ready',
      'needs_correction',
      'disabled'
    ));

create index if not exists properties_wayfinder_status_idx
  on public.properties (status, wayfinder_status);

alter table public.bookings
  add column if not exists wayfinder_snapshot jsonb,
  add column if not exists wayfinder_snapshot_revision integer;

alter table public.booking_issues
  add column if not exists arrival_issue_type text
    check (
      arrival_issue_type is null
      or arrival_issue_type in (
        'incorrect_map_pin',
        'cannot_find_entrance',
        'cannot_find_building',
        'cannot_find_apartment',
        'checkin_instructions_unclear',
        'access_method_not_working',
        'other_arrival_problem'
      )
    ),
  add column if not exists wayfinder_step_key text;

create index if not exists booking_issues_arrival_type_idx
  on public.booking_issues (arrival_issue_type, created_at desc)
  where arrival_issue_type is not null;

-- ─── 2. Protected Wayfinder Tables ────────────────────────────────────────────

create table if not exists public.property_wayfinder_guides (
  id uuid primary key default gen_random_uuid(),
  property_id text not null unique references public.properties (id) on delete cascade,
  published_revision integer not null default 0 check (published_revision >= 0),
  publication_status text not null default 'draft'
    check (publication_status in ('draft', 'submitted', 'needs_correction', 'approved', 'disabled')),

  -- Destination coordinate metadata (verified entrance / gate / building pin)
  destination_latitude numeric(9, 6)
    check (
      destination_latitude is null
      or (destination_latitude >= -90 and destination_latitude <= 90)
    ),
  destination_longitude numeric(9, 6)
    check (
      destination_longitude is null
      or (destination_longitude >= -180 and destination_longitude <= 180)
    ),
  coordinate_point_type text not null default 'estate_gate'
    check (coordinate_point_type in (
      'property_entrance',
      'road_access',
      'estate_gate',
      'preferred_guest_entrance',
      'building_entrance',
      'dropoff_parking'
    )),
  coordinate_source text not null default 'manual_entry'
    check (coordinate_source in (
      'manual_entry',
      'gps_on_site',
      'google_maps_pin',
      'staff_verified_survey'
    )),
  ambiguity_notes text not null default '',

  -- Structured last-100-metres journey: Entrance -> Building -> Floor -> Door -> Check-in
  guest_introduction text not null default '',
  estate_or_building_name text not null default '',
  preferred_entrance_label text not null default '',
  entrance_instructions text not null default '',
  entrance_photo_url text not null default '',
  security_desk_instructions text not null default '',
  building_or_block text not null default '',
  building_instructions text not null default '',
  building_photo_url text not null default '',
  floor_label text not null default '',
  apartment_identifier text not null default '',
  lift_or_stairs_instructions text not null default '',
  route_to_door text not null default '',
  door_landmark_photo_url text not null default '',
  parking_or_dropoff_instructions text not null default '',
  arrival_restrictions text not null default '',
  checkin_method text not null default 'host_meet'
    check (checkin_method in ('host_meet', 'security_desk', 'smart_lock', 'lockbox', 'concierge')),
  checkin_window_label text not null default 'From 2:00 PM',
  checkin_instructions text not null default '',
  arrival_contact_name text not null default '',
  arrival_contact_role text not null default '',
  arrival_contact_phone text not null default '',

  -- Granular verification state (never conflated with general property doc approval)
  coordinates_checked boolean not null default false,
  written_directions_checked boolean not null default false,
  photos_checked boolean not null default false,
  physically_visited boolean not null default false,
  guest_arrival_tested boolean not null default false,
  needs_reverification boolean not null default false,
  verification_method text
    check (
      verification_method is null
      or verification_method in (
        'staff_desk_review',
        'map_imagery_crosscheck',
        'partner_rep_confirmation',
        'physical_onsite_check',
        'documented_arrival_test'
      )
    ),
  verified_by uuid references public.profiles (id),
  verified_at timestamptz,
  reviewer_note text not null default '',

  -- Staged partner proposal when an approved guide already exists
  pending_status text
    check (pending_status is null or pending_status in ('draft', 'submitted', 'needs_correction')),
  pending_submission jsonb,
  pending_submitted_by uuid references public.profiles (id),
  pending_submitted_at timestamptz,

  submitted_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (destination_latitude is null and destination_longitude is null)
    or (
      destination_latitude is not null
      and destination_longitude is not null
      and not (destination_latitude = 0 and destination_longitude = 0)
    )
  )
);

create index if not exists wayfinder_guides_pub_status_idx
  on public.property_wayfinder_guides (publication_status, pending_status);

create table if not exists public.property_wayfinder_waypoints (
  id uuid primary key default gen_random_uuid(),
  property_id text not null references public.properties (id) on delete cascade,
  point_type text not null
    check (point_type in (
      'main_road_access',
      'estate_entrance',
      'preferred_guest_entrance',
      'building_entrance',
      'parking_dropoff',
      'other_waypoint'
    )),
  label text not null,
  latitude numeric(9, 6) not null check (latitude >= -90 and latitude <= 90),
  longitude numeric(9, 6) not null check (longitude >= -180 and longitude <= 180),
  instructions text not null default '',
  photo_url text not null default '',
  sort_order integer not null default 1 check (sort_order >= 1 and sort_order <= 30),
  verification_status text not null default 'submitted'
    check (verification_status in ('submitted', 'verified', 'needs_correction')),
  created_at timestamptz not null default now(),
  check (not (latitude = 0 and longitude = 0))
);

create index if not exists wayfinder_waypoints_property_sort_idx
  on public.property_wayfinder_waypoints (property_id, sort_order);

create table if not exists public.property_wayfinder_steps (
  id uuid primary key default gen_random_uuid(),
  property_id text not null references public.properties (id) on delete cascade,
  step_order integer not null check (step_order >= 1 and step_order <= 40),
  step_type text not null
    check (step_type in (
      'navigate',
      'entrance',
      'security',
      'building',
      'floor_corridor',
      'apartment_door',
      'checkin'
    )),
  heading text not null,
  instruction text not null,
  landmark text not null default '',
  access_requirement text not null default '',
  photo_url text not null default '',
  latitude numeric(9, 6) check (latitude is null or (latitude >= -90 and latitude <= 90)),
  longitude numeric(9, 6) check (longitude is null or (longitude >= -180 and longitude <= 180)),
  verification_status text not null default 'submitted'
    check (verification_status in ('submitted', 'verified', 'needs_correction')),
  created_at timestamptz not null default now(),
  unique (property_id, step_order)
);

create index if not exists wayfinder_steps_property_order_idx
  on public.property_wayfinder_steps (property_id, step_order);

-- Strictly separated sensitive access secrets (zero direct guest table SELECT)
create table if not exists public.property_wayfinder_secrets (
  property_id text primary key references public.properties (id) on delete cascade,
  gate_access_code text not null default '',
  building_access_code text not null default '',
  lockbox_or_smartlock_code text not null default '',
  wifi_network_name text not null default '',
  wifi_password text not null default '',
  release_hours_before_checkin integer not null default 24
    check (release_hours_before_checkin between 1 and 168),
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

create table if not exists public.property_wayfinder_verifications (
  id uuid primary key default gen_random_uuid(),
  property_id text not null references public.properties (id) on delete cascade,
  guide_revision integer not null default 0,
  decision text not null
    check (decision in ('approve_guide', 'approve_pin_only', 'needs_correction', 'disable', 'flag_correction')),
  verification_method text
    check (
      verification_method is null
      or verification_method in (
        'staff_desk_review',
        'map_imagery_crosscheck',
        'partner_rep_confirmation',
        'physical_onsite_check',
        'documented_arrival_test'
      )
    ),
  coordinates_checked boolean not null default false,
  written_directions_checked boolean not null default false,
  photos_checked boolean not null default false,
  physically_visited boolean not null default false,
  guest_arrival_tested boolean not null default false,
  reviewer_id uuid not null references public.profiles (id),
  reviewer_note text not null,
  created_at timestamptz not null default now()
);

create index if not exists wayfinder_verifications_property_idx
  on public.property_wayfinder_verifications (property_id, created_at desc);

create table if not exists public.wayfinder_events (
  id uuid primary key default gen_random_uuid(),
  booking_id text references public.bookings (id) on delete cascade,
  property_id text not null references public.properties (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  event_type text not null
    check (event_type in (
      'wayfinder_opened',
      'directions_clicked',
      'arrival_guide_viewed',
      'help_action_selected',
      'arrival_issue_reported',
      'guide_flagged_incomplete',
      'ease_of_arrival_feedback'
    )),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists wayfinder_events_property_type_idx
  on public.wayfinder_events (property_id, event_type, created_at desc);

-- ─── 3. Helper Function & Row Level Security Policies ─────────────────────────

create or replace function public.has_confirmed_booking_for_property(target_property_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.bookings b
    where b.property_id = target_property_id
      and b.guest_id = (select auth.uid())
      and b.status = 'confirmed'
      and public.is_account_active()
  );
$$;

revoke all on function public.has_confirmed_booking_for_property(text) from public;
grant execute on function public.has_confirmed_booking_for_property(text) to authenticated;

alter table public.property_wayfinder_guides enable row level security;
alter table public.property_wayfinder_waypoints enable row level security;
alter table public.property_wayfinder_steps enable row level security;
alter table public.property_wayfinder_secrets enable row level security;
alter table public.property_wayfinder_verifications enable row level security;
alter table public.wayfinder_events enable row level security;

drop policy if exists "Authorized partners, admins, and confirmed guests can read approved wayfinder guides"
  on public.property_wayfinder_guides;
create policy "Authorized partners, admins, and confirmed guests can read approved wayfinder guides"
  on public.property_wayfinder_guides for select to authenticated
  using (
    public.can_manage_property(property_id)
    or (
      publication_status = 'approved'
      and public.has_confirmed_booking_for_property(property_id)
    )
  );

drop policy if exists "Admins can manage wayfinder guides directly"
  on public.property_wayfinder_guides;
create policy "Admins can manage wayfinder guides directly"
  on public.property_wayfinder_guides for all to authenticated
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

drop policy if exists "Authorized partners, admins, and confirmed guests can read wayfinder waypoints"
  on public.property_wayfinder_waypoints;
create policy "Authorized partners, admins, and confirmed guests can read wayfinder waypoints"
  on public.property_wayfinder_waypoints for select to authenticated
  using (
    public.can_manage_property(property_id)
    or (
      verification_status = 'verified'
      and public.has_confirmed_booking_for_property(property_id)
      and exists (
        select 1 from public.property_wayfinder_guides g
        where g.property_id = property_wayfinder_waypoints.property_id
          and g.publication_status = 'approved'
      )
    )
  );

drop policy if exists "Admins can manage wayfinder waypoints directly"
  on public.property_wayfinder_waypoints;
create policy "Admins can manage wayfinder waypoints directly"
  on public.property_wayfinder_waypoints for all to authenticated
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

drop policy if exists "Authorized partners, admins, and confirmed guests can read wayfinder steps"
  on public.property_wayfinder_steps;
create policy "Authorized partners, admins, and confirmed guests can read wayfinder steps"
  on public.property_wayfinder_steps for select to authenticated
  using (
    public.can_manage_property(property_id)
    or (
      verification_status = 'verified'
      and public.has_confirmed_booking_for_property(property_id)
      and exists (
        select 1 from public.property_wayfinder_guides g
        where g.property_id = property_wayfinder_steps.property_id
          and g.publication_status = 'approved'
      )
    )
  );

drop policy if exists "Admins can manage wayfinder steps directly"
  on public.property_wayfinder_steps;
create policy "Admins can manage wayfinder steps directly"
  on public.property_wayfinder_steps for all to authenticated
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

-- Secrets: strictly NO guest table-level SELECT. Guests only receive unlocked
-- codes through server-enforced check-in window logic in get_guest_booking_wayfinder.
drop policy if exists "Only managing partners and admins can read wayfinder secrets"
  on public.property_wayfinder_secrets;
create policy "Only managing partners and admins can read wayfinder secrets"
  on public.property_wayfinder_secrets for select to authenticated
  using (public.can_manage_property(property_id));

drop policy if exists "Admins can manage wayfinder secrets directly"
  on public.property_wayfinder_secrets;
create policy "Admins can manage wayfinder secrets directly"
  on public.property_wayfinder_secrets for all to authenticated
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

drop policy if exists "Managing partners and admins can read wayfinder verification history"
  on public.property_wayfinder_verifications;
create policy "Managing partners and admins can read wayfinder verification history"
  on public.property_wayfinder_verifications for select to authenticated
  using (public.can_manage_property(property_id));

drop policy if exists "Authorized users can read relevant wayfinder events"
  on public.wayfinder_events;
create policy "Authorized users can read relevant wayfinder events"
  on public.wayfinder_events for select to authenticated
  using (
    actor_id = (select auth.uid())
    or public.can_manage_property(property_id)
  );

-- ─── 4. Private Storage Bucket for Arrival Guide Photographs ──────────────────

do $$
begin
  if to_regclass('storage.buckets') is not null and to_regclass('storage.objects') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'arrival-guide-media',
      'arrival-guide-media',
      false,
      5242880,
      array['image/jpeg', 'image/png', 'image/webp']
    )
    on conflict (id) do update
      set public = false,
          file_size_limit = excluded.file_size_limit,
          allowed_mime_types = excluded.allowed_mime_types;

    execute 'drop policy if exists "Authorized users can view private arrival guide media" on storage.objects';
    execute $pol$
      create policy "Authorized users can view private arrival guide media"
        on storage.objects for select to authenticated
        using (
          bucket_id = 'arrival-guide-media'
          and (
            public.can_manage_property((storage.foldername(name))[1])
            or public.has_confirmed_booking_for_property((storage.foldername(name))[1])
          )
        )
    $pol$;

    execute 'drop policy if exists "Managing partners and admins can upload private arrival guide media" on storage.objects';
    execute $pol$
      create policy "Managing partners and admins can upload private arrival guide media"
        on storage.objects for insert to authenticated
        with check (
          bucket_id = 'arrival-guide-media'
          and public.is_account_active()
          and public.can_manage_property((storage.foldername(name))[1])
        )
    $pol$;

    execute 'drop policy if exists "Managing partners and admins can delete private arrival guide media" on storage.objects';
    execute $pol$
      create policy "Managing partners and admins can delete private arrival guide media"
        on storage.objects for delete to authenticated
        using (
          bucket_id = 'arrival-guide-media'
          and public.can_manage_property((storage.foldername(name))[1])
        )
    $pol$;
  end if;
end
$$;

-- ─── 5. Partner / Manager Submission RPC (Staged Safe Updates) ────────────────

create or replace function public.submit_property_wayfinder(
  target_property_id text,
  payload jsonb,
  save_as_draft boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_profile public.profiles%rowtype;
  prop_row public.properties%rowtype;
  existing_guide public.property_wayfinder_guides%rowtype;
  has_existing_guide boolean := false;
  dest_lat numeric(9, 6);
  dest_lng numeric(9, 6);
  coord_type text;
  coord_source text;
  checkin_method_val text;
  release_hours integer;
  clean_landmarks text[] := '{}';
  clean_summary text;
  clean_city text;
  target_pub_status text;
  computed_wayfinder_status text;
  wp_item jsonb;
  step_item jsonb;
  idx integer;
begin
  if actor_id is null then
    raise exception 'Sign in before updating property location or arrival guidance.';
  end if;

  if not public.is_account_active() then
    raise exception 'Your account is currently suspended. Contact HAMLET operations.';
  end if;

  if not public.can_manage_property(target_property_id) then
    raise exception 'You do not have permission to manage Wayfinder details for this property.';
  end if;

  select * into actor_profile from public.profiles where id = actor_id;
  select * into prop_row from public.properties where id = target_property_id for update;
  if not found then
    raise exception 'Property not found.';
  end if;

  if jsonb_typeof(payload) is distinct from 'object' then
    raise exception 'Wayfinder payload must be a JSON object.';
  end if;

  -- Validate optional coordinates
  if nullif(btrim(coalesce(payload ->> 'destination_latitude', '')), '') is not null
     or nullif(btrim(coalesce(payload ->> 'destination_longitude', '')), '') is not null then
    if nullif(btrim(coalesce(payload ->> 'destination_latitude', '')), '') is null
       or nullif(btrim(coalesce(payload ->> 'destination_longitude', '')), '') is null then
      raise exception 'Provide both latitude and longitude, or leave both blank.';
    end if;
    dest_lat := round((payload ->> 'destination_latitude')::numeric, 6);
    dest_lng := round((payload ->> 'destination_longitude')::numeric, 6);
    if dest_lat < -90 or dest_lat > 90 or dest_lng < -180 or dest_lng > 180 then
      raise exception 'Coordinates are outside valid geographic bounds.';
    end if;
    if dest_lat = 0 and dest_lng = 0 then
      raise exception 'Invalid placeholder coordinates (0, 0). Select the real entrance location.';
    end if;
  end if;

  coord_type := coalesce(nullif(btrim(payload ->> 'coordinate_point_type'), ''), 'estate_gate');
  if coord_type not in (
    'property_entrance', 'road_access', 'estate_gate',
    'preferred_guest_entrance', 'building_entrance', 'dropoff_parking'
  ) then
    raise exception 'Unsupported coordinate point type.';
  end if;

  coord_source := coalesce(nullif(btrim(payload ->> 'coordinate_source'), ''), 'manual_entry');
  if coord_source not in ('manual_entry', 'gps_on_site', 'google_maps_pin', 'staff_verified_survey') then
    raise exception 'Unsupported coordinate source.';
  end if;

  checkin_method_val := coalesce(nullif(btrim(payload ->> 'checkin_method'), ''), 'host_meet');
  if checkin_method_val not in ('host_meet', 'security_desk', 'smart_lock', 'lockbox', 'concierge') then
    raise exception 'Unsupported check-in method.';
  end if;

  release_hours := coalesce((payload -> 'secrets' ->> 'release_hours_before_checkin')::integer, 24);
  if release_hours < 1 or release_hours > 168 then
    raise exception 'Check-in code release window must be between 1 and 168 hours.';
  end if;

  if jsonb_typeof(coalesce(payload -> 'public_landmarks', '[]'::jsonb)) = 'array' then
    select coalesce(array_agg(btrim(val)) filter (where length(btrim(val)) > 0), '{}')
      into clean_landmarks
      from jsonb_array_elements_text(coalesce(payload -> 'public_landmarks', '[]'::jsonb)) as t(val);
    if coalesce(array_length(clean_landmarks, 1), 0) > 8 then
      raise exception 'Provide at most 8 public landmarks.';
    end if;
  end if;

  clean_summary := left(btrim(coalesce(payload ->> 'public_location_summary', '')), 600);
  clean_city := coalesce(nullif(btrim(coalesce(payload ->> 'city', '')), ''), prop_row.city, 'Lagos');

  select * into existing_guide
    from public.property_wayfinder_guides
    where property_id = target_property_id
    for update;
  has_existing_guide := found;

  -- Upsert separated sensitive secrets when provided
  if jsonb_typeof(payload -> 'secrets') = 'object' then
    insert into public.property_wayfinder_secrets (
      property_id,
      gate_access_code,
      building_access_code,
      lockbox_or_smartlock_code,
      wifi_network_name,
      wifi_password,
      release_hours_before_checkin,
      updated_by,
      updated_at
    )
    values (
      target_property_id,
      left(btrim(coalesce(payload -> 'secrets' ->> 'gate_access_code', '')), 120),
      left(btrim(coalesce(payload -> 'secrets' ->> 'building_access_code', '')), 120),
      left(btrim(coalesce(payload -> 'secrets' ->> 'lockbox_or_smartlock_code', '')), 120),
      left(btrim(coalesce(payload -> 'secrets' ->> 'wifi_network_name', '')), 120),
      left(btrim(coalesce(payload -> 'secrets' ->> 'wifi_password', '')), 120),
      release_hours,
      actor_id,
      now()
    )
    on conflict (property_id) do update
      set gate_access_code = excluded.gate_access_code,
          building_access_code = excluded.building_access_code,
          lockbox_or_smartlock_code = excluded.lockbox_or_smartlock_code,
          wifi_network_name = excluded.wifi_network_name,
          wifi_password = excluded.wifi_password,
          release_hours_before_checkin = excluded.release_hours_before_checkin,
          updated_by = actor_id,
          updated_at = now();
  end if;

  -- CRITICAL SAFETY RULE (§8 & §10.D):
  -- If an approved guide is already live, stage partner changes in pending_submission
  -- so unreviewed edits NEVER overwrite live verified instructions for confirmed guests.
  if has_existing_guide and existing_guide.publication_status = 'approved' then
    update public.property_wayfinder_guides
      set pending_status = case when save_as_draft then 'draft' else 'submitted' end,
          pending_submission = jsonb_strip_nulls(payload - 'secrets'),
          pending_submitted_by = actor_id,
          pending_submitted_at = now(),
          updated_at = now()
      where property_id = target_property_id;

    insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
      values (
        actor_id,
        actor_profile.role,
        case when save_as_draft then 'wayfinder_revision_draft_saved' else 'wayfinder_revision_submitted' end,
        target_property_id,
        'Staged Wayfinder update for ' || prop_row.title || ' without overwriting live revision #' || existing_guide.published_revision
      );

    return jsonb_build_object(
      'property_id', target_property_id,
      'staged_as_pending', true,
      'publication_status', existing_guide.publication_status,
      'pending_status', case when save_as_draft then 'draft' else 'submitted' end,
      'wayfinder_status', prop_row.wayfinder_status
    );
  end if;

  target_pub_status := case when save_as_draft then 'draft' else 'submitted' end;
  computed_wayfinder_status := case
    when save_as_draft then
      case when dest_lat is not null then 'location_submitted' else 'location_missing' end
    else 'awaiting_verification'
  end;

  insert into public.property_wayfinder_guides (
    property_id,
    publication_status,
    destination_latitude,
    destination_longitude,
    coordinate_point_type,
    coordinate_source,
    ambiguity_notes,
    guest_introduction,
    estate_or_building_name,
    preferred_entrance_label,
    entrance_instructions,
    entrance_photo_url,
    security_desk_instructions,
    building_or_block,
    building_instructions,
    building_photo_url,
    floor_label,
    apartment_identifier,
    lift_or_stairs_instructions,
    route_to_door,
    door_landmark_photo_url,
    parking_or_dropoff_instructions,
    arrival_restrictions,
    checkin_method,
    checkin_window_label,
    checkin_instructions,
    arrival_contact_name,
    arrival_contact_role,
    arrival_contact_phone,
    submitted_by,
    updated_at
  )
  values (
    target_property_id,
    target_pub_status,
    dest_lat,
    dest_lng,
    coord_type,
    coord_source,
    left(btrim(coalesce(payload ->> 'ambiguity_notes', '')), 1000),
    left(btrim(coalesce(payload ->> 'guest_introduction', '')), 600),
    left(btrim(coalesce(payload ->> 'estate_or_building_name', '')), 160),
    left(btrim(coalesce(payload ->> 'preferred_entrance_label', '')), 160),
    left(btrim(coalesce(payload ->> 'entrance_instructions', '')), 1500),
    left(btrim(coalesce(payload ->> 'entrance_photo_url', '')), 600),
    left(btrim(coalesce(payload ->> 'security_desk_instructions', '')), 1000),
    left(btrim(coalesce(payload ->> 'building_or_block', '')), 160),
    left(btrim(coalesce(payload ->> 'building_instructions', '')), 1500),
    left(btrim(coalesce(payload ->> 'building_photo_url', '')), 600),
    left(btrim(coalesce(payload ->> 'floor_label', '')), 80),
    left(btrim(coalesce(payload ->> 'apartment_identifier', '')), 120),
    left(btrim(coalesce(payload ->> 'lift_or_stairs_instructions', '')), 1000),
    left(btrim(coalesce(payload ->> 'route_to_door', '')), 2000),
    left(btrim(coalesce(payload ->> 'door_landmark_photo_url', '')), 600),
    left(btrim(coalesce(payload ->> 'parking_or_dropoff_instructions', '')), 1000),
    left(btrim(coalesce(payload ->> 'arrival_restrictions', '')), 1000),
    checkin_method_val,
    left(btrim(coalesce(nullif(payload ->> 'checkin_window_label', ''), 'From 2:00 PM')), 120),
    left(btrim(coalesce(payload ->> 'checkin_instructions', '')), 1500),
    left(btrim(coalesce(payload ->> 'arrival_contact_name', '')), 120),
    left(btrim(coalesce(payload ->> 'arrival_contact_role', '')), 120),
    left(btrim(coalesce(payload ->> 'arrival_contact_phone', '')), 60),
    actor_id,
    now()
  )
  on conflict (property_id) do update
    set publication_status = excluded.publication_status,
        destination_latitude = excluded.destination_latitude,
        destination_longitude = excluded.destination_longitude,
        coordinate_point_type = excluded.coordinate_point_type,
        coordinate_source = excluded.coordinate_source,
        ambiguity_notes = excluded.ambiguity_notes,
        guest_introduction = excluded.guest_introduction,
        estate_or_building_name = excluded.estate_or_building_name,
        preferred_entrance_label = excluded.preferred_entrance_label,
        entrance_instructions = excluded.entrance_instructions,
        entrance_photo_url = excluded.entrance_photo_url,
        security_desk_instructions = excluded.security_desk_instructions,
        building_or_block = excluded.building_or_block,
        building_instructions = excluded.building_instructions,
        building_photo_url = excluded.building_photo_url,
        floor_label = excluded.floor_label,
        apartment_identifier = excluded.apartment_identifier,
        lift_or_stairs_instructions = excluded.lift_or_stairs_instructions,
        route_to_door = excluded.route_to_door,
        door_landmark_photo_url = excluded.door_landmark_photo_url,
        parking_or_dropoff_instructions = excluded.parking_or_dropoff_instructions,
        arrival_restrictions = excluded.arrival_restrictions,
        checkin_method = excluded.checkin_method,
        checkin_window_label = excluded.checkin_window_label,
        checkin_instructions = excluded.checkin_instructions,
        arrival_contact_name = excluded.arrival_contact_name,
        arrival_contact_role = excluded.arrival_contact_role,
        arrival_contact_phone = excluded.arrival_contact_phone,
        pending_status = null,
        pending_submission = null,
        submitted_by = actor_id,
        updated_at = now();

  -- Replace optional waypoints when supplied
  if jsonb_typeof(payload -> 'waypoints') = 'array' then
    if jsonb_array_length(payload -> 'waypoints') > 12 then
      raise exception 'Maximum 12 optional waypoints per property.';
    end if;
    delete from public.property_wayfinder_waypoints where property_id = target_property_id;
    idx := 0;
    for wp_item in select * from jsonb_array_elements(payload -> 'waypoints')
    loop
      idx := idx + 1;
      insert into public.property_wayfinder_waypoints (
        property_id, point_type, label, latitude, longitude, instructions, photo_url, sort_order, verification_status
      )
      values (
        target_property_id,
        coalesce(nullif(btrim(wp_item ->> 'point_type'), ''), 'other_waypoint'),
        left(btrim(coalesce(wp_item ->> 'label', 'Waypoint ' || idx)), 120),
        round((wp_item ->> 'latitude')::numeric, 6),
        round((wp_item ->> 'longitude')::numeric, 6),
        left(btrim(coalesce(wp_item ->> 'instructions', '')), 600),
        left(btrim(coalesce(wp_item ->> 'photo_url', '')), 600),
        idx,
        'submitted'
      );
    end loop;
  end if;

  -- Replace ordered steps when supplied
  if jsonb_typeof(payload -> 'steps') = 'array' then
    if jsonb_array_length(payload -> 'steps') > 20 then
      raise exception 'Maximum 20 ordered arrival steps per property.';
    end if;
    delete from public.property_wayfinder_steps where property_id = target_property_id;
    idx := 0;
    for step_item in select * from jsonb_array_elements(payload -> 'steps')
    loop
      idx := idx + 1;
      insert into public.property_wayfinder_steps (
        property_id, step_order, step_type, heading, instruction, landmark,
        access_requirement, photo_url, latitude, longitude, verification_status
      )
      values (
        target_property_id,
        idx,
        coalesce(nullif(btrim(step_item ->> 'step_type'), ''), 'entrance'),
        left(btrim(coalesce(step_item ->> 'heading', 'Step ' || idx)), 140),
        left(btrim(coalesce(step_item ->> 'instruction', '')), 1200),
        left(btrim(coalesce(step_item ->> 'landmark', '')), 240),
        left(btrim(coalesce(step_item ->> 'access_requirement', '')), 240),
        left(btrim(coalesce(step_item ->> 'photo_url', '')), 600),
        case when nullif(btrim(coalesce(step_item ->> 'latitude', '')), '') is not null
          then round((step_item ->> 'latitude')::numeric, 6) else null end,
        case when nullif(btrim(coalesce(step_item ->> 'longitude', '')), '') is not null
          then round((step_item ->> 'longitude')::numeric, 6) else null end,
        'submitted'
      );
    end loop;
  end if;

  update public.properties
    set city = clean_city,
        public_landmarks = case
          when prop_row.status = 'approved' and array_length(prop_row.public_landmarks, 1) > 0
            then prop_row.public_landmarks
          else clean_landmarks
        end,
        public_location_summary = case
          when prop_row.status = 'approved' and length(prop_row.public_location_summary) > 0
            then prop_row.public_location_summary
          else clean_summary
        end,
        location_accuracy = case
          when prop_row.location_accuracy = 'verified_entrance' then 'verified_entrance'
          when dest_lat is not null then 'street_level'
          else 'approximate_area'
        end,
        wayfinder_status = computed_wayfinder_status,
        updated_at = now()
    where id = target_property_id;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      actor_profile.role,
      case when save_as_draft then 'wayfinder_draft_saved' else 'wayfinder_submitted' end,
      target_property_id,
      'Wayfinder location & arrival guide ' || (case when save_as_draft then 'drafted' else 'submitted for verification' end) || ' for ' || prop_row.title
    );

  return jsonb_build_object(
    'property_id', target_property_id,
    'staged_as_pending', false,
    'publication_status', target_pub_status,
    'wayfinder_status', computed_wayfinder_status
  );
end;
$$;

revoke all on function public.submit_property_wayfinder(text, jsonb, boolean) from public, anon;
grant execute on function public.submit_property_wayfinder(text, jsonb, boolean) to authenticated;

-- ─── 6. Admin Review & Verification RPC ───────────────────────────────────────

create or replace function public.review_property_wayfinder(
  target_property_id text,
  decision text,
  review_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  prop_row public.properties%rowtype;
  guide_row public.property_wayfinder_guides%rowtype;
  note_text text := btrim(coalesce(review_metadata ->> 'reviewer_note', ''));
  method_val text := nullif(btrim(coalesce(review_metadata ->> 'verification_method', '')), '');
  coords_ok boolean := coalesce((review_metadata ->> 'coordinates_checked')::boolean, false);
  dirs_ok boolean := coalesce((review_metadata ->> 'written_directions_checked')::boolean, false);
  photos_ok boolean := coalesce((review_metadata ->> 'photos_checked')::boolean, false);
  visited_ok boolean := coalesce((review_metadata ->> 'physically_visited')::boolean, false);
  tested_ok boolean := coalesce((review_metadata ->> 'guest_arrival_tested')::boolean, false);
  pending jsonb;
  next_revision integer;
  next_pub_status text;
  next_wayfinder_status text;
  next_accuracy text;
  wp_item jsonb;
  step_item jsonb;
  idx integer;
  clean_landmarks text[];
begin
  if actor_id is null or not public.has_role('admin') or not public.is_account_active() then
    raise exception 'Only active HAMLET administrators can verify or moderate Wayfinder guides.';
  end if;

  if decision not in ('approve_guide', 'approve_pin_only', 'needs_correction', 'disable') then
    raise exception 'Unsupported Wayfinder review decision.';
  end if;

  if length(note_text) < 8 then
    raise exception 'Document a reviewer note of at least 8 characters.';
  end if;

  if method_val is not null and method_val not in (
    'staff_desk_review',
    'map_imagery_crosscheck',
    'partner_rep_confirmation',
    'physical_onsite_check',
    'documented_arrival_test'
  ) then
    raise exception 'Unsupported verification method.';
  end if;

  select * into prop_row from public.properties where id = target_property_id for update;
  if not found then
    raise exception 'Property not found.';
  end if;

  select * into guide_row
    from public.property_wayfinder_guides
    where property_id = target_property_id
    for update;
  if not found then
    raise exception 'No Wayfinder guide record exists for this property yet.';
  end if;

  pending := guide_row.pending_submission;

  -- If approving and a pending partner revision exists, promote it atomically first
  if decision in ('approve_guide', 'approve_pin_only') and pending is not null then
    update public.property_wayfinder_guides
      set destination_latitude = case
            when nullif(btrim(coalesce(pending ->> 'destination_latitude', '')), '') is not null
              then round((pending ->> 'destination_latitude')::numeric, 6)
            else destination_latitude
          end,
          destination_longitude = case
            when nullif(btrim(coalesce(pending ->> 'destination_longitude', '')), '') is not null
              then round((pending ->> 'destination_longitude')::numeric, 6)
            else destination_longitude
          end,
          coordinate_point_type = coalesce(nullif(btrim(pending ->> 'coordinate_point_type'), ''), coordinate_point_type),
          coordinate_source = coalesce(nullif(btrim(pending ->> 'coordinate_source'), ''), coordinate_source),
          ambiguity_notes = coalesce(pending ->> 'ambiguity_notes', ambiguity_notes),
          guest_introduction = coalesce(pending ->> 'guest_introduction', guest_introduction),
          estate_or_building_name = coalesce(pending ->> 'estate_or_building_name', estate_or_building_name),
          preferred_entrance_label = coalesce(pending ->> 'preferred_entrance_label', preferred_entrance_label),
          entrance_instructions = coalesce(pending ->> 'entrance_instructions', entrance_instructions),
          entrance_photo_url = coalesce(pending ->> 'entrance_photo_url', entrance_photo_url),
          security_desk_instructions = coalesce(pending ->> 'security_desk_instructions', security_desk_instructions),
          building_or_block = coalesce(pending ->> 'building_or_block', building_or_block),
          building_instructions = coalesce(pending ->> 'building_instructions', building_instructions),
          building_photo_url = coalesce(pending ->> 'building_photo_url', building_photo_url),
          floor_label = coalesce(pending ->> 'floor_label', floor_label),
          apartment_identifier = coalesce(pending ->> 'apartment_identifier', apartment_identifier),
          lift_or_stairs_instructions = coalesce(pending ->> 'lift_or_stairs_instructions', lift_or_stairs_instructions),
          route_to_door = coalesce(pending ->> 'route_to_door', route_to_door),
          door_landmark_photo_url = coalesce(pending ->> 'door_landmark_photo_url', door_landmark_photo_url),
          parking_or_dropoff_instructions = coalesce(pending ->> 'parking_or_dropoff_instructions', parking_or_dropoff_instructions),
          arrival_restrictions = coalesce(pending ->> 'arrival_restrictions', arrival_restrictions),
          checkin_method = coalesce(nullif(btrim(pending ->> 'checkin_method'), ''), checkin_method),
          checkin_window_label = coalesce(nullif(btrim(pending ->> 'checkin_window_label'), ''), checkin_window_label),
          checkin_instructions = coalesce(pending ->> 'checkin_instructions', checkin_instructions),
          arrival_contact_name = coalesce(pending ->> 'arrival_contact_name', arrival_contact_name),
          arrival_contact_role = coalesce(pending ->> 'arrival_contact_role', arrival_contact_role),
          arrival_contact_phone = coalesce(pending ->> 'arrival_contact_phone', arrival_contact_phone),
          pending_status = null,
          pending_submission = null
      where property_id = target_property_id
      returning * into guide_row;

    if jsonb_typeof(pending -> 'waypoints') = 'array' then
      delete from public.property_wayfinder_waypoints where property_id = target_property_id;
      idx := 0;
      for wp_item in select * from jsonb_array_elements(pending -> 'waypoints')
      loop
        idx := idx + 1;
        insert into public.property_wayfinder_waypoints (
          property_id, point_type, label, latitude, longitude, instructions, photo_url, sort_order, verification_status
        )
        values (
          target_property_id,
          coalesce(nullif(btrim(wp_item ->> 'point_type'), ''), 'other_waypoint'),
          left(btrim(coalesce(wp_item ->> 'label', 'Waypoint ' || idx)), 120),
          round((wp_item ->> 'latitude')::numeric, 6),
          round((wp_item ->> 'longitude')::numeric, 6),
          left(btrim(coalesce(wp_item ->> 'instructions', '')), 600),
          left(btrim(coalesce(wp_item ->> 'photo_url', '')), 600),
          idx,
          'verified'
        );
      end loop;
    end if;

    if jsonb_typeof(pending -> 'steps') = 'array' then
      delete from public.property_wayfinder_steps where property_id = target_property_id;
      idx := 0;
      for step_item in select * from jsonb_array_elements(pending -> 'steps')
      loop
        idx := idx + 1;
        insert into public.property_wayfinder_steps (
          property_id, step_order, step_type, heading, instruction, landmark,
          access_requirement, photo_url, latitude, longitude, verification_status
        )
        values (
          target_property_id,
          idx,
          coalesce(nullif(btrim(step_item ->> 'step_type'), ''), 'entrance'),
          left(btrim(coalesce(step_item ->> 'heading', 'Step ' || idx)), 140),
          left(btrim(coalesce(step_item ->> 'instruction', '')), 1200),
          left(btrim(coalesce(step_item ->> 'landmark', '')), 240),
          left(btrim(coalesce(step_item ->> 'access_requirement', '')), 240),
          left(btrim(coalesce(step_item ->> 'photo_url', '')), 600),
          case when nullif(btrim(coalesce(step_item ->> 'latitude', '')), '') is not null
            then round((step_item ->> 'latitude')::numeric, 6) else null end,
          case when nullif(btrim(coalesce(step_item ->> 'longitude', '')), '') is not null
            then round((step_item ->> 'longitude')::numeric, 6) else null end,
          'verified'
        );
      end loop;
    end if;

    if jsonb_typeof(pending -> 'public_landmarks') = 'array' then
      select coalesce(array_agg(btrim(val)) filter (where length(btrim(val)) > 0), '{}')
        into clean_landmarks
        from jsonb_array_elements_text(pending -> 'public_landmarks') as t(val);
      update public.properties
        set public_landmarks = clean_landmarks,
            public_location_summary = coalesce(pending ->> 'public_location_summary', public_location_summary)
        where id = target_property_id;
    end if;
  end if;

  if decision = 'approve_guide' then
    if not coords_ok or not dirs_ok then
      raise exception 'To approve the full arrival guide, confirm both entrance coordinates and written directions were checked.';
    end if;
    if guide_row.destination_latitude is null or guide_row.destination_longitude is null then
      raise exception 'Cannot approve Wayfinder guide without validated destination coordinates.';
    end if;
    if length(btrim(guide_row.entrance_instructions)) < 8
       or (length(btrim(guide_row.route_to_door)) < 8 and length(btrim(guide_row.checkin_instructions)) < 8) then
      raise exception 'Cannot mark arrival guide ready when entrance or door/check-in instructions are missing.';
    end if;

    next_revision := guide_row.published_revision + 1;
    next_pub_status := 'approved';
    next_wayfinder_status := 'guide_ready';
    next_accuracy := 'verified_entrance';

    update public.property_wayfinder_waypoints
      set verification_status = 'verified'
      where property_id = target_property_id;
    update public.property_wayfinder_steps
      set verification_status = 'verified'
      where property_id = target_property_id;

  elsif decision = 'approve_pin_only' then
    if not coords_ok then
      raise exception 'Confirm entrance coordinates were checked before approving the destination pin.';
    end if;
    if guide_row.destination_latitude is null or guide_row.destination_longitude is null then
      raise exception 'Cannot approve destination pin without validated coordinates.';
    end if;

    next_revision := guide_row.published_revision + 1;
    next_pub_status := 'approved';
    next_wayfinder_status := 'guide_incomplete';
    next_accuracy := 'verified_entrance';

    update public.property_wayfinder_waypoints
      set verification_status = 'verified'
      where property_id = target_property_id;

  elsif decision = 'needs_correction' then
    if guide_row.publication_status = 'approved' and pending is not null then
      -- Keep live approved guide intact while flagging pending partner draft for correction
      update public.property_wayfinder_guides
        set pending_status = 'needs_correction',
            reviewer_note = note_text,
            updated_at = now()
        where property_id = target_property_id;

      insert into public.property_wayfinder_verifications (
        property_id, guide_revision, decision, verification_method,
        coordinates_checked, written_directions_checked, photos_checked,
        physically_visited, guest_arrival_tested, reviewer_id, reviewer_note
      )
      values (
        target_property_id, guide_row.published_revision, decision, method_val,
        coords_ok, dirs_ok, photos_ok, visited_ok, tested_ok, actor_id, note_text
      );

      insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
        values (
          actor_id, 'admin', 'wayfinder_pending_needs_correction', target_property_id,
          prop_row.title || ': ' || note_text
        );

      return jsonb_build_object(
        'property_id', target_property_id,
        'publication_status', guide_row.publication_status,
        'pending_status', 'needs_correction',
        'wayfinder_status', prop_row.wayfinder_status
      );
    end if;

    next_revision := guide_row.published_revision;
    next_pub_status := 'needs_correction';
    next_wayfinder_status := 'needs_correction';
    next_accuracy := prop_row.location_accuracy;

  else
    -- decision = 'disable'
    next_revision := guide_row.published_revision;
    next_pub_status := 'disabled';
    next_wayfinder_status := 'disabled';
    next_accuracy := case
      when prop_row.location_accuracy = 'verified_entrance' then 'street_level'
      else prop_row.location_accuracy
    end;
  end if;

  update public.property_wayfinder_guides
    set published_revision = next_revision,
        publication_status = next_pub_status,
        coordinates_checked = coords_ok,
        written_directions_checked = dirs_ok,
        photos_checked = photos_ok,
        physically_visited = visited_ok,
        guest_arrival_tested = tested_ok,
        needs_reverification = (decision in ('needs_correction', 'disable')),
        verification_method = coalesce(method_val, verification_method, 'staff_desk_review'),
        verified_by = actor_id,
        verified_at = now(),
        reviewer_note = note_text,
        updated_at = now()
    where property_id = target_property_id;

  update public.properties
    set wayfinder_status = next_wayfinder_status,
        location_accuracy = next_accuracy,
        updated_at = now()
    where id = target_property_id;

  insert into public.property_wayfinder_verifications (
    property_id, guide_revision, decision, verification_method,
    coordinates_checked, written_directions_checked, photos_checked,
    physically_visited, guest_arrival_tested, reviewer_id, reviewer_note
  )
  values (
    target_property_id, next_revision, decision, coalesce(method_val, 'staff_desk_review'),
    coords_ok, dirs_ok, photos_ok, visited_ok, tested_ok, actor_id, note_text
  );

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      'admin',
      'wayfinder_' || decision,
      target_property_id,
      prop_row.title || ' (rev #' || next_revision || '): ' || note_text
    );

  return jsonb_build_object(
    'property_id', target_property_id,
    'published_revision', next_revision,
    'publication_status', next_pub_status,
    'wayfinder_status', next_wayfinder_status
  );
end;
$$;

revoke all on function public.review_property_wayfinder(text, text, jsonb) from public, anon;
grant execute on function public.review_property_wayfinder(text, text, jsonb) to authenticated;

-- ─── 7. Authoritative Guest Wayfinder & Time-Bounded Code Release RPC ─────────

create or replace function public.get_guest_booking_wayfinder(target_booking_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  booking_row public.bookings%rowtype;
  prop_row public.properties%rowtype;
  guide_row public.property_wayfinder_guides%rowtype;
  has_guide boolean := false;
  secrets_row public.property_wayfinder_secrets%rowtype;
  has_secrets boolean := false;
  is_manager_or_admin boolean := false;
  checkin_anchor timestamptz;
  checkout_cutoff timestamptz;
  unlock_at timestamptz;
  codes_unlocked boolean := false;
  waypoints_json jsonb := '[]'::jsonb;
  steps_json jsonb := '[]'::jsonb;
  guide_payload jsonb := null;
  snapshot_payload jsonb := null;
  newer_revision_available boolean := false;
begin
  if actor_id is null then
    raise exception 'Sign in to view Wayfinder arrival guidance.';
  end if;

  if not public.is_account_active() then
    raise exception 'Your account is currently suspended. Contact HAMLET operations.';
  end if;

  select * into booking_row
    from public.bookings
    where id = target_booking_id or reference = target_booking_id
    for update;

  if not found then
    raise exception 'Booking not found.';
  end if;

  is_manager_or_admin := public.can_manage_property(booking_row.property_id);

  if booking_row.guest_id <> actor_id and not is_manager_or_admin then
    raise exception 'You do not have permission to view arrival guidance for this booking.';
  end if;

  -- Strictly gate confirmed-booking Wayfinder access (§5.C, §5.D, §11)
  if booking_row.status not in ('confirmed', 'completed') then
    raise exception 'Wayfinder arrival instructions unlock only after your booking is confirmed.';
  end if;

  select * into prop_row from public.properties where id = booking_row.property_id;
  select * into guide_row
    from public.property_wayfinder_guides
    where property_id = booking_row.property_id;
  has_guide := found and guide_row.publication_status = 'approved';

  if has_guide then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', w.id,
      'point_type', w.point_type,
      'label', w.label,
      'latitude', w.latitude,
      'longitude', w.longitude,
      'instructions', w.instructions,
      'photo_url', w.photo_url,
      'sort_order', w.sort_order
    ) order by w.sort_order), '[]'::jsonb)
    into waypoints_json
    from public.property_wayfinder_waypoints w
    where w.property_id = booking_row.property_id
      and w.verification_status = 'verified';

    select coalesce(jsonb_agg(jsonb_build_object(
      'id', s.id,
      'step_order', s.step_order,
      'step_type', s.step_type,
      'heading', s.heading,
      'instruction', s.instruction,
      'landmark', s.landmark,
      'access_requirement', s.access_requirement,
      'photo_url', s.photo_url,
      'latitude', s.latitude,
      'longitude', s.longitude
    ) order by s.step_order), '[]'::jsonb)
    into steps_json
    from public.property_wayfinder_steps s
    where s.property_id = booking_row.property_id
      and s.verification_status = 'verified';

    guide_payload := jsonb_build_object(
      'published_revision', guide_row.published_revision,
      'destination_latitude', guide_row.destination_latitude,
      'destination_longitude', guide_row.destination_longitude,
      'coordinate_point_type', guide_row.coordinate_point_type,
      'coordinate_source', guide_row.coordinate_source,
      'ambiguity_notes', guide_row.ambiguity_notes,
      'guest_introduction', guide_row.guest_introduction,
      'estate_or_building_name', guide_row.estate_or_building_name,
      'preferred_entrance_label', guide_row.preferred_entrance_label,
      'entrance_instructions', guide_row.entrance_instructions,
      'entrance_photo_url', guide_row.entrance_photo_url,
      'security_desk_instructions', guide_row.security_desk_instructions,
      'building_or_block', guide_row.building_or_block,
      'building_instructions', guide_row.building_instructions,
      'building_photo_url', guide_row.building_photo_url,
      'floor_label', guide_row.floor_label,
      'apartment_identifier', guide_row.apartment_identifier,
      'lift_or_stairs_instructions', guide_row.lift_or_stairs_instructions,
      'route_to_door', guide_row.route_to_door,
      'door_landmark_photo_url', guide_row.door_landmark_photo_url,
      'parking_or_dropoff_instructions', guide_row.parking_or_dropoff_instructions,
      'arrival_restrictions', guide_row.arrival_restrictions,
      'checkin_method', guide_row.checkin_method,
      'checkin_window_label', guide_row.checkin_window_label,
      'checkin_instructions', guide_row.checkin_instructions,
      'arrival_contact_name', guide_row.arrival_contact_name,
      'arrival_contact_role', guide_row.arrival_contact_role,
      'arrival_contact_phone', guide_row.arrival_contact_phone,
      'coordinates_checked', guide_row.coordinates_checked,
      'written_directions_checked', guide_row.written_directions_checked,
      'photos_checked', guide_row.photos_checked,
      'physically_visited', guide_row.physically_visited,
      'guest_arrival_tested', guide_row.guest_arrival_tested,
      'verified_at', guide_row.verified_at,
      'waypoints', waypoints_json,
      'steps', steps_json
    );

    -- Preserve confirmed booking snapshot on first access so instructions don't silently shift mid-journey
    if booking_row.status = 'confirmed' and booking_row.wayfinder_snapshot is null then
      update public.bookings
        set wayfinder_snapshot = guide_payload,
            wayfinder_snapshot_revision = guide_row.published_revision
        where id = booking_row.id;
      snapshot_payload := guide_payload;
    elsif booking_row.wayfinder_snapshot is not null then
      snapshot_payload := booking_row.wayfinder_snapshot;
      newer_revision_available := coalesce(booking_row.wayfinder_snapshot_revision, 0) < guide_row.published_revision;
    else
      snapshot_payload := guide_payload;
    end if;
  end if;

  -- Evaluate time-bounded sensitive access code release ONLY for active `confirmed` stays
  select * into secrets_row
    from public.property_wayfinder_secrets
    where property_id = booking_row.property_id;
  has_secrets := found and (
    length(btrim(secrets_row.gate_access_code)) > 0
    or length(btrim(secrets_row.building_access_code)) > 0
    or length(btrim(secrets_row.lockbox_or_smartlock_code)) > 0
    or length(btrim(secrets_row.wifi_password)) > 0
  );

  checkin_anchor := ((booking_row.check_in::timestamp + interval '14 hours') at time zone 'Africa/Lagos');
  checkout_cutoff := ((booking_row.check_out::timestamp + interval '18 hours') at time zone 'Africa/Lagos');
  unlock_at := checkin_anchor - make_interval(hours => coalesce(secrets_row.release_hours_before_checkin, 24));

  if booking_row.status = 'confirmed'
     and has_guide
     and has_secrets
     and now() >= unlock_at
     and now() <= checkout_cutoff then
    codes_unlocked := true;
  end if;

  return jsonb_build_object(
    'booking_id', booking_row.id,
    'booking_reference', booking_row.reference,
    'booking_status', booking_row.status,
    'check_in', booking_row.check_in,
    'check_out', booking_row.check_out,
    'guest_count', booking_row.guest_count,
    'property_id', prop_row.id,
    'property_title', prop_row.title,
    'area', prop_row.area,
    'city', prop_row.city,
    'public_address', prop_row.public_address,
    'public_landmarks', prop_row.public_landmarks,
    'wayfinder_status', prop_row.wayfinder_status,
    'guide_available', has_guide,
    'guide', coalesce(guide_payload, snapshot_payload),
    'confirmed_snapshot', snapshot_payload,
    'newer_revision_available', newer_revision_available,
    'has_sensitive_codes', has_secrets,
    'codes_unlocked', codes_unlocked,
    'codes_unlock_at', case when has_secrets then unlock_at else null end,
    'codes_expire_at', case when has_secrets then checkout_cutoff else null end,
    'secrets', case
      when codes_unlocked then jsonb_build_object(
        'gate_access_code', secrets_row.gate_access_code,
        'building_access_code', secrets_row.building_access_code,
        'lockbox_or_smartlock_code', secrets_row.lockbox_or_smartlock_code,
        'wifi_network_name', secrets_row.wifi_network_name,
        'wifi_password', secrets_row.wifi_password
      )
      else null
    end
  );
end;
$$;

revoke all on function public.get_guest_booking_wayfinder(text) from public, anon;
grant execute on function public.get_guest_booking_wayfinder(text) to authenticated;

-- ─── 8. Arrival Issue Reporting & Staff Guide Flagging RPCs ───────────────────

create or replace function public.report_arrival_issue(
  target_booking_id text,
  arrival_category text,
  issue_severity text default 'high',
  issue_description text default '',
  step_key text default null,
  evidence_items jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  booking_row public.bookings%rowtype;
  category_label text;
  subject_text text;
  created_issue_id uuid;
begin
  if arrival_category not in (
    'incorrect_map_pin',
    'cannot_find_entrance',
    'cannot_find_building',
    'cannot_find_apartment',
    'checkin_instructions_unclear',
    'access_method_not_working',
    'other_arrival_problem'
  ) then
    raise exception 'Unsupported arrival issue category.';
  end if;

  select * into booking_row
    from public.bookings
    where id = target_booking_id or reference = target_booking_id;

  if not found then
    raise exception 'Booking not found.';
  end if;

  category_label := case arrival_category
    when 'incorrect_map_pin' then 'Incorrect map pin'
    when 'cannot_find_entrance' then 'Cannot find entrance'
    when 'cannot_find_building' then 'Cannot find building'
    when 'cannot_find_apartment' then 'Cannot find apartment'
    when 'checkin_instructions_unclear' then 'Check-in instructions unclear'
    when 'access_method_not_working' then 'Access method not working'
    else 'Arrival navigation problem'
  end;

  subject_text := 'Wayfinder · ' || category_label;

  created_issue_id := public.report_booking_issue(
    booking_row.id,
    'Access & check-in',
    coalesce(nullif(btrim(issue_severity), ''), 'high'),
    subject_text,
    issue_description,
    evidence_items
  );

  update public.booking_issues
    set arrival_issue_type = arrival_category,
        wayfinder_step_key = nullif(btrim(coalesce(step_key, '')), '')
    where id = created_issue_id;

  insert into public.wayfinder_events (booking_id, property_id, actor_id, event_type, metadata)
    values (
      booking_row.id,
      booking_row.property_id,
      actor_id,
      'arrival_issue_reported',
      jsonb_strip_nulls(jsonb_build_object(
        'arrival_issue_type', arrival_category,
        'step_key', nullif(btrim(coalesce(step_key, '')), ''),
        'issue_id', created_issue_id
      ))
    );

  return created_issue_id;
end;
$$;

revoke all on function public.report_arrival_issue(text, text, text, text, text, jsonb) from public, anon;
grant execute on function public.report_arrival_issue(text, text, text, text, text, jsonb) to authenticated;

create or replace function public.flag_wayfinder_for_correction(
  target_property_id text,
  reason_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  clean_reason text := btrim(coalesce(reason_note, ''));
begin
  if actor_id is null or not public.has_role('admin') or not public.is_account_active() then
    raise exception 'Only active HAMLET administrators can flag an arrival guide for correction.';
  end if;

  if length(clean_reason) < 8 then
    raise exception 'Provide a correction note of at least 8 characters.';
  end if;

  update public.properties
    set wayfinder_status = 'needs_correction',
        updated_at = now()
    where id = target_property_id;

  update public.property_wayfinder_guides
    set needs_reverification = true,
        reviewer_note = clean_reason,
        updated_at = now()
    where property_id = target_property_id;

  insert into public.property_wayfinder_verifications (
    property_id, guide_revision, decision, reviewer_id, reviewer_note
  )
  select
    target_property_id,
    coalesce((select published_revision from public.property_wayfinder_guides where property_id = target_property_id), 0),
    'flag_correction',
    actor_id,
    clean_reason;

  insert into public.wayfinder_events (property_id, actor_id, event_type, metadata)
    values (
      target_property_id,
      actor_id,
      'guide_flagged_incomplete',
      jsonb_build_object('reason', clean_reason)
    );

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      'admin',
      'wayfinder_flagged_for_correction',
      target_property_id,
      clean_reason
    );
end;
$$;

revoke all on function public.flag_wayfinder_for_correction(text, text) from public, anon;
grant execute on function public.flag_wayfinder_for_correction(text, text) to authenticated;

-- ─── 9. Privacy-Safe Wayfinder Analytics & Post-Stay Ease Feedback RPC ────────

create or replace function public.record_wayfinder_event(
  target_booking_id text,
  event_type_input text,
  event_meta jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  booking_row public.bookings%rowtype;
  sanitized_meta jsonb := '{}'::jsonb;
begin
  if actor_id is null or not public.is_account_active() then
    return;
  end if;

  if event_type_input not in (
    'wayfinder_opened',
    'directions_clicked',
    'arrival_guide_viewed',
    'help_action_selected',
    'ease_of_arrival_feedback'
  ) then
    raise exception 'Unsupported Wayfinder event type.';
  end if;

  select * into booking_row
    from public.bookings
    where id = target_booking_id or reference = target_booking_id;

  if not found then
    raise exception 'Booking not found.';
  end if;

  if booking_row.guest_id <> actor_id and not public.can_manage_property(booking_row.property_id) then
    raise exception 'Not authorized to record Wayfinder activity for this booking.';
  end if;

  -- Strip any accidental GPS or secret keys so analytics never logs sensitive data (§11 & §18)
  if jsonb_typeof(event_meta) = 'object' then
    sanitized_meta := (event_meta
      - 'gate_access_code'
      - 'building_access_code'
      - 'lockbox_or_smartlock_code'
      - 'wifi_password'
      - 'guest_latitude'
      - 'guest_longitude'
      - 'gps_history');
  end if;

  insert into public.wayfinder_events (booking_id, property_id, actor_id, event_type, metadata)
    values (booking_row.id, booking_row.property_id, actor_id, event_type_input, sanitized_meta);
end;
$$;

revoke all on function public.record_wayfinder_event(text, text, jsonb) from public, anon;
grant execute on function public.record_wayfinder_event(text, text, jsonb) to authenticated;

-- ─── 10. Explicit Table Grants (RLS Enforced; Zero Anon Access) ───────────────

revoke all on table
  public.property_wayfinder_guides,
  public.property_wayfinder_waypoints,
  public.property_wayfinder_steps,
  public.property_wayfinder_secrets,
  public.property_wayfinder_verifications,
  public.wayfinder_events
from public, anon;

grant select on table
  public.property_wayfinder_guides,
  public.property_wayfinder_waypoints,
  public.property_wayfinder_steps,
  public.property_wayfinder_secrets,
  public.property_wayfinder_verifications,
  public.wayfinder_events
to authenticated;

grant all on table
  public.property_wayfinder_guides,
  public.property_wayfinder_waypoints,
  public.property_wayfinder_steps,
  public.property_wayfinder_secrets,
  public.property_wayfinder_verifications,
  public.wayfinder_events
to service_role;
