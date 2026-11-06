# HAMLET Competitive Readiness Sprint — Audit, Implementation & Release Plan

**Branch**: `arena/76ad2d71-hamletshortlets` (isolated from `main` @ `4d52ce89ed4a9da057014601ff4c7c216a124935`)  
**Production Impact**: **Zero** — `main`, live `https://hamlet.rest`, and live Supabase (`jopnnevqnwrpldrojmdu`) remain completely untouched until manual review and sign-off.

---

## A. Pre-Implementation Audit Summary

| Capability | Existing State on `main` (`4d52ce8`) | Sprint Outcome |
| --- | --- | --- |
| **1. Agent Deal Board** | `partner_share_links` & `property_access.commission_rate` existed, but no structured Deal Board for owner-published Fixed Agent Payout vs Owner Net Rate deals or mandatory deal acceptance with frozen snapshots. | **Implemented** (`public.agent_deals`, `public.agent_deal_acceptances`, `/partners/deals`, `validateAndComputeAgentDealTerms`). |
| **2. Duplicate Detection & Owner Authorisation** | Exact `(area, public_address, title)` blocking existed; no permanent `HMP-LAG-...` code, no fuzzy/image similarity review queue, no submitter!=owner enforcement for sourcing agents, and no multi-agent owner authorisation lifecycle. | **Implemented** (`hamlet_property_code`, `property_duplicate_flags`, `property_agent_authorisations`, `z0_enforce_submitter_role_separation`, `/partners` & `/admin/properties` drawers). |
| **3. Transparent Financial Breakdown** | `src/lib/pricing.ts` enforced the 20% commercial pool in NGN; needed explicit integer kobo helpers, configurable commercial policy metadata, deal-aware anti-double-pay logic, and immutable `price_breakdown_snapshot` on `bookings`. | **Implemented** (`nairaToKobo`, `multiplyKoboBasisPoints`, `buildTransparentFinancialBreakdown`, `z1_snapshot_booking_financial_and_deal_terms`). |
| **4. Caution Fee & Inspection Tracker** | `booking_caution_deposits` existed; lacked property-level refund/inspection policy fields, structured check-in/check-out checklists with guest acknowledgement, wear-and-tear guard, guest claim response, and `not_applicable` / `refunded` statuses. | **Implemented** (`public.property_inspections`, expanded `booking_caution_deposits`, `/partners`, `/partners/bookings`, `/account/bookings`, `/admin/settlements`). |
| **5. Booking Response & Availability** | Request-to-book lifecycle existed; lacked explicit `booking_mode` (`request_to_book` vs `instant_confirmation`), freshness indicator, >=12h overdue partner warning, and direct guest enquiry replies. | **Implemented** (`computeAvailabilityFreshness`, `computeBookingResponseIndicator`, `confirm_property_availability_now`, `respond_to_property_enquiry`). |
| **6. WhatsApp Sharing & Attribution** | Share Engine (`PR #73`) existed for partner links; extended with deal-specific links (`?ref=hsl_...&deal=HDL-...`), mandatory deal acceptance gate, and guest share strip preserving active attribution. | **Implemented** (`buildAuthorisedDealShareUrl`, `buildDealWhatsAppSummary`, `GuestShareStrip`, `/api/booking-requests` `dealCode`). |
| **7. Structured 7-Check Trust Profile** | 4-pillar JSON verification existed; upgraded to granular 7-check `property_trust_checks` with confidential internal notes, reviewer audit trail, public-safe RPC, and strict prevention of blanket `"Verified"` labels on partial checks. | **Implemented** (`public.property_trust_checks`, `get_public_property_trust_profile`, `admin_review_property_trust_check`, `/stays/[id]`, `/admin/properties`). |

---

## B. Legacy `3%` Fee Audit & Commercial Policy Integrity

- **Active Application & Documentation Scan (`app/`, `src/`, `public/`, `supabase/functions/`, `docs/`)**: **0 operational or copy references** to the retired `3%` fee model exist (continuously enforced by `src/lib/pricing.test.ts`).
- **Historical Deployed Migrations Scan (`supabase/migrations/`)**:
  - `20261022130000_app_workflows.sql` (line 107)
  - `20261023100000_payments_ledger_and_operations.sql` (lines 489, 529)
  - `20261023200000_endpoint_hardening_and_parity.sql` (line 158)
  - All three historical SQL functions were **completely superseded** in `20261024100000_availability_referrals_pricing_fx_settlement.sql` (`v2_20pct_markup_10pct_fx_buffer`) and are preserved untouched as immutable migration history.
- **Unresolved Commercial Decisions Gated Explicitly (`DEFAULT_CONFIGURABLE_COMMERCIAL_POLICY.unresolvedAssumptions`)**:
  1. `payment_gateway_fee_pass_through_policy` (kept disabled; actual gateway fees continue reconciling against the 2.5% internal reserve).
  2. `optional_owner_service_tier_activation` (governed by `APPROVED_OWNER_SERVICES_POLICY_COPY`).
  3. `agent_deal_custom_platform_pool_override` (standard 20% service pool applies on authorised selling price; closing agent receives the owner-agreed deal payout **once** and is never double-paid from both the deal and the 10% closing pool).

---

## C. Database Migration & Rollback Plan

### Migration File
- `supabase/migrations/20261106100000_competitive_readiness_sprint.sql` (100% additive; all UI consumers use `isMissingSchemaObjectError` probes so zero pages break if deployed before or after the SQL migration).

### Verified Complete Restoration Rollback SQL
Restores every pre-existing database function (`public.can_partner_share_property`, `public.can_manage_property`), grant, and constraint (`public.booking_caution_deposits` status check) to its exact pre-sprint definition before dropping sprint-only triggers, functions, policies, tables, and columns:

```sql
begin;
-- 1. Feature 7: Trust profile triggers, RPCs, and table
drop trigger if exists z2_sync_property_trust_checks on public.properties;
drop function if exists public.sync_property_trust_checks_from_property();
drop function if exists public.admin_review_property_trust_check(text, text, text, text, text, text);
drop function if exists public.get_public_property_trust_profile(text);
drop table if exists public.property_trust_checks;

-- 2. Feature 5: Availability confirmation & enquiry reply columns/RPCs
drop function if exists public.respond_to_property_enquiry(uuid, text, text);
drop function if exists public.confirm_property_availability_now(text, text);
alter table public.property_enquiries
  drop column if exists partner_response,
  drop column if exists responded_by,
  drop column if exists responded_at;

-- 3. Feature 4: Caution deposit RPCs, inspections table, added columns, and original status check constraint
drop function if exists public.admin_resolve_caution_deposit_status(text, text, integer, integer, text);
drop function if exists public.respond_to_caution_damage_claim(text, text);
drop function if exists public.submit_caution_damage_claim(text, text, integer, jsonb, boolean);
drop function if exists public.respond_to_property_inspection(uuid, text, text);
drop function if exists public.submit_property_inspection(text, text, text, text, text, text, text, jsonb);
drop function if exists public.update_property_caution_policy(text, integer, text, text);
drop table if exists public.property_inspections;

update public.booking_caution_deposits
  set status = 'refund_completed'
  where status in ('not_applicable', 'refunded');

alter table public.booking_caution_deposits
  drop constraint if exists booking_caution_deposits_status_check;
alter table public.booking_caution_deposits
  add constraint booking_caution_deposits_status_check
  check (status in (
    'due',
    'received',
    'inspection_pending',
    'refund_approved',
    'partially_refunded',
    'disputed',
    'refund_completed'
  ));
alter table public.booking_caution_deposits
  drop column if exists damage_issue_description,
  drop column if exists damage_claimed_amount_ngn,
  drop column if exists excludes_normal_wear_and_tear,
  drop column if exists guest_deduction_response,
  drop column if exists guest_responded_at,
  drop column if exists admin_review_note;

-- 4. Feature 3: Booking financial/deal snapshot trigger, RPC, and added columns
drop trigger if exists z1_snapshot_booking_financial_and_deal_terms on public.bookings;
drop function if exists public.snapshot_booking_financial_and_deal_terms();
drop function if exists public.get_my_agent_deal_earnings();
alter table public.bookings
  drop column if exists deal_code_input,
  drop column if exists price_breakdown_snapshot,
  drop column if exists deal_terms_snapshot,
  drop column if exists agreed_agent_deal_payout_ngn,
  drop column if exists agreed_owner_allocation_ngn,
  drop column if exists agent_deal_acceptance_id,
  drop column if exists agent_deal_id;

-- 5. Restore pre-sprint `public.can_partner_share_property(text, uuid)` BEFORE dropping deal & authorisation tables
create or replace function public.can_partner_share_property(
  target_property_id text,
  target_partner_id uuid default auth.uid()
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  prop_status text;
  prop_allow_sharing boolean;
  partner_role text;
  partner_status text;
  has_active_access boolean := false;
  has_revoked_access boolean := false;
begin
  if target_partner_id is null or target_property_id is null then
    return false;
  end if;

  select p.role, coalesce(p.account_status, 'active')
    into partner_role, partner_status
    from public.profiles p
    where p.id = target_partner_id;

  if not found or partner_role not in ('partner', 'admin') or partner_status <> 'active' then
    return false;
  end if;

  select pr.status, coalesce(pr.allow_partner_sharing, true)
    into prop_status, prop_allow_sharing
    from public.properties pr
    where pr.id = target_property_id;

  if not found or prop_status <> 'approved' then
    return false;
  end if;

  select
    bool_or(pa.status = 'active'),
    bool_or(pa.status = 'revoked')
  into has_active_access, has_revoked_access
  from public.property_access pa
  where pa.property_id = target_property_id
    and pa.user_id = target_partner_id;

  if coalesce(has_revoked_access, false) and not coalesce(has_active_access, false) then
    return false;
  end if;

  if partner_role = 'admin' or coalesce(has_active_access, false) then
    return true;
  end if;

  return prop_allow_sharing;
end;
$$;

revoke all on function public.can_partner_share_property(text, uuid) from public, anon;
grant execute on function public.can_partner_share_property(text, uuid) to authenticated, service_role;

-- 6. Feature 1 & 2: Drop Agent Deal Board & Owner Agent Authorisation objects
drop function if exists public.respond_to_agent_deal(uuid, text);
drop function if exists public.set_owner_agent_deal_status(uuid, text);
drop function if exists public.upsert_owner_agent_deal(jsonb);
alter table public.partner_share_links drop column if exists accepted_deal_id;
drop policy if exists "Authorised partners and managers read eligible agent deals" on public.agent_deals;
drop table if exists public.agent_deal_acceptances;
drop table if exists public.agent_deals;

drop function if exists public.lookup_partner_by_referral_code(text);
drop function if exists public.revoke_owner_agent_authorisation(text, uuid, text);
drop function if exists public.grant_owner_agent_authorisation(text, uuid, text[], timestamptz, text);
drop table if exists public.property_agent_authorisations;

-- 7. Duplicate detection, submitter separation, and pre-sprint `public.can_manage_property(text)` restoration
drop trigger if exists z1_detect_property_duplicates on public.properties;
drop function if exists public.detect_property_duplicates_on_write();
drop function if exists public.review_property_duplicate_flag(uuid, text, text, boolean);
drop table if exists public.property_duplicate_flags;
drop trigger if exists z0_enforce_submitter_role_separation on public.property_private_records;
drop function if exists public.enforce_submitter_role_separation();

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
      from public.property_access pa
      join public.profiles p on p.id = pa.user_id
      where pa.property_id = target_property_id
        and pa.user_id = (select auth.uid())
        and pa.status = 'active'
        and p.account_status = 'active'
    );
$$;

drop function if exists public.can_manage_property_as_owner_or_manager(text);

drop trigger if exists a0_assign_hamlet_property_defaults on public.properties;
drop function if exists public.assign_hamlet_property_defaults();
drop function if exists public.generate_hamlet_property_code();
alter table public.properties
  drop column if exists hamlet_property_code,
  drop column if exists building_or_estate,
  drop column if exists unit_identifier,
  drop column if exists submitted_by_user_id,
  drop column if exists submitter_relationship,
  drop column if exists booking_mode,
  drop column if exists caution_refund_conditions,
  drop column if exists caution_inspection_policy;
commit;
```

---

## D. Controlled Production Release Checklist (When Approved Later)

1. Review Vercel Preview deployment for the draft PR and complete manual stakeholder QA across Partner Deal Board (`/partners/deals`), Guest Stay Detail (`/stays/[id]`), Guest Bookings (`/account/bookings`), and Admin Console (`/admin/properties`, `/admin/settlements`).
2. Confirm any commercial sign-offs on `DEFAULT_CONFIGURABLE_COMMERCIAL_POLICY.unresolvedAssumptions`.
3. Take a pre-migration snapshot/backup of Supabase project `jopnnevqnwrpldrojmdu` (`eu-west-1`).
4. Apply `supabase/migrations/20261106100000_competitive_readiness_sprint.sql` to `jopnnevqnwrpldrojmdu` and verify `get_public_property_trust_profile` and `agent_deals` RLS policies.
5. Mark the PR Ready for Review, merge into `main`, and verify `npm run verify:cutover` against `https://hamlet.rest`.
