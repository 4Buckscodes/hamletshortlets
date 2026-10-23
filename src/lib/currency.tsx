/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { formatNaira } from './pricing';

export type DisplayCurrency = 'NGN' | 'USD';

/** Indicative reference rate used to display USD equivalents for stay prices (₦1,600 = $1 USD). */
export const DEFAULT_NGN_PER_USD = 1600;

const STORAGE_KEY = 'hamlet_display_currency_v1';

export function convertNairaToUsd(amountNgn: number, ngnPerUsd: number = DEFAULT_NGN_PER_USD): number {
  if (!Number.isFinite(amountNgn) || amountNgn === 0) return 0;
  const safeRate = ngnPerUsd > 0 ? ngnPerUsd : DEFAULT_NGN_PER_USD;
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

export function formatStayAmount(
  amountNgn: number,
  currency: DisplayCurrency,
  opts?: number | { ngnPerUsd?: number; roundUsd?: boolean },
): string {
  const ngnPerUsd = typeof opts === 'number' ? opts : (opts?.ngnPerUsd ?? DEFAULT_NGN_PER_USD);
  const roundUsd = typeof opts === 'object' ? opts?.roundUsd : undefined;
  if (currency === 'USD') {
    const usd = convertNairaToUsd(amountNgn, ngnPerUsd);
    return formatUsd(usd, { roundWhole: roundUsd });
  }
  return formatNaira(amountNgn);
}

interface CurrencyContextValue {
  currency: DisplayCurrency;
  ngnPerUsd: number;
  setCurrency: (next: DisplayCurrency) => void;
  toggleCurrency: () => void;
  formatPrice: (amountNgn: number, opts?: { roundUsd?: boolean }) => string;
  formatMoney: (amountNgn: number, opts?: { roundUsd?: boolean }) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function readInitialCurrency(): DisplayCurrency {
  try {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === 'USD' || saved === 'NGN') return saved;
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
      const next: DisplayCurrency = prev === 'NGN' ? 'USD' : 'NGN';
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
    (amountNgn: number, opts?: { roundUsd?: boolean }) =>
      formatStayAmount(amountNgn, currency, { ngnPerUsd: DEFAULT_NGN_PER_USD, roundUsd: opts?.roundUsd }),
    [currency],
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      ngnPerUsd: DEFAULT_NGN_PER_USD,
      setCurrency,
      toggleCurrency,
      formatPrice,
      formatMoney: formatPrice,
    }),
    [currency, setCurrency, toggleCurrency, formatPrice],
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
