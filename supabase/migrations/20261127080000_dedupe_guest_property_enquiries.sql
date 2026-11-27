-- Prevent duplicate guest enquiries when a visitor double-clicks submit or retries
-- after a network timeout. Identical submissions for the same property/email/name/message
-- are treated as one enquiry for a short, bounded window. No raw IP or device data is stored.
begin;

create index if not exists property_enquiries_dedupe_lookup_idx
  on public.property_enquiries (property_id, guest_email, created_at desc);

create or replace function public.submit_property_enquiry(
  target_property_id text,
  sender_name text,
  sender_email text,
  enquiry_message text,
  visitor_session_key text default null,
  incoming_share_token text default null,
  client_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  clean_name text := btrim(coalesce(sender_name, ''));
  clean_email text := lower(btrim(coalesce(sender_email, '')));
  clean_msg text := btrim(coalesce(enquiry_message, ''));
  clean_session text := btrim(coalesce(visitor_session_key, ''));
  clean_token text := lower(btrim(coalesce(incoming_share_token, '')));
  resolved_link_id uuid := null;
  resolved_partner_id uuid := null;
  sess_row public.share_attribution_sessions%rowtype;
  link_row public.partner_share_links%rowtype;
  created_enquiry_id uuid;
  enq_idem text;
  duplicate_enquiry_id uuid;
  dedupe_lock_key text;
begin
  if not exists (
    select 1 from public.properties p
    where p.id = target_property_id and p.status = 'approved'
  ) then
    raise exception 'This stay is not currently available for enquiries.';
  end if;

  if char_length(clean_name) < 2 or char_length(clean_name) > 120 then
    raise exception 'Enter your name (2–120 characters).';
  end if;

  if position('@' in clean_email) <= 1 or char_length(clean_email) > 254 then
    raise exception 'Enter a valid email address.';
  end if;

  if char_length(clean_msg) < 10 or char_length(clean_msg) > 1500 then
    raise exception 'Enter a question between 10 and 1,500 characters.';
  end if;

  -- Serialize matching submissions so concurrent retries cannot create two rows.
  dedupe_lock_key := target_property_id || chr(31) || clean_email || chr(31) || clean_name || chr(31) || clean_msg;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(dedupe_lock_key, 0));

  select e.id into duplicate_enquiry_id
    from public.property_enquiries e
    where e.property_id = target_property_id
      and e.guest_email = clean_email
      and e.guest_name = clean_name
      and e.message = clean_msg
      and e.created_at >= now() - interval '10 minutes'
    order by e.created_at desc
    limit 1;

  if duplicate_enquiry_id is not null then
    return jsonb_build_object(
      'enquiry_id', duplicate_enquiry_id,
      'status', 'open',
      'duplicate', true
    );
  end if;

  -- Resolve active session attribution first (respecting first-touch lock)
  if actor_id is not null then
    select * into sess_row
      from public.share_attribution_sessions s
      where s.guest_user_id = actor_id
        and s.property_id = target_property_id
        and s.partner_id <> actor_id
        and s.status in ('active', 'converted')
        and s.expires_at > now()
      order by s.first_visited_at asc
      limit 1;
  end if;

  if sess_row.id is null and char_length(clean_session) between 12 and 128 then
    select * into sess_row
      from public.share_attribution_sessions s
      where s.session_key = clean_session
        and s.property_id = target_property_id
        and (actor_id is null or s.partner_id <> actor_id)
        and s.status in ('active', 'converted')
        and s.expires_at > now()
      order by s.first_visited_at asc
      limit 1;
  end if;

  if sess_row.id is not null then
    select * into link_row
      from public.partner_share_links psl
      where psl.id = sess_row.share_link_id
        and psl.status = 'active'
        and (psl.expires_at is null or psl.expires_at > now())
        and public.can_partner_share_property(target_property_id, psl.partner_id);
    if found then
      resolved_link_id := link_row.id;
      resolved_partner_id := link_row.partner_id;
    end if;
  elsif clean_token ~ '^hsl_[a-z0-9]{16,64}$' then
    select * into link_row
      from public.partner_share_links psl
      where psl.share_token = clean_token
        and psl.property_id = target_property_id
        and psl.status = 'active'
        and (psl.expires_at is null or psl.expires_at > now())
        and (actor_id is null or psl.partner_id <> actor_id)
        and public.can_partner_share_property(target_property_id, psl.partner_id);
    if found then
      resolved_link_id := link_row.id;
      resolved_partner_id := link_row.partner_id;
    end if;
  end if;

  insert into public.property_enquiries (
    property_id,
    guest_user_id,
    guest_name,
    guest_email,
    message,
    share_link_id,
    share_partner_id
  )
  values (
    target_property_id,
    actor_id,
    clean_name,
    clean_email,
    clean_msg,
    resolved_link_id,
    resolved_partner_id
  )
  returning id into created_enquiry_id;

  if resolved_link_id is not null and resolved_partner_id is not null then
    enq_idem := coalesce(
      nullif(btrim(coalesce(client_idempotency_key, '')), ''),
      'enquiry:' || created_enquiry_id::text
    );
    insert into public.property_share_events (
      share_link_id,
      property_id,
      partner_id,
      event_type,
      session_key,
      enquiry_id,
      idempotency_key
    )
    values (
      resolved_link_id,
      target_property_id,
      resolved_partner_id,
      'enquiry_submitted',
      nullif(clean_session, ''),
      created_enquiry_id,
      enq_idem
    )
    on conflict (idempotency_key) do nothing;
  end if;

  return jsonb_build_object(
    'enquiry_id', created_enquiry_id,
    'status', 'open',
    'duplicate', false
  );
end;
$$;

revoke all on function public.submit_property_enquiry(text, text, text, text, text, text, text) from public;
grant execute on function public.submit_property_enquiry(text, text, text, text, text, text, text) to anon, authenticated, service_role;

commit;
