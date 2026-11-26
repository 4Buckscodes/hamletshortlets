# HAMLET Product Experience, Discovery & SEO — Phase 1 Audit

**Audit date:** 23 October 2026  
**Branch:** `arena/613c505d-hamletshortlets`  
**Audit state:** Product/SEO audit completed before component redesign. The branch now contains a local, un-deployed P0 access-control mitigation and its tests; no component redesign or production operation has started.

## Executive summary

HAMLET already has a substantial Next.js marketplace foundation: public discovery reads the approved-only `public_properties` view, stay URLs are readable and redirect legacy IDs, search filters are implemented, booking pricing and availability are enforced by the database trigger, and partner onboarding and attribution are present. The baseline audit found an authenticated-role RLS gap on raw properties; this branch now includes a local migration, booking API adjustment, and PGlite coverage to close that path while preserving assigned partner/admin access. The mitigation is not deployed.

The redesign should build on those systems rather than replace them. Remaining blockers include the canonical-host / crawler inconsistencies, a partner verification form that the production build advertises as indexable and includes in the sitemap, and authentication follow-through gaps in email recovery/confirmation. Discovery also has a fixed 100-row client-side catalogue limit, while the homepage and neighbourhood areas still use static property-like imagery and fixed destinations that are not tied to live inventory.

No production database, secrets, Vercel settings, or data were queried or changed during this audit. Any security migration below is a repository proposal only and must be tested locally before it is considered for deployment.

## What is already working and should be preserved

### Marketplace data and privacy boundaries
- `app/page.tsx`, `/stays`, area guides, sitemap and Open Graph property images obtain listing data from `public_properties` and filter `status = 'approved'`.
- `PUBLIC_VIEW_SELECT` is an allowlist that omits owner rates, calendar contacts and review notes. The `public_properties` view is security-barrier enabled, filters to approved records, and computes the guest-facing price centrally. Existing SQL tests prove anonymous users cannot read `public.properties` and do not receive owner-rate/contact/review columns through the view.
- Property URLs are canonicalized to readable slugs. Legacy ID routes redirect while preserving dates and referral parameters.
- Detail JSON-LD is conservative: no fabricated availability, ratings, reviews, coordinates, image or price; a property offer is only emitted when the public rate is valid.

### Discovery and conversion
- `/stays` parses area, corridor, type, bedroom, price, guest, date and sort filters from the request URL. Filters share the `src/lib/discovery.ts` rules, the date calendar lookup uses the existing availability RPC, and date/guest intent is carried to detail pages.
- The detail booking form already resumes after sign-in, validates guest capacity and dates, checks availability, shows central pricing, and posts to `/api/booking-requests`. The API validates the authenticated guest and request basics, then submits booking intent; the `enforce_booking_request_integrity` trigger re-reads the approved listing, rechecks dates/capacity/availability, and calculates the authoritative NGN/FX totals. Booking records start as `requested`; payment remains downstream of partner acceptance. In this branch the API now reads only `public_properties` and no longer sends pricing columns.
- Partner registration, the existing identity/payout verification flow, partner sharing, referral attribution and role-based workspaces already exist. The redesign can simplify the entry points and wording without creating another account, booking or reward system.
- Shared `SiteHeader`, `SiteFooter`, `StayListingCard`, `DiscoveryMarketplace` and the progressive drawer are reusable. The primary production routes use `SiteShell`; `app/site-nav.tsx` appears unused and should not be mistaken for the active navigation.

### Accessibility and responsive foundation
- The mobile header drawer traps focus, makes background content inert, closes on Escape and restores focus. Shared filters use the focus-managed drawer, and the UI kit includes focus-visible styling and reduced-motion support.
- CSS entry order is `app/globals.css` (which imports `src/index.css`), then `hamlet-ui.css`, then `home.css` from `app/layout.tsx`. The global file contains repeated root/body/button/focus declarations and broad mobile overrides, while the later UI files add more route-specific rules; several `!important` selectors make the cascade difficult to reason about. Prefer the active `hm-*` / `hp-*` scopes and verify route ownership before changing shared CSS.
- Styling review was static only. Existing responsiveness tests and reduced-motion rules provide useful safeguards, but no browser screenshot review, cross-device visual pass, color-contrast audit or keyboard walkthrough was run in this audit. Keep that as a pre-redesign validation gate.

## Findings (ordered by risk)

### P0 — Authenticated guests can read private columns from approved properties

**Baseline evidence (before the branch mitigation):** The initial schema grants `SELECT` on `public.properties` to `authenticated`; the policy “Anyone can read approved property listings” applies to the authenticated role as well. The later confidentiality migration revokes `public` and `anon`, but not `authenticated`. On the baseline local migration set, a Postgres privilege check returned table, owner-rate, calendar-contact and review-note SELECT privileges as `true` for `authenticated`; a direct query projecting those columns also succeeded. The booking API itself used the authenticated bearer token to select `nightly_rate` from `properties`.

**Impact:** The anonymous public-view boundary was not a complete private-data boundary. A signed-in guest could call Supabase/PostgREST directly for owner base rates and other private columns on approved rows. UI omission is not an access-control guarantee.

**Branch mitigation (local only; not deployed):** `supabase/migrations/20261126100000_restrict_approved_property_table_reads.sql` drops the broad approved-row policy on `properties`, retains the existing assigned-property/admin RLS policies, and changes the booking INSERT policy to check eligibility through the approved-only `public_properties` view. `app/api/booking-requests/route.ts` now queries only that view and submits booking intent; the database trigger remains authoritative for pricing and availability. The listing wizard’s duplicate-name probe also uses the public view. PGlite coverage now proves an authenticated guest sees no raw property row, still sees the redacted approved view, assigned partners and admins retain access, an unassigned share-authorized partner can still use the partner-share RPC while reading only public fields, and a guest booking request is priced by the trigger. Partner share-card and marketing fallback reads now use `public_properties`; the share-card renderer prefers the guest-facing price. The readable-slugs rollback script was updated to preserve the new view dependency.

**Required follow-up:** Review the local migration with the database owner and validate it against every remaining direct `properties` consumer before any release. Current direct reads are limited to admin pages and assigned-property partner workflows/editor/API (including the post-submit slug lookup), plus legacy `src/lib/store.tsx`; public guest and partner-sharing catalog/card paths now use the redacted view. Keep service-role credentials server-only. Apply only through the normal approved database release process; this audit did not connect to production or deploy migrations.

### P1 — Canonical host is inconsistent with the documented cutover plan

**Evidence:** The App Router metadata base, global structured data, sitemap, robots and most canonical helpers use `https://hamlet.rest`; `/` hard-codes the same host. `.env.example` and the cutover runbook describe `https://www.hamlet.rest` as the intended Next.js canonical host after cutover. Referral recruitment links already use `www`, while property-share links default to the apex. `NEXT_PUBLIC_SITE_URL` is documented but not used by the Next.js canonical builder. `docs/DEPLOYMENT_AND_ROLLBACK.md` says both custom domains remain on the legacy Vite project until the Go/No-Go gates are approved, with the Next app still on its `.vercel.app` host; the proposed cutover assigns `www` to Next and 308-redirects apex to `www`. No current Vercel state was independently queried. Auth host documentation also conflicts: the deployment runbook records Supabase `site_url` as `www`, `docs/GOOGLE_OAUTH_SETUP.md` instructs apex, and local `supabase/config.toml` uses localhost.

**Impact:** Host signals, social previews, referral links, structured data and Supabase auth return URLs can disagree. A runbook is not proof that cutover has occurred or that the proposed host is owner-approved.

**Required follow-up:** Confirm the approved host and current cutover state with the owner before changing application metadata or deployment settings. Once confirmed, use one normalized origin for metadata, canonicals, JSON-LD, robots, sitemap, share links and auth callbacks. Do not move domains or alter Vercel settings in this redesign.

### P1 — Partner identity-verification form is indexable and listed in the sitemap

**Evidence:** `/partners/apply/form` is an authenticated identity/payout-verification flow, but its page metadata currently uses the public-page helper (`index, follow`), `app/sitemap.ts` includes it, and `robots.ts` includes it in the AI public route list. The optimized Next build confirms the rendered form HTML contains `robots=index, follow` and a self-canonical. The parent partner layout’s noindex value is overridden by this page metadata.

**Required follow-up:** Set an explicit noindex policy for the form, remove it from the sitemap and public AI route list, and leave the public `/partners/apply` entry page indexable. Keep auth and verification data flows unchanged.

### P1 — Sitemap uses an untrustworthy static `lastModified` date

**Evidence:** `app/sitemap.ts` uses `2026-11-08` as a baseline. That date is in the future relative to this report’s 23 October 2026 audit snapshot; for a later review it may no longer be future, but it remains a static fallback rather than a trustworthy modification timestamp. When listing timestamps are absent, static routes and inventory-derived routes can inherit it.

**Required follow-up:** Remove the static baseline. Prefer actual `updated_at` / `created_at` values for properties and omit `lastModified` for static pages when a trustworthy source timestamp is unavailable.

### P1 — Next.js password recovery has no new-password completion step

**Evidence:** `app/signin/signin-form.tsx` calls `resetPasswordForEmail` with a return URL of `/signin`, but its `reset` mode only sends another reset email. Neither the sign-in form nor `app/auth/callback/page.tsx` detects a recovery session and calls `auth.updateUser({ password })`. The email/password `signUp` call also omits `emailRedirectTo`, so confirmation relies on the Supabase project Site URL and does not explicitly preserve the requested booking or workspace destination. The repository’s local auth URL is localhost and deployment/auth setup docs disagree between apex and `www`.

**Impact:** A user may receive a reset/confirmation link without landing on a screen that completes the password change or returns them to the intended task. The UI copy promising that a stay remains saved is not backed by a tested email-confirmation round trip.

**Required follow-up:** Add an explicit recovery-completion route/state that validates the recovery session and securely updates the password; choose an explicit confirmation redirect that preserves a sanitized `next`; align local, preview and production Supabase redirect allow-lists with the owner-approved canonical host. Verify with actual email links in browser tests before calling auth complete.

### P2 — Partner sign-in collapses protected deep links to the workspace root

**Evidence:** `app/signin/signin-form.tsx` converts any requested redirect beginning with `/partners` to just `/partners`. This discards deep links even though `resolveNextAppPostSignInRedirect` supports authorized partner routes. For example, the edit page sends unauthenticated users to `/signin?next=/partners/properties/{id}/edit`, but a successful sign-in returns to `/partners`. Existing unit tests exercise the resolver but do not cover this form-level normalization.

**Impact:** Partners lose their place when signing in from a protected task and must navigate back manually; the booking/date preservation for guests remains unaffected.

**Required follow-up:** Preserve validated partner deep links for users who authenticate as partners, while letting the role-aware redirect resolver continue to reject partner routes for guests/admins. Add a form-level regression test.

### P1 — Discovery filters only the first 100 rows

**Evidence:** `/stays` loads at most 100 approved properties, then applies area, price, guest, bedroom and type filters in the browser. The homepage fetches at most 36, and area detail routes cap at 200. Filter updates use `history.replaceState`, so they are shareable and reloadable, but the result set is still only the loaded slice.

**Impact:** Once approved inventory exceeds those limits, actual matches can be omitted or an area can appear empty even though matching stays exist. There is no result pagination or cursor today.

**Required follow-up:** Keep URL-backed filters but move catalogue filtering/pagination to a server-side query or a safe, existing RPC/view-backed page strategy. Add deterministic pagination, filter-count and empty-page tests. Keep availability checks and price logic centralized; do not add a second inventory backend.

### P1 — Property-like editorial imagery and fixed destinations are not inventory-aware

**Evidence:** The homepage’s three destination panels, four “Popular areas” chips and the discovery neighbourhood rail are hard-coded. They use local `/images/prop/*` files, not a photo selected from a currently approved listing in that area, and do not hide areas without live inventory. `/stays` also falls back to static penthouse/bedroom images and a “Verified” stamp when there is no live listing photo.

**Impact:** A visitor can read these as current HAMLET inventory or verified property photography even when no corresponding approved stay exists. This does not meet the requirement to avoid fictional/empty inventory shelves and use actual approved listing photographs.

**Required follow-up:** Derive any stay shelves and area shortcuts from the approved data actually available; omit empty shelves. If showing an area editorially with no listing, label it clearly and use non-property editorial artwork rather than an implied listing photo. Choose card imagery from the matching approved record only, and use a neutral no-inventory state instead of a static property photo or verification stamp.

### P1 — Public-address fallback conflicts with the “exact address after payment” promise

**Evidence:** Property detail renders `wayfinderMeta.public_location_summary || stay.public_address` as the public location paragraph, then says the exact address and arrival guidance are shared after a confirmed, paid booking. The public view exposes `public_address` verbatim; local confidentiality tests include a street-level address example.

**Impact:** If a listing’s `public_address` contains the exact street/unit address rather than a safe public-facing area description, the detail route displays information that the copy says is withheld. Production address values were not inspected.

**Required follow-up:** Confirm the field’s operational contract and existing approved values without exposing them in this audit. Until the field is guaranteed to be a public-safe summary, render `public_location_summary` or the area only. Keep exact address/arrival guidance on the existing post-confirmation path.

### P2 — SEO copy can better match HAMLET’s requested search intent

- Homepage and the `/stays`/Lagos guide already use “shortlet(s)” naturally. The dynamic property title/description does not consistently call the listing a Lagos shortlet; “vacation homes” is not currently integrated into primary customer-facing copy.
- Add “Lagos shortlet”, relevant neighborhood and accommodation terms where they accurately describe the record. Introduce “vacation homes” sparingly in contextual copy; do not add a keyword block or invent property features.
- Keep property-level metadata grounded in approved record values and avoid exposing exact addresses, owner data, unsupported amenities or date guarantees.

### P2 — Some server failures collapse into an empty inventory state

- `/stays` distinguishes a query error from a genuine empty catalogue and provides a retry; this is a useful pattern to reuse.
- The homepage turns a query failure into `approvedStays = []`, and `/lagos` ignores its query error and presents zero counts. Those states can misreport an outage as “no listings.” Add truthful loading/error/empty handling without substituting sample inventory.

## Baseline and follow-up checks (before redesign)

- `npm ci --ignore-scripts --no-audit --no-fund` — passed; installed 313 packages. No lockfile change was required.
- Initial baseline `npm test` — **48 test files, 354 tests passed** (including local PGlite schema/RLS tests).
- Follow-up after the local P0 mitigation — **48 test files, 356 tests passed**. The first run exposed a rollback-script dependency on `public_properties`; the rollback script now drops/recreates the guest booking policy around the view swap, and the full rerun passed. Regression coverage also asserts guest booking and partner-share API/catalogue reads stay on the redacted view.
- `npm run lint` — passed after the app changes.
- `npm run build` — passed; Next.js generated 62 static pages and compiled the dynamic routes. Build emitted the existing warning that the Next.js ESLint plugin was not detected.
- Playwright end-to-end tests, live email/OAuth, visual browser checks and actual Supabase auth redirects were not run. No production Supabase query, migration, data change, secret change, GitHub action or Vercel deployment was performed.

## Sequenced implementation plan

1. **Close and release the data-boundary gap first.** A local proposal now drops the broad approved-row policy while preserving assigned partner/admin RLS, routes guest listing checks through `public_properties`, and makes booking API submissions intent-only so the database trigger computes price. Review it with the database owner, audit every remaining direct `properties` reader, and validate anon, guest, assigned partner, other partner and admin behavior before any approved release. Keep service-role credentials server-only; no production migration has been run.
2. **Repair authentication completion.** Add a password-recovery completion state, preserve sanitized booking/workspace intent through email confirmation, and stop collapsing partner deep links. Align Supabase local/preview/production redirect configuration only after the canonical host is confirmed; add browser-level email-link tests.
3. **Repair SEO foundations.** Confirm the canonical host and cutover state; unify Next metadata, Open Graph, JSON-LD, discovery files and share URLs. Noindex and de-sitemap the payout form. Remove the static sitemap `lastModified` fallback and assert canonical/robots behavior in tests.
4. **Make inventory discovery truthful and scalable.** Replace fixed area chips/property-like photo shelves with sections derived from approved records; remove empty shelves and static stay fallbacks. Implement server-side filters and pagination over the same approved view, maintaining URL state and the existing availability RPC.
5. **Then simplify shared navigation and presentation.** Keep HAMLET’s own brand, build on the active `SiteShell` and UI kit, and scope CSS cleanly rather than layering another header or global style system. Validate actual breakpoints, keyboard focus and reduced motion in a browser.
6. **Improve stay detail and booking conversion.** Use public-safe location copy, record-backed search terms and photos, preserve the current request-first booking path, central prices, and clear loading/error/success states.
7. **Consolidate partner entry and sharing.** Keep one account and the current application, referral, attribution, review and reward rules; simplify the journey and explain the existing rules accurately.
8. **Validate before handoff.** Run unit/PGlite tests, lint, production build, Playwright guest/partner/auth paths, and responsive/keyboard/reduced-motion checks. Re-check rendered metadata, canonical URLs, robots, sitemap and property schema. Report deployment separately; code changes do not imply production rollout.

## Audit decision

The audit and the previously pending source reviews of styling, sign-in and OAuth callback behavior are complete. Existing discovery, booking, partner and SEO foundations are reusable. The authenticated property-column gap now has a local, PGlite-tested mitigation proposal, but it remains unresolved in production until reviewed and deployed through the normal release process. Canonical-host approval, the indexable verification form, sitemap timestamps, email password recovery/confirmation and partner deep-link handling remain open. Component redesign has not started; follow the sequence above without replacing the existing Next.js/Supabase architecture.
