import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asServiceRole, asUser, createMigratedTestDb, createTestUser, resetTestData } from './helpers/testDb.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATION = readFileSync(
  path.resolve(__dirname, '../migrations/20261120052908_network_partner_booking_permissions.sql'),
  'utf8',
);

const VERIFIED_ALL = { ownership: 'verified', identity: 'verified', authority: 'verified', inspection: 'verified' };

/**
 * Network partners keep profiles.role = 'guest'; an active
 * partner_network_memberships row is their entitlement. They must be able to
 * manage bookings on the properties they manage, and only those.
 */
describe('Network partner booking permissions', () => {
  let db: PGlite;
  let adminId: string;
  let ownerId: string;
  let otherMemberId: string;
  let guestId: string;
  let propertyId: string;
  let today: string;

  const addDays = (iso: string, days: number) => {
    const d = new Date(`${iso}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };

  async function networkMember(email: string, fullName: string, phone: string): Promise<string> {
    const id = await createTestUser(db, { email, fullName, role: 'guest' });
    await asUser(db, id, tx =>
      tx.query(`select * from public.join_partner_network('property_owner', $1, $2)`, [`${fullName} Homes`, phone]),
    );
    return id;
  }

  async function approvedProperty(submitterId: string, title: string): Promise<string> {
    const id = await asUser(db, submitterId, async tx => {
      const { rows } = await tx.query<{ id: string }>(
        `select public.submit_partner_property($1::jsonb, $2::jsonb) as id`,
        [
          JSON.stringify({
            title,
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

  async function requestBooking(asGuest: string, onProperty: string, reference: string, startOffset: number) {
    return asUser(db, asGuest, async tx => {
      const { rows } = await tx.query<{ id: string; guest_total: number }>(
        `insert into public.bookings (reference, property_id, guest_id, check_in, check_out, guest_count, status)
         values ($1, $2, $3::uuid, $4::date, $5::date, 2, 'requested')
         returning id, guest_total`,
        [reference, onProperty, asGuest, addDays(today, startOffset), addDays(today, startOffset + 3)],
      );
      return rows[0];
    });
  }

  const transition = (actorId: string, bookingId: string, next: string, note: string | null = null) =>
    asUser(db, actorId, tx => tx.query(`select public.transition_booking($1, $2, $3)`, [bookingId, next, note]));

  const status = async (bookingId: string) =>
    (await db.query<{ status: string }>(`select status from public.bookings where id = $1`, [bookingId])).rows[0].status;

  beforeAll(async () => {
    db = await createMigratedTestDb();
    today = (await db.query<{ t: string }>(`select current_date::text as t`)).rows[0].t;
  });

  beforeEach(async () => {
    await resetTestData(db);
    adminId = await createTestUser(db, { email: 'ops@hamlet.test', fullName: 'HAMLET Ops', role: 'admin' });
    ownerId = await networkMember('owner@hamlet.test', 'Chidi Owner', '+2348061110001');
    otherMemberId = await networkMember('other@hamlet.test', 'Other Member', '+2348061110002');
    guestId = await createTestUser(db, { email: 'guest@hamlet.test', fullName: 'Ngozi Guest', role: 'guest' });
    propertyId = await approvedProperty(ownerId, 'Ikoyi Waterfront Two-Bedroom');
  });

  afterAll(async () => {
    await db.close();
  });

  it('lets a network-member owner check, accept and decline requests on their own listing', async () => {
    const roles = await db.query<{ role: string }>(`select role from public.profiles where id = $1`, [ownerId]);
    expect(roles.rows[0].role).toBe('guest');

    const accepted = await requestBooking(guestId, propertyId, 'HML-PERM-ACCEPT', 14);
    await transition(ownerId, accepted.id, 'checking', 'Checking the calendar.');
    expect(await status(accepted.id)).toBe('checking');
    await transition(ownerId, accepted.id, 'awaiting_payment', 'Dates confirmed.');
    expect(await status(accepted.id)).toBe('awaiting_payment');

    const timeline = await db.query<{ actor: string }>(
      `select timeline -> -1 ->> 'actor' as actor from public.bookings where id = $1`,
      [accepted.id],
    );
    expect(timeline.rows[0].actor).toBe('Chidi Owner (partner)');

    const declined = await requestBooking(guestId, propertyId, 'HML-PERM-DECLINE', 30);
    await transition(ownerId, declined.id, 'declined', 'Unavailable for those dates.');
    expect(await status(declined.id)).toBe('declined');
  });

  it('keeps admin-only transitions admin-only for network members', async () => {
    const booking = await requestBooking(guestId, propertyId, 'HML-PERM-ADMIN', 14);
    await transition(ownerId, booking.id, 'awaiting_payment');
    await asServiceRole(db, tx =>
      tx.query(`select public.confirm_booking_payment_webhook($1, 'Paystack', 'PSK_PERM_1', $2, 0, 'NGN')`, [
        booking.id,
        booking.guest_total,
      ]),
    );
    expect(await status(booking.id)).toBe('confirmed');
    await expect(transition(ownerId, booking.id, 'completed', 'Stay completed.')).rejects.toThrow(/Invalid booking transition/);
    await expect(transition(ownerId, booking.id, 'cancelled', 'Owner wants to cancel.')).rejects.toThrow(/Invalid booking transition/);
  });

  it('refuses members who do not manage the property, suspended members and plain guests', async () => {
    const booking = await requestBooking(guestId, propertyId, 'HML-PERM-DENY', 14);
    await expect(transition(otherMemberId, booking.id, 'awaiting_payment')).rejects.toThrow(/not authorised to manage this property booking/);

    const plainGuest = await createTestUser(db, { email: 'plain@hamlet.test', fullName: 'Plain Guest', role: 'guest' });
    await expect(transition(plainGuest, booking.id, 'awaiting_payment')).rejects.toThrow(/Guests may only cancel their own open booking requests/);

    await db.query(`update public.partner_network_memberships set status = 'suspended' where user_id = $1`, [ownerId]);
    await expect(transition(ownerId, booking.id, 'awaiting_payment')).rejects.toThrow(/Guests may only cancel their own open booking requests/);
    expect(await status(booking.id)).toBe('requested');
  });

  it('keeps the guest path for a member booking a stay as a guest', async () => {
    const otherProperty = await approvedProperty(otherMemberId, 'Lekki Garden Loft');
    const ownStay = await requestBooking(ownerId, otherProperty, 'HML-PERM-OWNSTAY', 14);

    // As the guest on someone else's listing they cannot accept or decline...
    await expect(transition(ownerId, ownStay.id, 'declined')).rejects.toThrow(/Guests may only cancel their own open booking requests/);
    // ...but can cancel their own open request, labelled as the guest.
    await transition(ownerId, ownStay.id, 'cancelled', 'Plans changed.');
    expect(await status(ownStay.id)).toBe('cancelled');
    const timeline = await db.query<{ actor: string }>(
      `select timeline -> -1 ->> 'actor' as actor from public.bookings where id = $1`,
      [ownStay.id],
    );
    expect(timeline.rows[0].actor).toBe('Chidi Owner (guest)');
  });

  it('lets the managing member update booking issues and submit caution-deposit inspections like a partner', async () => {
    const booking = await requestBooking(guestId, propertyId, 'HML-PERM-ISSUE', 14);
    await transition(ownerId, booking.id, 'awaiting_payment');
    await asServiceRole(db, tx =>
      tx.query(`select public.confirm_booking_payment_webhook($1, 'Paystack', 'PSK_PERM_2', $2, 0, 'NGN')`, [
        booking.id,
        booking.guest_total,
      ]),
    );

    const issueId = await asUser(db, guestId, async tx => {
      const { rows } = await tx.query<{ id: string }>(
        `select public.report_booking_issue($1, 'Damages', 'medium', 'Water heater not working', 'The water heater in the main bathroom stopped working on arrival.', '[]'::jsonb) as id`,
        [booking.id],
      );
      return rows[0].id;
    });

    await asUser(db, ownerId, tx =>
      tx.query(`select public.transition_booking_issue($1::uuid, 'investigating', 'Technician booked for this afternoon.', null, null, null)`, [issueId]),
    );
    const issue = await db.query<{ status: string }>(`select status from public.booking_issues where id = $1`, [issueId]);
    expect(issue.rows[0].status).toBe('investigating');
    // Partner limits still apply.
    await expect(
      asUser(db, ownerId, tx =>
        tx.query(`select public.transition_booking_issue($1::uuid, 'resolved', 'Fixed.', null, null, 'Fixed.')`, [issueId]),
      ),
    ).rejects.toThrow(/Partners may only record investigation updates or escalate issues/);
    await expect(
      asUser(db, otherMemberId, tx =>
        tx.query(`select public.transition_booking_issue($1::uuid, 'investigating', 'Not mine.', null, null, null)`, [issueId]),
      ),
    ).rejects.toThrow(/not authorised to update this issue/);

    await asUser(db, ownerId, tx =>
      tx.query(
        `select public.transition_caution_deposit($1, 'inspection_pending', null, null, 'Checkout inspection booked for 11am.', null, null, null)`,
        [booking.id],
      ),
    );
    const deposit = await db.query<{ status: string }>(`select status from public.booking_caution_deposits where booking_id = $1`, [booking.id]);
    expect(deposit.rows[0].status).toBe('inspection_pending');
    await expect(
      asUser(db, ownerId, tx =>
        tx.query(`select public.transition_caution_deposit($1, 'refund_completed', 0, 100000, null, null, 'REF-1', null)`, [booking.id]),
      ),
    ).rejects.toThrow(/final refund execution requires HAMLET admin/);
    await expect(
      asUser(db, otherMemberId, tx =>
        tx.query(`select public.transition_caution_deposit($1, 'inspection_pending', null, null, 'Not mine.', null, null, null)`, [booking.id]),
      ),
    ).rejects.toThrow(/not authorised to submit inspection reports/);
  });

  it('patches production-shaped functions, is idempotent, and fails loudly on unknown shapes', async () => {
    const q = `select pg_get_functiondef('public.transition_booking(text,text,text)'::regprocedure) as tb,
                      pg_get_functiondef('public.transition_booking_issue(uuid,text,text,uuid,text,text)'::regprocedure) as ti,
                      pg_get_functiondef('public.transition_caution_deposit(text,text,integer,integer,text,text,text,jsonb)'::regprocedure) as tc`;
    const defs = async () => (await db.query<{ tb: string; ti: string; tc: string }>(q)).rows[0];
    const patched = await defs();
    const strip = (sql: string) => sql.replace(/--[^\n]*/g, '');

    // Rebuild the pre-migration production shape: role-only branches, comments stripped.
    await db.exec(
      strip(
        patched.tb
          .replace(
            "if actor_role = 'guest' and (booking_row.guest_id = actor_id or not public.has_role('partner')) then",
            "if actor_role = 'guest' then",
          )
          .replace("elsif actor_role in ('partner', 'admin') or public.has_role('partner') then", "elsif actor_role in ('partner', 'admin') then")
          .replace(
            "|| ' (' || case when actor_role = 'guest' and booking_row.guest_id <> actor_id and public.has_role('partner') then 'partner' else actor_role end || ')';",
            "|| ' (' || actor_role || ')';",
          ),
      ),
    );
    await db.exec(
      strip(
        patched.ti.replace(
          "elsif (actor_role = 'partner' or public.has_role('partner')) and public.can_manage_property(booking_property_id) then",
          "elsif actor_role = 'partner' and public.can_manage_property(booking_property_id) then",
        ),
      ),
    );
    await db.exec(
      strip(
        patched.tc.replace(
          "if actor_role = 'partner' or (actor_role <> 'admin' and public.has_role('partner')) then",
          "if actor_role = 'partner' then",
        ),
      ),
    );
    const legacy = await defs();
    for (const d of [legacy.tb, legacy.ti, legacy.tc]) expect(d).not.toContain("has_role('partner')");

    await db.exec(MIGRATION);
    const repatched = await defs();
    expect(repatched.tb).toContain("or public.has_role('partner') then");
    expect(repatched.ti).toContain("(actor_role = 'partner' or public.has_role('partner'))");
    expect(repatched.tc).toContain("(actor_role <> 'admin' and public.has_role('partner'))");

    await db.exec(MIGRATION);
    expect(await defs()).toEqual(repatched);

    await db.exec(repatched.tc.replace(
      "if actor_role = 'partner' or (actor_role <> 'admin' and public.has_role('partner')) then",
      "if actor_role in ('partner') then",
    ));
    await expect(db.exec(MIGRATION)).rejects.toThrow(/transition_caution_deposit\(\): partner branch not recognised/);
  });
});
