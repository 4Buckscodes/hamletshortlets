/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  buildDefaultExchangeRates,
  calculateInternationalStayQuote,
  DEFAULT_NGN_PER_GBP,
  DEFAULT_NGN_PER_USD,
  formatNaira,
  INTERNATIONAL_CURRENCY_BUFFER_RATE,
  roundCurrencyMinor,
  type InternationalQuoteResult,
} from './pricing';
import type { ExchangeRateConfig } from './types';

export { buildDefaultExchangeRates, DEFAULT_NGN_PER_GBP, DEFAULT_NGN_PER_USD };

export type DisplayCurrency = 'NGN' | 'USD' | 'GBP';

export const CURRENCY_ORDER: readonly DisplayCurrency[] = ['NGN', 'USD', 'GBP'] as const;

export const CURRENCY_SYMBOLS: Record<DisplayCurrency, string> = {
  NGN: '₦',
  USD: '$',
  GBP: '£',
};

const STORAGE_KEY = 'hamlet_display_currency_v1';

/** Raw conversion without the 10% international stay buffer (e.g. for refundable caution deposits). */
export function convertNairaToUsd(amountNgn: number, ngnPerUsd: number = DEFAULT_NGN_PER_USD): number {
  if (!Number.isFinite(amountNgn) || amountNgn <= 0) return 0;
  const safeRate = ngnPerUsd > 0 ? ngnPerUsd : DEFAULT_NGN_PER_USD;
  return roundCurrencyMinor(amountNgn / safeRate);
}

/** Raw conversion without the 10% international stay buffer (e.g. for refundable caution deposits). */
export function convertNairaToGbp(amountNgn: number, ngnPerGbp: number = DEFAULT_NGN_PER_GBP): number {
  if (!Number.isFinite(amountNgn) || amountNgn <= 0) return 0;
  const safeRate = ngnPerGbp > 0 ? ngnPerGbp : DEFAULT_NGN_PER_GBP;
  return roundCurrencyMinor(amountNgn / safeRate);
}

/** International guest price in USD including the 10% buffer applied once (§6.1). */
export function convertDomesticStayToUsd(
  domesticGuestAmountNgn: number,
  ngnPerUsd: number = DEFAULT_NGN_PER_USD,
): number {
  const base = convertNairaToUsd(domesticGuestAmountNgn, ngnPerUsd);
  return roundCurrencyMinor(base + roundCurrencyMinor(base * INTERNATIONAL_CURRENCY_BUFFER_RATE));
}

/** International guest price in GBP including the 10% buffer applied once (§6.1). */
export function convertDomesticStayToGbp(
  domesticGuestAmountNgn: number,
  ngnPerGbp: number = DEFAULT_NGN_PER_GBP,
): number {
  const base = convertNairaToGbp(domesticGuestAmountNgn, ngnPerGbp);
  return roundCurrencyMinor(base + roundCurrencyMinor(base * INTERNATIONAL_CURRENCY_BUFFER_RATE));
}

export function formatUsd(amountUsd: number, opts?: { roundWhole?: boolean }): string {
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) return '$0';
  const rounded = opts?.roundWhole ? Math.round(amountUsd) : roundCurrencyMinor(amountUsd);
  const isWhole = Number.isInteger(rounded);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: isWhole ? 0 : 2,
  }).format(rounded);
}

export function formatGbp(amountGbp: number, opts?: { roundWhole?: boolean }): string {
  if (!Number.isFinite(amountGbp) || amountGbp <= 0) return '£0';
  const rounded = opts?.roundWhole ? Math.round(amountGbp) : roundCurrencyMinor(amountGbp);
  const isWhole = Number.isInteger(rounded);
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: isWhole ? 0 : 2,
  }).format(rounded);
}

/** Formats minor units (cents for USD, pence for GBP, whole Naira for NGN). */
export function formatMinorCurrency(minorAmount: number, currency: DisplayCurrency): string {
  if (currency === 'USD') {
    return formatUsd(minorAmount / 100);
  }
  if (currency === 'GBP') {
    return formatGbp(minorAmount / 100);
  }
  return formatNaira(minorAmount);
}

export function formatCurrencyAmount(
  amount: number,
  currency: DisplayCurrency,
  opts?: { roundWhole?: boolean },
): string {
  if (currency === 'USD') return formatUsd(amount, opts);
  if (currency === 'GBP') return formatGbp(amount, opts);
  return formatNaira(amount);
}

export interface FormatStayAmountOptions {
  ngnPerUsd?: number;
  ngnPerGbp?: number;
  roundWhole?: boolean;
  roundUsd?: boolean;
  /**
   * Defaults to true for stay accommodation & mandatory charges (§6.1).
   * Pass false for refundable caution deposits so the 10% buffer is NEVER applied to caution fees.
   */
  applyInternationalBuffer?: boolean;
}

export function formatStayAmount(
  domesticGuestAmountNgn: number,
  currency: DisplayCurrency,
  opts?: number | FormatStayAmountOptions,
): string {
  const roundWhole =
    typeof opts === 'object' ? (opts?.roundWhole ?? opts?.roundUsd) : undefined;
  const applyBuffer =
    typeof opts === 'object' ? (opts?.applyInternationalBuffer ?? true) : true;

  if (currency === 'USD') {
    const ngnPerUsd = typeof opts === 'number' ? opts : (opts?.ngnPerUsd ?? DEFAULT_NGN_PER_USD);
    const usd = applyBuffer
      ? convertDomesticStayToUsd(domesticGuestAmountNgn, ngnPerUsd)
      : convertNairaToUsd(domesticGuestAmountNgn, ngnPerUsd);
    return formatUsd(usd, { roundWhole });
  }
  if (currency === 'GBP') {
    const ngnPerGbp = typeof opts === 'number' ? opts : (opts?.ngnPerGbp ?? DEFAULT_NGN_PER_GBP);
    const gbp = applyBuffer
      ? convertDomesticStayToGbp(domesticGuestAmountNgn, ngnPerGbp)
      : convertNairaToGbp(domesticGuestAmountNgn, ngnPerGbp);
    return formatGbp(gbp, { roundWhole });
  }
  return formatNaira(domesticGuestAmountNgn);
}

interface CurrencyContextValue {
  /** Requested currency selected by the guest in the switcher. */
  requestedCurrency: DisplayCurrency;
  /** Effective currency after checking rate availability & expiry (falls back to NGN if unavailable). */
  currency: DisplayCurrency;
  currencySymbol: string;
  ngnPerUsd: number;
  ngnPerGbp: number;
  ngnPerUnit: number;
  activeRateConfig: ExchangeRateConfig | null;
  activeRateIsAvailable: boolean;
  rateFallbackReason: InternationalQuoteResult['fallbackReason'] | null;
  exchangeRates: ExchangeRateConfig[];
  setCurrency: (next: DisplayCurrency) => void;
  toggleCurrency: () => void;
  /** Formats guest-facing stay amounts (includes 10% international buffer in USD/GBP). */
  formatPrice: (
    domesticGuestAmountNgn: number,
    opts?: { roundWhole?: boolean; roundUsd?: boolean; applyInternationalBuffer?: boolean },
  ) => string;
  formatStayPrice: (
    domesticGuestAmountNgn: number,
    opts?: { roundWhole?: boolean; roundUsd?: boolean; applyInternationalBuffer?: boolean },
  ) => string;
  formatMoney: (
    domesticGuestAmountNgn: number,
    opts?: { roundWhole?: boolean; roundUsd?: boolean; applyInternationalBuffer?: boolean },
  ) => string;
  /** Formats refundable caution deposit / unbuffered money (NEVER applies the 10% international buffer). */
  formatCautionDeposit: (depositNgn: number, opts?: { roundWhole?: boolean }) => string;
  formatUnbufferedMoney: (amountNgn: number, opts?: { roundWhole?: boolean }) => string;
  /** Builds a full InternationalQuoteResult snapshot for a booking request or checkout. */
  buildStayQuote: (domesticGuestAmountNgn: number, refundableDepositNgn?: number) => InternationalQuoteResult;
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

export function CurrencyProvider({
  children,
  exchangeRates: configuredRates,
}: {
  children: ReactNode;
  exchangeRates?: ExchangeRateConfig[];
}) {
  const [requestedCurrency, setCurrencyState] = useState<DisplayCurrency>(readInitialCurrency);

  const exchangeRates = useMemo(
    () => (configuredRates && configuredRates.length > 0 ? configuredRates : buildDefaultExchangeRates()),
    [configuredRates],
  );

  const usdConfig = useMemo(
    () => exchangeRates.find(r => r.currency === 'USD') ?? null,
    [exchangeRates],
  );
  const gbpConfig = useMemo(
    () => exchangeRates.find(r => r.currency === 'GBP') ?? null,
    [exchangeRates],
  );

  const requestedConfig =
    requestedCurrency === 'USD' ? usdConfig : requestedCurrency === 'GBP' ? gbpConfig : null;

  const probeQuote = useMemo(
    () =>
      calculateInternationalStayQuote({
        domesticGuestAmountNgn: 100_000,
        currency: requestedCurrency,
        rateConfig: requestedConfig,
      }),
    [requestedCurrency, requestedConfig],
  );

  const activeRateIsAvailable = probeQuote.ok;
  const currency: DisplayCurrency = probeQuote.ok ? requestedCurrency : 'NGN';
  const rateFallbackReason = probeQuote.ok ? null : (probeQuote.fallbackReason ?? 'rate_unavailable');
  const activeRateConfig = currency === 'NGN' ? null : requestedConfig;

  const ngnPerUsd = usdConfig?.ngnPerUnit ?? DEFAULT_NGN_PER_USD;
  const ngnPerGbp = gbpConfig?.ngnPerUnit ?? DEFAULT_NGN_PER_GBP;
  const ngnPerUnit = currency === 'USD' ? ngnPerUsd : currency === 'GBP' ? ngnPerGbp : 1;

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
    (
      domesticGuestAmountNgn: number,
      opts?: { roundWhole?: boolean; roundUsd?: boolean; applyInternationalBuffer?: boolean },
    ) =>
      formatStayAmount(domesticGuestAmountNgn, currency, {
        ngnPerUsd,
        ngnPerGbp,
        roundWhole: opts?.roundWhole ?? opts?.roundUsd,
        applyInternationalBuffer: opts?.applyInternationalBuffer ?? true,
      }),
    [currency, ngnPerUsd, ngnPerGbp],
  );

  const formatCautionDeposit = useCallback(
    (depositNgn: number, opts?: { roundWhole?: boolean }) =>
      formatStayAmount(depositNgn, currency, {
        ngnPerUsd,
        ngnPerGbp,
        roundWhole: opts?.roundWhole,
        applyInternationalBuffer: false,
      }),
    [currency, ngnPerUsd, ngnPerGbp],
  );

  const buildStayQuote = useCallback(
    (domesticGuestAmountNgn: number, refundableDepositNgn = 0) =>
      calculateInternationalStayQuote({
        domesticGuestAmountNgn,
        refundableDepositNgn,
        currency: requestedCurrency,
        rateConfig: requestedConfig,
      }),
    [requestedCurrency, requestedConfig],
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({
      requestedCurrency,
      currency,
      currencySymbol: CURRENCY_SYMBOLS[currency],
      ngnPerUsd,
      ngnPerGbp,
      ngnPerUnit,
      activeRateConfig,
      activeRateIsAvailable,
      rateFallbackReason,
      exchangeRates,
      setCurrency,
      toggleCurrency,
      formatPrice,
      formatStayPrice: formatPrice,
      formatMoney: formatPrice,
      formatCautionDeposit,
      formatUnbufferedMoney: formatCautionDeposit,
      buildStayQuote,
    }),
    [
      requestedCurrency,
      currency,
      ngnPerUsd,
      ngnPerGbp,
      ngnPerUnit,
      activeRateConfig,
      activeRateIsAvailable,
      rateFallbackReason,
      exchangeRates,
      setCurrency,
      toggleCurrency,
      formatPrice,
      formatCautionDeposit,
      buildStayQuote,
    ],
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
