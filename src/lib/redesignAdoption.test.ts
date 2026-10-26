import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  HAMLET_BRAND_NAME,
  HAMLET_MANTRA,
  HAMLET_PARENT_COMPANY,
  HAMLET_POSITIONING,
  HAMLET_USP,
} from './brand';
import { calculateGuestPricing, calculateMarkupAllocation } from './pricing';

const ROOT = resolve(process.cwd());

describe('HAMLET UI Adoption & Brand-Preserving Redesign', () => {
  it('preserves canonical HAMLET brand identity constants', () => {
    expect(HAMLET_BRAND_NAME).toBe('HAMLET for Your Shortlets');
    expect(HAMLET_USP).toBe('Shortlets, with accountability.');
    expect(HAMLET_PARENT_COMPANY).toBe('Abundance Abodes');
    expect(HAMLET_POSITIONING).toBe('The Operating System for African Shortlets');
    expect(HAMLET_MANTRA).toBe('Make it easy. Make it trustworthy. Make it accountable.');
  });

  it('keeps Home concise and marketplace-focused while preserving central pricing engine', () => {
    const homeSrc = readFileSync(join(ROOT, 'src/legacy-pages/Home.tsx'), 'utf8');
    const detailSrc = readFileSync(join(ROOT, 'src/legacy-pages/PropertyDetail.tsx'), 'utf8');

    expect(homeSrc).toContain('Available stays');
    expect(homeSrc).toContain('Browse by area');
    expect(homeSrc).toContain('HERO_SLIDES');
    expect(homeSrc).toContain('opacity-100');
    expect(homeSrc).toContain('/images/hero-sample-living.jpg');
    expect(homeSrc).toContain('/images/hero-sample-bedroom.jpg');
    expect(homeSrc).toContain('/images/hero-sample-kitchen.jpg');
    expect(homeSrc).toContain('/images/hero-sample-lounge.jpg');
    expect(homeSrc).toContain('Sample interior');
    expect(homeSrc).not.toContain('Booking ceremony walkthrough');
    expect(homeSrc).not.toContain('Every naira, accounted for');
    expect(detailSrc).toContain('priceStay');
    expect(detailSrc).toContain('calculateBookingCurrencyQuote');

    const allocation = calculateMarkupAllocation({
      ownerListedPriceNgn: 200_000,
      hasEligibleReferrer: true,
    });
    const guest = calculateGuestPricing({
      accommodationSubtotal: 200_000,
      mandatoryCharges: [],
      refundableDeposit: 150_000,
    });
    expect(guest.domesticGuestPriceNgn).toBe(240_000);
    expect(allocation.totalMarkupNgn).toBe(40_000);
    expect(allocation.closingAgentCommissionNgn).toBe(20_000);
    expect(allocation.directReferrerRewardNgn).toBe(5_000);
    expect(allocation.hamletAllocationNgn).toBe(10_000);
    expect(allocation.paymentReserveNgn).toBe(5_000);
    expect(guest.refundableDeposit).toBe(150_000);
  });

  it('integrates Horatio assistant, Wishlist shortlist, Elsinore, and The Watch while keeping plain-language primary navigation', () => {
    const appSrc = readFileSync(join(ROOT, 'src/App.tsx'), 'utf8');
    const navbarSrc = readFileSync(join(ROOT, 'src/components/Navbar.tsx'), 'utf8');
    const horatioSrc = readFileSync(join(ROOT, 'src/components/HoratioDrawer.tsx'), 'utf8');
    const adminLayoutSrc = readFileSync(join(ROOT, 'src/legacy-pages/admin/AdminLayout.tsx'), 'utf8');
    const adminIssuesSrc = readFileSync(join(ROOT, 'src/legacy-pages/admin/Issues.tsx'), 'utf8');

    expect(appSrc).toContain('WishlistProvider');
    expect(appSrc).toContain('HoratioProvider');
    expect(appSrc).toContain('HoratioDrawer');

    // Plain-language primary nav labels preserved
    expect(navbarSrc).toContain("'Explore stays'");
    expect(navbarSrc).toContain("'Lagos'");
    expect(navbarSrc).toContain("'How it works'");
    expect(navbarSrc).toContain("'Safety'");
    expect(navbarSrc).toContain("'FAQs'");

    // Shakespeare-inspired internal naming where appropriate
    expect(horatioSrc).toContain('Horatio');
    expect(horatioSrc).toContain('human administrator control');
    expect(horatioSrc).toContain('Suggestion & discovery only');
    expect(adminLayoutSrc).toContain('Elsinore');
    expect(adminLayoutSrc).toContain("'Property Review'");
    expect(adminLayoutSrc).toContain("'Ledger & Settlement'");
    expect(adminIssuesSrc).toContain('The Watch');
  });

  it('never fabricates star ratings or reviews on PropertyCard or PropertyDetail', () => {
    const cardSrc = readFileSync(join(ROOT, 'src/components/PropertyCard.tsx'), 'utf8');
    const detailSrc = readFileSync(join(ROOT, 'src/legacy-pages/PropertyDetail.tsx'), 'utf8');

    expect(cardSrc).not.toMatch(/4\.9[0-9]|4\.8[0-9]|★\s*4\./);
    expect(detailSrc).not.toMatch(/4\.9[0-9]|4\.8[0-9]|★\s*4\./);
  });

  it('keeps duplicate-address screening and separate caution deposit messaging visible', () => {
    const newPropSrc = readFileSync(join(ROOT, 'src/legacy-pages/partner/NewProperty.tsx'), 'utf8');
    const partnerRegSrc = readFileSync(join(ROOT, 'src/legacy-pages/PartnerRegister.tsx'), 'utf8');
    const detailSrc = readFileSync(join(ROOT, 'src/legacy-pages/PropertyDetail.tsx'), 'utf8');

    expect(newPropSrc).toContain('potentialAddressMatch');
    expect(partnerRegSrc).toContain('The economics, plainly');
    expect(detailSrc).toContain('Refundable caution deposit');
    expect(detailSrc).toContain('post-checkout inspection');
  });
});
