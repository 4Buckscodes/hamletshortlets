-- Hold partner payouts until the partner's identity is verified.
--
-- Product rule (2026-11-20): joining the partner network is enough to earn
-- (20261120035547), but a partner payout line may only become payout-eligible
-- ('approved') or 'paid' once the beneficiary is identity-verified. Earnings stay
-- 'pending' until then.
--
-- Verified = active account and an approved partner application (approving an
-- application is HAMLET's identity check and also sets profiles.role = 'partner'),
-- or an administrator. Ledger lines without a beneficiary_user_id (HAMLET's own
-- revenue lines) are not affected.
--
--   is_partner_payout_verified(uuid)       The single definition of "verified".
--   hold_unverified_partner_payout         BEFORE INSERT/UPDATE trigger on
--                                          booking_payment_records: an unverified
--                                          beneficiary's line cannot move to
--                                          approved/paid; it keeps its previous
--                                          status (pending). This covers the
--                                          automatic approval on stay completion.
--   update_payout_status(...)              Admins get a clear error instead of a
--                                          silent hold.
--   release_verified_partner_payouts       When an application is approved, the
--                                          partner's held closing-agent commissions
--                                          on completed stays are released to
--                                          'approved', as completion would have done.
--                                          Referral rewards and manual partner
--                                          commissions keep their admin approval step.

create or replace function public.is_partner_payout_verified(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = target_user_id
      and p.account_status = 'active'
      and (
        p.role = 'admin'
        or exists (
          select 1 from public.partner_applications a
          where a.applicant_id = p.id and a.status = 'approved'
        )
      )
  );
$$;

revoke all on function public.is_partner_payout_verified(uuid) from public, anon;
grant execute on function public.is_partner_payout_verified(uuid) to authenticated, service_role;

create or replace function public.hold_unverified_partner_payout()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.beneficiary_user_id is null
    or new.payout_status not in ('approved', 'paid')
    or (tg_op = 'UPDATE' and new.payout_status is not distinct from old.payout_status) then
    return new;
  end if;

  if public.is_partner_payout_verified(new.beneficiary_user_id) then
    return new;
  end if;

  new.payout_status := case when tg_op = 'UPDATE' then old.payout_status else 'pending' end;
  return new;
end;
$$;

revoke all on function public.hold_unverified_partner_payout() from public, anon, authenticated;
grant execute on function public.hold_unverified_partner_payout() to service_role;

drop trigger if exists hold_unverified_partner_payout on public.booking_payment_records;
create trigger hold_unverified_partner_payout
  before insert or update of payout_status on public.booking_payment_records
  for each row execute function public.hold_unverified_partner_payout();

create or replace function public.update_payout_status(
  target_entry_id uuid,
  next_payout_status text,
  payout_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  entry_row public.booking_payment_records%rowtype;
  clean_note text := nullif(btrim(coalesce(payout_note, '')), '');
begin
  if actor_id is null or not public.has_role('admin') or not public.is_account_active() then
    raise exception 'Only active administrators can update payout statuses.';
  end if;

  if next_payout_status not in ('pending', 'approved', 'paid', 'reversed', 'withheld') then
    raise exception 'Unsupported payout status %.', next_payout_status;
  end if;

  select * into entry_row
    from public.booking_payment_records
    where id = target_entry_id
    for update;

  if not found then
    raise exception 'Ledger entry not found.';
  end if;

  if next_payout_status in ('approved', 'paid')
    and entry_row.beneficiary_user_id is not null
    and not public.is_partner_payout_verified(entry_row.beneficiary_user_id) then
    raise exception 'Complete HAMLET identity verification for this partner before approving or paying this payout.';
  end if;

  update public.booking_payment_records
    set payout_status = next_payout_status,
        status = case when next_payout_status = 'paid' then 'settled' else status end,
        note = coalesce(clean_note, note),
        updated_at = now()
    where id = target_entry_id;

  if entry_row.record_type = 'referral_reward' then
    update public.partner_referral_rewards
      set payout_status = next_payout_status,
          updated_at = now()
      where booking_id = entry_row.booking_id;
  end if;

  insert into public.admin_audit_log (actor_id, actor_role, action, target, detail)
    values (
      actor_id,
      'admin',
      'payout_' || next_payout_status,
      entry_row.booking_id,
      entry_row.record_type || ' (' || entry_row.amount || ' NGN) payout → ' || next_payout_status
        || case when clean_note is null then '' else ': ' || clean_note end
    );
end;
$$;

revoke all on function public.update_payout_status(uuid, text, text) from public, anon;
grant execute on function public.update_payout_status(uuid, text, text) to authenticated;

create or replace function public.release_verified_partner_payouts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    update public.booking_payment_records r
      set payout_status = 'approved',
          updated_at = now()
      from public.bookings b
      where b.id = r.booking_id
        and b.status = 'completed'
        and r.beneficiary_user_id = new.applicant_id
        and r.record_type = 'closing_agent_commission'
        and r.payout_status = 'pending';
  end if;
  return new;
end;
$$;

revoke all on function public.release_verified_partner_payouts() from public, anon, authenticated;
grant execute on function public.release_verified_partner_payouts() to service_role;

drop trigger if exists release_verified_partner_payouts on public.partner_applications;
create trigger release_verified_partner_payouts
  after update of status on public.partner_applications
  for each row execute function public.release_verified_partner_payouts();

notify pgrst, 'reload schema';
