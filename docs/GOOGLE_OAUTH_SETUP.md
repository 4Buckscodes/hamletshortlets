# HAMLET — Google Account Sign-Up & Sign-In Setup Guide

**Application endpoints:**
- Sign-in & sign-up UI: `/signin` (`?mode=signup` for direct sign-up tab)
- OAuth callback handler: `/auth/callback` (`app/auth/callback/page.tsx`)

**Supabase project (`hamletshortlets`):**
- Project Ref: `jopnnevqnwrpldrojmdu`
- Supabase OAuth Callback URI: `https://jopnnevqnwrpldrojmdu.supabase.co/auth/v1/callback`

---

## 1. Create Google OAuth 2.0 Credentials (Google Cloud Console)

1. Open [Google Cloud Console → APIs & Services → OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent):
   - **App name:** `HAMLET`
   - **User support email:** `hello@hamlet.rest`
   - **Authorized domains:** `hamlet.rest`, `supabase.co`
   - **Scopes:** `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`
2. Open [Credentials → Create Credentials → OAuth client ID](https://console.cloud.google.com/apis/credentials):
   - **Application type:** `Web application`
   - **Name:** `HAMLET Web (Supabase Auth)`
   - **Authorized JavaScript origins:**
     - `https://hamlet.rest`
     - `https://www.hamlet.rest`
     - `http://localhost:3000` *(optional for local Next.js dev)*
   - **Authorized redirect URIs:**
     - `https://jopnnevqnwrpldrojmdu.supabase.co/auth/v1/callback`
     - `http://127.0.0.1:54321/auth/v1/callback` *(optional for local `supabase start`)*
3. Copy the generated **Client ID** and **Client Secret**.

---

## 2. Enable Google Provider in Supabase Auth

1. Open **Supabase Dashboard → Project `hamletshortlets` (`jopnnevqnwrpldrojmdu`) → Authentication → Sign In / Providers → Google**.
2. Toggle **Enable Sign in with Google** ON.
3. Paste the **Client ID** and **Client Secret** from Step 1 and click **Save**.
4. Open **Authentication → URL Configuration** and confirm:
   - **Site URL:** `https://hamlet.rest`
   - **Redirect URLs** include:
     - `https://hamlet.rest/**`
     - `https://www.hamlet.rest/**`
     - `https://*.vercel.app/**`
     - `http://localhost:3000/**` *(for local Next.js testing)*

*(Note: `https://hamlet.rest/**`, `https://www.hamlet.rest/**`, and `https://*.vercel.app/**` are already present in `jopnnevqnwrpldrojmdu`'s `uri_allow_list`.)*

---

## 3. How HAMLET Handles Google Sign-Up & Sign-In

1. **Progressive Role Safety:** New Google accounts start with `role = 'guest'` (unless the verified Google email matches `public.admin_bootstrap_emails`). Partner and administrator privileges still require HAMLET's verified review workflow.
2. **Display Name Sync:** `/auth/callback` works immediately against the unmodified live database: if `profiles.full_name` is empty on first Google login, it backfills the user's Google name via `public.update_own_profile` (and additive migration `20261103100000_oauth_signup_profile_and_referral_sync.sql` also teaches `create_profile_for_new_user()` to fall back across `full_name`, `name`, and `given_name` + `family_name`).
3. **Deep-Link & Referral Preservation:**
   - `?next=` targets (such as `/stays/[id]`, `/partners/apply`, `/account/bookings`, `/partners`, or `/admin`) are preserved across the Google OAuth round-trip via URL query parameters + `sessionStorage` fallback.
   - Referral links (`?ref=HML-...`) captured before clicking **Sign up with Google** remain preserved for `/partners/apply/form` and, once migration `20261103100000` is applied, are also claimed onto `public.profiles` via `public.claim_oauth_signup_referral()` with full self-referral protection.
