/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { formatNaira } from './pricing';

export type DisplayCurrency = 'NGN' | 'USD' | 'GBP';

/** Indicative reference rates used to display USD ($) and GBP (£) equivalents for stay prices. */
export const DEFAULT_NGN_PER_USD = 1600;
export const DEFAULT_NGN_PER_GBP = 2000;

export const CURRENCY_ORDER: readonly DisplayCurrency[] = ['NGN', 'USD', 'GBP'] as const;

export const CURRENCY_SYMBOLS: Record<DisplayCurrency, string> = {
  NGN: '₦',
  USD: '$',
  GBP: '£',
};

const STORAGE_KEY = 'hamlet_display_currency_v1';

export function convertNairaToUsd(amountNgn: number, ngnPerUsd: number = DEFAULT_NGN_PER_USD): number {
  if (!Number.isFinite(amountNgn) || amountNgn === 0) return 0;
  const safeRate = ngnPerUsd > 0 ? ngnPerUsd : DEFAULT_NGN_PER_USD;
  return Math.round((amountNgn / safeRate) * 100) / 100;
}

export function convertNairaToGbp(amountNgn: number, ngnPerGbp: number = DEFAULT_NGN_PER_GBP): number {
  if (!Number.isFinite(amountNgn) || amountNgn === 0) return 0;
  const safeRate = ngnPerGbp > 0 ? ngnPerGbp : DEFAULT_NGN_PER_GBP;
  return Math.round((amountNgn / safeRate) * 100) / 100;
}

export function formatUsd(amountUsd: number, opts?: { roundWhole?: boolean }): string {
  if (!Number.isFinite(amountUsd) || amountUsd === 0) return '$0';
  const rounded = opts?.roundWhole ? Math.round(amountUsd) : Math.round(amountUsd * 100) / 100;
  const isWhole = Number.isInteger(rounded);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: isWhole ? 0 : 2,
  }).format(rounded);
}

export function formatGbp(amountGbp: number, opts?: { roundWhole?: boolean }): string {
  if (!Number.isFinite(amountGbp) || amountGbp === 0) return '£0';
  const rounded = opts?.roundWhole ? Math.round(amountGbp) : Math.round(amountGbp * 100) / 100;
  const isWhole = Number.isInteger(rounded);
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: isWhole ? 0 : 2,
  }).format(rounded);
}

export function formatStayAmount(
  amountNgn: number,
  currency: DisplayCurrency,
  opts?: number | { ngnPerUsd?: number; ngnPerGbp?: number; roundWhole?: boolean; roundUsd?: boolean },
): string {
  const roundWhole =
    typeof opts === 'object' ? (opts?.roundWhole ?? opts?.roundUsd) : undefined;
  if (currency === 'USD') {
    const ngnPerUsd = typeof opts === 'number' ? opts : (opts?.ngnPerUsd ?? DEFAULT_NGN_PER_USD);
    const usd = convertNairaToUsd(amountNgn, ngnPerUsd);
    return formatUsd(usd, { roundWhole });
  }
  if (currency === 'GBP') {
    const ngnPerGbp = typeof opts === 'number' ? opts : (opts?.ngnPerGbp ?? DEFAULT_NGN_PER_GBP);
    const gbp = convertNairaToGbp(amountNgn, ngnPerGbp);
    return formatGbp(gbp, { roundWhole });
  }
  return formatNaira(amountNgn);
}

interface CurrencyContextValue {
  currency: DisplayCurrency;
  currencySymbol: string;
  ngnPerUsd: number;
  ngnPerGbp: number;
  ngnPerUnit: number;
  setCurrency: (next: DisplayCurrency) => void;
  toggleCurrency: () => void;
  formatPrice: (amountNgn: number, opts?: { roundWhole?: boolean; roundUsd?: boolean }) => string;
  formatMoney: (amountNgn: number, opts?: { roundWhole?: boolean; roundUsd?: boolean }) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function readInitialCurrency(): DisplayCurrency {
  try {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === 'NGN' || saved === 'USD' || saved === 'GBP') return saved;
    }
  } catch {
    // Ignore storage access errors in restricted browsing contexts.
  }
  return 'NGN';
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<DisplayCurrency>(readInitialCurrency);

  const setCurrency = useCallback((next: DisplayCurrency) => {
    setCurrencyState(next);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, next);
      }
    } catch {
      // Ignore storage write errors.
    }
  }, []);

  const toggleCurrency = useCallback(() => {
    setCurrencyState(prev => {
      const idx = CURRENCY_ORDER.indexOf(prev);
      const next: DisplayCurrency = CURRENCY_ORDER[(idx + 1) % CURRENCY_ORDER.length];
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, next);
        }
      } catch {
        // Ignore storage write errors.
      }
      return next;
    });
  }, []);

  const formatPrice = useCallback(
    (amountNgn: number, opts?: { roundWhole?: boolean; roundUsd?: boolean }) =>
      formatStayAmount(amountNgn, currency, {
        ngnPerUsd: DEFAULT_NGN_PER_USD,
        ngnPerGbp: DEFAULT_NGN_PER_GBP,
        roundWhole: opts?.roundWhole ?? opts?.roundUsd,
      }),
    [currency],
  );

  const ngnPerUnit =
    currency === 'USD' ? DEFAULT_NGN_PER_USD : currency === 'GBP' ? DEFAULT_NGN_PER_GBP : 1;

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      currencySymbol: CURRENCY_SYMBOLS[currency],
      ngnPerUsd: DEFAULT_NGN_PER_USD,
      ngnPerGbp: DEFAULT_NGN_PER_GBP,
      ngnPerUnit,
      setCurrency,
      toggleCurrency,
      formatPrice,
      formatMoney: formatPrice,
    }),
    [currency, ngnPerUnit, setCurrency, toggleCurrency, formatPrice],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return ctx;
}
