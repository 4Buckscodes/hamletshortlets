-- Match the four-argument RPC invoked by partner registration and preserve
-- the existing three-argument overload used by legacy/internal callers.
create or replace function public.join_partner_network(
  next_role text,
  next_company text,
  next_phone text,
  referral_code_input text
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
    btrim(coalesce(referral_code_input, '')),
    '[^A-Za-z0-9-]', '', 'g'
  ));
  referrer_id uuid;
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
    select 1 from public.partner_network_memberships
    where user_id = actor and status = 'suspended'
  ) then
    raise exception 'This partner-network membership is suspended. Contact HAMLET support.';
  end if;

  if clean_referral_code <> '' then
    select id into referrer_id
    from public.profiles
    where referral_code = clean_referral_code
      and role in ('partner', 'admin')
      and account_status = 'active';

    if referrer_id is null then
      raise exception 'Referral code % is not a valid active HAMLET partner code.', clean_referral_code;
    end if;

    if referrer_id = actor then
      raise exception 'Self-referrals are not permitted.';
    end if;

    if exists (
      select 1 from public.partner_referrals
      where referred_partner_id = actor
        and referrer_partner_id <> referrer_id
    ) then
      raise exception 'This account already has a recorded direct referring partner.';
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
      referred_by_partner_id = coalesce(referred_by_partner_id, referrer_id),
      referred_by_code = coalesce(referred_by_code, nullif(clean_referral_code, ''))
  where id = actor
  returning role into actor_profile_role;

  if referrer_id is not null then
    insert into public.partner_referrals (
      referrer_partner_id, referred_partner_id, referral_code, status, registered_at
    )
    values (referrer_id, actor, clean_referral_code, 'registered', now())
    on conflict (referred_partner_id) do nothing;
  end if;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
  values (
    actor,
    coalesce(actor_profile_role, 'guest'),
    'partner_network_joined',
    actor::text,
    'Registered as ' || next_role || '; company/display name: ' || clean_company
      || case when clean_referral_code <> '' then '; referral code: ' || clean_referral_code else '' end
  );

  return result;
end;
$$;

revoke all on function public.join_partner_network(text, text, text, text) from public, anon;
grant execute on function public.join_partner_network(text, text, text, text) to authenticated;

notify pgrst, 'reload schema';