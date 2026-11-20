import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HAMLET_PROMISE, HAMLET_TAGLINE } from './brand';

const ROOT = resolve(process.cwd());

describe('HAMLET Brand Identity (Palette, Typography & Monogram Logo)', () => {
  it('defines Midnight Navy, Champagne Gold, Warm Ivory, and Slate Grey tokens in index.css', () => {
    const css = readFileSync(join(ROOT, 'src/index.css'), 'utf8');

    // Approved V0 palette: Midnight navy (#0E1F3B), Champagne gold (#B8923A), warm stone (#F4F3EF)
    expect(css).toContain('--color-ink-900: #0e1f3b;');
    expect(css).toContain('--color-brass-500: #b8923a;');
    expect(css).toContain('--color-paper: #f4f3ef;');
    expect(css).toContain('--color-ink-500: #5f6a7c;');
    expect(css).toContain('--color-jade-700: #0e1f3b;');

    // Typography: Playfair Display for headlines/serif & Inter for body/UI sans-serif
    expect(css).toContain('"Newsreader Variable"');
    expect(css).toContain('"Newsreader"');
    expect(css).toContain('"Hanken Grotesk Variable"');
    expect(css).toContain('"Hanken Grotesk"');
    expect(css).not.toMatch(/Fraunces|Public Sans/i);
  });

  it('loads Playfair Display and Inter variable fonts in main.tsx', () => {
    const mainSrc = readFileSync(join(ROOT, 'src/main.tsx'), 'utf8');
    expect(mainSrc).toContain('@fontsource-variable/playfair-display');
    expect(mainSrc).toContain('@fontsource-variable/inter');
    expect(mainSrc).not.toMatch(/fraunces|public-sans/i);
  });

  it('uses the HAMLET serif H monogram with a lime crossbar on forest in Logo.tsx and favicon.svg', () => {
    const logoSrc = readFileSync(join(ROOT, 'src/components/Logo.tsx'), 'utf8');
    const faviconSvg = readFileSync(join(ROOT, 'public/favicon.svg'), 'utf8');
    const manifest = JSON.parse(readFileSync(join(ROOT, 'public/site.webmanifest'), 'utf8')) as {
      background_color: string;
      theme_color: string;
    };
    const indexHtml = readFileSync(join(ROOT, 'index.html'), 'utf8');

    expect(logoSrc).toContain('#0E1F3B');
    expect(logoSrc).toContain('#B8923A');
    expect(logoSrc).not.toContain('Gradient');

    expect(faviconSvg).toContain('#0E1F3B');
    expect(faviconSvg).toContain('#D4B268');
    expect(faviconSvg).not.toContain('Gradient');
    for (const retired of [/#D9F24B/i, /#172119/i, /#C9A44A/i]) {
      expect(logoSrc).not.toMatch(retired);
      expect(faviconSvg).not.toMatch(retired);
    }

    expect(manifest.background_color).toBe('#F4F3EF');
    expect(manifest.theme_color).toBe('#0E1F3B');
    expect(indexHtml).toContain('<meta name="theme-color" content="#0E1F3B" />');
  });

  it('preserves existing HAMLET website wording and tagline unchanged', () => {
    expect(HAMLET_TAGLINE).toBe('Your stay, sorted.');
    expect(HAMLET_PROMISE).toBe('A better way to find, book, and enjoy shortlets in Lagos.');
  });
});
