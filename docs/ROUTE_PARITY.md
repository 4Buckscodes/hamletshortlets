# HAMLET.REST — Legacy Vite to Next.js App Router Parity Matrix

This matrix maps every user, partner, administrator, and crawler route from the legacy Vite hash-router SPA (`src/legacy-pages/**`) to its primary Next.js App Router implementation (`app/**`).

---

## 1. Public & SEO Routes

| Capability | Legacy Hash Route | Primary Next.js Route | Status | Notes |
| --- | --- | --- | --- | --- |
| Marketplace Homepage | `/#/` | `/` (`app/page.tsx`) | **Complete** | `"Your stay, sorted."`, Island + Mainland search, `opacity-100` sample interior slideshow, live approved stays grid, truthful empty state |
| Stays Discovery & Filters | `/#/stays` | `/stays` (`app/stays/page.tsx`) | **Complete** | Schema-safe SSR + `FocusedDrawer` mobile filter sheet + `get_unavailable_property_ids` calendar check + `NGN`/`USD`/`GBP` pricing |
| Stay Detail & Booking Request | `/#/stays/:id` | `/stays/[id]` (`app/stays/[id]/page.tsx`) | **Complete** | `opacity-100` gallery, 4-pillar verification grid, JSON-LD, 2-step progressive booking form + mobile sticky CTA bar |
| Lagos Neighbourhood Guide | `/#/lagos` | `/lagos` (`app/lagos/page.tsx`) | **Complete** | Lagos Island & Lekki + Lagos Mainland (Yaba, Shomolu, Surulere, Gbagada, Ikeja GRA) + JSON-LD |
| About HAMLET | `/#/about` | `/about` (`app/about/page.tsx`) | **Complete** | Houses `"Four pillars of a better stay"` per brand rules |
| How Bookings Work | `/#/how-it-works` | `/how-it-works` (`app/how-it-works/page.tsx`) | **Complete** | 4-step request → partner confirm → 48h hold → server-verified payment lifecycle |
| Trust & Safety | `/#/safety` | `/safety` (`app/safety/page.tsx`) | **Complete** | Honest verified vs. self-reported labelling & payment safety |
| Frequently Asked Questions | `/#/faqs` | `/faqs` (`app/faqs/page.tsx`) | **Complete** | Expandable Q&A + `FAQPage` JSON-LD |
| Legal, Privacy & NDPR Terms | `/#/legal` | `/legal` (`app/legal/page.tsx`) | **Complete** | Marketplace role, pricing/FX/caution terms, NDPR privacy notice, partner terms |
| Guest & Partner Sign-in / Sign-up | `/#/signin` | `/signin` (`app/signin/page.tsx`) | **Complete** | Fixes `/legacy` trap; 2-step progressive sign-up + sanitized `?next=` intent preservation |
| Robots, Sitemap & AI Discovery | Static `public/*` | `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/llms-full.txt` | **Complete** | Clean canonical `https://www.hamlet.rest/*` URLs; private workspaces disallowed |
| Custom 404 & Error Boundaries | SPA catch-all | `app/not-found.tsx`, `app/error.tsx` | **Complete** | Branded recovery actions |

---

## 2. Authenticated Guest Workspace

| Capability | Legacy Hash Route | Primary Next.js Route | Status | Notes |
| --- | --- | --- | --- | --- |
| Account Overview & Profile | `/#/account` | `/account` (`app/account/page.tsx`) | **Complete** | Summary metrics, workspace shortcuts, `update_own_profile` contact form |
| Guest Bookings, Paystack & Feedback | `/#/account` (Bookings tab) | `/account/bookings` (`app/account/bookings/page.tsx`) | **Complete** | 5-stage lifecycle bar, `paystack-initialize` + `refresh_booking_fx_quote`, honest `?payment=return` banner, safe Wayfinder gate, cancel, `submit_booking_feedback` |
| Guest Issue Reporting | `/#/account` (Issue modal) | `/account/issues` (`app/account/issues/page.tsx`) | **Complete** | 3-step progressive wizard calling `report_booking_issue` + `append_issue_evidence` |

---

## 3. Partner Onboarding & Partner Workspace

| Capability | Legacy Hash Route | Primary Next.js Route | Status | Notes |
| --- | --- | --- | --- | --- |
| Partner Application | `/#/partner/register` | `/partners/apply` (`app/partners/apply/page.tsx`) | **Complete** | 6-step role-conditional wizard, `?ref=` lookup (`resolve_referral_code`), `resubmit_partner_application` |
| Partner Dashboard | `/#/partner`, `/#/partners` | `/partners` (`app/partners/page.tsx`) | **Complete** | Live/draft/correction cards, `set_property_publication_pause` toggle, pending booking counter |
| Submit New Property | `/#/partner` (Submit modal) | `/partners/properties/new` (`app/partners/properties/new/page.tsx`) | **Complete** | 7-step `PropertyListingWizard`, `property-media` upload, live `calculateGuestPricing`, `Save as draft` |
| Edit / Resubmit / Pause Listing | `/#/partner` (Edit modal) | `/partners/properties/[id]/edit` (`app/partners/properties/[id]/edit/page.tsx`) | **Complete** | Admin review feedback banner, `update_and_resubmit_partner_property`, pause/resume |
| Partner Booking Review | `/#/partner` (Bookings tab) | `/partners/bookings` (`app/partners/bookings/page.tsx`) | **Complete** | Conflict check (`get_unavailable_property_ids`), `FocusedDrawer` decision notes, `transition_booking` |
| Calendar & Blocked Dates | `/#/partner` (Calendar tab) | `/partners/availability` (`app/partners/availability/page.tsx`) | **Complete** | `update_property_availability_settings`, `add_property_availability_block`, `remove_property_availability_block` |
| Earnings, Commissions & Referrals | `/#/partner` (Earnings tab) | `/partners/earnings` (`app/partners/earnings/page.tsx`) | **Complete** | Projected vs completed owner base `B`, `partner_referral_rewards`, `ensure_my_referral_code` share link |
| Partner Profile & Assignments | `/#/partner` (Profile tab) | `/partners/profile` (`app/partners/profile/page.tsx`) | **Complete** | `update_own_profile` + `property_access` assignment visibility |

---

## 4. Administrator Operations Console

| Capability | Legacy Hash Route | Primary Next.js Route | Status | Notes |
| --- | --- | --- | --- | --- |
| Operations Overview | `/#/admin`, `/#/ops` | `/admin` (`app/admin/page.tsx`) | **Complete** | Live queue counters + `expire_overdue_bookings` hold maintenance |
| 4-Pillar Property Review & Assignments | `/#/admin` (Properties) | `/admin/properties` (`app/admin/properties/page.tsx`) | **Complete** | `FocusedDrawer` with `ownership`, `identity`, `authority`, `inspection` outcomes (`review_partner_property`) + `grant_property_assignment` / `revoke_property_assignment` |
| Partner Application Queue | `/#/admin` (Partners) | `/admin/partners` (`app/admin/partners/page.tsx`) | **Complete** | `FocusedDrawer` (`review_partner_application`: approve, request correction, reject) |
| Booking Oversight & Refunds | `/#/admin` (Bookings) | `/admin/bookings` (`app/admin/bookings/page.tsx`) | **Complete** | `transition_booking` + `record_booking_refund` (clearly labelled ledger record) |
| Audited Support Issue Queue | `/#/admin` (Issues) | `/admin/issues` (`app/admin/issues/page.tsx`) | **Complete** | Uses `transition_booking_issue` RPC (replaces broken direct `.update()`) |
| Ledger, Payouts & Caution Deposits | `/#/admin` (Ledger) | `/admin/settlements` (`app/admin/settlements/page.tsx`) | **Complete** | `booking_payment_records` (`update_payout_status`) + `booking_caution_deposits` (`transition_caution_deposit`) |
| User Directory & Suspension | `/#/admin` (Accounts) | `/admin/accounts` (`app/admin/accounts/page.tsx`) | **Complete** | `get_admin_directory` + `set_partner_account_status` / `set_guest_account_status` |
| Immutable Audit Log | `/#/admin` (Audit) | `/admin/audit` (`app/admin/audit/page.tsx`) | **Complete** | Searchable `admin_audit_log` stream |

---

## 5. Decommissioning Criteria for `/legacy`

`/legacy` (`app/legacy/page.tsx`) is marked `robots: { index: false, follow: false }` and is never linked from primary guest navigation or post-sign-in redirects. It may be removed once:
1. Custom domains `hamlet.rest` and `www.hamlet.rest` have been cut over to the Next.js Vercel project for 14 days without rollback.
2. Any bookmarked hash URLs (`/#/stays`, `/#/signin`) are confirmed unused in analytics.
