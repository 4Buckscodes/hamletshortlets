# HAMLET.REST — Next.js Production MVP Release Readiness

**Date:** 2026-10-26  
**Repository:** `4Buckscodes/hamletshortlets`  
**Primary Application:** Next.js 15 App Router (`app/**`)  
**Legacy Bridge:** `/legacy` (`noindex, nofollow`, temporary fallback only)

---

## 1. Executive Summary

HAMLET.REST has been upgraded to a complete, mobile-first Next.js App Router MVP covering guest marketplace discovery, progressive booking requests, verified Paystack payment checkout, guest support reporting, 6-step partner onboarding, 7-step property listing & draft/correction workflows, partner booking/calendar/earnings workspaces, and an 8-route audited administrator console.

Crucially, this release resolves the live schema & workflow blockers discovered during the Phase A full-stack audit against the live Supabase project (`jopnnevqnwrpldrojmdu`) and live Vercel environment (`team_EVVwpTVS7thd1NVD0JQGEdaV`).

---

## 2. Phase A Audit — Code vs. Deployed Reality

| Subsystem | Repo Code Before This Pass (`07ec8ea`) | Live Deployed Reality (`jopnnevqnwrpldrojmdu` / Vercel) | Resolution in This Release |
| --- | --- | --- | --- |
| **Frontend Hosting** | Next.js App Router scaffolded in `app/**` (PR #23) | `hamlet.rest` & `www.hamlet.rest` still point to Vite project `hamletshortlets` (`prj_FK2CQCYTVp2X1jFQvxxMWMm3vCyq`); Next.js project `hamletshortlets-jonn` (`prj_gOpkzI7txouBf1VfdgelVwdVYNLa`) serves preview | Completed full Next.js route & progressive UX parity; documented safe preview verification & owner-approved domain cutover in `docs/DEPLOYMENT_AND_ROLLBACK.md` |
| **Public Stays Schema (`42703`)** | `app/stays/**` selected `city` and `public_location_summary` directly | Only `8` of `16` migrations applied on live DB (`20261024180000` Wayfinder unapplied -> `properties.city` & `public_location_summary` do **not** exist -> PostgREST `42703` crash!) | Extracted `PUBLIC_PROPERTY_SELECT` & `PARTNER_PROPERTY_SELECT` using guaranteed live columns + `probePropertyWayfinderMeta` optional probe |
| **Sign-in Redirect Bug** | `app/signin/signin-form.tsx` hardcoded `window.location.assign('/legacy')` and ignored `?next=` | Users signing in on Next.js were dumped into the legacy hash SPA | Fixed with `resolveNextAppPostSignInRedirect(role, nextPath)` + sanitized `?next=` intent preservation + 2-step progressive sign-up |
| **Pricing Consistency** | `app/stays/**` displayed raw owner `nightly_rate` without markup or currency toggle | `src/lib/pricing.ts` & live DB `bookings` use `v2_20pct_markup_10pct_fx_buffer` (`currency_exchange_rates`: USD=`1600`, GBP=`2000`, `10%` buffer) | Wired `CurrencyProvider` (`NGN`/`USD`/`GBP`), `guestFacingNightlyNgn`, `calculateGuestPricing`, and `calculateInternationalStayQuote` uniformly across cards, detail, wizard & API |
| **Live RPC / Table Mismatches** | `app/partners/availability` & `app/admin/issues` called nonexistent RPCs/columns (`confirm_property_availability`, `reason`, direct `booking_issues.update`) | Live DB uses `update_property_availability_settings`, `set_property_publication_pause`, `property_availability_blocks.note`, `booking_caution_deposits`, `property_access`, and revokes direct `UPDATE` on `booking_issues` | Audited and aligned every Next.js `.from(...)` and `.rpc(...)` call against verified live schema & RPC signatures |
| **Booking Overlap RPC** | `20261026100000` blocked unaccepted `requested` inquiries and ignored expired 48h holds & manual calendar blocks | Live DB `get_unavailable_property_ids` checks `confirmed` stays, non-expired `awaiting_payment` holds, `property_availability_blocks`, and `first_available_date` | Aligned Next.js routes to `get_unavailable_property_ids(requested_check_in, requested_check_out)` and added `20261026120000_nextjs_mvp_rpc_and_overlap_hardening.sql` |
| **Edge Functions & Secrets** | `paystack-initialize`, `paystack-webhook`, `booking-notifications` deployed (`ACTIVE`) | Live Supabase secrets have `SUPABASE_*` set, while `PAYSTACK_SECRET_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `HAMLET_INTERNAL_DISPATCH_SECRET` are not yet set | Wired `paystack-initialize` + honest `?payment=return` server-verification banner + clean degraded-provider messages when secrets are unconfigured |
| **Wayfinder / Way Find** | Present in repo (`20261024180000` + `src/lib/wayfinder.ts`) | **Not deployed** on live `jopnnevqnwrpldrojmdu` | Safely gated via `isMissingSchemaObjectError` in `/stays/[id]` and `/account/bookings` — zero fake maps/travel times or broken buttons |

---

## 3. Progressive UX & Form Standards Verification (Section 6)

All user-facing, partner-facing, and admin-facing forms follow HAMLET’s progressive, single-column mobile-first standard (`44px–48px` touch targets, inline step validation, `Back`/`Continue`, draft persistence):

- **Guest Sign-in / Sign-up (`/signin`)**: Segmented switcher; 2-field sign-in; 2-step progressive sign-up (`1. Login details` → `2. Guest details`) preserving `?next=` booking/partner intent.
- **Stays Search & Filter Drawer (`/stays`)**: Compact search bar + Lagos Island/Mainland corridor chips + `FocusedDrawer` filter sheet with `StepperCounter` controls.
- **Guest Booking Request (`/stays/[id]`)**: 2-step progressive booking card (`1. Dates & guests` with live conflict check + `NGN`/`USD`/`GBP` pricing → `2. Special requests & submit`) + mobile sticky CTA bar opening a bottom-sheet `FocusedDrawer`.
- **Guest Support Issue Wizard (`/account/issues`)**: 3-step progressive wizard (`1. Booking & category` → `2. Urgency & details` → `3. Evidence note & submit`) calling `report_booking_issue` + `append_issue_evidence`.
- **Partner Onboarding (`/partners/apply`)**: 6-step role-conditional wizard (`Property owner`, `Authorised manager`, `Multi-property operator`, `Closing agent`, `Partner referrer`) with live `?ref=` lookup (`resolve_referral_code`), `localStorage` draft auto-save, and `resubmit_partner_application` support.
- **Property Listing & Correction Wizard (`/partners/properties/new`, `/partners/properties/[id]/edit`)**: Unified 7-step `PropertyListingWizard` with direct `property-media` multi-file upload (JPEG/PNG/WebP ≤ 5 MB), cover reordering, HTTPS URL fallback, duplicate title/area check, live `calculateGuestPricing` owner/guest breakdown, `Save as draft`, and `Submit for HAMLET review`.
- **Admin Queues (`/admin/*`)**: Compact queue cards opening `FocusedDrawer` review drawers for 4-pillar property verification, partner onboarding, booking transitions & ledger refunds, audited issue resolution, payout/caution reconciliation, and account suspension.

---

## 4. Remaining Production Configuration Gates (Owner Action Required)

Before cutting over `hamlet.rest` / `www.hamlet.rest` and enabling live card payments/emails:

1. **Apply Pending Database Migrations (with Owner Approval)**: Follow `docs/DATABASE_RELEASE_CHECKLIST.md` to review and push migrations `20261024140000` through `20261026120000` to staging and then `jopnnevqnwrpldrojmdu`.
2. **Configure Live Edge Function Secrets on `jopnnevqnwrpldrojmdu`**:
   - `PAYSTACK_SECRET_KEY` (and register Paystack webhook URL `https://jopnnevqnwrpldrojmdu.supabase.co/functions/v1/paystack-webhook`)
   - `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO_EMAIL`, `HAMLET_BOOKINGS_EMAIL`
   - `HAMLET_APP_URL=https://www.hamlet.rest`
   - `HAMLET_INTERNAL_DISPATCH_SECRET`
3. **Seed/Approve Real Lagos Inventory**: `public.properties` on `jopnnevqnwrpldrojmdu` currently has `0` rows; submit and 4-pillar approve real verified Lagos stays via `/partners/properties/new` and `/admin/properties` (never seed fake public listings).
4. **Commercial Pricing Sign-off**: Confirm active `v2_20pct_markup_10pct_fx_buffer` rules documented in `docs/PRICING_AND_PAYMENT_CONTRACT.md`.
5. **Owner-Approved Vercel Domain Cutover**: Follow `docs/DEPLOYMENT_AND_ROLLBACK.md` after preview smoke verification on `hamletshortlets-jonn.vercel.app`.
