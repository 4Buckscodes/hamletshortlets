import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  asAnon,
  asUser,
  createMigratedTestDb,
  createTestUser,
  resetTestData,
} from './helpers/testDb.ts';

describe('Readable property slugs', () => {
  let db: PGlite;
  let adminId: string;

  beforeAll(async () => {
    db = await createMigratedTestDb();
  });
  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    await resetTestData(db);
    adminId = await createTestUser(db, { email: 'slug-admin@hamlet.test', fullName: 'Slug Admin', role: 'admin' });
  });

  async function insertProperty(id: string, title: string, area: string, status = 'submitted', address = '14 Adeola Odeku Street, Victoria Island') {
    await asUser(db, adminId, async tx => {
      await tx.query(
        `insert into public.properties (
           id, title, property_type, area, public_address, nightly_rate, cleaning_fee, mandatory_charges,
           refundable_deposit, bedrooms, bathrooms, capacity, bed_setup, amenities, image_urls, house_rules,
           status, verification, calendar_responsible_person, review_note
         ) values (
           $1, $2, 'Apartment', $3, $4, 195000, 25000, '[]'::jsonb,
           100000, 2, 2, 6, '2 queen beds', '{"Fibre Wi-Fi"}', '{"https://images.example.test/a.jpeg"}',
           '{"No smoking indoors"}', 'submitted',
           '{"ownership":"verified","identity":"verified","authority":"verified","inspection":"verified"}'::jsonb,
           'Private contact', 'Private note'
         )`,
        [id, title, area, address],
      );
    });
    if (status !== 'submitted') {
      await db.query(`update public.properties set status = $2 where id = $1`, [id, status]);
    }
  }

  const slugOf = async (id: string) =>
    (await db.query<{ slug: string }>('select slug from public.properties where id = $1', [id])).rows[0]!.slug;

  it('gives every new listing a readable slug ending in a short unique id', async () => {
    await insertProperty('11111111-2222-3333-4444-555555555555', 'Spacious Shortlet Apartment @Akoka', 'Yaba');
    expect(await slugOf('11111111-2222-3333-4444-555555555555')).toBe('spacious-shortlet-apartment-akoka-yaba-11111111');
  });

  it('keeps two listings with the same title and area distinct', async () => {
    await insertProperty('aaaaaaaa-0000-0000-0000-000000000001', 'Cosy Studio', 'Ikoyi');
    await insertProperty('bbbbbbbb-0000-0000-0000-000000000002', 'Cosy Studio', 'Ikoyi', 'submitted', '22 Awolowo Road, Ikoyi');
    const a = await slugOf('aaaaaaaa-0000-0000-0000-000000000001');
    const b = await slugOf('bbbbbbbb-0000-0000-0000-000000000002');
    expect(a).not.toBe(b);
    expect(a).toBe('cosy-studio-ikoyi-aaaaaaaa');
  });

  it('does not change the address when the title or area is edited later', async () => {
    const id = 'cccccccc-0000-0000-0000-000000000003';
    await insertProperty(id, 'Original Title', 'Lekki Phase 1');
    const before = await slugOf(id);
    await db.query(`update public.properties set title = 'A Completely New Title', area = 'Ajah' where id = $1`, [id]);
    expect(await slugOf(id)).toBe(before);
  });

  it('caps the readable part at 60 characters and never leaves a stray hyphen', async () => {
    const id = 'dddddddd-0000-0000-0000-000000000004';
    await insertProperty(id, 'Luxury 2Bedroom Apartment for Short and Long Stay with Pool and Gym and a Very Long Name', 'Victoria Island');
    const slug = await slugOf(id);
    const readable = slug.replace(/-dddddddd$/, '');
    expect(readable.length).toBeLessThanOrEqual(60);
    expect(readable).not.toMatch(/-$/);
    expect(slug.endsWith('-dddddddd')).toBe(true);
  });

  it('falls back to a safe slug for titles with no latin letters', async () => {
    const id = 'eeeeeeee-0000-0000-0000-000000000005';
    await insertProperty(id, '!!!', '');
    expect(await slugOf(id)).toBe('stay-eeeeeeee');
  });

  it('refuses an empty or duplicate slug at the database level', async () => {
    await insertProperty('ffffffff-0000-0000-0000-000000000006', 'One', 'Yaba');
    await insertProperty('99999999-0000-0000-0000-000000000007', 'Two', 'Yaba');
    await expect(
      db.query(`update public.properties set slug = (select slug from public.properties where id = 'ffffffff-0000-0000-0000-000000000006') where id = '99999999-0000-0000-0000-000000000007'`),
    ).rejects.toThrow(/duplicate key|unique/i);
    await db.query(`update public.properties set slug = '' where id = '99999999-0000-0000-0000-000000000007'`);
    expect(await slugOf('99999999-0000-0000-0000-000000000007')).toBe('two-yaba-99999999');
  });

  it('exposes the slug through the public view without exposing private columns', async () => {
    await insertProperty('12121212-0000-0000-0000-000000000008', 'Public One', 'Ikoyi', 'approved');
    await insertProperty('34343434-0000-0000-0000-000000000009', 'Hidden Draft', 'Ikoyi', 'submitted');
    const rows = await asAnon(db, async tx =>
      (await tx.query<Record<string, unknown>>('select * from public.public_properties order by id')).rows,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.slug).toBe('public-one-ikoyi-12121212');
    for (const column of ['nightly_rate', 'calendar_responsible_person', 'review_note']) {
      expect(rows[0]).not.toHaveProperty(column);
    }
    // Existing columns keep their order, so the view can be replaced in place.
    const cols = Object.keys(rows[0]!);
    expect(cols.indexOf('updated_at')).toBeLessThan(cols.indexOf('slug'));
    expect(cols[cols.length - 1]).toBe('slug');
  });

  it('keeps the slug readable by anonymous visitors only through the view', async () => {
    await expect(asAnon(db, async tx => tx.query('select slug from public.properties'))).rejects.toThrow(/permission denied/i);
  });
});
