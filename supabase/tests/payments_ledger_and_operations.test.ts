import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import {
  computePaystackHmacSha512,
  handlePaystackWebhook,
  type ConfirmWebhookParams,
  type ConfirmWebhookResult,
} from '../functions/paystack-webhook/handler';
import {
  asAnon,
  asServiceRole,
  asUser,
  createMigratedTestDb,
  createTestUser,
  resetTestData,
} from './helpers/testDb';

interface LedgerRow {
  id: string;
  booking_id: string;
  record_type: string;
  amount: number;
  provider_reference: string | null;
  status: string;
  description: string;
  variance: number;
  note: string | null;
  operator_name: string;
}

const VERIFIED_ALL = {
  ownership: 'verified',
  identity: 'verified',
  authority: 'verified',
  inspection: 'verified',
};

const TEST_WEBHOOK_SECRET = 'sk_test_hamlet_pilot_secret_2026';

describe('HAMLET Release 1 — duplicates, verified payments/ledger, refunds, issues & assignments', () => {
  let db: PGlite;
  let adminId: string;
  let ownerPartnerId: string;
  let cohostPartnerId: string;
  let guestId: string;
  let approvedPropertyId: string;
  let baseDateIso: string;

  const addDays = (isoDate: string, days: number): string => {
    const d = new Date(`${isoDate}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };

  async function submitPropertyAs(
    partnerUserId: string,
    overrides: Partial<{ title: string; area: string; publicAddress: string }> = {},
  ): Promise<string> {
    return asUser(db, partnerUserId, async tx => {
      const { rows } = await tx.query<{ id: string }>(
        `select public.submit_partner_property($1::jsonb, $2::jsonb) as id`,
        [
          JSON.stringify({
            title: overrides.title ?? 'The Meridian 2-Bed Sky Flat',
            property_type: 'Serviced apartment',
            area: overrides.area ?? 'Victoria Island',
            public_address: overrides.publicAddress ?? '21 Kofo Abayomi Street, Victoria Island',
            nightly_rate: 100_000,
            cleaning_fee: 20_000,
            mandatory_charges: [{ label: 'Cleaning & turnover (mandatory)', amount: 20_000 }],
            refundable_deposit: 80_000,
            bedrooms: 2,
            bathrooms: 2,
            capacity: 4,
            bed_setup: '2 King beds',
            amenities: ['24/7 Power', 'Wifi'],
            image_urls: ['/images/prop/living-1.jpg'],
            house_rules: ['No smoking'],
          }),
          JSON.stringify({
            authority_basis: 'Registered title deed and owner listing mandate',
            submitted_role: 'Property Owner',
            docs: [{ label: 'Title deed', status: 'self_reported' }],
          }),
        ],
      );
      return rows[0].id;
    });
  }

  async function createAcceptedBooking(
    reference = 'HML-PAY-0001',
    nights = 2,
  ): Promise<{ id: string; reference: string; guestTotal: number; deposit: number; subtotal: number }> {
    const checkIn = addDays(baseDateIso, 8);
    const checkOut = addDays(baseDateIso, 8 + nights);

    const created = await asUser(db, guestId, async tx => {
      const { rows } = await tx.query<{
        id: string;
        reference: string;
        guest_total: number;
        refundable_deposit: number;
        accommodation_subtotal: number;
      }>(
        `insert into public.bookings (
           reference, property_id, guest_id, check_in, check_out, guest_count,
           accommodation_subtotal, hamlet_guest_fee, guest_total
         ) values ($1, $2, $3::uuid, $4::date, $5::date, 2, 0, 0, 0)
         returning id, reference, guest_total, refundable_deposit, accommodation_subtotal`,
        [reference, approvedPropertyId, guestId, checkIn, checkOut],
      );
      return rows[0];
    });

    await asUser(db, ownerPartnerId, tx =>
      tx.query(`select public.transition_booking($1, 'awaiting_payment', 'Ready for guest')`, [
        created.id,
      ]),
    );

    return {
      id: created.id,
      reference: created.reference,
      guestTotal: created.guest_total,
      deposit: created.refundable_deposit,
      subtotal: created.accommodation_subtotal,
    };
  }

  async function sendWebhookRequest(bodyObj: Record<string, unknown>, secret = TEST_WEBHOOK_SECRET, overrideSignature?: string): Promise<Response> {
    const rawBody = JSON.stringify(bodyObj);
    const signature = overrideSignature ?? (await computePaystackHmacSha512(rawBody, secret));

    const req = new Request('https://hamlet.test/functions/v1/paystack-webhook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-paystack-signature': signature,
      },
      body: rawBody,
    });

    return handlePaystackWebhook(req, {
      paystackSecretKey: TEST_WEBHOOK_SECRET,
      confirmPaymentRpc: async (params: ConfirmWebhookParams) => {
        try {
          const data = await asServiceRole(db, async tx => {
            const { rows } = await tx.query<{ result: ConfirmWebhookResult }>(
              `select public.confirm_booking_payment_webhook($1, $2, $3, $4, $5, $6) as result`,
              [
                params.target_booking_id,
                params.provider_name,
                params.provider_ref,
                params.paid_amount_naira,
                params.provider_fee_naira,
                params.currency_code,
              ],
            );
            return rows[0].result;
          });
          return { data, error: null };
        } catch (err) {
          return {
            data: null,
            error: { message: err instanceof Error ? err.message : String(err) },
          };
        }
      },
    });
  }

  beforeAll(async () => {
    db = await createMigratedTestDb();
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    await resetTestData(db);
    const { rows } = await db.query<{ today: string }>('select current_date::text as today');
    baseDateIso = rows[0].today;

    adminId = await createTestUser(db, {
      email: 'ops-admin@hamlet.test',
      fullName: 'Funmi Admin',
      role: 'admin',
    });
    ownerPartnerId = await createTestUser(db, {
      email: 'owner@hamlet.test',
      fullName: 'Kunle Owner',
      role: 'partner',
    });
    cohostPartnerId = await createTestUser(db, {
      email: 'cohost@hamlet.test',
      fullName: 'Bisi Cohost',
      role: 'partner',
    });
    guestId = await createTestUser(db, {
      email: 'guest@hamlet.test',
      fullName: 'Amaka Guest',
      role: 'guest',
    });

    approvedPropertyId = await submitPropertyAs(ownerPartnerId);
    await asUser(db, adminId, tx =>
      tx.query(`select public.review_partner_property($1, 'approved', $2, $3::jsonb)`, [
        approvedPropertyId,
        'Ownership, identity, mandate, and physical inspection verified.',
        JSON.stringify(VERIFIED_ALL),
      ]),
    );
  });

  describe('Duplicate property listing protection', () => {
    it('blocks duplicate active submissions with the same normalized area, address, and title while permitting distinct units or re-submission after rejection', async () => {
      // Case- and whitespace-insensitive duplicate of approvedPropertyId is rejected
      await expect(
        submitPropertyAs(cohostPartnerId, {
          title: '  the meridian   2-bed sky flat ',
          area: 'victoria island',
          publicAddress: '21  Kofo Abayomi Street, Victoria Island ',
        }),
      ).rejects.toThrow(/already exists in this area/i);

      // Distinct apartment/unit in the same building is allowed
      const distinctUnitId = await submitPropertyAs(ownerPartnerId, {
        title: 'The Meridian Penthouse Unit 8B',
      });
      expect(distinctUnitId).toBeTruthy();

      // Once a submitted unit is rejected, a clean re-application with complete evidence can use that title
      await asUser(db, adminId, tx =>
        tx.query(`select public.review_partner_property($1, 'rejected', $2, $3::jsonb)`, [
          distinctUnitId,
          'Submitted authority letter expired; rejected pending fresh mandate.',
          JSON.stringify({
            ownership: 'verified',
            identity: 'verified',
            authority: 'missing',
            inspection: 'missing',
          }),
        ]),
      );

      const reappliedId = await submitPropertyAs(ownerPartnerId, {
        title: 'The Meridian Penthouse Unit 8B',
      });
      expect(reappliedId).not.toBe(distinctUnitId);
    });
  });

  describe('Verified Paystack webhook confirmation & controlled ledger', () => {
    it('forbids anon and authenticated users (including admins) from calling confirm_booking_payment_webhook or writing directly to booking_payment_records', async () => {
      const booking = await createAcceptedBooking();

      for (const callerId of [guestId, ownerPartnerId, adminId]) {
        await expect(
          asUser(db, callerId, tx =>
            tx.query(
              `select public.confirm_booking_payment_webhook($1, 'Paystack', 'PSK_FAKE', $2, 0, 'NGN')`,
              [booking.id, booking.guestTotal],
            ),
          ),
        ).rejects.toThrow(/permission denied for function confirm_booking_payment_webhook/i);

        await expect(
          asUser(db, callerId, tx =>
            tx.query(
              `insert into public.booking_payment_records (booking_id, record_type, amount, status)
               values ($1, 'guest_charge', $2, 'reconciled')`,
              [booking.id, booking.guestTotal],
            ),
          ),
        ).rejects.toThrow(/permission denied for table booking_payment_records/i);
      }

      await expect(
        asAnon(db, tx =>
          tx.query(
            `select public.confirm_booking_payment_webhook($1, 'Paystack', 'PSK_FAKE', $2, 0, 'NGN')`,
            [booking.id, booking.guestTotal],
          ),
        ),
      ).rejects.toThrow(/permission denied for function confirm_booking_payment_webhook/i);
    });

    it('rejects tampered webhook signatures, confirms valid signed webhooks idempotently, and reconciles the 20% markup without deducting from owner proceeds', async () => {
      // Grant an explicit 10% co-host commission on the property before payment
      await asUser(db, adminId, tx =>
        tx.query(
          `select public.grant_property_assignment($1, $2::uuid, $3, $4, $5)`,
          [
            approvedPropertyId,
            cohostPartnerId,
            'Guest check-in and concierge operations',
            0.1,
            'Mandate #CM-2026-088 signed 12 Oct 2026',
          ],
        ),
      );

      // 2 nights × 100,000 = 200,000 subtotal (B)
      // mandatory cleaning = 20,000
      // 20% domestic markup on B = 40,000
      // guestTotal = 260,000; refundable deposit = 80,000
      const booking = await createAcceptedBooking('HML-PAY-1001', 2);
      expect(booking.subtotal).toBe(200_000);
      expect(booking.guestTotal).toBe(260_000);
      expect(booking.deposit).toBe(80_000);

      const webhookBody = {
        event: 'charge.success',
        data: {
          status: 'success',
          reference: 'PSK_TX_20261023_001',
          amount: 260_000 * 100, // kobo
          fees: 2_000 * 100, // ₦2,000 Paystack fee in kobo
          currency: 'NGN',
          metadata: {
            booking_id: booking.id,
            booking_reference: booking.reference,
          },
        },
      };

      // 1. Forged signature is rejected with 401 and leaves booking unconfirmed
      const badSigRes = await sendWebhookRequest(webhookBody, TEST_WEBHOOK_SECRET, 'deadbeef');
      expect(badSigRes.status).toBe(401);

      const beforeValid = await db.query<{ status: string }>(
        `select status from public.bookings where id = $1`,
        [booking.id],
      );
      expect(beforeValid.rows[0].status).toBe('awaiting_payment');

      // 2. Valid HMAC-SHA512 signature confirms booking and writes distinct ledger concepts
      const validRes = await sendWebhookRequest(webhookBody);
      expect(validRes.status).toBe(200);
      const validJson = (await validRes.json()) as { ok: boolean; result: ConfirmWebhookResult };
      expect(validJson.ok).toBe(true);
      expect(validJson.result.status).toBe('confirmed');
      expect(validJson.result.variance).toBe(0);

      const confirmedBooking = await db.query<{
        status: string;
        payment_provider: string;
        payment_reference: string;
      }>(
        `select status, payment_provider, payment_reference from public.bookings where id = $1`,
        [booking.id],
      );
      expect(confirmedBooking.rows[0]).toEqual({
        status: 'confirmed',
        payment_provider: 'Paystack',
        payment_reference: 'PSK_TX_20261023_001',
      });

      const { rows: ledgerRows } = await db.query<LedgerRow>(
        `select id::text, booking_id, record_type, amount, provider_reference, status,
                description, variance, note, operator_name
         from public.booking_payment_records
         where booking_id = $1
         order by record_type asc`,
        [booking.id],
      );

      const byType = new Map(ledgerRows.map(r => [r.record_type, r]));
      expect(ledgerRows).toHaveLength(9);
      expect(byType.get('guest_charge')?.amount).toBe(260_000);
      expect(byType.get('guest_charge')?.status).toBe('reconciled');
      // Owner revenue is full 200,000 + 20,000 mandatory — 0% HAMLET owner fee!
      expect(byType.get('accommodation_revenue')?.amount).toBe(200_000);
      expect(byType.get('mandatory_charges')?.amount).toBe(20_000);
      expect(byType.get('guest_service_fee')?.amount).toBe(40_000);
      expect(byType.get('payment_reserve')?.amount).toBe(5_000);
      expect(byType.get('hamlet_allocation')?.amount).toBe(35_000);
      // No closing agent or eligible referrer is attributed in this fixture:
      // HAMLET allocation + internal reserve must reconcile exactly to the 20% markup.
      expect(
        (byType.get('hamlet_allocation')?.amount ?? 0) +
        (byType.get('payment_reserve')?.amount ?? 0),
      ).toBe(byType.get('guest_service_fee')?.amount);
      expect(byType.get('deposit_hold')?.amount).toBe(80_000);
      expect(byType.get('provider_charge')?.amount).toBe(2_000);
      expect(byType.get('provider_charge')?.note).toContain('internal reserve');
      expect(byType.get('partner_commission')?.amount).toBe(20_000); // 10% × 200,000
      expect(byType.get('partner_commission')?.note).toBe('Mandate #CM-2026-088 signed 12 Oct 2026');

      // 3. Duplicate webhook delivery is idempotent and creates zero extra ledger lines
      const replayRes = await sendWebhookRequest(webhookBody);
      expect(replayRes.status).toBe(200);
      const replayJson = (await replayRes.json()) as { ok: boolean; result: ConfirmWebhookResult };
      expect(replayJson.result.status).toBe('already_confirmed');

      const { rows: afterReplayRows } = await db.query<{ count: string }>(
        `select count(*)::text as count from public.booking_payment_records where booking_id = $1`,
        [booking.id],
      );
      expect(Number(afterReplayRows[0].count)).toBe(9);
    });

    it('flags underpaid webhook callbacks with negative variance without confirming the booking, and allows admin ledger reconciliation', async () => {
      const booking = await createAcceptedBooking('HML-PAY-UNDER', 2); // expects 260,000 NGN

      const underpaidRes = await sendWebhookRequest({
        event: 'charge.success',
        data: {
          status: 'success',
          reference: 'PSK_TX_UNDERPAID_01',
          amount: 200_000 * 100, // 60,000 NGN short
          currency: 'NGN',
          metadata: { booking_id: booking.id },
        },
      });

      expect(underpaidRes.status).toBe(200);
      const body = (await underpaidRes.json()) as { ok: boolean; result: ConfirmWebhookResult };
      expect(body.result.status).toBe('flagged_underpayment');
      expect(body.result.variance).toBe(-60_000);

      // Booking remains awaiting_payment — never prematurely confirmed!
      const bookingCheck = await db.query<{ status: string }>(
        `select status from public.bookings where id = $1`,
        [booking.id],
      );
      expect(bookingCheck.rows[0].status).toBe('awaiting_payment');

      const { rows: flagged } = await asUser(db, adminId, tx =>
        tx.query<LedgerRow>(
          `select id::text, booking_id, record_type, amount, provider_reference, status,
                  description, variance, note, operator_name
           from public.booking_payment_records
           where booking_id = $1`,
          [booking.id],
        ),
      );
      expect(flagged).toHaveLength(1);
      expect(flagged[0].status).toBe('flagged');
      expect(flagged[0].variance).toBe(-60_000);

      // Admin cannot flag/keep non-zero variance without an 8+ char reconciliation note
      await expect(
        asUser(db, adminId, tx =>
          tx.query(`select public.reconcile_ledger_entry($1::uuid, 'flagged', -26000, 'short')`, [
            flagged[0].id,
          ]),
        ),
      ).rejects.toThrow(/reconciliation note/i);

      // Admin reconciles after manual settlement adjustment
      await asUser(db, adminId, tx =>
        tx.query(
          `select public.reconcile_ledger_entry($1::uuid, 'reconciled', 0, 'Shortfall refunded and reconciled against statement #ST-19')`,
          [flagged[0].id],
        ),
      );

      const { rows: reconciled } = await db.query<LedgerRow>(
        `select status, variance, operator_name, note from public.booking_payment_records where id = $1::uuid`,
        [flagged[0].id],
      );
      expect(reconciled[0]).toMatchObject({
        status: 'reconciled',
        variance: 0,
        operator_name: 'Funmi Admin',
        note: 'Shortfall refunded and reconciled against statement #ST-19',
      });
    });
  });

  describe('Post-confirmation booking operations & refunds', () => {
    it('supports admin operational transitions (completed, disputed, cancelled with pending refund) and audited refund recording', async () => {
      const booking = await createAcceptedBooking('HML-OPS-001', 2);
      await sendWebhookRequest({
        event: 'charge.success',
        data: {
          status: 'success',
          reference: 'PSK_OPS_001',
          amount: booking.guestTotal * 100,
          currency: 'NGN',
          metadata: { booking_id: booking.id },
        },
      });

      // Partner cannot mark confirmed bookings completed, disputed, or refunded
      await expect(
        asUser(db, ownerPartnerId, tx =>
          tx.query(`select public.transition_booking($1, 'completed')`, [booking.id]),
        ),
      ).rejects.toThrow(/Invalid booking transition/i);
      await expect(
        asUser(db, ownerPartnerId, tx =>
          tx.query(
            `select public.record_booking_refund($1, 50000, 'PSK_RFD_X', 'Unauthorized partner refund')`,
            [booking.id],
          ),
        ),
      ).rejects.toThrow(/Only administrators can record booking refunds/i);

      // Admin flags booking disputed with documented note, then cancels -> refund_status becomes pending_review
      await asUser(db, adminId, tx =>
        tx.query(
          `select public.transition_booking($1, 'disputed', 'Power outage reported on check-in evening')`,
          [booking.id],
        ),
      );
      await asUser(db, adminId, tx =>
        tx.query(
          `select public.transition_booking($1, 'cancelled', 'Cancelled by operations with full refund approved')`,
          [booking.id],
        ),
      );

      const afterCancel = await db.query<{ status: string; refund_status: string }>(
        `select status, refund_status from public.bookings where id = $1`,
        [booking.id],
      );
      expect(afterCancel.rows[0]).toEqual({
        status: 'cancelled',
        refund_status: 'pending_review',
      });

      // Over-refunding above guestTotal + deposit is rejected
      await expect(
        asUser(db, adminId, tx =>
          tx.query(
            `select public.record_booking_refund($1, $2, 'PSK_RFD_OVER', 'Excessive refund test')`,
            [booking.id, booking.guestTotal + booking.deposit + 1],
          ),
        ),
      ).rejects.toThrow(/cannot exceed booking total plus deposit/i);

      // Valid refund updates booking to refunded, sets refund_status = processed, and logs refund ledger entry
      await asUser(db, adminId, tx =>
        tx.query(
          `select public.record_booking_refund($1, $2, 'PSK_RFD_001', 'Full guest total refunded via Paystack reversal')`,
          [booking.id, booking.guestTotal],
        ),
      );

      const afterRefund = await db.query<{
        status: string;
        refund_status: string;
        refund_amount: number;
      }>(
        `select status, refund_status, refund_amount from public.bookings where id = $1`,
        [booking.id],
      );
      expect(afterRefund.rows[0]).toEqual({
        status: 'refunded',
        refund_status: 'processed',
        refund_amount: booking.guestTotal,
      });

      const { rows: refundLedger } = await db.query<LedgerRow>(
        `select record_type, amount, status, provider_reference, operator_name
         from public.booking_payment_records
         where booking_id = $1 and record_type = 'refund'`,
        [booking.id],
      );
      expect(refundLedger).toHaveLength(1);
      expect(refundLedger[0]).toEqual({
        record_type: 'refund',
        amount: booking.guestTotal,
        status: 'reconciled',
        provider_reference: 'PSK_RFD_001',
        operator_name: 'Funmi Admin',
      });
    });
  });

  describe('Issues & accountability workflow', () => {
    it('tracks issue reporting, partner investigation updates, admin assignment/escalation/resolution/closure, and blocks direct updates or reopening closed issues', async () => {
      const booking = await createAcceptedBooking('HML-ISS-001', 2);
      await sendWebhookRequest({
        event: 'charge.success',
        data: {
          status: 'success',
          reference: 'PSK_ISS_001',
          amount: booking.guestTotal * 100,
          currency: 'NGN',
          metadata: { booking_id: booking.id },
        },
      });

      const issue = await asUser(db, guestId, async tx => {
        const { rows } = await tx.query<{
          id: string;
          reference: string;
          status: string;
          timeline: Array<{ label: string }>;
        }>(
          `insert into public.booking_issues (
             reference, booking_id, reporter_id, category, severity, subject, description
           ) values (
             'HML-IS-TEST-01', $1, $2::uuid, 'Property condition', 'high',
             'AC not cooling in master bedroom', 'Split unit blowing warm air upon arrival.'
           )
           returning id::text, reference, status, timeline`,
          [booking.id, guestId],
        );
        return rows[0];
      });

      expect(issue.status).toBe('open');
      expect(issue.timeline).toHaveLength(1);
      expect(issue.timeline[0].label).toBe('Issue reported');

      // Direct UPDATE on booking_issues is blocked
      await expect(
        asUser(db, adminId, tx =>
          tx.query(`update public.booking_issues set status = 'closed' where id = $1::uuid`, [
            issue.id,
          ]),
        ),
      ).rejects.toThrow(/permission denied for table booking_issues/i);

      // Assigned property partner can mark investigating, but CANNOT resolve or close
      await asUser(db, ownerPartnerId, tx =>
        tx.query(
          `select public.transition_booking_issue($1::uuid, 'investigating', 'HVAC technician dispatched for 4 PM')`,
          [issue.id],
        ),
      );
      await expect(
        asUser(db, ownerPartnerId, tx =>
          tx.query(
            `select public.transition_booking_issue($1::uuid, 'resolved', 'Fixed by partner', null, null, 'Compressor capacitor replaced')`,
            [issue.id],
          ),
        ),
      ).rejects.toThrow(/HAMLET operations assigns, resolves, and closes issues/i);

      // Admin assigns, resolves (requires >= 8 char resolution), and closes
      await asUser(db, adminId, tx =>
        tx.query(
          `select public.transition_booking_issue($1::uuid, 'assigned', 'Assigned to operations lead', $2::uuid, 'Funmi Admin', null)`,
          [issue.id, adminId],
        ),
      );

      await expect(
        asUser(db, adminId, tx =>
          tx.query(`select public.transition_booking_issue($1::uuid, 'resolved', 'ok')`, [
            issue.id,
          ]),
        ),
      ).rejects.toThrow(/documented resolution summary/i);

      await asUser(db, adminId, tx =>
        tx.query(
          `select public.transition_booking_issue($1::uuid, 'resolved', 'Guest confirmed AC cooling', null, null, 'Capacitor replaced and verified with guest at 5:15 PM.')`,
          [issue.id],
        ),
      );
      await asUser(db, adminId, tx =>
        tx.query(
          `select public.transition_booking_issue($1::uuid, 'closed', 'SLA met; case closed.')`,
          [issue.id],
        ),
      );

      const finalIssue = await db.query<{
        status: string;
        assignee_name: string;
        resolution: string;
        timeline: Array<{ label: string }>;
      }>(
        `select status, assignee_name, resolution, timeline from public.booking_issues where id = $1::uuid`,
        [issue.id],
      );
      expect(finalIssue.rows[0].status).toBe('closed');
      expect(finalIssue.rows[0].assignee_name).toBe('Funmi Admin');
      expect(finalIssue.rows[0].resolution).toContain('Capacitor replaced');
      expect(finalIssue.rows[0].timeline).toHaveLength(5);

      // Closed issues cannot be reopened
      await expect(
        asUser(db, adminId, tx =>
          tx.query(
            `select public.transition_booking_issue($1::uuid, 'investigating', 'Attempt reopen')`,
            [issue.id],
          ),
        ),
      ).rejects.toThrow(/Closed issues cannot be modified/i);
    });
  });

  describe('Partner property assignments & agreed commissions', () => {
    it('enforces admin-only granting, written commission references, and immediate self- or admin-revocation', async () => {
      // Non-admin cannot grant assignments
      await expect(
        asUser(db, ownerPartnerId, tx =>
          tx.query(
            `select public.grant_property_assignment($1, $2::uuid, 'Co-host access', null, '')`,
            [approvedPropertyId, cohostPartnerId],
          ),
        ),
      ).rejects.toThrow(/Only administrators can grant property assignments/i);

      // Cannot grant assignment to a guest profile
      await expect(
        asUser(db, adminId, tx =>
          tx.query(
            `select public.grant_property_assignment($1, $2::uuid, 'Invalid guest assignment', null, '')`,
            [approvedPropertyId, guestId],
          ),
        ),
      ).rejects.toThrow(/Target account must be an approved partner/i);

      // Recording a commission without a written agreement reference (>= 8 chars) is rejected
      await expect(
        asUser(db, adminId, tx =>
          tx.query(
            `select public.grant_property_assignment($1, $2::uuid, 'Full co-host scope', 0.12, 'verbal')`,
            [approvedPropertyId, cohostPartnerId],
          ),
        ),
      ).rejects.toThrow(/written agreement reference/i);

      // Valid grant activates booking access for cohostPartnerId
      await asUser(db, adminId, tx =>
        tx.query(
          `select public.grant_property_assignment($1, $2::uuid, 'Guest check-in and availability checks', 0.12, 'Mandate #CM-2026-104')`,
          [approvedPropertyId, cohostPartnerId],
        ),
      );

      const booking = await createAcceptedBooking('HML-ASG-001', 2);
      const visibleBeforeRevoke = await asUser(db, cohostPartnerId, async tx => {
        const { rows } = await tx.query<{ id: string }>(
          `select id from public.bookings where id = $1`,
          [booking.id],
        );
        return rows;
      });
      expect(visibleBeforeRevoke).toHaveLength(1);

      // Partner can voluntarily revoke their own assignment; access is removed immediately
      await asUser(db, cohostPartnerId, tx =>
        tx.query(
          `select public.revoke_property_assignment($1, $2::uuid, 'End of co-hosting contract')`,
          [approvedPropertyId, cohostPartnerId],
        ),
      );

      const visibleAfterRevoke = await asUser(db, cohostPartnerId, async tx => {
        const { rows } = await tx.query<{ id: string }>(
          `select id from public.bookings where id = $1`,
          [booking.id],
        );
        return rows;
      });
      expect(visibleAfterRevoke).toHaveLength(0);
    });
  });
});
