# Google OAuth setup for HAMLET

The Next.js sign-in page now offers **Continue with Google** through Supabase Auth. The button is only the application-side integration; Google sign-in will not complete until the provider is enabled in the Supabase project and the OAuth client is configured.

## 1. Configure Google Cloud

1. Open the Google Cloud project used for HAMLET OAuth.
2. Configure the OAuth consent screen with HAMLET's approved application name, support contact and privacy-policy URL.
3. Create an OAuth 2.0 Client ID with application type **Web application**.
4. In the authorized redirect URI list, add the exact Supabase callback URI shown in Supabase Authentication → Providers → Google. It normally has the form `https://<project-ref>.supabase.co/auth/v1/callback`.
5. Copy the Google Client ID and Client Secret into the Supabase Google provider settings. Do not put the client secret in the Next.js public environment.

## 2. Configure Supabase Auth

1. In Supabase Dashboard → Authentication → Providers → Google, enable Google and enter the Google Client ID and Client Secret.
2. In Authentication → URL Configuration, set the production Site URL to `https://www.hamlet.rest` (or the canonical production host selected by the project).
3. Add the sign-in callback paths to the allowed redirect URLs:
   - `https://www.hamlet.rest/signin`
   - `https://hamlet.rest/signin` if the apex domain is retained as an active host.
   - The exact Vercel preview URL used for testing, ending in `/signin`.
4. Save the provider and URL settings.

## 3. Test before production

- Test Google sign-in on the Vercel preview using a non-admin guest account.
- Confirm the browser returns to the requested internal HAMLET path.
- Confirm an external or protocol-relative redirect is rejected.
- Confirm a first-time Google user receives the expected guest profile and does not receive partner or admin privileges.
- Test partner/admin access separately using their approved accounts and role grants.
- Repeat on the production domain only after the release is approved.

## Security notes

- Never commit Google Client Secrets, Supabase service-role keys or Paystack/Resend secrets.
- OAuth does not grant a user partner or administrator permissions. Those permissions must remain controlled by HAMLET's server-side authorization and database policies.
- Google provider activation and Google Cloud credentials require an authorised project administrator; code changes alone cannot enable the provider.
