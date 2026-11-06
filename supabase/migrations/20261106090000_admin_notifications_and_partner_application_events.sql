-- HAMLET Communications Centre: admin-facing event inbox.
-- Additive only: preserves existing booking_notifications and booking lifecycle.
create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  title text not null,
  message text not null,
  target_type text,
  target_id text,
  recipient_email text,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists admin_notifications_created_idx
  on public.admin_notifications (created_at desc);
create index if not exists admin_notifications_unread_idx
  on public.admin_notifications (created_at desc)
  where read_at is null;

alter table public.admin_notifications enable row level security;
revoke all on public.admin_notifications from public, anon, authenticated;
grant select, update on public.admin_notifications to authenticated;
grant all on public.admin_notifications to service_role;

drop policy if exists "Admins can read admin notifications" on public.admin_notifications;
create policy "Admins can read admin notifications"
  on public.admin_notifications for select to authenticated
  using (public.has_role('admin'));

drop policy if exists "Admins can mark admin notifications read" on public.admin_notifications;
create policy "Admins can mark admin notifications read"
  on public.admin_notifications for update to authenticated
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

create or replace function public.enqueue_partner_application_admin_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_name text;
  event_title text;
  event_message text;
begin
  if tg_op = 'INSERT' then
    event_name := 'partner_application_submitted';
    event_title := 'New partner application';
    event_message := coalesce(nullif(btrim(new.full_name), ''), 'A new applicant')
      || ' submitted a partner application for '
      || coalesce(nullif(btrim(new.company), ''), 'their business') || '.';
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
    event_name := 'partner_application_status_changed';
    event_title := 'Partner application decision recorded';
    event_message := coalesce(nullif(btrim(new.full_name), ''), 'Applicant')
      || '''s application status changed to ' || new.status || '.';
  else
    return new;
  end if;

  insert into public.admin_notifications (
    event_type, title, message, target_type, target_id, recipient_email, payload
  ) values (
    event_name, event_title, event_message, 'partner_application', new.id::text,
    new.email,
    jsonb_build_object(
      'application_id', new.id,
      'applicant_name', new.full_name,
      'applicant_email', new.email,
      'company', new.company,
      'role', new.role,
      'status', new.status
    )
  );
  return new;
end;
$$;

revoke all on function public.enqueue_partner_application_admin_notification()
  from public, anon, authenticated;
grant execute on function public.enqueue_partner_application_admin_notification()
  to service_role;

drop trigger if exists partner_application_admin_notification on public.partner_applications;
create trigger partner_application_admin_notification
  after insert or update of status on public.partner_applications
  for each row execute function public.enqueue_partner_application_admin_notification();
