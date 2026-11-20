# HAMLET owner campaign: three videos

Vertical 1080×1920, 30fps, built in Remotion (`motion/remotion`). Each video attacks a different
owner worry in its first second, then lands on the same call to action: **Partner with us,
hamlet.rest/partners/apply**.

| # | File | Angle | Voice | Length |
|---|---|---|---|---|
| 1 | `remotion/out/hamlet-01-empty-nights.mp4` | Loss: empty nights are income gone for good | Warm female (US) | 23s |
| 2 | `remotion/out/hamlet-02-your-rules.mp4` | Control and safety: you decide who stays | Calm male (US) | 29s |
| 3 | `remotion/out/hamlet-03-london-lekki.mp4` | Diaspora owners: run it from anywhere, clear money | Female (British) | 31s |

## 1. Empty nights
Hook (frame one): a dimmed bedroom with a huge "Empty." stamp.
1. Your shortlet was empty last night.
2. And the night before.
3. Every empty night is income you never get back. *(calendar crosses out night after night)*
4. HAMLET brings verified guests to verified homes in Lagos. *(music lifts, verified photo cards)*
5. Requests come to you. You choose who stays. *(Accept tapped)*
6. And nothing is confirmed until the guest has paid. *(Accepted, guest pays, confirmed)*
7. Stop waiting for the next booking. *(the same calendar fills with booked nights)*
8. List your shortlet on HAMLET.

## 2. Your rules
Hook (frame one): a dark front door at night, "Who's sleeping in your apartment tonight?"
1. Do you know who's sleeping in your apartment tonight?
2. Fake bookings. Guests you know nothing about. Payments that never arrive.
3. On HAMLET, nothing happens without you.
4. Every request comes to you first. Accept, or decline.
5. Guests pay through HAMLET before the booking is confirmed.
6. Your exact address stays private until it is.
7. And a refundable caution deposit protects your space.
8. Your property. Your rules. List it on HAMLET.

## 3. London to Lekki
Hook (frame one): split screen, London 7am on top, Lekki 8am below.
1. You live in London. Your apartment is in Lekki.
2. So who's handling the bookings?
3. With HAMLET, you run it all from your phone.
4. Requests, availability, bookings and earnings, in one partner workspace.
5. Every listing is verified before it goes live, so guests book with confidence.
6. Guests abroad can see prices in dollars or pounds.
7. And our guest service fee is added on top of your rate, not taken out of it.
8. Wherever you are, your place keeps working. List it on HAMLET.

## Claims and where they come from
Every claim is from `PRODUCT.md` or `docs/PRICING_AND_PAYMENT_CONTRACT.md`. No statistics, reviews
or booking counts are used, because none exist yet.
- Verification checks (ownership/title, identity, authority to list, inspection): PRODUCT.md, Positioning.
- Accept or decline; paid before confirmed; 48-hour payment window: PRODUCT.md, Operating Context.
- Address private until a paid booking: PRODUCT.md, Positioning (Wayfinder).
- Refundable caution deposit, itemised: pricing contract section 3.
- USD/GBP prices: pricing contract section 4.
- Fee example ₦200,000 + ₦40,000 = ₦240,000: pricing contract section 2. The videos do **not**
  promise zero owner fees (section 1 forbids that).
- Request cards on phone screens are labelled "Illustrative".

## Voices
Generated offline with Kokoro-82M (open-source neural TTS, Apache-2.0). To use real voice actors,
record each line, save it over `remotion/public/vo/<video>/NN.wav`, then run
`python3 scripts/make-voice.py --keep` (re-times the video to the new recordings) and re-render.

## Rebuild
From `motion/remotion`: `python3 scripts/make-audio.py` (music and sound effects), then
`npx remotion render EmptyNights out/hamlet-01-empty-nights.mp4` (and `YourRules`, `LondonLekki`).
`npm run dev` opens Remotion Studio.
