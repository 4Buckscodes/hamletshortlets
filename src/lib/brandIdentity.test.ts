import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HAMLET_PROMISE, HAMLET_TAGLINE } from './brand';

const ROOT = resolve(process.cwd());

describe('HAMLET Brand Identity (Palette, Typography & Monogram Logo)', () => {
  it('defines Midnight Navy, Champagne Gold, Warm Ivory, and Slate Grey tokens in index.css', () => {
    const css = readFileSync(join(ROOT, 'src/index.css'), 'utf8');

    // Primary Midnight Navy (#0E1F3B), Champagne Gold (#C9A44A), Warm Ivory (#F8F5EE), Slate Grey (#64748B)
    expect(css).toContain('--color-ink-900: #0E1F3B;');
    expect(css).toContain('--color-brass-500: #C9A44A;');
    expect(css).toContain('--color-paper: #F8F5EE;');
    expect(css).toContain('--color-ink-500: #64748B;');
    expect(css).toContain('--color-jade-700: #0E1F3B;');

    // Typography: Playfair Display for headlines/serif & Inter for body/UI sans-serif
    expect(css).toContain('"Playfair Display Variable"');
    expect(css).toContain('"Playfair Display"');
    expect(css).toContain('"Inter Variable"');
    expect(css).toContain('"Inter"');
    expect(css).not.toMatch(/Fraunces|Public Sans/i);
  });

  it('loads Playfair Display and Inter variable fonts in main.tsx', () => {
    const mainSrc = readFileSync(join(ROOT, 'src/main.tsx'), 'utf8');
    expect(mainSrc).toContain('@fontsource-variable/playfair-display');
    expect(mainSrc).toContain('@fontsource-variable/inter');
    expect(mainSrc).not.toMatch(/fraunces|public-sans/i);
  });

  it('uses the HAMLET serif H monogram with Champagne Gold crossbar in Logo.tsx and favicon.svg', () => {
    const logoSrc = readFileSync(join(ROOT, 'src/components/Logo.tsx'), 'utf8');
    const faviconSvg = readFileSync(join(ROOT, 'public/favicon.svg'), 'utf8');
    const manifest = JSON.parse(readFileSync(join(ROOT, 'public/site.webmanifest'), 'utf8')) as {
      background_color: string;
      theme_color: string;
    };
    const indexHtml = readFileSync(join(ROOT, 'index.html'), 'utf8');

    expect(logoSrc).toContain('#0E1F3B');
    expect(logoSrc).toContain('#FFFFFF');
    expect(logoSrc).toContain('#C9A44A');
    expect(logoSrc).toContain('linearGradient');

    expect(faviconSvg).toContain('#0E1F3B');
    expect(faviconSvg).toContain('#FFFFFF');
    expect(faviconSvg).toContain('#C9A44A');

    expect(manifest.background_color).toBe('#F8F5EE');
    expect(manifest.theme_color).toBe('#0E1F3B');
    expect(indexHtml).toContain('<meta name="theme-color" content="#0E1F3B" />');
  });

  it('preserves existing HAMLET website wording and tagline unchanged', () => {
    expect(HAMLET_TAGLINE).toBe('Your stay, sorted.');
    expect(HAMLET_PROMISE).toBe('A better way to find, book, and enjoy shortlets in Lagos.');
  });
});
