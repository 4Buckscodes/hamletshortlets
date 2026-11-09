import type { Metadata } from 'next';
import { hasReliableLocationData } from './areas';
import {
  formatAccommodationLabel,
  getValidPublicGuestNightlyNgn,
  isApprovedBookableStay,
} from './discovery';
import type { PublicStayRecord } from './next-supabase';

export const HAMLET_CANONICAL_ORIGIN = 'https://hamlet.rest';
export const HAMLET_BRAND = 'HAMLET';
export const HAMLET_LEGAL_NAME = 'HAMLET Marketplace Ltd';
export const HAMLET_PARENT_ORGANIZATION_NAME = 'Abundance Abodes';
export const HAMLET_ORGANIZATION_ID = `${HAMLET_CANONICAL_ORIGIN}/#organization`;
export const HAMLET_PARENT_ORGANIZATION_ID = `${HAMLET_CANONICAL_ORIGIN}/#parent-organization`;
export const HAMLET_WEBSITE_ID = `${HAMLET_CANONICAL_ORIGIN}/#website`;
export const HAMLET_LOGO_ID = `${HAMLET_CANONICAL_ORIGIN}/#logo`;
export const HAMLET_LOGO_URL = `${HAMLET_CANONICAL_ORIGIN}/favicon.svg`;
export const HAMLET_DEFAULT_SHARE_IMAGE = `${HAMLET_CANONICAL_ORIGIN}/api/og/default`;
export const HAMLET_VERIFIED_CONTACT_EMAIL = 'hello@hamlet.rest';

/**
 * Verified official social media profile URLs for HAMLET.
 * Kept empty until official social handles are verified so unverified URLs are never emitted.
 */
export const HAMLET_VERIFIED_SOCIAL_PROFILES: readonly string[] = [];

export const HAMLET_BUSINESS_DESCRIPTION =
  'HAMLET is a verified shortlet marketplace in Lagos, Nigeria by Abundance Abodes, connecting guests with inspected serviced apartments across Lagos Island and Lagos Mainland.';

export const HAMLET_WEBSITE_DESCRIPTION =
  'Verified shortlet apartments across Lagos Island and Lagos Mainland — clear details, trusted hosts, and straightforward booking requests.';

/**
 * Normalizes a Next.js App Router path into an clean canonical URL on https://hamlet.rest
 * without query parameters, hash fragments, or trailing slashes.
 */
export function buildNextCanonicalUrl(pathname: string): string {
  const trimmed = (pathname || '/').trim();
  const withoutHash = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
  const pathOnly = withoutHash.split('?')[0]?.split('#')[0] ?? '/';
  if (!pathOnly || pathOnly === '/') {
    return HAMLET_CANONICAL_ORIGIN;
  }
  const withLeadingSlash = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
  const cleanPath = withLeadingSlash.replace(/\/+$/, '') || '/';
  return cleanPath === '/'
    ? HAMLET_CANONICAL_ORIGIN
    : `${HAMLET_CANONICAL_ORIGIN}${cleanPath}`;
}

/**
 * Resolves a relative `/...` path or absolute `https://` URL against https://hamlet.rest.
 * Returns `null` when empty or non-HTTP(S) so property schemas never substitute stock images.
 */
export function resolveCanonicalAssetUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return null;
  const cleanRel = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${HAMLET_CANONICAL_ORIGIN}${cleanRel}`;
}

/**
 * Safely serializes a Schema.org JSON-LD object for inline `<script type="application/ld+json">`
 * rendering, escaping `<`, `>`, `&`, and line-separator characters to prevent script breakout.
 */
export function serializeJsonLd(payload: Record<string, unknown>): string {
  return JSON.stringify(payload)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export interface PublicPageMetadataInput {
  title: string;
  description: string;
  pathname: string;
  ogType?: 'website' | 'article';
  imageUrl?: string | null;
  imageAlt?: string;
}

/**
 * Builds consistent Next.js Metadata for indexable public pages with self-referencing
 * canonical URLs and matching Open Graph / Twitter Card metadata on https://hamlet.rest.
 */
export function buildPublicPageMetadata({
  title,
  description,
  pathname,
  ogType = 'website',
  imageUrl,
  imageAlt,
}: PublicPageMetadataInput): Metadata {
  const canonicalUrl = buildNextCanonicalUrl(pathname);
  const resolvedImage = resolveCanonicalAssetUrl(imageUrl) ?? HAMLET_DEFAULT_SHARE_IMAGE;
  const resolvedAlt =
    imageAlt?.trim() || 'HAMLET — Verified shortlet stays across Lagos Island and Lagos Mainland';

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: ogType,
      siteName: HAMLET_BRAND,
      locale: 'en_NG',
      title,
      description,
      url: canonicalUrl,
      images: [
        {
          url: resolvedImage,
          width: 1200,
          height: 630,
          alt: resolvedAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [resolvedImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
  };
}

export interface OrganizationSchemaOptions {
  verifiedSocialProfiles?: readonly string[];
}

/**
 * Builds Schema.org Organization structured data for HAMLET and its parent
 * organization Abundance Abodes, including verified contact details only.
 */
export function buildOrganizationSchema(
  options?: OrganizationSchemaOptions,
): Record<string, unknown> {
  const socialProfiles = (options?.verifiedSocialProfiles ?? HAMLET_VERIFIED_SOCIAL_PROFILES)
    .map(url => url.trim())
    .filter(url => /^https:\/\//i.test(url));

  const organization: Record<string, unknown> = {
    '@type': 'Organization',
    '@id': HAMLET_ORGANIZATION_ID,
    name: HAMLET_BRAND,
    alternateName: ['HAMLET.REST', 'HAMLET Shortlets'],
    legalName: HAMLET_LEGAL_NAME,
    url: HAMLET_CANONICAL_ORIGIN,
    slogan: 'Your stay, sorted.',
    description: HAMLET_BUSINESS_DESCRIPTION,
    logo: {
      '@type': 'ImageObject',
      '@id': HAMLET_LOGO_ID,
      url: HAMLET_LOGO_URL,
      contentUrl: HAMLET_LOGO_URL,
      width: 512,
      height: 512,
      caption: HAMLET_BRAND,
    },
    image: {
      '@type': 'ImageObject',
      url: HAMLET_DEFAULT_SHARE_IMAGE,
      width: 867,
      height: 650,
    },
    parentOrganization: {
      '@type': 'Organization',
      '@id': HAMLET_PARENT_ORGANIZATION_ID,
      name: HAMLET_PARENT_ORGANIZATION_NAME,
    },
    email: HAMLET_VERIFIED_CONTACT_EMAIL,
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: HAMLET_VERIFIED_CONTACT_EMAIL,
        areaServed: 'NG',
        availableLanguage: ['en'],
      },
    ],
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Lagos',
      addressRegion: 'Lagos',
      addressCountry: 'NG',
    },
    areaServed: {
      '@type': 'City',
      name: 'Lagos',
      containedInPlace: {
        '@type': 'Country',
        name: 'Nigeria',
      },
    },
  };

  if (socialProfiles.length > 0) {
    organization.sameAs = socialProfiles;
  }

  return organization;
}

export interface WebSiteSchemaOptions {
  /**
   * Optional search URL template containing `{search_term_string}`.
   * Intentionally omitted by default because HAMLET uses structured neighbourhood/date filters
   * rather than an arbitrary free-text site search endpoint.
   */
  searchUrlTemplate?: string | null;
}

/**
 * Builds Schema.org WebSite structured data linked to HAMLET's Organization node.
 */
export function buildWebSiteSchema(options?: WebSiteSchemaOptions): Record<string, unknown> {
  const website: Record<string, unknown> = {
    '@type': 'WebSite',
    '@id': HAMLET_WEBSITE_ID,
    name: HAMLET_BRAND,
    alternateName: 'HAMLET.REST',
    url: HAMLET_CANONICAL_ORIGIN,
    description: HAMLET_WEBSITE_DESCRIPTION,
    inLanguage: 'en-NG',
    publisher: {
      '@id': HAMLET_ORGANIZATION_ID,
    },
  };

  const template = options?.searchUrlTemplate?.trim();
  if (template && template.includes('{search_term_string}')) {
    website.potentialAction = {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: template,
      },
      'query-input': 'required name=search_term_string',
    };
  }

  return website;
}

/**
 * Global site-wide Schema.org graph rendered once in the root layout (`app/layout.tsx`).
 * Page-level schemas reference `HAMLET_ORGANIZATION_ID` and `HAMLET_WEBSITE_ID` via `@id`
 * to prevent duplicate Organization or WebSite declarations.
 */
export function buildGlobalStructuredDataGraph(options?: {
  organization?: OrganizationSchemaOptions;
  website?: WebSiteSchemaOptions;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      buildOrganizationSchema(options?.organization),
      buildWebSiteSchema(options?.website),
    ],
  };
}

export interface BreadcrumbEntry {
  name: string;
  path: string;
}

/**
 * Builds a clean Schema.org BreadcrumbList node with canonical https://hamlet.rest URLs.
 */
export function buildBreadcrumbListNode(
  items: ReadonlyArray<BreadcrumbEntry>,
  idPath?: string,
): Record<string, unknown> {
  const effectivePath = idPath ?? items[items.length - 1]?.path ?? '/';
  const canonicalTarget = buildNextCanonicalUrl(effectivePath);

  return {
    '@type': 'BreadcrumbList',
    '@id': `${canonicalTarget}#breadcrumb`,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name.trim(),
      item: buildNextCanonicalUrl(item.path),
    })),
  };
}

function buildApprovedStaysItemListNode(
  approvedStays: ReadonlyArray<PublicStayRecord>,
  listId: string,
): Record<string, unknown> | null {
  const eligible = approvedStays.filter(stay => isApprovedBookableStay(stay));
  if (eligible.length === 0) return null;

  return {
    '@type': 'ItemList',
    '@id': listId,
    numberOfItems: eligible.length,
    itemListElement: eligible.slice(0, 36).map((stay, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: stay.title.trim(),
      url: buildNextCanonicalUrl(`/stays/${encodeURIComponent(stay.id)}`),
    })),
  };
}

/**
 * Homepage structured data (`WebPage` + optional `ItemList` of live approved stays).
 * Only verified, approved properties are emitted as bookable listings.
 */
export function buildHomepageSchema(params?: {
  approvedStays?: ReadonlyArray<PublicStayRecord>;
}): Record<string, unknown> {
  const pageUrl = HAMLET_CANONICAL_ORIGIN;
  const staysList = buildApprovedStaysItemListNode(
    params?.approvedStays ?? [],
    `${pageUrl}/#featured-stays`,
  );

  const webPage: Record<string, unknown> = {
    '@type': 'WebPage',
    '@id': `${pageUrl}/#webpage`,
    url: pageUrl,
    name: 'HAMLET — Verified Shortlet Stays in Lagos',
    description: HAMLET_WEBSITE_DESCRIPTION,
    inLanguage: 'en-NG',
    isPartOf: { '@id': HAMLET_WEBSITE_ID },
    about: { '@id': HAMLET_ORGANIZATION_ID },
    primaryImageOfPage: {
      '@type': 'ImageObject',
      url: `${HAMLET_CANONICAL_ORIGIN}/images/prop/living-1.jpg`,
    },
  };

  if (staysList) {
    webPage.mainEntity = { '@id': `${pageUrl}/#featured-stays` };
    return {
      '@context': 'https://schema.org',
      '@graph': [webPage, staysList],
    };
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [webPage],
  };
}

/**
 * About page structured data (`BreadcrumbList` + `AboutPage` linked to `Organization`).
 */
export function buildAboutPageSchema(): Record<string, unknown> {
  const pageUrl = buildNextCanonicalUrl('/about');
  const breadcrumb = buildBreadcrumbListNode(
    [
      { name: 'Home', path: '/' },
      { name: 'About HAMLET', path: '/about' },
    ],
    '/about',
  );

  return {
    '@context': 'https://schema.org',
    '@graph': [
      breadcrumb,
      {
        '@type': 'AboutPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: 'About HAMLET — A Better Way to Book Shortlets in Lagos',
        description:
          'HAMLET is a Nigerian shortlet marketplace and property operating platform by Abundance Abodes, built around Four Pillars of a Better Stay in Lagos.',
        inLanguage: 'en-NG',
        isPartOf: { '@id': HAMLET_WEBSITE_ID },
        mainEntity: { '@id': HAMLET_ORGANIZATION_ID },
        breadcrumb: { '@id': `${pageUrl}#breadcrumb` },
      },
    ],
  };
}

/**
 * Property listing catalogue (`/stays`) structured data (`BreadcrumbList` + `CollectionPage`).
 * Includes an `ItemList` only when live approved database listings exist.
 */
export function buildPropertyListingPageSchema(params?: {
  approvedStays?: ReadonlyArray<PublicStayRecord>;
}): Record<string, unknown> {
  const pageUrl = buildNextCanonicalUrl('/stays');
  const breadcrumb = buildBreadcrumbListNode(
    [
      { name: 'Home', path: '/' },
      { name: 'Explore Lagos Stays', path: '/stays' },
    ],
    '/stays',
  );
  const staysList = buildApprovedStaysItemListNode(
    params?.approvedStays ?? [],
    `${pageUrl}#stays-list`,
  );

  const collectionPage: Record<string, unknown> = {
    '@type': 'CollectionPage',
    '@id': `${pageUrl}#webpage`,
    url: pageUrl,
    name: 'Explore Verified Shortlet Stays Across Lagos | HAMLET',
    description:
      'Compare verified shortlet stays across Lekki Phase 1, Ikate, Victoria Island, Ikoyi, Ajah, Yaba, Ikeja GRA, Surulere, and Shomolu on HAMLET.',
    inLanguage: 'en-NG',
    isPartOf: { '@id': HAMLET_WEBSITE_ID },
    breadcrumb: { '@id': `${pageUrl}#breadcrumb` },
    about: {
      '@type': 'City',
      name: 'Lagos',
      containedInPlace: {
        '@type': 'Country',
        name: 'Nigeria',
      },
    },
  };

  if (staysList) {
    collectionPage.mainEntity = { '@id': `${pageUrl}#stays-list` };
    return {
      '@context': 'https://schema.org',
      '@graph': [breadcrumb, collectionPage, staysList],
    };
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [breadcrumb, collectionPage],
  };
}

/**
 * Lagos neighbourhood guide (`/lagos`) structured data (`BreadcrumbList` + `CollectionPage` + `ItemList`).
 */
export function buildLagosNeighbourhoodGuideSchema(
  neighbourhoods: ReadonlyArray<{
    name: string;
    body: string;
    href: string;
    img?: string;
  }>,
): Record<string, unknown> {
  const pageUrl = buildNextCanonicalUrl('/lagos');
  const breadcrumb = buildBreadcrumbListNode(
    [
      { name: 'Home', path: '/' },
      { name: 'Lagos Neighbourhood Guide', path: '/lagos' },
    ],
    '/lagos',
  );

  return {
    '@context': 'https://schema.org',
    '@graph': [
      breadcrumb,
      {
        '@type': 'CollectionPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: 'Shortlets in Lagos — Mainland & Island Neighbourhood Guide | HAMLET',
        description:
          'Explore shortlets across Lagos Mainland (Yaba, Shomolu, Surulere, Gbagada, Maryland, Ikeja GRA & environs) and Lagos Island (Victoria Island, Ikoyi, Lekki Phase 1, Ikate, Ajah) on HAMLET.',
        inLanguage: 'en-NG',
        isPartOf: { '@id': HAMLET_WEBSITE_ID },
        breadcrumb: { '@id': `${pageUrl}#breadcrumb` },
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
          '@id': `${pageUrl}#neighbourhoods`,
          numberOfItems: neighbourhoods.length,
          itemListElement: neighbourhoods.map((area, index) => {
            const cleanHref = area.href.startsWith('/') ? area.href : `/${area.href}`;
            const item: Record<string, unknown> = {
              '@type': 'ListItem',
              position: index + 1,
              name: area.name,
              description: area.body,
              url: `${HAMLET_CANONICAL_ORIGIN}${cleanHref}`,
            };
            const imageUrl = resolveCanonicalAssetUrl(area.img);
            if (imageUrl) {
              item.image = imageUrl;
            }
            return item;
          }),
        },
      },
    ],
  };
}

/**
 * Determines whether a database property record is eligible for Schema.org `VacationRental`
 * structured data. Only approved, non-preview listings with confirmed location data qualify.
 */
export function isEligibleForVacationRentalSchema(
  stay: (Partial<PublicStayRecord> & { preview_only?: boolean }) | null | undefined,
): stay is PublicStayRecord {
  if (!isApprovedBookableStay(stay)) return false;
  return hasReliableLocationData({
    area: stay.area,
    address: stay.public_address,
  });
}

function mapVacationRentalAdditionalType(propertyType: string | null | undefined): string | null {
  const clean = (propertyType || '').trim().toLowerCase();
  if (!clean) return null;
  if (clean.includes('villa')) return 'Villa';
  if (clean.includes('duplex') || clean.includes('house') || clean.includes('terrace')) {
    return 'House';
  }
  if (
    clean.includes('apartment') ||
    clean.includes('studio') ||
    clean.includes('penthouse') ||
    clean.includes('flat')
  ) {
    return 'Apartment';
  }
  return null;
}

export interface PropertyDetailSchemaInput {
  stay: PublicStayRecord & { preview_only?: boolean };
  publicLocationSummary?: string | null;
}

/**
 * Builds structured data for an individual property detail page (`/stays/[id]`):
 * - Always emits `BreadcrumbList` and `WebPage`.
 * - For eligible approved bookable stays, emits `VacationRental` populated strictly from
 *   actual database values — never fabricating prices, images, amenities, reviews, ratings,
 *   coordinates, or availability status.
 */
export function buildPropertyDetailSchema({
  stay,
  publicLocationSummary,
}: PropertyDetailSchemaInput): Record<string, unknown> {
  const encodedId = encodeURIComponent(stay.id);
  const relativePath = `/stays/${encodedId}`;
  const canonicalUrl = buildNextCanonicalUrl(relativePath);
  const cleanTitle = stay.title.trim();
  const cleanArea = (stay.area || '').trim();
  const cleanAddress = (stay.public_address || '').trim();

  const breadcrumb = buildBreadcrumbListNode(
    [
      { name: 'Home', path: '/' },
      { name: 'Explore Lagos Stays', path: '/stays' },
      { name: cleanTitle, path: relativePath },
    ],
    relativePath,
  );

  const accommodationLabel = formatAccommodationLabel(stay.property_type, stay.bedrooms);
  const capacityValue =
    typeof stay.capacity === 'number' && Number.isFinite(stay.capacity) && stay.capacity > 0
      ? Math.trunc(stay.capacity)
      : null;

  const fallbackDescription = `${accommodationLabel} in ${cleanArea || 'Lagos'}${
    cleanArea.toLowerCase().includes('lagos') ? '' : ', Lagos'
  }${capacityValue ? ` accommodating up to ${capacityValue} ${capacityValue === 1 ? 'guest' : 'guests'}` : ''} on HAMLET.`;
  const description = publicLocationSummary?.trim() || fallbackDescription;

  const webPage: Record<string, unknown> = {
    '@type': 'WebPage',
    '@id': `${canonicalUrl}#webpage`,
    url: canonicalUrl,
    name: `${cleanTitle} in ${cleanArea || 'Lagos'} | HAMLET`,
    description,
    inLanguage: 'en-NG',
    isPartOf: { '@id': HAMLET_WEBSITE_ID },
    breadcrumb: { '@id': `${canonicalUrl}#breadcrumb` },
  };

  if (!isEligibleForVacationRentalSchema(stay)) {
    return {
      '@context': 'https://schema.org',
      '@graph': [breadcrumb, webPage],
    };
  }

  const resolvedImages = (stay.image_urls ?? [])
    .map(img => resolveCanonicalAssetUrl(img))
    .filter((img): img is string => Boolean(img));

  const cleanAmenities = (stay.amenities ?? [])
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);

  const postalAddress: Record<string, unknown> = {
    '@type': 'PostalAddress',
    addressLocality: cleanArea || 'Lagos',
    addressRegion: 'Lagos',
    addressCountry: 'NG',
  };
  if (cleanAddress && cleanAddress.toLowerCase() !== cleanArea.toLowerCase()) {
    postalAddress.streetAddress = cleanAddress;
  }

  const containsPlace: Record<string, unknown> = {
    '@type': 'Accommodation',
    name: cleanTitle,
    additionalType: 'EntirePlace',
  };

  if (typeof stay.bedrooms === 'number' && Number.isFinite(stay.bedrooms) && stay.bedrooms >= 0) {
    containsPlace.numberOfBedrooms = Math.trunc(stay.bedrooms);
  }
  if (typeof stay.bathrooms === 'number' && Number.isFinite(stay.bathrooms) && stay.bathrooms > 0) {
    containsPlace.numberOfBathroomsTotal = Math.trunc(stay.bathrooms);
  }
  if (capacityValue !== null) {
    containsPlace.occupancy = {
      '@type': 'QuantitativeValue',
      value: capacityValue,
    };
  }
  if (stay.bed_setup && stay.bed_setup.trim()) {
    containsPlace.bed = stay.bed_setup.trim();
  }
  if (cleanAmenities.length > 0) {
    containsPlace.amenityFeature = cleanAmenities.map(name => ({
      '@type': 'LocationFeatureSpecification',
      name,
      value: true,
    }));
  }

  const vacationRental: Record<string, unknown> = {
    '@type': 'VacationRental',
    '@id': `${canonicalUrl}#vacation-rental`,
    identifier: stay.id.trim(),
    name: cleanTitle,
    description,
    url: canonicalUrl,
    provider: { '@id': HAMLET_ORGANIZATION_ID },
    address: postalAddress,
    containsPlace,
  };

  const additionalType = mapVacationRentalAdditionalType(stay.property_type);
  if (additionalType) {
    vacationRental.additionalType = additionalType;
  }

  if (resolvedImages.length > 0) {
    vacationRental.image = resolvedImages;
  }

  if (cleanAmenities.length > 0) {
    vacationRental.amenityFeature = cleanAmenities.map(name => ({
      '@type': 'LocationFeatureSpecification',
      name,
      value: true,
    }));
  }

  const domesticNightlyNgn = getValidPublicGuestNightlyNgn(stay.guest_nightly_ngn);
  if (domesticNightlyNgn !== null) {
    vacationRental.offers = {
      '@type': 'Offer',
      url: canonicalUrl,
      priceCurrency: 'NGN',
      price: domesticNightlyNgn,
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: domesticNightlyNgn,
        priceCurrency: 'NGN',
        unitCode: 'DAY',
        referenceQuantity: {
          '@type': 'QuantitativeValue',
          value: 1,
          unitCode: 'DAY',
        },
      },
    };
  }

  webPage.mainEntity = { '@id': `${canonicalUrl}#vacation-rental` };

  return {
    '@context': 'https://schema.org',
    '@graph': [breadcrumb, webPage, vacationRental],
  };
}

/**
 * FAQ page (`/faqs`) structured data (`BreadcrumbList` + `FAQPage`).
 */
export function buildFaqPageSchema(
  items: ReadonlyArray<{ q: string; a: string }>,
): Record<string, unknown> {
  const pageUrl = buildNextCanonicalUrl('/faqs');
  const breadcrumb = buildBreadcrumbListNode(
    [
      { name: 'Home', path: '/' },
      { name: 'Shortlet Booking FAQs', path: '/faqs' },
    ],
    '/faqs',
  );

  return {
    '@context': 'https://schema.org',
    '@graph': [
      breadcrumb,
      {
        '@type': 'FAQPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: 'Shortlet Booking FAQs | HAMLET',
        description:
          'Answers to common questions about booking shortlets in Lagos on HAMLET — photos, power backup, transparent fees, check-in, payments, and support.',
        inLanguage: 'en-NG',
        isPartOf: { '@id': HAMLET_WEBSITE_ID },
        about: { '@id': HAMLET_ORGANIZATION_ID },
        breadcrumb: { '@id': `${pageUrl}#breadcrumb` },
        mainEntity: items.map(item => ({
          '@type': 'Question',
          name: item.q.replace(/^\d+\.\s*/, '').trim(),
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.a.trim(),
          },
        })),
      },
    ],
  };
}

export interface InformationalPageSchemaInput {
  title: string;
  description: string;
  pathname: string;
  breadcrumbName: string;
  parentBreadcrumbs?: ReadonlyArray<BreadcrumbEntry>;
}

/**
 * Informational page structured data (`BreadcrumbList` + `WebPage`) for routes such as
 * `/how-it-works`, `/safety`, `/legal`, and `/partners/apply/form`.
 */
export function buildInformationalPageSchema({
  title,
  description,
  pathname,
  breadcrumbName,
  parentBreadcrumbs,
}: InformationalPageSchemaInput): Record<string, unknown> {
  const pageUrl = buildNextCanonicalUrl(pathname);
  const crumbs: BreadcrumbEntry[] = [
    { name: 'Home', path: '/' },
    ...(parentBreadcrumbs ?? []),
    { name: breadcrumbName, path: pathname },
  ];
  const breadcrumb = buildBreadcrumbListNode(crumbs, pathname);

  return {
    '@context': 'https://schema.org',
    '@graph': [
      breadcrumb,
      {
        '@type': 'WebPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: title,
        description,
        inLanguage: 'en-NG',
        isPartOf: { '@id': HAMLET_WEBSITE_ID },
        about: { '@id': HAMLET_ORGANIZATION_ID },
        breadcrumb: { '@id': `${pageUrl}#breadcrumb` },
      },
    ],
  };
}

export interface BlogArticleSchemaInput {
  slug: string;
  headline: string;
  description: string;
  datePublished: string;
  dateModified?: string | null;
  authorName?: string | null;
  imageUrl?: string | null;
  articleSection?: string | null;
}

/**
 * Reusable server-side `BlogPosting` + `BreadcrumbList` builder for editorial blog articles,
 * linked to HAMLET's global `Organization` and `WebSite` nodes without fabricating metadata.
 */
export function buildBlogArticleSchema({
  slug,
  headline,
  description,
  datePublished,
  dateModified,
  authorName,
  imageUrl,
  articleSection,
}: BlogArticleSchemaInput): Record<string, unknown> {
  const cleanSlug = slug.replace(/^\/+|\/+$/g, '');
  const pathname = `/blog/${cleanSlug}`;
  const articleUrl = buildNextCanonicalUrl(pathname);
  const breadcrumb = buildBreadcrumbListNode(
    [
      { name: 'Home', path: '/' },
      { name: 'Blog', path: '/blog' },
      { name: headline, path: pathname },
    ],
    pathname,
  );

  const blogPosting: Record<string, unknown> = {
    '@type': 'BlogPosting',
    '@id': `${articleUrl}#article`,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${articleUrl}#webpage`,
      url: articleUrl,
      isPartOf: { '@id': HAMLET_WEBSITE_ID },
      breadcrumb: { '@id': `${articleUrl}#breadcrumb` },
    },
    headline: headline.trim(),
    description: description.trim(),
    url: articleUrl,
    datePublished,
    dateModified: dateModified?.trim() || datePublished,
    inLanguage: 'en-NG',
    author: authorName?.trim()
      ? {
          '@type': 'Person',
          name: authorName.trim(),
        }
      : {
          '@id': HAMLET_ORGANIZATION_ID,
        },
    publisher: {
      '@id': HAMLET_ORGANIZATION_ID,
    },
  };

  const resolvedImage = resolveCanonicalAssetUrl(imageUrl);
  if (resolvedImage) {
    blogPosting.image = [resolvedImage];
  }
  if (articleSection?.trim()) {
    blogPosting.articleSection = articleSection.trim();
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [breadcrumb, blogPosting],
  };
}
