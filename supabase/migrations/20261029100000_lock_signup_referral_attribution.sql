-- Persist guest sign-up referral attribution from trusted auth metadata.
-- The UI locks the field for usability; this trigger is the enforcement boundary.
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

    if referrer_email <> '' and referrer_email = lower(btrim(coalesce(new.email, ''))) then
      raise exception 'Self-referrals are not permitted.';
    end if;

    if submitted_phone <> '' and referrer_phone <> ''
      and submitted_phone = referrer_phone then
      raise exception 'Self-referrals using the same phone number are not permitted.';
    end if;
  end if;

  insert into public.profiles (
    id, full_name, phone, role, company, referred_by_code, referred_by_partner_id
  )
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      case when is_preauthorized_admin then 'HAMLET Operations' else '' end
    ),
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


-- Partner applications can be submitted or resubmitted independently of the UI.
-- Validate the recruitment attribution at the database boundary as well.
create or replace function public.validate_partner_application_referral()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_code text := upper(btrim(coalesce(new.referred_by_code, '')));
  referrer_id uuid;
  applicant_email text;
  referrer_email text;
  applicant_phone text;
  referrer_phone text;
begin
  if normalized_code = '' then
    new.referred_by_code := null;
    return new;
  end if;

  select p.id
    into referrer_id
    from public.profiles p
    where p.referral_code = normalized_code
      and p.role in ('partner', 'admin')
      and p.account_status = 'active'
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

  if referrer_email <> '' and referrer_email = applicant_email then
    raise exception 'Self-referrals are not permitted.';
  end if;

  if referrer_phone <> '' and referrer_phone = applicant_phone then
    raise exception 'Self-referrals using the same phone number are not permitted.';
  end if;

  new.referred_by_code := normalized_code;
  return new;
end;
$$;

drop trigger if exists validate_partner_application_referral on public.partner_applications;
create trigger validate_partner_application_referral
  before insert or update of referred_by_code, applicant_id
  on public.partner_applications
  for each row execute function public.validate_partner_application_referral();

revoke all on function public.validate_partner_application_referral() from public, anon, authenticated;
grant execute on function public.validate_partner_application_referral() to service_role;
