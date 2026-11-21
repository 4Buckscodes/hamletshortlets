import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readRepoFile = (relPath: string): string =>
  readFileSync(resolve(process.cwd(), relPath), 'utf8');

describe('mobile-first editorial Lagos hospitality redesign', () => {
  it('renders a single visible h1 across the homepage without duplicate mobile/desktop h1 tags', () => {
    const homeSource = readRepoFile('app/v0-home-experience.tsx');
    expect((homeSource.match(/<h1\b/g) ?? []).length).toBe(1);
    expect(homeSource).toContain('Find your place to belong.');
    expect(homeSource).toContain('Verified shortlets in Lagos');
  });

  it('keeps the homepage search, area shortcuts and Find a stay entry points working', () => {
    const homeSource = readRepoFile('app/v0-home-experience.tsx');
    expect(homeSource).toContain('Anywhere in Lagos');
    expect(homeSource).toContain('aria-label="Search Lagos stays: choose area, dates and guests"');
    expect(homeSource).toContain('title="Find a stay"');
    expect(homeSource).toContain('<Button href="/stays">Find a stay</Button>');
    expect(homeSource).toContain('/stays?area=${encodeURIComponent(name)}');
    for (const area of ['Lekki', 'Victoria Island', 'Ikoyi', 'Yaba']) expect(homeSource).toContain(`'${area}'`);
    expect(homeSource).toContain("href: '/stays?side=island'");
    expect(homeSource).toContain("href: '/stays?area=Lagos+Mainland'");
    expect(homeSource).toContain('View all stays');
  });

  it('shows live verified stays and a helpful empty state rather than a blank section', () => {
    const homeSource = readRepoFile('app/v0-home-experience.tsx');
    expect(homeSource).toContain('StayListingCard');
    expect(homeSource).toContain('New verified stays are on their way.');
    expect(homeSource).toContain('Nothing to pay until the partner accepts your request.');
  });

  it('implements the forest site header, full-screen forest mobile drawer and collapsible forest footer from the UI kit', () => {
    const siteShell = readRepoFile('src/components/site/SiteShell.tsx');
    const kitCss = readRepoFile('src/components/ui/hamlet-ui.css');

    // One forest header on every page (no navy/paper variants)
    expect(siteShell).toContain('className="hm-header"');
    expect(siteShell).toContain('aria-label="Primary navigation"');
    expect(siteShell).not.toMatch(/#121F3C|#0E1F3B|#C9A45C/);
    expect(kitCss).toContain('.hm-header {');

    // Full-screen forest drawer with Horatio, guest and host links and account actions
    expect(siteShell).toContain('className="hm-drawer"');
    expect(kitCss).toMatch(/\.hm-drawer \{[^}]*position: fixed; inset: 0;/);
    expect(kitCss).toContain('min-height: 100dvh');
    expect(siteShell).toContain('M4 8h16M4 16h16');
    expect(siteShell).toContain('Ask Horatio');
    expect(siteShell).toContain('For guests');
    expect(siteShell).toContain("{ href: '/stays', label: 'Explore stays' }");
    expect(siteShell).toContain("{ href: '/lagos', label: 'Lagos guide' }");
    expect(siteShell).toContain("{ href: '/how-it-works', label: 'How it works' }");
    expect(siteShell).toContain("{ href: '/safety', label: 'Safety' }");
    expect(siteShell).toContain("{ href: '/faqs', label: 'FAQs' }");
    expect(siteShell).toContain('For hosts &amp; about');
    expect(siteShell).toContain("{ href: '/partners/apply', label: 'Partner with us' }");
    expect(siteShell).toContain("{ href: '/about', label: 'About HAMLET' }");
    expect(siteShell).toContain('Create guest account');

    // Collapsible mobile footer accordions + 4-column desktop footer
    expect(siteShell).toContain('footer-accordion-');
    expect(siteShell).toContain("isOpen ? '−' : '+'");
    expect(kitCss).toContain('grid-template-columns: 1.3fr 1fr 1fr 1fr');
    expect(siteShell).toContain('hello@hamlet.rest');
    expect(siteShell).toContain(
      'Bookings confirm only after partner acceptance and server-verified payment.',
    );
  });
});
