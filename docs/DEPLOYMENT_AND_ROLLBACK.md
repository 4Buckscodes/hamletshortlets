# HAMLET.REST — Vercel Deployment, Domain Cutover & Rollback Runbook

**Vercel Team:** `team_EVVwpTVS7thd1NVD0JQGEdaV`  
**Supabase Project:** `jopnnevqnwrpldrojmdu`

---

## 1. Current Vercel Project Topology (Audited Live State)

| Vercel Project | Project ID | Framework Preset | Live Domains Currently Attached | Role |
| --- | --- | --- | --- | --- |
| `hamletshortlets` | `prj_FK2CQCYTVp2X1jFQvxxMWMm3vCyq` | `vite` | `hamlet.rest`, `www.hamlet.rest`, `hamletshortlets.vercel.app` | Legacy Vite production project (keeps serving live domain until owner-approved cutover) |
| `hamletshortlets-jonn` | `prj_gOpkzI7txouBf1VfdgelVwdVYNLa` | `nextjs` | `hamletshortlets-jonn.vercel.app` | **Target Next.js App Router project** |

> **Governance Rule:** Do **not** detach or repoint `hamlet.rest` or `www.hamlet.rest` without explicit owner sign-off after preview verification on `hamletshortlets-jonn.vercel.app`.

---

## 2. Required Environment Variables

### Next.js Vercel Project (`hamletshortlets-jonn` — Production & Preview)
Set **publishable** variables only:
- `NEXT_PUBLIC_SITE_URL=https://www.hamlet.rest`
- `NEXT_PUBLIC_SUPABASE_URL=https://jopnnevqnwrpldrojmdu.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<supabase-anon-or-publishable-key>`
- *(Optional temporary `/legacy` aliases)*: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`

**Never** add `SUPABASE_SERVICE_ROLE_KEY`, `PAYSTACK_SECRET_KEY`, `RESEND_API_KEY`, or `HAMLET_INTERNAL_DISPATCH_SECRET` to `NEXT_PUBLIC_*` or `VITE_*` variables.

### Supabase Edge Function Secrets (`jopnnevqnwrpldrojmdu`)
Configure via `npx supabase secrets set`:
- `PAYSTACK_SECRET_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_REPLY_TO_EMAIL`
- `HAMLET_BOOKINGS_EMAIL`
- `HAMLET_APP_URL=https://www.hamlet.rest`
- `HAMLET_INTERNAL_DISPATCH_SECRET`

---

## 3. Pre-Cutover Preview Verification Checklist

Once this PR is merged and deployed to `https://hamletshortlets-jonn.vercel.app`:

1. **Public & SEO Smoke Check (`360x800` mobile + `1440x900` desktop)**:
   - Verify `/`, `/stays`, `/lagos`, `/about`, `/how-it-works`, `/safety`, `/faqs`, `/legal`, `/signin`, `/partners/apply`, `/robots.txt`, `/sitemap.xml`, and `/llms.txt` return HTTP `200` with zero horizontal overflow.
2. **Auth & Redirect Check**:
   - Visit `/signin?next=%2Fpartners%2Fapply`, sign in, and confirm redirect lands on `/partners/apply` (never `/legacy`).
   - Confirm Supabase Auth `uri_allow_list` in `jopnnevqnwrpldrojmdu` includes `https://www.hamlet.rest/**` and `https://hamletshortlets-jonn.vercel.app/**`.
3. **End-to-End Staging / Controlled Live Smoke**:
   - Partner submits or edits a listing via `/partners/properties/new`.
   - Admin reviews 4 pillars in `/admin/properties`.
   - Guest requests dates on `/stays/[id]` → Partner confirms in `/partners/bookings` → Guest sees 48h hold in `/account/bookings`.

---

## 4. Owner-Approved Custom Domain Cutover Procedure

1. In Vercel (`team_EVVwpTVS7thd1NVD0JQGEdaV`), confirm `hamletshortlets-jonn` latest `main` deployment state is `READY`.
2. Move `www.hamlet.rest` (primary canonical host) and `hamlet.rest` (308 redirect to `https://www.hamlet.rest`) from `hamletshortlets` to `hamletshortlets-jonn`.
3. Verify TLS certificate status and test:
   - `curl -I https://hamlet.rest`
   - `curl -I https://www.hamlet.rest`
   - `curl -I https://www.hamlet.rest/stays`
   - `curl -I https://www.hamlet.rest/sitemap.xml`

---

## 5. Instant Rollback Runbook (< 2 Minutes)

- **Scenario A — Regression in a new Next.js commit after cutover:**  
  In Vercel → `hamletshortlets-jonn` → `Deployments`, select the previous known-good `READY` deployment and click **Instant Rollback**.
- **Scenario B — Emergency revert to Legacy Vite project during initial cutover window:**  
  Because `hamletshortlets` (`prj_FK2CQCYTVp2X1jFQvxxMWMm3vCyq`) remains intact and untouched during cutover, re-assign `www.hamlet.rest` and `hamlet.rest` back to `hamletshortlets` in Vercel Domains. Traffic reverts immediately with zero database rollback required.
