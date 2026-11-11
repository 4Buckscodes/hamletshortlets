# HAMLET Native Mobile Architecture

**Target:** Android and iOS  
**Application:** One role-aware native app for guests, owners, property managers and agents  
**Mobile stack:** Expo SDK 58, React Native 0.88, React 19.3, TypeScript and Expo Router  
**Backend:** Existing HAMLET Next.js services and Supabase project

## Architecture decision

The mobile app lives in apps/mobile as a separately built Expo application. The existing Next.js website remains the public web and SEO surface. Both clients use the same Supabase project, database, RLS policies, approved property records and server-side business rules.

Do not create a second database, fork booking logic or duplicate the pricing engine.

## Current pilot geography

The currently deployed marketplace has a Lagos-only geography guard. The mobile app must not present Abuja or Ibadan as bookable markets until the backend policy, property intake validation, search filters and operational support are expanded and tested. The mobile discovery shell therefore treats Lagos as available and other cities as coming later.

## Product surfaces

1. Guest: explore, search, property details, booking request, checkout, booking status, receipts, support and reviews.
2. Owner: owner onboarding, property submissions, listing status, availability, bookings, settlement view and property operations.
3. Property manager: owner-authorised portfolio, staff permissions, booking operations and incident reporting.
4. Agent/booking partner: deal board, accepted deal terms, assigned properties, referral attribution, booking support and earnings.
5. Horatio: contextual assistant using only authorised HAMLET records and verified property facts.

A user may have more than one role. Role selection and permissions must come from the authenticated profile and server-side authorisation, not from a client-side toggle.

## Backend integration boundaries

- Prefer existing authenticated Next.js API routes for sensitive booking, payment, pricing, partner and admin operations.
- Use Supabase client access only where RLS explicitly permits the operation.
- The mobile app may use only the Supabase URL and publishable key.
- Service-role keys, Paystack secret keys and other privileged credentials remain server-side.
- Do not expose identity verification evidence or private guest data to owners and agents.
- Only verified payment webhooks can move a booking to paid/confirmed.
- Client-supplied totals are never authoritative.

## Commercial integrity

The current repository's approved pricing contract is v2_20pct_markup_10pct_fx_buffer, not the retired 3% guest-only model. The mobile app must consume the existing central pricing service and must not implement a second calculator.

Keep separate ledger treatment for:
- owner accommodation base;
- guest service fee and approved pool allocations;
- agent/partner rewards and referral attribution;
- mandatory charges;
- refundable caution deposit and refund;
- international quote buffer;
- actual payment-provider fee and reserve variance.

Owner-defined deal terms must be recorded as versioned, accepted commercial offers. Changes apply prospectively and must not silently rewrite terms attached to an existing booking.

## Delivery sequence

### M0 — Foundation
Expo project, app identifiers, navigation, design tokens, environment validation, Supabase session persistence, deep links and CI checks.

### M1 — Guest MVP
Guest sign-in, discovery/search, approved property details, date and guest selection, quote preview from server, booking request, payment handoff, booking status and push/email notification links.

### M2 — Partner MVP
Role-aware partner onboarding, owner authorisation, property submission, duplicate detection, listing review status, deal board, accept/withdraw deal, availability and booking management.

### M3 — Trust and finance
Caution deposit disclosure and ledger, inspection evidence, incident reporting, refund status, agent attribution, commission ledger and settlement visibility.

### M4 — Polish and release
Horatio, analytics, accessibility, offline/error states, crash reporting, device QA, EAS builds, store metadata, privacy disclosures and staged rollout.

## Release gates

- Supabase RLS and API permissions independently tested for each role.
- All booking totals recomputed server-side.
- Payment webhook signature, amount, currency, reference and idempotency verified.
- Refundable caution deposits remain separate from revenue and partner allocations.
- Duplicate property submission and multi-agent attribution cases tested.
- Android and iOS physical-device testing completed.
- Apple and Google developer accounts, bundle ID availability, privacy declarations and support details confirmed.
- No production database migration or production web deployment is implied by mobile app work.
