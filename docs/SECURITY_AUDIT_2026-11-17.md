# HAMLET production database security review
Date: 2026-11-17
Project: `jopnnevqnwrpldrojmdu` (hamletshortlets)
Scope: read-only review of Supabase Security Advisor findings and selected PostgreSQL function definitions, ACLs, RLS and table grants.

## Executive result
No production database changes were made. The project is healthy, but the advisor findings need to be interpreted by function purpose and verified against application usage. A blanket revoke of `EXECUTE` from all SECURITY DEFINER functions would break legitimate application workflows and is not recommended.

## Findings reviewed

### 1. Five anonymous-callable SECURITY DEFINER RPCs
The advisor reports these functions as executable by `anon`:

- `get_public_property_calendar(text[])`
- `get_unavailable_property_ids(date,date)`
- `record_share_link_visit(text,text,text)`
- `resolve_referral_code(text)`
- `submit_property_enquiry(text,text,text,text,text,text,text)`

Their current bodies were inspected.

**Intended public use / controls observed**
- Calendar and unavailable-property RPCs expose availability/conflict information for approved listings only. They do not return guest names, emails, booking references or payment data.
- Referral lookup returns the active partner's referral code, display name and company. Confirm that these fields are intentionally public in the product's privacy model.
- Share-link visit recording validates token format, session-key length, active/expiry state, partner authority and self-visit conditions. It preserves first-touch attribution.
- Property enquiry submission restricts enquiries to approved listings and validates name, email and message lengths. It records optional referral attribution.

**Remaining risks / follow-up**
- Public enquiry and visit RPCs are abuse/spam surfaces. Add rate limiting or abuse controls at an edge/server boundary, and consider stricter idempotency-key length/format validation. Do not rely on client-provided idempotency keys as a security control.
- Confirm referral partner name/company disclosure is intentional.
- Keep public calendar responses limited to availability data; do not add booking identity or transaction metadata.
- Test anonymous and authenticated RPC behavior after any future permission changes.

These five functions appear to be deliberately public workflows, but they remain SECURITY DEFINER and must be maintained as privileged API endpoints.

### 2. Authenticated-callable SECURITY DEFINER functions
The advisor reports 54 authenticated-callable functions. A sample of privileged function bodies was inspected. Administrative operations such as referral dispute resolution and admin email authorization explicitly check `auth.uid()`, active account status and admin role. Property management operations call ownership/assignment authorization helpers.

This is not sufficient to certify all 54 functions. Complete per-function review remains required, including helper-function behavior, parameter validation, search paths, and whether any operation trusts user-editable metadata.

**Do not revoke authenticated execution wholesale.** That would break legitimate partner, guest and admin workflows. Review each function's grants and body, and retain only the intended roles.

### 3. `customer_email_notifications` RLS
- RLS is enabled.
- No RLS policies exist.
- Table grants observed are limited to `postgres` and `service_role`; no `anon` or `authenticated` table grants were present.

This appears intentionally service-role-only. The advisor's RLS-without-policy finding is therefore consistent with a deny-by-default design. Keep it that way unless a user-facing access path is explicitly designed and separately reviewed.

### 4. Other advisor findings
- `pg_net` is installed in the `public` schema. Review whether it can be moved safely; do not move it without checking dependent functions/extensions.
- Multiple permissive SELECT policies were reported on payment records, properties, property access and private property records. These may be logically correct but should be consolidated only after checking policy predicates and query plans.
- Several foreign keys lack covering indexes. Prioritize based on actual query workload and table growth rather than adding every suggested index blindly.
- Unused-index notices are informational and should not trigger automatic deletion.

## Required next steps before launch
1. Complete a full per-function review of all authenticated-callable SECURITY DEFINER functions, especially payment, refund, settlement, role management, partner access and admin functions.
2. Inspect function-level `search_path` settings and ensure privileged functions use a fixed safe search path or schema-qualified references.
3. Add server/edge rate limiting and abuse protection for public enquiry and share-event endpoints.
4. Verify no public response exposes guest identity, booking references, private property records or financial details.
5. Review permissive RLS policy overlap and missing foreign-key indexes with workload evidence.
6. Re-run Supabase Security and Performance Advisors after approved changes.

## Release decision
**Not a security sign-off.** This is a scoped read-only assessment. No database grants, policies, functions, extensions, migrations or production records were changed. Production release should remain gated on the full privileged-function review and end-to-end authorization tests.

### 5. Payment function and commercial integrity
The payment-confirmation function `confirm_booking_payment_webhook` is restricted to `service_role` (plus database owner), not `anon` or `authenticated`. This is appropriate for a trusted webhook/server-side operation.

Its current implementation records a **20% domestic accommodation markup**, with additional allocations for partner commission, a 2.5% internal payment reserve, referral rewards and other settlement components. This is existing production database logic. It must not be silently changed as part of a security cleanup.

Before checkout is enabled, reconcile this implementation against the final HAMLET commercial decision and the central pricing function. In particular, verify the guest-facing fee, fee payer, provider charge treatment, owner proceeds, agent/referral allocations, caution deposit separation, refunds and ledger totals. A mismatch between the UI quote and webhook settlement calculation would create a material financial integrity risk.

## 6. Follow-up verification — 2026-11-18

A second read-only pass was completed against the live production catalog and current release branch. It did not change database objects, permissions, settings, or records.

### Function inventory and execution grants
- The current catalog query returned 49 public SECURITY DEFINER functions executable by authenticated; the Supabase Advisor's earlier count was 54. Reconcile this count difference against the Advisor's exact snapshot and all schemas before treating the inventory as closed.
- All functions in the queried public inventory had an explicit empty search_path setting (search_path = ''). This is a safe baseline when function bodies schema-qualify object references.
- The payment webhook confirm_booking_payment_webhook remains restricted to service_role and the database owner; it is not executable by anon or authenticated.
- Public anonymous RPCs remain a separate intentional-public-API review category.

### Authorization gap requiring remediation
The helper public.has_role(text) checks only profiles.id = auth.uid() and the role value. It does not check account_status. Therefore an admin-only function that calls has_role('admin') but omits is_account_active() does not itself reject a suspended administrator.

The current definitions inspected show this missing active-account check in at least:
- grant_property_assignment
- reconcile_ledger_entry
- record_booking_refund
- record_ledger_adjustment
- review_partner_application
- review_partner_property
- set_partner_account_status

These functions check caller identity and admin role, validate relevant parameters/state, and write audit records; the gap is specifically that they do not require the caller's account to be active. Add the active-account check consistently in a reviewed migration, then test active-admin success and suspended-admin denial for every affected RPC. Do not apply a broad blanket revoke, and do not patch production as part of this review.

revoke_property_assignment permits an assigned partner to revoke their own assignment as well as allowing an admin to revoke it. This appears consistent with self-service access removal, but suspended-account behaviour should be explicitly decided and tested.

### Other authorization observations
- transition_booking checks guest ownership for guest cancellations and can_manage_property for partner/admin actions, constrains transitions, checks booking overlap and payment deadlines, and audits changes. It does not directly call is_account_active(); verify that can_manage_property enforces active account status for every partner/admin path.
- transition_caution_deposit checks account activity and limits partner actions to inspection/dispute updates; final refund actions are admin-only.
- record_booking_refund is admin-only and reverses commissions/referrals, but needs the active-admin guard noted above and an end-to-end idempotency/duplicate-refund test before release.
- record_ledger_adjustment and reconcile_ledger_entry are admin-only and audited, but need the active-admin guard noted above plus bounds and duplicate-entry tests.
- review_partner_application and review_partner_property enforce admin role, valid status transitions, verification requirements and audit logging, but need the active-admin guard noted above.
- set_partner_account_status checks admin role, target partner role, valid status, documented reason and audit logging; it also suspends eligible associated listings when requested. It needs the active-admin guard noted above.
- customer_email_notifications remains RLS-enabled with no policies and grants only for postgres/service_role, consistent with a service-role-only queue.

### Application-side acceptance review
- The Google button uses Supabase OAuth with PKCE and a callback on the current origin. The next/redirect target rejects protocol-relative/external URLs and sign-in/sign-up loops. First-time Google users are intended to remain guests; code review is not a live OAuth acceptance test.
- Google provider enablement, Google Cloud client credentials and preview redirect allowlisting are external configuration dependencies. No provider credentials were exposed in this review, so Google sign-in success and first-login profile creation remain unverified.
- The partner application requires an authenticated user, validates required fields and inserts an application with the authenticated user ID/email and pending status. RLS permits an active guest to create their own application; application review is admin-only. The form explicitly states that submission does not grant partner permissions. A live insert/review/approval test still requires a controlled test account and must not be run against real applicants without consent.
- Preview HTTP/browser smoke tests could not be completed from this environment because the preview hostname could not be resolved by the available network client. Vercel build output is not equivalent to route-response or browser acceptance.

### Commercial reconciliation — current authoritative implementation
The current repository's MVP_SPECIFICATION.md, docs/PRICING_AND_PAYMENT_CONTRACT.md, docs/PILOT_PRICING_IMPLEMENTATION.md, and src/lib/pricing.ts define the approved guest pricing rule as 20% of the owner's accommodation base B, added once to B. The older 3% guest-only discussion is not the current code/spec authority and must not be reintroduced without a new founder-approved commercial decision.

The current central engine and webhook are broadly aligned on:
- 20% domestic accommodation markup on B;
- closing-agent allocation of 10% of B when attributed;
- eligible recurring direct-referrer reward of 2.5% of B;
- 2.5% internal payment/settlement reserve;
- HAMLET remainder of 5% of B with an eligible referrer or 7.5% without one;
- 10% international USD/GBP buffer applied once to the already-marked-up stay amount;
- refundable caution deposit kept separate from markup, FX buffer and commissions;
- actual gateway fee recorded separately from the internal reserve.

Material open reconciliation item: the webhook also creates additional partner_commission ledger entries from active property_access.commission_rate values, excluding the closing agent. These are separate from the 20% markup allocation. The code records full owner accommodation revenue at B and records those extra partner commissions as payable, so the approved funding source and whether these commissions are deducted from owner proceeds, separately funded, or limited to an agreed scope must be explicitly documented and tested. Do not assume they are covered by the 20% markup or silently deduct them from the owner.

Payment launch gate: Paystack's written approval of HAMLET's third-party short-let marketplace collection, platform markup, commission allocations and owner/partner settlement flow is still required. A configured checkout key or successful test charge alone does not establish provider approval. Actual provider charges must reconcile separately against the 2.5% internal reserve; overpayments, underpayments, duplicate callbacks, refunds, reversals, caution deposits and payout status transitions need controlled test-mode evidence.

### Updated release decision
The latest preview build is READY, but route HTTP/browser smoke tests are not verified. Google OAuth is code-integrated but not provider-accepted. Partner application logic is code-reviewed but not live acceptance-tested. The 20% guest pricing rule is identified in the current spec/code; extra partner commissions and Paystack settlement permission remain unresolved. The authenticated SECURITY DEFINER inventory still has the active-admin gap above and a 49-versus-54 inventory-count discrepancy.

This remains a release-readiness review, not a security or payment sign-off. Keep production checkout and domain cutover gated until the listed remediation and acceptance evidence is complete.
