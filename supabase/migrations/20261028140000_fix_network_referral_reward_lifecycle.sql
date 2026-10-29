-- Safety correction for multi-capability partner referral rewards.
-- Do not mutate booking allocations when a booking is merely requested.
-- Rewards are written only during the qualifying transition to completed.

drop trigger if exists apply_network_partner_referral_reward on public.bookings;
drop function if exists public.apply_network_partner_referral_reward();

create or replace function public.complete_network_partner_referral_reward()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  listing_row public.properties%rowtype;
  generator_id uuid;
  referral_row public.partner_referrals%rowtype;
  reward integer := 0;
  prior_reward integer := 0;
  available_allocation integer := 0;
  new_allocation integer := 0;
  reward_inserted boolean := false;
begin
  if new.status <> 'completed' or old.status = 'completed' then
    return new;
  end if;

  -- Closing-agent referral rewards are already allocated by transition_booking.
  -- Restrict this fallback trigger to bookings without a closing-agent attribution.
  if new.closing_agent_id is not null then
    return new;
  end if;

  -- The existing booking lifecycle may already have recorded a reward/activation.
  if exists (
    select 1 from public.partner_referral_rewards
    where booking_id = new.id
  ) then
    return new;
  end if;

  select * into listing_row
  from public.properties
  where id = new.property_id;
  if not found then
    return new;
  end if;

  -- Prefer explicit booking attribution, then the manager/introducer stored on
  -- the listing, then the active property-access relationship. Never infer
  -- ownership from guessed JSON column names.
  generator_id := new.closing_agent_id;

  if generator_id is null then
    generator_id := listing_row.authorised_manager_id;
  end if;

  if generator_id is null then
    generator_id := listing_row.property_introducer_id;
  end if;

  if generator_id is null then
    select pa.user_id into generator_id
    from public.property_access pa
    where pa.property_id = new.property_id
      and pa.status = 'active'
      and pa.access_role in ('owner', 'submitter', 'manager', 'authorised_manager', 'property_manager')
      and pa.user_id <> new.guest_id
    order by
      case pa.access_role
        when 'owner' then 1
        when 'manager' then 2
        when 'authorised_manager' then 3
        when 'property_manager' then 4
        when 'submitter' then 5
        else 6
      end,
      pa.granted_at asc
    limit 1;
  end if;

  if generator_id is null or generator_id = new.guest_id then
    return new;
  end if;

  select * into referral_row
  from public.partner_referrals
  where referred_partner_id = generator_id
    and referrer_partner_id <> generator_id
  for update;

  if not found then
    return new;
  end if;

  if not exists (
    select 1 from public.profiles
    where id = generator_id
      and role in ('partner', 'admin')
      and account_status = 'active'
  ) or not exists (
    select 1 from public.profiles
    where id = referral_row.referrer_partner_id
      and role in ('partner', 'admin')
      and account_status = 'active'
  ) then
    return new;
  end if;

  -- First qualifying completed booking activates the referral window but does
  -- not pay a reward. The unique booking_id constraint makes this idempotent.
  if referral_row.status = 'verified' and referral_row.activated_at is null then
    update public.partner_referrals
      set status = 'active',
          activated_at = now(),
          activating_booking_id = new.id,
          eligibility_starts_at = now(),
          eligibility_ends_at = now() + make_interval(days => earning_window_days),
          updated_at = now()
    where id = referral_row.id;

    insert into public.partner_referral_rewards (
      referral_id, referrer_partner_id, referred_closing_agent_id,
      booking_id, booking_reference, owner_listed_price_ngn,
      reward_rate, reward_amount_ngn, payout_status
    )
    values (
      referral_row.id, referral_row.referrer_partner_id, generator_id,
      new.id, new.reference,
      coalesce(new.owner_listed_price_ngn, new.accommodation_subtotal, 0),
      0, 0, 'activated_no_payout'
    )
    on conflict (booking_id) do nothing;
    return new;
  end if;

  if referral_row.status <> 'active'
    or referral_row.eligibility_starts_at is null
    or referral_row.eligibility_starts_at > now()
    or referral_row.eligibility_ends_at is null
    or referral_row.eligibility_ends_at <= now() then
    return new;
  end if;

  -- The legacy closing-agent transition may already have assigned the reward.
  -- Reuse that value only if it belongs to this referrer; otherwise calculate
  -- at completion and update the booking allocation in the same transaction.
  if new.direct_referrer_id = referral_row.referrer_partner_id then
    reward := coalesce(new.direct_referrer_reward_ngn, 0);
  else
    reward := public.multiply_ngn_bps(
      coalesce(new.owner_listed_price_ngn, new.accommodation_subtotal, 0),
      250
    );
  end if;

  if reward <= 0 then
    return new;
  end if;

  prior_reward := coalesce(new.direct_referrer_reward_ngn, 0);
  available_allocation := coalesce(new.hamlet_allocation_ngn, 0) + prior_reward;
  if reward > available_allocation then
    -- Fail closed rather than create an underfunded settlement.
    return new;
  end if;
  new_allocation := available_allocation - reward;

  update public.bookings
    set direct_referrer_id = referral_row.referrer_partner_id,
        direct_referrer_reward_ngn = reward,
        hamlet_allocation_ngn = new_allocation
    where id = new.id
      and (
        direct_referrer_id is distinct from referral_row.referrer_partner_id
        or coalesce(direct_referrer_reward_ngn, 0) <> reward
        or coalesce(hamlet_allocation_ngn, 0) <> new_allocation
      );

  insert into public.partner_referral_rewards (
    referral_id, referrer_partner_id, referred_closing_agent_id,
    booking_id, booking_reference, owner_listed_price_ngn,
    reward_rate, reward_amount_ngn, payout_status
  )
  values (
    referral_row.id, referral_row.referrer_partner_id, generator_id,
    new.id, new.reference,
    coalesce(new.owner_listed_price_ngn, new.accommodation_subtotal, 0),
    0.0250, reward, 'pending'
  )
  on conflict (booking_id) do nothing
  returning true into reward_inserted;

  if coalesce(reward_inserted, false) then
    insert into public.booking_payment_records (
      booking_id, record_type, amount, provider_reference, status,
      description, variance, operator_name, beneficiary_user_id, payout_status
    )
    values (
      new.id, 'referral_reward', reward, new.reference || ':network_referral',
      'recorded', 'Partner network referral reward (2.5% of owner-listed accommodation price)',
      0, 'HAMLET system', referral_row.referrer_partner_id, 'pending'
    )
    on conflict (provider_reference, record_type, booking_id)
      where provider_reference is not null
    do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists complete_network_partner_referral_reward on public.bookings;
create trigger complete_network_partner_referral_reward
  after update of status on public.bookings
  for each row execute function public.complete_network_partner_referral_reward();

revoke all on function public.complete_network_partner_referral_reward() from public, anon, authenticated;
grant execute on function public.complete_network_partner_referral_reward() to service_role;
