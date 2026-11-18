# HAMLET Security, Privacy & Trust Handbook

**Version:** 2.0 draft · **Reviewed:** 2 November 2026  
**Status:** Policy baseline; full security and privacy review required.

## 1. Trust promise

HAMLET's core USP is “Shortlets, with accountability.” Trust claims must be specific, evidence-based and understandable. Do not imply legal title guarantee, insurance, escrow, physical security certification or background screening unless a defined process and accountable provider support the claim.

## 2. Property verification

Keep evidence dimensions separate:
- identity of owner/representative;
- authority to list/manage the property;
- ownership or control evidence reviewed;
- physical inspection or remote verification performed;
- property facts and amenities confirmed;
- current availability confirmation.

A self-reported item is not verified. A document uploaded is not proof it is authentic. Record reviewer, evidence, date, outcome, limitations and expiry/recheck where relevant.

## 3. Account and permission security

- Enforce roles and property assignment on server and database.
- Partner network registration does not grant privileged role.
- Admin-only operations require server-side role check.
- Revocation/suspension takes effect promptly.
- Prevent insecure direct object reference across profiles, properties, bookings, issues and evidence.
- Use least privilege and separate public-safe listing projection from private data.

## 4. Payment security

- Provider secrets remain server-side.
- Verify webhook signature, event type, transaction reference, amount, currency and expected booking state.
- Idempotently process retries and duplicate events.
- Browser redirects, screenshots and uploaded receipts are never proof of payment.
- Do not log card details or secret values.
- Distinguish provider-confirmed payment/refund from manual ledger notation.

## 5. Personal data

Collect only data needed for account, booking, support, verification and legal record obligations. Separate public profile/display data from private identity, contact and verification evidence. Restrict access by purpose. Define retention, deletion, correction, access request and breach response processes with Nigerian privacy counsel.

## 6. Media and content integrity

For real properties, use current owner-authorised photos tied to that property. Record source/permission and prevent reuse of imagery that could misrepresent a different property. Fictional showcase concepts must remain labelled illustrative, not verified and not bookable. Never infer amenities from images.

## 7. Audit and monitoring

Record material changes to property facts, authority, role/access, booking state, pricing/terms, payments, deposits, refunds, issues and admin decisions. Protect audit logs from ordinary user modification. Monitor webhook failures, auth failures, repeated duplicate submissions, suspicious referral patterns and reconciliation exceptions.

## 8. Security review checklist

- RLS policy matrix for every sensitive table.
- Server route auth and ownership checks.
- Security-definer RPC search_path and grants review.
- Storage bucket access and signed URL review.
- Secret scanning and client bundle inspection.
- CSRF/origin and rate-limit review where applicable.
- Input validation and file upload constraints.
- Dependency and CI security checks.
- Backup/restore rehearsal.
- Incident response and breach notification runbook.

## 9. Governance

No security control is “verified” because a checklist exists. Attach automated test results, dated manual test evidence or independent review. Security/privacy owner and escalation contacts must be assigned before production launch.
