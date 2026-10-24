import type { Property } from './types';

export const HAMLET_SITE_URL = 'https://www.hamlet.rest';
export const HAMLET_SITE_NAME = 'HAMLET Shortlets';
export const HAMLET_DEFAULT_TITLE =
  'HAMLET Shortlets | Find Your Next Stay in Lagos — Your stay, sorted.';
export const HAMLET_DEFAULT_DESCRIPTION =
  'Explore shortlets across Lagos Mainland (Yaba, Shomolu, Surulere, Ikeja & environs) and Lagos Island (Lekki, Victoria Island & Ikoyi) on HAMLET. Your stay, sorted.';
export const HAMLET_DEFAULT_OG_IMAGE = `${HAMLET_SITE_URL}/images/lagos-hero.jpg`;
export const HAMLET_LLMS_TXT_URL = `${HAMLET_SITE_URL}/llms.txt`;
export const HAMLET_LLMS_FULL_TXT_URL = `${HAMLET_SITE_URL}/llms-full.txt`;

export const ROBOTS_INDEX_DIRECTIVE =
  'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
export const ROBOTS_NOINDEX_DIRECTIVE = 'noindex, nofollow';

export interface PageMetaOptions {
  /** Override route path (e.g. '/stays' or '/stays/p-123'). Defaults to current hash route. */
  canonicalPath?: string;
  /** Force noindex, nofollow (auto-enabled on /signin, /account, /admin/*, and /partner/* workspace). */
  noindex?: boolean;
  /** Open Graph / Twitter preview image URL (relative path or absolute https:// URL). */
  ogImage?: string;
  /** Accessible alt text for the Open Graph / Twitter preview image. */
  ogImageAlt?: string;
  /** Open Graph object type (defaults to 'website'). */
  ogType?: 'website' | 'article';
  /** Route-specific Schema.org JSON-LD payload injected into <head> and cleaned up on unmount. */
  structuredData?: Record<string, unknown> | null;
}

/** Normalizes a route or hash fragment into a clean leading-slash pathname without query parameters. */
export function normalizeSeoPathname(rawPathOrHash: string): string {
  const trimmed = rawPathOrHash.trim();
  if (!trimmed || trimmed === '#' || trimmed === '#/') return '/';
  const withoutHash = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
  const pathOnly = withoutHash.split('?')[0]?.split('#')[0] ?? '/';
  if (!pathOnly || pathOnly === '/') return '/';
  const withLeadingSlash = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
  return withLeadingSlash.replace(/\/+$/, '') || '/';
}

/**
 * Determines whether a route should be excluded from search indexing.
 * Public pages (/partner/register, /stays, /lagos, /about, /how-it-works, /safety, /faqs, /legal/*)
 * are indexable; private auth, account, partner workspace, and admin console routes are noindex.
 */
export function isNoIndexPath(pathname: string): boolean {
  const clean = normalizeSeoPathname(pathname).toLowerCase();
  if (clean === '/partner/register') return false;
  if (
    clean === '/signin' ||
    clean === '/signup' ||
    clean === '/account' ||
    clean === '/wayfinder' ||
    clean.startsWith('/wayfinder/') ||
    clean === '/admin' ||
    clean.startsWith('/admin/') ||
    clean === '/partner' ||
    clean.startsWith('/partner/')
  ) {
    return true;
  }
  return false;
}

/** Builds a clean canonical URL on https://www.hamlet.rest without tracking query params. */
export function buildCanonicalUrl(pathname: string): string {
  const clean = normalizeSeoPathname(pathname);
  if (clean === '/') return `${HAMLET_SITE_URL}/`;
  return `${HAMLET_SITE_URL}/#${clean}`;
}

/** Resolves a relative or absolute asset URL against https://www.hamlet.rest. */
export function resolveAbsoluteSeoUrl(rawUrl: string | undefined | null): string {
  if (!rawUrl || !rawUrl.trim()) return HAMLET_DEFAULT_OG_IMAGE;
  const trimmed = rawUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const cleanRel = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${HAMLET_SITE_URL}${cleanRel}`;
}

/** Builds Schema.org FAQPage structured data from Q&A pairs. */
export function buildFaqStructuredData(
  items: ReadonlyArray<{ q: string; a: string }>,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(item => ({
      '@type': 'Question',
      name: item.q.replace(/^\d+\.\s*/, '').trim(),
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a.trim(),
      },
    })),
  };
}

/** Builds Schema.org LodgingBusiness + BreadcrumbList structured data for an approved Lagos shortlet. */
export function buildPropertyStructuredData(
  property: Pick<
    Property,
    | 'id'
    | 'title'
    | 'type'
    | 'area'
    | 'address'
    | 'bedrooms'
    | 'bathrooms'
    | 'capacity'
    | 'amenities'
    | 'images'
  >,
  guestNightlyNgn: number,
): Record<string, unknown> {
  const canonicalUrl = buildCanonicalUrl(`/stays/${encodeURIComponent(property.id)}`);
  const images =
    property.images.length > 0
      ? property.images.map(img => resolveAbsoluteSeoUrl(img))
      : [HAMLET_DEFAULT_OG_IMAGE];

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: `${HAMLET_SITE_URL}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Explore Lagos Stays',
            item: buildCanonicalUrl('/stays'),
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: property.title,
            item: canonicalUrl,
          },
        ],
      },
      {
        '@type': 'LodgingBusiness',
        '@id': `${canonicalUrl}#lodging`,
        name: property.title,
        description: `${property.bedrooms}-bedroom ${property.type.toLowerCase()} in ${property.area}, Lagos sleeping up to ${property.capacity} guests on HAMLET.`,
        url: canonicalUrl,
        image: images,
        priceRange: `₦${Math.round(guestNightlyNgn).toLocaleString('en-NG')}/night`,
        address: {
          '@type': 'PostalAddress',
          streetAddress: property.address,
          addressLocality: property.area,
          addressRegion: 'Lagos',
          addressCountry: 'NG',
        },
        numberOfRooms: property.bedrooms,
        amenityFeature: property.amenities.map(name => ({
          '@type': 'LocationFeatureSpecification',
          name,
          value: true,
        })),
        containsPlace: {
          '@type': 'Accommodation',
          name: `${property.title} (${property.type})`,
          numberOfBedrooms: property.bedrooms,
          numberOfBathroomsTotal: property.bathrooms,
          occupancy: {
            '@type': 'QuantitativeValue',
            maxValue: property.capacity,
          },
        },
        makesOffer: {
          '@type': 'Offer',
          url: canonicalUrl,
          priceCurrency: 'NGN',
          price: Math.round(guestNightlyNgn),
          availability: 'https://schema.org/InStock',
        },
      },
    ],
  };
}

/** Builds Schema.org CollectionPage + ItemList structured data for the Lagos neighbourhood guide. */
export function buildLagosGuideStructuredData(
  neighbourhoods: ReadonlyArray<{ name: string; body: string; href: string }>,
): Record<string, unknown> {
  const pageUrl = buildCanonicalUrl('/lagos');
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${pageUrl}#collection`,
    name: 'Shortlets in Lagos — Mainland & Island Neighbourhood Guide | HAMLET',
    url: pageUrl,
    about: {
      '@type': 'City',
      name: 'Lagos',
      containedInPlace: {
        '@type': 'Country',
        name: 'Nigeria',
      },
    },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: neighbourhoods.map((area, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: area.name,
        description: area.body,
        url: `${HAMLET_SITE_URL}/#${area.href}`,
      })),
    },
  };
}

const ROUTE_JSONLD_SCRIPT_ID = 'hamlet-route-jsonld';

function upsertMetaTag(attr: 'name' | 'property', key: string, content: string): void {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonicalLink(href: string): void {
  if (typeof document === 'undefined') return;
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

export function setRouteStructuredData(payload: Record<string, unknown> | null | undefined): void {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById(ROUTE_JSONLD_SCRIPT_ID);
  if (!payload) {
    existing?.remove();
    return;
  }
  let script = existing as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = ROUTE_JSONLD_SCRIPT_ID;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(payload);
}

/** Applies full title, description, robots, canonical, Open Graph, Twitter Card, and optional JSON-LD tags. */
export function applyDocumentSeo(
  title: string,
  description?: string,
  options?: PageMetaOptions,
): () => void {
  if (typeof document === 'undefined') {
    return () => {};
  }

  const rawLocationPath =
    options?.canonicalPath ??
    (typeof window !== 'undefined'
      ? window.location.hash || window.location.pathname || '/'
      : '/');
  const cleanPathname = normalizeSeoPathname(rawLocationPath);
  const effectiveDescription = description?.trim() || HAMLET_DEFAULT_DESCRIPTION;
  const canonicalUrl = buildCanonicalUrl(cleanPathname);
  const shouldNoIndex = options?.noindex ?? isNoIndexPath(cleanPathname);
  const robotsValue = shouldNoIndex ? ROBOTS_NOINDEX_DIRECTIVE : ROBOTS_INDEX_DIRECTIVE;
  const resolvedOgImage = resolveAbsoluteSeoUrl(options?.ogImage);
  const resolvedOgAlt =
    options?.ogImageAlt?.trim() ||
    'HAMLET — Verified shortlet apartments across Lagos Mainland and Lagos Island';
  const ogType = options?.ogType ?? 'website';

  document.title = title;
  upsertMetaTag('name', 'description', effectiveDescription);
  upsertMetaTag('name', 'robots', robotsValue);
  upsertCanonicalLink(canonicalUrl);

  upsertMetaTag('property', 'og:type', ogType);
  upsertMetaTag('property', 'og:site_name', HAMLET_SITE_NAME);
  upsertMetaTag('property', 'og:locale', 'en_NG');
  upsertMetaTag('property', 'og:title', title);
  upsertMetaTag('property', 'og:description', effectiveDescription);
  upsertMetaTag('property', 'og:url', canonicalUrl);
  upsertMetaTag('property', 'og:image', resolvedOgImage);
  upsertMetaTag('property', 'og:image:alt', resolvedOgAlt);

  upsertMetaTag('name', 'twitter:card', 'summary_large_image');
  upsertMetaTag('name', 'twitter:title', title);
  upsertMetaTag('name', 'twitter:description', effectiveDescription);
  upsertMetaTag('name', 'twitter:image', resolvedOgImage);
  upsertMetaTag('name', 'twitter:image:alt', resolvedOgAlt);

  if (options?.structuredData !== undefined) {
    setRouteStructuredData(options.structuredData);
  }

  return () => {
    if (options?.structuredData !== undefined) {
      setRouteStructuredData(null);
    }
  };
}
