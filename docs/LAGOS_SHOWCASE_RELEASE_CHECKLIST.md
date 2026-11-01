# HAMLET Lagos Showcase & Launch Release Checklist

Updated: 1 November 2026
Working branch: `feat/lagos-showcase-preview-inventory`
Pull request: https://github.com/4Buckscodes/hamletshortlets/pull/54

## What this work is — and is not

The 30-row catalogue in `lagos-showcase-inventory.json` is a planning catalogue of fictional property concepts. It is not an inventory of real HAMLET partner properties, is not a verified supply list, and must not be seeded as live bookable accommodation. Its illustrative nightly rates are planning assumptions only.

The preview-only application path is intended to display clearly labelled concepts without allowing booking requests. Real supply must replace each concept with owner-authorised property information and photographs before activation.

## Imagery direction for Nigerian shortlets

Use Nigerian interior photography as a design reference: contemporary Lagos apartments, practical but polished furniture, warm neutral palettes, layered lighting, locally plausible room layouts, tiled or stone finishes, functional kitchens, air conditioning, backup-power context where relevant, and finishes appropriate to the advertised price tier.

Build a varied visual mix rather than repeating one generic luxury apartment:
- Premium Island: restrained luxury, larger living rooms, statement lighting, quality joinery, premium bathrooms.
- Mid-market Island / Lekki: modern serviced apartments, open-plan living, practical kitchens, clean bedrooms and good daylight.
- Mainland executive / family: comfortable space, durable finishes, family dining, functional storage and realistic layouts.
- Compact / value stays: studios and one-bedrooms with clever storage, uncluttered rooms and realistic footprints.

### Image rules

1. For an actual property listing, use current photographs supplied or explicitly authorised by the property owner/authorised manager, tied to that exact property.
2. For a fictional showcase concept, use clearly labelled generated or properly licensed illustrative images only. Do not represent them as photos of a real property or imply availability, inspection, verification or partner status.
3. Do not copy, scrape, hotlink, rehost, crop or reuse third-party reference photos without a licence. The online Nigerian interiors previously researched are visual guidance, not assets.
4. Do not reuse the same room set across multiple fictional properties if that could suggest separate real homes.
5. Keep originals and record: asset ID, creator/source, licence or generation provenance, permitted channels, date acquired, credit line, and the property/concept record that uses it.
6. Avoid unsupported visual claims: do not use images showing a pool, gym, ocean view, generator, inverter, parking, security desk or other amenity unless that feature is genuinely part of the property or the image is clearly illustrative.

## Release gates

### A. Code and CI
- [ ] PR #54 main CI completed successfully, including mobile and desktop Playwright E2E.
- [ ] Referral-release validation completed successfully.
- [ ] PR review confirms preview-only details cannot be booked through UI or direct API.
- [ ] Confirm preview-only cards do not use verified/trust badges.
- [ ] Confirm preview-only details are noindex and omit property structured data.
- [ ] Confirm regular approved listings retain normal booking flow.

### B. Database safety
- [ ] Reconcile production migration ledger with repository migrations.
- [ ] Compare live `public.properties` schema, indexes, RLS policies and relevant grants against the migration's expected state.
- [ ] Take and verify a production backup.
- [ ] Rehearse the migration on a disposable/staging copy of the production schema.
- [ ] Run read-only production readiness checks.
- [ ] Obtain explicit release approval before applying the migration.
- [ ] Do not seed the fictional 30-row catalogue into the production properties table.

### C. Real supply and content
- [ ] Obtain owner / authorised manager consent and confirm listing authority.
- [ ] Collect exact location, address precision, property type, occupancy, bed setup, amenities, house rules, nightly rate and extra charges.
- [ ] Collect current property-specific photos and confirm usage rights.
- [ ] Complete the relevant property verification and inspection workflow.
- [ ] Verify calendar responsibility and availability confirmation process.
- [ ] Ensure each property has an accountable partner record and support contact.
- [ ] Keep unconfirmed / preview records visibly separate from live supply.

### D. Booking and payments
- [ ] Confirm provider-managed payment flow and the selected production provider configuration.
- [ ] Confirm the exact HAMLET/guest charge calculation in the central pricing function; do not hard-code fees in UI.
- [ ] Confirm booking request, payment status, cancellation/refund and reconciliation behaviour.
- [ ] Configure payment provider credentials in the correct environment; never commit secrets.
- [ ] End-to-end test a complete booking with provider test mode before production.
- [ ] Confirm owner payout and partner commission rules against the approved decision register.

### E. Notifications and operations
- [ ] Configure and verify transactional email sender (Resend or selected provider).
- [ ] Test guest and partner notifications.
- [ ] Define first-line support contact and incident escalation owner.
- [ ] Confirm who responds to booking requests and how quickly.
- [ ] Confirm property suspension / incident handling and audit trail.

### F. Vercel usage controls
- Build and validate through GitHub Actions and local/repository CI first.
- Do not trigger ad-hoc Vercel builds for every code iteration.
- Avoid duplicate deployments and force-new builds.
- Use one consolidated release deployment only after CI, database, content, payment and operations gates are green.
- Prefer promoting a successfully tested deployment rather than rebuilding when the release workflow permits it.
- Keep Vercel usage checks read-only unless a deployment is explicitly approved.

## Immediate next actions

1. Finish GitHub Actions E2E and address any failures on the same branch.
2. Complete review of the showcase migration and application compatibility.
3. Reconcile Supabase production migration history/schema and prepare a reversible, backed-up migration plan.
4. Replace fictional concepts with owner-authorised listings as partners submit real inventory.
5. Populate images only after their status is explicitly classified as property-specific or illustrative and rights are recorded.
6. Run one final release-readiness review before merge and the single planned Vercel production build.

## Current blockers (do not silently waive)

- Production Supabase migration-history/schema reconciliation and verified backup.
- Actual owner-authorised Lagos shortlet inventory and property-specific media.
- Production payment provider credentials and successful end-to-end payment verification.
- Transactional email configuration and notification verification.
- Final GitHub CI / E2E completion for the current PR head.

A green code build is not proof that the database, inventory, payments, notifications or operating model are launch-ready.
