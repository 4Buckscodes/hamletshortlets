alter table public.properties
  add column if not exists review_note text;

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles (id),
  actor_role text not null,
  action text not null,
  target text not null,
  detail text not null,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_idx
  on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;

create policy "Admins can read audit log"
  on public.admin_audit_log for select to authenticated
  using (public.has_role('admin'));

grant select on public.admin_audit_log to authenticated;

create or replace function public.review_partner_property(
  target_property_id text,
  next_status text,
  reviewer_note text,
  verification_data jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_status text;
  current_title text;
  next_verification jsonb;
begin
  if (select auth.uid()) is null or not public.has_role('admin') then
    raise exception 'Only administrators can review properties.';
  end if;

  if next_status not in ('approved', 'needs_correction', 'rejected', 'suspended') then
    raise exception 'Unsupported property review status.';
  end if;

  if length(btrim(coalesce(reviewer_note, ''))) < 10 then
    raise exception 'A reviewer note of at least 10 characters is required.';
  end if;

  if jsonb_typeof(verification_data) is distinct from 'object'
    or coalesce(verification_data ->> 'ownership', '') not in ('verified', 'pending_review', 'missing', 'self_reported')
    or coalesce(verification_data ->> 'identity', '') not in ('verified', 'pending_review', 'missing', 'self_reported')
    or coalesce(verification_data ->> 'authority', '') not in ('verified', 'pending_review', 'missing', 'self_reported')
    or coalesce(verification_data ->> 'inspection', '') not in ('verified', 'pending_review', 'missing', 'self_reported') then
    raise exception 'All four verification outcomes must be supplied.';
  end if;

  select status, title
    into current_status, current_title
    from public.properties
    where id = target_property_id
    for update;

  if not found then
    raise exception 'Property not found.';
  end if;

  if current_status in ('submitted', 'needs_correction')
    and next_status not in ('approved', 'needs_correction', 'rejected') then
    raise exception 'Invalid decision for a submitted property.';
  elsif current_status = 'approved' and next_status <> 'suspended' then
    raise exception 'Approved properties can only be suspended.';
  elsif current_status = 'suspended' and next_status <> 'approved' then
    raise exception 'Suspended properties can only be reinstated.';
  elsif current_status = 'rejected' then
    raise exception 'Rejected listings cannot be changed; submit a new listing.';
  end if;

  next_verification := jsonb_build_object(
    'ownership', verification_data ->> 'ownership',
    'identity', verification_data ->> 'identity',
    'authority', verification_data ->> 'authority',
    'inspection', verification_data ->> 'inspection'
  );

  if next_status = 'approved' and (
    next_verification ->> 'ownership' <> 'verified'
    or next_verification ->> 'identity' <> 'verified'
    or next_verification ->> 'authority' <> 'verified'
    or next_verification ->> 'inspection' <> 'verified'
  ) then
    raise exception 'Ownership, identity, authority, and inspection must all be verified before approval.';
  end if;

  update public.properties
    set status = next_status,
        verification = next_verification,
        trust_label = case when next_status = 'approved' then 'HAMLET verified' else 'Under review' end,
        review_note = btrim(reviewer_note),
        updated_at = now()
    where id = target_property_id;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      (select auth.uid()),
      'admin',
      'property_' || next_status,
      current_title,
      'Status: ' || current_status || ' → ' || next_status || '. Reviewer note: ' || btrim(reviewer_note)
    );
end;
$$;

revoke all on function public.review_partner_property(text, text, text, jsonb) from public, anon;
grant execute on function public.review_partner_property(text, text, text, jsonb) to authenticated;

create or replace function public.resubmit_partner_property(target_property_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  property_title text;
begin
  if (select auth.uid()) is null or not public.has_role('partner') then
    raise exception 'Only approved partners can resubmit a property.';
  end if;

  select title into property_title
    from public.properties
    where id = target_property_id
      and status = 'needs_correction'
      and public.can_manage_property(id)
    for update;

  if not found then
    raise exception 'Property not found or not eligible for resubmission.';
  end if;

  update public.properties
    set status = 'submitted', updated_at = now()
    where id = target_property_id;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values ((select auth.uid()), 'partner', 'property_resubmitted', property_title, 'Partner resubmitted listing after corrections.');
end;
$$;

revoke all on function public.resubmit_partner_property(text) from public, anon;
grant execute on function public.resubmit_partner_property(text) to authenticated;
