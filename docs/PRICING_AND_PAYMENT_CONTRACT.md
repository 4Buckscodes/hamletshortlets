# HAMLET.REST — Authoritative Pricing, Currency & Payment Contract

**Code authority:** `src/lib/pricing.ts`, `src/lib/currency.tsx`  
**Business authority:** `MVP_SPECIFICATION.md` v1.2 (3 November 2026)  
**Rules version:** `v2_20pct_markup_10pct_fx_buffer`

## 1. Confirmed guest pricing & owner commercial policy
HAMLET's confirmed guest service fee is **20% of the owner's agreed accommodation rate (B)**:
- domestic guest accommodation price = (B × 1.20), included once in the displayed guest-facing stay price and never added a second time at checkout;
- owner accommodation rate (B), guest service fee (20% of B), guest-facing total, payment processing costs, agent earnings / commercial allocations, and refundable caution deposits remain distinct;
- owner commercial charges (`DEFAULT_OWNER_COMMERCIAL_POLICY` in `src/lib/pricing.ts`) are configurable and inactive by default — HAMLET never encodes or publishes a blanket promise of permanent 0% owner fees;
- pool percentages are percentage points of (B), not percentages of the pool or guest total.

Public owner-services policy copy:
> "HAMLET provides property owners with access to listing, visibility, booking and property management services. Applicable service fees, verification charges, storage limits and optional paid services will be communicated transparently under HAMLET's current pricing and service policies."

## 2. Pool allocations

| Allocation | Eligible referrer | No eligible referrer |
|---|---:|---:|
| Closing agent, when validly attributed | 10% of (B) | 10% of (B) |
| Direct referrer, when eligible | 2.5% of (B) | 0% |
| HAMLET allocation | 5% of (B) | 7.5% of (B) |
| Payment/settlement reserve | 2.5% of (B) | 2.5% of (B) |
| **Total** | **20% of (B)** | **20% of (B)** |

The referrer reward is 2.5 percentage points of (B), not 2.5% of the pool or guest total. Apply configured attribution, self-referral prevention, referral window and earning-milestone rules. Agent/referrer rewards must be adjusted consistently for cancellations and refunds.

The 2.5% reserve is an internal budget allocation, not the provider's actual fee. Reconcile actual provider charges separately. Do not silently deduct reserve shortfalls from owner proceeds or partner rewards.

Example for (B = ₦200,000): guest accommodation price ₦240,000; pool ₦40,000. With eligible agent and referrer: ₦20,000 agent, ₦5,000 referrer, ₦10,000 HAMLET, ₦5,000 reserve. Without eligible referrer: ₦20,000 agent, ₦0 referrer, ₦15,000 HAMLET, ₦5,000 reserve.

## 3. Mandatory charges and deposits
Disclosed mandatory charges are added separately and excluded from the 20% pool by default. Refundable caution deposits are itemised separately and receive 0% markup, 0% international FX buffer, and no agent/referrer reward or HAMLET revenue allocation. Maintain a distinct deposit ledger and inspection/refund workflow.

## 4. International quotes
The current engine converts the domestic stay amount using configured exchange-rate data and applies one 10% USD/GBP buffer to qualifying stay quotes, never stacked or compounded. Caution deposits are converted separately without the buffer. Foreign-currency quotes expire after 30 minutes and must be refreshed server-side before checkout. Partner allocations remain based on the NGN owner base (B).

## 5. Single calculation authority
`src/lib/pricing.ts` is the only application-level pricing authority. All cards, property details, partner previews, booking requests, checkout, receipts, dashboards and server handlers must reuse it or a validated server-side wrapper. Do not write independent markup/commission/FX formulas in components. Do not trust client-submitted totals; recompute from stored property prices, dates, mandatory charges, deposit, currency configuration and eligible attribution. Record the rules version and auditable allocation/quote data.

## 6. Booking and payment verification
1. Server validates listing approval, capacity, dates and availability, then calculates the authoritative quote.
2. A booking request is not confirmation or proof of payment.
3. An authorised partner may accept, moving the booking to `awaiting_payment` with a deadline/hold.
4. Checkout initialization verifies guest ownership, state and deadline; amount is calculated server-side in provider minor units.
5. Browser return, screenshot or uploaded receipt never marks a booking paid.
6. Only the verified provider webhook may confirm payment after signature, status, reference, currency and amount checks; processing must be idempotent.
7. Admin refund/payout actions must be described as ledger/reconciliation records unless actual provider execution is verified.

## 7. Provider fees and ledger
Provider-fee pass-through remains undecided. Do not add a provider fee to checkout until the policy and disclosures are approved; do not double charge or represent an estimate as an actual fee. Ledger must distinguish owner base/proceeds, each pool allocation, mandatory charges, caution deposit/refund, FX buffer/quote, actual provider fee/reserve variance, cancellation/refund adjustments, payment references, status and audit actor.

## 8. Required tests
- (B=₦200,000) gives guest accommodation price ₦240,000 and guest service fee ₦40,000.
- Guest service fee is included once and never charged twice at checkout.
- With referrer: allocations ₦20,000 / ₦5,000 / ₦10,000 / ₦5,000.
- Without referrer: allocations ₦20,000 / ₦0 / ₦15,000 / ₦5,000.
- Owner accommodation rates remain distinct from guest-facing totals.
- Payment processing costs are not silently mixed into the 20% guest service fee.
- Agent earnings are not silently deducted without an agreed commercial rule.
- Mandatory charges/deposits are excluded from the 20% fee; deposits exclude FX buffer.
- Future owner charges and media upload limits are configurable (`DEFAULT_OWNER_COMMERCIAL_POLICY`, `DEFAULT_PROPERTY_MEDIA_POLICY`) rather than hard-coded, and remain inactive by default.
- No active public page promises permanent 0% owner fees.
- Browser return cannot confirm payment; webhook checks are idempotent.
- UI and server quote agree; actual provider fee is separate from reserve.

## 9. Launch gate
Commercial pricing sign-off is complete. Production readiness still requires verified provider secrets/webhook, deployed migrations/RPCs, real approved inventory, end-to-end payment tests, ledger reconciliation, legal disclosures, cancellation/refund policy and operational ownership.
