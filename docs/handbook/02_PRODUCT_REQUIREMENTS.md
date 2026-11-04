# HAMLET Product Requirements Document v2.0

**Version:** 2.0 draft  
**Last reconciled:** 2 November 2026  
**Product:** HAMLET for Your Shortlets  
**Parent:** Abundance Abodes  
**Status:** Draft; acceptance criteria and implementation labels require engineering/QA verification.

## 1. Product objective

Deliver a Lagos-first, mobile-first shortlet marketplace with accountable partner workflows. The MVP must reliably support authorised property onboarding, listing review, public discovery, request-to-book, verified payment status, guest/partner/admin operations and traceable financial records.

The north-star outcome is completed, reconciled bookings—not registrations, visits or raw listing count.

## 2. Product scope and boundaries

### In scope for the transactional MVP
- Guest, partner and admin authentication/permissions.
- Partner network membership and separate privileged partner approval.
- Owner/authorised partner property submission and updates.
- Property evidence review, publication controls and public-safe listing data.
- Duplicate-risk review and canonical property identity.
- Lagos discovery, property detail and transparent price presentation.
- Date-based booking request and availability checks.
- Partner review/acceptance and time-bounded payment window.
- Provider checkout initialization and verified webhook confirmation.
- Guest account/booking status and partner booking/availability/earnings views.
- Admin queues for properties, partners, bookings, issues and settlements.
- Basic notifications and private pilot feedback.
- Audit logging and financial reconciliation records.

### Deferred or not promised at launch
- Instant booking.
- Public guest reviews.
- Automated legal/title verification or AI fraud decisions.
- Advanced dynamic pricing and channel-manager calendar sync.
- Advanced property-management accounting.
- Cleaning/maintenance vendor marketplace.
- Wallet, escrow or custody of third-party funds without legal/provider approval.
- Abuja/Ibadan transactional launch before Lagos readiness.
- Tax automation before approved tax rules and accounting requirements exist.

## 3. Roles and access

| Role/capability | Intended access | Restrictions |
|---|---|---|
| Guest | Public discovery; own profile, booking, payment status and issue records | No owner/partner private data or other guests' records |
| Partner network member | Own network membership and approved public information | Membership alone grants no privileged partner role or property access |
| Approved partner | Assigned properties, allowed booking/availability tasks, eligible earnings and referrals | Server-side checks; only within owner-authorised scope |
| Owner | Own properties, listing facts, pricing/availability, authorisations, bookings and settlement visibility | Cannot bypass review or admin approval |
| Authorised manager/co-host/operator | Explicitly assigned operational scope | Cannot change owner commercial terms unless separately authorised |
| Closing agent | Eligible booking/closing activity and attributed earnings | Cannot claim duplicate listings or change property terms without authority |
| Referrer/property introducer | Referral attribution and eligible reward visibility | Must not access private property/guest records without separate permission |
| Admin/operations | Review, moderation, issue and transaction operations | Sensitive actions require role enforcement, reason and audit trail |

One person may have multiple capabilities. Keep property introducer, closing agent, direct referrer, manager and owner identities separately attributable.

## 4. Primary journeys

### 4.1 Guest discovery and booking
1. Guest opens public Lagos marketplace.
2. Guest searches or browses approved properties.
3. Guest reviews facts, location context, capacity, amenities, rules, availability confidence, itemised charges, caution deposit and cancellation terms.
4. Guest signs in and submits requested dates/guest count.
5. Server validates property approval, account, capacity, dates and calendar conflicts; calculates price from trusted property data.
6. Booking enters `requested`; guest is told the partner must review dates.
7. Authorised partner reviews and accepts/declines or requests clarification.
8. Acceptance opens a time-bounded `awaiting_payment` state.
9. Guest completes provider checkout.
10. Server verifies signed provider webhook, reference, amount, currency and idempotency; only then may booking become `confirmed`.
11. Guest receives confirmation and can access stay details and issue reporting.
12. After stay, booking may be completed; eligible feedback and settlement records are updated.

### 4.2 Partner onboarding
1. User creates/signs into account.
2. User may join the partner network with a declared primary capability.
3. Network membership is recorded separately from privileged partner approval.
4. Where a privileged partner application is required, admin reviews it.
5. Partner receives access only to assigned properties and approved workflows.
6. Partner may submit a property only with recorded authority; admin review is required before publication.
7. Suspension/revocation blocks relevant access and is audited.

### 4.3 Property submission and review
- Capture property facts, exact/internal address, public-safe location, photos and asset provenance, capacity, amenities, house rules, nightly rate, mandatory charges, caution deposit and calendar responsibility.
- Record owner, submitter, authority basis and assigned partners.
- Check duplicates using normalized location, coordinates, building/unit identity, attributes and image similarity where available.
- Similarity is a review signal, not automatic proof. Do not create a second public listing while an ambiguous match is unresolved.
- Admin records evidence outcomes and a review reason. Only approved and non-suspended records are public.
- A “verified” label must name the evidence dimension actually checked.

### 4.4 Partner property operations
- Partner sees assigned properties only.
- Availability updates/blocks are restricted to authorised roles.
- Booking decisions are limited to assigned property and permitted status transitions.
- Deal terms, partner attribution and earnings must be visible before acceptance where relevant.
- Revocation removes access without deleting historical attribution or financial records.

## 5. Booking lifecycle and invariants

Repository status vocabulary includes:
`requested`, `checking`, `awaiting_payment`, `confirmed`, `completed`, `cancelled`, `expired`, `refunded`, `disputed`, `declined`, `no_show`.

Required invariants:
- Request does not mean confirmation.
- Partner acceptance does not mean payment.
- Only server-verified provider event confirms payment.
- Browser return, screenshot or uploaded receipt cannot confirm payment.
- Payment hold has a deadline; expired holds must not block inventory indefinitely.
- Overlapping active holds/confirmed bookings must be prevented under concurrency.
- All state transitions are permission-checked and auditable.
- Duplicate webhooks and retries must be idempotent.
- Refund and cancellation state must reconcile to actual provider events, not only admin notes.

## 6. Pricing and financial display

See [Financial Pricing & Ledger](05_FINANCIAL_PRICING_AND_LEDGER.md) and `docs/PRICING_AND_PAYMENT_CONTRACT.md` for the sole commercial formula.

Display separately:
- accommodation base and stay duration;
- domestic HAMLET markup/pool;
- each mandatory charge and its payee/recipient where known;
- applicable statutory tax only when a validated rule applies;
- refundable caution deposit and its conditions;
- international quote and expiry where relevant;
- provider fee only if an approved pass-through policy is activated;
- full amount due now and amount refundable/conditionally refundable.

Never describe the internal 2.5% reserve as the actual provider fee. Never silently deduct HAMLET charges from owner or agent allocations. Do not mark refundable deposits as platform revenue.

## 7. Tax requirements

The MVP must preserve sufficient transaction facts for correct tax treatment, but the current repository does not evidence a complete tax engine. Tax rates and applicability are not to be hard-coded from generic assumptions.

Future/required design must support jurisdiction, supply classification, taxable base, payer, collector, remitter, recipient taxpayer type, exemption/threshold, effective date, tax rule version, withholding credit, refund/reversal and remittance evidence. Launch tax rules require current professional review.

## 8. Caution deposit requirements

- Deposit is set per property by owner/authorised party.
- Amount, collection timing, refund conditions and damage process are disclosed before commitment.
- Deposit is separate from accommodation price, pool, owner earnings and platform revenue.
- Record who receives/holds the funds and the actual provider reference.
- Check-in/check-out condition evidence must be timestamped and property-specific.
- Damage deductions require evidence, documented reason, guest response opportunity and authorised review; ordinary wear and tear must not be treated as damage.
- Record full/partial refund, dispute, deadline, actual payment execution and audit trail.
- Custody, permissible deductions and refund deadlines are awaiting legal/operational confirmation.

## 9. Cancellation, refunds and incidents

A final cancellation/refund matrix is still awaiting founder and legal/operational approval. The system must support policy version snapshot per booking, request date/time, reason, refund calculation, authorised decision, provider execution reference, ledger reversal and guest notification. Early checkout, no-show, property unavailability, safety incident and payment dispute must not be treated as one generic cancellation reason.

Issue reporting must support booking linkage, category, description, evidence, severity, status, assigned owner, timestamps, resolution and escalation. Define response service levels before making public support promises.

## 10. Admin and governance requirements

Admin capabilities include property review, partner approval/network oversight, booking oversight, issues, refunds/settlement records and audit review. High-impact actions must capture actor, time, reason and before/after values where appropriate. Admin screens must distinguish actual provider action from a manual ledger record.

## 11. Non-functional requirements

- Mobile-first, accessible, responsive and usable on slower connections.
- Secure server-side authorization and database RLS.
- Least-privilege access and no service-role/payment secrets in client bundles.
- Data minimisation, retention and deletion procedures.
- Reliable error/loading/empty/pending states.
- Structured logs and auditable financial events.
- SEO metadata on public pages; private workspaces excluded from indexing.
- Automated unit, integration, database and end-to-end tests for high-risk workflows.
- Backups and rehearsed rollback for production schema changes.

## 12. Acceptance criteria and implementation status

The canonical row-by-row traceability status is in [Requirements Traceability](14_REQUIREMENTS_TRACEABILITY.md). No capability may be labelled implemented/complete solely because a route or type exists. Evidence must include relevant source, migration/RLS/RPC, tests or dated live validation.

## 13. Out of scope / future roadmap

AI-assisted listing preparation; automated document/fraud screening; public reviews; instant booking; dynamic pricing; channel-manager integrations; advanced owner accounting; cleaning/maintenance marketplace; loyalty; multi-city expansion; additional currency/payment methods; owner command-centre extensions. These require explicit prioritisation and do not block the core Lagos booking loop unless a specific safety or compliance dependency is identified.

## 14. Open product decisions

See [Decision Register](12_DECISION_REGISTER.md), especially:
- owner-defined fixed/net-rate offers versus the central 10% closing-agent allocation;
- provider-fee pass-through;
- mandatory-charge payees;
- caution-deposit custody and refund rules;
- cancellation/no-show/early-checkout matrix;
- exact verification badge definitions;
- tax rules and responsibilities;
- named support ownership and escalation.
