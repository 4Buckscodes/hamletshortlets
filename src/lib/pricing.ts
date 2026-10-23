// ─── HAMLET shared pricing engine ───────────────────────────────────────────
// The SINGLE source of truth for guest-facing totals.
// Used by: property cards (estimate), property page, booking widget,
// checkout, booking records, partner earnings and admin ledger views.
// Spec: HAMLET guest service fee = 3% (configurable) × discounted accommodation
// subtotal. Refundable deposits and separately-disclosed charges are excluded
// from the fee base. Processing-provider charges are EXCLUDED until the policy
// is decided — never hard-coded, never passed through automatically.

export const HAMLET_GUEST_SERVICE_FEE_RATE = 0.03;
export const OWNER_HAMLET_FEE_RATE = 0; // owner fee is 0% by locked decision

export interface PricingInput {
  /** Accommodation subtotal AFTER any accommodation discount, BEFORE fees/charges. */
  accommodationSubtotal: number;
  /** Known mandatory non-accommodation charges (cleaning, utilities, service charge…). */
  mandatoryCharges?: { label: string; amount: number }[];
  /** Refundable deposit — shown separately, never fee-bearing. */
  refundableDeposit?: number;
  /** Configured HAMLET guest service fee. Defaults to 3%. */
  serviceFeeRate?: number;
}

export interface PricingBreakdown {
  accommodationSubtotal: number;
  mandatoryCharges: { label: string; amount: number }[];
  mandatoryChargesTotal: number;
  hamletGuestServiceFee: number;
  /** Exact, fee-unrounded value for audit trails. */
  preciseGuestServiceFee: number;
  /** guest-facing total = subtotal + mandatory charges + HAMLET guest fee */
  guestTotal: number;
  refundableDeposit: number;
  serviceFeeRate: number;
}

export function calculateGuestPricing(input: PricingInput): PricingBreakdown {
  const rate = input.serviceFeeRate ?? HAMLET_GUEST_SERVICE_FEE_RATE;
  const subtotal = Math.max(0, Math.round(input.accommodationSubtotal));
  const charges = (input.mandatoryCharges ?? []).map(c => ({ ...c, amount: Math.max(0, Math.round(c.amount)) }));
  const mandatoryChargesTotal = charges.reduce((s, c) => s + c.amount, 0);
  const preciseGuestServiceFee = subtotal * rate;
  const hamletGuestServiceFee = Math.round(preciseGuestServiceFee);
  // guestTotal is built from the ROUNDED fee so every screen shows the same naira amount.
  const guestTotal = subtotal + mandatoryChargesTotal + hamletGuestServiceFee;
  return {
    accommodationSubtotal: subtotal,
    mandatoryCharges: charges,
    mandatoryChargesTotal,
    hamletGuestServiceFee,
    preciseGuestServiceFee,
    guestTotal,
    refundableDeposit: Math.max(0, Math.round(input.refundableDeposit ?? 0)),
    serviceFeeRate: rate,
  };
}

/** Nights between two ISO dates (checkout − checkin), min 0. */
export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  const diff = Math.round((b.getTime() - a.getTime()) / 86400000);
  return Number.isFinite(diff) ? Math.max(0, diff) : 0;
}

/** Full-stay authoritative pricing for a property over a date range. */
export function priceStay(
  property: { nightlyRate: number; cleaningFee: number; deposit: number },
  checkIn: string,
  checkOut: string,
): PricingBreakdown & { nights: number } {
  const nights = nightsBetween(checkIn, checkOut);
  const mandatoryCharges =
    property.cleaningFee > 0
      ? [{ label: 'Cleaning & turnover (mandatory)', amount: property.cleaningFee }]
      : [];
  const breakdown = calculateGuestPricing({
    accommodationSubtotal: nights * property.nightlyRate,
    mandatoryCharges,
    refundableDeposit: property.deposit,
  });
  return { ...breakdown, nights };
}

/** Illustrative all-inclusive nightly estimate for search cards. Never authoritative. */
export function estimateAllInclusiveNightly(property: { nightlyRate: number }): number {
  const estimate = calculateGuestPricing({
    accommodationSubtotal: property.nightlyRate,
  });
  return estimate.guestTotal;
}

/** Owner-side proceeds. Owner fee is 0% — owner nets subtotal + mandatory charges. */
export function ownerProceeds(breakdown: Pick<PricingBreakdown, 'accommodationSubtotal' | 'mandatoryChargesTotal'>): number {
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
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' +
    new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
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

/** Overlap test for confirmed/awaiting_payment bookings vs a requested range. */
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

/** Formats the current date in Africa/Lagos (e.g. "Friday, 23 Oct 2026"). */
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
export function daysUntilLagosDate(targetIsoDate: string): number {
  const todayIso = lagosIsoDateOffset(0);
  const start = new Date(`${todayIso}T00:00:00Z`);
  const end = new Date(`${targetIsoDate}T00:00:00Z`);
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}


