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
  detectUserCurrency,
  formatGbp,
  formatStayAmount,
  formatUsd,
} from './currency';
import { HAMLET_TAGLINE } from './brand';
import {
  ISLAND_AND_LEKKI_AREAS,
  isMainlandProperty,
  LAGOS_AREAS,
  MAINLAND_AREAS,
  matchesLagosAreaFilter,
} from './areas';

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

describe('Automatic guest currency detection & conversion (NGN ₦ / USD $ / GBP £)', () => {
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

    // Stay amounts in USD/GBP apply the 10% international buffer ONCE (§6.1);
    // refundable caution deposits use applyInternationalBuffer: false (0% buffer).
    expect(formatStayAmount(160_000, 'NGN')).toBe('₦160,000');
    expect(formatStayAmount(160_000, 'USD', 1600)).toBe('$110'); // $100 converted base × 1.10 = $110
    expect(formatStayAmount(320_000, 'USD', 1600)).toBe('$220'); // $200 converted base × 1.10 = $220
    expect(formatStayAmount(200_000, 'GBP', 2000)).toBe('£110'); // £100 converted base × 1.10 = £110
    expect(formatStayAmount(400_000, 'GBP', 2000)).toBe('£220'); // £200 converted base × 1.10 = £220
    expect(formatStayAmount(160_000, 'USD', { ngnPerUsd: 1600, applyInternationalBuffer: false })).toBe('$100');
    expect(formatStayAmount(200_000, 'GBP', { ngnPerGbp: 2000, applyInternationalBuffer: false })).toBe('£100');
  });

  it('detects NGN, GBP, and USD automatically from geo country, timezone, and browser locale', () => {
    // Authoritative geo country takes precedence (e.g. Lagos visitor whose phone OS is set to en-US)
    expect(
      detectUserCurrency({
        countryCode: 'NG',
        timeZone: 'Africa/Lagos',
        locales: ['en-US'],
      }),
    ).toBe('NGN');
    expect(detectUserCurrency({ countryCode: 'GB', locales: ['en-US'] })).toBe('GBP');
    expect(detectUserCurrency({ countryCode: 'US', locales: ['en-GB'] })).toBe('USD');
    expect(detectUserCurrency({ countryCode: 'CA' })).toBe('USD');

    // Without geo headers, Africa/Lagos timezone resolves to NGN even if browser language is en-GB/en-US
    expect(
      detectUserCurrency({
        timeZone: 'Africa/Lagos',
        locales: ['en-GB'],
      }),
    ).toBe('NGN');

    // UK timezone / locale resolves to GBP
    expect(
      detectUserCurrency({
        timeZone: 'Europe/London',
        locales: ['en-GB'],
      }),
    ).toBe('GBP');

    // US timezone / locale resolves to USD
    expect(
      detectUserCurrency({
        timeZone: 'America/New_York',
        locales: ['en-US'],
      }),
    ).toBe('USD');

    // Unrecognized signals fall back safely to NGN
    expect(detectUserCurrency({})).toBe('NGN');
  });

  it('removes manual guest-facing currency switcher UI while wiring CurrencyProvider and useCurrency', () => {
    const shellSrc = readFileSync(join(ROOT, 'src/components/site/SiteShell.tsx'), 'utf8');
    expect(shellSrc).toContain('CurrencyProvider');
    expect(shellSrc).not.toContain('Display prices in');
    expect(shellSrc).not.toContain('<NextCurrencySwitcher');

    const toggleSrc = readFileSync(join(ROOT, 'src/components/CurrencyToggle.tsx'), 'utf8');
    expect(toggleSrc).toContain('return null');
    expect(toggleSrc).not.toContain('Display prices in');

    for (const rel of [
      'src/components/site/SiteShell.tsx',
      'src/components/site/DiscoveryMarketplace.tsx',
      'app/stays/[id]/booking-request-form.tsx',
    ]) {
      const content = readFileSync(join(ROOT, rel), 'utf8');
      expect(content, `${rel} should format prices via useCurrency`).toContain('useCurrency');
    }
  });
});

describe('Lagos Mainland & Island corridor support', () => {
  it('includes Yaba, Shomolu, Surulere, Ikeja GRA, Ikate, and key corridors in canonical Lagos areas', () => {
    for (const area of ['Lagos Mainland', 'Yaba', 'Shomolu', 'Surulere', 'Gbagada', 'Maryland', 'Ilupeju', 'Ebute Metta', 'Ogudu', 'Magodo', 'Ikeja GRA']) {
      expect(MAINLAND_AREAS).toContain(area);
      expect(LAGOS_AREAS).toContain(area);
    }
    for (const area of ['Lekki Phase 1', 'Ikate', 'Victoria Island', 'Ikoyi', 'Ajah']) {
      expect(ISLAND_AND_LEKKI_AREAS).toContain(area);
      expect(LAGOS_AREAS).toContain(area);
    }
  });

  it('matches umbrella "Lagos Mainland" filter across Yaba, Shomolu/Somolu, Surulere, and environs while excluding Island stays and missing locations', () => {
    const yabaFlat = { area: 'Yaba', address: '18 Hughes Avenue, Alagomeji, Yaba', title: 'Alagomeji 2-Bed' };
    const shomoluSuite = { area: 'Shomolu', address: '7 Oguntona Crescent, Palmgrove / Onipanu', title: 'Palmgrove Suite' };
    const surulereApt = { area: 'Surulere', address: '42 Bode Thomas Street, Surulere', title: 'Bode Thomas Executive' };
    const gbagadaApt = { area: 'Gbagada', address: '12 Medina Estate, Gbagada', title: 'Medina Flat' };
    const viPenthouse = { area: 'Victoria Island', address: '14 Adeola Odeku, VI', title: 'Sky Residence' };
    const missingLocation = { area: '', address: '', title: 'Victoria Island Style Suite' };

    expect(isMainlandProperty(yabaFlat)).toBe(true);
    expect(isMainlandProperty(shomoluSuite)).toBe(true);
    expect(isMainlandProperty(surulereApt)).toBe(true);
    expect(isMainlandProperty(gbagadaApt)).toBe(true);
    expect(isMainlandProperty(viPenthouse)).toBe(false);
    expect(isMainlandProperty(missingLocation)).toBe(false);

    expect(matchesLagosAreaFilter(yabaFlat, 'Lagos Mainland')).toBe(true);
    expect(matchesLagosAreaFilter(shomoluSuite, 'Lagos Mainland')).toBe(true);
    expect(matchesLagosAreaFilter(surulereApt, 'Lagos Mainland')).toBe(true);
    expect(matchesLagosAreaFilter(gbagadaApt, 'Lagos Mainland')).toBe(true);
    expect(matchesLagosAreaFilter(viPenthouse, 'Lagos Mainland')).toBe(false);
    expect(matchesLagosAreaFilter(missingLocation, 'Victoria Island')).toBe(false);

    // Spelling/sub-area matching (Somolu <-> Shomolu / Palmgrove, Sabo -> Yaba, Bode Thomas -> Surulere)
    expect(matchesLagosAreaFilter(shomoluSuite, 'Somolu')).toBe(true);
    expect(matchesLagosAreaFilter({ area: 'Lagos Mainland', address: 'Sabo, Yaba', title: 'Sabo Studio' }, 'Yaba')).toBe(true);
    expect(matchesLagosAreaFilter(surulereApt, 'Surulere')).toBe(true);
  });

  it('surfaces Lagos Mainland, Yaba, Shomolu, and Surulere across App Router discovery and legacy bridge', () => {
    for (const rel of ['app/home-slideshow.tsx', 'src/lib/discovery.ts', 'src/legacy-pages/Home.tsx', 'src/legacy-pages/Lagos.tsx', 'src/legacy-pages/Stays.tsx']) {
      const content = readFileSync(join(ROOT, rel), 'utf8');
      expect(content).toContain('Yaba');
      expect(content).toContain('Shomolu');
      expect(content).toContain('Surulere');
    }
  });
});

describe('HAMLET Website Copy & Lagos-only scope', () => {
  it('applies the "Your stay, sorted." brand platform and keeps Four Pillars on About rather than Homepage', () => {
    expect(HAMLET_TAGLINE).toBe('Your stay, sorted.');

    const indexHtml = readFileSync(join(ROOT, 'index.html'), 'utf8');
    expect(indexHtml).toContain('HAMLET Shortlets | Find Your Next Stay in Lagos');
    expect(indexHtml).toContain('Your stay, sorted.');

    const nextHomeSrc = readFileSync(join(ROOT, 'app/home-slideshow.tsx'), 'utf8');
    const nextAboutSrc = readFileSync(join(ROOT, 'app/about/page.tsx'), 'utf8');
    expect(nextHomeSrc).toContain('Find a stay that feels like');
    expect(nextHomeSrc).not.toContain('Your stay'); // Tagline remains in metadata; the homepage hero stays concise.
    expect(nextHomeSrc).not.toMatch(/Four pillars of a better stay/i);
    expect(nextAboutSrc).toMatch(/Four pillars of a better stay/i);
  });

  it('excludes unavailable cities (Abuja and Ibadan) from all frontend pages and HTML', () => {
    const files = [
      ...collectFiles(join(ROOT, 'src')),
      ...collectFiles(join(ROOT, 'app')),
      join(ROOT, 'index.html'),
    ];
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      expect(content, `${file} should not mention Abuja or Ibadan`).not.toMatch(/\babuja\b|\bibadan\b/i);
    }
  });
});
