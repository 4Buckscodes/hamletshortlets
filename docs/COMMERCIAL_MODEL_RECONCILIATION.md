# HAMLET Commercial Model Decision & Implementation Reconciliation

**Decision date:** 29 October 2026  
**Repository:** `4Buckscodes/hamletshortlets`  
**Status:** Commercial decision approved; documentation reconciliation underway.

## Approved decision
1. Retire the legacy 3% guest-only HAMLET service-fee model.
2. Add a 20% pool to the owner's listed accommodation base (B).
3. Calculate direct referrer reward as 2.5 percentage points of (B).
4. With an eligible direct referrer: closing agent 10% of (B), referrer 2.5%, HAMLET 5%, reserve 2.5%.
5. Without an eligible referrer: referrer 0%, HAMLET 7.5%, reserve 2.5%, closing agent 10% when attributed.
6. Owner fee remains 0%; pool is not deducted from owner proceeds.
7. Mandatory charges and refundable caution deposits remain outside the pool; caution deposits also have no FX buffer.
8. The 10% USD/GBP buffer is separate and applied once.
9. The 2.5% reserve is an internal budget, not the actual provider fee. Provider-fee pass-through remains a separate launch decision.

## Source inspection
Inspected `main` files: `MVP_SPECIFICATION.md`, `docs/PRICING_AND_PAYMENT_CONTRACT.md`, `src/lib/pricing.ts`, `src/lib/pricing.test.ts`, `README.md`, and `docs/RELEASE_READINESS.md`.

Findings: the pricing engine already implements the 20% pool and allocation constants; the pricing unit test includes the ₦200,000 allocation example matching the approved split. The MVP specification still stated 3%, and the pricing contract/release checklist described commercial sign-off as unresolved. This is documentation drift; do not rewrite the pricing algorithm merely to match the old specification.

## Reconciliation checklist
- [x] Locate the correct repository and inspect `main`.
- [x] Inspect pricing source and allocation tests.
- [ ] Update MVP specification and retire 3% language.
- [ ] Update pricing contract to state the approved 20% model.
- [ ] Update release readiness: pricing approval closed; unrelated production gates remain open.
- [ ] Add a regression assertion/test preventing accidental reintroduction of the legacy 3% fee.
- [ ] Run lint, unit tests, build and relevant end-to-end/payment scenarios.
- [ ] Review changes in a pull request before merge.
- [ ] Do not change live domain, production secrets, live migrations or money-moving behaviour as part of this documentation reconciliation.

## Remaining launch gates
Provider-fee policy, production Paystack secrets/webhook, real approved inventory, legal review, cancellation/refund policy, deployed migration status, support coverage and live end-to-end ledger reconciliation remain separate release gates.
