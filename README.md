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
creation, public approved-listing reads (with privacy-safe date conflict
filtering), partner applications and partner account suspension/reinstatement,
partner property submissions and structured correction edits (with Lagos-only
and normalized duplicate checks), guest booking requests and cancellations,
partner availability decisions, server-initialized Paystack checkouts and
verified webhook confirmations, controlled ledger reconciliation, manual
adjustments & refunds, partner property assignments/revocations, issue
workflows, and private post-stay pilot feedback all run against Supabase with
database policies and server-side transition checks. Property evidence
declarations are stored as self-reported and require manual review; binary file
uploads and live Paystack merchant onboarding remain open launch dependencies.
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
