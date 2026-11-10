-- HAMLET security hardening: platform-wide expiry is an operations action.
-- Preserve authenticated RPC access for the admin console, but enforce active-admin
-- authorization in the function body. Trusted service_role workers may still run it.
create or replace function public.expire_overdue_bookings()
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := (select auth.uid());
  caller_jwt_role text := coalesce((select auth.role()), '');
  actor_role text;
  actor_status text;
  expired_count integer;
begin
  if caller_jwt_role <> 'service_role' then
    if actor_id is null then
      raise exception 'Sign in with an active administrator account to process booking expiry.';
    end if;

    select role, account_status
      into actor_role, actor_status
      from public.profiles
      where id = actor_id;

    if actor_role is distinct from 'admin' or actor_status is distinct from 'active' then
      raise exception 'Only active HAMLET administrators can process booking expiry.';
    end if;
  end if;

  with expired as (
    update public.bookings
      set status = 'expired',
          timeline = coalesce(timeline, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
            'at', now(),
            'label', 'Payment deadline expired — booking expired',
            'actor', 'HAMLET system',
            'detail', 'Availability released after the payment deadline.'
          ))
      where status = 'awaiting_payment'
        and payment_deadline is not null
        and payment_deadline <= now()
      returning reference, guest_id
  ),
  logged as (
    insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
      select coalesce(actor_id, expired.guest_id), 'system', 'booking_expired', expired.reference,
        'Payment deadline elapsed; booking expired and availability released.'
      from expired
      returning 1
  )
  select count(*) into expired_count from logged;

  return coalesce(expired_count, 0);
end;
$function$;

revoke all on function public.expire_overdue_bookings() from public, anon;
grant execute on function public.expire_overdue_bookings() to authenticated, service_role;
