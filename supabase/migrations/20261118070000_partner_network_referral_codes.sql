-- Partner-network referral codes and referral attribution.
--
-- Since 20261031100000/20261116090000, joining the HAMLET partner network creates an
-- active `partner_network_memberships` row and deliberately keeps `profiles.role`
-- unchanged (usually 'guest'). Referral-code issuance and lookups, however, still
-- keyed on `profiles.role in ('partner', 'admin')`, so network members never
-- received an `HML-` referral code, their codes could not be resolved, and their
-- attribution summary was always empty. The app also calls
-- `join_partner_network(next_role, next_company, next_phone, referral_code_input)`,
-- which no migration defined.
--
-- This migration:
--   * treats an active network membership as referral-eligible,
--   * issues a referral code when a membership becomes active (and backfills),
--   * adds the optional `referral_code_input` argument to join_partner_network(),
--   * exposes referral status in get_my_partner_attribution_summary().

-- ---------------------------------------------------------------------------
-- Referral eligibility helper
-- ---------------------------------------------------------------------------
create or replace function public.is_referral_eligible_partner(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = target_user_id
      and p.account_status = 'active'
      and (
        p.role in ('partner', 'admin')
        or exists (
          select 1
          from public.partner_network_memberships m
          where m.user_id = p.id
            and m.status = 'active'
        )
      )
  );
$$;

revoke all on function public.is_referral_eligible_partner(uuid) from public, anon, authenticated;
grant execute on function public.is_referral_eligible_partner(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Issue referral codes to active network members
-- ---------------------------------------------------------------------------
create or replace function public.assign_referral_code_on_network_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'active' then
    update public.profiles p
      set referral_code = public.generate_unique_referral_code(coalesce(p.full_name, p.id::text))
      where p.id = new.user_id
        and p.referral_code is null;
  end if;
  return new;
end;
$$;

revoke all on function public.assign_referral_code_on_network_membership() from public, anon, authenticated;
grant execute on function public.assign_referral_code_on_network_membership() to service_role;

drop trigger if exists assign_referral_code_on_network_membership
  on public.partner_network_memberships;
create trigger assign_referral_code_on_network_membership
  after insert or update of status on public.partner_network_memberships
  for each row execute function public.assign_referral_code_on_network_membership();

update public.profiles p
  set referral_code = public.generate_unique_referral_code(coalesce(p.full_name, p.id::text))
  from public.partner_network_memberships m
  where m.user_id = p.id
    and m.status = 'active'
    and p.referral_code is null;

-- ---------------------------------------------------------------------------
-- Referral code lookups accept active network members
-- ---------------------------------------------------------------------------
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
    where referral_code = clean_code;

  if not found or not public.is_referral_eligible_partner(partner_row.id) then
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
  if not found or not public.is_referral_eligible_partner(actor_id) then
    raise exception 'Only HAMLET partners and administrators have referral codes.';
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

-- ---------------------------------------------------------------------------
-- join_partner_network() with optional referral attribution
-- ---------------------------------------------------------------------------
drop function if exists public.join_partner_network(text, text, text);

create or replace function public.join_partner_network(
  next_role text,
  next_company text,
  next_phone text,
  referral_code_input text default null
)
returns public.partner_network_memberships
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_profile_role text;
  clean_company text := btrim(coalesce(next_company, ''));
  clean_phone text := btrim(coalesce(next_phone, ''));
  clean_referral_code text := upper(regexp_replace(
    btrim(coalesce(referral_code_input, '')), '[^A-Za-z0-9-]', '', 'g'
  ));
  referrer_id uuid;
  referrer_phone text;
  result public.partner_network_memberships%rowtype;
begin
  if actor is null then
    raise exception 'Sign in to join the HAMLET partner network.';
  end if;

  if not public.is_account_active() then
    raise exception 'Your account is not active.';
  end if;

  if next_role not in (
    'property_owner',
    'authorised_manager',
    'multi_property_operator',
    'closing_agent'
  ) then
    raise exception 'Choose a valid partner role.';
  end if;

  if char_length(clean_company) not between 2 and 160 then
    raise exception 'Enter a business or display name (2–160 characters).';
  end if;

  if char_length(regexp_replace(clean_phone, '[^0-9]', '', 'g')) not between 7 and 15 then
    raise exception 'Enter a valid phone number.';
  end if;

  if exists (
    select 1
    from public.partner_network_memberships
    where user_id = actor
      and status = 'suspended'
  ) then
    raise exception 'This partner-network membership is suspended. Contact HAMLET support.';
  end if;

  if exists (
    select 1
    from public.partner_network_memberships
    where user_id = actor
      and status = 'active'
      and primary_role <> next_role
  ) then
    raise exception 'Your primary partner role is already set. Contact HAMLET support to change it.';
  end if;

  if clean_referral_code <> '' then
    select p.id, regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g')
      into referrer_id, referrer_phone
      from public.profiles p
      where p.referral_code = clean_referral_code;

    if referrer_id is null or not public.is_referral_eligible_partner(referrer_id) then
      raise exception 'This partner referral code is invalid or no longer active.';
    end if;

    if referrer_id = actor
       or (referrer_phone <> '' and referrer_phone = regexp_replace(clean_phone, '[^0-9]', '', 'g')) then
      raise exception 'Self-referrals are not permitted.';
    end if;
  end if;

  insert into public.partner_network_memberships (user_id, primary_role, company, phone)
  values (actor, next_role, clean_company, clean_phone)
  on conflict (user_id) do update
    set primary_role = excluded.primary_role,
        company = excluded.company,
        phone = excluded.phone,
        updated_at = now()
  where public.partner_network_memberships.status = 'active'
  returning * into result;

  if result.user_id is null then
    raise exception 'Membership could not be activated.';
  end if;

  -- Backfill contact details on the user's profile when blank so subsequent
  -- verification forms do not ask for duplicate entry; never alter `profiles.role`.
  update public.profiles
    set phone = coalesce(nullif(btrim(phone), ''), clean_phone),
        company = coalesce(nullif(btrim(company), ''), clean_company)
    where id = actor
    returning role into actor_profile_role;

  -- Referral attribution is first-come and never overwritten.
  if referrer_id is not null then
    insert into public.partner_referrals (
      referrer_partner_id, referred_partner_id, referral_code, status, registered_at
    )
    values (referrer_id, actor, clean_referral_code, 'registered', now())
    on conflict (referred_partner_id) do nothing;

    update public.profiles
      set referred_by_partner_id = coalesce(referred_by_partner_id, referrer_id),
          referred_by_code = coalesce(referred_by_code, clean_referral_code)
      where id = actor;
  end if;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
  values (
    actor,
    coalesce(actor_profile_role, 'guest'),
    'partner_network_joined',
    actor::text,
    'Registered as ' || next_role || '; company/display name: ' || clean_company
      || case when referrer_id is not null then '; referral code: ' || clean_referral_code else '' end
  );

  return result;
end;
$$;

revoke all on function public.join_partner_network(text, text, text, text) from public, anon;
grant execute on function public.join_partner_network(text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Attribution summary for network members (adds referral status)
-- ---------------------------------------------------------------------------
create or replace function public.get_my_partner_attribution_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  referred_arr jsonb := '[]'::jsonb;
  rewards_arr jsonb := '[]'::jsonb;
  closed_arr jsonb := '[]'::jsonb;
begin
  if actor_id is null or not public.is_referral_eligible_partner(actor_id) then
    return jsonb_build_object(
      'referred_partners', '[]'::jsonb,
      'referred_rewards', '[]'::jsonb,
      'closed_bookings', '[]'::jsonb
    );
  end if;

  select coalesce(
    jsonb_agg(jsonb_build_object(
      'referral_id', pr.id,
      'referred_partner_id', pr.referred_partner_id,
      'referred_name', coalesce(nullif(btrim(prof.full_name), ''), 'Referred partner'),
      'referred_company', nullif(btrim(coalesce(prof.company, '')), ''),
      'status', pr.status,
      'registered_at', pr.registered_at
    ) order by pr.registered_at desc),
    '[]'::jsonb
  )
  into referred_arr
  from public.partner_referrals pr
  left join public.profiles prof on prof.id = pr.referred_partner_id
  where pr.referrer_partner_id = actor_id;

  select coalesce(
    jsonb_agg(jsonb_build_object(
      'reward_id', rw.id,
      'referred_agent_name', coalesce(nullif(btrim(prof.full_name), ''), 'Closing agent')
    )),
    '[]'::jsonb
  )
  into rewards_arr
  from public.partner_referral_rewards rw
  left join public.profiles prof on prof.id = rw.referred_closing_agent_id
  where rw.referrer_partner_id = actor_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'booking_id', b.id,
        'booking_reference', b.reference,
        'property_id', b.property_id,
        'property_title', coalesce(prop.title, 'Stay'),
        'area', coalesce(prop.area, ''),
        'check_in', b.check_in::text,
        'check_out', b.check_out::text,
        'nights', greatest(1, b.check_out - b.check_in),
        'status', b.status,
        'owner_listed_price_ngn', coalesce(b.owner_listed_price_ngn, b.accommodation_subtotal),
        'closing_agent_commission_ngn', coalesce(b.closing_agent_commission_ngn, 0),
        'created_at', b.created_at
      )
      order by b.created_at desc
    ),
    '[]'::jsonb
  )
  into closed_arr
  from public.bookings b
  left join public.properties prop on prop.id = b.property_id
  where b.closing_agent_id = actor_id;

  return jsonb_build_object(
    'referred_partners', referred_arr,
    'referred_rewards', rewards_arr,
    'closed_bookings', closed_arr
  );
end;
$$;

revoke all on function public.get_my_partner_attribution_summary() from public, anon;
grant execute on function public.get_my_partner_attribution_summary() to authenticated, service_role;

notify pgrst, 'reload schema';
