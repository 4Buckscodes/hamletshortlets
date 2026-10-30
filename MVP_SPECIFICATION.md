# HAMLET Locked MVP Specification

**Version:** 1.1  
**Decision date:** 29 October 2026  
**Status:** Product scope locked; live-launch dependencies remain open.  
**Commercial supersession:** This version retires the 3% guest-only fee stated in v1.0. Other product scope remains unless expressly changed below.

## 1. MVP goal
Prove HAMLET can onboard legitimate shortlet properties, connect guests to suitable accommodation, facilitate real request-to-book transactions, and maintain accountability between guests, property owners and authorised partners through listing review, booking, stay, issue resolution and settlement. HAMLET is a trusted, partner-inclusive marketplace first; advanced property-management automation remains later scope.

## 2. Launch market
- Initial market: Lagos, Nigeria.
- Abuja and Ibadan remain deferred until Lagos operations are reliable.
- Supply targets are planning targets, not permission to publish unverified inventory.
- Pilot success is measured by completed bookings, trustworthy supply, reconciled transactions, issue resolution and repeat/qualified demand—not registrations alone.

## 3. Approved commercial and booking decisions
- Booking model: request-to-book.
- Payment provider: approved provider; controlled ledger and manual reconciliation where permitted.
- **Retire the legacy 3% guest-only HAMLET service fee. It must not be charged or described as active.**
- **Approved domestic model:** add a 20% commercial pool to the owner's listed accommodation base price (B). Domestic guest accommodation price is (B × 1.20).
- Owner fee deducted from (B): 0%. The pool is not deducted from owner proceeds.
- All pool percentages are percentage points of (B), not percentages of the pool or guest total.
- With a valid closing agent and eligible direct referrer: closing agent 10% of (B); direct referrer 2.5% of (B); HAMLET allocation 5% of (B); payment/settlement reserve 2.5% of (B). Total: 20%.
- Without an eligible direct referrer: referrer 0%; HAMLET allocation 7.5% of (B); closing agent remains 10% of (B) when validly attributed; reserve remains 2.5% of (B). Total: 20%.
- Referrer reward is 2.5 percentage points of the owner's base (B), not 2.5% of the pool or guest total. Eligibility, attribution, self-referral prevention and the configured referral window apply.
- The 2.5% reserve is an internal budget allocation, not the provider's actual fee. Actual provider fees must be reconciled against provider records; reserve shortfalls must not be silently deducted from owner proceeds or partner rewards.
- Disclosed mandatory charges are added separately and excluded from the 20% pool unless a future written decision changes this rule.
- Refundable caution deposits are itemised separately and receive no markup, FX buffer, agent/referral reward or HAMLET revenue allocation.
- USD/GBP quotes use configured exchange rates and one 10% international buffer applied once to qualifying stay amounts. This is separate from the domestic pool; caution deposits are excluded.
- Payment-processing-fee pass-through remains undecided. Do not add an extra provider fee at checkout until policy, provider support and disclosures are approved.
- Show itemised charges and the full guest total before commitment. No undisclosed checkout charges.
- Verification remains manual and evidence-based. Public reviews remain deferred; collect private pilot feedback.

### Example: (B = ₦200,000)
| Line | Amount |
|---|---:|
| Owner accommodation base | ₦200,000 |
| Closing agent (10%, if attributed) | ₦20,000 |
| Eligible referrer (2.5%) | ₦5,000 |
| HAMLET allocation (with referrer) | ₦10,000 |
| Payment/settlement reserve (2.5%) | ₦5,000 |
| Total pool | ₦40,000 |
| Guest accommodation price before mandatory charges/deposit | ₦240,000 |

Without an eligible referrer, referrer allocation is ₦0 and HAMLET allocation is ₦15,000; total pool remains ₦40,000. Agent and referral earnings remain subject to attribution, booking completion, cancellation and refund rules.

## 4. Release 1 scope
### Guest marketplace
Mobile-first discovery; supported search/filter; accurate property details and house rules; transparent pricing; booking requests/status; confirmed booking details and issue reporting. Do not claim live availability or public reviews unless genuinely connected.

### Property onboarding and verification
Structured submissions by owners/authorised partners; record submitter and authority; capture listing facts, photos, prices, availability and evidence; duplicate checks and manual review states; only approved, non-suspended listings are public. A checked box is not proof of title or document validity.

### Partner Network
One registration/sign-in experience for owners, agents, property managers, operators, co-hosts and referral partners. Role-based access, partner approval, explicit property assignment/revocation and access limited to authorised properties, permitted booking data and agreed commissions. Public registration never grants admin access.

### Booking lifecycle
Requested → availability/terms review → accepted/awaiting payment with deadline → confirmed only after verified provider payment and final availability checks → completed/cancelled/expired/refunded/disputed as applicable. Prevent overlapping confirmed bookings; expire overdue holds; browser redirects, screenshots and uploaded receipts are not proof of payment.

### Payments and records
Use server-verified, idempotent provider callbacks/webhooks. Ledger must record booking reference, pricing-rule version, base, pool allocations, provider charges, deposits, refunds, status and reconciliation differences. Keep owner proceeds, 20% allocations, actual provider charges, deposits and cancellation/refund adjustments distinct. Do not assume HAMLET may hold customer funds or build an internal wallet.

### Admin, security and privacy
Admin review of properties/partners/bookings/refunds/issues; evidence-based issue handling; audited status/permission/financial changes; server/database-enforced permissions; server-only provider secrets; data minimisation, retention and breach procedures; meaningful loading/error/pending states.

## 5. Explicitly deferred
Instant booking and advanced calendar sync; public reviews; AI listing/document/fraud automation; dynamic pricing and advanced analytics; broader cleaning/maintenance marketplace and loyalty; Abuja/Ibadan expansion; provider-fee pass-through until policy and provider support are approved.

## 6. Central pricing rule
Use one shared pricing authority for search, property, partner previews, booking, checkout, receipts, dashboards and server-side quotes. Inputs: discounted accommodation base (B), mandatory charges, deposit, attribution eligibility and quote currency/configuration. Outputs: 20% pool, each allocation, mandatory charges, deposit, FX buffer/expiry where relevant, guest total and owner proceeds. Never duplicate formulas in UI or trust client-submitted totals. Store the rules version and auditable allocation data.

## 7. Launch dependencies
1. Nigerian legal review of marketplace role, agreements, fee disclosures, cancellation/refund/no-show/damage rules and applicable Lagos requirements.
2. Provider onboarding and confirmation of supported settlement/fee handling.
3. Written provider-fee policy, including taxes and payment-method differences.
4. Privacy notice, access/retention controls and applicable NDPA/NDPC review.
5. SOP for availability, check-in, support, refunds, chargebacks, owner settlement and partner rewards.
6. Support coverage and escalation ownership.
7. Production configuration, admin provisioning, migration review, backups and end-to-end tests.
8. Test pool attribution, completion milestones, cancellation/refund reversals and ledger reconciliation.

## 8. Implementation order
Stabilise branch and tests; verify Supabase/auth/roles; finish property intake/review; verify booking lifecycle/overlap; verify central 20% pricing, pool, payment and ledger; finish refunds/issues/audit; run test-mode end-to-end guest/partner/admin scenarios; complete legal/payment/privacy/operations sign-off before live Lagos pilot.

## 9. Acceptance criteria
- Unapproved/suspended/duplicate listings cannot be published as approved.
- Partners see only authorised properties/data.
- Booking requests are not prematurely confirmed and overlapping confirmed bookings are prevented.
- Only verified provider webhook can confirm payment.
- All surfaces and server quotes use the same central calculation.
- Guest accommodation price is (B + 20\% × B); no active 3% fee.
- Allocations reconcile to 20% of (B): agent 10% when attributed, referrer 2.5% when eligible, HAMLET 5% with eligible referrer or 7.5% without, reserve 2.5%.
- Owner fee is 0%; pool does not reduce owner proceeds.
- Mandatory charges and deposits remain separate; deposit receives no markup or FX buffer.
- FX buffer applies once; provider fee is not silently charged twice or while undecided.
- Payments, refunds, disputes and adjustments are auditable; access/security/privacy controls and end-to-end tests pass.
- Product makes no false claims about inventory, availability or verification.

## 10. Product honesty
Do not present sample properties as real inventory, imply live availability or claim verification not completed. The interface may be polished, but must truthfully represent connected and operational features.
