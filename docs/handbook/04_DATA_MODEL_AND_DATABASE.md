# HAMLET Data Model & Database Handbook

**Version:** 2.0 draft · **Reviewed:** 2 November 2026  
**Status:** Domain model derived from current source types and migration inventory; full ERD and production schema verification remain outstanding.

## 1. Database authority

The canonical database implementation is the ordered SQL migration history under `supabase/migrations/`. Do not infer deployed production schema from files alone. Before any migration repair or push, compare source migration history, live migration ledger, tables, columns, indexes, constraints, functions, grants and RLS policies. Use the current database release checklist only after revalidating its dated commands.

## 2. Domain entities observed

| Domain | Main entities / concepts | Purpose |
|---|---|---|
| Identity | `profiles`, Supabase Auth users | Account identity, roles, status and referral identity |
| Partner network | `partner_network_memberships`, partner applications, `partner_referrals` | Declared network membership, privileged partner approval and referral relationship |
| Property | `properties`, `property_access`, property media/documents | Canonical listing, owner/submitter, authority and scoped access |
| Availability | `property_availability_blocks`, booking date ranges, calendar metadata | Prevent conflicts and represent blocked dates |
| Booking | `bookings` | Request, acceptance, payment, stay and outcome lifecycle |
| Financial | `booking_payment_records`, referral reward records and settlement fields | Allocation, payment references, refunds and payout status |
| Support | Booking issues, issue evidence and audit events | Incident reporting and resolution |
| Notifications | `booking_notifications` outbox | Durable dispatch and retry visibility |
| Currency | `currency_exchange_rates` and booking FX snapshots | Configured conversion and quote traceability |
| Governance | `admin_audit_log` and related records | Actor, action, target, reason and audit |

This table is a conceptual inventory, not a complete database ERD. Confirm exact table/column names from migrations and the deployed schema before using it to write SQL.

## 3. Identity and partner roles

The application domain uses account roles such as guest, partner and admin, with partner capabilities such as property owner, authorised manager, multi-property operator and closing agent. Partner network membership is stored separately and does not automatically grant privileged partner role or property access.

Keep these concepts distinct:
- account role;
- partner network membership;
- partner application approval;
- partner capability/primary role;
- property access assignment;
- booking attribution and reward eligibility.

## 4. Property identity and access

A property must have a stable canonical identifier. Property submissions must preserve submitter, owner/authority basis, evidence and assigned partners. Duplicate matching should use address/location, unit/building identity, coordinates, property attributes and image similarity where supported. A similarity signal should route to review, not automatically merge two different units.

Property access is scoped. Revoking a partner assignment must stop future access while preserving historical booking attribution, audit and settlement records.

## 5. Booking and financial snapshots

A booking should preserve, at minimum:
- property and guest IDs;
- stay dates, guest count and status;
- accommodation base and nights;
- mandatory charges and payee/recipient classification where known;
- pricing rules version;
- domestic markup and pool allocations;
- currency, FX rate/source/timestamp, buffer and quote expiry;
- caution deposit amount and separate status;
- provider name/reference, amount, currency and verification status;
- cancellation/refund reason, policy version, calculation and execution reference;
- attribution IDs and earning milestone;
- created/updated timestamps and transition audit.

Current source types expose many of these concepts. The booking request API currently inserts the accommodation base, cleaning fee, refundable deposit and FX snapshot; it does not visibly include every allocation/attribution field in the shown insert payload. Verify the actual triggers/RPCs and persisted schema before declaring allocation snapshots complete.

## 6. Security and RLS

Every table containing user, property, booking, evidence, financial or operational data must have an explicit access model. RLS should be enabled where required and policies tested as guest, owner, manager, partner, admin and unauthenticated user. Service-role operations must remain server-side.

Required test matrix:
- guest reads only own profile/bookings/issues;
- partner reads only own profile and assigned property/booking data;
- owner accesses own properties and authorised operational/financial data;
- manager sees only assigned scope;
- network member sees own membership, not private owner/guest data;
- admin actions are role-checked and audited;
- public users see approved public-safe listing fields only.

## 7. Migrations and release controls

- Never rewrite an already-applied migration to change production history.
- Add forward migrations for schema changes.
- Rehearse on a disposable/staging database.
- Back up and verify backup before production migration.
- Review destructive operations, security-definer functions, search_path, grants and policies.
- Use dry-run and compare expected migration IDs before push.
- Record the resulting production migration state and verification date.

## 8. Storage and personal data

Property media and verification evidence have different visibility requirements. Public listing images may be public after approval; identity, ownership and authority documents must remain private and access-restricted. Store only necessary data, define retention/deletion rules and avoid exposing internal addresses or documents through public APIs.

## 9. Outstanding work

- Produce a reviewed ER diagram from the full migration set.
- Build a table-by-table RLS matrix.
- Confirm actual production migration state and schema.
- Confirm whether all mandatory charges are persisted as structured data.
- Confirm caution-deposit custody and refund ledger fields.
- Confirm allocation snapshot and reward lifecycle are consistent and idempotent.
- Define retention and deletion periods for guest PII, identity documents, property evidence, financial records and audit records.
