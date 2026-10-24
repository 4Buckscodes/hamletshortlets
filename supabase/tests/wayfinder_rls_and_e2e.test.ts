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

function isoDateOffset(daysOffset: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysOffset);
  return d.toISOString().slice(0, 10);
}

const VERIFIED_ALL = {
  ownership: 'verified',
  identity: 'verified',
  authority: 'verified',
  inspection: 'verified',
};

describe('HAMLET Wayfinder — Supabase RLS, Secrets Isolation, Snapshot Integrity & 10-Step E2E Flow', () => {
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

  async function seedApprovedPartnerProperty(
    submitterId: string,
    adminId: string,
    title = 'The Meridian Wayfinder Suite',
  ): Promise<string> {
    const propertyId = await asUser(db, submitterId, async tx => {
      const { rows } = await tx.query<{ id: string }>(
        `select public.submit_partner_property($1::jsonb, $2::jsonb) as id`,
        [
          JSON.stringify({
            title,
            property_type: 'Penthouse',
            area: 'Ikoyi',
            public_address: '14 Bourdillon Close, Ikoyi, Lagos',
            nightly_rate: 350000,
            cleaning_fee: 30000,
            mandatory_charges: [{ label: 'Cleaning & turnover (mandatory)', amount: 30000 }],
            refundable_deposit: 200000,
            bedrooms: 3,
            bathrooms: 3,
            capacity: 6,
            bed_setup: '2 King · 1 Queen',
            amenities: ['Wifi', '24/7 Power'],
            image_urls: ['/images/prop/living-1.jpg'],
            house_rules: ['Check-in from 2:00 PM'],
          }),
          JSON.stringify({
            authority_basis: 'Registered deed of assignment and owner mandate',
            submitted_role: 'Owner',
            docs: [{ label: 'Title deed', status: 'self_reported' }],
          }),
        ],
      );
      return rows[0].id;
    });

    await asUser(db, adminId, async tx => {
      await tx.query(
        `select public.review_partner_property($1, 'approved', $2, $3::jsonb)`,
        [
          propertyId,
          'Ownership, identity, authority, and physical inspection verified.',
          JSON.stringify(VERIFIED_ALL),
        ],
      );
    });

    return propertyId;
  }

  it('denies anonymous users and unrelated guests/partners all access to private Wayfinder tables and secrets', async () => {
    const adminId = await createTestUser(db, {
      email: 'admin@hamlet.test',
      fullName: 'Ada Admin',
      role: 'admin',
    });
    const partnerA = await createTestUser(db, {
      email: 'partner.a@hamlet.test',
      fullName: 'Chidi Partner A',
      role: 'partner',
    });
    const partnerB = await createTestUser(db, {
      email: 'partner.b@hamlet.test',
      fullName: 'Bola Partner B',
      role: 'partner',
    });
    const strangerGuest = await createTestUser(db, {
      email: 'stranger@guest.test',
      fullName: 'Stranger Guest',
      role: 'guest',
    });

    const propertyId = await seedApprovedPartnerProperty(partnerA, adminId);

    // Partner A submits Wayfinder data with sensitive codes
    await asUser(db, partnerA, async tx => {
      await tx.query(
        `select public.submit_property_wayfinder($1, $2::jsonb, false)`,
        [
          propertyId,
          JSON.stringify({
            public_landmarks: ['Off Bourdillon Road', '4 mins from Ikoyi Club'],
            public_location_summary: 'Gated close in central Ikoyi.',
            destination_latitude: 6.44782,
            destination_longitude: 3.43841,
            coordinate_point_type: 'estate_gate',
            coordinate_source: 'manual_entry',
            preferred_entrance_label: 'Gate A (Main Gate)',
            entrance_instructions: 'Approach the green gatehouse off Bourdillon Close.',
            building_or_block: 'Tower B',
            floor_label: '5th Floor',
            apartment_identifier: 'Apt 5B',
            route_to_door: 'Second walnut door on right after lift.',
            checkin_method: 'smart_lock',
            checkin_instructions: 'Use 6-digit smart-lock keypad code.',
            arrival_contact_name: 'Desk Lead',
            arrival_contact_phone: '+2348001234567',
            secrets: {
              gate_access_code: 'SECRET-GATE-77',
              lockbox_or_smartlock_code: '998877#',
              wifi_network_name: 'Meridian_5B',
              wifi_password: 'TopSecretWifiPassword',
              release_hours_before_checkin: 24,
            },
          }),
        ],
      );
    });

    // Admin approves Wayfinder guide
    await asUser(db, adminId, async tx => {
      await tx.query(
        `select public.review_property_wayfinder($1, 'approve_guide', $2::jsonb)`,
        [
          propertyId,
          JSON.stringify({
            verification_method: 'map_imagery_crosscheck',
            coordinates_checked: true,
            written_directions_checked: true,
            photos_checked: false,
            physically_visited: false,
            guest_arrival_tested: false,
            reviewer_note: 'Verified Gate A coordinates against Bourdillon Close aerial view.',
          }),
        ],
      );
    });

    // 1. Anonymous user can see public discovery fields on `properties`, NEVER private Wayfinder tables
    const publicProp = await asAnon(db, async tx => {
      const res = await tx.query<{
        wayfinder_status: string;
        location_accuracy: string;
        public_landmarks: string[];
      }>(
        `select wayfinder_status, location_accuracy, public_landmarks
         from public.properties where id = $1`,
        [propertyId],
      );
      return res.rows[0];
    });
    expect(publicProp.wayfinder_status).toBe('guide_ready');
    expect(publicProp.location_accuracy).toBe('verified_entrance');
    expect(publicProp.public_landmarks).toContain('Off Bourdillon Road');

    await expect(
      asAnon(db, async tx => {
        await tx.query(`select * from public.property_wayfinder_guides`);
      }),
    ).rejects.toThrow(/permission denied/i);

    await expect(
      asAnon(db, async tx => {
        await tx.query(`select * from public.property_wayfinder_secrets`);
      }),
    ).rejects.toThrow(/permission denied/i);

    // 2. Unrelated Partner B cannot read or overwrite Partner A's Wayfinder guide or secrets
    const partnerBGuides = await asUser(db, partnerB, async tx => {
      const res = await tx.query(
        `select * from public.property_wayfinder_guides where property_id = $1`,
        [propertyId],
      );
      return res.rows;
    });
    expect(partnerBGuides).toHaveLength(0);

    const partnerBSecrets = await asUser(db, partnerB, async tx => {
      const res = await tx.query(
        `select * from public.property_wayfinder_secrets where property_id = $1`,
        [propertyId],
      );
      return res.rows;
    });
    expect(partnerBSecrets).toHaveLength(0);

    await expect(
      asUser(db, partnerB, async tx => {
        await tx.query(
          `select public.submit_property_wayfinder($1, '{"destination_latitude":6.45,"destination_longitude":3.44}'::jsonb, false)`,
          [propertyId],
        );
      }),
    ).rejects.toThrow(/permission/i);

    // 3. Stranger authenticated guest without a confirmed booking sees 0 rows in guides & secrets
    const strangerGuides = await asUser(db, strangerGuest, async tx => {
      const res = await tx.query(
        `select * from public.property_wayfinder_guides where property_id = $1`,
        [propertyId],
      );
      return res.rows;
    });
    expect(strangerGuides).toHaveLength(0);

    const strangerSecrets = await asUser(db, strangerGuest, async tx => {
      const res = await tx.query(
        `select * from public.property_wayfinder_secrets where property_id = $1`,
        [propertyId],
      );
      return res.rows;
    });
    expect(strangerSecrets).toHaveLength(0);
  });

  it('executes the complete 10-step E2E Wayfinder flow: submission -> verification -> booking gating -> snapshot preservation -> arrival issue -> retirement', async () => {
    const adminId = await createTestUser(db, {
      email: 'ops.lead@hamlet.test',
      fullName: 'Tolu Admin',
      role: 'admin',
    });
    const partnerId = await createTestUser(db, {
      email: 'owner@hamlet.test',
      fullName: 'Kunle Owner',
      role: 'partner',
    });
    const guestA = await createTestUser(db, {
      email: 'guest.a@hamlet.test',
      fullName: 'Zainab Guest',
      role: 'guest',
    });
    const guestB = await createTestUser(db, {
      email: 'guest.b@hamlet.test',
      fullName: 'Emeka Other Guest',
      role: 'guest',
    });

    const propertyId = await seedApprovedPartnerProperty(partnerId, adminId, 'Suenu Terraces Wayfinder E2E');

    // Rejects invalid (0,0) coordinates at database RPC level
    await expect(
      asUser(db, partnerId, async tx => {
        await tx.query(
          `select public.submit_property_wayfinder($1, '{"destination_latitude":0,"destination_longitude":0}'::jsonb, false)`,
          [propertyId],
        );
      }),
    ).rejects.toThrow(/0, 0/);

    // Step 1: Partner submits valid Wayfinder guide, waypoints, steps, and secrets
    const submitRes = await asUser(db, partnerId, async tx => {
      const res = await tx.query<{
        submit_property_wayfinder: { staged_as_pending: boolean; publication_status: string };
      }>(
        `select public.submit_property_wayfinder($1, $2::jsonb, false)`,
        [
          propertyId,
          JSON.stringify({
            public_landmarks: ['Off Suenu Road', '5 mins from Bode Thomas'],
            public_location_summary: 'Quiet gated terrace compound in central Surulere.',
            destination_latitude: 6.50142,
            destination_longitude: 3.35819,
            coordinate_point_type: 'property_entrance',
            coordinate_source: 'gps_on_site',
            preferred_entrance_label: 'Black Sliding Compound Gate',
            entrance_instructions: 'Stop at the black sliding gate #8 with brass numerals.',
            security_desk_instructions: 'Ring intercom #2 and share your HAMLET booking ref.',
            estate_or_building_name: 'Suenu Terraces',
            building_or_block: 'Terrace Unit 2',
            building_instructions: 'Walk past Unit 1 courtyard to Unit 2.',
            floor_label: 'Ground Floor Entry',
            apartment_identifier: 'Unit 2 Front Door',
            route_to_door: 'Private cedar porch door directly ahead.',
            checkin_method: 'lockbox',
            checkin_window_label: '2:00 PM – 9:00 PM',
            checkin_instructions: 'Open wall-mounted lockbox beside porch light.',
            arrival_contact_name: 'Seyi Steward',
            arrival_contact_phone: '+2348099990000',
            waypoints: [
              {
                point_type: 'parking_dropoff',
                label: 'Compound Carport Bay 2',
                latitude: 6.50145,
                longitude: 3.35822,
                instructions: 'Reverse into Bay 2 once gate opens.',
              },
            ],
            steps: [
              {
                step_type: 'security',
                heading: 'Buzz intercom #2',
                instruction: 'Press #2 at the sliding gate.',
                landmark: 'Brass numeral 8',
              },
              {
                step_type: 'apartment_door',
                heading: 'Open lockbox at Unit 2',
                instruction: 'Enter 4-digit lockbox code for keys.',
                landmark: 'Cedar porch door',
              },
            ],
            secrets: {
              gate_access_code: 'GATE-2026',
              lockbox_or_smartlock_code: '4519',
              wifi_network_name: 'Suenu_Unit2',
              wifi_password: 'LagosFastFibre!',
              release_hours_before_checkin: 24,
            },
          }),
        ],
      );
      return res.rows[0].submit_property_wayfinder;
    });
    expect(submitRes.staged_as_pending).toBe(false);
    expect(submitRes.publication_status).toBe('submitted');

    // Step 2: Admin reviews and approves Wayfinder guide
    const reviewRes = await asUser(db, adminId, async tx => {
      const res = await tx.query<{
        review_property_wayfinder: { wayfinder_status: string; published_revision: number };
      }>(
        `select public.review_property_wayfinder($1, 'approve_guide', $2::jsonb)`,
        [
          propertyId,
          JSON.stringify({
            verification_method: 'staff_desk_review',
            coordinates_checked: true,
            written_directions_checked: true,
            photos_checked: false,
            physically_visited: false,
            guest_arrival_tested: false,
            reviewer_note: 'Verified Suenu Road compound gate pin and 2-step terrace walkthrough.',
          }),
        ],
      );
      return res.rows[0].review_property_wayfinder;
    });
    expect(reviewRes.wayfinder_status).toBe('guide_ready');
    expect(reviewRes.published_revision).toBe(1);

    // Step 3: Guest A creates booking (check-in today so active window unlocks codes once confirmed!)
    const checkInToday = isoDateOffset(0);
    const checkOutSoon = isoDateOffset(3);

    const bookingId = await asUser(db, guestA, async tx => {
      const res = await tx.query<{ id: string }>(
        `insert into public.bookings (
           reference, property_id, guest_id, check_in, check_out, guest_count,
           accommodation_subtotal, mandatory_total, hamlet_guest_fee, guest_total,
           refundable_deposit, status
         )
         values ('HML-WF-E2E-01', $1, $2::uuid, $3::date, $4::date, 2, 1050000, 30000, 210000, 1290000, 200000, 'requested')
         returning id`,
        [propertyId, guestA, checkInToday, checkOutSoon],
      );
      return res.rows[0].id;
    });

    // While booking is `requested`, Guest A CANNOT access Wayfinder RPC
    await expect(
      asUser(db, guestA, async tx => {
        await tx.query(`select public.get_guest_booking_wayfinder($1)`, [bookingId]);
      }),
    ).rejects.toThrow(/confirmed/i);

    // Transition to `awaiting_payment` -> STILL blocked before payment confirmation!
    await asServiceRole(db, async tx => {
      await tx.query(
        `update public.bookings set status = 'awaiting_payment' where id = $1`,
        [bookingId],
      );
    });

    await expect(
      asUser(db, guestA, async tx => {
        await tx.query(`select public.get_guest_booking_wayfinder($1)`, [bookingId]);
      }),
    ).rejects.toThrow(/confirmed/i);

    // Step 4: Payment confirmed -> booking becomes `confirmed`
    await asServiceRole(db, async tx => {
      await tx.query(
        `update public.bookings
         set status = 'confirmed', payment_reference = 'PSK-WF-E2E-001', payment_provider = 'Paystack'
         where id = $1`,
        [bookingId],
      );
    });

    // Unrelated Guest B STILL cannot access Guest A's confirmed booking Wayfinder
    await expect(
      asUser(db, guestB, async tx => {
        await tx.query(`select public.get_guest_booking_wayfinder($1)`, [bookingId]);
      }),
    ).rejects.toThrow(/permission/i);

    // Guest A STILL cannot directly SELECT from `property_wayfinder_secrets` (zero table-level guest select!)
    const directSecretsAttempt = await asUser(db, guestA, async tx => {
      const res = await tx.query(
        `select * from public.property_wayfinder_secrets where property_id = $1`,
        [propertyId],
      );
      return res.rows;
    });
    expect(directSecretsAttempt).toHaveLength(0);

    // Step 5: Confirmed Guest A opens Wayfinder via RPC -> receives coordinates, steps, waypoints, and unlocked check-in codes!
    const guestView = await asUser(db, guestA, async tx => {
      const res = await tx.query<{
        get_guest_booking_wayfinder: {
          booking_id: string;
          guide_available: boolean;
          codes_unlocked: boolean;
          guide: {
            destination_latitude: number;
            destination_longitude: number;
            apartment_identifier: string;
            published_revision: number;
            waypoints: Array<{ label: string }>;
            steps: Array<{ heading: string }>;
          };
          secrets: {
            lockbox_or_smartlock_code: string;
            wifi_password: string;
          } | null;
        };
      }>(`select public.get_guest_booking_wayfinder($1)`, [bookingId]);
      return res.rows[0].get_guest_booking_wayfinder;
    });

    expect(guestView.guide_available).toBe(true);
    expect(Number(guestView.guide.destination_latitude)).toBeCloseTo(6.50142, 5);
    expect(Number(guestView.guide.destination_longitude)).toBeCloseTo(3.35819, 5);
    expect(guestView.guide.apartment_identifier).toBe('Unit 2 Front Door');
    expect(guestView.guide.waypoints).toHaveLength(1);
    expect(guestView.guide.steps).toHaveLength(2);
    expect(guestView.codes_unlocked).toBe(true);
    expect(guestView.secrets?.lockbox_or_smartlock_code).toBe('4519');

    // Step 6: Partner submits post-approval edits while Guest A has an active confirmed booking ->
    // Edits are staged without overwriting live revision #1 or breaking Guest A's confirmed snapshot!
    const postEditRes = await asUser(db, partnerId, async tx => {
      const res = await tx.query<{
        submit_property_wayfinder: { staged_as_pending: boolean; publication_status: string };
      }>(
        `select public.submit_property_wayfinder($1, $2::jsonb, false)`,
        [
          propertyId,
          JSON.stringify({
            destination_latitude: 6.50142,
            destination_longitude: 3.35819,
            coordinate_point_type: 'property_entrance',
            preferred_entrance_label: 'UNVERIFIED NEW GATE LABEL',
            apartment_identifier: 'UNVERIFIED APT',
          }),
        ],
      );
      return res.rows[0].submit_property_wayfinder;
    });
    expect(postEditRes.staged_as_pending).toBe(true);
    expect(postEditRes.publication_status).toBe('approved');

    const guestViewAfterPartnerDraft = await asUser(db, guestA, async tx => {
      const res = await tx.query<{
        get_guest_booking_wayfinder: {
          guide: { preferred_entrance_label: string; apartment_identifier: string };
        };
      }>(`select public.get_guest_booking_wayfinder($1)`, [bookingId]);
      return res.rows[0].get_guest_booking_wayfinder;
    });
    expect(guestViewAfterPartnerDraft.guide.preferred_entrance_label).toBe('Black Sliding Compound Gate');
    expect(guestViewAfterPartnerDraft.guide.apartment_identifier).toBe('Unit 2 Front Door');

    // Step 7: Confirmed Guest A logs telemetry & reports an arrival issue from Wayfinder
    await asUser(db, guestA, async tx => {
      await tx.query(
        `select public.record_wayfinder_event($1, 'directions_clicked', '{"target":"primary_pin","wifi_password":"SHOULD_BE_STRIPPED"}'::jsonb)`,
        [bookingId],
      );
    });

    // Verify analytics sanitization stripped accidental secret keys!
    const storedEventMeta = await asUser(db, adminId, async tx => {
      const res = await tx.query<{ metadata: Record<string, unknown> }>(
        `select metadata from public.wayfinder_events where booking_id = $1 and event_type = 'directions_clicked'`,
        [bookingId],
      );
      return res.rows[0].metadata;
    });
    expect(storedEventMeta.target).toBe('primary_pin');
    expect(storedEventMeta.wifi_password).toBeUndefined();

    const createdIssueId = await asUser(db, guestA, async tx => {
      const res = await tx.query<{ report_arrival_issue: string }>(
        `select public.report_arrival_issue($1, 'cannot_find_entrance', 'high', 'Intercom #2 label is faded at night.', 'step_2_entrance', '["Standing at #8 Suenu gate"]'::jsonb)`,
        [bookingId],
      );
      return res.rows[0].report_arrival_issue;
    });
    expect(createdIssueId).toBeTruthy();

    const issueRow = await asUser(db, adminId, async tx => {
      const res = await tx.query<{ arrival_issue_type: string; wayfinder_step_key: string }>(
        `select arrival_issue_type, wayfinder_step_key from public.booking_issues where id = $1::uuid`,
        [createdIssueId],
      );
      return res.rows[0];
    });
    expect(issueRow.arrival_issue_type).toBe('cannot_find_entrance');
    expect(issueRow.wayfinder_step_key).toBe('step_2_entrance');

    // Step 8: Admin flags the property's arrival guide for partner correction
    await asUser(db, adminId, async tx => {
      await tx.query(
        `select public.flag_wayfinder_for_correction($1, 'Add night-time intercom photo after guest report.')`,
        [propertyId],
      );
    });

    const flaggedProp = await asAnon(db, async tx => {
      const res = await tx.query<{ wayfinder_status: string }>(
        `select wayfinder_status from public.properties where id = $1`,
        [propertyId],
      );
      return res.rows[0];
    });
    expect(flaggedProp.wayfinder_status).toBe('needs_correction');

    // Step 9: Stay completes -> sensitive lockbox & gate codes are automatically retired!
    await asServiceRole(db, async tx => {
      await tx.query(`update public.bookings set status = 'completed' where id = $1`, [bookingId]);
    });

    const completedView = await asUser(db, guestA, async tx => {
      const res = await tx.query<{
        get_guest_booking_wayfinder: {
          booking_status: string;
          codes_unlocked: boolean;
          secrets: unknown;
        };
      }>(`select public.get_guest_booking_wayfinder($1)`, [bookingId]);
      return res.rows[0].get_guest_booking_wayfinder;
    });
    expect(completedView.booking_status).toBe('completed');
    expect(completedView.codes_unlocked).toBe(false);
    expect(completedView.secrets).toBeNull();

    // Step 10: Guest records post-stay ease-of-arrival feedback
    await asUser(db, guestA, async tx => {
      await tx.query(
        `select public.record_wayfinder_event($1, 'ease_of_arrival_feedback', '{"ease":"easy"}'::jsonb)`,
        [bookingId],
      );
    });

    const feedbackCount = await asUser(db, adminId, async tx => {
      const res = await tx.query<{ cnt: string }>(
        `select count(*)::text as cnt from public.wayfinder_events where booking_id = $1 and event_type = 'ease_of_arrival_feedback'`,
        [bookingId],
      );
      return Number(res.rows[0].cnt);
    });
    expect(feedbackCount).toBe(1);
  });
});
