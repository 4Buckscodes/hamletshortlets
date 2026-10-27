// ─── HAMLET Authoritative Pricing, FX Buffer & Settlement Engine ────────────
// Single source of truth used across:
//   - Property cards & search results
//   - Property detail & booking request modal
//   - Checkout & payment verification
//   - Owner, Closing-Agent & Partner Referral dashboards
//   - Admin financial views, receipts & transaction ledgers
//
// Commercial rules (§5, §6, §7):
//   - Owner enters base listed accommodation price B in NGN (0% deducted from B).
//   - Domestic markup = 20% of B -> Domestic guest accommodation price = B × 1.20.
//   - Allocation of 20% markup on B:
//       * Closing agent: 10% of B (when validly attributed)
//       * Direct referring partner: 2.5% of B (when eligible on 2nd+ completed booking in 90d window)
//       * HAMLET allocation: 5% of B (with eligible referrer) or 7.5% of B (without eligible referrer)
//       * Payment & settlement cost reserve: 2.5% of B (internal budget, never misrepresented as actual fee)
//   - International USD / GBP display & quote buffer:
//       * Convert domestic guest price to USD/GBP using configured exchange rate, then apply 10% buffer ONCE.
//       * Commissions remain strictly calculated on owner's listed NGN price B.
//   - Caution fee (refundable deposit) is itemised separately: excluded from 20% markup, 10% FX buffer,
//     agent commissions, referral rewards, and HAMLET revenue.

import type { ExchangeRateConfig, MandatoryCharge, SupportedCurrency } from './types';

export const PRICING_RULES_VERSION = 'v2_20pct_markup_10pct_fx_buffer';

export const HAMLET_DOMESTIC_MARKUP_RATE = 0.2;
/** Alias kept for compatibility with callers referencing the guest fee constant. */
export const HAMLET_GUEST_SERVICE_FEE_RATE = HAMLET_DOMESTIC_MARKUP_RATE;
export const OWNER_HAMLET_FEE_RATE = 0;

export const CLOSING_AGENT_COMMISSION_RATE = 0.1;
export const DIRECT_REFERRER_REWARD_RATE = 0.025;
export const HAMLET_ALLOCATION_WITH_REFERRER_RATE = 0.05;
export const HAMLET_ALLOCATION_NO_REFERRER_RATE = 0.075;
export const PAYMENT_SETTLEMENT_RESERVE_RATE = 0.025;

export const INTERNATIONAL_CURRENCY_BUFFER_RATE = 0.1;
export const DEFAULT_QUOTE_VALIDITY_MINUTES = 30;
export const DEFAULT_REFERRAL_WINDOW_DAYS = 90;

export const DEFAULT_NGN_PER_USD = 1600;
export const DEFAULT_NGN_PER_GBP = 2000;

export function buildDefaultExchangeRates(nowIso = '2026-10-24T00:00:00.000Z'): ExchangeRateConfig[] {
  return [
    {
      currency: 'USD',
      currencyPair: 'NGN/USD',
      ngnPerUnit: DEFAULT_NGN_PER_USD,
      bufferRate: INTERNATIONAL_CURRENCY_BUFFER_RATE,
      source: 'hamlet_configured_reference',
      quoteTtlMinutes: DEFAULT_QUOTE_VALIDITY_MINUTES,
      effectiveAt: nowIso,
      quotedAt: nowIso,
      expiresAt: null,
      isActive: true,
    },
    {
      currency: 'GBP',
      currencyPair: 'NGN/GBP',
      ngnPerUnit: DEFAULT_NGN_PER_GBP,
      bufferRate: INTERNATIONAL_CURRENCY_BUFFER_RATE,
      source: 'hamlet_configured_reference',
      quoteTtlMinutes: DEFAULT_QUOTE_VALIDITY_MINUTES,
      effectiveAt: nowIso,
      quotedAt: nowIso,
      expiresAt: null,
      isActive: true,
    },
  ];
}

/** Integer basis-point multiplication rounded half-up to whole Naira. */
export function multiplyNairaBasisPoints(amountNgn: number, basisPoints: number): number {
  const safeBase = Math.max(0, Math.round(amountNgn));
  if (safeBase === 0 || basisPoints <= 0) return 0;
  return Math.floor((safeBase * basisPoints + 5_000) / 10_000);
}

/** Rounds major foreign currency amount (USD/GBP) to 2 decimal places using integer cents/pence. */
export function roundCurrencyMinor(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export interface MarkupAllocationInput {
  /** Owner's listed accommodation price B in NGN. */
  ownerListedPriceNgn: number;
  /** Whether a closing agent is validly attributed to the booking (default true for standard split). */
  hasClosingAgent?: boolean;
  /** Whether a direct referring partner is eligible for the 2.5% recurring reward on this booking. */
  hasEligibleReferrer?: boolean;
  /** Alias for hasEligibleReferrer. */
  hasQualifyingDirectReferrer?: boolean;
  /** Optional IDs to enforce same-person / self-referral prevention (§5.4). */
  closingAgentId?: string | null;
  directReferrerId?: string | null;
}

export interface MarkupAllocationBreakdown {
  ownerListedPriceNgn: number;
  totalMarkupNgn: number;
  domesticGuestPriceNgn: number;
  closingAgentCommissionNgn: number;
  directReferrerRewardNgn: number;
  hamletAllocationNgn: number;
  paymentReserveNgn: number;
  closingAgentRate: number;
  directReferrerRate: number;
  hamletAllocationRate: number;
  paymentReserveRate: number;
  hasClosingAgent: boolean;
  hasEligibleReferrer: boolean;
}

export function calculateMarkupAllocation(input: MarkupAllocationInput): MarkupAllocationBreakdown {
  const ownerListedPriceNgn = Math.max(0, Math.round(input.ownerListedPriceNgn));
  const hasClosingAgent = input.hasClosingAgent ?? true;
  const referrerFlag = input.hasEligibleReferrer ?? input.hasQualifyingDirectReferrer ?? false;

  const samePerson =
    Boolean(input.closingAgentId) &&
    Boolean(input.directReferrerId) &&
    input.closingAgentId === input.directReferrerId;

  // Referrer reward requires a validly attributed closing agent and distinct referrer (§5.4 & §8.1).
  const hasEligibleReferrer = Boolean(hasClosingAgent && referrerFlag && !samePerson);

  const totalMarkupNgn = multiplyNairaBasisPoints(ownerListedPriceNgn, 2_000); // 20.00%
  const domesticGuestPriceNgn = ownerListedPriceNgn + totalMarkupNgn;
  const paymentReserveNgn = multiplyNairaBasisPoints(ownerListedPriceNgn, 250); // 2.50%

  const closingAgentCommissionNgn = hasClosingAgent
    ? multiplyNairaBasisPoints(ownerListedPriceNgn, 1_000) // 10.00%
    : 0;

  const directReferrerRewardNgn = hasEligibleReferrer
    ? multiplyNairaBasisPoints(ownerListedPriceNgn, 250) // 2.50%
    : 0;

  // Exact remainder ensures the four components always reconcile to totalMarkupNgn without rounding drift.
  const hamletAllocationNgn = Math.max(
    0,
    totalMarkupNgn - closingAgentCommissionNgn - directReferrerRewardNgn - paymentReserveNgn,
  );

  const closingAgentRate = hasClosingAgent ? CLOSING_AGENT_COMMISSION_RATE : 0;
  const directReferrerRate = hasEligibleReferrer ? DIRECT_REFERRER_REWARD_RATE : 0;
  const hamletAllocationRate = !hasClosingAgent
    ? HAMLET_DOMESTIC_MARKUP_RATE - PAYMENT_SETTLEMENT_RESERVE_RATE
    : hasEligibleReferrer
      ? HAMLET_ALLOCATION_WITH_REFERRER_RATE
      : HAMLET_ALLOCATION_NO_REFERRER_RATE;

  return {
    ownerListedPriceNgn,
    totalMarkupNgn,
    domesticGuestPriceNgn,
    closingAgentCommissionNgn,
    directReferrerRewardNgn,
    hamletAllocationNgn,
    paymentReserveNgn,
    closingAgentRate,
    directReferrerRate,
    hamletAllocationRate,
    paymentReserveRate: PAYMENT_SETTLEMENT_RESERVE_RATE,
    hasClosingAgent,
    hasEligibleReferrer,
  };
}

export interface PricingInput {
  /** Owner's listed accommodation subtotal B (after any accommodation discount, before markup/charges). */
  accommodationSubtotal: number;
  /** Known mandatory non-accommodation charges (cleaning, turnover…). */
  mandatoryCharges?: MandatoryCharge[];
  /** Refundable caution deposit — itemised separately, never marked up or buffered. */
  refundableDeposit?: number;
  /** Override markup rate only if explicitly configured (defaults to 20%). */
  serviceFeeRate?: number;
  hasClosingAgent?: boolean;
  hasEligibleReferrer?: boolean;
  hasQualifyingDirectReferrer?: boolean;
  closingAgentId?: string | null;
  directReferrerId?: string | null;
}

export interface PricingBreakdown {
  /** Owner's listed accommodation price B in NGN. */
  ownerListedPriceNgn: number;
  /** Alias for ownerListedPriceNgn preserved for existing booking model fields. */
  accommodationSubtotal: number;
  /** 20% domestic markup on B in NGN. */
  domesticMarkupNgn: number;
  /** Domestic guest accommodation price = B × 1.20 in NGN. */
  domesticGuestPriceNgn: number;
  /** Alias for domesticGuestPriceNgn. */
  domesticGuestAccommodationNgn: number;
  mandatoryCharges: MandatoryCharge[];
  mandatoryChargesTotal: number;
  /** Alias for domesticMarkupNgn preserved for existing booking model fields. */
  hamletGuestServiceFee: number;
  preciseGuestServiceFee: number;
  /** Domestic guest-facing total in NGN = domesticGuestAccommodationNgn + mandatoryChargesTotal (caution deposit excluded). */
  guestTotal: number;
  /** Separate refundable caution deposit in NGN. */
  refundableDeposit: number;
  serviceFeeRate: number;
  allocation: MarkupAllocationBreakdown;
  rulesVersion: string;
}

export function calculateGuestPricing(input: PricingInput): PricingBreakdown {
  const rate = input.serviceFeeRate ?? HAMLET_DOMESTIC_MARKUP_RATE;
  const ownerBase = Math.max(0, Math.round(input.accommodationSubtotal));
  const charges = (input.mandatoryCharges ?? []).map(c => ({
    ...c,
    amount: Math.max(0, Math.round(c.amount)),
  }));
  const mandatoryChargesTotal = charges.reduce((s, c) => s + c.amount, 0);

  const allocation = calculateMarkupAllocation({
    ownerListedPriceNgn: ownerBase,
    hasClosingAgent: input.hasClosingAgent,
    hasEligibleReferrer: input.hasEligibleReferrer ?? input.hasQualifyingDirectReferrer,
    closingAgentId: input.closingAgentId,
    directReferrerId: input.directReferrerId,
  });

  const preciseGuestServiceFee = ownerBase * rate;
  const domesticMarkupNgn =
    rate === HAMLET_DOMESTIC_MARKUP_RATE
      ? allocation.totalMarkupNgn
      : Math.round(preciseGuestServiceFee);

  const domesticGuestAccommodationNgn = ownerBase + domesticMarkupNgn;
  const guestTotal = domesticGuestAccommodationNgn + mandatoryChargesTotal;

  return {
    ownerListedPriceNgn: ownerBase,
    accommodationSubtotal: ownerBase,
    domesticMarkupNgn,
    domesticGuestPriceNgn: domesticGuestAccommodationNgn,
    domesticGuestAccommodationNgn,
    mandatoryCharges: charges,
    mandatoryChargesTotal,
    hamletGuestServiceFee: domesticMarkupNgn,
    preciseGuestServiceFee,
    guestTotal,
    refundableDeposit: Math.max(0, Math.round(input.refundableDeposit ?? 0)),
    serviceFeeRate: rate,
    allocation,
    rulesVersion: PRICING_RULES_VERSION,
  };
}

/** Domestic guest-facing nightly accommodation price (B_night × 1.20). */
export function guestFacingNightlyNgn(ownerNightlyRateNgn: number): number {
  const safeBase = Math.max(0, Math.round(ownerNightlyRateNgn));
  return safeBase + multiplyNairaBasisPoints(safeBase, 2_000);
}

export interface InternationalQuoteInput {
  /** Domestic guest-facing amount in NGN (already includes 20% domestic markup; never re-marked up). */
  domesticGuestAmountNgn: number;
  /** Separate refundable caution deposit in NGN (converted WITHOUT the 10% buffer). */
  refundableDepositNgn?: number;
  currency: SupportedCurrency;
  rateConfig?: ExchangeRateConfig | null;
  now?: Date;
  quoteValidityMinutes?: number;
}

export interface InternationalQuoteResult {
  ok: boolean;
  currency: SupportedCurrency;
  currencyPair: string;
  domesticGuestAmountNgn: number;
  exchangeRateNgnPerUnit: number;
  exchangeRateSource: string;
  exchangeRateTimestamp: string;
  internationalBufferRate: number;
  convertedBaseAmount: number;
  internationalBufferAmount: number;
  internationalBufferNgnEquiv: number;
  quotedGuestTotal: number;
  settlementTotalNgn: number;
  cautionDepositInCurrency: number;
  quoteExpiresAt: string;
  fallbackReason?: 'rate_unavailable' | 'rate_expired' | 'rate_invalid';
}

/**
 * Authoritative international currency quote (§6.1–§6.3).
 * - Converts domestic guest price using configured rate, then applies 10% buffer ONCE.
 * - Never invents a rate: if rateConfig is missing, inactive, <= 0, or expired, returns ok=false
 *   with safe NGN fallback values.
 * - Never applies the 10% buffer to the refundable caution fee.
 */
export function calculateInternationalStayQuote(
  input: InternationalQuoteInput,
): InternationalQuoteResult {
  const now = input.now ?? new Date();
  const ttlMinutes =
    input.quoteValidityMinutes ??
    input.rateConfig?.quoteTtlMinutes ??
    DEFAULT_QUOTE_VALIDITY_MINUTES;
  const validityMs = ttlMinutes * 60_000;
  const quoteExpiresAt = new Date(now.getTime() + validityMs).toISOString();
  const domesticNgn = Math.max(0, Math.round(input.domesticGuestAmountNgn));
  const depositNgn = Math.max(0, Math.round(input.refundableDepositNgn ?? 0));

  if (input.currency === 'NGN') {
    return {
      ok: true,
      currency: 'NGN',
      currencyPair: 'NGN/NGN',
      domesticGuestAmountNgn: domesticNgn,
      exchangeRateNgnPerUnit: 1,
      exchangeRateSource: 'domestic_ngn',
      exchangeRateTimestamp: now.toISOString(),
      internationalBufferRate: 0,
      convertedBaseAmount: domesticNgn,
      internationalBufferAmount: 0,
      internationalBufferNgnEquiv: 0,
      quotedGuestTotal: domesticNgn,
      settlementTotalNgn: domesticNgn,
      cautionDepositInCurrency: depositNgn,
      quoteExpiresAt,
    };
  }

  const cfg = input.rateConfig;
  if (!cfg || !cfg.isActive) {
    return {
      ok: false,
      currency: 'NGN',
      currencyPair: 'NGN/NGN',
      domesticGuestAmountNgn: domesticNgn,
      exchangeRateNgnPerUnit: 1,
      exchangeRateSource: 'fallback_ngn_unavailable',
      exchangeRateTimestamp: now.toISOString(),
      internationalBufferRate: 0,
      convertedBaseAmount: domesticNgn,
      internationalBufferAmount: 0,
      internationalBufferNgnEquiv: 0,
      quotedGuestTotal: domesticNgn,
      settlementTotalNgn: domesticNgn,
      cautionDepositInCurrency: depositNgn,
      quoteExpiresAt,
      fallbackReason: 'rate_unavailable',
    };
  }

  if (!Number.isFinite(cfg.ngnPerUnit) || cfg.ngnPerUnit <= 0) {
    return {
      ok: false,
      currency: 'NGN',
      currencyPair: 'NGN/NGN',
      domesticGuestAmountNgn: domesticNgn,
      exchangeRateNgnPerUnit: 1,
      exchangeRateSource: 'fallback_ngn_invalid',
      exchangeRateTimestamp: now.toISOString(),
      internationalBufferRate: 0,
      convertedBaseAmount: domesticNgn,
      internationalBufferAmount: 0,
      internationalBufferNgnEquiv: 0,
      quotedGuestTotal: domesticNgn,
      settlementTotalNgn: domesticNgn,
      cautionDepositInCurrency: depositNgn,
      quoteExpiresAt,
      fallbackReason: 'rate_invalid',
    };
  }

  if (cfg.expiresAt && new Date(cfg.expiresAt).getTime() <= now.getTime()) {
    return {
      ok: false,
      currency: 'NGN',
      currencyPair: 'NGN/NGN',
      domesticGuestAmountNgn: domesticNgn,
      exchangeRateNgnPerUnit: 1,
      exchangeRateSource: 'fallback_ngn_expired',
      exchangeRateTimestamp: now.toISOString(),
      internationalBufferRate: 0,
      convertedBaseAmount: domesticNgn,
      internationalBufferAmount: 0,
      internationalBufferNgnEquiv: 0,
      quotedGuestTotal: domesticNgn,
      settlementTotalNgn: domesticNgn,
      cautionDepositInCurrency: depositNgn,
      quoteExpiresAt,
      fallbackReason: 'rate_expired',
    };
  }

  const rawConvertedBase = domesticNgn / cfg.ngnPerUnit;
  const convertedBaseAmount = roundCurrencyMinor(rawConvertedBase);
  const internationalBufferAmount = roundCurrencyMinor(
    convertedBaseAmount * INTERNATIONAL_CURRENCY_BUFFER_RATE,
  );
  const quotedGuestTotal = roundCurrencyMinor(convertedBaseAmount + internationalBufferAmount);

  const internationalBufferNgnEquiv = multiplyNairaBasisPoints(domesticNgn, 1_000); // 10.00%
  const settlementTotalNgn = domesticNgn + internationalBufferNgnEquiv;
  const cautionDepositInCurrency = roundCurrencyMinor(depositNgn / cfg.ngnPerUnit);

  return {
    ok: true,
    currency: input.currency,
    currencyPair: cfg.currencyPair || `NGN/${input.currency}`,
    domesticGuestAmountNgn: domesticNgn,
    exchangeRateNgnPerUnit: cfg.ngnPerUnit,
    exchangeRateSource: cfg.source,
    exchangeRateTimestamp: cfg.effectiveAt ?? cfg.quotedAt ?? now.toISOString(),
    internationalBufferRate: INTERNATIONAL_CURRENCY_BUFFER_RATE,
    convertedBaseAmount,
    internationalBufferAmount,
    internationalBufferNgnEquiv,
    quotedGuestTotal,
    settlementTotalNgn,
    cautionDepositInCurrency,
    quoteExpiresAt,
  };
}

export interface BookingCurrencyQuoteInput {
  ownerListedPriceNgn: number;
  mandatoryChargesTotalNgn?: number;
  refundableDepositNgn?: number;
  quoteCurrency: SupportedCurrency;
  exchangeRateConfig?: ExchangeRateConfig | null;
  hasClosingAgent?: boolean;
  hasQualifyingDirectReferrer?: boolean;
  now?: Date;
}

export interface BookingCurrencyQuoteResult {
  ok: boolean;
  quoteCurrency: SupportedCurrency;
  fxRatePair: string | null;
  fxRate: number | null;
  fxRateSource: string | null;
  fxQuotedAt: string | null;
  quoteExpiresAt: string | null;
  convertedBaseMinor: number | null;
  internationalBufferMinor: number | null;
  internationalBufferNgnEquiv: number;
  quotedStayTotalMinor: number;
  quotedDepositMinor: number;
  quotedGrandTotalMinor: number;
  settlementTotalNgn: number;
  fallbackReason?: InternationalQuoteResult['fallbackReason'];
}

/**
 * Full booking quote builder combining 20% domestic stay pricing with optional 10% USD/GBP FX buffer (§5 & §6).
 * Minor units: integer cents/pence for USD/GBP, whole Naira for NGN.
 */
export function calculateBookingCurrencyQuote(
  input: BookingCurrencyQuoteInput,
): BookingCurrencyQuoteResult {
  const ownerBase = Math.max(0, Math.round(input.ownerListedPriceNgn));
  const mandatoryNgn = Math.max(0, Math.round(input.mandatoryChargesTotalNgn ?? 0));
  const depositNgn = Math.max(0, Math.round(input.refundableDepositNgn ?? 0));
  const domesticMarkupNgn = multiplyNairaBasisPoints(ownerBase, 2_000);
  const domesticStayTotalNgn = ownerBase + domesticMarkupNgn + mandatoryNgn;

  const quote = calculateInternationalStayQuote({
    domesticGuestAmountNgn: domesticStayTotalNgn,
    refundableDepositNgn: depositNgn,
    currency: input.quoteCurrency,
    rateConfig: input.exchangeRateConfig,
    now: input.now,
  });

  if (quote.currency === 'NGN') {
    return {
      ok: quote.ok,
      quoteCurrency: 'NGN',
      fxRatePair: null,
      fxRate: null,
      fxRateSource: null,
      fxQuotedAt: null,
      quoteExpiresAt: null,
      convertedBaseMinor: null,
      internationalBufferMinor: null,
      internationalBufferNgnEquiv: 0,
      quotedStayTotalMinor: domesticStayTotalNgn,
      quotedDepositMinor: depositNgn,
      quotedGrandTotalMinor: domesticStayTotalNgn + depositNgn,
      settlementTotalNgn: domesticStayTotalNgn,
      fallbackReason: quote.fallbackReason,
    };
  }

  const convertedBaseMinor = Math.round(quote.convertedBaseAmount * 100);
  const internationalBufferMinor = Math.round(quote.internationalBufferAmount * 100);
  const quotedStayTotalMinor = convertedBaseMinor + internationalBufferMinor;
  const quotedDepositMinor = Math.round(quote.cautionDepositInCurrency * 100);

  return {
    ok: quote.ok,
    quoteCurrency: quote.currency,
    fxRatePair: quote.currencyPair,
    fxRate: quote.exchangeRateNgnPerUnit,
    fxRateSource: quote.exchangeRateSource,
    fxQuotedAt: quote.exchangeRateTimestamp,
    quoteExpiresAt: quote.quoteExpiresAt,
    convertedBaseMinor,
    internationalBufferMinor,
    internationalBufferNgnEquiv: quote.internationalBufferNgnEquiv,
    quotedStayTotalMinor,
    quotedDepositMinor,
    quotedGrandTotalMinor: quotedStayTotalMinor + quotedDepositMinor,
    settlementTotalNgn: quote.settlementTotalNgn,
  };
}

export function isQuoteExpired(quoteExpiresAt?: string | null, now = new Date()): boolean {
  if (!quoteExpiresAt) return false;
  const ts = new Date(quoteExpiresAt).getTime();
  return Number.isNaN(ts) || ts <= now.getTime();
}

export interface PaymentReserveReconciliation {
  reserveBudgetNgn: number;
  paymentReserveNgn: number;
  actualProviderFeeNgn: number;
  actualPaystackFeeNgn: number;
  unusedReserveNgn: number;
  /** Shortfall absorbed by HAMLET allocation — never deducted from owner or agent commissions (§5.3). */
  shortfallAbsorbedByHamletNgn: number;
  /** Positive = unused reserve remaining; negative = shortfall absorbed by HAMLET allocation. */
  reserveVarianceNgn: number;
  status: 'within_reserve' | 'exact_match' | 'exceeds_reserve';
}

export function reconcilePaymentReserve(
  reserveBudgetNgn: number,
  actualProviderFeeNgn: number,
): PaymentReserveReconciliation {
  const reserve = Math.max(0, Math.round(reserveBudgetNgn));
  const actual = Math.max(0, Math.round(actualProviderFeeNgn));
  const variance = reserve - actual;
  return {
    reserveBudgetNgn: reserve,
    paymentReserveNgn: reserve,
    actualProviderFeeNgn: actual,
    actualPaystackFeeNgn: actual,
    unusedReserveNgn: Math.max(0, variance),
    shortfallAbsorbedByHamletNgn: Math.max(0, -variance),
    reserveVarianceNgn: variance,
    status: variance > 0 ? 'within_reserve' : variance === 0 ? 'exact_match' : 'exceeds_reserve',
  };
}

export const reconcilePaymentReserveVsActualFee = reconcilePaymentReserve;

/** Nights between two ISO dates (checkout − checkin), min 0. */
export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  const diff = Math.round((b.getTime() - a.getTime()) / 86400000);
  return Number.isFinite(diff) ? Math.max(0, diff) : 0;
}

/** Full-stay authoritative pricing for a property over a date range. */
export function priceStay(
  property: {
    nightlyRate: number;
    cleaningFee: number;
    deposit: number;
    mandatoryCharges?: MandatoryCharge[];
  },
  checkIn: string,
  checkOut: string,
  opts?: {
    hasClosingAgent?: boolean;
    hasEligibleReferrer?: boolean;
    hasQualifyingDirectReferrer?: boolean;
    closingAgentId?: string | null;
    directReferrerId?: string | null;
  },
): PricingBreakdown & { nights: number } {
  const nights = nightsBetween(checkIn, checkOut);
  const mandatoryCharges =
    property.mandatoryCharges && property.mandatoryCharges.length > 0
      ? property.mandatoryCharges
      : property.cleaningFee > 0
        ? [{ label: 'Cleaning & turnover (mandatory)', amount: property.cleaningFee }]
        : [];
  const breakdown = calculateGuestPricing({
    accommodationSubtotal: nights * property.nightlyRate,
    mandatoryCharges,
    refundableDeposit: property.deposit,
    hasClosingAgent: opts?.hasClosingAgent,
    hasEligibleReferrer: opts?.hasEligibleReferrer ?? opts?.hasQualifyingDirectReferrer,
    closingAgentId: opts?.closingAgentId,
    directReferrerId: opts?.directReferrerId,
  });
  return { ...breakdown, nights };
}

/** Guest-facing nightly accommodation price (B_night × 1.20) for property cards & search results. */
export function estimateAllInclusiveNightly(property: { nightlyRate: number }): number {
  return guestFacingNightlyNgn(property.nightlyRate);
}

/** Owner-side proceeds. Owner fee is 0% — owner nets their full listed accommodation price B + mandatory charges. */
export function ownerProceeds(
  breakdown: Pick<PricingBreakdown, 'accommodationSubtotal' | 'mandatoryChargesTotal'>,
): number {
  return breakdown.accommodationSubtotal + breakdown.mandatoryChargesTotal;
}

export function formatNaira(n: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

export function formatDate(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateShort(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    });
  }
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function formatDateTime(iso: string): string {
  return (
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' +
    new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  );
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(diff / 86400000);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

/** Overlap test for half-open stay/block date intervals [aIn, aOut) vs [bIn, bOut). */
export function datesOverlap(aIn: string, aOut: string, bIn: string, bOut: string): boolean {
  return new Date(aIn) < new Date(bOut) && new Date(aOut) > new Date(bIn);
}

/** Returns YYYY-MM-DD in Africa/Lagos offset by daysAhead calendar days. */
export function lagosIsoDateOffset(daysAhead = 0): string {
  const todayLagos = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const d = new Date(`${todayLagos}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

/** Adds days to a YYYY-MM-DD ISO date string. */
export function addDaysToIsoDate(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return lagosIsoDateOffset(Math.max(1, days));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Formats the current date in Africa/Lagos (e.g. "Saturday, 24 Oct 2026"). */
export function formatLagosHeadlineDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(now);
}

/** Computes whole days remaining from today in Africa/Lagos until targetIsoDate (YYYY-MM-DD). */
export function daysUntilLagosDate(targetIsoDate: string, fromIsoDate?: string): number {
  const todayIso = fromIsoDate ?? lagosIsoDateOffset(0);
  const start = new Date(`${todayIso}T00:00:00Z`);
  const end = new Date(`${targetIsoDate}T00:00:00Z`);
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}


/**
 * Pilot estimate for Nigerian local-card Paystack processing fees.
 * Published standard pricing: 1.5% + ₦100, capped at ₦2,000;
 * the ₦100 fixed component is waived for transactions below ₦2,500.
 *
 * This is a transparent estimate only. Production checkout must reconcile
 * against Paystack's actual transaction fee and configured fee-pass-through.
 */
export interface PaystackLocalFeeEstimate {
  transactionAmountNgn: number;
  estimatedFeeNgn: number;
  estimatedGuestTotalNgn: number;
  capped: boolean;
  fixedFeeApplied: boolean;
}

export function estimatePaystackLocalFee(transactionAmountNgn: number): PaystackLocalFeeEstimate {
  const base = Math.max(0, Math.round(Number.isFinite(transactionAmountNgn) ? transactionAmountNgn : 0));
  if (base === 0) {
    return { transactionAmountNgn: 0, estimatedFeeNgn: 0, estimatedGuestTotalNgn: 0, capped: false, fixedFeeApplied: false };
  }
  const fixedFeeApplied = base >= 2_500;
  const rawFee = base * 0.015 + (fixedFeeApplied ? 100 : 0);
  const estimatedFeeNgn = Math.min(2_000, Math.ceil(rawFee));
  return {
    transactionAmountNgn: base,
    estimatedFeeNgn,
    estimatedGuestTotalNgn: base + estimatedFeeNgn,
    capped: rawFee >= 2_000,
    fixedFeeApplied,
  };
}
