# HAMLET Paystack connection checklist

This document describes the final credential and verification steps for the existing Paystack integration. It does not authorize live charging or third-party fund distribution.

## Existing integration

- Guest checkout is initialized by the Supabase Edge Function `paystack-initialize`.
- The server derives the amount from the trusted booking record; a browser-supplied amount is not accepted.
- The `paystack-webhook` Edge Function verifies the `x-paystack-signature` HMAC SHA-512 signature and only processes `charge.success`.
- Booking confirmation is handled by the server-side payment confirmation RPC. The browser return URL is not proof of payment.
- The site must not expose `PAYSTACK_SECRET_KEY` to browser code.

## Required configuration

In the Supabase project used by the active Next.js application, set the secret from the Paystack dashboard using the Supabase secrets interface/CLI:

```sh
supabase secrets set PAYSTACK_SECRET_KEY=sk_test_REPLACE_WITH_YOUR_TEST_SECRET --project-ref YOUR_SUPABASE_PROJECT_REF
```

Use the real test secret locally in your shell; do not commit it, paste it into source files, or add it as a `NEXT_PUBLIC_*` variable. Once testing is complete and Paystack has approved the business/payment model, replace it with the live secret through the same secure secrets workflow.

Register this webhook URL in the matching Paystack dashboard (the URL must match the Supabase project actually used by the app):

```
https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/paystack-webhook
```

Confirm that both Edge Functions are deployed to that same Supabase project. Do not configure a Vercel environment variable for the Paystack secret unless a separate server-side Vercel integration is intentionally implemented; the current integration reads the secret in Supabase Edge Functions.

## Test-mode acceptance checklist

1. Use Paystack **test** credentials only.
2. Create a booking request and confirm that it remains unconfirmed until the authorised partner accepts it and opens the payment window.
3. Start checkout while the booking is eligible for payment; verify the initialized amount matches the server-side booking total in NGN kobo.
4. Complete a Paystack test transaction and verify that the signed webhook changes the booking exactly once.
5. Confirm that refreshing the return page or replaying a webhook cannot produce duplicate confirmations or payouts.
6. Test failed, abandoned, expired, invalid-signature, wrong-amount, duplicate-event and non-success webhook scenarios.
7. Reconcile the Paystack transaction reference, provider fee, booking ledger, agent allocation, referrer allocation, HAMLET allocation and any refundable caution deposit.
8. Confirm that caution deposits are itemised separately and are not counted as accommodation revenue or commission.
9. Verify refund handling and ensure refund state/ledger entries are auditable.
10. Confirm that no secret is present in client bundles, logs, commits, screenshots or error responses.

## Commercial and compliance go-live gates

Before live use, obtain Paystack's written confirmation that HAMLET's short-let marketplace model, third-party accommodation transactions, owner/agent deal offers, platform markup/allocations and any proposed partner settlement flow are permitted under the merchant account and agreement. Do not assume the standard checkout integration permits HAMLET to aggregate funds or split/disburse third-party proceeds. Use only a payout/split product and fund flow Paystack has explicitly approved.

The active pricing module currently implements a 20% domestic guest-facing accommodation markup over the owner's listed base price. It allocates the markup according to the current pricing engine's rules; that is not automatically the same as a universal 20% owner commission. Treat the pricing implementation and owner-defined fixed-share/net-rate deal terms as separate concerns until the intended interaction is explicitly approved and encoded.

Production readiness also requires:
- correct legal/merchant entity and verified Paystack account;
- live secret configured securely in Supabase;
- webhook URL registered and tested on the correct account/project;
- refund, cancellation, chargeback and caution-deposit custody processes approved;
- successful end-to-end smoke tests;
- support contact and public payment/refund terms visible on the site.

## Rollback

If any discrepancy occurs, disable payment initiation at the server/configuration layer and keep new bookings in a pending/request state. Do not manually mark bookings paid or confirmed from screenshots or browser query parameters. Reconcile affected transactions from Paystack's dashboard and the signed webhook/payment ledger before resuming.
