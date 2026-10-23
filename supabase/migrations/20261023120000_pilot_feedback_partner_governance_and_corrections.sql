-- ============================================================================
-- HAMLET Release 1 — Partner account suspension & reinstatement, structured
-- property correction & resubmission, Lagos-only geography guard, private
-- pilot guest feedback, and privacy-safe date availability lookup.
-- ============================================================================

-- ─── 1. Partner account status, suspension & reinstatement ──────────────────

alter table public.profiles
  add column if not exists account_status text not null default 'active'
    check (account_status in ('active', 'suspended')),
  add column if not exists suspended_at timestamptz,
  add column if not exists suspension_reason text;

create or replace function public.is_account_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and account_status = 'active'
  );
$$;

revoke all on function public.is_account_active() from public, anon;
grant execute on function public.is_account_active() to authenticated, service_role;

-- Suspended partners lose management privileges immediately while admins retain oversight.
create or replace function public.can_manage_property(target_property_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role('admin')
    or exists (
      select 1
      from public.property_access pa
      join public.profiles p on p.id = pa.user_id
      where pa.property_id = target_property_id
        and pa.user_id = (select auth.uid())
        and pa.status = 'active'
        and p.account_status = 'active'
    );
$$;

-- Allow partners to still view their own assigned/submitted listings in read-only mode even if suspended.
drop policy if exists "Partners can read their own assigned properties" on public.properties;
create policy "Partners can read their own assigned properties"
  on public.properties for select to authenticated
  using (
    exists (
      select 1
      from public.property_access pa
      where pa.property_id = properties.id
        and pa.user_id = (select auth.uid())
        and pa.status = 'active'
    )
  );

create or replace function public.set_partner_account_status(
  target_partner_id uuid,
  next_status text,
  reason_note text,
  cascade_suspend_properties boolean default true
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  partner_record public.profiles%rowtype;
  clean_reason text := btrim(coalesce(reason_note, ''));
  cascaded_count integer := 0;
begin
  if actor_id is null or not public.has_role('admin') then
    raise exception 'Only administrators can suspend or reinstate partner accounts.';
  end if;

  if next_status not in ('active', 'suspended') then
    raise exception 'Unsupported partner account status %.', next_status;
  end if;

  if length(clean_reason) < 10 then
    raise exception 'A documented reason of at least 10 characters is required.';
  end if;

  select * into partner_record
    from public.profiles
    where id = target_partner_id
    for update;

  if not found or partner_record.role <> 'partner' then
    raise exception 'Target account must be an existing partner profile.';
  end if;

  if partner_record.account_status = next_status then
    raise exception 'Partner account is already %.', next_status;
  end if;

  update public.profiles
    set account_status = next_status,
        suspended_at = case when next_status = 'suspended' then now() else null end,
        suspension_reason = case when next_status = 'suspended' then clean_reason else null end
    where id = target_partner_id;

  if next_status = 'suspended' and coalesce(cascade_suspend_properties, true) then
    with affected as (
      update public.properties prop
        set status = 'suspended',
            trust_label = 'Under review',
            review_note = 'Listing suspended following partner account suspension: ' || clean_reason,
            updated_at = now()
        where prop.status = 'approved'
          and exists (
            select 1
            from public.property_access pa
            where pa.property_id = prop.id
              and pa.user_id = target_partner_id
              and pa.status = 'active'
              and pa.access_role in ('submitter', 'owner', 'Property Owner')
          )
        returning prop.id, prop.title
    )
    select count(*) into cascaded_count from affected;
  end if;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      'admin',
      case when next_status = 'suspended' then 'partner_suspended' else 'partner_reinstated' end,
      coalesce(nullif(partner_record.full_name, ''), target_partner_id::text),
      case
        when next_status = 'suspended' then
          'Partner account suspended (' || cascaded_count || ' approved listing(s) suspended). Reason: ' || clean_reason
        else
          'Partner account reinstated to active. Note: ' || clean_reason
      end
    );
end;
$$;

revoke all on function public.set_partner_account_status(uuid, text, text, boolean) from public, anon;
grant execute on function public.set_partner_account_status(uuid, text, text, boolean) to authenticated;

-- Prevent granting new assignments to suspended partner accounts.
create or replace function public.grant_property_assignment(
  target_property_id text,
  target_partner_id uuid,
  authority_scope text,
  agreed_commission_rate numeric default null,
  agreed_commission_note text default ''
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  prop_title text;
  prop_status text;
  partner_role_val text;
  partner_acct_status text;
  partner_label text;
  partner_sub_role text;
  clean_scope text := btrim(coalesce(authority_scope, ''));
  clean_comm_note text := btrim(coalesce(agreed_commission_note, ''));
begin
  if actor_id is null or not public.has_role('admin') then
    raise exception 'Only administrators can grant property assignments.';
  end if;

  if length(clean_scope) < 5 then
    raise exception 'Provide a clear authority scope (min 5 characters).';
  end if;

  if agreed_commission_rate is not null then
    if agreed_commission_rate <= 0 or agreed_commission_rate > 1 then
      raise exception 'Commission rate must be greater than 0 and at most 1.0 (100 percent) when specified.';
    end if;
    if length(clean_comm_note) < 8 then
      raise exception 'A written agreement reference (min 8 characters) is required whenever a commission is recorded.';
    end if;
  end if;

  select title, status
    into prop_title, prop_status
    from public.properties
    where id = target_property_id;

  if not found then
    raise exception 'Property not found.';
  end if;

  if prop_status <> 'approved' then
    raise exception 'Only approved properties can receive partner operational assignments.';
  end if;

  select role, account_status, coalesce(nullif(full_name, ''), id::text), coalesce(nullif(partner_role, ''), 'Partner')
    into partner_role_val, partner_acct_status, partner_label, partner_sub_role
    from public.profiles
    where id = target_partner_id;

  if not found or partner_role_val <> 'partner' then
    raise exception 'Target account must be an approved partner profile.';
  end if;

  if partner_acct_status <> 'active' then
    raise exception 'Cannot assign properties to a suspended partner account.';
  end if;

  insert into public.property_access (
    property_id, user_id, access_role, scope,
    commission_rate, commission_note, status, granted_at, revoked_at
  )
  values (
    target_property_id,
    target_partner_id,
    partner_sub_role,
    clean_scope,
    agreed_commission_rate,
    case when agreed_commission_rate is null then 'No commission agreed' else clean_comm_note end,
    'active',
    now(),
    null
  )
  on conflict (property_id, user_id) do update
    set access_role = excluded.access_role,
        scope = excluded.scope,
        commission_rate = excluded.commission_rate,
        commission_note = excluded.commission_note,
        status = 'active',
        granted_at = now(),
        revoked_at = null;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      'admin',
      'assignment_granted',
      partner_label || ' → ' || prop_title,
      'Scope: ' || clean_scope || '. Commission: ' ||
        case
          when agreed_commission_rate is null then 'none agreed'
          else round(agreed_commission_rate * 100, 2)::text || '% (' || clean_comm_note || ')'
        end
    );
end;
$$;

revoke all on function public.grant_property_assignment(text, uuid, text, numeric, text) from public, anon;
grant execute on function public.grant_property_assignment(text, uuid, text, numeric, text) to authenticated;

-- ─── 2. Lagos-only geography guard & structured property corrections ─────────

create or replace function public.assert_lagos_pilot_area(area_input text)
returns void
language plpgsql
immutable
set search_path = ''
as $$
declare
  normalized_area text := public.normalize_listing_text(area_input);
begin
  if length(normalized_area) < 2 then
    raise exception 'A valid Lagos neighbourhood/area is required.';
  end if;

  if normalized_area in (
    'abuja', 'fct', 'fct abuja', 'ibadan', 'port harcourt',
    'rivers', 'oyo', 'kano', 'enugu', 'calabar', 'abeokuta'
  ) then
    raise exception 'Launch market is Lagos, Nigeria only. Abuja, Ibadan, and other cities are deferred.';
  end if;
end;
$$;

grant execute on function public.assert_lagos_pilot_area(text) to authenticated, service_role;

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
  created_property_id text;
  submitted_docs jsonb;
begin
  if (select auth.uid()) is null or not public.has_role('partner') then
    raise exception 'Only approved partner accounts can submit properties.';
  end if;

  if not public.is_account_active() then
    raise exception 'Your partner account is currently suspended. Contact HAMLET operations.';
  end if;

  if jsonb_typeof(listing_data) is distinct from 'object'
    or jsonb_typeof(submission_data) is distinct from 'object' then
    raise exception 'Property submission data must be JSON objects.';
  end if;

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
    where existing.status <> 'rejected'
      and public.normalize_listing_text(existing.area) = public.normalize_listing_text(listing_data ->> 'area')
      and public.normalize_listing_text(existing.public_address) = public.normalize_listing_text(listing_data ->> 'public_address')
      and public.normalize_listing_text(existing.title) = public.normalize_listing_text(listing_data ->> 'title')
  ) then
    raise exception 'A listing with this title and address already exists in this area.';
  end if;

  insert into public.properties (
    title, property_type, area, public_address, nightly_rate, cleaning_fee,
    mandatory_charges, refundable_deposit, bedrooms, bathrooms, capacity,
    bed_setup, amenities, image_urls, house_rules, status, verification, trust_label
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
    'submitted',
    jsonb_build_object(
      'ownership', 'pending_review',
      'identity', 'pending_review',
      'authority', 'pending_review',
      'inspection', 'missing'
    ),
    'Under review'
  )
  returning id into created_property_id;

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
      'submitted_role', btrim(coalesce(submission_data ->> 'submitted_role', 'Property partner')),
      'docs', submitted_docs
    )
  );

  return created_property_id;
end;
$$;

revoke all on function public.submit_partner_property(jsonb, jsonb) from public, anon;
grant execute on function public.submit_partner_property(jsonb, jsonb) to authenticated;

create or replace function public.resubmit_partner_property(target_property_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  prop_row public.properties%rowtype;
begin
  if (select auth.uid()) is null or not public.has_role('partner') then
    raise exception 'Only approved partners can resubmit a property.';
  end if;

  if not public.is_account_active() then
    raise exception 'Your partner account is currently suspended. Contact HAMLET operations.';
  end if;

  select * into prop_row
    from public.properties
    where id = target_property_id
      and status = 'needs_correction'
      and public.can_manage_property(id)
    for update;

  if not found then
    raise exception 'Property not found or not eligible for resubmission.';
  end if;

  if exists (
    select 1
    from public.properties existing
    where existing.id <> target_property_id
      and existing.status <> 'rejected'
      and public.normalize_listing_text(existing.area) = public.normalize_listing_text(prop_row.area)
      and public.normalize_listing_text(existing.public_address) = public.normalize_listing_text(prop_row.public_address)
      and public.normalize_listing_text(existing.title) = public.normalize_listing_text(prop_row.title)
  ) then
    raise exception 'A listing with this title and address already exists in this area.';
  end if;

  update public.properties
    set status = 'submitted', updated_at = now()
    where id = target_property_id;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values ((select auth.uid()), 'partner', 'property_resubmitted', prop_row.title, 'Partner resubmitted listing after corrections.');
end;
$$;

revoke all on function public.resubmit_partner_property(text) from public, anon;
grant execute on function public.resubmit_partner_property(text) to authenticated;

create or replace function public.update_and_resubmit_partner_property(
  target_property_id text,
  listing_data jsonb,
  submission_data jsonb,
  correction_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  prop_row public.properties%rowtype;
  existing_submission_id uuid;
  existing_docs jsonb := '[]'::jsonb;
  sanitized_docs jsonb;
  clean_summary text := nullif(btrim(coalesce(correction_note, '')), '');
begin
  if actor_id is null or not public.has_role('partner') then
    raise exception 'Only approved partners can edit and resubmit a property.';
  end if;

  if not public.is_account_active() then
    raise exception 'Your partner account is currently suspended. Contact HAMLET operations.';
  end if;

  select * into prop_row
    from public.properties
    where id = target_property_id
      and status = 'needs_correction'
      and public.can_manage_property(id)
    for update;

  if not found then
    raise exception 'Property not found or not in needs_correction status.';
  end if;

  if jsonb_typeof(listing_data) is distinct from 'object'
    or jsonb_typeof(submission_data) is distinct from 'object' then
    raise exception 'Property correction data must be JSON objects.';
  end if;

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
    raise exception 'Property correction exceeds an allowed item limit.';
  end if;

  if exists (
    select 1
    from public.properties existing
    where existing.id <> target_property_id
      and existing.status <> 'rejected'
      and public.normalize_listing_text(existing.area) = public.normalize_listing_text(listing_data ->> 'area')
      and public.normalize_listing_text(existing.public_address) = public.normalize_listing_text(listing_data ->> 'public_address')
      and public.normalize_listing_text(existing.title) = public.normalize_listing_text(listing_data ->> 'title')
  ) then
    raise exception 'A listing with this title and address already exists in this area.';
  end if;

  update public.properties
    set title = btrim(listing_data ->> 'title'),
        property_type = btrim(listing_data ->> 'property_type'),
        area = btrim(listing_data ->> 'area'),
        public_address = btrim(listing_data ->> 'public_address'),
        nightly_rate = (listing_data ->> 'nightly_rate')::integer,
        cleaning_fee = (listing_data ->> 'cleaning_fee')::integer,
        mandatory_charges = listing_data -> 'mandatory_charges',
        refundable_deposit = (listing_data ->> 'refundable_deposit')::integer,
        bedrooms = (listing_data ->> 'bedrooms')::integer,
        bathrooms = (listing_data ->> 'bathrooms')::integer,
        capacity = (listing_data ->> 'capacity')::integer,
        bed_setup = btrim(listing_data ->> 'bed_setup'),
        amenities = array(select jsonb_array_elements_text(listing_data -> 'amenities')),
        image_urls = array(select jsonb_array_elements_text(listing_data -> 'image_urls')),
        house_rules = array(select jsonb_array_elements_text(listing_data -> 'house_rules')),
        status = 'submitted',
        trust_label = 'Under review',
        verification = jsonb_build_object(
          'ownership', case when coalesce(prop_row.verification ->> 'ownership', '') = 'verified' then 'verified' else 'pending_review' end,
          'identity', case when coalesce(prop_row.verification ->> 'identity', '') = 'verified' then 'verified' else 'pending_review' end,
          'authority', case when coalesce(prop_row.verification ->> 'authority', '') = 'verified' then 'verified' else 'pending_review' end,
          'inspection', case when coalesce(prop_row.verification ->> 'inspection', '') = 'verified' then 'verified' else 'missing' end
        ),
        updated_at = now()
    where id = target_property_id;

  select id, coalesce(record_data -> 'docs', '[]'::jsonb)
    into existing_submission_id, existing_docs
    from public.property_private_records
    where property_id = target_property_id
      and record_type = 'partner_submission'
    order by created_at desc
    limit 1;

  -- Partners can never self-mark a doc as 'verified'; preserve 'verified' only if an admin had already verified that doc label.
  select coalesce(
    jsonb_agg(jsonb_build_object(
      'label', document ->> 'label',
      'status', case
        when exists (
          select 1
          from jsonb_array_elements(existing_docs) as prev(doc)
          where prev.doc ->> 'label' = document ->> 'label'
            and prev.doc ->> 'status' = 'verified'
        ) then 'verified'
        when document ->> 'status' = 'missing' then 'missing'
        else 'self_reported'
      end
    )),
    '[]'::jsonb
  )
  into sanitized_docs
  from jsonb_array_elements(submission_data -> 'docs') as items(document);

  if existing_submission_id is not null then
    update public.property_private_records
      set record_data = jsonb_build_object(
        'authority_basis', btrim(submission_data ->> 'authority_basis'),
        'submitted_role', btrim(coalesce(submission_data ->> 'submitted_role', 'Property partner')),
        'docs', sanitized_docs
      )
      where id = existing_submission_id;
  else
    insert into public.property_private_records (property_id, record_type, record_data)
      values (
        target_property_id,
        'partner_submission',
        jsonb_build_object(
          'authority_basis', btrim(submission_data ->> 'authority_basis'),
          'submitted_role', btrim(coalesce(submission_data ->> 'submitted_role', 'Property partner')),
          'docs', sanitized_docs
        )
      );
  end if;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      'partner',
      'property_resubmitted',
      btrim(listing_data ->> 'title'),
      coalesce(clean_summary, 'Listing details and authority declarations updated and resubmitted for review.')
    );
end;
$$;

revoke all on function public.update_and_resubmit_partner_property(text, jsonb, jsonb, text) from public, anon;
grant execute on function public.update_and_resubmit_partner_property(text, jsonb, jsonb, text) to authenticated;

-- ─── 3. Private pilot guest feedback (no public reviews) ────────────────────

create table if not exists public.booking_feedback (
  id uuid primary key default gen_random_uuid(),
  booking_id text not null unique references public.bookings (id) on delete cascade,
  guest_id uuid not null references public.profiles (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  category text not null check (
    category in (
      'Stay experience',
      'Property condition',
      'Check-in & access',
      'Value for money',
      'Host communication'
    )
  ),
  feedback_text text not null check (length(btrim(feedback_text)) between 5 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists booking_feedback_created_idx
  on public.booking_feedback (created_at desc);

alter table public.booking_feedback enable row level security;

-- Strictly private: only the submitting guest and HAMLET admins can read pilot feedback.
drop policy if exists "Guests and admins can read private pilot feedback" on public.booking_feedback;
create policy "Guests and admins can read private pilot feedback"
  on public.booking_feedback for select to authenticated
  using (guest_id = (select auth.uid()) or public.has_role('admin'));

revoke all on public.booking_feedback from public, anon, authenticated;
grant select on public.booking_feedback to authenticated;
grant all on public.booking_feedback to service_role;

create or replace function public.submit_booking_feedback(
  target_booking_id text,
  feedback_rating integer,
  feedback_category text,
  feedback_comment text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  booking_row public.bookings%rowtype;
  clean_comment text := btrim(coalesce(feedback_comment, ''));
  created_feedback_id uuid;
begin
  if actor_id is null or not public.has_role('guest') then
    raise exception 'Only signed-in guest accounts can submit stay feedback.';
  end if;

  if feedback_rating is null or feedback_rating < 1 or feedback_rating > 5 then
    raise exception 'Rating must be between 1 and 5.';
  end if;

  if feedback_category not in (
    'Stay experience',
    'Property condition',
    'Check-in & access',
    'Value for money',
    'Host communication'
  ) then
    raise exception 'Unsupported feedback category.';
  end if;

  if length(clean_comment) < 5 or length(clean_comment) > 2000 then
    raise exception 'Feedback comment must be between 5 and 2000 characters.';
  end if;

  select * into booking_row
    from public.bookings
    where id = target_booking_id or reference = target_booking_id
    for update;

  if not found or booking_row.guest_id <> actor_id then
    raise exception 'Booking not found for your account.';
  end if;

  if booking_row.status not in ('completed', 'disputed') then
    raise exception 'Private feedback can only be submitted for completed or disputed stays.';
  end if;

  if exists (
    select 1 from public.booking_feedback where booking_id = booking_row.id
  ) then
    raise exception 'Private feedback has already been submitted for this stay.';
  end if;

  insert into public.booking_feedback (
    booking_id, guest_id, rating, category, feedback_text
  )
  values (
    booking_row.id, actor_id, feedback_rating, feedback_category, clean_comment
  )
  returning id into created_feedback_id;

  update public.bookings
    set timeline = coalesce(timeline, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'at', now(),
      'label', 'Private pilot feedback submitted',
      'actor', 'Guest',
      'detail', feedback_category || ' (' || feedback_rating || '/5)'
    ))
    where id = booking_row.id;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      'guest',
      'guest_feedback_submitted',
      booking_row.reference,
      'Private pilot feedback (' || feedback_rating || '/5 · ' || feedback_category || ') recorded.'
    );

  return created_feedback_id;
end;
$$;

revoke all on function public.submit_booking_feedback(text, integer, text, text) from public, anon;
grant execute on function public.submit_booking_feedback(text, integer, text, text) to authenticated;

-- ─── 4. Privacy-safe date availability lookup for guest search ──────────────

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
  select distinct b.property_id
  from public.bookings b
  where requested_check_in is not null
    and requested_check_out is not null
    and requested_check_out > requested_check_in
    and b.check_in < requested_check_out
    and b.check_out > requested_check_in
    and (
      b.status = 'confirmed'
      or (
        b.status = 'awaiting_payment'
        and (b.payment_deadline is null or b.payment_deadline > now())
      )
    );
$$;

grant execute on function public.get_unavailable_property_ids(date, date) to anon, authenticated, service_role;
