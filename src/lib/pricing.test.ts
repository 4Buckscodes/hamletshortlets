import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  APPROVED_OWNER_SERVICES_POLICY_COPY,
  calculateBookingCurrencyQuote,
  calculateGuestPricing,
  calculateInternationalStayQuote,
  calculateMarkupAllocation,
  calculateOwnerSettlement,
  datesOverlap,
  DEFAULT_OWNER_COMMERCIAL_POLICY,
  DEFAULT_PROPERTY_MEDIA_POLICY,
  estimatePaystackLocalFee,
  guestFacingNightlyNgn,
  HAMLET_DOMESTIC_MARKUP_RATE,
  HAMLET_GUEST_SERVICE_FEE_RATE,
  nightsBetween,
  OWNER_HAMLET_FEE_RATE,
  ownerProceeds,
  priceStay,
  reconcilePaymentReserve,
  resolveCheckoutStayAmountNgn,
  resolvePropertyMediaPolicy,
} from './pricing';

const ROOT = resolve(process.cwd());

function collectActiveFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      collectActiveFiles(full, acc);
    } else if (
      /\.(ts|tsx|html|txt|xml)$/.test(entry) &&
      !entry.endsWith('.test.ts') &&
      !entry.endsWith('.test.tsx')
    ) {
      acc.push(full);
    }
  }
  return acc;
}

describe('HAMLET booking pricing & date helpers', () => {
  it('applies the 20% guest service fee only to accommodation subtotal (B) and excludes mandatory charges and refundable deposit', () => {
    const breakdown = calculateGuestPricing({
      accommodationSubtotal: 450_000,
      mandatoryCharges: [
        { label: 'Cleaning & turnover', amount: 25_000 },
        { label: 'Diesel & power levy', amount: 15_000 },
      ],
      refundableDeposit: 100_000,
    });

    expect(HAMLET_DOMESTIC_MARKUP_RATE).toBe(0.2);
    expect(HAMLET_GUEST_SERVICE_FEE_RATE).toBe(0.2);
    expect(OWNER_HAMLET_FEE_RATE).toBe(0);
    expect(breakdown.ownerAccommodationRateNgn).toBe(450_000);
    expect(breakdown.ownerListedPriceNgn).toBe(450_000);
    expect(breakdown.accommodationSubtotal).toBe(450_000);
    expect(breakdown.guestServiceFeeNgn).toBe(90_000);
    expect(breakdown.domesticMarkupNgn).toBe(90_000);
    expect(breakdown.guestFacingAccommodationNgn).toBe(540_000);
    expect(breakdown.domesticGuestPriceNgn).toBe(540_000);
    expect(breakdown.mandatoryChargesTotal).toBe(40_000);
    expect(breakdown.hamletGuestServiceFee).toBe(90_000);
    expect(breakdown.guestFacingTotalNgn).toBe(580_000);
    expect(breakdown.guestTotal).toBe(580_000);
    expect(breakdown.refundableCautionDepositNgn).toBe(100_000);
    expect(breakdown.refundableDeposit).toBe(100_000);
    expect(ownerProceeds(breakdown)).toBe(490_000);
  });

  it('verifies the exact §5.4 concrete allocation case (B = ₦200,000)', () => {
    const withReferrer = calculateMarkupAllocation({
      ownerListedPriceNgn: 200_000,
      hasClosingAgent: true,
      hasEligibleReferrer: true,
      closingAgentId: 'partner-closing',
      directReferrerId: 'partner-referrer',
    });

    expect(withReferrer.domesticGuestPriceNgn).toBe(240_000);
    expect(withReferrer.totalMarkupNgn).toBe(40_000);
    expect(withReferrer.closingAgentCommissionNgn).toBe(20_000);
    expect(withReferrer.directReferrerRewardNgn).toBe(5_000);
    expect(withReferrer.hamletAllocationNgn).toBe(10_000);
    expect(withReferrer.paymentReserveNgn).toBe(5_000);

    const withoutReferrer = calculateMarkupAllocation({
      ownerListedPriceNgn: 200_000,
      hasClosingAgent: true,
      hasEligibleReferrer: false,
    });

    expect(withoutReferrer.domesticGuestPriceNgn).toBe(240_000);
    expect(withoutReferrer.totalMarkupNgn).toBe(40_000);
    expect(withoutReferrer.closingAgentCommissionNgn).toBe(20_000);
    expect(withoutReferrer.directReferrerRewardNgn).toBe(0);
    expect(withoutReferrer.hamletAllocationNgn).toBe(15_000);
    expect(withoutReferrer.paymentReserveNgn).toBe(5_000);
  });

  it('rounds fractional naira fees consistently and clamps negative inputs to zero', () => {
    const breakdown = calculateGuestPricing({
      accommodationSubtotal: 133_353, // 20% = 26670.6 -> rounds half-up to 26671
      mandatoryCharges: [{ label: 'Adjustment', amount: -500 }],
      refundableDeposit: -10,
    });

    expect(breakdown.hamletGuestServiceFee).toBe(26_671);
    expect(breakdown.mandatoryChargesTotal).toBe(0);
    expect(breakdown.guestTotal).toBe(160_024);
    expect(breakdown.refundableDeposit).toBe(0);
  });

  it('calculates stay nights and full-stay pricing accurately', () => {
    expect(nightsBetween('2026-11-10', '2026-11-13')).toBe(3);
    expect(nightsBetween('2026-11-10', '2026-11-10')).toBe(0);
    expect(nightsBetween('2026-11-13', '2026-11-10')).toBe(0);

    const stay = priceStay(
      { nightlyRate: 120_000, cleaningFee: 20_000, deposit: 80_000 },
      '2026-11-10',
      '2026-11-12',
    );
    expect(stay.nights).toBe(2);
    expect(stay.accommodationSubtotal).toBe(240_000);
    expect(stay.mandatoryChargesTotal).toBe(20_000);
    expect(stay.hamletGuestServiceFee).toBe(48_000);
    expect(stay.guestTotal).toBe(308_000);
    expect(stay.refundableDeposit).toBe(80_000);
  });

  it('treats overlapping date ranges as conflicts while allowing same-day check-out/check-in turnover', () => {
    expect(datesOverlap('2026-11-10', '2026-11-14', '2026-11-12', '2026-11-16')).toBe(true);
    expect(datesOverlap('2026-11-10', '2026-11-14', '2026-11-10', '2026-11-14')).toBe(true);
    expect(datesOverlap('2026-11-10', '2026-11-14', '2026-11-14', '2026-11-17')).toBe(false);
    expect(datesOverlap('2026-11-14', '2026-11-17', '2026-11-10', '2026-11-14')).toBe(false);
  });
});

describe('HAMLET Commercial Policy Cleanup & Pricing Guarantees', () => {
  it('1. produces a ₦240,000 guest-facing price from a ₦200,000 owner accommodation rate (₦40,000 guest service fee)', () => {
    expect(guestFacingNightlyNgn(200_000)).toBe(240_000);

    const quote = calculateGuestPricing({ accommodationSubtotal: 200_000 });
    expect(quote.ownerAccommodationRateNgn).toBe(200_000);
    expect(quote.guestServiceFeeNgn).toBe(40_000);
    expect(quote.guestFacingAccommodationNgn).toBe(240_000);
    expect(quote.guestFacingTotalNgn).toBe(240_000);
  });

  it('2. never charges the 20% guest service fee twice across listing, FX quote, and checkout', () => {
    const nightlyGuest = guestFacingNightlyNgn(200_000);
    const stay = calculateGuestPricing({ accommodationSubtotal: 200_000 });
    const ngnQuote = calculateBookingCurrencyQuote({
      ownerListedPriceNgn: 200_000,
      quoteCurrency: 'NGN',
    });
    const fxStayQuote = calculateInternationalStayQuote({
      domesticGuestAmountNgn: stay.guestTotal,
      currency: 'NGN',
    });

    expect(nightlyGuest).toBe(240_000);
    expect(stay.guestTotal).toBe(240_000);
    expect(stay.checkoutStayAmountNgn).toBe(240_000);
    expect(ngnQuote.settlementTotalNgn).toBe(240_000);
    expect(fxStayQuote.settlementTotalNgn).toBe(240_000);
    expect(
      resolveCheckoutStayAmountNgn({
        guestTotal: stay.guestTotal,
        settlementTotalNgn: ngnQuote.settlementTotalNgn,
      }),
    ).toBe(240_000);
  });

  it('3. keeps owner accommodation rates distinct from guest-facing totals', () => {
    const stay = calculateGuestPricing({
      accommodationSubtotal: 200_000,
      mandatoryCharges: [{ label: 'Cleaning fee', amount: 15_000 }],
      refundableDeposit: 50_000,
    });

    expect(stay.ownerAccommodationRateNgn).toBe(200_000);
    expect(stay.guestFacingAccommodationNgn).toBe(240_000);
    expect(stay.guestFacingTotalNgn).toBe(255_000);
    expect(stay.ownerAccommodationRateNgn).not.toBe(stay.guestFacingAccommodationNgn);
    expect(stay.ownerAccommodationRateNgn).not.toBe(stay.guestFacingTotalNgn);
  });

  it('4. keeps payment processing costs distinct and never silently mixes them into the 20% guest service fee', () => {
    const paystackEstimate = estimatePaystackLocalFee(240_000);
    const stay = calculateGuestPricing({
      accommodationSubtotal: 200_000,
      paymentProcessingCostNgn: paystackEstimate.estimatedFeeNgn,
    });

    // 20% guest service fee remains strictly ₦40,000 and guest stay total remains ₦240,000
    expect(stay.guestServiceFeeNgn).toBe(40_000);
    expect(stay.guestFacingTotalNgn).toBe(240_000);
    expect(stay.paymentProcessingCostNgn).toBe(paystackEstimate.estimatedFeeNgn);
    expect(stay.paymentProcessingCostNgn).toBeGreaterThan(0);

    // Reserve reconciliation records actual provider fees separately without deducting from owner or agent
    const reconciliation = reconcilePaymentReserve(stay.allocation.paymentReserveNgn, 6_200);
    expect(reconciliation.actualProviderFeeNgn).toBe(6_200);
    expect(reconciliation.shortfallAbsorbedByHamletNgn).toBe(1_200);
  });

  it('5. never silently deducts agent earnings without an agreed commercial rule', () => {
    // Without closing-agent attribution, booking-level agent commercial allocation is ₦0
    const unattributedBooking = calculateGuestPricing({
      accommodationSubtotal: 200_000,
    });
    expect(unattributedBooking.agentCommercialAllocationNgn).toBe(0);
    expect(unattributedBooking.allocation.closingAgentCommissionNgn).toBe(0);

    // With explicit closing-agent attribution, agent allocation is funded from the 20% pool, not deducted from owner rate
    const attributedBooking = calculateGuestPricing({
      accommodationSubtotal: 200_000,
      hasClosingAgent: true,
    });
    expect(attributedBooking.agentCommercialAllocationNgn).toBe(20_000);
    expect(attributedBooking.ownerAccommodationRateNgn).toBe(200_000);

    // Owner settlement has ₦0 agent deduction unless an explicit agreed mandate rate is configured
    const defaultSettlement = calculateOwnerSettlement(attributedBooking);
    expect(defaultSettlement.agreedAgentCommissionNgn).toBe(0);
    expect(defaultSettlement.netOwnerSettlementNgn).toBe(200_000);

    const agreedMandateSettlement = calculateOwnerSettlement(attributedBooking, {
      agreedAgentCommissionRate: 0.1,
    });
    expect(agreedMandateSettlement.agreedAgentCommissionNgn).toBe(20_000);
    expect(agreedMandateSettlement.netOwnerSettlementNgn).toBe(180_000);
  });

  it('6. keeps refundable caution deposits strictly separate from accommodation pricing and fees', () => {
    const stay = calculateGuestPricing({
      accommodationSubtotal: 200_000,
      mandatoryCharges: [{ label: 'Cleaning fee', amount: 10_000 }],
      refundableDeposit: 100_000,
    });

    expect(stay.guestServiceFeeNgn).toBe(40_000);
    expect(stay.guestFacingTotalNgn).toBe(250_000);
    expect(stay.refundableCautionDepositNgn).toBe(100_000);

    const usdQuote = calculateBookingCurrencyQuote({
      ownerListedPriceNgn: 200_000,
      refundableDepositNgn: 160_000,
      quoteCurrency: 'USD',
      exchangeRateConfig: {
        currency: 'USD',
        currencyPair: 'NGN/USD',
        ngnPerUnit: 1_600,
        bufferRate: 0.1,
        source: 'test',
        quoteTtlMinutes: 30,
        effectiveAt: '2026-11-03T00:00:00Z',
        isActive: true,
      },
      now: new Date('2026-11-03T01:00:00Z'),
    });
    // 160,000 NGN / 1,600 = $100.00 (10,000 cents) — zero 20% fee and zero 10% FX buffer on caution deposit
    expect(usdQuote.quotedDepositMinor).toBe(10_000);
  });

  it('7. keeps future owner service charges and media upload limits configurable while inactive by default', () => {
    expect(DEFAULT_OWNER_COMMERCIAL_POLICY.ownerServiceFeeRate).toBe(0);
    expect(DEFAULT_OWNER_COMMERCIAL_POLICY.verificationChargeNgn).toBeNull();
    expect(DEFAULT_OWNER_COMMERCIAL_POLICY.reinspectionChargeNgn).toBeNull();
    expect(DEFAULT_OWNER_COMMERCIAL_POLICY.optionalServiceCharges).toHaveLength(0);

    const baseStay = calculateGuestPricing({
      accommodationSubtotal: 200_000,
      mandatoryCharges: [{ label: 'Cleaning fee', amount: 15_000 }],
    });

    // Inactive by default
    const inactive = calculateOwnerSettlement(baseStay);
    expect(inactive.totalOwnerChargesNgn).toBe(0);
    expect(inactive.netOwnerSettlementNgn).toBe(215_000);
    expect(ownerProceeds(baseStay)).toBe(215_000);

    // Configurable without rewriting core logic when a future approved policy is supplied
    const configured = calculateOwnerSettlement(baseStay, {
      ownerServiceFeeRate: 0.05,
      verificationChargeNgn: 25_000,
      optionalServiceCharges: [
        { code: 'premium_media', label: 'Extended media hosting', amountNgn: 10_000, enabled: true },
        { code: 'unused_plan', label: 'Inactive plan', amountNgn: 50_000, enabled: false },
      ],
    });
    expect(configured.ownerServiceFeeNgn).toBe(10_000);
    expect(configured.verificationChargeNgn).toBe(25_000);
    expect(configured.optionalServiceChargesNgn).toBe(10_000);
    expect(configured.totalOwnerChargesNgn).toBe(45_000);
    expect(configured.netOwnerSettlementNgn).toBe(170_000);
    expect(ownerProceeds(baseStay, { ownerServiceFeeRate: 0.05 })).toBe(205_000);

    // Media upload limits are also configurable via policy overrides
    expect(DEFAULT_PROPERTY_MEDIA_POLICY.maxImagesPerListing).toBe(12);
    expect(DEFAULT_PROPERTY_MEDIA_POLICY.videoUploadsEnabled).toBe(false);
    const customMedia = resolvePropertyMediaPolicy({
      maxImagesPerListing: 24,
      videoUploadsEnabled: true,
      maxVideosPerListing: 2,
      ownerStorageQuotaBytes: 500 * 1024 * 1024,
    });
    expect(customMedia.maxImagesPerListing).toBe(24);
    expect(customMedia.videoUploadsEnabled).toBe(true);
    expect(customMedia.maxVideosPerListing).toBe(2);
    expect(customMedia.ownerStorageQuotaBytes).toBe(500 * 1024 * 1024);
  });

  it('8. ensures no active website/application file promises permanent 0% owner fees or references the retired 3% fee', () => {
    expect(APPROVED_OWNER_SERVICES_POLICY_COPY).toContain(
      "Applicable service fees, verification charges, storage limits and optional paid services will be communicated transparently under HAMLET's current pricing and service policies.",
    );

    const activeFiles = [
      ...collectActiveFiles(join(ROOT, 'app')),
      ...collectActiveFiles(join(ROOT, 'src')),
      ...collectActiveFiles(join(ROOT, 'public')),
      ...collectActiveFiles(join(ROOT, 'supabase', 'functions')),
      join(ROOT, 'index.html'),
    ];

    const forbiddenPatterns: ReadonlyArray<{ label: string; regex: RegExp }> = [
      { label: 'retired 3% fee', regex: /\b3%\s*(?:hamlet|guest|platform|service|booking|fee)/i },
      { label: '0% owner/platform fee promise', regex: /\b0%\s*(?:hamlet\s+)?(?:(?:owner|host|listing|partner)\s*)?fee/i },
      { label: 'zero owner fee promise', regex: /\b(?:zero|no)\s+owner\s+(?:fee|commission)/i },
      { label: 'free verification/inspection promise', regex: /\bfree\s+(?:verification|inspection)/i },
      { label: 'owners keep 100% promise', regex: /\b(?:owners?\s+keep|keep)\s+100%\s+of\b/i },
      { label: 'list free headline promise', regex: /\blist\s+free\b/i },
    ];

    for (const filePath of activeFiles) {
      const content = readFileSync(filePath, 'utf8');
      for (const { label, regex } of forbiddenPatterns) {
        expect(
          content,
          `Active file ${filePath} must not contain ${label} (${regex})`,
        ).not.toMatch(regex);
      }
    }

    // Homepage, Horatio, legal, partner onboarding, listing wizard & AI knowledge surfaces include the approved owner services statement
    for (const relPath of [
      ['app', 'home-slideshow.tsx'],
      ['app', 'legal', 'page.tsx'],
      ['app', 'partners', 'apply', 'form', 'page.tsx'],
      ['app', 'partners', 'start', 'page.tsx'],
      ['src', 'components', 'forms', 'PropertyListingWizard.tsx'],
      ['src', 'components', 'HoratioDrawer.tsx'],
    ] as const) {
      expect(readFileSync(join(ROOT, ...relPath), 'utf8')).toContain(
        'APPROVED_OWNER_SERVICES_POLICY_COPY',
      );
    }

    for (const relPath of [
      ['src', 'components', 'site', 'SiteShell.tsx'],
      ['public', 'llms.txt'],
      ['public', 'llms-full.txt'],
    ] as const) {
      expect(readFileSync(join(ROOT, ...relPath), 'utf8')).toContain(
        APPROVED_OWNER_SERVICES_POLICY_COPY,
      );
    }
  });
});

describe('Paystack local processing fee estimate', () => {
  it('waives the fixed ₦100 component below ₦2,500', () => {
    expect(estimatePaystackLocalFee(2_000)).toMatchObject({
      estimatedFeeNgn: 30,
      estimatedGuestTotalNgn: 2_030,
      fixedFeeApplied: false,
      capped: false,
    });
  });

  it('applies 1.5% plus ₦100 at ₦2,500 and above', () => {
    expect(estimatePaystackLocalFee(2_500)).toMatchObject({
      estimatedFeeNgn: 138,
      estimatedGuestTotalNgn: 2_638,
      fixedFeeApplied: true,
      capped: false,
    });
  });

  it('caps the estimate at ₦2,000 for large local transactions', () => {
    expect(estimatePaystackLocalFee(500_000)).toMatchObject({
      estimatedFeeNgn: 2_000,
      estimatedGuestTotalNgn: 502_000,
      fixedFeeApplied: true,
      capped: true,
    });
  });

  it('safely handles zero, negative and non-finite inputs', () => {
    expect(estimatePaystackLocalFee(0).estimatedFeeNgn).toBe(0);
    expect(estimatePaystackLocalFee(-100).estimatedFeeNgn).toBe(0);
    expect(estimatePaystackLocalFee(Number.NaN).estimatedFeeNgn).toBe(0);
  });
});
