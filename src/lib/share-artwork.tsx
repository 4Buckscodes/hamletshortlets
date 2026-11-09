import React from 'react';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import {
  formatAccommodationLabel,
  formatBedroomCountLabel,
  getStayTrustStatus,
  getValidGuestNightlyNgn,
  resolveStayGuestNightlyNgn,
} from './discovery';
import { formatNaira } from './pricing';
import {
  getMarketingFormatSpec,
  HAMLET_SHARE_ORIGIN,
  type MarketingCardFormat,
  type MarketingCardTheme,
  type MarketingCardType,
  type PartnerDealTerms,
} from './share-engine';
import { generateQrCodeDataUrl } from './share-qr';

type SatoriFont = {
  name: string;
  data: Buffer;
  weight: 400 | 500 | 600 | 700;
  style: 'normal';
};

type SharpPipeline = {
  rotate: () => SharpPipeline;
  resize: (opts: {
    width: number;
    height: number;
    fit: 'inside';
    withoutEnlargement: boolean;
  }) => SharpPipeline;
  jpeg: (opts: { quality: number; mozjpeg?: boolean }) => SharpPipeline;
  toBuffer: () => Promise<Buffer>;
};

type SharpFactory = (input: Buffer) => SharpPipeline;

let cachedFonts: SatoriFont[] | null = null;
let cachedSharp: SharpFactory | false | null = null;
const cachedPublicImages = new Map<string, string>();

const EMBEDDED_ARCHITECTURAL_FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0E1F3B"/>
      <stop offset="55%" stop-color="#162F57"/>
      <stop offset="100%" stop-color="#0A162B"/>
    </linearGradient>
    <linearGradient id="brass" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#C9A45C" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#C9A45C" stop-opacity="0.04"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="900" fill="url(#bg)"/>
  <rect x="72" y="72" width="1056" height="756" rx="28" fill="none" stroke="url(#brass)" stroke-width="2"/>
  <circle cx="980" cy="180" r="260" fill="#C9A45C" fill-opacity="0.08"/>
  <circle cx="220" cy="760" r="320" fill="#C9A45C" fill-opacity="0.06"/>
</svg>`;

const EMBEDDED_FALLBACK_DATA_URL = `data:image/svg+xml;base64,${Buffer.from(
  EMBEDDED_ARCHITECTURAL_FALLBACK_SVG,
  'utf8',
).toString('base64')}`;

function getOptionalSharp(): SharpFactory | null {
  if (cachedSharp === false) return null;
  if (cachedSharp) return cachedSharp;
  try {
    const req = createRequire(import.meta.url);
    const mod = req('sharp') as SharpFactory | { default?: SharpFactory };
    const fn = typeof mod === 'function' ? mod : mod?.default;
    if (typeof fn === 'function') {
      cachedSharp = fn;
      return fn;
    }
  } catch {
    // Optional in minimal runtimes; magic-byte fallback handles standard JPEG/PNG
  }
  cachedSharp = false;
  return null;
}

function readTracedFontFile(literalFromRoot: string): Buffer | null {
  const candidates = [
    path.join(process.cwd(), literalFromRoot),
    path.resolve(process.cwd(), '..', literalFromRoot),
  ];
  for (const candidate of candidates) {
    try {
      if (existsSync(candidate)) {
        return readFileSync(candidate);
      }
    } catch {
      // Try next candidate path
    }
  }
  return null;
}

function loadShareArtworkFonts(): SatoriFont[] {
  if (cachedFonts) return cachedFonts;

  // Explicit literal relative paths allow Next.js `@vercel/nft` static tracing in
  // addition to `outputFileTracingIncludes` in `next.config.ts`.
  const fontSpecs: Array<{
    name: string;
    relPath: string;
    weight: 400 | 500 | 600 | 700;
  }> = [
    {
      name: 'Inter',
      relPath: path.join(
        process.cwd(),
        'node_modules/@fontsource/inter/files/inter-latin-400-normal.woff',
      ),
      weight: 400,
    },
    {
      name: 'InterExt',
      relPath: path.join(
        process.cwd(),
        'node_modules/@fontsource/inter/files/inter-latin-ext-400-normal.woff',
      ),
      weight: 400,
    },
    {
      name: 'Inter',
      relPath: path.join(
        process.cwd(),
        'node_modules/@fontsource/inter/files/inter-latin-600-normal.woff',
      ),
      weight: 600,
    },
    {
      name: 'InterExt',
      relPath: path.join(
        process.cwd(),
        'node_modules/@fontsource/inter/files/inter-latin-ext-600-normal.woff',
      ),
      weight: 600,
    },
    {
      name: 'Inter',
      relPath: path.join(
        process.cwd(),
        'node_modules/@fontsource/inter/files/inter-latin-700-normal.woff',
      ),
      weight: 700,
    },
    {
      name: 'InterExt',
      relPath: path.join(
        process.cwd(),
        'node_modules/@fontsource/inter/files/inter-latin-ext-700-normal.woff',
      ),
      weight: 700,
    },
    {
      name: 'Playfair Display',
      relPath: path.join(
        process.cwd(),
        'node_modules/@fontsource/playfair-display/files/playfair-display-latin-500-normal.woff',
      ),
      weight: 500,
    },
    {
      name: 'Playfair Display',
      relPath: path.join(
        process.cwd(),
        'node_modules/@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff',
      ),
      weight: 700,
    },
  ];

  const loaded: SatoriFont[] = [];
  for (const spec of fontSpecs) {
    try {
      if (existsSync(spec.relPath)) {
        loaded.push({
          name: spec.name,
          data: readFileSync(spec.relPath),
          weight: spec.weight,
          style: 'normal',
        });
        continue;
      }
    } catch {
      // Fall through to secondary lookup
    }
    const relFromCwd = path.relative(process.cwd(), spec.relPath);
    const fallbackBuf = readTracedFontFile(relFromCwd);
    if (fallbackBuf) {
      loaded.push({
        name: spec.name,
        data: fallbackBuf,
        weight: spec.weight,
        style: 'normal',
      });
    }
  }

  if (loaded.length > 0) {
    cachedFonts = loaded;
  }
  return loaded;
}

function detectSupportedSatoriRasterMime(bytes: Buffer): 'image/jpeg' | 'image/png' | null {
  if (bytes.length < 12) return null;
  // JPEG SOI: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'image/png';
  }
  return null;
}

/**
 * Normalizes property photo bytes into a Satori-compatible `data:` URL.
 * Converts WebP (from HAMLET's client-side `imageOptimiser.ts`), EXIF-rotated JPEGs,
 * and oversized uploads into compact baseline sRGB JPEG via `sharp` when available.
 */
async function normalizePhotoBytesForSatori(bytes: Buffer): Promise<string | null> {
  if (!bytes || bytes.byteLength < 64 || bytes.byteLength > 12 * 1024 * 1024) {
    return null;
  }

  const sharpFn = getOptionalSharp();
  if (sharpFn) {
    try {
      const normalizedJpeg = await sharpFn(bytes)
        .rotate()
        .resize({
          width: 1200,
          height: 1200,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 86, mozjpeg: false })
        .toBuffer();

      if (normalizedJpeg.byteLength > 64) {
        return `data:image/jpeg;base64,${normalizedJpeg.toString('base64')}`;
      }
    } catch {
      // Fall back to direct magic-byte check below
    }
  }

  const mime = detectSupportedSatoriRasterMime(bytes);
  if (!mime) {
    return null;
  }
  return `data:${mime};base64,${bytes.toString('base64')}`;
}

async function loadLocalPublicImageDataUrl(relPath: string): Promise<string> {
  const cleanRel = relPath.replace(/^\/+/, '');
  const existing = cachedPublicImages.get(cleanRel);
  if (existing) return existing;

  const fullPath = path.join(process.cwd(), 'public', cleanRel);
  try {
    if (existsSync(fullPath)) {
      const bytes = readFileSync(fullPath);
      const normalized = await normalizePhotoBytesForSatori(bytes);
      if (normalized) {
        cachedPublicImages.set(cleanRel, normalized);
        return normalized;
      }
    }
  } catch {
    // On serverless hosts where `public/` is served from Edge CDN instead of `/var/task/public`,
    // fall through to origin fetch below.
  }

  const siteOrigin = (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || HAMLET_SHARE_ORIGIN
  ).replace(/\/+$/, '');

  try {
    const response = await fetch(`${siteOrigin}/${cleanRel}`, {
      signal: AbortSignal.timeout(3500),
    });
    if (response.ok) {
      const bytes = Buffer.from(await response.arrayBuffer());
      const normalized = await normalizePhotoBytesForSatori(bytes);
      if (normalized) {
        cachedPublicImages.set(cleanRel, normalized);
        return normalized;
      }
    }
  } catch {
    // Offline or unreachable CDN; use embedded SVG backdrop
  }

  return EMBEDDED_FALLBACK_DATA_URL;
}

export async function resolveArtworkPhotoDataUrl(
  rawUrl?: string | null,
  fallbackPublicPath = 'images/prop/living-1.jpg',
): Promise<{ dataUrl: string; isFallback: boolean }> {
  const trimmed = rawUrl?.trim() || '';
  if (!trimmed) {
    return {
      dataUrl: await loadLocalPublicImageDataUrl(fallbackPublicPath),
      isFallback: true,
    };
  }

  if (trimmed.startsWith('/images/')) {
    const localUrl = await loadLocalPublicImageDataUrl(trimmed);
    const isFallback = localUrl === EMBEDDED_FALLBACK_DATA_URL;
    return {
      dataUrl: localUrl,
      isFallback,
    };
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const response = await fetch(trimmed, {
        signal: AbortSignal.timeout(6000),
      });
      if (response.ok) {
        const arrayBuf = await response.arrayBuffer();
        const normalized = await normalizePhotoBytesForSatori(Buffer.from(arrayBuf));
        if (normalized) {
          return {
            dataUrl: normalized,
            isFallback: false,
          };
        }
      }
    } catch {
      // Fall through cleanly to local hospitality fallback
    }
  }

  return {
    dataUrl: await loadLocalPublicImageDataUrl(fallbackPublicPath),
    isFallback: true,
  };
}

function renderOgHamletLogo({
  light = true,
  markSize = 44,
  wordSize = 28,
}: {
  light?: boolean;
  markSize?: number;
  wordSize?: number;
}) {
  const stemFill = light ? '#FFFFFF' : '#0E1F3B';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <svg width={markSize} height={markSize} viewBox="0 0 64 64" fill="none">
        <rect x="2" y="2" width="60" height="60" rx="14" fill="#0E1F3B" />
        <g transform="translate(5.12 5.12) scale(0.84)">
          <path
            d="M6.5 7H26.5V9.2C22.4 9.3 21 11.5 21 16.6V47.4C21 52.5 22.4 54.7 26.5 54.8V57H6.5V54.8C10.6 54.7 12 52.5 12 47.4V16.6C12 11.5 10.6 9.3 6.5 9.2V7Z"
            fill="#FFFFFF"
          />
          <path
            d="M37.5 7H57.5V9.2C53.4 9.3 52 11.5 52 16.6V47.4C52 52.5 53.4 54.7 57.5 54.8V57H37.5V54.8C41.6 54.7 43 52.5 43 47.4V16.6C43 11.5 41.6 9.3 37.5 9.2V7Z"
            fill="#FFFFFF"
          />
          <path
            d="M12 21.4C13.2 26.2 16.5 28.8 21 28.8H43C47.5 28.8 50.8 26.2 52 21.4V42.2C50.8 37.4 47.5 34.8 43 34.8H21C16.5 34.8 13.2 37.4 12 42.2V21.4Z"
            fill="#C9A45C"
          />
        </g>
      </svg>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          fontFamily: 'Playfair Display, Inter',
          fontWeight: 700,
          fontSize: wordSize,
          letterSpacing: '0.06em',
          color: stemFill,
        }}
      >
        <span>HAMLET</span>
        <span style={{ color: '#C9A45C' }}>.</span>
      </div>
    </div>
  );
}

/**
 * Default website Open Graph social preview (`1200 × 630`) for `https://hamlet.rest`.
 */
export async function renderHamletDefaultOgBuffer(): Promise<Buffer> {
  const fonts = loadShareArtworkFonts();
  const heroDataUrl = await loadLocalPublicImageDataUrl('images/lagos-hero.jpg');

  const renderWithHero = async (imgSrc: string): Promise<Buffer> => {
    const response = new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            width: 1200,
            height: 630,
            backgroundColor: '#0E1F3B',
            color: '#FFFFFF',
            fontFamily: 'Inter, InterExt',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Left editorial brand column */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              width: 650,
              height: 630,
              padding: '54px 56px',
              backgroundColor: '#0E1F3B',
              borderRight: '2px solid rgba(201,164,92,0.35)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {renderOgHamletLogo({ light: true, markSize: 50, wordSize: 30 })}
              <div
                style={{
                  display: 'flex',
                  padding: '6px 14px',
                  borderRadius: 999,
                  border: '1px solid rgba(201,164,92,0.55)',
                  backgroundColor: 'rgba(201,164,92,0.14)',
                  color: '#F6E5AB',
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                LAGOS · ISLAND & MAINLAND
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div
                style={{
                  display: 'flex',
                  fontFamily: 'Playfair Display, Inter',
                  fontSize: 64,
                  fontWeight: 700,
                  lineHeight: 1.06,
                  color: '#F8F5EE',
                }}
              >
                Your stay, sorted.
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: 26,
                  fontWeight: 600,
                  color: '#C9A45C',
                }}
              >
                Shortlets, with accountability.
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: 18,
                  lineHeight: 1.5,
                  color: 'rgba(248,245,238,0.82)',
                }}
              >
                Verified apartments, transparent all-in stay pricing, and host-confirmed booking requests across Lagos.
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 22,
                borderTop: '1px solid rgba(255,255,255,0.14)',
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: '#C9A45C',
              }}
            >
              <span>TITLE · IDENTITY · AUTHORITY · INSPECTION</span>
              <span style={{ color: '#F8F5EE' }}>hamlet.rest</span>
            </div>
          </div>

          {/* Right hospitality photography showcase */}
          <div
            style={{
              display: 'flex',
              width: 550,
              height: 630,
              position: 'relative',
            }}
          >
            <img
              src={imgSrc}
              alt="HAMLET Lagos shortlet interior"
              width={550}
              height={630}
              style={{
                width: 550,
                height: 630,
                objectFit: 'cover',
              }}
            />
            <div
              style={{
                display: 'flex',
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(90deg, rgba(14,31,59,0.55) 0%, rgba(14,31,59,0.08) 45%, rgba(14,31,59,0.22) 100%)',
              }}
            />
          </div>
        </div>
      ),
      { width: 1200, height: 630, ...(fonts.length > 0 ? { fonts } : {}) },
    );

    return Buffer.from(await response.arrayBuffer());
  };

  try {
    return await renderWithHero(heroDataUrl);
  } catch {
    return renderWithHero(EMBEDDED_FALLBACK_DATA_URL);
  }
}

export interface PropertyOgInput {
  id: string;
  title: string;
  area?: string | null;
  property_type?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  capacity?: number | null;
  /** Guest-facing view price; raw fallback is retained only for internal renderer tests. */
  guest_nightly_ngn?: number | string | null;
  nightly_rate?: number | string | null;
  image_urls?: string[] | null;
  status: string;
  verification?: Record<string, string> | null;
}

/**
 * Dynamic individual property Open Graph preview (`1200 × 630`) for WhatsApp, Facebook, Telegram & X.
 */
export async function renderPropertyOgBuffer(stay: PropertyOgInput): Promise<Buffer> {
  const fonts = loadShareArtworkFonts();
  const primaryUrl = Array.isArray(stay.image_urls) ? stay.image_urls[0] : null;
  const resolvedPhoto = await resolveArtworkPhotoDataUrl(primaryUrl);
  const trust = getStayTrustStatus({
    status: stay.status,
    verification: stay.verification ?? null,
  });
  const guestNightly = resolveStayGuestNightlyNgn({
    guest_nightly_ngn: stay.guest_nightly_ngn,
    ...(stay.nightly_rate !== undefined ? { nightly_rate: stay.nightly_rate } : {}),
  });
  const areaLabel = stay.area?.trim() ? `${stay.area.trim()}, Lagos` : 'Lagos, Nigeria';
  const accommodationLabel = formatAccommodationLabel(
    stay.property_type ?? null,
    stay.bedrooms ?? null,
  );
  const bedroomLabel = formatBedroomCountLabel(
    stay.bedrooms ?? null,
    stay.property_type ?? null,
  );
  const bathCount = stay.bathrooms ?? 1;
  const bathText = `${bathCount} ${bathCount === 1 ? 'bath' : 'baths'}`;

  const renderCard = async (photoSrc: string, showFallbackPill: boolean): Promise<Buffer> => {
    const response = new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            width: 1200,
            height: 630,
            position: 'relative',
            backgroundColor: '#0E1F3B',
            color: '#FFFFFF',
            fontFamily: 'Inter, InterExt',
            overflow: 'hidden',
          }}
        >
          {/* Full-bleed property photograph */}
          <img
            src={photoSrc}
            alt={stay.title}
            width={1200}
            height={630}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 1200,
              height: 630,
              objectFit: 'cover',
            }}
          />

          {/* Contrast scrim so photography stays central while typography reads crisply */}
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              top: 0,
              left: 0,
              width: 1200,
              height: 630,
              background:
                'linear-gradient(180deg, rgba(14,31,59,0.72) 0%, rgba(14,31,59,0.16) 42%, rgba(14,31,59,0.88) 82%, rgba(14,31,59,0.96) 100%)',
            }}
          />

          {/* Foreground content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              width: 1200,
              height: 630,
              padding: '42px 52px',
              position: 'relative',
            }}
          >
            {/* Top Brand & Verification Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {renderOgHamletLogo({ light: true, markSize: 46, wordSize: 28 })}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {showFallbackPill && (
                  <div
                    style={{
                      display: 'flex',
                      padding: '7px 14px',
                      borderRadius: 999,
                      backgroundColor: 'rgba(14,31,59,0.82)',
                      border: '1px solid rgba(248,245,238,0.28)',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#F8F5EE',
                    }}
                  >
                    HAMLET Stay Preview
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    padding: '8px 16px',
                    borderRadius: 999,
                    backgroundColor: trust.verified
                      ? 'rgba(16,185,129,0.22)'
                      : 'rgba(14,31,59,0.82)',
                    border: trust.verified
                      ? '1px solid rgba(110,231,183,0.65)'
                      : '1px solid rgba(201,164,92,0.6)',
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#FFFFFF',
                  }}
                >
                  {trust.badge}
                </div>
              </div>
            </div>

            {/* Bottom Property Details & Price */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                gap: 32,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 800 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: 15,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#E1C26E',
                  }}
                >
                  <span>{areaLabel}</span>
                  <span>·</span>
                  <span>{accommodationLabel}</span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    fontFamily: 'Playfair Display, Inter',
                    fontSize: stay.title.length > 44 ? 42 : 50,
                    fontWeight: 700,
                    lineHeight: 1.1,
                    color: '#F8F5EE',
                  }}
                >
                  {stay.title.length > 68 ? `${stay.title.slice(0, 65)}…` : stay.title}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    fontSize: 18,
                    fontWeight: 600,
                    color: 'rgba(248,245,238,0.88)',
                  }}
                >
                  <span>{bedroomLabel}</span>
                  <span>·</span>
                  <span>{bathText}</span>
                  {typeof stay.capacity === 'number' && stay.capacity > 0 && (
                    <>
                      <span>·</span>
                      <span>{`Up to ${stay.capacity} guests`}</span>
                    </>
                  )}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  padding: '18px 26px',
                  borderRadius: 22,
                  backgroundColor: 'rgba(14,31,59,0.9)',
                  border: '1px solid rgba(201,164,92,0.55)',
                }}
              >
                {guestNightly !== null ? (
                  <>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: '#C9A45C',
                      }}
                    >
                      ALL-IN STAY RATE
                    </span>
                    <span
                      style={{
                        fontSize: 34,
                        fontWeight: 700,
                        color: '#FFFFFF',
                        marginTop: 4,
                      }}
                    >
                      {formatNaira(guestNightly)}
                    </span>
                    <span style={{ fontSize: 14, color: 'rgba(248,245,238,0.78)' }}>
                      per night · hamlet.rest
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#F8F5EE' }}>
                    View stay on hamlet.rest
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630, ...(fonts.length > 0 ? { fonts } : {}) },
    );

    return Buffer.from(await response.arrayBuffer());
  };

  try {
    return await renderCard(resolvedPhoto.dataUrl, resolvedPhoto.isFallback);
  } catch {
    return renderCard(EMBEDDED_FALLBACK_DATA_URL, true);
  }
}

export interface MarketingCardRenderInput {
  stay: PropertyOgInput & { amenities?: string[] | null };
  cardType: MarketingCardType;
  format: MarketingCardFormat;
  theme: MarketingCardTheme;
  targetUrl: string;
  imageIndex?: number;
  showAmenities?: boolean;
  showCapacity?: boolean;
  includeQr?: boolean;
  partnerDisplayName?: string | null;
  dealTerms?: PartnerDealTerms | null;
}

/**
 * Generates high-resolution downloadable Guest-Facing or Partner Opportunity cards
 * across Social (`1200×630`), Portrait (`1080×1350`), and Story/Status (`1080×1920`).
 */
export async function renderMarketingCardBuffer(
  input: MarketingCardRenderInput,
): Promise<Buffer> {
  const fonts = loadShareArtworkFonts();
  const spec = getMarketingFormatSpec(input.format);
  const images = Array.isArray(input.stay.image_urls) ? input.stay.image_urls : [];
  const safeIndex =
    images.length > 0
      ? Math.max(0, Math.min(images.length - 1, Math.trunc(input.imageIndex ?? 0)))
      : 0;
  const chosenImage = images[safeIndex] ?? null;
  const { dataUrl: initialPhotoDataUrl } = await resolveArtworkPhotoDataUrl(chosenImage);

  const qrDataUrl =
    input.includeQr !== false
      ? await generateQrCodeDataUrl(input.targetUrl, { size: 320, margin: 4 })
      : null;

  const guestNightly = getValidGuestNightlyNgn(input.stay.nightly_rate);
  const areaLabel = input.stay.area?.trim()
    ? `${input.stay.area.trim()}, Lagos`
    : 'Lagos, Nigeria';
  const accommodationLabel = formatAccommodationLabel(
    input.stay.property_type ?? null,
    input.stay.bedrooms ?? null,
  );
  const bedroomLabel = formatBedroomCountLabel(
    input.stay.bedrooms ?? null,
    input.stay.property_type ?? null,
  );
  const bathCount = input.stay.bathrooms ?? 1;
  const bathText = `${bathCount} ${bathCount === 1 ? 'bath' : 'baths'}`;
  const trust = getStayTrustStatus({
    status: input.stay.status,
    verification: input.stay.verification ?? null,
  });

  const amenities =
    input.showAmenities !== false && Array.isArray(input.stay.amenities)
      ? input.stay.amenities.filter(Boolean).slice(0, 3)
      : [];

  // Strict financial accuracy & privacy guard:
  // Guest-facing cards NEVER show partner earnings.
  // Partner opportunity cards show earnings ONLY when `dealTerms.authorised === true`
  // and `estimated_per_night_ngn > 0`.
  const isPartnerCard = input.cardType === 'partner';
  const authorisedEarningNgn =
    isPartnerCard &&
    input.dealTerms?.authorised === true &&
    typeof input.dealTerms.estimated_per_night_ngn === 'number' &&
    input.dealTerms.estimated_per_night_ngn > 0
      ? Math.round(input.dealTerms.estimated_per_night_ngn)
      : null;

  const isLightTheme = input.theme === 'ivory';
  const bg = isLightTheme ? '#F8F5EE' : input.theme === 'lagoon' ? '#12263F' : '#0E1F3B';
  const panelBg = isLightTheme ? '#FFFFFF' : 'rgba(255,255,255,0.06)';
  const panelBorder = isLightTheme ? '#E3DAC8' : 'rgba(201,164,92,0.42)';
  const textPrimary = isLightTheme ? '#0E1F3B' : '#F8F5EE';
  const textMuted = isLightTheme ? '#4A5568' : 'rgba(248,245,238,0.78)';
  const accent = isLightTheme ? '#946E21' : '#E1C26E';

  const renderWithPhoto = async (photoDataUrl: string): Promise<Buffer> => {
    if (input.format === 'social') {
      const response = new ImageResponse(
        (
          <div
            style={{
              display: 'flex',
              width: 1200,
              height: 630,
              backgroundColor: bg,
              color: textPrimary,
              fontFamily: 'Inter, InterExt',
              overflow: 'hidden',
            }}
          >
            {/* Left Hero Photo */}
            <div style={{ display: 'flex', width: 540, height: 630, position: 'relative' }}>
              <img
                src={photoDataUrl}
                alt={input.stay.title}
                width={540}
                height={630}
                style={{ width: 540, height: 630, objectFit: 'cover' }}
              />
              <div
                style={{
                  display: 'flex',
                  position: 'absolute',
                  top: 24,
                  left: 24,
                  padding: '7px 14px',
                  borderRadius: 999,
                  backgroundColor: 'rgba(14,31,59,0.88)',
                  border: '1px solid rgba(201,164,92,0.6)',
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {isPartnerCard ? 'PARTNER OPPORTUNITY' : trust.badge}
              </div>
            </div>

            {/* Right Editorial Info Panel */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                width: 660,
                height: 630,
                padding: '38px 44px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {renderOgHamletLogo({ light: !isLightTheme, markSize: 40, wordSize: 24 })}
                {isPartnerCard && input.partnerDisplayName && (
                  <div
                    style={{
                      display: 'flex',
                      padding: '6px 14px',
                      borderRadius: 999,
                      backgroundColor: panelBg,
                      border: `1px solid ${panelBorder}`,
                      fontSize: 13,
                      fontWeight: 600,
                      color: textPrimary,
                    }}
                  >
                    {`Shared via ${input.partnerDisplayName}`}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div
                  style={{
                    display: 'flex',
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: accent,
                  }}
                >
                  {`${areaLabel} · ${accommodationLabel}`}
                </div>

                <div
                  style={{
                    display: 'flex',
                    fontFamily: 'Playfair Display, Inter',
                    fontSize: input.stay.title.length > 42 ? 34 : 40,
                    fontWeight: 700,
                    lineHeight: 1.12,
                    color: textPrimary,
                  }}
                >
                  {input.stay.title.length > 64
                    ? `${input.stay.title.slice(0, 61)}…`
                    : input.stay.title}
                </div>

                <div style={{ display: 'flex', gap: 12, fontSize: 16, fontWeight: 600, color: textMuted }}>
                  <span>{bedroomLabel}</span>
                  <span>·</span>
                  <span>{bathText}</span>
                  {input.showCapacity !== false &&
                    typeof input.stay.capacity === 'number' &&
                    input.stay.capacity > 0 && (
                      <>
                        <span>·</span>
                        <span>{`Up to ${input.stay.capacity} guests`}</span>
                      </>
                    )}
                </div>

                {amenities.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                    {amenities.map(item => (
                      <span
                        key={item}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 999,
                          backgroundColor: panelBg,
                          border: `1px solid ${panelBorder}`,
                          fontSize: 13,
                          fontWeight: 600,
                          color: textPrimary,
                        }}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                )}

                {isPartnerCard && authorisedEarningNgn !== null && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 3,
                      marginTop: 6,
                      padding: '12px 16px',
                      borderRadius: 16,
                      backgroundColor: isLightTheme ? '#EFE9DC' : 'rgba(201,164,92,0.14)',
                      border: `1px solid ${panelBorder}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: accent, textTransform: 'uppercase' }}>
                        Est. Partner Opportunity
                      </span>
                      <span style={{ fontSize: 22, fontWeight: 700, color: textPrimary }}>
                        {`${formatNaira(authorisedEarningNgn)} / night`}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: textMuted }}>
                      {`${input.dealTerms?.basis_label || 'Authorised deal'} · Estimated on completed stays, not a confirmed payout.`}
                    </span>
                  </div>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 16,
                  borderTop: `1px solid ${panelBorder}`,
                  gap: 16,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: accent, textTransform: 'uppercase' }}>
                    {guestNightly !== null ? 'Approved Stay Rate' : 'Verified Listing'}
                  </span>
                  {guestNightly !== null && (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontSize: 28, fontWeight: 700, color: textPrimary }}>
                        {formatNaira(guestNightly)}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 400, color: textMuted }}>
                        / night
                      </span>
                    </div>
                  )}
                  <span style={{ fontSize: 13, fontWeight: 600, color: textMuted, marginTop: 2 }}>
                    {isPartnerCard
                      ? 'Enquire or introduce a guest on hamlet.rest'
                      : 'Request dates on hamlet.rest · Your stay, sorted.'}
                  </span>
                </div>

                {qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt="Scan property QR"
                    width={108}
                    height={108}
                    style={{
                      width: 108,
                      height: 108,
                      borderRadius: 12,
                      border: `1px solid ${panelBorder}`,
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        ),
        { width: 1200, height: 630, ...(fonts.length > 0 ? { fonts } : {}) },
      );
      return Buffer.from(await response.arrayBuffer());
    }

    // Portrait (`1080 × 1350`) and Story/Status (`1080 × 1920`) vertical layouts
    const isStory = input.format === 'story';
    const photoHeight = isStory ? 960 : 660;
    const qrSize = isStory ? 168 : 136;

    const response = new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: spec.width,
            height: spec.height,
            backgroundColor: bg,
            color: textPrimary,
            fontFamily: 'Inter, InterExt',
            overflow: 'hidden',
          }}
        >
          {/* Top Photo Frame */}
          <div
            style={{
              display: 'flex',
              width: spec.width,
              height: photoHeight,
              position: 'relative',
              padding: isLightTheme ? '28px 28px 0 28px' : 0,
            }}
          >
            <img
              src={photoDataUrl}
              alt={input.stay.title}
              width={isLightTheme ? spec.width - 56 : spec.width}
              height={isLightTheme ? photoHeight - 28 : photoHeight}
              style={{
                width: isLightTheme ? spec.width - 56 : spec.width,
                height: isLightTheme ? photoHeight - 28 : photoHeight,
                objectFit: 'cover',
                borderRadius: isLightTheme ? 28 : 0,
              }}
            />

            {/* Top Floating Brand Pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'absolute',
                top: isLightTheme ? 52 : 36,
                left: isLightTheme ? 52 : 42,
                right: isLightTheme ? 52 : 42,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  padding: '10px 18px',
                  borderRadius: 999,
                  backgroundColor: 'rgba(14,31,59,0.88)',
                  border: '1px solid rgba(201,164,92,0.5)',
                }}
              >
                {renderOgHamletLogo({ light: true, markSize: 38, wordSize: 24 })}
              </div>

              <div
                style={{
                  display: 'flex',
                  padding: '10px 20px',
                  borderRadius: 999,
                  backgroundColor: 'rgba(14,31,59,0.88)',
                  border: '1px solid rgba(201,164,92,0.65)',
                  color: '#F6E5AB',
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                }}
              >
                {isPartnerCard ? 'PARTNER BRIEF' : trust.badge}
              </div>
            </div>
          </div>

          {/* Editorial Body */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              flex: 1,
              padding: isStory ? '46px 56px 54px 56px' : '36px 50px 42px 50px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: isStory ? 18 : 12 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: accent,
                  }}
                >
                  {`${areaLabel} · ${accommodationLabel}`}
                </span>
                {isPartnerCard && input.partnerDisplayName && (
                  <span style={{ fontSize: 16, fontWeight: 600, color: textMuted }}>
                    {input.partnerDisplayName}
                  </span>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  fontFamily: 'Playfair Display, Inter',
                  fontSize: isStory ? 54 : 46,
                  fontWeight: 700,
                  lineHeight: 1.1,
                  color: textPrimary,
                }}
              >
                {input.stay.title.length > 64
                  ? `${input.stay.title.slice(0, 61)}…`
                  : input.stay.title}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  fontSize: 21,
                  fontWeight: 600,
                  color: textMuted,
                }}
              >
                <span>{bedroomLabel}</span>
                <span>·</span>
                <span>{bathText}</span>
                {input.showCapacity !== false &&
                  typeof input.stay.capacity === 'number' &&
                  input.stay.capacity > 0 && (
                    <>
                      <span>·</span>
                      <span>{`Up to ${input.stay.capacity} guests`}</span>
                    </>
                  )}
              </div>

              {amenities.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
                  {amenities.map(item => (
                    <span
                      key={item}
                      style={{
                        padding: '8px 18px',
                        borderRadius: 999,
                        backgroundColor: panelBg,
                        border: `1px solid ${panelBorder}`,
                        fontSize: 17,
                        fontWeight: 600,
                        color: textPrimary,
                      }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              )}

              {isPartnerCard && authorisedEarningNgn !== null && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    marginTop: isStory ? 14 : 8,
                    padding: '18px 24px',
                    borderRadius: 22,
                    backgroundColor: isLightTheme ? '#EFE9DC' : 'rgba(201,164,92,0.14)',
                    border: `1px solid ${panelBorder}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: accent,
                      }}
                    >
                      Authorised Partner Opportunity
                    </span>
                    <span style={{ fontSize: 30, fontWeight: 700, color: textPrimary }}>
                      {`${formatNaira(authorisedEarningNgn)} / night`}
                    </span>
                  </div>
                  <span style={{ fontSize: 15, color: textMuted }}>
                    {`${input.dealTerms?.basis_label || 'Authorised deal terms'} · Estimated earning opportunity on completed stays, not a confirmed payout.`}
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Pricing + Scannable QR Call-to-Action */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 24,
                borderTop: `1px solid ${panelBorder}`,
                gap: 24,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: accent,
                  }}
                >
                  {guestNightly !== null ? 'ALL-IN STAY RATE' : 'VERIFIED LAGOS STAY'}
                </span>
                {guestNightly !== null && (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <span style={{ fontSize: 44, fontWeight: 700, color: textPrimary }}>
                      {formatNaira(guestNightly)}
                    </span>
                    <span style={{ fontSize: 20, color: textMuted }}>/ night</span>
                  </div>
                )}
                <span style={{ fontSize: 18, fontWeight: 600, color: textMuted }}>
                  {isPartnerCard
                    ? 'Scan or open link to introduce your guest on hamlet.rest'
                    : 'Scan or visit hamlet.rest to view stay & request dates'}
                </span>
              </div>

              {qrDataUrl && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <img
                    src={qrDataUrl}
                    alt="Scan QR code"
                    width={qrSize}
                    height={qrSize}
                    style={{
                      width: qrSize,
                      height: qrSize,
                      borderRadius: 16,
                      border: `2px solid ${panelBorder}`,
                    }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 700, color: accent }}>
                    SCAN TO OPEN
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ),
      { width: spec.width, height: spec.height, ...(fonts.length > 0 ? { fonts } : {}) },
    );

    return Buffer.from(await response.arrayBuffer());
  };

  try {
    return await renderWithPhoto(initialPhotoDataUrl);
  } catch {
    return renderWithPhoto(EMBEDDED_FALLBACK_DATA_URL);
  }
}

/**
 * Branded printable HAMLET QR placard (`1080 × 1350`) with untouched quiet zone.
 */
export async function renderBrandedQrPlacardBuffer(input: {
  title: string;
  area?: string | null;
  targetUrl: string;
}): Promise<Buffer> {
  const fonts = loadShareArtworkFonts();
  const qrDataUrl = await generateQrCodeDataUrl(input.targetUrl, {
    size: 680,
    margin: 4,
  });
  const areaLabel = input.area?.trim() ? `${input.area.trim()}, Lagos` : 'Lagos, Nigeria';

  const response = new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: 1080,
          height: 1350,
          padding: '72px 80px',
          backgroundColor: '#0E1F3B',
          color: '#F8F5EE',
          fontFamily: 'Inter, InterExt',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          {renderOgHamletLogo({ light: true, markSize: 56, wordSize: 34 })}
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#C9A45C',
            }}
          >
            {`VERIFIED SHORTLET STAY · ${areaLabel}`}
          </span>
        </div>

        {/* Untouched pure-white QR card with wide ISO quiet zone */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: 36,
            borderRadius: 36,
            backgroundColor: '#FFFFFF',
            border: '3px solid #C9A45C',
          }}
        >
          <img
            src={qrDataUrl}
            alt={`QR code for ${input.title}`}
            width={640}
            height={640}
            style={{ width: 640, height: 640 }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              fontFamily: 'Playfair Display, Inter',
              fontSize: 42,
              fontWeight: 700,
              color: '#F8F5EE',
              textAlign: 'center',
            }}
          >
            {input.title.length > 56 ? `${input.title.slice(0, 53)}…` : input.title}
          </div>
          <div style={{ display: 'flex', fontSize: 20, color: 'rgba(248,245,238,0.82)' }}>
            Scan with your phone camera to view photos, pricing & request dates on hamlet.rest
          </div>
          <div style={{ display: 'flex', fontSize: 16, fontWeight: 700, color: '#C9A45C' }}>
            Your stay, sorted.
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1350, ...(fonts.length > 0 ? { fonts } : {}) },
  );

  return Buffer.from(await response.arrayBuffer());
}
