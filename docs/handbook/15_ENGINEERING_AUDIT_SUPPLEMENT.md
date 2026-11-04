# HAMLET Engineering Audit Supplement — 2 November 2026

**Repository:** `4Buckscodes/hamletshortlets`  
**Baseline:** `main` at `5d890a62466d283a1e9f4e2c807588de7f03a22c`  
**Documentation branch:** `docs/v2-reconciliation-nov-2026`  
**Status:** Read-only source review; production environment and full test suite not executed in this audit pass.

This supplement records additional implementation evidence discovered after the initial handbook draft. It does not approve business policy or certify production readiness.

## 1. Partner network and property authority

### Evidence
- `supabase/migrations/20261031100000_immediate_partner_network_registration.sql` creates `partner_network_memberships` and the `join_partner_network` RPC.
- The membership table permits declared primary roles: `property_owner`, `authorised_manager`, `multi_property_operator`, and `closing_agent`.
- The migration explicitly does not grant a privileged partner account role. Membership is self-readable; administrative listing and suspension are separate RPCs.
- `app/api/partner/properties/route.ts` checks `profiles.role === 'partner'` before submission.
- `supabase/migrations/20261023100000_payments_ledger_and_operations.sql` implements `submit_partner_property`, which separately checks `public.has_role('partner')`.
- The same migration requires admin property review. Approval requires all four verification dimensions—ownership, identity, authority and inspection—to be marked verified.

### Documentation consequence
Document two distinct stages: (1) join the partner network, and (2) obtain privileged partner approval before property submission or privileged operations. Do not describe network registration as property-listing approval. Keep property-level access assignment separate from both.

### Status
**Implemented — source observed; live behaviour not independently re-tested in this pass.**

## 2. Booking request integrity and authoritative pricing

### Evidence
- `app/api/booking-requests/route.ts` validates authenticated guest role, active account, approved property, dates, nights (1–60), guest count (1–20), capacity, first-available date and calendar conflicts.
- The route calculates a quote through `src/lib/pricing.ts`, then inserts booking facts including accommodation subtotal, mandatory charges, deposit, pricing version and FX quote snapshot.
- The database has a `BEFORE INSERT` trigger named `enforce_booking_request_integrity` on `public.bookings`. Its function is defined in the booking workflow/pricing migrations.
- Repository release notes describe that trigger as enforcing transaction advisory locks, first-available date, availability blocks, confirmed bookings, non-expired 48-hour payment holds and authoritative pricing. This is consistent with the database test suite's explicit concurrency/hold test coverage.
- `supabase/tests/booking_lifecycle.test.ts` documents that the trigger coerces a client-supplied booking status such as `confirmed` back to `requested` before insertion.

### Documentation consequence
The API insert payload alone is not the complete source of booking truth. Document the server route and database trigger together. The database trigger is a critical integrity boundary and must be included in acceptance criteria and regression tests.

### Status
**Implemented — source and test evidence observed; the complete current test suite was not executed in this pass.**

## 3. Pricing allocation and referral reward lifecycle

### Evidence
- `src/lib/pricing.ts` is the central TypeScript pricing engine and contains the current 20% domestic markup, allocation components, 10% international buffer and separate refundable deposit treatment.
- `supabase/migrations/20261024100000_availability_referrals_pricing_fx_settlement.sql` contains database-side pricing/allocation and settlement logic. Search evidence shows booking records expose owner base, closing-agent commission and referral reward allocation fields.
- `supabase/tests/consolidated_brief_e2e.test.ts` inserts bookings and asserts persisted allocation fields including owner base, domestic markup, guest price, closing-agent commission, direct-referrer reward, HAMLET allocation, reserve and attribution IDs.
- Referral lifecycle migrations `20261028120000`, `20261028140000` and `20261030150000` refine reward creation and completion handling.
- The documented lifecycle is: the first qualifying completed booking activates the referral relationship and starts the 90-day window with no activation payout; subsequent qualifying completed bookings within the window can earn 2.5% of owner-listed base B. The unique booking relationship and existence checks are intended to prevent duplicate reward records.
- `app/partners/earnings/page.tsx` reads `partner_referral_rewards` for the referrer's earnings view.

### Documentation consequence
The initial audit note that allocation snapshots were not visible in the API payload must be qualified: allocation fields are not all visibly passed in the Next.js request payload, but database-side integrity/pricing logic and end-to-end tests indicate that the database fills authoritative booking allocation snapshots. Trace the exact trigger/function definition and test it before changing this implementation. Keep direct referrer, closing agent and property introducer attribution distinct.

### Status
**Implemented — code, migration and test references observed; production data and live payout execution not verified.**

## 4. Payments, ledger and refund semantics

### Evidence
- Paystack initialization is handled by `supabase/functions/paystack-initialize`; webhook confirmation is handled by `supabase/functions/paystack-webhook`.
- The webhook calls the server-only `confirm_booking_payment_webhook` RPC. The payment migration revokes execution from public, anonymous and authenticated roles.
- `supabase/tests/payments_ledger_and_operations.test.ts` explicitly tests that anonymous and authenticated users—including admins—cannot call the confirmation RPC or write directly to payment records.
- The admin booking interface calls `record_booking_refund`; its presence creates an audited refund/ledger record. A record is not proof that the provider actually transferred funds back.
- The repository's own route parity notes describe refunds as ledger-recorded and caution-deposit transitions as admin-operated workflows.
- Payout status updates are ledger operations; they do not, by themselves, prove an external bank transfer has occurred.

### Documentation consequence
Use separate statuses for provider-confirmed payment/refund, internal reconciliation record and payout execution. Never present a manually recorded refund or payout status as provider/bank confirmation. Provider marketplace permission, settlement split support and actual credentials still require independent live/provider verification.

### Status
**Implemented — source and test references observed; live provider configuration, merchant approval and fund movement not verified.**

## 5. Caution deposit lifecycle

### Evidence
- The pricing migration defines `initialize_booking_caution_deposit()` and a trigger to create a separate deposit tracking record when a booking has a refundable deposit.
- The database exposes `transition_caution_deposit`; the admin settlements screen calls it with deducted amount, refunded amount, inspection notes, deduction reason, refund reference and evidence.
- The admin settlements screen displays deposit amount, deductions, refunded amount, status and inspection note.
- The test suite includes a partial-refund example with a damage note, evidence references and refund reference.

### Documentation consequence
A structured status/evidence workflow exists in source and tests. However, these do not settle who legally holds the funds, whether the platform ever receives them, which party executes a refund, the applicable response deadline or the legal treatment of a disputed/retained amount. Keep custody and operating SLA as open decisions.

### Status
**Partially implemented / operationally unresolved.** State transitions and evidence fields exist; custody, actual fund movement and complete guest-side dispute process are not verified.

## 6. Important limitations of this audit

- This was a source-level review of the repository's audited `main` SHA, not a production database inspection.
- No `npm test`, `npm run lint`, `npm run build`, Playwright run or Supabase pgTAP run was executed here.
- No production Supabase migration ledger, RLS policy catalogue, storage policies, Paystack merchant configuration, webhook delivery, Resend configuration, Vercel environment or custom-domain behaviour was independently queried.
- Existing `DATABASE_RELEASE_CHECKLIST.md` and `DEPLOYMENT_AND_ROLLBACK.md` contain historical live-environment observations. They must be treated as dated evidence until rechecked read-only against the actual environments.
- Do not run migration repair, `supabase db push`, production SQL, deployment promotion or domain changes as part of documentation reconciliation.

## 7. Next audit tasks

1. Build a complete migration inventory: tables, columns, constraints, indexes, triggers, functions, grants and RLS policies.
2. Trace the exact booking-integrity trigger and its pricing/attribution snapshot assignments.
3. Trace all booking state transitions, cancellation/refund/no-show paths and provider event reconciliation.
4. Trace property access assignment and manager/owner permission checks across every write RPC.
5. Run the repository's prescribed unit, lint, build and database tests in a controlled environment; record actual results and commit SHA.
6. Reconcile the handbook's traceability rows against concrete UI/API/migration/test evidence.
7. Recheck production migration state, Paystack/Resend readiness and domain configuration only through approved read-only access.
