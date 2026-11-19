-- Make the instant partner-network membership model consistent across
-- referral codes, sharing analytics, booking attribution and booking operations.
-- An active membership grants partner capabilities without elevating profiles.role.

-- The partner role helper must understand the membership model everywhere
-- policies and server-side RPCs ask whether the caller is a partner.
create or replace function public.has_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.account_status = 'active'
      and (
        (required_role <> 'partner' and p.role = required_role)
        or (
          required_role = 'partner'
          and exists (
            select 1
            from public.partner_network_memberships m
            where m.user_id = p.id
              and m.status = 'active'
          )
        )
      )
  );
$;

revoke all on function public.has_role(text) from public, anon;
grant execute on function public.has_role(text) to authenticated, service_role;

-- QR image rendering is a preview, not a guest visit. Validate a share token
-- without creating a visit event or first-touch attribution session.
create or replace function public.validate_partner_share_token(
  incoming_share_token text,
  target_property_id text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $
  select exists (
    select 1
    from public.partner_share_links psl
    where psl.share_token = lower(btrim(coalesce(incoming_share_token, '')))
      and psl.property_id = target_property_id
      and psl.status = 'active'
      and (psl.expires_at is null or psl.expires_at > now())
      and public.can_partner_share_property(psl.property_id, psl.partner_id)
  );
$;

revoke all on function public.validate_partner_share_token(text, text) from public;
grant execute on function public.validate_partner_share_token(text, text)
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

  new_code := public.generate_unique_referral_code(coalesce(prof.full_name, 'HAMLET Partner'));
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
  if updated = fn and position('partner_network_memberships' in fn) = 0 then
    raise exception 'Could not patch enforce_booking_request_integrity partner membership checks.';
  elsif updated <> fn then
    execute updated;
  end if;

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
  if updated = fn and position('public.has_role(''partner'')' in fn) = 0 then
    raise exception 'Could not patch transition_booking partner membership checks.';
  elsif updated <> fn then
    execute updated;
  end if;

  -- The Share & Studio card and WhatsApp copy require the owner base rate
  -- as well as the guest-facing rate. Keep the RPC response aligned to its UI type.
  fn := pg_get_functiondef('public.list_partner_shareable_properties()'::regprocedure);
  updated := replace(
    fn,
    '''allow_partner_sharing'', coalesce(pr.allow_partner_sharing, true),',
    '''allow_partner_sharing'', coalesce(pr.allow_partner_sharing, true),
        ''nightly_rate'', pr.nightly_rate,'
  );
  if updated = fn and position('''nightly_rate''' in fn) = 0 then
    raise exception 'Could not add owner nightly rate to list_partner_shareable_properties.';
  elsif updated <> fn then
    execute updated;
  end if;

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
  if updated = fn and position('partner_network_memberships' in fn) = 0 then
    raise exception 'Could not patch get_my_marketing_performance membership checks.';
  elsif updated <> fn then
    execute updated;
  end if;

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
  updated := replace(
    updated,
    'if not found or partner_role_val <> ''partner'' then',
    'if not found or (
      partner_role_val not in (''partner'', ''admin'')
      and not exists (
        select 1 from public.partner_network_memberships m
        where m.user_id = target_partner_id and m.status = ''active''
      )
    ) then'
  );
  if updated = fn and position('partner_network_memberships' in fn) = 0 then
    raise exception 'Could not patch grant_property_assignment membership checks.';
  elsif updated <> fn then
    execute updated;
  end if;

  -- Google OAuth and email signup referral capture must recognise active
  -- network members who intentionally retain profiles.role = 'guest'.
  fn := pg_get_functiondef('public.create_profile_for_new_user()'::regprocedure);
  updated := replace(
    fn,
    'and p.role in (''partner'', ''admin'')',
    'and (
          p.role in (''partner'', ''admin'')
          or exists (
            select 1 from public.partner_network_memberships m
            where m.user_id = p.id and m.status = ''active''
          )
        )'
  );
  if updated <> fn then execute updated; end if;

  fn := pg_get_functiondef('public.claim_oauth_signup_referral(text)'::regprocedure);
  updated := replace(
    fn,
    'and p.role in (''partner'', ''admin'')',
    'and (
          p.role in (''partner'', ''admin'')
          or exists (
            select 1 from public.partner_network_memberships m
            where m.user_id = p.id and m.status = ''active''
          )
        )'
  );
  if updated <> fn then execute updated; end if;

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
    -- Later lifecycle hardening wraps these role checks in NOT EXISTS blocks.
    updated := replace(
      updated,
      'select 1 from public.profiles
    where id = generator_id
      and role in (''partner'', ''admin'')
      and account_status = ''active''',
      'select 1 from public.profiles p
    where p.id = generator_id
      and p.account_status = ''active''
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
      'select 1 from public.profiles
    where id = referral_row.referrer_partner_id
      and role in (''partner'', ''admin'')
      and account_status = ''active''',
      'select 1 from public.profiles p
    where p.id = referral_row.referrer_partner_id
      and p.account_status = ''active''
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
