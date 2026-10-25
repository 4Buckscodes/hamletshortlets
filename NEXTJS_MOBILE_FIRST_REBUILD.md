# HAMLET.REST — Next.js Mobile-First Rebuild Plan

Status: implementation plan for the `feat/nextjs-mobile-first-rebuild` branch.
Scope: rebuild the guest-facing experience first while preserving existing Supabase, Paystack, Resend, partner and admin workflows. No production deployment or database changes are authorized by this plan.

## Product outcome

HAMLET.REST should feel app-like on a phone and remain polished on tablet and desktop. The primary outcome is a guest being able to discover a suitable shortlet, understand the full price and terms, request a booking, pay through the verified provider flow, and understand what happens next.

## UX principles

- Mobile-first layouts and interaction design; validate small screens before desktop refinements.
- Thumb-friendly touch targets (aim for at least 44px), visible focus states, accessible labels and sufficient contrast.
- Keep the main booking action obvious. Use a sticky mobile booking action only where it does not obscure content or controls.
- Every visible button, link, filter and form must have a real action, validation, loading state, success state and useful error state.
- Avoid false claims: do not imply instant booking, live availability, legal verification, or completed payment unless the underlying data/workflow confirms it.
- Show transparent totals before commitment. Preserve one authoritative pricing implementation and reconcile client quotes with server-side payment verification.
- Keep discovery and neighbourhood content helpful, but never let it block the core search-to-book journey.
- Design for slower mobile networks: responsive image sizes, lazy loading below the fold, limited client JavaScript and clear skeleton/empty/error states.

## Current baseline found in repository

- Vite + React 19 + TypeScript; React Router currently uses HashRouter.
- Tailwind CSS v4, Framer Motion and Lucide icons.
- Supabase client uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Central pricing module exists at `src/lib/pricing.ts`; do not duplicate its pricing rules during migration.
- Existing public pages include Home, Lagos, About, How It Works, Safety, FAQs, Stays, Property Detail, Account, Sign In, Partner Register and Legal.
- Partner and admin workspaces already exist and should be migrated after the guest path, without dropping existing capability.
- Paystack initialization/webhook and Resend notification workflows are server-side Supabase Edge Functions; keep secret keys server-side.
- The older `MVP_SPECIFICATION.md` says 3% guest-only service fee, while the current pricing module describes 20% domestic markup and a 10% international FX buffer. Treat this as a commercial-rule conflict to resolve before launch; do not silently replace the current pricing engine based on the older document.
- Wayfinder migration exists in source control but the user’s live-schema checks found its expected tables missing. Treat Wayfinder UI as gated until deployment status is deliberately resolved.

## Target architecture

- Next.js App Router with TypeScript.
- Public, indexable pages rendered server-side or statically where appropriate; interactive search, filters, account state and booking controls isolated into client components.
- Clean URLs (no hash routing), canonical metadata, Open Graph metadata, sitemap and robots configuration.
- Keep the Supabase publishable key client-side only; privileged operations and payment verification stay in trusted server-side functions/Edge Functions.
- Introduce a typed data-access layer for public approved property discovery, property detail, availability and booking requests. Do not expose service-role credentials to browser code.
- Keep a single pricing contract. If server-side pricing is introduced, add parity tests against `src/lib/pricing.ts` before replacing any callers.
- Use route groups to separate public guest pages from partner/admin workspaces while retaining their authorization guards.
- Add a PWA manifest only after core routes, authentication redirects and booking flows behave correctly; PWA support is not a substitute for responsive web UX.

## Proposed route map

- `/` — mobile-first discovery homepage.
- `/stays` — search and filters, with URL-backed shareable search state.
- `/stays/[slug-or-id]` — property detail and booking request entry.
- `/lagos` and future city/area landing pages — editorial discovery with indexable content.
- `/how-it-works`, `/safety`, `/about`, `/faqs`, `/legal` — public trust and support pages.
- `/signin`, `/account` — authentication and guest account.
- `/partners/*` — partner workspace; preserve role and property-access enforcement.
- `/admin/*` — admin workspace; preserve admin-only controls and auditability.
- `/booking/*` — booking status and payment return states, using server-verified payment status rather than trusting redirect parameters.

## Migration phases and exit criteria

### Phase 0 — Foundation
- Create Next.js App Router skeleton on this branch.
- Establish environment-variable mapping, fonts, Tailwind v4, metadata defaults, error/loading/not-found states and build scripts.
- Preserve the current Vite app until the Next.js foundation builds successfully.
- Exit: clean install and Next.js production build succeed; no production deployment.

### Phase 1 — Guest shell and homepage
- Implement responsive header/navigation, accessible mobile menu, search entry point, curated areas and property card system.
- Connect real property data; clearly handle unavailable or empty data.
- Exit: homepage usable at 360px width and desktop; all controls work; keyboard and screen-reader basics pass.

### Phase 2 — Search and property details
- Build URL-backed search/filter state, responsive listing grid, property gallery, amenities, house rules, location context, truthful trust labels and transparent pricing.
- Exit: search filters are shareable and functional; detail pages have unique metadata; no fake availability or verification claims.

### Phase 3 — Booking and payments
- Connect booking request, availability confirmation, quote expiry, Paystack initialization, verified webhook status and booking history.
- Exit: no booking is shown as confirmed based solely on a client redirect; totals reconcile with server-verified payment.

### Phase 4 — Account, partner and admin
- Migrate existing workflows and role guards in manageable route groups.
- Exit: regression tests cover guest, partner and admin permissions and core workflows.

### Phase 5 — Release readiness
- Test mobile layouts, accessibility, performance, SEO metadata, error states, auth redirects, booking lifecycle, payment idempotency and operational recovery.
- Resolve the payout-reversal execute-permission exposure and confirm Wayfinder migration state before production release.
- Exit: explicit approval to deploy.

## Working agreement

- Work feature-by-feature; test as each feature is built rather than repeatedly auditing unrelated areas.
- Maintain a short blocker list. Security/payment issues that can cause unauthorized financial changes or incorrect bookings block release; unrelated lower-risk findings are tracked without derailing UI work.
- Do not alter production database, secrets, provider settings, branch protection or deployment configuration without explicit approval.
- Do not merge or deploy this branch without explicit approval.
