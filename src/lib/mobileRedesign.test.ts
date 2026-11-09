import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readRepoFile = (relPath: string): string =>
  readFileSync(resolve(process.cwd(), relPath), 'utf8');

describe('mobile-first editorial Lagos hospitality redesign', () => {
  it('renders a single visible h1 across the homepage without duplicate mobile/desktop h1 tags', () => {
    const homeSource = readRepoFile('app/home-slideshow.tsx');
    const h1Matches = homeSource.match(/<h1\b/g) ?? [];
    expect(h1Matches.length).toBe(1);
    expect(homeSource).toContain('Lagos feels better here.');
    expect(homeSource).not.toContain('STAYS WITH ACCOUNTABILITY · LAGOS');
  });

  it('includes the forest-green hospitality hero with an illustrated Lagos lagoon skyline while keeping the cream search pill and Find a stay sheet untouched', () => {
    const homeSource = readRepoFile('app/home-slideshow.tsx');

    // Deep Navy hero + Lagos Lagoon skyscraper & cable-stayed bridge illustration (IMG_4462)
    expect(homeSource).toContain('Lagos feels better here.');
    expect(homeSource).toContain('viewBox="0 0 560 430"');
    expect(homeSource).toContain('Illustrated Lagos lagoon skyline and bridge at sunset');
    expect(homeSource).toContain('lagoonWater');
    expect(homeSource).toContain('lagoonSky');

    // Curved Warm Ivory cream search sheet & tactile search trigger pill (untouched)
    expect(homeSource).toContain('Anywhere in Lagos');
    expect(homeSource).toContain('Add dates');
    expect(homeSource).toContain('aria-label="Find a stay"');

    // Interactive Find a stay filter sheet (Where / When / Who / Clear / Show stays)
    expect(homeSource).toContain('Anywhere');
    expect(homeSource).toContain('Island');
    expect(homeSource).toContain('Mainland');
    expect(homeSource).toContain('Check-in');
    expect(homeSource).toContain('Check-out');
    expect(homeSource).toContain('text-base');
    expect(homeSource).toContain('Adults &amp; children');
    expect(homeSource).toContain('Clear');
    expect(homeSource).toContain('Show stays');
  });

  it('places the former Explore Lagos neighbourhoods photo rail right below the search pill and above Verified stays, followed by 4-step verification and Partner card', () => {
    const homeSource = readRepoFile('app/home-slideshow.tsx');

    // Former Explore Lagos neighbourhoods photo rail placed BEFORE Verified stays
    expect(homeSource).toContain('Island &amp; Lagos Mainland corridors');
    expect(homeSource).toContain('Explore Lagos neighbourhoods');
    expect(homeSource).toContain('DISCOVERY_NEIGHBOURHOODS');
    expect(homeSource).toContain('Every corridor');
    expect(homeSource).toContain('All Lagos');
    expect(homeSource).toContain('Island &amp; Mainland');
    expect(homeSource).toMatch(/overflow-x-auto[\s\S]*overscroll-x-contain|overscroll-x-contain[\s\S]*overflow-x-auto/);

    const railIdx = homeSource.indexOf('Explore Lagos neighbourhoods');
    const staysIdx = homeSource.indexOf('id="stays"');
    expect(railIdx).toBeGreaterThan(-1);
    expect(staysIdx).toBeGreaterThan(railIdx);

    // Verified stays cards with swipeable gallery & monogram fallback
    expect(homeSource).toContain('Verified stays');
    expect(homeSource).toContain('Photos coming soon');
    expect(homeSource).toContain('View stay →');
    expect(homeSource).toContain('See all stays →');

    // Verification details appear once, in the HAMLET difference panel.
    expect(homeSource).not.toContain('Verified before it’s bookable');
    expect(homeSource).toContain('Title & lease');
    expect(homeSource).toContain('Host identity');
    expect(homeSource).toContain('Authority');
    expect(homeSource).toContain('Inspection');

    // Partner banner with gold CTA
    expect(homeSource).toContain('Own or manage a verified shortlet in Lagos?');
    expect(homeSource).toContain('bg-[#B58A52]');
    expect(homeSource).toContain('Apply as a partner');
  });

  it('implements the forest-green homepage header, full-screen Warm Ivory mobile drawer, and collapsible footer', () => {
    const siteShell = readRepoFile('src/components/site/SiteShell.tsx');

    // Midnight Navy homepage header + non-home paper header
    expect(siteShell).toContain('bg-[#173F32]');
    expect(siteShell).toContain('lg:backdrop-blur-xl');

    // Full-screen mobile drawer in Warm Ivory (#F8F5EE) with gold-accented Horatio & guest/partner actions
    expect(siteShell).toContain('fixed inset-0 z-50 bg-[#F7F4ED]');
    expect(siteShell).toContain('h-dvh');
    expect(siteShell).toContain('M4 8h16M4 16h16');
    expect(siteShell).toContain('Ask Horatio');
    expect(siteShell).not.toContain('For Guests');
    expect(siteShell).toContain("{ href: '/stays', label: 'Explore stays' }");
    expect(siteShell).toContain("{ href: '/lagos', label: 'Lagos guide' }");
    expect(siteShell).not.toContain("{ href: '/how-it-works', label: 'How it works' }");
    expect(siteShell).not.toContain("{ href: '/safety', label: 'Safety' }");
    expect(siteShell).not.toContain("{ href: '/faqs', label: 'FAQs' }");
    expect(siteShell).not.toContain('For Hosts &amp; About');
    expect(siteShell).toContain("{ href: '/partners/apply', label: 'Partner with us' }");
    expect(siteShell).toContain("{ href: '/about', label: 'About HAMLET' }");
    expect(siteShell).toContain('Create guest account');

    // Collapsible mobile footer accordions + 4-column desktop footer
    expect(siteShell).toContain('footer-accordion-');
    expect(siteShell).toContain("isOpen ? '−' : '+'");
    expect(siteShell).toContain('hidden gap-8 md:grid md:grid-cols-4');
    expect(siteShell).toContain('hello@hamlet.rest');
    expect(siteShell).toContain(
      'Bookings confirm only after partner acceptance and server-verified payment.',
    );
  });
});
