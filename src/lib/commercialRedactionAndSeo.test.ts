import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import robotsRoute from '../../app/robots';
import sitemapRoute, { revalidate as sitemapRevalidate } from '../../app/sitemap';
import nextConfig from '../../next.config';
import { hasContradictoryLagosStreetAddress } from './areas';
import {
  DEFAULT_DISCOVERY_FILTERS,
  filterAndSortApprovedStays,
  resolveStayGuestNightlyNgn,
  toPublicStayView,
} from './discovery';
import {
  PARTNER_PROPERTY_SELECT,
  PUBLIC_PROPERTY_SELECT,
  type PublicStayRecord,
} from './next-supabase';
import {
  calculateGuestPricing,
  calculatePublicStayQuote,
  guestFacingNightlyNgn,
} from './pricing';
import {
  buildHomepageSchema,
  buildPropertyDetailSchema,
  buildPropertyListingPageSchema,
} from './structured-data';

const ROOT = resolve(process.cwd());

/**
 * Evaluates a URL path against a robots.txt rule using RFC 9309 §2.2.2 longest-path-match
 * precedence (ties between equal-length Allow and Disallow resolve in favour of Allow).
 */
function isAllowedByRfc9309Rule(
  pathname: string,
  rule: { allow?: string | string[]; disallow?: string | string[] },
): boolean {
  const allows = (Array.isArray(rule.allow) ? rule.allow : rule.allow ? [rule.allow] : []).filter(
    Boolean,
  );
  const disallows = (
    Array.isArray(rule.disallow) ? rule.disallow : rule.disallow ? [rule.disallow] : []
  ).filter(Boolean);

  let bestLength = -1;
  let decision = true;

  for (const pattern of disallows) {
    if (pathname.startsWith(pattern) && pattern.length > bestLength) {
      bestLength = pattern.length;
      decision = false;
    }
  }

  for (const pattern of allows) {
    if (pathname.startsWith(pattern) && pattern.length >= bestLength) {
      bestLength = pattern.length;
      decision = true;
    }
  }

  return decision;
}

function findRuleForAgent(userAgent: string) {
  const config = robotsRoute();
  const rules = Array.isArray(config.rules) ? config.rules : [config.rules];
  const specific = rules.find(rule => {
    const agents = Array.isArray(rule.userAgent) ? rule.userAgent : [rule.userAgent];
    return agents.some(agent => agent.toLowerCase() === userAgent.toLowerCase());
  });
  if (specific) return specific;
  return rules.find(rule => {
    const agents = Array.isArray(rule.userAgent) ? rule.userAgent : [rule.userAgent];
    return agents.includes('*');
  })!;
}

const RAW_SENSITIVE_ROW = {
  id: 'c025a253-3e3d-4ea1-80e2-dd354c545b3b',
  title: 'Luxury 2Bedroom Apartment for Short and Long Stay.',
  property_type: 'Apartment',
  area: 'Victoria Island',
  public_address: '14 Adeola Odeku Street, Victoria Island',
  nightly_rate: 195_000, // Private owner rate B -> guest rate must be 234,000
  cleaning_fee: 25_000,
  mandatory_charges: [{ label: 'Cleaning & turnover', amount: 25_000 }],
  refundable_deposit: 100_000,
  bedrooms: 2,
  bathrooms: 2,
  capacity: 6,
  bed_setup: '2 queen beds',
  amenities: ['24/7 Estate Power', 'Fibre Wi-Fi', 'Air Conditioning'],
  image_urls: ['https://example.supabase.co/storage/v1/object/public/property-media/vi-1.jpeg'],
  house_rules: ['No smoking indoors'],
  status: 'approved',
  verification: {
    ownership: 'verified',
    identity: 'verified',
    authority: 'verified',
    inspection: 'verified',
  },
  trust_label: 'HAMLET verified',
  first_available_date: '2026-11-10',
  availability_confirmation_status: 'confirmed',
  calendar_responsible_person: 'Chinedu Okafor (+2348012345678)',
  review_note: 'Internal admin verification note: C of O sighted physically.',
  owner_id: 'owner-secret-uuid-999',
  partner_email: 'private-owner@example.com',
  created_at: '2026-11-04T07:00:12.664Z',
  updated_at: '2026-11-05T15:41:34.547Z',
};

describe('PR 1 — Commercial Redaction & Confidentiality Guarantees', () => {
  it('strips private owner base rates, operational contacts, review notes, and unrecognised DB columns in toPublicStayView', () => {
    const redacted = toPublicStayView(RAW_SENSITIVE_ROW as unknown as PublicStayRecord);
    const serialized = JSON.stringify(redacted);

    // Guest-facing price matches HAMLET central pricing logic (195,000 * 1.20 = 234,000)
    expect(redacted.guest_nightly_ngn).toBe(guestFacingNightlyNgn(195_000));
    expect(redacted.guest_nightly_ngn).toBe(234_000);
    expect(resolveStayGuestNightlyNgn(redacted)).toBe(234_000);

    // Idempotency: re-mapping an already-redacted stay NEVER double-applies the 20% fee
    const remapped = toPublicStayView(redacted);
    expect(remapped.guest_nightly_ngn).toBe(234_000);

    // Zero private commercial or operational keys or values in serialized RSC payload
    expect('nightly_rate' in redacted).toBe(false);
    expect('calendar_responsible_person' in redacted).toBe(false);
    expect('review_note' in redacted).toBe(false);
    expect('owner_id' in redacted).toBe(false);
    expect('partner_email' in redacted).toBe(false);

    expect(serialized).toContain('234000');
    expect(serialized).not.toContain('195000');
    expect(serialized).not.toContain('Chinedu Okafor');
    expect(serialized).not.toContain('+2348012345678');
    expect(serialized).not.toContain('C of O sighted');
    expect(serialized).not.toContain('owner-secret-uuid-999');
    expect(serialized).not.toContain('private-owner@example.com');
  });

  it('preserves exact multi-night guest totals in calculatePublicStayQuote without exposing owner rates or margin allocations', () => {
    const ownerNightly = 195_000;
    const cleaningFee = 25_000;
    const deposit = 100_000;
    const guestNightly = guestFacingNightlyNgn(ownerNightly);

    for (const nights of [1, 2, 3, 7, 14, 30]) {
      const serverPricing = calculateGuestPricing({
        accommodationSubtotal: ownerNightly * nights,
        mandatoryCharges: [{ label: 'Cleaning & turnover', amount: cleaningFee }],
        refundableDeposit: deposit,
      });

      const publicQuote = calculatePublicStayQuote({
        guestNightlyNgn: guestNightly,
        nights,
        mandatoryCharges: [{ label: 'Cleaning & turnover', amount: cleaningFee }],
        refundableDeposit: deposit,
      });

      expect(publicQuote.domesticGuestAccommodationNgn).toBe(
        serverPricing.domesticGuestAccommodationNgn,
      );
      expect(publicQuote.mandatoryChargesTotal).toBe(serverPricing.mandatoryChargesTotal);
      expect(publicQuote.guestTotal).toBe(serverPricing.guestTotal);
      expect(publicQuote.checkoutStayAmountNgn).toBe(serverPricing.checkoutStayAmountNgn);
      expect(publicQuote.refundableDeposit).toBe(serverPricing.refundableDeposit);

      const serializedQuote = JSON.stringify(publicQuote);
      expect(serializedQuote).not.toContain(String(ownerNightly));
      expect(serializedQuote).not.toContain('ownerAccommodationRateNgn');
      expect(serializedQuote).not.toContain('ownerListedPriceNgn');
      expect(serializedQuote).not.toContain('closingAgentCommissionNgn');
      expect(serializedQuote).not.toContain('directReferrerRewardNgn');
      expect(serializedQuote).not.toContain('hamletAllocationNgn');
      expect(serializedQuote).not.toContain('paymentReserveNgn');
    }

    // Discovery filtering and sorting operate identically on redacted PublicStayView objects
    const sorted = filterAndSortApprovedStays(
      [
        toPublicStayView(RAW_SENSITIVE_ROW as unknown as PublicStayRecord),
        toPublicStayView({
          ...(RAW_SENSITIVE_ROW as unknown as PublicStayRecord),
          id: 'stay-yaba-budget',
          area: 'Yaba',
          nightly_rate: 40_000, // guest rate = 48,000
        }),
      ],
      { ...DEFAULT_DISCOVERY_FILTERS, sort: 'price_asc', minPriceInput: '45000', maxPriceInput: '240000' },
    );
    expect(sorted.map(item => item.id)).toEqual([
      'stay-yaba-budget',
      'c025a253-3e3d-4ea1-80e2-dd354c545b3b',
    ]);
  });

  it('prevents private owner rates, operational contacts, and internal commission percentages from crossing public RSC boundaries, JSON-LD, or llms*.txt', () => {
    expect(PUBLIC_PROPERTY_SELECT.split(',')).not.toContain('calendar_responsible_person');
    expect(PUBLIC_PROPERTY_SELECT.split(',')).not.toContain('review_note');
    expect(PARTNER_PROPERTY_SELECT.split(',')).toContain('calendar_responsible_person');
    expect(PARTNER_PROPERTY_SELECT.split(',')).toContain('review_note');

    const homePageSrc = readFileSync(join(ROOT, 'app', 'page.tsx'), 'utf8');
    const staysPageSrc = readFileSync(join(ROOT, 'app', 'stays', 'page.tsx'), 'utf8');
    const detailPageSrc = readFileSync(join(ROOT, 'app', 'stays', '[id]', 'page.tsx'), 'utf8');
    const partnerApplyFormSrc = readFileSync(
      join(ROOT, 'app', 'partners', 'apply', 'partner-application-form.tsx'),
      'utf8',
    );

    expect(homePageSrc).toContain('toPublicStayView');
    expect(staysPageSrc).toContain('toPublicStayView');
    expect(detailPageSrc).toContain('toPublicStayView');
    expect(detailPageSrc).not.toContain('ownerNightlyRateNgn');
    expect(detailPageSrc).not.toContain('nightlyRate={');
    expect(partnerApplyFormSrc).not.toContain('10% booking commission');

    const redacted = toPublicStayView(RAW_SENSITIVE_ROW as unknown as PublicStayRecord);
    const allPublicGraphs = JSON.stringify([
      buildHomepageSchema({ approvedStays: [redacted] }),
      buildPropertyListingPageSchema({ approvedStays: [redacted] }),
      buildPropertyDetailSchema({ stay: redacted }),
    ]);
    expect(allPublicGraphs).toContain('234000');
    expect(allPublicGraphs).not.toContain('195000');
    expect(allPublicGraphs).not.toContain('Chinedu Okafor');

    for (const llmRel of ['public/llms.txt', 'public/llms-full.txt']) {
      const content = readFileSync(join(ROOT, llmRel), 'utf8');
      for (const forbidden of [
        'B * 1.20',
        '0.20 * B',
        '10% closing commission',
        '10%` of `B`',
        '10% of `B`',
        '2.5%',
        '17.5%',
        '7.5%',
        '5%` of `B`',
        'owner listed rate',
      ]) {
        expect(content, `${llmRel} leaked "${forbidden}"`).not.toContain(forbidden);
      }
    }
  });
});

describe('PR 1 — Technical SEO Crawlability, Sitemap Freshness, Host Protection & Truth-Only Schema', () => {
  it('evaluates RFC 9309 robots.txt rules with independent OAI-SearchBot config, unblocked /api/og/*, and blocked private workspaces', () => {
    expect(existsSync(join(ROOT, 'public', 'robots.txt'))).toBe(false);
    expect(existsSync(join(ROOT, 'public', 'sitemap.xml'))).toBe(false);

    const config = robotsRoute();
    const rules = Array.isArray(config.rules) ? config.rules : [config.rules];

    // OAI-SearchBot MUST be configured in its own rule block, distinct from GPTBot
    const oaiSearchRule = rules.find(r => r.userAgent === 'OAI-SearchBot');
    const gptBotRule = rules.find(r =>
      (Array.isArray(r.userAgent) ? r.userAgent : [r.userAgent]).includes('GPTBot'),
    );
    expect(oaiSearchRule).toBeDefined();
    expect(gptBotRule).toBeDefined();
    expect(oaiSearchRule).not.toBe(gptBotRule);

    for (const bot of ['Googlebot', 'Bingbot', 'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'GPTBot']) {
      const rule = findRuleForAgent(bot);

      for (const allowedPath of [
        '/',
        '/stays',
        '/stays/c025a253-3e3d-4ea1-80e2-dd354c545b3b',
        '/lagos',
        '/about',
        '/safety',
        '/how-it-works',
        '/faqs',
        '/legal',
        '/partners/apply',
        '/partners/apply/form',
        '/llms.txt',
        '/llms-full.txt',
        '/api/og/default',
        '/api/og/property/c025a253-3e3d-4ea1-80e2-dd354c545b3b?v=v1-abc',
      ]) {
        expect(
          isAllowedByRfc9309Rule(allowedPath, rule),
          `${bot} should be ALLOWED to fetch ${allowedPath}`,
        ).toBe(true);
      }

      for (const blockedPath of [
        '/account',
        '/account/bookings',
        '/admin',
        '/admin/settlements',
        '/partners/bookings',
        '/partners/availability',
        '/partners/properties/new',
        '/partners/earnings',
        '/partners/profile',
        '/partners/start',
        '/partners/analytics',
        '/partners/marketing',
        '/signin',
        '/auth/callback',
        '/api/booking-requests',
        '/api/partner/properties',
        '/api/admin/properties/review',
        '/legacy',
      ]) {
        expect(
          isAllowedByRfc9309Rule(blockedPath, rule),
          `${bot} should be DISALLOWED from fetching ${blockedPath}`,
        ).toBe(false);
      }
    }
  });

  it('exports 15-minute ISR revalidation on app/sitemap.ts and protects *.vercel.app mirrors with X-Robots-Tag noindex', async () => {
    expect(sitemapRevalidate).toBe(900);
    const entries = await sitemapRoute();
    expect(entries.every(entry => entry.url.startsWith('https://hamlet.rest'))).toBe(true);

    expect(typeof nextConfig.headers).toBe('function');
    const headerRules = await nextConfig.headers!();
    const vercelHostNoindexRule = headerRules.find(rule =>
      rule.has?.some(cond => cond.type === 'host' && cond.value.includes('vercel')),
    );
    expect(vercelHostNoindexRule).toBeDefined();
    expect(vercelHostNoindexRule?.headers).toContainEqual({
      key: 'X-Robots-Tag',
      value: 'noindex, nofollow',
    });
  });

  it('enforces the Truth-Only Structured Data Policy: publishes verified Lagos coordinates and authentic ratings when valid, omits unverified data, and suppresses contradictory streetAddress', () => {
    const redactedViStay = toPublicStayView({
      ...(RAW_SENSITIVE_ROW as unknown as PublicStayRecord),
      area: 'Victoria Island',
      public_address: 'Lekki-ikate', // Contradictory partner-entered corridor
    });

    expect(hasContradictoryLagosStreetAddress('Victoria Island', 'Lekki-ikate')).toBe(true);
    expect(
      hasContradictoryLagosStreetAddress(
        'Victoria Island',
        '14 Adeola Odeku Street, Victoria Island',
      ),
    ).toBe(false);
    expect(hasContradoryCheckYaba()).toBe(false);

    function hasContradoryCheckYaba() {
      return hasContradictoryLagosStreetAddress('Yaba', 'Akoka, mafowuku');
    }

    // 1. Unverified coordinates + absent public reviews -> omitted, contradictory streetAddress suppressed
    const unverifiedSchema = buildPropertyDetailSchema({
      stay: redactedViStay,
      verifiedCoordinates: { latitude: 6.4281, longitude: 3.4219, accuracy: 'approximate' },
      verifiedRating: { ratingValue: 4.9, reviewCount: 0 },
    }) as { '@graph': Array<Record<string, unknown>> };
    const rentalUnverified = unverifiedSchema['@graph'].find(
      node => node['@type'] === 'VacationRental',
    )!;
    expect((rentalUnverified.address as Record<string, unknown>).streetAddress).toBeUndefined();
    expect(rentalUnverified.geo).toBeUndefined();
    expect(rentalUnverified.aggregateRating).toBeUndefined();

    // 2. Genuine verified Lagos coordinates + authentic verified reviews -> published truthfully
    const verifiedSchema = buildPropertyDetailSchema({
      stay: toPublicStayView(RAW_SENSITIVE_ROW as unknown as PublicStayRecord),
      verifiedCoordinates: { latitude: 6.428055, longitude: 3.421944, accuracy: 'verified' },
      verifiedRating: { ratingValue: 4.85, reviewCount: 12 },
    }) as { '@graph': Array<Record<string, unknown>> };
    const rentalVerified = verifiedSchema['@graph'].find(
      node => node['@type'] === 'VacationRental',
    )!;
    expect((rentalVerified.address as Record<string, unknown>).streetAddress).toBe(
      '14 Adeola Odeku Street, Victoria Island',
    );
    expect(rentalVerified.geo).toEqual({
      '@type': 'GeoCoordinates',
      latitude: 6.428055,
      longitude: 3.421944,
    });
    expect(rentalVerified.aggregateRating).toEqual({
      '@type': 'AggregateRating',
      ratingValue: 4.85,
      reviewCount: 12,
      bestRating: 5,
      worstRating: 1,
    });
  });
});
