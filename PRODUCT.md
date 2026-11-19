# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary: guests booking a stay in Lagos.** Three groups, all confirmed: Nigerians abroad and international visitors booking from outside Nigeria (pricing in USD/GBP, trust matters most); Nigerians travelling to or within Lagos, often for work; and Lagos residents taking short getaways. The default situation is a phone on variable mobile data with little patience: they want to see a real place, check dates and price, and send a request in a few taps.
- **Secondary: partners.** Property owners, closing agents and property managers who list verified supply, accept or decline requests, manage availability and see earnings, in the partner workspace. Partners join the network instantly and their workspace opens straight away; HAMLET verifies their identity before payouts and verifies every listing before it goes live.
- **Internal: HAMLET operations.** Admins who verify listings, approve partners and reconcile bookings and settlements in the admin console.

When guest and partner needs conflict, guests booking come first; partner and admin screens stay clear and efficient.

## Product Purpose

HAMLET (HAMLET.REST, an Abundance Abodes product) is a trusted shortlet marketplace, starting in Lagos. It turns verified, available properties into completed bookings: discovery, booking request, partner acceptance, payment, the stay itself, issue handling and accurate settlement. Success is completed bookings per month, not sign-ups or traffic.

## Positioning

Every listing is verified before it goes live (ownership/title evidence, partner identity, authority to list, physical inspection), and the guest pays nothing until the partner accepts the request. The exact address and arrival guide (Wayfinder) unlock only after a confirmed, paid booking.

## Operating Context

- Booking lifecycle: request → partner checks availability → accepted, 48-hour Paystack payment window → confirmed (payment verified server-side) → stay → completed, with cancellation, expiry, refund, dispute and no-show states.
- Guests track bookings, pay, open the arrival guide, report issues and leave feedback in their account.
- Horatio is HAMLET's assistant for questions about areas and stays.
- Lagos areas are grouped into Lagos Island & Lekki (Victoria Island, Ikoyi, Lekki Phase 1, Ikate, Oniru, Ajah, Banana Island) and Lagos Mainland (Yaba, Surulere, Shomolu, Gbagada, Maryland, Ikeja GRA).

## Capabilities and Constraints

- Stack: Next.js App Router, React, Tailwind v4 with the `hm-` UI kit, Supabase (RLS, RPCs, edge functions), Paystack, Vercel.
- Pricing contract (`docs/PRICING_AND_PAYMENT_CONTRACT.md`, `src/lib/pricing.ts`): the displayed guest price already includes a 20% guest service fee on the owner's agreed accommodation rate; cleaning/turnover is shown as its own line; the refundable caution deposit is itemised separately and carries no fee or FX buffer; USD/GBP quotes add a single 10% FX buffer with 30-minute validity. Partner allocations: 10% closing agent, 2.5% eligible direct referrer, 5% HAMLET (7.5% without a referrer), 2.5% settlement reserve. Agent and referrer allocations are percentages of the owner's agreed rate (B), paid out of the 20% fee pool, never deducted from the owner's rate.
- Booking requests are limited to 1–60 nights and to the listing's stated capacity.
- Guest data is handled under Nigeria's NDPR.
- Undecided: launch geography beyond Lagos, domain cutover timing, a staging database separate from production.

## Brand Commitments

- Name: HAMLET (wordmark "HAMLET." with a lime full stop). Tagline: "Your stay, sorted."
- Voice: warm, plain and direct; two-voice headlines (a bold statement, then a softer serif phrase); numbered editorial section labels ("01 / …").
- The approved homepage and the HAMLET design guideline canvas are the visual source of truth.

## Evidence on Hand

- Real, verified listings with partner photos come from Supabase; there are not yet 50–100 live properties.
- Brand imagery in `public/images` (Lagos hero, property photos).
- No guest testimonials, ratings, press, booking counts or partner numbers exist yet. Do not fabricate them.

## Product Principles

1. Trust before persuasion: show verification and "no charge until accepted" exactly where a guest hesitates.
2. Fewest taps to a request: on a phone, a real stay, its price and the booking action are always within reach.
3. Real or nothing: real listings, real photos, real states; no placeholder homes, fake reviews or invented availability.
4. Clear money: every naira is explained once, in the same order, everywhere.
5. Fast on mobile data: every byte and every animation has to earn its place.

## Accessibility & Inclusion

- WCAG 2.2 AA: text contrast 4.5:1 (3:1 for large text), 11px type floor, 44px touch targets, 16px form fields on phones.
- Respect reduced motion, except the slow area ticker and stamp sway, which stay on and pause on hover.
- Light and dark themes follow the device, with a manual override.
