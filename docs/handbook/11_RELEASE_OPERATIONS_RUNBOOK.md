# HAMLET Release Operations Runbook

**Version:** 2.0 draft · **Reviewed:** 2 November 2026  
**Status:** Consolidated release framework. Environment-specific facts must be reverified before action.

## 1. Release principles

- No production deployment, domain move, live payment, production migration or destructive operation is authorised by this document alone.
- Use isolated preview/staging environments and test provider credentials.
- Production changes require explicit approval, backup/recovery plan, named operator and post-change verification.
- A green build is not proof of launch readiness.

## 2. Repository and application

Active application repository: `4Buckscodes/hamletshortlets`, default branch `main`. Application architecture is Next.js App Router with Supabase. The legacy Vite repository and migration plan are historical references unless explicitly reactivated.

Before release:
- inspect branch and PR status;
- run lint, unit tests, database tests and production build;
- run Playwright critical guest/partner/admin journeys;
- review changed migrations and RLS/RPC functions;
- inspect public routes, metadata and mobile layouts;
- confirm no secrets in source or client bundle.

## 3. Database release

Follow `docs/DATABASE_RELEASE_CHECKLIST.md` only after refreshing current migration history and production schema. Back up and verify backup; rehearse migrations on a disposable/staging copy; use dry-run; confirm exact queued migrations; apply only with explicit approval; run read-only schema/RLS/RPC checks after.

Never rewrite already-applied migrations. Use additive forward migrations and documented rollback compatibility.

## 4. Payments

Follow `docs/PAYSTACK_CONNECTION_CHECKLIST.md`. Confirm written provider approval for HAMLET's marketplace and third-party settlement model. Verify isolated test-mode checkout, signed webhook, idempotency, amount/currency/reference validation, cancellation/refund and ledger reconciliation. A live credential or registered webhook is not evidence that the full payment flow works or that third-party fund flows are permitted.

## 5. Notifications

Verify provider configuration, sender domain, templates, outbox retry and failure monitoring. Do not mark notifications delivered solely because an outbox record exists.

## 6. Content and inventory

Only real owner-authorised and approved properties count as live supply. Verify facts, images and usage rights, price, mandatory charges, caution fee, house rules, availability, capacity and operational contact. Keep fictional showcase concepts explicitly illustrative and non-bookable.

## 7. Go/no-go gates

- Technical build and automated tests pass.
- Critical guest, partner and admin journeys pass.
- Database schema, migrations, RLS and RPCs verified.
- Provider marketplace approval and payment test verified.
- Pricing/ledger allocations reconcile.
- Tax and legal treatment reviewed.
- Cancellation/refund/deposit policy approved and disclosed.
- Real approved inventory and availability exist.
- Support/incident operations staffed.
- Privacy/security review and rollback plan completed.
- Founder gives explicit release approval.

## 8. Rollback

If payments or booking integrity are uncertain, disable new payment initiation at the trusted server/configuration layer and leave requests pending. Do not manually mark bookings paid. Reconcile provider records and booking ledger before resuming. For application rollback, use the tested previous deployment and verify auth/booking compatibility. Do not assume a frontend rollback reverses database changes.

## 9. Environment record

The detailed deployment document contains dated project IDs, domains and configuration observations. Recheck them read-only before using any value. Never paste secrets into chat, commit them or include them in documentation.
