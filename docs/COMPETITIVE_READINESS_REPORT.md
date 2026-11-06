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

### Verified Non-Destructive Rollback SQL
```sql
begin;
drop trigger if exists z2_sync_property_trust_checks on public.properties;
drop function if exists public.sync_property_trust_checks_from_property();
drop function if exists public.admin_review_property_trust_check(text, text, text, text, text, text);
drop function if exists public.get_public_property_trust_profile(text);
drop table if exists public.property_trust_checks;

drop function if exists public.respond_to_property_enquiry(uuid, text, text);
drop function if exists public.confirm_property_availability_now(text, text);
alter table public.property_enquiries
  drop column if exists partner_response,
  drop column if exists responded_by,
  drop column if exists responded_at;

drop function if exists public.admin_resolve_caution_deposit_status(text, text, integer, integer, text);
drop function if exists public.respond_to_caution_damage_claim(text, text);
drop function if exists public.submit_caution_damage_claim(text, text, integer, jsonb, boolean);
drop function if exists public.respond_to_property_inspection(uuid, text, text);
drop function if exists public.submit_property_inspection(text, text, text, text, text, text, text, jsonb);
drop function if exists public.update_property_caution_policy(text, integer, text, text);
drop table if exists public.property_inspections;

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
drop trigger if exists z1_detect_property_duplicates on public.properties;
drop function if exists public.detect_property_duplicates_on_write();
drop function if exists public.review_property_duplicate_flag(uuid, text, text, boolean);
drop table if exists public.property_duplicate_flags;
drop trigger if exists z0_enforce_submitter_role_separation on public.property_private_records;
drop function if exists public.enforce_submitter_role_separation();
drop trigger if exists a0_assign_hamlet_property_defaults on public.properties;
drop function if exists public.assign_hamlet_property_defaults();
commit;
```

---

## D. Controlled Production Release Checklist (When Approved Later)

1. Review Vercel Preview deployment for the draft PR and complete manual stakeholder QA across Partner Deal Board (`/partners/deals`), Guest Stay Detail (`/stays/[id]`), Guest Bookings (`/account/bookings`), and Admin Console (`/admin/properties`, `/admin/settlements`).
2. Confirm any commercial sign-offs on `DEFAULT_CONFIGURABLE_COMMERCIAL_POLICY.unresolvedAssumptions`.
3. Take a pre-migration snapshot/backup of Supabase project `jopnnevqnwrpldrojmdu` (`eu-west-1`).
4. Apply `supabase/migrations/20261106100000_competitive_readiness_sprint.sql` to `jopnnevqnwrpldrojmdu` and verify `get_public_property_trust_profile` and `agent_deals` RLS policies.
5. Mark the PR Ready for Review, merge into `main`, and verify `npm run verify:cutover` against `https://hamlet.rest`.
