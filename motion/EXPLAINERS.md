# HAMLET explainer videos

Three ~60-second vertical (9:16) explainers, written so a 10-year-old can follow: one idea per sentence, a four-step tracker at the top, and every step shown on a realistic phone (typing, taps, real HAMLET photos, live status changes). Built in Remotion (`motion/remotion/src/explain/`).

| Audience | File | Voice | Call to action | End line |
|---|---|---|---|---|
| Owners | `remotion/out/hamlet-explainer-01-owners.mp4` | Warm female, US (af_heart) | **List your property** → hamlet.rest/partners/apply | Your home. Your rules. |
| Property managers | `remotion/out/hamlet-explainer-02-property-managers.mp4` | Clear female, British (bf_emma) | **Add your first property** → hamlet.rest/partners/apply | One workspace. Every property. |
| Guests | `remotion/out/hamlet-explainer-03-guests.mp4` | Friendly female, US (af_bella) | **Find your stay** → hamlet.rest | Verified stays. Simple booking. |

## How every explainer is built
1. **Hook** (first 2 seconds): the viewer's problem, on screen and spoken.
2. **The promise** in one line.
3. **Four numbered steps**, each shown on a phone exactly as it happens in HAMLET.
4. **Proof**: verification, payment, privacy.
5. **One call to action**, unique to the audience.

## Owners: voice-over script

Call to action: **List your property** → hamlet.rest/partners/apply

1. Got a home in Lagos that sits empty some nights?
2. HAMLET helps you fill those nights with verified guests. Here's how it works, in four simple steps.
3. Step one. Join as a partner. Your workspace opens straight away.
4. Step two. Add your place. Upload photos, describe it, and set your price per night.
5. Step three. We check it. Who owns it, who's allowed to let it, and we visit to make sure the photos are real.
6. Only then does your home go live for guests to find.
7. Step four. Guests send you requests. You choose. Accept, or decline. Nothing is booked without your yes.
8. When you accept, the guest has forty-eight hours to pay. The booking is only confirmed once the payment is verified.
9. Guests pay our service fee on top of your price. It never comes out of your rate.
10. Your exact address stays private until the guest has paid. And a refundable caution deposit helps protect your home.
11. Your bookings and earnings live in one place. We verify your identity before your first payout.
12. Your home. Your rules. Verified guests. List your property on HAMLET.

## Property managers: voice-over script

Call to action: **Add your first property** → hamlet.rest/partners/apply

1. Managing shortlets for other owners?
2. Lots of homes. Lots of guests. Lots of messages. HAMLET puts it all in one place.
3. Think of it as one front desk for every property you look after.
4. Step one. Join as a partner and choose authorised property manager.
5. Step two. Add each property with its signed management mandate from the owner. That's how we know you're allowed to let it.
6. Not sure how to write the listing? Describe the place in your own words, and Horatio, our assistant, can draft it for you.
7. Step three. We visit every property. Photos, backup power and the address are checked on site before it goes live.
8. Step four. Requests for all your properties arrive in one workspace. Accept or decline, and keep every calendar up to date.
9. Guests pay through HAMLET before a booking is confirmed, so you're not chasing transfers.
10. And when you bring other owners and agents to HAMLET, you can earn referral rewards on their completed bookings.
11. One workspace. Every property. Add your first property on HAMLET.

## Guests: voice-over script

Call to action: **Find your stay** → hamlet.rest

1. Booking a shortlet in Lagos shouldn't feel like a gamble.
2. On HAMLET, every home is visited before it goes live. We check who owns it, that the photos are real, and the backup power.
3. So how does booking work? Four simple steps.
4. Step one. Search. Pick an area, your dates, and how many guests.
5. Step two. Choose a place you love and send a request. You don't pay anything yet.
6. Step three. The host checks the dates. If they say yes, you have forty-eight hours to pay, safely, through Paystack.
7. The price you see already includes our fee. Cleaning and a refundable caution deposit are shown before you request. No surprises.
8. Step four. Once your stay is confirmed, your exact address and arrival guide unlock in your account.
9. Booking from abroad? You can see prices in pounds or dollars. And if you have questions about an area, just ask Horatio.
10. Verified stays. Simple booking. Find your stay at hamlet dot rest.

## Claim check (brand review)
Every line was checked against `PRODUCT.md`, `docs/PRICING_AND_PAYMENT_CONTRACT.md` and site copy:
- Four verification checks and the on-site visit (photos, backup power, address): `app/safety/page.tsx`, `PRODUCT.md`.
- Nothing booked or charged until the host accepts; 48 hours to pay; confirmed only after Paystack verifies: `app/how-it-works/page.tsx`.
- Service fee added on top of the owner's rate (no promise of 0% owner fees): pricing contract sections 1 and 2.
- Address, arrival guide and codes private until the booking is paid: `PRODUCT.md`, safety page.
- Refundable caution deposit, itemised: pricing contract section 3.
- USD/GBP prices shown, charged in naira: pricing contract section 4 (fine print on screen).
- Managers: signed management mandate, authorised manager role, Horatio listing drafts: partner application form and `/api/partner/horatio/listing-draft`.
- Referral rewards on eligible, completed bookings: partner UI copy (fine print on screen).
- Identity verified before payouts: `PRODUCT.md`.
- Names, prices, dates and chats on phone screens are illustrative and labelled that way.

Changes made in review: the owner fee line was simplified for clarity; the guest line "the host says yes" became "if they say yes"; "join free" and "list in minutes" were removed from the owner end card (not substantiated).
