-- Network partners earn through referrals and closing-agent attribution.
--
-- Product rule (2026-11-19): joining the HAMLET partner network is enough for a
-- referral to earn. An active partner_network_memberships row is the partner
-- entitlement (profiles.role stays 'guest'); identity verification is not a
-- prerequisite for referral activation or rewards.
--
-- Production never received 20261028120000, 20261028140000, 20261029100000,
-- 20261030100000, 20261030120000 or 20261030150000, and the repository versions
-- of several functions still required profiles.role in ('partner', 'admin') or a
-- 'verified' referral. This migration brings both to the same end state without
-- replaying the old migrations (which would overwrite newer definitions such as
-- create_profile_for_new_user):
--
--   A. Partner-application referrals: one validator that accepts network-member
--      referrers, records the 'registered' referral at submission, runs on insert
--      and on referral/applicant changes; the corrected resubmission RPC; and the
--      approval sync that marks the referral 'verified'.
--   B. Network referral reward on stay completion for bookings without a closing
--      agent, with network members accepted as generators/referrers and
--      'registered' referrals able to activate.
--   C. transition_booking: closing-agent referrals in 'registered' status activate.
--   D. enforce_booking_request_integrity: network members are valid closing agents
--      (share links and HML- referral codes) and 'registered' referrals set the
--      direct referrer.
--   E. Partner sharing RPCs accept network members (already live in production
--      via partner_shareable_properties_membership_access; added to the repo).
--
-- In-place patches (C, D) keep every other line of the live definition, are
-- no-ops once applied, and fail instead of skipping if the expected text is not
-- found. Function privileges are preserved by CREATE OR REPLACE; new functions get
-- explicit grants.

-- ── A. Partner-application referral lifecycle ─────────────────────────────────
create or replace function public.validate_partner_application_referral()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_code text := upper(regexp_replace(btrim(coalesce(new.referred_by_code, '')), '[^A-Za-z0-9-]', '', 'g'));
  referrer_id uuid;
  applicant_email text;
  referrer_email text;
  applicant_phone text;
  referrer_phone text;
  existing_referrer uuid;
begin
  if normalized_code = '' then
    new.referred_by_code := null;
    new.referred_by_partner_id := null;
    return new;
  end if;

  -- An update that keeps the same applicant and code (e.g. a resubmission)
  -- preserves the attribution already validated, even if the referrer has since
  -- been suspended.
  if tg_op = 'UPDATE'
    and new.applicant_id = old.applicant_id
    and normalized_code = upper(btrim(coalesce(old.referred_by_code, '')))
    and old.referred_by_partner_id is not null then
    new.referred_by_code := normalized_code;
    new.referred_by_partner_id := old.referred_by_partner_id;
    return new;
  end if;

  select p.id
    into referrer_id
    from public.profiles p
    where p.referral_code = normalized_code
      and p.account_status = 'active'
      and (
        p.role in ('partner', 'admin')
        or exists (
          select 1 from public.partner_network_memberships m
          where m.user_id = p.id and m.status = 'active'
        )
      )
    limit 1;

  if referrer_id is null then
    raise exception 'This partner referral code is invalid or no longer active.';
  end if;

  if new.applicant_id = referrer_id then
    raise exception 'Self-referrals are not permitted.';
  end if;

  select lower(btrim(coalesce(u.email, ''))),
         regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g')
    into referrer_email, referrer_phone
    from public.profiles p
    left join auth.users u on u.id = p.id
    where p.id = referrer_id;

  select lower(btrim(coalesce(u.email, ''))),
         regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g')
    into applicant_email, applicant_phone
    from public.profiles p
    left join auth.users u on u.id = p.id
    where p.id = new.applicant_id;

  if referrer_email <> '' and referrer_email in (applicant_email, lower(btrim(coalesce(new.email, '')))) then
    raise exception 'Self-referrals are not permitted.';
  end if;

  if referrer_phone <> ''
    and referrer_phone in (applicant_phone, regexp_replace(coalesce(new.phone, ''), '[^0-9]', '', 'g')) then
    raise exception 'Self-referrals using the same phone number are not permitted.';
  end if;

  select pr.referrer_partner_id into existing_referrer
    from public.partner_referrals pr
    where pr.referred_partner_id = new.applicant_id;

  if existing_referrer is not null and existing_referrer <> referrer_id then
    raise exception 'This account already has a recorded direct referring partner.';
  end if;

  new.referred_by_code := normalized_code;
  new.referred_by_partner_id := referrer_id;

  -- Joining is enough: the referral is recorded as soon as it is submitted.
  insert into public.partner_referrals (
    referrer_partner_id, referred_partner_id, referral_code, status, registered_at
  )
  values (referrer_id, new.applicant_id, normalized_code, 'registered', now())
  on conflict (referred_partner_id) do nothing;

  update public.profiles
    set referred_by_partner_id = coalesce(referred_by_partner_id, referrer_id),
        referred_by_code = coalesce(referred_by_code, normalized_code)
    where id = new.applicant_id;

  return new;
end;
$$;

-- One insert trigger and one update trigger (the legacy 20261024100000 trigger
-- name is retired so the validator runs once per insert).
drop trigger if exists validate_partner_application_referral on public.partner_applications;
drop trigger if exists validate_partner_application_referral_insert on public.partner_applications;
create trigger validate_partner_application_referral_insert
  before insert on public.partner_applications
  for each row execute function public.validate_partner_application_referral();

drop trigger if exists validate_partner_application_referral_update on public.partner_applications;
create trigger validate_partner_application_referral_update
  before update of referred_by_code, applicant_id on public.partner_applications
  for each row execute function public.validate_partner_application_referral();

revoke all on function public.validate_partner_application_referral() from public, anon, authenticated;
grant execute on function public.validate_partner_application_referral() to service_role;

create or replace function public.resubmit_partner_application(
  target_application_id uuid,
  application_data jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  app_row public.partner_applications%rowtype;
  clean_name text;
  clean_phone text;
  clean_company text;
  clean_role text;
  clean_motivation text;
  clean_referral_code text;
  next_count integer;
begin
  if actor_id is null or not public.has_role('guest') then
    raise exception 'Sign in with your applicant account to update this partner application.';
  end if;

  if not public.is_account_active() then
    raise exception 'Your account is currently suspended. Contact HAMLET operations.';
  end if;

  if jsonb_typeof(application_data) is distinct from 'object' then
    raise exception 'Partner application payload must be a JSON object.';
  end if;

  select * into app_row
    from public.partner_applications
    where id = target_application_id
      and applicant_id = actor_id
    for update;

  if not found then
    raise exception 'Partner application not found for your account.';
  end if;

  if app_row.status <> 'needs_correction' then
    raise exception 'Only applications awaiting correction can be edited and resubmitted.';
  end if;

  clean_name := btrim(coalesce(application_data ->> 'full_name', ''));
  clean_phone := btrim(coalesce(application_data ->> 'phone', ''));
  clean_company := btrim(coalesce(application_data ->> 'company', ''));
  clean_role := btrim(coalesce(application_data ->> 'role', ''));
  clean_motivation := btrim(coalesce(application_data ->> 'motivation', ''));
  -- The attribution already on the application is preserved; a code is only
  -- taken from the payload when none was recorded.
  clean_referral_code := upper(btrim(coalesce(
    app_row.referred_by_code,
    application_data ->> 'referred_by_code',
    application_data ->> 'referral_code',
    ''
  )));
  next_count := coalesce((application_data ->> 'properties_count')::integer,
    case when clean_role in ('Closing Agent', 'Referral Partner') then 0 else 1 end);

  if length(clean_name) < 2
    or length(clean_phone) < 7
    or length(clean_company) < 2
    or length(clean_role) < 2
    or length(clean_motivation) < 20
    or next_count < (case when clean_role in ('Closing Agent', 'Referral Partner') then 0 else 1 end)
    or next_count > 500
    or jsonb_typeof(application_data -> 'areas') is distinct from 'array'
    or jsonb_array_length(application_data -> 'areas') < 1 then
    raise exception 'Complete all required partner details, Lagos areas, and portfolio description (min 20 characters).';
  end if;

  update public.partner_applications
    set full_name = clean_name,
        phone = clean_phone,
        company = clean_company,
        role = clean_role,
        areas = array(select jsonb_array_elements_text(application_data -> 'areas')),
        properties_count = next_count,
        motivation = clean_motivation,
        referred_by_code = nullif(clean_referral_code, ''),
        status = 'pending',
        submitted_at = now()
    where id = target_application_id;

  if app_row.referred_by_partner_id is not null
     or exists (
       select 1 from public.partner_applications
       where id = target_application_id and referred_by_partner_id is not null
     ) then
    insert into public.partner_referrals (
      referrer_partner_id, referred_partner_id, referral_code, status, registered_at
    )
    select referred_by_partner_id, actor_id, referred_by_code, 'registered', now()
    from public.partner_applications
    where id = target_application_id
      and referred_by_partner_id is not null
    on conflict (referred_partner_id) do nothing;

    update public.profiles p
      set referred_by_partner_id = coalesce(p.referred_by_partner_id, a.referred_by_partner_id),
          referred_by_code = coalesce(p.referred_by_code, a.referred_by_code)
    from public.partner_applications a
    where a.id = target_application_id
      and p.id = actor_id
      and a.referred_by_partner_id is not null;
  end if;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      'guest',
      'partner_application_resubmitted',
      clean_company,
      'Applicant updated details and resubmitted partner application for review.'
    );
end;
$$;

revoke all on function public.resubmit_partner_application(uuid, jsonb) from public, anon;
grant execute on function public.resubmit_partner_application(uuid, jsonb) to authenticated, service_role;

create or replace function public.sync_approved_partner_application_referral()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'approved'
    and old.status is distinct from 'approved'
    and new.referred_by_partner_id is not null
    and new.referred_by_partner_id <> new.applicant_id then
    insert into public.partner_referrals (
      referrer_partner_id, referred_partner_id, referral_code, status, registered_at
    )
    values (
      new.referred_by_partner_id, new.applicant_id, new.referred_by_code, 'verified', now()
    )
    on conflict (referred_partner_id) do update
      set status = 'verified'
      where public.partner_referrals.referrer_partner_id = excluded.referrer_partner_id
        and public.partner_referrals.status = 'registered';

    update public.profiles
      set referred_by_partner_id = coalesce(referred_by_partner_id, new.referred_by_partner_id),
          referred_by_code = coalesce(referred_by_code, new.referred_by_code)
      where id = new.applicant_id;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_approved_partner_application_referral on public.partner_applications;
create trigger sync_approved_partner_application_referral
  after update of status on public.partner_applications
  for each row execute function public.sync_approved_partner_application_referral();

revoke all on function public.sync_approved_partner_application_referral() from public, anon, authenticated;
grant execute on function public.sync_approved_partner_application_referral() to service_role;

-- ── B. Network referral reward on completion ──────────────────────────────────
drop trigger if exists apply_network_partner_referral_reward on public.bookings;
drop function if exists public.apply_network_partner_referral_reward();

create or replace function public.complete_network_partner_referral_reward()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  listing_row public.properties%rowtype;
  generator_id uuid;
  referral_row public.partner_referrals%rowtype;
  reward integer := 0;
  prior_reward integer := 0;
  available_allocation integer := 0;
  new_allocation integer := 0;
  reward_inserted boolean := false;
begin
  if new.status <> 'completed' or old.status = 'completed' then
    return new;
  end if;

  -- Closing-agent referral rewards are allocated by transition_booking. This
  -- trigger covers bookings without a closing-agent attribution.
  if new.closing_agent_id is not null then
    return new;
  end if;

  if exists (
    select 1 from public.partner_referral_rewards
    where booking_id = new.id
  ) then
    return new;
  end if;

  select * into listing_row
  from public.properties
  where id = new.property_id;
  if not found then
    return new;
  end if;

  -- The partner who generated the stay: the listing's manager/introducer, then
  -- the active property-access relationship.
  generator_id := listing_row.authorised_manager_id;

  if generator_id is null then
    generator_id := listing_row.property_introducer_id;
  end if;

  if generator_id is null then
    select pa.user_id into generator_id
    from public.property_access pa
    where pa.property_id = new.property_id
      and pa.status = 'active'
      and pa.access_role in ('owner', 'submitter', 'manager', 'authorised_manager', 'property_manager')
      and pa.user_id <> new.guest_id
    order by
      case pa.access_role
        when 'owner' then 1
        when 'manager' then 2
        when 'authorised_manager' then 3
        when 'property_manager' then 4
        when 'submitter' then 5
        else 6
      end,
      pa.granted_at asc
    limit 1;
  end if;

  if generator_id is null or generator_id = new.guest_id then
    return new;
  end if;

  select * into referral_row
  from public.partner_referrals
  where referred_partner_id = generator_id
    and referrer_partner_id <> generator_id
  for update;

  if not found then
    return new;
  end if;

  -- Both sides must be active partners: an admin/partner role or an active
  -- partner-network membership.
  if not exists (
    select 1 from public.profiles p
    where p.id = generator_id
      and p.account_status = 'active'
      and (
        p.role in ('partner', 'admin')
        or exists (
          select 1 from public.partner_network_memberships m
          where m.user_id = p.id and m.status = 'active'
        )
      )
  ) or not exists (
    select 1 from public.profiles p
    where p.id = referral_row.referrer_partner_id
      and p.account_status = 'active'
      and (
        p.role in ('partner', 'admin')
        or exists (
          select 1 from public.partner_network_memberships m
          where m.user_id = p.id and m.status = 'active'
        )
      )
  ) then
    return new;
  end if;

  -- First qualifying completed booking activates the referral window but does
  -- not pay a reward. Joining the network is enough: registered referrals
  -- activate as well as verified ones.
  if referral_row.status in ('registered', 'verified') and referral_row.activated_at is null then
    update public.partner_referrals
      set status = 'active',
          activated_at = now(),
          activating_booking_id = new.id,
          eligibility_starts_at = now(),
          eligibility_ends_at = now() + make_interval(days => earning_window_days),
          updated_at = now()
    where id = referral_row.id;

    insert into public.partner_referral_rewards (
      referral_id, referrer_partner_id, referred_closing_agent_id,
      booking_id, booking_reference, owner_listed_price_ngn,
      reward_rate, reward_amount_ngn, payout_status
    )
    values (
      referral_row.id, referral_row.referrer_partner_id, generator_id,
      new.id, new.reference,
      coalesce(new.owner_listed_price_ngn, new.accommodation_subtotal, 0),
      0, 0, 'activated_no_payout'
    )
    on conflict (booking_id) do nothing;
    return new;
  end if;

  if referral_row.status <> 'active'
    or referral_row.eligibility_starts_at is null
    or referral_row.eligibility_starts_at > now()
    or referral_row.eligibility_ends_at is null
    or referral_row.eligibility_ends_at <= now() then
    return new;
  end if;

  if new.direct_referrer_id = referral_row.referrer_partner_id then
    reward := coalesce(new.direct_referrer_reward_ngn, 0);
  else
    reward := public.multiply_ngn_bps(
      coalesce(new.owner_listed_price_ngn, new.accommodation_subtotal, 0),
      250
    );
  end if;

  if reward <= 0 then
    return new;
  end if;

  prior_reward := coalesce(new.direct_referrer_reward_ngn, 0);
  available_allocation := coalesce(new.hamlet_allocation_ngn, 0) + prior_reward;
  if reward > available_allocation then
    -- Fail closed rather than create an underfunded settlement.
    return new;
  end if;
  new_allocation := available_allocation - reward;

  update public.bookings
    set direct_referrer_id = referral_row.referrer_partner_id,
        direct_referrer_reward_ngn = reward,
        hamlet_allocation_ngn = new_allocation
    where id = new.id
      and (
        direct_referrer_id is distinct from referral_row.referrer_partner_id
        or coalesce(direct_referrer_reward_ngn, 0) <> reward
        or coalesce(hamlet_allocation_ngn, 0) <> new_allocation
      );

  insert into public.partner_referral_rewards (
    referral_id, referrer_partner_id, referred_closing_agent_id,
    booking_id, booking_reference, owner_listed_price_ngn,
    reward_rate, reward_amount_ngn, payout_status
  )
  values (
    referral_row.id, referral_row.referrer_partner_id, generator_id,
    new.id, new.reference,
    coalesce(new.owner_listed_price_ngn, new.accommodation_subtotal, 0),
    0.0250, reward, 'pending'
  )
  on conflict (booking_id) do nothing
  returning true into reward_inserted;

  if coalesce(reward_inserted, false) then
    update public.booking_payment_records
      set amount = new_allocation,
          updated_at = now()
      where booking_id = new.id
        and record_type = 'hamlet_allocation';

    insert into public.booking_payment_records (
      booking_id, record_type, amount, provider_reference, status,
      description, variance, operator_name, beneficiary_user_id, payout_status
    )
    values (
      new.id, 'referral_reward', reward, new.reference || ':network_referral',
      'recorded', 'Partner network referral reward (2.5% of owner-listed accommodation price)',
      0, 'HAMLET system', referral_row.referrer_partner_id, 'pending'
    )
    on conflict (provider_reference, record_type, booking_id)
      where provider_reference is not null
    do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists complete_network_partner_referral_reward on public.bookings;
create trigger complete_network_partner_referral_reward
  after update of status on public.bookings
  for each row execute function public.complete_network_partner_referral_reward();

revoke all on function public.complete_network_partner_referral_reward() from public, anon, authenticated;
grant execute on function public.complete_network_partner_referral_reward() to service_role;

-- ── C & D. In-place patches of the live booking functions ─────────────────────
do $migration$
declare
  definition text;
  patched text;
  member_clause constant text := 'and (
          p.role in (''partner'', ''admin'')
          or exists (
            select 1 from public.partner_network_memberships m
            where m.user_id = p.id and m.status = ''active''
          )
        )';
begin
  -- C. transition_booking: registered closing-agent referrals activate.
  definition := pg_get_functiondef('public.transition_booking(text,text,text)'::regprocedure);
  if position('ref_row.status in (''registered'', ''verified'') and ref_row.activated_at is null' in definition) = 0 then
    patched := replace(
      definition,
      'if ref_row.status = ''verified'' and ref_row.activated_at is null then',
      'if ref_row.status in (''registered'', ''verified'') and ref_row.activated_at is null then'
    );
    if patched = definition then
      raise exception 'transition_booking(): closing-agent referral activation check not recognised; patch it manually.';
    end if;
    execute patched;
  end if;

  -- D. enforce_booking_request_integrity: network members are valid closing
  -- agents, and registered referrals set the direct referrer.
  definition := pg_get_functiondef('public.enforce_booking_request_integrity()'::regprocedure);
  if position('partner_network_memberships' in definition) = 0 then
    if (length(definition) - length(replace(definition, 'and p.role in (''partner'', ''admin'')', '')))
         / length('and p.role in (''partner'', ''admin'')') <> 2 then
      raise exception 'enforce_booking_request_integrity(): expected two closing-agent role checks; patch it manually.';
    end if;
    patched := replace(definition, 'and p.role in (''partner'', ''admin'')', member_clause);
    if position('and pr.status in (''verified'', ''active'')' in patched) = 0 then
      raise exception 'enforce_booking_request_integrity(): direct-referrer status filter not recognised; patch it manually.';
    end if;
    patched := replace(
      patched,
      'and pr.status in (''verified'', ''active'')',
      'and pr.status in (''registered'', ''verified'', ''active'')'
    );
    execute patched;
  end if;
end;
$migration$;

-- ── E. Partner sharing RPCs accept network members ────────────────────────────
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
  has_active_membership boolean := false;
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

  if not found or partner_status <> 'active' then
    return false;
  end if;

  select exists (
    select 1
    from public.partner_network_memberships m
    where m.user_id = target_partner_id
      and m.status = 'active'
  ) into has_active_membership;

  if partner_role not in ('partner', 'admin') and not has_active_membership then
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
  has_active_membership boolean := false;
  items jsonb := '[]'::jsonb;
begin
  if actor_id is null then
    return '[]'::jsonb;
  end if;

  select p.role, coalesce(p.account_status, 'active')
    into actor_role, actor_status
    from public.profiles p
    where p.id = actor_id;

  if not found or actor_status <> 'active' then
    return '[]'::jsonb;
  end if;

  select exists (
    select 1
    from public.partner_network_memberships m
    where m.user_id = actor_id
      and m.status = 'active'
  ) into has_active_membership;

  if actor_role not in ('partner', 'admin') and not has_active_membership then
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

notify pgrst, 'reload schema';
