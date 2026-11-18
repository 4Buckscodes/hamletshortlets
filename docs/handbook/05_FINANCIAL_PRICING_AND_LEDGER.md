# HAMLET Financial Pricing & Ledger Handbook

**Version:** 2.0 draft · **Reviewed:** 2 November 2026  
**Authority:** `src/lib/pricing.ts`, `docs/PRICING_AND_PAYMENT_CONTRACT.md`, current MVP spec v1.1.  
**Status:** Current calculation rules documented; end-to-end allocation/settlement reconciliation remains open.

## 1. Commercial model

The repository-recorded model dated 29 October 2026 retires the legacy 3% guest-only fee. The current domestic accommodation price is owner-listed base B plus a 20% pool. Owner fee deduction is 0%; the pool is funded by the guest-facing markup, not deducted from owner base proceeds.

All percentages below are percentage points of B, not percentages of the pool or guest total.

| Allocation | Eligible direct referrer | No eligible referrer |
|---|---:|---:|
| Closing agent (when attributed) | 10% B | 10% B |
| Direct referrer | 2.5% B | 0% |
| HAMLET | 5% B | 7.5% B |
| Internal payment/settlement reserve | 2.5% B | 2.5% B |
| Total | 20% B | 20% B |

If there is no closing agent, the calculation function may allocate the remaining amount differently; verify the function's no-agent case and do not assume the table covers it. Founder confirmation is required on precedence between this standard pool and property-specific owner/agent fixed or net-rate offers.

## 2. Example

For B = ₦200,000:
- Guest accommodation price before mandatory charges/deposit = ₦240,000.
- Pool = ₦40,000.
- With eligible referrer: closing agent ₦20,000; referrer ₦5,000; HAMLET ₦10,000; reserve ₦5,000.
- Without eligible referrer: closing agent ₦20,000; referrer ₦0; HAMLET ₦15,000; reserve ₦5,000.

This is an illustrative calculation, not proof that a booking payment or partner payout has occurred.

## 3. Mandatory charges and deposits

Mandatory charges are added separately and excluded from the 20% pool by current rule. Their payee is not yet fully defined: cleaning/turnover may be payable to an owner, manager or external provider. The UI and ledger should preserve the charge label, amount, beneficiary/payee, tax classification and refund treatment.

Caution deposits are separate refundable liabilities. They receive no domestic markup, no 10% international buffer, no closing-agent commission, no referrer reward and no HAMLET revenue allocation. The actual custodian and fund flow remain open.

## 4. International quotes

Current pricing code converts the domestic guest accommodation amount using configured NGN exchange-rate data and applies a 10% buffer once to qualifying stay amounts. The caution deposit is converted separately without that buffer. Quote expiry is 30 minutes by default. Rates must be configured and traceable; do not use example fallback rates as live market rates.

## 5. Provider fees

The code contains a Paystack local fee estimate helper, but the current commercial contract leaves provider-fee pass-through undecided. The 2.5% reserve is an internal budget and must not be described as actual provider cost. Actual provider fee must come from provider transaction data. Any fee pass-through requires founder approval, provider support and clear guest disclosure.

## 6. Ledger principles

Maintain separate entries/fields for:
- guest accommodation payment;
- owner base allocation/proceeds;
- closing-agent earning;
- direct-referrer reward;
- HAMLET allocation;
- internal reserve and reserve variance;
- mandatory charges and each payee;
- statutory taxes collected/remitted;
- caution deposit liability, deductions and refund;
- actual provider fee;
- cancellation/refund/chargeback adjustments;
- payment provider reference, amount, currency, status and timestamps.

Do not use a single net amount that obscures beneficiaries or liabilities. Ledger entries must be traceable to booking, rules version, actor/system event and provider evidence.

## 7. Booking and payout lifecycle

- Booking request creates a request record, not earned commission.
- Eligibility and attribution are evaluated under approved rules.
- Rewards become payable only at the defined earning milestone; the current referral migrations indicate completion-based activation/reward handling.
- Cancellation, refund, chargeback or dispute must adjust/reverse the corresponding earning and HAMLET allocation exactly once.
- Payout status must distinguish calculated, pending review, approved, actually paid, reversed and failed.
- Admin “record refund” or “settlement” screens must not imply money was transferred unless provider/bank evidence exists.

## 8. Reconciliation risks

The current booking API calculates guest pricing and receives an allocation object from the pricing helper, but the visible booking insert payload does not include all allocation fields. Referral migrations and booking transition logic may populate some fields later. Verify exact data flow before describing the allocations as fully snapshotted at booking creation.

The unit tests include an `ownerProceeds` case that appears to include mandatory charges in the computed owner proceeds. Confirm the intended recipient for every mandatory charge. The booking API currently reads nightly rate, cleaning fee and refundable deposit; verify other mandatory-charge support is not UI-only.

## 9. Required reconciliation reports

Daily:
- provider transactions vs confirmed bookings;
- webhook failures/duplicates;
- bookings paid but not confirmed and vice versa;
- deposit receipts/refunds outstanding.

Weekly:
- booking base and guest total;
- pool allocation by beneficiary;
- partner reward status;
- provider fee actual vs reserve;
- cancellation/refund/chargeback variance;
- unallocated or negative ledger balance.

Monthly:
- HAMLET revenue vs gross collection;
- tax collected and remitted by jurisdiction;
- owner/partner payable and paid;
- deposit liability outstanding;
- unresolved reconciliation exceptions.

## 10. Source of truth

The central calculation is `src/lib/pricing.ts`. The technical payment contract is `docs/PRICING_AND_PAYMENT_CONTRACT.md`. Do not copy formulas into another implementation or dashboard. Change the function, tests, contract, PRD and decision register together.
