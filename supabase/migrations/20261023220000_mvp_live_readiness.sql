-- ============================================================================
-- HAMLET Release 1 — Live MVP Readiness for Clients, Partners & Admin Ops
--   1. Pre-authorized Admin Bootstrap & Team Governance (admin_bootstrap_emails)
--   2. Self-Service Profile Updates (update_own_profile)
--   3. Partner Application Correction & Resubmission (resubmit_partner_application)
--   4. Admin User Directory & Client Governance (get_admin_directory, set_guest_account_status)
--   5. Multi-Role Issue Reporting & Evidence Logging (report_booking_issue, append_issue_evidence)
--   6. Property Media Storage Bucket & RLS (property-media, when Supabase Storage is present)
-- ============================================================================

-- ─── 1. Pre-authorized Admin Bootstrap & Operator Promotion ──────────────────

create table if not exists public.admin_bootstrap_emails (
  email text primary key
    check (email = lower(btrim(email)) and position('@' in email) > 1),
  note text not null default '',
  added_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.admin_bootstrap_emails enable row level security;

drop policy if exists "Admins can view bootstrap admin emails" on public.admin_bootstrap_emails;
create policy "Admins can view bootstrap admin emails"
  on public.admin_bootstrap_emails for select to authenticated
  using (public.has_role('admin'));

revoke all on public.admin_bootstrap_emails from public, anon, authenticated;
grant select on public.admin_bootstrap_emails to authenticated;
grant all on public.admin_bootstrap_emails to service_role;

-- Automatically grant admin role upon signup when the email is pre-authorized
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
begin
  if normalized_email <> '' then
    select exists (
      select 1
      from public.admin_bootstrap_emails
      where email = normalized_email
    ) into is_preauthorized_admin;
  end if;

  if is_preauthorized_admin then
    assigned_role := 'admin';
  end if;

  insert into public.profiles (id, full_name, phone, role, company)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      case when is_preauthorized_admin then 'HAMLET Operations' else '' end
    ),
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'phone', '')), ''),
    assigned_role,
    case when is_preauthorized_admin then 'HAMLET' else null end
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

create or replace function public.authorize_admin_email(
  target_email text,
  reason_note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  clean_email text := lower(btrim(coalesce(target_email, '')));
  clean_reason text := btrim(coalesce(reason_note, ''));
  matched_user_id uuid;
  promoted_existing boolean := false;
begin
  if actor_id is null or not public.has_role('admin') or not public.is_account_active() then
    raise exception 'Only active administrators can authorize admin operators.';
  end if;

  if clean_email = '' or position('@' in clean_email) <= 1 then
    raise exception 'Enter a valid operator email address.';
  end if;

  if length(clean_reason) < 10 then
    raise exception 'Provide a documented reason of at least 10 characters.';
  end if;

  insert into public.admin_bootstrap_emails (email, note, added_by)
    values (clean_email, clean_reason, actor_id)
    on conflict (email) do update
      set note = excluded.note,
          added_by = excluded.added_by;

  select u.id into matched_user_id
    from auth.users u
    where lower(btrim(coalesce(u.email, ''))) = clean_email
    limit 1;

  if matched_user_id is not null then
    update public.profiles
      set role = 'admin',
          account_status = 'active',
          suspended_at = null,
          suspension_reason = null,
          company = coalesce(nullif(company, ''), 'HAMLET')
      where id = matched_user_id
        and role <> 'admin';

    promoted_existing := found;
  end if;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      'admin',
      case when promoted_existing then 'admin_role_granted' else 'admin_email_preauthorized' end,
      clean_email,
      case
        when promoted_existing then 'Existing account promoted to HAMLET admin. Reason: ' || clean_reason
        else 'Email pre-authorized for HAMLET admin access on sign-up. Reason: ' || clean_reason
      end
    );

  return jsonb_build_object(
    'email', clean_email,
    'promoted_existing', promoted_existing
  );
end;
$$;

revoke all on function public.authorize_admin_email(text, text) from public, anon;
grant execute on function public.authorize_admin_email(text, text) to authenticated;

-- ─── 2. Self-Service Profile Updates (Clients, Partners & Admins) ────────────

create or replace function public.update_own_profile(
  next_full_name text,
  next_phone text default null,
  next_company text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  clean_name text := btrim(coalesce(next_full_name, ''));
  clean_phone text := nullif(btrim(coalesce(next_phone, '')), '');
  clean_company text := nullif(btrim(coalesce(next_company, '')), '');
begin
  if actor_id is null then
    raise exception 'Sign in to update your profile.';
  end if;

  if not public.is_account_active() then
    raise exception 'Your account is currently suspended. Contact HAMLET operations.';
  end if;

  if length(clean_name) < 2 or length(clean_name) > 120 then
    raise exception 'Full name must be between 2 and 120 characters.';
  end if;

  if clean_phone is not null and length(clean_phone) > 40 then
    raise exception 'Phone number is too long.';
  end if;

  if clean_company is not null and length(clean_company) > 120 then
    raise exception 'Company name is too long.';
  end if;

  update public.profiles
    set full_name = clean_name,
        phone = clean_phone,
        company = coalesce(clean_company, company)
    where id = actor_id;

  if not found then
    raise exception 'Profile not found.';
  end if;
end;
$$;

revoke all on function public.update_own_profile(text, text, text) from public, anon;
grant execute on function public.update_own_profile(text, text, text) to authenticated;

-- ─── 3. Partner Application Correction & Resubmission ────────────────────────

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

-- ─── 4. Admin Operational Directory & Client Account Governance ──────────────

create or replace function public.get_admin_directory()
returns table (
  id uuid,
  email text,
  full_name text,
  phone text,
  role text,
  partner_role text,
  company text,
  account_status text,
  suspension_reason text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not public.has_role('admin') then
    raise exception 'Only administrators can view the HAMLET user directory.';
  end if;

  return query
    select
      p.id,
      coalesce(u.email, '')::text as email,
      p.full_name,
      coalesce(p.phone, '')::text as phone,
      p.role,
      coalesce(p.partner_role, '')::text as partner_role,
      coalesce(p.company, '')::text as company,
      p.account_status,
      coalesce(p.suspension_reason, '')::text as suspension_reason,
      p.created_at
    from public.profiles p
    left join auth.users u on u.id = p.id
    order by p.created_at desc;
end;
$$;

revoke all on function public.get_admin_directory() from public, anon;
grant execute on function public.get_admin_directory() to authenticated;

create or replace function public.set_guest_account_status(
  target_guest_id uuid,
  next_status text,
  reason_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  guest_record public.profiles%rowtype;
  clean_reason text := btrim(coalesce(reason_note, ''));
begin
  if actor_id is null or not public.has_role('admin') or not public.is_account_active() then
    raise exception 'Only active administrators can suspend or reinstate guest accounts.';
  end if;

  if next_status not in ('active', 'suspended') then
    raise exception 'Unsupported account status %.', next_status;
  end if;

  if length(clean_reason) < 10 then
    raise exception 'A documented reason of at least 10 characters is required.';
  end if;

  select * into guest_record
    from public.profiles
    where id = target_guest_id
    for update;

  if not found or guest_record.role <> 'guest' then
    raise exception 'Target account must be an existing guest profile.';
  end if;

  if guest_record.account_status = next_status then
    raise exception 'Guest account is already %.', next_status;
  end if;

  update public.profiles
    set account_status = next_status,
        suspended_at = case when next_status = 'suspended' then now() else null end,
        suspension_reason = case when next_status = 'suspended' then clean_reason else null end
    where id = target_guest_id;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      'admin',
      case when next_status = 'suspended' then 'guest_suspended' else 'guest_reinstated' end,
      coalesce(nullif(guest_record.full_name, ''), target_guest_id::text),
      case
        when next_status = 'suspended' then 'Guest account suspended. Reason: ' || clean_reason
        else 'Guest account reinstated to active. Note: ' || clean_reason
      end
    );
end;
$$;

revoke all on function public.set_guest_account_status(uuid, text, text) from public, anon;
grant execute on function public.set_guest_account_status(uuid, text, text) to authenticated;

-- ─── 5. Multi-Role Issue Reporting & Evidence Attachments ────────────────────

alter table public.booking_issues
  add column if not exists reporter_type text not null default 'guest'
    check (reporter_type in ('guest', 'partner', 'internal'));

create or replace function public.report_booking_issue(
  target_booking_id text,
  issue_category text,
  issue_severity text,
  issue_subject text,
  issue_description text,
  evidence_items jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_profile public.profiles%rowtype;
  booking_row public.bookings%rowtype;
  derived_reporter_type text;
  clean_subject text := btrim(coalesce(issue_subject, ''));
  clean_desc text := btrim(coalesce(issue_description, ''));
  clean_evidence jsonb := '[]'::jsonb;
  issue_ref text;
  created_issue_id uuid;
begin
  if actor_id is null then
    raise exception 'Sign in before reporting an issue.';
  end if;

  if not public.is_account_active() then
    raise exception 'Your account is currently suspended. Contact HAMLET operations.';
  end if;

  select * into actor_profile
    from public.profiles
    where id = actor_id;

  if not found then
    raise exception 'Profile not found.';
  end if;

  select * into booking_row
    from public.bookings
    where id = target_booking_id or reference = target_booking_id;

  if not found then
    raise exception 'Booking not found.';
  end if;

  if actor_profile.role = 'guest' then
    if booking_row.guest_id <> actor_id then
      raise exception 'Guests can only report issues on their own bookings.';
    end if;
    derived_reporter_type := 'guest';
  elsif actor_profile.role = 'partner' then
    if not public.can_manage_property(booking_row.property_id) then
      raise exception 'Partners can only report issues on bookings for properties they manage.';
    end if;
    derived_reporter_type := 'partner';
  elsif actor_profile.role = 'admin' then
    derived_reporter_type := 'internal';
  else
    raise exception 'Unsupported account role.';
  end if;

  if issue_category not in (
    'Property condition',
    'Payment & billing',
    'Booking conflict',
    'Safety & security',
    'Host conduct',
    'Guest conduct',
    'Damages',
    'Access & check-in',
    'Other'
  ) then
    raise exception 'Unsupported issue category.';
  end if;

  if issue_severity not in ('low', 'medium', 'high', 'critical') then
    raise exception 'Unsupported issue severity.';
  end if;

  if length(clean_subject) < 4 or length(clean_subject) > 160 then
    raise exception 'Issue subject must be between 4 and 160 characters.';
  end if;

  if length(clean_desc) < 10 or length(clean_desc) > 3000 then
    raise exception 'Issue description must be between 10 and 3000 characters.';
  end if;

  if jsonb_typeof(coalesce(evidence_items, '[]'::jsonb)) = 'array' then
    select coalesce(
      jsonb_agg(to_jsonb(btrim(item_text)))
        filter (where length(btrim(item_text)) > 0),
      '[]'::jsonb
    )
    into clean_evidence
    from jsonb_array_elements_text(coalesce(evidence_items, '[]'::jsonb)) as t(item_text);
  end if;

  issue_ref := 'HML-IS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  insert into public.booking_issues (
    reference,
    booking_id,
    reporter_id,
    reporter_type,
    category,
    severity,
    subject,
    description,
    status,
    evidence,
    timeline
  )
  values (
    issue_ref,
    booking_row.id,
    actor_id,
    derived_reporter_type,
    issue_category,
    issue_severity,
    clean_subject,
    clean_desc,
    'open',
    clean_evidence,
    jsonb_build_array(jsonb_build_object(
      'at', now(),
      'label', 'Issue reported (' || derived_reporter_type || ')',
      'actor', coalesce(nullif(actor_profile.full_name, ''), actor_profile.role),
      'detail', issue_category || ' · ' || upper(issue_severity)
    ))
  )
  returning id into created_issue_id;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      actor_profile.role,
      'issue_reported',
      issue_ref,
      'Booking ' || booking_row.reference || ' (' || issue_category || ', ' || issue_severity || '): ' || clean_subject
    );

  return created_issue_id;
end;
$$;

revoke all on function public.report_booking_issue(text, text, text, text, text, jsonb) from public, anon;
grant execute on function public.report_booking_issue(text, text, text, text, text, jsonb) to authenticated;

create or replace function public.append_issue_evidence(
  target_issue_id uuid,
  evidence_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_profile public.profiles%rowtype;
  issue_row public.booking_issues%rowtype;
  booking_row public.bookings%rowtype;
  clean_note text := btrim(coalesce(evidence_note, ''));
begin
  if actor_id is null or not public.is_account_active() then
    raise exception 'Sign in with an active account to attach issue evidence.';
  end if;

  if length(clean_note) < 4 or length(clean_note) > 500 then
    raise exception 'Evidence item must be between 4 and 500 characters.';
  end if;

  select * into actor_profile from public.profiles where id = actor_id;
  select * into issue_row from public.booking_issues where id = target_issue_id for update;

  if not found then
    raise exception 'Issue not found.';
  end if;

  select * into booking_row from public.bookings where id = issue_row.booking_id;

  if actor_profile.role = 'guest' and booking_row.guest_id <> actor_id then
    raise exception 'You can only attach evidence to issues on your own bookings.';
  elsif actor_profile.role = 'partner' and not public.can_manage_property(booking_row.property_id) then
    raise exception 'You can only attach evidence to issues for properties you manage.';
  elsif actor_profile.role not in ('guest', 'partner', 'admin') then
    raise exception 'Not authorized to attach evidence.';
  end if;

  update public.booking_issues
    set evidence = coalesce(evidence, '[]'::jsonb) || jsonb_build_array(clean_note),
        timeline = coalesce(timeline, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
          'at', now(),
          'label', 'Evidence recorded',
          'actor', coalesce(nullif(actor_profile.full_name, ''), actor_profile.role),
          'detail', clean_note
        )),
        updated_at = now()
    where id = target_issue_id;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      actor_profile.role,
      'issue_evidence_added',
      issue_row.reference,
      'Evidence added: ' || clean_note
    );
end;
$$;

revoke all on function public.append_issue_evidence(uuid, text) from public, anon;
grant execute on function public.append_issue_evidence(uuid, text) to authenticated;

-- ─── 6. Property Media Storage Bucket (Supabase Storage when available) ──────

do $$
begin
  if to_regclass('storage.buckets') is not null and to_regclass('storage.objects') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'property-media',
      'property-media',
      true,
      5242880,
      array['image/jpeg', 'image/png', 'image/webp']
    )
    on conflict (id) do update
      set public = excluded.public,
          file_size_limit = excluded.file_size_limit,
          allowed_mime_types = excluded.allowed_mime_types;

    execute 'drop policy if exists "Public can view property media" on storage.objects';
    execute $pol$
      create policy "Public can view property media"
        on storage.objects for select
        using (bucket_id = 'property-media')
    $pol$;

    execute 'drop policy if exists "Active partners and admins can upload property media" on storage.objects';
    execute $pol$
      create policy "Active partners and admins can upload property media"
        on storage.objects for insert to authenticated
        with check (
          bucket_id = 'property-media'
          and (public.has_role('partner') or public.has_role('admin'))
          and public.is_account_active()
          and (storage.foldername(name))[1] = (select auth.uid())::text
        )
    $pol$;

    execute 'drop policy if exists "Owners and admins can delete property media" on storage.objects';
    execute $pol$
      create policy "Owners and admins can delete property media"
        on storage.objects for delete to authenticated
        using (
          bucket_id = 'property-media'
          and (
            public.has_role('admin')
            or (storage.foldername(name))[1] = (select auth.uid())::text
          )
        )
    $pol$;
  end if;
end
$$;
