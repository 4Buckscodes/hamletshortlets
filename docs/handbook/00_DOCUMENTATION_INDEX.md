# HAMLET Documentation Handbook v2.0

**Last reviewed:** 2 November 2026  
**Status:** Under consolidation — not yet approved as the final handbook.

This handbook is the canonical documentation set for HAMLET for Your Shortlets, a product of Abundance Abodes. It is maintained alongside the application repository and must describe approved policy and evidenced implementation separately.

## Read in this order

| Document | Purpose | Authority |
|---|---|---|
| [Audit & Reconciliation Register](AUDIT_AND_RECONCILIATION_REGISTER.md) | Baseline, conflicts, evidence, open questions and consolidation plan | Audit control |
| [Business Bible](01_BUSINESS_BIBLE.md) | Strategy, brand, market, customers and business model | Strategic |
| [Product Requirements](02_PRODUCT_REQUIREMENTS.md) | User roles, journeys, requirements, rules and acceptance criteria | Product |
| [Technical Architecture](03_TECHNICAL_ARCHITECTURE.md) | Application, integrations, security boundaries and system behaviour | Engineering |
| [Data Model & Database](04_DATA_MODEL_AND_DATABASE.md) | Entities, migrations, RLS, RPCs, storage and retention | Data/engineering |
| [Financial Pricing & Ledger](05_FINANCIAL_PRICING_AND_LEDGER.md) | Pricing rules, partner allocations, payments and reconciliation | Commercial/engineering |
| [Tax & Legal Rules](06_TAX_AND_LEGAL_RULES.md) | Tax decision framework, legal questions and release gates | Legal/compliance |
| [Partner Network & Commercial Terms](07_PARTNER_NETWORK_AND_COMMERCIAL_TERMS.md) | Partner roles, authorisation, attribution, rewards and owner agreements | Commercial/operations |
| [Booking, Stay & Claims Operations](08_BOOKING_STAY_AND_CLAIMS_OPERATIONS.md) | Booking lifecycle, caution deposits, cancellations, incidents and refunds | Operations |
| [Security, Privacy & Trust](09_SECURITY_PRIVACY_AND_TRUST.md) | Identity, listing verification, data protection, access and abuse controls | Trust/security |
| [Go-to-Market & Growth](10_GO_TO_MARKET_AND_GROWTH.md) | Supply, demand, pilot, marketing, metrics and expansion | Growth |
| [Release Operations Runbook](11_RELEASE_OPERATIONS_RUNBOOK.md) | Environment, deployment, rollback, payment and launch gates | Operations/engineering |
| [Decision Register](12_DECISION_REGISTER.md) | Approved, open, superseded and retired decisions | Governance |
| [Roadmap & Scope](13_ROADMAP_AND_SCOPE.md) | MVP, later releases, deferred and excluded capabilities | Product |
| [Requirements Traceability](14_REQUIREMENTS_TRACEABILITY.md) | Requirement-to-code/schema/test/evidence status | Governance/QA |

Documents marked “under consolidation” are planned canonical files and may not yet exist in this branch. Existing focused runbooks in `docs/` remain operational references until the corresponding handbook section supersedes them.

## Source-of-truth rules

1. Founder-approved dated decisions determine business policy.
2. The PRD determines intended product behaviour.
3. Code, database migrations and tests establish implementation evidence, not business approval.
4. Live provider, infrastructure and database observations must be dated and reverified before operational use.
5. Legal/tax statements require current qualified review; do not infer compliance from code.
6. Open pull requests are proposals, not current production functionality.
7. Retired policies remain in history but must not be presented as active.

## Status labels

- **Implemented — verified:** code/schema plus relevant test or live evidence checked.
- **Implemented — unverified:** code/schema exists; sufficient behaviour evidence not checked.
- **Partially implemented:** only part of the required workflow exists.
- **Planned:** approved but not built.
- **Awaiting decision:** requires founder, commercial, legal or operational choice.
- **Blocked:** depends on missing external approval, configuration or prerequisite.
- **Retired:** superseded and no longer active.

Every status should include a date and evidence reference. Do not use “complete” without proof.

## Change control

Update the decision register and affected requirements whenever a material price, fee, role, permission, tax rule, booking state, payment flow, launch market or feature scope changes. Keep one canonical definition for each commercial formula and link to it rather than copying competing versions.
