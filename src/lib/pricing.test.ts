import { describe, expect, it } from 'vitest';
import {
  calculateGuestPricing,
  datesOverlap,
  HAMLET_GUEST_SERVICE_FEE_RATE,
  nightsBetween,
  OWNER_HAMLET_FEE_RATE,
  ownerProceeds,
  priceStay,
} from './pricing';

describe('HAMLET booking pricing & date helpers', () => {
  it('applies the 3% guest fee only to accommodation subtotal and excludes mandatory charges and refundable deposit', () => {
    const breakdown = calculateGuestPricing({
      accommodationSubtotal: 450_000,
      mandatoryCharges: [
        { label: 'Cleaning & turnover', amount: 25_000 },
        { label: 'Diesel & power levy', amount: 15_000 },
      ],
      refundableDeposit: 100_000,
    });

    expect(HAMLET_GUEST_SERVICE_FEE_RATE).toBe(0.03);
    expect(OWNER_HAMLET_FEE_RATE).toBe(0);
    expect(breakdown.accommodationSubtotal).toBe(450_000);
    expect(breakdown.mandatoryChargesTotal).toBe(40_000);
    expect(breakdown.hamletGuestServiceFee).toBe(13_500);
    expect(breakdown.guestTotal).toBe(503_500);
    expect(breakdown.refundableDeposit).toBe(100_000);
    expect(ownerProceeds(breakdown)).toBe(490_000);
  });

  it('rounds fractional naira fees consistently and clamps negative inputs to zero', () => {
    const breakdown = calculateGuestPricing({
      accommodationSubtotal: 133_350, // 3% = 4000.5 -> rounds to 4001
      mandatoryCharges: [{ label: 'Adjustment', amount: -500 }],
      refundableDeposit: -10,
    });

    expect(breakdown.hamletGuestServiceFee).toBe(4_001);
    expect(breakdown.mandatoryChargesTotal).toBe(0);
    expect(breakdown.guestTotal).toBe(137_351);
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
    expect(stay.hamletGuestServiceFee).toBe(7_200);
    expect(stay.guestTotal).toBe(267_200);
    expect(stay.refundableDeposit).toBe(80_000);
  });

  it('treats overlapping date ranges as conflicts while allowing same-day check-out/check-in turnover', () => {
    expect(datesOverlap('2026-11-10', '2026-11-14', '2026-11-12', '2026-11-16')).toBe(true);
    expect(datesOverlap('2026-11-10', '2026-11-14', '2026-11-10', '2026-11-14')).toBe(true);
    expect(datesOverlap('2026-11-10', '2026-11-14', '2026-11-14', '2026-11-17')).toBe(false);
    expect(datesOverlap('2026-11-14', '2026-11-17', '2026-11-10', '2026-11-14')).toBe(false);
  });
});
