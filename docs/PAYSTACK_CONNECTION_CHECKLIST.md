# HAMLET Paystack connection and launch checklist

This checklist describes the deployed integration and separates safe test-mode validation from approval to accept real customer payments. A configured Live credential is not, by itself, authorization to charge guests or distribute third-party funds.

## Production integration currently observed

Production Next.js site: `https://www.hamlet.rest`

Production Supabase project ref: `jopnnevqnwrpldrojmdu`

Deployed Edge Functions:
- `paystack-initialize`
- `paystack-webhook`

Production webhook endpoint:
```
https://jopnnevqnwrpldrojmdu.supabase.co/functions/v1/paystack-webhook
```

Paystack Dashboard inspection on 2026-10-30 confirmed:
- Paystack Live mode is enabled.
- A production webhook named `HAMLET — Production Booking Payments.` is registered at the endpoint above.
- The webhook is configured for `charge.success`.
- The Supabase production project contains a custom secret named `PAYSTACK_SECRET_KEY`.
- The project owner confirmed that the stored secret is the Paystack **Live Secret Key**. The value is intentionally not recorded in this repository.
- The webhook dashboard showed no events sent yet at the time of inspection. Therefore, successful end-to-end payment processing has not yet been demonstrated.

Never expose, commit, paste into source files, or add `PAYSTACK_SECRET_KEY` as a `NEXT_PUBLIC_*` variable.

## Existing integration behavior

- Guest checkout is initialized by the Supabase Edge Function `paystack-initialize`.
- The server derives the amount from the trusted booking record; a browser-supplied amount is not accepted.
- The `paystack-webhook` Edge Function verifies the `x-paystack-signature` HMAC SHA-512 signature and processes `charge.success`.
- Booking confirmation is handled by the server-side payment confirmation RPC. A browser return URL is not proof of payment.
- The payment flow must remain idempotent: duplicate events, page refreshes, or webhook retries must not create duplicate confirmations or allocations.

## Safe test environment — do not overwrite production credentials

The production Supabase project currently uses a Live secret. **Do not replace it with a test key to run tests.** Do not send test transactions to the production webhook.

Create/use a separate Supabase test or staging project and a Paystack Test Mode dashboard:
1. Deploy the same `paystack-initialize` and `paystack-webhook` functions to the test Supabase project.
2. Set that project's `PAYSTACK_SECRET_KEY` using its Paystack **test** secret, through the Supabase secrets interface or CLI. Keep the value local/secret; never commit it.
3. Register the test project's webhook URL in Paystack Test Mode:
   `https://YOUR_TEST_SUPABASE_PROJECT_REF.supabase.co/functions/v1/paystack-webhook`
4. Point only the preview/staging application environment at the test Supabase project and its publishable/anon key. Do not alter the production site's Supabase URL, production secrets, or Paystack Live webhook.
5. Confirm the test application is visibly and operationally separated from `hamlet.rest` before using test cards.

## Test-mode acceptance checklist

Run and record each scenario in the isolated test environment:

1. Create a booking request and confirm it remains unconfirmed until the authorised partner accepts it and opens the payment window.
2. Start checkout only while the booking is eligible for payment; verify the initialized amount matches the trusted server-side booking total in NGN kobo.
3. Complete a Paystack test transaction and verify the signed webhook changes the booking exactly once.
4. Refresh the return page and replay a webhook; neither may create duplicate confirmations, ledger entries, rewards, or payouts.
5. Test failed, abandoned, expired, invalid-signature, wrong-amount, duplicate-event and non-success webhook scenarios.
6. Reconcile the Paystack transaction reference, actual provider fee, booking ledger, closing-agent allocation, referrer allocation, HAMLET allocation and any refundable caution deposit.
7. Confirm caution deposits are itemised separately and are not counted as accommodation revenue or commission.
8. Exercise cancellation and refund flows; verify refund state and ledger entries are auditable and idempotent.
9. Verify no secret appears in client bundles, logs, commits, screenshots or error responses.
10. Test partner onboarding, property submission, admin review/approval, listing publication, availability, booking acceptance and the guest booking journey using test data.

## Pricing and ledger invariants

The active pricing module implements a 20% domestic guest-facing accommodation markup over the owner's listed base price. This is not a universal 20% owner commission. Follow the central pricing function and its current allocation rules; do not duplicate markup or the separate 10% USD/GBP international buffer. Refundable caution deposits remain separately itemised and are not part of the markup or FX buffer. Actual Paystack provider fees must be recorded from provider transaction data, not treated as the internal 2.5% reserve.

## Live-use gates

Before accepting real guest payments or distributing partner/owner proceeds, obtain and retain Paystack's written confirmation that HAMLET's short-let marketplace model, third-party accommodation transactions, platform markup/allocations, owner/agent deal offers and proposed settlement flow are permitted under the merchant account and agreement. Do not assume standard checkout permits HAMLET to aggregate funds or split/disburse third-party proceeds. Use only a payout/split product and fund flow Paystack has explicitly approved.

Also verify:
- correct legal/merchant entity and completed Paystack account verification;
- Paystack's written marketplace/fund-flow approval, including settlement, refunds, disputes and chargebacks;
- production Live secret remains configured securely in Supabase and is never exposed to clients;
- production webhook URL and event selection remain correct;
- successful isolated test-mode end-to-end acceptance suite;
- owner/partner settlement, cancellation, refund and caution-deposit custody processes are approved and documented;
- public booking, payment, cancellation, refund and support terms are visible;
- a controlled production smoke test has a written runbook, approved amount, test booking, named operator, reconciliation plan and rollback contact.

A real charge is a separate, explicit operational step. Do not use a real guest's card or create a charge merely to prove the webhook works. Do not manually mark bookings paid or confirmed from screenshots or browser query parameters.

## Rollback

If any discrepancy occurs, disable payment initiation at the server/configuration layer and keep new bookings in a pending/request state. Do not delete webhook registrations or overwrite production credentials as an improvised fix. Reconcile affected transactions from Paystack's dashboard and the signed webhook/payment ledger before resuming.
