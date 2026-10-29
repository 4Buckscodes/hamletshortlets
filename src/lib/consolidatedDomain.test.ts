import { describe, expect, it } from 'vitest';
import {
  computePropertyAvailabilitySummary,
  normalizeAvailabilityBlock,
} from './availability';
import {
  buildCanonicalReferralUrl,
  buildClosingAgentShareUrl,
  buildGuestReferralUrl,
  buildPartnerReferralCode,
  buildReferralWhatsAppShareUrl,
  evaluateReferralOnBookingCompletion,
  HAMLET_PRODUCTION_ORIGIN,
  isValidReferralCodeFormat,
} from './referrals';
import {
  calculateBookingCurrencyQuote,
  calculateGuestPricing,
  calculateInternationalStayQuote,
  calculateMarkupAllocation,
  isQuoteExpired,
  reconcilePaymentReserve,
} from './pricing';
import {
  convertDomesticStayToGbp,
  convertDomesticStayToUsd,
  convertNairaToGbp,
  convertNairaToUsd,
  formatMinorCurrency,
  formatStayAmount,
} from './currency';

describe('§12.1 Property Availability & Decoupled Publication Engine', () => {
  const todayIso = '2026-10-24';

  it('distinguishes "Currently booked" (HAMLET confirmed stay today) from "Currently unavailable" (owner/external block or future first-available date)', () => {
    const bookedOnHamlet = computePropertyAvailabilitySummary({
      property: {
        id: 'p-booked',
        firstAvailableDate: null,
        availabilityConfirmationStatus: 'confirmed',
        unavailableBlocks: [],
      },
      bookings: [
        {
          propertyId: 'p-booked',
          checkIn: '2026-10-22',
          checkOut: '2026-10-27',
          status: 'confirmed',
        },
      ],
      todayIso,
    });

    expect(bookedOnHamlet.label).toBe('Currently booked');
    expect(bookedOnHamlet.isBookedTodayOnHamlet).toBe(true);
    expect(bookedOnHamlet.nextAvailableDate).toBe('2026-10-27');
    expect(bookedOnHamlet.nextAvailableLabel).toBe('Next available: 27 Oct 2026');
    expect(bookedOnHamlet.relativeAvailableLabel).toBe('Available in 3 days');

    const externalBlocked = computePropertyAvailabilitySummary({
      property: {
        id: 'p-blocked',
        firstAvailableDate: null,
        availabilityConfirmationStatus: 'confirmed',
        unavailableBlocks: [
          {
            id: 'blk-1',
            propertyId: 'p-blocked',
            startDate: '2026-10-20',
            endDate: '2026-10-29',
            blockType: 'external_booking',
            createdAt: '2026-10-20T00:00:00Z',
          },
        ],
      },
      bookings: [],
      todayIso,
    });

    expect(externalBlocked.label).toBe('Currently unavailable');
    expect(externalBlocked.isBookedTodayOnHamlet).toBe(false);
    expect(externalBlocked.nextAvailableDate).toBe('2026-10-29');
    expect(externalBlocked.nextAvailableLabel).toBe('Next available: 29 Oct 2026');
  });

  it('advances nextAvailableDate past contiguous/overlapping blocks and never fabricates a date when unconfirmed', () => {
    const contiguous = computePropertyAvailabilitySummary({
      property: {
        id: 'p-contig',
        firstAvailableDate: '2026-10-26',
        availabilityConfirmationStatus: 'confirmed',
        unavailableBlocks: [
          {
            id: 'b1',
            propertyId: 'p-contig',
            startDate: '2026-10-26',
            endDate: '2026-10-30',
            blockType: 'owner_block',
            createdAt: '2026-10-20T00:00:00Z',
          },
        ],
      },
      bookings: [
        {
          propertyId: 'p-contig',
          checkIn: '2026-10-30',
          checkOut: '2026-11-02',
          status: 'confirmed',
        },
      ],
      todayIso,
    });

    expect(contiguous.nextAvailableDate).toBe('2026-11-02');
    expect(contiguous.nextAvailableLabel).toBe('Next available: 2 Nov 2026');

    const unconfirmedNoDate = computePropertyAvailabilitySummary({
      property: {
        id: 'p-unconf',
        firstAvailableDate: null,
        availabilityConfirmationStatus: 'needs_confirmation',
        unavailableBlocks: [],
      },
      todayIso,
    });

    expect(unconfirmedNoDate.label).toBe('Availability needs confirmation');
    expect(unconfirmedNoDate.nextAvailableDate).toBeNull();
    expect(unconfirmedNoDate.nextAvailableLabel).toBeNull();
  });

  it('evaluates selected date ranges with exact guest-facing labels and validates block boundaries', () => {
    const baseProp = {
      id: 'p-sel',
      firstAvailableDate: '2026-10-25',
      availabilityConfirmationStatus: 'confirmed' as const,
      unavailableBlocks: [
        {
          id: 'b-mid',
          propertyId: 'p-sel',
          startDate: '2026-11-05',
          endDate: '2026-11-10',
          blockType: 'maintenance' as const,
          createdAt: '2026-10-20T00:00:00Z',
        },
      ],
    };

    const availableRange = computePropertyAvailabilitySummary({
      property: baseProp,
      requestedCheckIn: '2026-11-10', // exact checkout turnover boundary allowed
      requestedCheckOut: '2026-11-14',
      todayIso,
    });
    expect(availableRange.label).toBe('Available for your dates');
    expect(availableRange.availableForSelectedDates).toBe(true);

    const conflictingRange = computePropertyAvailabilitySummary({
      property: baseProp,
      requestedCheckIn: '2026-11-08',
      requestedCheckOut: '2026-11-12',
      todayIso,
    });
    expect(conflictingRange.label).toBe('Unavailable for selected dates');
    expect(conflictingRange.availableForSelectedDates).toBe(false);

    const needsConfirmRange = computePropertyAvailabilitySummary({
      property: { ...baseProp, availabilityConfirmationStatus: 'needs_confirmation' },
      requestedCheckIn: '2026-11-12',
      requestedCheckOut: '2026-11-15',
      todayIso,
    });
    expect(needsConfirmRange.label).toBe('Availability needs confirmation');

    expect(
      normalizeAvailabilityBlock({
        propertyId: 'p-sel',
        startDate: '2026-11-10',
        endDate: '2026-11-10',
        blockType: 'owner_block',
      }),
    ).toBeNull();
  });
});

describe('§12.2 Partner Referral Links & 90-Day Recurring 2.5% Reward Engine', () => {
  it('generates canonical https://www.hamlet.rest/ onboarding & WhatsApp share URLs and collision-safe codes', () => {
    expect(HAMLET_PRODUCTION_ORIGIN).toBe('https://www.hamlet.rest');
    const code = buildPartnerReferralCode('Tunde Adeyemi', 'seed-1');
    expect(isValidReferralCodeFormat(code)).toBe(true);

    const collisionAvoided = buildPartnerReferralCode('Tunde Adeyemi', 'seed-1', new Set([code]));
    expect(collisionAvoided).not.toBe(code);
    expect(isValidReferralCodeFormat(collisionAvoided)).toBe(true);

    const url = buildCanonicalReferralUrl('hml-tun101');
    expect(url).toBe('https://www.hamlet.rest/partners/apply?ref=HML-TUN101');
    expect(url).not.toContain('https://hamlet.rest/');

    const agentUrl = buildClosingAgentShareUrl('hml-chi202', 'p-01');
    expect(agentUrl).toBe('https://www.hamlet.rest/stays/p-01?agent=HML-CHI202');

    expect(buildGuestReferralUrl('hml-tun101')).toBe('https://www.hamlet.rest/?ref=HML-TUN101');

    const waUrl = buildReferralWhatsAppShareUrl('HML-TUN101', 'Tunde Adeyemi');
    expect(waUrl).toContain('https://wa.me/?text=');
    expect(decodeURIComponent(waUrl)).toContain('https://www.hamlet.rest/partners/apply?ref=HML-TUN101');
  });

  it('activates referral on 1st completed booking with ₦0 reward, awards 2.5% of B within 90 days, and expires after 90 days', () => {
    // 1. First completed booking activates referral (₦0 payout) and opens 90-day window
    const firstEval = evaluateReferralOnBookingCompletion({
      referral: {
        id: 'ref-1',
        referrerPartnerId: 'p-ref',
        referredPartnerId: 'p-agent',
        status: 'verified',
        earningWindowDays: 90,
      },
      referrerAccountActive: true,
      referredAccountActive: true,
      bookingId: 'b-first',
      bookingStatus: 'completed',
      closingAgentId: 'p-agent',
      ownerListedPriceNgn: 200_000,
      completedAtIso: '2026-10-01T12:00:00.000Z',
    });

    expect(firstEval.action).toBe('activate_only');
    expect(firstEval.rewardRate).toBe(0);
    expect(firstEval.rewardAmountNgn).toBe(0);
    expect(firstEval.nextEligibilityEndsAt).toBe('2026-12-30T12:00:00.000Z');

    // 2. Second completed booking within 90-day window earns 2.5% of B (₦5,000 on ₦200,000)
    const secondEval = evaluateReferralOnBookingCompletion({
      referral: {
        id: 'ref-1',
        referrerPartnerId: 'p-ref',
        referredPartnerId: 'p-agent',
        status: 'active',
        earningWindowDays: 90,
        activatedAt: firstEval.nextActivatedAt,
        activatingBookingId: 'b-first',
        eligibilityStartsAt: firstEval.nextActivatedAt,
        eligibilityEndsAt: firstEval.nextEligibilityEndsAt,
      },
      referrerAccountActive: true,
      referredAccountActive: true,
      bookingId: 'b-second',
      bookingStatus: 'completed',
      closingAgentId: 'p-agent',
      ownerListedPriceNgn: 200_000,
      completedAtIso: '2026-11-15T12:00:00.000Z',
    });

    expect(secondEval.action).toBe('award_recurring');
    expect(secondEval.rewardRate).toBe(0.025);
    expect(secondEval.rewardAmountNgn).toBe(5_000);

    // 3. Booking completed after 90-day window expires earns ₦0
    const expiredEval = evaluateReferralOnBookingCompletion({
      referral: {
        id: 'ref-1',
        referrerPartnerId: 'p-ref',
        referredPartnerId: 'p-agent',
        status: 'active',
        earningWindowDays: 90,
        activatedAt: firstEval.nextActivatedAt,
        activatingBookingId: 'b-first',
        eligibilityStartsAt: firstEval.nextActivatedAt,
        eligibilityEndsAt: firstEval.nextEligibilityEndsAt,
      },
      referrerAccountActive: true,
      referredAccountActive: true,
      bookingId: 'b-late',
      bookingStatus: 'completed',
      closingAgentId: 'p-agent',
      ownerListedPriceNgn: 200_000,
      completedAtIso: '2027-01-05T12:00:00.000Z',
    });

    expect(expiredEval.action).toBe('window_expired');
    expect(expiredEval.rewardAmountNgn).toBe(0);

    // 4. Self-referral & uncompleted bookings earn ₦0
    const selfEval = evaluateReferralOnBookingCompletion({
      referral: {
        id: 'ref-self',
        referrerPartnerId: 'p-same',
        referredPartnerId: 'p-same',
        status: 'active',
        earningWindowDays: 90,
        eligibilityStartsAt: '2026-10-01T00:00:00Z',
        eligibilityEndsAt: '2026-12-30T00:00:00Z',
      },
      referrerAccountActive: true,
      referredAccountActive: true,
      bookingId: 'b-self',
      bookingStatus: 'completed',
      closingAgentId: 'p-same',
      ownerListedPriceNgn: 200_000,
    });
    expect(selfEval.action).toBe('none');
    expect(selfEval.rewardAmountNgn).toBe(0);
  });
});

describe('§12.3 & §12.4 20% Domestic Pricing, Reserve Reconciliation & 10% USD/GBP Buffer', () => {
  it('reconciles 2.5% internal payment reserve against actual Paystack fee without deducting shortfalls from owner or partner commissions', () => {
    const withinReserve = reconcilePaymentReserve(5_000, 3_600);
    expect(withinReserve.status).toBe('within_reserve');
    expect(withinReserve.unusedReserveNgn).toBe(1_400);
    expect(withinReserve.shortfallAbsorbedByHamletNgn).toBe(0);

    const exceedsReserve = reconcilePaymentReserve(5_000, 6_200);
    expect(exceedsReserve.status).toBe('exceeds_reserve');
    expect(exceedsReserve.unusedReserveNgn).toBe(0);
    expect(exceedsReserve.shortfallAbsorbedByHamletNgn).toBe(1_200);
  });

  it('applies the 10% USD and GBP buffer ONCE ($200 -> $220, £200 -> £220), keeps caution deposit unbuffered, and preserves NGN commissions', () => {
    // Concrete verification: Owner B = ₦200,000 -> Domestic guest price = ₦240,000
    // At 1,200 NGN/USD: Converted base = $200.00 -> +10% buffer ($20.00) = $220.00
    const usdQuote = calculateBookingCurrencyQuote({
      ownerListedPriceNgn: 200_000,
      mandatoryChargesTotalNgn: 0,
      refundableDepositNgn: 120_000, // $100.00 unbuffered!
      quoteCurrency: 'USD',
      exchangeRateConfig: {
        currency: 'USD',
        currencyPair: 'NGN/USD',
        ngnPerUnit: 1_200,
        source: 'test_reference',
        effectiveAt: '2026-10-24T10:00:00.000Z',
        quoteTtlMinutes: 30,
        isActive: true,
      },
      hasClosingAgent: true,
      hasQualifyingDirectReferrer: true,
      now: new Date('2026-10-24T10:00:00.000Z'),
    });

    expect(usdQuote.ok).toBe(true);
    expect(usdQuote.quoteCurrency).toBe('USD');
    expect(usdQuote.convertedBaseMinor).toBe(20_000); // $200.00
    expect(usdQuote.internationalBufferMinor).toBe(2_000); // $20.00 (10% once)
    expect(usdQuote.quotedStayTotalMinor).toBe(22_000); // $220.00
    expect(usdQuote.quotedDepositMinor).toBe(10_000); // $100.00 (0% buffer on caution deposit!)
    expect(usdQuote.quotedGrandTotalMinor).toBe(32_000); // $320.00
    expect(usdQuote.internationalBufferNgnEquiv).toBe(24_000);
    expect(usdQuote.settlementTotalNgn).toBe(264_000);
    expect(formatMinorCurrency(usdQuote.quotedStayTotalMinor, 'USD')).toBe('$220');

    // Concrete verification: £200 converted base -> £220 with 10% buffer
    const gbpQuote = calculateBookingCurrencyQuote({
      ownerListedPriceNgn: 200_000,
      mandatoryChargesTotalNgn: 0,
      refundableDepositNgn: 120_000,
      quoteCurrency: 'GBP',
      exchangeRateConfig: {
        currency: 'GBP',
        currencyPair: 'NGN/GBP',
        ngnPerUnit: 1_200,
        source: 'test_reference',
        effectiveAt: '2026-10-24T10:00:00.000Z',
        quoteTtlMinutes: 30,
        isActive: true,
      },
      now: new Date('2026-10-24T10:00:00.000Z'),
    });

    expect(gbpQuote.ok).toBe(true);
    expect(gbpQuote.convertedBaseMinor).toBe(20_000); // £200.00
    expect(gbpQuote.internationalBufferMinor).toBe(2_000); // £20.00
    expect(gbpQuote.quotedStayTotalMinor).toBe(22_000); // £220.00
    expect(formatMinorCurrency(gbpQuote.quotedStayTotalMinor, 'GBP')).toBe('£220');

    // NGN commissions remain strictly based on B = ₦200,000 regardless of USD/GBP selection (§6.2)
    const pricing = calculateGuestPricing({
      accommodationSubtotal: 200_000,
      hasClosingAgent: true,
      hasEligibleReferrer: true,
      closingAgentId: 'agent-1',
      directReferrerId: 'ref-1',
    });
    expect(pricing.allocation.closingAgentCommissionNgn).toBe(20_000);
    expect(pricing.allocation.directReferrerRewardNgn).toBe(5_000);

    // Direct helper checks
    expect(convertNairaToUsd(320_000, 1600)).toBe(200);
    expect(convertDomesticStayToUsd(320_000, 1600)).toBe(220);
    expect(convertNairaToGbp(400_000, 2000)).toBe(200);
    expect(convertDomesticStayToGbp(400_000, 2000)).toBe(220);
    expect(formatStayAmount(320_000, 'USD', 1600)).toBe('$220');
    expect(formatStayAmount(400_000, 'GBP', 2000)).toBe('£220');
  });

  it('safely falls back to NGN without inventing rates when FX rate is missing, inactive, invalid, or expired', () => {
    const missing = calculateInternationalStayQuote({
      domesticGuestAmountNgn: 240_000,
      currency: 'USD',
      rateConfig: null,
    });
    expect(missing.ok).toBe(false);
    expect(missing.currency).toBe('NGN');
    expect(missing.fallbackReason).toBe('rate_unavailable');
    expect(missing.quotedGuestTotal).toBe(240_000);

    const expired = calculateInternationalStayQuote({
      domesticGuestAmountNgn: 240_000,
      currency: 'GBP',
      rateConfig: {
        currency: 'GBP',
        currencyPair: 'NGN/GBP',
        ngnPerUnit: 2_000,
        source: 'stale_feed',
        effectiveAt: '2026-10-20T00:00:00.000Z',
        expiresAt: '2026-10-23T00:00:00.000Z',
        isActive: true,
      },
      now: new Date('2026-10-24T00:00:00.000Z'),
    });
    expect(expired.ok).toBe(false);
    expect(expired.currency).toBe('NGN');
    expect(expired.fallbackReason).toBe('rate_expired');

    expect(isQuoteExpired('2026-10-24T09:59:59.000Z', new Date('2026-10-24T10:00:00.000Z'))).toBe(true);
    expect(isQuoteExpired('2026-10-24T10:30:00.000Z', new Date('2026-10-24T10:00:00.000Z'))).toBe(false);
  });

  it('blocks self-referral double-dipping inside calculateMarkupAllocation', () => {
    const samePartner = calculateMarkupAllocation({
      ownerListedPriceNgn: 200_000,
      hasClosingAgent: true,
      hasEligibleReferrer: true,
      closingAgentId: 'partner-same',
      directReferrerId: 'partner-same',
    });
    expect(samePartner.directReferrerRewardNgn).toBe(0);
    expect(samePartner.hamletAllocationNgn).toBe(15_000);
  });
});
