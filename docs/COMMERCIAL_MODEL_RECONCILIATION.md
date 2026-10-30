# HAMLET Commercial Model Decision & Implementation Reconciliation

**Decision date:** 29 October 2026  
**Repository:** `4Buckscodes/hamletshortlets`  
**Status:** Commercial decision approved; documentation reconciliation PR prepared; integration and payment-ledger verification remain in progress.

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
The central TypeScript pricing engine implements the 20% pool and allocation constants. Its unit tests cover the standard eligible-referrer and no-referrer examples for B = ₦200,000. The Next.js rebuild plan and some historical database/test descriptions still contained references to the retired 3% model; those references must be distinguished from executable logic and cleaned up without rewriting already-deployed historical migrations.

## Reconciliation checklist
- [x] Locate the correct repository and inspect the main branch.
- [x] Inspect central pricing source and allocation tests.
- [x] Update MVP specification and retire the 3% model as active policy.
- [x] Update pricing/payment contract to state the approved 20% model.
- [x] Update README and release-readiness summary.
- [x] Add this commercial decision record.
- [x] Update the Next.js rebuild plan to treat 20% as approved policy.
- [ ] Audit every booking-creation and payment-confirmation path against the pricing contract.
- [ ] Reconcile payment-ledger rows so commissions, referrer rewards, HAMLET allocation and reserve sum to the 20% pool without double counting.
- [ ] Add/verify regression coverage for no agent, agent/no referrer, eligible referrer, self-referral, repeat booking, cancellation/refund and idempotent webhook cases.
- [ ] Run lint, full unit/PGlite database tests, production build and Playwright suite on the integrated candidate.
- [ ] Verify preview functionality and database migration compatibility without production deployment.
- [ ] Review all open PR dependencies and prepare a sequenced integration plan.
- [ ] Keep production branch merges, live migrations, domain changes and production deployment blocked pending explicit owner authorisation.

## Remaining launch gates
Provider-fee policy, production Paystack secrets/webhook, real approved inventory, legal review, cancellation/refund policy, deployed migration status, support coverage and live end-to-end ledger reconciliation remain separate release gates.
