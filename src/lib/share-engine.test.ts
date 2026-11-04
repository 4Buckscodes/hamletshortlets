import { describe, expect, it } from 'vitest';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import {
  buildPartnerPropertyTrackingUrl,
  buildPropertyCanonicalShareUrl,
  buildPropertyPreviewVersion,
  buildWhatsAppClickToChatUrl,
  buildWhatsAppPropertyShareMessage,
  extractShareTokenFromSearchParams,
  isValidShareToken,
  normalizeShareToken,
} from './share-engine';
import { generateQrCodePngBuffer } from './share-qr';
import {
  renderBrandedQrPlacardBuffer,
  renderHamletDefaultOgBuffer,
  renderMarketingCardBuffer,
  renderPropertyOgBuffer,
} from './share-artwork';
import { normalizeReferralCode } from './referrals';

function decodeQrFromPngBuffer(buffer: Buffer): {
  width: number;
  height: number;
  decodedText: string | null;
} {
  const png = PNG.sync.read(buffer);
  const code = jsQR(
    new Uint8ClampedArray(png.data),
    png.width,
    png.height,
    { inversionAttempts: 'dontInvert' },
  );
  return {
    width: png.width,
    height: png.height,
    decodedText: code?.data ?? null,
  };
}

describe('HAMLET Share Engine — URLs, Tokens & WhatsApp Messaging', () => {
  it('validates opaque hsl_ share tokens and keeps them separate from HML- partner recruitment codes', () => {
    const validToken = 'hsl_a9f3c2d81e40b7c65a1209ef';
    expect(isValidShareToken(validToken)).toBe(true);
    expect(normalizeShareToken(`  ${validToken.toUpperCase()} `)).toBe(validToken);

    // HML-... partner recruitment codes must NEVER be treated as property share tokens
    const partnerRecruitCode = 'HML-LAGOS01';
    expect(isValidShareToken(partnerRecruitCode)).toBe(false);
    expect(normalizeShareToken(partnerRecruitCode)).toBeNull();
    expect(normalizeReferralCode(partnerRecruitCode)).toBe('HML-LAGOS01');

    // Search param extraction handles ?ref=hsl_... and ignores ?ref=HML-...
    expect(
      extractShareTokenFromSearchParams(
        new URLSearchParams(`ref=${validToken}`),
      ),
    ).toBe(validToken);
    expect(
      extractShareTokenFromSearchParams(
        new URLSearchParams(`ref=${partnerRecruitCode}`),
      ),
    ).toBeNull();
  });

  it('builds canonical and partner-tracked property URLs cleanly', () => {
    const token = 'hsl_11223344556677889900aabb';
    expect(buildPropertyCanonicalShareUrl('stay-ikoyi-01')).toBe(
      'https://hamlet.rest/stays/stay-ikoyi-01',
    );
    expect(buildPartnerPropertyTrackingUrl('stay-ikoyi-01', token)).toBe(
      `https://hamlet.rest/stays/stay-ikoyi-01?ref=${token}`,
    );
  });

  it('constructs dynamic WhatsApp messages with real stay facts and omits missing fields without placeholders', () => {
    const token = 'hsl_99887766554433221100ffaa';
    const trackedUrl = buildPartnerPropertyTrackingUrl('stay-vi-10', token);
    const msg = buildWhatsAppPropertyShareMessage({
      title: 'Eko Atlantic Sky Suite',
      area: 'Victoria Island',
      propertyType: 'Serviced apartment',
      bedrooms: 2,
      capacity: 4,
      ownerNightlyRateNgn: 200_000, // Guest nightly = 240,000 (incl. 20% HAMLET guest service fee)
      trackingUrl: trackedUrl,
    });

    expect(msg).toContain('🏡 Eko Atlantic Sky Suite');
    expect(msg).toContain('Victoria Island, Lagos');
    expect(msg).toContain('₦240,000 per night');
    expect(msg).toContain('Up to 4 guests');
    expect(msg).toContain('View photos, amenities, verification details and request dates here:');
    expect(msg).toContain(trackedUrl);
    expect(msg).toContain('Your stay, sorted.');
    expect(msg).not.toContain('undefined');
    expect(msg).not.toContain('null');

    const waClickUrl = buildWhatsAppClickToChatUrl(msg);
    expect(waClickUrl.startsWith('https://wa.me/?text=')).toBe(true);
    expect(decodeURIComponent(waClickUrl.replace('https://wa.me/?text=', ''))).toBe(
      msg,
    );

    // Sparse property omits missing specs cleanly
    const sparseMsg = buildWhatsAppPropertyShareMessage({
      title: 'Yaba Loft',
      area: null,
      propertyType: null,
      bedrooms: null,
      capacity: null,
      guestNightlyNgn: null,
      ownerNightlyRateNgn: null,
      trackingUrl: 'https://hamlet.rest/stays/yaba-loft',
    });
    expect(sparseMsg).toContain('🏡 Yaba Loft');
    expect(sparseMsg).toContain('Lagos');
    expect(sparseMsg).not.toContain('undefined');
    expect(sparseMsg).not.toContain('null');
    expect(sparseMsg).not.toContain('₦0');
  });

  it('rotates preview version hash whenever stay price, title, area, or cover photo changes', () => {
    const base = {
      title: 'Lekki Phase 1 Penthouse',
      area: 'Lekki Phase 1',
      nightly_rate: 150_000,
      bedrooms: 3,
      image_urls: ['https://cdn.example.com/a.jpg'],
      updated_at: '2026-11-04T10:00:00Z',
    };
    const v1 = buildPropertyPreviewVersion(base);
    const vPriceChanged = buildPropertyPreviewVersion({
      ...base,
      nightly_rate: 175_000,
    });
    const vPhotoChanged = buildPropertyPreviewVersion({
      ...base,
      image_urls: ['https://cdn.example.com/b.jpg'],
    });
    expect(v1).not.toBe(vPriceChanged);
    expect(v1).not.toBe(vPhotoChanged);
  });
});

describe('HAMLET Share Engine — Real QR Decoder & PNG Artwork Verification', () => {
  it('generates standalone QR PNGs that decode accurately to canonical and partner-tracked URLs', async () => {
    const canonicalUrl = buildPropertyCanonicalShareUrl('stay-lekki-202');
    const trackedUrl = buildPartnerPropertyTrackingUrl(
      'stay-lekki-202',
      'hsl_abcdef0123456789abcdef01',
    );

    const canonicalPng = await generateQrCodePngBuffer(canonicalUrl, {
      size: 1024,
      margin: 4,
    });
    const canonicalDecoded = decodeQrFromPngBuffer(canonicalPng);
    expect(canonicalDecoded.width).toBe(1024);
    expect(canonicalDecoded.height).toBe(1024);
    expect(canonicalDecoded.decodedText).toBe(canonicalUrl);

    const trackedPng = await generateQrCodePngBuffer(trackedUrl, {
      size: 1024,
      margin: 4,
    });
    const trackedDecoded = decodeQrFromPngBuffer(trackedPng);
    expect(trackedDecoded.width).toBe(1024);
    expect(trackedDecoded.height).toBe(1024);
    expect(trackedDecoded.decodedText).toBe(trackedUrl);
  });

  it('generates branded 1080x1350 HAMLET QR placards whose embedded QR decodes cleanly', async () => {
    const trackedUrl = buildPartnerPropertyTrackingUrl(
      'stay-ikoyi-88',
      'hsl_fedcba9876543210fedcba98',
    );
    const brandedBuffer = await renderBrandedQrPlacardBuffer({
      title: 'Bourdillon Terrace Residence',
      area: 'Ikoyi',
      targetUrl: trackedUrl,
    });

    const decoded = decodeQrFromPngBuffer(brandedBuffer);
    expect(decoded.width).toBe(1080);
    expect(decoded.height).toBe(1350);
    expect(decoded.decodedText).toBe(trackedUrl);
  });

  it('renders 1200x630 Default OG, 1200x630 Property OG (with missing-photo fallback), and all 3 Marketing Card formats', async () => {
    const defaultOg = PNG.sync.read(await renderHamletDefaultOgBuffer());
    expect(defaultOg.width).toBe(1200);
    expect(defaultOg.height).toBe(630);

    const sampleStay = {
      id: 'stay-shomolu-04',
      title: 'Pedro Executive Studio',
      area: 'Shomolu',
      property_type: 'Studio apartment',
      bedrooms: 0,
      bathrooms: 1,
      capacity: 2,
      nightly_rate: 85_000,
      amenities: ['24/7 Power', 'Fast Wi-Fi', 'Gated security'],
      image_urls: [], // Exercises graceful no-photo fallback
      status: 'approved',
      verification: {
        ownership: 'verified',
        identity: 'verified',
        authority: 'verified',
        inspection: 'verified',
      },
    };

    const propOg = PNG.sync.read(await renderPropertyOgBuffer(sampleStay));
    expect(propOg.width).toBe(1200);
    expect(propOg.height).toBe(630);

    const trackedUrl = buildPartnerPropertyTrackingUrl(
      sampleStay.id,
      'hsl_1234567890abcdef12345678',
    );

    const guestSocial = PNG.sync.read(
      await renderMarketingCardBuffer({
        stay: sampleStay,
        cardType: 'guest',
        format: 'social',
        theme: 'midnight',
        targetUrl: trackedUrl,
      }),
    );
    expect(guestSocial.width).toBe(1200);
    expect(guestSocial.height).toBe(630);

    const partnerPortraitAuthorised = PNG.sync.read(
      await renderMarketingCardBuffer({
        stay: sampleStay,
        cardType: 'partner',
        format: 'portrait',
        theme: 'ivory',
        targetUrl: trackedUrl,
        partnerDisplayName: 'Tunde Realty Partners',
        dealTerms: {
          authorised: true,
          relationship: 'closing_agent',
          commission_rate: 0.1,
          estimated_per_night_ngn: 8_500,
          basis_label: '10% of owner base rate on completed stays',
          disclaimer: 'Estimated opportunity on completed stays; not a guaranteed payout.',
        },
      }),
    );
    expect(partnerPortraitAuthorised.width).toBe(1080);
    expect(partnerPortraitAuthorised.height).toBe(1350);

    const partnerStoryNoEarnings = PNG.sync.read(
      await renderMarketingCardBuffer({
        stay: sampleStay,
        cardType: 'partner',
        format: 'story',
        theme: 'lagoon',
        targetUrl: trackedUrl,
        partnerDisplayName: 'HAMLET Partner Network',
        dealTerms: {
          authorised: true,
          relationship: 'owner',
          commission_rate: 0,
          estimated_per_night_ngn: null,
          basis_label: null,
        },
      }),
    );
    expect(partnerStoryNoEarnings.width).toBe(1080);
    expect(partnerStoryNoEarnings.height).toBe(1920);
  });
});
