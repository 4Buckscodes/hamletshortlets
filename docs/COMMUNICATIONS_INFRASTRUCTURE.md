# HAMLET Communications Infrastructure

## Approved provider decisions
- Transactional outbound email: Resend.
- Customer-facing inbox and human replies: Zoho Mail.
- Internal alerts: email, Elsinore admin dashboard, and WhatsApp.
- Event/database layer: Supabase.
- Keep provider credentials server-side; never put them in `NEXT_PUBLIC_*` variables.

## Verified Resend setup
- Sending domain: `send.hamlet.rest`.
- Resend domain status: Verified; Resend Forge enabled.
- DNS provider: Vercel DNS (the domain is registered at Spaceship but uses Vercel nameservers).
- Resend records present in Vercel DNS: DKIM TXT `resend._domainkey.send`, SPF CNAME `rsend.send`, and return-path CNAME `send.send`.
- Resend region: Ireland (`eu-west-1`).
- Sending enabled; receiving remains disabled because Zoho Mail is the intended inbound/customer-reply provider.
- DMARC was not changed; inspect any existing policy before adding or modifying it.
- A sensitive Vercel environment variable named `RESEND_API_KEY` was observed for Production, Preview, and Development. Its secret value was not read.

## Implemented in the communications-centre release branch
- Additive `admin_notifications` table with admin-only RLS.
- Database trigger records partner application submissions and status changes.
- Elsinore communications page at `/admin/communications` with unread count and mark-as-read.
- Admin navigation entry.

## Required before application email delivery
The existing booking notification service is a Supabase Edge Function. Its runtime reads secrets from Supabase Edge Function environment variables, not from Vercel project environment variables. Therefore, configuring `RESEND_API_KEY` in Vercel alone does not configure the existing booking email sender.

Configure these secrets in the **HAMLET production Supabase project's Edge Function secrets** (and the intended preview Supabase project separately, if one is used):
1. `RESEND_API_KEY` — the Resend Sending access key; set directly in Supabase, never commit or expose it.
2. `RESEND_FROM_EMAIL` — use `HAMLET <notifications@send.hamlet.rest>`.
3. `RESEND_REPLY_TO_EMAIL` — set only after the intended Zoho reply mailbox exists, e.g. `support@hamlet.rest`.
4. `HAMLET_BOOKINGS_EMAIL` — the real operations/booking inbox that should receive internal booking alerts.
5. `HAMLET_APP_URL` — `https://www.hamlet.rest`.
6. `HAMLET_INTERNAL_DISPATCH_SECRET` — a newly generated high-entropy secret; do not reuse the Resend API key.

The booking function also requires the platform-provided `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; these are supplied by Supabase and should not be copied into Vercel or exposed.

## Other production requirements
1. Create Zoho mailboxes/aliases and verify MX records. Recommended initial addresses: `support@hamlet.rest`, `bookings@hamlet.rest`, `partners@hamlet.rest`, `ops@hamlet.rest`.
2. Complete the Resend dispatch worker for partner application and other non-booking events. The existing booking-notifications function remains responsible for booking lifecycle messages.
3. Add provider delivery/bounce webhook processing and a scheduled retry/dispatch invocation. An API acceptance response is not proof of inbox delivery.
4. Choose the WhatsApp Business Platform provider and obtain its approved sender, access token, phone-number ID, and approved templates. WhatsApp messages must be sent server-side and only to opted-in recipients.
5. Run the end-to-end matrix for application submitted/approved/rejected, property submitted/approved, booking requested/confirmed/paid/cancelled/refunded, and support issue created.

## DNS safety
Do not guess SPF/DKIM/MX records. Copy exact values from Resend and Zoho dashboards. Merge SPF into a single SPF TXT record, preserve existing mail routing until Zoho MX cutover is approved, and verify inbound and outbound mail after DNS propagation.

## Deployment safety
PR #76 remains a draft and is not deployed to production. The migration must be reviewed and applied to the intended Supabase project, provider secrets must be configured, and end-to-end tests must pass before production release. Do not move the custom domain or change payment settings as part of this work.
