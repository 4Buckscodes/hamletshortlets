import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asUser, createMigratedTestDb, createTestUser } from './helpers/testDb';

describe('HAMLET security RPC privilege boundaries', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createMigratedTestDb();
  });

  afterAll(async () => {
    await db?.close();
  });

  it('keeps trigger-only SECURITY DEFINER functions unavailable to API roles', async () => {
    const triggerOnlyFunctions = [
      'public.approve_partner_application()',
      'public.assign_profile_referral_code_on_role()',
      'public.create_profile_for_new_user()',
      'public.enforce_booking_request_integrity()',
      'public.enqueue_partner_application_customer_email()',
      'public.enqueue_property_lifecycle_emails()',
      'public.enqueue_registration_welcome_after_confirmation()',
      'public.enqueue_registration_welcome_from_profile()',
      'public.grant_submitter_property_access()',
      'public.handle_booking_notification_trigger()',
      'public.initialize_booking_caution_deposit()',
      'public.initialize_booking_issue_timeline()',
      'public.record_share_booking_lifecycle_events()',
      'public.resolve_share_attribution_before_booking()',
      'public.validate_partner_application_referral()',
      'public.generate_unique_referral_code(text)',
    ];

    for (const signature of triggerOnlyFunctions) {
      const { rows } = await db.query<{
        anon_execute: boolean;
        authenticated_execute: boolean;
      }>(
        `select
           has_function_privilege('anon', $1::regprocedure, 'EXECUTE') as anon_execute,
           has_function_privilege('authenticated', $1::regprocedure, 'EXECUTE') as authenticated_execute`,
        [signature],
      );

      expect(rows[0], signature).toEqual({
        anon_execute: false,
        authenticated_execute: false,
      });
    }
  });

  it('preserves only the explicitly public SECURITY DEFINER RPCs needed by guest journeys', async () => {
    const publicFunctions = [
      'public.get_public_property_calendar(text[])',
      'public.get_unavailable_property_ids(date,date)',
      'public.record_share_link_visit(text,text,text)',
      'public.resolve_referral_code(text)',
      'public.submit_property_enquiry(text,text,text,text,text,text,text)',
    ];

    for (const signature of publicFunctions) {
      const { rows } = await db.query<{ anon_execute: boolean }>(
        `select has_function_privilege('anon', $1::regprocedure, 'EXECUTE') as anon_execute`,
        [signature],
      );

      expect(rows[0]?.anon_execute, signature).toBe(true);
    }
  });

  it('does not treat suspended accounts as active role holders', async () => {
    const activePartnerId = await createTestUser(db, {
      email: 'active-partner.security@hamlet.test',
      fullName: 'Active Partner',
      role: 'partner',
    });
    const suspendedPartnerId = await createTestUser(db, {
      email: 'suspended-partner.security@hamlet.test',
      fullName: 'Suspended Partner',
      role: 'partner',
    });
    const suspendedAdminId = await createTestUser(db, {
      email: 'suspended-admin.security@hamlet.test',
      fullName: 'Suspended Admin',
      role: 'admin',
    });

    await db.query(
      `update public.profiles set account_status = 'suspended' where id = any($1::uuid[])`,
      [[suspendedPartnerId, suspendedAdminId]],
    );

    const activePartner = await asUser(db, activePartnerId, tx =>
      tx.query<{ has_role: boolean }>(`select public.has_role('partner')`),
    );
    const suspendedPartner = await asUser(db, suspendedPartnerId, tx =>
      tx.query<{ has_role: boolean }>(`select public.has_role('partner')`),
    );
    const suspendedAdmin = await asUser(db, suspendedAdminId, tx =>
      tx.query<{ has_role: boolean }>(`select public.has_role('admin')`),
    );

    expect(activePartner.rows[0]?.has_role).toBe(true);
    expect(suspendedPartner.rows[0]?.has_role).toBe(false);
    expect(suspendedAdmin.rows[0]?.has_role).toBe(false);
  });

  it('keeps the customer email outbox inaccessible to anon and authenticated table clients', async () => {
    const { rows } = await db.query<{
      rls_enabled: boolean;
      anon_select: boolean;
      authenticated_select: boolean;
      anon_insert: boolean;
      authenticated_insert: boolean;
    }>(`
      select
        c.relrowsecurity as rls_enabled,
        has_table_privilege('anon', c.oid, 'SELECT') as anon_select,
        has_table_privilege('authenticated', c.oid, 'SELECT') as authenticated_select,
        has_table_privilege('anon', c.oid, 'INSERT') as anon_insert,
        has_table_privilege('authenticated', c.oid, 'INSERT') as authenticated_insert
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'customer_email_notifications'
    `);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      rls_enabled: true,
      anon_select: false,
      authenticated_select: false,
      anon_insert: false,
      authenticated_insert: false,
    });
  });
});
