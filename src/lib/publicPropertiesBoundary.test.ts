import { describe, expect, it } from 'vitest';
import { PARTNER_PROPERTY_SELECT, PUBLIC_VIEW_SELECT, toPublicStayRecord } from './next-supabase';
import { guestFacingNightlyNgn } from './pricing';

const PRIVATE_COLUMNS = ['nightly_rate', 'calendar_responsible_person', 'calendar_responsible_user_id', 'review_note', 'authorised_manager_id', 'property_introducer_id'];

describe('public property boundary', () => {
  it('the public view select list never names a private column', () => {
    const columns = PUBLIC_VIEW_SELECT.split(',');
    for (const column of PRIVATE_COLUMNS) expect(columns).not.toContain(column);
    expect(columns).toContain('guest_nightly_ngn');
  });

  it('partner reads keep the owner rate and contact columns', () => {
    const columns = PARTNER_PROPERTY_SELECT.split(',');
    expect(columns).toContain('nightly_rate');
    expect(columns).toContain('calendar_responsible_person');
  });

  it('uses the view price as is and never returns the owner rate', () => {
    const record = toPublicStayRecord({ id: 'p1', title: 'Stay', guest_nightly_ngn: 234000, nightly_rate: 195000, calendar_responsible_person: 'Private contact' });
    expect(record.guest_nightly_ngn).toBe(234000);
    expect(JSON.stringify(record)).not.toContain('195000');
    expect(JSON.stringify(record)).not.toContain('Private contact');
  });

  it('still derives the guest price for authenticated rows that only carry the owner rate', () => {
    const record = toPublicStayRecord({ id: 'p2', title: 'Stay', nightly_rate: 100000 });
    expect(record.guest_nightly_ngn).toBe(guestFacingNightlyNgn(100000));
    expect('nightly_rate' in record).toBe(false);
  });
});
