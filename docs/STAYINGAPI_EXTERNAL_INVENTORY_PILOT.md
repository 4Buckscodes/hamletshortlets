# StayingAPI external inventory pilot

## Purpose

This is a reversible, preview-first experiment to supplement HAMLET's own approved listings while partner inventory grows. External results are never inserted into Supabase, never treated as HAMLET partner properties, and never enter HAMLET's booking or payout flows.

## Current implementation

- `GET /api/external-stays` proxies search requests from the browser to StayingAPI on the server.
- The API key is read only from `STAYINGAPI_KEY` and is never exposed as a public environment variable.
- Search is limited to Airbnb and Booking.com, with a default target of 30 results (StayingAPI documents a maximum of 40).
- Search currency is requested as NGN.
- Search responses are cached by Next.js for 10 minutes.
- External cards show the source platform and link directly to the original listing.
- External cards do not display HAMLET verification status and do not use HAMLET booking URLs.
- Only the /stays catalogue queries external inventory; the homepage does not.
- The route accepts only the pilot's known destinations and requires a sandbox key.
- Production requests remain blocked unless the explicit production-display flag is enabled.

## Preview environment variables

Set these only in the Vercel Preview environment while testing:

```env
STAYINGAPI_ENABLED=true
STAYINGAPI_KEY=stay_test_...
```

Do not use `NEXT_PUBLIC_` for this key. Do not commit it to GitHub or paste it into source code.

Production should not receive these variables during the pilot. If production variables are ever added, the route additionally requires:

```env
STAYINGAPI_PRODUCTION_DISPLAY_APPROVED=true
```

That flag must remain unset until HAMLET has obtained written permission for the exact public display and linking use case.

## Test procedure

1. Deploy this branch as a Vercel Preview deployment.
2. Add the two Preview environment variables above.
3. Search `Lagos, Nigeria`, then Lekki Phase 1, Victoria Island, Ikoyi, Abuja and Ibadan.
4. Confirm that the provider returns useful Nigerian accommodation records, not only deterministic sandbox fixtures.
5. Confirm source URLs, photos, currencies, ratings and occupancy are present and valid.
6. Test dates and guest counts; then test bedroom and price filters in the catalogue.
7. Confirm external cards are visibly labelled and open the original platform.
8. Confirm the existing HAMLET-owned listings, partner onboarding, booking request, pricing and payout flows are unchanged.
9. Review StayingAPI's written permission and the underlying source-platform terms before enabling any public redisplay.

## Known limits / gates

- Sandbox responses are deterministic test fixtures and do not prove live Nigerian inventory.
- StayingAPI search documents a maximum of 40 results per request.
- The search result is not a booking confirmation. Availability and price may change.
- This integration is read-only. It cannot create or confirm a booking on Airbnb or Booking.com.
- External listings are not HAMLET-verified and must not be described as such.
- Search currently supports the listed pilot locations only.
- If the provider returns prices in a currency other than NGN, HAMLET's Naira price filters exclude those results rather than making an unsafe conversion.
- Public redisplay of bulk third-party catalogue content is not assumed to be permitted. Written approval is a go-live gate.

## Rollback

Set `STAYINGAPI_ENABLED=false` or remove `STAYINGAPI_KEY` from the Preview environment. The route returns no external inventory, and the existing HAMLET marketplace continues to use its own Supabase inventory. To remove the experiment completely, revert this feature branch / PR; no external records or database migrations need to be cleaned up.
