import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asUser, createMigratedTestDb, createTestUser, resetTestData } from './helpers/testDb';

const adminId = 'aaaaaaaa-0000-4000-8000-000000000001';
const ownerId = 'bbbbbbbb-0000-4000-8000-000000000002';
const guestId = 'ffffffff-0000-4000-8000-000000000006';

describe('Euro (EUR) quotes', () => {
  let db: PGlite;
  let today: string;
  let propertyId: string;

  beforeAll(async () => {
    db = await createMigratedTestDb();
    today = (await db.query<{ d: string }>(`select current_date::text as d`)).rows[0].d;
  });
  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    await resetTestData(db);
    await createTestUser(db, { id: adminId, email: 'a@hamlet.test', fullName: 'Admin', role: 'admin' });
    await createTestUser(db, { id: ownerId, email: 'o@hamlet.test', fullName: 'Owner', role: 'partner' });
    await createTestUser(db, { id: guestId, email: 'g@hamlet.test', fullName: 'Guest', role: 'guest' });
    propertyId = await asUser(db, ownerId, async tx => {
      const { rows } = await tx.query<{ id: string }>(
        `select public.submit_partner_property($1::jsonb, $2::jsonb) as id`,
        [
          JSON.stringify({
            title: 'Euro Test Residence',
            property_type: 'Apartment',
            area: 'Surulere',
            public_address: '7 Euro Street, Surulere, Lagos',
            nightly_rate: 100_000,
            cleaning_fee: 0,
            mandatory_charges: [],
            refundable_deposit: 0,
            bedrooms: 2,
            bathrooms: 2,
            capacity: 4,
            bed_setup: '2 queen beds',
            amenities: ['Wifi'],
            image_urls: ['https://images.example/t.jpg'],
            house_rules: ['No parties'],
          }),
          JSON.stringify({
            authority_basis: 'Registered owner — title deed verified',
            submitted_role: 'Owner',
            docs: [{ label: 'Title deed', status: 'self_reported' }],
          }),
        ],
      );
      return rows[0].id;
    });
    await asUser(db, adminId, tx =>
      tx.query(`select public.review_partner_property($1, 'approved', 'Verified ownership, ID, authority, and inspection.', $2::jsonb)`, [
        propertyId,
        JSON.stringify({ ownership: 'verified', identity: 'verified', authority: 'verified', inspection: 'verified' }),
      ]),
    );
  });

  const book = (ref: string) =>
    asUser(db, guestId, async tx => {
      const { rows } = await tx.query<{ quote_currency: string; quoted_guest_total: string; settlement_total_ngn: number }>(
        `insert into public.bookings (reference, property_id, guest_id, check_in, check_out, guest_count, quote_currency)
         values ($1, $2, $3::uuid, ($4::date + 4), ($4::date + 6), 2, 'EUR')
         returning quote_currency, quoted_guest_total::text, settlement_total_ngn`,
        [ref, propertyId, guestId, today],
      );
      return rows[0];
    });

  it('refuses euro quotes while the EUR rate is inactive', async () => {
    await db.query(
      `insert into public.currency_exchange_rates (currency, currency_pair, ngn_per_unit, source, is_active)
       values ('EUR', 'NGN/EUR', 1, 'pending_admin_rate', false)
       on conflict (currency) do update set is_active = false`,
    );
    await expect(book('HML-EUR-0')).rejects.toThrow(/Exchange rate for EUR is currently unavailable/);
  });

  it('quotes in euros with the 10% buffer once an admin sets a rate', async () => {
    await asUser(db, adminId, tx =>
      tx.query(`select public.upsert_exchange_rate_config('EUR', 1500, 'admin_test_rate', true, null)`),
    );
    // 2 nights x 100,000 + 20% = 240,000 NGN -> 160 EUR -> 176 EUR with buffer; settles 264,000 NGN
    const b = await book('HML-EUR-1');
    expect(b.quote_currency).toBe('EUR');
    expect(Number(b.quoted_guest_total)).toBe(176);
    expect(b.settlement_total_ngn).toBe(264_000);
  });
});
