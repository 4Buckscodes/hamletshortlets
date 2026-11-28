import { describe, expect, it } from 'vitest';
import {
  convertDomesticStayToEur,
  convertNairaToEur,
  CURRENCY_SYMBOLS,
  detectUserCurrency,
  formatCurrencyAmount,
  formatEur,
  formatMinorCurrency,
  formatStayAmount,
} from './currency';
import { calculateInternationalStayQuote } from './pricing';

describe('euro support', () => {
  it('detects euro-area visitors by country, timezone and language, and keeps the other currencies', () => {
    for (const country of ['FR', 'DE', 'IE', 'ES', 'IT', 'NL', 'PT', 'BE', 'AT', 'FI', 'GR', 'HR']) {
      expect(detectUserCurrency({ countryCode: country })).toBe('EUR');
    }
    expect(detectUserCurrency({ timeZone: 'Europe/Paris' })).toBe('EUR');
    expect(detectUserCurrency({ timeZone: 'Europe/Dublin', locales: ['en-GB'] })).toBe('EUR');
    expect(detectUserCurrency({ locales: ['de-DE'] })).toBe('EUR');
    expect(detectUserCurrency({ countryCode: 'GB' })).toBe('GBP');
    expect(detectUserCurrency({ countryCode: 'US' })).toBe('USD');
    // Countries outside the euro area that use other currencies are not switched to euros.
    expect(detectUserCurrency({ countryCode: 'CH', timeZone: 'Europe/Zurich', locales: [] })).toBe('NGN');
    // A device on Lagos time is still always naira.
    expect(detectUserCurrency({ countryCode: 'FR', timeZone: 'Africa/Lagos' })).toBe('NGN');
    expect(CURRENCY_SYMBOLS.EUR).toBe('€');
  });

  it('converts and buffers once, like the other foreign currencies', () => {
    // ₦200,000 at ₦2,000 per euro is €100, plus the 10% buffer is €110.
    expect(convertNairaToEur(200_000, 2000)).toBe(100);
    expect(convertDomesticStayToEur(200_000, 2000)).toBe(110);
    expect(formatStayAmount(200_000, 'EUR', { ngnPerEur: 2000 })).toBe('€110');
    expect(formatStayAmount(200_000, 'EUR', { ngnPerEur: 2000, applyInternationalBuffer: false })).toBe('€100');
    expect(formatEur(1234.5)).toBe('€1,234.50');
    expect(formatCurrencyAmount(110, 'EUR')).toBe('€110');
    expect(formatMinorCurrency(11_000, 'EUR')).toBe('€110');
  });

  it('never shows a euro price without a real rate', () => {
    expect(convertNairaToEur(200_000, 0)).toBe(0);
    expect(convertNairaToEur(200_000, -5)).toBe(0);
    expect(formatStayAmount(200_000, 'EUR')).toBe('₦200,000');
    expect(formatStayAmount(200_000, 'EUR', { ngnPerEur: 0 })).toBe('₦200,000');
  });

  it('falls back to naira when no active euro rate exists, and quotes when one does', () => {
    const none = calculateInternationalStayQuote({ domesticGuestAmountNgn: 200_000, currency: 'EUR', rateConfig: null });
    expect(none.ok).toBe(false);
    expect(none.currency).toBe('NGN');
    const inactive = calculateInternationalStayQuote({
      domesticGuestAmountNgn: 200_000,
      currency: 'EUR',
      rateConfig: { currency: 'EUR', currencyPair: 'NGN/EUR', ngnPerUnit: 2000, bufferRate: 0.1, source: 'test', isActive: false, effectiveAt: '2026-11-28T00:00:00Z', quotedAt: '2026-11-28T00:00:00Z', expiresAt: null },
    });
    expect(inactive.ok).toBe(false);
    const live = calculateInternationalStayQuote({
      domesticGuestAmountNgn: 200_000,
      currency: 'EUR',
      rateConfig: { currency: 'EUR', currencyPair: 'NGN/EUR', ngnPerUnit: 2000, bufferRate: 0.1, source: 'test', isActive: true, effectiveAt: '2026-11-28T00:00:00Z', quotedAt: '2026-11-28T00:00:00Z', expiresAt: null },
    });
    expect(live.ok).toBe(true);
    expect(live.currency).toBe('EUR');
    expect(live.quotedGuestTotal).toBe(110);
    expect(live.settlementTotalNgn).toBe(220_000);
  });
});
