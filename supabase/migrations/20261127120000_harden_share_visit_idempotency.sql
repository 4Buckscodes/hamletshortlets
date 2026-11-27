-- Harden public share-link visit tracking.
-- Caller-supplied idempotency keys must not bypass the server's one-visit-per
-- link/session/UTC-hour deduplication. Keep the RPC signature for compatibility.
begin;

create or replace function public.record_share_link_visit(
  incoming_share_token text,
  visitor_session_key text,
  client_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  clean_token text := lower(btrim(coalesce(incoming_share_token, '')));
  clean_session text := btrim(coalesce(visitor_session_key, ''));
  link_row public.partner_share_links%rowtype;
  existing_sess public.share_attribution_sessions%rowtype;
  existing_valid boolean := false;
  visit_idem text;
  policy_outcome text := 'attributed';
begin
  if clean_token !~ '^hsl_[a-z0-9]{16,64}$' then
    return jsonb_build_object('valid', false, 'reason', 'invalid_token_format');
  end if;

  if char_length(clean_session) < 12 or char_length(clean_session) > 128 then
    return jsonb_build_object('valid', false, 'reason', 'invalid_session_key');
  end if;

  -- Preserve the legacy parameter but reject oversized values instead of
  -- allowing unbounded caller-controlled idempotency payloads.
  if client_idempotency_key is not null and char_length(client_idempotency_key) > 160 then
    return jsonb_build_object('valid', false, 'reason', 'invalid_idempotency_key');
  end if;

  select * into link_row
    from public.partner_share_links psl
    where psl.share_token = clean_token;

  if not found then
    return jsonb_build_object('valid', false, 'reason', 'unknown_token');
  end if;

  if link_row.status <> 'active'
     or (link_row.expires_at is not null and link_row.expires_at <= now())
     or not public.can_partner_share_property(link_row.property_id, link_row.partner_id) then
    return jsonb_build_object('valid', false, 'reason', 'inactive_or_expired_link');
  end if;

  if actor_id is not null and actor_id = link_row.partner_id then
    return jsonb_build_object(
      'valid', false,
      'reason', 'self_visit_ignored',
      'property_id', link_row.property_id
    );
  end if;

  -- Never trust a caller-selected key to bypass the canonical hourly dedupe.
  visit_idem := 'visit:' || link_row.id::text || ':' || clean_session || ':' ||
    to_char(now() at time zone 'UTC', 'YYYY-MM-DD-HH24');

  insert into public.property_share_events (
    share_link_id, property_id, partner_id, event_type, session_key, idempotency_key, metadata
  )
  values (
    link_row.id, link_row.property_id, link_row.partner_id, 'link_visited',
    clean_session, visit_idem,
    jsonb_build_object('authenticated_visitor', actor_id is not null)
  )
  on conflict (idempotency_key) do nothing;

  -- Serialize first-touch decisions for this visitor/property pair.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(clean_session || chr(31) || link_row.property_id, 0)
  );

  select * into existing_sess
    from public.share_attribution_sessions s
    where s.session_key = clean_session
      and s.property_id = link_row.property_id
    for update;

  if found then
    if existing_sess.share_link_id = link_row.id and existing_sess.expires_at > now() and existing_sess.status in ('active', 'converted') then
      update public.share_attribution_sessions
        set last_visited_at = now(),
            expires_at = greatest(expires_at, now() + interval '30 days'),
            guest_user_id = case
              when guest_user_id is not null then guest_user_id
              when actor_id is not null and actor_id <> link_row.partner_id then actor_id
              else null
            end
        where id = existing_sess.id;
      policy_outcome := 'refreshed_same_partner';
    else
      select exists (
        select 1
        from public.partner_share_links prior_link
        where prior_link.id = existing_sess.share_link_id
          and prior_link.status = 'active'
          and (prior_link.expires_at is null or prior_link.expires_at > now())
          and existing_sess.status in ('active', 'converted')
          and existing_sess.expires_at > now()
          and public.can_partner_share_property(existing_sess.property_id, existing_sess.partner_id)
      ) into existing_valid;

      if existing_valid then
        policy_outcome := 'preserved_existing_first_touch';
      else
        update public.share_attribution_sessions
          set share_link_id = link_row.id,
              partner_id = link_row.partner_id,
              guest_user_id = case
                when actor_id is not null and actor_id <> link_row.partner_id then actor_id
                else null
              end,
              status = 'active',
              first_visited_at = now(),
              last_visited_at = now(),
              expires_at = now() + interval '30 days',
              bound_booking_id = null
          where id = existing_sess.id;
        policy_outcome := 'replaced_expired_or_inactive';
      end if;
    end if;
  else
    insert into public.share_attribution_sessions (
      session_key, share_link_id, property_id, partner_id, guest_user_id,
      status, first_visited_at, last_visited_at, expires_at
    )
    values (
      clean_session, link_row.id, link_row.property_id, link_row.partner_id,
      case when actor_id is not null and actor_id <> link_row.partner_id then actor_id else null end,
      'active', now(), now(), now() + interval '30 days'
    );
    policy_outcome := 'attributed_first_touch';
  end if;

  return jsonb_build_object(
    'valid', true,
    'property_id', link_row.property_id,
    'attribution_policy', policy_outcome
  );
end;
$$;

revoke all on function public.record_share_link_visit(text, text, text) from public;
grant execute on function public.record_share_link_visit(text, text, text) to anon, authenticated, service_role;

commit;
