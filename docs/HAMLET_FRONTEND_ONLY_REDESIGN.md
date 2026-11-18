# HAMLET Frontend-Only UI/UX Redesign

Status: active frontend-only workstream
Base: `main`
Scope: presentation and user-facing interaction only.

## Non-negotiable boundary

This branch may change React/Next.js presentation components, client-side layout, CSS/Tailwind, typography, spacing, responsive behaviour, imagery presentation, navigation presentation, visual states, and accessible interaction affordances.

It must not change:
- Supabase schemas, migrations, RLS, policies, database functions, triggers, or data access contracts.
- Authentication implementation, roles, permissions, or OAuth configuration.
- API routes, server actions, server-side business logic, booking state transitions, pricing, payment, refunds, commissions, or referral calculations.
- Environment variables, deployment configuration, domains, production settings, or infrastructure.

If a visual issue appears to require a prohibited change, preserve current behaviour and record the limitation. Do not implement the backend change.

## Design direction

- Mobile-first Nigerian hospitality marketplace.
- Airbnb-inspired booking clarity with Lagos Life-style local discovery and editorial storytelling.
- Premium, warm, contemporary and approachable; flat 2D visual language, not 3D.
- Strong Lagos context and authentic property photography.
- Guest discovery and booking are the primary public conversion path.
- Concise property cards: show only decision-critical information before the detail page.
- Keep public partner recruitment distinct from the private partner workspace.
- Remove redundant labels, badges, decorative icons and repeated trust sections.
- Use accessible contrast, keyboard focus, readable type and touch-friendly controls.
- Respect reduced-motion preferences.

## Existing repository findings

- The current `main` branch is the source of truth for this work.
- The live Next.js App Router UI is composed from `app/*` pages and shared presentation in `src/components/site/SiteShell.tsx`.
- The legacy Vite/React interface remains in `src/legacy-pages/*` and is not the primary redesign target unless a live route explicitly uses it.
- The current design tokens are in `src/index.css`; Next.js imports them through `app/globals.css`.
- The public homepage composes `app/page.tsx` and `app/home-slideshow.tsx`.
- Stays discovery uses `app/stays/page.tsx` and `app/stays/stays-explorer.tsx`.
- Property details use `app/stays/[id]/page.tsx`.
- Partner workspace and partner application are separate routes.

## Prior branch isolation decision

PR #100 (`feat/v0-sitewide-completion`) is not a safe base for this workstream:
- It is 189 commits ahead and 260 commits behind current `main`.
- Its changed-file set includes API routes, Supabase client/data-access changes, a database migration, environment/configuration files and tests, mixed with presentation work.
- Its Vercel preview being Ready does not prove route-level visual acceptance.
- Therefore, this branch starts directly from current `main`; no PR #100 commits are cherry-picked wholesale.

## Audit and implementation checklist

### Public guest journey
- [ ] Homepage: first impression, hero, search entry, destination discovery, featured stays, trust messaging, footer.
- [ ] Stays catalogue: search/filter hierarchy, result density, property cards, empty/loading/error states, mobile filter interaction.
- [ ] Property detail: gallery, title/location, decision-critical amenities, trust evidence, rules, price presentation and booking CTA.
- [ ] Booking request presentation: clear steps, form hierarchy, validation and feedback states; preserve existing booking behaviour.
- [ ] Sign-in and guest account presentation.

### Partner journey
- [ ] Public partner recruitment page.
- [ ] Partner workspace overview and navigation.
- [ ] Property list, submission/edit presentation, availability and booking views.
- [ ] Clear separation between public marketing and authenticated workspace.

### Admin and support surfaces
- [ ] Admin navigation and page hierarchy.
- [ ] Tables, filters, detail panels, statuses and responsive behaviour.
- [ ] FAQs, safety, legal and support pages: reduce unnecessary repetition while preserving required content.

### Responsive and accessibility QA
- [ ] 360px, 390px, 430px, 768px, 1024px and 1440px.
- [ ] Keyboard-only navigation and visible focus.
- [ ] Touch targets and mobile menu behaviour.
- [ ] Reduced motion, text scaling, contrast and semantic headings.
- [ ] Check overflow, clipped content, sticky elements and form usability.

## Execution and release rules

1. Inspect current `main` components and routes before editing.
2. Make coordinated frontend-only changes on this branch.
3. Preserve all existing props, data contracts, handlers, navigation destinations and workflow semantics.
4. Run lint, type checks, unit tests and production build when a build environment is available.
5. Perform browser-based visual QA on the listed breakpoints before claiming visual completion.
6. Open a draft PR with screenshots/preview evidence and a file-by-file scope report.
7. Do not merge, change the production domain, or deploy to production without explicit approval.

## Current limitation

GitHub source inspection is available, but repository-local execution and browser inspection are not available in this session. Do not represent source inspection as a completed build or visual QA. A preview deployment and browser review are required before sign-off.
