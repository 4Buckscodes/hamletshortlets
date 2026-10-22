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
