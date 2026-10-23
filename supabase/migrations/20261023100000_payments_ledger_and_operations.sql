-- ============================================================================
-- HAMLET Release 1 — Duplicate listing guard, server-side payment webhook
-- confirmation, controlled ledger & manual reconciliation, post-confirmation
-- booking operations/refunds, issue resolution workflow, and partner
-- property assignments.
-- ============================================================================

-- ─── 1. Duplicate property listing protection ────────────────────────────────

create or replace function public.normalize_listing_text(input text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(pg_catalog.regexp_replace(pg_catalog.btrim(coalesce(input, '')), '\s+', ' ', 'g'));
$$;

grant execute on function public.normalize_listing_text(text) to anon, authenticated, service_role;

create unique index if not exists properties_active_duplicate_guard_idx
  on public.properties (
    public.normalize_listing_text(area),
    public.normalize_listing_text(public_address),
    public.normalize_listing_text(title)
  )
  where status <> 'rejected';

create or replace function public.submit_partner_property(
  listing_data jsonb,
  submission_data jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_property_id text;
  submitted_docs jsonb;
begin
  if (select auth.uid()) is null or not public.has_role('partner') then
    raise exception 'Only approved partner accounts can submit properties.';
  end if;

  if jsonb_typeof(listing_data) is distinct from 'object'
    or jsonb_typeof(submission_data) is distinct from 'object' then
    raise exception 'Property submission data must be JSON objects.';
  end if;

  if length(btrim(coalesce(listing_data ->> 'title', ''))) < 8
    or length(btrim(coalesce(listing_data ->> 'public_address', ''))) < 10
    or length(btrim(coalesce(submission_data ->> 'authority_basis', ''))) < 9
    or jsonb_typeof(listing_data -> 'amenities') is distinct from 'array'
    or jsonb_typeof(listing_data -> 'image_urls') is distinct from 'array'
    or jsonb_typeof(listing_data -> 'house_rules') is distinct from 'array'
    or jsonb_typeof(listing_data -> 'mandatory_charges') is distinct from 'array'
    or jsonb_typeof(submission_data -> 'docs') is distinct from 'array' then
    raise exception 'Required property details or evidence declarations are missing.';
  end if;

  if jsonb_array_length(listing_data -> 'image_urls') > 12
    or jsonb_array_length(listing_data -> 'amenities') > 30
    or jsonb_array_length(listing_data -> 'house_rules') > 30
    or jsonb_array_length(submission_data -> 'docs') > 20 then
    raise exception 'Property submission exceeds an allowed item limit.';
  end if;

  if exists (
    select 1
    from public.properties existing
    where existing.status <> 'rejected'
      and public.normalize_listing_text(existing.area) = public.normalize_listing_text(listing_data ->> 'area')
      and public.normalize_listing_text(existing.public_address) = public.normalize_listing_text(listing_data ->> 'public_address')
      and public.normalize_listing_text(existing.title) = public.normalize_listing_text(listing_data ->> 'title')
  ) then
    raise exception 'A listing with this title and address already exists in this area.';
  end if;

  insert into public.properties (
    title, property_type, area, public_address, nightly_rate, cleaning_fee,
    mandatory_charges, refundable_deposit, bedrooms, bathrooms, capacity,
    bed_setup, amenities, image_urls, house_rules, status, verification, trust_label
  )
  values (
    btrim(listing_data ->> 'title'),
    btrim(listing_data ->> 'property_type'),
    btrim(listing_data ->> 'area'),
    btrim(listing_data ->> 'public_address'),
    (listing_data ->> 'nightly_rate')::integer,
    (listing_data ->> 'cleaning_fee')::integer,
    listing_data -> 'mandatory_charges',
    (listing_data ->> 'refundable_deposit')::integer,
    (listing_data ->> 'bedrooms')::integer,
    (listing_data ->> 'bathrooms')::integer,
    (listing_data ->> 'capacity')::integer,
    btrim(listing_data ->> 'bed_setup'),
    array(select jsonb_array_elements_text(listing_data -> 'amenities')),
    array(select jsonb_array_elements_text(listing_data -> 'image_urls')),
    array(select jsonb_array_elements_text(listing_data -> 'house_rules')),
    'submitted',
    jsonb_build_object(
      'ownership', 'pending_review',
      'identity', 'pending_review',
      'authority', 'pending_review',
      'inspection', 'missing'
    ),
    'Under review'
  )
  returning id into created_property_id;

  select coalesce(
    jsonb_agg(jsonb_build_object(
      'label', document ->> 'label',
      'status', case
        when document ->> 'status' = 'missing' then 'missing'
        else 'self_reported'
      end
    )),
    '[]'::jsonb
  )
  into submitted_docs
  from jsonb_array_elements(submission_data -> 'docs') as items(document);

  insert into public.property_private_records (property_id, record_type, record_data)
  values (
    created_property_id,
    'partner_submission',
    jsonb_build_object(
      'authority_basis', btrim(submission_data ->> 'authority_basis'),
      'submitted_role', btrim(coalesce(submission_data ->> 'submitted_role', 'Property partner')),
      'docs', submitted_docs
    )
  );

  return created_property_id;
end;
$$;

revoke all on function public.submit_partner_property(jsonb, jsonb) from public, anon;
grant execute on function public.submit_partner_property(jsonb, jsonb) to authenticated;

create or replace function public.review_partner_property(
  target_property_id text,
  next_status text,
  reviewer_note text,
  verification_data jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_status text;
  current_title text;
  current_area text;
  current_address text;
  next_verification jsonb;
begin
  if (select auth.uid()) is null or not public.has_role('admin') then
    raise exception 'Only administrators can review properties.';
  end if;

  if next_status not in ('approved', 'needs_correction', 'rejected', 'suspended') then
    raise exception 'Unsupported property review status.';
  end if;

  if length(btrim(coalesce(reviewer_note, ''))) < 10 then
    raise exception 'A reviewer note of at least 10 characters is required.';
  end if;

  if jsonb_typeof(verification_data) is distinct from 'object'
    or coalesce(verification_data ->> 'ownership', '') not in ('verified', 'pending_review', 'missing', 'self_reported')
    or coalesce(verification_data ->> 'identity', '') not in ('verified', 'pending_review', 'missing', 'self_reported')
    or coalesce(verification_data ->> 'authority', '') not in ('verified', 'pending_review', 'missing', 'self_reported')
    or coalesce(verification_data ->> 'inspection', '') not in ('verified', 'pending_review', 'missing', 'self_reported') then
    raise exception 'All four verification outcomes must be supplied.';
  end if;

  select status, title, area, public_address
    into current_status, current_title, current_area, current_address
    from public.properties
    where id = target_property_id
    for update;

  if not found then
    raise exception 'Property not found.';
  end if;

  if current_status in ('submitted', 'needs_correction')
    and next_status not in ('approved', 'needs_correction', 'rejected') then
    raise exception 'Invalid decision for a submitted property.';
  elsif current_status = 'approved' and next_status <> 'suspended' then
    raise exception 'Approved properties can only be suspended.';
  elsif current_status = 'suspended' and next_status <> 'approved' then
    raise exception 'Suspended properties can only be reinstated.';
  elsif current_status = 'rejected' then
    raise exception 'Rejected listings cannot be changed; submit a new listing.';
  end if;

  next_verification := jsonb_build_object(
    'ownership', verification_data ->> 'ownership',
    'identity', verification_data ->> 'identity',
    'authority', verification_data ->> 'authority',
    'inspection', verification_data ->> 'inspection'
  );

  if next_status = 'approved' then
    if next_verification ->> 'ownership' <> 'verified'
      or next_verification ->> 'identity' <> 'verified'
      or next_verification ->> 'authority' <> 'verified'
      or next_verification ->> 'inspection' <> 'verified' then
      raise exception 'Ownership, identity, authority, and inspection must all be verified before approval.';
    end if;

    if exists (
      select 1
      from public.properties existing
      where existing.id <> target_property_id
        and existing.status = 'approved'
        and public.normalize_listing_text(existing.area) = public.normalize_listing_text(current_area)
        and public.normalize_listing_text(existing.public_address) = public.normalize_listing_text(current_address)
        and public.normalize_listing_text(existing.title) = public.normalize_listing_text(current_title)
    ) then
      raise exception 'Duplicate listing cannot be approved while another approved property uses the same title and address.';
    end if;
  end if;

  update public.properties
    set status = next_status,
        verification = next_verification,
        trust_label = case when next_status = 'approved' then 'HAMLET verified' else 'Under review' end,
        review_note = btrim(reviewer_note),
        updated_at = now()
    where id = target_property_id;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      (select auth.uid()),
      'admin',
      'property_' || next_status,
      current_title,
      'Status: ' || current_status || ' → ' || next_status || '. Reviewer note: ' || btrim(reviewer_note)
    );
end;
$$;

revoke all on function public.review_partner_property(text, text, text, jsonb) from public, anon;
grant execute on function public.review_partner_property(text, text, text, jsonb) to authenticated;

-- ─── 2. Controlled ledger & server-side webhook payment confirmation ─────────

alter table public.booking_payment_records
  add column if not exists description text not null default '',
  add column if not exists variance integer not null default 0,
  add column if not exists note text,
  add column if not exists operator_name text not null default 'System',
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'booking_payment_records_type_check'
  ) then
    alter table public.booking_payment_records
      add constraint booking_payment_records_type_check
      check (record_type in (
        'guest_charge',
        'guest_service_fee',
        'accommodation_revenue',
        'mandatory_charges',
        'provider_charge',
        'partner_commission',
        'deposit_hold',
        'refund'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'booking_payment_records_status_check'
  ) then
    alter table public.booking_payment_records
      add constraint booking_payment_records_status_check
      check (status in ('recorded', 'reconciled', 'settled', 'pending', 'flagged'));
  end if;
end
$$;

create unique index if not exists booking_payment_records_provider_idempotency_idx
  on public.booking_payment_records (provider_reference, record_type, booking_id)
  where provider_reference is not null;

-- Prevent unguarded client-side table writes; all ledger writes go through
-- verified webhook or audited admin RPCs.
revoke insert, update, delete on public.booking_payment_records from anon, authenticated;

create or replace function public.confirm_booking_payment_webhook(
  target_booking_id text,
  provider_name text,
  provider_ref text,
  paid_amount_naira integer,
  provider_fee_naira integer default 0,
  currency_code text default 'NGN'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_provider text := btrim(coalesce(provider_name, ''));
  clean_ref text := btrim(coalesce(provider_ref, ''));
  clean_currency text := upper(btrim(coalesce(currency_code, '')));
  booking_row public.bookings%rowtype;
  property_row public.properties%rowtype;
  stay_nights integer;
  amount_variance integer;
  operator_label text;
  inserted_flag_id uuid;
  access_row record;
  commission_amount integer;
begin
  if clean_provider = '' or clean_ref = '' then
    raise exception 'Payment provider name and provider reference are required.';
  end if;

  if clean_currency <> 'NGN' then
    raise exception 'Unsupported payment currency %. Only NGN is accepted.', clean_currency;
  end if;

  if paid_amount_naira is null or paid_amount_naira < 0 then
    raise exception 'Paid amount must be a non-negative integer in Naira.';
  end if;

  if coalesce(provider_fee_naira, 0) < 0 then
    raise exception 'Provider fee must be non-negative.';
  end if;

  select * into booking_row
    from public.bookings
    where id = target_booking_id or reference = target_booking_id
    for update;

  if not found then
    raise exception 'Booking not found for payment confirmation.';
  end if;

  if exists (
    select 1
    from public.booking_payment_records existing_rec
    where existing_rec.provider_reference = clean_ref
      and existing_rec.booking_id <> booking_row.id
  ) then
    raise exception 'Provider reference % is already linked to another booking.', clean_ref;
  end if;

  -- Idempotent replay handling for duplicate webhook deliveries
  if booking_row.status = 'confirmed' and booking_row.payment_reference = clean_ref then
    return jsonb_build_object(
      'status', 'already_confirmed',
      'booking_id', booking_row.id,
      'reference', booking_row.reference,
      'variance', 0
    );
  end if;

  if booking_row.status <> 'awaiting_payment' then
    raise exception 'Booking % cannot be confirmed from status %.', booking_row.reference, booking_row.status;
  end if;

  select * into property_row
    from public.properties
    where id = booking_row.property_id
    for update;

  if not found or property_row.status <> 'approved' then
    raise exception 'Property is no longer approved for booking confirmation.';
  end if;

  if booking_row.check_in < current_date then
    raise exception 'Booking check-in date has already passed.';
  end if;

  if booking_row.payment_deadline is not null and booking_row.payment_deadline <= now() then
    raise exception 'Booking payment deadline has already expired.';
  end if;

  if exists (
    select 1
    from public.bookings existing
    where existing.id <> booking_row.id
      and existing.property_id = booking_row.property_id
      and existing.status in ('confirmed', 'awaiting_payment')
      and (existing.status <> 'awaiting_payment' or existing.payment_deadline > now())
      and existing.check_in < booking_row.check_out
      and existing.check_out > booking_row.check_in
  ) then
    raise exception 'Booking dates now conflict with another active booking.';
  end if;

  stay_nights := booking_row.check_out - booking_row.check_in;
  amount_variance := paid_amount_naira - booking_row.guest_total;
  operator_label := 'System (' || clean_provider || ' webhook)';

  -- Underpayment: keep booking unconfirmed, flag ledger & audit for manual operations review
  if paid_amount_naira < booking_row.guest_total then
    insert into public.booking_payment_records (
      booking_id, record_type, amount, provider_reference, status,
      description, variance, note, operator_name
    )
    values (
      booking_row.id,
      'guest_charge',
      paid_amount_naira,
      clean_ref,
      'flagged',
      'Underpaid webhook callback — booking held unconfirmed pending operations review',
      amount_variance,
      'Expected ' || booking_row.guest_total || ' NGN; received ' || paid_amount_naira || ' NGN.',
      operator_label
    )
    on conflict (provider_reference, record_type, booking_id)
      where provider_reference is not null
    do nothing
    returning id into inserted_flag_id;

    if inserted_flag_id is not null then
      update public.bookings
        set timeline = coalesce(timeline, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
          'at', now(),
          'label', 'Payment amount mismatch flagged — manual review required',
          'actor', operator_label,
          'detail', 'Ref ' || clean_ref || ' · received ' || paid_amount_naira || ' NGN vs expected ' || booking_row.guest_total || ' NGN'
        ))
        where id = booking_row.id;

      insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
        values (
          booking_row.guest_id,
          'system',
          'payment_amount_mismatch',
          booking_row.reference,
          'Webhook ref ' || clean_ref || ' underpaid: received ' || paid_amount_naira || ' NGN, expected ' || booking_row.guest_total || ' NGN.'
        );
    end if;

    return jsonb_build_object(
      'status', 'flagged_underpayment',
      'booking_id', booking_row.id,
      'reference', booking_row.reference,
      'variance', amount_variance
    );
  end if;

  -- Confirm booking after server-side webhook & availability verification
  update public.bookings
    set status = 'confirmed',
        payment_provider = clean_provider,
        payment_reference = clean_ref,
        timeline = coalesce(timeline, '[]'::jsonb) || jsonb_build_array(
          jsonb_build_object(
            'at', now(),
            'label', 'Payment verified server-side via provider webhook',
            'actor', operator_label,
            'detail', 'Ref ' || clean_ref || ' · ' || paid_amount_naira || ' NGN'
          ),
          jsonb_build_object(
            'at', now(),
            'label', 'Booking confirmed — availability rechecked. No overlap.',
            'actor', 'HAMLET system',
            'detail', null
          )
        )
    where id = booking_row.id;

  -- Distinct controlled ledger concepts (Spec §4 & §6):
  -- 1. Guest payment collected
  insert into public.booking_payment_records (
    booking_id, record_type, amount, provider_reference, status,
    description, variance, note, operator_name
  )
  values (
    booking_row.id,
    'guest_charge',
    paid_amount_naira,
    clean_ref,
    case when amount_variance = 0 then 'reconciled' else 'flagged' end,
    'Guest payment verified via webhook (' || stay_nights || ' nights + mandatory charges + 3% HAMLET guest fee)',
    amount_variance,
    case when amount_variance = 0 then null else 'Overpayment variance recorded for manual reconciliation.' end,
    operator_label
  );

  -- 2. Owner accommodation revenue (0% HAMLET owner service fee)
  insert into public.booking_payment_records (
    booking_id, record_type, amount, provider_reference, status,
    description, variance, operator_name
  )
  values (
    booking_row.id,
    'accommodation_revenue',
    booking_row.accommodation_subtotal,
    clean_ref,
    'recorded',
    'Owner accommodation revenue (' || stay_nights || ' nights · 0% HAMLET owner fee)',
    0,
    operator_label
  );

  -- 3. Disclosed mandatory non-accommodation charges
  if booking_row.mandatory_total > 0 then
    insert into public.booking_payment_records (
      booking_id, record_type, amount, provider_reference, status,
      description, variance, operator_name
    )
    values (
      booking_row.id,
      'mandatory_charges',
      booking_row.mandatory_total,
      clean_ref,
      'recorded',
      'Disclosed mandatory property charges (owner settlement)',
      0,
      operator_label
    );
  end if;

  -- 4. HAMLET 3% guest service fee (paid by guest only, never deducted from owner proceeds)
  insert into public.booking_payment_records (
    booking_id, record_type, amount, provider_reference, status,
    description, variance, operator_name
  )
  values (
    booking_row.id,
    'guest_service_fee',
    booking_row.hamlet_guest_fee,
    clean_ref,
    'reconciled',
    'HAMLET guest service fee (3.0% of accommodation subtotal)',
    0,
    operator_label
  );

  -- 5. Refundable security deposit (excluded from fee base)
  if booking_row.refundable_deposit > 0 then
    insert into public.booking_payment_records (
      booking_id, record_type, amount, provider_reference, status,
      description, variance, operator_name
    )
    values (
      booking_row.id,
      'deposit_hold',
      booking_row.refundable_deposit,
      clean_ref,
      'recorded',
      'Refundable security deposit — held separately, excluded from fee base',
      0,
      operator_label
    );
  end if;

  -- 6. Provider processing charge (recorded for reconciliation only; policy undecided)
  if coalesce(provider_fee_naira, 0) > 0 then
    insert into public.booking_payment_records (
      booking_id, record_type, amount, provider_reference, status,
      description, variance, note, operator_name
    )
    values (
      booking_row.id,
      'provider_charge',
      provider_fee_naira,
      clean_ref,
      'recorded',
      'Provider processing charge recorded for reconciliation',
      0,
      'Processing-fee policy undecided — not passed to guest and not deducted from owner proceeds.',
      operator_label
    );
  end if;

  -- 7. Explicitly agreed partner commissions (never assumed, never auto-split)
  for access_row in
    select user_id, commission_rate, commission_note
    from public.property_access
    where property_id = booking_row.property_id
      and status = 'active'
      and commission_rate is not null
      and commission_rate > 0
  loop
    commission_amount := round(booking_row.accommodation_subtotal * access_row.commission_rate)::integer;
    if commission_amount > 0 then
      insert into public.booking_payment_records (
        booking_id, record_type, amount, provider_reference, status,
        description, variance, note, operator_name
      )
      values (
        booking_row.id,
        'partner_commission',
        commission_amount,
        clean_ref || ':commission:' || access_row.user_id::text,
        'recorded',
        'Agreed partner commission (' || round(access_row.commission_rate * 100, 1) || '% of accommodation subtotal — manual settlement)',
        0,
        access_row.commission_note,
        operator_label
      );
    end if;
  end loop;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      booking_row.guest_id,
      'system',
      'payment_verified',
      booking_row.reference,
      'Webhook verified (' || clean_provider || ' · ' || clean_ref || '). Paid: ' || paid_amount_naira || ' NGN; variance: ' || amount_variance || ' NGN.'
    );

  return jsonb_build_object(
    'status', 'confirmed',
    'booking_id', booking_row.id,
    'reference', booking_row.reference,
    'variance', amount_variance
  );
end;
$$;

-- Strictly server-only: neither anon nor authenticated browser sessions can call this RPC.
revoke all on function public.confirm_booking_payment_webhook(text, text, text, integer, integer, text)
  from public, anon, authenticated;
grant execute on function public.confirm_booking_payment_webhook(text, text, text, integer, integer, text)
  to service_role;

create or replace function public.reconcile_ledger_entry(
  target_entry_id uuid,
  next_status text,
  next_variance integer default 0,
  reconciliation_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  admin_name text;
  entry_row public.booking_payment_records%rowtype;
  booking_ref text;
  clean_note text := nullif(btrim(coalesce(reconciliation_note, '')), '');
begin
  if actor_id is null or not public.has_role('admin') then
    raise exception 'Only administrators can reconcile ledger entries.';
  end if;

  if next_status not in ('recorded', 'reconciled', 'settled', 'pending', 'flagged') then
    raise exception 'Unsupported ledger status %.', next_status;
  end if;

  if (next_status = 'flagged' or coalesce(next_variance, 0) <> 0)
    and length(coalesce(clean_note, '')) < 8 then
    raise exception 'A reconciliation note (min 8 characters) is required when flagging or recording a variance.';
  end if;

  select full_name into admin_name
    from public.profiles
    where id = actor_id;

  select * into entry_row
    from public.booking_payment_records
    where id = target_entry_id
    for update;

  if not found then
    raise exception 'Ledger entry not found.';
  end if;

  select reference into booking_ref
    from public.bookings
    where id = entry_row.booking_id;

  update public.booking_payment_records
    set status = next_status,
        variance = coalesce(next_variance, 0),
        note = coalesce(clean_note, note),
        recorded_by = actor_id,
        operator_name = coalesce(nullif(admin_name, ''), 'HAMLET administrator'),
        updated_at = now()
    where id = target_entry_id;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      'admin',
      'ledger_' || next_status,
      coalesce(booking_ref, entry_row.booking_id),
      'Entry ' || entry_row.record_type || ' (' || entry_row.amount || ' NGN) → ' || next_status
        || '; variance: ' || coalesce(next_variance, 0)
        || case when clean_note is null then '' else '; note: ' || clean_note end
    );
end;
$$;

revoke all on function public.reconcile_ledger_entry(uuid, text, integer, text) from public, anon;
grant execute on function public.reconcile_ledger_entry(uuid, text, integer, text) to authenticated;

create or replace function public.record_ledger_adjustment(
  target_booking_id text,
  entry_type text,
  entry_amount integer,
  entry_status text,
  entry_description text,
  provider_ref text default null,
  entry_variance integer default 0,
  entry_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  admin_name text;
  booking_row public.bookings%rowtype;
  created_id uuid;
  clean_desc text := btrim(coalesce(entry_description, ''));
  clean_note text := nullif(btrim(coalesce(entry_note, '')), '');
  clean_ref text := nullif(btrim(coalesce(provider_ref, '')), '');
begin
  if actor_id is null or not public.has_role('admin') then
    raise exception 'Only administrators can record manual ledger entries.';
  end if;

  if entry_type not in (
    'guest_charge', 'guest_service_fee', 'accommodation_revenue',
    'mandatory_charges', 'provider_charge', 'partner_commission',
    'deposit_hold', 'refund'
  ) then
    raise exception 'Unsupported ledger entry type %.', entry_type;
  end if;

  if entry_status not in ('recorded', 'reconciled', 'settled', 'pending', 'flagged') then
    raise exception 'Unsupported ledger status %.', entry_status;
  end if;

  if entry_amount is null or entry_amount < 0 then
    raise exception 'Ledger entry amount must be a non-negative integer.';
  end if;

  if length(clean_desc) < 8 then
    raise exception 'A description of at least 8 characters is required.';
  end if;

  select * into booking_row
    from public.bookings
    where id = target_booking_id or reference = target_booking_id;

  if not found then
    raise exception 'Booking not found for ledger adjustment.';
  end if;

  select full_name into admin_name
    from public.profiles
    where id = actor_id;

  insert into public.booking_payment_records (
    booking_id, record_type, amount, provider_reference, status,
    recorded_by, description, variance, note, operator_name
  )
  values (
    booking_row.id,
    entry_type,
    entry_amount,
    clean_ref,
    entry_status,
    actor_id,
    clean_desc,
    coalesce(entry_variance, 0),
    clean_note,
    coalesce(nullif(admin_name, ''), 'HAMLET administrator')
  )
  returning id into created_id;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      'admin',
      'ledger_adjustment_recorded',
      booking_row.reference,
      'Recorded ' || entry_type || ' (' || entry_amount || ' NGN, ' || entry_status || '): ' || clean_desc
    );

  return created_id;
end;
$$;

revoke all on function public.record_ledger_adjustment(text, text, integer, text, text, text, integer, text)
  from public, anon;
grant execute on function public.record_ledger_adjustment(text, text, integer, text, text, text, integer, text)
  to authenticated;

-- ─── 3. Post-confirmation booking operations & refunds ───────────────────────

create or replace function public.transition_booking(
  target_booking_id text,
  next_status text,
  transition_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role text;
  actor_name text;
  booking_row public.bookings%rowtype;
  property_title text;
  event_label text;
  event_detail text;
  clean_note text := nullif(btrim(coalesce(transition_note, '')), '');
  new_deadline timestamptz;
  next_refund_status text;
begin
  if actor_id is null then
    raise exception 'Sign in to update this booking.';
  end if;

  select role, full_name
    into actor_role, actor_name
    from public.profiles
    where id = actor_id;

  if actor_role is null then
    raise exception 'A valid HAMLET profile is required.';
  end if;

  select * into booking_row
    from public.bookings
    where id = target_booking_id
    for update;

  if not found then
    raise exception 'Booking not found.';
  end if;

  select title into property_title
    from public.properties
    where id = booking_row.property_id;

  next_refund_status := booking_row.refund_status;

  if actor_role = 'guest' then
    if booking_row.guest_id <> actor_id
      or next_status <> 'cancelled'
      or booking_row.status not in ('requested', 'checking', 'awaiting_payment') then
      raise exception 'Guests may only cancel their own open booking requests.';
    end if;
    event_label := 'Booking cancelled by guest';
    event_detail := clean_note;
  elsif actor_role in ('partner', 'admin') then
    if not public.can_manage_property(booking_row.property_id) then
      raise exception 'You are not authorised to manage this property booking.';
    end if;

    if booking_row.status = 'requested' and next_status = 'checking' then
      event_label := 'Availability & terms being checked';
      event_detail := clean_note;
    elsif booking_row.status in ('requested', 'checking') and next_status = 'awaiting_payment' then
      perform 1
        from public.properties
        where id = booking_row.property_id
        for update;

      if booking_row.check_in < current_date then
        raise exception 'This booking has a check-in date in the past.';
      end if;

      if not exists (
        select 1 from public.properties
        where id = booking_row.property_id and status = 'approved'
      ) then
        raise exception 'This property is no longer approved for booking.';
      end if;

      if exists (
        select 1 from public.bookings existing
        where existing.id <> booking_row.id
          and existing.property_id = booking_row.property_id
          and existing.status in ('confirmed', 'awaiting_payment')
          and (existing.status <> 'awaiting_payment' or existing.payment_deadline > now())
          and existing.check_in < booking_row.check_out
          and existing.check_out > booking_row.check_in
      ) then
        raise exception 'These dates overlap another active booking. Recheck availability before accepting.';
      end if;

      new_deadline := now() + interval '48 hours';
      event_label := 'Accepted — awaiting payment';
      event_detail := 'Payment deadline: ' || to_char(new_deadline, 'YYYY-MM-DD HH24:MI:SS TZ')
        || case when clean_note is null then '' else ' · ' || clean_note end;
    elsif booking_row.status in ('requested', 'checking') and next_status = 'declined' then
      event_label := 'Declined by property partner';
      event_detail := clean_note;
    elsif actor_role = 'admin' and booking_row.status = 'confirmed' and next_status = 'completed' then
      event_label := 'Stay completed';
      event_detail := clean_note;
    elsif actor_role = 'admin' and booking_row.status = 'confirmed' and next_status = 'no_show' then
      if length(coalesce(clean_note, '')) < 8 then
        raise exception 'A documented note (min 8 characters) is required to record a no-show.';
      end if;
      event_label := 'No-show recorded';
      event_detail := clean_note;
    elsif actor_role = 'admin' and booking_row.status in ('confirmed', 'completed') and next_status = 'disputed' then
      if length(coalesce(clean_note, '')) < 8 then
        raise exception 'A documented note (min 8 characters) is required to mark a booking disputed.';
      end if;
      event_label := 'Booking disputed — issue resolution in progress';
      event_detail := clean_note;
    elsif actor_role = 'admin'
      and booking_row.status in ('requested', 'checking', 'awaiting_payment', 'confirmed', 'disputed')
      and next_status = 'cancelled' then
      if length(coalesce(clean_note, '')) < 8 then
        raise exception 'A cancellation reason (min 8 characters) is required for operational cancellations.';
      end if;
      event_label := 'Booking cancelled by HAMLET operations';
      event_detail := clean_note;
      if booking_row.status in ('confirmed', 'disputed') and booking_row.refund_status = 'none' then
        next_refund_status := 'pending_review';
      end if;
    elsif actor_role = 'admin' and booking_row.status = 'awaiting_payment' and next_status = 'expired' then
      if booking_row.payment_deadline is null or booking_row.payment_deadline > now() then
        raise exception 'Cannot manually expire a booking before its payment deadline has elapsed.';
      end if;
      event_label := 'Payment deadline expired — booking expired';
      event_detail := coalesce(clean_note, 'Availability released after the payment deadline.');
    else
      -- Note: 'confirmed' is intentionally absent for every client role; bookings are
      -- confirmed exclusively through server-verified webhook execution.
      raise exception 'Invalid booking transition from % to %.', booking_row.status, next_status;
    end if;
  else
    raise exception 'This account role cannot update bookings.';
  end if;

  update public.bookings
    set status = next_status,
        payment_deadline = case when next_status = 'awaiting_payment' then new_deadline else payment_deadline end,
        cancel_reason = case when next_status = 'cancelled' then event_detail else cancel_reason end,
        refund_status = next_refund_status,
        timeline = coalesce(timeline, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
          'at', now(),
          'label', event_label,
          'actor', coalesce(nullif(actor_name, ''), 'HAMLET user') || ' (' || actor_role || ')',
          'detail', event_detail
        ))
    where id = booking_row.id;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      actor_role,
      'booking_' || next_status,
      booking_row.reference,
      'Property: ' || coalesce(property_title, booking_row.property_id)
        || '; previous status: ' || booking_row.status
        || '; new status: ' || next_status
        || case when event_detail is null then '' else '; ' || event_detail end
    );
end;
$$;

revoke all on function public.transition_booking(text, text, text) from public, anon;
grant execute on function public.transition_booking(text, text, text) to authenticated;

create or replace function public.record_booking_refund(
  target_booking_id text,
  refund_amount_naira integer,
  provider_ref text default null,
  refund_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  admin_name text;
  booking_row public.bookings%rowtype;
  max_refundable integer;
  clean_note text := btrim(coalesce(refund_note, ''));
  clean_ref text := nullif(btrim(coalesce(provider_ref, '')), '');
  operator_label text;
begin
  if actor_id is null or not public.has_role('admin') then
    raise exception 'Only administrators can record booking refunds.';
  end if;

  if length(clean_note) < 8 then
    raise exception 'A refund note (min 8 characters) is required.';
  end if;

  select full_name into admin_name
    from public.profiles
    where id = actor_id;

  select * into booking_row
    from public.bookings
    where id = target_booking_id
    for update;

  if not found then
    raise exception 'Booking not found.';
  end if;

  if booking_row.status not in ('cancelled', 'disputed', 'no_show') then
    raise exception 'Refunds can only be recorded for cancelled, disputed, or no-show bookings.';
  end if;

  max_refundable := booking_row.guest_total + booking_row.refundable_deposit;
  if refund_amount_naira is null or refund_amount_naira <= 0 or refund_amount_naira > max_refundable then
    raise exception 'Refund amount must be positive and cannot exceed booking total plus deposit (% NGN).', max_refundable;
  end if;

  operator_label := coalesce(nullif(admin_name, ''), 'HAMLET administrator');

  update public.bookings
    set status = 'refunded',
        refund_status = 'processed',
        refund_amount = refund_amount_naira,
        timeline = coalesce(timeline, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
          'at', now(),
          'label', 'Refund processed',
          'actor', operator_label || ' (admin)',
          'detail', refund_amount_naira || ' NGN · ' || clean_note
            || case when clean_ref is null then '' else ' · Ref ' || clean_ref end
        ))
    where id = booking_row.id;

  insert into public.booking_payment_records (
    booking_id, record_type, amount, provider_reference, status,
    recorded_by, description, variance, note, operator_name
  )
  values (
    booking_row.id,
    'refund',
    refund_amount_naira,
    clean_ref,
    'reconciled',
    actor_id,
    'Guest refund processed — ' || clean_note,
    0,
    clean_note,
    operator_label
  );

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      'admin',
      'booking_refunded',
      booking_row.reference,
      'Refunded ' || refund_amount_naira || ' NGN'
        || case when clean_ref is null then '' else ' (ref ' || clean_ref || ')' end
        || ': ' || clean_note
    );
end;
$$;

revoke all on function public.record_booking_refund(text, integer, text, text) from public, anon;
grant execute on function public.record_booking_refund(text, integer, text, text) to authenticated;

-- ─── 4. Issues & accountability workflow ─────────────────────────────────────

alter table public.booking_issues
  add column if not exists assignee_name text,
  add column if not exists timeline jsonb not null default '[]'::jsonb;

revoke update on public.booking_issues from anon, authenticated;

create or replace function public.initialize_booking_issue_timeline()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  reporter_name text;
  reporter_role text;
begin
  select full_name, role
    into reporter_name, reporter_role
    from public.profiles
    where id = new.reporter_id;

  if new.timeline is null or jsonb_typeof(new.timeline) <> 'array' or jsonb_array_length(new.timeline) = 0 then
    new.timeline := jsonb_build_array(jsonb_build_object(
      'at', now(),
      'label', 'Issue reported',
      'actor', coalesce(nullif(reporter_name, ''), 'HAMLET user') || ' (' || coalesce(reporter_role, 'guest') || ')',
      'detail', new.category || ' · ' || new.severity || ' severity'
    ));
  end if;

  return new;
end;
$$;

drop trigger if exists initialize_booking_issue_timeline on public.booking_issues;
create trigger initialize_booking_issue_timeline
  before insert on public.booking_issues
  for each row execute function public.initialize_booking_issue_timeline();

create or replace function public.transition_booking_issue(
  target_issue_id uuid,
  next_status text,
  action_note text default null,
  next_assignee_id uuid default null,
  next_assignee_name text default null,
  resolution_summary text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role text;
  actor_name text;
  issue_row public.booking_issues%rowtype;
  booking_property_id text;
  clean_note text := nullif(btrim(coalesce(action_note, '')), '');
  clean_resolution text := nullif(btrim(coalesce(resolution_summary, '')), '');
  clean_assignee_name text := nullif(btrim(coalesce(next_assignee_name, '')), '');
  effective_resolution text;
  audit_action text;
begin
  if actor_id is null then
    raise exception 'Sign in to update this issue.';
  end if;

  select role, full_name
    into actor_role, actor_name
    from public.profiles
    where id = actor_id;

  if actor_role is null then
    raise exception 'A valid HAMLET profile is required.';
  end if;

  if next_status not in ('open', 'assigned', 'investigating', 'escalated', 'resolved', 'closed') then
    raise exception 'Unsupported issue status %.', next_status;
  end if;

  select * into issue_row
    from public.booking_issues
    where id = target_issue_id
    for update;

  if not found then
    raise exception 'Issue not found.';
  end if;

  if issue_row.status = 'closed' then
    raise exception 'Closed issues cannot be modified.';
  end if;

  select property_id into booking_property_id
    from public.bookings
    where id = issue_row.booking_id;

  if actor_role = 'admin' then
    null; -- authorised across all issues
  elsif actor_role = 'partner' and public.can_manage_property(booking_property_id) then
    if next_status not in ('investigating', 'escalated') then
      raise exception 'Partners may only record investigation updates or escalate issues; HAMLET operations assigns, resolves, and closes issues.';
    end if;
  else
    raise exception 'You are not authorised to update this issue.';
  end if;

  effective_resolution := coalesce(
    clean_resolution,
    nullif(btrim(coalesce(issue_row.resolution, '')), ''),
    case when next_status in ('resolved', 'closed') then clean_note else null end
  );

  if next_status in ('resolved', 'closed') and length(coalesce(effective_resolution, coalesce(issue_row.resolution, ''))) < 8 then
    raise exception 'A documented resolution summary (min 8 characters) is required to resolve or close an issue.';
  end if;

  if next_status = 'assigned' and clean_assignee_name is null and next_assignee_id is null then
    clean_assignee_name := coalesce(nullif(actor_name, ''), 'HAMLET operations');
    next_assignee_id := actor_id;
  elsif next_assignee_id is not null and clean_assignee_name is null then
    select full_name into clean_assignee_name
      from public.profiles
      where id = next_assignee_id;
  end if;

  update public.booking_issues
    set status = next_status,
        assignee_id = coalesce(next_assignee_id, assignee_id),
        assignee_name = coalesce(clean_assignee_name, assignee_name),
        resolution = coalesce(effective_resolution, resolution),
        updated_at = now(),
        timeline = coalesce(timeline, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
          'at', now(),
          'label', 'Status → ' || next_status,
          'actor', coalesce(nullif(actor_name, ''), 'HAMLET user') || ' (' || actor_role || ')',
          'detail', coalesce(clean_note, effective_resolution)
        ))
    where id = issue_row.id;

  audit_action := case
    when next_status = 'escalated' then 'issue_escalated'
    when next_status in ('resolved', 'closed') then 'issue_closed'
    else 'issue_updated'
  end;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      actor_role,
      audit_action,
      issue_row.reference,
      'Status: ' || issue_row.status || ' → ' || next_status
        || case when coalesce(clean_note, effective_resolution) is null then '' else '. Note: ' || coalesce(clean_note, effective_resolution) end
    );
end;
$$;

revoke all on function public.transition_booking_issue(uuid, text, text, uuid, text, text) from public, anon;
grant execute on function public.transition_booking_issue(uuid, text, text, uuid, text, text) to authenticated;

-- ─── 5. Explicit partner property assignments & agreed commissions ───────────

create or replace function public.grant_property_assignment(
  target_property_id text,
  target_partner_id uuid,
  authority_scope text,
  agreed_commission_rate numeric default null,
  agreed_commission_note text default ''
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  property_row public.properties%rowtype;
  partner_profile public.profiles%rowtype;
  clean_scope text := btrim(coalesce(authority_scope, ''));
  clean_comm_note text := btrim(coalesce(agreed_commission_note, ''));
  assigned_role text;
begin
  if actor_id is null or not public.has_role('admin') then
    raise exception 'Only administrators can grant property assignments.';
  end if;

  if length(clean_scope) < 5 then
    raise exception 'A clear scope of authority (min 5 characters) is required.';
  end if;

  if agreed_commission_rate is not null then
    if agreed_commission_rate <= 0 or agreed_commission_rate > 1 then
      raise exception 'Agreed commission rate must be between 0 (exclusive) and 1 (100%%).';
    end if;
    if length(clean_comm_note) < 8 then
      raise exception 'A written agreement reference (min 8 characters) is required when recording a partner commission.';
    end if;
  end if;

  select * into property_row
    from public.properties
    where id = target_property_id;

  if not found or property_row.status <> 'approved' then
    raise exception 'Assignments can only be granted on approved properties.';
  end if;

  select * into partner_profile
    from public.profiles
    where id = target_partner_id;

  if not found or partner_profile.role <> 'partner' then
    raise exception 'Target account must be an approved partner.';
  end if;

  assigned_role := coalesce(nullif(btrim(coalesce(partner_profile.partner_role, '')), ''), 'Property partner');

  insert into public.property_access (
    property_id, user_id, access_role, scope,
    commission_rate, commission_note, status, granted_at, revoked_at
  )
  values (
    target_property_id,
    target_partner_id,
    assigned_role,
    clean_scope,
    agreed_commission_rate,
    case when agreed_commission_rate is null then 'No commission agreed' else clean_comm_note end,
    'active',
    now(),
    null
  )
  on conflict (property_id, user_id) do update
    set access_role = excluded.access_role,
        scope = excluded.scope,
        commission_rate = excluded.commission_rate,
        commission_note = excluded.commission_note,
        status = 'active',
        granted_at = now(),
        revoked_at = null;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      'admin',
      'assignment_granted',
      property_row.title,
      coalesce(nullif(partner_profile.full_name, ''), target_partner_id::text)
        || ' (' || assigned_role || ') — scope: ' || clean_scope
        || '; commission: '
        || case
             when agreed_commission_rate is null then 'none agreed'
             else round(agreed_commission_rate * 100, 1) || '% (' || clean_comm_note || ')'
           end
    );
end;
$$;

revoke all on function public.grant_property_assignment(text, uuid, text, numeric, text) from public, anon;
grant execute on function public.grant_property_assignment(text, uuid, text, numeric, text) to authenticated;

create or replace function public.revoke_property_assignment(
  target_property_id text,
  target_partner_id uuid,
  revocation_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role text;
  property_title text;
  partner_name text;
  clean_note text := nullif(btrim(coalesce(revocation_note, '')), '');
begin
  if actor_id is null then
    raise exception 'Sign in to revoke a property assignment.';
  end if;

  select role into actor_role
    from public.profiles
    where id = actor_id;

  if actor_role <> 'admin' and actor_id <> target_partner_id then
    raise exception 'Only administrators or the assigned partner may revoke property access.';
  end if;

  update public.property_access
    set status = 'revoked',
        revoked_at = now()
    where property_id = target_property_id
      and user_id = target_partner_id
      and status = 'active';

  if not found then
    raise exception 'Active property assignment not found.';
  end if;

  select title into property_title
    from public.properties
    where id = target_property_id;

  select full_name into partner_name
    from public.profiles
    where id = target_partner_id;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      coalesce(actor_role, 'partner'),
      'assignment_revoked',
      coalesce(property_title, target_property_id),
      coalesce(nullif(partner_name, ''), target_partner_id::text) || ' — access revoked'
        || case when clean_note is null then '' else ' · ' || clean_note end
    );
end;
$$;

revoke all on function public.revoke_property_assignment(text, uuid, text) from public, anon;
grant execute on function public.revoke_property_assignment(text, uuid, text) to authenticated;
