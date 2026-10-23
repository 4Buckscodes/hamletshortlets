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

describe('MVP Live Readiness — Admin Bootstrap, Profile Updates, Application Resubmission, Directory & Multi-Role Issues', () => {
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

  it('automatically provisions pre-authorized admin emails at sign-up and promotes existing users via authorize_admin_email', async () => {
    await asServiceRole(db, async tx => {
      await tx.query(
        `insert into public.admin_bootstrap_emails (email, note)
         values ('founder@hamlet.test', 'Founding Lagos operations lead')`,
      );
    });

    const founderId = await createTestUser(db, {
      email: 'Founder@Hamlet.test',
      fullName: 'Adaeze Founder',
    });

    const founderProfile = await asUser(db, founderId, async tx => {
      const res = await tx.query<{ role: string; company: string | null }>(
        `select role, company from public.profiles where id = $1::uuid`,
        [founderId],
      );
      return res.rows[0];
    });
    expect(founderProfile.role).toBe('admin');
    expect(founderProfile.company).toBe('HAMLET');

    // Non-admins cannot read admin_bootstrap_emails or call authorize_admin_email
    const guestId = await createTestUser(db, {
      email: 'ops.candidate@hamlet.test',
      fullName: 'Tunde Ops',
    });

    const leakedEmails = await asUser(db, guestId, async tx => {
      const res = await tx.query(`select email from public.admin_bootstrap_emails`);
      return res.rows;
    });
    expect(leakedEmails).toHaveLength(0);

    await expect(
      asUser(db, guestId, async tx => {
        await tx.query(
          `select public.authorize_admin_email('hacker@hamlet.test', 'Trying unauthorized promotion')`,
        );
      }),
    ).rejects.toThrow(/Only active administrators/);

    // Founding admin promotes an existing user via authorize_admin_email
    const promoResult = await asUser(db, founderId, async tx => {
      const res = await tx.query<{ authorize_admin_email: { email: string; promoted_existing: boolean } }>(
        `select public.authorize_admin_email($1, $2)`,
        ['ops.candidate@hamlet.test', 'Appointed second pilot operations reviewer'],
      );
      return res.rows[0].authorize_admin_email;
    });
    expect(promoResult.promoted_existing).toBe(true);

    const promotedRole = await asUser(db, guestId, async tx => {
      const res = await tx.query<{ role: string }>(
        `select role from public.profiles where id = $1::uuid`,
        [guestId],
      );
      return res.rows[0].role;
    });
    expect(promotedRole).toBe('admin');
  });

  it('allows active users to update their own profile name/phone/company without altering role or status', async () => {
    const guestId = await createTestUser(db, {
      email: 'client.profile@hamlet.test',
      fullName: 'Kemi Guest',
      role: 'guest',
    });

    await asUser(db, guestId, async tx => {
      await tx.query(`select public.update_own_profile($1, $2, $3)`, [
        'Kemi Adeyemi',
        '+234 803 555 0199',
        'Adeyemi Studio',
      ]);
    });

    const updated = await asUser(db, guestId, async tx => {
      const res = await tx.query<{
        full_name: string;
        phone: string | null;
        company: string | null;
        role: string;
        account_status: string;
      }>(`select full_name, phone, company, role, account_status from public.profiles where id = $1::uuid`, [guestId]);
      return res.rows[0];
    });
    expect(updated).toEqual({
      full_name: 'Kemi Adeyemi',
      phone: '+234 803 555 0199',
      company: 'Adeyemi Studio',
      role: 'guest',
      account_status: 'active',
    });
  });

  it('supports partner application correction resubmission end-to-end', async () => {
    const applicantId = await createTestUser(db, {
      email: 'owner.apply@hamlet.test',
      fullName: 'Segun Owner',
      role: 'guest',
    });
    const adminId = await createTestUser(db, {
      email: 'admin.review@hamlet.test',
      fullName: 'Funke Admin',
      role: 'admin',
    });

    const appId = await asUser(db, applicantId, async tx => {
      const res = await tx.query<{ id: string }>(
        `insert into public.partner_applications
           (applicant_id, full_name, email, phone, company, role, areas, properties_count, motivation)
         values ($1::uuid, 'Segun Owner', 'owner.apply@hamlet.test', '+2348011112222', 'Segun Homes', 'Property Owner', array['Ikoyi'], 2, 'Two serviced apartments in Old Ikoyi with full backup power.')
         returning id`,
        [applicantId],
      );
      return res.rows[0].id;
    });

    await asUser(db, adminId, async tx => {
      await tx.query(
        `select public.review_partner_application($1::uuid, 'needs_correction', 'Please provide CAC registration name and full phone contact.')`,
        [appId],
      );
    });

    await asUser(db, applicantId, async tx => {
      await tx.query(`select public.resubmit_partner_application($1::uuid, $2::jsonb)`, [
        appId,
        JSON.stringify({
          full_name: 'Segun Adebayo',
          phone: '+234 802 999 8888',
          company: 'Segun Homes Ltd (RC 1902341)',
          role: 'Property Owner',
          areas: ['Ikoyi', 'Victoria Island'],
          properties_count: 3,
          motivation: 'Three deeded serviced apartments in Ikoyi and VI with 24/7 power and dedicated facility staff.',
        }),
      ]);
    });

    const resubmitted = await asUser(db, adminId, async tx => {
      const res = await tx.query<{ status: string; company: string; properties_count: number }>(
        `select status, company, properties_count from public.partner_applications where id = $1::uuid`,
        [appId],
      );
      return res.rows[0];
    });
    expect(resubmitted.status).toBe('pending');
    expect(resubmitted.company).toBe('Segun Homes Ltd (RC 1902341)');
    expect(resubmitted.properties_count).toBe(3);
  });

  it('restricts get_admin_directory to admins and enforces set_guest_account_status governance', async () => {
    const guestId = await createTestUser(db, {
      email: 'guest.dir@hamlet.test',
      fullName: 'Bola Client',
      role: 'guest',
    });
    const partnerId = await createTestUser(db, {
      email: 'partner.dir@hamlet.test',
      fullName: 'Ngozi Partner',
      role: 'partner',
    });
    const adminId = await createTestUser(db, {
      email: 'admin.dir@hamlet.test',
      fullName: 'Yemi Admin',
      role: 'admin',
    });

    await expect(
      asAnon(db, async tx => {
        await tx.query(`select * from public.get_admin_directory()`);
      }),
    ).rejects.toThrow();

    await expect(
      asUser(db, partnerId, async tx => {
        await tx.query(`select * from public.get_admin_directory()`);
      }),
    ).rejects.toThrow(/Only administrators/);

    const directory = await asUser(db, adminId, async tx => {
      const res = await tx.query<{ id: string; email: string; role: string }>(
        `select id, email, role from public.get_admin_directory()`,
      );
      return res.rows;
    });
    expect(directory).toHaveLength(3);
    expect(directory.find(u => u.id === guestId)?.email).toBe('guest.dir@hamlet.test');

    // Admin suspends guest account -> guest cannot update profile or create bookings
    await asUser(db, adminId, async tx => {
      await tx.query(
        `select public.set_guest_account_status($1::uuid, 'suspended', 'Repeated fraudulent payment dispute under investigation.')`,
        [guestId],
      );
    });

    await expect(
      asUser(db, guestId, async tx => {
        await tx.query(`select public.update_own_profile('Blocked Name', '+2348000000000', null)`);
      }),
    ).rejects.toThrow(/suspended/);

    await asUser(db, adminId, async tx => {
      await tx.query(
        `select public.set_guest_account_status($1::uuid, 'active', 'Investigation cleared; guest account reinstated.')`,
        [guestId],
      );
    });
  });

  it('enables guest, partner, and admin issue reporting plus evidence logging with strict authorization', async () => {
    const guestId = await createTestUser(db, {
      email: 'guest.issue@hamlet.test',
      fullName: 'Zainab Guest',
      role: 'guest',
    });
    const partnerId = await createTestUser(db, {
      email: 'partner.issue@hamlet.test',
      fullName: 'Dapo Host',
      role: 'partner',
    });
    const outsiderPartnerId = await createTestUser(db, {
      email: 'outsider.partner@hamlet.test',
      fullName: 'Outsider Host',
      role: 'partner',
    });
    const adminId = await createTestUser(db, {
      email: 'admin.issue@hamlet.test',
      fullName: 'Ifeoma Admin',
      role: 'admin',
    });

    const propertyId = await asUser(db, partnerId, async tx => {
      const res = await tx.query<{ submit_partner_property: string }>(
        `select public.submit_partner_property($1::jsonb, $2::jsonb)`,
        [
          JSON.stringify({
            title: 'Lekki Phase 1 Courtyard Loft',
            property_type: 'Loft',
            area: 'Lekki Phase 1',
            public_address: '8 Admiralty Road, Lekki Phase 1, Lagos',
            nightly_rate: 120000,
            cleaning_fee: 15000,
            mandatory_charges: [{ label: 'Cleaning fee', amount: 15000 }],
            refundable_deposit: 60000,
            bedrooms: 2,
            bathrooms: 2,
            capacity: 4,
            bed_setup: '2 Queen beds',
            amenities: ['24/7 Power', 'Fibre Wi-Fi'],
            image_urls: ['/images/prop/loft.jpg'],
            house_rules: ['No smoking indoors'],
          }),
          JSON.stringify({
            authority_basis: 'Registered owner',
            submitted_role: 'Property Owner',
            docs: [{ label: 'Title deed', status: 'self_reported' }],
          }),
        ],
      );
      return res.rows[0].submit_partner_property;
    });

    await asUser(db, adminId, async tx => {
      await tx.query(
        `select public.review_partner_property($1, 'approved', 'All four verification gates verified.', $2::jsonb)`,
        [
          propertyId,
          JSON.stringify({
            ownership: 'verified',
            identity: 'verified',
            authority: 'verified',
            inspection: 'verified',
          }),
        ],
      );
    });

    const bookingId = await asUser(db, guestId, async tx => {
      const res = await tx.query<{ id: string }>(
        `insert into public.bookings (reference, property_id, guest_id, check_in, check_out, guest_count)
         values ('HML-ISSUE-0001', $1, $2::uuid, $3::date, $4::date, 2)
         returning id`,
        [propertyId, guestId, futureIsoDate(5), futureIsoDate(8)],
      );
      return res.rows[0].id;
    });

    // Outsider partner cannot report an issue on this booking
    await expect(
      asUser(db, outsiderPartnerId, async tx => {
        await tx.query(
          `select public.report_booking_issue($1, 'Damages', 'medium', 'Unauthorized attempt', 'Should be blocked by property access check.', '[]'::jsonb)`,
          [bookingId],
        );
      }),
    ).rejects.toThrow(/properties they manage/);

    // Authorized partner reports a guest conduct/damage issue
    const partnerIssueId = await asUser(db, partnerId, async tx => {
      const res = await tx.query<{ report_booking_issue: string }>(
        `select public.report_booking_issue($1, 'Damages', 'high', 'Living room glass table chipped', 'Inspection at checkout found a chipped glass edge with timestamped photos.', $2::jsonb)`,
        [bookingId, JSON.stringify(['Checkout photo #1 uploaded to ops file'])],
      );
      return res.rows[0].report_booking_issue;
    });

    // Admin appends evidence and verifies reporter_type = 'partner'
    await asUser(db, adminId, async tx => {
      await tx.query(`select public.append_issue_evidence($1::uuid, $2)`, [
        partnerIssueId,
        'Verified turnover checklist signed 11:15 WAT.',
      ]);
    });

    const issueRow = await asUser(db, adminId, async tx => {
      const res = await tx.query<{ reporter_type: string; evidence: string[] }>(
        `select reporter_type, evidence from public.booking_issues where id = $1::uuid`,
        [partnerIssueId],
      );
      return res.rows[0];
    });
    expect(issueRow.reporter_type).toBe('partner');
    expect(issueRow.evidence).toEqual([
      'Checkout photo #1 uploaded to ops file',
      'Verified turnover checklist signed 11:15 WAT.',
    ]);
  });
});
