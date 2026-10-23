import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  convertNairaToGbp,
  convertNairaToUsd,
  CURRENCY_ORDER,
  CURRENCY_SYMBOLS,
  DEFAULT_NGN_PER_GBP,
  DEFAULT_NGN_PER_USD,
  formatGbp,
  formatStayAmount,
  formatUsd,
} from './currency';
import { HAMLET_TAGLINE } from './brand';

const ROOT = resolve(process.cwd());

function collectFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      collectFiles(full, acc);
    } else if (/\.(ts|tsx|html)$/.test(entry) && !entry.endsWith('.test.ts')) {
      acc.push(full);
    }
  }
  return acc;
}

describe('Stay currency switcher (NGN ₦ <-> USD $ <-> GBP £)', () => {
  it('converts Naira stay amounts into USD and GBP accurately and formats all three currencies', () => {
    expect(CURRENCY_ORDER).toEqual(['NGN', 'USD', 'GBP']);
    expect(CURRENCY_SYMBOLS).toEqual({ NGN: '₦', USD: '$', GBP: '£' });

    expect(DEFAULT_NGN_PER_USD).toBe(1600);
    expect(convertNairaToUsd(160_000, 1600)).toBe(100);
    expect(convertNairaToUsd(200_000, 1600)).toBe(125);
    expect(convertNairaToUsd(185_000, 1600)).toBe(115.63);

    expect(DEFAULT_NGN_PER_GBP).toBe(2000);
    expect(convertNairaToGbp(200_000, 2000)).toBe(100);
    expect(convertNairaToGbp(185_000, 2000)).toBe(92.5);

    expect(formatUsd(100)).toBe('$100');
    expect(formatUsd(115.63)).toBe('$115.63');
    expect(formatGbp(100)).toBe('£100');
    expect(formatGbp(92.5)).toBe('£92.50');

    expect(formatStayAmount(160_000, 'NGN')).toBe('₦160,000');
    expect(formatStayAmount(160_000, 'USD', 1600)).toBe('$100');
    expect(formatStayAmount(185_000, 'USD', 1600)).toBe('$115.63');
    expect(formatStayAmount(200_000, 'GBP', 2000)).toBe('£100');
    expect(formatStayAmount(185_000, 'GBP', 2000)).toBe('£92.50');
  });

  it('wires CurrencyProvider and NGN/USD/GBP CurrencyToggle across guest stay discovery and booking views', () => {
    const appSrc = readFileSync(join(ROOT, 'src/App.tsx'), 'utf8');
    expect(appSrc).toContain('CurrencyProvider');

    const toggleSrc = readFileSync(join(ROOT, 'src/components/CurrencyToggle.tsx'), 'utf8');
    expect(toggleSrc).toContain('GBP');
    expect(toggleSrc).toContain('£');

    for (const rel of [
      'src/components/Navbar.tsx',
      'src/components/PropertyCard.tsx',
      'src/pages/Home.tsx',
      'src/pages/Lagos.tsx',
      'src/pages/Stays.tsx',
      'src/pages/PropertyDetail.tsx',
      'src/pages/Account.tsx',
    ]) {
      const content = readFileSync(join(ROOT, rel), 'utf8');
      expect(content, `${rel} should expose currency switching or formatting`).toMatch(/CurrencyToggle|useCurrency/);
    }
  });
});

describe('HAMLET Website Copy & Lagos-only scope', () => {
  it('applies the "Your stay, sorted." brand platform and registers Lagos & supporting pages', () => {
    expect(HAMLET_TAGLINE).toBe('Your stay, sorted.');

    const indexHtml = readFileSync(join(ROOT, 'index.html'), 'utf8');
    expect(indexHtml).toContain('HAMLET Shortlets | Find Your Next Stay in Lagos');
    expect(indexHtml).toContain('Your stay, sorted.');

    const appSrc = readFileSync(join(ROOT, 'src/App.tsx'), 'utf8');
    for (const route of ['/lagos', '/about', '/how-it-works', '/safety', '/faqs']) {
      expect(appSrc).toContain(`path="${route}"`);
    }
  });

  it('excludes unavailable cities (Abuja and Ibadan) from all frontend pages and HTML', () => {
    const files = [...collectFiles(join(ROOT, 'src')), join(ROOT, 'index.html')];
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      expect(content, `${file} should not mention Abuja or Ibadan`).not.toMatch(/\babuja\b|\bibadan\b/i);
    }
  });
});
