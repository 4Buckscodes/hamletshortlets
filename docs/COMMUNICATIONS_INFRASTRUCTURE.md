# HAMLET Communications Infrastructure

## Provider decisions
- Transactional outbound email: Resend.
- Customer-facing inbox and human replies: Zoho Mail.
- Internal alerts: email and Elsinore admin dashboard. WhatsApp remains a later integration.
- Event/database layer: Supabase.
- Provider credentials stay server-side; never use `NEXT_PUBLIC_*` for secrets.

## Resend setup recorded for the project
- Sending domain: `send.hamlet.rest`.
- Resend domain status was verified in the earlier setup review; region Ireland (`eu-west-1`).
- DNS provider: Vercel DNS.
- Sending enabled; receiving disabled while Zoho is intended for inbound mail.
- Inspect existing DMARC before making changes. Do not guess DNS records.
- A Vercel `RESEND_API_KEY` variable was previously observed, but its value was not read. It does not configure Supabase Edge Functions.

## Communications Centre implementation
- Admin-only `admin_notifications` table and RLS.
- Database trigger records partner application submissions and status changes.
- Elsinore admin page at `/admin/communications` with unread count and mark-as-read.
- Durable operations-email queue with attempts, next-attempt time, delivery status and last error.
- `admin-notifications-dispatch` Supabase Edge Function sends queued partner-application alerts to the configured operations inbox using Resend idempotency keys.
- Separate private `customer_email_notifications` queue and `customer-notifications-dispatch` Edge Function for customer-facing transactional emails. Customer recipient addresses are not exposed in the admin inbox.
- Customer email events: confirmed registration, partner application received, partner application decision, property submitted for review, and property review/status decision.
- Property messages are sent only to the user's active `submitter` access record. Draft edits do not generate emails; approval/correction/rejection and other status decisions do.
- Claiming uses a database function with row locks and `SKIP LOCKED` to avoid concurrent workers claiming the same row.

## Supabase Edge Function secrets
Configure in the production Supabase project's Edge Function secrets, not in Vercel:
1. `RESEND_API_KEY` — Resend Sending access key.
2. `RESEND_FROM_EMAIL` — `HAMLET <notifications@send.hamlet.rest>`.
3. `HAMLET_BOOKINGS_EMAIL` — the actual operations inbox.
4. `HAMLET_INTERNAL_DISPATCH_SECRET` — newly generated high-entropy secret (minimum 32 characters); do not reuse the Resend key.
5. `HAMLET_APP_URL` — `https://hamlet.rest`.
6. `RESEND_REPLY_TO_EMAIL` — only after the intended Zoho reply mailbox is provisioned.
Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the Edge Function runtime. Never copy these into client-side variables.

## Still required before operational use
1. Apply the communications migrations to the intended Supabase project after reviewing the target project and migration history.
2. Deploy both `booking-notifications` and `admin-notifications-dispatch` Edge Functions.
3. Configure the secrets above in Supabase; no secret values belong in Git.
4. Configure a trusted scheduled invocation for `admin-notifications-dispatch` using the internal secret. The worker is not self-scheduling; without a scheduler or operator invocation, queued events remain pending.
5. Create and verify the Zoho mailboxes/aliases before setting reply-to or changing MX records.
6. Add Resend delivery/bounce webhook processing. An API acceptance response is not proof of inbox delivery.
7. Test submission and status-change events end-to-end in a staging Supabase project first. Confirm idempotency, retry exhaustion, and admin-only access.
8. WhatsApp Business Platform remains unimplemented. Select an approved provider, sender, credentials and templates; only message opted-in recipients.
9. Booking lifecycle emails continue through `booking-notifications`; refund and support emails remain future coverage as those workflows are finalized.

## DNS safety
Do not guess SPF, DKIM or MX values. Copy exact records from Resend and Zoho dashboards. Keep one SPF record, preserve existing mail routing until a deliberate Zoho MX cutover, and verify inbound/outbound delivery after DNS propagation.

## Release safety
The dispatcher and queue are code changes only until migrations, Edge Functions and secrets are deployed to the correct Supabase project. A Vercel deployment does not deploy Supabase functions or migrations. Do not use live Paystack charges as a test.

## Non-destructive rollback & independent controls
Never drop `public.admin_notifications`, delete post-deployment notification rows, or rewrite `supabase_migrations.schema_migrations` during an operational rollback. Each subsystem can be paused and restored independently:

1. **Disable the partner-application event trigger only** *(new partner applications and status reviews continue succeeding; existing `admin_notifications` rows remain intact)*:
   ```sql
   alter table public.partner_applications
     disable trigger partner_application_admin_notification;
   -- Restore:
   -- alter table public.partner_applications
   --   enable trigger partner_application_admin_notification;
   ```
2. **Disable queue claiming / processing only** *(blocks `claim_admin_notifications` from dequeuing rows while leaving queued rows preserved in `pending` / `failed`)*:
   ```sql
   revoke execute on function public.claim_admin_notifications(integer)
     from service_role;
   -- Restore:
   -- grant execute on function public.claim_admin_notifications(integer)
   --   to service_role;
   ```
3. **Disable outbound email dispatch only** *(keeps database event capture and the `/admin/communications` inbox active while pausing Resend API calls)*:
   - Unschedule the `pg_cron` job (`select cron.unschedule('hamlet-admin-notifications-dispatch');` when scheduled) and/or pause invocations of `admin-notifications-dispatch`. Queued rows remain in `public.admin_notifications` (`delivery_status = 'pending'`) for replay once restored.

