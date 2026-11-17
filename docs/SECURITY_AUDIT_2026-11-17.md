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
