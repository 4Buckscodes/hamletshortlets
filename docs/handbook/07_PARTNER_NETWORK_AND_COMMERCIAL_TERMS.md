# HAMLET Partner Network & Commercial Terms

**Version:** 2.0 draft · **Reviewed:** 2 November 2026  
**Status:** Partner network and referral code are present; full owner-agent offer lifecycle requires verification.

## 1. Purpose

HAMLET's partner network recognises the people and businesses who own, source, represent, manage and close bookings for shortlet properties. The network must reflect local commercial practices without giving every partner the same permissions or payment entitlement.

## 2. Partner capabilities

- Property owner.
- Authorised property manager / co-host.
- Multi-property shortlet operator.
- Closing agent / booking partner.
- Property introducer / direct referrer.

A person may hold more than one capability. Keep their legal/account identity separate from activity attribution. Do not conflate the person who introduced a property, the person who referred a guest/partner, the person managing the stay and the person closing a booking.

## 3. Membership and privileged access

Current migration `20261031100000_immediate_partner_network_registration.sql` creates a partner network membership flow with declared role, company/display name and phone. Membership does not promote a guest to the privileged partner profile role and does not grant property access. Admin can manage membership status through audited functions.

A separate application/approval and property assignment process controls privileged partner capabilities. Suspension, revocation and reassignment must be logged and must not erase historical attribution or financial records.

## 4. Owner authority

Before a partner submits or operates a property, record:
- owner identity or entity;
- submitter identity;
- authority basis and scope;
- property/unit identity;
- allowed actions (submit, edit, availability, booking response, check-in, issue reporting, settlement visibility);
- start/end dates and revocation;
- evidence and reviewer decision.

No partner may change owner price, owner net, commission, deposit, policies or availability outside the granted permission and recorded agreement.

## 5. Commercial arrangements

The current repository commercial model defines a 20% domestic pool and a closing-agent/referrer/HAMLET/reserve allocation. The earlier Build Blueprint also proposed owner-defined fixed agent payout and owner-net-rate offers. These may be different commercial constructs.

Do not assume they can be combined. Before building or documenting them as one policy, decide:
- whether owner-defined deal offers coexist with the central pool;
- whether fixed agent payouts replace the 10% closing-agent allocation or are an additional owner-funded payment;
- how an owner-net offer defines guest selling price and HAMLET pool;
- who can authorise/accept offer terms;
- date/length-of-stay validity and cancellation treatment;
- whether one property can have several active agent offers;
- how partner referral rewards interact with a closing-agent payment.

Until resolved, keep these as distinct models and prevent double payment.

## 6. Attribution

Store separate immutable attribution for:
- property introducer / source;
- guest or partner direct referrer;
- closing agent for a booking;
- property manager/operator;
- owner/beneficial business recipient.

Eligibility, referral windows, self-referral prevention, repeat-booking rules and earning milestone must be explicit. Current repository documents describe a 2.5% direct-referrer reward with a 90-day eligibility window and qualifying repeat booking logic; verify the exact current trigger/RPC behaviour before relying on it.

## 7. Earnings and settlement

Show partner:
- role and authority;
- attributed bookings;
- earning basis and rules version;
- calculated, pending, approved, paid, withheld, reversed or disputed amounts;
- cancellation/refund adjustments;
- payout evidence/reference.

A projected earning is not a payable earning. A ledger record is not proof of transfer. Do not display partner balances as withdrawable wallet funds unless a compliant custody/payout model is explicitly approved.

## 8. Required controls

- Owner approval before property assignment.
- Least-privilege access and immediate revocation.
- Terms version and acceptance timestamp.
- No duplicate property listing to claim attribution.
- No self-referral or circular referral reward.
- No reward before the earning milestone.
- Idempotent reward creation and reversal.
- Admin audit for approval, suspension, terms changes and payout decisions.

## 9. Open decisions

See Decision Register O-002, O-010 and O-011. Finalise owner-defined net-rate/fixed payout precedence, referral attribution, role permissions, partner contract terms, tax classification and payout approval before public partner programme claims.
