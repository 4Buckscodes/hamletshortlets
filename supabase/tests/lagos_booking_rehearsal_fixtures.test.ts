import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  asUser,
  createMigratedTestDb,
  createTestUser,
  resetTestData,
} from './helpers/testDb';

/**
 * Synthetic rehearsal inventory only. These are corridor-level test locations,
 * not real accommodation addresses. This suite runs against a fresh in-memory
 * PGlite database created from the repository migrations; it never writes to
 * the production Supabase project.
 */
const LAGOS_REHEARSAL_FIXTURES = [
  {
    slug: 'LEKKI',
    area: 'Lekki Phase 1',
    publicAddress: 'SYNTHETIC TEST LOCATION — Admiralty Way corridor, Lekki Phase 1, Lagos',
    nightlyRate: 120_000,
  },
  {
    slug: 'IKOYI',
    area: 'Ikoyi',
    publicAddress: 'SYNTHETIC TEST LOCATION — Bourdillon Road corridor, Ikoyi, Lagos',
    nightlyRate: 180_000,
  },
  {
    slug: 'YABA',
    area: 'Yaba',
    publicAddress: 'SYNTHETIC TEST LOCATION — Herbert Macaulay Way corridor, Yaba, Lagos',
    nightlyRate: 75_000,
  },
] as const;

describe('isolated Lagos booking rehearsal fixtures', () => {
  let db: PGlite;
  let todayIso: string;

  const adminId = 'aaaaaaaa-0000-4000-8000-000000000001';
  const ownerId = 'bbbbbbbb-0000-4000-8000-000000000002';
  const guestId = 'ffffffff-0000-4000-8000-000000000006';

  beforeAll(async () => {
    db = await createMigratedTestDb();
    const { rows } = await db.query<{ today: string }>('select current_date::text as today');
    todayIso = rows[0].today;
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    await resetTestData(db);
    await createTestUser(db, {
      id: adminId,
      email: 'rehearsal.admin@hamlet.test',
      fullName: 'HAMLET Rehearsal Admin',
      role: 'admin',
    });
    await createTestUser(db, {
      id: ownerId,
      email: 'rehearsal.owner@hamlet.test',
      fullName: 'HAMLET Rehearsal Owner',
      role: 'partner',
    });
    await createTestUser(db, {
      id: guestId,
      email: 'rehearsal.guest@hamlet.test',
      fullName: 'HAMLET Rehearsal Guest',
      role: 'guest',
    });
  });

  async function submitAndApproveFixture(fixture: (typeof LAGOS_REHEARSAL_FIXTURES)[number]) {
    const { rows } = await asUser(db, ownerId, tx =>
      tx.query<{ id: string }>(
        `select public.submit_partner_property($1::jsonb, $2::jsonb) as id`,
        [
          JSON.stringify({
            title: `HAMLET TEST STAY — ${fixture.slug}`,
            property_type: 'Apartment',
            area: fixture.area,
            public_address: fixture.publicAddress,
            nightly_rate: fixture.nightlyRate,
            cleaning_fee: 0,
            mandatory_charges: [],
            refundable_deposit: 0,
            bedrooms: 2,
            bathrooms: 2,
            capacity: 4,
            bed_setup: '2 queen beds',
            amenities: ['Wifi', '24/7 Power', 'Security'],
            image_urls: ['https://images.example/hamlet-rehearsal-placeholder.jpg'],
            house_rules: ['TEST FIXTURE — not a real accommodation'],
          }),
          JSON.stringify({
            authority_basis: 'Synthetic fixture for isolated automated test only',
            submitted_role: 'Owner',
            docs: [{ label: 'TEST ONLY — not an ownership document', status: 'self_reported' }],
          }),
        ],
      ),
    );
    const propertyId = rows[0].id;

    await asUser(db, adminId, tx =>
      tx.query(
        `select public.review_partner_property(
          $1, 'approved',
          'Automated rehearsal fixture; synthetic and isolated from production.',
          $2::jsonb
        )`,
        [
          propertyId,
          JSON.stringify({
            ownership: 'verified',
            identity: 'verified',
            authority: 'verified',
            inspection: 'verified',
          }),
        ],
      ),
    );

    return propertyId;
  }

  it.each(LAGOS_REHEARSAL_FIXTURES)(
    'creates an isolated $slug property and a booking request with server-calculated 20% markup',
    async fixture => {
      const propertyId = await submitAndApproveFixture(fixture);
      const checkIn = new Date(`${todayIso}T00:00:00Z`);
      checkIn.setUTCDate(checkIn.getUTCDate() + 10);
      const checkOut = new Date(checkIn);
      checkOut.setUTCDate(checkOut.getUTCDate() + 2);
      const checkInIso = checkIn.toISOString().slice(0, 10);
      const checkOutIso = checkOut.toISOString().slice(0, 10);

      const { rows: propertyRows } = await db.query<{
        title: string;
        area: string;
        public_address: string;
        status: string;
      }>(
        `select title, area, public_address, status
         from public.properties where id = $1`,
        [propertyId],
      );
      expect(propertyRows).toHaveLength(1);
      expect(propertyRows[0].title).toBe(`HAMLET TEST STAY — ${fixture.slug}`);
      expect(propertyRows[0].area).toBe(fixture.area);
      expect(propertyRows[0].public_address).toContain('SYNTHETIC TEST LOCATION');
      expect(propertyRows[0].public_address).toBe(fixture.publicAddress);
      expect(propertyRows[0].status).toBe('approved');

      const { rows: bookingRows } = await asUser(db, guestId, tx =>
        tx.query<{
          id: string;
          owner_listed_price_ngn: number;
          domestic_markup_ngn: number;
          domestic_guest_price_ngn: number;
        }>(
          `insert into public.bookings (
             reference, property_id, guest_id, check_in, check_out, guest_count
           ) values ($1, $2, $3::uuid, $4::date, $5::date, 2)
           returning id, owner_listed_price_ngn, domestic_markup_ngn, domestic_guest_price_ngn`,
          [
            `HML-REHEARSAL-${fixture.slug}-01`,
            propertyId,
            guestId,
            checkInIso,
            checkOutIso,
          ],
        ),
      );

      const booking = bookingRows[0];
      const base = fixture.nightlyRate * 2;
      expect(booking.owner_listed_price_ngn).toBe(base);
      expect(booking.domestic_markup_ngn).toBe(base * 0.2);
      expect(booking.domestic_guest_price_ngn).toBe(base * 1.2);

      // Explicitly no provider initialization or payment webhook in this fixture test:
      // booking rehearsal cannot create a real Paystack charge.
      const { rows: paymentRows } = await db.query<{ count: number }>(
        `select count(*)::int as count
         from public.booking_payment_records where booking_id = $1`,
        [booking.id],
      );
      expect(paymentRows[0].count).toBe(0);
    },
  );

  it('keeps every rehearsal address explicitly synthetic and scoped to this in-memory test database', () => {
    expect(LAGOS_REHEARSAL_FIXTURES).toHaveLength(3);
    expect(LAGOS_REHEARSAL_FIXTURES.map(item => item.slug)).toEqual(['LEKKI', 'IKOYI', 'YABA']);
    for (const fixture of LAGOS_REHEARSAL_FIXTURES) {
      expect(fixture.publicAddress).toContain('SYNTHETIC TEST LOCATION');
    }
  });
});
