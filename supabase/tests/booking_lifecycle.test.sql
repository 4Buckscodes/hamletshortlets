begin;

create extension if not exists pgtap with schema extensions;

select plan(19);

insert into auth.users (
  id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,
  email_confirmed_at, created_at, updated_at
) values
  ('10000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'booking-guest@example.test', '',
    '{"provider":"email","providers":["email"]}', '{"full_name":"Booking Guest"}', now(), now(), now()),
  ('10000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'booking-partner@example.test', '',
    '{"provider":"email","providers":["email"]}', '{"full_name":"Booking Partner"}', now(), now(), now()),
  ('10000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'other-partner@example.test', '',
    '{"provider":"email","providers":["email"]}', '{"full_name":"Other Partner"}', now(), now(), now());

update public.profiles set role = 'partner'
where id in ('10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

insert into public.properties (
  id, title, property_type, area, public_address, nightly_rate, capacity, status
) values (
  'booking-lifecycle-test-property', 'Lifecycle Test Property', 'Apartment', 'Yaba',
  'Test address', 100000, 4, 'approved'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

insert into public.bookings (
  id, reference, property_id, guest_id, check_in, check_out, guest_count,
  accommodation_subtotal, hamlet_guest_fee, guest_total
) values
  ('booking-lifecycle-a', 'HML-TEST-A', 'booking-lifecycle-test-property',
    '10000000-0000-4000-8000-000000000001', current_date + 10, current_date + 12, 1, 200000, 6000, 206000),
  ('booking-lifecycle-b', 'HML-TEST-B', 'booking-lifecycle-test-property',
    '10000000-0000-4000-8000-000000000001', current_date + 11, current_date + 13, 1, 200000, 6000, 206000),
  ('booking-lifecycle-c', 'HML-TEST-C', 'booking-lifecycle-test-property',
    '10000000-0000-4000-8000-000000000001', current_date + 20, current_date + 22, 1, 200000, 6000, 206000),
  ('booking-lifecycle-d', 'HML-TEST-D', 'booking-lifecycle-test-property',
    '10000000-0000-4000-8000-000000000001', current_date + 30, current_date + 32, 1, 200000, 6000, 206000);

select is(
  has_function_privilege('authenticated', 'public.transition_booking(text,text,text)', 'EXECUTE'),
  true,
  'Authenticated users can call the guarded transition RPC'
);
select is(
  has_table_privilege('authenticated', 'public.bookings', 'UPDATE'),
  false,
  'Authenticated users cannot directly update bookings'
);
select is(
  has_function_privilege('anon', 'public.transition_booking(text,text,text)', 'EXECUTE'),
  false,
  'Anonymous users cannot call the booking transition RPC'
);
select is(
  has_function_privilege('authenticated', 'public.expire_overdue_bookings()', 'EXECUTE'),
  true,
  'Authenticated users can trigger the expiry sweep'
);
select is(
  has_function_privilege('anon', 'public.expire_overdue_bookings()', 'EXECUTE'),
  false,
  'Anonymous users cannot trigger the expiry sweep'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select lives_ok(
  $$select public.transition_booking('booking-lifecycle-a', 'checking', null)$$,
  'An assigned partner can start an availability check'
);
select lives_ok(
  $$select public.transition_booking('booking-lifecycle-a', 'awaiting_payment', 'Terms checked')$$,
  'An assigned partner can accept the request into awaiting payment'
);
select is(
  (select status from public.bookings where id = 'booking-lifecycle-a'),
  'awaiting_payment',
  'Acceptance does not confirm the booking'
);
select ok(
  (select payment_deadline between now() + interval '47 hours' and now() + interval '49 hours'
   from public.bookings where id = 'booking-lifecycle-a'),
  'Acceptance sets a payment deadline about 48 hours ahead'
);
select throws_ok(
  $$select public.transition_booking('booking-lifecycle-b', 'awaiting_payment', null)$$,
  'P0001',
  'These dates overlap another active booking. Recheck availability before accepting.',
  'An overlapping pending booking cannot also be accepted'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select throws_ok(
  $$select public.transition_booking('booking-lifecycle-d', 'checking', null)$$,
  'P0001',
  'You are not authorised to manage this property booking.',
  'A partner without property access cannot manage its bookings'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select throws_ok(
  $$select public.transition_booking('booking-lifecycle-d', 'awaiting_payment', null)$$,
  'P0001',
  'Guests may only cancel their own open booking requests.',
  'A guest cannot accept their own request'
);
select lives_ok(
  $$select public.transition_booking('booking-lifecycle-d', 'cancelled', 'Guest changed plans')$$,
  'A guest can cancel their own open request'
);
select is(
  (select cancel_reason from public.bookings where id = 'booking-lifecycle-d'),
  'Guest changed plans',
  'Guest cancellation records its reason'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select lives_ok(
  $$select public.transition_booking('booking-lifecycle-c', 'awaiting_payment', null)$$,
  'An assigned partner can accept a non-overlapping request'
);
reset role;

update public.bookings
set payment_deadline = now() - interval '1 minute'
where id = 'booking-lifecycle-c';

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select is(
  public.expire_overdue_bookings(),
  1,
  'The expiry sweep expires overdue payment requests'
);
select is(
  (select status from public.bookings where id = 'booking-lifecycle-c'),
  'expired',
  'An expired payment request releases its booking status'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select throws_ok(
  $$update public.bookings set status = 'confirmed' where id = 'booking-lifecycle-a'$$,
  '42501',
  'permission denied for table bookings',
  'A partner cannot confirm a booking with a direct table update'
);
select is(
  (select status from public.bookings where id = 'booking-lifecycle-a'),
  'awaiting_payment',
  'The booking remains unconfirmed without verified payment'
);

select * from finish();
rollback;
