# Pilot Pricing Implementation Notes

**Decision date:** 27 October 2026  
**Status:** In progress — owner preview and fee estimate implemented on the pilot branch; checkout fee persistence and end-to-end payment pass-through remain pending.

## Domestic accommodation price

The owner enters base nightly accommodation price B. The central pricing engine calculates the 20% domestic markup on accommodation only:

- Guest-facing accommodation price = B × 1.20.
- The owner’s entered base price is not reduced by the markup.
- Mandatory charges are itemised separately and are not marked up by this rule.
- The refundable caution deposit remains separate and refundable.
- The markup allocation is calculated on B: closing agent 10%, eligible direct referrer 2.5%, payment reserve 2.5%, and HAMLET receives the reconciled remainder. With an eligible direct referrer, this is 5%; without one, the unallocated 2.5% referrer share remains with HAMLET.

## Paystack fee estimate

The pilot owner listing wizard displays an estimate for local Nigerian Paystack pricing: 1.5% + ₦100, capped at ₦2,000, with the fixed ₦100 waived below ₦2,500. This estimate is for transparency during property price setup.

**Important:** this helper is not yet the authoritative checkout amount. Before enabling guest fee pass-through in production, the checkout flow must:
1. Confirm current Paystack pricing for the actual payment method and account configuration.
2. Persist the processing-fee amount or pricing snapshot against the booking.
3. Show the fee and full amount to the guest before redirecting to Paystack.
4. Initialize Paystack using the server-calculated final amount and verify that exact amount server-side.
5. Reconcile the actual Paystack fee against the internal 2.5% reserve in the ledger.
6. Test refunds, duplicate callbacks, failed payments, and legacy bookings without changing already-confirmed booking totals.

Do not treat the internal 2.5% reserve as the actual Paystack fee or as a separate charge to the guest. Do not rely on a client-submitted amount.
