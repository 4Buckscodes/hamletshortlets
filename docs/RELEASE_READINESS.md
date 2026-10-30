# HAMLET.REST — Next.js Production MVP Release Readiness

**Commercial model reviewed:** 29 October 2026  
**Repository:** `4Buckscodes/hamletshortlets`  
**Primary application:** Next.js App Router  
**Status:** Commercial pricing decision approved; production launch remains gated.

## 1. Commercial pricing decision — approved
The previous `MVP_SPECIFICATION.md` v1.0 stated a 3% guest-only service fee. That legacy model is retired. The approved model adds a 20% pool to the owner's listed accommodation base price (B), with the owner fee at 0%.

Pool allocation, when a closing agent is attributed and a direct referrer is eligible:
- Closing agent: 10% of (B).
- Direct referrer: 2.5% of (B).
- HAMLET: 5% of (B).
- Payment/settlement reserve: 2.5% of (B).

Without an eligible direct referrer, the referrer receives 0% and HAMLET receives 7.5%; the agent remains at 10% when attributed and reserve remains 2.5%. The reserve is an internal budget, not the actual provider fee. The 10% international USD/GBP buffer is separate and applied once. Caution deposits are excluded from markup and buffer.

The inspected `src/lib/pricing.ts` already implements the 20% allocation model and `src/lib/pricing.test.ts` includes a ₦200,000 allocation test. The reconciliation is therefore primarily documentation alignment; do not change the pricing algorithm without a demonstrated mismatch. See [Commercial Model Reconciliation](COMMERCIAL_MODEL_RECONCILIATION.md) and [Pricing & Payment Contract](PRICING_AND_PAYMENT_CONTRACT.md).

## 2. Production gates still open
1. Verify required Supabase migrations and RPCs against the intended production schema using the database release checklist.
2. Configure and verify production Paystack secrets and webhook; confirm actual payment signature, amount, currency, reference and idempotency checks.
3. Configure and verify notification provider credentials if email notifications are enabled.
4. Seed and approve real, accurate Lagos inventory. Do not use fake public listings.
5. Complete end-to-end guest, partner and admin scenarios, including failed payments, expiry, cancellations, refunds and settlement reconciliation.
6. Complete legal review, privacy disclosures, cancellation/refund policy, provider-fee policy and operational SOP/support ownership.
7. Confirm domain cutover only after preview smoke checks and owner approval; retain a tested rollback path.

## 3. Pricing-specific tests
- Base (B=₦200,000) gives a domestic guest accommodation price of ₦240,000 and a 20% pool of ₦40,000.
- With eligible referrer: agent ₦20,000, referrer ₦5,000, HAMLET ₦10,000, reserve ₦5,000.
- Without eligible referrer: agent ₦20,000, referrer ₦0, HAMLET ₦15,000, reserve ₦5,000.
- The legacy 3% fee must not appear in guest totals or settlement.
- Owner proceeds must not be reduced by the pool.
- Mandatory charges and caution deposits are excluded from pool; deposits also exclude FX buffer.
- FX buffer is applied once; provider fees are reconciled separately from the reserve.

## 4. Release decision
Commercial pricing sign-off is closed. This does not certify the application as production-ready. Do not enable live transactions or cut over the domain until the applicable technical, provider, legal, inventory and operational gates above are verified with evidence.
