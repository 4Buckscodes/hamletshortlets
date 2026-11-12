# HAMLET Technical Architecture

**Version:** 2.0 draft · **Reviewed:** 2 November 2026  
**Status:** Derived from current `4Buckscodes/hamletshortlets/main`; implementation claims require route-level tests.

## 1. Architecture summary

The active application is a Next.js App Router application using TypeScript, React and Tailwind CSS, with Supabase providing authentication, PostgreSQL, Row Level Security, database functions/RPCs and storage. Payment and notification integrations run in server-side Supabase Edge Functions. The repository also contains a legacy Vite application and migration compatibility code; these are historical/transition assets, not the primary application architecture.

## 2. Main components

| Layer | Current technology / location | Responsibility |
|---|---|---|
| Web application | Next.js App Router, `app/**` | Public pages, guest account, partner workspace, admin console and API routes |
| UI/domain types | `src/lib/types.ts`, UI components | Typed roles, properties, bookings, deposits, availability, currencies and UI state |
| Pricing | `src/lib/pricing.ts` | Central domestic markup/allocation, mandatory charges, deposit, FX quote and provider-fee estimate helpers |
| Supabase clients | `src/lib/next-supabase.ts`, `src/lib/supabase-public.ts` | Browser/server data access with publishable credentials and scoped auth |
| Database | `supabase/migrations/**` | Tables, constraints, RLS policies, triggers and RPC workflows |
| Booking API | `app/api/booking-requests/route.ts` | Authenticated request validation, property/calendar checks and server-side quote calculation |
| Partner property API | `app/api/partner/properties/route.ts` | Partner property submission and update flow |
| Payment initialization | `supabase/functions/paystack-initialize/**` | Trusted checkout initialization |
| Payment confirmation | `supabase/functions/paystack-webhook/**` | Signed provider event handling and database confirmation RPC |
| Notifications | `supabase/functions/booking-notifications/**` | Booking notification templates and outbox dispatch |
| Tests | `src/lib/*.test.ts`, `tests/**` | Unit, integration, database and browser behaviour |

## 3. Route groups and user surfaces

- Public: homepage, Lagos discovery, stays, property details, about, how it works, safety, FAQs and legal pages.
- Guest: sign-in, account, bookings and issue reporting.
- Partner: application, partner home, property submission/editing, bookings, availability, earnings and profile.
- Admin: overview, property review, partner applications/network, bookings, issues, settlements and audit.
- API: booking requests, partner property submission, admin property review and geographic lookup.

The route inventory in `docs/ROUTE_PARITY.md` is a historical parity record. Re-verify route existence and access guards before relying on its “Complete” labels.

## 4. Trust boundaries

1. Browser code is untrusted. Never accept browser-submitted totals, payment status, role, property authority or admin decisions as authoritative.
2. Supabase publishable key may be used in client/server scoped requests; service-role and provider secrets remain server-side only.
3. Database RLS is a required security boundary, not an optional duplicate of UI checks.
4. Payment confirmation is performed from a verified provider webhook and idempotent database operation.
5. Admin/partner actions must be checked server-side and recorded in audit data.
6. Public property data must be a deliberate safe projection; do not expose private address, identity documents, guest PII or internal notes.

## 5. Key data flows

### Property publishing
Partner/owner → authenticated submission → property/authority record → duplicate and evidence review → admin decision → approved public-safe property projection.

### Booking
Guest → server validation → approved property and availability check → central price calculation → booking request record → partner decision → payment window → provider checkout → signed webhook → confirmation RPC → notification and ledger.

### Partner rewards
Referral attribution → eligibility checks → qualifying booking lifecycle → reward record and booking allocation reconciliation → payout review. Referral rewards must not be paid on request creation or duplicated across trigger/RPC paths.

### Issue handling
Guest report → booking-linked issue and evidence → admin/operations queue → decision/resolution → notification and audit trail.

## 6. Architecture invariants

- One central pricing authority; server recomputes.
- One canonical property identity; possible duplicates reviewed.
- Request-to-book, not instant confirmation.
- Booking confirmation requires verified payment and valid booking state.
- Payment/webhook processing idempotent.
- Role/property access enforced by RLS and server logic.
- Financial state changes are auditable and reconcilable.
- No wallet/custody capability inferred from ledger records.

## 7. External integrations

- Supabase Auth, PostgreSQL, Storage and Edge Functions.
- Paystack for payment initiation and webhook verification; live marketplace/third-party fund-flow approval is a separate gate.
- Resend notification integration is referenced in the booking notification runbook; credentials and delivery status require environment verification.
- Vercel is the deployment platform referenced in deployment documentation; current domain/project configuration must be rechecked before any release action.

## 8. Environment and configuration

Use `.env.example` as the configuration inventory. Public Supabase URL/publishable key may be exposed where intended. Service-role keys, Paystack secret, Resend key and internal dispatch secrets must never use `NEXT_PUBLIC_*`, be committed, or appear in logs. Maintain isolated test/staging and production projects/providers. Never send test transactions to production.

## 9. Technical risks requiring verification

- Whether all mandatory charge fields are persisted and included in the booking API's server-side calculation.
- Whether booking creation snapshots closing-agent/referrer attribution and allocation values; current booking request payload does not visibly persist the allocation breakdown fields.
- Whether all reward trigger/RPC paths are idempotent and consistent with settlement records.
- Whether payment provider fees are estimates, actual fees or guest pass-through in each path.
- Whether every route has a working auth guard and corresponding RLS policy.
- Whether Wayfinder migrations/RPCs are deployed and safe to expose.
- Whether the deployed production database migration history matches source control.

## 10. Maintenance

Update this document whenever application architecture, external providers, trust boundaries or deployment topology change. Link detailed deployment/database procedures rather than duplicating environment-specific commands here.
