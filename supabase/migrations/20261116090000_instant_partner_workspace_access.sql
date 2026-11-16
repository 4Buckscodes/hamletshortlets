-- Instant partner workspace access with progressive trust and payout verification.
-- Partner-network membership grants the workspace without changing the guest account role.
-- Property publication and partner identity verification remain separate controls.

create or replace function public.has_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = required_role
  )
  or (
    required_role = 'partner'
    and exists (
      select 1
      from public.partner_network_memberships m
      join public.profiles p on p.id = m.user_id
      where m.user_id = (select auth.uid())
        and m.status = 'active'
        and p.account_status = 'active'
    )
  );
$$;

-- Inventory permissions are role-specific. Closing agents can use sharing,
-- referrals and earnings, but cannot submit an owner's property without authority.
create or replace function public.can_submit_partner_property()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and public.is_account_active()
    and (
      public.has_role('admin')
      or exists (
        select 1
        from public.profiles p
        where p.id = (select auth.uid())
          and p.role = 'partner'
          and (
            p.partner_role is null
            or lower(p.partner_role) in (
              'property owner',
              'authorised manager',
              'authorised property manager',
              'multi-property operator'
            )
          )
      )
      or exists (
        select 1
        from public.partner_network_memberships m
        where m.user_id = (select auth.uid())
          and m.status = 'active'
          and m.primary_role in (
            'property_owner',
            'authorised_manager',
            'multi_property_operator'
          )
      )
      or exists (
        select 1
        from public.partner_applications application
        where application.applicant_id = (select auth.uid())
          and application.status in ('pending', 'needs_correction')
          and application.role in (
            'Property owner',
            'Authorised manager',
            'Multi-property operator'
          )
      )
    );
$$;

revoke all on function public.can_submit_partner_property() from public, anon;
grant execute on function public.can_submit_partner_property() to authenticated;

-- A registered, active network member may share approved stays. Property access
-- and the owner's allow_partner_sharing setting still control which stays can be shared.
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
  account_role text;
  account_status text;
  has_network_membership boolean := false;
  has_active_access boolean := false;
  has_revoked_access boolean := false;
begin
  if target_partner_id is null or target_property_id is null then
    return false;
  end if;

  select p.role, coalesce(p.account_status, 'active')
    into account_role, account_status
    from public.profiles p
    where p.id = target_partner_id;

  if not found or account_status <> 'active' then
    return false;
  end if;

  select exists (
    select 1
    from public.partner_network_memberships m
    where m.user_id = target_partner_id
      and m.status = 'active'
  ) into has_network_membership;

  if account_role not in ('partner', 'admin') and not has_network_membership then
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

  if account_role = 'admin' or coalesce(has_active_access, false) then
    return true;
  end if;

  return prop_allow_sharing;
end;
$$;

revoke all on function public.can_partner_share_property(text, uuid) from public, anon;
grant execute on function public.can_partner_share_property(text, uuid) to authenticated, service_role;

-- Referral codes are available as soon as a member joins the network.
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
      );

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

-- The auth trigger accepts referral codes belonging to active network members too.
create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(btrim(coalesce(new.email, '')));
  is_preauthorized_admin boolean := false;
  assigned_role text := 'guest';
  raw_referral_code text := upper(regexp_replace(
    btrim(coalesce(new.raw_user_meta_data ->> 'referred_by_code', '')),
    '[^A-Za-z0-9-]', '', 'g'
  ));
  resolved_referrer_id uuid;
  resolved_referral_code text;
  referrer_email text;
  referrer_phone text;
  submitted_phone text := regexp_replace(coalesce(new.raw_user_meta_data ->> 'phone', ''), '[^0-9]', '', 'g');
  given_family_name text := btrim(concat_ws(
    ' ',
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'given_name', '')), ''),
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'family_name', '')), '')
  ));
  resolved_full_name text;
begin
  if normalized_email <> '' then
    select exists (
      select 1 from public.admin_bootstrap_emails where email = normalized_email
    ) into is_preauthorized_admin;
  end if;

  if is_preauthorized_admin then
    assigned_role := 'admin';
  end if;

  if raw_referral_code <> '' then
    select p.id, p.referral_code
      into resolved_referrer_id, resolved_referral_code
      from public.profiles p
      where p.referral_code = raw_referral_code
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

    if resolved_referrer_id is null then
      raise exception 'This referral code is invalid or no longer active.';
    end if;

    select lower(btrim(coalesce(u.email, ''))),
           regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g')
      into referrer_email, referrer_phone
      from public.profiles p
      join auth.users u on u.id = p.id
      where p.id = resolved_referrer_id;

    if referrer_email <> '' and referrer_email = normalized_email then
      raise exception 'Self-referrals are not permitted.';
    end if;

    if submitted_phone <> '' and referrer_phone <> ''
      and submitted_phone = referrer_phone then
      raise exception 'Self-referrals using the same phone number are not permitted.';
    end if;
  end if;

  resolved_full_name := left(
    coalesce(
      nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
      nullif(btrim(coalesce(new.raw_user_meta_data ->> 'name', '')), ''),
      nullif(given_family_name, ''),
      case when is_preauthorized_admin then 'HAMLET Operations' else '' end
    ),
    120
  );

  insert into public.profiles (
    id, full_name, phone, role, company, referred_by_code, referred_by_partner_id
  )
  values (
    new.id,
    resolved_full_name,
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'phone', '')), ''),
    assigned_role,
    case when is_preauthorized_admin then 'HAMLET' else null end,
    nullif(resolved_referral_code, ''),
    resolved_referrer_id
  );

  if is_preauthorized_admin then
    insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
      values (
        new.id,
        'admin',
        'admin_bootstrapped',
        normalized_email,
        'Administrator account automatically provisioned from pre-authorized email registry.'
      );
  end if;

  return new;
end;
$$;

create or replace function public.claim_oauth_signup_referral(code_input text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  clean_code text := upper(regexp_replace(btrim(coalesce(code_input, '')), '[^A-Za-z0-9-]', '', 'g'));
  actor_profile public.profiles%rowtype;
  actor_email text;
  actor_created_at timestamptz;
  actor_phone text;
  referrer_row public.profiles%rowtype;
  referrer_email text;
  referrer_phone text;
begin
  if actor_id is null then
    raise exception 'Sign in to claim a referral code.';
  end if;

  if clean_code = '' then
    return false;
  end if;

  select * into actor_profile
    from public.profiles
    where id = actor_id
    for update;

  if not found or actor_profile.account_status <> 'active' then
    return false;
  end if;

  if actor_profile.role <> 'guest'
    or actor_profile.referred_by_code is not null
    or actor_profile.referred_by_partner_id is not null then
    return false;
  end if;

  select lower(btrim(coalesce(u.email, ''))), u.created_at
    into actor_email, actor_created_at
    from auth.users u
    where u.id = actor_id;

  if actor_created_at is null or actor_created_at < (now() - interval '15 minutes') then
    return false;
  end if;

  select * into referrer_row
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
    raise exception 'This referral code is invalid or no longer active.';
  end if;

  if referrer_row.id = actor_id then
    raise exception 'Self-referrals are not permitted.';
  end if;

  select lower(btrim(coalesce(u.email, '')))
    into referrer_email
    from auth.users u
    where u.id = referrer_row.id;

  if actor_email <> '' and referrer_email <> '' and actor_email = referrer_email then
    raise exception 'Self-referrals are not permitted.';
  end if;

  actor_phone := regexp_replace(coalesce(actor_profile.phone, ''), '[^0-9]', '', 'g');
  referrer_phone := regexp_replace(coalesce(referrer_row.phone, ''), '[^0-9]', '', 'g');

  if actor_phone <> '' and referrer_phone <> '' and actor_phone = referrer_phone then
    raise exception 'Self-referrals using the same phone number are not permitted.';
  end if;

  update public.profiles
    set referred_by_code = referrer_row.referral_code,
        referred_by_partner_id = referrer_row.id
    where id = actor_id;

  return true;
end;
$$;

revoke all on function public.claim_oauth_signup_referral(text) from public, anon;
grant execute on function public.claim_oauth_signup_referral(text) to authenticated;

-- Referral attribution from the partner application form remains immutable and accepts
-- active network members as valid referrers.
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
      );

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
    and regexp_replace(referrer_row.phone, '[^0-9]', '', 'g') <> ''
    and regexp_replace(referrer_row.phone, '[^0-9]', '', 'g') = regexp_replace(coalesce(new.phone, ''), '[^0-9]', '', 'g') then
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

revoke all on function public.validate_partner_application_referral() from public, anon, authenticated;

-- Membership is the immediate workspace entitlement. It does not alter profiles.role,
-- so a partner can still book as a guest using the same account.
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
    set primary_role = excluded.primary_role,
        company = excluded.company,
        phone = excluded.phone,
        updated_at = now()
  where public.partner_network_memberships.status = 'active'
  returning * into result;

  if result.user_id is null then
    raise exception 'Membership could not be activated.';
  end if;

  update public.profiles
    set phone = coalesce(nullif(btrim(phone), ''), clean_phone),
        company = coalesce(nullif(btrim(company), ''), clean_company),
        partner_role = case next_role
          when 'property_owner' then 'Property owner'
          when 'authorised_manager' then 'Authorised manager'
          when 'multi_property_operator' then 'Multi-property operator'
          when 'closing_agent' then 'Closing agent'
        end,
        referral_code = coalesce(referral_code, public.generate_unique_referral_code(full_name)),
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

-- Admin review of identity/authority is now separate from workspace access.
-- Approving verification records must not convert the member's guest account into
-- a partner-only account or remove their ability to book stays.
create or replace function public.approve_partner_application()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    update public.profiles
      set full_name = new.full_name,
          phone = new.phone,
          company = new.company,
          partner_role = new.role
      where id = new.applicant_id;
  end if;
  return new;
end;
$$;

-- Only identity-verified partners can be marked paid. They can still register,
-- list, share and view earnings while their identity check is pending.
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
  beneficiary_is_partner boolean := false;
  beneficiary_verified boolean := false;
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

  if next_payout_status = 'paid' and entry_row.beneficiary_user_id is not null then
    select (
      p.role in ('partner', 'admin')
      or exists (
        select 1
        from public.partner_network_memberships m
        where m.user_id = p.id and m.status = 'active'
      )
    ) into beneficiary_is_partner
    from public.profiles p
    where p.id = entry_row.beneficiary_user_id
      and p.account_status = 'active';

    if coalesce(beneficiary_is_partner, false) then
      select exists (
        select 1
        from public.partner_applications a
        where a.applicant_id = entry_row.beneficiary_user_id
          and a.status = 'approved'
      ) into beneficiary_verified;

      if not beneficiary_verified then
        raise exception 'Complete HAMLET identity verification before this partner payout can be marked paid.';
      end if;
    end if;
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

-- A partner's registration generates one welcome email from the auth confirmation
-- lifecycle. Do not enqueue separate "application received" or "application approved"
-- emails; property lifecycle notifications remain unchanged.
drop trigger if exists customer_partner_application_email on public.partner_applications;

notify pgrst, 'reload schema';
