import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import {
  asServiceRole,
  asUser,
  createMigratedTestDb,
  createTestUser,
  resetTestData,
} from './helpers/testDb';
import {
  renderBookingNotificationEmail,
  type BookingNotificationEventType,
  type BookingNotificationRecipientType,
} from '../functions/booking-notifications/templates';

describe('Endpoint Bugfixes, Draft Lifecycle, Attribution Summary & FX Email Parity', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createMigratedTestDb();
  }, 60_000);

  afterAll(async () => {
    await db?.close();
  });

  beforeEach(async () => {
    await resetTestData(db);
  });

  it('supports full partner property draft save, draft edit, photo guard on submit, and submission with calendar fields', async () => {
    const partnerId = await createTestUser(db, {
      email: 'owner.draft@hamlet.test',
      fullName: 'Chinedu Okafor',
      role: 'partner',
    });

    // 1. Save early-step draft with 0 photos
    const draftPropId = await asUser(db, partnerId, async tx => {
      const { rows } = await tx.query<{ id: string }>(
        `select public.submit_partner_property(
           jsonb_build_object(
             'status', 'draft',
             'title', 'The Lekki Phase 1 Penthouse Suite',
             'property_type', 'Penthouse',
             'area', 'Lekki Phase 1',
             'public_address', '14 Admiralty Way, Lekki Phase 1, Lagos',
             'nightly_rate', 150000,
             'cleaning_fee', 20000,
             'mandatory_charges', '[{"label":"Cleaning & turnover","amount":20000}]'::jsonb,
             'refundable_deposit', 100000,
             'bedrooms', 3,
             'bathrooms', 3,
             'capacity', 6,
             'bed_setup', '3 King beds',
             'amenities', '["Wifi","24/7 Power"]'::jsonb,
             'image_urls', '[]'::jsonb,
             'house_rules', '["No parties"]'::jsonb
           ),
           jsonb_build_object(
             'authority_basis', 'Draft authority declaration pending completion',
             'submitted_role', 'Property Owner',
             'docs', '[{"label":"Title deed","status":"pending_review"}]'::jsonb
           )
         ) as id`,
      );
      return rows[0].id;
    });

    const initialDraft = await asUser(db, partnerId, async tx => {
      const { rows } = await tx.query<{ status: string; trust_label: string }>(
        `select status, trust_label from public.properties where id = $1`,
        [draftPropId],
      );
      return rows[0];
    });
    expect(initialDraft.status).toBe('draft');
    expect(initialDraft.trust_label).toBe('Draft');

    // 2. Quick submit from draft with 0 photos must reject cleanly
    await expect(
      asUser(db, partnerId, tx =>
        tx.query(`select public.resubmit_partner_property($1)`, [draftPropId]),
      ),
    ).rejects.toThrow(/Attach at least 1 property photo/);

    // 3. Edit draft while keeping save_as_draft = true
    await asUser(db, partnerId, tx =>
      tx.query(
        `select public.update_and_resubmit_partner_property(
           $1,
           jsonb_build_object(
             'save_as_draft', true,
             'title', 'The Lekki Phase 1 Sky Penthouse',
             'property_type', 'Penthouse',
             'area', 'Lekki Phase 1',
             'public_address', '14 Admiralty Way, Lekki Phase 1, Lagos',
             'nightly_rate', 165000,
             'cleaning_fee', 20000,
             'refundable_deposit', 100000,
             'bedrooms', 3,
             'bathrooms', 3,
             'capacity', 6,
             'bed_setup', '3 King beds',
             'image_urls', '[]'::jsonb,
             'availability_confirmation_status', 'confirmed_calendar',
             'calendar_responsible_person', 'Chinedu Desk'
           ),
           jsonb_build_object(
             'authority_basis', 'Deed of Assignment registered in Lagos State',
             'submitted_role', 'Property Owner'
           ),
           null
         )`,
        [draftPropId],
      ),
    );

    const stillDraft = await asUser(db, partnerId, async tx => {
      const { rows } = await tx.query<{
        status: string;
        nightly_rate: number;
        availability_confirmation_status: string;
        calendar_responsible_person: string;
      }>(
        `select status, nightly_rate, availability_confirmation_status, calendar_responsible_person
         from public.properties where id = $1`,
        [draftPropId],
      );
      return rows[0];
    });
    expect(stillDraft.status).toBe('draft');
    expect(stillDraft.nightly_rate).toBe(165000);
    expect(stillDraft.availability_confirmation_status).toBe('confirmed');
    expect(stillDraft.calendar_responsible_person).toBe('Chinedu Desk');

    // 4. Attach photo and submit draft for review
    await asUser(db, partnerId, tx =>
      tx.query(
        `select public.update_and_resubmit_partner_property(
           $1,
           jsonb_build_object(
             'save_as_draft', false,
             'title', 'The Lekki Phase 1 Sky Penthouse',
             'property_type', 'Penthouse',
             'area', 'Lekki Phase 1',
             'public_address', '14 Admiralty Way, Lekki Phase 1, Lagos',
             'nightly_rate', 165000,
             'cleaning_fee', 20000,
             'refundable_deposit', 100000,
             'bedrooms', 3,
             'bathrooms', 3,
             'capacity', 6,
             'bed_setup', '3 King beds',
             'image_urls', jsonb_build_array('https://images.example.com/lekki-sky-1.jpg'),
             'availability_confirmation_status', 'manual_confirmation',
             'calendar_responsible_person', 'Chinedu Desk'
           ),
           jsonb_build_object(
             'authority_basis', 'Deed of Assignment registered in Lagos State',
             'submitted_role', 'Property Owner'
           ),
           'Completed photos and calendar setup'
         )`,
        [draftPropId],
      ),
    );

    const submitted = await asUser(db, partnerId, async tx => {
      const { rows } = await tx.query<{
        status: string;
        trust_label: string;
        availability_confirmation_status: string;
      }>(
        `select status, trust_label, availability_confirmation_status
         from public.properties where id = $1`,
        [draftPropId],
      );
      return rows[0];
    });
    expect(submitted.status).toBe('submitted');
    expect(submitted.trust_label).toBe('Under review');
    expect(submitted.availability_confirmation_status).toBe('needs_confirmation');
  });

  it('allows Closing Agent and Referral Partner applications with properties_count = 0 to resubmit and link referral codes', async () => {
    const adminId = await createTestUser(db, {
      email: 'ops.admin@hamlet.test',
      fullName: 'Adaeze Admin',
      role: 'admin',
    });
    const referrerId = await createTestUser(db, {
      email: 'referrer@hamlet.test',
      fullName: 'Adewale Referrer',
      role: 'partner',
    });
    const applicantId = await createTestUser(db, {
      email: 'closing.agent@hamlet.test',
      fullName: 'Zainab Closing',
      role: 'guest',
    });

    const refCode = await asUser(db, referrerId, async tx => {
      const { rows } = await tx.query<{ code: string }>(`select public.ensure_my_referral_code() as code`);
      return rows[0].code;
    });
    expect(refCode).toMatch(/^HML-/);

    const appId = await asUser(db, applicantId, async tx => {
      const { rows } = await tx.query<{ id: string }>(
        `insert into public.partner_applications (
           applicant_id, full_name, email, phone, company, role, areas, properties_count, motivation
         ) values (
           $1::uuid, 'Zainab Closing', 'closing.agent@hamlet.test', '+2348012345678',
           'Zainab Concierge Lagos', 'Closing Agent', array['Victoria Island', 'Ikoyi'], 0,
           'Corporate relocation & diplomatic shortlet bookings across Lagos Island.'
         ) returning id::text as id`,
        [applicantId],
      );
      return rows[0].id;
    });

    await asUser(db, adminId, tx =>
      tx.query(
        `select public.review_partner_application($1::uuid, 'needs_correction', 'Please add mainland coverage if applicable and confirm company registration.')`,
        [appId],
      ),
    );

    // Resubmit with properties_count = 0 AND referred_by_code
    await asUser(db, applicantId, tx =>
      tx.query(
        `select public.resubmit_partner_application(
           $1::uuid,
           jsonb_build_object(
             'full_name', 'Zainab Closing',
             'phone', '+2348012345678',
             'company', 'Zainab Concierge Lagos Ltd',
             'role', 'Closing Agent',
             'areas', jsonb_build_array('Victoria Island', 'Ikoyi', 'Yaba'),
             'properties_count', 0,
             'motivation', 'Corporate relocation & diplomatic shortlet bookings across Lagos Island and Yaba.',
             'referred_by_code', $2::text
           )
         )`,
        [appId, refCode],
      ),
    );

    const referralRows = await asUser(db, adminId, async tx => {
      const { rows } = await tx.query<{
        referrer_partner_id: string;
        referred_partner_id: string;
        referral_code: string;
        status: string;
      }>(
        `select referrer_partner_id::text, referred_partner_id::text, referral_code, status
         from public.partner_referrals
         where referred_partner_id = $1::uuid`,
        [applicantId],
      );
      return rows;
    });
    expect(referralRows).toHaveLength(1);
    expect(referralRows[0].referrer_partner_id).toBe(referrerId);
    expect(referralRows[0].referral_code).toBe(refCode);
    expect(referralRows[0].status).toBe('registered');
  });

  it('enriches USD booking notification outbox payloads with FX quote + NGN settlement + caution deposit and renders clear emails + Closing Agent summary', async () => {
    const adminId = await createTestUser(db, {
      email: 'admin.fx@hamlet.test',
      fullName: 'Tunde Admin',
      role: 'admin',
    });
    const ownerId = await createTestUser(db, {
      email: 'owner.vi@hamlet.test',
      fullName: 'Kunle Owner',
      role: 'partner',
    });
    const agentId = await createTestUser(db, {
      email: 'agent.vi@hamlet.test',
      fullName: 'Bisi Agent',
      role: 'partner',
    });
    const guestId = await createTestUser(db, {
      email: 'intl.guest@hamlet.test',
      fullName: 'Michael Guest',
      role: 'guest',
    });

    const agentCode = await asUser(db, agentId, async tx => {
      const { rows } = await tx.query<{ code: string }>(`select public.ensure_my_referral_code() as code`);
      return rows[0].code;
    });

    const propId = await asUser(db, ownerId, async tx => {
      const { rows } = await tx.query<{ id: string }>(
        `select public.submit_partner_property(
           jsonb_build_object(
             'title', 'Victoria Island Diplomatic 2-Bed',
             'property_type', 'Apartment',
             'area', 'Victoria Island',
             'public_address', '8 Kofo Abayomi Street, Victoria Island, Lagos',
             'nightly_rate', 160000,
             'cleaning_fee', 40000,
             'mandatory_charges', '[{"label":"Cleaning & turnover","amount":40000}]'::jsonb,
             'refundable_deposit', 80000,
             'bedrooms', 2,
             'bathrooms', 2,
             'capacity', 4,
             'bed_setup', '2 Queen beds',
             'amenities', '["Wifi","24/7 Power"]'::jsonb,
             'image_urls', jsonb_build_array('https://images.example.com/vi-1.jpg'),
             'house_rules', '["No smoking"]'::jsonb
           ),
           jsonb_build_object(
             'authority_basis', 'Registered title deed verified',
             'submitted_role', 'Property Owner',
             'docs', '[{"label":"Title deed","status":"self_reported"}]'::jsonb
           )
         ) as id`,
      );
      return rows[0].id;
    });

    await asUser(db, adminId, tx =>
      tx.query(
        `select public.review_partner_property($1, 'approved', 'Approved for marketplace', '{"ownership":"verified","identity":"verified","authority":"verified","inspection":"verified"}'::jsonb)`,
        [propId],
      ),
    );

    // Guest creates a 2-night USD booking (B = 320,000; 20% markup = 64,000; cleaning = 40,000 -> domestic stay = 424,000 NGN)
    // At 1600 NGN/USD: converted base = $265.00 + 10% buffer ($26.50) = $291.50
    // Paystack NGN settlement = 291.50 * 1600 = 466,400 NGN (caution deposit 80,000 NGN tracked separately!)
    const bookingId = await asUser(db, guestId, async tx => {
      const { rows } = await tx.query<{ id: string }>(
        `insert into public.bookings (
           reference, property_id, guest_id, check_in, check_out, guest_count,
           special_requests, quote_currency, guest_referral_source
         ) values (
           'HML-FX-PARITY-01', $1, $2::uuid, '2026-11-10'::date, '2026-11-12'::date, 2,
           'Arriving on evening flight', 'USD', $3
         ) returning id`,
        [propId, guestId, agentCode],
      );
      return rows[0].id;
    });

    // Accept availability so awaiting_payment notification is enqueued too
    await asUser(db, ownerId, tx =>
      tx.query(`select public.transition_booking($1, 'awaiting_payment', 'Dates confirmed')`, [bookingId]),
    );

    const outboxRows = await asUser(db, adminId, async tx => {
      const { rows } = await tx.query<{
        id: string;
        booking_id: string;
        booking_reference: string;
        property_id: string;
        event_type: BookingNotificationEventType;
        recipient_type: BookingNotificationRecipientType;
        recipient_email: string;
        payload: Record<string, unknown>;
      }>(
        `select id, booking_id, booking_reference, property_id, event_type, recipient_type, recipient_email, payload
         from public.booking_notifications
         where booking_id = $1 and recipient_type = 'guest'
         order by created_at asc`,
        [bookingId],
      );
      return rows;
    });

    expect(outboxRows.length).toBeGreaterThanOrEqual(2);
    const availEmailRow = outboxRows.find(r => r.event_type === 'booking_availability_confirmed')!;
    expect(availEmailRow.payload.quote_currency).toBe('USD');
    expect(Number(availEmailRow.payload.quoted_guest_total)).toBe(291.5);
    expect(Number(availEmailRow.payload.settlement_total_ngn)).toBe(466400);
    expect(Number(availEmailRow.payload.refundable_deposit)).toBe(80000);

    const rendered = renderBookingNotificationEmail({
      bookingId: availEmailRow.booking_id,
      bookingReference: availEmailRow.booking_reference,
      eventType: availEmailRow.event_type,
      recipientType: availEmailRow.recipient_type,
      payload: availEmailRow.payload,
      appBaseUrl: 'https://www.hamlet.rest',
    });
    expect(rendered.html).toContain('$291.50');
    expect(rendered.html).toContain('₦466,400');
    expect(rendered.html).toContain('₦80,000');
    expect(rendered.text).toContain('$291.50');
    expect(rendered.text).toContain('₦466,400');

    // Confirm payment via service_role webhook and verify Closing Agent attribution summary RPC!
    await asServiceRole(db, tx =>
      tx.query(
        `select public.confirm_booking_payment_webhook($1, 'Paystack', 'PSK_FX_TEST_001', 466400, 2000, 'NGN')`,
        [bookingId],
      ),
    );

    // Closing Agent (who does NOT manage propId) calls get_my_partner_attribution_summary()
    const agentSummary = await asUser(db, agentId, async tx => {
      const { rows } = await tx.query<{ summary: {
        closed_bookings: Array<{
          booking_id: string;
          booking_reference: string;
          property_title: string;
          owner_listed_price_ngn: number;
          closing_agent_commission_ngn: number;
          status: string;
          guest_email?: string;
        }>;
      } }>(`select public.get_my_partner_attribution_summary() as summary`);
      return rows[0].summary;
    });

    expect(agentSummary.closed_bookings).toHaveLength(1);
    expect(agentSummary.closed_bookings[0].booking_id).toBe(bookingId);
    expect(agentSummary.closed_bookings[0].property_title).toBe('Victoria Island Diplomatic 2-Bed');
    expect(agentSummary.closed_bookings[0].owner_listed_price_ngn).toBe(320000);
    expect(agentSummary.closed_bookings[0].closing_agent_commission_ngn).toBe(32000); // 10% of B!
    expect(agentSummary.closed_bookings[0].status).toBe('confirmed');
    expect(agentSummary.closed_bookings[0].guest_email).toBeUndefined(); // Zero guest PII leak!
  });
});
