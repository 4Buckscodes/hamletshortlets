-- ═══════════════════════════════════════════════════════════════════════════════
-- HAMLET SHARE ENGINE — DISTRIBUTION, ATTRIBUTION, ENQUIRIES & ANALYTICS
-- Migration: 20261104120000_hamlet_share_engine.sql
--
-- Reuses existing `properties`, `profiles`, `property_access`, `bookings`,
-- `booking_payment_records`, `partner_referrals`, and `admin_audit_log` as the
-- single source of truth for permissions, pricing, booking lifecycle, and ledger
-- settlements. Adds strictly scoped share links, server-validated attribution
-- sessions, guest stay enquiries, and privacy-preserving distribution analytics.
--
-- Rollback strategy: documented in `docs/SHARE_ENGINE_ARCHITECTURE.md` (drops
-- Share Engine triggers, RPCs, tables, and nullable tracking columns cleanly
-- without mutating historical `bookings` or `booking_payment_records`).
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Property-level partner sharing permission flag ────────────────────────

alter table public.properties
  add column if not exists allow_partner_sharing boolean not null default true;

-- ─── 2. Partner Share Links (opaque server-controlled tokens) ─────────────────

create table if not exists public.partner_share_links (
  id uuid primary key default gen_random_uuid(),
  share_token text not null unique
    default ('hsl_' || replace(gen_random_uuid()::text, '-', ''))
    check (share_token ~ '^hsl_[a-z0-9]{16,64}$'),
  property_id text not null references public.properties (id) on delete cascade,
  partner_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'paused', 'revoked', 'expired')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, partner_id)
);

create index if not exists partner_share_links_partner_idx
  on public.partner_share_links (partner_id, status);

create index if not exists partner_share_links_property_idx
  on public.partner_share_links (property_id, status);

alter table public.partner_share_links enable row level security;

drop policy if exists "Partners, property managers, and admins read authorised share links"
  on public.partner_share_links;
create policy "Partners, property managers, and admins read authorised share links"
  on public.partner_share_links for select to authenticated
  using (
    partner_id = (select auth.uid())
    or public.can_manage_property(property_id)
    or public.has_role('admin')
  );

revoke all on public.partner_share_links from public, anon, authenticated;
grant select on public.partner_share_links to authenticated;
grant all on public.partner_share_links to service_role;

-- ─── 3. Server-Validated Guest Share Attribution Sessions ─────────────────────
-- Policy: Explicit 30-day first-touch lock per `(session_key, property_id)`.
-- An active, valid partner attribution on a property is never silently
-- overwritten by a subsequent partner link until the session expires or the
-- prior share link / partner becomes inactive. Self-referrals are blocked.

create table if not exists public.share_attribution_sessions (
  id uuid primary key default gen_random_uuid(),
  session_key text not null
    check (char_length(btrim(session_key)) between 12 and 128),
  share_link_id uuid not null references public.partner_share_links (id) on delete cascade,
  property_id text not null references public.properties (id) on delete cascade,
  partner_id uuid not null references public.profiles (id) on delete cascade,
  guest_user_id uuid references public.profiles (id) on delete set null,
  status text not null default 'active'
    check (status in ('active', 'converted', 'expired', 'invalidated')),
  first_visited_at timestamptz not null default now(),
  last_visited_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  bound_booking_id text references public.bookings (id) on delete set null,
  unique (session_key, property_id),
  check (guest_user_id is null or guest_user_id <> partner_id)
);

create index if not exists share_attribution_sessions_guest_idx
  on public.share_attribution_sessions (guest_user_id, property_id, status);

create index if not exists share_attribution_sessions_partner_idx
  on public.share_attribution_sessions (partner_id, property_id, first_visited_at desc);

alter table public.share_attribution_sessions enable row level security;

drop policy if exists "Guests and admins read own attribution sessions"
  on public.share_attribution_sessions;
create policy "Guests and admins read own attribution sessions"
  on public.share_attribution_sessions for select to authenticated
  using (
    guest_user_id = (select auth.uid())
    or public.has_role('admin')
  );

revoke all on public.share_attribution_sessions from public, anon, authenticated;
grant select on public.share_attribution_sessions to authenticated;
grant all on public.share_attribution_sessions to service_role;

-- ─── 4. Property Guest Enquiries (distinct from visits & booking requests) ────

create table if not exists public.property_enquiries (
  id uuid primary key default gen_random_uuid(),
  property_id text not null references public.properties (id) on delete cascade,
  guest_user_id uuid references public.profiles (id) on delete set null,
  guest_name text not null check (char_length(btrim(guest_name)) between 2 and 120),
  guest_email text not null check (position('@' in guest_email) > 1 and char_length(guest_email) <= 254),
  message text not null check (char_length(btrim(message)) between 10 and 1500),
  share_link_id uuid references public.partner_share_links (id) on delete set null,
  share_partner_id uuid references public.profiles (id) on delete set null,
  status text not null default 'open'
    check (status in ('open', 'answered', 'closed')),
  created_at timestamptz not null default now()
);

create index if not exists property_enquiries_property_idx
  on public.property_enquiries (property_id, created_at desc);

create index if not exists property_enquiries_share_partner_idx
  on public.property_enquiries (share_partner_id, created_at desc)
  where share_partner_id is not null;

alter table public.property_enquiries enable row level security;

-- Strict PII protection: sharing agents who do NOT manage the property cannot
-- read guest_name, guest_email, or enquiry message; they see aggregated counts only.
drop policy if exists "Guests, assigned property managers, and admins read enquiries"
  on public.property_enquiries;
create policy "Guests, assigned property managers, and admins read enquiries"
  on public.property_enquiries for select to authenticated
  using (
    guest_user_id = (select auth.uid())
    or public.can_manage_property(property_id)
    or public.has_role('admin')
  );

revoke all on public.property_enquiries from public, anon, authenticated;
grant select on public.property_enquiries to authenticated;
grant all on public.property_enquiries to service_role;

-- ─── 5. Booking Share Attribution Columns & Funnel Event Stream ───────────────

alter table public.bookings
  add column if not exists share_link_id uuid references public.partner_share_links (id) on delete set null,
  add column if not exists share_partner_id uuid references public.profiles (id) on delete set null,
  add column if not exists share_session_key text,
  add column if not exists share_token_input text;

create index if not exists bookings_share_partner_idx
  on public.bookings (share_partner_id, status, created_at desc)
  where share_partner_id is not null;

create table if not exists public.property_share_events (
  id uuid primary key default gen_random_uuid(),
  share_link_id uuid references public.partner_share_links (id) on delete cascade,
  property_id text not null references public.properties (id) on delete cascade,
  partner_id uuid not null references public.profiles (id) on delete cascade,
  event_type text not null
    check (event_type in (
      'share_initiated',
      'whatsapp_handoff',
      'link_copied',
      'card_generated',
      'qr_generated',
      'link_visited',
      'enquiry_submitted',
      'booking_requested',
      'booking_confirmed',
      'booking_completed'
    )),
  session_key text,
  booking_id text references public.bookings (id) on delete set null,
  enquiry_id uuid references public.property_enquiries (id) on delete set null,
  idempotency_key text unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists property_share_events_partner_time_idx
  on public.property_share_events (partner_id, created_at desc);

create index if not exists property_share_events_partner_prop_type_idx
  on public.property_share_events (partner_id, property_id, event_type, created_at desc);

alter table public.property_share_events enable row level security;

-- Zero guest PII is stored in property_share_events; partners can read only their own events.
drop policy if exists "Partners read own share events and admins read all"
  on public.property_share_events;
create policy "Partners read own share events and admins read all"
  on public.property_share_events for select to authenticated
  using (
    partner_id = (select auth.uid())
    or public.has_role('admin')
  );

revoke all on public.property_share_events from public, anon, authenticated;
grant select on public.property_share_events to authenticated;
grant all on public.property_share_events to service_role;

-- ─── 6. Authorisation & Deal Terms Helper Functions ───────────────────────────

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
  has_active_access boolean := false;
  has_revoked_access boolean := false;
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
    bool_or(pa.status = 'active'),
    bool_or(pa.status = 'revoked')
  into has_active_access, has_revoked_access
  from public.property_access pa
  where pa.property_id = target_property_id
    and pa.user_id = target_partner_id;

  if coalesce(has_revoked_access, false) and not coalesce(has_active_access, false) then
    return false;
  end if;

  if partner_role = 'admin' or coalesce(has_active_access, false) then
    return true;
  end if;

  return prop_allow_sharing;
end;
$$;

revoke all on function public.can_partner_share_property(text, uuid) from public, anon;
grant execute on function public.can_partner_share_property(text, uuid) to authenticated, service_role;

create or replace function public.get_partner_property_deal_terms(
  target_property_id text,
  target_partner_id uuid default auth.uid()
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  prop_row public.properties%rowtype;
  access_row public.property_access%rowtype;
  has_access boolean := false;
  lower_access_role text := '';
  is_owner_role boolean := false;
  est_per_night integer := null;
begin
  if target_partner_id is null then
    return jsonb_build_object('authorised', false, 'reason', 'unauthenticated');
  end if;

  -- Prevent cross-partner earnings terms snooping
  if caller_id is not null
     and caller_id <> target_partner_id
     and not public.has_role('admin')
     and not public.can_manage_property(target_property_id) then
    return jsonb_build_object('authorised', false, 'reason', 'forbidden');
  end if;

  if not public.can_partner_share_property(target_property_id, target_partner_id) then
    return jsonb_build_object('authorised', false, 'reason', 'sharing_not_permitted');
  end if;

  select * into prop_row
    from public.properties
    where id = target_property_id
      and status = 'approved';

  if not found or coalesce(prop_row.nightly_rate, 0) <= 0 then
    return jsonb_build_object('authorised', false, 'reason', 'invalid_property_rate');
  end if;

  select * into access_row
    from public.property_access pa
    where pa.property_id = target_property_id
      and pa.user_id = target_partner_id
      and pa.status = 'active'
    limit 1;

  has_access := found;
  if has_access then
    lower_access_role := lower(btrim(coalesce(access_row.access_role, '')));
    is_owner_role := lower_access_role in ('owner', 'property owner', 'submitter');
  end if;

  -- Case 1: Explicit active property mandate commission rate > 0
  if has_access and access_row.commission_rate is not null and access_row.commission_rate > 0 then
    est_per_night := round(prop_row.nightly_rate * access_row.commission_rate)::integer;
    return jsonb_build_object(
      'authorised', true,
      'relationship', 'mandate_partner',
      'commission_rate', access_row.commission_rate,
      'estimated_per_night_ngn', est_per_night,
      'basis_label', round(access_row.commission_rate * 100, 1)::text || '% agreed mandate on owner base',
      'disclaimer', 'Estimated earning opportunity on completed stays — not a confirmed payout.'
    );
  end if;

  -- Case 2: Non-owner property access with explicit 0 / null commission AND network sharing disabled
  if has_access and not is_owner_role and not coalesce(prop_row.allow_partner_sharing, true) then
    return jsonb_build_object(
      'authorised', false,
      'relationship', 'manager_no_commission',
      'commission_rate', null,
      'estimated_per_night_ngn', null,
      'basis_label', null,
      'disclaimer', null
    );
  end if;

  -- Case 3: Property owner promoting an open partner opportunity to their agent network,
  -- OR an authorised HAMLET closing agent sharing a property where allow_partner_sharing = true
  if coalesce(prop_row.allow_partner_sharing, true) then
    est_per_night := public.multiply_ngn_bps(prop_row.nightly_rate, 1000); -- 10.00% of owner base B
    return jsonb_build_object(
      'authorised', true,
      'relationship', case when is_owner_role then 'owner_network_offer' else 'closing_agent' end,
      'commission_rate', 0.1000,
      'estimated_per_night_ngn', est_per_night,
      'basis_label', '10% authorised closing-agent commission (of owner base)',
      'disclaimer', 'Estimated earning opportunity on completed stays — not a confirmed payout.'
    );
  end if;

  return jsonb_build_object(
    'authorised', false,
    'relationship', case when is_owner_role then 'owner_direct_only' else 'unauthorised' end,
    'commission_rate', null,
    'estimated_per_night_ngn', null,
    'basis_label', null,
    'disclaimer', null
  );
end;
$$;

revoke all on function public.get_partner_property_deal_terms(text, uuid) from public, anon;
grant execute on function public.get_partner_property_deal_terms(text, uuid) to authenticated, service_role;

-- ─── 7. Owner / Manager / Admin Property Sharing Toggle (Audited) ─────────────

create or replace function public.set_property_sharing_permission(
  target_property_id text,
  enabled boolean
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
    raise exception 'Sign in with an active account to update sharing permissions.';
  end if;

  if not public.can_manage_property(target_property_id) then
    raise exception 'Only the property owner, authorised manager, or an administrator can change partner sharing permissions.';
  end if;

  select title into prop_title
    from public.properties
    where id = target_property_id;

  if not found then
    raise exception 'Property not found.';
  end if;

  update public.properties
    set allow_partner_sharing = coalesce(enabled, true),
        updated_at = now()
    where id = target_property_id;

  -- Pause existing non-manager share links when partner sharing is turned off;
  -- reactivate paused links (excluding explicitly revoked ones) when re-enabled.
  if not coalesce(enabled, true) then
    update public.partner_share_links psl
      set status = 'paused',
          updated_at = now()
      where psl.property_id = target_property_id
        and psl.status = 'active'
        and not exists (
          select 1 from public.property_access pa
          where pa.property_id = target_property_id
            and pa.user_id = psl.partner_id
            and pa.status = 'active'
        );
  else
    update public.partner_share_links psl
      set status = 'active',
          updated_at = now()
      where psl.property_id = target_property_id
        and psl.status = 'paused';
  end if;

  select role into actor_role from public.profiles where id = actor_id;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      coalesce(actor_role, 'partner'),
      case when coalesce(enabled, true) then 'property_sharing_enabled' else 'property_sharing_disabled' end,
      prop_title,
      'Partner network sharing set to ' || coalesce(enabled, true)::text || ' for property ' || target_property_id
    );
end;
$$;

revoke all on function public.set_property_sharing_permission(text, boolean) from public, anon;
grant execute on function public.set_property_sharing_permission(text, boolean) to authenticated;

-- ─── 8. Create / Retrieve Share Link & Record Partner Share Actions ───────────

create or replace function public.get_or_create_partner_share_link(
  target_property_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  link_row public.partner_share_links%rowtype;
  deal_json jsonb;
begin
  if actor_id is null then
    raise exception 'Sign in as an approved HAMLET partner to generate a share link.';
  end if;

  if not public.can_partner_share_property(target_property_id, actor_id) then
    raise exception 'You are not authorised to share this property, or the listing is not currently approved.';
  end if;

  insert into public.partner_share_links (property_id, partner_id, status)
    values (target_property_id, actor_id, 'active')
    on conflict (property_id, partner_id) do update
      set status = case
            when public.partner_share_links.status = 'revoked' then 'revoked'
            else 'active'
          end,
          updated_at = now()
    returning * into link_row;

  if link_row.status <> 'active' or (link_row.expires_at is not null and link_row.expires_at <= now()) then
    raise exception 'Your sharing link for this property is no longer active.';
  end if;

  deal_json := public.get_partner_property_deal_terms(target_property_id, actor_id);

  return jsonb_build_object(
    'link_id', link_row.id,
    'share_token', link_row.share_token,
    'property_id', link_row.property_id,
    'partner_id', link_row.partner_id,
    'status', link_row.status,
    'deal_terms', deal_json
  );
end;
$$;

revoke all on function public.get_or_create_partner_share_link(text) from public, anon;
grant execute on function public.get_or_create_partner_share_link(text) to authenticated;

create or replace function public.record_partner_share_action(
  target_property_id text,
  action_type text,
  event_metadata jsonb default '{}'::jsonb,
  client_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  link_info jsonb;
  resolved_link_id uuid;
  clean_idem text := nullif(btrim(coalesce(client_idempotency_key, '')), '');
begin
  if action_type not in (
    'share_initiated',
    'whatsapp_handoff',
    'link_copied',
    'card_generated',
    'qr_generated'
  ) then
    raise exception 'Unsupported partner share action type.';
  end if;

  link_info := public.get_or_create_partner_share_link(target_property_id);
  resolved_link_id := (link_info ->> 'link_id')::uuid;

  insert into public.property_share_events (
    share_link_id,
    property_id,
    partner_id,
    event_type,
    idempotency_key,
    metadata
  )
  values (
    resolved_link_id,
    target_property_id,
    actor_id,
    action_type,
    clean_idem,
    coalesce(event_metadata, '{}'::jsonb)
  )
  on conflict (idempotency_key) do nothing;

  return link_info;
end;
$$;

revoke all on function public.record_partner_share_action(text, text, jsonb, text) from public, anon;
grant execute on function public.record_partner_share_action(text, text, jsonb, text) to authenticated;

-- ─── 9. Guest Link Visit Tracking, Session Binding & Enquiries ────────────────

create or replace function public.record_share_link_visit(
  incoming_share_token text,
  visitor_session_key text,
  client_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  clean_token text := lower(btrim(coalesce(incoming_share_token, '')));
  clean_session text := btrim(coalesce(visitor_session_key, ''));
  link_row public.partner_share_links%rowtype;
  existing_sess public.share_attribution_sessions%rowtype;
  existing_valid boolean := false;
  visit_idem text;
  policy_outcome text := 'attributed';
begin
  if clean_token !~ '^hsl_[a-z0-9]{16,64}$' then
    return jsonb_build_object('valid', false, 'reason', 'invalid_token_format');
  end if;

  if char_length(clean_session) < 12 or char_length(clean_session) > 128 then
    return jsonb_build_object('valid', false, 'reason', 'invalid_session_key');
  end if;

  select * into link_row
    from public.partner_share_links psl
    where psl.share_token = clean_token;

  if not found then
    return jsonb_build_object('valid', false, 'reason', 'unknown_token');
  end if;

  if link_row.status <> 'active'
     or (link_row.expires_at is not null and link_row.expires_at <= now())
     or not public.can_partner_share_property(link_row.property_id, link_row.partner_id) then
    return jsonb_build_object('valid', false, 'reason', 'inactive_or_expired_link');
  end if;

  -- Self-referral & partner self-preview guard: never attribute a partner to themselves
  if actor_id is not null and actor_id = link_row.partner_id then
    return jsonb_build_object(
      'valid', false,
      'reason', 'self_visit_ignored',
      'property_id', link_row.property_id
    );
  end if;

  -- Deduplicated visit event (1 visit per link + visitor session per UTC hour unless custom key passed)
  visit_idem := coalesce(
    nullif(btrim(coalesce(client_idempotency_key, '')), ''),
    'visit:' || link_row.id::text || ':' || clean_session || ':' || to_char(now() at time zone 'UTC', 'YYYY-MM-DD-HH24')
  );

  insert into public.property_share_events (
    share_link_id,
    property_id,
    partner_id,
    event_type,
    session_key,
    idempotency_key,
    metadata
  )
  values (
    link_row.id,
    link_row.property_id,
    link_row.partner_id,
    'link_visited',
    clean_session,
    visit_idem,
    jsonb_build_object('authenticated_visitor', actor_id is not null)
  )
  on conflict (idempotency_key) do nothing;

  -- First-touch 30-day attribution lock check
  select * into existing_sess
    from public.share_attribution_sessions s
    where s.session_key = clean_session
      and s.property_id = link_row.property_id
    for update;

  if found then
    if existing_sess.share_link_id = link_row.id and existing_sess.expires_at > now() and existing_sess.status in ('active', 'converted') then
      update public.share_attribution_sessions
        set last_visited_at = now(),
            expires_at = greatest(expires_at, now() + interval '30 days'),
            guest_user_id = case
              when guest_user_id is not null then guest_user_id
              when actor_id is not null and actor_id <> link_row.partner_id then actor_id
              else null
            end
        where id = existing_sess.id;
      policy_outcome := 'refreshed_same_partner';
    else
      -- Check whether the existing attributed partner + share link is still active & unexpired
      select exists (
        select 1
        from public.partner_share_links prior_link
        where prior_link.id = existing_sess.share_link_id
          and prior_link.status = 'active'
          and (prior_link.expires_at is null or prior_link.expires_at > now())
          and existing_sess.status in ('active', 'converted')
          and existing_sess.expires_at > now()
          and public.can_partner_share_property(existing_sess.property_id, existing_sess.partner_id)
      ) into existing_valid;

      if existing_valid then
        -- Do NOT silently overwrite an existing eligible first-touch partner attribution
        policy_outcome := 'preserved_existing_first_touch';
      else
        update public.share_attribution_sessions
          set share_link_id = link_row.id,
              partner_id = link_row.partner_id,
              guest_user_id = case
                when actor_id is not null and actor_id <> link_row.partner_id then actor_id
                else null
              end,
              status = 'active',
              first_visited_at = now(),
              last_visited_at = now(),
              expires_at = now() + interval '30 days',
              bound_booking_id = null
          where id = existing_sess.id;
        policy_outcome := 'replaced_expired_or_inactive';
      end if;
    end if;
  else
    insert into public.share_attribution_sessions (
      session_key,
      share_link_id,
      property_id,
      partner_id,
      guest_user_id,
      status,
      first_visited_at,
      last_visited_at,
      expires_at
    )
    values (
      clean_session,
      link_row.id,
      link_row.property_id,
      link_row.partner_id,
      case when actor_id is not null and actor_id <> link_row.partner_id then actor_id else null end,
      'active',
      now(),
      now(),
      now() + interval '30 days'
    );
    policy_outcome := 'attributed_first_touch';
  end if;

  return jsonb_build_object(
    'valid', true,
    'property_id', link_row.property_id,
    'attribution_policy', policy_outcome
  );
end;
$$;

revoke all on function public.record_share_link_visit(text, text, text) from public;
grant execute on function public.record_share_link_visit(text, text, text) to anon, authenticated, service_role;

create or replace function public.bind_share_attribution_to_guest(
  visitor_session_key text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  clean_session text := btrim(coalesce(visitor_session_key, ''));
  updated_rows integer := 0;
begin
  if actor_id is null or char_length(clean_session) < 12 or char_length(clean_session) > 128 then
    return 0;
  end if;

  update public.share_attribution_sessions s
    set guest_user_id = actor_id,
        last_visited_at = now()
    where s.session_key = clean_session
      and s.partner_id <> actor_id
      and s.status in ('active', 'converted')
      and s.expires_at > now()
      and (s.guest_user_id is null or s.guest_user_id = actor_id);

  get diagnostics updated_rows = row_count;
  return updated_rows;
end;
$$;

revoke all on function public.bind_share_attribution_to_guest(text) from public, anon;
grant execute on function public.bind_share_attribution_to_guest(text) to authenticated, service_role;

create or replace function public.submit_property_enquiry(
  target_property_id text,
  sender_name text,
  sender_email text,
  enquiry_message text,
  visitor_session_key text default null,
  incoming_share_token text default null,
  client_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  clean_name text := btrim(coalesce(sender_name, ''));
  clean_email text := lower(btrim(coalesce(sender_email, '')));
  clean_msg text := btrim(coalesce(enquiry_message, ''));
  clean_session text := btrim(coalesce(visitor_session_key, ''));
  clean_token text := lower(btrim(coalesce(incoming_share_token, '')));
  resolved_link_id uuid := null;
  resolved_partner_id uuid := null;
  sess_row public.share_attribution_sessions%rowtype;
  link_row public.partner_share_links%rowtype;
  created_enquiry_id uuid;
  enq_idem text;
begin
  if not exists (
    select 1 from public.properties p
    where p.id = target_property_id and p.status = 'approved'
  ) then
    raise exception 'This stay is not currently available for enquiries.';
  end if;

  if char_length(clean_name) < 2 or char_length(clean_name) > 120 then
    raise exception 'Enter your name (2–120 characters).';
  end if;

  if position('@' in clean_email) <= 1 or char_length(clean_email) > 254 then
    raise exception 'Enter a valid email address.';
  end if;

  if char_length(clean_msg) < 10 or char_length(clean_msg) > 1500 then
    raise exception 'Enter a question between 10 and 1,500 characters.';
  end if;

  -- Resolve active session attribution first (respecting first-touch lock)
  if actor_id is not null then
    select * into sess_row
      from public.share_attribution_sessions s
      where s.guest_user_id = actor_id
        and s.property_id = target_property_id
        and s.partner_id <> actor_id
        and s.status in ('active', 'converted')
        and s.expires_at > now()
      order by s.first_visited_at asc
      limit 1;
  end if;

  if sess_row.id is null and char_length(clean_session) between 12 and 128 then
    select * into sess_row
      from public.share_attribution_sessions s
      where s.session_key = clean_session
        and s.property_id = target_property_id
        and (actor_id is null or s.partner_id <> actor_id)
        and s.status in ('active', 'converted')
        and s.expires_at > now()
      order by s.first_visited_at asc
      limit 1;
  end if;

  if sess_row.id is not null then
    select * into link_row
      from public.partner_share_links psl
      where psl.id = sess_row.share_link_id
        and psl.status = 'active'
        and (psl.expires_at is null or psl.expires_at > now())
        and public.can_partner_share_property(target_property_id, psl.partner_id);
    if found then
      resolved_link_id := link_row.id;
      resolved_partner_id := link_row.partner_id;
    end if;
  elsif clean_token ~ '^hsl_[a-z0-9]{16,64}$' then
    select * into link_row
      from public.partner_share_links psl
      where psl.share_token = clean_token
        and psl.property_id = target_property_id
        and psl.status = 'active'
        and (psl.expires_at is null or psl.expires_at > now())
        and (actor_id is null or psl.partner_id <> actor_id)
        and public.can_partner_share_property(target_property_id, psl.partner_id);
    if found then
      resolved_link_id := link_row.id;
      resolved_partner_id := link_row.partner_id;
    end if;
  end if;

  insert into public.property_enquiries (
    property_id,
    guest_user_id,
    guest_name,
    guest_email,
    message,
    share_link_id,
    share_partner_id
  )
  values (
    target_property_id,
    actor_id,
    clean_name,
    clean_email,
    clean_msg,
    resolved_link_id,
    resolved_partner_id
  )
  returning id into created_enquiry_id;

  if resolved_link_id is not null and resolved_partner_id is not null then
    enq_idem := coalesce(
      nullif(btrim(coalesce(client_idempotency_key, '')), ''),
      'enquiry:' || created_enquiry_id::text
    );
    insert into public.property_share_events (
      share_link_id,
      property_id,
      partner_id,
      event_type,
      session_key,
      enquiry_id,
      idempotency_key
    )
    values (
      resolved_link_id,
      target_property_id,
      resolved_partner_id,
      'enquiry_submitted',
      nullif(clean_session, ''),
      created_enquiry_id,
      enq_idem
    )
    on conflict (idempotency_key) do nothing;
  end if;

  return jsonb_build_object(
    'enquiry_id', created_enquiry_id,
    'status', 'open'
  );
end;
$$;

revoke all on function public.submit_property_enquiry(text, text, text, text, text, text, text) from public;
grant execute on function public.submit_property_enquiry(text, text, text, text, text, text, text) to anon, authenticated, service_role;

-- ─── 10. Booking Attribution & Lifecycle Funnel Triggers ──────────────────────
-- `a0_resolve_share_attribution_before_booking` runs alphabetically BEFORE
-- `enforce_booking_request_integrity` so validated share attribution feeds into
-- HAMLET's authoritative 20% markup & 10% closing-agent allocation cleanly.

create or replace function public.resolve_share_attribution_before_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_session text := btrim(coalesce(new.share_session_key, ''));
  clean_token text := lower(btrim(coalesce(new.share_token_input, '')));
  sess_row public.share_attribution_sessions%rowtype;
  link_row public.partner_share_links%rowtype;
  is_uncommissioned_owner boolean := false;
begin
  -- Never trust client-supplied share_link_id or share_partner_id directly
  new.share_link_id := null;
  new.share_partner_id := null;
  new.share_token_input := null;

  -- Bind session to guest if session_key was supplied on booking request
  if new.guest_id is not null and char_length(clean_session) between 12 and 128 then
    update public.share_attribution_sessions s
      set guest_user_id = new.guest_id,
          last_visited_at = now()
      where s.session_key = clean_session
        and s.property_id = new.property_id
        and s.partner_id <> new.guest_id
        and s.status in ('active', 'converted')
        and s.expires_at > now()
        and (s.guest_user_id is null or s.guest_user_id = new.guest_id);
  end if;

  -- 1. Look up earliest active first-touch session for this guest + property
  if new.guest_id is not null then
    select * into sess_row
      from public.share_attribution_sessions s
      where s.guest_user_id = new.guest_id
        and s.property_id = new.property_id
        and s.partner_id <> new.guest_id
        and s.status in ('active', 'converted')
        and s.expires_at > now()
      order by s.first_visited_at asc
      limit 1;
  end if;

  -- 2. Fallback to session_key if not yet bound
  if sess_row.id is null and char_length(clean_session) between 12 and 128 then
    select * into sess_row
      from public.share_attribution_sessions s
      where s.session_key = clean_session
        and s.property_id = new.property_id
        and s.partner_id <> new.guest_id
        and s.status in ('active', 'converted')
        and s.expires_at > now()
      order by s.first_visited_at asc
      limit 1;
  end if;

  if sess_row.id is not null then
    select * into link_row
      from public.partner_share_links psl
      where psl.id = sess_row.share_link_id
        and psl.property_id = new.property_id
        and psl.status = 'active'
        and (psl.expires_at is null or psl.expires_at > now())
        and psl.partner_id <> new.guest_id
        and public.can_partner_share_property(new.property_id, psl.partner_id);
  elsif clean_token ~ '^hsl_[a-z0-9]{16,64}$' then
    -- Direct visit + sign-in + booking with token present
    select * into link_row
      from public.partner_share_links psl
      where psl.share_token = clean_token
        and psl.property_id = new.property_id
        and psl.status = 'active'
        and (psl.expires_at is null or psl.expires_at > now())
        and psl.partner_id <> new.guest_id
        and public.can_partner_share_property(new.property_id, psl.partner_id);
  end if;

  if link_row.id is not null then
    new.share_link_id := link_row.id;
    new.share_partner_id := link_row.partner_id;

    -- Distinguish owner direct marketing from closing-agent attribution:
    -- A property owner who already receives 100% of owner base (B) does NOT also
    -- claim the 10% closing-agent commission pool unless an explicit commission_rate > 0 exists.
    select exists (
      select 1
      from public.property_access pa
      where pa.property_id = new.property_id
        and pa.user_id = link_row.partner_id
        and pa.status = 'active'
        and lower(btrim(coalesce(pa.access_role, ''))) in ('owner', 'property owner', 'submitter')
        and coalesce(pa.commission_rate, 0) = 0
    ) into is_uncommissioned_owner;

    if new.closing_agent_id is null and not is_uncommissioned_owner then
      new.closing_agent_id := link_row.partner_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists a0_resolve_share_attribution_before_booking on public.bookings;
create trigger a0_resolve_share_attribution_before_booking
  before insert on public.bookings
  for each row execute function public.resolve_share_attribution_before_booking();

create or replace function public.record_share_booking_lifecycle_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.share_link_id is null or new.share_partner_id is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    update public.share_attribution_sessions s
      set status = 'converted',
          bound_booking_id = new.id,
          guest_user_id = coalesce(s.guest_user_id, new.guest_id),
          last_visited_at = now()
      where s.share_link_id = new.share_link_id
        and s.property_id = new.property_id
        and (s.guest_user_id = new.guest_id or (new.share_session_key is not null and s.session_key = new.share_session_key));

    insert into public.property_share_events (
      share_link_id, property_id, partner_id, event_type,
      session_key, booking_id, idempotency_key
    )
    values (
      new.share_link_id, new.property_id, new.share_partner_id, 'booking_requested',
      new.share_session_key, new.id, 'booking_requested:' || new.id
    )
    on conflict (idempotency_key) do nothing;
  elsif tg_op = 'UPDATE' then
    if new.status = 'confirmed' and coalesce(old.status, '') <> 'confirmed' then
      insert into public.property_share_events (
        share_link_id, property_id, partner_id, event_type,
        booking_id, idempotency_key
      )
      values (
        new.share_link_id, new.property_id, new.share_partner_id, 'booking_confirmed',
        new.id, 'booking_confirmed:' || new.id
      )
      on conflict (idempotency_key) do nothing;
    elsif new.status = 'completed' and coalesce(old.status, '') <> 'completed' then
      insert into public.property_share_events (
        share_link_id, property_id, partner_id, event_type,
        booking_id, idempotency_key
      )
      values (
        new.share_link_id, new.property_id, new.share_partner_id, 'booking_completed',
        new.id, 'booking_completed:' || new.id
      )
      on conflict (idempotency_key) do nothing;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists z0_record_share_booking_lifecycle_events on public.bookings;
create trigger z0_record_share_booking_lifecycle_events
  after insert or update of status on public.bookings
  for each row execute function public.record_share_booking_lifecycle_events();

-- ─── 11. Partner Shareable Properties Catalogue & Distribution Analytics RPCs ─

create or replace function public.list_partner_shareable_properties()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role text;
  actor_status text;
  items jsonb := '[]'::jsonb;
begin
  if actor_id is null then
    return '[]'::jsonb;
  end if;

  select p.role, coalesce(p.account_status, 'active')
    into actor_role, actor_status
    from public.profiles p
    where p.id = actor_id;

  if actor_role not in ('partner', 'admin') or actor_status <> 'active' then
    return '[]'::jsonb;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', pr.id,
        'title', pr.title,
        'property_type', pr.property_type,
        'area', pr.area,
        'public_address', pr.public_address,
        'bedrooms', pr.bedrooms,
        'bathrooms', pr.bathrooms,
        'capacity', pr.capacity,
        'amenities', pr.amenities,
        'image_urls', pr.image_urls,
        'trust_label', pr.trust_label,
        'verification', pr.verification,
        'allow_partner_sharing', coalesce(pr.allow_partner_sharing, true),
        'guest_nightly_ngn', pr.nightly_rate + public.multiply_ngn_bps(pr.nightly_rate, 2000),
        'can_manage', public.can_manage_property(pr.id),
        'is_assigned', exists (
          select 1 from public.property_access pa
          where pa.property_id = pr.id
            and pa.user_id = actor_id
            and pa.status = 'active'
        ),
        'share_token', (
          select psl.share_token
          from public.partner_share_links psl
          where psl.property_id = pr.id
            and psl.partner_id = actor_id
            and psl.status = 'active'
          limit 1
        ),
        'deal_terms', public.get_partner_property_deal_terms(pr.id, actor_id)
      )
      order by pr.created_at desc
    ),
    '[]'::jsonb
  )
  into items
  from public.properties pr
  where pr.status = 'approved'
    and public.can_partner_share_property(pr.id, actor_id);

  return items;
end;
$$;

revoke all on function public.list_partner_shareable_properties() from public, anon;
grant execute on function public.list_partner_shareable_properties() to authenticated;

create or replace function public.get_my_marketing_performance(
  window_days integer default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role text;
  actor_status text;
  cutoff timestamptz := null;
  totals_json jsonb;
  fin_json jsonb;
  by_property_json jsonb := '[]'::jsonb;
begin
  if actor_id is null then
    raise exception 'Sign in to view marketing performance.';
  end if;

  select p.role, coalesce(p.account_status, 'active')
    into actor_role, actor_status
    from public.profiles p
    where p.id = actor_id;

  if actor_role not in ('partner', 'admin') or actor_status <> 'active' then
    raise exception 'Partner approval is required to access marketing analytics.';
  end if;

  if window_days is not null and window_days > 0 then
    cutoff := now() - make_interval(days => least(window_days, 3650));
  end if;

  select jsonb_build_object(
    'share_initiated', coalesce(count(*) filter (where e.event_type = 'share_initiated'), 0),
    'whatsapp_handoff', coalesce(count(*) filter (where e.event_type = 'whatsapp_handoff'), 0),
    'link_copied', coalesce(count(*) filter (where e.event_type = 'link_copied'), 0),
    'card_generated', coalesce(count(*) filter (where e.event_type = 'card_generated'), 0),
    'qr_generated', coalesce(count(*) filter (where e.event_type = 'qr_generated'), 0),
    'link_visited', coalesce(count(*) filter (where e.event_type = 'link_visited'), 0),
    'unique_visitors', coalesce(count(distinct e.session_key) filter (where e.event_type = 'link_visited' and e.session_key is not null), 0),
    'enquiries_generated', coalesce(count(*) filter (where e.event_type = 'enquiry_submitted'), 0)
  )
  into totals_json
  from public.property_share_events e
  where e.partner_id = actor_id
    and (cutoff is null or e.created_at >= cutoff);

  -- Reconcile booking counts and earnings directly against authoritative `bookings`
  -- and `booking_payment_records` (never inventing or double-counting commissions).
  with relevant_bookings as (
    select
      b.id,
      b.property_id,
      b.status,
      b.created_at,
      case
        when b.closing_agent_id = actor_id then coalesce(b.closing_agent_commission_ngn, 0)
        else 0
      end as expected_agent_comm_ngn
    from public.bookings b
    where (b.share_partner_id = actor_id or b.closing_agent_id = actor_id)
      and (cutoff is null or b.created_at >= cutoff)
  ),
  ledger_lines as (
    select
      r.booking_id,
      r.amount,
      r.payout_status,
      r.record_type
    from public.booking_payment_records r
    join relevant_bookings rb on rb.id = r.booking_id
    where r.beneficiary_user_id = actor_id
      and r.record_type in ('closing_agent_commission', 'partner_commission')
  )
  select jsonb_build_object(
    'booking_requests', (select count(*) from relevant_bookings),
    'open_booking_requests', (
      select count(*) from relevant_bookings
      where status in ('requested', 'checking', 'awaiting_payment')
    ),
    'confirmed_bookings', (
      select count(*) from relevant_bookings
      where status in ('confirmed', 'completed')
    ),
    'completed_bookings', (
      select count(*) from relevant_bookings
      where status = 'completed'
    ),
    'potential_opportunity_ngn', coalesce((
      select sum(expected_agent_comm_ngn) from relevant_bookings
      where status in ('requested', 'checking', 'awaiting_payment')
    ), 0),
    'earnings_pending_ngn', coalesce((
      select sum(amount) from ledger_lines
      where payout_status = 'pending'
    ), 0),
    'earnings_eligible_ngn', coalesce((
      select sum(amount) from ledger_lines
      where payout_status = 'approved'
    ), 0),
    'earnings_paid_ngn', coalesce((
      select sum(amount) from ledger_lines
      where payout_status = 'paid'
    ), 0),
    'earnings_reversed_ngn', coalesce((
      select sum(amount) from ledger_lines
      where payout_status in ('reversed', 'withheld')
    ), 0)
  )
  into fin_json;

  -- Property-level breakdown (only properties shared or attributed to actor_id)
  with prop_ids as (
    select distinct psl.property_id
    from public.partner_share_links psl
    where psl.partner_id = actor_id
    union
    select distinct b.property_id
    from public.bookings b
    where (b.share_partner_id = actor_id or b.closing_agent_id = actor_id)
      and (cutoff is null or b.created_at >= cutoff)
  ),
  prop_events as (
    select
      e.property_id,
      count(*) filter (where e.event_type in ('share_initiated', 'whatsapp_handoff', 'link_copied')) as shares,
      count(*) filter (where e.event_type = 'link_visited') as visits,
      count(distinct e.session_key) filter (where e.event_type = 'link_visited' and e.session_key is not null) as unique_visitors,
      count(*) filter (where e.event_type = 'enquiry_submitted') as enquiries
    from public.property_share_events e
    where e.partner_id = actor_id
      and (cutoff is null or e.created_at >= cutoff)
    group by e.property_id
  ),
  prop_bookings as (
    select
      b.property_id,
      count(*) as booking_requests,
      count(*) filter (where b.status in ('confirmed', 'completed')) as confirmed_bookings,
      count(*) filter (where b.status = 'completed') as completed_bookings,
      coalesce(sum(
        case when b.closing_agent_id = actor_id and b.status in ('requested', 'checking', 'awaiting_payment')
             then coalesce(b.closing_agent_commission_ngn, 0) else 0 end
      ), 0) as potential_ngn
    from public.bookings b
    where (b.share_partner_id = actor_id or b.closing_agent_id = actor_id)
      and (cutoff is null or b.created_at >= cutoff)
    group by b.property_id
  ),
  prop_ledger as (
    select
      b.property_id,
      coalesce(sum(r.amount) filter (where r.payout_status = 'pending'), 0) as pending_ngn,
      coalesce(sum(r.amount) filter (where r.payout_status = 'approved'), 0) as eligible_ngn,
      coalesce(sum(r.amount) filter (where r.payout_status = 'paid'), 0) as paid_ngn
    from public.booking_payment_records r
    join public.bookings b on b.id = r.booking_id
    where r.beneficiary_user_id = actor_id
      and r.record_type in ('closing_agent_commission', 'partner_commission')
      and (cutoff is null or b.created_at >= cutoff)
    group by b.property_id
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'property_id', p.id,
        'title', p.title,
        'area', p.area,
        'shares', coalesce(pe.shares, 0),
        'visits', coalesce(pe.visits, 0),
        'unique_visitors', coalesce(pe.unique_visitors, 0),
        'enquiries', coalesce(pe.enquiries, 0),
        'booking_requests', coalesce(pb.booking_requests, 0),
        'confirmed_bookings', coalesce(pb.confirmed_bookings, 0),
        'completed_bookings', coalesce(pb.completed_bookings, 0),
        'potential_earnings_ngn', coalesce(pb.potential_ngn, 0),
        'pending_earnings_ngn', coalesce(pl.pending_ngn, 0),
        'eligible_earnings_ngn', coalesce(pl.eligible_ngn, 0),
        'paid_earnings_ngn', coalesce(pl.paid_ngn, 0)
      )
      order by coalesce(pb.completed_bookings, 0) desc, coalesce(pe.visits, 0) desc, p.title asc
    ),
    '[]'::jsonb
  )
  into by_property_json
  from prop_ids ids
  join public.properties p on p.id = ids.property_id
  left join prop_events pe on pe.property_id = p.id
  left join prop_bookings pb on pb.property_id = p.id
  left join prop_ledger pl on pl.property_id = p.id;

  return jsonb_build_object(
    'window_days', window_days,
    'events', totals_json,
    'financials', fin_json,
    'properties', by_property_json
  );
end;
$$;

revoke all on function public.get_my_marketing_performance(integer) from public, anon;
grant execute on function public.get_my_marketing_performance(integer) to authenticated;

notify pgrst, 'reload schema';
