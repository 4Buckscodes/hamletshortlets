import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asAnon, asServiceRole, asUser, createMigratedTestDb, createTestUser, resetTestData } from './helpers/testDb.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATION = readFileSync(
  path.resolve(__dirname, '../migrations/20261128090000_payment_extension.sql'),
  'utf8',
);

const VERIFIED_ALL = { ownership: 'verified', identity: 'verified', authority: 'verified', inspection: 'verified' };

/**
 * A guest may ask once for 30 more minutes to pay; the property owner or manager
 * approves or declines before the deadline.
 */
describe('One-time 30-minute payment extension', () => {
  let db: PGlite;
  let adminId: string;
  let ownerId: string;
  let otherPartnerId: string;
  let guestId: string;
  let otherGuestId: string;
  let propertyId: string;
  let today: string;

  const addDays = (iso: string, days: number) => {
    const d = new Date(`${iso}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };

  async function approvedProperty(submitterId: string): Promise<string> {
    const id = await asUser(db, submitterId, async tx => {
      const { rows } = await tx.query<{ id: string }>(
        `select public.submit_partner_property($1::jsonb, $2::jsonb) as id`,
        [
          JSON.stringify({
            title: 'Ikoyi Waterfront Two-Bedroom',
            property_type: 'Serviced apartment',
            area: 'Ikoyi',
            public_address: '8 Bourdillon Road, Ikoyi',
            nightly_rate: 150_000,
            cleaning_fee: 25_000,
            mandatory_charges: [{ label: 'Cleaning & turnover (mandatory)', amount: 25_000 }],
            refundable_deposit: 100_000,
            bedrooms: 2,
            bathrooms: 2,
            capacity: 4,
            bed_setup: '2 Queen beds',
            amenities: ['24/7 Power'],
            image_urls: ['/images/prop/living-1.jpg'],
            house_rules: ['No smoking'],
          }),
          JSON.stringify({ authority_basis: 'Registered title deed', submitted_role: 'Owner', docs: [] }),
        ],
      );
      return rows[0].id;
    });
    await asUser(db, adminId, tx =>
      tx.query(`select public.review_partner_property($1, 'approved', $2, $3::jsonb)`, [
        id,
        'Verified across all four HAMLET pillars.',
        JSON.stringify(VERIFIED_ALL),
      ]),
    );
    return id;
  }

  async function acceptedBooking(reference: string, startOffset: number) {
    const booking = await asUser(db, guestId, async tx => {
      const { rows } = await tx.query<{ id: string; guest_total: number }>(
        `insert into public.bookings (reference, property_id, guest_id, check_in, check_out, guest_count, status)
         values ($1, $2, $3::uuid, $4::date, $5::date, 2, 'requested')
         returning id, guest_total`,
        [reference, propertyId, guestId, addDays(today, startOffset), addDays(today, startOffset + 3)],
      );
      return rows[0];
    });
    await asUser(db, ownerId, tx => tx.query(`select public.transition_booking($1, 'awaiting_payment')`, [booking.id]));
    return booking;
  }

  const bookingRow = async (bookingId: string) =>
    (
      await db.query<{
        status: string;
        payment_deadline: string;
        payment_extension_status: string | null;
        payment_extension_decided_by: string | null;
        label: string;
      }>(
        `select status, payment_deadline::text, payment_extension_status, payment_extension_decided_by::text,
                timeline -> -1 ->> 'label' as label
         from public.bookings where id = $1`,
        [bookingId],
      )
    ).rows[0];

  const requestExtension = (actorId: string, bookingId: string) =>
    asUser(db, actorId, tx => tx.query(`select public.request_payment_extension($1)`, [bookingId]));

  const decide = (actorId: string, bookingId: string, approve: boolean, note: string | null = null) =>
    asUser(db, actorId, tx =>
      tx.query(`select public.decide_payment_extension($1, $2, $3)`, [bookingId, approve, note]),
    );

  const notifications = async (bookingId: string, eventType: string) =>
    (
      await db.query<{ recipient_type: string }>(
        `select recipient_type from public.booking_notifications
         where booking_id = $1 and event_type = $2 order by recipient_type`,
        [bookingId, eventType],
      )
    ).rows.map(row => row.recipient_type);

  beforeAll(async () => {
    db = await createMigratedTestDb();
    today = (await db.query<{ t: string }>(`select current_date::text as t`)).rows[0].t;
  });

  beforeEach(async () => {
    await resetTestData(db);
    adminId = await createTestUser(db, { email: 'ops@hamlet.test', fullName: 'HAMLET Ops', role: 'admin' });
    ownerId = await createTestUser(db, { email: 'owner@hamlet.test', fullName: 'Chidi Owner', role: 'partner' });
    otherPartnerId = await createTestUser(db, { email: 'other@hamlet.test', fullName: 'Other Partner', role: 'partner' });
    guestId = await createTestUser(db, { email: 'guest@hamlet.test', fullName: 'Ngozi Guest', role: 'guest' });
    otherGuestId = await createTestUser(db, { email: 'guest2@hamlet.test', fullName: 'Other Guest', role: 'guest' });
    propertyId = await approvedProperty(ownerId);
  });

  afterAll(async () => {
    await db.close();
  });

  it('lets the guest ask once, emails the partner, and moves the deadline 30 minutes when the owner approves', async () => {
    const booking = await acceptedBooking('HML-EXT-APPROVE', 14);
    const before = await bookingRow(booking.id);

    await requestExtension(guestId, booking.id);
    const requested = await bookingRow(booking.id);
    expect(requested.payment_extension_status).toBe('requested');
    expect(requested.payment_deadline).toBe(before.payment_deadline);
    expect(requested.label).toBe('Guest asked for 30 more minutes to pay');
    expect(await notifications(booking.id, 'booking_extension_requested')).toEqual(['guest', 'partner']);

    await expect(requestExtension(guestId, booking.id)).rejects.toThrow(/only once per booking/i);

    await decide(ownerId, booking.id, true, 'No problem, take your time.');
    const approved = await bookingRow(booking.id);
    expect(approved.payment_extension_status).toBe('approved');
    expect(approved.payment_extension_decided_by).toBe(ownerId);
    expect(approved.label).toBe('Extra 30 minutes to pay approved');
    const addedMinutes =
      (new Date(approved.payment_deadline).getTime() - new Date(before.payment_deadline).getTime()) / 60_000;
    expect(addedMinutes).toBe(30);
    expect(await notifications(booking.id, 'booking_extension_approved')).toEqual(['guest']);

    // A decision is final.
    await expect(decide(ownerId, booking.id, false)).rejects.toThrow(/no pending request/i);
    await expect(requestExtension(guestId, booking.id)).rejects.toThrow(/only once per booking/i);
  });

  it('keeps the original deadline when the owner declines', async () => {
    const booking = await acceptedBooking('HML-EXT-DECLINE', 14);
    const before = await bookingRow(booking.id);
    await requestExtension(guestId, booking.id);
    await decide(ownerId, booking.id, false, 'Another guest is waiting on these dates.');

    const declined = await bookingRow(booking.id);
    expect(declined.payment_extension_status).toBe('declined');
    expect(declined.payment_deadline).toBe(before.payment_deadline);
    expect(declined.label).toBe('Request for more time declined');
    expect(await notifications(booking.id, 'booking_extension_declined')).toEqual(['guest']);
  });

  it('lets an admin decide, but not other partners, other guests or the guest themselves', async () => {
    const booking = await acceptedBooking('HML-EXT-AUTH', 14);
    await expect(requestExtension(otherGuestId, booking.id)).rejects.toThrow(/not found for your guest account/i);
    await requestExtension(guestId, booking.id);

    await expect(decide(guestId, booking.id, true)).rejects.toThrow(/not authorised/i);
    await expect(decide(otherPartnerId, booking.id, true)).rejects.toThrow(/not authorised/i);
    await expect(
      asAnon(db, tx => tx.query(`select public.decide_payment_extension($1, true, null)`, [booking.id])),
    ).rejects.toThrow(/permission denied/i);

    await decide(adminId, booking.id, true);
    expect((await bookingRow(booking.id)).payment_extension_status).toBe('approved');
  });

  it('refuses requests and decisions once the deadline has passed, and still expires the hold', async () => {
    const late = await acceptedBooking('HML-EXT-LATE', 14);
    await db.query(`update public.bookings set payment_deadline = now() - interval '1 minute' where id = $1`, [late.id]);
    await expect(requestExtension(guestId, late.id)).rejects.toThrow(/already closed/i);

    const pending = await acceptedBooking('HML-EXT-PENDING', 30);
    await requestExtension(guestId, pending.id);
    await db.query(`update public.bookings set payment_deadline = now() - interval '20 minutes' where id = $1`, [pending.id]);
    await expect(decide(ownerId, pending.id, true)).rejects.toThrow(/deadline has already passed/i);

    await asServiceRole(db, tx => tx.query(`select public.run_booking_payment_window_jobs()`));
    expect((await bookingRow(pending.id)).status).toBe('expired');
  });

  it('only extends bookings that are awaiting payment', async () => {
    const booking = await asUser(db, guestId, async tx => {
      const { rows } = await tx.query<{ id: string }>(
        `insert into public.bookings (reference, property_id, guest_id, check_in, check_out, guest_count, status)
         values ('HML-EXT-REQUESTED', $1, $2::uuid, $3::date, $4::date, 2, 'requested') returning id`,
        [propertyId, guestId, addDays(today, 14), addDays(today, 17)],
      );
      return rows[0];
    });
    await expect(requestExtension(guestId, booking.id)).rejects.toThrow(/awaiting payment/i);
  });

  it('does not let guests change extension fields directly', async () => {
    const booking = await acceptedBooking('HML-EXT-DIRECT', 14);
    await expect(
      asUser(db, guestId, tx =>
        tx.query(`update public.bookings set payment_extension_status = 'approved' where id = $1`, [booking.id]),
      ),
    ).rejects.toThrow(/permission denied/i);
  });

  it('is a no-op when the migration runs again', async () => {
    const def = async () =>
      (
        await db.query<{ def: string }>(
          `select pg_get_functiondef('public.enqueue_booking_event_notifications(text,text,text)'::regprocedure) as def`,
        )
      ).rows[0].def;
    const before = await def();
    await db.exec(MIGRATION);
    expect(await def()).toBe(before);
    expect(before).toContain('booking_extension_requested');
  });
});
