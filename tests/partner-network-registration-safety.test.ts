import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20261031100000_immediate_partner_network_registration.sql'), 'utf8');

describe('immediate partner network registration safety', () => {
  it('keeps network membership separate from privileged partner role', () => {
    expect(migration).toContain('partner_network_memberships');
    expect(migration).not.toMatch(/update\s+public\.profiles\s+set\s+role\s*=\s*'partner'/i);
    expect(migration).toMatch(/public\.is_account_active\(\)/i);
  });
  it('requires authentication, valid role and contact details', () => {
    expect(migration).toMatch(/actor is null/i);
    expect(migration).toContain("'property_owner','authorised_manager','multi_property_operator','closing_agent'");
    expect(migration).toMatch(/char_length\(regexp_replace\(coalesce\(next_phone/i);
  });
  it('prevents self-reactivation and requires audited admin decisions', () => {
    expect(migration).toMatch(/status = 'suspended'\) then\s*raise exception/i);
    expect(migration).toMatch(/char_length\(btrim\(coalesce\(reason_note,''\)\)\) < 10/i);
    expect(migration).toMatch(/insert into public\.admin_audit_log/i);
    expect(migration).toMatch(/public\.has_role\('admin'\)/i);
  });
});
