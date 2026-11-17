-- HAMLET partner payout verification: registration and listing intake remain instant.
-- Only the payout path is gated by identity, bank-beneficiary and agreement checks.
create table if not exists public.partner_payout_verifications (
  partner_id uuid primary key references public.profiles(id) on delete cascade,
  identity_status text not null default 'not_submitted'
    check (identity_status in ('not_submitted','pending','verified','rejected')),
  bank_status text not null default 'not_submitted'
    check (bank_status in ('not_submitted','pending','verified','rejected')),
  agreement_status text not null default 'not_submitted'
    check (agreement_status in ('not_submitted','pending','verified','rejected')),
  identity_document_path text,
  bank_name text,
  bank_code text,
  beneficiary_name text,
  account_number_last4 text check (account_number_last4 is null or account_number_last4 ~ '^[0-9]{4}$'),
  bank_verification_reference text,
  signed_agreement_path text,
  agreement_version text,
  identity_reviewed_at timestamptz,
  bank_reviewed_at timestamptz,
  agreement_reviewed_at timestamptz,
  review_note text,
  reviewed_by uuid references public.profiles(id),
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  check (bank_status <> 'verified' or (
    bank_name is not null and bank_code is not null and beneficiary_name is not null
    and account_number_last4 is not null and bank_verification_reference is not null
  )),
  check (identity_status <> 'verified' or identity_document_path is not null),
  check (agreement_status <> 'verified' or (
    signed_agreement_path is not null and agreement_version is not null
  ))
);

alter table public.partner_payout_verifications enable row level security;
revoke all on public.partner_payout_verifications from public, anon, authenticated;
grant select on public.partner_payout_verifications to authenticated;

drop policy if exists "Partners can read own payout verification" on public.partner_payout_verifications;
create policy "Partners can read own payout verification"
  on public.partner_payout_verifications for select to authenticated
  using (partner_id = (select auth.uid()) or public.has_role('admin'));

-- Partners may submit/update their own payout details only through this RPC.
create or replace function public.submit_partner_payout_verification(
  identity_doc_path text,
  payout_bank_name text,
  payout_bank_code text,
  payout_beneficiary_name text,
  payout_account_last4 text,
  signed_agreement_doc_path text,
  signed_agreement_version text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
begin
  if actor_id is null or not public.is_account_active()
    or not exists (
      select 1 from public.partner_network_memberships m
      where m.user_id = actor_id and m.status = 'active'
    ) then
    raise exception 'An active HAMLET partner account is required.';
  end if;

  if length(btrim(coalesce(identity_doc_path,''))) < 5
    or split_part(btrim(identity_doc_path), '/', 1) <> actor_id::text
    or length(btrim(coalesce(signed_agreement_doc_path,''))) < 5
    or split_part(btrim(signed_agreement_doc_path), '/', 1) <> actor_id::text
    or length(btrim(coalesce(payout_bank_name,''))) < 2
    or length(btrim(coalesce(payout_bank_code,''))) < 2
    or length(btrim(coalesce(payout_beneficiary_name,''))) < 2
    or coalesce(payout_account_last4,'') !~ '^[0-9]{4}$'
    or length(btrim(coalesce(signed_agreement_doc_path,''))) < 5
    or length(btrim(coalesce(signed_agreement_version,''))) < 1 then
    raise exception 'Submit the identity document, bank beneficiary details and signed agreement.';
  end if;

  insert into public.partner_payout_verifications (
    partner_id, identity_status, bank_status, agreement_status,
    identity_document_path, bank_name, bank_code, beneficiary_name,
    account_number_last4, signed_agreement_path, agreement_version,
    submitted_at, updated_at
  ) values (
    actor_id, 'pending', 'pending', 'pending',
    btrim(identity_doc_path), btrim(payout_bank_name), btrim(payout_bank_code),
    btrim(payout_beneficiary_name), payout_account_last4,
    btrim(signed_agreement_doc_path), btrim(signed_agreement_version),
    now(), now()
  )
  on conflict (partner_id) do update set
    identity_status = case when
      partner_payout_verifications.identity_document_path is distinct from excluded.identity_document_path
      then 'pending' else partner_payout_verifications.identity_status end,
    bank_status = case when
      (partner_payout_verifications.bank_name, partner_payout_verifications.bank_code,
       partner_payout_verifications.beneficiary_name, partner_payout_verifications.account_number_last4)
      is distinct from
      (excluded.bank_name, excluded.bank_code, excluded.beneficiary_name, excluded.account_number_last4)
      then 'pending' else partner_payout_verifications.bank_status end,
    agreement_status = case when
      (partner_payout_verifications.signed_agreement_path, partner_payout_verifications.agreement_version)
      is distinct from (excluded.signed_agreement_path, excluded.agreement_version)
      then 'pending' else partner_payout_verifications.agreement_status end,
    identity_document_path = excluded.identity_document_path,
    bank_name = excluded.bank_name,
    bank_code = excluded.bank_code,
    beneficiary_name = excluded.beneficiary_name,
    account_number_last4 = excluded.account_number_last4,
    signed_agreement_path = excluded.signed_agreement_path,
    agreement_version = excluded.agreement_version,
    submitted_at = now(),
    updated_at = now();
end;
$$;

revoke all on function public.submit_partner_payout_verification(text,text,text,text,text,text,text) from public, anon;
grant execute on function public.submit_partner_payout_verification(text,text,text,text,text,text,text) to authenticated;

-- Only active administrators can change verification outcomes. Evidence references
-- are retained for audit; no full bank account number is stored in this table.
create or replace function public.review_partner_payout_verification(
  target_partner_id uuid,
  next_identity_status text,
  next_bank_status text,
  next_agreement_status text,
  bank_reference text default null,
  admin_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_row public.partner_payout_verifications%rowtype;
  actor_id uuid := (select auth.uid());
begin
  if actor_id is null or not public.has_role('admin') or not public.is_account_active() then
    raise exception 'Only active administrators can review payout verification.';
  end if;
  if next_identity_status not in ('pending','verified','rejected')
    or next_bank_status not in ('pending','verified','rejected')
    or next_agreement_status not in ('pending','verified','rejected') then
    raise exception 'Unsupported payout verification outcome.';
  end if;

  select * into current_row from public.partner_payout_verifications
    where partner_id = target_partner_id for update;
  if not found then raise exception 'Payout verification submission not found.'; end if;

  if next_identity_status = 'verified' and current_row.identity_document_path is null then
    raise exception 'An identity document must be submitted before verification.';
  end if;
  if next_bank_status = 'verified' and (
    current_row.bank_name is null or current_row.bank_code is null
    or current_row.beneficiary_name is null or current_row.account_number_last4 is null
    or length(btrim(coalesce(bank_reference,''))) < 3
  ) then
    raise exception 'Bank beneficiary details and a bank verification reference are required.';
  end if;
  if next_agreement_status = 'verified' and (
    current_row.signed_agreement_path is null or current_row.agreement_version is null
  ) then
    raise exception 'A signed partner agreement must be submitted before verification.';
  end if;

  update public.partner_payout_verifications set
    identity_status = next_identity_status,
    bank_status = next_bank_status,
    agreement_status = next_agreement_status,
    bank_verification_reference = case when next_bank_status = 'verified'
      then btrim(bank_reference) else bank_verification_reference end,
    identity_reviewed_at = case when next_identity_status in ('verified','rejected') then now() else identity_reviewed_at end,
    bank_reviewed_at = case when next_bank_status in ('verified','rejected') then now() else bank_reviewed_at end,
    agreement_reviewed_at = case when next_agreement_status in ('verified','rejected') then now() else agreement_reviewed_at end,
    review_note = nullif(btrim(coalesce(admin_note,'')),''),
    reviewed_by = actor_id,
    updated_at = now()
  where partner_id = target_partner_id;

  insert into public.admin_audit_log(actor_id, actor_role, action, target, detail)
  values (actor_id, 'admin', 'partner_payout_verification_reviewed', target_partner_id::text,
    'identity='||next_identity_status||'; bank='||next_bank_status||'; agreement='||next_agreement_status);
end;
$$;

revoke all on function public.review_partner_payout_verification(uuid,text,text,text,text,text) from public, anon;
grant execute on function public.review_partner_payout_verification(uuid,text,text,text,text,text) to authenticated;

-- Replace payout status RPC so a partner cannot be paid based only on an approved
-- partner application. The associated property must also be approved and verified.
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
  booking_property_id text;
  partner_payee boolean := false;
  payout_ready boolean := false;
  clean_note text := nullif(btrim(coalesce(payout_note, '')), '');
begin
  if actor_id is null or not public.has_role('admin') or not public.is_account_active() then
    raise exception 'Only active administrators can update payout statuses.';
  end if;
  if next_payout_status not in ('pending','approved','paid','reversed','withheld') then
    raise exception 'Unsupported payout status %.', next_payout_status;
  end if;

  select * into entry_row from public.booking_payment_records
    where id = target_entry_id for update;
  if not found then raise exception 'Ledger entry not found.'; end if;

  if next_payout_status in ('approved','paid') and entry_row.beneficiary_user_id is not null then
    select (
      p.role = 'partner'
      or exists (select 1 from public.partner_network_memberships m where m.user_id=p.id)
      or exists (select 1 from public.partner_applications a where a.applicant_id=p.id)
    ) into partner_payee
    from public.profiles p where p.id = entry_row.beneficiary_user_id;

    if coalesce(partner_payee,false) then
      select b.property_id into booking_property_id
        from public.bookings b where b.id = entry_row.booking_id;

      select exists (
        select 1
        from public.partner_network_memberships m
        join public.profiles p on p.id=m.user_id
        join public.partner_payout_verifications v on v.partner_id=m.user_id
        join public.properties pr on pr.id=booking_property_id
        join public.property_access pa on pa.property_id=pr.id and pa.user_id=m.user_id and pa.status='active'
        where m.user_id=entry_row.beneficiary_user_id
          and m.status='active' and p.account_status='active'
          and v.identity_status='verified'
          and v.bank_status='verified'
          and v.agreement_status='verified'
          and pr.status='approved'
          and pr.verification->>'ownership'='verified'
          and pr.verification->>'authority'='verified'
          and pr.verification->>'inspection'='verified'
      ) into payout_ready;

      if not payout_ready then
        raise exception 'Partner payout blocked: verify identity, bank beneficiary and signed agreement, and confirm the associated property has verified ownership, listing authority and inspection.';
      end if;
    end if;
  end if;

  update public.booking_payment_records
    set payout_status=next_payout_status,
        status=case when next_payout_status='paid' then 'settled' else status end,
        note=coalesce(clean_note,note), updated_at=now()
    where id=target_entry_id;

  if entry_row.record_type='referral_reward' then
    update public.partner_referral_rewards
      set payout_status=next_payout_status, updated_at=now()
      where booking_id=entry_row.booking_id;
  end if;

  insert into public.admin_audit_log(actor_id,actor_role,action,target,detail)
  values(actor_id,'admin','payout_'||next_payout_status,entry_row.booking_id,
    entry_row.record_type||' ('||entry_row.amount||' NGN) payout → '||next_payout_status
    ||case when clean_note is null then '' else ': '||clean_note end);
end;
$$;

revoke all on function public.update_payout_status(uuid,text,text) from public, anon;
grant execute on function public.update_payout_status(uuid,text,text) to authenticated;
