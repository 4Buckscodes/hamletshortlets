import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  asAnon,
  asUser,
  createMigratedTestDb,
  createTestUser,
  resetTestData,
} from './helpers/testDb.ts';

describe('Public properties view — anonymous commercial confidentiality', () => {
  let db: PGlite;
  let adminId: string;
  let approvedPropertyId: string;
  let submittedPropertyId: string;

  beforeAll(async () => {
    db = await createMigratedTestDb();
  });

  beforeEach(async () => {
    await resetTestData(db);
    adminId = await createTestUser(db, {
      email: 'view-admin@hamlet.test',
      fullName: 'View Admin',
      role: 'admin',
    });

    async function insertSubmittedProperty(id: string, title: string, nightlyRate: number) {
      await asUser(db, adminId, async tx => {
        await tx.query(
          `insert into public.properties (
             id, title, property_type, area, public_address, nightly_rate,
             cleaning_fee, mandatory_charges, refundable_deposit, bedrooms, bathrooms,
             capacity, bed_setup, amenities, image_urls, house_rules, status, verification,
             calendar_responsible_person, review_note
           ) values (
             $1, $2, 'Apartment', 'Victoria Island', '14 Adeola Odeku Street, Victoria Island',
             $3, 25000,
             '[{"label":"Cleaning & turnover","amount":25000,"internal_note":"private settlement note"}]'::jsonb,
             100000, 2, 2, 6, '2 queen beds', '{"Fibre Wi-Fi","Air Conditioning"}',
             '{"https://images.example.test/vi.jpeg"}', '{"No smoking indoors"}', 'submitted',
             '{"ownership":"verified","identity":"verified","authority":"verified","inspection":"verified"}'::jsonb,
             'Private calendar contact', 'Private internal review note'
           )`,
          [id, title, nightlyRate],
        );
      });
      await db.query(
        `update public.properties set updated_at = '2026-11-05T15:41:34.547Z' where id = $1`,
        [id],
      );
    }

    approvedPropertyId = 'public-view-approved';
    submittedPropertyId = 'public-view-submitted';
    await insertSubmittedProperty(approvedPropertyId, 'Approved Victoria Island Apartment', 195000);
    await insertSubmittedProperty(submittedPropertyId, 'Private Submitted Apartment', 450000);
    await db.query(
      `update public.properties set status = 'approved' where id = $1`,
      [approvedPropertyId],
    );
  });

  afterAll(async () => {
    await db.close();
  });

  it('blocks anonymous direct access to public.properties, including a rate-only projection', async () => {
    await expect(
      asAnon(db, async tx => tx.query('select id,nightly_rate from public.properties')),
    ).rejects.toThrow(/permission denied for table properties/i);

    await expect(
      asAnon(db, async tx => tx.query('select * from public.properties')),
    ).rejects.toThrow(/permission denied for table properties/i);
  });

  it('exposes only approved allowlisted fields and an exact central guest-facing price via public_properties', async () => {
    const publicRows = await asAnon(db, async tx => {
      const result = await tx.query<Record<string, unknown>>(
        'select * from public.public_properties order by id',
      );
      return result.rows;
    });

    expect(publicRows).toHaveLength(1);
    const publicStay = publicRows[0]!;
    expect(publicStay.id).toBe(approvedPropertyId);
    expect(publicStay.guest_nightly_ngn).toBe(234000);
    expect(publicStay.status).toBe('approved');

    for (const forbiddenField of [
      'nightly_rate',
      'calendar_responsible_person',
      'calendar_responsible_user_id',
      'review_note',
      'owner_id',
      'partner_id',
      'partner_email',
      'owner_phone',
      'closing_agent_commission',
      'referral_reward',
      'commission_rate',
    ]) {
      expect(publicStay).not.toHaveProperty(forbiddenField);
    }

    expect(JSON.stringify(publicStay)).not.toContain('195000');
    expect(JSON.stringify(publicStay)).not.toContain('Private calendar contact');
    expect(JSON.stringify(publicStay)).not.toContain('Private internal review note');
    expect(JSON.stringify(publicStay)).not.toContain('private settlement note');
  });

  it('hides raw property rows from guests, preserves partner/admin access, and still allows public-view booking requests', async () => {
    const guestId = await createTestUser(db, {
      email: 'confidentiality-guest@hamlet.test',
      fullName: 'Confidentiality Guest',
      role: 'guest',
    });
    const partnerId = await createTestUser(db, {
      email: 'confidentiality-partner@hamlet.test',
      fullName: 'Confidentiality Partner',
      role: 'partner',
    });

    await db.query(
      `insert into public.property_access (property_id, user_id, access_role, scope, status)
       values ($1, $2::uuid, 'property_manager', 'assigned listing', 'active')`,
      [approvedPropertyId, partnerId],
    );

    const guestRows = await asUser(db, guestId, async tx => {
      const privateQuery = await tx.query<Record<string, unknown>>(
        `select id, nightly_rate, calendar_responsible_person, review_note
         from public.properties where id = $1`,
        [approvedPropertyId],
      );
      const publicQuery = await tx.query<Record<string, unknown>>(
        `select id, guest_nightly_ngn, status
         from public.public_properties where id = $1`,
        [approvedPropertyId],
      );
      return { privateRows: privateQuery.rows, publicRows: publicQuery.rows };
    });

    expect(guestRows.privateRows).toEqual([]);
    expect(guestRows.publicRows).toEqual([
      { id: approvedPropertyId, guest_nightly_ngn: 234000, status: 'approved' },
    ]);

    const partnerRows = await asUser(db, partnerId, async tx => {
      const assigned = await tx.query<Record<string, unknown>>(
        `select id, nightly_rate, calendar_responsible_person, review_note
         from public.properties where id = $1`,
        [approvedPropertyId],
      );
      const unassigned = await tx.query(
        `select id from public.properties where id = $1`,
        [submittedPropertyId],
      );
      return { assigned: assigned.rows, unassigned: unassigned.rows };
    });
    expect(partnerRows.assigned).toEqual([
      {
        id: approvedPropertyId,
        nightly_rate: 195000,
        calendar_responsible_person: 'Private calendar contact',
        review_note: 'Private internal review note',
      },
    ]);
    expect(partnerRows.unassigned).toEqual([]);

    const sharePartnerId = await createTestUser(db, {
      email: 'confidentiality-share-partner@hamlet.test',
      fullName: 'Confidentiality Share Partner',
      role: 'partner',
    });
    const sharePartnerRows = await asUser(db, sharePartnerId, async tx => {
      const privateQuery = await tx.query(
        `select id, nightly_rate from public.properties where id = $1`,
        [approvedPropertyId],
      );
      const publicQuery = await tx.query(
        `select id, guest_nightly_ngn from public.public_properties where id = $1`,
        [approvedPropertyId],
      );
      const catalogueQuery = await tx.query<{ items: Array<Record<string, unknown>> }>(
        `select public.list_partner_shareable_properties() as items`,
      );
      const linkQuery = await tx.query<{ link: { share_token: string; status: string } }>(
        `select public.get_or_create_partner_share_link($1) as link`,
        [approvedPropertyId],
      );
      return {
        privateRows: privateQuery.rows,
        publicRows: publicQuery.rows,
        shareables: catalogueQuery.rows[0]?.items ?? [],
        link: linkQuery.rows[0]?.link,
      };
    });
    expect(sharePartnerRows.privateRows).toEqual([]);
    expect(sharePartnerRows.publicRows).toEqual([
      { id: approvedPropertyId, guest_nightly_ngn: 234000 },
    ]);
    expect(sharePartnerRows.shareables).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: approvedPropertyId, guest_nightly_ngn: 234000 }),
      ]),
    );
    expect(sharePartnerRows.link).toMatchObject({ status: 'active' });
    expect(sharePartnerRows.link?.share_token).toBeTruthy();

    const adminRows = await asUser(db, adminId, async tx => {
      const result = await tx.query<{ id: string; nightly_rate: number }>(
        `select id, nightly_rate from public.properties where id = $1`,
        [approvedPropertyId],
      );
      return result.rows;
    });
    expect(adminRows).toEqual([{ id: approvedPropertyId, nightly_rate: 195000 }]);

    const checkIn = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
    const checkOut = new Date(Date.now() + 12 * 86_400_000).toISOString().slice(0, 10);
    const booking = await asUser(db, guestId, async tx => {
      const result = await tx.query<{ status: string; owner_listed_price_ngn: number; guest_total: number }>(
        `insert into public.bookings (
           reference, property_id, guest_id, check_in, check_out, guest_count, quote_currency
         ) values ('HML-SECURE001', $1, $2::uuid, $3::date, $4::date, 2, 'NGN')
         returning status, owner_listed_price_ngn, guest_total`,
        [approvedPropertyId, guestId, checkIn, checkOut],
      );
      return result.rows[0];
    });
    expect(booking).toEqual({
      status: 'requested',
      owner_listed_price_ngn: 390000,
      guest_total: 493000,
    });
  });
});
