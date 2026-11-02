# HAMLET Booking, Stay & Claims Operations

**Version:** 2.0 draft · **Reviewed:** 2 November 2026  
**Status:** Workflow framework; full operational SOP, custody and refund policy remain outstanding.

## 1. Operating principle

HAMLET is request-to-book. The system coordinates information and decisions; it must not promise a confirmed stay until availability, authorised partner acceptance and verified payment requirements are satisfied.

## 2. Booking lifecycle

1. Guest submits dates and guest count.
2. Server checks account, listing approval, capacity, date validity and calendar conflicts.
3. Server calculates and stores the authoritative quote/rules snapshot.
4. Booking enters requested.
5. Authorised partner reviews dates and terms; may accept, decline or seek clarification according to configured workflow.
6. Acceptance creates a time-limited awaiting-payment window.
7. Guest pays through the approved provider flow.
8. Signed webhook and server-side validation confirm payment once.
9. Booking becomes confirmed and notifications are sent.
10. Stay occurs; check-in/out records and any incident are attached to booking.
11. Booking becomes completed, cancelled, disputed, refunded or another valid terminal state under approved rules.
12. Owner/partner allocations and deposit liabilities are reconciled.

## 3. Availability management

The property must have an accountable calendar owner. Partner/owner may add owner blocks, external bookings or maintenance blocks only within authority. Availability confirmation state and last update must be honest. Same-day check-out/check-in turnover may be allowed when the end boundary is exclusive; test all overlap boundaries and concurrent booking requests.

## 4. Check-in and check-out

Before launch, define:
- guest identity and contact verification proportionate to risk and privacy;
- check-in instructions and arrival contact;
- inventory/condition checklist;
- timestamped photos/video and who can access them;
- check-out inspection responsibility and completion deadline;
- how guest acknowledgement or disagreement is captured;
- incident escalation and emergency contact.

Do not collect excessive identity data or expose private documents to unrelated partners.

## 5. Caution deposit

Caution deposit is property-specific and separately disclosed. It is not accommodation revenue or HAMLET commission. The system should record amount, payer, custodian, collection provider/reference, due/received state, inspection, proposed deduction, guest response, decision, refund amount and actual refund evidence.

A deduction requires:
- documented check-in/check-out condition;
- dated evidence tied to the property and booking;
- explanation of alleged damage/missing item and amount;
- exclusion of ordinary wear and tear;
- guest response opportunity;
- authorised human decision and reason;
- provider/bank refund or deduction evidence;
- dispute/escalation route.

Deposit custody, deadlines, permitted deductions and handling of disputed/retained amounts are open legal and operational decisions. Do not represent this as an automated escrow service.

## 6. Cancellation, early checkout and no-show

A final policy matrix is awaiting approval. It must separately cover:
- guest cancellation before partner acceptance;
- guest cancellation after acceptance but before payment;
- cancellation after payment;
- owner/partner cancellation or property unavailability;
- payment failure/expiry;
- early checkout;
- no-show;
- safety incident or material misrepresentation;
- force majeure or external disruption.

Each policy version must define deadline, notice channel, refund formula, non-refundable items, tax reversal, partner earning reversal, provider refund execution, caution-deposit handling and escalation. Snapshot the applicable terms at booking time.

## 7. Issues and incidents

Guest issue report should be linked to booking and property, capture category, description, severity, time, evidence, affected people, assigned responder, actions and resolution. Define a human escalation owner and response service levels before publishing response-time promises. Safety incidents must be prioritised over routine service complaints.

## 8. Admin and audit

Admin may review issues, booking transitions, refunds and settlement records. A manual “record refund” action must be labelled as a record unless actual provider refund execution is verified. Every override needs actor, reason, timestamp and before/after status.

## 9. Launch operations checklist

- Named on-call/first-line support person and backup.
- Owner/manager contact and escalation for each live property.
- Availability confirmation cadence.
- Check-in/out SOP and condition evidence template.
- Caution deposit custody and refund procedure.
- Cancellation/refund policy and guest terms.
- Incident severity and escalation matrix.
- Payment reconciliation owner and daily exception report.
- Guest/owner/partner notification templates.
- Documented handover and out-of-hours coverage.
