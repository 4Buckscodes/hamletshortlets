-- Read-only validation for QR generation. QR preview must not create a guest visit
-- event or a synthetic attribution session.
begin;

create or replace function public.resolve_public_share_link(incoming_share_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  clean_token text := lower(btrim(coalesce(incoming_share_token, '')));
  link_row public.partner_share_links%rowtype;
begin
  if clean_token !~ '^hsl_[a-z0-9]{16,64}$' then
    return jsonb_build_object('valid', false);
  end if;

  select * into link_row
    from public.partner_share_links psl
    where psl.share_token = clean_token;

  if not found
     or link_row.status <> 'active'
     or (link_row.expires_at is not null and link_row.expires_at <= now())
     or not public.can_partner_share_property(link_row.property_id, link_row.partner_id) then
    return jsonb_build_object('valid', false);
  end if;

  return jsonb_build_object('valid', true, 'property_id', link_row.property_id);
end;
$$;

revoke all on function public.resolve_public_share_link(text) from public;
grant execute on function public.resolve_public_share_link(text) to anon, authenticated, service_role;

commit;
