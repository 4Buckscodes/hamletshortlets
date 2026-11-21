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
});
