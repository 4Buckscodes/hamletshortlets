# HAMLET Partner Payout Verification

## Product rule

Partner registration, partner workspace access, guest booking access and property submission are immediate. Payout verification is a separate control and must never be used to block those actions.

A partner payout requires all of the following:

1. Active HAMLET account and active partner-network membership.
2. Identity document submitted and marked verified by an administrator.
3. Bank beneficiary details submitted and independently checked; the database stores the bank name/code, beneficiary name, last four account digits and a verification reference, never the full account number.
4. Current signed partner agreement submitted and marked verified.
5. The booking's property is approved, and its ownership, authority and inspection verification values are all `verified`.
6. The beneficiary has active access to that property.

## Workflow

- Partner submits identity-document and signed-agreement storage paths, bank name/code, beneficiary name and account-number last four digits through `submit_partner_payout_verification`.
- The row is created or updated with pending statuses. Changing identity, bank or agreement details resets only the affected check to pending.
- An administrator independently checks the identity document, bank beneficiary using an approved bank/provider verification channel, and signed agreement.
- An administrator records the outcome through `review_partner_payout_verification`. Bank verification requires a non-empty external verification reference.
- `update_payout_status` rejects partner payout approval/payment until all partner checks and property-level checks pass.

## Security and operational boundaries

- Clients have read access to their own verification status, but no direct insert/update/delete privileges on the verification table.
- Verification outcomes can only be changed by the admin RPC.
- Full bank account numbers and raw identity-document contents are not stored in this table.
- Document paths must point to a private storage bucket with access policies that permit the submitting partner and authorized administrators only. The migration does not create or configure that bucket, and the frontend upload flow is not part of this database change.
- Bank verification is an operational manual/provider step. The reference is an audit pointer, not proof that an external bank API was called by this database function.
- Do not deploy this migration to production until the private document bucket, upload/download policies, administrator review UI, and local migration tests have been completed.
