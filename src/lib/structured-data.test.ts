import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildAboutPageSchema,
  buildBlogArticleSchema,
  buildBreadcrumbListNode,
  buildFaqPageSchema,
  buildGlobalStructuredDataGraph,
  buildHomepageSchema,
  buildInformationalPageSchema,
  buildLagosNeighbourhoodGuideSchema,
  buildNextCanonicalUrl,
  buildOrganizationSchema,
  buildPropertyDetailSchema,
  buildPropertyListingPageSchema,
  buildPublicPageMetadata,
  buildWebSiteSchema,
  HAMLET_CANONICAL_ORIGIN,
  HAMLET_ORGANIZATION_ID,
  HAMLET_VERIFIED_CONTACT_EMAIL,
  HAMLET_WEBSITE_ID,
  isEligibleForVacationRentalSchema,
  serializeJsonLd,
} from './structured-data';
import type { PublicStayRecord } from './next-supabase';
import { buildPropertyPath } from './property-slugs';

const ROOT = resolve(process.cwd());

const SAMPLE_APPROVED_STAY: PublicStayRecord = {
  id: 'stay-vi-101',
  title: 'Adeola Executive Two-Bedroom',
  area: 'Victoria Island',
  public_address: '14 Adeola Odeku Street, Victoria Island',
  property_type: 'Serviced apartment',
  bedrooms: 2,
  bathrooms: 2,
  bed_setup: '2 Queen beds',
  capacity: 4,
  nightly_rate: 200_000,
  cleaning_fee: 25_000,
  refundable_deposit: 100_000,
  amenities: ['High-speed Wi-Fi', '24/7 Power', 'Air conditioning'],
  house_rules: ['No smoking', 'No unauthorised events'],
  image_urls: ['https://example.supabase.co/storage/v1/object/public/stays/vi-1.jpg'],
  status: 'approved',
  trust_label: 'verified',
  verification: {
    ownership: 'verified',
    identity: 'verified',
    authority: 'verified',
    inspection: 'verified',
  },
  first_available_date: '2026-11-15',
  availability_confirmation_status: 'confirmed',
  availability_last_confirmed_at: '2026-11-01T10:00:00Z',
  created_at: '2026-10-20T09:00:00Z',
};

describe('HAMLET Technical SEO & Structured Data Architecture', () => {
  it('builds valid global Organization and WebSite JSON-LD with accurate Abundance Abodes parent relationship', () => {
    const graph = buildGlobalStructuredDataGraph() as {
      '@context': string;
      '@graph': Array<Record<string, unknown>>;
    };

    expect(graph['@context']).toBe('https://schema.org');
    expect(graph['@graph']).toHaveLength(2);

    const org = graph['@graph'][0]!;
    expect(org['@type']).toBe('Organization');
    expect(org['@id']).toBe(HAMLET_ORGANIZATION_ID);
    expect(org.name).toBe('HAMLET');
    expect(org.url).toBe('https://hamlet.rest');
    expect(org.email).toBe(HAMLET_VERIFIED_CONTACT_EMAIL);

    const parentOrg = org.parentOrganization as Record<string, unknown>;
    expect(parentOrg).toEqual({
      '@type': 'Organization',
      '@id': 'https://hamlet.rest/#parent-organization',
      name: 'Abundance Abodes',
    });

    const logo = org.logo as Record<string, unknown>;
    expect(logo['@type']).toBe('ImageObject');
    expect(logo.url).toBe('https://hamlet.rest/favicon.svg');
    expect(logo.width).toBe(512);
    expect(logo.height).toBe(512);

    // Unverified social media profiles must never be fabricated
    expect(org.sameAs).toBeUndefined();

    // Verified social profiles are emitted only when explicitly supplied
    const withVerifiedSocial = buildOrganizationSchema({
      verifiedSocialProfiles: ['https://www.linkedin.com/company/hamlet-example'],
    });
    expect(withVerifiedSocial.sameAs).toEqual([
      'https://www.linkedin.com/company/hamlet-example',
    ]);

    const website = graph['@graph'][1]!;
    expect(website['@type']).toBe('WebSite');
    expect(website['@id']).toBe(HAMLET_WEBSITE_ID);
    expect(website.name).toBe('HAMLET');
    expect(website.url).toBe('https://hamlet.rest');
    expect(website.publisher).toEqual({ '@id': HAMLET_ORGANIZATION_ID });

    // No fake SearchAction unless a real free-text search endpoint is configured
    expect(website.potentialAction).toBeUndefined();

    const websiteWithSearch = buildWebSiteSchema({
      searchUrlTemplate: 'https://hamlet.rest/search?q={search_term_string}',
    });
    expect(websiteWithSearch.potentialAction).toBeDefined();
  });

  it('normalizes canonical URLs cleanly on https://hamlet.rest without hash fragments or query params', () => {
    expect(HAMLET_CANONICAL_ORIGIN).toBe('https://hamlet.rest');
    expect(buildNextCanonicalUrl('/')).toBe('https://hamlet.rest');
    expect(buildNextCanonicalUrl('/stays?area=Yaba&guests=2')).toBe(
      'https://hamlet.rest/stays',
    );
    expect(buildNextCanonicalUrl('/about/')).toBe('https://hamlet.rest/about');
    expect(buildNextCanonicalUrl('#/lagos')).toBe('https://hamlet.rest/lagos');

    const meta = buildPublicPageMetadata({
      title: 'About HAMLET',
      description: 'Shortlet stays with accountability.',
      pathname: '/about',
    });
    expect(meta.alternates?.canonical).toBe('https://hamlet.rest/about');
    expect((meta.openGraph as { url?: string })?.url).toBe('https://hamlet.rest/about');
  });

  it('escapes dangerous script-breaking characters during JSON-LD serialization', () => {
    const raw = serializeJsonLd({
      '@context': 'https://schema.org',
      name: '</script><script>alert("xss")</script> & More',
    });
    expect(raw).not.toContain('</script>');
    expect(raw).toContain('\\u003c/script\\u003e');
    expect(JSON.parse(raw)).toEqual({
      '@context': 'https://schema.org',
      name: '</script><script>alert("xss")</script> & More',
    });
  });

  it('builds VacationRental structured data strictly from actual database values and never fabricates prices, images, amenities, ratings, reviews, or availability', () => {
    expect(isEligibleForVacationRentalSchema(SAMPLE_APPROVED_STAY)).toBe(true);

    const fullSchema = buildPropertyDetailSchema({
      stay: SAMPLE_APPROVED_STAY,
      publicLocationSummary: 'Quiet Adeola Odeku residential close in Victoria Island.',
    }) as { '@graph': Array<Record<string, unknown>> };

    const types = fullSchema['@graph'].map(node => node['@type']);
    expect(types).toEqual(['BreadcrumbList', 'WebPage', 'VacationRental']);

    const rental = fullSchema['@graph'].find(
      node => node['@type'] === 'VacationRental',
    )!;
    expect(rental.identifier).toBe('stay-vi-101');
    expect(rental.name).toBe('Adeola Executive Two-Bedroom');
    expect(rental.url).toBe(`https://hamlet.rest${buildPropertyPath(SAMPLE_APPROVED_STAY)}`);
    expect(rental.additionalType).toBe('Apartment');
    expect(rental.provider).toEqual({ '@id': HAMLET_ORGANIZATION_ID });
    expect(rental.image).toEqual([
      'https://example.supabase.co/storage/v1/object/public/stays/vi-1.jpg',
    ]);

    // Domestic guest nightly rate: 200,000 * 1.20 = 240,000 NGN
    const offer = rental.offers as Record<string, unknown>;
    expect(offer.priceCurrency).toBe('NGN');
    expect(offer.price).toBe(240_000);
    // Availability must not be fabricated as InStock since partner confirmation is required
    expect(offer.availability).toBeUndefined();

    // Never fabricate reviews, ratings, or geo coordinates
    expect(rental.aggregateRating).toBeUndefined();
    expect(rental.review).toBeUndefined();
    expect(rental.geo).toBeUndefined();

    // Sparse approved listing: missing images, zero rate, empty amenities -> must omit all missing fields
    const sparseStay: PublicStayRecord = {
      ...SAMPLE_APPROVED_STAY,
      id: 'stay-yaba-sparse',
      title: 'Yaba Minimal Studio',
      area: 'Yaba',
      public_address: null,
      property_type: 'Studio',
      bedrooms: 0,
      bathrooms: null,
      bed_setup: null,
      capacity: null,
      nightly_rate: 0,
      amenities: [],
      image_urls: [],
    };
    const sparseSchema = buildPropertyDetailSchema({ stay: sparseStay }) as {
      '@graph': Array<Record<string, unknown>>;
    };
    const sparseRental = sparseSchema['@graph'].find(
      node => node['@type'] === 'VacationRental',
    )!;
    expect(sparseRental.image).toBeUndefined();
    expect(sparseRental.offers).toBeUndefined();
    expect(sparseRental.amenityFeature).toBeUndefined();

    // Non-bookable showcase concepts or unapproved drafts must NEVER receive VacationRental schema
    const showcaseDraft = {
      ...SAMPLE_APPROVED_STAY,
      preview_only: true,
    };
    expect(isEligibleForVacationRentalSchema(showcaseDraft)).toBe(false);
    const nonEligibleSchema = buildPropertyDetailSchema({ stay: showcaseDraft }) as {
      '@graph': Array<Record<string, unknown>>;
    };
    expect(
      nonEligibleSchema['@graph'].some(node => node['@type'] === 'VacationRental'),
    ).toBe(false);
  });

  it('builds page-level schemas with BreadcrumbList and zero duplicate Organization/WebSite nodes across Homepage, About, Stays, Lagos, FAQs, Blog, and Informational pages', () => {
    const homeEmpty = buildHomepageSchema({ approvedStays: [] }) as {
      '@graph': Array<Record<string, unknown>>;
    };
    expect(homeEmpty['@graph'].map(n => n['@type'])).toEqual(['WebPage']);

    const homeWithStay = buildHomepageSchema({
      approvedStays: [SAMPLE_APPROVED_STAY],
    }) as { '@graph': Array<Record<string, unknown>> };
    expect(homeWithStay['@graph'].map(n => n['@type'])).toEqual(['WebPage', 'ItemList']);

    const about = buildAboutPageSchema() as { '@graph': Array<Record<string, unknown>> };
    expect(about['@graph'].map(n => n['@type'])).toEqual([
      'BreadcrumbList',
      'AboutPage',
    ]);

    const staysEmpty = buildPropertyListingPageSchema({ approvedStays: [] }) as {
      '@graph': Array<Record<string, unknown>>;
    };
    expect(staysEmpty['@graph'].map(n => n['@type'])).toEqual([
      'BreadcrumbList',
      'CollectionPage',
    ]);

    const lagos = buildLagosNeighbourhoodGuideSchema([
      {
        name: 'Yaba & Environs',
        body: 'Tech hubs and Mainland links.',
        href: '/stays?area=Yaba',
        img: '/images/prop/studio-1.jpg',
      },
    ]) as { '@graph': Array<Record<string, unknown>> };
    expect(lagos['@graph'].map(n => n['@type'])).toEqual([
      'BreadcrumbList',
      'CollectionPage',
    ]);
    expect(JSON.stringify(lagos)).not.toContain('/#/');

    const faqs = buildFaqPageSchema([
      { q: '1. Are the pictures on HAMLET real?', a: 'Verified during physical review.' },
    ]) as { '@graph': Array<Record<string, unknown>> };
    expect(faqs['@graph'].map(n => n['@type'])).toEqual(['BreadcrumbList', 'FAQPage']);

    const info = buildInformationalPageSchema({
      title: 'Guest Safety & Booking Protection',
      description: 'Four-pillar property verification.',
      pathname: '/safety',
      breadcrumbName: 'Guest Safety',
    }) as { '@graph': Array<Record<string, unknown>> };
    expect(info['@graph'].map(n => n['@type'])).toEqual(['BreadcrumbList', 'WebPage']);

    const blog = buildBlogArticleSchema({
      slug: 'lagos-shortlet-power-checklist',
      headline: 'What to Check About Power Backup Before Booking a Lagos Shortlet',
      description: 'Practical checklist for inverter, generator, and estate power.',
      datePublished: '2026-11-03',
      imageUrl: '/images/lagos-hero.jpg',
    }) as { '@graph': Array<Record<string, unknown>> };
    expect(blog['@graph'].map(n => n['@type'])).toEqual([
      'BreadcrumbList',
      'BlogPosting',
    ]);

    const breadcrumb = buildBreadcrumbListNode([
      { name: 'Home', path: '/' },
      { name: 'Explore Lagos Stays', path: '/stays' },
    ]);
    expect(breadcrumb['@type']).toBe('BreadcrumbList');

    // Verify no page-level schema redeclares Organization or WebSite
    for (const pageGraph of [
      homeEmpty,
      homeWithStay,
      about,
      staysEmpty,
      lagos,
      faqs,
      info,
      blog,
    ]) {
      for (const node of pageGraph['@graph']) {
        expect(node['@type']).not.toBe('Organization');
        expect(node['@type']).not.toBe('WebSite');
      }
    }
  });

  it('wires global JsonLd in app/layout.tsx and page-level JsonLd across all public App Router pages', () => {
    const rootLayout = readFileSync(join(ROOT, 'app', 'layout.tsx'), 'utf8');
    expect(rootLayout).toContain('buildGlobalStructuredDataGraph');
    expect(rootLayout).toContain('hamlet-global-jsonld');

    for (const routeFile of [
      'app/page.tsx',
      'app/about/page.tsx',
      'app/stays/page.tsx',
      'app/stays/[id]/page.tsx',
      'app/lagos/page.tsx',
      'app/how-it-works/page.tsx',
      'app/safety/page.tsx',
      'app/faqs/page.tsx',
      'app/legal/page.tsx',
      'app/partners/apply/page.tsx',
      'app/partners/apply/form/page.tsx',
    ]) {
      const content = readFileSync(join(ROOT, routeFile), 'utf8');
      expect(content, `${routeFile} should render <JsonLd`).toContain('JsonLd');
    }
  });

  it('resolves every cross-node @id reference when combined with the global graph and keeps discovery files canonical', () => {
    function collectIdsAndRefs(
      obj: unknown,
      declared = new Set<string>(),
      refs: string[] = [],
    ) {
      if (!obj || typeof obj !== 'object') return { declared, refs };
      if (Array.isArray(obj)) {
        for (const item of obj) collectIdsAndRefs(item, declared, refs);
        return { declared, refs };
      }
      const record = obj as Record<string, unknown>;
      const keys = Object.keys(record);
      if (typeof record['@id'] === 'string') {
        if (keys.length === 1) refs.push(record['@id']);
        else declared.add(record['@id']);
      }
      for (const val of Object.values(record)) collectIdsAndRefs(val, declared, refs);
      return { declared, refs };
    }

    const globalGraph = buildGlobalStructuredDataGraph();
    const pageSchemas = [
      buildHomepageSchema({ approvedStays: [SAMPLE_APPROVED_STAY] }),
      buildAboutPageSchema(),
      buildPropertyListingPageSchema({ approvedStays: [SAMPLE_APPROVED_STAY] }),
      buildLagosNeighbourhoodGuideSchema([
        {
          name: 'Victoria Island',
          body: 'Business district stays.',
          href: '/stays?area=Victoria+Island',
          img: '/images/prop/living-1.jpg',
        },
      ]),
      buildPropertyDetailSchema({ stay: SAMPLE_APPROVED_STAY }),
      buildFaqPageSchema([{ q: 'How do bookings work?', a: 'Confirmed before payment.' }]),
      buildInformationalPageSchema({
        title: 'Terms & Privacy',
        description: 'NDPR and marketplace terms.',
        pathname: '/legal',
        breadcrumbName: 'Terms & Privacy',
      }),
      buildBlogArticleSchema({
        slug: 'verified-lagos-stays',
        headline: 'Verified Shortlets in Lagos',
        description: 'How physical verification protects guests.',
        datePublished: '2026-11-03',
      }),
    ];

    for (const pageSchema of pageSchemas) {
      expect(pageSchema).not.toBeNull();
      const { declared, refs } = collectIdsAndRefs([globalGraph, pageSchema]);
      expect(refs.length).toBeGreaterThan(0);
      for (const ref of refs) {
        expect(declared.has(ref), `Unresolved @id reference: ${ref}`).toBe(true);
      }
    }

    for (const publicFile of [
      'public/robots.txt',
      'public/sitemap.xml',
      'public/llms.txt',
      'public/llms-full.txt',
    ]) {
      const content = readFileSync(join(ROOT, publicFile), 'utf8');
      expect(content).toContain('https://hamlet.rest');
      expect(content).not.toContain('www.hamlet.rest');
      expect(content).not.toContain('/#/');
    }
  });
});
