create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role text not null default 'guest' check (role in ('guest', 'partner', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

create or replace function public.has_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = required_role
  );
$$;

create table public.properties (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  property_type text not null,
  area text not null,
  public_address text not null,
  nightly_rate integer not null check (nightly_rate >= 0),
  cleaning_fee integer not null default 0 check (cleaning_fee >= 0),
  mandatory_charges jsonb not null default '[]'::jsonb,
  refundable_deposit integer not null default 0 check (refundable_deposit >= 0),
  bedrooms integer not null default 0 check (bedrooms >= 0),
  bathrooms integer not null default 0 check (bathrooms >= 0),
  capacity integer not null check (capacity > 0),
  bed_setup text not null default '',
  amenities text[] not null default '{}',
  image_urls text[] not null default '{}',
  house_rules text[] not null default '{}',
  status text not null default 'submitted'
    check (status in ('approved', 'submitted', 'needs_correction', 'rejected', 'suspended')),
  verification jsonb not null default '{}'::jsonb,
  trust_label text not null default 'Under review',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.property_access (
  property_id text not null references public.properties (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  access_role text not null,
  scope text not null default '',
  commission_rate numeric(5, 4) check (commission_rate between 0 and 1),
  commission_note text not null default '',
  status text not null default 'active' check (status in ('active', 'revoked')),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (property_id, user_id)
);

create or replace function public.can_manage_property(target_property_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role('admin')
    or exists (
      select 1
      from public.property_access
      where property_id = target_property_id
        and user_id = (select auth.uid())
        and status = 'active'
    );
$$;

create or replace function public.grant_submitter_property_access()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.property_access (property_id, user_id, access_role, scope)
  values (new.id, (select auth.uid()), 'submitter', 'Submitter — pending review');
  return new;
end;
$$;

create trigger on_property_created
  after insert on public.properties
  for each row execute function public.grant_submitter_property_access();

create table public.property_private_records (
  id uuid primary key default gen_random_uuid(),
  property_id text not null references public.properties (id) on delete cascade,
  record_type text not null,
  record_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.bookings (
  id text primary key default gen_random_uuid()::text,
  reference text not null unique,
  property_id text not null references public.properties (id),
  guest_id uuid not null references public.profiles (id),
  check_in date not null,
  check_out date not null,
  guest_count integer not null check (guest_count > 0),
  accommodation_subtotal integer not null check (accommodation_subtotal >= 0),
  mandatory_charges jsonb not null default '[]'::jsonb,
  mandatory_total integer not null default 0 check (mandatory_total >= 0),
  hamlet_guest_fee integer not null check (hamlet_guest_fee >= 0),
  guest_total integer not null check (guest_total >= 0),
  refundable_deposit integer not null default 0 check (refundable_deposit >= 0),
  status text not null default 'requested'
    check (status in ('requested', 'checking', 'awaiting_payment', 'confirmed', 'completed', 'cancelled', 'expired', 'refunded', 'disputed', 'declined', 'no_show')),
  special_requests text,
  payment_deadline timestamptz,
  payment_provider text,
  payment_reference text,
  refund_status text not null default 'none' check (refund_status in ('none', 'pending_review', 'processed')),
  refund_amount integer check (refund_amount is null or refund_amount >= 0),
  created_at timestamptz not null default now(),
  check (check_out > check_in)
);

create table public.booking_issues (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  booking_id text not null references public.bookings (id),
  reporter_id uuid not null references public.profiles (id),
  category text not null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  subject text not null,
  description text not null,
  status text not null default 'open'
    check (status in ('open', 'assigned', 'investigating', 'escalated', 'resolved', 'closed')),
  assignee_id uuid references public.profiles (id),
  resolution text,
  evidence jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.booking_payment_records (
  id uuid primary key default gen_random_uuid(),
  booking_id text not null references public.bookings (id),
  record_type text not null,
  amount integer not null check (amount >= 0),
  provider_reference text,
  status text not null,
  recorded_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index properties_public_search_idx on public.properties (status, area, nightly_rate);
create index property_access_user_status_idx on public.property_access (user_id, status);
create index bookings_guest_created_idx on public.bookings (guest_id, created_at desc);
create index bookings_property_dates_idx on public.bookings (property_id, check_in, check_out);
create index booking_issues_booking_idx on public.booking_issues (booking_id, created_at desc);
create index booking_payments_booking_idx on public.booking_payment_records (booking_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.property_access enable row level security;
alter table public.property_private_records enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_issues enable row level security;
alter table public.booking_payment_records enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.has_role('admin'));

create policy "Anyone can read approved property listings"
  on public.properties for select
  using (status = 'approved');

create policy "Partners can read properties they manage"
  on public.properties for select to authenticated
  using (public.can_manage_property(id));

create policy "Partners can submit properties for review"
  on public.properties for insert to authenticated
  with check (public.has_role('partner') and status = 'submitted');

create policy "Partners can edit their unapproved submissions"
  on public.properties for update to authenticated
  using (public.can_manage_property(id) and status in ('submitted', 'needs_correction'))
  with check (public.can_manage_property(id) and status in ('submitted', 'needs_correction'));

create policy "Admins can manage property listings"
  on public.properties for all to authenticated
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

create policy "Users can read their property access"
  on public.property_access for select to authenticated
  using (user_id = (select auth.uid()) or public.has_role('admin'));

create policy "Admins can manage property access"
  on public.property_access for all to authenticated
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

create policy "Property managers and admins can read private property records"
  on public.property_private_records for select to authenticated
  using (public.can_manage_property(property_id));

create policy "Admins can manage private property records"
  on public.property_private_records for all to authenticated
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

create policy "Guests and property managers can read bookings"
  on public.bookings for select to authenticated
  using (guest_id = (select auth.uid()) or public.can_manage_property(property_id));

create policy "Guests can request approved properties"
  on public.bookings for insert to authenticated
  with check (
    guest_id = (select auth.uid())
    and status = 'requested'
    and exists (
      select 1 from public.properties
      where id = property_id and status = 'approved'
    )
  );

create policy "Property managers and admins can update bookings"
  on public.bookings for update to authenticated
  using (public.can_manage_property(property_id))
  with check (public.can_manage_property(property_id));

create policy "Guests and property managers can read booking issues"
  on public.booking_issues for select to authenticated
  using (
    reporter_id = (select auth.uid())
    or exists (
      select 1 from public.bookings
      where id = booking_id and public.can_manage_property(property_id)
    )
  );

create policy "Guests can report issues on their bookings"
  on public.booking_issues for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and exists (
      select 1 from public.bookings
      where id = booking_id and guest_id = (select auth.uid())
    )
  );

create policy "Property managers and admins can update booking issues"
  on public.booking_issues for update to authenticated
  using (
    public.has_role('admin')
    or exists (
      select 1 from public.bookings
      where id = booking_id and public.can_manage_property(property_id)
    )
  )
  with check (
    public.has_role('admin')
    or exists (
      select 1 from public.bookings
      where id = booking_id and public.can_manage_property(property_id)
    )
  );

create policy "Booking parties can read payment records"
  on public.booking_payment_records for select to authenticated
  using (
    public.has_role('admin')
    or exists (
      select 1 from public.bookings
      where id = booking_id
        and (guest_id = (select auth.uid()) or public.can_manage_property(property_id))
    )
  );

create policy "Admins can manage payment records"
  on public.booking_payment_records for all to authenticated
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

grant select on public.profiles, public.properties, public.property_access,
  public.property_private_records, public.bookings, public.booking_issues,
  public.booking_payment_records to anon, authenticated;
grant insert, update on public.properties, public.bookings, public.booking_issues to authenticated;
grant insert, update, delete on public.property_access, public.property_private_records,
  public.booking_payment_records to authenticated;
