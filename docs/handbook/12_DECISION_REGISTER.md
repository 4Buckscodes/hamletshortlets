# HAMLET Decision Register

**Last reviewed:** 2 November 2026  
**Status:** Reconciliation draft — founder confirmation required for items marked Awaiting decision.

This register separates current repository-recorded decisions from unresolved policy. Repository implementation is not by itself proof of founder approval.

## Approved / current working baseline

| ID | Decision | Current value | Evidence / status |
|---|---|---|---|
| D-001 | Product name | HAMLET for Your Shortlets; product of Abundance Abodes | Approved brand baseline in uploaded Business Bible and repository |
| D-002 | Core USP | “Shortlets, with accountability.” | October 2026 Build Blueprint |
| D-003 | Customer-facing line | “Your stay, sorted.” | Current repository copy; distinguish from USP |
| D-004 | Application architecture | Next.js App Router, TypeScript, Supabase | Current `hamletshortlets` main branch |
| D-005 | Initial transactional market | Lagos | Current `MVP_SPECIFICATION.md` v1.1 |
| D-006 | Abuja and Ibadan | Deferred until Lagos operations reliable | Current `MVP_SPECIFICATION.md` v1.1 |
| D-007 | Booking model | Request-to-book | Current `MVP_SPECIFICATION.md` v1.1 |
| D-008 | Legacy 3% guest-only fee | Retired; must not be charged or described as active | Commercial reconciliation and pricing contract |
| D-009 | Domestic guest price | Owner-listed accommodation base B × 1.20 | Current PRD, pricing source and tests |
| D-010 | Owner fee deduction | 0%; pool is not deducted from owner proceeds | Current PRD and pricing contract |
| D-011 | Pool allocation with eligible referrer | Closing agent 10% B; referrer 2.5% B; HAMLET 5% B; reserve 2.5% B | Current PRD and pricing contract |
| D-012 | Pool allocation without eligible referrer | Closing agent 10% B if attributed; referrer 0%; HAMLET 7.5% B; reserve 2.5% B | Current PRD and pricing contract |
| D-013 | International quote buffer | 10% USD/GBP buffer applied once to qualifying stay amount | Current pricing source/contract |
| D-014 | Caution deposit | Separately itemised; excluded from markup, FX buffer and partner/platform reward allocations | Current PRD and pricing source |
| D-015 | Public reviews | Deferred; private pilot feedback instead | Current PRD v1.1 |
| D-016 | Verification | Manual and evidence-based at MVP; do not imply title guarantee | Current PRD v1.1 |
| D-017 | Payment confirmation | Server-verified provider webhook; browser redirect/screenshot is not proof | Current payment contract and Paystack integration docs |
| D-018 | Showcase inventory | Fictional concepts must remain clearly labelled, not verified and not bookable | PR #54 merged; showcase release checklist |

## Awaiting founder / specialist decision

| ID | Decision required | Why it matters | Interim rule |
|---|---|---|---|
| O-001 | Confirm 20% pool remains the approved commercial policy | It materially replaces earlier 3% model and changes all public pricing/partner economics | Use repository v1.1 as working baseline; do not silently revise |
| O-002 | Relationship between owner-defined net-rate/fixed agent offers and 10% closing-agent allocation | Avoid double compensation and conflicting contracts | Treat as separate models until precedence and eligibility are approved |
| O-003 | Who bears provider fees and whether guest pass-through is allowed | Checkout totals, settlement and consumer disclosure | No extra provider fee until approved |
| O-004 | Who receives cleaning, utilities and other mandatory charges | Owner net, third-party settlement and tax base | Itemise separately; do not assume all belong to owner |
| O-005 | Caution-deposit custodian, collection, inspection, deductions and refund deadline | Funds custody, disputes and guest trust | Do not claim end-to-end deposit custody/refund automation is complete |
| O-006 | Nigerian tax treatment for accommodation, platform fee, owner/agent payments, Lagos/FCT and WHT | Correct collection, allocation and remittance | Configurable design only; obtain tax-professional review |
| O-007 | Cancellation, early checkout, no-show and refund matrix | Guest terms, partner obligations and ledger reversals | Require approved policy before live launch |
| O-008 | Exact meaning of each verification badge | Prevent misleading trust claims | Display only evidence actually checked |
| O-009 | Whether Lagos-only launch remains the plan | Market scope and operating coverage | Follow current Lagos-only PRD |
| O-010 | Whether owner-agent sharing offers coexist with centrally defined referral rewards | Attribution, double payment and contract terms | Separate property introducer, closing agent, direct referrer and manager roles |
| O-011 | Whether partner registration can confer any transactional authority without full partner approval | Permission and fraud risk | Network membership alone grants no privileged property/booking access |
| O-012 | Who owns support, incident response and out-of-hours escalation | Real-world guest safety and service reliability | No launch claim until named coverage and SOP exist |

## Superseded / retired

| ID | Former decision or assumption | Current treatment |
|---|---|---|
| S-001 | 3% guest-only HAMLET platform fee | Retired by 29 October 2026 commercial model |
| S-002 | Abuja and Ibadan as immediate transactional launch markets | Deferred in current MVP specification |
| S-003 | Instant booking / immediate confirmation | Not current; request-to-book with partner review and verified payment |
| S-004 | Fictional sample/showcase properties as marketplace inventory | Prohibited from live booking or verification claims |

## Change log

- 2026-11-02: Initial consolidation register created from uploaded October documents, current `hamletshortlets/main`, current MVP spec v1.1, pricing source/tests and current operational docs.
