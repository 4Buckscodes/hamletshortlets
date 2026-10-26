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
import {
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

  it('wires CurrencyProvider and NGN/USD/GBP CurrencyToggle across guest stay discovery and booking views', () => {
    const appSrc = readFileSync(join(ROOT, 'src/App.tsx'), 'utf8');
    expect(appSrc).toContain('CurrencyProvider');

    const toggleSrc = readFileSync(join(ROOT, 'src/components/CurrencyToggle.tsx'), 'utf8');
    expect(toggleSrc).toContain('GBP');
    expect(toggleSrc).toContain('£');

    for (const rel of [
      'src/components/Navbar.tsx',
      'src/components/PropertyCard.tsx',
      'src/legacy-pages/Home.tsx',
      'src/legacy-pages/Lagos.tsx',
      'src/legacy-pages/Stays.tsx',
      'src/legacy-pages/PropertyDetail.tsx',
      'src/legacy-pages/Account.tsx',
    ]) {
      const content = readFileSync(join(ROOT, rel), 'utf8');
      expect(content, `${rel} should expose currency switching or formatting`).toMatch(/CurrencyToggle|useCurrency/);
    }
  });
});

describe('Lagos Mainland (Yaba, Shomolu, Surulere & environs) support', () => {
  it('includes Yaba, Shomolu, Surulere, and surrounding Mainland environs in canonical Lagos areas', () => {
    for (const area of ['Lagos Mainland', 'Yaba', 'Shomolu', 'Surulere', 'Gbagada', 'Maryland', 'Ilupeju', 'Ebute Metta', 'Ogudu', 'Magodo', 'Ikeja GRA']) {
      expect(MAINLAND_AREAS).toContain(area);
      expect(LAGOS_AREAS).toContain(area);
    }
  });

  it('matches umbrella "Lagos Mainland" filter across Yaba, Shomolu/Somolu, Surulere, and environs while excluding Island stays', () => {
    const yabaFlat = { area: 'Yaba', address: '18 Hughes Avenue, Alagomeji, Yaba', title: 'Alagomeji 2-Bed' };
    const shomoluSuite = { area: 'Shomolu', address: '7 Oguntona Crescent, Palmgrove / Onipanu', title: 'Palmgrove Suite' };
    const surulereApt = { area: 'Surulere', address: '42 Bode Thomas Street, Surulere', title: 'Bode Thomas Executive' };
    const gbagadaApt = { area: 'Gbagada', address: '12 Medina Estate, Gbagada', title: 'Medina Flat' };
    const viPenthouse = { area: 'Victoria Island', address: '14 Adeola Odeku, VI', title: 'Sky Residence' };

    expect(isMainlandProperty(yabaFlat)).toBe(true);
    expect(isMainlandProperty(shomoluSuite)).toBe(true);
    expect(isMainlandProperty(surulereApt)).toBe(true);
    expect(isMainlandProperty(gbagadaApt)).toBe(true);
    expect(isMainlandProperty(viPenthouse)).toBe(false);

    expect(matchesLagosAreaFilter(yabaFlat, 'Lagos Mainland')).toBe(true);
    expect(matchesLagosAreaFilter(shomoluSuite, 'Lagos Mainland')).toBe(true);
    expect(matchesLagosAreaFilter(surulereApt, 'Lagos Mainland')).toBe(true);
    expect(matchesLagosAreaFilter(gbagadaApt, 'Lagos Mainland')).toBe(true);
    expect(matchesLagosAreaFilter(viPenthouse, 'Lagos Mainland')).toBe(false);

    // Spelling/sub-area matching (Somolu <-> Shomolu / Palmgrove, Sabo -> Yaba, Bode Thomas -> Surulere)
    expect(matchesLagosAreaFilter(shomoluSuite, 'Somolu')).toBe(true);
    expect(matchesLagosAreaFilter({ area: 'Lagos Mainland', address: 'Sabo, Yaba', title: 'Sabo Studio' }, 'Yaba')).toBe(true);
    expect(matchesLagosAreaFilter(surulereApt, 'Surulere')).toBe(true);
  });

  it('surfaces Lagos Mainland, Yaba, Shomolu, and Surulere across Home, Lagos guide, and Stays', () => {
    for (const rel of ['src/legacy-pages/Home.tsx', 'src/legacy-pages/Lagos.tsx', 'src/legacy-pages/Stays.tsx']) {
      const content = readFileSync(join(ROOT, rel), 'utf8');
      expect(content).toContain('Lagos Mainland');
      expect(content).toContain('Yaba');
      expect(content).toContain('Shomolu');
      expect(content).toContain('Surulere');
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

    const homeSrc = readFileSync(join(ROOT, 'src/legacy-pages/Home.tsx'), 'utf8');
    const aboutSrc = readFileSync(join(ROOT, 'src/legacy-pages/About.tsx'), 'utf8');
    expect(homeSrc).not.toMatch(/Four pillars of a better stay/i);
    expect(homeSrc).not.toContain('A good stay is about more than beautiful pictures.');
    expect(aboutSrc).toMatch(/Four pillars of a better stay/i);
    expect(aboutSrc).toContain('A good stay is about more than beautiful pictures.');
  });

  it('excludes unavailable cities (Abuja and Ibadan) from all frontend pages and HTML', () => {
    const files = [...collectFiles(join(ROOT, 'src')), join(ROOT, 'index.html')];
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      expect(content, `${file} should not mention Abuja or Ibadan`).not.toMatch(/\babuja\b|\bibadan\b/i);
    }
  });
});
