-- Immediate partner-network registration without granting privileged partner role.
create table if not exists public.partner_network_memberships (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  primary_role text not null check (primary_role in ('property_owner','authorised_manager','multi_property_operator','closing_agent')),
  company text not null check (char_length(btrim(company)) between 2 and 160),
  phone text not null check (char_length(regexp_replace(phone, '[^0-9]', '', 'g')) between 7 and 15),
  status text not null default 'active' check (status in ('active','suspended')),
  joined_at timestamptz not null default now(), suspended_at timestamptz,
  suspension_reason text, updated_at timestamptz not null default now()
);
alter table public.partner_network_memberships enable row level security;
revoke all on public.partner_network_memberships from anon, authenticated;
grant select on public.partner_network_memberships to authenticated;
create policy "members read own network membership" on public.partner_network_memberships
  for select to authenticated using (user_id = (select auth.uid()) or public.has_role('admin'));

create or replace function public.join_partner_network(next_role text,next_company text,next_phone text)
returns public.partner_network_memberships language plpgsql security definer set search_path = '' as $$
declare actor uuid := (select auth.uid()); result public.partner_network_memberships%rowtype;
begin
  if actor is null then raise exception 'Sign in to join the HAMLET partner network.'; end if;
  if not public.is_account_active() then raise exception 'Your account is not active.'; end if;
  if next_role not in ('property_owner','authorised_manager','multi_property_operator','closing_agent') then raise exception 'Choose a valid partner role.'; end if;
  if char_length(btrim(coalesce(next_company,''))) not between 2 and 160 then raise exception 'Enter a business or display name (2–160 characters).'; end if;
  if char_length(regexp_replace(coalesce(next_phone,''), '[^0-9]', '', 'g')) not between 7 and 15 then raise exception 'Enter a valid phone number.'; end if;
  if exists(select 1 from public.partner_network_memberships where user_id=actor and status='suspended') then raise exception 'This partner-network membership is suspended. Contact HAMLET support.'; end if;
  insert into public.partner_network_memberships(user_id,primary_role,company,phone)
  values(actor,next_role,btrim(next_company),btrim(next_phone))
  on conflict(user_id) do update set primary_role=excluded.primary_role,company=excluded.company,phone=excluded.phone,updated_at=now()
  where public.partner_network_memberships.status='active' returning * into result;
  if result.user_id is null then raise exception 'Membership could not be activated.'; end if;
  insert into public.admin_audit_log(actor_id,actor_role,action,target,detail)
  values(actor,'guest','partner_network_joined',actor::text,'Registered as '||next_role||'; company/display name: '||btrim(next_company));
  return result;
end; $$;

create or replace function public.list_partner_network_members()
returns table(user_id uuid,full_name text,email text,primary_role text,company text,phone text,status text,joined_at timestamptz,suspension_reason text)
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not public.has_role('admin') or not public.is_account_active() then raise exception 'Only active administrators can view network registrations.'; end if;
  return query select m.user_id,p.full_name,u.email,m.primary_role,m.company,m.phone,m.status,m.joined_at,m.suspension_reason
  from public.partner_network_memberships m join public.profiles p on p.id=m.user_id left join auth.users u on u.id=m.user_id order by m.joined_at desc;
end; $$;

create or replace function public.set_partner_network_status(target_member_id uuid,next_status text,reason_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare current_status text;
begin
  if (select auth.uid()) is null or not public.has_role('admin') or not public.is_account_active() then raise exception 'Only active administrators can change network membership status.'; end if;
  if next_status not in ('active','suspended') then raise exception 'Unsupported membership status.'; end if;
  if char_length(btrim(coalesce(reason_note,''))) < 10 then raise exception 'Provide a reason of at least 10 characters.'; end if;
  select status into current_status from public.partner_network_memberships where user_id=target_member_id for update;
  if not found then raise exception 'Network membership not found.'; end if;
  update public.partner_network_memberships set status=next_status,
    suspended_at=case when next_status='suspended' then now() else null end,
    suspension_reason=case when next_status='suspended' then btrim(reason_note) else null end,updated_at=now()
  where user_id=target_member_id;
  insert into public.admin_audit_log(actor_id,actor_role,action,target,detail)
  values((select auth.uid()),'admin','partner_network_'||next_status,target_member_id::text,'Status: '||current_status||' → '||next_status||'. Reason: '||btrim(reason_note));
end; $$;
revoke all on function public.join_partner_network(text,text,text) from public,anon;
revoke all on function public.list_partner_network_members() from public,anon;
revoke all on function public.set_partner_network_status(uuid,text,text) from public,anon;
grant execute on function public.join_partner_network(text,text,text) to authenticated;
grant execute on function public.list_partner_network_members() to authenticated;
grant execute on function public.set_partner_network_status(uuid,text,text) to authenticated;
