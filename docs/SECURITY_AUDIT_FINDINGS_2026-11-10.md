# HAMLET Security Audit Findings

**Audit date:** 10 November 2026  
**Environment inspected:** Production Supabase project `jopnnevqnwrpldrojmdu` (read-only) and GitHub default branch `main`.  
**Implementation branch:** `security/authentication-hardening`

This is an evidence-based snapshot, not a claim that the production environment has been remediated. No production schema, Auth setting, secret, Edge Function, or deployment was changed during this audit.

## Executive findings

| Control | Observed state | Assessment |
|---|---|---|
| Public tables | 24 tables inspected; RLS enabled on all 24 | Positive baseline; policy and grant checks still matter |
| SECURITY DEFINER functions | 82 in `public` | Requires allowlist-based privilege review |
| SECURITY DEFINER callable by `authenticated` | 54 | Not automatically a vulnerability; inspect each function's caller/ownership checks |
| SECURITY DEFINER callable by `anon` | 5 | These map to explicit public guest journeys and need regression coverage |
| SECURITY DEFINER search_path | 0 missing explicit `search_path` in inspected set | Positive baseline |
| Customer email outbox | RLS enabled, no policies, no SELECT/INSERT grants to anon/authenticated | Correctly inaccessible to API clients; service-side dispatch is the intended path |
| Property media bucket | Public, 5 MiB limit, JPEG/PNG/WebP only | Public read is intentional for listing imagery; upload/delete policies scope by user folder |
| Leaked-password protection | Disabled in project security advisor | Auth configuration remediation required |
| Next.js server auth | Existing helper uses `supabase-js` with a manually supplied bearer token; no root `middleware.ts` or `proxy.ts` found | Review route-by-route; consider cookie-backed SSR only as a planned migration, not a drop-in replacement |

## Public RPC allowlist

The five SECURITY DEFINER functions executable by `anon` in the inspected production schema are:

- `get_public_property_calendar(text[])`
- `get_unavailable_property_ids(date,date)`
- `record_share_link_visit(text,text,text)`
- `resolve_referral_code(text)`
- `submit_property_enquiry(text,text,text,text,text,text,text)`

These are tied to public availability display, share attribution, referral validation, and guest enquiry journeys. Do not blanket-revoke anonymous EXECUTE from every SECURITY DEFINER function: that would break public flows. Their inputs, rate-limits, output fields, and abuse controls should be reviewed individually.

## Internal trigger functions

The November 9 migration `20261109142221_restrict_internal_security_definer_rpc.sql` is present in production migration history. The migration revokes API-role EXECUTE on its trigger-only/internal function set while preserving trigger invocation. A new regression test now locks those grants down.

## Table-level notes

- `customer_email_notifications` has RLS enabled and no client policies. The live grants also deny SELECT and INSERT to both `anon` and `authenticated`. This is a deliberate server-only outbox boundary; do not add a permissive client policy.
- Some tables have table-level SELECT grants to API roles but RLS policies only for authenticated users or restricted rows. A grant alone does not bypass RLS. Keep tests checking both ACLs and policy predicates.
- The public `property-media` bucket is suitable only for public listing assets. Identity documents, ownership evidence, incident evidence, and other private records must not be placed in this bucket.

## Critical booking-expiry authorization finding

The live `public.expire_overdue_bookings()` RPC was executable by authenticated users and its deployed function body accepted any caller with a valid HAMLET profile. It performs a global update across all overdue `awaiting_payment` bookings, not just the caller's own bookings. The application also invoked it during general client-state hydration, on a guest account-bookings page, and from a periodic client timer.

This is an authorization boundary failure: an ordinary guest or partner could trigger a global booking state transition affecting other customers. The hardening branch now:

- Replaces the RPC body with an active-admin-or-`service_role` check.
- Removes the guest account page and general store/timer invocations.
- Preserves the explicit admin dashboard action and trusted server-role use.
- Adds regression tests requiring guest/partner rejection, admin success, and service-role success.

The migration is branch-only and has not been applied to production. Because booking lifecycle tests previously encoded the weaker behaviour, those tests were updated to assert the intended administrator-only boundary.

## Central role predicate finding

The production `public.has_role(text)` predicate checked the caller's profile role but did not require `account_status = 'active'`. Several SECURITY DEFINER RPCs and RLS policies rely on this shared predicate. The hardening branch updates it to require an active account and adds regression coverage for suspended partner and administrator accounts. The migration preserves authenticated and service-role execution while denying anonymous execution.

## Remaining advisor findings

- Leaked-password protection is disabled in Supabase Auth. This requires an Auth dashboard configuration change; no supported connected action was available to change it safely in this pass.
- `pg_net` is installed in the `public` schema. Relocating the extension needs a dependency review and separate migration; it has not been moved.
- The advisor reports `customer_email_notifications` as RLS-enabled with no policies. The live ACL confirms that neither `anon` nor `authenticated` has SELECT or INSERT privileges, so this is the intended server-only outbox boundary rather than an exposed table.

## Edge Function observations

- `booking-notifications` is configured with platform JWT verification disabled, but its handler accepts either a validated internal dispatch secret or a bearer token that is checked with Supabase Auth and then authorized against the booking. Its service-role operations are behind that authorization path.
- `customer-notifications-dispatch` is configured without platform JWT verification, but the handler requires the internal dispatch secret (or the vault-verified equivalent) before claiming or sending messages.
- `admin-notifications-dispatch` follows the same secret-gated internal dispatch pattern and must remain inaccessible to ordinary browser callers.
- Paystack webhook and initialization source retrieval through the Supabase function API was unavailable during this pass. The repository contains Paystack handler code and tests; inspect both source files and deployed versions before any payment-function change. A webhook may legitimately have platform JWT verification disabled only when its Paystack signature and payment confirmation checks are enforced in the handler.

## Authentication architecture observations

- The Next.js sign-in page uses the browser Supabase client for email/password and Google OAuth.
- OAuth callback currently obtains/exchanges the session in the browser, reads the caller's profile, and invokes narrowly scoped profile/referral RPCs.
- `createServerUserSupabase(accessToken)` creates a server-side client with the user's bearer token. Existing API routes use it for user-scoped operations.
- No root-level `middleware.ts` or `proxy.ts` was found in the inspected branch. Do not infer that UI route visibility is an authorization control; each data operation must continue to enforce ownership and role checks in RLS/RPC/server handlers.
- The repository's `supabase/config.toml` has local Auth defaults that differ from the desired production posture (including email confirmation disabled and localhost site URL). Dashboard settings may differ. Reconcile production settings before applying config changes.

## Work committed in the hardening branch

- `docs/SECURITY_AND_AUTHENTICATION_HARDENING.md`: agreed scope and release gates.
- `supabase/tests/security_rpc_privileges.test.ts`: regression coverage for internal trigger RPC revokes, public RPC allowlist, and customer email outbox grants.
- `src/lib/authRedirect.security.test.ts`: regression coverage for external redirects, auth loops, and guest/partner/admin workspace boundary routing.

## Release gates still open

1. Run the full Vitest suite, lint, TypeScript/build, and Playwright suite on the branch.
2. Confirm the new privilege tests pass against the repository's complete migration chain.
3. Inspect every SECURITY DEFINER function's intended caller, data exposure, role checks, account-status checks, and grant.
4. Retrieve and compare deployed Paystack/admin dispatch function source with the repository version.
5. Configure leaked-password protection and review confirmation, password, redirect, CAPTCHA/rate-limit, and SMTP settings in the Supabase Auth dashboard.
6. Complete staging rehearsal, backup verification, and regression checks before production database/configuration changes.
7. Deploy the verified application release and run post-deployment booking/auth checks.

## Explicitly not changed

No production database migration was applied. No production Auth settings or secrets were changed. No Edge Function was redeployed. No application deployment was made. Task management remains deferred.
