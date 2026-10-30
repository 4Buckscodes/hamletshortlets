-- Preserve and validate partner referral attribution when an applicant resubmits
-- a corrected application. The BEFORE UPDATE trigger from the prior migration
-- validates any changed referral code against an active partner.
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
    application_data ->> 'referred_by_code',
    app_row.referred_by_code,
    ''
  )));
  next_count := coalesce((application_data ->> 'properties_count')::integer, 1);

  if length(clean_name) < 2
    or length(clean_phone) < 7
    or length(clean_company) < 2
    or length(clean_role) < 2
    or length(clean_motivation) < 20
    or next_count < 1
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

revoke all on function public.resubmit_partner_application(uuid, jsonb) from public, anon;
grant execute on function public.resubmit_partner_application(uuid, jsonb) to authenticated;
