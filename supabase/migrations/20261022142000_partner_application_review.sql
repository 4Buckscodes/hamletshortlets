create or replace function public.review_partner_application(
  target_application_id uuid,
  next_status text,
  reviewer_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  applicant_company text;
  current_status text;
begin
  if (select auth.uid()) is null or not public.has_role('admin') then
    raise exception 'Only administrators can review partner applications.';
  end if;

  if next_status not in ('approved', 'needs_correction', 'rejected') then
    raise exception 'Unsupported partner application decision.';
  end if;

  if length(btrim(coalesce(reviewer_note, ''))) < 10 then
    raise exception 'A reviewer note of at least 10 characters is required.';
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
        review_note = btrim(reviewer_note),
        reviewed_at = now(),
        reviewed_by = (select auth.uid())
    where id = target_application_id;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      (select auth.uid()),
      'admin',
      'partner_application_' || next_status,
      applicant_company,
      'Status: ' || current_status || ' → ' || next_status || '. Reviewer note: ' || btrim(reviewer_note)
    );
end;
$$;

revoke all on function public.review_partner_application(uuid, text, text) from public, anon;
grant execute on function public.review_partner_application(uuid, text, text) to authenticated;
