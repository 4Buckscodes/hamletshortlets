import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HAMLET_PROMISE, HAMLET_TAGLINE } from './brand';

const ROOT = resolve(process.cwd());

describe('HAMLET Brand Identity (Lagos hospitality palette, typography & monogram)', () => {
  it('defines forest, brass and warm ivory design tokens in index.css', () => {
    const css = readFileSync(join(ROOT, 'src/index.css'), 'utf8');
    expect(css).toContain('--color-ink-900: #173F32;');
    expect(css).toContain('--color-ink-950: #102D24;');
    expect(css).toContain('--color-brass-500: #B58A52;');
    expect(css).toContain('--color-paper: #F7F4ED;');
    expect(css).toContain('--color-clay: #E8E6DD;');
    expect(css).toContain('--color-jade-700: #173F32;');
    expect(css).toContain('"Playfair Display Variable"');
    expect(css).toContain('"Inter Variable"');
  });

  it('loads Playfair Display and Inter variable fonts in the Next.js layout', () => {
    const layoutSrc = readFileSync(join(ROOT, 'app/layout.tsx'), 'utf8');
    expect(layoutSrc).toContain("@fontsource-variable/playfair-display");
    expect(layoutSrc).toContain("@fontsource-variable/inter");
  });

  it('uses the forest-green HAMLET monogram and brass crossbar', () => {
    const logoSrc = readFileSync(join(ROOT, 'src/components/Logo.tsx'), 'utf8');
    expect(logoSrc).toContain('#173F32');
    expect(logoSrc).toContain('#FFFFFF');
    expect(logoSrc).toContain('#B58A52');
    expect(logoSrc).toContain('linearGradient');
  });

  it('preserves the HAMLET tagline and Lagos promise', () => {
    expect(HAMLET_TAGLINE).toBe('Your stay, sorted.');
    expect(HAMLET_PROMISE).toBe('A better way to find, book, and enjoy shortlets in Lagos.');
  });
});
