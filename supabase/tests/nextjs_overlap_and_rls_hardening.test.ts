import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  asAnon,
  asServiceRole,
  asUser,
  createMigratedTestDb,
  createTestUser,
  resetTestData,
} from './helpers/testDb.ts';

function futureIsoDate(daysAhead: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

describe('Next.js MVP Hardening — Overlap RPC Parity, Draft Listings & RLS Isolation', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createMigratedTestDb();
  });

  beforeEach(async () => {
    await resetTestData(db);
  });

  afterAll(async () => {
    await db.close();
  });

  it('keeps has_booking_overlap aligned with get_unavailable_property_ids across inquiries, 48h holds, expired holds and calendar blocks', async () => {
    const admin = await createTestUser(db, {
      email: 'admin-overlap@hamlet.test',
      fullName: 'Overlap Admin',
      role: 'admin',
    });
    const partner = await createTestUser(db, {
      email: 'partner-overlap@hamlet.test',
      fullName: 'Overlap Partner',
      role: 'partner',
    });
    const guestA = await createTestUser(db, {
      email: 'guest-a@hamlet.test',
      fullName: 'Guest A',
      role: 'guest',
    });

    // Partner saves a draft with 0 photos, then updates & submits with 1 HTTPS photo
    const draftId = await asUser(db, partner, async tx => {
      const res = await tx.query<{ id: string }>(
        `select public.submit_partner_property($1::jsonb, $2::jsonb) as id`,
        [
          JSON.stringify({
            title: 'Alagomeji Bright Two Bedroom Apartment',
            property_type: 'Apartment',
            area: 'Yaba',
            public_address: 'Off Herbert Macaulay Way, Alagomeji, Yaba, Lagos',
            nightly_rate: 100000,
            cleaning_fee: 20000,
            mandatory_charges: [{ label: 'Cleaning fee', amount: 20000 }],
            refundable_deposit: 50000,
            bedrooms: 2,
            bathrooms: 2,
            capacity: 4,
            bed_setup: '2 queen beds',
            amenities: ['24/7 Estate Power', 'Fibre Wi-Fi'],
            image_urls: [],
            house_rules: ['No smoking indoors'],
            status: 'draft',
          }),
          JSON.stringify({
            authority_basis: 'Direct owner holding registered deed of assignment',
            submitted_role: 'Property owner',
            docs: [{ label: 'Ownership / title evidence', status: 'self_reported' }],
          }),
        ],
      );
      return res.rows[0].id;
    });

    // Draft must NOT be visible to anon public queries
    const anonWhileDraft = await asAnon(db, async tx => {
      const res = await tx.query(`select id from public.properties where id = $1`, [
        draftId,
      ]);
      return res.rows.length;
    });
    expect(anonWhileDraft).toBe(0);

    // Partner finishes draft with HTTPS image and submits for review
    await asUser(db, partner, async tx => {
      await tx.query(
        `select public.update_and_resubmit_partner_property($1, $2::jsonb, $3::jsonb, $4)`,
        [
          draftId,
          JSON.stringify({
            title: 'Alagomeji Bright Two Bedroom Apartment',
            property_type: 'Apartment',
            area: 'Yaba',
            public_address: 'Off Herbert Macaulay Way, Alagomeji, Yaba, Lagos',
            nightly_rate: 100000,
            cleaning_fee: 20000,
            mandatory_charges: [{ label: 'Cleaning fee', amount: 20000 }],
            refundable_deposit: 50000,
            bedrooms: 2,
            bathrooms: 2,
            capacity: 4,
            bed_setup: '2 queen beds',
            amenities: ['24/7 Estate Power', 'Fibre Wi-Fi'],
            image_urls: ['https://images.example.com/yaba-apt-cover.jpg'],
            house_rules: ['No smoking indoors'],
            save_as_draft: false,
          }),
          JSON.stringify({
            authority_basis: 'Direct owner holding registered deed of assignment',
            submitted_role: 'Property owner',
            docs: [{ label: 'Ownership / title evidence', status: 'self_reported' }],
          }),
          'Added cover photo and submitted.',
        ],
      );
    });

    // Admin approves all 4 pillars
    await asUser(db, admin, async tx => {
      await tx.query(
        `select public.review_partner_property($1, 'approved', 'All four verification pillars confirmed on site.', $2::jsonb)`,
        [
          draftId,
          JSON.stringify({
            ownership: 'verified',
            identity: 'verified',
            authority: 'verified',
            inspection: 'verified',
          }),
        ],
      );
    });

    const checkIn = futureIsoDate(15);
    const checkOut = futureIsoDate(18);

    // Guest A creates an unaccepted 'requested' inquiry
    const bookingId = await asUser(db, guestA, async tx => {
      const res = await tx.query<{ id: string }>(
        `insert into public.bookings (
          reference, property_id, guest_id, check_in, check_out, guest_count
        ) values (
          'HML-OVLP0001', $1, $2::uuid, $3::date, $4::date, 2
        ) returning id`,
        [draftId, guestA, checkIn, checkOut],
      );
      return res.rows[0].id;
    });

    // 1. Unaccepted inquiry must NOT lock calendar overlap
    const overlapWhileRequested = await asAnon(db, async tx => {
      const res = await tx.query<{ overlap: boolean }>(
        `select public.has_booking_overlap($1, $2::date, $3::date) as overlap`,
        [draftId, checkIn, checkOut],
      );
      return res.rows[0].overlap;
    });
    expect(overlapWhileRequested).toBe(false);

    // 2. Partner accepts -> status becomes awaiting_payment (active 48h hold) -> MUST block overlap
    await asUser(db, partner, async tx => {
      await tx.query(
        `select public.transition_booking($1, 'awaiting_payment', 'Dates confirmed')`,
        [bookingId],
      );
    });

    const overlapWhileActiveHold = await asAnon(db, async tx => {
      const [boolRes, listRes] = await Promise.all([
        tx.query<{ overlap: boolean }>(
          `select public.has_booking_overlap($1, $2::date, $3::date) as overlap`,
          [draftId, checkIn, checkOut],
        ),
        tx.query<{ id: string }>(
          `select public.get_unavailable_property_ids($1::date, $2::date) as id`,
          [checkIn, checkOut],
        ),
      ]);
      return {
        boolOverlap: boolRes.rows[0].overlap,
        inList: listRes.rows.map(r => r.id).includes(draftId),
      };
    });
    expect(overlapWhileActiveHold).toEqual({ boolOverlap: true, inList: true });

    // 3. Backdate payment_deadline into the past -> expired hold must NOT block overlap
    await asServiceRole(db, async tx => {
      await tx.query(
        `update public.bookings set payment_deadline = now() - interval '2 hours' where id = $1`,
        [bookingId],
      );
    });

    const overlapAfterDeadlinePassed = await asAnon(db, async tx => {
      const res = await tx.query<{ overlap: boolean }>(
        `select public.has_booking_overlap($1, $2::date, $3::date) as overlap`,
        [draftId, checkIn, checkOut],
      );
      return res.rows[0].overlap;
    });
    expect(overlapAfterDeadlinePassed).toBe(false);

    // 4. Partner manual calendar block MUST block has_booking_overlap
    const blockStart = futureIsoDate(30);
    const blockEnd = futureIsoDate(33);
    await asUser(db, partner, async tx => {
      await tx.query(
        `select public.add_property_availability_block($1, $2::date, $3::date, 'owner_block', 'partner', 'Owner visit')`,
        [draftId, blockStart, blockEnd],
      );
    });

    const overlapOnManualBlock = await asAnon(db, async tx => {
      const res = await tx.query<{ overlap: boolean }>(
        `select public.has_booking_overlap($1, $2::date, $3::date) as overlap`,
        [draftId, blockStart, blockEnd],
      );
      return res.rows[0].overlap;
    });
    expect(overlapOnManualBlock).toBe(true);
  });
});
