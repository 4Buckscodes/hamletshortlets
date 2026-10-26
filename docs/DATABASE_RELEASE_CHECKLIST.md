# HAMLET.REST — Supabase Database Compatibility & Release Checklist

**Live Project Ref:** `jopnnevqnwrpldrojmdu`  
**Important Governance Rule:** Never apply production schema migrations without explicit owner approval, a verified backup/snapshot, and staging rehearsal.

---

## 1. Audited Live Schema Compatibility Summary (2026-10-26)

**Key Finding:** The merged Next.js App Router codebase (`main` @ `b2877c47`+) is **100% compatible with the unmodified live production database today** — **zero SQL migrations are required prior to custom-domain cutover**:

- **All `17` core tables exist with `RLS = true`:** `admin_audit_log`, `admin_bootstrap_emails`, `booking_caution_deposits`, `booking_feedback`, `booking_issues`, `booking_notifications`, `booking_payment_records`, `bookings`, `currency_exchange_rates`, `partner_applications`, `partner_referral_rewards`, `partner_referrals`, `profiles`, `properties`, `property_access`, `property_availability_blocks`, `property_private_records`.
- **Storage bucket `property-media` is live (`public: true`).**
- **All `58` core RPCs & triggers called by Next.js are live:**
  - `submit_partner_property` & `update_and_resubmit_partner_property` already support `'draft'` status listings on live `jopnnevqnwrpldrojmdu`.
  - `get_unavailable_property_ids` & `enforce_booking_request_integrity` already enforce `pg_advisory_xact_lock`, `first_available_date`, `property_availability_blocks`, `confirmed` bookings, non-expired `awaiting_payment` 48h holds, and authoritative `v2_20pct_markup_10pct_fx_buffer` pricing.
  - `confirm_booking_payment_webhook`, `transition_booking`, `transition_booking_issue`, `record_booking_refund`, `update_payout_status`, `transition_caution_deposit`, `review_partner_property`, `review_partner_application`, `set_partner_account_status`, and `set_guest_account_status` are all live.
- **Unapplied Wayfinder columns are safely gated:** `PUBLIC_PROPERTY_SELECT` queries only guaranteed live columns, and `isMissingSchemaObjectError` gracefully gates `probePropertyWayfinderMeta` and `get_guest_booking_wayfinder` until `20261024180000` is applied.

---

## 2. Migration History Mapping & Critical CLI Repair Note

### Why Raw `npx supabase db push` Must Not Be Run Without `migration repair`
On live `jopnnevqnwrpldrojmdu`, the first 14 repository migrations (`20261022120000_initial_schema.sql` through `20261024140000_endpoint_bugfixes_and_ux_parity.sql`) are **already applied**, but `supabase_migrations.schema_migrations` records the 8 tracked migrations under server-assigned UTC timestamps:

| Local Repository Migration File | Live Status on `jopnnevqnwrpldrojmdu` | Recorded Remote Version in `schema_migrations` |
| --- | --- | --- |
| `20261022120000_initial_schema.sql` .. `20261022143000_booking_lifecycle.sql` (6 files) | **Applied** (initial SQL bootstrap) | *(predates `schema_migrations` rows)* |
| `20261023100000_payments_ledger_and_operations.sql` | **Applied** | `20261023134953` |
| `20261023120000_pilot_feedback_partner_governance_and_corrections.sql` | **Applied** | `20261023135103` |
| `20261023150000_guest_signup_profile_phone.sql` | **Applied** | `20261023135113` |
| `20261023180000_booking_notifications_and_resend_outbox.sql` | **Applied** | `20261023135157` |
| `20261023200000_endpoint_hardening_and_parity.sql` | **Applied** | `20261023135222` |
| `20261023220000_mvp_live_readiness.sql` | **Applied** | `20261023145604` |
| `20261024100000_availability_referrals_pricing_fx_settlement.sql` | **Applied** | `20261024065745` |
| `20261024140000_endpoint_bugfixes_and_ux_parity.sql` | **Applied** | `20261024073312` |
| `20261024180000_hamlet_wayfinder_arrival_guidance.sql` | **Pending (Optional Feature)** | — |
| `20261026100000_booking_overlap_rpc.sql` | **Pending (Superseded by `20261026120000`)** | — |
| `20261026120000_nextjs_mvp_rpc_and_overlap_hardening.sql` | **Pending (Optional Helper RPC)** | — |

---

## 3. Safe Procedure When Applying the Optional Pending Migrations

When the owner approves enabling **Wayfinder Arrival Guides** (`20261024180000`) and the standalone `has_booking_overlap` helper (`20261026120000`):

1. **Take a manual Supabase Database Backup** in Supabase Dashboard (`Database → Backups`).
2. **Verify local PGlite test suite passes**:
   ```bash
   npm test
   ```
3. **Align `schema_migrations` tracking table** (marks already-live local versions as `applied` and retires the server-timestamped duplicate IDs without re-executing SQL):
   ```bash
   npx supabase link --project-ref jopnnevqnwrpldrojmdu

   npx supabase migration repair --status reverted \
     20261023134953 20261023135103 20261023135113 20261023135157 \
     20261023135222 20261023145604 20261024065745 20261024073312

   npx supabase migration repair --status applied \
     20261022120000 20261022130000 20261022140000 20261022141000 \
     20261022142000 20261022143000 20261023100000 20261023120000 \
     20261023150000 20261023180000 20261023200000 20261023220000 \
     20261024100000 20261024140000
   ```
4. **Dry-run first (`--dry-run`)** and confirm **only** `20261024180000`, `20261026100000`, and `20261026120000` are queued:
   ```bash
   npx supabase db push --dry-run
   npx supabase db push
   ```

---

## 4. Post-Migration Read-Only Verification Queries

```sql
-- 1. Confirm RLS remains enabled on every public table
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
```

---

## 5. Database Rollback Compatibility

- Both `20261024180000` (Wayfinder tables + nullable `properties` columns) and `20261026120000` (`has_booking_overlap` function) are **strictly additive** — neither alters existing column types, drops constraints, nor changes `bookings` / `properties` RLS policies.
- Rolling back the frontend between Next.js (`hamletshortlets-jonn`) and Vite (`hamletshortlets`) requires **zero database rollback**.
