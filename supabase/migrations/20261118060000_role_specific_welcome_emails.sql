-- Tag confirmed-account welcome emails by the active partner membership created at signup.
-- Partner activation and property approval remain separate workflows.

create or replace function public.enqueue_registration_welcome_from_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_email text;
  confirmation_marker text;
  is_partner boolean := false;
begin
  select u.email,
         coalesce(to_jsonb(u) ->> 'email_confirmed_at', to_jsonb(u) ->> 'confirmed_at')
    into account_email, confirmation_marker
  from auth.users u
  where u.id = new.id;

  select exists (
    select 1
    from public.partner_network_memberships membership
    where membership.user_id = new.id
      and membership.status = 'active'
  ) into is_partner;

  if nullif(confirmation_marker, '') is not null and account_email is not null then
    perform public.enqueue_customer_email_notification(
      'registration_completed',
      new.id,
      account_email,
      new.full_name,
      case
        when is_partner then 'Welcome to HAMLET — List, Share and Earn!'
        else 'Welcome to HAMLET — Your next stay starts here'
      end,
      jsonb_build_object(
        'full_name', new.full_name,
        'partner_signup', is_partner
      ),
      'registration-completed:' || new.id::text || ':' || lower(account_email)
    );
  end if;

  return new;
end;
$$;
