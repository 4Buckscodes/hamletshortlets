-- ============================================================================
-- HAMLET Consolidated Release — Availability, Partner Referrals, 20% Domestic
-- Pricing & Allocation, 10% USD/GBP International Buffer, Caution Deposit &
-- Settlement Ledger
-- ============================================================================

-- ─── 1. Helper: Integer-Safe Basis Point Math & Referral Code Generator ──────

create or replace function public.multiply_ngn_bps(amount_ngn integer, bps integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case
    when coalesce(amount_ngn, 0) <= 0 or coalesce(bps, 0) <= 0 then 0
    else ((amount_ngn::bigint * bps::bigint + 5000) / 10000)::integer
  end;
$$;

grant execute on function public.multiply_ngn_bps(integer, integer)
  to anon, authenticated, service_role;

create or replace function public.generate_unique_referral_code(seed_text text default '')
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  prefix text;
  candidate text;
  attempt integer := 0;
begin
  prefix := upper(regexp_replace(coalesce(seed_text, ''), '[^A-Za-z]', '', 'g'));
  prefix := rpad(substr(prefix, 1, 3), 3, 'P');

  loop
    attempt := attempt + 1;
    candidate := 'HML-' || prefix || upper(substr(md5(gen_random_uuid()::text || attempt::text), 1, 5));
    exit when not exists (
      select 1 from public.profiles where referral_code = candidate
    );
    if attempt > 25 then
      candidate := 'HML-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
      exit when not exists (
        select 1 from public.profiles where referral_code = candidate
      );
    end if;
  end loop;

  return candidate;
end;
$$;

grant execute on function public.generate_unique_referral_code(text)
  to authenticated, service_role;

-- ─── 2. Property Publication Status Decoupling & Calendar Availability (§3) ──

do $$
declare
  rec record;
begin
  for rec in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'properties'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%status%'
  loop
    execute format('alter table public.properties drop constraint if exists %I', rec.conname);
  end loop;
end
$$;

alter table public.properties
  add constraint properties_publication_status_check
  check (status in (
    'draft',
    'submitted',
    'needs_correction',
    'approved',
    'paused',
    'rejected',
    'suspended',
    'archived'
  ));

alter table public.properties
  add column if not exists first_available_date date,
  add column if not exists availability_confirmation_status text not null default 'confirmed'
    check (availability_confirmation_status in ('confirmed', 'needs_confirmation')),
  add column if not exists calendar_responsible_person text,
  add column if not exists calendar_responsible_user_id uuid references public.profiles (id) on delete set null,
  add column if not exists last_availability_update timestamptz not null default now(),
  add column if not exists property_introducer_id uuid references public.profiles (id) on delete set null,
  add column if not exists authorised_manager_id uuid references public.profiles (id) on delete set null;

create table if not exists public.property_availability_blocks (
  id uuid primary key default gen_random_uuid(),
  property_id text not null references public.properties (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  block_type text not null check (block_type in ('owner_block', 'external_booking', 'maintenance')),
  source text not null default 'partner' check (source in ('owner', 'manager', 'partner', 'admin', 'external_sync')),
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (end_date > start_date)
);

create index if not exists property_availability_blocks_lookup_idx
  on public.property_availability_blocks (property_id, start_date, end_date);

alter table public.property_availability_blocks enable row level security;

drop policy if exists "Managers and admins can read property availability blocks"
  on public.property_availability_blocks;
create policy "Managers and admins can read property availability blocks"
  on public.property_availability_blocks for select to authenticated
  using (public.can_manage_property(property_id));

revoke all on public.property_availability_blocks from public, anon, authenticated;
grant select on public.property_availability_blocks to authenticated;
grant all on public.property_availability_blocks to service_role;

-- Privacy-safe public calendar spans for approved properties (zero guest PII or private notes)
create or replace function public.get_public_property_calendar(
  target_property_ids text[] default null
)
returns table (
  property_id text,
  start_date date,
  end_date date,
  kind text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    b.property_id,
    b.check_in as start_date,
    b.check_out as end_date,
    case
      when b.status = 'confirmed' then 'hamlet_booking'
      else 'payment_hold'
    end as kind
  from public.bookings b
  join public.properties p on p.id = b.property_id
  where p.status = 'approved'
    and (target_property_ids is null or b.property_id = any(target_property_ids))
    and (
      b.status = 'confirmed'
      or (
        b.status = 'awaiting_payment'
        and (b.payment_deadline is null or b.payment_deadline > now())
      )
    )

  union all

  select
    blk.property_id,
    blk.start_date,
    blk.end_date,
    'unavailable_block'::text as kind
  from public.property_availability_blocks blk
  join public.properties p on p.id = blk.property_id
  where p.status = 'approved'
    and (target_property_ids is null or blk.property_id = any(target_property_ids));
$$;

grant execute on function public.get_public_property_calendar(text[])
  to anon, authenticated, service_role;

-- Update date-search conflict RPC to respect bookings, payment holds, blocks & first_available_date
create or replace function public.get_unavailable_property_ids(
  requested_check_in date,
  requested_check_out date
)
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select distinct p.id
  from public.properties p
  where requested_check_in is not null
    and requested_check_out is not null
    and requested_check_out > requested_check_in
    and (
      (p.first_available_date is not null and requested_check_in < p.first_available_date)
      or exists (
        select 1
        from public.bookings b
        where b.property_id = p.id
          and b.check_in < requested_check_out
          and b.check_out > requested_check_in
          and (
            b.status = 'confirmed'
            or (
              b.status = 'awaiting_payment'
              and (b.payment_deadline is null or b.payment_deadline > now())
            )
          )
      )
      or exists (
        select 1
        from public.property_availability_blocks blk
        where blk.property_id = p.id
          and blk.start_date < requested_check_out
          and blk.end_date > requested_check_in
      )
    );
$$;

grant execute on function public.get_unavailable_property_ids(date, date)
  to anon, authenticated, service_role;

-- Partner / Owner / Admin RPCs to update property availability without recreating listing (§3.4)
create or replace function public.update_property_availability_settings(
  target_property_id text,
  next_first_available_date date default null,
  next_confirmation_status text default 'confirmed',
  next_responsible_person text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role text;
  prop_title text;
begin
  if actor_id is null or not public.is_account_active() then
    raise exception 'Sign in with an active account to update property availability.';
  end if;

  if not public.can_manage_property(target_property_id) then
    raise exception 'You are not authorised to manage availability for this property.';
  end if;

  if next_confirmation_status not in ('confirmed', 'needs_confirmation') then
    raise exception 'Unsupported availability confirmation status %.', next_confirmation_status;
  end if;

  select role into actor_role from public.profiles where id = actor_id;

  select title into prop_title
    from public.properties
    where id = target_property_id
    for update;

  if not found then
    raise exception 'Property not found.';
  end if;

  update public.properties
    set first_available_date = next_first_available_date,
        availability_confirmation_status = next_confirmation_status,
        calendar_responsible_person = coalesce(
          nullif(btrim(coalesce(next_responsible_person, '')), ''),
          calendar_responsible_person
        ),
        calendar_responsible_user_id = actor_id,
        last_availability_update = now(),
        updated_at = now()
    where id = target_property_id;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      coalesce(actor_role, 'partner'),
      'property_availability_updated',
      prop_title,
      'First available: ' || coalesce(next_first_available_date::text, 'immediate')
        || '; confirmation status: ' || next_confirmation_status
    );
end;
$$;

revoke all on function public.update_property_availability_settings(text, date, text, text) from public, anon;
grant execute on function public.update_property_availability_settings(text, date, text, text) to authenticated;

create or replace function public.add_property_availability_block(
  target_property_id text,
  block_start date,
  block_end date,
  kind text default 'owner_block',
  block_source text default 'partner',
  block_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role text;
  prop_title text;
  created_block_id uuid;
begin
  if actor_id is null or not public.is_account_active() then
    raise exception 'Sign in with an active account to add an availability block.';
  end if;

  if not public.can_manage_property(target_property_id) then
    raise exception 'You are not authorised to manage availability for this property.';
  end if;

  if block_start is null or block_end is null or block_end <= block_start then
    raise exception 'Block end date must be after start date.';
  end if;

  if kind not in ('owner_block', 'external_booking', 'maintenance') then
    raise exception 'Unsupported availability block type %.', kind;
  end if;

  if block_source not in ('owner', 'manager', 'partner', 'admin', 'external_sync') then
    raise exception 'Unsupported availability block source %.', block_source;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(target_property_id, 0));

  select title into prop_title
    from public.properties
    where id = target_property_id
    for update;

  if not found then
    raise exception 'Property not found.';
  end if;

  if exists (
    select 1
    from public.bookings b
    where b.property_id = target_property_id
      and b.status = 'confirmed'
      and b.check_in < block_end
      and b.check_out > block_start
  ) then
    raise exception 'Cannot block dates that already have a confirmed HAMLET stay.';
  end if;

  select role into actor_role from public.profiles where id = actor_id;

  insert into public.property_availability_blocks (
    property_id, start_date, end_date, block_type, source, note, created_by
  )
  values (
    target_property_id,
    block_start,
    block_end,
    kind,
    block_source,
    nullif(btrim(coalesce(block_note, '')), ''),
    actor_id
  )
  returning id into created_block_id;

  update public.properties
    set last_availability_update = now(),
        updated_at = now()
    where id = target_property_id;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      coalesce(actor_role, 'partner'),
      'property_block_added',
      prop_title,
      'Blocked ' || block_start::text || ' → ' || block_end::text || ' (' || kind || ')'
    );

  return created_block_id;
end;
$$;

revoke all on function public.add_property_availability_block(text, date, date, text, text, text) from public, anon;
grant execute on function public.add_property_availability_block(text, date, date, text, text, text) to authenticated;

create or replace function public.remove_property_availability_block(
  target_block_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role text;
  blk_row public.property_availability_blocks%rowtype;
  prop_title text;
begin
  if actor_id is null or not public.is_account_active() then
    raise exception 'Sign in with an active account to remove an availability block.';
  end if;

  select * into blk_row
    from public.property_availability_blocks
    where id = target_block_id
    for update;

  if not found then
    raise exception 'Availability block not found.';
  end if;

  if not public.can_manage_property(blk_row.property_id) then
    raise exception 'You are not authorised to manage availability for this property.';
  end if;

  select role into actor_role from public.profiles where id = actor_id;
  select title into prop_title from public.properties where id = blk_row.property_id;

  delete from public.property_availability_blocks where id = target_block_id;

  update public.properties
    set last_availability_update = now(),
        updated_at = now()
    where id = blk_row.property_id;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      coalesce(actor_role, 'partner'),
      'property_block_removed',
      coalesce(prop_title, blk_row.property_id),
      'Removed block ' || blk_row.start_date::text || ' → ' || blk_row.end_date::text
    );
end;
$$;

revoke all on function public.remove_property_availability_block(uuid) from public, anon;
grant execute on function public.remove_property_availability_block(uuid) to authenticated;

create or replace function public.set_property_publication_pause(
  target_property_id text,
  paused boolean,
  pause_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role text;
  prop_row public.properties%rowtype;
  target_status text := case when paused then 'paused' else 'approved' end;
begin
  if actor_id is null or not public.is_account_active() then
    raise exception 'Sign in with an active account to pause or resume a property.';
  end if;

  if not public.can_manage_property(target_property_id) then
    raise exception 'You are not authorised to manage this property.';
  end if;

  select * into prop_row
    from public.properties
    where id = target_property_id
    for update;

  if not found then
    raise exception 'Property not found.';
  end if;

  if paused and prop_row.status <> 'approved' then
    raise exception 'Only approved listings can be paused.';
  end if;

  if not paused and prop_row.status <> 'paused' then
    raise exception 'Only paused listings can be resumed to approved.';
  end if;

  select role into actor_role from public.profiles where id = actor_id;

  update public.properties
    set status = target_status,
        updated_at = now()
    where id = target_property_id;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      coalesce(actor_role, 'partner'),
      'property_' || target_status,
      prop_row.title,
      coalesce(nullif(btrim(coalesce(pause_note, '')), ''), 'Publication status set to ' || target_status)
    );
end;
$$;

revoke all on function public.set_property_publication_pause(text, boolean, text) from public, anon;
grant execute on function public.set_property_publication_pause(text, boolean, text) to authenticated;

-- Extend submit_partner_property to capture decoupled calendar availability & introducer/manager attribution
create or replace function public.submit_partner_property(
  listing_data jsonb,
  submission_data jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_name text;
  created_property_id text;
  submitted_docs jsonb;
  target_pub_status text;
  parsed_first_available date;
  parsed_confirmation text;
  responsible_label text;
  submitted_role_text text;
  blk jsonb;
begin
  if actor_id is null or not public.has_role('partner') then
    raise exception 'Only approved partner accounts can submit properties.';
  end if;

  if not public.is_account_active() then
    raise exception 'Your partner account is currently suspended. Contact HAMLET operations.';
  end if;

  if jsonb_typeof(listing_data) is distinct from 'object'
    or jsonb_typeof(submission_data) is distinct from 'object' then
    raise exception 'Property submission data must be JSON objects.';
  end if;

  target_pub_status := case
    when coalesce(listing_data ->> 'status', '') = 'draft' then 'draft'
    else 'submitted'
  end;

  if length(btrim(coalesce(listing_data ->> 'title', ''))) < 8
    or length(btrim(coalesce(listing_data ->> 'public_address', ''))) < 10
    or length(btrim(coalesce(submission_data ->> 'authority_basis', ''))) < 9
    or jsonb_typeof(listing_data -> 'amenities') is distinct from 'array'
    or jsonb_typeof(listing_data -> 'image_urls') is distinct from 'array'
    or jsonb_typeof(listing_data -> 'house_rules') is distinct from 'array'
    or jsonb_typeof(listing_data -> 'mandatory_charges') is distinct from 'array'
    or jsonb_typeof(submission_data -> 'docs') is distinct from 'array' then
    raise exception 'Required property details or evidence declarations are missing.';
  end if;

  perform public.assert_lagos_pilot_area(listing_data ->> 'area');

  if jsonb_array_length(listing_data -> 'image_urls') > 12
    or jsonb_array_length(listing_data -> 'amenities') > 30
    or jsonb_array_length(listing_data -> 'house_rules') > 30
    or jsonb_array_length(submission_data -> 'docs') > 20 then
    raise exception 'Property submission exceeds an allowed item limit.';
  end if;

  if exists (
    select 1
    from public.properties existing
    where existing.status not in ('rejected', 'archived')
      and public.normalize_listing_text(existing.area) = public.normalize_listing_text(listing_data ->> 'area')
      and public.normalize_listing_text(existing.public_address) = public.normalize_listing_text(listing_data ->> 'public_address')
      and public.normalize_listing_text(existing.title) = public.normalize_listing_text(listing_data ->> 'title')
  ) then
    raise exception 'A listing with this title and address already exists in this area.';
  end if;

  select full_name into actor_name from public.profiles where id = actor_id;

  if nullif(btrim(coalesce(listing_data ->> 'first_available_date', '')), '') is not null then
    parsed_first_available := (listing_data ->> 'first_available_date')::date;
  end if;

  parsed_confirmation := case
    when coalesce(listing_data ->> 'availability_confirmation_status', '') = 'needs_confirmation'
      then 'needs_confirmation'
    else 'confirmed'
  end;

  responsible_label := coalesce(
    nullif(btrim(coalesce(listing_data ->> 'calendar_responsible_person', '')), ''),
    nullif(btrim(coalesce(actor_name, '')), ''),
    'Property partner'
  );

  submitted_role_text := btrim(coalesce(submission_data ->> 'submitted_role', 'Property partner'));

  insert into public.properties (
    title, property_type, area, public_address, nightly_rate, cleaning_fee,
    mandatory_charges, refundable_deposit, bedrooms, bathrooms, capacity,
    bed_setup, amenities, image_urls, house_rules, status, verification, trust_label,
    first_available_date, availability_confirmation_status,
    calendar_responsible_person, calendar_responsible_user_id, last_availability_update,
    property_introducer_id, authorised_manager_id
  )
  values (
    btrim(listing_data ->> 'title'),
    btrim(listing_data ->> 'property_type'),
    btrim(listing_data ->> 'area'),
    btrim(listing_data ->> 'public_address'),
    (listing_data ->> 'nightly_rate')::integer,
    (listing_data ->> 'cleaning_fee')::integer,
    listing_data -> 'mandatory_charges',
    (listing_data ->> 'refundable_deposit')::integer,
    (listing_data ->> 'bedrooms')::integer,
    (listing_data ->> 'bathrooms')::integer,
    (listing_data ->> 'capacity')::integer,
    btrim(listing_data ->> 'bed_setup'),
    array(select jsonb_array_elements_text(listing_data -> 'amenities')),
    array(select jsonb_array_elements_text(listing_data -> 'image_urls')),
    array(select jsonb_array_elements_text(listing_data -> 'house_rules')),
    target_pub_status,
    jsonb_build_object(
      'ownership', 'pending_review',
      'identity', 'pending_review',
      'authority', 'pending_review',
      'inspection', 'missing'
    ),
    case when target_pub_status = 'draft' then 'Draft' else 'Under review' end,
    parsed_first_available,
    parsed_confirmation,
    responsible_label,
    actor_id,
    now(),
    actor_id,
    case
      when lower(submitted_role_text) like '%introducer%' then null
      else actor_id
    end
  )
  returning id into created_property_id;

  -- Optional initial unavailable date blocks submitted while occupied/future-booked (§3.4)
  if jsonb_typeof(listing_data -> 'unavailable_blocks') = 'array' then
    for blk in select * from jsonb_array_elements(listing_data -> 'unavailable_blocks')
    loop
      if nullif(btrim(coalesce(blk ->> 'start_date', '')), '') is not null
        and nullif(btrim(coalesce(blk ->> 'end_date', '')), '') is not null
        and (blk ->> 'end_date')::date > (blk ->> 'start_date')::date then
        insert into public.property_availability_blocks (
          property_id, start_date, end_date, block_type, source, note, created_by
        )
        values (
          created_property_id,
          (blk ->> 'start_date')::date,
          (blk ->> 'end_date')::date,
          case
            when coalesce(blk ->> 'block_type', '') in ('owner_block', 'external_booking', 'maintenance')
              then blk ->> 'block_type'
            else 'owner_block'
          end,
          'partner',
          nullif(btrim(coalesce(blk ->> 'note', '')), ''),
          actor_id
        );
      end if;
    end loop;
  end if;

  select coalesce(
    jsonb_agg(jsonb_build_object(
      'label', document ->> 'label',
      'status', case
        when document ->> 'status' = 'missing' then 'missing'
        else 'self_reported'
      end
    )),
    '[]'::jsonb
  )
  into submitted_docs
  from jsonb_array_elements(submission_data -> 'docs') as items(document);

  insert into public.property_private_records (property_id, record_type, record_data)
  values (
    created_property_id,
    'partner_submission',
    jsonb_build_object(
      'authority_basis', btrim(submission_data ->> 'authority_basis'),
      'submitted_role', submitted_role_text,
      'docs', submitted_docs
    )
  );

  return created_property_id;
end;
$$;

revoke all on function public.submit_partner_property(jsonb, jsonb) from public, anon;
grant execute on function public.submit_partner_property(jsonb, jsonb) to authenticated;

-- Allow admin review to transition paused/archived listings cleanly as well
create or replace function public.review_partner_property(
  target_property_id text,
  next_status text,
  reviewer_note text,
  verification_data jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_status text;
  current_title text;
  current_area text;
  current_address text;
  next_verification jsonb;
begin
  if (select auth.uid()) is null or not public.has_role('admin') then
    raise exception 'Only administrators can review properties.';
  end if;

  if next_status not in ('approved', 'needs_correction', 'rejected', 'suspended', 'paused', 'archived') then
    raise exception 'Unsupported property review status.';
  end if;

  if length(btrim(coalesce(reviewer_note, ''))) < 10 then
    raise exception 'A reviewer note of at least 10 characters is required.';
  end if;

  if jsonb_typeof(verification_data) is distinct from 'object'
    or coalesce(verification_data ->> 'ownership', '') not in ('verified', 'pending_review', 'missing', 'self_reported')
    or coalesce(verification_data ->> 'identity', '') not in ('verified', 'pending_review', 'missing', 'self_reported')
    or coalesce(verification_data ->> 'authority', '') not in ('verified', 'pending_review', 'missing', 'self_reported')
    or coalesce(verification_data ->> 'inspection', '') not in ('verified', 'pending_review', 'missing', 'self_reported') then
    raise exception 'All four verification outcomes must be supplied.';
  end if;

  select status, title, area, public_address
    into current_status, current_title, current_area, current_address
    from public.properties
    where id = target_property_id
    for update;

  if not found then
    raise exception 'Property not found.';
  end if;

  if current_status in ('submitted', 'needs_correction', 'draft')
    and next_status not in ('approved', 'needs_correction', 'rejected') then
    raise exception 'Invalid decision for a submitted property.';
  elsif current_status = 'approved' and next_status not in ('suspended', 'paused', 'archived') then
    raise exception 'Approved properties can only be paused, suspended, or archived.';
  elsif current_status in ('suspended', 'paused') and next_status not in ('approved', 'archived', 'suspended') then
    raise exception 'Suspended or paused properties can only be reinstated or archived.';
  elsif current_status in ('rejected', 'archived') then
    raise exception 'Rejected or archived listings cannot be changed; submit a new listing.';
  end if;

  next_verification := jsonb_build_object(
    'ownership', verification_data ->> 'ownership',
    'identity', verification_data ->> 'identity',
    'authority', verification_data ->> 'authority',
    'inspection', verification_data ->> 'inspection'
  );

  if next_status = 'approved' then
    if next_verification ->> 'ownership' <> 'verified'
      or next_verification ->> 'identity' <> 'verified'
      or next_verification ->> 'authority' <> 'verified'
      or next_verification ->> 'inspection' <> 'verified' then
      raise exception 'Ownership, identity, authority, and inspection must all be verified before approval.';
    end if;

    if exists (
      select 1
      from public.properties existing
      where existing.id <> target_property_id
        and existing.status = 'approved'
        and public.normalize_listing_text(existing.area) = public.normalize_listing_text(current_area)
        and public.normalize_listing_text(existing.public_address) = public.normalize_listing_text(current_address)
        and public.normalize_listing_text(existing.title) = public.normalize_listing_text(current_title)
    ) then
      raise exception 'Duplicate listing cannot be approved while another approved property uses the same title and address.';
    end if;
  end if;

  update public.properties
    set status = next_status,
        verification = next_verification,
        trust_label = case when next_status = 'approved' then 'HAMLET verified' else 'Under review' end,
        review_note = btrim(reviewer_note),
        updated_at = now()
    where id = target_property_id;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      (select auth.uid()),
      'admin',
      'property_' || next_status,
      current_title,
      'Status: ' || current_status || ' → ' || next_status || '. Reviewer note: ' || btrim(reviewer_note)
    );
end;
$$;

revoke all on function public.review_partner_property(text, text, text, jsonb) from public, anon;
grant execute on function public.review_partner_property(text, text, text, jsonb) to authenticated;

-- ─── 3. Partner Referral System, Attribution & Recurring 2.5% Model (§4, §8.1)

alter table public.profiles
  add column if not exists referral_code text unique,
  add column if not exists referred_by_partner_id uuid references public.profiles (id) on delete set null
    check (referred_by_partner_id is null or referred_by_partner_id <> id),
  add column if not exists referred_by_code text;

-- Populate referral codes for any existing partner/admin accounts
update public.profiles
  set referral_code = public.generate_unique_referral_code(coalesce(full_name, id::text))
  where role in ('partner', 'admin')
    and referral_code is null;

alter table public.partner_applications
  add column if not exists referred_by_code text,
  add column if not exists referred_by_partner_id uuid references public.profiles (id) on delete set null;

create table if not exists public.partner_referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_partner_id uuid not null references public.profiles (id) on delete restrict,
  referred_partner_id uuid not null unique references public.profiles (id) on delete cascade,
  referral_code text not null,
  status text not null default 'registered'
    check (status in ('registered', 'verified', 'active', 'expired', 'revoked', 'disputed')),
  earning_window_days integer not null default 90 check (earning_window_days between 1 and 365),
  registered_at timestamptz not null default now(),
  verified_at timestamptz,
  activated_at timestamptz,
  activating_booking_id text,
  eligibility_starts_at timestamptz,
  eligibility_ends_at timestamptz,
  dispute_note text,
  resolved_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (referrer_partner_id <> referred_partner_id)
);

create index if not exists partner_referrals_referrer_idx
  on public.partner_referrals (referrer_partner_id, status);

create table if not exists public.partner_referral_rewards (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.partner_referrals (id) on delete cascade,
  referrer_partner_id uuid not null references public.profiles (id) on delete restrict,
  referred_closing_agent_id uuid not null references public.profiles (id) on delete restrict,
  booking_id text not null unique references public.bookings (id) on delete cascade,
  booking_reference text not null,
  owner_listed_price_ngn integer not null check (owner_listed_price_ngn >= 0),
  reward_rate numeric(6, 4) not null default 0 check (reward_rate >= 0 and reward_rate <= 0.2000),
  reward_amount_ngn integer not null default 0 check (reward_amount_ngn >= 0),
  payout_status text not null default 'pending'
    check (payout_status in ('activated_no_payout', 'pending', 'approved', 'paid', 'reversed', 'withheld')),
  reversal_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partner_referral_rewards_referrer_idx
  on public.partner_referral_rewards (referrer_partner_id, created_at desc);

alter table public.partner_referrals enable row level security;
alter table public.partner_referral_rewards enable row level security;

drop policy if exists "Partners and admins can view relevant referrals" on public.partner_referrals;
create policy "Partners and admins can view relevant referrals"
  on public.partner_referrals for select to authenticated
  using (
    referrer_partner_id = (select auth.uid())
    or referred_partner_id = (select auth.uid())
    or public.has_role('admin')
  );

drop policy if exists "Partners and admins can view referral rewards" on public.partner_referral_rewards;
create policy "Partners and admins can view referral rewards"
  on public.partner_referral_rewards for select to authenticated
  using (
    referrer_partner_id = (select auth.uid())
    or public.has_role('admin')
  );

revoke all on public.partner_referrals, public.partner_referral_rewards from public, anon, authenticated;
grant select on public.partner_referrals, public.partner_referral_rewards to authenticated;
grant all on public.partner_referrals, public.partner_referral_rewards to service_role;

-- Validate referral code & block self-referrals / duplicate accounts during partner application
create or replace function public.validate_partner_application_referral()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_code text := upper(regexp_replace(btrim(coalesce(new.referred_by_code, '')), '[^A-Za-z0-9-]', '', 'g'));
  referrer_row public.profiles%rowtype;
  referrer_email text;
  existing_ref public.partner_referrals%rowtype;
begin
  if clean_code = '' then
    new.referred_by_code := null;
    new.referred_by_partner_id := null;
    return new;
  end if;

  select * into referrer_row
    from public.profiles
    where referral_code = clean_code
      and role in ('partner', 'admin')
      and account_status = 'active';

  if not found then
    raise exception 'Referral code % is not a valid active HAMLET partner code.', clean_code;
  end if;

  if referrer_row.id = new.applicant_id then
    raise exception 'Self-referrals are not permitted.';
  end if;

  select lower(btrim(coalesce(u.email, ''))) into referrer_email
    from auth.users u
    where u.id = referrer_row.id;

  if referrer_email <> '' and referrer_email = lower(btrim(coalesce(new.email, ''))) then
    raise exception 'Self-referrals using the same email address are not permitted.';
  end if;

  if referrer_row.phone is not null
    and regexp_replace(referrer_row.phone, '\D', '', 'g') <> ''
    and regexp_replace(referrer_row.phone, '\D', '', 'g') = regexp_replace(coalesce(new.phone, ''), '\D', '', 'g') then
    raise exception 'Self-referrals using the same phone number are not permitted.';
  end if;

  select * into existing_ref
    from public.partner_referrals
    where referred_partner_id = new.applicant_id;

  if found and existing_ref.referrer_partner_id <> referrer_row.id then
    raise exception 'This account already has a recorded direct referring partner.';
  end if;

  new.referred_by_code := clean_code;
  new.referred_by_partner_id := referrer_row.id;

  insert into public.partner_referrals (
    referrer_partner_id, referred_partner_id, referral_code, status, registered_at
  )
  values (
    referrer_row.id, new.applicant_id, clean_code, 'registered', now()
  )
  on conflict (referred_partner_id) do nothing;

  update public.profiles
    set referred_by_partner_id = coalesce(referred_by_partner_id, referrer_row.id),
        referred_by_code = coalesce(referred_by_code, clean_code)
    where id = new.applicant_id;

  return new;
end;
$$;

alter table public.partner_applications
  drop constraint if exists partner_applications_properties_count_check;
alter table public.partner_applications
  add constraint partner_applications_properties_count_check
  check (properties_count >= 0);

drop trigger if exists validate_partner_application_referral on public.partner_applications;
create trigger validate_partner_application_referral
  before insert on public.partner_applications
  for each row execute function public.validate_partner_application_referral();

-- Upgrade partner approval trigger to issue stable referral_code & verify direct referral
create or replace function public.approve_partner_application()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  generated_code text;
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    generated_code := public.generate_unique_referral_code(new.full_name);

    update public.profiles
      set role = 'partner',
          full_name = new.full_name,
          phone = new.phone,
          company = new.company,
          partner_role = new.role,
          referral_code = coalesce(referral_code, generated_code),
          referred_by_partner_id = coalesce(referred_by_partner_id, new.referred_by_partner_id),
          referred_by_code = coalesce(referred_by_code, new.referred_by_code)
      where id = new.applicant_id;

    if new.referred_by_partner_id is not null and new.referred_by_partner_id <> new.applicant_id then
      insert into public.partner_referrals (
        referrer_partner_id,
        referred_partner_id,
        referral_code,
        status,
        verified_at
      )
      values (
        new.referred_by_partner_id,
        new.applicant_id,
        coalesce(new.referred_by_code, 'DIRECT'),
        'verified',
        now()
      )
      on conflict (referred_partner_id) do update
        set status = case
              when public.partner_referrals.status = 'registered' then 'verified'
              else public.partner_referrals.status
            end,
            verified_at = coalesce(public.partner_referrals.verified_at, now()),
            updated_at = now();
    end if;
  end if;
  return new;
end;
$$;

-- Public-safe referral code lookup for registration & closing-agent stay links
create or replace function public.resolve_referral_code(code_input text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  clean_code text := upper(regexp_replace(btrim(coalesce(code_input, '')), '[^A-Za-z0-9-]', '', 'g'));
  partner_row public.profiles%rowtype;
begin
  if clean_code = '' then
    return jsonb_build_object('valid', false);
  end if;

  select * into partner_row
    from public.profiles
    where referral_code = clean_code
      and role in ('partner', 'admin')
      and account_status = 'active';

  if not found then
    return jsonb_build_object('valid', false, 'referral_code', clean_code);
  end if;

  return jsonb_build_object(
    'valid', true,
    'referral_code', partner_row.referral_code,
    'partner_id', partner_row.id,
    'partner_name', partner_row.full_name,
    'company', coalesce(partner_row.company, '')
  );
end;
$$;

grant execute on function public.resolve_referral_code(text)
  to anon, authenticated, service_role;

create or replace function public.ensure_my_referral_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  prof public.profiles%rowtype;
  new_code text;
begin
  if actor_id is null or not public.is_account_active() then
    raise exception 'Sign in with an active partner or admin account.';
  end if;

  select * into prof from public.profiles where id = actor_id for update;
  if not found or prof.role not in ('partner', 'admin') then
    raise exception 'Only approved partners and administrators have referral codes.';
  end if;

  if prof.referral_code is not null then
    return prof.referral_code;
  end if;

  new_code := public.generate_unique_referral_code(prof.full_name);
  update public.profiles set referral_code = new_code where id = actor_id;
  return new_code;
end;
$$;

revoke all on function public.ensure_my_referral_code() from public, anon;
grant execute on function public.ensure_my_referral_code() to authenticated;

-- Admin referral dispute & payout governance (§4.5)
create or replace function public.admin_resolve_referral_dispute(
  target_referral_id uuid,
  next_status text,
  resolution_note text,
  override_window_days integer default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  ref_row public.partner_referrals%rowtype;
  clean_note text := btrim(coalesce(resolution_note, ''));
begin
  if actor_id is null or not public.has_role('admin') or not public.is_account_active() then
    raise exception 'Only active administrators can resolve referral attribution disputes.';
  end if;

  if next_status not in ('verified', 'active', 'expired', 'revoked', 'disputed') then
    raise exception 'Unsupported referral status %.', next_status;
  end if;

  if length(clean_note) < 10 then
    raise exception 'A documented resolution note of at least 10 characters is required.';
  end if;

  select * into ref_row
    from public.partner_referrals
    where id = target_referral_id
    for update;

  if not found then
    raise exception 'Partner referral record not found.';
  end if;

  update public.partner_referrals
    set status = next_status,
        earning_window_days = coalesce(override_window_days, earning_window_days),
        eligibility_ends_at = case
          when activated_at is not null and override_window_days is not null
            then activated_at + make_interval(days => override_window_days)
          else eligibility_ends_at
        end,
        dispute_note = clean_note,
        resolved_by = actor_id,
        updated_at = now()
    where id = target_referral_id;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      'admin',
      'referral_' || next_status,
      ref_row.referral_code,
      'Referral ' || target_referral_id::text || ' (' || ref_row.status || ' → ' || next_status || '). ' || clean_note
    );
end;
$$;

revoke all on function public.admin_resolve_referral_dispute(uuid, text, text, integer) from public, anon;
grant execute on function public.admin_resolve_referral_dispute(uuid, text, text, integer) to authenticated;

-- ─── 4. Exchange Rate Configuration & International 10% Buffer (§6) ──────────

create table if not exists public.currency_exchange_rates (
  currency text primary key check (currency in ('USD', 'GBP')),
  currency_pair text not null check (currency_pair in ('NGN/USD', 'NGN/GBP')),
  ngn_per_unit numeric(14, 4) not null check (ngn_per_unit > 0),
  buffer_rate numeric(6, 4) not null default 0.1000 check (buffer_rate >= 0 and buffer_rate <= 0.5000),
  source text not null default 'hamlet_configured_reference',
  effective_at timestamptz not null default now(),
  expires_at timestamptz,
  is_active boolean not null default true,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.currency_exchange_rates enable row level security;

drop policy if exists "Anyone can read currency exchange rates" on public.currency_exchange_rates;
create policy "Anyone can read currency exchange rates"
  on public.currency_exchange_rates for select
  using (true);

revoke all on public.currency_exchange_rates from public, anon, authenticated;
grant select on public.currency_exchange_rates to anon, authenticated;
grant all on public.currency_exchange_rates to service_role;

insert into public.currency_exchange_rates (
  currency, currency_pair, ngn_per_unit, buffer_rate, source, effective_at, is_active
)
values
  ('USD', 'NGN/USD', 1600.0000, 0.1000, 'hamlet_configured_reference', now(), true),
  ('GBP', 'NGN/GBP', 2000.0000, 0.1000, 'hamlet_configured_reference', now(), true)
on conflict (currency) do nothing;

create or replace function public.upsert_exchange_rate_config(
  target_currency text,
  next_ngn_per_unit numeric,
  rate_source text,
  next_is_active boolean default true,
  next_expires_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  clean_curr text := upper(btrim(coalesce(target_currency, '')));
  clean_source text := btrim(coalesce(rate_source, ''));
  pair_label text;
begin
  if actor_id is null or not public.has_role('admin') or not public.is_account_active() then
    raise exception 'Only active administrators can configure exchange rates.';
  end if;

  if clean_curr not in ('USD', 'GBP') then
    raise exception 'Unsupported international currency %.', clean_curr;
  end if;

  if next_ngn_per_unit is null or next_ngn_per_unit <= 0 then
    raise exception 'Exchange rate must be greater than zero.';
  end if;

  if length(clean_source) < 3 then
    raise exception 'Provide a rate source label (min 3 characters).';
  end if;

  pair_label := 'NGN/' || clean_curr;

  insert into public.currency_exchange_rates (
    currency, currency_pair, ngn_per_unit, buffer_rate, source,
    effective_at, expires_at, is_active, updated_by, updated_at
  )
  values (
    clean_curr, pair_label, round(next_ngn_per_unit, 4), 0.1000, clean_source,
    now(), next_expires_at, coalesce(next_is_active, true), actor_id, now()
  )
  on conflict (currency) do update
    set ngn_per_unit = excluded.ngn_per_unit,
        source = excluded.source,
        effective_at = now(),
        expires_at = excluded.expires_at,
        is_active = excluded.is_active,
        updated_by = actor_id,
        updated_at = now();

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      'admin',
      'exchange_rate_updated',
      pair_label,
      pair_label || ' set to ' || round(next_ngn_per_unit, 4)::text
        || ' NGN (source: ' || clean_source
        || ', active: ' || coalesce(next_is_active, true)::text || ')'
    );
end;
$$;

revoke all on function public.upsert_exchange_rate_config(text, numeric, text, boolean, timestamptz)
  from public, anon;
grant execute on function public.upsert_exchange_rate_config(text, numeric, text, boolean, timestamptz)
  to authenticated;

-- ─── 5. Booking Pricing Snapshot, 5 Attributions & Caution Deposit (§5–§8) ───

alter table public.bookings
  add column if not exists property_introducer_id uuid references public.profiles (id) on delete set null,
  add column if not exists authorised_manager_id uuid references public.profiles (id) on delete set null,
  add column if not exists closing_agent_id uuid references public.profiles (id) on delete set null,
  add column if not exists direct_referrer_id uuid references public.profiles (id) on delete set null,
  add column if not exists guest_referral_source text,
  add column if not exists pricing_rules_version text not null default 'v2_20pct_markup_10pct_fx_buffer',
  add column if not exists owner_listed_price_ngn integer not null default 0 check (owner_listed_price_ngn >= 0),
  add column if not exists domestic_markup_rate numeric(6, 4) not null default 0.2000,
  add column if not exists domestic_markup_ngn integer not null default 0 check (domestic_markup_ngn >= 0),
  add column if not exists domestic_guest_price_ngn integer not null default 0 check (domestic_guest_price_ngn >= 0),
  add column if not exists closing_agent_commission_ngn integer not null default 0 check (closing_agent_commission_ngn >= 0),
  add column if not exists direct_referrer_reward_ngn integer not null default 0 check (direct_referrer_reward_ngn >= 0),
  add column if not exists hamlet_allocation_ngn integer not null default 0 check (hamlet_allocation_ngn >= 0),
  add column if not exists payment_reserve_ngn integer not null default 0 check (payment_reserve_ngn >= 0),
  add column if not exists actual_payment_fee_ngn integer not null default 0 check (actual_payment_fee_ngn >= 0),
  add column if not exists quote_currency text not null default 'NGN'
    check (quote_currency in ('NGN', 'USD', 'GBP')),
  add column if not exists currency_pair text not null default 'NGN/NGN'
    check (currency_pair in ('NGN/NGN', 'NGN/USD', 'NGN/GBP')),
  add column if not exists exchange_rate_ngn_per_unit numeric(14, 4) not null default 1.0000
    check (exchange_rate_ngn_per_unit > 0),
  add column if not exists exchange_rate_source text not null default 'domestic_ngn',
  add column if not exists exchange_rate_timestamp timestamptz not null default now(),
  add column if not exists international_buffer_rate numeric(6, 4) not null default 0.0000,
  add column if not exists converted_base_amount numeric(14, 2) not null default 0,
  add column if not exists international_buffer_amount numeric(14, 2) not null default 0,
  add column if not exists international_buffer_ngn_equiv integer not null default 0 check (international_buffer_ngn_equiv >= 0),
  add column if not exists quoted_guest_total numeric(14, 2) not null default 0,
  add column if not exists settlement_total_ngn integer not null default 0 check (settlement_total_ngn >= 0),
  add column if not exists quote_expires_at timestamptz;

-- Backfill existing booking rows if any exist
update public.bookings
  set owner_listed_price_ngn = accommodation_subtotal,
      domestic_markup_ngn = hamlet_guest_fee,
      domestic_guest_price_ngn = accommodation_subtotal + hamlet_guest_fee,
      quoted_guest_total = guest_total,
      settlement_total_ngn = guest_total
  where owner_listed_price_ngn = 0 and accommodation_subtotal > 0;

create table if not exists public.booking_caution_deposits (
  id uuid primary key default gen_random_uuid(),
  booking_id text not null unique references public.bookings (id) on delete cascade,
  property_id text not null references public.properties (id) on delete cascade,
  guest_id uuid not null references public.profiles (id) on delete cascade,
  amount_ngn integer not null check (amount_ngn >= 0),
  status text not null default 'due'
    check (status in (
      'due',
      'received',
      'inspection_pending',
      'refund_approved',
      'partially_refunded',
      'disputed',
      'refund_completed'
    )),
  deducted_amount_ngn integer not null default 0 check (deducted_amount_ngn >= 0),
  refunded_amount_ngn integer not null default 0 check (refunded_amount_ngn >= 0),
  collection_reference text,
  refund_reference text,
  inspection_notes text,
  deduction_reason text,
  evidence jsonb not null default '[]'::jsonb,
  decision_by uuid references public.profiles (id) on delete set null,
  decision_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (deducted_amount_ngn + refunded_amount_ngn <= amount_ngn)
);

alter table public.booking_caution_deposits enable row level security;

drop policy if exists "Guests, managers and admins can view caution deposits"
  on public.booking_caution_deposits;
create policy "Guests, managers and admins can view caution deposits"
  on public.booking_caution_deposits for select to authenticated
  using (
    guest_id = (select auth.uid())
    or public.can_manage_property(property_id)
  );

revoke all on public.booking_caution_deposits from public, anon, authenticated;
grant select on public.booking_caution_deposits to authenticated;
grant all on public.booking_caution_deposits to service_role;

-- Expand ledger record types & beneficiary payout tracking
alter table public.booking_payment_records
  add column if not exists beneficiary_user_id uuid references public.profiles (id) on delete set null,
  add column if not exists payout_status text not null default 'not_applicable'
    check (payout_status in ('not_applicable', 'pending', 'approved', 'paid', 'reversed', 'withheld'));

alter table public.booking_payment_records
  drop constraint if exists booking_payment_records_type_check;

alter table public.booking_payment_records
  add constraint booking_payment_records_type_check
  check (record_type in (
    'guest_charge',
    'guest_service_fee',
    'accommodation_revenue',
    'mandatory_charges',
    'provider_charge',
    'partner_commission',
    'closing_agent_commission',
    'referral_reward',
    'hamlet_allocation',
    'payment_reserve',
    'international_buffer',
    'deposit_hold',
    'caution_refund',
    'caution_deduction',
    'commission_reversal',
    'referral_reversal',
    'refund'
  ));

-- Allow partners to view their own commission / referral reward ledger lines in addition to property managers
drop policy if exists "Beneficiaries can read their own commission and referral ledger lines"
  on public.booking_payment_records;
create policy "Beneficiaries can read their own commission and referral ledger lines"
  on public.booking_payment_records for select to authenticated
  using (beneficiary_user_id = (select auth.uid()));

-- ─── 6. Authoritative Booking Request Trigger (20% Markup + 10% FX + Calendar)

create or replace function public.enforce_booking_request_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  listing public.properties%rowtype;
  stay_nights integer;
  charges jsonb;
  charges_total integer;
  owner_base_ngn integer;
  markup_ngn integer;
  domestic_accom_ngn integer;
  domestic_total_ngn integer;
  valid_closing_agent uuid := null;
  eligible_referrer uuid := null;
  closing_comm_ngn integer := 0;
  referrer_reward_ngn integer := 0;
  reserve_ngn integer := 0;
  hamlet_alloc_ngn integer := 0;
  requested_curr text := upper(btrim(coalesce(new.quote_currency, 'NGN')));
  fx_row public.currency_exchange_rates%rowtype;
  conv_base numeric(14, 2);
  intl_buf numeric(14, 2);
  intl_buf_ngn integer := 0;
  ref_row public.partner_referrals%rowtype;
begin
  if (select auth.uid()) is null
    or new.guest_id <> (select auth.uid())
    or not public.has_role('guest') then
    raise exception 'A booking must belong to the signed-in guest.';
  end if;

  if not public.is_account_active() then
    raise exception 'Your account is currently suspended. Contact HAMLET operations.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.property_id, 0));

  select * into listing
    from public.properties
    where id = new.property_id and status = 'approved';

  if not found then
    raise exception 'This stay is not available for booking requests.';
  end if;

  if new.guest_count > listing.capacity then
    raise exception 'Guest count exceeds this property capacity.';
  end if;

  stay_nights := new.check_out - new.check_in;
  if stay_nights < 1 or stay_nights > 60 then
    raise exception 'Stay dates must be between 1 and 60 nights.';
  end if;

  if new.check_in < current_date then
    raise exception 'Check-in cannot be in the past.';
  end if;

  if listing.first_available_date is not null and new.check_in < listing.first_available_date then
    raise exception 'This property is first available from %.', listing.first_available_date;
  end if;

  if exists (
    select 1 from public.bookings existing
    where existing.property_id = new.property_id
      and existing.check_in < new.check_out
      and existing.check_out > new.check_in
      and (
        existing.status = 'confirmed'
        or (
          existing.status = 'awaiting_payment'
          and (existing.payment_deadline is null or existing.payment_deadline > now())
        )
      )
  ) then
    raise exception 'Those dates conflict with an existing booking.';
  end if;

  if exists (
    select 1 from public.property_availability_blocks blk
    where blk.property_id = new.property_id
      and blk.start_date < new.check_out
      and blk.end_date > new.check_in
  ) then
    raise exception 'Those dates are marked unavailable on the property calendar.';
  end if;

  -- Independent attribution resolution (never inferred from property introducer/manager)
  new.property_introducer_id := listing.property_introducer_id;
  new.authorised_manager_id := listing.authorised_manager_id;

  if new.closing_agent_id is not null and new.closing_agent_id <> new.guest_id then
    if exists (
      select 1 from public.profiles p
      where p.id = new.closing_agent_id
        and p.role in ('partner', 'admin')
        and p.account_status = 'active'
    ) then
      valid_closing_agent := new.closing_agent_id;
    end if;
  elsif new.guest_referral_source is not null and new.guest_referral_source like 'HML-%' then
    select p.id into valid_closing_agent
      from public.profiles p
      where p.referral_code = upper(btrim(new.guest_referral_source))
        and p.role in ('partner', 'admin')
        and p.account_status = 'active'
        and p.id <> new.guest_id
      limit 1;
  end if;

  new.closing_agent_id := valid_closing_agent;

  -- Check if closing agent has an active qualifying direct referrer within 90-day window
  if valid_closing_agent is not null then
    select * into ref_row
      from public.partner_referrals pr
      join public.profiles referrer_prof on referrer_prof.id = pr.referrer_partner_id
      where pr.referred_partner_id = valid_closing_agent
        and pr.referrer_partner_id <> valid_closing_agent
        and referrer_prof.account_status = 'active'
        and pr.status in ('verified', 'active')
      limit 1;

    if found then
      new.direct_referrer_id := ref_row.referrer_partner_id;
      if ref_row.status = 'active'
        and ref_row.eligibility_ends_at is not null
        and ref_row.eligibility_ends_at > now() then
        eligible_referrer := ref_row.referrer_partner_id;
      end if;
    else
      new.direct_referrer_id := null;
    end if;
  else
    new.direct_referrer_id := null;
  end if;

  -- Single-source 20% domestic markup & internal allocation (§5.1 & §5.2)
  charges := coalesce(listing.mandatory_charges, '[]'::jsonb);
  charges_total := coalesce((
    select sum(greatest(0, round((charge ->> 'amount')::numeric)::integer))
    from jsonb_array_elements(charges) as item(charge)
  ), 0);

  owner_base_ngn := stay_nights * listing.nightly_rate;
  markup_ngn := public.multiply_ngn_bps(owner_base_ngn, 2000); -- 20.00%
  domestic_accom_ngn := owner_base_ngn + markup_ngn;
  domestic_total_ngn := domestic_accom_ngn + charges_total;

  reserve_ngn := public.multiply_ngn_bps(owner_base_ngn, 250); -- 2.50%
  if valid_closing_agent is not null then
    closing_comm_ngn := public.multiply_ngn_bps(owner_base_ngn, 1000); -- 10.00%
  end if;
  if eligible_referrer is not null then
    referrer_reward_ngn := public.multiply_ngn_bps(owner_base_ngn, 250); -- 2.50%
  end if;
  hamlet_alloc_ngn := greatest(0, markup_ngn - closing_comm_ngn - referrer_reward_ngn - reserve_ngn);

  new.pricing_rules_version := 'v2_20pct_markup_10pct_fx_buffer';
  new.owner_listed_price_ngn := owner_base_ngn;
  new.accommodation_subtotal := owner_base_ngn;
  new.domestic_markup_rate := 0.2000;
  new.domestic_markup_ngn := markup_ngn;
  new.hamlet_guest_fee := markup_ngn;
  new.domestic_guest_price_ngn := domestic_accom_ngn;
  new.mandatory_charges := charges;
  new.mandatory_total := charges_total;
  new.guest_total := domestic_total_ngn;
  new.refundable_deposit := listing.refundable_deposit;

  new.closing_agent_commission_ngn := closing_comm_ngn;
  new.direct_referrer_reward_ngn := referrer_reward_ngn;
  new.hamlet_allocation_ngn := hamlet_alloc_ngn;
  new.payment_reserve_ngn := reserve_ngn;
  new.actual_payment_fee_ngn := 0;

  -- International USD/GBP quote snapshot with 10% buffer applied once (§6.1–§6.3)
  if requested_curr in ('USD', 'GBP') then
    select * into fx_row
      from public.currency_exchange_rates
      where currency = requested_curr;

    if not found or not fx_row.is_active or fx_row.ngn_per_unit <= 0 then
      raise exception 'Exchange rate for % is currently unavailable. Please complete your booking in NGN.', requested_curr;
    end if;

    if fx_row.expires_at is not null and fx_row.expires_at <= now() then
      raise exception 'Exchange rate for % has expired. Please complete your booking in NGN or refresh rates.', requested_curr;
    end if;

    conv_base := round((domestic_total_ngn::numeric / fx_row.ngn_per_unit), 2);
    intl_buf := round(conv_base * fx_row.buffer_rate, 2);
    intl_buf_ngn := public.multiply_ngn_bps(domestic_total_ngn, round(fx_row.buffer_rate * 10000)::integer);

    new.quote_currency := requested_curr;
    new.currency_pair := fx_row.currency_pair;
    new.exchange_rate_ngn_per_unit := fx_row.ngn_per_unit;
    new.exchange_rate_source := fx_row.source;
    new.exchange_rate_timestamp := fx_row.effective_at;
    new.international_buffer_rate := fx_row.buffer_rate;
    new.converted_base_amount := conv_base;
    new.international_buffer_amount := intl_buf;
    new.international_buffer_ngn_equiv := intl_buf_ngn;
    new.quoted_guest_total := conv_base + intl_buf;
    new.settlement_total_ngn := domestic_total_ngn + intl_buf_ngn;
    new.quote_expires_at := now() + interval '30 minutes';
  else
    new.quote_currency := 'NGN';
    new.currency_pair := 'NGN/NGN';
    new.exchange_rate_ngn_per_unit := 1.0000;
    new.exchange_rate_source := 'domestic_ngn';
    new.exchange_rate_timestamp := now();
    new.international_buffer_rate := 0.0000;
    new.converted_base_amount := domestic_total_ngn;
    new.international_buffer_amount := 0;
    new.international_buffer_ngn_equiv := 0;
    new.quoted_guest_total := domestic_total_ngn;
    new.settlement_total_ngn := domestic_total_ngn;
    new.quote_expires_at := null;
  end if;

  new.status := 'requested';
  new.timeline := jsonb_build_array(jsonb_build_object(
    'at', now(),
    'label', 'Booking requested',
    'actor', 'Guest',
    'detail', case
      when new.quote_currency = 'NGN' then 'Awaiting availability and terms check'
      else 'Awaiting availability check · Quoted in ' || new.quote_currency || ' (includes 10% international currency buffer)'
    end
  ));

  return new;
end;
$$;

-- Create caution deposit tracking row automatically when booking has a refundable deposit
create or replace function public.initialize_booking_caution_deposit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.refundable_deposit > 0 then
    insert into public.booking_caution_deposits (
      booking_id, property_id, guest_id, amount_ngn, status
    )
    values (
      new.id, new.property_id, new.guest_id, new.refundable_deposit, 'due'
    )
    on conflict (booking_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists initialize_booking_caution_deposit on public.bookings;
create trigger initialize_booking_caution_deposit
  after insert on public.bookings
  for each row execute function public.initialize_booking_caution_deposit();

-- Refresh or switch FX quote on an awaiting_payment booking before Paystack checkout (§6.3)
create or replace function public.refresh_booking_fx_quote(
  target_booking_id text,
  target_currency text default 'NGN'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  booking_row public.bookings%rowtype;
  clean_curr text := upper(btrim(coalesce(target_currency, 'NGN')));
  fx_row public.currency_exchange_rates%rowtype;
  conv_base numeric(14, 2);
  intl_buf numeric(14, 2);
  intl_buf_ngn integer := 0;
  new_expiry timestamptz := null;
begin
  if actor_id is null or not public.is_account_active() then
    raise exception 'Sign in with an active guest account to refresh your booking quote.';
  end if;

  select * into booking_row
    from public.bookings
    where (id = target_booking_id or reference = target_booking_id)
      and guest_id = actor_id
    for update;

  if not found then
    raise exception 'Booking not found for your account.';
  end if;

  if booking_row.status not in ('requested', 'checking', 'awaiting_payment') then
    raise exception 'Quote currency cannot be changed once payment is confirmed or closed.';
  end if;

  if clean_curr not in ('NGN', 'USD', 'GBP') then
    raise exception 'Unsupported currency %.', clean_curr;
  end if;

  if clean_curr = 'NGN' then
    update public.bookings
      set quote_currency = 'NGN',
          currency_pair = 'NGN/NGN',
          exchange_rate_ngn_per_unit = 1.0000,
          exchange_rate_source = 'domestic_ngn',
          exchange_rate_timestamp = now(),
          international_buffer_rate = 0.0000,
          converted_base_amount = guest_total,
          international_buffer_amount = 0,
          international_buffer_ngn_equiv = 0,
          quoted_guest_total = guest_total,
          settlement_total_ngn = guest_total,
          quote_expires_at = null
      where id = booking_row.id;

    return jsonb_build_object(
      'quote_currency', 'NGN',
      'quoted_guest_total', booking_row.guest_total,
      'settlement_total_ngn', booking_row.guest_total
    );
  end if;

  select * into fx_row
    from public.currency_exchange_rates
    where currency = clean_curr;

  if not found or not fx_row.is_active or fx_row.ngn_per_unit <= 0
    or (fx_row.expires_at is not null and fx_row.expires_at <= now()) then
    raise exception 'Exchange rate for % is unavailable or expired. Continue in NGN.', clean_curr;
  end if;

  conv_base := round((booking_row.guest_total::numeric / fx_row.ngn_per_unit), 2);
  intl_buf := round(conv_base * fx_row.buffer_rate, 2);
  intl_buf_ngn := public.multiply_ngn_bps(booking_row.guest_total, round(fx_row.buffer_rate * 10000)::integer);
  new_expiry := now() + interval '30 minutes';

  update public.bookings
    set quote_currency = clean_curr,
        currency_pair = fx_row.currency_pair,
        exchange_rate_ngn_per_unit = fx_row.ngn_per_unit,
        exchange_rate_source = fx_row.source,
        exchange_rate_timestamp = fx_row.effective_at,
        international_buffer_rate = fx_row.buffer_rate,
        converted_base_amount = conv_base,
        international_buffer_amount = intl_buf,
        international_buffer_ngn_equiv = intl_buf_ngn,
        quoted_guest_total = conv_base + intl_buf,
        settlement_total_ngn = booking_row.guest_total + intl_buf_ngn,
        quote_expires_at = new_expiry
    where id = booking_row.id;

  return jsonb_build_object(
    'quote_currency', clean_curr,
    'converted_base_amount', conv_base,
    'international_buffer_amount', intl_buf,
    'quoted_guest_total', conv_base + intl_buf,
    'settlement_total_ngn', booking_row.guest_total + intl_buf_ngn,
    'quote_expires_at', new_expiry
  );
end;
$$;

revoke all on function public.refresh_booking_fx_quote(text, text) from public, anon;
grant execute on function public.refresh_booking_fx_quote(text, text) to authenticated;

-- ─── 7. Server-Verified Webhook Payment Confirmation & Reconcilable Ledger ───

create or replace function public.confirm_booking_payment_webhook(
  target_booking_id text,
  provider_name text,
  provider_ref text,
  paid_amount_naira integer,
  provider_fee_naira integer default 0,
  currency_code text default 'NGN'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_provider text := btrim(coalesce(provider_name, ''));
  clean_ref text := btrim(coalesce(provider_ref, ''));
  clean_currency text := upper(btrim(coalesce(currency_code, '')));
  booking_row public.bookings%rowtype;
  property_row public.properties%rowtype;
  stay_nights integer;
  expected_ngn integer;
  amount_variance integer;
  operator_label text;
  inserted_flag_id uuid;
  access_row record;
  commission_amount integer;
  shortfall_ngn integer;
begin
  if clean_provider = '' or clean_ref = '' then
    raise exception 'Payment provider name and provider reference are required.';
  end if;

  if clean_currency <> 'NGN' then
    raise exception 'Unsupported payment currency %. Only NGN settlement is accepted.', clean_currency;
  end if;

  if paid_amount_naira is null or paid_amount_naira < 0 then
    raise exception 'Paid amount must be a non-negative integer in Naira.';
  end if;

  if coalesce(provider_fee_naira, 0) < 0 then
    raise exception 'Provider fee must be non-negative.';
  end if;

  select * into booking_row
    from public.bookings
    where id = target_booking_id or reference = target_booking_id
    for update;

  if not found then
    raise exception 'Booking not found for payment confirmation.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(booking_row.property_id, 0));

  if exists (
    select 1
    from public.booking_payment_records existing_rec
    where existing_rec.provider_reference = clean_ref
      and existing_rec.booking_id <> booking_row.id
  ) then
    raise exception 'Provider reference % is already linked to another booking.', clean_ref;
  end if;

  if booking_row.status = 'confirmed' and booking_row.payment_reference = clean_ref then
    return jsonb_build_object(
      'status', 'already_confirmed',
      'booking_id', booking_row.id,
      'reference', booking_row.reference,
      'variance', 0
    );
  end if;

  if booking_row.status <> 'awaiting_payment' then
    raise exception 'Booking % cannot be confirmed from status %.', booking_row.reference, booking_row.status;
  end if;

  select * into property_row
    from public.properties
    where id = booking_row.property_id
    for update;

  if not found or property_row.status <> 'approved' then
    raise exception 'Property is no longer approved for booking confirmation.';
  end if;

  if booking_row.check_in < current_date then
    raise exception 'Booking check-in date has already passed.';
  end if;

  if booking_row.payment_deadline is not null and booking_row.payment_deadline <= now() then
    raise exception 'Booking payment deadline has already expired.';
  end if;

  if exists (
    select 1
    from public.bookings existing
    where existing.id <> booking_row.id
      and existing.property_id = booking_row.property_id
      and existing.status in ('confirmed', 'awaiting_payment')
      and (existing.status <> 'awaiting_payment' or existing.payment_deadline > now())
      and existing.check_in < booking_row.check_out
      and existing.check_out > booking_row.check_in
  ) then
    raise exception 'Booking dates now conflict with another active booking.';
  end if;

  if exists (
    select 1
    from public.property_availability_blocks blk
    where blk.property_id = booking_row.property_id
      and blk.start_date < booking_row.check_out
      and blk.end_date > booking_row.check_in
  ) then
    raise exception 'Booking dates now conflict with an unavailable calendar block.';
  end if;

  stay_nights := booking_row.check_out - booking_row.check_in;
  expected_ngn := case
    when booking_row.settlement_total_ngn > 0 then booking_row.settlement_total_ngn
    else booking_row.guest_total
  end;
  amount_variance := paid_amount_naira - expected_ngn;
  operator_label := 'System (' || clean_provider || ' webhook)';

  -- Underpayment: keep booking unconfirmed, flag ledger & audit for manual operations review
  if paid_amount_naira < expected_ngn then
    insert into public.booking_payment_records (
      booking_id, record_type, amount, provider_reference, status,
      description, variance, note, operator_name
    )
    values (
      booking_row.id,
      'guest_charge',
      paid_amount_naira,
      clean_ref,
      'flagged',
      'Underpaid webhook callback — booking held unconfirmed pending operations review',
      amount_variance,
      'Expected ' || expected_ngn || ' NGN; received ' || paid_amount_naira || ' NGN.',
      operator_label
    )
    on conflict (provider_reference, record_type, booking_id)
      where provider_reference is not null
    do nothing
    returning id into inserted_flag_id;

    if inserted_flag_id is not null then
      update public.bookings
        set timeline = coalesce(timeline, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
          'at', now(),
          'label', 'Payment amount mismatch flagged — manual review required',
          'actor', operator_label,
          'detail', 'Ref ' || clean_ref || ' · received ' || paid_amount_naira || ' NGN vs expected ' || expected_ngn || ' NGN'
        ))
        where id = booking_row.id;

      insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
        values (
          booking_row.guest_id,
          'system',
          'payment_amount_mismatch',
          booking_row.reference,
          'Webhook ref ' || clean_ref || ' underpaid: received ' || paid_amount_naira || ' NGN, expected ' || expected_ngn || ' NGN.'
        );
    end if;

    return jsonb_build_object(
      'status', 'flagged_underpayment',
      'booking_id', booking_row.id,
      'reference', booking_row.reference,
      'variance', amount_variance
    );
  end if;

  -- Confirm booking after server-side webhook & availability verification
  update public.bookings
    set status = 'confirmed',
        payment_provider = clean_provider,
        payment_reference = clean_ref,
        actual_payment_fee_ngn = coalesce(provider_fee_naira, 0),
        timeline = coalesce(timeline, '[]'::jsonb) || jsonb_build_array(
          jsonb_build_object(
            'at', now(),
            'label', 'Payment verified server-side via provider webhook',
            'actor', operator_label,
            'detail', 'Ref ' || clean_ref || ' · ' || paid_amount_naira || ' NGN'
          ),
          jsonb_build_object(
            'at', now(),
            'label', 'Booking confirmed — availability rechecked. No overlap.',
            'actor', 'HAMLET system',
            'detail', null
          )
        )
    where id = booking_row.id;

  -- 1. Guest payment collected
  insert into public.booking_payment_records (
    booking_id, record_type, amount, provider_reference, status,
    description, variance, note, operator_name
  )
  values (
    booking_row.id,
    'guest_charge',
    paid_amount_naira,
    clean_ref,
    case when amount_variance = 0 then 'reconciled' else 'flagged' end,
    'Guest payment verified via webhook (' || stay_nights || ' nights + mandatory charges + 20% domestic accommodation markup)',
    amount_variance,
    case when amount_variance = 0 then null else 'Overpayment variance recorded for manual reconciliation.' end,
    operator_label
  );

  -- 2. Owner accommodation revenue (100% of listed price B, 0% HAMLET owner fee)
  insert into public.booking_payment_records (
    booking_id, record_type, amount, provider_reference, status,
    description, variance, operator_name, payout_status
  )
  values (
    booking_row.id,
    'accommodation_revenue',
    booking_row.accommodation_subtotal,
    clean_ref,
    'recorded',
    'Owner accommodation revenue (' || stay_nights || ' nights · 0% HAMLET owner fee)',
    0,
    operator_label,
    'pending'
  );

  -- 3. Disclosed mandatory non-accommodation charges
  if booking_row.mandatory_total > 0 then
    insert into public.booking_payment_records (
      booking_id, record_type, amount, provider_reference, status,
      description, variance, operator_name, payout_status
    )
    values (
      booking_row.id,
      'mandatory_charges',
      booking_row.mandatory_total,
      clean_ref,
      'recorded',
      'Disclosed mandatory property charges (owner settlement)',
      0,
      operator_label,
      'pending'
    );
  end if;

  -- 4. HAMLET 20% domestic accommodation markup (headline fee line)
  insert into public.booking_payment_records (
    booking_id, record_type, amount, provider_reference, status,
    description, variance, operator_name
  )
  values (
    booking_row.id,
    'guest_service_fee',
    booking_row.hamlet_guest_fee,
    clean_ref,
    'reconciled',
    'HAMLET domestic accommodation markup (20.0% of owner listed price)',
    0,
    operator_label
  );

  -- 4a. Internal allocation of the 20% markup (§5.2 & §5.3):
  if booking_row.closing_agent_id is not null and booking_row.closing_agent_commission_ngn > 0 then
    insert into public.booking_payment_records (
      booking_id, record_type, amount, provider_reference, status,
      description, variance, operator_name, beneficiary_user_id, payout_status
    )
    values (
      booking_row.id,
      'closing_agent_commission',
      booking_row.closing_agent_commission_ngn,
      clean_ref || ':closing_agent',
      'recorded',
      'Closing agent commission allocation (10.0% of owner listed price — payable after stay completion)',
      0,
      operator_label,
      booking_row.closing_agent_id,
      'pending'
    );
  end if;

  if booking_row.payment_reserve_ngn > 0 then
    insert into public.booking_payment_records (
      booking_id, record_type, amount, provider_reference, status,
      description, variance, note, operator_name
    )
    values (
      booking_row.id,
      'payment_reserve',
      booking_row.payment_reserve_ngn,
      clean_ref || ':payment_reserve',
      'reconciled',
      'Internal payment & settlement cost reserve (2.5% of owner listed price)',
      0,
      'Internal budget allocation only — actual gateway charges are recorded separately in provider_charge.',
      operator_label
    );
  end if;

  if booking_row.hamlet_allocation_ngn > 0 then
    insert into public.booking_payment_records (
      booking_id, record_type, amount, provider_reference, status,
      description, variance, operator_name
    )
    values (
      booking_row.id,
      'hamlet_allocation',
      booking_row.hamlet_allocation_ngn,
      clean_ref || ':hamlet_allocation',
      'reconciled',
      'HAMLET net markup allocation (after closing agent, eligible referrer & 2.5% payment reserve)',
      0,
      operator_label
    );
  end if;

  -- 4b. International 10% currency buffer when quoted in USD/GBP (§6.2)
  if booking_row.international_buffer_ngn_equiv > 0 then
    insert into public.booking_payment_records (
      booking_id, record_type, amount, provider_reference, status,
      description, variance, note, operator_name
    )
    values (
      booking_row.id,
      'international_buffer',
      booking_row.international_buffer_ngn_equiv,
      clean_ref || ':fx_buffer',
      'reconciled',
      'International 10% currency & settlement buffer (' || booking_row.quote_currency || ' quote)',
      0,
      'Rate ' || booking_row.exchange_rate_ngn_per_unit::text || ' (' || booking_row.exchange_rate_source || '). Never inflates NGN commissions.',
      operator_label
    );
  end if;

  -- 5. Refundable caution deposit (excluded from 20% markup, 10% FX buffer & commissions)
  if booking_row.refundable_deposit > 0 then
    insert into public.booking_payment_records (
      booking_id, record_type, amount, provider_reference, status,
      description, variance, operator_name
    )
    values (
      booking_row.id,
      'deposit_hold',
      booking_row.refundable_deposit,
      clean_ref,
      'recorded',
      'Refundable caution deposit — tracked separately, excluded from markup & commissions',
      0,
      operator_label
    );

    insert into public.booking_caution_deposits (
      booking_id, property_id, guest_id, amount_ngn, status, collection_reference
    )
    values (
      booking_row.id, booking_row.property_id, booking_row.guest_id,
      booking_row.refundable_deposit, 'received', clean_ref
    )
    on conflict (booking_id) do update
      set status = case
            when public.booking_caution_deposits.status = 'due' then 'received'
            else public.booking_caution_deposits.status
          end,
          collection_reference = coalesce(public.booking_caution_deposits.collection_reference, clean_ref),
          updated_at = now();
  end if;

  -- 6. Actual provider processing charge (recorded separately from 2.5% internal reserve §5.3)
  if coalesce(provider_fee_naira, 0) > 0 then
    shortfall_ngn := greatest(0, provider_fee_naira - booking_row.payment_reserve_ngn);
    insert into public.booking_payment_records (
      booking_id, record_type, amount, provider_reference, status,
      description, variance, note, operator_name
    )
    values (
      booking_row.id,
      'provider_charge',
      provider_fee_naira,
      clean_ref,
      'recorded',
      'Actual payment gateway processing charge recorded for reconciliation',
      0,
      'Compared against ' || booking_row.payment_reserve_ngn || ' NGN internal reserve; '
        || case
             when shortfall_ngn > 0 then shortfall_ngn || ' NGN excess absorbed by HAMLET allocation (never deducted from owner or partner commissions).'
             else 'covered within 2.5% internal reserve (never deducted from owner or partner commissions).'
           end,
      operator_label
    );
  end if;

  -- 7. Explicitly agreed property co-host commissions (for non-closing-agent property mandates)
  for access_row in
    select user_id, commission_rate, commission_note
    from public.property_access
    where property_id = booking_row.property_id
      and status = 'active'
      and commission_rate is not null
      and commission_rate > 0
      and (booking_row.closing_agent_id is null or user_id <> booking_row.closing_agent_id)
  loop
    commission_amount := round(booking_row.accommodation_subtotal * access_row.commission_rate)::integer;
    if commission_amount > 0 then
      insert into public.booking_payment_records (
        booking_id, record_type, amount, provider_reference, status,
        description, variance, note, operator_name, beneficiary_user_id, payout_status
      )
      values (
        booking_row.id,
        'partner_commission',
        commission_amount,
        clean_ref || ':commission:' || access_row.user_id::text,
        'recorded',
        'Agreed partner commission (' || round(access_row.commission_rate * 100, 1) || '% of accommodation subtotal — manual settlement)',
        0,
        access_row.commission_note,
        operator_label,
        access_row.user_id,
        'pending'
      );
    end if;
  end loop;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      booking_row.guest_id,
      'system',
      'payment_verified',
      booking_row.reference,
      'Webhook verified (' || clean_provider || ' · ' || clean_ref || '). Paid: ' || paid_amount_naira || ' NGN; variance: ' || amount_variance || ' NGN.'
    );

  return jsonb_build_object(
    'status', 'confirmed',
    'booking_id', booking_row.id,
    'reference', booking_row.reference,
    'variance', amount_variance
  );
end;
$$;

revoke all on function public.confirm_booking_payment_webhook(text, text, text, integer, integer, text)
  from public, anon, authenticated;
grant execute on function public.confirm_booking_payment_webhook(text, text, text, integer, integer, text)
  to service_role;

-- ─── 8. Booking Lifecycle Transitions: Referral Activation, 2.5% Accrual & Reversals

create or replace function public.reverse_booking_commissions_and_referrals(
  target_booking_id text,
  reason_label text,
  actor_uuid uuid,
  operator_label text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  comm_row public.booking_payment_records%rowtype;
  rew_row public.partner_referral_rewards%rowtype;
begin
  -- Reverse any unpaid closing agent commission
  for comm_row in
    select * from public.booking_payment_records
    where booking_id = target_booking_id
      and record_type in ('closing_agent_commission', 'partner_commission')
      and payout_status in ('pending', 'approved')
    for update
  loop
    update public.booking_payment_records
      set payout_status = 'reversed',
          note = coalesce(note || ' · ', '') || 'Reversed: ' || reason_label,
          updated_at = now()
      where id = comm_row.id;

    insert into public.booking_payment_records (
      booking_id, record_type, amount, provider_reference, status,
      recorded_by, description, variance, note, operator_name, beneficiary_user_id, payout_status
    )
    values (
      target_booking_id,
      'commission_reversal',
      comm_row.amount,
      coalesce(comm_row.provider_reference, target_booking_id) || ':rev',
      'reconciled',
      actor_uuid,
      'Commission reversed due to ' || reason_label,
      0,
      reason_label,
      operator_label,
      comm_row.beneficiary_user_id,
      'reversed'
    )
    on conflict (provider_reference, record_type, booking_id)
      where provider_reference is not null
    do nothing;
  end loop;

  -- Reverse any unpaid referral reward (or rollback activation if activating booking was refunded!)
  select * into rew_row
    from public.partner_referral_rewards
    where booking_id = target_booking_id
    for update;

  if found and rew_row.payout_status in ('pending', 'approved', 'activated_no_payout') then
    update public.partner_referral_rewards
      set payout_status = 'reversed',
          reversal_reason = reason_label,
          updated_at = now()
      where id = rew_row.id;

    update public.booking_payment_records
      set payout_status = 'reversed',
          note = coalesce(note || ' · ', '') || 'Reversed: ' || reason_label,
          updated_at = now()
      where booking_id = target_booking_id
        and record_type = 'referral_reward'
        and payout_status in ('pending', 'approved');

    if rew_row.reward_amount_ngn > 0 then
      insert into public.booking_payment_records (
        booking_id, record_type, amount, provider_reference, status,
        recorded_by, description, variance, note, operator_name, beneficiary_user_id, payout_status
      )
      values (
        target_booking_id,
        'referral_reversal',
        rew_row.reward_amount_ngn,
        target_booking_id || ':referral_rev',
        'reconciled',
        actor_uuid,
        'Direct referrer reward reversed due to ' || reason_label,
        0,
        reason_label,
        operator_label,
        rew_row.referrer_partner_id,
        'reversed'
      )
      on conflict (provider_reference, record_type, booking_id)
        where provider_reference is not null
      do nothing;
    end if;
  end if;
end;
$$;

create or replace function public.transition_booking(
  target_booking_id text,
  next_status text,
  transition_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role text;
  actor_name text;
  booking_row public.bookings%rowtype;
  property_title text;
  event_label text;
  event_detail text;
  clean_note text := nullif(btrim(coalesce(transition_note, '')), '');
  new_deadline timestamptz;
  next_refund_status text;
  operator_label text;
  ref_row public.partner_referrals%rowtype;
  referrer_active boolean := false;
  agent_active boolean := false;
  reward_ngn integer := 0;
  updated_hamlet_alloc integer;
begin
  if actor_id is null then
    raise exception 'Sign in to update this booking.';
  end if;

  select role, full_name
    into actor_role, actor_name
    from public.profiles
    where id = actor_id;

  if actor_role is null then
    raise exception 'A valid HAMLET profile is required.';
  end if;

  select * into booking_row
    from public.bookings
    where id = target_booking_id
    for update;

  if not found then
    raise exception 'Booking not found.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(booking_row.property_id, 0));

  select title into property_title
    from public.properties
    where id = booking_row.property_id;

  next_refund_status := booking_row.refund_status;
  operator_label := coalesce(nullif(actor_name, ''), 'HAMLET user') || ' (' || actor_role || ')';

  if actor_role = 'guest' then
    if booking_row.guest_id <> actor_id
      or next_status <> 'cancelled'
      or booking_row.status not in ('requested', 'checking', 'awaiting_payment') then
      raise exception 'Guests may only cancel their own open booking requests.';
    end if;
    event_label := 'Booking cancelled by guest';
    event_detail := clean_note;
  elsif actor_role in ('partner', 'admin') then
    if not public.can_manage_property(booking_row.property_id) then
      raise exception 'You are not authorised to manage this property booking.';
    end if;

    if booking_row.status = 'requested' and next_status = 'checking' then
      event_label := 'Availability & terms being checked';
      event_detail := clean_note;
    elsif booking_row.status in ('requested', 'checking') and next_status = 'awaiting_payment' then
      perform 1
        from public.properties
        where id = booking_row.property_id
        for update;

      if booking_row.check_in < current_date then
        raise exception 'This booking has a check-in date in the past.';
      end if;

      if not exists (
        select 1 from public.properties
        where id = booking_row.property_id and status = 'approved'
      ) then
        raise exception 'This property is no longer approved for booking.';
      end if;

      if exists (
        select 1 from public.bookings existing
        where existing.id <> booking_row.id
          and existing.property_id = booking_row.property_id
          and existing.status in ('confirmed', 'awaiting_payment')
          and (existing.status <> 'awaiting_payment' or existing.payment_deadline > now())
          and existing.check_in < booking_row.check_out
          and existing.check_out > booking_row.check_in
      ) then
        raise exception 'These dates overlap another active booking. Recheck availability before accepting.';
      end if;

      if exists (
        select 1 from public.property_availability_blocks blk
        where blk.property_id = booking_row.property_id
          and blk.start_date < booking_row.check_out
          and blk.end_date > booking_row.check_in
      ) then
        raise exception 'These dates overlap an unavailable calendar block. Update the calendar before accepting.';
      end if;

      new_deadline := now() + interval '48 hours';
      event_label := 'Accepted — awaiting payment';
      event_detail := 'Payment deadline: ' || to_char(new_deadline, 'YYYY-MM-DD HH24:MI:SS TZ')
        || case when clean_note is null then '' else ' · ' || clean_note end;
    elsif booking_row.status in ('requested', 'checking') and next_status = 'declined' then
      event_label := 'Declined by property partner';
      event_detail := clean_note;
    elsif actor_role = 'admin' and booking_row.status = 'confirmed' and next_status = 'completed' then
      event_label := 'Stay completed';
      event_detail := clean_note;
    elsif actor_role = 'admin' and booking_row.status = 'confirmed' and next_status = 'no_show' then
      if length(coalesce(clean_note, '')) < 8 then
        raise exception 'A documented note (min 8 characters) is required to record a no-show.';
      end if;
      event_label := 'No-show recorded';
      event_detail := clean_note;
    elsif actor_role = 'admin' and booking_row.status in ('confirmed', 'completed') and next_status = 'disputed' then
      if length(coalesce(clean_note, '')) < 8 then
        raise exception 'A documented note (min 8 characters) is required to mark a booking disputed.';
      end if;
      event_label := 'Booking disputed — issue resolution in progress';
      event_detail := clean_note;
    elsif actor_role = 'admin'
      and booking_row.status in ('requested', 'checking', 'awaiting_payment', 'confirmed', 'disputed')
      and next_status = 'cancelled' then
      if length(coalesce(clean_note, '')) < 8 then
        raise exception 'A cancellation reason (min 8 characters) is required for operational cancellations.';
      end if;
      event_label := 'Booking cancelled by HAMLET operations';
      event_detail := clean_note;
      if booking_row.status in ('confirmed', 'disputed') and booking_row.refund_status = 'none' then
        next_refund_status := 'pending_review';
      end if;
    elsif actor_role = 'admin' and booking_row.status = 'awaiting_payment' and next_status = 'expired' then
      if booking_row.payment_deadline is null or booking_row.payment_deadline > now() then
        raise exception 'Cannot manually expire a booking before its payment deadline has elapsed.';
      end if;
      event_label := 'Payment deadline expired — booking expired';
      event_detail := coalesce(clean_note, 'Availability released after the payment deadline.');
    else
      raise exception 'Invalid booking transition from % to %.', booking_row.status, next_status;
    end if;
  else
    raise exception 'This account role cannot update bookings.';
  end if;

  update public.bookings
    set status = next_status,
        payment_deadline = case when next_status = 'awaiting_payment' then new_deadline else payment_deadline end,
        cancel_reason = case when next_status = 'cancelled' then event_detail else cancel_reason end,
        refund_status = next_refund_status,
        timeline = coalesce(timeline, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
          'at', now(),
          'label', event_label,
          'actor', operator_label,
          'detail', event_detail
        ))
    where id = booking_row.id;

  -- Post-stay completion hooks: caution deposit inspection + closing agent approval + referral activation/2.5% reward
  if next_status = 'completed' then
    update public.booking_caution_deposits
      set status = case when status = 'received' then 'inspection_pending' else status end,
          updated_at = now()
      where booking_id = booking_row.id;

    update public.booking_payment_records
      set payout_status = 'approved',
          updated_at = now()
      where booking_id = booking_row.id
        and record_type in ('closing_agent_commission', 'accommodation_revenue', 'mandatory_charges')
        and payout_status = 'pending';

    if booking_row.closing_agent_id is not null then
      select (account_status = 'active') into agent_active
        from public.profiles
        where id = booking_row.closing_agent_id;

      select * into ref_row
        from public.partner_referrals
        where referred_partner_id = booking_row.closing_agent_id
        for update;

      if found and ref_row.referrer_partner_id <> booking_row.closing_agent_id then
        select (account_status = 'active') into referrer_active
          from public.profiles
          where id = ref_row.referrer_partner_id;

        if agent_active and referrer_active then
          if ref_row.status = 'verified' and ref_row.activated_at is null then
            -- First completed eligible booking activates the referral relationship (₦0 reward) and opens 90-day window!
            update public.partner_referrals
              set status = 'active',
                  activated_at = now(),
                  activating_booking_id = booking_row.id,
                  eligibility_starts_at = now(),
                  eligibility_ends_at = now() + make_interval(days => ref_row.earning_window_days),
                  updated_at = now()
              where id = ref_row.id;

            insert into public.partner_referral_rewards (
              referral_id, referrer_partner_id, referred_closing_agent_id,
              booking_id, booking_reference, owner_listed_price_ngn,
              reward_rate, reward_amount_ngn, payout_status
            )
            values (
              ref_row.id, ref_row.referrer_partner_id, booking_row.closing_agent_id,
              booking_row.id, booking_row.reference, booking_row.accommodation_subtotal,
              0.0000, 0, 'activated_no_payout'
            )
            on conflict (booking_id) do nothing;

          elsif ref_row.status = 'active'
            and ref_row.activating_booking_id is distinct from booking_row.id
            and ref_row.eligibility_ends_at is not null then

            if now() <= ref_row.eligibility_ends_at then
              -- Subsequent completed eligible booking within 90-day window -> 2.5% of owner listed price B!
              reward_ngn := public.multiply_ngn_bps(booking_row.accommodation_subtotal, 250);
              updated_hamlet_alloc := greatest(
                0,
                booking_row.domestic_markup_ngn
                  - booking_row.closing_agent_commission_ngn
                  - reward_ngn
                  - booking_row.payment_reserve_ngn
              );

              insert into public.partner_referral_rewards (
                referral_id, referrer_partner_id, referred_closing_agent_id,
                booking_id, booking_reference, owner_listed_price_ngn,
                reward_rate, reward_amount_ngn, payout_status
              )
              values (
                ref_row.id, ref_row.referrer_partner_id, booking_row.closing_agent_id,
                booking_row.id, booking_row.reference, booking_row.accommodation_subtotal,
                0.0250, reward_ngn, 'pending'
              )
              on conflict (booking_id) do nothing;

              update public.bookings
                set direct_referrer_id = ref_row.referrer_partner_id,
                    direct_referrer_reward_ngn = reward_ngn,
                    hamlet_allocation_ngn = updated_hamlet_alloc
                where id = booking_row.id;

              insert into public.booking_payment_records (
                booking_id, record_type, amount, provider_reference, status,
                recorded_by, description, variance, operator_name, beneficiary_user_id, payout_status
              )
              values (
                booking_row.id,
                'referral_reward',
                reward_ngn,
                coalesce(booking_row.payment_reference, booking_row.id) || ':referral_reward',
                'recorded',
                actor_id,
                'Direct partner referral reward (2.5% of owner listed price within 90-day window)',
                0,
                operator_label,
                ref_row.referrer_partner_id,
                'pending'
              )
              on conflict (provider_reference, record_type, booking_id)
                where provider_reference is not null
              do nothing;

              update public.booking_payment_records
                set amount = updated_hamlet_alloc,
                    updated_at = now()
                where booking_id = booking_row.id
                  and record_type = 'hamlet_allocation';
            else
              update public.partner_referrals
                set status = 'expired', updated_at = now()
                where id = ref_row.id;
            end if;
          end if;
        end if;
      end if;
    end if;
  elsif next_status in ('cancelled', 'no_show') then
    perform public.reverse_booking_commissions_and_referrals(
      booking_row.id,
      next_status,
      actor_id,
      operator_label
    );
  end if;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      actor_role,
      'booking_' || next_status,
      booking_row.reference,
      'Property: ' || coalesce(property_title, booking_row.property_id)
        || '; previous status: ' || booking_row.status
        || '; new status: ' || next_status
        || case when event_detail is null then '' else '; ' || event_detail end
    );
end;
$$;

revoke all on function public.transition_booking(text, text, text) from public, anon;
grant execute on function public.transition_booking(text, text, text) to authenticated;

-- Extend record_booking_refund to reverse commissions & referral rewards and respect settlement_total_ngn
create or replace function public.record_booking_refund(
  target_booking_id text,
  refund_amount_naira integer,
  provider_ref text default null,
  refund_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  admin_name text;
  booking_row public.bookings%rowtype;
  max_refundable integer;
  clean_note text := btrim(coalesce(refund_note, ''));
  clean_ref text := nullif(btrim(coalesce(provider_ref, '')), '');
  operator_label text;
begin
  if actor_id is null or not public.has_role('admin') then
    raise exception 'Only administrators can record booking refunds.';
  end if;

  if length(clean_note) < 8 then
    raise exception 'A refund note (min 8 characters) is required.';
  end if;

  select full_name into admin_name
    from public.profiles
    where id = actor_id;

  select * into booking_row
    from public.bookings
    where id = target_booking_id
    for update;

  if not found then
    raise exception 'Booking not found.';
  end if;

  if booking_row.status not in ('cancelled', 'disputed', 'no_show') then
    raise exception 'Refunds can only be recorded for cancelled, disputed, or no-show bookings.';
  end if;

  max_refundable := greatest(booking_row.guest_total, booking_row.settlement_total_ngn) + booking_row.refundable_deposit;
  if refund_amount_naira is null or refund_amount_naira <= 0 or refund_amount_naira > max_refundable then
    raise exception 'Refund amount must be positive and cannot exceed booking total plus deposit (% NGN).', max_refundable;
  end if;

  operator_label := coalesce(nullif(admin_name, ''), 'HAMLET administrator');

  update public.bookings
    set status = 'refunded',
        refund_status = 'processed',
        refund_amount = refund_amount_naira,
        timeline = coalesce(timeline, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
          'at', now(),
          'label', 'Refund processed',
          'actor', operator_label || ' (admin)',
          'detail', refund_amount_naira || ' NGN · ' || clean_note
            || case when clean_ref is null then '' else ' · Ref ' || clean_ref end
        ))
    where id = booking_row.id;

  insert into public.booking_payment_records (
    booking_id, record_type, amount, provider_reference, status,
    recorded_by, description, variance, note, operator_name
  )
  values (
    booking_row.id,
    'refund',
    refund_amount_naira,
    clean_ref,
    'reconciled',
    actor_id,
    'Guest refund processed — ' || clean_note,
    0,
    clean_note,
    operator_label
  );

  perform public.reverse_booking_commissions_and_referrals(
    booking_row.id,
    'refunded (' || clean_note || ')',
    actor_id,
    operator_label
  );

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      'admin',
      'booking_refunded',
      booking_row.reference,
      'Refunded ' || refund_amount_naira || ' NGN'
        || case when clean_ref is null then '' else ' (ref ' || clean_ref || ')' end
        || ': ' || clean_note
    );
end;
$$;

revoke all on function public.record_booking_refund(text, integer, text, text) from public, anon;
grant execute on function public.record_booking_refund(text, integer, text, text) to authenticated;

-- ─── 9. Caution Deposit Inspection, Deduction & Refund Workflow (§7) ─────────

create or replace function public.transition_caution_deposit(
  target_booking_id text,
  next_status text,
  deducted_ngn integer default 0,
  refunded_ngn integer default 0,
  inspection_note text default null,
  deduction_note text default null,
  refund_ref text default null,
  evidence_items jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role text;
  actor_name text;
  dep_row public.booking_caution_deposits%rowtype;
  booking_ref text;
  clean_inspection text := nullif(btrim(coalesce(inspection_note, '')), '');
  clean_deduction text := nullif(btrim(coalesce(deduction_note, '')), '');
  clean_ref text := nullif(btrim(coalesce(refund_ref, '')), '');
  operator_label text;
begin
  if actor_id is null or not public.is_account_active() then
    raise exception 'Sign in with an active account to manage caution deposits.';
  end if;

  select * into dep_row
    from public.booking_caution_deposits
    where booking_id = target_booking_id
    for update;

  if not found then
    raise exception 'Caution deposit record not found for this booking.';
  end if;

  select role, full_name into actor_role, actor_name
    from public.profiles
    where id = actor_id;

  if actor_role = 'partner' then
    if not public.can_manage_property(dep_row.property_id) then
      raise exception 'You are not authorised to submit inspection reports for this property.';
    end if;
    if next_status not in ('inspection_pending', 'disputed') then
      raise exception 'Partners may submit inspection notes or flag caution deposit disputes; final refund execution requires HAMLET admin.';
    end if;
  elsif actor_role <> 'admin' then
    raise exception 'Only property managers and administrators can update caution deposits.';
  end if;

  if next_status not in (
    'due', 'received', 'inspection_pending', 'refund_approved',
    'partially_refunded', 'disputed', 'refund_completed'
  ) then
    raise exception 'Unsupported caution deposit status %.', next_status;
  end if;

  if coalesce(deducted_ngn, 0) < 0 or coalesce(refunded_ngn, 0) < 0 then
    raise exception 'Caution deduction and refund amounts must be non-negative.';
  end if;

  if coalesce(deducted_ngn, 0) + coalesce(refunded_ngn, 0) > dep_row.amount_ngn then
    raise exception 'Combined deduction and refund cannot exceed caution deposit (% NGN).', dep_row.amount_ngn;
  end if;

  if coalesce(deducted_ngn, 0) > 0 and length(coalesce(clean_deduction, '')) < 8 then
    raise exception 'A documented deduction reason (min 8 characters) is required when deducting from a caution deposit.';
  end if;

  select reference into booking_ref from public.bookings where id = dep_row.booking_id;
  operator_label := coalesce(nullif(actor_name, ''), 'HAMLET operator');

  update public.booking_caution_deposits
    set status = next_status,
        deducted_amount_ngn = coalesce(deducted_ngn, deducted_amount_ngn),
        refunded_amount_ngn = coalesce(refunded_ngn, refunded_amount_ngn),
        inspection_notes = coalesce(clean_inspection, inspection_notes),
        deduction_reason = coalesce(clean_deduction, deduction_reason),
        refund_reference = coalesce(clean_ref, refund_reference),
        evidence = coalesce(evidence_items, evidence),
        decision_by = case when actor_role = 'admin' then actor_id else decision_by end,
        decision_at = case when actor_role = 'admin' then now() else decision_at end,
        updated_at = now()
    where id = dep_row.id;

  if actor_role = 'admin' and next_status in ('partially_refunded', 'refund_completed') then
    if coalesce(deducted_ngn, 0) > 0 then
      insert into public.booking_payment_records (
        booking_id, record_type, amount, provider_reference, status,
        recorded_by, description, variance, note, operator_name
      )
      values (
        dep_row.booking_id,
        'caution_deduction',
        deducted_ngn,
        coalesce(clean_ref, dep_row.booking_id) || ':caution_deduction',
        'reconciled',
        actor_id,
        'Caution deposit deduction — ' || coalesce(clean_deduction, 'Inspection damage recovery'),
        0,
        clean_deduction,
        operator_label
      )
      on conflict (provider_reference, record_type, booking_id)
        where provider_reference is not null
      do nothing;
    end if;

    if coalesce(refunded_ngn, 0) > 0 then
      insert into public.booking_payment_records (
        booking_id, record_type, amount, provider_reference, status,
        recorded_by, description, variance, note, operator_name
      )
      values (
        dep_row.booking_id,
        'caution_refund',
        refunded_ngn,
        coalesce(clean_ref, dep_row.booking_id) || ':caution_refund',
        'reconciled',
        actor_id,
        'Caution deposit refunded to guest post-inspection',
        0,
        clean_inspection,
        operator_label
      )
      on conflict (provider_reference, record_type, booking_id)
        where provider_reference is not null
      do nothing;
    end if;
  end if;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      actor_role,
      'caution_deposit_' || next_status,
      coalesce(booking_ref, dep_row.booking_id),
      'Caution deposit (' || dep_row.amount_ngn || ' NGN) → ' || next_status
        || '; deducted: ' || coalesce(deducted_ngn, 0) || ' NGN'
        || '; refunded: ' || coalesce(refunded_ngn, 0) || ' NGN'
    );
end;
$$;

revoke all on function public.transition_caution_deposit(text, text, integer, integer, text, text, text, jsonb)
  from public, anon;
grant execute on function public.transition_caution_deposit(text, text, integer, integer, text, text, text, jsonb)
  to authenticated;

-- Extend record_ledger_adjustment to accept all new ledger entry types + payout governance RPC
create or replace function public.record_ledger_adjustment(
  target_booking_id text,
  entry_type text,
  entry_amount integer,
  entry_status text,
  entry_description text,
  provider_ref text default null,
  entry_variance integer default 0,
  entry_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  admin_name text;
  booking_row public.bookings%rowtype;
  created_id uuid;
  clean_desc text := btrim(coalesce(entry_description, ''));
  clean_note text := nullif(btrim(coalesce(entry_note, '')), '');
  clean_ref text := nullif(btrim(coalesce(provider_ref, '')), '');
begin
  if actor_id is null or not public.has_role('admin') then
    raise exception 'Only administrators can record manual ledger entries.';
  end if;

  if entry_type not in (
    'guest_charge', 'guest_service_fee', 'accommodation_revenue',
    'mandatory_charges', 'provider_charge', 'partner_commission',
    'closing_agent_commission', 'referral_reward', 'hamlet_allocation',
    'payment_reserve', 'international_buffer', 'deposit_hold',
    'caution_refund', 'caution_deduction', 'commission_reversal',
    'referral_reversal', 'refund'
  ) then
    raise exception 'Unsupported ledger entry type %.', entry_type;
  end if;

  if entry_status not in ('recorded', 'reconciled', 'settled', 'pending', 'flagged') then
    raise exception 'Unsupported ledger status %.', entry_status;
  end if;

  if entry_amount is null or entry_amount < 0 then
    raise exception 'Ledger entry amount must be a non-negative integer.';
  end if;

  if length(clean_desc) < 8 then
    raise exception 'A description of at least 8 characters is required.';
  end if;

  select * into booking_row
    from public.bookings
    where id = target_booking_id or reference = target_booking_id;

  if not found then
    raise exception 'Booking not found for ledger adjustment.';
  end if;

  select full_name into admin_name
    from public.profiles
    where id = actor_id;

  insert into public.booking_payment_records (
    booking_id, record_type, amount, provider_reference, status,
    recorded_by, description, variance, note, operator_name
  )
  values (
    booking_row.id,
    entry_type,
    entry_amount,
    clean_ref,
    entry_status,
    actor_id,
    clean_desc,
    coalesce(entry_variance, 0),
    clean_note,
    coalesce(nullif(admin_name, ''), 'HAMLET administrator')
  )
  returning id into created_id;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      'admin',
      'ledger_adjustment_recorded',
      booking_row.reference,
      'Recorded ' || entry_type || ' (' || entry_amount || ' NGN, ' || entry_status || '): ' || clean_desc
    );

  return created_id;
end;
$$;

revoke all on function public.record_ledger_adjustment(text, text, integer, text, text, text, integer, text)
  from public, anon;
grant execute on function public.record_ledger_adjustment(text, text, integer, text, text, text, integer, text)
  to authenticated;

create or replace function public.update_payout_status(
  target_entry_id uuid,
  next_payout_status text,
  payout_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  entry_row public.booking_payment_records%rowtype;
  clean_note text := nullif(btrim(coalesce(payout_note, '')), '');
begin
  if actor_id is null or not public.has_role('admin') or not public.is_account_active() then
    raise exception 'Only active administrators can update payout statuses.';
  end if;

  if next_payout_status not in ('pending', 'approved', 'paid', 'reversed', 'withheld') then
    raise exception 'Unsupported payout status %.', next_payout_status;
  end if;

  select * into entry_row
    from public.booking_payment_records
    where id = target_entry_id
    for update;

  if not found then
    raise exception 'Ledger entry not found.';
  end if;

  update public.booking_payment_records
    set payout_status = next_payout_status,
        status = case when next_payout_status = 'paid' then 'settled' else status end,
        note = coalesce(clean_note, note),
        updated_at = now()
    where id = target_entry_id;

  if entry_row.record_type = 'referral_reward' then
    update public.partner_referral_rewards
      set payout_status = next_payout_status,
          updated_at = now()
      where booking_id = entry_row.booking_id;
  end if;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      'admin',
      'payout_' || next_payout_status,
      entry_row.booking_id,
      entry_row.record_type || ' (' || entry_row.amount || ' NGN) payout → ' || next_payout_status
        || case when clean_note is null then '' else ': ' || clean_note end
    );
end;
$$;

revoke all on function public.update_payout_status(uuid, text, text) from public, anon;
grant execute on function public.update_payout_status(uuid, text, text) to authenticated;

-- Automatically assign a unique referral_code whenever a profile becomes partner or admin
create or replace function public.assign_profile_referral_code_on_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role in ('partner', 'admin') and new.referral_code is null then
    new.referral_code := public.generate_unique_referral_code(coalesce(new.full_name, new.id::text));
  end if;
  return new;
end;
$$;

drop trigger if exists assign_profile_referral_code_on_role on public.profiles;
create trigger assign_profile_referral_code_on_role
  before insert or update of role on public.profiles
  for each row execute function public.assign_profile_referral_code_on_role();

-- Explicit service_role grants on all new tables & functions
grant all on
  public.property_availability_blocks,
  public.partner_referrals,
  public.partner_referral_rewards,
  public.currency_exchange_rates,
  public.booking_caution_deposits
to service_role;
