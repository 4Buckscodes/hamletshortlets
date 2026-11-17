import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asUser, createMigratedTestDb, createTestUser, resetTestData } from './helpers/testDb.ts';

describe('Partner payout verification controls', () => {
  let db: PGlite;
  beforeAll(async () => { db = await createMigratedTestDb(); });
  beforeEach(async () => { await resetTestData(db); });
  afterAll(async () => { await db.close(); });

  it('lets an active partner submit payout details without delaying workspace access', async () => {
    const partnerId = await createTestUser(db, {
      email: 'payout-partner@hamlet.test',
      partnerSignup: { role: 'property_owner' },
    });

    await asUser(db, partnerId, tx => tx.query(
      `select public.submit_partner_payout_verification($1,$2,$3,$4,$5,$6,$7)`,
      [`${partnerId}/identity/id-front.pdf`, 'Example Bank', '001', 'A. Partner', '1234',
       `${partnerId}/agreement/partner-v1.pdf`, 'v1'],
    ));

    const result = await asUser(db, partnerId, tx => tx.query(
      `select identity_status, bank_status, agreement_status, account_number_last4
       from public.partner_payout_verifications where partner_id=$1`, [partnerId],
    ));
    expect(result.rows[0]).toEqual({
      identity_status: 'pending', bank_status: 'pending', agreement_status: 'pending',
      account_number_last4: '1234',
    });

    const access = await asUser(db, partnerId, tx => tx.query(
      `select public.has_role('guest') as guest_access,
              public.has_role('partner') as partner_access,
              public.can_submit_partner_property() as can_submit`,
    ));
    expect(access.rows[0]).toEqual({ guest_access: true, partner_access: true, can_submit: true });
  });

  it('does not allow a partner to mark their own identity, bank or agreement as verified', async () => {
    const partnerId = await createTestUser(db, {
      email: 'self-verify@hamlet.test',
      partnerSignup: { role: 'property_owner' },
    });
    await asUser(db, partnerId, tx => tx.query(
      `select public.submit_partner_payout_verification($1,$2,$3,$4,$5,$6,$7)`,
      [`${partnerId}/identity/id.pdf`, 'Example Bank', '001', 'A. Partner', '4321',
       `${partnerId}/agreement/partner-v1.pdf`, 'v1'],
    ));

    await expect(asUser(db, partnerId, tx => tx.query(
      `update public.partner_payout_verifications set identity_status='verified' where partner_id=$1`,
      [partnerId],
    ))).rejects.toThrow(/permission denied|row-level security/i);
  });

  it('requires an administrator to verify all three payout checks and a bank verification reference', async () => {
    const partnerId = await createTestUser(db, {
      email: 'admin-review-partner@hamlet.test',
      partnerSignup: { role: 'property_owner' },
    });
    const adminId = await createTestUser(db, {
      email: 'payout-admin@hamlet.test', role: 'admin', fullName: 'Payout Admin',
    });
    await asUser(db, partnerId, tx => tx.query(
      `select public.submit_partner_payout_verification($1,$2,$3,$4,$5,$6,$7)`,
      [`${partnerId}/identity/id.pdf`, 'Example Bank', '001', 'A. Partner', '9876',
       `${partnerId}/agreement/partner-v1.pdf`, 'v1'],
    ));

    await expect(asUser(db, partnerId, tx => tx.query(
      `select public.review_partner_payout_verification($1,'verified','verified','verified','BANK-REF-1','checked')`,
      [partnerId],
    ))).rejects.toThrow(/Only active administrators/i);

    await expect(asUser(db, adminId, tx => tx.query(
      `select public.review_partner_payout_verification($1,'verified','verified','verified',null,'checked')`,
      [partnerId],
    ))).rejects.toThrow(/bank verification reference/i);

    await asUser(db, adminId, tx => tx.query(
      `select public.review_partner_payout_verification($1,'verified','verified','verified','BANK-REF-1','Name matched and agreement signed')`,
      [partnerId],
    ));

    const result = await asUser(db, partnerId, tx => tx.query(
      `select identity_status, bank_status, agreement_status, bank_verification_reference
       from public.partner_payout_verifications where partner_id=$1`, [partnerId],
    ));
    expect(result.rows[0]).toEqual({
      identity_status: 'verified', bank_status: 'verified', agreement_status: 'verified',
      bank_verification_reference: 'BANK-REF-1',
    });
  });
});
