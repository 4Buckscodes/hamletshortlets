import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import {
  asAnon,
  asServiceRole,
  asUser,
  createMigratedTestDb,
  createTestUser,
  resetTestData,
} from './helpers/testDb';
import {
  handleAdminNotificationsDispatch,
  type AdminEmailSendParams,
  type AdminNotificationsDispatchDeps,
  type ClaimedAdminNotificationRow,
} from '../functions/admin-notifications-dispatch/handler';

const INTERNAL_SECRET = 'hamlet_internal_dispatch_secret_pglite_2026!';

function buildPgliteAdminDispatchDeps(
  db: PGlite,
  overrides: Partial<AdminNotificationsDispatchDeps> = {},
): AdminNotificationsDispatchDeps {
  return {
    internalDispatchSecret: INTERNAL_SECRET,
    supabaseConfigured: true,
    resendApiKey: 're_test_admin_dispatch_key_889900',
    resendFromEmail: 'HAMLET <notifications@send.hamlet.rest>',
    operationsEmail: 'operations@hamlet.rest',
    hamletAppUrl: 'https://hamlet.rest',
    claimAdminNotifications: async (batchLimit: number) => {
      try {
        const rows = await asServiceRole(db, async tx => {
          const res = await tx.query<ClaimedAdminNotificationRow>(
            `select * from public.claim_admin_notifications($1)`,
            [batchLimit],
          );
          return res.rows;
        });
        return { data: rows, error: null };
      } catch (err) {
        return {
          data: null,
          error: { message: err instanceof Error ? err.message : 'claim failed' },
        };
      }
    },
    updateAdminNotification: async input => {
      try {
        await asServiceRole(db, async tx => {
          if (input.delivery_status === 'sent') {
            await tx.query(
              `update public.admin_notifications
               set delivery_status = 'sent',
                   delivered_at = $2::timestamptz,
                   last_delivery_error = null
               where id = $1::uuid`,
              [input.id, input.delivered_at ?? new Date().toISOString()],
            );
          } else {
            await tx.query(
              `update public.admin_notifications
               set delivery_status = 'failed',
                   last_delivery_error = $2,
                   next_attempt_at = $3::timestamptz
               where id = $1::uuid`,
              [
                input.id,
                input.last_delivery_error,
                input.next_attempt_at ?? new Date().toISOString(),
              ],
            );
          }
        });
        return { error: null };
      } catch (err) {
        return {
          error: { message: err instanceof Error ? err.message : 'update failed' },
        };
      }
    },
    ...overrides,
  };
}

describe('Release 1 — PR #76 Communications Centre, PR #74 Exclusion & Non-Destructive Rollback', () => {
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

  it('excludes PR #74 schema objects while retaining PR #73 Share Engine and PR #76 Communications Centre objects', async () => {
    const { rows: excludedTables } = await db.query<{ table_name: string }>(
      `select table_name
       from information_schema.tables
       where table_schema = 'public'
         and table_name in (
           'property_deals',
           'property_inspections',
           'property_trust_checks',
           'duplicate_listing_flags',
           'partner_share_authorisations'
         )`,
    );
    expect(excludedTables).toHaveLength(0);

    const { rows: retainedTables } = await db.query<{ table_name: string }>(
      `select table_name
       from information_schema.tables
       where table_schema = 'public'
         and table_name in (
           'admin_notifications',
           'booking_notifications',
           'partner_share_links'
         )
       order by table_name asc`,
    );
    expect(retainedTables.map(r => r.table_name)).toEqual([
      'admin_notifications',
      'booking_notifications',
      'partner_share_links',
    ]);
  });

  it('enqueues partner application submission and status-change events and enforces admin-only RLS + RPC permissions', async () => {
    const adminId = await createTestUser(db, {
      email: 'admin@hamlet.test',
      fullName: 'Elsinore Admin',
      role: 'admin',
    });
    const partnerApplicantId = await createTestUser(db, {
      email: 'applicant@partner.test',
      fullName: 'Bisi Olatunji',
      role: 'guest',
    });
    const unrelatedGuestId = await createTestUser(db, {
      email: 'guest@hamlet.test',
      fullName: 'Kunle Guest',
      role: 'guest',
    });

    // Submit partner application -> triggers partner_application_submitted
    const appId = await asUser(db, partnerApplicantId, async tx => {
      const { rows } = await tx.query<{ id: string }>(
        `insert into public.partner_applications (
           applicant_id, full_name, email, phone, company, role, areas, properties_count, motivation
         )
         values (
           $1::uuid, 'Bisi Olatunji', 'applicant@partner.test',
           '+2348012345678', 'Lagoon Crest Residences', 'Property Owner',
           array['Ikoyi', 'Victoria Island'], 3, 'Direct owner mandate across Ikoyi and Victoria Island'
         )
         returning id`,
        [partnerApplicantId],
      );
      return rows[0].id;
    });

    // Non-status update does NOT enqueue a duplicate notification
    await asServiceRole(db, async tx => {
      await tx.query(
        `update public.partner_applications set motivation = 'Updated portfolio note' where id = $1::uuid`,
        [appId],
      );
    });

    // Status transition (pending -> approved) enqueues partner_application_status_changed
    await asUser(db, adminId, async tx => {
      await tx.query(
        `select public.review_partner_application($1::uuid, 'approved', 'Verified title documents')`,
        [appId],
      );
    });

    // Anonymous callers are blocked from table and worker RPC
    await expect(
      asAnon(db, async tx => tx.query(`select * from public.admin_notifications`)),
    ).rejects.toThrow(/permission denied/i);
    await expect(
      asAnon(db, async tx => tx.query(`select * from public.claim_admin_notifications(10)`)),
    ).rejects.toThrow(/permission denied/i);

    // Guests and partners see 0 rows under RLS and cannot invoke service_role claim RPC
    const guestRows = await asUser(db, unrelatedGuestId, async tx => {
      const res = await tx.query(`select id from public.admin_notifications`);
      return res.rows;
    });
    expect(guestRows).toHaveLength(0);

    const partnerRows = await asUser(db, partnerApplicantId, async tx => {
      const res = await tx.query(`select id from public.admin_notifications`);
      return res.rows;
    });
    expect(partnerRows).toHaveLength(0);

    await expect(
      asUser(db, adminId, async tx =>
        tx.query(`select * from public.claim_admin_notifications(10)`),
      ),
    ).rejects.toThrow(/permission denied/i);

    // Admin can read both events and mark an item read
    const adminInbox = await asUser(db, adminId, async tx => {
      const res = await tx.query<{
        id: string;
        event_type: string;
        delivery_status: string;
        delivery_attempts: number;
        read_at: string | null;
      }>(
        `select id, event_type, delivery_status, delivery_attempts, read_at
         from public.admin_notifications
         order by created_at asc`,
      );
      return res.rows;
    });

    expect(adminInbox).toHaveLength(2);
    expect(adminInbox.map(r => r.event_type)).toEqual([
      'partner_application_submitted',
      'partner_application_status_changed',
    ]);
    expect(adminInbox.every(r => r.delivery_status === 'pending' && r.delivery_attempts === 0)).toBe(
      true,
    );

    await asUser(db, adminId, async tx => {
      await tx.query(
        `update public.admin_notifications set read_at = now() where id = $1::uuid`,
        [adminInbox[0].id],
      );
    });

    const marked = await asUser(db, adminId, async tx => {
      const res = await tx.query<{ read_at: string | null }>(
        `select read_at from public.admin_notifications where id = $1::uuid`,
        [adminInbox[0].id],
      );
      return res.rows[0];
    });
    expect(marked.read_at).not.toBeNull();
  });

  it('prevents duplicate dispatch, respects retry backoff, and stops after 5 failed attempts', async () => {
    const applicantId = await createTestUser(db, {
      email: 'retry.applicant@partner.test',
      fullName: 'Chinedu Okeke',
      role: 'guest',
    });

    await asUser(db, applicantId, async tx => {
      await tx.query(
        `insert into public.partner_applications (
           applicant_id, full_name, email, phone, company, role, areas, properties_count, motivation
         )
         values (
           $1::uuid, 'Chinedu Okeke', 'retry.applicant@partner.test',
           '+2348099998888', 'Lekki Shortlet Group', 'Property Manager',
           array['Lekki Phase 1'], 6, 'Managing verified Lekki Phase 1 residences'
         )`,
        [applicantId],
      );
    });

    const delivered: AdminEmailSendParams[] = [];

    // 1. First attempt fails -> status becomes 'failed', attempts = 1, next_attempt_at = +60s
    const failOnceDeps = buildPgliteAdminDispatchDeps(db, {
      sendEmail: async () => ({ ok: false, error: 'Resend HTTP 503' }),
    });

    const failRes = await handleAdminNotificationsDispatch(
      new Request('https://edge.hamlet.test/functions/v1/admin-notifications-dispatch', {
        method: 'POST',
        headers: { 'x-hamlet-internal-secret': INTERNAL_SECRET },
      }),
      failOnceDeps,
    );
    expect(await failRes.json()).toEqual({
      ok: false,
      processed: 1,
      sent: 0,
      failed: 1,
    });

    // 2. Immediate duplicate/early retry BEFORE next_attempt_at claims 0 rows
    const healthyDeps = buildPgliteAdminDispatchDeps(db, {
      sendEmail: async params => {
        delivered.push(params);
        return { ok: true };
      },
    });

    const earlyRetryRes = await handleAdminNotificationsDispatch(
      new Request('https://edge.hamlet.test/functions/v1/admin-notifications-dispatch', {
        method: 'POST',
        headers: { 'x-hamlet-internal-secret': INTERNAL_SECRET },
      }),
      healthyDeps,
    );
    expect(await earlyRetryRes.json()).toEqual({
      ok: true,
      processed: 0,
      sent: 0,
      failed: 0,
    });
    expect(delivered).toHaveLength(0);

    // 3. Advance next_attempt_at into the past -> retry succeeds exactly once
    await asServiceRole(db, async tx => {
      await tx.query(
        `update public.admin_notifications set next_attempt_at = now() - interval '1 second'`,
      );
    });

    const retrySuccessRes = await handleAdminNotificationsDispatch(
      new Request('https://edge.hamlet.test/functions/v1/admin-notifications-dispatch', {
        method: 'POST',
        headers: { 'x-hamlet-internal-secret': INTERNAL_SECRET },
      }),
      healthyDeps,
    );
    expect(await retrySuccessRes.json()).toEqual({
      ok: true,
      processed: 1,
      sent: 1,
      failed: 0,
    });
    expect(delivered).toHaveLength(1);

    // 4. Subsequent dispatch after 'sent' processes 0 rows (duplicate prevention)
    const duplicateAfterSentRes = await handleAdminNotificationsDispatch(
      new Request('https://edge.hamlet.test/functions/v1/admin-notifications-dispatch', {
        method: 'POST',
        headers: { 'x-hamlet-internal-secret': INTERNAL_SECRET },
      }),
      healthyDeps,
    );
    expect(await duplicateAfterSentRes.json()).toEqual({
      ok: true,
      processed: 0,
      sent: 0,
      failed: 0,
    });
    expect(delivered).toHaveLength(1);

    // 5. Retry exhaustion cap at 5 attempts on a persistently failing row
    await asServiceRole(db, async tx => {
      await tx.query(
        `insert into public.admin_notifications (
           event_type, title, message, target_type, target_id, recipient_email
         )
         values (
           'partner_application_submitted',
           'Persistent failure check',
           'Testing 5-attempt cap',
           'partner_application',
           'pa-cap-check',
           'cap@partner.test'
         )`,
      );
    });

    let providerHits = 0;
    const alwaysFailDeps = buildPgliteAdminDispatchDeps(db, {
      sendEmail: async () => {
        providerHits += 1;
        return { ok: false, error: 'Resend HTTP 429' };
      },
    });

    for (let i = 0; i < 6; i += 1) {
      await asServiceRole(db, async tx => {
        await tx.query(
          `update public.admin_notifications
           set next_attempt_at = now() - interval '1 second'
           where target_id = 'pa-cap-check'`,
        );
      });
      await handleAdminNotificationsDispatch(
        new Request('https://edge.hamlet.test/functions/v1/admin-notifications-dispatch', {
          method: 'POST',
          headers: { 'x-hamlet-internal-secret': INTERNAL_SECRET },
        }),
        alwaysFailDeps,
      );
    }

    expect(providerHits).toBe(5);
    const { rows: exhaustedRows } = await db.query<{
      delivery_status: string;
      delivery_attempts: number;
    }>(
      `select delivery_status, delivery_attempts
       from public.admin_notifications
       where target_id = 'pa-cap-check'`,
    );
    expect(exhaustedRows[0]).toEqual({
      delivery_status: 'failed',
      delivery_attempts: 5,
    });
  });

  it('supports independent non-destructive rollback of trigger and queue claiming without dropping notification records', async () => {
    const applicant1 = await createTestUser(db, {
      email: 'rollback1@partner.test',
      fullName: 'First Applicant',
      role: 'guest',
    });
    const applicant2 = await createTestUser(db, {
      email: 'rollback2@partner.test',
      fullName: 'Second Applicant',
      role: 'guest',
    });

    // Seed an existing production notification record
    const firstAppId = await asUser(db, applicant1, async tx => {
      const { rows } = await tx.query<{ id: string }>(
        `insert into public.partner_applications (
           applicant_id, full_name, email, phone, company, role, areas, properties_count, motivation
         )
         values (
           $1::uuid, 'First Applicant', 'rollback1@partner.test',
           '+2348011112222', 'Victoria Stays', 'Property Owner',
           array['Victoria Island'], 1, 'Direct owner listing in Victoria Island'
         )
         returning id`,
        [applicant1],
      );
      return rows[0].id;
    });

    // Control A: Disable trigger independently — new applications succeed, existing notifications remain intact
    await db.exec(`
      alter table public.partner_applications
        disable trigger partner_application_admin_notification;
    `);

    await asUser(db, applicant2, async tx => {
      await tx.query(
        `insert into public.partner_applications (
           applicant_id, full_name, email, phone, company, role, areas, properties_count, motivation
         )
         values (
           $1::uuid, 'Second Applicant', 'rollback2@partner.test',
           '+2348033334444', 'Ikate Suites', 'Property Owner',
           array['Ikate'], 3, 'Owner-managed Ikate residences'
         )`,
        [applicant2],
      );
    });

    const { rows: afterTriggerDisable } = await db.query<{ target_id: string }>(
      `select target_id from public.admin_notifications`,
    );
    // Existing firstAppId record preserved; second application did not enqueue while trigger was disabled
    expect(afterTriggerDisable.map(r => r.target_id)).toEqual([firstAppId]);

    // Restore trigger
    await db.exec(`
      alter table public.partner_applications
        enable trigger partner_application_admin_notification;
    `);

    // Control B: Disable queue claiming independently without deleting queued notifications
    await db.exec(`
      revoke execute on function public.claim_admin_notifications(integer)
        from service_role;
    `);

    const pausedDeps = buildPgliteAdminDispatchDeps(db);
    const pausedRes = await handleAdminNotificationsDispatch(
      new Request('https://edge.hamlet.test/functions/v1/admin-notifications-dispatch', {
        method: 'POST',
        headers: { 'x-hamlet-internal-secret': INTERNAL_SECRET },
      }),
      pausedDeps,
    );
    expect(pausedRes.status).toBe(500);

    const { rows: preservedRows } = await db.query<{
      target_id: string;
      delivery_status: string;
    }>(`select target_id, delivery_status from public.admin_notifications`);
    expect(preservedRows).toEqual([
      { target_id: firstAppId, delivery_status: 'pending' },
    ]);

    // Restore execute grant for subsequent tests
    await db.exec(`
      grant execute on function public.claim_admin_notifications(integer)
        to service_role;
    `);
  });
});
