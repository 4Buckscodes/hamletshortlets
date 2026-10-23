# React + TypeScript + Vite

## Supabase setup

The app's Supabase client reads `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY` from `.env.local`. Copy `.env.example` to
`.env.local` and set those values for your project. Never put a service-role or
secret key in a Vite environment variable or browser code.

The initial database schema and row-level security policies are in
`supabase/migrations/20261022120000_initial_schema.sql`. The additive partner
application and booking-integrity migration is
`supabase/migrations/20261022130000_app_workflows.sql`. Apply the additive
migration before using partner applications or booking requests. New accounts
receive a guest profile; an administrator must explicitly grant partner or
admin roles.

Partner property submission uses the atomic RPC in
`supabase/migrations/20261022140000_partner_property_submission.sql`. Apply
this migration after the initial schema before enabling property submission.

Admin property review, verification outcomes, partner resubmission, and the
review audit log are in
`supabase/migrations/20261022141000_admin_property_review.sql`. Apply it after
the partner property submission migration before using those workflows.

Admin partner-application decisions and their audit entries are in
`supabase/migrations/20261022142000_partner_application_review.sql`. Apply it
after the admin property review migration before reviewing applications.

Booking decisions, guest cancellation, payment-deadline expiry, and booking
audit entries are in `supabase/migrations/20261022143000_booking_lifecycle.sql`.
Apply it after the admin property review migration before enabling partner
booking decisions. Expired payment requests are swept when authenticated
clients load or refresh data and periodically while the app is open.

Verified payment webhook confirmation, controlled ledger reconciliation,
duplicate-listing protection, post-confirmation admin operations & refunds,
issue assignment/escalation/resolution, and partner property assignments are in
`supabase/migrations/20261023100000_payments_ledger_and_operations.sql`.
Partner account suspension/reinstatement, structured property correction &
resubmission, Lagos-only geography validation, private pilot stay feedback, and
privacy-safe date availability lookups are in
`supabase/migrations/20261023120000_pilot_feedback_partner_governance_and_corrections.sql`,
paired with the server-side Paystack Edge Functions in
`supabase/functions/paystack-initialize/index.ts` and
`supabase/functions/paystack-webhook/index.ts` (see `MVP_SPECIFICATION.md` for
the locked Version 1.0 product and commercial rules). Configure
`PAYSTACK_SECRET_KEY` via `supabase secrets set` — never in `.env.local` or
`VITE_*` variables — so checkout initialization and `confirm_booking_payment_webhook`
run exclusively server-side.

## Booking Notifications, Partner Availability Confirmation & Resend Integration

Transactional booking notifications and authenticated partner dashboard
availability reviews are implemented across:

- **Database outbox & RLS** (`supabase/migrations/20261023180000_booking_notifications_and_resend_outbox.sql`):
  - `public.booking_notifications` stores one durable outbox/delivery record per
    `(booking_id, event_type, recipient)` with a `UNIQUE (idempotency_key)`
    constraint, `delivery_status` (`pending` | `processing` | `sent` | `failed` |
    `skipped`), `provider_message_id`, `attempt_count`, `max_attempts` (default
    `3`), `next_attempt_at` backoff, and sanitized `last_error`.
  - Strict Row-Level Security: only `admin` accounts can `SELECT` from
    `public.booking_notifications`. Guests and partners cannot read notification
    logs or other recipients' email addresses, and client sessions cannot mutate
    the table directly.
  - Trigger `enqueue_booking_lifecycle_notifications` on `public.bookings`
    atomically enqueues notifications without blocking booking saves if email
    delivery later fails:
    - **Event A (`booking_request_created`)**: Guest (`requested` / awaiting
      availability confirmation, explicitly not yet confirmed), active
      authorized property partner(s) (`property_access` active + active partner
      profile), and HAMLET operations (`HAMLET_BOOKINGS_EMAIL` resolved at
      send-time).
    - **Event B (`booking_availability_confirmed`)**: When a partner/admin
      confirms availability via `public.transition_booking` (`status =
      'awaiting_payment'` with 48-hour `payment_deadline` — **not** `confirmed`
      until Paystack webhook verification), enqueues Guest + HAMLET operations
      follow-up notifications.
    - **Event C (`booking_availability_declined`)**: When a partner/admin marks
      requested dates unavailable (`status = 'declined'`), enqueues Guest +
      HAMLET operations notifications with zero payment/refund side effects.
    - **Extensible Lifecycle Events D & E (`booking_payment_confirmed`,
      `booking_cancelled`, `booking_expired`, `booking_refunded`)**: Supported
      in both `public.enqueue_booking_event_notifications(...)` and
      `supabase/functions/booking-notifications/templates.ts`, so wiring
      automatic emails into `confirm_booking_payment_webhook`,
      `expire_overdue_bookings`, or `record_booking_refund` requires only a
      single `perform public.enqueue_booking_event_notifications(...)` call.
- **Resend Edge Function** (`supabase/functions/booking-notifications/{index,handler,templates}.ts`):
  - Authenticates callers via Supabase JWT (`authorize_booking_notification_dispatch`)
    or timing-safe `x-hamlet-internal-secret` header for scheduled sweeps.
  - Claims pending/retryable outbox rows atomically using `FOR UPDATE SKIP LOCKED`
    (`claim_pending_booking_notifications`), renders HTML + plain-text emails
    with full HTML escaping and safe asset URL resolution, and dispatches via
    Resend (`POST https://api.resend.com/emails`) with provider `Idempotency-Key`
    headers, bounded timeouts, bounded transient retries, and secret redaction.
- **Authenticated Partner Booking Review** (`src/pages/partner/BookingReview.tsx`,
  route `/#/partner/bookings/:bookingId`):
  - Preserves deep-link redirects through `WorkspaceGuard` → `/signin?redirect=...`
    → `resolvePostSignInRedirect`, verifies active partner property authority,
    clearly separates **Property being requested** from **Guest booking request
    details**, prevents GET-based state changes, and blocks duplicate or
    conflicting decisions once handled.

### Deploying Migrations, Secrets & Edge Functions (Staging & Production)

1. **Verify sender domain in Resend**:
   - Add your sending domain (or subdomain, e.g. `mail.yourdomain.example`) in
     Resend and publish the required **SPF**, **DKIM**, and **DMARC** DNS TXT/MX
     records until Resend marks the domain `Verified`. Never hardcode unverified
     sender addresses.
2. **Apply database migrations**:
   ```bash
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
3. **Configure server-only Edge Function secrets** (use test/staging inbox and
   preview URL in staging before production):
   ```bash
   npx supabase secrets set \
     RESEND_API_KEY="re_..." \
     RESEND_FROM_EMAIL="HAMLET <bookings@your-verified-domain.example>" \
     RESEND_REPLY_TO_EMAIL="support@your-verified-domain.example" \
     HAMLET_BOOKINGS_EMAIL="operations-inbox@your-domain.example" \
     HAMLET_APP_URL="https://your-deployed-frontend-url.example" \
     HAMLET_INTERNAL_DISPATCH_SECRET="<random-32+-char-secret>"
   ```
4. **Deploy Edge Functions**:
   ```bash
   npx supabase functions deploy booking-notifications
   npx supabase functions deploy paystack-initialize
   npx supabase functions deploy paystack-webhook
   ```
5. **Configure Vercel frontend variables** (publishable keys only):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
6. **Rollback plan**:
   - Frontend: promote the previous ready deployment in Vercel (`Deployments` →
     `Instant Rollback`).
   - Notifications: because booking creation and `transition_booking` are
     decoupled from email delivery, unsetting `RESEND_API_KEY` or undeploying
     `booking-notifications` safely halts outbound emails while preserving all
     booking saves, partner confirmations, and outbox records. To disable
     database outbox enqueueing without losing historical logs, run:
     `drop trigger if exists enqueue_booking_lifecycle_notifications on public.bookings;`.

Database-level booking lifecycle, payment/ledger, operations, partner
governance, private feedback, checkout initialization, and pricing tests run
without Docker via `npm test` (`vitest run`).
`supabase/tests/booking_lifecycle.test.ts`,
`supabase/tests/payments_ledger_and_operations.test.ts`, and
`supabase/tests/pilot_feedback_governance_and_checkout.test.ts` boot an isolated
in-memory PostgreSQL instance via `@electric-sql/pglite`, apply every migration
in `supabase/migrations/*.sql`, and verify the real PostgreSQL triggers, RLS
policies, role grants, `SECURITY DEFINER` RPCs, and Paystack Edge Function
handlers without connecting to your live project. If Docker and a local
Supabase stack (`npx supabase start`) are available,
`supabase/tests/booking_lifecycle.test.sql` can also be run via
`npm run test:pgtap`.

When Supabase is configured, sign-in/session restoration, guest account
creation, password reset & password rotation, profile management, public
approved-listing reads (with privacy-safe date conflict filtering and honest
zero-inventory launch states), single-step partner account creation +
application submission (`resubmit_partner_application` for reviewer
corrections), partner account and client account suspension/reinstatement,
Supabase Storage (`property-media`) property photo uploads, partner property
submissions and structured correction edits (with Lagos-only and normalized
duplicate checks), guest booking requests and cancellations, partner
availability decisions, server-initialized Paystack checkouts and verified
webhook confirmations, controlled ledger reconciliation + CSV exports, manual
adjustments & refunds, partner property assignments/revocations, multi-role
issue reporting & evidence attachment (`guest`, `partner`, `ops`), server-side
admin provisioning (`public.admin_bootstrap_emails` + `authorize_admin_email` at
`/#/admin/users`), and private post-stay pilot feedback all run against Supabase
with database policies and server-side transition checks. Property evidence
declarations are stored as self-reported and require manual review; live
Paystack merchant onboarding and verified Resend sender DNS remain explicit
commercial launch dependencies.
Without Supabase configuration, the app continues to use its local demo store.
The demo payment flow is disabled in Supabase mode and browser redirects are
never treated as proof of payment.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
