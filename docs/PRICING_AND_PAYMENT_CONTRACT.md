# HAMLET.REST — Authoritative Pricing, Currency & Payment Contract

**Single Source of Truth in Code:** `src/lib/pricing.ts` & `src/lib/currency.ts`  
**Active Rules Version:** `PRICING_RULES_VERSION = 'v2_20pct_markup_10pct_fx_buffer'`

---

## 1. Documented Commercial Policy & Spec Reconciliation

> **Explicit Spec Reconciliation Notice (Owner Visibility Required):**  
> Early v1 product prose referenced a `3%` guest service fee, whereas the authoritative commercial engine implemented across `src/lib/pricing.ts`, unit tests (`src/lib/pricing.test.ts`, `src/lib/consolidatedDomain.test.ts`), and the live Supabase database (`20261024100000_availability_referrals_pricing_fx_settlement.sql`) enforces **`v2_20pct_markup_10pct_fx_buffer`**. Per engineering governance rules, **no silent commercial rate change was made**; all Next.js cards, detail pages, partner previews, and server booking endpoints read exclusively from `src/lib/pricing.ts`. Any future rate adjustment must be approved by the business owner and updated solely in `src/lib/pricing.ts` + a coordinated database migration.

### Active Formula (`v2_20pct_markup_10pct_fx_buffer`)
1. **Owner Listed Base Accommodation Price ($B$, in NGN)**:
   - Property partner enters nightly base rate $B_{\text{night}}$ in NGN.
   - For $N$ nights, $B = B_{\text{night}} \times N$.
   - **Owner Fee:** `0%` deducted from $B$ (`OWNER_HAMLET_FEE_RATE = 0`). The owner keeps `100%` of $B$.
2. **Domestic Guest Accommodation Price (NGN)**:
   - Domestic markup = `20%` of $B$ (`HAMLET_DOMESTIC_MARKUP_RATE = 0.20`), rounded via integer basis points (`multiplyNairaBasisPoints(B, 2000)`).
   - Guest-facing nightly stay rate = $B_{\text{night}} \times 1.20$ (`guestFacingNightlyNgn`).
   - Internal allocation of the `20%` markup on $B$:
     - Closing agent: `10%` of $B$ (when validly attributed)
     - Direct referring partner: `2.5%` of $B$ (within active 90-day referral window; self-referral blocked)
     - HAMLET platform allocation: `5%` of $B$ (with eligible referrer) or `7.5%` of $B$ (without eligible referrer)
     - Payment & settlement cost reserve: `2.5%` of $B$
3. **Mandatory Charges (Cleaning / Turnover Fee, in NGN)**:
   - Added flat (`0%` domestic markup) to form **Domestic Guest Stay Total**:
     $$\text{guestTotal (NGN)} = (B \times 1.20) + \text{mandatoryChargesTotal}$$
4. **International Display & Quote Buffer (`USD` / `GBP`)**:
   - Reference rates loaded from `public.currency_exchange_rates` (defaults: `₦1,600 / $1 USD`, `₦2,000 / £1 GBP`).
   - Converts `guestTotal (NGN)` to `USD` or `GBP` and applies a **single `10%` international FX buffer (`INTERNATIONAL_CURRENCY_BUFFER_RATE = 0.10`)** — never stacked or compounded.
   - Foreign-currency quotes carry a **30-minute validity window** (`quote_expires_at`). Expired quotes are refreshed server-side via `refresh_booking_fx_quote` before checkout initialization.
5. **Refundable Caution Deposit**:
   - Itemised separately on every card, summary, booking row, and receipt.
   - **Strictly `0%` domestic markup and `0%` international FX buffer** (`formatCautionDeposit` / `applyInternationalBuffer: false`).
   - Tracked in `public.booking_caution_deposits` and inspected post-checkout via `transition_caution_deposit`.

---

## 2. Booking Hold & Server-Verified Payment Contract

1. **Request Stage (`POST /api/booking-requests`)**:
   - Authenticated active guest submits `propertyId`, `checkIn`, `checkOut`, `guests`, `quoteCurrency`, and optional `specialRequests`.
   - Server validates `status = 'approved'`, guest capacity, `first_available_date`, and `get_unavailable_property_ids(requested_check_in, requested_check_out)`.
   - Server computes `calculateGuestPricing` + `calculateInternationalStayQuote` from database rates (never trusting client-submitted totals) and inserts `status = 'requested'`.
   - **No card payment is collected at the request stage.**
2. **Partner Confirmation & 48-Hour Hold (`transition_booking`)**:
   - Authorised property partner reviews the request in `/partners/bookings`.
   - Accepting moves the booking to `awaiting_payment` with a **48-hour `payment_deadline`**, temporarily holding the dates against competing bookings.
   - Overdue unpaid holds expire via `expire_overdue_bookings`.
3. **Checkout Initialization (`supabase/functions/paystack-initialize`)**:
   - Invoked from `/account/bookings` only when `status = 'awaiting_payment'` and `payment_deadline > now()`.
   - Verifies caller JWT owns `booking.guest_id`, computes exact NGN kobo amount on the server, initializes Paystack transaction using server-only `PAYSTACK_SECRET_KEY`, and returns `authorization_url`.
   - If `PAYSTACK_SECRET_KEY` is not yet configured on the environment, returns `503` and the UI displays an honest degraded-provider message without altering the booking hold.
4. **Browser Return vs. Webhook Confirmation (`supabase/functions/paystack-webhook`)**:
   - Returning to `/account/bookings?payment=return&booking=HML-...` **never marks a booking paid or confirmed**. It displays an explicit verification notice and refreshes server state.
   - Only `paystack-webhook` — after verifying `x-paystack-signature` (HMAC-SHA512 over the raw request body), transaction status, currency, kobo amount, and idempotent `provider_reference` — invokes `confirm_booking_payment_webhook` (`service_role` only) to transition `awaiting_payment → confirmed` and write immutable ledger rows in `booking_payment_records`.
5. **Refunds & Payout Reconciliation**:
   - `record_booking_refund`, `update_payout_status`, and `transition_caution_deposit` record audited reconciliation states in `booking_payment_records` / `booking_caution_deposits` / `admin_audit_log`. Admin UI labels these honestly as ledger reconciliation records rather than automated bank transfers.
