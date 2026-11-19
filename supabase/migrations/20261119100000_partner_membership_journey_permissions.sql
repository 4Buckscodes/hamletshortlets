-- Make the instant partner-network membership model consistent across
-- referral codes, sharing analytics, booking attribution and booking operations.
-- An active membership grants partner capabilities without elevating profiles.role.

create or replace function public.ensure_my_referral_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  prof public.profiles%rowtype;
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

  if not found then
    raise exception 'A valid HAMLET profile is required.';
  end if;

  select exists (
    select 1 from public.partner_network_memberships
    where user_id = actor_id and status = 'active'
  ) into has_membership;

  if prof.role not in ('partner', 'admin') and not has_membership then
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

create or replace function public.resolve_referral_code(code_input text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  clean_code text := upper(regexp_replace(
    btrim(coalesce(code_input, '')),
    '[^A-Za-z0-9-]', '', 'g'
  ));
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
          select 1 from public.partner_network_memberships m
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

do $migration$
declare
  fn text;
  updated text;
begin
  -- Booking attribution must recognise an active network member as a valid
  -- closing agent, even though their profile role intentionally remains guest.
  fn := pg_get_functiondef('public.enforce_booking_request_integrity()'::regprocedure);
  updated := replace(
    fn,
    'and p.role in (''partner'', ''admin'')',
    'and (p.role in (''partner'', ''admin'') or exists (
          select 1 from public.partner_network_memberships m
          where m.user_id = p.id and m.status = ''active''
        ))'
  );
  if updated = fn then
    raise exception 'Could not patch enforce_booking_request_integrity partner membership checks.';
  end if;
  execute updated;

  -- Active members may manage bookings for properties explicitly assigned to them.
  -- A member who is also the guest must still be able to cancel their own request.
  fn := pg_get_functiondef('public.transition_booking(text,text,text)'::regprocedure);
  updated := replace(
    fn,
    'if actor_role = ''guest'' then',
    'if actor_role = ''guest'' and booking_row.guest_id = actor_id and next_status = ''cancelled'' then'
  );
  updated := replace(
    updated,
    'elsif actor_role in (''partner'', ''admin'') then',
    'elsif actor_role in (''partner'', ''admin'') or public.has_role(''partner'') then'
  );
  if updated = fn then
    raise exception 'Could not patch transition_booking partner membership checks.';
  end if;
  execute updated;

  -- Marketing analytics must use the same active-membership entitlement as the UI.
  fn := pg_get_functiondef('public.get_my_marketing_performance(integer)'::regprocedure);
  updated := replace(
    fn,
    'if actor_role not in (''partner'', ''admin'') or actor_status <> ''active'' then',
    'if actor_status is distinct from ''active'' or (
      coalesce(actor_role, '''') not in (''partner'', ''admin'')
      and not exists (
        select 1 from public.partner_network_memberships m
        where m.user_id = actor_id and m.status = ''active''
      )
    ) then'
  );
  if updated = fn then
    raise exception 'Could not patch get_my_marketing_performance membership checks.';
  end if;
  execute updated;

  -- Referral summary access is also granted to active network members.
  fn := pg_get_functiondef('public.get_my_partner_attribution_summary()'::regprocedure);
  updated := replace(
    fn,
    'if actor_role not in (''partner'', ''admin'') then',
    'if coalesce(actor_role, '''') not in (''partner'', ''admin'')
       and not exists (
         select 1 from public.partner_network_memberships m
         where m.user_id = actor_id and m.status = ''active''
       ) then'
  );
  if updated <> fn then
    execute updated;
  end if;

  -- Administrators may assign approved properties to an active network member
  -- without requiring a profile-role elevation.
  fn := pg_get_functiondef('public.grant_property_assignment(text,uuid,text,numeric,text)'::regprocedure);
  updated := replace(
    fn,
    'if not found or partner_profile.role <> ''partner'' then',
    'if not found or (
      partner_profile.role not in (''partner'', ''admin'')
      and not exists (
        select 1 from public.partner_network_memberships m
        where m.user_id = target_partner_id and m.status = ''active''
      )
    ) then'
  );
  if updated = fn then
    raise exception 'Could not patch grant_property_assignment membership checks.';
  end if;
  execute updated;

  -- Legacy partner applications and resubmissions must accept referral codes
  -- issued to active network members as well as elevated partner/admin profiles.
  fn := pg_get_functiondef('public.validate_partner_application_referral()'::regprocedure);
  updated := replace(
    fn,
    'from public.profiles
    where referral_code = clean_code
      and role in (''partner'', ''admin'')
      and account_status = ''active'';',
    'from public.profiles p
    where p.referral_code = clean_code
      and p.account_status = ''active''
      and (
        p.role in (''partner'', ''admin'')
        or exists (
          select 1 from public.partner_network_memberships m
          where m.user_id = p.id and m.status = ''active''
        )
      );'
  );
  if updated <> fn then
    execute updated;
  end if;

  fn := pg_get_functiondef('public.resubmit_partner_application(uuid,jsonb)'::regprocedure);
  updated := replace(
    fn,
    'and p.role in (''partner'', ''admin'')
          and p.account_status = ''active''',
    'and p.account_status = ''active''
          and (
            p.role in (''partner'', ''admin'')
            or exists (
              select 1 from public.partner_network_memberships m
              where m.user_id = p.id and m.status = ''active''
            )
          )'
  );
  if updated <> fn then
    execute updated;
  end if;

  -- These optional reward functions are present in the full referral migration
  -- chain; keep them membership-aware when that chain is deployed.
  if to_regprocedure('public.apply_network_partner_referral_reward()') is not null then
    fn := pg_get_functiondef('public.apply_network_partner_referral_reward()'::regprocedure);
    updated := replace(
      fn,
      'and referred.role in (''partner'', ''admin'')',
      'and (
      referred.role in (''partner'', ''admin'')
      or exists (
        select 1 from public.partner_network_memberships m
        where m.user_id = referred.id and m.status = ''active''
      )
    )'
    );
    updated := replace(
      updated,
      'and referrer.role in (''partner'', ''admin'')',
      'and (
      referrer.role in (''partner'', ''admin'')
      or exists (
        select 1 from public.partner_network_memberships m
        where m.user_id = referrer.id and m.status = ''active''
      )
    )'
    );
    if updated <> fn then execute updated; end if;
  end if;

  if to_regprocedure('public.complete_network_partner_referral_reward()') is not null then
    fn := pg_get_functiondef('public.complete_network_partner_referral_reward()'::regprocedure);
    updated := replace(
      fn,
      'from public.profiles where id = generator_id and role in (''partner'', ''admin'')',
      'from public.profiles p
    where p.id = generator_id
      and (
        p.role in (''partner'', ''admin'')
        or exists (
          select 1 from public.partner_network_memberships m
          where m.user_id = p.id and m.status = ''active''
        )
      )'
    );
    updated := replace(
      updated,
      'from public.profiles where id = referral_row.referrer_partner_id and role in (''partner'', ''admin'')',
      'from public.profiles p
    where p.id = referral_row.referrer_partner_id
      and (
        p.role in (''partner'', ''admin'')
        or exists (
          select 1 from public.partner_network_memberships m
          where m.user_id = p.id and m.status = ''active''
        )
      )'
    );
    if updated <> fn then execute updated; end if;
  end if;
end;
$migration$;

notify pgrst, 'reload schema';
