import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), 'utf8');
const hero = read('app/v0-home-experience.tsx');
const css = read('src/components/ui/home.css');
const NO_PREFERENCE = '@media (prefers-reduced-motion: no-preference)';

describe('homepage hero motion', () => {
  it('plays the entrance in CSS, off the loading path, and only when motion is allowed', () => {
    const motion = css.slice(css.indexOf(NO_PREFERENCE));
    // No script is needed for the entrance, and the hero photo is never hidden from the browser.
    expect(hero).not.toContain("from 'gsap'");
    expect(motion).toContain('.hp-word-in { animation: hp-rise');
    expect(motion).toContain('.hp-hero-frame::after');
    expect(motion).toContain('hp-curtain');
    expect(css).not.toMatch(/clip-path:\s*inset\(100%/);
    expect(css).not.toContain('hp-live');
    // The hover-only depth effect starts when idle, is throttled, and is removed on unmount.
    expect(hero).toContain('requestIdleCallback');
    expect(hero).toContain('requestAnimationFrame');
    expect(hero).toContain("removeEventListener('pointermove'");
    expect(hero).toContain('fetchPriority="high"');
    expect(hero).not.toMatch(/scale-105/);
    expect(hero).not.toMatch(/transition-all duration-1000 ease-out/);
    expect(hero).not.toMatch(/transition-transform/);
  });

  it('keeps every hero animation inside the no-preference media query', () => {
    const start = css.indexOf('/* Hero motion');
    const before = css.slice(start, css.indexOf(NO_PREFERENCE, start));
    expect(before).not.toMatch(/animation\s*:/);
    expect(css).toContain('hp-breathe');
  });

  it('moves the picture, not the img, for pointer depth so scroll parallax keeps working', () => {
    expect(css).toMatch(/\.hp-hero-frame picture \{ translate: var\(--hx/);
    expect(css).not.toMatch(/\.hp-hero-frame img \{ translate:/);
  });

  it('keeps the search button inside its fields (no hover scale poking past the edges)', () => {
    expect(css).toMatch(/\.hp-search-submit \{ transform: none !important; \}/);
  });

  it('does not repeat itself: the intro line adds new information', () => {
    const lede = hero.match(/<p className="hp-lede">([^<]*)<\/p>/)?.[1] ?? '';
    expect(lede.length).toBeGreaterThan(0);
    // The eyebrow already says "Verified shortlets in Lagos" and the headline starts with "Find".
    expect(lede).not.toMatch(/verified/i);
    expect(lede).not.toMatch(/\bfind\b/i);
    expect(lede).not.toMatch(/\bLagos\b/);
  });
});
