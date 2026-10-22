alter table public.profiles
  add column if not exists phone text,
  add column if not exists company text,
  add column if not exists partner_role text;

alter table public.bookings
  add column if not exists timeline jsonb not null default '[]'::jsonb;

create table if not exists public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.profiles (id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text not null,
  company text not null,
  role text not null,
  areas text[] not null default '{}',
  properties_count integer not null default 1 check (properties_count > 0),
  motivation text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'needs_correction', 'rejected')),
  review_note text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id)
);

create index if not exists partner_applications_status_created_idx
  on public.partner_applications (status, submitted_at desc);

alter table public.partner_applications enable row level security;

create policy "Applicants can create their own application"
  on public.partner_applications for insert to authenticated
  with check (applicant_id = (select auth.uid()));

create policy "Applicants and admins can read applications"
  on public.partner_applications for select to authenticated
  using (applicant_id = (select auth.uid()) or public.has_role('admin'));

create policy "Admins can review partner applications"
  on public.partner_applications for update to authenticated
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

grant select, insert, update on public.partner_applications to authenticated;

create or replace function public.enforce_booking_request_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  listing public.properties%rowtype;
  stay_nights integer;
  charges jsonb;
  charges_total integer;
  accommodation_total integer;
  guest_fee integer;
begin
  if (select auth.uid()) is null
    or new.guest_id <> (select auth.uid())
    or not public.has_role('guest') then
    raise exception 'A booking must belong to the signed-in guest.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.property_id, 0));

  select * into listing
  from public.properties
  where id = new.property_id and status = 'approved';

  if not found then
    raise exception 'This stay is not available for booking requests.';
  end if;

  if new.guest_count > listing.capacity then
    raise exception 'Guest count exceeds this property capacity.';
  end if;

  stay_nights := new.check_out - new.check_in;
  if stay_nights < 1 or stay_nights > 60 then
    raise exception 'Stay dates must be between 1 and 60 nights.';
  end if;

  if new.check_in < current_date then
    raise exception 'Check-in cannot be in the past.';
  end if;

  if exists (
    select 1 from public.bookings existing
    where existing.property_id = new.property_id
      and existing.status in ('confirmed', 'awaiting_payment')
      and existing.check_in < new.check_out
      and existing.check_out > new.check_in
  ) then
    raise exception 'Those dates conflict with an existing booking.';
  end if;

  charges := coalesce(listing.mandatory_charges, '[]'::jsonb);
  charges_total := coalesce((
    select sum(greatest(0, round((charge ->> 'amount')::numeric)::integer))
    from jsonb_array_elements(charges) as item(charge)
  ), 0);
  accommodation_total := stay_nights * listing.nightly_rate;
  guest_fee := round(accommodation_total * 0.03);

  new.accommodation_subtotal := accommodation_total;
  new.mandatory_charges := charges;
  new.mandatory_total := charges_total;
  new.hamlet_guest_fee := guest_fee;
  new.guest_total := accommodation_total + charges_total + guest_fee;
  new.refundable_deposit := listing.refundable_deposit;
  new.status := 'requested';
  new.timeline := jsonb_build_array(jsonb_build_object(
    'at', now(),
    'label', 'Booking requested',
    'actor', 'Guest',
    'detail', 'Awaiting availability and terms check'
  ));

  return new;
end;
$$;

drop trigger if exists enforce_booking_request_integrity on public.bookings;
create trigger enforce_booking_request_integrity
  before insert on public.bookings
  for each row execute function public.enforce_booking_request_integrity();

create or replace function public.approve_partner_application()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    update public.profiles
    set role = 'partner',
        full_name = new.full_name,
        phone = new.phone,
        company = new.company,
        partner_role = new.role
    where id = new.applicant_id;
  end if;
  return new;
end;
$$;

drop trigger if exists approve_partner_application on public.partner_applications;
create trigger approve_partner_application
  after update of status on public.partner_applications
  for each row execute function public.approve_partner_application();
