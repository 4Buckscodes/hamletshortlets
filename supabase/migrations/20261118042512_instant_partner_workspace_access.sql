-- Instant partner access: account signup creates an active network membership.
-- Workspace access and property submission are immediate; listing approval remains
-- a separate property-level review. Payout readiness is deliberately not handled here.

alter table public.partner_network_memberships
  alter column phone drop not null;

create or replace function public.has_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.account_status = 'active'
      and (
        (required_role <> 'partner' and p.role = required_role)
        or (
          required_role = 'partner'
          and exists (
            select 1
            from public.partner_network_memberships m
            where m.user_id = p.id
              and m.status = 'active'
          )
        )
      )
  );
$$;

create or replace function public.can_submit_partner_property()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and public.is_account_active()
    and (
      public.has_role('admin')
      or exists (
        select 1
        from public.partner_network_memberships m
        where m.user_id = (select auth.uid())
          and m.status = 'active'
      )
    );
$$;

revoke all on function public.can_submit_partner_property() from public, anon;
grant execute on function public.can_submit_partner_property() to authenticated;

-- Extend the existing production auth trigger without replacing its referral,
-- admin-bootstrap, profile-creation or audit behaviour.
do $migration$
declare
  function_definition text;
  updated_definition text;
begin
  function_definition := pg_get_functiondef('public.create_profile_for_new_user()'::regprocedure);

  updated_definition := replace(
    function_definition,
    '  resolved_full_name text;',
    '  resolved_full_name text;
  is_partner_signup boolean := coalesce(new.raw_user_meta_data ->> ''hamlet_partner_signup'', '''') = ''true'';
  partner_signup_role text := coalesce(new.raw_user_meta_data ->> ''hamlet_partner_role'', ''property_owner'');
  partner_signup_company text;'
  );

  if updated_definition = function_definition then
    raise exception 'Could not extend create_profile_for_new_user(): declaration anchor not found.';
  end if;
  function_definition := updated_definition;

  updated_definition := replace(
    function_definition,
    '  if is_preauthorized_admin then
    insert into public.admin_audit_log',
    '  if is_partner_signup then
    if partner_signup_role not in (''property_owner'', ''authorised_manager'', ''multi_property_operator'', ''closing_agent'') then
      raise exception ''Choose a valid HAMLET partner role.'';
    end if;
    partner_signup_company := left(coalesce(
      nullif(btrim(coalesce(new.raw_user_meta_data ->> ''hamlet_partner_company'', '''')), ''''),
      nullif(resolved_full_name, ''''),
      ''HAMLET Partner''
    ), 160);
    insert into public.partner_network_memberships (
      user_id, primary_role, company, phone, status
    ) values (
      new.id,
      partner_signup_role,
      partner_signup_company,
      nullif(btrim(coalesce(new.raw_user_meta_data ->> ''phone'', '''')), ''''),
      ''active''
    )
    on conflict (user_id) do nothing;
  end if;

  if is_preauthorized_admin then
    insert into public.admin_audit_log'
  );

  if updated_definition = function_definition then
    raise exception 'Could not extend create_profile_for_new_user(): insertion anchor not found.';
  end if;

  execute updated_definition;
end;
$migration$;

notify pgrst, 'reload schema';
