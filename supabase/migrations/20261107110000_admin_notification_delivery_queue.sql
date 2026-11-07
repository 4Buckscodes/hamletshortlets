-- Durable dispatch queue for the HAMLET Communications Centre.
alter table public.admin_notifications
  add column if not exists delivery_status text not null default 'pending'
    check (delivery_status in ('pending', 'processing', 'sent', 'failed')),
  add column if not exists delivery_attempts integer not null default 0,
  add column if not exists delivered_at timestamptz,
  add column if not exists next_attempt_at timestamptz not null default now(),
  add column if not exists last_delivery_error text;

create index if not exists admin_notifications_dispatch_idx
  on public.admin_notifications (next_attempt_at, created_at)
  where delivery_status in ('pending', 'failed');

create or replace function public.claim_admin_notifications(
  batch_limit integer default 20
)
returns setof public.admin_notifications
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with candidates as (
    select id
    from public.admin_notifications
    where delivery_status in ('pending', 'failed')
      and next_attempt_at <= now()
      and delivery_attempts < 5
    order by created_at asc
    limit greatest(1, least(batch_limit, 50))
    for update skip locked
  )
  update public.admin_notifications n
  set delivery_status = 'processing',
      delivery_attempts = n.delivery_attempts + 1
  from candidates c
  where n.id = c.id
  returning n.*;
end;
$$;

revoke all on function public.claim_admin_notifications(integer) from public, anon, authenticated;
grant execute on function public.claim_admin_notifications(integer) to service_role;
