-- Restore partner referral identity and lifecycle after the locked-attribution migration.
-- Closing Agents and Referral Partners may apply with zero listed properties.
-- Referral relationships are created on resubmission and become verified on approval.

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
    new.referred_by_partner_id := null;
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
  new.referred_by_partner_id := referrer_id;
  return new;
end;
$$;

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
    or next_count < case when clean_role in ('Closing Agent', 'Referral Partner') then 0 else 1 end
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
      where public.partner_referrals.referrer_partner_id = excluded.referrer_partner_id;

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

revoke all on function public.validate_partner_application_referral() from public, anon, authenticated;
grant execute on function public.validate_partner_application_referral() to service_role;
revoke all on function public.resubmit_partner_application(uuid, jsonb) from public, anon;
grant execute on function public.resubmit_partner_application(uuid, jsonb) to authenticated, service_role;
revoke all on function public.sync_approved_partner_application_referral() from public, anon, authenticated;
grant execute on function public.sync_approved_partner_application_referral() to service_role;
