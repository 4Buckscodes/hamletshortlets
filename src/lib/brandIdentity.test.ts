import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HAMLET_PROMISE, HAMLET_TAGLINE } from './brand';

const ROOT = resolve(process.cwd());

describe('HAMLET Brand Identity (Palette, Typography & Monogram Logo)', () => {
  it('defines Midnight Navy, Champagne Gold, Warm Ivory, and Slate Grey tokens in index.css', () => {
    const css = readFileSync(join(ROOT, 'src/index.css'), 'utf8');

    // Approved V0 palette: Forest ink (#172119), Lime accent (#C5DE3F), Warm Ivory (#F6F1E7), Muted grey (#5B655A, 5.4:1 on ivory)
    expect(css).toContain('--color-ink-900: #1e2321;');
    expect(css).toContain('--color-brass-600: #17525a;');
    expect(css).toContain('--color-paper: #f4f3ef;');
    expect(css).toContain('--color-ink-500: #5f665f;');
    expect(css).toContain('--color-jade-700: #103e45;');

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

    expect(logoSrc).toContain('#172119');
    expect(logoSrc).toContain('#FFFFFF');
    expect(logoSrc).toContain('#D9F24B');
    expect(logoSrc).toContain('linearGradient');

    expect(faviconSvg).toContain('#172119');
    expect(faviconSvg).toContain('#FFFFFF');
    expect(faviconSvg).toContain('#D9F24B');
    for (const retired of [/#0E1F3B/i, /#C9A44A/i, /#121F3C/i]) {
      expect(logoSrc).not.toMatch(retired);
      expect(faviconSvg).not.toMatch(retired);
    }

    expect(manifest.background_color).toBe('#F6F1E7');
    expect(manifest.theme_color).toBe('#172119');
    expect(indexHtml).toContain('<meta name="theme-color" content="#172119" />');
  });

  it('preserves existing HAMLET website wording and tagline unchanged', () => {
    expect(HAMLET_TAGLINE).toBe('Your stay, sorted.');
    expect(HAMLET_PROMISE).toBe('A better way to find, book, and enjoy shortlets in Lagos.');
  });
});
