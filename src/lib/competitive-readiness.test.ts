import { describe, expect, it } from 'vitest';
import {
  buildTransparentFinancialBreakdown,
  DEFAULT_CONFIGURABLE_COMMERCIAL_POLICY,
  formatKoboAsNaira,
  koboToNaira,
  multiplyKoboBasisPoints,
  nairaToKobo,
  resolveConfigurableCommercialPolicy,
  validateAndComputeAgentDealTerms,
} from './pricing';
import {
  answerHoratioFromActualRecords,
  buildAuthorisedDealShareUrl,
  buildDealWhatsAppSummary,
  buildPublicPropertyTrustSummary,
  computeAvailabilityFreshness,
  computeBookingResponseIndicator,
  detectLikelyPropertyDuplicates,
  resolveSubmitterAccessRole,
  validateCautionDamageClaim,
} from './competitive-readiness';

describe('Competitive Readiness — Pure Pricing, Deal, Duplicate, Caution, Availability & Trust Logic', () => {
  it('computes integer kobo conversions and basis-point allocations with zero floating-point drift', () => {
    expect(nairaToKobo(200_000)).toBe(20_000_000);
    expect(nairaToKobo(19.99)).toBe(1_999);
    expect(koboToNaira(20_000_000)).toBe(200_000);
    expect(multiplyKoboBasisPoints(20_000_000, 2_000)).toBe(4_000_000); // 20.00%
    expect(multiplyKoboBasisPoints(20_000_000, 250)).toBe(500_000); // 2.50%
    expect(formatKoboAsNaira(14_000_000, true)).toBe('₦140,000.00');
  });

  it('validates configurable commercial policy and rejects allocations exceeding the service pool', () => {
    expect(DEFAULT_CONFIGURABLE_COMMERCIAL_POLICY.servicePoolBps).toBe(2_000);
    expect(DEFAULT_CONFIGURABLE_COMMERCIAL_POLICY.approvalState).toBe('approved_active');

    const unapprovedDraft = resolveConfigurableCommercialPolicy({
      closingAgentBps: 1_200,
    });
    expect(unapprovedDraft.approvalState).toBe('pending_owner_signoff_disabled');

    expect(() =>
      resolveConfigurableCommercialPolicy({
        servicePoolBps: 2_000,
        closingAgentBps: 1_500,
        directReferrerBps: 300,
        paymentReserveBps: 300,
      }),
    ).toThrow(/cannot exceed the total service pool/i);
  });

  it('supports both Fixed Agent Payout and Owner Net Rate deal structures and prevents agent double-paying', () => {
    // Structure 1: Fixed Agent Payout (Selling ₦200,000/week, Agent ₦60,000 -> Owner ₦140,000)
    const fixedDeal = validateAndComputeAgentDealTerms({
      dealStructure: 'fixed_agent_payout',
      billingUnit: 'per_week',
      authorisedSellingPriceNgn: 200_000,
      agentPayoutNgn: 60_000,
    });
    expect(fixedDeal.ownerAllocationNgn).toBe(140_000);
    expect(fixedDeal.agentPayoutNgn).toBe(60_000);
    expect(fixedDeal.ownerAllocationKobo + fixedDeal.agentPayoutKobo).toBe(
      fixedDeal.authorisedSellingPriceKobo,
    );

    // Structure 2: Owner Net Rate (Owner Net ₦140,000/week, Selling ₦200,000 -> Agent Margin ₦60,000)
    const netDeal = validateAndComputeAgentDealTerms({
      dealStructure: 'owner_net_rate',
      billingUnit: 'per_week',
      authorisedSellingPriceNgn: 200_000,
      ownerAllocationNgn: 140_000,
    });
    expect(netDeal.agentPayoutNgn).toBe(60_000);

    // Full 7-night stay breakdown with caution deposit strictly separated and NO double-paying
    const breakdown = buildTransparentFinancialBreakdown({
      stayNights: 7,
      ownerNightlyRateNgn: 30_000,
      mandatoryCharges: [{ label: 'Cleaning fee', amount: 15_000 }],
      cautionDepositNgn: 100_000,
      hasClosingAgent: true,
      hasEligibleReferrer: true,
      closingAgentId: 'agent-a',
      directReferrerId: 'partner-ref',
      acceptedDeal: {
        dealStructure: 'fixed_agent_payout',
        billingUnit: 'per_week',
        authorisedSellingPriceNgn: 200_000,
        agentPayoutNgn: 60_000,
      },
      snapshotCapturedAt: '2026-11-06T08:00:00.000Z',
    });

    expect(breakdown.accommodationBaseNgn).toBe(140_000);
    expect(breakdown.dealAgentPayoutNgn).toBe(60_000);
    expect(breakdown.authorisedAccommodationSubtotalNgn).toBe(200_000);
    expect(breakdown.hamletPlatformFeePoolNgn).toBe(40_000); // 20% of ₦200k
    // Anti-double-pay: agent receives ₦60,000 deal payout once — NOT ₦60,000 + ₦20,000!
    expect(breakdown.agentAllocationNgn).toBe(60_000);
    expect(breakdown.agentCompensationSource).toBe('accepted_owner_deal');
    // Referrer 2.5% stays inside the 20% pool (₦5,000), never stacked above 20%
    expect(breakdown.referrerAllocationNgn).toBe(5_000);
    expect(breakdown.paymentReserveNgn).toBe(5_000);
    expect(breakdown.hamletNetAllocationNgn).toBe(30_000);
    // Caution deposit is strictly excluded from guest stay payable
    expect(breakdown.guestStayPayableNgn).toBe(255_000); // 200k + 40k + 15k cleaning
    expect(breakdown.cautionDepositNgn).toBe(100_000);
    expect(breakdown.totalGuestOutlayWithDepositNgn).toBe(355_000);
  });

  it('requires deal acceptance token before generating an authorised deal share link', () => {
    expect(() =>
      buildAuthorisedDealShareUrl({
        propertyId: 'prop-vi-1',
        shareToken: '',
        dealCode: 'HDL-TEST01',
      }),
    ).toThrow(/must be accepted before generating/i);

    const shareUrl = buildAuthorisedDealShareUrl({
      propertyId: 'prop-vi-1',
      shareToken: 'hsl_1234567890abcdefghij',
      dealCode: 'HDL-TEST01',
      origin: 'https://hamlet.rest',
    });
    expect(shareUrl).toBe(
      'https://hamlet.rest/stays/prop-vi-1?ref=hsl_1234567890abcdefghij&deal=HDL-TEST01&src=whatsapp_deal',
    );

    const wa = buildDealWhatsAppSummary({
      propertyTitle: 'Oceanfront 2BR',
      area: 'Victoria Island',
      dealStructure: 'fixed_agent_payout',
      billingUnit: 'per_night',
      authorisedSellingPriceNgn: 100_000,
      minStayNights: 2,
      shareUrl,
    });
    expect(wa.text).toContain('Oceanfront 2BR');
    expect(wa.text).toContain('₦120,000 / night');
    expect(wa.whatsappUrl).toContain('https://wa.me/?text=');
  });

  it('prevents submitting agents from becoming owners and flags near-duplicate listings non-destructively', () => {
    const agentSubmitter = resolveSubmitterAccessRole('Property introducer / agent');
    expect(agentSubmitter.relationship).toBe('sourcing_agent');
    expect(agentSubmitter.accessRole).toBe('sourcing_agent');

    const flags = detectLikelyPropertyDuplicates(
      {
        title: 'Modern 2 Bed Flat Off Adeola Odeku',
        area: 'Victoria Island',
        publicAddress: '14B Adeola Odeku Close, Victoria Island',
        ownerOrSubmitterId: 'agent-2',
        imageUrls: ['https://cdn.hamlet.rest/prop1/living.webp'],
      },
      [
        {
          id: 'prop-canonical',
          title: 'Executive Two Bedroom Suite',
          area: 'Victoria Island',
          publicAddress: '14B Adeola Odeku Close, Victoria Island',
          ownerOrSubmitterId: 'owner-1',
          imageUrls: ['https://cdn.hamlet.rest/prop1/living.webp'],
          status: 'approved',
        },
      ],
    );
    expect(flags).toHaveLength(1);
    expect(flags[0].matchedPropertyId).toBe('prop-canonical');
    expect(flags[0].confidenceScore).toBeGreaterThanOrEqual(80);
    expect(flags[0].matchReasons).toContain('identical_public_address');
    expect(flags[0].matchReasons).toContain('shared_property_images');
  });

  it('enforces wear-and-tear exclusion and timestamped evidence on caution damage claims', () => {
    expect(() =>
      validateCautionDamageClaim({
        depositAmountNgn: 100_000,
        claimedAmountNgn: 20_000,
        issueDescription: 'Minor scuff on wall paint from normal suitcase contact',
        evidence: [
          {
            url: 'https://example.com/scuff.jpg',
            media_type: 'photo',
            caption: 'Wall',
            captured_at: '2026-11-06T10:00:00Z',
          },
        ],
        excludesNormalWearAndTear: false,
      }),
    ).toThrow(/Normal wear and tear/i);

    expect(() =>
      validateCautionDamageClaim({
        depositAmountNgn: 100_000,
        claimedAmountNgn: 25_000,
        issueDescription: 'Cracked glass coffee table top reported at checkout',
        evidence: [],
        excludesNormalWearAndTear: true,
      }),
    ).toThrow(/evidence item is required/i);
  });

  it('computes honest availability freshness and overdue partner response indicators', () => {
    const fresh = computeAvailabilityFreshness({
      bookingMode: 'request_to_book',
      lastAvailabilityUpdate: '2026-11-05T10:00:00Z',
      nowIso: '2026-11-06T10:00:00Z',
    });
    expect(fresh.bookingModeLabel).toBe('Request to book');
    expect(fresh.freshnessTone).toBe('fresh');
    expect(fresh.lastUpdatedLabel).toContain('1 day ago');

    const overdue = computeBookingResponseIndicator({
      status: 'requested',
      createdAt: '2026-11-05T08:00:00Z',
      nowIso: '2026-11-06T10:00:00Z',
    });
    expect(overdue.isOverdue).toBe(true);
    expect(overdue.hoursWaiting).toBe(26);
    expect(overdue.ownerResponseLabel).toContain('Overdue response');
  });

  it('never claims full verification on partial trust checks and grounds Horatio answers on real records', () => {
    const partialTrust = buildPublicPropertyTrustSummary({
      trustChecks: [
        { check_code: 'details_submitted', status: 'verified' },
        { check_code: 'listing_reviewed', status: 'verified' },
        { check_code: 'owner_identity_reviewed', status: 'pending_review' },
      ],
    });
    expect(partialTrust.allChecksVerified).toBe(false);
    expect(partialTrust.headlineLabel).toBe('2 of 7 trust checks completed');

    const horatioCaution = answerHoratioFromActualRecords({
      question: 'What is the caution fee for Lekki Phase 1 stays?',
      approvedStays: [
        {
          id: 'stay-lekki-1',
          title: 'Waterfront Loft',
          area: 'Lekki Phase 1',
          nightlyRateNgn: 100_000,
          cautionDepositNgn: 80_000,
          amenities: ['24/7 Estate Power', 'Fibre Wi-Fi'],
        },
      ],
    });
    expect(horatioCaution.answer).toContain('₦80,000 refundable caution deposit');
    expect(horatioCaution.matchedPropertyIds).toEqual(['stay-lekki-1']);
  });
});
