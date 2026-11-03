import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(process.cwd());

describe('Mobile Hero, Mobile Navigation Drawer & Mobile Footer Redesign', () => {
  it('implements the Lagos Lagoon & Bridge SVG, Warm Ivory bottom search sheet, and single H1 in app/home-slideshow.tsx', () => {
    const src = readFileSync(join(ROOT, 'app', 'home-slideshow.tsx'), 'utf8');

    // Strictly one H1 element in the homepage hero for SEO & strict role queries
    expect(src.match(/<h1\b/g)?.length).toBe(1);
    expect(src).toContain('Find your next stay.');

    // Mobile hero editorial eyebrow + lagoon-side subcopy
    expect(src).toContain('Verified Shortlets · Lagos');
    expect(src).toContain(
      'Island or Mainland, pick your side of the lagoon. Every stay is checked before you can request it.',
    );

    // Lagos Lagoon & Lekki-Ikoyi cable-stayed bridge SVG geometry & palette
    expect(src).toContain('viewBox="0 0 390 210"');
    expect(src).toContain('cx="296" cy="64" r="30" fill="#C9A45C"');
    expect(src).toContain('M0 150Q195 70 390 150');
    expect(src).toContain('M65 132V156M130 117V156M195 110V156M260 117V156M325 132V156');

    // Warm Ivory bottom search sheet (#F8F5EE) with 3-way side toggle, area chips, DATES/GUESTS & 4-pillar strip
    expect(src).toContain('rounded-t-[28px] bg-[#F8F5EE]');
    expect(src).toContain("{ id: 'island', label: 'Island' }");
    expect(src).toContain("{ id: 'mainland', label: 'Mainland' }");
    expect(src).toContain("{ id: 'all', label: 'Anywhere' }");
    expect(src).toContain('Add check-in / out');
    expect(src).toContain('No card charged until the host confirms availability.');
    expect(src).toContain('· TITLE');
    expect(src).toContain('· IDENTITY');
    expect(src).toContain('· AUTHORITY');
    expect(src).toContain('· INSPECTION');

    // Horizontal chip rail pairs overflow-x-auto with overscroll-x-contain and iOS-safe 16px (text-base) form inputs
    expect(src).toContain('overflow-x-auto overscroll-x-contain');
    expect(src).toContain('text-base');

    // Mobile Partner CTA card in Midnight Navy (#0E1F3B) with Champagne Gold (#C9A45C) pill CTA
    expect(src).toContain(
      'List with HAMLET for visibility, booking and property management support.',
    );
    expect(src).toContain('bg-[#C9A45C]');
  });

  it('implements the full-viewport Warm Ivory mobile drawer and collapsible mobile accordion footer in SiteShell.tsx', () => {
    const shell = readFileSync(join(ROOT, 'src', 'components', 'site', 'SiteShell.tsx'), 'utf8');

    // Header avoids mobile backdrop-filter trap so fixed inset-0 drawer spans full h-dvh
    expect(shell).toContain('lg:backdrop-blur-xl');
    expect(shell).toContain('fixed inset-0 z-50 bg-[#F8F5EE]');
    expect(shell).toContain('h-dvh');
    expect(shell).toContain('M4 8h16M4 16h16');

    // Mobile drawer sections & items matching IMG_4341
    expect(shell).toContain('Ask Horatio');
    expect(shell).toContain('For Guests');
    expect(shell).toContain("{ href: '/stays', label: 'Explore stays' }");
    expect(shell).toContain("{ href: '/lagos', label: 'Lagos guide' }");
    expect(shell).toContain("{ href: '/how-it-works', label: 'How it works' }");
    expect(shell).toContain("{ href: '/safety', label: 'Safety' }");
    expect(shell).toContain("{ href: '/faqs', label: 'FAQs' }");
    expect(shell).toContain('For Hosts &amp; About');
    expect(shell).toContain("{ href: '/partners/apply', label: 'Partner with us' }");
    expect(shell).toContain("{ href: '/about', label: 'About HAMLET' }");

    // Mobile collapsible accordion footer matching IMG_4342 while keeping desktop 4-column grid
    expect(shell).toContain('footer-accordion-');
    expect(shell).toContain("isOpen ? '−' : '+'");
    expect(shell).toContain('hidden gap-8 md:grid md:grid-cols-4');
    expect(shell).toContain('hello@hamlet.rest');
  });
});
