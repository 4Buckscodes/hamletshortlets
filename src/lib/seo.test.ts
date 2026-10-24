import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
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
    const llmsPath = join(ROOT, 'public', 'llms.txt');
    expect(existsSync(llmsPath)).toBe(true);
    const content = readFileSync(llmsPath, 'utf8');
    const lines = content.trim().split('\n');

    // llmstxt.org spec: H1 on first line, followed by > blockquote summary and ## H2 link sections
    expect(lines[0]).toBe('# HAMLET');
    expect(content).toMatch(/^# HAMLET\n\n> /);
    expect(content).toContain('## Marketplace & Guest Guides');
    expect(content).toContain('## Partner Network');
    expect(content).toContain('## Legal, Trust & Pricing Policies');
    expect(content).toContain('## Optional');
    expect(content).toContain(HAMLET_LLMS_FULL_TXT_URL);

    // Commercial & Lagos-only scope accuracy
    expect(content).toContain('https://www.hamlet.rest');
    expect(content).toContain('Lagos Mainland');
    expect(content).toContain('Lagos Island');
    expect(content).toContain('0% owner fee');
    expect(content).toContain('20%');
    expect(content).toContain('10% international currency buffer');
    expect(content).toContain('Paystack');
    expect(content).not.toMatch(EXCLUDED_CITIES_RE);
  });

  it('provides a comprehensive public/llms-full.txt covering verification, booking lifecycle, FX, referrals, and FAQs', () => {
    const llmsFullPath = join(ROOT, 'public', 'llms-full.txt');
    expect(existsSync(llmsFullPath)).toBe(true);
    const content = readFileSync(llmsFullPath, 'utf8');

    expect(content.startsWith('# HAMLET')).toBe(true);
    expect(content).toContain(HAMLET_LLMS_TXT_URL);
    expect(content).toContain('Four Verification Pillars');
    expect(content).toContain('90-day');
    expect(content).toContain('2.5%');
    expect(content).toContain('12. **What if I need help during my stay?**');
    expect(content).not.toMatch(EXCLUDED_CITIES_RE);
  });
});

describe('Static crawler files (robots.txt, sitemap.xml, site.webmanifest) & vercel.json routing', () => {
  it('configures robots.txt for search engines and major AI crawlers with Sitemap and llms.txt discovery', () => {
    const robots = readFileSync(join(ROOT, 'public', 'robots.txt'), 'utf8');
    expect(robots).toContain('User-agent: *');
    expect(robots).toContain('Allow: /llms.txt');
    expect(robots).toContain('Allow: /llms-full.txt');
    for (const bot of [
      'GPTBot',
      'OAI-SearchBot',
      'ChatGPT-User',
      'ClaudeBot',
      'PerplexityBot',
      'Google-Extended',
      'Applebot-Extended',
    ]) {
      expect(robots).toContain(`User-agent: ${bot}`);
    }
    expect(robots).toContain('Sitemap: https://www.hamlet.rest/sitemap.xml');
    expect(robots).not.toMatch(EXCLUDED_CITIES_RE);
  });

  it('provides a valid XML sitemap and Web App Manifest without excluded city references', () => {
    const sitemap = readFileSync(join(ROOT, 'public', 'sitemap.xml'), 'utf8');
    expect(sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(sitemap).toContain('<loc>https://www.hamlet.rest/</loc>');
    expect(sitemap).toContain('<loc>https://www.hamlet.rest/llms.txt</loc>');
    expect(sitemap).toContain('<loc>https://www.hamlet.rest/llms-full.txt</loc>');
    expect(sitemap).not.toMatch(EXCLUDED_CITIES_RE);

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

  it('excludes SEO and LLM static files from Vercel SPA index.html rewrite and serves UTF-8 Content-Type headers', () => {
    const vercelConfig = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8')) as {
      headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
      rewrites: Array<{ source: string; destination: string }>;
    };

    expect(vercelConfig.rewrites).toHaveLength(1);
    const rewriteRegex = new RegExp(`^${vercelConfig.rewrites[0]!.source}$`);

    // Static SEO / LLM / asset paths MUST NOT be rewritten to /index.html
    for (const staticPath of [
      '/llms.txt',
      '/llms-full.txt',
      '/robots.txt',
      '/sitemap.xml',
      '/site.webmanifest',
      '/favicon.svg',
      '/images/lagos-hero.jpg',
      '/assets/index-B12345.js',
    ]) {
      expect(rewriteRegex.test(staticPath)).toBe(false);
    }

    // Client-side routes MUST still rewrite to /index.html
    for (const appRoute of ['/', '/stays', '/lagos', '/partner/register']) {
      expect(rewriteRegex.test(appRoute)).toBe(true);
    }

    expect(vercelConfig.headers.length).toBeGreaterThanOrEqual(3);
  });
});

describe('index.html head tags & Schema.org structured data', () => {
  it('includes canonical, llms.txt alternates, raster Open Graph / Twitter Card tags, geo tags, and valid base JSON-LD', () => {
    const html = readFileSync(join(ROOT, 'index.html'), 'utf8');

    expect(html).toContain('<link rel="canonical" href="https://www.hamlet.rest/" />');
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
    expect(buildCanonicalUrl('#/lagos?utm_source=x')).toBe(`${HAMLET_SITE_URL}/#/lagos`);
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
      'LodgingBusiness',
    ]);

    const lagosSchema = buildLagosGuideStructuredData([
      { name: 'Yaba & Environs', body: 'Tech & campus stays.', href: '/stays?area=Yaba' },
    ]) as { '@type': string };
    expect(lagosSchema['@type']).toBe('CollectionPage');
  });
});
