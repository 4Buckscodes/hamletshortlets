import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asAnon, asUser, createMigratedTestDb, createTestUser } from './helpers/testDb';

describe('Internal helper RPC permissions', () => {
  let db: PGlite;
  let partnerId: string;

  beforeAll(async () => {
    db = await createMigratedTestDb();
    partnerId = await createTestUser(db, {
      email: 'helper.permissions@hamlet.test',
      fullName: 'Helper Permissions Partner',
      role: 'partner',
    });
  });

  afterAll(async () => {
    await db?.close();
  });

  it('does not expose the Lagos pilot-area helper to anonymous callers', async () => {
    await expect(
      asAnon(db, tx => tx.query(
        `select public.assert_lagos_pilot_area('Lekki')`,
      )),
    ).rejects.toThrow(/permission denied/i);
  });

  it('keeps the helper available to authenticated partner listing workflows', async () => {
    await expect(
      asUser(db, partnerId, tx => tx.query(
        `select public.assert_lagos_pilot_area('Lekki')`,
      )),
    ).resolves.toBeDefined();
  });
});
