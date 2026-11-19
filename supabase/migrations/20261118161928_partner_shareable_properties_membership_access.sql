-- Partner signup intentionally keeps profiles.role='guest' and grants workspace
-- access through an active partner_network_memberships row. Share Engine RPCs
-- must use that same source of truth rather than requiring role='partner'.
create or replace function public.can_partner_share_property(
  target_property_id text,
  target_partner_id uuid default auth.uid()
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  prop_status text;
  prop_allow_sharing boolean;
  partner_role text;
  partner_status text;
  has_active_membership boolean := false;
  has_active_access boolean := false;
  has_revoked_access boolean := false;
begin
  if target_partner_id is null or target_property_id is null then
    return false;
  end if;

  select p.role, coalesce(p.account_status, 'active')
    into partner_role, partner_status
    from public.profiles p
    where p.id = target_partner_id;

  if not found or partner_status <> 'active' then
    return false;
  end if;

  select exists (
    select 1 from public.partner_network_memberships m
    where m.user_id = target_partner_id and m.status = 'active'
  ) into has_active_membership;

  if partner_role not in ('partner', 'admin') and not has_active_membership then
    return false;
  end if;

  select pr.status, coalesce(pr.allow_partner_sharing, true)
    into prop_status, prop_allow_sharing
    from public.properties pr
    where pr.id = target_property_id;

  if not found or prop_status <> 'approved' then
    return false;
  end if;

  select bool_or(pa.status = 'active'), bool_or(pa.status = 'revoked')
    into has_active_access, has_revoked_access
    from public.property_access pa
    where pa.property_id = target_property_id and pa.user_id = target_partner_id;

  if coalesce(has_revoked_access, false) and not coalesce(has_active_access, false) then
    return false;
  end if;

  if partner_role = 'admin' or coalesce(has_active_access, false) then
    return true;
  end if;

  return prop_allow_sharing;
end;
$$;

revoke all on function public.can_partner_share_property(text, uuid) from public, anon;
grant execute on function public.can_partner_share_property(text, uuid) to authenticated, service_role;

create or replace function public.list_partner_shareable_properties()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role text;
  actor_status text;
  has_active_membership boolean := false;
  items jsonb := '[]'::jsonb;
begin
  if actor_id is null then return '[]'::jsonb; end if;

  select p.role, coalesce(p.account_status, 'active')
    into actor_role, actor_status
    from public.profiles p where p.id = actor_id;

  if not found or actor_status <> 'active' then return '[]'::jsonb; end if;

  select exists (
    select 1 from public.partner_network_memberships m
    where m.user_id = actor_id and m.status = 'active'
  ) into has_active_membership;

  if actor_role not in ('partner', 'admin') and not has_active_membership then
    return '[]'::jsonb;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', pr.id,
        'title', pr.title,
        'property_type', pr.property_type,
        'area', pr.area,
        'public_address', pr.public_address,
        'bedrooms', pr.bedrooms,
        'bathrooms', pr.bathrooms,
        'capacity', pr.capacity,
        'amenities', pr.amenities,
        'image_urls', pr.image_urls,
        'trust_label', pr.trust_label,
        'verification', pr.verification,
        'allow_partner_sharing', coalesce(pr.allow_partner_sharing, true),
        'nightly_rate', pr.nightly_rate,
        'guest_nightly_ngn', pr.nightly_rate + public.multiply_ngn_bps(pr.nightly_rate, 2000),
        'can_manage', public.can_manage_property(pr.id),
        'is_assigned', exists (
          select 1 from public.property_access pa
          where pa.property_id = pr.id and pa.user_id = actor_id and pa.status = 'active'
        ),
        'share_token', (
          select psl.share_token from public.partner_share_links psl
          where psl.property_id = pr.id and psl.partner_id = actor_id and psl.status = 'active'
          limit 1
        ),
        'deal_terms', public.get_partner_property_deal_terms(pr.id, actor_id)
      )
      order by pr.created_at desc
    ),
    '[]'::jsonb
  )
  into items
  from public.properties pr
  where pr.status = 'approved'
    and public.can_partner_share_property(pr.id, actor_id);

  return items;
end;
$$;

revoke all on function public.list_partner_shareable_properties() from public, anon;
grant execute on function public.list_partner_shareable_properties() to authenticated;

notify pgrst, 'reload schema';