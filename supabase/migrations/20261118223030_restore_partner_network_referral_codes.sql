-- Restore partner-network referral codes after the instant-workspace simplification.
--
-- 20261116090000_instant_partner_workspace_access.sql made an active row in
-- partner_network_memberships the partner entitlement (profiles.role stays 'guest'),
-- but the referral helpers still only recognised profiles.role in ('partner','admin').
-- It also dropped the four-argument join_partner_network(..., referral_code_input)
-- that the Next.js app calls from /partners/start, /partners/apply and the OAuth
-- callback. As a result, network members never received a referral code and their
-- codes could not be resolved or used by people they invited.
--
-- This migration:
--   * restores join_partner_network(next_role, next_company, next_phone,
--     referral_code_input default null): validates referral attribution, locks the
--     primary role against self-service changes, and issues the member's own code;
--   * lets ensure_my_referral_code(), resolve_referral_code() and
--     get_my_partner_attribution_summary() treat active network members as partners;
--   * lets the signup / OAuth / partner-application referral validators accept codes
--     owned by active network members.
-- profiles.role is never changed here.

-- ── Referral code issuance ────────────────────────────────────────────────────
create or replace function public.ensure_my_referral_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  prof public.profiles%rowtype;
  profile_exists boolean := false;
  has_membership boolean := false;
  new_code text;
begin
  if actor_id is null or not public.is_account_active() then
    raise exception 'Sign in with an active HAMLET partner account.';
  end if;

  select * into prof
    from public.profiles
    where id = actor_id
    for update;
  profile_exists := found;

  select exists (
    select 1 from public.partner_network_memberships
    where user_id = actor_id and status = 'active'
  ) into has_membership;

  if not profile_exists or (prof.role not in ('partner', 'admin') and not has_membership) then
    raise exception 'Join the active HAMLET partner network to access a referral code.';
  end if;

  if nullif(btrim(coalesce(prof.referral_code, '')), '') is not null then
    return prof.referral_code;
  end if;

  new_code := public.generate_unique_referral_code(prof.full_name);
  update public.profiles set referral_code = new_code where id = actor_id;
  return new_code;
end;
$$;

revoke all on function public.ensure_my_referral_code() from public, anon;
grant execute on function public.ensure_my_referral_code() to authenticated;

-- ── Public-safe referral code lookup ──────────────────────────────────────────
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

  select p.* into partner_row
    from public.profiles p
    where p.referral_code = clean_code
      and p.account_status = 'active'
      and (
        p.role in ('partner', 'admin')
        or exists (
          select 1
          from public.partner_network_memberships m
          where m.user_id = p.id and m.status = 'active'
        )
      )
    limit 1;

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

-- ── Network registration with referral attribution ────────────────────────────
-- Membership is the immediate workspace entitlement. It does not alter
-- profiles.role, so a partner can still book as a guest using the same account.
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
  actor_profile public.profiles%rowtype;
  referrer_row public.profiles%rowtype;
  clean_company text := btrim(coalesce(next_company, ''));
  clean_phone text := btrim(coalesce(next_phone, ''));
  clean_referral_code text := upper(regexp_replace(btrim(coalesce(referral_code_input, '')), '[^A-Za-z0-9-]', '', 'g'));
  actor_email text;
  referrer_email text;
  actor_phone text;
  referrer_phone text;
  resolved_referral_code text;
  result public.partner_network_memberships%rowtype;
begin
  if actor is null then
    raise exception 'Sign in to join the HAMLET partner network.';
  end if;

  if not public.is_account_active() then
    raise exception 'Your account is not active.';
  end if;

  if next_role is null or next_role not in (
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

  select * into actor_profile
    from public.profiles
    where id = actor
    for update;

  if not found then
    raise exception 'A valid HAMLET profile is required.';
  end if;

  if exists (
    select 1 from public.partner_network_memberships
    where user_id = actor and status = 'suspended'
  ) then
    raise exception 'This partner-network membership is suspended. Contact HAMLET support.';
  end if;

  if clean_referral_code <> '' then
    -- Signup may already have validated and stored this attribution. Preserve it
    -- even if the referrer was suspended after the referred user created an account.
    if actor_profile.referred_by_partner_id is not null
      and upper(coalesce(actor_profile.referred_by_code, '')) = clean_referral_code then
      select * into referrer_row
        from public.profiles p
        where p.id = actor_profile.referred_by_partner_id;
    else
      select p.* into referrer_row
        from public.profiles p
        where p.referral_code = clean_referral_code
          and p.account_status = 'active'
          and (
            p.role in ('partner', 'admin')
            or exists (
              select 1 from public.partner_network_memberships m
              where m.user_id = p.id and m.status = 'active'
            )
          )
        limit 1;
    end if;

    if not found then
      raise exception 'This partner referral code is invalid or no longer active.';
    end if;

    if referrer_row.id = actor then
      raise exception 'Self-referrals are not permitted.';
    end if;

    select lower(btrim(coalesce(u.email, '')))
      into actor_email from auth.users u where u.id = actor;
    select lower(btrim(coalesce(u.email, '')))
      into referrer_email from auth.users u where u.id = referrer_row.id;

    actor_phone := regexp_replace(coalesce(clean_phone, actor_profile.phone, ''), '[^0-9]', '', 'g');
    referrer_phone := regexp_replace(coalesce(referrer_row.phone, ''), '[^0-9]', '', 'g');

    if actor_email <> '' and actor_email = referrer_email then
      raise exception 'Self-referrals are not permitted.';
    end if;
    if actor_phone <> '' and referrer_phone <> '' and actor_phone = referrer_phone then
      raise exception 'Self-referrals using the same phone number are not permitted.';
    end if;

    if actor_profile.referred_by_partner_id is not null
       and actor_profile.referred_by_partner_id <> referrer_row.id then
      raise exception 'This account already has a recorded direct referring partner.';
    end if;

    resolved_referral_code := referrer_row.referral_code;
  else
    resolved_referral_code := actor_profile.referred_by_code;
    if actor_profile.referred_by_partner_id is not null then
      select p.referral_code into resolved_referral_code
        from public.profiles p
        where p.id = actor_profile.referred_by_partner_id;
    end if;
  end if;

  insert into public.partner_network_memberships (user_id, primary_role, company, phone)
  values (actor, next_role, clean_company, clean_phone)
  on conflict (user_id) do update
    set company = excluded.company,
        phone = excluded.phone,
        updated_at = now()
  where public.partner_network_memberships.status = 'active'
    and public.partner_network_memberships.primary_role = excluded.primary_role
  returning * into result;

  if result.user_id is null then
    raise exception 'Your primary partner role is already set. Contact HAMLET support to request a role change.';
  end if;

  update public.profiles
    set phone = coalesce(nullif(btrim(phone), ''), clean_phone),
        company = coalesce(nullif(btrim(company), ''), clean_company),
        referral_code = coalesce(
          nullif(btrim(referral_code), ''),
          public.generate_unique_referral_code(coalesce(full_name, 'HAMLET Partner'))
        ),
        referred_by_code = coalesce(referred_by_code, resolved_referral_code),
        referred_by_partner_id = coalesce(referred_by_partner_id, referrer_row.id)
    where id = actor;

  if referrer_row.id is not null then
    insert into public.partner_referrals (
      referrer_partner_id, referred_partner_id, referral_code, status, registered_at
    )
    values (referrer_row.id, actor, resolved_referral_code, 'registered', now())
    on conflict (referred_partner_id) do nothing;
  elsif actor_profile.referred_by_partner_id is not null then
    insert into public.partner_referrals (
      referrer_partner_id, referred_partner_id, referral_code, status, registered_at
    )
    values (
      actor_profile.referred_by_partner_id,
      actor,
      coalesce(resolved_referral_code, actor_profile.referred_by_code, ''),
      'registered',
      now()
    )
    on conflict (referred_partner_id) do nothing;
  end if;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
  values (
    actor,
    actor_profile.role,
    'partner_network_joined',
    actor::text,
    'Registered as ' || next_role || '; company/display name: ' || clean_company
  );

  return result;
end;
$$;

revoke all on function public.join_partner_network(text, text, text, text) from public, anon;
grant execute on function public.join_partner_network(text, text, text, text) to authenticated;

-- ── Attribution summary for network members ───────────────────────────────────
-- Same payload as 20261024140000, plus referral status/timestamps; the gate now
-- includes active network members.
create or replace function public.get_my_partner_attribution_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role text;
  has_membership boolean := false;
  referred_arr jsonb := '[]'::jsonb;
  rewards_arr jsonb := '[]'::jsonb;
  closed_arr jsonb := '[]'::jsonb;
begin
  if actor_id is null then
    return jsonb_build_object(
      'referred_partners', '[]'::jsonb,
      'referred_rewards', '[]'::jsonb,
      'closed_bookings', '[]'::jsonb
    );
  end if;

  select p.role into actor_role
    from public.profiles p
    where p.id = actor_id
      and p.account_status = 'active';

  select exists (
    select 1 from public.partner_network_memberships m
    where m.user_id = actor_id and m.status = 'active'
  ) into has_membership;

  if actor_role is null or (actor_role not in ('partner', 'admin') and not has_membership) then
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
      'registered_at', pr.registered_at,
      'activated_at', pr.activated_at
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

-- ── Referral validators accept codes owned by active network members ──────────
-- Patch the live definitions in place so their other checks (self-referral,
-- duplicate referrer, OAuth window, admin bootstrap) are preserved unchanged.
do $migration$
declare
  target regprocedure;
  function_definition text;
  updated_definition text;
begin
  foreach target in array array[
    'public.create_profile_for_new_user()'::regprocedure,
    'public.claim_oauth_signup_referral(text)'::regprocedure,
    'public.validate_partner_application_referral()'::regprocedure
  ]
  loop
    function_definition := pg_get_functiondef(target);
    updated_definition := replace(
      function_definition,
      'and p.role in (''partner'', ''admin'')',
      'and (
          p.role in (''partner'', ''admin'')
          or exists (
            select 1 from public.partner_network_memberships m
            where m.user_id = p.id and m.status = ''active''
          )
        )'
    );
    if updated_definition <> function_definition then
      execute updated_definition;
    end if;
  end loop;
end;
$migration$;

notify pgrst, 'reload schema';
