import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asAnon, asServiceRole, asUser, createMigratedTestDb, createTestUser, resetTestData } from './helpers/testDb.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATION = readFileSync(
  path.resolve(__dirname, '../migrations/20261127090000_two_hour_payment_window.sql'),
  'utf8',
);

const VERIFIED_ALL = { ownership: 'verified', identity: 'verified', authority: 'verified', inspection: 'verified' };

/**
 * After the owner or manager confirms availability, the guest has 2 hours to pay.
 * A reminder is queued 30 minutes before the deadline, an in-flight payment gets a
 * 15-minute verification grace, and unpaid holds expire automatically after that.
 */
describe('Two-hour payment window', () => {
  let db: PGlite;
  let adminId: string;
  let ownerId: string;
  let guestId: string;
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

  const setDeadline = (bookingId: string, offset: string) =>
    db.query(`update public.bookings set payment_deadline = now() + $2::interval where id = $1`, [bookingId, offset]);

  const status = async (bookingId: string) =>
    (await db.query<{ status: string }>(`select status from public.bookings where id = $1`, [bookingId])).rows[0].status;

  const runJobs = () =>
    asServiceRole(db, async tx => {
      const { rows } = await tx.query<{ result: { reminders_queued: number; expired: number } }>(
        `select public.run_booking_payment_window_jobs() as result`,
      );
      return rows[0].result;
    });

  const notifications = async (bookingId: string, eventType: string) =>
    (
      await db.query<{ recipient_type: string }>(
        `select recipient_type from public.booking_notifications
         where booking_id = $1 and event_type = $2 order by recipient_type`,
        [bookingId, eventType],
      )
    ).rows.map(row => row.recipient_type);

  const confirmPayment = (booking: { id: string; guest_total: number }, providerRef: string) =>
    asServiceRole(db, tx =>
      tx.query(`select public.confirm_booking_payment_webhook($1, 'Paystack', $2, $3, 0, 'NGN')`, [
        booking.id,
        providerRef,
        booking.guest_total,
      ]),
    );

  beforeAll(async () => {
    db = await createMigratedTestDb();
    today = (await db.query<{ t: string }>(`select current_date::text as t`)).rows[0].t;
  });

  beforeEach(async () => {
    await resetTestData(db);
    adminId = await createTestUser(db, { email: 'ops@hamlet.test', fullName: 'HAMLET Ops', role: 'admin' });
    ownerId = await createTestUser(db, { email: 'owner@hamlet.test', fullName: 'Chidi Owner', role: 'partner' });
    guestId = await createTestUser(db, { email: 'guest@hamlet.test', fullName: 'Ngozi Guest', role: 'guest' });
    propertyId = await approvedProperty(ownerId);
  });

  afterAll(async () => {
    await db.close();
  });

  it('starts a 2-hour payment deadline the moment availability is confirmed', async () => {
    const before = Date.now();
    const booking = await acceptedBooking('HML-2H-ACCEPT', 14);
    const { rows } = await db.query<{ payment_deadline: string; detail: string }>(
      `select payment_deadline::text, timeline -> -1 ->> 'detail' as detail from public.bookings where id = $1`,
      [booking.id],
    );
    const hoursAhead = (new Date(rows[0].payment_deadline).getTime() - before) / 3_600_000;
    expect(hoursAhead).toBeGreaterThan(1.95);
    expect(hoursAhead).toBeLessThan(2.05);
    expect(rows[0].detail).toMatch(/^Payment deadline: /);
  });

  it('confirms a payment that lands within the 15-minute verification grace, and rejects one after it', async () => {
    const inGrace = await acceptedBooking('HML-2H-GRACE', 14);
    await setDeadline(inGrace.id, '-5 minutes');
    await confirmPayment(inGrace, 'PSK_2H_GRACE');
    expect(await status(inGrace.id)).toBe('confirmed');

    const tooLate = await acceptedBooking('HML-2H-LATE', 30);
    await setDeadline(tooLate.id, '-20 minutes');
    await expect(confirmPayment(tooLate, 'PSK_2H_LATE')).rejects.toThrow(/payment deadline has already expired/i);
    expect(await status(tooLate.id)).toBe('awaiting_payment');
  });

  it('queues one guest-only reminder about 30 minutes before the deadline', async () => {
    const dueSoon = await acceptedBooking('HML-2H-REMIND', 14);
    const notYet = await acceptedBooking('HML-2H-LATER', 30);
    await setDeadline(dueSoon.id, '25 minutes');
    await setDeadline(notYet.id, '90 minutes');

    expect(await runJobs()).toEqual({ reminders_queued: 1, expired: 0 });
    expect(await notifications(dueSoon.id, 'booking_payment_reminder')).toEqual(['guest']);
    expect(await notifications(notYet.id, 'booking_payment_reminder')).toEqual([]);

    expect(await runJobs()).toEqual({ reminders_queued: 0, expired: 0 });
    expect(await notifications(dueSoon.id, 'booking_payment_reminder')).toEqual(['guest']);
  });

  it('expires unpaid holds automatically after the deadline and grace, emails guest and partner, and releases the dates', async () => {
    const inGrace = await acceptedBooking('HML-2H-HOLD', 14);
    const overdue = await acceptedBooking('HML-2H-EXPIRE', 30);
    await setDeadline(inGrace.id, '-5 minutes');
    await setDeadline(overdue.id, '-20 minutes');

    expect(await runJobs()).toEqual({ reminders_queued: 0, expired: 1 });
    expect(await status(inGrace.id)).toBe('awaiting_payment');
    expect(await status(overdue.id)).toBe('expired');

    const { rows } = await db.query<{ label: string; actor: string }>(
      `select timeline -> -1 ->> 'label' as label, timeline -> -1 ->> 'actor' as actor from public.bookings where id = $1`,
      [overdue.id],
    );
    expect(rows[0]).toEqual({ label: 'Payment deadline expired — booking expired', actor: 'HAMLET system' });
    const audit = await db.query(
      `select 1 from public.admin_audit_log where action = 'booking_expired' and target = 'HML-2H-EXPIRE'`,
    );
    expect(audit.rows).toHaveLength(1);
    expect(await notifications(overdue.id, 'booking_expired')).toEqual(['guest', 'operations', 'partner']);

    // The released dates can be requested again.
    const again = await asUser(db, guestId, async tx => {
      const { rows: inserted } = await tx.query<{ status: string }>(
        `insert into public.bookings (reference, property_id, guest_id, check_in, check_out, guest_count, status)
         values ('HML-2H-AGAIN', $1, $2::uuid, $3::date, $4::date, 2, 'requested') returning status`,
        [propertyId, guestId, addDays(today, 30), addDays(today, 33)],
      );
      return inserted[0];
    });
    expect(again.status).toBe('requested');
  });

  it('lets an admin expire a hold manually only after the deadline and grace', async () => {
    const booking = await acceptedBooking('HML-2H-MANUAL', 14);
    await setDeadline(booking.id, '-5 minutes');
    await expect(
      asUser(db, adminId, tx => tx.query(`select public.transition_booking($1, 'expired')`, [booking.id])),
    ).rejects.toThrow(/payment-verification grace/i);

    await setDeadline(booking.id, '-20 minutes');
    await asUser(db, adminId, tx => tx.query(`select public.transition_booking($1, 'expired')`, [booking.id]));
    expect(await status(booking.id)).toBe('expired');
  });

  it('keeps the scheduled job away from browser clients', async () => {
    await expect(
      asAnon(db, tx => tx.query(`select public.run_booking_payment_window_jobs()`)),
    ).rejects.toThrow(/permission denied/i);
    await expect(
      asUser(db, guestId, tx => tx.query(`select public.run_booking_payment_window_jobs()`)),
    ).rejects.toThrow(/permission denied/i);
  });

  it('is a no-op when the migration runs again', async () => {
    const before = await db.query<{ def: string }>(
      `select pg_get_functiondef('public.transition_booking(text,text,text)'::regprocedure) as def`,
    );
    await db.exec(MIGRATION);
    const after = await db.query<{ def: string }>(
      `select pg_get_functiondef('public.transition_booking(text,text,text)'::regprocedure) as def`,
    );
    expect(after.rows[0].def).toBe(before.rows[0].def);
    expect(after.rows[0].def).toContain('public.booking_payment_window()');
    expect(after.rows[0].def).not.toContain("interval '48 hours'");
  });
});
