# HAMLET Partner Payout Verification

## Product rule

Partner registration, partner workspace access, guest booking access and property submission are immediate. Payout verification is a separate control and must never be used to block those actions.

A partner payout requires:
1. An active HAMLET account and active partner-network membership.
2. Identity evidence submitted and marked verified by an administrator.
3. Bank beneficiary details submitted and independently checked by an administrator using an approved bank/provider channel.
4. The current signed partner agreement submitted and marked verified.
5. The associated booking's property approved with ownership, authority to list and physical inspection all verified.
6. Active beneficiary access to the associated property for property-attributed commission.

## Partner submission

The partner workspace route is `/partners/payout-verification`.

- Identity and signed agreement documents are uploaded to the private `partner-verification-documents` bucket.
- Object paths are user-scoped: `<auth-user-uuid>/<identity|agreement>/<filename>`.
- Accepted file types: PDF, JPEG, PNG and WEBP. Maximum size: 10 MB.
- Bank details include bank name, bank code, beneficiary name and only the last four account digits. Never request or store a full account number, PIN or card credentials.
- The `submit_partner_payout_verification` RPC stores the evidence paths and resets only changed checks to pending.
- The bucket is private. Authenticated active partners can upload/read their own folder; active administrators can read documents for review. Admin document links are short-lived signed URLs.

## Administrator review

The review queue is `/admin/partner-verification`.

Administrators independently set identity, bank and agreement outcomes to pending, verified or rejected. Bank verification requires a bank/provider reference. Reviewer notes and decisions are recorded in `admin_audit_log` and `partner_payout_verifications`.

The database does not call a bank API or independently validate identity. An administrator must perform those checks through an approved provider/process before recording a verified outcome.

## Settlement enforcement

HAMLET currently has a financial ledger and administrator reconciliation screen, but the repository does not contain an outbound Paystack transfer/recipient worker. The `approved` and `paid` ledger states are not themselves bank transfers. An administrator must complete an externally approved transfer process and record the confirmed result; do not describe this as automated settlement.

- `update_payout_status` checks all three partner verification statuses and the associated property verification before approval/payment.
- A database trigger on `booking_payment_records` independently enforces the same gate on INSERT/UPDATE, including booking-transition and service-role writes that do not call the admin RPC.
- Partner commission/referral ledger rows cannot be approved or marked paid without a beneficiary account.
- Non-partner platform/provider ledger records retain their existing handling.
- This trigger is a ledger-state control. Any external transfer worker must still be reviewed to confirm it never initiates a bank transfer without a ledger row that has passed this gate.

## Release checklist

- [ ] Run the full PGlite/Vitest suite and resolve all failures.
- [ ] Run ESLint and Next.js production build.
- [ ] Run Playwright E2E for partner upload, admin document review and payout blocking/allowing.
- [ ] Verify the private bucket and policies on a non-production Supabase project before applying the migration to production.
- [ ] Inspect every external transfer/settlement worker and reconcile its eligibility predicate with the ledger trigger.
- [ ] Deploy application and migration together only after CI is green.
