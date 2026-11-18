# HAMLET Requirements Traceability Matrix

**Last reviewed:** 2 November 2026  
**Status:** Initial audit baseline. “Implemented” labels are provisional until end-to-end evidence is attached.

| ID | Capability / requirement | Evidence to inspect | Initial status | Gap / next verification |
|---|---|---|---|---|
| R-001 | Public Lagos discovery | `app/page.tsx`, `app/stays/**`, public property query | Implemented — unverified | Confirm empty/live inventory behaviour and PR #55/#56 after merge |
| R-002 | Property detail and transparent quote | `app/stays/[id]/**`, `src/lib/pricing.ts` | Implemented — unverified | Verify mandatory charges, deposit display and server/client parity |
| R-003 | Guest authentication/account | `app/signin/**`, `app/account/**`, auth policies | Implemented — unverified | Test all auth redirects, suspended accounts and access controls |
| R-004 | Partner application and role handling | `app/partners/apply/**`, partner migrations/RPCs | Implemented — unverified | Migration creates self-service network membership without privileged role; API and submission RPC separately require approved `partner` role |
| R-005 | Property submission | `app/api/partner/properties/route.ts`, partner routes, migrations | Implemented — unverified | Verify owner authority, media, validation, duplicate detection and resubmission |
| R-006 | Property review and publishing | `app/admin/properties/**`, review RPCs | Implemented — unverified | Verify evidence definitions, admin audit and public-safe projection |
| R-007 | Duplicate property prevention | Property schema, submission/review code | Partially implemented / unverified | Establish canonical property identity, duplicate flags, merge/claim and referral preservation |
| R-008 | Availability and booking overlap | Availability migrations/RPCs, booking API | Implemented — unverified | Test concurrency, hold expiry, calendar responsibility and check-in/out boundaries |
| R-009 | Request-to-book lifecycle | `app/api/booking-requests/route.ts`, booking RPCs, partner booking route | Implemented — unverified | Verify all state transitions, timeout and partner decision permissions |
| R-010 | 20% pricing pool | `src/lib/pricing.ts`, `src/lib/pricing.test.ts` | Implemented — verified at unit level | Database-side booking integrity/pricing trigger and `consolidated_brief_e2e.test.ts` cover persisted allocation fields; run the suite and trace exact live trigger version |
| R-011 | Owner/agent fixed or net-rate offers | Partner schema/UI/RPCs | Awaiting verification | Determine whether complete workflow exists and reconcile with 10% closing-agent pool |
| R-012 | Direct partner referral reward | Referral migrations, RPCs, partner earnings | Partially implemented — code present | Lifecycle migrations `20261028120000`, `20261028140000`, `20261030150000` and tests document first completed booking as zero-payout activation, then 2.5% on subsequent eligible completed bookings within 90 days; execute tests and verify cancellation/refund reversals |
| R-013 | Paystack initialization and webhook | Supabase Edge Functions and provider docs | Implemented — unverified end-to-end | Webhook RPC is server-only and payment tests cover forbidden client calls; still verify live merchant approval, secret mode, event delivery and real fund movement |
| R-014 | Financial settlement ledger | Payment migrations, admin settlements, partner earnings | Partially implemented — unverified | Reconcile all pool lines, provider fee, mandatory charge payees and deposit liability |
| R-015 | Caution deposit inspection/refund | Booking schema, partner/admin/guest screens and RPCs | Partially implemented — unverified | Deposit row is created by booking trigger; admin transition RPC/UI captures deductions, evidence and refund reference; custody, guest response rights, deadlines and actual fund movement remain unresolved |
| R-016 | Cancellation/refund | Booking transitions, refund RPCs, admin screen | Partially implemented — unverified | Approve policy matrix; verify provider execution vs ledger-only recording |
| R-017 | Tax calculation and remittance | Schema, pricing service, ledger and reports | Awaiting decision / not evidenced | No complete jurisdiction-aware tax module established in audit |
| R-018 | Incident reporting and resolution | Guest issue screen, admin issues, issue RPCs | Implemented — unverified | Verify evidence upload, escalation, response SLAs and resolution audit |
| R-019 | Partner network registration | Migration `20261031100000`, partner network screens/RPCs | Implemented — unverified | Separate membership table/RPC verified in source; property submission still requires approved partner role; execute RLS tests and verify live role transitions |
| R-020 | Notifications | Booking notification Edge Function/outbox | Implemented — unverified | Verify sender credentials, delivery, retry, templates and failure monitoring |
| R-021 | Security/RLS | All migrations, policies, API routes, auth guards | Unverified | Full RLS matrix and abuse/security review required |
| R-022 | SEO and indexable public pages | Next.js routes, metadata, sitemap, robots | Implemented — unverified | Run route crawl, canonical and structured-data validation |
| R-023 | Lagos showcase concepts | PR #54 merged, showcase inventory/checklist | Implemented — unverified | Ensure every concept remains non-bookable and explicitly illustrative |
| R-024 | Guest early-access interest | PR #56 | Planned / PR open at audit | Does not persist leads; email-app handoff only; reclassify after merge |
| R-025 | Selected showcase homepage section | PR #55 | Planned / PR open at audit | Reclassify after merge and ensure no fake inventory/trust claims |

## Evidence standard

For each row, attach at least one of:
- source path and relevant function/component;
- migration and RPC/policy name;
- automated test name and passing run;
- dated live verification record;
- provider or operational evidence where code cannot prove the outcome.

A route existing does not prove its entire journey works. A migration in source control does not prove it is deployed. A status label in the UI does not prove the underlying action has occurred.
\n\n## 2 November 2026 audit update\n\nThe source-level evidence supplement is [Engineering Audit Supplement](15_ENGINEERING_AUDIT_SUPPLEMENT.md). It qualifies the initial booking allocation concern: the booking route's insert payload does not visibly pass every allocation field, but the database integrity/pricing trigger and end-to-end test references indicate the database computes and persists the authoritative snapshot. This has not been independently verified against the live production schema or by executing the current test suite.\n