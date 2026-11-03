-- Support Google / OIDC social sign-up metadata shapes (`name`, `given_name` + `family_name`)
-- alongside `full_name`, and allow newly created OAuth guest accounts to claim a locked
-- partner referral code once within 15 minutes of sign-up while enforcing all self-referral rules.

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
  given_family_name text := btrim(
    concat_ws(
      ' ',
      nullif(btrim(coalesce(new.raw_user_meta_data ->> 'given_name', '')), ''),
      nullif(btrim(coalesce(new.raw_user_meta_data ->> 'family_name', '')), '')
    )
  );
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
        and p.role in ('partner', 'admin')
        and p.account_status = 'active'
      limit 1;

    if resolved_referrer_id is null then
      raise exception 'This referral code is invalid or no longer active.';
    end if;

    select lower(btrim(coalesce(u.email, ''))), regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g')
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

create or replace function public.claim_oauth_signup_referral(
  code_input text
)
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

  -- Immutable once set; only newly created guest accounts may attach an initial sign-up referral.
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
      and p.role in ('partner', 'admin')
      and p.account_status = 'active'
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
