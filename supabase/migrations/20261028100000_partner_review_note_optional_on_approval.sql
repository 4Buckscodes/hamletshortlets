create or replace function public.review_partner_application(
  target_application_id uuid,
  next_status text,
  reviewer_note text default ''
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  applicant_company text;
  current_status text;
  clean_note text := btrim(coalesce(reviewer_note, ''));
begin
  if (select auth.uid()) is null or not public.has_role('admin') then
    raise exception 'Only administrators can review partner applications.';
  end if;

  if next_status not in ('approved', 'needs_correction', 'rejected') then
    raise exception 'Unsupported partner application decision.';
  end if;

  if next_status <> 'approved' and length(clean_note) < 10 then
    raise exception 'A reviewer note of at least 10 characters is required when requesting corrections or rejecting an application.';
  end if;

  select company, status
    into applicant_company, current_status
    from public.partner_applications
    where id = target_application_id
    for update;

  if not found then
    raise exception 'Partner application not found.';
  end if;

  if current_status not in ('pending', 'needs_correction') then
    raise exception 'Only pending or correction-requested applications can be reviewed.';
  end if;

  update public.partner_applications
    set status = next_status,
        review_note = nullif(clean_note, ''),
        reviewed_at = now(),
        reviewed_by = (select auth.uid())
    where id = target_application_id;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      (select auth.uid()),
      'admin',
      'partner_application_' || next_status,
      applicant_company,
      'Status: ' || current_status || ' → ' || next_status ||
        case when clean_note <> '' then '. Reviewer note: ' || clean_note else '. No reviewer note supplied.' end
    );
end;
$$;

revoke all on function public.review_partner_application(uuid, text, text) from public, anon;
grant execute on function public.review_partner_application(uuid, text, text) to authenticated;
