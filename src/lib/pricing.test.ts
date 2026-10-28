import { describe, expect, it } from 'vitest';
import {
  calculateGuestPricing,
  estimatePaystackLocalFee,
  calculateMarkupAllocation,
  datesOverlap,
  HAMLET_DOMESTIC_MARKUP_RATE,
  HAMLET_GUEST_SERVICE_FEE_RATE,
  nightsBetween,
  OWNER_HAMLET_FEE_RATE,
  ownerProceeds,
  priceStay,
} from './pricing';

describe('HAMLET booking pricing & date helpers', () => {
  it('applies the 20% domestic markup only to accommodation subtotal (B) and excludes mandatory charges and refundable deposit', () => {
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
    expect(breakdown.ownerListedPriceNgn).toBe(450_000);
    expect(breakdown.accommodationSubtotal).toBe(450_000);
    expect(breakdown.domesticMarkupNgn).toBe(90_000);
    expect(breakdown.domesticGuestPriceNgn).toBe(540_000);
    expect(breakdown.mandatoryChargesTotal).toBe(40_000);
    expect(breakdown.hamletGuestServiceFee).toBe(90_000);
    expect(breakdown.guestTotal).toBe(580_000);
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
