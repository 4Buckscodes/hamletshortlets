-- Ensure partner welcome routing works even when email confirmation happens
-- after profile creation (the partner membership is created in the auth trigger).

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
         coalesce(to_jsonb(u) ->> 'email_confirmed_at', to_jsonb(u) ->> 'confirmed_at'),
         coalesce(u.raw_user_meta_data ->> 'hamlet_partner_signup', '') = 'true'
    into account_email, confirmation_marker, is_partner
  from auth.users u
  where u.id = new.id;

  if not is_partner then
    select exists (
      select 1 from public.partner_network_memberships membership
      where membership.user_id = new.id and membership.status = 'active'
    ) into is_partner;
  end if;

  if nullif(confirmation_marker, '') is not null and account_email is not null then
    perform public.enqueue_customer_email_notification(
      'registration_completed', new.id, account_email, new.full_name,
      case when is_partner then 'Welcome to HAMLET — List, Share and Earn!'
           else 'Welcome to HAMLET — Your next stay starts here' end,
      jsonb_build_object('full_name', new.full_name, 'partner_signup', is_partner),
      'registration-completed:' || new.id::text || ':' || lower(account_email)
    );
  end if;
  return new;
end;
$$;

create or replace function public.enqueue_registration_welcome_after_confirmation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text;
  is_partner boolean := false;
begin
  if coalesce(to_jsonb(old) ->> 'email_confirmed_at', to_jsonb(old) ->> 'confirmed_at') is null
     and coalesce(to_jsonb(new) ->> 'email_confirmed_at', to_jsonb(new) ->> 'confirmed_at') is not null
     and new.email is not null then
    select p.full_name into profile_name from public.profiles p where p.id = new.id;

    is_partner := coalesce(new.raw_user_meta_data ->> 'hamlet_partner_signup', '') = 'true';
    if not is_partner then
      select exists (
        select 1 from public.partner_network_memberships membership
        where membership.user_id = new.id and membership.status = 'active'
      ) into is_partner;
    end if;

    perform public.enqueue_customer_email_notification(
      'registration_completed', new.id, new.email,
      coalesce(profile_name, new.raw_user_meta_data ->> 'full_name', ''),
      case when is_partner then 'Welcome to HAMLET — List, Share and Earn!'
           else 'Welcome to HAMLET — Your next stay starts here' end,
      jsonb_build_object(
        'full_name', coalesce(profile_name, new.raw_user_meta_data ->> 'full_name', ''),
        'partner_signup', is_partner
      ),
      'registration-completed:' || new.id::text || ':' || lower(new.email)
    );
  end if;
  return new;
end;
$$;
