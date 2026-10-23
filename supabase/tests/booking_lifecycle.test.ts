import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import {
  asAnon,
  asAuthenticatedWithoutUid,
  asUser,
  createMigratedTestDb,
  createTestUser,
  resetTestData,
} from './helpers/testDb';

interface TimelineEntry {
  at: string;
  label: string;
  actor: string;
  detail: string | null;
}

interface BookingRow {
  id: string;
  reference: string;
  property_id: string;
  guest_id: string;
  check_in: string;
  check_out: string;
  guest_count: number;
  accommodation_subtotal: number;
  mandatory_total: number;
  hamlet_guest_fee: number;
  guest_total: number;
  refundable_deposit: number;
  status: string;
  payment_deadline: string | null;
  cancel_reason: string | null;
  timeline: TimelineEntry[];
}

interface AuditLogRow {
  actor_id: string;
  actor_role: string;
  action: string;
  target: string;
  detail: string;
}

const VERIFIED_ALL = {
  ownership: 'verified',
  identity: 'verified',
  authority: 'verified',
  inspection: 'verified',
};

describe('HAMLET booking lifecycle (PostgreSQL migrations, RLS & RPCs)', () => {
  let db: PGlite;
  let adminId: string;
  let partnerId: string;
  let otherPartnerId: string;
  let guestAId: string;
  let guestBId: string;
  let approvedPropertyId: string;
  let submittedPropertyId: string;
  let baseDateIso: string;

  const addDays = (isoDate: string, days: number): string => {
    const d = new Date(`${isoDate}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };

  async function submitAndOptionallyApproveProperty(
    submitterId: string,
    title: string,
    approve: boolean,
  ): Promise<string> {
    const propertyId = await asUser(db, submitterId, async tx => {
      const { rows } = await tx.query<{ id: string }>(
        `select public.submit_partner_property($1::jsonb, $2::jsonb) as id`,
        [
          JSON.stringify({
            title,
            property_type: 'Apartment',
            area: 'Victoria Island',
            public_address: '14 Adeola Odeku Street, Victoria Island',
            nightly_rate: 150_000,
            cleaning_fee: 25_000,
            mandatory_charges: [
              { label: 'Cleaning & turnover (mandatory)', amount: 25_000 },
              { label: 'Diesel & power levy', amount: 15_000 },
            ],
            refundable_deposit: 100_000,
            bedrooms: 2,
            bathrooms: 2,
            capacity: 4,
            bed_setup: '2 King beds',
            amenities: ['24/7 Power', 'Fibre Wi-Fi'],
            image_urls: ['/images/prop/living-1.jpg'],
            house_rules: ['No smoking', 'No parties'],
          }),
          JSON.stringify({
            authority_basis: 'Registered deed of assignment and owner mandate',
            submitted_role: 'Owner',
            docs: [{ label: 'Title deed', status: 'self_reported' }],
          }),
        ],
      );
      return rows[0].id;
    });

    if (approve) {
      await asUser(db, adminId, async tx => {
        await tx.query(
          `select public.review_partner_property($1, 'approved', $2, $3::jsonb)`,
          [
            propertyId,
            'All title, identity, authority, and physical inspection checks passed.',
            JSON.stringify(VERIFIED_ALL),
          ],
        );
      });
    }

    return propertyId;
  }

  let refCounter = 0;
  async function insertBookingAsGuest(
    guestId: string,
    overrides: Partial<{
      reference: string;
      propertyId: string;
      checkIn: string;
      checkOut: string;
      guestCount: number;
      status: string;
      accommodationSubtotal: number;
      mandatoryTotal: number;
      hamletGuestFee: number;
      guestTotal: number;
      refundableDeposit: number;
    }> = {},
  ): Promise<BookingRow> {
    refCounter += 1;
    const reference = overrides.reference ?? `HML-TEST-${String(refCounter).padStart(4, '0')}`;
    const propertyId = overrides.propertyId ?? approvedPropertyId;
    const checkIn = overrides.checkIn ?? addDays(baseDateIso, 10);
    const checkOut = overrides.checkOut ?? addDays(baseDateIso, 13);
    const guestCount = overrides.guestCount ?? 2;

    return asUser(db, guestId, async tx => {
      const { rows } = await tx.query<BookingRow>(
        `insert into public.bookings (
           reference, property_id, guest_id, check_in, check_out, guest_count,
           accommodation_subtotal, mandatory_total, hamlet_guest_fee, guest_total,
           refundable_deposit, status
         )
         values ($1, $2, $3::uuid, $4::date, $5::date, $6, $7, $8, $9, $10, $11, $12)
         returning
           id, reference, property_id, guest_id::text,
           check_in::text, check_out::text, guest_count,
           accommodation_subtotal, mandatory_total, hamlet_guest_fee,
           guest_total, refundable_deposit, status,
           payment_deadline::text, cancel_reason, timeline`,
        [
          reference,
          propertyId,
          guestId,
          checkIn,
          checkOut,
          guestCount,
          overrides.accommodationSubtotal ?? 0,
          overrides.mandatoryTotal ?? 0,
          overrides.hamletGuestFee ?? 0,
          overrides.guestTotal ?? 0,
          overrides.refundableDeposit ?? 0,
          overrides.status ?? 'requested',
        ],
      );
      return rows[0];
    });
  }

  async function fetchBookingById(id: string): Promise<BookingRow> {
    const { rows } = await db.query<BookingRow>(
      `select
         id, reference, property_id, guest_id::text,
         check_in::text, check_out::text, guest_count,
         accommodation_subtotal, mandatory_total, hamlet_guest_fee,
         guest_total, refundable_deposit, status,
         payment_deadline::text, cancel_reason, timeline
       from public.bookings
       where id = $1`,
      [id],
    );
    return rows[0];
  }

  beforeAll(async () => {
    db = await createMigratedTestDb();
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    await resetTestData(db);
    refCounter = 0;

    const { rows } = await db.query<{ today: string }>('select current_date::text as today');
    baseDateIso = rows[0].today;

    adminId = await createTestUser(db, {
      email: 'admin@hamlet.test',
      fullName: 'Adaeze Admin',
      role: 'admin',
    });
    partnerId = await createTestUser(db, {
      email: 'partner@hamlet.test',
      fullName: 'Tunde Partner',
      role: 'partner',
    });
    otherPartnerId = await createTestUser(db, {
      email: 'other-partner@hamlet.test',
      fullName: 'Kemi Unassigned',
      role: 'partner',
    });
    guestAId = await createTestUser(db, {
      email: 'guest-a@hamlet.test',
      fullName: 'Chidi Guest',
      role: 'guest',
    });
    guestBId = await createTestUser(db, {
      email: 'guest-b@hamlet.test',
      fullName: 'Zainab Guest',
      role: 'guest',
    });

    approvedPropertyId = await submitAndOptionallyApproveProperty(
      partnerId,
      'Oceanview Two-Bedroom Residence',
      true,
    );
    submittedPropertyId = await submitAndOptionallyApproveProperty(
      partnerId,
      'Unapproved Ikoyi Penthouse Suite',
      false,
    );
  });

  describe('Booking request creation & integrity', () => {
    it('computes authoritative pricing, status, and initial timeline on insert regardless of client-supplied numbers', async () => {
      // 3 nights × 150,000 = 450,000 subtotal
      // mandatory charges = 25,000 + 15,000 = 40,000
      // 3% guest fee on accommodation subtotal = round(450,000 * 0.03) = 13,500
      // guest total = 450,000 + 40,000 + 13,500 = 503,500
      const booking = await insertBookingAsGuest(guestAId, {
        checkIn: addDays(baseDateIso, 7),
        checkOut: addDays(baseDateIso, 10),
        accommodationSubtotal: 1,
        mandatoryTotal: 0,
        hamletGuestFee: 0,
        guestTotal: 1,
        refundableDeposit: 0,
      });

      expect(booking.status).toBe('requested');
      expect(booking.accommodation_subtotal).toBe(450_000);
      expect(booking.mandatory_total).toBe(40_000);
      expect(booking.hamlet_guest_fee).toBe(13_500);
      expect(booking.guest_total).toBe(503_500);
      expect(booking.refundable_deposit).toBe(100_000);
      expect(booking.payment_deadline).toBeNull();
      expect(booking.timeline).toHaveLength(1);
      expect(booking.timeline[0]).toMatchObject({
        label: 'Booking requested',
        actor: 'Guest',
        detail: 'Awaiting availability and terms check',
      });
    });

    it('rejects booking requests from anonymous users, non-guest roles, or impersonated guest_ids', async () => {
      await expect(
        asAnon(db, tx =>
          tx.query(
            `insert into public.bookings (
               reference, property_id, guest_id, check_in, check_out, guest_count,
               accommodation_subtotal, hamlet_guest_fee, guest_total
             ) values ('HML-ANON', $1, $2::uuid, $3::date, $4::date, 2, 150000, 4500, 154500)`,
            [approvedPropertyId, guestAId, addDays(baseDateIso, 5), addDays(baseDateIso, 7)],
          ),
        ),
      ).rejects.toThrow(/permission denied/i);

      await expect(insertBookingAsGuest(partnerId)).rejects.toThrow(
        /A booking must belong to the signed-in guest/i,
      );

      await expect(insertBookingAsGuest(adminId)).rejects.toThrow(
        /A booking must belong to the signed-in guest/i,
      );

      await expect(
        asUser(db, guestAId, tx =>
          tx.query(
            `insert into public.bookings (
               reference, property_id, guest_id, check_in, check_out, guest_count,
               accommodation_subtotal, hamlet_guest_fee, guest_total
             ) values ('HML-SPOOF', $1, $2::uuid, $3::date, $4::date, 2, 150000, 4500, 154500)`,
            [approvedPropertyId, guestBId, addDays(baseDateIso, 5), addDays(baseDateIso, 7)],
          ),
        ),
      ).rejects.toThrow(/row-level security|A booking must belong to the signed-in guest/i);
    });

    it('rejects unapproved listings, over-capacity guests, out-of-range night counts, and past check-in dates', async () => {
      await expect(
        insertBookingAsGuest(guestAId, { propertyId: submittedPropertyId }),
      ).rejects.toThrow(/row-level security|not available for booking requests/i);

      await expect(
        insertBookingAsGuest(guestAId, { guestCount: 5 }),
      ).rejects.toThrow(/Guest count exceeds this property capacity/i);

      await expect(
        insertBookingAsGuest(guestAId, {
          checkIn: addDays(baseDateIso, 10),
          checkOut: addDays(baseDateIso, 72),
        }),
      ).rejects.toThrow(/Stay dates must be between 1 and 60 nights/i);

      await expect(
        insertBookingAsGuest(guestAId, {
          checkIn: addDays(baseDateIso, -1),
          checkOut: addDays(baseDateIso, 2),
        }),
      ).rejects.toThrow(/Check-in cannot be in the past/i);
    });
  });

  describe('Partner & admin booking transitions', () => {
    it('transitions requested -> checking -> awaiting_payment with a 48h payment deadline, timeline, and audit trail', async () => {
      const booking = await insertBookingAsGuest(guestAId);

      await asUser(db, partnerId, tx =>
        tx.query(`select public.transition_booking($1, 'checking', $2)`, [
          booking.id,
          'Confirming inverter servicing window',
        ]),
      );

      const afterChecking = await fetchBookingById(booking.id);
      expect(afterChecking.status).toBe('checking');
      expect(afterChecking.payment_deadline).toBeNull();
      expect(afterChecking.timeline).toHaveLength(2);
      expect(afterChecking.timeline[1]).toMatchObject({
        label: 'Availability & terms being checked',
        actor: 'Tunde Partner (partner)',
      });

      const beforeAcceptMs = Date.now();
      await asUser(db, partnerId, tx =>
        tx.query(`select public.transition_booking($1, 'awaiting_payment', $2)`, [
          booking.id,
          'Generator fuelled and apartment ready',
        ]),
      );

      const afterAccept = await fetchBookingById(booking.id);
      expect(afterAccept.status).toBe('awaiting_payment');
      expect(afterAccept.payment_deadline).not.toBeNull();

      const deadlineMs = new Date(afterAccept.payment_deadline!).getTime();
      const hoursAhead = (deadlineMs - beforeAcceptMs) / (3600 * 1000);
      expect(hoursAhead).toBeGreaterThan(47.9);
      expect(hoursAhead).toBeLessThan(48.1);

      expect(afterAccept.timeline).toHaveLength(3);
      expect(afterAccept.timeline[2].label).toBe('Accepted — awaiting payment');
      expect(afterAccept.timeline[2].actor).toBe('Tunde Partner (partner)');
      expect(afterAccept.timeline[2].detail).toContain('Generator fuelled and apartment ready');

      const { rows: audits } = await asUser(db, adminId, tx =>
        tx.query<AuditLogRow>(
          `select actor_id::text, actor_role, action, target, detail
           from public.admin_audit_log
           where target = $1
           order by created_at asc`,
          [booking.reference],
        ),
      );
      expect(audits.map(a => a.action)).toEqual([
        'booking_checking',
        'booking_awaiting_payment',
      ]);
      expect(audits[1].actor_id).toBe(partnerId);
      expect(audits[1].detail).toContain('previous status: checking; new status: awaiting_payment');
    });

    it('supports direct requested -> awaiting_payment acceptance and declining from requested or checking', async () => {
      const directAccept = await insertBookingAsGuest(guestAId, {
        checkIn: addDays(baseDateIso, 5),
        checkOut: addDays(baseDateIso, 7),
      });
      await asUser(db, partnerId, tx =>
        tx.query(`select public.transition_booking($1, 'awaiting_payment')`, [directAccept.id]),
      );
      expect((await fetchBookingById(directAccept.id)).status).toBe('awaiting_payment');

      const declinedFromRequested = await insertBookingAsGuest(guestAId, {
        checkIn: addDays(baseDateIso, 15),
        checkOut: addDays(baseDateIso, 18),
      });
      await asUser(db, partnerId, tx =>
        tx.query(`select public.transition_booking($1, 'declined', $2)`, [
          declinedFromRequested.id,
          '  Owner personal stay scheduled  ',
        ]),
      );
      const declinedRow = await fetchBookingById(declinedFromRequested.id);
      expect(declinedRow.status).toBe('declined');
      expect(declinedRow.payment_deadline).toBeNull();
      expect(declinedRow.timeline.at(-1)).toMatchObject({
        label: 'Declined by property partner',
        detail: 'Owner personal stay scheduled',
      });

      const declinedFromChecking = await insertBookingAsGuest(guestBId, {
        checkIn: addDays(baseDateIso, 20),
        checkOut: addDays(baseDateIso, 22),
      });
      await asUser(db, partnerId, tx =>
        tx.query(`select public.transition_booking($1, 'checking')`, [declinedFromChecking.id]),
      );
      await asUser(db, partnerId, tx =>
        tx.query(`select public.transition_booking($1, 'declined', 'Maintenance conflict')`, [
          declinedFromChecking.id,
        ]),
      );
      expect((await fetchBookingById(declinedFromChecking.id)).status).toBe('declined');
    });

    it('allows administrators to read and transition bookings without an explicit property_access row', async () => {
      const booking = await insertBookingAsGuest(guestAId);

      const visibleToAdmin = await asUser(db, adminId, async tx => {
        const { rows } = await tx.query<{ id: string }>(
          `select id from public.bookings where id = $1`,
          [booking.id],
        );
        return rows;
      });
      expect(visibleToAdmin).toHaveLength(1);

      await asUser(db, adminId, tx =>
        tx.query(`select public.transition_booking($1, 'checking')`, [booking.id]),
      );
      await asUser(db, adminId, tx =>
        tx.query(`select public.transition_booking($1, 'awaiting_payment', 'Verified by operations')`, [
          booking.id,
        ]),
      );

      const updated = await fetchBookingById(booking.id);
      expect(updated.status).toBe('awaiting_payment');
      expect(updated.timeline.at(-1)?.actor).toBe('Adaeze Admin (admin)');
    });
  });

  describe('Partner access & authorization boundaries', () => {
    it('prevents unassigned partners from reading or transitioning another property booking', async () => {
      const booking = await insertBookingAsGuest(guestAId);

      const visibleToUnassigned = await asUser(db, otherPartnerId, async tx => {
        const { rows } = await tx.query<{ id: string }>(
          `select id from public.bookings where id = $1`,
          [booking.id],
        );
        return rows;
      });
      expect(visibleToUnassigned).toHaveLength(0);

      await expect(
        asUser(db, otherPartnerId, tx =>
          tx.query(`select public.transition_booking($1, 'checking')`, [booking.id]),
        ),
      ).rejects.toThrow(/You are not authorised to manage this property booking/i);

      await expect(
        asUser(db, otherPartnerId, tx =>
          tx.query(`select public.transition_booking($1, 'awaiting_payment')`, [booking.id]),
        ),
      ).rejects.toThrow(/You are not authorised to manage this property booking/i);
    });

    it('revokes booking read and transition permissions immediately when property_access is revoked', async () => {
      const booking = await insertBookingAsGuest(guestAId);

      await asUser(db, adminId, tx =>
        tx.query(
          `update public.property_access
           set status = 'revoked', revoked_at = now()
           where property_id = $1 and user_id = $2::uuid`,
          [approvedPropertyId, partnerId],
        ),
      );

      const visibleAfterRevoke = await asUser(db, partnerId, async tx => {
        const { rows } = await tx.query<{ id: string }>(
          `select id from public.bookings where id = $1`,
          [booking.id],
        );
        return rows;
      });
      expect(visibleAfterRevoke).toHaveLength(0);

      await expect(
        asUser(db, partnerId, tx =>
          tx.query(`select public.transition_booking($1, 'awaiting_payment')`, [booking.id]),
        ),
      ).rejects.toThrow(/You are not authorised to manage this property booking/i);
    });

    it('blocks partner acceptance when the listing is suspended or check-in has moved into the past', async () => {
      const bookingOnSuspended = await insertBookingAsGuest(guestAId, {
        checkIn: addDays(baseDateIso, 10),
        checkOut: addDays(baseDateIso, 12),
      });

      await asUser(db, adminId, tx =>
        tx.query(
          `select public.review_partner_property($1, 'suspended', $2, $3::jsonb)`,
          [
            approvedPropertyId,
            'Listing temporarily suspended pending generator repair verification.',
            JSON.stringify(VERIFIED_ALL),
          ],
        ),
      );

      await expect(
        asUser(db, partnerId, tx =>
          tx.query(`select public.transition_booking($1, 'awaiting_payment')`, [
            bookingOnSuspended.id,
          ]),
        ),
      ).rejects.toThrow(/This property is no longer approved for booking/i);

      // Reinstate listing and verify past check-in guard during acceptance
      await asUser(db, adminId, tx =>
        tx.query(
          `select public.review_partner_property($1, 'approved', $2, $3::jsonb)`,
          [
            approvedPropertyId,
            'Generator repair verified; listing reinstated for bookings.',
            JSON.stringify(VERIFIED_ALL),
          ],
        ),
      );

      const staleBooking = await insertBookingAsGuest(guestBId, {
        checkIn: addDays(baseDateIso, 2),
        checkOut: addDays(baseDateIso, 5),
      });
      await db.query(
        `update public.bookings set check_in = $2::date where id = $1`,
        [staleBooking.id, addDays(baseDateIso, -1)],
      );

      await expect(
        asUser(db, partnerId, tx =>
          tx.query(`select public.transition_booking($1, 'awaiting_payment')`, [staleBooking.id]),
        ),
      ).rejects.toThrow(/check-in date in the past/i);
    });
  });

  describe('Overlapping requests & availability enforcement', () => {
    it('allows overlapping unaccepted requests and adjacent same-day turnovers, then blocks conflicts once accepted', async () => {
      const firstRequest = await insertBookingAsGuest(guestAId, {
        checkIn: addDays(baseDateIso, 10),
        checkOut: addDays(baseDateIso, 14),
      });
      const overlappingRequest = await insertBookingAsGuest(guestBId, {
        checkIn: addDays(baseDateIso, 12),
        checkOut: addDays(baseDateIso, 16),
      });

      expect(firstRequest.status).toBe('requested');
      expect(overlappingRequest.status).toBe('requested');

      // Accept the first request: dates [10, 14) are now held awaiting payment
      await asUser(db, partnerId, tx =>
        tx.query(`select public.transition_booking($1, 'awaiting_payment')`, [firstRequest.id]),
      );

      // Partner cannot accept the overlapping request while firstRequest holds [10, 14)
      await expect(
        asUser(db, partnerId, tx =>
          tx.query(`select public.transition_booking($1, 'awaiting_payment')`, [
            overlappingRequest.id,
          ]),
        ),
      ).rejects.toThrow(/These dates overlap another active booking/i);

      // New overlapping guest request [13, 15) is also rejected on insert
      await expect(
        insertBookingAsGuest(guestBId, {
          checkIn: addDays(baseDateIso, 13),
          checkOut: addDays(baseDateIso, 15),
        }),
      ).rejects.toThrow(/Those dates conflict with an existing booking/i);

      // Same-day turnover (check-in on day 14 when first booking checks out day 14) is allowed
      const adjacentTurn = await insertBookingAsGuest(guestBId, {
        checkIn: addDays(baseDateIso, 14),
        checkOut: addDays(baseDateIso, 17),
      });
      await asUser(db, partnerId, tx =>
        tx.query(`select public.transition_booking($1, 'awaiting_payment')`, [adjacentTurn.id]),
      );
      expect((await fetchBookingById(adjacentTurn.id)).status).toBe('awaiting_payment');
    });

    it('blocks overlapping guest requests and partner acceptances against confirmed bookings', async () => {
      const existing = await insertBookingAsGuest(guestAId, {
        checkIn: addDays(baseDateIso, 20),
        checkOut: addDays(baseDateIso, 25),
      });
      const competing = await insertBookingAsGuest(guestBId, {
        checkIn: addDays(baseDateIso, 22),
        checkOut: addDays(baseDateIso, 26),
      });

      // Simulate server-side webhook payment confirmation
      await db.query(`update public.bookings set status = 'confirmed' where id = $1`, [
        existing.id,
      ]);

      await expect(
        asUser(db, partnerId, tx =>
          tx.query(`select public.transition_booking($1, 'awaiting_payment')`, [competing.id]),
        ),
      ).rejects.toThrow(/These dates overlap another active booking/i);

      await expect(
        insertBookingAsGuest(guestBId, {
          checkIn: addDays(baseDateIso, 21),
          checkOut: addDays(baseDateIso, 23),
        }),
      ).rejects.toThrow(/Those dates conflict with an existing booking/i);
    });
  });

  describe('Guest cancellation & invalid state transitions', () => {
    it('allows a guest to cancel their own requested, checking, or awaiting_payment booking and releases held dates', async () => {
      const requestedBooking = await insertBookingAsGuest(guestAId, {
        checkIn: addDays(baseDateIso, 6),
        checkOut: addDays(baseDateIso, 8),
      });
      await asUser(db, guestAId, tx =>
        tx.query(`select public.transition_booking($1, 'cancelled', '  Flight rescheduled  ')`, [
          requestedBooking.id,
        ]),
      );
      const cancelledRequested = await fetchBookingById(requestedBooking.id);
      expect(cancelledRequested.status).toBe('cancelled');
      expect(cancelledRequested.cancel_reason).toBe('Flight rescheduled');
      expect(cancelledRequested.timeline.at(-1)).toMatchObject({
        label: 'Booking cancelled by guest',
        actor: 'Chidi Guest (guest)',
        detail: 'Flight rescheduled',
      });

      // Cancel from checking
      const checkingBooking = await insertBookingAsGuest(guestAId, {
        checkIn: addDays(baseDateIso, 9),
        checkOut: addDays(baseDateIso, 11),
      });
      await asUser(db, partnerId, tx =>
        tx.query(`select public.transition_booking($1, 'checking')`, [checkingBooking.id]),
      );
      await asUser(db, guestAId, tx =>
        tx.query(`select public.transition_booking($1, 'cancelled')`, [checkingBooking.id]),
      );
      expect((await fetchBookingById(checkingBooking.id)).status).toBe('cancelled');

      // Cancel from awaiting_payment releases dates for competing overlapping request
      const acceptedBooking = await insertBookingAsGuest(guestAId, {
        checkIn: addDays(baseDateIso, 14),
        checkOut: addDays(baseDateIso, 18),
      });
      const competingBooking = await insertBookingAsGuest(guestBId, {
        checkIn: addDays(baseDateIso, 15),
        checkOut: addDays(baseDateIso, 19),
      });
      await asUser(db, partnerId, tx =>
        tx.query(`select public.transition_booking($1, 'awaiting_payment')`, [acceptedBooking.id]),
      );

      await asUser(db, guestAId, tx =>
        tx.query(`select public.transition_booking($1, 'cancelled', 'Choosing different dates')`, [
          acceptedBooking.id,
        ]),
      );
      expect((await fetchBookingById(acceptedBooking.id)).status).toBe('cancelled');

      // Competing request on the released dates can now be accepted
      await asUser(db, partnerId, tx =>
        tx.query(`select public.transition_booking($1, 'awaiting_payment')`, [
          competingBooking.id,
        ]),
      );
      expect((await fetchBookingById(competingBooking.id)).status).toBe('awaiting_payment');
    });

    it('prevents cross-guest access/cancellation, non-cancel guest transitions, and cancelling confirmed or closed bookings', async () => {
      const guestABooking = await insertBookingAsGuest(guestAId);

      // Guest B cannot see Guest A's booking through RLS
      const visibleToGuestB = await asUser(db, guestBId, async tx => {
        const { rows } = await tx.query<{ id: string }>(
          `select id from public.bookings where id = $1`,
          [guestABooking.id],
        );
        return rows;
      });
      expect(visibleToGuestB).toHaveLength(0);

      // Guest B cannot cancel Guest A's booking via RPC
      await expect(
        asUser(db, guestBId, tx =>
          tx.query(`select public.transition_booking($1, 'cancelled')`, [guestABooking.id]),
        ),
      ).rejects.toThrow(/Guests may only cancel their own open booking requests/i);

      // Guest A cannot move their own booking to checking, awaiting_payment, or declined
      for (const forbiddenStatus of ['checking', 'awaiting_payment', 'declined']) {
        await expect(
          asUser(db, guestAId, tx =>
            tx.query(`select public.transition_booking($1, $2)`, [
              guestABooking.id,
              forbiddenStatus,
            ]),
          ),
        ).rejects.toThrow(/Guests may only cancel their own open booking requests/i);
      }

      // Once confirmed, guest cannot self-cancel through transition_booking
      await db.query(`update public.bookings set status = 'confirmed' where id = $1`, [
        guestABooking.id,
      ]);
      await expect(
        asUser(db, guestAId, tx =>
          tx.query(`select public.transition_booking($1, 'cancelled')`, [guestABooking.id]),
        ),
      ).rejects.toThrow(/Guests may only cancel their own open booking requests/i);
    });

    it('rejects invalid partner/admin transitions out of awaiting_payment or closed states', async () => {
      const booking = await insertBookingAsGuest(guestAId);

      // Partner cannot cancel a booking via transition_booking
      await expect(
        asUser(db, partnerId, tx =>
          tx.query(`select public.transition_booking($1, 'cancelled')`, [booking.id]),
        ),
      ).rejects.toThrow(/Invalid booking transition from requested to cancelled/i);

      await asUser(db, partnerId, tx =>
        tx.query(`select public.transition_booking($1, 'awaiting_payment')`, [booking.id]),
      );

      for (const invalidTarget of ['checking', 'declined', 'cancelled', 'expired']) {
        await expect(
          asUser(db, partnerId, tx =>
            tx.query(`select public.transition_booking($1, $2)`, [booking.id, invalidTarget]),
          ),
        ).rejects.toThrow(/Invalid booking transition/i);
      }
    });
  });

  describe('Payment-deadline expiry (expire_overdue_bookings)', () => {
    it('blocks anonymous and unauthenticated callers from running expire_overdue_bookings or transition_booking', async () => {
      const booking = await insertBookingAsGuest(guestAId);

      await expect(
        asAnon(db, tx => tx.query(`select public.expire_overdue_bookings()`)),
      ).rejects.toThrow(/permission denied for function expire_overdue_bookings/i);

      await expect(
        asAnon(db, tx => tx.query(`select public.transition_booking($1, 'cancelled')`, [booking.id])),
      ).rejects.toThrow(/permission denied for function transition_booking/i);

      await expect(
        asAuthenticatedWithoutUid(db, tx => tx.query(`select public.expire_overdue_bookings()`)),
      ).rejects.toThrow(/Sign in to process booking expiry/i);

      await expect(
        asAuthenticatedWithoutUid(db, tx =>
          tx.query(`select public.transition_booking($1, 'cancelled')`, [booking.id]),
        ),
      ).rejects.toThrow(/Sign in to update this booking/i);
    });

    it('expires only overdue awaiting_payment bookings, logs audit + timeline entries, is idempotent, and releases dates', async () => {
      const overdueBooking = await insertBookingAsGuest(guestAId, {
        checkIn: addDays(baseDateIso, 10),
        checkOut: addDays(baseDateIso, 13),
      });
      const activeBooking = await insertBookingAsGuest(guestBId, {
        checkIn: addDays(baseDateIso, 16),
        checkOut: addDays(baseDateIso, 19),
      });

      await asUser(db, partnerId, tx =>
        tx.query(`select public.transition_booking($1, 'awaiting_payment')`, [overdueBooking.id]),
      );
      await asUser(db, partnerId, tx =>
        tx.query(`select public.transition_booking($1, 'awaiting_payment')`, [activeBooking.id]),
      );

      // Rewind overdueBooking's deadline into the past
      await db.query(
        `update public.bookings
         set payment_deadline = now() - interval '5 minutes'
         where id = $1`,
        [overdueBooking.id],
      );

      const firstSweepCount = await asUser(db, guestBId, async tx => {
        const { rows } = await tx.query<{ count: number }>(
          `select public.expire_overdue_bookings() as count`,
        );
        return rows[0].count;
      });
      expect(firstSweepCount).toBe(1);

      const expiredAfterSweep = await fetchBookingById(overdueBooking.id);
      const stillActive = await fetchBookingById(activeBooking.id);

      expect(expiredAfterSweep.status).toBe('expired');
      expect(expiredAfterSweep.timeline.at(-1)).toMatchObject({
        label: 'Payment deadline expired — booking expired',
        actor: 'HAMLET system',
        detail: 'Availability released after the payment deadline.',
      });
      expect(stillActive.status).toBe('awaiting_payment');

      const { rows: expiryAudits } = await asUser(db, adminId, tx =>
        tx.query<AuditLogRow>(
          `select actor_id::text, actor_role, action, target, detail
           from public.admin_audit_log
           where action = 'booking_expired' and target = $1`,
          [overdueBooking.reference],
        ),
      );
      expect(expiryAudits).toHaveLength(1);
      expect(expiryAudits[0]).toMatchObject({
        actor_id: guestBId,
        actor_role: 'system',
        action: 'booking_expired',
      });

      // Repeat sweep is idempotent
      const secondSweepCount = await asUser(db, partnerId, async tx => {
        const { rows } = await tx.query<{ count: number }>(
          `select public.expire_overdue_bookings() as count`,
        );
        return rows[0].count;
      });
      expect(secondSweepCount).toBe(0);

      // Released dates [10, 13) can now be booked again
      const replacementBooking = await insertBookingAsGuest(guestBId, {
        checkIn: addDays(baseDateIso, 10),
        checkOut: addDays(baseDateIso, 13),
      });
      expect(replacementBooking.status).toBe('requested');
    });

    it('lets a partner accept a competing request as soon as an overlapping payment_deadline has elapsed even before sweep', async () => {
      const staleAccepted = await insertBookingAsGuest(guestAId, {
        checkIn: addDays(baseDateIso, 10),
        checkOut: addDays(baseDateIso, 14),
      });
      const waitingGuest = await insertBookingAsGuest(guestBId, {
        checkIn: addDays(baseDateIso, 11),
        checkOut: addDays(baseDateIso, 15),
      });

      await asUser(db, partnerId, tx =>
        tx.query(`select public.transition_booking($1, 'awaiting_payment')`, [staleAccepted.id]),
      );
      await db.query(
        `update public.bookings set payment_deadline = now() - interval '1 minute' where id = $1`,
        [staleAccepted.id],
      );

      await asUser(db, partnerId, tx =>
        tx.query(`select public.transition_booking($1, 'awaiting_payment')`, [waitingGuest.id]),
      );
      expect((await fetchBookingById(waitingGuest.id)).status).toBe('awaiting_payment');
    });
  });

  describe('No-direct-confirmation guard', () => {
    it('prevents direct table UPDATEs on public.bookings by guests, partners, admins, and anon', async () => {
      const booking = await insertBookingAsGuest(guestAId);

      for (const userId of [guestAId, partnerId, adminId]) {
        await expect(
          asUser(db, userId, tx =>
            tx.query(`update public.bookings set status = 'confirmed' where id = $1`, [
              booking.id,
            ]),
          ),
        ).rejects.toThrow(/permission denied for table bookings/i);
      }

      await expect(
        asAnon(db, tx =>
          tx.query(`update public.bookings set status = 'confirmed' where id = $1`, [booking.id]),
        ),
      ).rejects.toThrow(/permission denied for table bookings/i);

      expect((await fetchBookingById(booking.id)).status).toBe('requested');
    });

    it('prevents confirming a booking via transition_booking or direct INSERT from any role or state', async () => {
      // BEFORE INSERT trigger enforce_booking_request_integrity coerces any client-supplied
      // status (such as 'confirmed') back to 'requested' before writing the row.
      const booking = await insertBookingAsGuest(guestAId, { status: 'confirmed' });
      expect(booking.status).toBe('requested');

      // Cannot confirm from 'requested'
      await expect(
        asUser(db, guestAId, tx =>
          tx.query(`select public.transition_booking($1, 'confirmed')`, [booking.id]),
        ),
      ).rejects.toThrow(/Guests may only cancel their own open booking requests/i);
      await expect(
        asUser(db, partnerId, tx =>
          tx.query(`select public.transition_booking($1, 'confirmed')`, [booking.id]),
        ),
      ).rejects.toThrow(/Invalid booking transition from requested to confirmed/i);
      await expect(
        asUser(db, adminId, tx =>
          tx.query(`select public.transition_booking($1, 'confirmed')`, [booking.id]),
        ),
      ).rejects.toThrow(/Invalid booking transition from requested to confirmed/i);

      // Move to 'checking' and 'awaiting_payment' — still cannot confirm via RPC
      await asUser(db, partnerId, tx =>
        tx.query(`select public.transition_booking($1, 'checking')`, [booking.id]),
      );
      await expect(
        asUser(db, partnerId, tx =>
          tx.query(`select public.transition_booking($1, 'confirmed')`, [booking.id]),
        ),
      ).rejects.toThrow(/Invalid booking transition from checking to confirmed/i);

      await asUser(db, partnerId, tx =>
        tx.query(`select public.transition_booking($1, 'awaiting_payment')`, [booking.id]),
      );
      await expect(
        asUser(db, partnerId, tx =>
          tx.query(`select public.transition_booking($1, 'confirmed')`, [booking.id]),
        ),
      ).rejects.toThrow(/Invalid booking transition from awaiting_payment to confirmed/i);
      await expect(
        asUser(db, adminId, tx =>
          tx.query(`select public.transition_booking($1, 'confirmed')`, [booking.id]),
        ),
      ).rejects.toThrow(/Invalid booking transition from awaiting_payment to confirmed/i);

      expect((await fetchBookingById(booking.id)).status).toBe('awaiting_payment');
    });
  });
});
