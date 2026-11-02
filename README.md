# HAMLET.REST — Verified Lagos Shortlets Marketplace

**Tagline:** *Your stay, sorted.*  
**Parent Brand:** Abundance Abodes (Lagos, Nigeria)  
**Primary Architecture:** Next.js App Router + TypeScript + Tailwind CSS + Supabase.

## Overview
HAMLET.REST is a verification-led shortlet marketplace for Lagos. It supports public discovery, guest booking requests, partner property workflows, and admin operations for listing review, booking oversight, issue resolution and ledger reconciliation.

## Commercial model
The approved domestic model adds a **20% pool to the owner's listed accommodation base price**. The legacy 3% guest-only fee is retired. Pool allocation, the 2.5% referrer reward, reserve treatment and international FX buffer are specified in [MVP_SPECIFICATION.md](MVP_SPECIFICATION.md) and [docs/PRICING_AND_PAYMENT_CONTRACT.md](docs/PRICING_AND_PAYMENT_CONTRACT.md). Provider-fee pass-through remains a separate unresolved launch decision.

## Documentation
The consolidated **HAMLET Documentation Handbook v2.0** is being prepared in [docs/handbook/](docs/handbook/00_DOCUMENTATION_INDEX.md). Start with the [documentation index](docs/handbook/00_DOCUMENTATION_INDEX.md) and [audit/reconciliation register](docs/handbook/AUDIT_AND_RECONCILIATION_REGISTER.md). These documents are drafts until reviewed and approved.

## Local development
1. Copy `.env.example` to `.env.local` and configure the required Supabase credentials.
2. Run `npm ci`.
3. Run `npm run dev`.

## Quality commands
```bash
npm run lint
npm test
npm run build
npm run test:e2e
```

## Product and release documentation
- [MVP Specification](MVP_SPECIFICATION.md) — current repository product/commercial specification.
- [Commercial Model Reconciliation](docs/COMMERCIAL_MODEL_RECONCILIATION.md) — commercial decision record.
- [Pricing & Payment Contract](docs/PRICING_AND_PAYMENT_CONTRACT.md) — authoritative calculation, allocation, FX and payment integrity rules.
- [Release Readiness](docs/RELEASE_READINESS.md) — evidence-based production gates.
- [Route Parity](docs/ROUTE_PARITY.md) — legacy to Next.js parity record.
- [Database Release Checklist](docs/DATABASE_RELEASE_CHECKLIST.md) — migration review and verification.
- [Deployment & Rollback](docs/DEPLOYMENT_AND_ROLLBACK.md) — deployment and rollback procedure.

A successful build alone does not establish production readiness. Real approved inventory, production provider configuration, payment tests, legal/operations sign-off and reconciled financial records remain necessary.
