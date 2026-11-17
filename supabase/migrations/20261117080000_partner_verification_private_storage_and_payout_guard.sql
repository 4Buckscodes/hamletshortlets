-- Private evidence storage and database-wide payout readiness enforcement.
-- This migration is intentionally additive and does not touch production until applied.

do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'partner-verification-documents',
      'partner-verification-documents',
      false,
      10485760,
      array['application/pdf','image/jpeg','image/png','image/webp']::text[]
    )
    on conflict (id) do update
      set public = false,
          file_size_limit = excluded.file_size_limit,
          allowed_mime_types = excluded.allowed_mime_types;
  end if;

  if to_regclass('storage.objects') is not null then
    execute 'drop policy if exists "Partners upload own verification documents" on storage.objects';
    execute 'drop policy if exists "Partners and admins read verification documents" on storage.objects';
    execute 'drop policy if exists "Partners update own verification documents" on storage.objects';
    execute 'drop policy if exists "Partners delete own verification documents" on storage.objects';

    execute $policy$
      create policy "Partners upload own verification documents"
      on storage.objects for insert to authenticated
      with check (
        bucket_id = 'partner-verification-documents'
        and public.is_account_active()
        and exists (
          select 1 from public.partner_network_memberships m
          where m.user_id = (select auth.uid()) and m.status = 'active'
        )
        and (storage.foldername(name))[1] = (select auth.uid())::text
      )
    $policy$;

    execute $policy$
      create policy "Partners and admins read verification documents"
      on storage.objects for select to authenticated
      using (
        bucket_id = 'partner-verification-documents'
        and (
          public.has_role('admin')
          or (
            public.is_account_active()
            and (storage.foldername(name))[1] = (select auth.uid())::text
            and exists (
              select 1 from public.partner_network_memberships m
              where m.user_id = (select auth.uid()) and m.status = 'active'
            )
          )
        )
      )
    $policy$;

    execute $policy$
      create policy "Partners update own verification documents"
      on storage.objects for update to authenticated
      using (
        bucket_id = 'partner-verification-documents'
        and public.is_account_active()
        and (storage.foldername(name))[1] = (select auth.uid())::text
        and exists (
          select 1 from public.partner_network_memberships m
          where m.user_id = (select auth.uid()) and m.status = 'active'
        )
      )
      with check (
        bucket_id = 'partner-verification-documents'
        and public.is_account_active()
        and (storage.foldername(name))[1] = (select auth.uid())::text
        and exists (
          select 1 from public.partner_network_memberships m
          where m.user_id = (select auth.uid()) and m.status = 'active'
        )
      )
    $policy$;

    execute $policy$
      create policy "Partners delete own verification documents"
      on storage.objects for delete to authenticated
      using (
        bucket_id = 'partner-verification-documents'
        and public.is_account_active()
        and (storage.foldername(name))[1] = (select auth.uid())::text
        and exists (
          select 1 from public.partner_network_memberships m
          where m.user_id = (select auth.uid()) and m.status = 'active'
        )
        and not exists (
          select 1 from public.partner_payout_verifications v
          where v.partner_id = (select auth.uid())
            and (
              v.identity_document_path = name
              or v.signed_agreement_path = name
            )
        )
      )
    $policy$;
  end if;
end
$$;

-- A database trigger protects every ledger writer, not only the admin RPC.
-- This covers booking transitions, webhook/service-role writes and future workers
-- whenever they attempt to approve or mark a partner-beneficiary ledger item paid.
create or replace function public.enforce_partner_payout_readiness()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  partner_beneficiary boolean := false;
  ready boolean := false;
  property_ref text;
begin
  if new.payout_status not in ('approved','paid') then
    return new;
  end if;

  if new.beneficiary_user_id is null then
    if new.record_type in ('closing_agent_commission','partner_commission','referral_reward') then
      raise exception 'Partner commission/referral payout cannot be approved without a beneficiary account.';
    end if;
    return new;
  end if;

  select (
    p.role = 'partner'
    or exists (
      select 1 from public.partner_network_memberships m
      where m.user_id = p.id
    )
    or exists (
      select 1 from public.partner_applications a
      where a.applicant_id = p.id
    )
  ) into partner_beneficiary
  from public.profiles p
  where p.id = new.beneficiary_user_id;

  if not coalesce(partner_beneficiary,false) then
    return new;
  end if;

  select b.property_id into property_ref
  from public.bookings b
  where b.id = new.booking_id;

  select exists (
    select 1
    from public.partner_network_memberships m
    join public.profiles p on p.id = m.user_id
    join public.partner_payout_verifications v on v.partner_id = m.user_id
    join public.properties pr on pr.id = property_ref
    left join public.property_access pa
      on pa.property_id = pr.id
      and pa.user_id = m.user_id
      and pa.status = 'active'
    where m.user_id = new.beneficiary_user_id
      and m.status = 'active'
      and p.account_status = 'active'
      and v.identity_status = 'verified'
      and v.bank_status = 'verified'
      and v.agreement_status = 'verified'
      and (new.record_type = 'referral_reward' or pa.user_id is not null)
      and pr.status = 'approved'
      and pr.verification->>'ownership' = 'verified'
      and pr.verification->>'identity' = 'verified'
      and pr.verification->>'authority' = 'verified'
      and pr.verification->>'inspection' = 'verified'
  ) into ready;

  if not ready then
    raise exception 'Partner payout blocked: identity, bank beneficiary and signed agreement must be verified, and the property must have verified ownership, authority and inspection.';
  end if;

  return new;
end;
$$;

drop trigger if exists booking_payment_partner_payout_readiness on public.booking_payment_records;
create trigger booking_payment_partner_payout_readiness
before insert or update of payout_status, beneficiary_user_id, booking_id
on public.booking_payment_records
for each row execute function public.enforce_partner_payout_readiness();

revoke all on function public.enforce_partner_payout_readiness() from public, anon, authenticated;
