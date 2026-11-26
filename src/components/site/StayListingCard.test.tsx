import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CurrencyProvider } from '@/lib/currency';
import type { PublicStayRecord } from '@/lib/next-supabase';
import { StayListingCard } from './SiteShell';

function render(ui: ReactElement) {
  return renderToStaticMarkup(<CurrencyProvider>{ui}</CurrencyProvider>);
}

const stay = {
  id: 'stay-1',
  title: 'Ocean-view 2-bed apartment',
  area: 'Lekki Phase 1',
  property_type: 'apartment',
  bedrooms: 2,
  bathrooms: 2,
  capacity: 4,
  amenities: ['Wi-Fi'],
  guest_nightly_ngn: 100000,
  image_urls: ['/images/prop/exterior-1.jpg', '/images/prop/living-1.jpg', '/images/prop/bed-1.jpg'],
} as unknown as PublicStayRecord;

describe('StayListingCard (homepage)', () => {
  it('shows only the cover photo, with no gallery arrows or counter', () => {
    const html = render(<StayListingCard stay={stay} photoCount={11} />);
    expect(html.match(/<img /g)).toHaveLength(1);
    expect(html).toContain('src="/images/prop/exterior-1.jpg"');
    expect(html).not.toContain('/images/prop/living-1.jpg');
    expect(html).not.toMatch(/Previous photo|Next photo|hl-step|hl-count/);
  });

  it('labels the photo as a link to the full gallery on the stay page', () => {
    const html = render(<StayListingCard stay={stay} photoCount={11} />);
    expect(html).toContain('View all 11 photos');
    expect(html).toContain('aria-label="View all 11 photos of Ocean-view 2-bed apartment in Lekki Phase 1"');
    expect(html).toContain('href="/stays/stay-1"');
  });

  it('skips the "View all photos" label when the stay has a single photo', () => {
    const html = render(
      <StayListingCard stay={{ ...stay, image_urls: ['/images/prop/exterior-1.jpg'] }} />,
    );
    expect(html).not.toContain('View all');
    expect(html).toContain('aria-label="View Ocean-view 2-bed apartment in Lekki Phase 1"');
  });
});
