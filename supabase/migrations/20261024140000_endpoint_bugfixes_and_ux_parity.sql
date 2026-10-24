-- ═══════════════════════════════════════════════════════════════════════════════
-- HAMLET Endpoint Bugfixes, Draft Listing Lifecycle & Partner Attribution Parity
-- Fixes:
--   1. resubmit_partner_property & update_and_resubmit_partner_property support
--      'draft' listings alongside 'needs_correction', persist calendar onboarding
--      fields, and ignore both 'rejected' and 'archived' rows in duplicate checks.
--   2. resubmit_partner_application allows properties_count = 0 for Closing Agent
--      and Referral Partner roles and preserves/resolves optional referral codes.
--   3. enqueue_booking_event_notifications includes FX quote currency, quoted
--      international stay total, 10% FX buffer, and NGN settlement total in payload.
--   4. get_my_partner_attribution_summary() gives partners safe display names for
--      their referred partners and non-PII summaries of bookings they closed as
--      Closing Agent without loosening RLS on public.profiles or public.bookings.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Draft & Correction Property Submission / Edit RPCs ────────────────────

create or replace function public.resubmit_partner_property(target_property_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  prop_row public.properties%rowtype;
  was_draft boolean := false;
begin
  if actor_id is null or not public.has_role('partner') then
    raise exception 'Only approved partners can resubmit a property.';
  end if;

  if not public.is_account_active() then
    raise exception 'Your partner account is currently suspended. Contact HAMLET operations.';
  end if;

  select * into prop_row
    from public.properties
    where id = target_property_id
      and status in ('needs_correction', 'draft')
      and public.can_manage_property(id)
    for update;

  if not found then
    raise exception 'Property not found or not eligible for submission.';
  end if;

  was_draft := prop_row.status = 'draft';

  if coalesce(array_length(prop_row.image_urls, 1), 0) < 1 then
    raise exception 'Attach at least 1 property photo before submitting for review.';
  end if;

  if exists (
    select 1
    from public.properties existing
    where existing.id <> target_property_id
      and existing.status not in ('rejected', 'archived')
      and public.normalize_listing_text(existing.area) = public.normalize_listing_text(prop_row.area)
      and public.normalize_listing_text(existing.public_address) = public.normalize_listing_text(prop_row.public_address)
      and public.normalize_listing_text(existing.title) = public.normalize_listing_text(prop_row.title)
  ) then
    raise exception 'A listing with this title and address already exists in this area.';
  end if;

  update public.properties
    set status = 'submitted',
        trust_label = 'Under review',
        updated_at = now()
    where id = target_property_id;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      'partner',
      case when was_draft then 'property_submitted' else 'property_resubmitted' end,
      prop_row.title,
      case
        when was_draft then 'Partner submitted draft listing for HAMLET review.'
        else 'Partner resubmitted listing after corrections.'
      end
    );
end;
$$;

revoke all on function public.resubmit_partner_property(text) from public, anon;
grant execute on function public.resubmit_partner_property(text) to authenticated, service_role;

create or replace function public.update_and_resubmit_partner_property(
  target_property_id text,
  listing_data jsonb,
  submission_data jsonb,
  correction_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  prop_row public.properties%rowtype;
  existing_submission_id uuid;
  existing_docs jsonb := '[]'::jsonb;
  sanitized_docs jsonb;
  clean_summary text := nullif(btrim(coalesce(correction_note, '')), '');
  keep_draft boolean := false;
  next_status text := 'submitted';
  next_trust_label text := 'Under review';
  next_first_avail date;
  next_confirm_status text;
  next_cal_person text;
  raw_confirm text;
begin
  if actor_id is null or not public.has_role('partner') then
    raise exception 'Only approved partners can edit and resubmit a property.';
  end if;

  if not public.is_account_active() then
    raise exception 'Your partner account is currently suspended. Contact HAMLET operations.';
  end if;

  select * into prop_row
    from public.properties
    where id = target_property_id
      and status in ('needs_correction', 'draft')
      and public.can_manage_property(id)
    for update;

  if not found then
    raise exception 'Property not found or not in draft or needs_correction status.';
  end if;

  if jsonb_typeof(listing_data) is distinct from 'object'
    or jsonb_typeof(submission_data) is distinct from 'object' then
    raise exception 'Property correction data must be JSON objects.';
  end if;

  keep_draft := prop_row.status = 'draft' and coalesce((listing_data ->> 'save_as_draft')::boolean, false);
  if keep_draft then
    next_status := 'draft';
    next_trust_label := 'Draft';
  end if;

  if length(btrim(coalesce(listing_data ->> 'title', ''))) < 8
    or length(btrim(coalesce(listing_data ->> 'public_address', ''))) < 10
    or (not keep_draft and length(btrim(coalesce(submission_data ->> 'authority_basis', ''))) < 9)
    or jsonb_typeof(coalesce(listing_data -> 'amenities', '[]'::jsonb)) is distinct from 'array'
    or jsonb_typeof(coalesce(listing_data -> 'image_urls', '[]'::jsonb)) is distinct from 'array'
    or jsonb_typeof(coalesce(listing_data -> 'house_rules', '[]'::jsonb)) is distinct from 'array'
    or jsonb_typeof(coalesce(listing_data -> 'mandatory_charges', '[]'::jsonb)) is distinct from 'array'
    or jsonb_typeof(coalesce(submission_data -> 'docs', '[]'::jsonb)) is distinct from 'array' then
    raise exception 'Required property details or evidence declarations are missing.';
  end if;

  if not keep_draft and jsonb_array_length(coalesce(listing_data -> 'image_urls', '[]'::jsonb)) < 1 then
    raise exception 'Attach at least 1 property photo before submitting for review.';
  end if;

  perform public.assert_lagos_pilot_area(listing_data ->> 'area');

  if jsonb_array_length(coalesce(listing_data -> 'image_urls', '[]'::jsonb)) > 12
    or jsonb_array_length(coalesce(listing_data -> 'amenities', '[]'::jsonb)) > 30
    or jsonb_array_length(coalesce(listing_data -> 'house_rules', '[]'::jsonb)) > 30
    or jsonb_array_length(coalesce(submission_data -> 'docs', '[]'::jsonb)) > 20 then
    raise exception 'Property correction exceeds an allowed item limit.';
  end if;

  if exists (
    select 1
    from public.properties existing
    where existing.id <> target_property_id
      and existing.status not in ('rejected', 'archived')
      and public.normalize_listing_text(existing.area) = public.normalize_listing_text(listing_data ->> 'area')
      and public.normalize_listing_text(existing.public_address) = public.normalize_listing_text(listing_data ->> 'public_address')
      and public.normalize_listing_text(existing.title) = public.normalize_listing_text(listing_data ->> 'title')
  ) then
    raise exception 'A listing with this title and address already exists in this area.';
  end if;

  if listing_data ? 'first_available_date' then
    next_first_avail := nullif(btrim(coalesce(listing_data ->> 'first_available_date', '')), '')::date;
  else
    next_first_avail := prop_row.first_available_date;
  end if;

  if listing_data ? 'availability_confirmation_status' then
    raw_confirm := lower(btrim(coalesce(listing_data ->> 'availability_confirmation_status', '')));
    next_confirm_status := case
      when raw_confirm in ('manual_confirmation', 'needs_confirmation', 'unconfirmed') then 'needs_confirmation'
      else 'confirmed'
    end;
  else
    next_confirm_status := prop_row.availability_confirmation_status;
  end if;

  if listing_data ? 'calendar_responsible_person' then
    next_cal_person := coalesce(
      nullif(btrim(coalesce(listing_data ->> 'calendar_responsible_person', '')), ''),
      prop_row.calendar_responsible_person
    );
  else
    next_cal_person := prop_row.calendar_responsible_person;
  end if;

  update public.properties
    set title = btrim(listing_data ->> 'title'),
        property_type = btrim(listing_data ->> 'property_type'),
        area = btrim(listing_data ->> 'area'),
        public_address = btrim(listing_data ->> 'public_address'),
        nightly_rate = (listing_data ->> 'nightly_rate')::integer,
        cleaning_fee = (listing_data ->> 'cleaning_fee')::integer,
        mandatory_charges = coalesce(listing_data -> 'mandatory_charges', '[]'::jsonb),
        refundable_deposit = (listing_data ->> 'refundable_deposit')::integer,
        bedrooms = (listing_data ->> 'bedrooms')::integer,
        bathrooms = (listing_data ->> 'bathrooms')::integer,
        capacity = (listing_data ->> 'capacity')::integer,
        bed_setup = btrim(listing_data ->> 'bed_setup'),
        amenities = array(select jsonb_array_elements_text(coalesce(listing_data -> 'amenities', '[]'::jsonb))),
        image_urls = array(select jsonb_array_elements_text(coalesce(listing_data -> 'image_urls', '[]'::jsonb))),
        house_rules = array(select jsonb_array_elements_text(coalesce(listing_data -> 'house_rules', '[]'::jsonb))),
        first_available_date = next_first_avail,
        availability_confirmation_status = next_confirm_status,
        calendar_responsible_person = next_cal_person,
        last_availability_update = now(),
        status = next_status,
        trust_label = next_trust_label,
        verification = jsonb_build_object(
          'ownership', case when coalesce(prop_row.verification ->> 'ownership', '') = 'verified' then 'verified' else 'pending_review' end,
          'identity', case when coalesce(prop_row.verification ->> 'identity', '') = 'verified' then 'verified' else 'pending_review' end,
          'authority', case when coalesce(prop_row.verification ->> 'authority', '') = 'verified' then 'verified' else 'pending_review' end,
          'inspection', case when coalesce(prop_row.verification ->> 'inspection', '') = 'verified' then 'verified' else 'missing' end
        ),
        updated_at = now()
    where id = target_property_id;

  select id, coalesce(record_data -> 'docs', '[]'::jsonb)
    into existing_submission_id, existing_docs
    from public.property_private_records
    where property_id = target_property_id
      and record_type = 'partner_submission'
    order by created_at desc
    limit 1;

  select coalesce(
    jsonb_agg(jsonb_build_object(
      'label', document ->> 'label',
      'status', case
        when exists (
          select 1
          from jsonb_array_elements(existing_docs) as prev(doc)
          where prev.doc ->> 'label' = document ->> 'label'
            and prev.doc ->> 'status' = 'verified'
        ) then 'verified'
        when document ->> 'status' = 'missing' then 'missing'
        else 'self_reported'
      end
    )),
    '[]'::jsonb
  )
  into sanitized_docs
  from jsonb_array_elements(coalesce(submission_data -> 'docs', existing_docs, '[]'::jsonb)) as items(document);

  if existing_submission_id is not null then
    update public.property_private_records
      set record_data = jsonb_build_object(
        'authority_basis', btrim(coalesce(submission_data ->> 'authority_basis', '')),
        'submitted_role', btrim(coalesce(submission_data ->> 'submitted_role', 'Property partner')),
        'docs', sanitized_docs
      )
      where id = existing_submission_id;
  else
    insert into public.property_private_records (property_id, record_type, record_data)
      values (
        target_property_id,
        'partner_submission',
        jsonb_build_object(
          'authority_basis', btrim(coalesce(submission_data ->> 'authority_basis', '')),
          'submitted_role', btrim(coalesce(submission_data ->> 'submitted_role', 'Property partner')),
          'docs', sanitized_docs
        )
      );
  end if;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      'partner',
      case
        when keep_draft then 'property_draft_updated'
        when prop_row.status = 'draft' then 'property_submitted'
        else 'property_resubmitted'
      end,
      btrim(listing_data ->> 'title'),
      coalesce(
        clean_summary,
        case
          when keep_draft then 'Draft listing updated by partner.'
          when prop_row.status = 'draft' then 'Draft listing completed and submitted for HAMLET review.'
          else 'Listing details and authority declarations updated and resubmitted for review.'
        end
      )
    );
end;
$$;

revoke all on function public.update_and_resubmit_partner_property(text, jsonb, jsonb, text) from public, anon;
grant execute on function public.update_and_resubmit_partner_property(text, jsonb, jsonb, text) to authenticated, service_role;

-- ─── 2. Partner Application Resubmission (0-Property Agent Roles + Referral) ──

create or replace function public.resubmit_partner_application(
  target_application_id uuid,
  application_data jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  app_row public.partner_applications%rowtype;
  clean_name text;
  clean_phone text;
  clean_company text;
  clean_role text;
  clean_motivation text;
  min_required_count integer := 1;
  next_count integer;
  raw_ref_code text;
  clean_ref_code text;
  resolved_referrer uuid;
begin
  if actor_id is null or not public.has_role('guest') then
    raise exception 'Sign in with your applicant account to update this partner application.';
  end if;

  if not public.is_account_active() then
    raise exception 'Your account is currently suspended. Contact HAMLET operations.';
  end if;

  if jsonb_typeof(application_data) is distinct from 'object' then
    raise exception 'Partner application payload must be a JSON object.';
  end if;

  select * into app_row
    from public.partner_applications
    where id = target_application_id
      and applicant_id = actor_id
    for update;

  if not found then
    raise exception 'Partner application not found for your account.';
  end if;

  if app_row.status <> 'needs_correction' then
    raise exception 'Only applications awaiting correction can be edited and resubmitted.';
  end if;

  clean_name := btrim(coalesce(application_data ->> 'full_name', ''));
  clean_phone := btrim(coalesce(application_data ->> 'phone', ''));
  clean_company := btrim(coalesce(application_data ->> 'company', ''));
  clean_role := btrim(coalesce(application_data ->> 'role', ''));
  clean_motivation := btrim(coalesce(application_data ->> 'motivation', ''));

  min_required_count := case
    when clean_role in ('Closing Agent', 'Referral Partner') then 0
    else 1
  end;
  next_count := coalesce((application_data ->> 'properties_count')::integer, min_required_count);

  if length(clean_name) < 2
    or length(clean_phone) < 7
    or length(clean_company) < 2
    or length(clean_role) < 2
    or length(clean_motivation) < 20
    or next_count < min_required_count
    or next_count > 500
    or jsonb_typeof(application_data -> 'areas') is distinct from 'array'
    or jsonb_array_length(application_data -> 'areas') < 1 then
    raise exception 'Complete all required partner details, Lagos areas, and portfolio description (min 20 characters).';
  end if;

  if application_data ? 'referred_by_code' or application_data ? 'referral_code' then
    raw_ref_code := coalesce(application_data ->> 'referred_by_code', application_data ->> 'referral_code', '');
    clean_ref_code := nullif(regexp_replace(upper(btrim(raw_ref_code)), '[^A-Z0-9-]', '', 'g'), '');
    if clean_ref_code is not null then
      select p.id into resolved_referrer
        from public.profiles p
        where p.referral_code = clean_ref_code
          and p.id <> actor_id
          and p.role in ('partner', 'admin')
          and p.account_status = 'active'
        limit 1;
      if resolved_referrer is null then
        clean_ref_code := null;
      end if;
    else
      resolved_referrer := null;
    end if;
  else
    clean_ref_code := app_row.referred_by_code;
    resolved_referrer := app_row.referred_by_partner_id;
  end if;

  update public.partner_applications
    set full_name = clean_name,
        phone = clean_phone,
        company = clean_company,
        role = clean_role,
        areas = array(select jsonb_array_elements_text(application_data -> 'areas')),
        properties_count = next_count,
        motivation = clean_motivation,
        referred_by_code = clean_ref_code,
        referred_by_partner_id = resolved_referrer,
        status = 'pending',
        submitted_at = now()
    where id = target_application_id;

  if resolved_referrer is not null and resolved_referrer <> actor_id then
    insert into public.partner_referrals (
      referrer_partner_id,
      referred_partner_id,
      referral_code,
      status,
      registered_at
    )
    values (
      resolved_referrer,
      actor_id,
      clean_ref_code,
      'registered',
      now()
    )
    on conflict (referred_partner_id) do nothing;

    update public.profiles
      set referred_by_partner_id = coalesce(referred_by_partner_id, resolved_referrer),
          referred_by_code = coalesce(referred_by_code, clean_ref_code)
      where id = actor_id;
  end if;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      'guest',
      'partner_application_resubmitted',
      clean_company,
      'Applicant updated details and resubmitted partner application for review.'
    );
end;
$$;

revoke all on function public.resubmit_partner_application(uuid, jsonb) from public, anon;
grant execute on function public.resubmit_partner_application(uuid, jsonb) to authenticated, service_role;

-- ─── 3. FX & Caution-Deposit Enriched Booking Notification Outbox Payload ─────

create or replace function public.enqueue_booking_event_notifications(
  target_booking_id text,
  target_event_type text,
  decision_note text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking_row public.bookings%rowtype;
  property_row public.properties%rowtype;
  guest_name text := 'Guest';
  guest_email text;
  first_image_url text;
  stay_nights integer;
  clean_note text := nullif(btrim(coalesce(decision_note, '')), '');
  base_payload jsonb;
  partner_rec record;
  partner_count integer := 0;
  enqueued_count integer := 0;
  row_inserted integer := 0;
begin
  if target_event_type not in (
    'booking_request_created',
    'booking_availability_confirmed',
    'booking_availability_declined',
    'booking_payment_confirmed',
    'booking_cancelled',
    'booking_expired',
    'booking_refunded'
  ) then
    raise exception 'Unsupported booking notification event type %.', target_event_type;
  end if;

  select * into booking_row
    from public.bookings
    where id = target_booking_id or reference = target_booking_id;

  if not found then
    return 0;
  end if;

  select * into property_row
    from public.properties
    where id = booking_row.property_id;

  select
    coalesce(nullif(btrim(p.full_name), ''), 'Guest'),
    nullif(btrim(coalesce(u.email, '')), '')
    into guest_name, guest_email
    from public.profiles p
    left join auth.users u on u.id = p.id
    where p.id = booking_row.guest_id;

  if property_row.image_urls is not null and coalesce(array_length(property_row.image_urls, 1), 0) > 0 then
    first_image_url := nullif(btrim(coalesce(property_row.image_urls[1], '')), '');
  end if;

  stay_nights := greatest(1, booking_row.check_out - booking_row.check_in);

  base_payload := jsonb_build_object(
    'booking_id', booking_row.id,
    'booking_reference', booking_row.reference,
    'property_id', booking_row.property_id,
    'property_title', coalesce(property_row.title, 'HAMLET Verified Stay'),
    'property_type', coalesce(property_row.property_type, 'Apartment'),
    'property_area', coalesce(property_row.area, 'Lagos'),
    'property_address', coalesce(property_row.public_address, 'Lagos, Nigeria'),
    'property_image_url', first_image_url,
    'guest_name', coalesce(guest_name, 'Guest'),
    'check_in', booking_row.check_in::text,
    'check_out', booking_row.check_out::text,
    'nights', stay_nights,
    'guest_count', booking_row.guest_count,
    'accommodation_subtotal', booking_row.accommodation_subtotal,
    'owner_listed_price_ngn', coalesce(booking_row.owner_listed_price_ngn, booking_row.accommodation_subtotal),
    'domestic_markup_ngn', coalesce(booking_row.domestic_markup_ngn, booking_row.hamlet_guest_fee),
    'mandatory_total', booking_row.mandatory_total,
    'hamlet_guest_fee', booking_row.hamlet_guest_fee,
    'guest_total', booking_row.guest_total,
    'refundable_deposit', booking_row.refundable_deposit,
    'quote_currency', coalesce(booking_row.quote_currency, 'NGN'),
    'currency_pair', coalesce(booking_row.currency_pair, 'NGN/NGN'),
    'exchange_rate_ngn_per_unit', coalesce(booking_row.exchange_rate_ngn_per_unit, 1),
    'quoted_guest_total', coalesce(booking_row.quoted_guest_total, booking_row.guest_total),
    'international_buffer_amount', coalesce(booking_row.international_buffer_amount, 0),
    'international_buffer_ngn_equiv', coalesce(booking_row.international_buffer_ngn_equiv, 0),
    'settlement_total_ngn', coalesce(booking_row.settlement_total_ngn, booking_row.guest_total),
    'status', booking_row.status,
    'payment_deadline', booking_row.payment_deadline,
    'special_requests', nullif(btrim(coalesce(booking_row.special_requests, '')), ''),
    'decision_note', clean_note,
    'cancel_reason', nullif(btrim(coalesce(booking_row.cancel_reason, '')), ''),
    'refund_amount', booking_row.refund_amount
  );

  -- 1. Guest notification (all booking lifecycle events notify the booking guest)
  insert into public.booking_notifications (
    booking_id,
    booking_reference,
    property_id,
    event_type,
    recipient_type,
    recipient_user_id,
    recipient_email,
    delivery_status,
    last_error,
    idempotency_key,
    payload
  )
  values (
    booking_row.id,
    booking_row.reference,
    booking_row.property_id,
    target_event_type,
    'guest',
    booking_row.guest_id,
    guest_email,
    case when guest_email is null then 'failed' else 'pending' end,
    case when guest_email is null then 'Guest account has no email address configured.' else null end,
    booking_row.id || ':' || target_event_type || ':guest',
    base_payload
  )
  on conflict (idempotency_key) do nothing;

  get diagnostics row_inserted = row_count;
  enqueued_count := enqueued_count + row_inserted;

  -- 2. Authorized property partner notification(s)
  if target_event_type in (
    'booking_request_created',
    'booking_payment_confirmed',
    'booking_cancelled',
    'booking_expired',
    'booking_refunded'
  ) then
    for partner_rec in
      select distinct on (lower(btrim(u.email)))
        pa.user_id,
        btrim(u.email) as email,
        coalesce(nullif(btrim(p.full_name), ''), 'Property Partner') as partner_name,
        coalesce(nullif(btrim(pa.access_role), ''), 'Partner') as access_role
      from public.property_access pa
      join public.profiles p on p.id = pa.user_id
      join auth.users u on u.id = pa.user_id
      where pa.property_id = booking_row.property_id
        and pa.status = 'active'
        and p.account_status = 'active'
        and p.role = 'partner'
        and nullif(btrim(coalesce(u.email, '')), '') is not null
      order by lower(btrim(u.email)), pa.granted_at asc
    loop
      partner_count := partner_count + 1;

      insert into public.booking_notifications (
        booking_id,
        booking_reference,
        property_id,
        event_type,
        recipient_type,
        recipient_user_id,
        recipient_email,
        delivery_status,
        idempotency_key,
        payload
      )
      values (
        booking_row.id,
        booking_row.reference,
        booking_row.property_id,
        target_event_type,
        'partner',
        partner_rec.user_id,
        partner_rec.email,
        'pending',
        booking_row.id || ':' || target_event_type || ':partner:' || partner_rec.user_id::text,
        base_payload || jsonb_build_object(
          'partner_name', partner_rec.partner_name,
          'partner_role', partner_rec.access_role
        )
      )
      on conflict (idempotency_key) do nothing;

      get diagnostics row_inserted = row_count;
      enqueued_count := enqueued_count + row_inserted;
    end loop;

    if partner_count = 0 and target_event_type = 'booking_request_created' then
      insert into public.booking_notifications (
        booking_id,
        booking_reference,
        property_id,
        event_type,
        recipient_type,
        recipient_email,
        delivery_status,
        last_error,
        idempotency_key,
        payload
      )
      values (
        booking_row.id,
        booking_row.reference,
        booking_row.property_id,
        target_event_type,
        'partner',
        null,
        'failed',
        'No active authorized property partner email found for property.',
        booking_row.id || ':' || target_event_type || ':partner:unassigned',
        base_payload
      )
      on conflict (idempotency_key) do nothing;

      get diagnostics row_inserted = row_count;
      enqueued_count := enqueued_count + row_inserted;
    end if;
  end if;

  -- 3. HAMLET internal operations notification
  insert into public.booking_notifications (
    booking_id,
    booking_reference,
    property_id,
    event_type,
    recipient_type,
    recipient_email,
    delivery_status,
    idempotency_key,
    payload
  )
  values (
    booking_row.id,
    booking_row.reference,
    booking_row.property_id,
    target_event_type,
    'operations',
    null,
    'pending',
    booking_row.id || ':' || target_event_type || ':operations',
    base_payload
  )
  on conflict (idempotency_key) do nothing;

  get diagnostics row_inserted = row_count;
  enqueued_count := enqueued_count + row_inserted;

  return enqueued_count;
end;
$$;

revoke all on function public.enqueue_booking_event_notifications(text, text, text)
  from public, anon, authenticated;
grant execute on function public.enqueue_booking_event_notifications(text, text, text)
  to service_role;

-- ─── 4. Scoped Partner Attribution & Closing-Agent Summary RPC ────────────────
-- Safely exposes only public business display names for a partner's own direct
-- referrals and non-PII booking commission summaries where closing_agent_id = auth.uid().

create or replace function public.get_my_partner_attribution_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role text;
  referred_arr jsonb := '[]'::jsonb;
  rewards_arr jsonb := '[]'::jsonb;
  closed_arr jsonb := '[]'::jsonb;
begin
  if actor_id is null then
    return jsonb_build_object(
      'referred_partners', '[]'::jsonb,
      'referred_rewards', '[]'::jsonb,
      'closed_bookings', '[]'::jsonb
    );
  end if;

  select p.role into actor_role
    from public.profiles p
    where p.id = actor_id
      and p.account_status = 'active';

  if actor_role not in ('partner', 'admin') then
    return jsonb_build_object(
      'referred_partners', '[]'::jsonb,
      'referred_rewards', '[]'::jsonb,
      'closed_bookings', '[]'::jsonb
    );
  end if;

  select coalesce(
    jsonb_agg(jsonb_build_object(
      'referral_id', pr.id,
      'referred_partner_id', pr.referred_partner_id,
      'referred_name', coalesce(nullif(btrim(prof.full_name), ''), 'Referred partner'),
      'referred_company', nullif(btrim(coalesce(prof.company, '')), '')
    )),
    '[]'::jsonb
  )
  into referred_arr
  from public.partner_referrals pr
  left join public.profiles prof on prof.id = pr.referred_partner_id
  where pr.referrer_partner_id = actor_id;

  select coalesce(
    jsonb_agg(jsonb_build_object(
      'reward_id', rw.id,
      'referred_agent_name', coalesce(nullif(btrim(prof.full_name), ''), 'Closing agent')
    )),
    '[]'::jsonb
  )
  into rewards_arr
  from public.partner_referral_rewards rw
  left join public.profiles prof on prof.id = rw.referred_closing_agent_id
  where rw.referrer_partner_id = actor_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'booking_id', b.id,
        'booking_reference', b.reference,
        'property_id', b.property_id,
        'property_title', coalesce(prop.title, 'Stay'),
        'area', coalesce(prop.area, ''),
        'check_in', b.check_in::text,
        'check_out', b.check_out::text,
        'nights', greatest(1, b.check_out - b.check_in),
        'status', b.status,
        'owner_listed_price_ngn', coalesce(b.owner_listed_price_ngn, b.accommodation_subtotal),
        'closing_agent_commission_ngn', coalesce(b.closing_agent_commission_ngn, 0),
        'created_at', b.created_at
      )
      order by b.created_at desc
    ),
    '[]'::jsonb
  )
  into closed_arr
  from public.bookings b
  left join public.properties prop on prop.id = b.property_id
  where b.closing_agent_id = actor_id;

  return jsonb_build_object(
    'referred_partners', referred_arr,
    'referred_rewards', rewards_arr,
    'closed_bookings', closed_arr
  );
end;
$$;

revoke all on function public.get_my_partner_attribution_summary() from public, anon;
grant execute on function public.get_my_partner_attribution_summary() to authenticated, service_role;
