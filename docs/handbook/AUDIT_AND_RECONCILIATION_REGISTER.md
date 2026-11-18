# HAMLET Documentation v2.0 — Audit & Reconciliation Register

**Audit date:** 2 November 2026  
**Repository audited:** `4Buckscodes/hamletshortlets`  
**Audited baseline:** `main` at `5d890a62466d283a1e9f4e2c807588de7f03a22c`  
**Documentation branch:** `docs/v2-reconciliation-nov-2026`  
**Status:** Audit in progress. This register is not a declaration that every feature is complete or every commercial/legal question is settled.

## 1. Purpose

This register is the control document for consolidating HAMLET's business, product, engineering, financial, operational, legal and go-to-market documentation. It records source conflicts, evidence, confidence and required actions. It must be updated as each document is reconciled.

## 2. Source hierarchy

When sources conflict, use this order, while preserving a record of superseded decisions:

1. Explicit, dated founder decisions recorded in the project decision register or confirmed directly by the founder.
2. Current approved product/commercial specification.
3. Current application code, database migrations and tests for **implementation status only** (code does not independently approve a business policy).
4. Current operating/release runbooks.
5. Earlier PRDs, blueprints, business plans and discussion drafts.
6. Historical website copy, prototypes and unmerged pull requests.

A code implementation is not proof of legal compliance, operational readiness, payment-provider approval or founder approval. An unmerged PR is not part of the production baseline.

## 3. Repository and implementation baseline

The active application repository is `4Buckscodes/hamletshortlets`, default branch `main`. It contains the Next.js App Router application, Supabase migrations, server routes, partner/admin workspaces, Paystack Edge Functions, central pricing code, tests and release documentation.

The older `4Buckscodes/hamlet` repository is a separate, earlier Vite prototype and must be treated as historical unless a later explicit decision reactivates it.

### Evidence observed on the audited main branch

- Current product specification: `MVP_SPECIFICATION.md` v1.1, dated 29 October 2026.
- Current app architecture: Next.js App Router, TypeScript, Supabase; the old `NEXTJS_MOBILE_FIRST_REBUILD.md` remains a migration-plan document and contains historical baseline statements that should not be mistaken for current architecture.
- Pricing authority: `src/lib/pricing.ts`; pricing tests: `src/lib/pricing.test.ts`.
- Booking request server route: `app/api/booking-requests/route.ts`.
- Partner property submission server route: `app/api/partner/properties/route.ts`.
- Paystack Edge Functions exist at `supabase/functions/paystack-initialize` and `supabase/functions/paystack-webhook`.
- Supabase migration history in source control extends through `20261031100000_immediate_partner_network_registration.sql`. Source-controlled migrations do not prove that every migration is applied to production.
- Existing documentation includes pricing/payment, commercial reconciliation, database release, Paystack, deployment/rollback, route parity, partner network registration and Lagos showcase release checklists.

### Pull-request baseline observed

- PR #54, “Launch non-bookable Lagos property showcase catalogue”, is merged (2 November audit).
- PR #55, “Show selected Lagos showcase properties on homepage”, was open at audit time.
- PR #56, “Turn empty guest marketplace into an early-access journey”, was open at audit time.
- These open PRs are not included in the audited `main` baseline. Re-audit after merge; do not describe their features as live until merged and verified.

## 4. Current approved product/commercial baseline found in repository

The current `MVP_SPECIFICATION.md` v1.1 records:
- Lagos as the initial transactional market.
- Abuja and Ibadan deferred until Lagos operations are reliable.
- Request-to-book as the booking model.
- The legacy 3% guest-only fee retired.
- A domestic 20% pool added to owner-listed accommodation base price B; owner fee deduction is 0%.
- Allocation with eligible direct referrer: closing agent 10% of B, referrer 2.5% of B, HAMLET 5% of B, reserve 2.5% of B.
- Without eligible referrer: closing agent 10% of B when attributed, referrer 0%, HAMLET 7.5% of B, reserve 2.5% of B.
- A separate 10% USD/GBP international quote buffer applied once to qualifying stay amounts.
- Mandatory charges excluded from the pool; refundable caution deposits separately itemised and excluded from markup, FX buffer and rewards.
- Payment-provider fee pass-through remains undecided.
- Manual/evidence-based verification; public reviews deferred.

These are **repository-recorded commercial decisions**. Confirm that they remain the founder-approved policy before treating the rewritten Business Bible and PRD as final. The pricing engine and tests are implementation evidence, not a substitute for this confirmation.

## 5. Documentation inventory and required treatment

| Existing source | Current role | Required action |
|---|---|---|
| Original Business Bible v1.0 (uploaded DOCX) | Historical strategy/brand/business narrative | Rewrite as v2.0; reconcile Lagos-first scope, product category, role of partners, current pricing, brand ecosystem and operating-system ambition. |
| Original MVP PRD v1.0 (uploaded DOCX) | Historical functional requirements | Supersede with PRD v2.0 based on current app, data model, API, migrations, tests and approved policies. |
| MVP Build Blueprint v1.1 (uploaded DOCX) | Scope-control and interim founder decisions | Preserve its agent, duplicate-property, caution-deposit, cancellation and audit requirements; reconcile against current v1.1 spec and mark gaps. |
| Market Validation & December Launch Plan v1.0 (uploaded DOCX) | Historical 2026 launch plan | Retire expired October/November/December 2026 milestones; convert to a rolling Lagos supply, pilot and demand plan with evidence-based gates. |
| `MVP_SPECIFICATION.md` v1.1 | Current repo product/commercial spec | Promote to PRD v2.0 after implementation and founder-decision reconciliation. |
| `NEXTJS_MOBILE_FIRST_REBUILD.md` | Historical migration plan | Archive as completed migration record or replace status with current architecture and route inventory. |
| `docs/COMMERCIAL_MODEL_RECONCILIATION.md` | Commercial decision record | Retain; add unresolved commercial/tax/custody decisions and implementation evidence. |
| `docs/PRICING_AND_PAYMENT_CONTRACT.md` | Pricing/payment rules | Retain as technical commercial contract; reconcile any code/ledger discrepancies. |
| `docs/DATABASE_RELEASE_CHECKLIST.md` | Database release operations | Verify migration IDs and production state; clearly date environment observations. |
| `docs/DEPLOYMENT_AND_ROLLBACK.md` | Infrastructure runbook | Re-audit current Vercel/domain/Supabase settings; old observations must not be represented as current without verification. |
| `docs/PAYSTACK_CONNECTION_CHECKLIST.md` | Provider integration and live-use gate | Re-verify Paystack merchant approval, secret configuration, webhook delivery, fund flow and settlement permissions. |
| `docs/ROUTE_PARITY.md` | Route inventory/parity | Re-audit every route against `app/**`, current role guards, APIs and live behaviour. |
| `docs/LAGOS_SHOWCASE_RELEASE_CHECKLIST.md` and showcase JSON | Showcase preview governance | Keep fictional concepts separate from real inventory; update PR/merge status and preview behaviour after PR #54/#55/#56. |
| `docs/PARTNER_NETWORK_REGISTRATION.md` | Partner membership workflow | Expand into complete partner roles, progressive verification, permissions, property assignment, referrals and deal model. |

## 6. Confirmed gaps and reconciliation risks

### 6.1 Product and market
- The original launch plan names Lagos, Abuja and Ibadan; current MVP specification is Lagos-only and defers Abuja/Ibadan.
- Old documents describe broad ambitions and features that may not be part of the transactional MVP. Separate launch-critical requirements from roadmap ambitions.
- The original December 2026 calendar is now a dated historical plan. Replace it with a rolling launch plan, not revised dates copied forward.
- The user-facing brand line “Your stay, sorted.” is present in current repo copy; “Shortlets, with accountability.” remains the core USP in the October blueprint. Distinguish tagline, campaign line and USP.

### 6.2 Partner and agent model
- Current code/domain model uses a broad partner account with partner-role values including owner, agent, property manager, shortlet operator, co-host and referral.
- The Build Blueprint requires owner-authorised property access, deal offers, separate property-sourced-by / guest-referred-by / property-managed-by attribution and no duplicate public listing.
- The current MVP spec contains partner permissions and attribution at a high level; confirm which deal-offer/net-rate workflows are implemented versus still planned.
- Do not collapse closing-agent commission, direct-referrer reward, property introducer reward, manager compensation and owner-agent negotiated sharing into one generic “commission”.

### 6.3 Pricing, booking and ledger
- The current pricing tests cover 20% markup, allocation examples, mandatory charges, caution deposit, FX and Paystack fee estimates.
- The test expectation for `ownerProceeds` in a sample with mandatory charges must be reviewed against the commercial contract: clarify whether mandatory charges belong to the owner, a service provider or another payee.
- The booking request API currently selects nightly rate, cleaning fee and refundable deposit. Verify whether all configured mandatory charges are persisted and included in server-side quotes, not merely in UI or type definitions.
- Confirm that closing-agent/referrer allocations are snapshotted at booking creation and flow into the payment/settlement ledger exactly once.
- Verify actual provider fee treatment separately from the internal 2.5% reserve and any optional guest pass-through.
- Confirm quote currency, expiry, rate source, refresh rules and NGN settlement semantics.
- The current spec states request-to-book; do not describe bookings as instantly confirmed.

### 6.4 Caution deposits and operations
- The current domain model includes separate caution-deposit states and the spec excludes deposits from markup/rewards.
- The uploaded Build Blueprint calls for condition evidence, inspection, damage deductions, guest response, dispute handling and refund tracking.
- Verify the actual database schema, admin/partner/guest screens and audit trail support the complete workflow. Do not call the deposit workflow complete based only on type definitions or a UI status.
- Custody/holder of funds, permitted deductions, refund timing and treatment of disputed deposits require an explicit operational and legal decision.

### 6.5 Tax and legal
- The inspected product specification and pricing contract do not yet establish a complete jurisdiction-aware tax engine or approved tax allocation rules.
- Do not hard-code VAT, Lagos hospitality/consumption tax, withholding tax or FCT charges as universally applicable to every shortlet.
- Add a tax/legal rules section with configurable jurisdiction, supply classification, taxpayer type, effective date, taxable base, exemptions, collection party, remittance party and evidence. Keep every tax rate/classification subject to current Nigerian tax-professional and authority confirmation.
- Separate guest-facing accommodation charges, HAMLET's own platform/service supply, owner/agent income, withholding deductions, company tax obligations and refundable deposit liabilities.
- Tax treatment is an open legal/accounting decision, not a completed software feature.

### 6.6 Payments and compliance
- Existing Paystack docs state that the existence of a live key/webhook does not establish permission for marketplace aggregation or third-party fund distribution.
- Written provider approval for the exact marketplace flow, settlement model, refunds, chargebacks and custody must remain a hard release gate.
- A booking receipt, browser redirect, uploaded screenshot or admin ledger record is not proof that funds were received or refunded.
- No internal wallet or custody model should be inferred from the existence of a ledger.

### 6.7 Technical and release documentation
- The current route parity matrix labels many routes “Complete”; independently verify route existence, auth, RLS, API behaviour and tests before preserving that label.
- The current database checklist contains project-specific commands and migration-repair history. Revalidate against the actual current production migration ledger before executing anything.
- The deployment runbook contains dated environment observations and a domain cutover status. Refresh through read-only inspection before changing it.
- The old rebuild plan's “current baseline” is historical Vite architecture, not the current Next.js app.
- The repository contains a very large `CODE_CHANGES.md`; determine whether it is a generated change log, archive, or operational source before treating it as authoritative documentation.

## 7. Documentation v2.0 target set

Create and maintain the following canonical files under `docs/handbook/` (or equivalent agreed structure):

1. `00_DOCUMENTATION_INDEX.md` — hierarchy, ownership, status and links.
2. `01_BUSINESS_BIBLE.md` — strategy, brand, market, customer, value proposition, business model.
3. `02_PRODUCT_REQUIREMENTS.md` — full PRD, user journeys, roles, permissions, requirements and acceptance criteria.
4. `03_TECHNICAL_ARCHITECTURE.md` — current architecture, services, APIs, data flow, security boundaries.
5. `04_DATA_MODEL_AND_DATABASE.md` — ERD/domain model, migrations, RLS, RPCs, storage and data retention.
6. `05_FINANCIAL_PRICING_AND_LEDGER.md` — pricing engine, allocations, booking money flows, provider charges, reconciliation.
7. `06_TAX_AND_LEGAL_RULES.md` — tax decision framework, jurisdiction rules, legal questions, compliance gates; no unverified tax conclusions.
8. `07_PARTNER_NETWORK_AND_COMMERCIAL_TERMS.md` — partner roles, owner authority, agent offers, attribution, rewards and settlements.
9. `08_BOOKING_STAY_AND_CLAIMS_OPERATIONS.md` — booking lifecycle, caution deposit, check-in/out, incidents, cancellations, refunds and disputes.
10. `09_SECURITY_PRIVACY_AND_TRUST.md` — identity, property evidence, RLS, privacy, audit, abuse and incident controls.
11. `10_GO_TO_MARKET_AND_GROWTH.md` — supply acquisition, demand, pilot, city rollout, channels, metrics.
12. `11_RELEASE_OPERATIONS_RUNBOOK.md` — environments, deployment, rollback, payment-provider operations, release gates.
13. `12_DECISION_REGISTER.md` — approved, open, superseded and rejected decisions with owner/date/evidence.
14. `13_ROADMAP_AND_SCOPE.md` — MVP, post-MVP, later and explicitly out-of-scope capabilities.
15. `14_REQUIREMENTS_TRACEABILITY.md` — requirement → UI/API/schema/migration/test/evidence/status matrix.

Keep focused operational checklists in `docs/` and link them from the handbook. Avoid maintaining duplicate commercial formulas in multiple documents; the pricing/payment contract must point to one canonical rule.

## 8. Status vocabulary

Every material capability and requirement must use one of these labels:

- **Implemented — verified:** observed in current code/schema and supported by passing relevant tests or documented live evidence.
- **Implemented — unverified:** code/schema exists, but no sufficient test/live evidence has been checked.
- **Partially implemented:** some but not all required workflow steps exist.
- **Planned:** approved requirement, not implemented.
- **Awaiting decision:** product/commercial/legal/operational choice is unresolved.
- **Blocked:** implementation depends on a missing external approval, credential, migration or operational prerequisite.
- **Retired:** deliberately superseded; retain history, do not use as current policy.

“Complete” must not be used without evidence and a date.

## 9. Decisions requiring founder confirmation

These items are not to be silently resolved by documentation editing:

1. Confirm that the 29 October 2026 20% domestic pool model is the current approved commercial policy and remains the active pricing baseline.
2. Confirm whether the current partner closing-agent 10% allocation supersedes or coexists with owner-defined property-specific net-rate/fixed-sharing offers described in the Build Blueprint. Define precedence and prevent double compensation.
3. Confirm whether the 2.5% reserve is solely an internal budget or may be used to fund actual provider costs, and decide who bears any excess provider fees. Guest pass-through remains open in current repo docs.
4. Confirm whether mandatory charges are always passed to the owner or may be payable to cleaners, utilities or other third parties; define who receives them and their tax treatment.
5. Confirm caution-deposit holder/custodian, collection route, inspection evidence standard, deduction approval, dispute process and refund deadline.
6. Confirm tax responsibility and allocation only after Nigerian tax advice for accommodation supply, platform services, Lagos/FCT rules, WHT and owner/agent arrangements.
7. Confirm whether Abuja and Ibadan remain deferred from transactional launch.
8. Confirm the approved cancellation, early checkout, no-show and refund matrix.
9. Confirm whether property verification is manual-only at launch and exactly what each “verified” label means (identity, authority, ownership evidence, inspection).
10. Confirm whether public reviews remain deferred and private pilot feedback is the only launch feedback mechanism.

## 10. Execution plan

### Phase A — Audit (this document)
- [x] Identify original uploaded documents.
- [x] Identify active application repository and default branch.
- [x] Inspect current MVP specification, pricing contract, pricing source/tests, key booking/partner API paths, payment integration docs and current migration inventory.
- [x] Identify open pull requests affecting guest marketplace/showcase experience.
- [ ] Complete migration/RLS/RPC and full route inventory audit.
- [ ] Verify production deployment and database facts through read-only checks.
- [ ] Complete founder decision confirmations.

### Phase B — Canonical handbook
- [ ] Create the canonical handbook index and decision register.
- [ ] Draft Business Bible v2.0 and PRD v2.0.
- [ ] Draft engineering, data, financial, tax/legal, partner and operations handbooks.
- [ ] Convert the expired launch plan into a rolling go-to-market plan.
- [ ] Build requirement traceability against current code/schema/tests.

### Phase C — Validation and publication
- [ ] Cross-check all cross-document figures, states, role names and policies.
- [ ] Mark every implementation status with evidence/date.
- [ ] Run documentation link/consistency checks.
- [ ] Open a review PR; do not merge to `main` or deploy without explicit approval.
- [ ] Export approved standalone DOCX versions only after the canonical Markdown content is stable.

## 11. Change control

Any new feature, price, fee, partner reward, tax rule, payment state, permission or launch-market change must:
1. be entered in the decision register;
2. identify affected requirements, schema, APIs, UI, tests and operational procedures;
3. be approved by the correct decision owner;
4. update the canonical document first or in the same change as implementation;
5. include migration/backward-compatibility and release notes where relevant.

The handbook describes HAMLET as it is approved and evidenced today—not as a wishlist and not as an aspirational future state.
