# HAMLET — Owner Commercial Services & Media Storage Architecture Review

**Date:** 3 November 2026  
**Code authority:** `src/lib/pricing.ts` (`DEFAULT_OWNER_COMMERCIAL_POLICY`, `calculateOwnerSettlement`, `DEFAULT_PROPERTY_MEDIA_POLICY`, `resolvePropertyMediaPolicy`)  
**Status:** Configurable baseline implemented in application code (inactive by default); database billing, quota tracking, and plan management remain intentionally deferred pending commercial sign-off.

---

## 1. Current Commercial Policy Baseline

1. **Confirmed Guest Pricing Rule (Active):**
   - HAMLET's guest service fee is **20%** of the owner's agreed accommodation rate (`B`).
   - Added once on top of `B` and included in the displayed guest-facing stay price (`B × 1.20`).
   - Never added a second time at checkout (`resolveCheckoutStayAmountNgn`).
   - Refundable caution deposits, mandatory cleaning charges, payment processing costs, and agent commercial allocations remain distinct.
2. **Owner Commercial Policy (Configurable, Currently Inactive):**
   - No active page or workflow promises permanent `0%` owner fees or unlimited free services.
   - Public policy copy:
     > "HAMLET provides property owners with access to listing, visibility, booking and property management services. Applicable service fees, verification charges, storage limits and optional paid services will be communicated transparently under HAMLET's current pricing and service policies."
   - `DEFAULT_OWNER_COMMERCIAL_POLICY` in `src/lib/pricing.ts` keeps all owner charges inactive (`ownerServiceFeeRate: 0`, `verificationChargeNgn: null`, `reinspectionChargeNgn: null`, `agreedAgentCommissionRate: null`, `optionalServiceCharges: []`), while `calculateOwnerSettlement()` and `ownerProceeds()` accept explicit policy overrides without code rewrites.
3. **Media Upload Limits (Centrally Configured):**
   - `DEFAULT_PROPERTY_MEDIA_POLICY` in `src/lib/pricing.ts` centralises `maxImagesPerListing` (`12`), `maxImageFileBytes` (`5 MB`), `allowedImageMimeTypes` (`image/jpeg`, `image/png`, `image/webp`), `videoUploadsEnabled` (`false`), `maxVideosPerListing` (`0`), and `ownerStorageQuotaBytes` (`null`), shared across `PropertyListingWizard.tsx` and `app/api/partner/properties/route.ts`.

---

## 2. Capability & Gap Assessment for Future Owner Services

| Capability | Current Readiness | Architecture Gap |
|---|---|---|
| **Configurable owner service fees** | **Application-ready (inactive):** `calculateOwnerSettlement()` computes percentage owner service fees when configured (`ownerServiceFeeRate`). | Database `bookings` & `booking_payment_records` currently assume `0%` owner deduction in the PostgreSQL trigger (`enforce_booking_request_integrity` / `confirm_booking_payment_webhook`) and contain an older static description string (`'0% HAMLET owner fee'`) inside deployed migration `20261024100000`. |
| **Paid verification & re-inspection services** | **Modelled as optional line items (inactive):** `verificationChargeNgn` and `reinspectionChargeNgn` exist in `OwnerCommercialPolicyConfig`. | No `owner_service_orders` or `verification_invoices` table exists yet; physical inspection workflow (`review_partner_property`) is administrative only and not gated on a fee receipt. |
| **Storage quotas & usage tracking** | **Limit constants centralised; byte-ledger absent:** Per-file (`5 MB`) and per-listing (`12` photos) caps are enforced in UI and API. | Uploads to Supabase Storage bucket `property-media` are not aggregated into a per-owner byte counter, and deleted listing URLs do not yet trigger storage object garbage collection or quota decrement. |
| **Configurable image/video upload limits** | **Implemented for images; video gated off:** `DEFAULT_PROPERTY_MEDIA_POLICY` controls counts, MIME types, and video toggle (`videoUploadsEnabled: false`). | Video transcoding, streaming delivery, and bucket MIME/file-size policies in Supabase Storage are not yet provisioned for large video assets. |
| **Premium owner plans & optional paid listing features** | **Inactive:** No plan tiers or boosted placements exist so discovery sort remains merit/filter-based. | Requires `owner_subscriptions` / `property_addons` tables, explicit "Sponsored / Featured" disclosure badges if placement boosts are ever introduced, and admin entitlement controls. |
| **Transparent service-charge breakdowns** | **Implemented in `calculateOwnerSettlement()`:** Distinguishes gross owner rate, owner service fee, agreed agent mandate commission, verification/re-inspection fees, and optional add-ons. | Partner Earnings UI (`app/partners/earnings/page.tsx`) currently displays gross `accommodation_subtotal + mandatory_charges` and referral commissions; it does not yet render itemised owner service fee deductions. |
| **Owner billing history & receipts** | **Not yet implemented:** `booking_payment_records` tracks guest booking settlements and commission payouts only. | Requires dedicated `owner_invoices` and `owner_billing_events` tables with sequential receipt numbers, VAT/tax breakdown (where applicable under Nigerian tax rules), and Paystack invoice/charge webhooks separate from guest booking webhooks. |

---

## 3. Safe Phased Implementation Plan (When Approved by Founder & Legal)

> **Do not implement or activate any step below until an approved owner fee schedule and updated partner agreement are signed off.**

### Phase 1 — Database Policy Table & Ledger String Cleanup (Zero Charge Activation)
1. Add a read-protected `commercial_policy_configs` table (defaulting `owner_service_fee_bps = 0`, `max_images_per_listing = 12`, `max_image_bytes = 5242880`, `owner_storage_quota_bytes = null`).
2. Add a forward-only SQL migration updating `confirm_booking_payment_webhook` so ledger row descriptions say `'Owner accommodation revenue (' || stay_nights || ' nights)'` instead of `'0% HAMLET owner fee'`, and snapshot `owner_service_fee_bps` / `owner_service_fee_ngn` (`0` by default) on `bookings`.

### Phase 2 — Media Asset Registry & Storage Quota Accounting (Observability First)
1. Create `property_media_assets (id, owner_id, property_id, storage_path, mime_type, size_bytes, media_kind, status, created_at)` populated on upload and marked `archived` on photo removal.
2. Compute per-owner storage usage via `SUM(size_bytes) WHERE status = 'active'` and surface read-only usage telemetry in `/partners/properties` before enforcing any paid storage tier.

### Phase 3 — Standalone Owner Service Billing & Receipts (Opt-In / Approved Services)
1. Create `owner_service_invoices` and `owner_service_receipts` (covering paid physical verification, re-inspection, optional property management retainers, or storage add-ons) with server-verified Paystack checkout and webhook handlers isolated from `paystack-webhook` guest booking confirmation.
2. Surface downloadable receipts and itemised charge history in `/partners/earnings` (or `/partners/billing`) and `/admin/settlements`.
