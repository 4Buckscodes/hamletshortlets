# HAMLET Security & Authentication Hardening Plan

**Status:** In progress  
**Target branch:** `security/authentication-hardening`  
**Production project:** `jopnnevqnwrpldrojmdu`  
**Scope:** Authentication, authorization, database/API security, privacy, storage, and security verification.  
**Explicitly out of scope for this phase:** General task management, operational task assignment, and new partner/VIP workflow expansion.

## 1. Release principles

- Preserve the existing public marketplace, sign-in, booking request, partner, and admin journeys.
- Make changes additively and test them against a staging database before production.
- Never apply production migrations without owner approval, a verified backup/snapshot, and staging rehearsal.
- Do not blindly revoke every `SECURITY DEFINER` function. Classify each function by caller, purpose, and required grants, then verify its body enforces authorization.
- Keep service-role credentials server-only. Browser code may use only the Supabase publishable/anon key.
- Authorization must be enforced by the database and trusted server code, not by UI visibility or client-side role state.

## 2. Initial production observations (2026-11-10)

Read-only inspection of the production project found:

- 24 public tables; all currently report RLS enabled.
- `public.customer_email_notifications` has RLS enabled but no policies.
- Supabase security advisors report 5 anonymous-executable and 54 authenticated-executable `SECURITY DEFINER` functions. These are findings to investigate, not proof that every function is exploitable.
- The repository already contains `20261109142221_restrict_internal_security_definer_rpc.sql`, which revokes direct execution from selected trigger/internal helpers and removes anonymous execution from two predicate functions. Production advisor output still reports many exposed functions; verify whether this migration is applied and expand its classification safely.
- Leaked-password protection is disabled in the production Auth configuration.
- `pg_net` is installed in the public schema (advisor warning).
- `property-media` is a public bucket according to the repository's existing database release checklist. Review whether public reads are intentional and ensure uploads, updates, and deletes are constrained to authorised object owners and approved workflows.
- `supabase/config.toml` sets `verify_jwt = false` for several Edge Functions. Public webhooks may need this, but each function must independently verify its provider signature/secret and idempotency; notification dispatch functions require strong secret or service-role protection.

## 3. Workstreams

### A. Authentication

- Review email/password sign-up, sign-in, confirmation, password reset, OAuth callback, session refresh, and sign-out.
- Enable email confirmation and leaked-password protection after validating the production email delivery and account recovery journeys.
- Review password policy, rate limits, CAPTCHA/bot controls, redirect allow-lists, OAuth provider settings, and error-message enumeration.
- Ensure privileged routes and server actions validate the authenticated user from a trusted server context.
- Keep newly registered users at the least-privileged guest role; never accept role, account status, verification status, or admin status from client-supplied metadata.

### B. Authorization and roles

- Define an explicit permission matrix for guest, partner, owner, property manager, and admin.
- Separate account status, partner verification, property-specific access, and partner level.
- Verify all RPCs and server actions against `auth.uid()`, active account status, required role, property assignment, and permitted state transitions.
- Ensure administrator provisioning is restricted, audited, and not achievable through public sign-up metadata.
- Test horizontal privilege escalation (user A accessing user B's records) and vertical escalation (guest/partner attempting admin or financial actions).

### C. Database and RPC hardening

- Inventory every exposed `SECURITY DEFINER` function, effective EXECUTE grants, trigger usage, RLS dependency, and business purpose.
- Revoke direct RPC execution from functions intended only for triggers/internal use.
- For callable RPCs, retain only the minimum required role grants and validate authorization inside the function.
- Ensure every `SECURITY DEFINER` function has a safe fixed `search_path` and schema-qualified references.
- Add a restrictive policy or move `customer_email_notifications` behind trusted server-only access, based on its actual access pattern.
- Review views, sequences, default grants, constraints, triggers, and public schema exposure.

### D. Storage and privacy

- Review bucket visibility, object-level policies, MIME types, file-size limits, path ownership, overwrite behaviour, and deletion.
- Separate public listing media from private verification, identity, and incident evidence.
- Do not expose guest identity documents or private owner records to other guests or unauthorised partners.
- Review retention and deletion rules for sensitive data.

### E. Payments and trusted integrations

- Verify Paystack webhook signature, amount, currency, reference, booking binding, replay protection, and idempotency.
- Keep service-role keys and provider secrets out of client bundles and logs.
- Restrict notification dispatch and internal maintenance endpoints.
- Preserve immutable financial event history and require audited privileged adjustments.

### F. Audit and monitoring

- Ensure privileged actions, role changes, account suspension, property access changes, booking transitions, refunds, caution-deposit decisions, and payout changes are auditable.
- Review log access and prevent ordinary users from altering audit records.
- Establish alerting and incident response for repeated authentication failures, suspicious RPC usage, and privilege changes.

## 4. Required test matrix

Test with separate guest, active partner, suspended partner, property owner/manager, and administrator identities:

- Unauthenticated access to protected records and operations.
- Cross-user profile, application, booking, issue, notification, and ledger reads.
- Cross-property access and revoked property assignments.
- Attempts to self-promote roles or alter account/verification status.
- Direct RPC invocation with another user's IDs.
- Suspended account actions and session behaviour.
- Storage upload/read/update/delete outside permitted paths.
- Payment webhook invalid signature, wrong amount/currency/reference, duplicate delivery, and replay.
- Admin-only functions invoked by non-admin users.
- Password reset, email confirmation, OAuth callback, and redirect tampering.

## 5. Completion gates

1. Security inventory and permission matrix reviewed.
2. High-risk findings remediated or explicitly accepted with documented rationale.
3. Database migrations tested against a production-like staging copy.
4. Auth, RLS, RPC, storage, and payment security tests pass.
5. Existing booking, partner, and admin regression tests pass.
6. Production backup/snapshot verified and owner approval obtained before any production migration.
7. Post-release advisors and smoke tests reviewed; rollback plan documented.

## 6. Deferred work

The general HAMLET task-management module and expanded partner/VIP onboarding enhancements are deferred until this security foundation is reviewed, tested, and released.
