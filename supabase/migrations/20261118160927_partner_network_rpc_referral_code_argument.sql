-- Replace the legacy three-argument registration RPC with one referral-aware
-- four-argument RPC. The optional fourth argument preserves three-argument
-- callers while avoiding competing overloads in PostgREST's schema cache.
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
  clean_referral_code text := upper(regexp_replace(
    btrim(coalesce(referral_code_input, '')),
    '[^A-Za-z0-9-]', '', 'g'
  ));
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

notify pgrst, 'reload schema';
