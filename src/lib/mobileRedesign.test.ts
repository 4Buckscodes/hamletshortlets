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
    expect(homeSource).toContain('Find your next stay.');
    expect(homeSource).toContain('Lagos Shortlets · Reviewed Listings');
    expect(homeSource).toContain(
      'Island or Mainland, pick your side of the lagoon. Check each listing’s recorded review outcomes before you request a stay.',
    );
    expect(homeSource).not.toContain('Verified before it’s bookable');
    expect(homeSource).not.toContain('{displayedStays.length} available');
  });

  it('includes the Deep Navy (#0E1F3B) hero with the skyscraper & bridge skyline SVG while keeping the cream search pill and Find a stay sheet untouched', () => {
    const homeSource = readRepoFile('app/home-slideshow.tsx');

    // Deep Navy hero + Lagos Lagoon skyscraper & cable-stayed bridge illustration (IMG_4462)
    expect(homeSource).toContain('bg-[#0E1F3B]');
    expect(homeSource).toContain('viewBox="0 0 390 210"');
    expect(homeSource).toContain('cx="296" cy="64" r="30" fill="#C9A45C"');
    expect(homeSource).toContain('M0 150Q195 70 390 150');
    expect(homeSource).toContain('M65 132V156M130 117V156M195 110V156M260 117V156M325 132V156');

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

  it('places the former Explore Lagos neighbourhoods photo rail right below the search pill and above the Lagos stays section, followed by 4-step verification and Partner card', () => {
    const homeSource = readRepoFile('app/home-slideshow.tsx');

    // Former Explore Lagos neighbourhoods photo rail placed BEFORE the Lagos stays section
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

    // Lagos stay cards with per-listing verification badges, swipeable gallery & monogram fallback
    expect(homeSource).toContain('Stays across Lagos');
    expect(homeSource).toContain('Photos coming soon');
    expect(homeSource).toContain('View stay →');
    expect(homeSource).toContain('See all stays →');

    // Listing-level verification outcomes stay explicit without implying every check is complete.
    expect(homeSource).toContain('Listing checks, explained');
    expect(homeSource).toContain('Each approved stay shows its recorded outcome for these checks.');
    expect(homeSource).toContain('Title & lease');
    expect(homeSource).toContain('Host identity');
    expect(homeSource).toContain('Listing authority');
    expect(homeSource).toContain('Property inspection');

    // Partner banner with gold CTA
    expect(homeSource).toContain('Property Owners &amp; Managers');
    expect(homeSource).toContain('Own or manage a shortlet in Lagos?');
    expect(homeSource).toContain(
      'List with HAMLET for visibility, booking and property management support.',
    );
    expect(homeSource).toContain('bg-[#C9A45C]');
    expect(homeSource).toContain('Apply as a partner');
  });

  it('implements the Midnight Navy homepage header, full-screen Warm Ivory mobile drawer, and collapsible footer', () => {
    const siteShell = readRepoFile('src/components/site/SiteShell.tsx');

    // Midnight Navy homepage header + non-home paper header
    expect(siteShell).toContain('bg-[#121F3C]');
    expect(siteShell).toContain('lg:backdrop-blur-xl');

    // Full-screen mobile drawer in Warm Ivory (#F8F5EE) with gold-accented Horatio & guest/partner actions
    expect(siteShell).toContain('fixed inset-0 z-50 bg-[#F8F5EE]');
    expect(siteShell).toContain('h-dvh');
    expect(siteShell).toContain('M4 8h16M4 16h16');
    expect(siteShell).toContain('Ask Horatio');
    expect(siteShell).toContain('For Guests');
    expect(siteShell).toContain("{ href: '/stays', label: 'Explore stays' }");
    expect(siteShell).toContain("{ href: '/lagos', label: 'Lagos guide' }");
    expect(siteShell).toContain("{ href: '/how-it-works', label: 'How it works' }");
    expect(siteShell).toContain("{ href: '/safety', label: 'Safety' }");
    expect(siteShell).toContain("{ href: '/faqs', label: 'FAQs' }");
    expect(siteShell).toContain('For Hosts &amp; About');
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

  it('uses honest discovery counts and clear booking price/confirmation terms', () => {
    const discovery = readRepoFile('src/components/site/DiscoveryMarketplace.tsx');
    const booking = readRepoFile('app/stays/[id]/booking-request-form.tsx');

    expect(discovery).toContain('match your filters');
    expect(discovery).not.toContain('} available`');
    expect(booking).toContain('Guest nightly rate');
    expect(booking).toContain('20% guest service fee');
    expect(booking).toContain('Stay total excludes the caution deposit.');
    expect(booking).toContain('Sending a request is free');
    expect(booking).toContain('48-hour Paystack payment window');
    expect(booking).not.toContain('All-in stay rate');
  });

  it('starts owner submissions from blank real-world inputs instead of example listing data', () => {
    const wizard = readRepoFile('src/components/forms/PropertyListingWizard.tsx');

    expect(wizard).toContain("propertyType: ''");
    expect(wizard).toContain("area: ''");
    expect(wizard).toContain('bedrooms: 0');
    expect(wizard).toContain('bathrooms: 0');
    expect(wizard).toContain('capacity: 0');
    expect(wizard).toContain('nightlyRate: 0');
    expect(wizard).toContain('amenities: []');
    expect(wizard).not.toContain('nightlyRate: 120000');
    expect(wizard).not.toContain('cleaningFee: 25000');
    expect(wizard).not.toContain('deposit: 100000');
    expect(wizard).toContain('Choose the Lagos neighbourhood.');
    expect(wizard).toContain('Choose the property type.');
    expect(wizard).toContain('Record at least one bedroom, or choose Studio');
    expect(wizard).toContain('Enter the actual owner-agreed nightly rate');
  });
});
