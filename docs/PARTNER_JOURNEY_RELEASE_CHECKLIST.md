# HAMLET Partner Journey — Release QA Checklist

This checklist validates the full partner journey before expanding owner, agent and property-manager recruitment.

## 1. Partner registration and welcome

- [ ] New partner can sign up with a valid role, company and phone number.
- [ ] Partner workspace access is immediate after registration.
- [ ] `profiles.role` remains `guest`; active access is represented by `partner_network_memberships.status = 'active'`.
- [ ] Partner-specific welcome email is queued and delivered with the correct subject.
- [ ] Invalid referral codes are rejected; valid codes from active network members are accepted.
- [ ] Self-referrals and conflicting duplicate referral attribution are rejected.

## 2. Property intake and approval

- [ ] Partner can submit a property only where lawful ownership or written authority exists.
- [ ] Draft, paused and under-review properties are not shareable.
- [ ] Only approved, live properties with sharing enabled appear in Share & Studio.
- [ ] Admin can assign an approved property to an active network member.
- [ ] Revoked property access prevents future sharing and booking management.

## 3. Share & Studio

- [ ] Catalogue returns property title, area, owner nightly rate and guest-facing nightly rate.
- [ ] WhatsApp copy uses the correct property details and price.
- [ ] Share link creation is idempotent and tied to the correct partner and property.
- [ ] Marketing card generation returns a valid downloadable image.
- [ ] QR generation returns a valid image.
- [ ] QR token validation does not create a visit event or attribution session.
- [ ] A real guest visit creates exactly one visit event.
- [ ] Invalid, expired, revoked or unapproved-property tokens are rejected.

## 4. Guest-to-booking attribution

- [ ] Guest opens a partner share link and attribution is recorded.
- [ ] Attribution is bound to the guest account after sign-in.
- [ ] Booking request retains the correct share partner and closing agent.
- [ ] Commission is calculated from the agreed property deal terms and booking nights.
- [ ] Direct booking without partner attribution does not create a partner commission.

## 5. Partner operations

- [ ] Assigned active member can view booking requests for the assigned property.
- [ ] Assigned active member can move a booking through permitted operational statuses.
- [ ] A partner who is also a guest can still cancel their own eligible booking.
- [ ] Unassigned partners cannot manage another property's bookings.
- [ ] Suspended members cannot share properties or manage bookings.

## 6. Earnings, referrals and payout readiness

- [ ] Performance analytics load for active members whose profile role remains `guest`.
- [ ] Referral code is generated for an active network member.
- [ ] Public referral lookup resolves active members only.
- [ ] Referred partner attribution is stored once and cannot be overwritten by a conflicting code.
- [ ] Referral and booking commissions appear in the correct partner account.
- [ ] Payout remains blocked until required identity and payout verification is complete.

## 7. Release gates

- [ ] Lint and unit tests pass.
- [ ] Full PGlite/database regression suite passes.
- [ ] Clean local Supabase migration run passes.
- [ ] Next.js production build passes.
- [ ] Playwright/browser journeys pass.
- [ ] Production database migration is applied and verified.
- [ ] Live authenticated smoke test passes on the production domain.
- [ ] Rollback path and deployment notes are confirmed.

**Recruitment gate:** do not expand property-owner recruitment until all release gates above pass and at least one real partner, one guest and one approved property complete the end-to-end journey.
