# HAMLET Communications Infrastructure

## Approved provider decisions
- Transactional outbound email: Resend.
- Customer-facing inbox and human replies: Zoho Mail.
- Internal alerts: email, Elsinore admin dashboard, and WhatsApp.
- Event/database layer: Supabase.
- Keep provider credentials server-side; never put them in `NEXT_PUBLIC_*` variables.

## Implemented in this release branch
- Additive `admin_notifications` table with admin-only RLS.
- Database trigger records partner application submissions and status changes.
- Elsinore communications page at `/admin/communications` with unread count and mark-as-read.
- Admin navigation entry.

## Still required before production delivery
1. Verify `hamlet.rest` in Resend and publish the exact SPF/DKIM records Resend provides. Add DMARC after checking existing DNS; do not overwrite existing mail records.
2. Configure Supabase Edge Function secrets: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO_EMAIL`, `HAMLET_BOOKINGS_EMAIL`, `HAMLET_APP_URL`, and `HAMLET_INTERNAL_DISPATCH_SECRET`.
3. Create Zoho mailboxes/aliases and verify MX records. Recommended initial addresses: `support@hamlet.rest`, `bookings@hamlet.rest`, `partners@hamlet.rest`, `ops@hamlet.rest`.
4. Choose the WhatsApp Business Platform provider and obtain its approved sender, access token, phone-number ID, and approved templates. WhatsApp messages must be sent server-side and only to opted-in recipients.
5. Complete the Resend dispatch worker for partner application and other non-booking events. The existing booking notification outbox remains responsible for booking lifecycle messages.
6. Add provider delivery/bounce webhook processing and a scheduled retry/dispatch invocation. An API acceptance response is not proof of inbox delivery.
7. Run the end-to-end matrix for application submitted/approved/rejected, property submitted/approved, booking requested/confirmed/paid/cancelled/refunded, and support issue created.

## DNS safety
Do not guess SPF/DKIM/MX records. Copy the exact values from Resend and Zoho dashboards. Merge SPF into a single SPF TXT record, preserve existing mail routing until Zoho MX cutover is approved, and verify inbound and outbound mail after DNS propagation.

## Deployment safety
This branch is not production-ready until the migration is reviewed and applied to the intended Supabase project, provider secrets are configured, and end-to-end tests pass. Do not move the custom domain or change payment settings as part of this work.
