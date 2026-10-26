# HAMLET.REST — Supabase Database Release Checklist

**Live Project Ref:** `jopnnevqnwrpldrojmdu`  
**Important Governance Rule:** Never apply production schema migrations without explicit owner approval, a verified backup/snapshot, and staging rehearsal.

---

## 1. Migration Inventory (Live Deployed vs. Repository Pending)

### Currently Applied on Live `jopnnevqnwrpldrojmdu` (8 Migrations)
1. `20261022120000` (`initial_schema`)
2. `20261022130000` (`app_workflows`)
3. `20261022140000` (`partner_property_submission`)
4. `20261022141000` (`admin_property_review`)
5. `20261023100000` (`payments_ledger_and_operations`)
6. `20261023120000` (`pilot_feedback_partner_governance_and_corrections`)
7. `20261023180000` (`booking_notifications_and_resend_outbox`)
8. `20261024073312` (live consolidation through `mvp_live_readiness` + `availability_referrals_pricing_fx_settlement` + `property-media` storage bucket)

### Local Repository Migrations Pending Staging / Production Review
- `20261024140000_endpoint_bugfixes_and_ux_parity.sql` — Expands `update_and_resubmit_partner_property` to support `draft` status edits directly, enriches `resubmit_partner_application` for `0`-property agent/referrer lanes, and enriches outbox notification payloads.
- `20261024160000_seed_sample_listings_optional.sql` — Guarded behind `app.seed_demo_data = 'true'` (no-op on production unless explicitly enabled; **do not enable demo seed data on production**).
- `20261024180000_hamlet_wayfinder_arrival_guidance.sql` — Adds Wayfinder tables (`property_wayfinder_guides`, `waypoints`, `steps`, `secrets`, `verifications`, `wayfinder_events`) and optional `properties` columns (`city`, `public_location_summary`, `public_landmarks`, `location_accuracy`, `wayfinder_status`).
- `20261026100000_booking_overlap_rpc.sql` — Initial boolean `has_booking_overlap` helper.
- `20261026120000_nextjs_mvp_rpc_and_overlap_hardening.sql` — Reconciles `has_booking_overlap` with `get_unavailable_property_ids` (honouring `first_available_date`, `property_availability_blocks`, `confirmed`/`disputed` stays, and non-expired `awaiting_payment` holds).

> **Backward Compatibility Note:** The Next.js App Router codebase in this branch is **100% compatible with the current live 8-migration schema today** (`PUBLIC_PROPERTY_SELECT` avoids unapplied Wayfinder columns, and `isMissingSchemaObjectError` gates Wayfinder RPC probes cleanly). Applying the pending migrations unlocks draft re-saving via `update_and_resubmit_partner_property` and Wayfinder arrival guides.

---

## 2. Pre-Migration Checklist

1. **Confirm Owner Approval** in writing before touching `jopnnevqnwrpldrojmdu`.
2. **Verify Local PGlite Suite Passes**:
   ```bash
   npm test
   ```
3. **Create a Supabase Database Backup / Point-in-Time Snapshot** in the Supabase Dashboard (`Database → Backups`).
4. **Rehearse on a Staging Project / Branch** first:
   ```bash
   npx supabase db push --dry-run
   ```
5. **Confirm Demo Seed Flag Is Off**: Verify `app.seed_demo_data` is unset/`false` so `20261024160000` remains a strict no-op in production.

---

## 3. Controlled Application Steps

```bash
npx supabase link --project-ref jopnnevqnwrpldrojmdu
npx supabase migration list
npx supabase db push
```

---

## 4. Post-Migration Verification Queries

Run these read-only verification checks in the Supabase SQL Editor after pushing:

```sql
-- 1. Confirm RLS is enabled on every public table
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;

-- 2. Confirm overlap RPC parity
select proname, prosecdef
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and proname in ('has_booking_overlap', 'get_unavailable_property_ids');

-- 3. Confirm active FX reference rates
select currency, ngn_per_unit, buffer_rate, is_active
from public.currency_exchange_rates;

-- 4. Confirm property-media storage bucket limits
select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'property-media';
```

---

## 5. Rollback Plan

- Because Next.js queries use `PUBLIC_PROPERTY_SELECT` (base schema columns) and graceful `isMissingSchemaObjectError` probes, rolling back the frontend deployment does **not** require dropping newly added nullable columns.
- If an RPC regression occurs, re-apply the prior `create or replace function` definition from git history (`20261024100000_availability_referrals_pricing_fx_settlement.sql`) or restore from the pre-migration Supabase backup snapshot.
