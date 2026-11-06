-- ═══════════════════════════════════════════════════════════════════════════════
-- HAMLET COMPETITIVE READINESS SPRINT — ADDITIVE SCHEMA, TRIGGERS, RLS & RPCS
-- Migration: 20261106100000_competitive_readiness_sprint.sql
--
-- Implements additive, backwards-compatible PostgreSQL structures for:
--   1. Agent Deal Board (`agent_deals`, `agent_deal_acceptances`)
--   2. Property Duplicate Detection & Owner-Authorised Agents
--      (`property_duplicate_flags`, `property_agent_authorisations`, `hamlet_property_code`)
--   3. Transparent Booking & Financial Breakdown Snapshots (`price_breakdown_snapshot`)
--   4. Caution Fee & Property Inspection Tracker (`property_inspections` + claim fields)
--   5. Booking Response, Enquiry Replies & Availability Freshness (`booking_mode`, etc.)
--   6. Deal-Aware Share Attribution Integration (`partner_share_links.accepted_deal_id`)
--   7. Structured 7-Check Property Trust Profile (`property_trust_checks`)
--
-- Rollback strategy: Documented in `docs/COMPETITIVE_READINESS_REPORT.md` (drops
-- additive triggers, RPCs, tables, and nullable columns without mutating core
-- historical `properties`, `bookings`, or `booking_payment_records`).
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Additive Property Columns & Permanent Unique Property Code ────────────

alter table public.properties
  add column if not exists hamlet_property_code text unique,
  add column if not exists building_or_estate text,
  add column if not exists unit_identifier text,
  add column if not exists submitted_by_user_id uuid references public.profiles (id) on delete set null,
  add column if not exists submitter_relationship text not null default 'owner'
    check (submitter_relationship in ('owner', 'authorised_manager', 'sourcing_agent')),
  add column if not exists booking_mode text not null default 'request_to_book'
    check (booking_mode in ('request_to_book', 'instant_confirmation')),
  add column if not exists caution_refund_conditions text,
  add column if not exists caution_inspection_policy text;

create or replace function public.generate_hamlet_property_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate text;
  attempt integer := 0;
begin
  loop
    attempt := attempt + 1;
    candidate := 'HMP-LAG-' || upper(substr(md5(gen_random_uuid()::text || attempt::text), 1, 6));
    exit when not exists (
      select 1 from public.properties where hamlet_property_code = candidate
    );
  end loop;
  return candidate;
end;
$$;

update public.properties
  set hamlet_property_code = public.generate_hamlet_property_code()
  where hamlet_property_code is null;

create or replace function public.assign_hamlet_property_defaults()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.hamlet_property_code is null or btrim(new.hamlet_property_code) = '' then
    new.hamlet_property_code := public.generate_hamlet_property_code();
  end if;
  if new.submitted_by_user_id is null and (select auth.uid()) is not null then
    new.submitted_by_user_id := (select auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists a0_assign_hamlet_property_defaults on public.properties;
create trigger a0_assign_hamlet_property_defaults
  before insert on public.properties
  for each row execute function public.assign_hamlet_property_defaults();

-- Distinguish true property owner / authorised manager from sourcing or marketing agents
create or replace function public.can_manage_property_as_owner_or_manager(target_property_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role('admin')
    or (
      public.is_account_active()
      and exists (
        select 1
        from public.property_access pa
        where pa.property_id = target_property_id
          and pa.user_id = (select auth.uid())
          and pa.status = 'active'
          and lower(btrim(coalesce(pa.access_role, ''))) not in ('sourcing_agent', 'authorised_agent')
      )
    );
$$;

revoke all on function public.can_manage_property_as_owner_or_manager(text) from public, anon;
grant execute on function public.can_manage_property_as_owner_or_manager(text) to authenticated, service_role;

-- Update `can_manage_property` so sourcing/marketing agents cannot edit owner listings or approve bookings
create or replace function public.can_manage_property(target_property_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.can_manage_property_as_owner_or_manager(target_property_id);
$$;

-- Prevent submitting agents from automatically becoming property owners
create or replace function public.enforce_submitter_role_separation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  declared_role text;
  submitter_uuid uuid;
begin
  if new.record_type <> 'partner_submission' then
    return new;
  end if;

  declared_role := lower(btrim(coalesce(new.record_data ->> 'submitted_role', '')));
  select submitted_by_user_id into submitter_uuid
    from public.properties
    where id = new.property_id;

  if declared_role like '%agent%'
     or declared_role like '%introducer%'
     or declared_role like '%broker%'
     or declared_role like '%scout%'
     or declared_role like '%marketer%' then
    update public.properties
      set submitter_relationship = 'sourcing_agent',
          authorised_manager_id = null
      where id = new.property_id;

    if submitter_uuid is not null then
      update public.property_access
        set access_role = 'sourcing_agent',
            scope = 'Sourcing submission only — does not confer property ownership or management authority'
        where property_id = new.property_id
          and user_id = submitter_uuid
          and access_role = 'submitter';
    end if;
  elsif declared_role like '%manager%' or declared_role like '%co-host%' then
    update public.properties
      set submitter_relationship = 'authorised_manager'
      where id = new.property_id;
  else
    update public.properties
      set submitter_relationship = 'owner'
      where id = new.property_id;
  end if;

  return new;
end;
$$;

drop trigger if exists z0_enforce_submitter_role_separation on public.property_private_records;
create trigger z0_enforce_submitter_role_separation
  after insert on public.property_private_records
  for each row execute function public.enforce_submitter_role_separation();

-- ─── 2. Feature 2: Property Duplicate Detection Queue & Owner-Authorised Agents

create table if not exists public.property_duplicate_flags (
  id uuid primary key default gen_random_uuid(),
  property_id text not null references public.properties (id) on delete cascade,
  matched_property_id text not null references public.properties (id) on delete cascade,
  confidence_score integer not null check (confidence_score between 1 and 100),
  match_reasons jsonb not null default '[]'::jsonb,
  status text not null default 'open'
    check (status in ('open', 'confirmed_duplicate', 'distinct_unit_approved', 'dismissed')),
  reviewed_by uuid references public.profiles (id) on delete set null,
  review_decision_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, matched_property_id),
  check (property_id <> matched_property_id)
);

create index if not exists property_duplicate_flags_status_idx
  on public.property_duplicate_flags (status, confidence_score desc, created_at desc);

alter table public.property_duplicate_flags enable row level security;

drop policy if exists "Only admins read and review property duplicate flags"
  on public.property_duplicate_flags;
create policy "Only admins read and review property duplicate flags"
  on public.property_duplicate_flags for select to authenticated
  using (public.has_role('admin'));

revoke all on public.property_duplicate_flags from public, anon, authenticated;
grant select on public.property_duplicate_flags to authenticated;
grant all on public.property_duplicate_flags to service_role;

create or replace function public.detect_property_duplicates_on_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  cand record;
  score integer;
  reasons jsonb;
  norm_addr text := public.normalize_listing_text(new.public_address);
  norm_area text := public.normalize_listing_text(new.area);
  norm_bldg text := public.normalize_listing_text(new.building_or_estate);
  norm_unit text := public.normalize_listing_text(new.unit_identifier);
  shared_imgs integer;
begin
  if new.status in ('rejected', 'archived') then
    return new;
  end if;

  for cand in
    select p.id, p.title, p.area, p.public_address, p.building_or_estate, p.unit_identifier,
           p.image_urls, p.submitted_by_user_id
    from public.properties p
    where p.id <> new.id
      and p.status not in ('rejected', 'archived')
  loop
    score := 0;
    reasons := '[]'::jsonb;

    if norm_addr <> ''
       and norm_area = public.normalize_listing_text(cand.area)
       and norm_addr = public.normalize_listing_text(cand.public_address) then
      score := score + 55;
      reasons := reasons || jsonb_build_array('identical_public_address');
    elsif norm_area = public.normalize_listing_text(cand.area)
       and length(norm_addr) >= 12
       and (
         position(substr(norm_addr, 1, 12) in public.normalize_listing_text(cand.public_address)) > 0
         or position(substr(public.normalize_listing_text(cand.public_address), 1, 12) in norm_addr) > 0
       ) then
      score := score + 35;
      reasons := reasons || jsonb_build_array('similar_street_or_estate_address');
    end if;

    if norm_bldg <> '' and norm_bldg = public.normalize_listing_text(cand.building_or_estate) then
      if norm_unit <> '' and norm_unit = public.normalize_listing_text(cand.unit_identifier) then
        score := score + 45;
        reasons := reasons || jsonb_build_array('same_building_and_unit');
      else
        score := score + 25;
        reasons := reasons || jsonb_build_array('same_building_or_estate');
      end if;
    end if;

    select count(*) into shared_imgs
      from unnest(coalesce(new.image_urls, '{}'::text[])) as img
      where img = any(coalesce(cand.image_urls, '{}'::text[]));

    if shared_imgs > 0 then
      score := score + least(50, 40 + (shared_imgs - 1) * 10);
      reasons := reasons || jsonb_build_array('shared_property_images');
    end if;

    if score >= 25
       and new.submitted_by_user_id is not null
       and cand.submitted_by_user_id is not null
       and new.submitted_by_user_id <> cand.submitted_by_user_id then
      score := score + 15;
      reasons := reasons || jsonb_build_array('different_submitting_partners');
    end if;

    if score >= 45 then
      insert into public.property_duplicate_flags (
        property_id, matched_property_id, confidence_score, match_reasons, status
      )
      values (
        new.id, cand.id, least(100, score), reasons, 'open'
      )
      on conflict (property_id, matched_property_id) do update
        set confidence_score = excluded.confidence_score,
            match_reasons = excluded.match_reasons,
            updated_at = now()
        where public.property_duplicate_flags.status = 'open';
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists z1_detect_property_duplicates on public.properties;
create trigger z1_detect_property_duplicates
  after insert or update of title, area, public_address, building_or_estate, unit_identifier, image_urls
  on public.properties
  for each row execute function public.detect_property_duplicates_on_write();

create or replace function public.review_property_duplicate_flag(
  target_flag_id uuid,
  decision_status text,
  decision_note text,
  suspend_flagged_property boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  flag_row public.property_duplicate_flags%rowtype;
  clean_note text := btrim(coalesce(decision_note, ''));
begin
  if actor_id is null or not public.has_role('admin') then
    raise exception 'Only administrators can review property duplicate flags.';
  end if;

  if decision_status not in ('confirmed_duplicate', 'distinct_unit_approved', 'dismissed') then
    raise exception 'Unsupported duplicate review decision.';
  end if;

  if length(clean_note) < 8 then
    raise exception 'Provide a review note of at least 8 characters.';
  end if;

  select * into flag_row
    from public.property_duplicate_flags
    where id = target_flag_id
    for update;

  if not found then
    raise exception 'Duplicate flag not found.';
  end if;

  update public.property_duplicate_flags
    set status = decision_status,
        reviewed_by = actor_id,
        review_decision_note = clean_note,
        reviewed_at = now(),
        updated_at = now()
    where id = target_flag_id;

  if decision_status = 'confirmed_duplicate' and coalesce(suspend_flagged_property, false) then
    update public.properties
      set status = case when status = 'approved' then 'suspended' else 'rejected' end,
          review_note = 'Confirmed duplicate listing: ' || clean_note,
          updated_at = now()
      where id = flag_row.property_id;
  end if;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      'admin',
      'duplicate_flag_' || decision_status,
      flag_row.property_id,
      'Duplicate check vs ' || flag_row.matched_property_id || ': ' || clean_note
    );
end;
$$;

revoke all on function public.review_property_duplicate_flag(uuid, text, text, boolean) from public, anon;
grant execute on function public.review_property_duplicate_flag(uuid, text, text, boolean) to authenticated;

-- Owner-Authorised Agents (supports multiple agents per property without duplicating listings)
create table if not exists public.property_agent_authorisations (
  id uuid primary key default gen_random_uuid(),
  property_id text not null references public.properties (id) on delete cascade,
  agent_id uuid not null references public.profiles (id) on delete cascade,
  granted_by uuid not null references public.profiles (id) on delete restrict,
  authorisation_status text not null default 'active'
    check (authorisation_status in ('active', 'expired', 'revoked')),
  permission_scope text[] not null default array['market_and_share', 'accept_deals']::text[],
  note text not null default '',
  authorised_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references public.profiles (id) on delete set null,
  revocation_reason text,
  updated_at timestamptz not null default now(),
  unique (property_id, agent_id)
);

create index if not exists property_agent_authorisations_prop_idx
  on public.property_agent_authorisations (property_id, authorisation_status);

create index if not exists property_agent_authorisations_agent_idx
  on public.property_agent_authorisations (agent_id, authorisation_status);

alter table public.property_agent_authorisations enable row level security;

drop policy if exists "Agents, property owners/managers, and admins read agent authorisations"
  on public.property_agent_authorisations;
create policy "Agents, property owners/managers, and admins read agent authorisations"
  on public.property_agent_authorisations for select to authenticated
  using (
    agent_id = (select auth.uid())
    or public.can_manage_property_as_owner_or_manager(property_id)
    or public.has_role('admin')
  );

revoke all on public.property_agent_authorisations from public, anon, authenticated;
grant select on public.property_agent_authorisations to authenticated;
grant all on public.property_agent_authorisations to service_role;

create or replace function public.grant_owner_agent_authorisation(
  target_property_id text,
  target_agent_id uuid,
  scopes text[] default array['market_and_share', 'accept_deals']::text[],
  expiry_at timestamptz default null,
  authorisation_note text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  agent_role text;
  agent_status text;
  auth_id uuid;
begin
  if actor_id is null or not public.is_account_active() then
    raise exception 'Sign in with an active account to authorise an agent.';
  end if;

  if not public.can_manage_property_as_owner_or_manager(target_property_id) then
    raise exception 'Only the property owner, authorised manager, or administrator can authorise agents.';
  end if;

  if target_agent_id = actor_id then
    raise exception 'You already manage this property directly.';
  end if;

  select role, coalesce(account_status, 'active')
    into agent_role, agent_status
    from public.profiles
    where id = target_agent_id;

  if not found or agent_role not in ('partner', 'admin') or agent_status <> 'active' then
    raise exception 'Target user must be an active HAMLET partner account.';
  end if;

  insert into public.property_agent_authorisations (
    property_id, agent_id, granted_by, authorisation_status, permission_scope,
    note, authorised_at, expires_at, revoked_at, revoked_by, revocation_reason, updated_at
  )
  values (
    target_property_id,
    target_agent_id,
    actor_id,
    'active',
    coalesce(nullif(scopes, '{}'::text[]), array['market_and_share', 'accept_deals']::text[]),
    btrim(coalesce(authorisation_note, '')),
    now(),
    expiry_at,
    null,
    null,
    null,
    now()
  )
  on conflict (property_id, agent_id) do update
    set granted_by = excluded.granted_by,
        authorisation_status = 'active',
        permission_scope = excluded.permission_scope,
        note = excluded.note,
        authorised_at = now(),
        expires_at = excluded.expires_at,
        revoked_at = null,
        revoked_by = null,
        revocation_reason = null,
        updated_at = now()
  returning id into auth_id;

  -- Reactivate any previously paused share link for this authorised agent
  update public.partner_share_links
    set status = 'active',
        updated_at = now()
    where property_id = target_property_id
      and partner_id = target_agent_id
      and status in ('paused', 'revoked');

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      case when public.has_role('admin') then 'admin' else 'partner' end,
      'agent_authorisation_granted',
      target_property_id,
      'Authorised agent ' || target_agent_id::text || ' on property ' || target_property_id
    );

  return auth_id;
end;
$$;

revoke all on function public.grant_owner_agent_authorisation(text, uuid, text[], timestamptz, text) from public, anon;
grant execute on function public.grant_owner_agent_authorisation(text, uuid, text[], timestamptz, text) to authenticated;

create or replace function public.revoke_owner_agent_authorisation(
  target_property_id text,
  target_agent_id uuid,
  reason_note text default 'Revoked by property owner/manager'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  clean_reason text := coalesce(nullif(btrim(reason_note), ''), 'Revoked by property owner/manager');
begin
  if actor_id is null or not public.is_account_active() then
    raise exception 'Sign in with an active account to revoke agent access.';
  end if;

  if not public.can_manage_property_as_owner_or_manager(target_property_id) then
    raise exception 'Only the property owner, authorised manager, or administrator can revoke agent access.';
  end if;

  update public.property_agent_authorisations
    set authorisation_status = 'revoked',
        revoked_at = now(),
        revoked_by = actor_id,
        revocation_reason = clean_reason,
        updated_at = now()
    where property_id = target_property_id
      and agent_id = target_agent_id;

  -- Block future share link usage while strictly preserving historical bookings & attributions
  update public.partner_share_links
    set status = 'revoked',
        updated_at = now()
    where property_id = target_property_id
      and partner_id = target_agent_id;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      case when public.has_role('admin') then 'admin' else 'partner' end,
      'agent_authorisation_revoked',
      target_property_id,
      'Revoked agent ' || target_agent_id::text || ': ' || clean_reason
    );
end;
$$;

revoke all on function public.revoke_owner_agent_authorisation(text, uuid, text) from public, anon;
grant execute on function public.revoke_owner_agent_authorisation(text, uuid, text) to authenticated;

-- Helper to resolve a partner UUID by referral code (`HML-...`) so owners can authorise agents without exposing all user emails
create or replace function public.lookup_partner_by_referral_code(code_input text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  clean_code text := upper(btrim(coalesce(code_input, '')));
  prof record;
begin
  if (select auth.uid()) is null or not public.is_account_active() then
    raise exception 'Sign in to look up a HAMLET partner.';
  end if;

  select id, full_name, partner_role, company, referral_code
    into prof
    from public.profiles
    where referral_code = clean_code
      and role in ('partner', 'admin')
      and coalesce(account_status, 'active') = 'active'
    limit 1;

  if not found then
    return jsonb_build_object('found', false);
  end if;

  return jsonb_build_object(
    'found', true,
    'id', prof.id,
    'full_name', prof.full_name,
    'partner_role', prof.partner_role,
    'company', prof.company,
    'referral_code', prof.referral_code
  );
end;
$$;

revoke all on function public.lookup_partner_by_referral_code(text) from public, anon;
grant execute on function public.lookup_partner_by_referral_code(text) to authenticated;

-- ─── 3. Feature 1: Agent Deal Board (`agent_deals` & `agent_deal_acceptances`) ─

create table if not exists public.agent_deals (
  id uuid primary key default gen_random_uuid(),
  deal_code text not null unique
    default ('HDL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  property_id text not null references public.properties (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 4 and 140),
  deal_structure text not null
    check (deal_structure in ('fixed_agent_payout', 'owner_net_rate')),
  billing_unit text not null default 'per_night'
    check (billing_unit in ('per_night', 'per_week')),
  unit_nights integer not null default 1
    check (unit_nights in (1, 7)),
  authorised_selling_price_ngn integer not null check (authorised_selling_price_ngn > 0),
  owner_allocation_ngn integer not null check (owner_allocation_ngn > 0),
  agent_payout_ngn integer not null check (agent_payout_ngn >= 0),
  authorised_selling_price_kobo bigint generated always as (authorised_selling_price_ngn::bigint * 100) stored,
  owner_allocation_kobo bigint generated always as (owner_allocation_ngn::bigint * 100) stored,
  agent_payout_kobo bigint generated always as (agent_payout_ngn::bigint * 100) stored,
  min_stay_nights integer not null default 1 check (min_stay_nights between 1 and 60),
  starts_on date not null default current_date,
  expires_on date,
  booking_responsibilities text not null default 'Owner/manager confirms calendar and check-in; agent handles guest enquiry handoff.',
  cancellation_conditions text not null default 'Standard HAMLET booking cancellation and verification policy applies.',
  exclusivity text not null default 'open_network'
    check (exclusivity in ('open_network', 'exclusive_agent')),
  exclusive_agent_id uuid references public.profiles (id) on delete set null,
  status text not null default 'published'
    check (status in ('draft', 'published', 'paused', 'withdrawn', 'expired')),
  terms_version integer not null default 1 check (terms_version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (owner_allocation_ngn + agent_payout_ngn = authorised_selling_price_ngn),
  check (expires_on is null or expires_on >= starts_on),
  check (
    (billing_unit = 'per_night' and unit_nights = 1)
    or (billing_unit = 'per_week' and unit_nights = 7)
  ),
  check (exclusivity = 'open_network' or exclusive_agent_id is not null)
);

create index if not exists agent_deals_property_status_idx
  on public.agent_deals (property_id, status, expires_on);

create index if not exists agent_deals_board_idx
  on public.agent_deals (status, exclusivity, starts_on, expires_on);

alter table public.partner_share_links
  add column if not exists accepted_deal_id uuid references public.agent_deals (id) on delete set null;

create table if not exists public.agent_deal_acceptances (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.agent_deals (id) on delete restrict,
  property_id text not null references public.properties (id) on delete cascade,
  agent_id uuid not null references public.profiles (id) on delete cascade,
  decision text not null check (decision in ('accepted', 'declined')),
  accepted_terms_snapshot jsonb not null,
  share_link_id uuid,
  share_token text,
  responded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (deal_id, agent_id)
);

create index if not exists agent_deal_acceptances_agent_idx
  on public.agent_deal_acceptances (agent_id, decision, responded_at desc);

create index if not exists agent_deal_acceptances_prop_agent_idx
  on public.agent_deal_acceptances (property_id, agent_id, decision);

alter table public.agent_deals enable row level security;
alter table public.agent_deal_acceptances enable row level security;

drop policy if exists "Authorised partners and managers read eligible agent deals"
  on public.agent_deals;
create policy "Authorised partners and managers read eligible agent deals"
  on public.agent_deals for select to authenticated
  using (
    public.has_role('admin')
    or public.can_manage_property_as_owner_or_manager(property_id)
    or exists (
      select 1
      from public.agent_deal_acceptances ada
      where ada.deal_id = id
        and ada.agent_id = (select auth.uid())
    )
    or (
      public.has_role('partner')
      and public.is_account_active()
      and status = 'published'
      and (expires_on is null or expires_on >= current_date)
      and not exists (
        select 1
        from public.property_agent_authorisations paa
        where paa.property_id = agent_deals.property_id
          and paa.agent_id = (select auth.uid())
          and paa.authorisation_status = 'revoked'
      )
      and (
        exclusivity = 'open_network'
        or exclusive_agent_id = (select auth.uid())
      )
    )
  );

drop policy if exists "Agents read only own deal acceptances and owners read property acceptances"
  on public.agent_deal_acceptances;
create policy "Agents read only own deal acceptances and owners read property acceptances"
  on public.agent_deal_acceptances for select to authenticated
  using (
    agent_id = (select auth.uid())
    or public.can_manage_property_as_owner_or_manager(property_id)
    or public.has_role('admin')
  );

revoke all on public.agent_deals from public, anon, authenticated;
grant select on public.agent_deals to authenticated;
grant all on public.agent_deals to service_role;

revoke all on public.agent_deal_acceptances from public, anon, authenticated;
grant select on public.agent_deal_acceptances to authenticated;
grant all on public.agent_deal_acceptances to service_role;

-- Update `can_partner_share_property` to honour `property_agent_authorisations` & accepted deals
create or replace function public.can_partner_share_property(
  target_property_id text,
  target_partner_id uuid default auth.uid()
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  prop_status text;
  prop_allow_sharing boolean;
  partner_role text;
  partner_status text;
  has_owner_or_manager_access boolean := false;
  has_revoked_access boolean := false;
  has_revoked_agent_auth boolean := false;
  has_active_agent_auth boolean := false;
  has_accepted_deal boolean := false;
begin
  if target_partner_id is null or target_property_id is null then
    return false;
  end if;

  select p.role, coalesce(p.account_status, 'active')
    into partner_role, partner_status
    from public.profiles p
    where p.id = target_partner_id;

  if not found or partner_role not in ('partner', 'admin') or partner_status <> 'active' then
    return false;
  end if;

  select pr.status, coalesce(pr.allow_partner_sharing, true)
    into prop_status, prop_allow_sharing
    from public.properties pr
    where pr.id = target_property_id;

  if not found or prop_status <> 'approved' then
    return false;
  end if;

  select
    bool_or(pa.status = 'active' and lower(btrim(coalesce(pa.access_role, ''))) not in ('sourcing_agent', 'authorised_agent')),
    bool_or(pa.status = 'revoked')
  into has_owner_or_manager_access, has_revoked_access
  from public.property_access pa
  where pa.property_id = target_property_id
    and pa.user_id = target_partner_id;

  select
    bool_or(paa.authorisation_status = 'revoked'),
    bool_or(
      paa.authorisation_status = 'active'
      and (paa.expires_at is null or paa.expires_at > now())
    )
  into has_revoked_agent_auth, has_active_agent_auth
  from public.property_agent_authorisations paa
  where paa.property_id = target_property_id
    and paa.agent_id = target_partner_id;

  if (coalesce(has_revoked_access, false) and not coalesce(has_owner_or_manager_access, false))
     or coalesce(has_revoked_agent_auth, false) then
    return false;
  end if;

  if partner_role = 'admin' or coalesce(has_owner_or_manager_access, false) or coalesce(has_active_agent_auth, false) then
    return true;
  end if;

  select exists (
    select 1
    from public.agent_deal_acceptances ada
    join public.agent_deals ad on ad.id = ada.deal_id
    where ada.property_id = target_property_id
      and ada.agent_id = target_partner_id
      and ada.decision = 'accepted'
      and ad.status = 'published'
      and (ad.expires_on is null or ad.expires_on >= current_date)
  ) into has_accepted_deal;

  if coalesce(has_accepted_deal, false) then
    return true;
  end if;

  return prop_allow_sharing;
end;
$$;

create or replace function public.upsert_owner_agent_deal(
  deal_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  target_deal_id uuid := nullif(btrim(coalesce(deal_payload ->> 'id', '')), '')::uuid;
  target_prop_id text := btrim(coalesce(deal_payload ->> 'property_id', ''));
  clean_title text := btrim(coalesce(deal_payload ->> 'title', ''));
  structure_val text := btrim(coalesce(deal_payload ->> 'deal_structure', 'fixed_agent_payout'));
  unit_val text := coalesce(nullif(btrim(deal_payload ->> 'billing_unit'), ''), 'per_night');
  nights_per_unit integer := case when unit_val = 'per_week' then 7 else 1 end;
  selling_ngn integer := coalesce((deal_payload ->> 'authorised_selling_price_ngn')::integer, 0);
  owner_ngn integer := coalesce((deal_payload ->> 'owner_allocation_ngn')::integer, 0);
  agent_ngn integer := coalesce((deal_payload ->> 'agent_payout_ngn')::integer, 0);
  min_nights integer := greatest(1, coalesce((deal_payload ->> 'min_stay_nights')::integer, 1));
  start_date date := coalesce(nullif(btrim(deal_payload ->> 'starts_on'), '')::date, current_date);
  end_date date := nullif(btrim(coalesce(deal_payload ->> 'expires_on', '')), '')::date;
  resp_text text := coalesce(nullif(btrim(deal_payload ->> 'booking_responsibilities'), ''), 'Owner/manager confirms calendar and check-in; agent handles guest enquiry handoff.');
  cancel_text text := coalesce(nullif(btrim(deal_payload ->> 'cancellation_conditions'), ''), 'Standard HAMLET booking cancellation and verification policy applies.');
  excl_val text := coalesce(nullif(btrim(deal_payload ->> 'exclusivity'), ''), 'open_network');
  excl_agent uuid := nullif(btrim(coalesce(deal_payload ->> 'exclusive_agent_id', '')), '')::uuid;
  next_status text := coalesce(nullif(btrim(deal_payload ->> 'status'), ''), 'published');
  saved_id uuid;
begin
  if actor_id is null or not public.is_account_active() then
    raise exception 'Sign in with an active account to manage property deals.';
  end if;

  if target_prop_id = '' or not public.can_manage_property_as_owner_or_manager(target_prop_id) then
    raise exception 'Only the property owner, authorised manager, or administrator can create or edit agent deals.';
  end if;

  if char_length(clean_title) < 4 then
    raise exception 'Deal title must be at least 4 characters.';
  end if;

  if structure_val not in ('fixed_agent_payout', 'owner_net_rate') then
    raise exception 'Unsupported deal structure.';
  end if;

  if selling_ngn <= 0 then
    raise exception 'Authorised selling price must be greater than 0 NGN.';
  end if;

  if structure_val = 'fixed_agent_payout' then
    if agent_ngn < 0 or agent_ngn >= selling_ngn then
      raise exception 'Fixed agent payout must be non-negative and strictly less than the authorised selling price.';
    end if;
    owner_ngn := selling_ngn - agent_ngn;
  else
    if owner_ngn <= 0 or owner_ngn > selling_ngn then
      raise exception 'Owner net rate must be positive and cannot exceed the authorised selling price.';
    end if;
    agent_ngn := selling_ngn - owner_ngn;
  end if;

  if excl_val = 'exclusive_agent' and excl_agent is null then
    raise exception 'Select the exclusive partner agent for an exclusive deal.';
  end if;

  if next_status not in ('draft', 'published', 'paused', 'withdrawn') then
    raise exception 'Unsupported deal status.';
  end if;

  if target_deal_id is not null then
    update public.agent_deals
      set title = clean_title,
          deal_structure = structure_val,
          billing_unit = unit_val,
          unit_nights = nights_per_unit,
          authorised_selling_price_ngn = selling_ngn,
          owner_allocation_ngn = owner_ngn,
          agent_payout_ngn = agent_ngn,
          min_stay_nights = min_nights,
          starts_on = start_date,
          expires_on = end_date,
          booking_responsibilities = resp_text,
          cancellation_conditions = cancel_text,
          exclusivity = excl_val,
          exclusive_agent_id = case when excl_val = 'exclusive_agent' then excl_agent else null end,
          status = next_status,
          terms_version = terms_version + 1,
          updated_at = now()
      where id = target_deal_id
        and property_id = target_prop_id
      returning id into saved_id;

    if not found then
      raise exception 'Agent deal not found for this property.';
    end if;
  else
    insert into public.agent_deals (
      property_id, created_by, title, deal_structure, billing_unit, unit_nights,
      authorised_selling_price_ngn, owner_allocation_ngn, agent_payout_ngn,
      min_stay_nights, starts_on, expires_on, booking_responsibilities,
      cancellation_conditions, exclusivity, exclusive_agent_id, status
    )
    values (
      target_prop_id, actor_id, clean_title, structure_val, unit_val, nights_per_unit,
      selling_ngn, owner_ngn, agent_ngn,
      min_nights, start_date, end_date, resp_text,
      cancel_text, excl_val, case when excl_val = 'exclusive_agent' then excl_agent else null end, next_status
    )
    returning id into saved_id;
  end if;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      case when public.has_role('admin') then 'admin' else 'partner' end,
      case when target_deal_id is null then 'agent_deal_created' else 'agent_deal_updated' end,
      saved_id::text,
      clean_title || ' (' || structure_val || ' · sell ' || selling_ngn || ' NGN / owner ' || owner_ngn || ' NGN / agent ' || agent_ngn || ' NGN)'
    );

  return saved_id;
end;
$$;

revoke all on function public.upsert_owner_agent_deal(jsonb) from public, anon;
grant execute on function public.upsert_owner_agent_deal(jsonb) to authenticated;

create or replace function public.set_owner_agent_deal_status(
  target_deal_id uuid,
  next_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  deal_row public.agent_deals%rowtype;
begin
  if actor_id is null or not public.is_account_active() then
    raise exception 'Sign in with an active account to update deal status.';
  end if;

  if next_status not in ('draft', 'published', 'paused', 'withdrawn') then
    raise exception 'Unsupported deal status.';
  end if;

  select * into deal_row
    from public.agent_deals
    where id = target_deal_id
    for update;

  if not found then
    raise exception 'Deal not found.';
  end if;

  if not public.can_manage_property_as_owner_or_manager(deal_row.property_id) then
    raise exception 'Only the property owner, authorised manager, or administrator can change deal status.';
  end if;

  update public.agent_deals
    set status = next_status,
        updated_at = now()
    where id = target_deal_id;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      case when public.has_role('admin') then 'admin' else 'partner' end,
      'agent_deal_' || next_status,
      deal_row.deal_code,
      'Deal status updated to ' || next_status
    );
end;
$$;

revoke all on function public.set_owner_agent_deal_status(uuid, text) from public, anon;
grant execute on function public.set_owner_agent_deal_status(uuid, text) to authenticated;

create or replace function public.respond_to_agent_deal(
  target_deal_id uuid,
  decision_input text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  deal_row public.agent_deals%rowtype;
  prop_status text;
  snapshot_json jsonb;
  link_row public.partner_share_links%rowtype;
  acc_id uuid;
begin
  if actor_id is null or not public.has_role('partner') or not public.is_account_active() then
    raise exception 'Sign in with an active HAMLET partner account to respond to agent deals.';
  end if;

  if decision_input not in ('accepted', 'declined') then
    raise exception 'Decision must be accepted or declined.';
  end if;

  select * into deal_row
    from public.agent_deals
    where id = target_deal_id;

  if not found then
    raise exception 'Agent deal not found.';
  end if;

  if public.can_manage_property_as_owner_or_manager(deal_row.property_id) then
    raise exception 'Property owners and managers cannot accept their own property deal as an external agent.';
  end if;

  if deal_row.status <> 'published' or (deal_row.expires_on is not null and deal_row.expires_on < current_date) then
    raise exception 'This deal offer is not currently open for acceptance.';
  end if;

  if deal_row.exclusivity = 'exclusive_agent' and deal_row.exclusive_agent_id is distinct from actor_id then
    raise exception 'This deal is restricted to a designated exclusive partner.';
  end if;

  if exists (
    select 1
    from public.property_agent_authorisations paa
    where paa.property_id = deal_row.property_id
      and paa.agent_id = actor_id
      and paa.authorisation_status = 'revoked'
  ) then
    raise exception 'Your agent authorisation on this property has been revoked.';
  end if;

  select status into prop_status
    from public.properties
    where id = deal_row.property_id;

  snapshot_json := jsonb_build_object(
    'deal_id', deal_row.id,
    'deal_code', deal_row.deal_code,
    'property_id', deal_row.property_id,
    'title', deal_row.title,
    'deal_structure', deal_row.deal_structure,
    'billing_unit', deal_row.billing_unit,
    'unit_nights', deal_row.unit_nights,
    'authorised_selling_price_ngn', deal_row.authorised_selling_price_ngn,
    'owner_allocation_ngn', deal_row.owner_allocation_ngn,
    'agent_payout_ngn', deal_row.agent_payout_ngn,
    'min_stay_nights', deal_row.min_stay_nights,
    'starts_on', deal_row.starts_on,
    'expires_on', deal_row.expires_on,
    'booking_responsibilities', deal_row.booking_responsibilities,
    'cancellation_conditions', deal_row.cancellation_conditions,
    'exclusivity', deal_row.exclusivity,
    'terms_version', deal_row.terms_version,
    'created_by', deal_row.created_by,
    'accepted_at', now()
  );

  if decision_input = 'accepted' and prop_status = 'approved' then
    insert into public.partner_share_links (
      property_id, partner_id, status, accepted_deal_id, updated_at
    )
    values (
      deal_row.property_id, actor_id, 'active', deal_row.id, now()
    )
    on conflict (property_id, partner_id) do update
      set status = 'active',
          accepted_deal_id = deal_row.id,
          updated_at = now()
    returning * into link_row;
  end if;

  insert into public.agent_deal_acceptances (
    deal_id, property_id, agent_id, decision, accepted_terms_snapshot,
    share_link_id, share_token, responded_at, updated_at
  )
  values (
    deal_row.id,
    deal_row.property_id,
    actor_id,
    decision_input,
    snapshot_json,
    link_row.id,
    link_row.share_token,
    now(),
    now()
  )
  on conflict (deal_id, agent_id) do update
    set decision = excluded.decision,
        accepted_terms_snapshot = case
          when public.agent_deal_acceptances.decision = 'accepted' and excluded.decision = 'accepted'
            then public.agent_deal_acceptances.accepted_terms_snapshot
          else excluded.accepted_terms_snapshot
        end,
        share_link_id = coalesce(excluded.share_link_id, public.agent_deal_acceptances.share_link_id),
        share_token = coalesce(excluded.share_token, public.agent_deal_acceptances.share_token),
        updated_at = now()
  returning id into acc_id;

  return jsonb_build_object(
    'acceptance_id', acc_id,
    'deal_id', deal_row.id,
    'deal_code', deal_row.deal_code,
    'decision', decision_input,
    'share_token', link_row.share_token,
    'accepted_terms_snapshot', snapshot_json
  );
end;
$$;

revoke all on function public.respond_to_agent_deal(uuid, text) from public, anon;
grant execute on function public.respond_to_agent_deal(uuid, text) to authenticated;

-- ─── 4. Feature 3: Booking Deal Attribution & Historical Financial Snapshots ──

alter table public.bookings
  add column if not exists agent_deal_id uuid references public.agent_deals (id) on delete set null,
  add column if not exists agent_deal_acceptance_id uuid references public.agent_deal_acceptances (id) on delete set null,
  add column if not exists agreed_owner_allocation_ngn integer,
  add column if not exists agreed_agent_deal_payout_ngn integer,
  add column if not exists deal_terms_snapshot jsonb,
  add column if not exists price_breakdown_snapshot jsonb,
  add column if not exists deal_code_input text;

create or replace function public.snapshot_booking_financial_and_deal_terms()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  stay_nights integer := greatest(1, new.check_out - new.check_in);
  acc_row public.agent_deal_acceptances%rowtype;
  snap jsonb;
  unit_nights integer;
  selling_unit_ngn integer;
  owner_unit_ngn integer;
  selling_subtotal_ngn integer;
  owner_alloc_subtotal_ngn integer;
  deal_agent_subtotal_ngn integer;
  markup_ngn integer;
  reserve_ngn integer;
  referrer_ngn integer;
  hamlet_net_ngn integer;
begin
  -- Preserve historical snapshots once recorded on insert/confirmation
  if tg_op = 'UPDATE' then
    if old.deal_terms_snapshot is not null then
      new.deal_terms_snapshot := old.deal_terms_snapshot;
      new.agent_deal_id := old.agent_deal_id;
      new.agent_deal_acceptance_id := old.agent_deal_acceptance_id;
      new.agreed_owner_allocation_ngn := old.agreed_owner_allocation_ngn;
      new.agreed_agent_deal_payout_ngn := old.agreed_agent_deal_payout_ngn;
    end if;
    if old.price_breakdown_snapshot is not null then
      new.price_breakdown_snapshot := old.price_breakdown_snapshot;
    end if;
    return new;
  end if;

  -- On INSERT: check if the attributed closing agent has an accepted deal for this property
  if new.closing_agent_id is not null then
    select ada.*
      into acc_row
      from public.agent_deal_acceptances ada
      join public.agent_deals ad on ad.id = ada.deal_id
      where ada.property_id = new.property_id
        and ada.agent_id = new.closing_agent_id
        and ada.decision = 'accepted'
        and (
          (new.deal_code_input is not null and ad.deal_code = upper(btrim(new.deal_code_input)))
          or (
            (to_jsonb(new) ->> 'share_link_id') is not null
            and ada.share_link_id = (to_jsonb(new) ->> 'share_link_id')::uuid
          )
        )
      order by ada.responded_at desc
      limit 1;

    if acc_row.id is not null then
      snap := acc_row.accepted_terms_snapshot;
      unit_nights := greatest(1, coalesce((snap ->> 'unit_nights')::integer, 1));

      if stay_nights < coalesce((snap ->> 'min_stay_nights')::integer, 1) then
        raise exception 'This partner deal requires a minimum stay of % nights.', (snap ->> 'min_stay_nights');
      end if;

      selling_unit_ngn := (snap ->> 'authorised_selling_price_ngn')::integer;
      owner_unit_ngn := (snap ->> 'owner_allocation_ngn')::integer;

      selling_subtotal_ngn := round((selling_unit_ngn::numeric * stay_nights) / unit_nights)::integer;
      owner_alloc_subtotal_ngn := round((owner_unit_ngn::numeric * stay_nights) / unit_nights)::integer;
      deal_agent_subtotal_ngn := greatest(0, selling_subtotal_ngn - owner_alloc_subtotal_ngn);

      -- Apply 20% HAMLET service pool on the authorised selling subtotal, while preventing double-paying the agent
      markup_ngn := public.multiply_ngn_bps(selling_subtotal_ngn, 2000);
      reserve_ngn := public.multiply_ngn_bps(selling_subtotal_ngn, 250);
      referrer_ngn := case
        when coalesce(new.direct_referrer_reward_ngn, 0) > 0
          then public.multiply_ngn_bps(selling_subtotal_ngn, 250)
        else 0
      end;
      hamlet_net_ngn := greatest(0, markup_ngn - referrer_ngn - reserve_ngn);

      new.agent_deal_id := acc_row.deal_id;
      new.agent_deal_acceptance_id := acc_row.id;
      new.deal_terms_snapshot := snap;
      new.agreed_owner_allocation_ngn := owner_alloc_subtotal_ngn;
      new.agreed_agent_deal_payout_ngn := deal_agent_subtotal_ngn;

      -- Owner receives agreed owner allocation; agent receives agreed deal payout once (no extra 10% double payout)
      new.owner_listed_price_ngn := selling_subtotal_ngn;
      new.accommodation_subtotal := owner_alloc_subtotal_ngn;
      new.domestic_markup_ngn := markup_ngn;
      new.hamlet_guest_fee := markup_ngn;
      new.domestic_guest_price_ngn := selling_subtotal_ngn + markup_ngn;
      new.guest_total := new.domestic_guest_price_ngn + coalesce(new.mandatory_total, 0);
      new.closing_agent_commission_ngn := deal_agent_subtotal_ngn;
      new.direct_referrer_reward_ngn := referrer_ngn;
      new.payment_reserve_ngn := reserve_ngn;
      new.hamlet_allocation_ngn := hamlet_net_ngn;

      if coalesce(new.quote_currency, 'NGN') = 'NGN' then
        new.converted_base_amount := new.guest_total;
        new.international_buffer_amount := 0;
        new.international_buffer_ngn_equiv := 0;
        new.quoted_guest_total := new.guest_total;
        new.settlement_total_ngn := new.guest_total + coalesce(new.refundable_deposit, 0);
      elsif coalesce(new.exchange_rate_ngn_per_unit, 0) > 0 then
        new.converted_base_amount := round((new.guest_total::numeric / new.exchange_rate_ngn_per_unit), 2);
        new.international_buffer_amount := round(new.converted_base_amount * coalesce(new.international_buffer_rate, 0.10), 2);
        new.quoted_guest_total := round(new.converted_base_amount + new.international_buffer_amount, 2);
        new.international_buffer_ngn_equiv := round(new.guest_total * coalesce(new.international_buffer_rate, 0.10))::integer;
        new.settlement_total_ngn := new.guest_total + new.international_buffer_ngn_equiv + coalesce(new.refundable_deposit, 0);
      end if;
    end if;
  end if;

  new.deal_code_input := null;

  new.price_breakdown_snapshot := jsonb_build_object(
    'pricing_rules_version', coalesce(new.pricing_rules_version, 'v2_20pct_markup_10pct_fx_buffer'),
    'stay_nights', stay_nights,
    'accommodation_owner_allocation_ngn', new.accommodation_subtotal,
    'accommodation_owner_allocation_kobo', (new.accommodation_subtotal::bigint * 100),
    'authorised_selling_subtotal_ngn', coalesce(new.owner_listed_price_ngn, new.accommodation_subtotal),
    'authorised_selling_subtotal_kobo', (coalesce(new.owner_listed_price_ngn, new.accommodation_subtotal)::bigint * 100),
    'hamlet_platform_fee_ngn', new.hamlet_guest_fee,
    'hamlet_platform_fee_kobo', (new.hamlet_guest_fee::bigint * 100),
    'agent_allocation_ngn', coalesce(new.closing_agent_commission_ngn, 0),
    'agent_allocation_kobo', (coalesce(new.closing_agent_commission_ngn, 0)::bigint * 100),
    'agent_compensation_source', case
      when new.agent_deal_id is not null then 'accepted_owner_deal'
      when coalesce(new.closing_agent_commission_ngn, 0) > 0 then 'closing_agent_pool'
      else 'none'
    end,
    'referrer_allocation_ngn', coalesce(new.direct_referrer_reward_ngn, 0),
    'referrer_allocation_kobo', (coalesce(new.direct_referrer_reward_ngn, 0)::bigint * 100),
    'payment_reserve_ngn', coalesce(new.payment_reserve_ngn, 0),
    'hamlet_net_allocation_ngn', coalesce(new.hamlet_allocation_ngn, 0),
    'mandatory_charges_ngn', coalesce(new.mandatory_total, 0),
    'mandatory_charges_kobo', (coalesce(new.mandatory_total, 0)::bigint * 100),
    'caution_deposit_ngn', coalesce(new.refundable_deposit, 0),
    'caution_deposit_kobo', (coalesce(new.refundable_deposit, 0)::bigint * 100),
    'guest_stay_payable_ngn', new.guest_total,
    'guest_stay_payable_kobo', (new.guest_total::bigint * 100),
    'captured_at', now()
  );

  return new;
end;
$$;

drop trigger if exists z1_snapshot_booking_financial_and_deal_terms on public.bookings;
create trigger z1_snapshot_booking_financial_and_deal_terms
  before insert or update of status on public.bookings
  for each row execute function public.snapshot_booking_financial_and_deal_terms();

create or replace function public.get_my_agent_deal_earnings()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  accepted_rows jsonb := '[]'::jsonb;
  attributed_bookings jsonb := '[]'::jsonb;
begin
  if caller_id is null then
    raise exception 'Sign in to view your agent deal earnings.';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'acceptance_id', ada.id,
        'deal_id', ada.deal_id,
        'deal_code', ad.deal_code,
        'property_id', ada.property_id,
        'property_title', p.title,
        'property_area', p.area,
        'decision', ada.decision,
        'accepted_terms_snapshot', ada.accepted_terms_snapshot,
        'share_token', coalesce(psl.share_token, ada.share_token),
        'deal_live_status', ad.status,
        'responded_at', ada.responded_at
      )
      order by ada.responded_at desc
    ),
    '[]'::jsonb
  )
  into accepted_rows
  from public.agent_deal_acceptances ada
  join public.agent_deals ad on ad.id = ada.deal_id
  join public.properties p on p.id = ada.property_id
  left join public.partner_share_links psl on psl.id = ada.share_link_id
  where ada.agent_id = caller_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'booking_id', b.id,
        'reference', b.reference,
        'property_id', b.property_id,
        'property_title', p.title,
        'check_in', b.check_in,
        'check_out', b.check_out,
        'booking_status', b.status,
        'agent_deal_id', b.agent_deal_id,
        'agreed_earnings_ngn', coalesce(b.agreed_agent_deal_payout_ngn, b.closing_agent_commission_ngn, 0),
        'payout_status', coalesce(
          (
            select bpr.payout_status
            from public.booking_payment_records bpr
            where bpr.booking_id = b.id
              and bpr.beneficiary_user_id = caller_id
              and bpr.record_type in ('closing_agent_commission', 'partner_commission')
            order by bpr.created_at desc
            limit 1
          ),
          'pending_stay_completion'
        ),
        'created_at', b.created_at
      )
      order by b.created_at desc
    ),
    '[]'::jsonb
  )
  into attributed_bookings
  from public.bookings b
  join public.properties p on p.id = b.property_id
  where b.closing_agent_id = caller_id
     or b.share_partner_id = caller_id;

  return jsonb_build_object(
    'deals', accepted_rows,
    'attributed_bookings', attributed_bookings
  );
end;
$$;

revoke all on function public.get_my_agent_deal_earnings() from public, anon;
grant execute on function public.get_my_agent_deal_earnings() to authenticated;

-- ─── 5. Feature 4: Caution Fee Policy & Property Inspection Tracker ───────────

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
      and t.relname = 'booking_caution_deposits'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%status%'
  loop
    execute format('alter table public.booking_caution_deposits drop constraint if exists %I', rec.conname);
  end loop;
end
$$;

alter table public.booking_caution_deposits
  add constraint booking_caution_deposits_status_check
  check (status in (
    'not_applicable',
    'due',
    'received',
    'inspection_pending',
    'refund_approved',
    'partially_refunded',
    'disputed',
    'refunded',
    'refund_completed'
  ));

alter table public.booking_caution_deposits
  add column if not exists damage_issue_description text,
  add column if not exists damage_claimed_amount_ngn integer not null default 0 check (damage_claimed_amount_ngn >= 0),
  add column if not exists excludes_normal_wear_and_tear boolean not null default true,
  add column if not exists guest_deduction_response text,
  add column if not exists guest_responded_at timestamptz,
  add column if not exists admin_review_note text;

create table if not exists public.property_inspections (
  id uuid primary key default gen_random_uuid(),
  booking_id text not null references public.bookings (id) on delete cascade,
  property_id text not null references public.properties (id) on delete cascade,
  inspection_stage text not null check (inspection_stage in ('check_in', 'check_out')),
  property_condition text not null
    check (property_condition in ('excellent', 'good', 'fair', 'issues_noted')),
  furniture_and_appliances text not null,
  existing_or_reported_damage text not null default '',
  missing_items text not null default '',
  utilities_and_facilities text not null,
  wear_and_tear_excluded boolean not null default true,
  media_evidence jsonb not null default '[]'::jsonb,
  recorded_by uuid not null references public.profiles (id) on delete restrict,
  recorded_at timestamptz not null default now(),
  guest_acknowledgement_status text not null default 'pending'
    check (guest_acknowledgement_status in ('pending', 'acknowledged', 'disputed')),
  guest_response_note text,
  guest_acknowledged_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (booking_id, inspection_stage)
);

create index if not exists property_inspections_booking_idx
  on public.property_inspections (booking_id, inspection_stage);

alter table public.property_inspections enable row level security;

drop policy if exists "Booking guest, property owner/manager, and admin read property inspections"
  on public.property_inspections;
create policy "Booking guest, property owner/manager, and admin read property inspections"
  on public.property_inspections for select to authenticated
  using (
    public.has_role('admin')
    or public.can_manage_property_as_owner_or_manager(property_id)
    or exists (
      select 1
      from public.bookings b
      where b.id = property_inspections.booking_id
        and b.guest_id = (select auth.uid())
    )
  );

revoke all on public.property_inspections from public, anon, authenticated;
grant select on public.property_inspections to authenticated;
grant all on public.property_inspections to service_role;

create or replace function public.update_property_caution_policy(
  target_property_id text,
  next_deposit_ngn integer,
  next_refund_conditions text default null,
  next_inspection_policy text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
begin
  if actor_id is null or not public.is_account_active() then
    raise exception 'Sign in with an active account to update caution fee policy.';
  end if;

  if not public.can_manage_property_as_owner_or_manager(target_property_id) then
    raise exception 'Only the property owner, authorised manager, or administrator can update caution fee settings.';
  end if;

  if coalesce(next_deposit_ngn, -1) < 0 then
    raise exception 'Caution fee must be 0 NGN or greater.';
  end if;

  update public.properties
    set refundable_deposit = next_deposit_ngn,
        caution_refund_conditions = nullif(btrim(coalesce(next_refund_conditions, '')), ''),
        caution_inspection_policy = nullif(btrim(coalesce(next_inspection_policy, '')), ''),
        updated_at = now()
    where id = target_property_id;
end;
$$;

revoke all on function public.update_property_caution_policy(text, integer, text, text) from public, anon;
grant execute on function public.update_property_caution_policy(text, integer, text, text) to authenticated;

create or replace function public.submit_property_inspection(
  target_booking_id text,
  stage_input text,
  condition_input text,
  furniture_notes text,
  damage_notes text default '',
  missing_notes text default '',
  utilities_notes text default '',
  evidence_items jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  b_row public.bookings%rowtype;
  insp_id uuid;
begin
  if actor_id is null or not public.is_account_active() then
    raise exception 'Sign in with an active account to record a property inspection.';
  end if;

  if stage_input not in ('check_in', 'check_out') then
    raise exception 'Inspection stage must be check_in or check_out.';
  end if;

  if condition_input not in ('excellent', 'good', 'fair', 'issues_noted') then
    raise exception 'Unsupported property condition value.';
  end if;

  select * into b_row
    from public.bookings
    where id = target_booking_id;

  if not found then
    raise exception 'Booking not found.';
  end if;

  if not public.can_manage_property_as_owner_or_manager(b_row.property_id) then
    raise exception 'Only the property owner, authorised manager, or administrator can record inspections.';
  end if;

  if jsonb_typeof(coalesce(evidence_items, '[]'::jsonb)) <> 'array' then
    raise exception 'Inspection evidence must be a JSON array.';
  end if;

  insert into public.property_inspections (
    booking_id, property_id, inspection_stage, property_condition,
    furniture_and_appliances, existing_or_reported_damage, missing_items,
    utilities_and_facilities, wear_and_tear_excluded, media_evidence,
    recorded_by, recorded_at, guest_acknowledgement_status, updated_at
  )
  values (
    b_row.id,
    b_row.property_id,
    stage_input,
    condition_input,
    coalesce(nullif(btrim(furniture_notes), ''), 'Checked and functional'),
    btrim(coalesce(damage_notes, '')),
    btrim(coalesce(missing_notes, '')),
    coalesce(nullif(btrim(utilities_notes), ''), 'Power, water and AC checked'),
    true,
    coalesce(evidence_items, '[]'::jsonb),
    actor_id,
    now(),
    'pending',
    now()
  )
  on conflict (booking_id, inspection_stage) do update
    set property_condition = excluded.property_condition,
        furniture_and_appliances = excluded.furniture_and_appliances,
        existing_or_reported_damage = excluded.existing_or_reported_damage,
        missing_items = excluded.missing_items,
        utilities_and_facilities = excluded.utilities_and_facilities,
        media_evidence = excluded.media_evidence,
        recorded_by = excluded.recorded_by,
        guest_acknowledgement_status = 'pending',
        updated_at = now()
  returning id into insp_id;

  if stage_input = 'check_out' and b_row.refundable_deposit > 0 then
    insert into public.booking_caution_deposits (
      booking_id, property_id, guest_id, amount_ngn, status, inspection_notes
    )
    values (
      b_row.id, b_row.property_id, b_row.guest_id, b_row.refundable_deposit,
      'inspection_pending', btrim(coalesce(damage_notes, ''))
    )
    on conflict (booking_id) do update
      set status = case
            when public.booking_caution_deposits.status in ('due', 'received') then 'inspection_pending'
            else public.booking_caution_deposits.status
          end,
          inspection_notes = coalesce(nullif(btrim(damage_notes), ''), public.booking_caution_deposits.inspection_notes),
          updated_at = now();
  end if;

  return insp_id;
end;
$$;

revoke all on function public.submit_property_inspection(text, text, text, text, text, text, text, jsonb) from public, anon;
grant execute on function public.submit_property_inspection(text, text, text, text, text, text, text, jsonb) to authenticated;

create or replace function public.respond_to_property_inspection(
  target_inspection_id uuid,
  acknowledgement_input text,
  guest_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  insp_row public.property_inspections%rowtype;
  b_guest uuid;
begin
  if actor_id is null or not public.is_account_active() then
    raise exception 'Sign in to acknowledge the property inspection.';
  end if;

  if acknowledgement_input not in ('acknowledged', 'disputed') then
    raise exception 'Response must be acknowledged or disputed.';
  end if;

  select * into insp_row
    from public.property_inspections
    where id = target_inspection_id
    for update;

  if not found then
    raise exception 'Inspection record not found.';
  end if;

  select guest_id into b_guest
    from public.bookings
    where id = insp_row.booking_id;

  if b_guest is distinct from actor_id then
    raise exception 'Only the guest on this booking can acknowledge the inspection.';
  end if;

  update public.property_inspections
    set guest_acknowledgement_status = acknowledgement_input,
        guest_response_note = nullif(btrim(coalesce(guest_note, '')), ''),
        guest_acknowledged_at = now(),
        updated_at = now()
    where id = target_inspection_id;
end;
$$;

revoke all on function public.respond_to_property_inspection(uuid, text, text) from public, anon;
grant execute on function public.respond_to_property_inspection(uuid, text, text) to authenticated;

create or replace function public.submit_caution_damage_claim(
  target_booking_id text,
  issue_description text,
  claimed_amount_ngn integer,
  evidence_items jsonb,
  excludes_wear_and_tear boolean default true
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  dep_row public.booking_caution_deposits%rowtype;
  clean_issue text := btrim(coalesce(issue_description, ''));
begin
  if actor_id is null or not public.is_account_active() then
    raise exception 'Sign in with an active account to submit a caution deduction claim.';
  end if;

  if not coalesce(excludes_wear_and_tear, false) then
    raise exception 'Normal wear and tear cannot be treated as automatic damage.';
  end if;

  if length(clean_issue) < 12 then
    raise exception 'Describe the reported damage or missing item (minimum 12 characters).';
  end if;

  if jsonb_typeof(evidence_items) is distinct from 'array' or jsonb_array_length(evidence_items) < 1 then
    raise exception 'Timestamped photo or video evidence is required for a caution deduction claim.';
  end if;

  select * into dep_row
    from public.booking_caution_deposits
    where booking_id = target_booking_id
    for update;

  if not found then
    raise exception 'No caution deposit record exists for this booking.';
  end if;

  if not public.can_manage_property_as_owner_or_manager(dep_row.property_id) then
    raise exception 'Only the property owner, authorised manager, or administrator can submit a damage claim.';
  end if;

  if coalesce(claimed_amount_ngn, 0) <= 0 or claimed_amount_ngn > dep_row.amount_ngn then
    raise exception 'Claimed amount must be positive and cannot exceed the caution deposit (% NGN).', dep_row.amount_ngn;
  end if;

  update public.booking_caution_deposits
    set status = 'disputed',
        damage_issue_description = clean_issue,
        damage_claimed_amount_ngn = claimed_amount_ngn,
        deduction_reason = clean_issue,
        excludes_normal_wear_and_tear = true,
        evidence = evidence_items,
        updated_at = now()
    where id = dep_row.id;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      case when public.has_role('admin') then 'admin' else 'partner' end,
      'caution_damage_claim_submitted',
      target_booking_id,
      'Claimed ' || claimed_amount_ngn || ' NGN: ' || clean_issue
    );
end;
$$;

revoke all on function public.submit_caution_damage_claim(text, text, integer, jsonb, boolean) from public, anon;
grant execute on function public.submit_caution_damage_claim(text, text, integer, jsonb, boolean) to authenticated;

create or replace function public.respond_to_caution_damage_claim(
  target_booking_id text,
  guest_response text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  dep_row public.booking_caution_deposits%rowtype;
  clean_resp text := btrim(coalesce(guest_response, ''));
begin
  if actor_id is null or not public.is_account_active() then
    raise exception 'Sign in to respond to a caution deposit claim.';
  end if;

  if length(clean_resp) < 4 then
    raise exception 'Provide a response note (minimum 4 characters).';
  end if;

  select * into dep_row
    from public.booking_caution_deposits
    where booking_id = target_booking_id
    for update;

  if not found or dep_row.guest_id is distinct from actor_id then
    raise exception 'Caution deposit record not found for your account.';
  end if;

  update public.booking_caution_deposits
    set guest_deduction_response = clean_resp,
        guest_responded_at = now(),
        updated_at = now()
    where id = dep_row.id;
end;
$$;

revoke all on function public.respond_to_caution_damage_claim(text, text) from public, anon;
grant execute on function public.respond_to_caution_damage_claim(text, text) to authenticated;

create or replace function public.admin_resolve_caution_deposit_status(
  target_booking_id text,
  next_status text,
  approved_deduction_ngn integer default 0,
  approved_refund_ngn integer default 0,
  review_note text default ''
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  dep_row public.booking_caution_deposits%rowtype;
  clean_note text := btrim(coalesce(review_note, ''));
begin
  if actor_id is null or not public.has_role('admin') then
    raise exception 'Only administrators can finalise caution deposit resolutions.';
  end if;

  if next_status not in ('refund_approved', 'partially_refunded', 'refunded', 'refund_completed', 'disputed') then
    raise exception 'Unsupported caution deposit resolution status.';
  end if;

  select * into dep_row
    from public.booking_caution_deposits
    where booking_id = target_booking_id
    for update;

  if not found then
    raise exception 'Caution deposit record not found.';
  end if;

  if coalesce(approved_deduction_ngn, 0) < 0
     or coalesce(approved_refund_ngn, 0) < 0
     or coalesce(approved_deduction_ngn, 0) + coalesce(approved_refund_ngn, 0) > dep_row.amount_ngn then
    raise exception 'Approved deduction plus refund cannot exceed caution deposit (% NGN).', dep_row.amount_ngn;
  end if;

  update public.booking_caution_deposits
    set status = next_status,
        deducted_amount_ngn = coalesce(approved_deduction_ngn, 0),
        refunded_amount_ngn = coalesce(approved_refund_ngn, 0),
        admin_review_note = nullif(clean_note, ''),
        decision_by = actor_id,
        decision_at = now(),
        updated_at = now()
    where id = dep_row.id;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      'admin',
      'caution_resolution_' || next_status,
      target_booking_id,
      'Deduction ' || coalesce(approved_deduction_ngn, 0) || ' NGN; refund ' || coalesce(approved_refund_ngn, 0) || ' NGN. ' || clean_note
    );
end;
$$;

revoke all on function public.admin_resolve_caution_deposit_status(text, text, integer, integer, text) from public, anon;
grant execute on function public.admin_resolve_caution_deposit_status(text, text, integer, integer, text) to authenticated;

-- ─── 6. Feature 5: Availability Confirmation & Guest Enquiry Replies ──────────

alter table public.property_enquiries
  add column if not exists partner_response text,
  add column if not exists responded_by uuid references public.profiles (id) on delete set null,
  add column if not exists responded_at timestamptz;

create or replace function public.confirm_property_availability_now(
  target_property_id text,
  next_booking_mode text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
begin
  if actor_id is null or not public.is_account_active() then
    raise exception 'Sign in with an active account to confirm availability.';
  end if;

  if not public.can_manage_property_as_owner_or_manager(target_property_id) then
    raise exception 'Only the property owner, authorised manager, or administrator can update availability.';
  end if;

  if next_booking_mode is not null and next_booking_mode not in ('request_to_book', 'instant_confirmation') then
    raise exception 'Unsupported booking mode.';
  end if;

  update public.properties
    set availability_confirmation_status = 'confirmed',
        last_availability_update = now(),
        booking_mode = coalesce(next_booking_mode, booking_mode),
        updated_at = now()
    where id = target_property_id;
end;
$$;

revoke all on function public.confirm_property_availability_now(text, text) from public, anon;
grant execute on function public.confirm_property_availability_now(text, text) to authenticated;

create or replace function public.respond_to_property_enquiry(
  target_enquiry_id uuid,
  response_message text,
  next_status text default 'answered'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  enq_row public.property_enquiries%rowtype;
  clean_msg text := btrim(coalesce(response_message, ''));
begin
  if actor_id is null or not public.is_account_active() then
    raise exception 'Sign in with an active account to reply to enquiries.';
  end if;

  if next_status not in ('answered', 'closed') then
    raise exception 'Unsupported enquiry status.';
  end if;

  if length(clean_msg) < 4 then
    raise exception 'Provide a clear reply of at least 4 characters.';
  end if;

  select * into enq_row
    from public.property_enquiries
    where id = target_enquiry_id
    for update;

  if not found then
    raise exception 'Enquiry not found.';
  end if;

  if not public.can_manage_property_as_owner_or_manager(enq_row.property_id) then
    raise exception 'Only the property owner, authorised manager, or administrator can respond to enquiries.';
  end if;

  update public.property_enquiries
    set partner_response = clean_msg,
        responded_by = actor_id,
        responded_at = now(),
        status = next_status
    where id = target_enquiry_id;
end;
$$;

revoke all on function public.respond_to_property_enquiry(uuid, text, text) from public, anon;
grant execute on function public.respond_to_property_enquiry(uuid, text, text) to authenticated;

-- ─── 7. Feature 7: Structured 7-Check Property Trust Profile ──────────────────

create table if not exists public.property_trust_checks (
  id uuid primary key default gen_random_uuid(),
  property_id text not null references public.properties (id) on delete cascade,
  check_code text not null
    check (check_code in (
      'details_submitted',
      'owner_identity_reviewed',
      'management_authority_reviewed',
      'listing_reviewed',
      'physical_inspection_completed',
      'property_info_updated',
      'documents_reviewed'
    )),
  status text not null default 'not_started'
    check (status in (
      'verified',
      'pending_review',
      'additional_docs_requested',
      'rejected',
      'not_started'
    )),
  public_summary text,
  internal_review_note text,
  inspection_outcome text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewer_label text not null default 'HAMLET Trust & Operations',
  reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (property_id, check_code)
);

create index if not exists property_trust_checks_prop_idx
  on public.property_trust_checks (property_id, status);

alter table public.property_trust_checks enable row level security;

-- Internal notes and reviewer IDs are NEVER exposed to anon or unrelated guests
drop policy if exists "Only property owners/managers and admins read raw trust check rows"
  on public.property_trust_checks;
create policy "Only property owners/managers and admins read raw trust check rows"
  on public.property_trust_checks for select to authenticated
  using (
    public.has_role('admin')
    or public.can_manage_property_as_owner_or_manager(property_id)
  );

revoke all on public.property_trust_checks from public, anon, authenticated;
grant select on public.property_trust_checks to authenticated;
grant all on public.property_trust_checks to service_role;

-- Sync initial/updated property trust checks automatically when properties are created or reviewed
create or replace function public.sync_property_trust_checks_from_property()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v jsonb := coalesce(new.verification, '{}'::jsonb);
  map_status text;
begin
  if new.status <> 'draft' then
    insert into public.property_trust_checks (property_id, check_code, status, public_summary, reviewed_at)
      values (new.id, 'details_submitted', 'verified', 'Property details, specifications and rules submitted.', coalesce(new.created_at, now()))
      on conflict (property_id, check_code) do nothing;

    insert into public.property_trust_checks (property_id, check_code, status, public_summary, reviewed_at)
      values (new.id, 'property_info_updated', 'verified', 'Property rates and availability metadata recorded.', coalesce(new.updated_at, now()))
      on conflict (property_id, check_code) do update
        set status = 'verified',
            reviewed_at = coalesce(new.updated_at, now()),
            updated_at = now();
  end if;

  if tg_op = 'INSERT' or new.verification is distinct from old.verification or new.status is distinct from old.status then
    if new.status = 'approved' then
      insert into public.property_trust_checks (property_id, check_code, status, public_summary, reviewed_at)
        values (new.id, 'listing_reviewed', 'verified', 'Listing reviewed for marketplace publication by HAMLET.', now())
        on conflict (property_id, check_code) do update
          set status = 'verified',
              reviewed_at = coalesce(public.property_trust_checks.reviewed_at, now()),
              updated_at = now();
    end if;

    -- Owner identity
    map_status := case
      when v ->> 'identity' = 'verified' then 'verified'
      when v ->> 'identity' = 'pending_review' then 'pending_review'
      else 'not_started'
    end;
    insert into public.property_trust_checks (property_id, check_code, status, reviewed_at)
      values (new.id, 'owner_identity_reviewed', map_status, case when map_status = 'verified' then now() else null end)
      on conflict (property_id, check_code) do update
        set status = case
              when public.property_trust_checks.status in ('additional_docs_requested', 'rejected') and map_status = 'not_started'
                then public.property_trust_checks.status
              else map_status
            end,
            reviewed_at = case when map_status = 'verified' then coalesce(public.property_trust_checks.reviewed_at, now()) else public.property_trust_checks.reviewed_at end,
            updated_at = now();

    -- Management authority
    map_status := case
      when v ->> 'authority' = 'verified' then 'verified'
      when v ->> 'authority' = 'pending_review' then 'pending_review'
      else 'not_started'
    end;
    insert into public.property_trust_checks (property_id, check_code, status, reviewed_at)
      values (new.id, 'management_authority_reviewed', map_status, case when map_status = 'verified' then now() else null end)
      on conflict (property_id, check_code) do update
        set status = case
              when public.property_trust_checks.status in ('additional_docs_requested', 'rejected') and map_status = 'not_started'
                then public.property_trust_checks.status
              else map_status
            end,
            reviewed_at = case when map_status = 'verified' then coalesce(public.property_trust_checks.reviewed_at, now()) else public.property_trust_checks.reviewed_at end,
            updated_at = now();

    -- Documents reviewed (mapped from ownership / title evidence)
    map_status := case
      when v ->> 'ownership' = 'verified' then 'verified'
      when v ->> 'ownership' = 'pending_review' then 'pending_review'
      else 'not_started'
    end;
    insert into public.property_trust_checks (property_id, check_code, status, reviewed_at)
      values (new.id, 'documents_reviewed', map_status, case when map_status = 'verified' then now() else null end)
      on conflict (property_id, check_code) do update
        set status = case
              when public.property_trust_checks.status in ('additional_docs_requested', 'rejected') and map_status = 'not_started'
                then public.property_trust_checks.status
              else map_status
            end,
            reviewed_at = case when map_status = 'verified' then coalesce(public.property_trust_checks.reviewed_at, now()) else public.property_trust_checks.reviewed_at end,
            updated_at = now();

    -- Physical inspection
    map_status := case
      when v ->> 'inspection' = 'verified' then 'verified'
      when v ->> 'inspection' = 'pending_review' then 'pending_review'
      else 'not_started'
    end;
    insert into public.property_trust_checks (property_id, check_code, status, reviewed_at)
      values (new.id, 'physical_inspection_completed', map_status, case when map_status = 'verified' then now() else null end)
      on conflict (property_id, check_code) do update
        set status = case
              when public.property_trust_checks.status in ('additional_docs_requested', 'rejected') and map_status = 'not_started'
                then public.property_trust_checks.status
              else map_status
            end,
            reviewed_at = case when map_status = 'verified' then coalesce(public.property_trust_checks.reviewed_at, now()) else public.property_trust_checks.reviewed_at end,
            updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists z2_sync_property_trust_checks on public.properties;
create trigger z2_sync_property_trust_checks
  after insert or update on public.properties
  for each row execute function public.sync_property_trust_checks_from_property();

-- Safe public RPC returning ONLY non-confidential trust checks for approved properties
create or replace function public.get_public_property_trust_profile(
  target_property_id text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  prop_row public.properties%rowtype;
  checks_json jsonb := '[]'::jsonb;
begin
  select * into prop_row
    from public.properties
    where id = target_property_id
      and status = 'approved';

  if not found then
    return jsonb_build_object('found', false, 'checks', '[]'::jsonb);
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'check_code', ptc.check_code,
        'status', ptc.status,
        'public_summary', ptc.public_summary,
        'inspection_outcome', ptc.inspection_outcome,
        'reviewed_at', ptc.reviewed_at
      )
      order by ptc.check_code asc
    ),
    '[]'::jsonb
  )
  into checks_json
  from public.property_trust_checks ptc
  where ptc.property_id = target_property_id;

  return jsonb_build_object(
    'found', true,
    'hamlet_property_code', prop_row.hamlet_property_code,
    'booking_mode', prop_row.booking_mode,
    'last_availability_update', prop_row.last_availability_update,
    'caution_refund_conditions', prop_row.caution_refund_conditions,
    'caution_inspection_policy', prop_row.caution_inspection_policy,
    'checks', checks_json
  );
end;
$$;

revoke all on function public.get_public_property_trust_profile(text) from public;
grant execute on function public.get_public_property_trust_profile(text) to anon, authenticated, service_role;

create or replace function public.admin_review_property_trust_check(
  target_property_id text,
  target_check_code text,
  next_status text,
  public_summary_input text default null,
  internal_note_input text default null,
  inspection_outcome_input text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_name text;
  clean_internal text := btrim(coalesce(internal_note_input, ''));
  verified_total integer := 0;
begin
  if actor_id is null or not public.has_role('admin') then
    raise exception 'Only administrators can review property trust checks.';
  end if;

  if target_check_code not in (
    'details_submitted',
    'owner_identity_reviewed',
    'management_authority_reviewed',
    'listing_reviewed',
    'physical_inspection_completed',
    'property_info_updated',
    'documents_reviewed'
  ) then
    raise exception 'Unsupported trust check code.';
  end if;

  if next_status not in (
    'verified',
    'pending_review',
    'additional_docs_requested',
    'rejected',
    'not_started'
  ) then
    raise exception 'Unsupported trust check status.';
  end if;

  if length(clean_internal) < 6 then
    raise exception 'Provide an internal review note of at least 6 characters.';
  end if;

  select coalesce(nullif(btrim(full_name), ''), 'HAMLET Operations')
    into actor_name
    from public.profiles
    where id = actor_id;

  insert into public.property_trust_checks (
    property_id, check_code, status, public_summary, internal_review_note,
    inspection_outcome, reviewed_by, reviewer_label, reviewed_at, updated_at
  )
  values (
    target_property_id,
    target_check_code,
    next_status,
    nullif(btrim(coalesce(public_summary_input, '')), ''),
    clean_internal,
    nullif(btrim(coalesce(inspection_outcome_input, '')), ''),
    actor_id,
    actor_name,
    now(),
    now()
  )
  on conflict (property_id, check_code) do update
    set status = excluded.status,
        public_summary = coalesce(excluded.public_summary, public.property_trust_checks.public_summary),
        internal_review_note = excluded.internal_review_note,
        inspection_outcome = coalesce(excluded.inspection_outcome, public.property_trust_checks.inspection_outcome),
        reviewed_by = actor_id,
        reviewer_label = actor_name,
        reviewed_at = now(),
        updated_at = now();

  -- Keep legacy 4-pillar JSON aligned and prevent blanket Verified label unless all 7 checks are verified
  update public.properties p
    set verification = jsonb_set(
          coalesce(p.verification, '{}'::jsonb),
          case target_check_code
            when 'owner_identity_reviewed' then '{identity}'::text[]
            when 'management_authority_reviewed' then '{authority}'::text[]
            when 'documents_reviewed' then '{ownership}'::text[]
            when 'physical_inspection_completed' then '{inspection}'::text[]
            else '{listing_reviewed}'::text[]
          end,
          to_jsonb(case when next_status = 'verified' then 'verified' else 'pending_review' end),
          true
        ) - 'listing_reviewed'
    where p.id = target_property_id;

  select count(*) into verified_total
    from public.property_trust_checks
    where property_id = target_property_id
      and status = 'verified';

  update public.properties
    set trust_label = case
          when status = 'approved' and verified_total >= 7 then 'Verified by HAMLET'
          when status = 'approved' then verified_total::text || ' of 7 trust checks completed'
          else trust_label
        end
    where id = target_property_id;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      'admin',
      'trust_check_' || target_check_code || '_' || next_status,
      target_property_id,
      clean_internal
    );
end;
$$;

revoke all on function public.admin_review_property_trust_check(text, text, text, text, text, text) from public, anon;
grant execute on function public.admin_review_property_trust_check(text, text, text, text, text, text) to authenticated;
