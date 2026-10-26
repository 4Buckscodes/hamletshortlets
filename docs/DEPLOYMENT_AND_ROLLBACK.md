# HAMLET.REST — Controlled Domain Cutover & Instant Rollback Runbook

**Audited Date:** 2026-10-26  
**Vercel Team:** `team_EVVwpTVS7thd1NVD0JQGEdaV` (`jfolawaley-8796's projects`)  
**Supabase Production Project:** `jopnnevqnwrpldrojmdu`  
**Current Custom Domain Status:** **UNCHANGED** (`hamlet.rest` & `www.hamlet.rest` remain attached to legacy Vite project `hamletshortlets` until all Go/No-Go gates in Section 3 are cleared and approved by the owner)

---

## 1. Audited Live Infrastructure & Deployment Baseline

| Layer | Resource | Live Identifier | Current Audited Status |
| --- | --- | --- | --- |
| **Legacy Production (Current Custom Domain Host)** | Vercel Project `hamletshortlets` | `prj_FK2CQCYTVp2X1jFQvxxMWMm3vCyq` (`vite`) | Serving `hamlet.rest` & `www.hamlet.rest` via last `READY` Vite deployment **`dpl_2oKweFyGwwFSJ2SCDKfZR7y8q2m3`** (`main` @ `34b0aba7`) |
| **Target Production (Next.js App Router)** | Vercel Project `hamletshortlets-jonn` | `prj_gOpkzI7txouBf1VfdgelVwdVYNLa` (`nextjs`, Node `24.x`, `iad1`) | Serving `https://hamletshortlets-jonn.vercel.app` via `READY` production deployment **`dpl_9faddtxRrMVwLfp3ahKmvMoMZkJT`** (`main` @ `b2877c47`) |
| **DNS & Edge TLS** | Vercel DNS (`zeit.world`) | `ns1.vercel-dns.com`, `ns2.vercel-dns.com` | Managed inside the same Vercel team (`misconfigured: false`, `http-01` & `dns-01` active) — domain moves between projects execute atomically at Vercel’s edge with **zero external DNS TTL wait** |
| **Database & Auth** | Supabase (`us-east-1`) | `jopnnevqnwrpldrojmdu` | All services `ACTIVE_HEALTHY`; `17/17` public tables `RLS = true`; `site_url = https://www.hamlet.rest`; `uri_allow_list` permits `https://www.hamlet.rest/**`, `https://hamlet.rest/**`, and `https://*.vercel.app/**` |
| **Edge Functions** | Supabase Functions | `paystack-initialize` (v4), `paystack-webhook` (v3), `booking-notifications` (v4) | All `3` functions deployed and `ACTIVE` |

---

## 2. Live Verification Results on `https://hamletshortlets-jonn.vercel.app`

> **Finding Resolved During Verification:** `hamletshortlets-jonn` originally had `link.productionBranch` set to `feat/nextjs-mobile-first-rebuild` (from PR #23), which left `hamletshortlets-jonn.vercel.app` pinned to `dpl_HCFTqdHwgxQTSCb974tGQPdgbfe5` (`2c2b771`) when PR #24 merged into `main`. Merged `main` (`b2877c47`) was promoted to `target: "production"` on `hamletshortlets-jonn` (`dpl_9faddtxRrMVwLfp3ahKmvMoMZkJT`, `READY`) without touching `hamlet.rest`, `www.hamlet.rest`, or Supabase.

Verified live on `https://hamletshortlets-jonn.vercel.app`:
- **Homepage (`/`)**: Renders crossfading sample interior slideshow (`Living room`, `Primary bedroom`, `Kitchen & dining`, `Study & terrace`), `"Lagos is big. Your stay, sorted."`, Mainland/Island search dock, `₦ NGN / $ USD / £ GBP` toggle, honest zero-inventory empty state (`"New verified stays arriving soon"`), 8 Mainland & Island area cards (`Yaba`, `Surulere`, `Shomolu`, `Ikeja GRA`, `Victoria Island`, `Ikoyi`, `Lekki Phase 1`, `Ajah`), and `"0% owner fee"` partner banner (Four Pillars cleanly moved to `/about`).
- **Stays Discovery (`/stays`)**: Queries live Supabase `public.properties` via `PUBLIC_PROPERTY_SELECT` with zero `42703` errors, supports Mainland/Island corridor & filter-drawer controls, and displays the honest empty state (`0 stays across Lagos`) with partner onboarding CTA.
- **Guest Auth & Booking Journeys (`/signin`, `/account`, `/account/bookings`, `/account/issues`)**: Unauthenticated visits to `/account/bookings` redirect cleanly to `/signin?next=/account/bookings` with explicit destination notice; progressive 2-step guest signup and Paystack return handling (`?payment=return`) are live.
- **Partner Journeys (`/partners/apply`, `/partners`, `/partners/properties/new`, `/partners/bookings`, `/partners/availability`, `/partners/earnings`)**: `/partners/apply` displays the `100%` / `10%` / `2.5%` economics banner and Step 0 auth handoff (`/signin?mode=signup&next=%2Fpartners%2Fapply`); protected partner routes preserve `?next=` cleanly.
- **Editorial, Trust, Legal & SEO (`/lagos`, `/about`, `/how-it-works`, `/safety`, `/faqs`, `/legal`, `/robots.txt`, `/sitemap.xml`, `/llms.txt`)**: All return HTTP `200` with canonical `https://www.hamlet.rest` metadata.
- **Legacy `#/...` Link Compatibility Bridge**: `SiteProviders` (`resolveLegacyHashRoute`) automatically redirects legacy Vite hash URLs (`/#/stays`, `/#/partner/register?ref=...`, `/#/partner/bookings/<id>`, `/#/account?booking=<id>`, `/#/admin/bookings?booking=<id>`) to their exact Next.js App Router equivalents while leaving `#access_token=...` OAuth/recovery fragments untouched.

---

## 3. Mandatory Pre-Cutover Go / No-Go Gates

Keep `hamlet.rest` / `www.hamlet.rest` and production Supabase unchanged until all five gates below are green:

### Gate 1 — Vercel Project Settings & Public Env Vars (`hamletshortlets-jonn`)
- [x] `NEXT_PUBLIC_SUPABASE_URL` — **Set** (`production`, `preview`)
- [x] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — **Set** (`production`, `preview`)
- [ ] **Action Required:** In Vercel Dashboard → `hamletshortlets-jonn` → `Settings → Environments → Production → Branch Tracking`, change Production Branch from `feat/nextjs-mobile-first-rebuild` to **`main`** so future merges to `main` auto-promote to `production`.
- [ ] **Action Required:** Add `NEXT_PUBLIC_SITE_URL=https://www.hamlet.rest` (`plain`, `production` + `preview`).
- [ ] **Security Check:** Confirm zero secret keys (`SUPABASE_SERVICE_ROLE_KEY`, `PAYSTACK_SECRET_KEY`, `RESEND_API_KEY`, `HAMLET_INTERNAL_DISPATCH_SECRET`) exist in Vercel `NEXT_PUBLIC_*` or `VITE_*` variables.

### Gate 2 — Supabase Edge Function Secrets & Paystack Webhook (`jopnnevqnwrpldrojmdu`)
- [x] `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `HAMLET_APP_URL` — **Set**
- [ ] **Action Required (Payment Checkout):** Set `PAYSTACK_SECRET_KEY` in Supabase Secrets and register webhook URL `https://jopnnevqnwrpldrojmdu.supabase.co/functions/v1/paystack-webhook` (`charge.success`) in the Paystack Dashboard:
  ```bash
  npx supabase secrets set --project-ref jopnnevqnwrpldrojmdu \
    PAYSTACK_SECRET_KEY=sk_live_...
  ```
- [ ] **Action Required (Transactional Emails):** Set Resend & operations notification secrets:
  ```bash
  npx supabase secrets set --project-ref jopnnevqnwrpldrojmdu \
    RESEND_API_KEY=re_... \
    RESEND_FROM_EMAIL="HAMLET <bookings@hamlet.rest>" \
    RESEND_REPLY_TO_EMAIL="support@hamlet.rest" \
    HAMLET_BOOKINGS_EMAIL="ops@hamlet.rest" \
    HAMLET_APP_URL="https://www.hamlet.rest" \
    HAMLET_INTERNAL_DISPATCH_SECRET="<32-byte-random-hex>"
  ```
  *(Note: Until `PAYSTACK_SECRET_KEY` and `RESEND_*` are set, `paystack-initialize` returns a clean `503 provider_not_configured` message without charging cards, and booking notifications remain safely queued in `public.booking_notifications`.)*

### Gate 3 — Database Compatibility & Optional Migrations (`jopnnevqnwrpldrojmdu`)
- [x] **Core Schema & RPC Compatibility Verified Live:** **Zero migrations are required before domain cutover.** All `17` tables have `RLS = true`, `currency_exchange_rates` has active `USD` (`1600`, `10%` buffer) and `GBP` (`2000`, `10%` buffer) rows, `admin_bootstrap_emails` includes `jfolawaley@gmail.com`, `submit_partner_property` & `update_and_resubmit_partner_property` already support `'draft'` listings, and `get_unavailable_property_ids` + `enforce_booking_request_integrity` already enforce transactional advisory locks and 48-hour hold overlap protection.
- [ ] *(Optional Post-Backup Enhancement)*: If enabling **Wayfinder Arrival Guides** (`20261024180000`) and `has_booking_overlap` (`20261026120000`), follow the exact `supabase migration repair` procedure in `docs/DATABASE_RELEASE_CHECKLIST.md` first — **do not run raw `supabase db push` without repairing the 8 server-timestamped migration versions**.

### Gate 4 — Real Verified Lagos Inventory (`public.properties`)
- Current live counts on `jopnnevqnwrpldrojmdu`:
  - `public.partner_applications`: **`1` pending application**
  - `public.properties`: **`0` rows** (`0` approved listings)
  - `storage.objects` (`property-media`): **`0` files**
- [ ] **Action Required Before Public Marketing Launch:**
  1. Sign in as admin (`jfolawaley@gmail.com`) on `https://hamletshortlets-jonn.vercel.app/admin/partners` and review/approve the verified partner application (or onboard the initial Abundance Abodes / partner operator account).
  2. Sign in as the approved partner on `/partners/properties/new`, complete the 7-step listing wizard with real Lagos property photos (`property-media` bucket) and authority evidence, and submit for review.
  3. Approve all four verification pillars (`Ownership`, `Identity`, `Authority`, `Inspection`) in `/admin/properties` so `/stays` and `/` display real verified inventory.

### Gate 5 — Controlled End-to-End Booking & Payment Rehearsal on `hamletshortlets-jonn.vercel.app`
- [ ] Run automated read-only preflight check:
  ```bash
  TARGET_URL=https://hamletshortlets-jonn.vercel.app npm run verify:cutover
  ```
- [ ] Execute 1 real controlled rehearsal on `https://hamletshortlets-jonn.vercel.app`:
  1. Guest submits a booking request on `/stays/[id]` (`status = requested`, `₦0` charged).
  2. Partner confirms dates in `/partners/bookings` (`status = awaiting_payment`, 48h hold created, calendar overlap blocked).
  3. Guest clicks **Pay via Paystack** in `/account/bookings`, completes Paystack checkout, returns to `/account/bookings?payment=return`, and confirms `paystack-webhook` transitions the booking to `confirmed` and writes a verified row in `booking_payment_records`.
  4. Admin verifies the booking & ledger entry in `/admin/bookings` and `/admin/settlements`, then cancels/refunds or archives the rehearsal booking cleanly.

---

## 4. Controlled Custom-Domain Cutover Procedure (Zero-Downtime Edge Move)

Execute during a low-traffic Lagos window (**01:00–05:00 WAT**) only after Owner Sign-Off on Gates 1–5:

### Step 1 — Freeze & Record Pre-Cutover Rollback Anchors
- Confirm `hamletshortlets` (`prj_FK2CQCYTVp2X1jFQvxxMWMm3vCyq`) still holds `READY` Vite deployment **`dpl_2oKweFyGwwFSJ2SCDKfZR7y8q2m3`** (`main` @ `34b0aba7`). **Do not delete or pause `hamletshortlets` during the 72-hour soak window.**
- Confirm `hamletshortlets-jonn` (`prj_gOpkzI7txouBf1VfdgelVwdVYNLa`) latest `main` production deployment is `READY` and passes `TARGET_URL=https://hamletshortlets-jonn.vercel.app npm run verify:cutover`.

### Step 2 — Move Canonical Domain `www.hamlet.rest` First, Then Apex `hamlet.rest`
Because both projects live under `team_EVVwpTVS7thd1NVD0JQGEdaV` and DNS is hosted on Vercel (`ns1.vercel-dns.com` / `ns2.vercel-dns.com`), moving domains updates Vercel’s Anycast edge routing immediately with existing valid TLS certificates:

1. In **Vercel Dashboard → `hamletshortlets` (`prj_FK2CQCYTVp2X1jFQvxxMWMm3vCyq`) → Settings → Domains**:
   - Remove `www.hamlet.rest` and `hamlet.rest` from `hamletshortlets` (or click **Move to another project** → select **`hamletshortlets-jonn`**).
2. In **Vercel Dashboard → `hamletshortlets-jonn` (`prj_gOpkzI7txouBf1VfdgelVwdVYNLa`) → Settings → Domains**:
   - Assign **`www.hamlet.rest`** to the **`Production`** environment (`git_branch: null`, `redirect: null`).
   - Assign **`hamlet.rest`** with **`308 Permanent Redirect` → `www.hamlet.rest`** (`redirect: "www.hamlet.rest"`, `redirect_status_code: 308`).

### Step 3 — Immediate Post-Cutover Verification (< 5 Minutes)
1. Run the automated verification suite against live `https://www.hamlet.rest`:
   ```bash
   TARGET_URL=https://www.hamlet.rest npm run verify:cutover
   ```
2. Verify apex redirect, TLS, SEO endpoints, and legacy `#/` link compatibility:
   ```bash
   curl -sSI https://hamlet.rest | head -n 10
   curl -sSI https://www.hamlet.rest/stays | head -n 10
   curl -sSI https://www.hamlet.rest/sitemap.xml | head -n 10
   ```
3. Open `https://www.hamlet.rest/#/partner/register?ref=HML-SMOKE` in a browser and confirm it redirects cleanly to `https://www.hamlet.rest/partners/apply?ref=HML-SMOKE`.
4. Test `/signin` and `/account/bookings` on mobile (`iOS Safari` / `Android Chrome`) and desktop.

---

## 5. Rollback Plan (< 60 Seconds, Zero Data Loss)

Define rollback triggers in advance — trigger rollback immediately if **any** of the following occur within 15 minutes of cutover and cannot be resolved within 5 minutes:
- `/` or `/stays` returns HTTP `5xx` or unstyled CSS,
- Supabase Auth sign-in fails on `https://www.hamlet.rest/signin`,
- `POST /api/booking-requests` or `paystack-initialize` fails for valid guest sessions,
- `paystack-webhook` fails signature verification or ledger recording.

### Option A — Full Emergency Revert to Legacy Vite Project (< 60 Seconds)
Because **no destructive database changes** were made and `hamletshortlets` (`prj_FK2CQCYTVp2X1jFQvxxMWMm3vCyq`) retains `READY` deployment **`dpl_2oKweFyGwwFSJ2SCDKfZR7y8q2m3`**:
1. In **Vercel Dashboard → `hamletshortlets-jonn` → Settings → Domains**, remove `www.hamlet.rest` and `hamlet.rest`.
2. In **Vercel Dashboard → `hamletshortlets` (`prj_FK2CQCYTVp2X1jFQvxxMWMm3vCyq`) → Settings → Domains**, re-add `www.hamlet.rest` and `hamlet.rest` (and if needed, promote deployment **`dpl_2oKweFyGwwFSJ2SCDKfZR7y8q2m3`** to Production).
3. Verify `https://www.hamlet.rest` serves the Vite SPA again (`curl -sSI https://www.hamlet.rest`).
4. **Database impact:** None. Bookings, profiles, partner applications, and outbox notifications created in Next.js use the exact same tables and RPCs as Vite.

### Option B — Next.js Deployment-to-Deployment Instant Rollback (< 30 Seconds)
If a *subsequent* Next.js commit after cutover introduces a regression while `www.hamlet.rest` is already on `hamletshortlets-jonn`:
1. Open **Vercel Dashboard → `hamletshortlets-jonn` → Deployments**.
2. Locate the previous known-good `READY` Production deployment (e.g. **`dpl_9faddtxRrMVwLfp3ahKmvMoMZkJT`**) and click **Instant Rollback**.
3. Re-run `TARGET_URL=https://www.hamlet.rest npm run verify:cutover`.

### Post-Soak Cleanup (After 72 Hours of Stable Production Traffic)
- Pause or disconnect automatic Git deployments on legacy `hamletshortlets` (`prj_FK2CQCYTVp2X1jFQvxxMWMm3vCyq`) so merges to `main` no longer generate redundant Vite `ERROR` builds (`dpl_ESqdDTdmQdbQrutYxjRX4d3Na2wt`).
