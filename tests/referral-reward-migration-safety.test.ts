import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20261030150000_harden_network_referral_reward_completion.sql'),
  'utf8',
);

describe('network referral reward lifecycle migration safety', () => {
  it('removes the booking-insert trigger that could mutate requested booking allocations', () => {
    expect(migration).toMatch(/drop trigger if exists apply_network_partner_referral_reward on public\.bookings/i);
    expect(migration).toMatch(/drop function if exists public\.apply_network_partner_referral_reward\(\)/i);
    expect(migration).not.toMatch(/create trigger apply_network_partner_referral_reward\s+after insert on public\.bookings/i);
  });

  it('only processes referral rewards on the transition into completed', () => {
    expect(migration).toMatch(/new\.status <> 'completed' or old\.status = 'completed'/i);
    expect(migration).toMatch(/after update of status on public\.bookings/i);
  });

  it('uses the real property_access relation instead of guessed owner JSON fields', () => {
    expect(migration).toMatch(/from public\.property_access pa/i);
    expect(migration).toMatch(/pa\.status = 'active'/i);
    expect(migration).not.toMatch(/to_jsonb\(listing_row\)\s*->>\s*'(owner_id|owner_user_id|created_by|submitted_by)'/i);
  });

  it('fails closed when the HAMLET allocation cannot fund the referral reward', () => {
    expect(migration).toMatch(/if reward > available_allocation then/i);
    expect(migration).toMatch(/return new;\s*end if;/i);
  });

  it('does not duplicate closing-agent rewards and keeps the allocation ledger synchronized', () => {
    expect(migration).toMatch(/if new\.closing_agent_id is not null then/i);
    expect(migration).toMatch(/update public\.booking_payment_records/i);
    expect(migration).toMatch(/record_type = 'hamlet_allocation'/i);
  });

  it('uses a unique booking reward and idempotent ledger conflict handling', () => {
    expect(migration).toMatch(/on conflict \(booking_id\) do nothing/i);
    expect(migration).toMatch(/on conflict \(provider_reference, record_type, booking_id\)/i);
  });
});
