# HAMLET.REST — Verified Lagos Shortlets Marketplace

**Tagline:** *Your stay, sorted.*  
**Parent Brand:** Abundance Abodes (Lagos, Nigeria)  
**Primary Architecture:** Next.js 15 App Router + TypeScript + Tailwind CSS v4 + Supabase (Auth, RLS, Storage, Edge Functions)

---

## Overview

HAMLET.REST is a verification-led shortlet marketplace for Lagos covering both **Lagos Island & Lekki** (Victoria Island, Ikoyi, Lekki Phase 1, Oniru, Banana Island, Ajah) and **Lagos Mainland** (Yaba, Shomolu, Surulere, Gbagada, Maryland, Ilupeju, Ikeja GRA, Magodo).

### Core Product Workflows
- **Public Discovery (`/`, `/stays`, `/stays/[id]`, `/lagos`, `/about`, `/how-it-works`, `/safety`, `/faqs`, `/legal`)**: Mobile-first search, `FocusedDrawer` filters, `NGN` / `USD` / `GBP` currency switching, `opacity-100` photography, 4-pillar verification transparency, and JSON-LD structured data.
- **Guest Workspace (`/signin`, `/account`, `/account/bookings`, `/account/issues`)**: 2-step progressive guest sign-up with sanitized `?next=` intent preservation, 2-step progressive booking requests, server-verified Paystack checkout (`paystack-initialize` + `paystack-webhook`), post-stay feedback, and 3-step support issue reporting.
- **Partner Workspace (`/partners/apply`, `/partners`, `/partners/properties/new`, `/partners/properties/[id]/edit`, `/partners/bookings`, `/partners/availability`, `/partners/earnings`, `/partners/profile`)**: 6-step role-conditional onboarding, 7-step `PropertyListingWizard` with `property-media` photo uploads, draft saving, live pricing preview, pause/resume controls, calendar blocks, and referral ledger tracking.
- **Admin Operations Console (`/admin`, `/admin/{properties,partners,bookings,issues,settlements,accounts,audit}`)**: Focused drawer workflows for 4-pillar listing verification, partner approvals, booking oversight & ledger refunds, audited issue resolution, payout/caution reconciliation, account governance, and immutable audit logs.

---

## Local Development

1. Copy `.env.example` to `.env.local` and set your publishable Supabase credentials:
   ```bash
   cp .env.example .env.local
   ```
2. Install dependencies cleanly from `package-lock.json`:
   ```bash
   npm ci
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```

---

## Quality & Verification Commands

```bash
# Lint TypeScript & React (zero warnings/errors)
npm run lint

# Run Vitest unit tests + real PostgreSQL (@electric-sql/pglite) RLS & workflow suite
npm test

# Build optimized Next.js production bundle
npm run build

# Run mobile (360x800, 390x844) & desktop (1440x900) Playwright E2E suite (requires Chromium installed)
npm run test:e2e
```

---

## Operational & Architecture Documentation

- [`docs/RELEASE_READINESS.md`](docs/RELEASE_READINESS.md) — Full-stack code vs. live deployment audit & launch gates
- [`docs/ROUTE_PARITY.md`](docs/ROUTE_PARITY.md) — Legacy Vite to Next.js App Router parity matrix & `/legacy` retirement plan
- [`docs/DATABASE_RELEASE_CHECKLIST.md`](docs/DATABASE_RELEASE_CHECKLIST.md) — Live Supabase (`jopnnevqnwrpldrojmdu`) migration inventory, verification queries & rollback
- [`docs/PRICING_AND_PAYMENT_CONTRACT.md`](docs/PRICING_AND_PAYMENT_CONTRACT.md) — Authoritative pricing formula (`v2_20pct_markup_10pct_fx_buffer`), spec reconciliation & Paystack webhook contract
- [`docs/DEPLOYMENT_AND_ROLLBACK.md`](docs/DEPLOYMENT_AND_ROLLBACK.md) — Vercel project topology, domain cutover checklist & instant rollback runbook
