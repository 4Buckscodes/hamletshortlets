import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { loadBookingPropertySummaries, withPropertySummaries } from './bookingProperties';

const ROOT = join(__dirname, '..', '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

describe('guest booking property details', () => {
  it('maps summaries onto bookings and leaves unknown stays null', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ property_id: 'p1', title: 'Lekki Flat', area: 'Lekki Phase 1', image_urls: ['a.jpg'] }],
      error: null,
    });
    const summaries = await loadBookingPropertySummaries({ rpc } as never);
    expect(rpc).toHaveBeenCalledWith('get_my_booking_property_summaries');
    const rows = withPropertySummaries([{ id: 'b1', property_id: 'p1' }, { id: 'b2', property_id: 'gone' }, { id: 'b3' }], summaries);
    expect(rows[0]!.properties).toEqual({ title: 'Lekki Flat', area: 'Lekki Phase 1', image_urls: ['a.jpg'] });
    expect(rows[1]!.properties).toBeNull();
    expect(rows[2]!.properties).toBeNull();
  });

  it('falls back to an empty map when the function is missing or errors', async () => {
    const missing = vi.fn().mockResolvedValue({ data: null, error: { message: 'function does not exist' } });
    expect((await loadBookingPropertySummaries({ rpc: missing } as never)).size).toBe(0);
    const thrown = vi.fn().mockRejectedValue(new Error('network'));
    expect((await loadBookingPropertySummaries({ rpc: thrown } as never)).size).toBe(0);
  });

  it('guest pages no longer embed the properties table, which guests cannot read', () => {
    for (const file of ['app/account/bookings/page.tsx', 'app/account/issues/page.tsx']) {
      const source = read(file);
      expect(source).not.toMatch(/properties\s*\(/);
      expect(source).toContain('loadBookingPropertySummaries');
    }
  });

  it('the signed-in store reads approved stays from the public view, not only the raw table', () => {
    const store = read('src/lib/store.tsx');
    expect(store).toContain("from('public_properties').select('*').eq('status', 'approved')");
    expect(store).toContain('ownPropertyRows');
  });
});
