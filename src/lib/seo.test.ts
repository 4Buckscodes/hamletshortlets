import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderLlmFull, renderLlmMain } from './llm-discovery';
import {
  buildCanonicalUrl,
  buildFaqStructuredData,
  buildLagosGuideStructuredData,
  buildPropertyStructuredData,
  HAMLET_DEFAULT_OG_IMAGE,
  HAMLET_LLMS_FULL_TXT_URL,
  HAMLET_LLMS_TXT_URL,
  HAMLET_SITE_URL,
  isNoIndexPath,
  normalizeSeoPathname,
  resolveAbsoluteSeoUrl,
} from './seo';

const ROOT = resolve(process.cwd());
const EXCLUDED_CITIES_RE = new RegExp('\\babu' + 'ja\\b|\\biba' + 'dan\\b', 'i');

describe('LLMs.txt & LLMs-full.txt specification and accuracy', () => {
  it('provides a spec-compliant public/llms.txt with H1, summary blockquote, canonical links, and Optional section', () => {
    const routePath = join(ROOT, 'app', 'llms.txt', 'route.ts');
    expect(existsSync(routePath)).toBe(true);
    const content = renderLlmMain();
    const lines = content.trim().split('\n');

    // llmstxt.org spec: H1 on first line, followed by > blockquote summary and ## H2 link sections
    expect(lines[0]).toBe('# HAMLET');
    expect(content).toMatch(/^# HAMLET\n\n> /);
    expect(content).toContain('## Marketplace & Guest Guides');
    expect(content).toContain('## Partner Network');
    expect(content).toContain('## Legal, Trust & Pricing Policies');
    expect(content).toContain('## Optional');
    expect(content).toContain(HAMLET_LLMS_FULL_TXT_URL);
    expect(content).toContain('llms-stays.txt');

    // Commercial & Lagos-only scope accuracy
    expect(content).toContain('https://hamlet.rest');
    expect(content).toContain('Abundance Abodes');
    expect(content).toContain('Lagos Mainland');
    expect(content).toContain('Lagos Island');
    expect(content).not.toContain('0% owner fee');
    expect(content).toContain("HAMLET's current pricing and service policies");
    expect(content).toContain('A booking request is not a confirmed reservation');
    expect(content).not.toMatch(/\b\d+(?:\.\d+)?%/);
    expect(content).not.toMatch(EXCLUDED_CITIES_RE);
  });

  it('provides a comprehensive public/llms-full.txt without disclosing internal commercial allocations', () => {
    const routePath = join(ROOT, 'app', 'llms-full.txt', 'route.ts');
    expect(existsSync(routePath)).toBe(true);
    const content = renderLlmFull();

    expect(content.startsWith('# HAMLET')).toBe(true);
    expect(content).toContain(HAMLET_LLMS_TXT_URL);
    expect(content).toContain('llms-stays.txt');
    expect(content).toContain('HAMLET provides property owners with access to listing, visibility, booking and property management services.');
    expect(content).toContain('Four Verification Pillars');
    expect(content).not.toMatch(/\b\d+(?:\.\d+)?%/);
    expect(content).not.toMatch(/payment.{0,20}reserve/i);
    expect(content).not.toMatch(/owner-only rates/i);
    expect(content).not.toMatch(EXCLUDED_CITIES_RE);
  });
});

describe('Static crawler files (robots.txt, sitemap.xml, site.webmanifest) & vercel.json routing', () => {
  it('configures robots.txt for search engines and major AI crawlers with Sitemap and llms.txt discovery', () => {
    const robotsSource = readFileSync(join(ROOT, 'app', 'robots.ts'), 'utf8');
    expect(robotsSource).toContain("userAgent: '*'");
    expect(robotsSource).toContain("'/api/og/'");
    expect(robotsSource).toContain("'/llms-stays.txt'");
    expect(robotsSource).toContain("'/llms.md'");
    expect(robotsSource).toContain("'/llms-full.md'");
    for (const bot of [
      'OAI-SearchBot',
      'Claude-SearchBot',
      'ChatGPT-User',
      'ClaudeBot',
      'PerplexityBot',
      'Google-Extended',
      'Applebot-Extended',
      'GPTBot',
      'CCBot',
    ]) {
      expect(robotsSource).toContain(`'${bot}'`);
    }
    expect(robotsSource).toContain('sitemap:');
    expect(robotsSource).toContain('HAMLET_CANONICAL_ORIGIN');
    expect(robotsSource).not.toMatch(EXCLUDED_CITIES_RE);
  });

  it('provides a valid XML sitemap and Web App Manifest without excluded city references', () => {
    const sitemap = readFileSync(join(ROOT, 'app', 'sitemap.ts'), 'utf8');
    expect(sitemap).toContain('export const revalidate = 900');
    expect(sitemap).toContain("from('public_properties')");
    expect(sitemap).toContain(".eq('status', 'approved')");
    expect(sitemap).toContain('HAMLET_CANONICAL_ORIGIN');
    expect(sitemap).toContain('/llms-stays.txt');
    expect(sitemap).toContain('/llms.md');
    expect(sitemap).toContain('/llms-full.md');
    expect(sitemap).not.toMatch(EXCLUDED_CITIES_RE);
    expect(existsSync(join(ROOT, 'public', 'sitemap.xml'))).toBe(false);
    expect(existsSync(join(ROOT, 'public', 'robots.txt'))).toBe(false);
    expect(existsSync(join(ROOT, 'public', 'llms.txt'))).toBe(false);
    expect(existsSync(join(ROOT, 'public', 'llms-full.txt'))).toBe(false);

    const manifestRaw = readFileSync(join(ROOT, 'public', 'site.webmanifest'), 'utf8');
    expect(manifestRaw).not.toMatch(EXCLUDED_CITIES_RE);
    const manifest = JSON.parse(manifestRaw) as {
      name: string;
      short_name: string;
      lang: string;
      icons: Array<{ src: string }>;
    };
    expect(manifest.short_name).toBe('HAMLET');
    expect(manifest.lang).toBe('en-NG');
    expect(manifest.icons.some(icon => icon.src === '/favicon.svg')).toBe(true);
  });

  it('uses Next.js routing without the legacy Vite SPA rewrite and serves UTF-8 Content-Type headers', () => {
    const vercelConfig = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8')) as {
      headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
      rewrites?: Array<{ source: string; destination: string }>;
    };

    expect(vercelConfig.rewrites).toBeUndefined();
    expect(vercelConfig.headers.some(rule => /llms|robots|sitemap/i.test(rule.source))).toBe(false);
    for (const routeFile of [
      'app/llms.txt/route.ts',
      'app/llms-full.txt/route.ts',
      'app/llms-stays.txt/route.ts',
      'app/llms.md/route.ts',
      'app/llms-full.md/route.ts',
    ]) {
      const routeSource = readFileSync(join(ROOT, routeFile), 'utf8');
      expect(routeSource).toContain('export const revalidate = 900');
      expect(routeSource).toContain('s-maxage=900');
    }
  });
});

describe('index.html head tags & Schema.org structured data', () => {
  it('includes canonical, llms.txt alternates, raster Open Graph / Twitter Card tags, geo tags, and valid base JSON-LD', () => {
    const html = readFileSync(join(ROOT, 'index.html'), 'utf8');

    expect(html).toContain('<link rel="canonical" href="https://hamlet.rest/" />');
    expect(html).toContain('href="/llms.txt"');
    expect(html).toContain('href="/llms-full.txt"');
    expect(html).toContain('href="/site.webmanifest"');
    expect(html).toContain(`content="${HAMLET_DEFAULT_OG_IMAGE}"`);
    expect(html).toContain('property="og:image:width" content="867"');
    expect(html).toContain('property="og:image:height" content="650"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain('name="geo.region" content="NG-LA"');
    expect(existsSync(join(ROOT, 'public', 'images', 'lagos-hero.jpg'))).toBe(true);

    const jsonLdMatch = html.match(
      /<script id="hamlet-base-jsonld" type="application\/ld\+json">([\s\S]*?)<\/script>/,
    );
    expect(jsonLdMatch).not.toBeNull();
    const parsed = JSON.parse(jsonLdMatch![1]!) as {
      '@context': string;
      '@graph': Array<{ '@type': string }>;
    };
    expect(parsed['@context']).toBe('https://schema.org');
    const types = parsed['@graph'].map(node => node['@type']);
    expect(types).toContain('Organization');
    expect(types).toContain('WebSite');
    expect(types).toContain('Service');
  });

  it('builds canonical URLs, noindex rules, and route-level JSON-LD schemas accurately', () => {
    expect(normalizeSeoPathname('#/stays?area=Yaba&agent=HML-123')).toBe('/stays');
    expect(buildCanonicalUrl('/')).toBe(`${HAMLET_SITE_URL}/`);
    expect(buildCanonicalUrl('/lagos?utm_source=x')).toBe(`${HAMLET_SITE_URL}/lagos`);
    expect(buildCanonicalUrl('#/lagos?utm_source=x')).toBe(`${HAMLET_SITE_URL}/lagos`);
    expect(resolveAbsoluteSeoUrl('/images/lagos-hero.jpg')).toBe(HAMLET_DEFAULT_OG_IMAGE);

    // Public pages are indexable; auth, guest account, partner workspace, and admin console are noindex
    expect(isNoIndexPath('/')).toBe(false);
    expect(isNoIndexPath('/stays')).toBe(false);
    expect(isNoIndexPath('/stays/prop-1')).toBe(false);
    expect(isNoIndexPath('/lagos')).toBe(false);
    expect(isNoIndexPath('/faqs')).toBe(false);
    expect(isNoIndexPath('/legal/pricing')).toBe(false);
    expect(isNoIndexPath('/partner/register')).toBe(false);

    expect(isNoIndexPath('/signin')).toBe(true);
    expect(isNoIndexPath('/account')).toBe(true);
    expect(isNoIndexPath('/partner')).toBe(true);
    expect(isNoIndexPath('/partner/listings')).toBe(true);
    expect(isNoIndexPath('/admin')).toBe(true);
    expect(isNoIndexPath('/admin/bookings')).toBe(true);

    const faqSchema = buildFaqStructuredData([
      { q: '1. Are the pictures on HAMLET real?', a: 'Yes, verified during review.' },
    ]) as { '@type': string; mainEntity: Array<{ name: string }> };
    expect(faqSchema['@type']).toBe('FAQPage');
    expect(faqSchema.mainEntity[0]?.name).toBe('Are the pictures on HAMLET real?');

    const propSchema = buildPropertyStructuredData(
      {
        id: 'prop-ikoyi-1',
        title: 'Bourbon Residence',
        type: 'Apartment',
        area: 'Ikoyi',
        address: ' Bourdillon Axis, Ikoyi',
        bedrooms: 2,
        bathrooms: 2,
        capacity: 4,
        amenities: ['Wifi', '24/7 Power'],
        images: ['/images/lagos-hero.jpg'],
      },
      240_000,
    ) as { '@graph': Array<{ '@type': string }> };
    expect(propSchema['@graph'].map(item => item['@type'])).toEqual([
      'BreadcrumbList',
      'VacationRental',
    ]);

    const lagosSchema = buildLagosGuideStructuredData([
      { name: 'Yaba & Environs', body: 'Tech & campus stays.', href: '/stays?area=Yaba' },
    ]) as { '@type': string };
    expect(lagosSchema['@type']).toBe('CollectionPage');
  });
});
