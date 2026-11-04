# HAMLET Share Engine — Architecture, Attribution Policy & Rollback Guide

## 1. System Overview

The **HAMLET Share Engine** integrates property distribution, dynamic link previews, branded marketing artwork, scannable QR generation, and auditable partner attribution directly into the existing Next.js 16 + Supabase HAMLET platform without introducing a second source of truth for properties, bookings, or payouts.

| Subsystem | Implementation | Source of Truth |
| --- | --- | --- |
| Database schema, RLS & RPCs | `supabase/migrations/20261104120000_hamlet_share_engine.sql` | `properties`, `property_access`, `bookings`, `booking_payment_records` |
| Core share, URL & WhatsApp helpers | `src/lib/share-engine.ts` | Centralised pricing (`src/lib/pricing.ts`) & discovery (`src/lib/discovery.ts`) |
| Standards-compliant QR encoder | `src/lib/share-qr.ts` | `qrcode` (PNG, Level M, 4-module quiet zone, zero logo overlay) |
| Server-side PNG artwork & OG renderer | `src/lib/share-artwork.tsx` | `next/og` (`Satori` + local WOFF1 `Inter` / `InterExt` / `Playfair Display`) |
| Public dynamic Open Graph routes | `app/api/og/default/route.ts`, `app/api/og/property/[id]/route.ts` | Public approved `properties` rows (`status = 'approved'`) |
| Partner card & QR API routes | `app/api/partner/share/card/route.ts`, `app/api/share/qr/route.ts` | Authenticated `get_or_create_partner_share_link` & `record_partner_share_action` |
| Attribution visit, auth bind & enquiry APIs | `app/api/share/visit/route.ts`, `app/api/share/bind/route.ts`, `app/api/property-enquiries/route.ts` | `share_attribution_sessions`, `property_share_events`, `property_enquiries` |
| Partner workspace UI | `app/partners/marketing/page.tsx`, `app/partners/analytics/page.tsx`, `app/partners/page.tsx` | `list_partner_shareable_properties`, `get_my_marketing_performance` |

---

## 2. Explicit Attribution Policy & Role Separation

HAMLET separates every party in a booking lifecycle cleanly:

1. **Property Owner (`properties.owner_id`)**: Receives 100% of the owner base accommodation subtotal (`B`), cleaning fee, and mandatory property charges.
2. **Property Introducer (`bookings.property_introducer_id`)**: Partner who introduced the property onto HAMLET.
3. **Authorised Property Manager (`bookings.authorised_manager_id`)**: Operational host/manager responsible for calendar confirmation and check-in.
4. **Closing Agent / Guest Referrer (`bookings.closing_agent_id`)**: Active HAMLET partner whose tracked share link (`hsl_...`) brought the guest to the property. Receives the authorised `10%` of owner base (`B`) closing-agent allocation from HAMLET's `20%` guest service fee pool upon stay completion (or an explicit `property_access.commission_rate` mandate when applicable, without double-counting).
5. **Partner Network Referrer (`profiles.referred_by_partner_id`)**: Receives `2.5%` of `B` during the referred partner's 90-day attribution window (`HML-...` recruitment codes remain completely separate from `hsl_...` property share tokens).

### Attribution Window & Non-Overwriting Precedence Rules

- **Attribution window**: **30 days** (`expires_at = now() + interval '30 days'`).
- **First-eligible-touch lock (no silent overwrite)**:
  - When a visitor opens `/stays/[id]?ref=hsl_...`, `record_share_link_visit` creates or inspects `share_attribution_sessions` keyed by `(visitor_session_key, property_id)`.
  - If an unexpired, active, eligible `partner_share_links` attribution already exists on that session for that property, a later visit from a second partner's link **does not overwrite** the original partner's attribution. An attribution only updates if the prior link was revoked, deactivated, or expired.
- **Cross-auth & cross-request persistence**:
  - `ReferralAttributionCapture` records the visit server-side on arrival, preserves `?ref=hsl_...` across `/signin?next=...` redirects, and calls `POST /api/share/bind` on `auth.onAuthStateChange` to bind `guest_user_id = auth.uid()` onto unexpired sessions.
  - Before `INSERT` on `public.bookings`, trigger `a0_resolve_share_attribution_before_booking` resolves `closing_agent_id`, `share_link_id`, and `share_partner_id` from:
    1. Explicit `bookings.closing_agent_id` (if valid and non-self-referral),
    2. Bound guest session (`guest_user_id = new.guest_id` for `new.property_id`),
    3. Browser `share_session_key` (`session_key` for `new.property_id`),
    4. Verified `partner_share_links` token fallback (`share_token_input`).
- **Abuse & Failure Safeguards**:
  - **Self-referral block**: If `partner_id = guest_id`, `closing_agent_id` is cleared (`null`) before `enforce_booking_request_integrity` runs; the guest can still book normally without receiving self-dealt agent commission.
  - **Revoked / paused / unapproved property protection**: `can_partner_share_property` requires `properties.status = 'approved'`, `profiles.role in ('partner', 'admin')`, `profiles.account_status = 'active'`, no `property_access.status = 'revoked'` row, and (`owner` / active `property_access` OR `properties.allow_partner_sharing = true`).
  - **Graceful booking fallback**: Invalid, expired, or tampered `hsl_...` tokens never block guest browsing, enquiries, or booking requests.

---

## 3. Financial Reconciliation Rules

`get_my_marketing_performance(window_days)` reconciles strictly with `public.bookings` and `public.booking_payment_records`:

- **Potential Opportunity (`potential_earnings_ngn`)**: Sum of `closing_agent_commission_ngn` on attributed bookings still in `requested`, `checking`, or `approved_pending_payment` (`payment_status <> 'paid'`). Clearly labelled as unpaid opportunity, never earned income.
- **Pending Completion (`earnings_pending_ngn`)**: Ledger rows in `booking_payment_records` (`closing_agent_commission` / `partner_commission`) with `payout_status = 'pending'` (paid/confirmed stays awaiting guest checkout).
- **Eligible for Payout (`earnings_eligible_ngn`)**: Ledger rows with `payout_status = 'approved'` (set when `transition_booking` marks the stay `completed`).
- **Paid & Settled (`earnings_paid_ngn`)**: Ledger rows with `payout_status = 'paid'`.
- **Reversed / Adjusted (`earnings_reversed_ngn`)**: Ledger rows with `payout_status = 'reversed'` (refunded or disputed bookings).
- **Caution Deposit Invariant**: Refundable caution deposits (`refundable_deposit`) are security deposits held for post-checkout inspection and are **never** included in partner opportunity estimates or commission calculations.

---

## 4. Database Rollback Path

If `supabase/migrations/20261104120000_hamlet_share_engine.sql` ever needs to be rolled back cleanly without affecting core `properties`, `bookings`, or historical `booking_payment_records`, execute the following SQL in a single transaction:

```sql
begin;

-- 1. Drop Share Engine booking triggers & trigger functions
drop trigger if exists z0_record_share_booking_lifecycle_events on public.bookings;
drop function if exists public.record_share_booking_lifecycle_events();

drop trigger if exists a0_resolve_share_attribution_before_booking on public.bookings;
drop function if exists public.resolve_share_attribution_before_booking();

-- 2. Drop Share Engine RPCs
drop function if exists public.get_my_marketing_performance(integer);
drop function if exists public.list_partner_shareable_properties();
drop function if exists public.submit_property_enquiry(text, text, text, text, text, text, text);
drop function if exists public.bind_share_attribution_to_guest(text);
drop function if exists public.record_share_link_visit(text, text, text);
drop function if exists public.record_partner_share_action(text, text, jsonb, text);
drop function if exists public.get_or_create_partner_share_link(text);
drop function if exists public.set_property_sharing_permission(text, boolean);
drop function if exists public.get_partner_property_deal_terms(text, uuid);
drop function if exists public.can_partner_share_property(text, uuid);
drop function if exists public.generate_opaque_share_token();

-- 3. Drop optional attribution columns on bookings
alter table public.bookings
  drop column if exists share_token_input,
  drop column if exists share_session_key,
  drop column if exists share_partner_id,
  drop column if exists share_link_id;

-- 4. Drop Share Engine tables (in foreign-key dependency order)
drop table if exists public.property_share_events;
drop table if exists public.property_enquiries;
drop table if exists public.share_attribution_sessions;
drop table if exists public.partner_share_links;

-- 5. Drop sharing toggle column on properties
alter table public.properties
  drop column if exists allow_partner_sharing;

commit;
```
