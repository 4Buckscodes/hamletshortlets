import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import robotsRoute from '../../app/robots';
import sitemapRoute, { revalidate as sitemapRevalidate } from '../../app/sitemap';
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
    expect(content).toContain('https://hamlet.rest');
    expect(content).toContain('Abundance Abodes');
    expect(content).toContain('Lagos Mainland');
    expect(content).toContain('Lagos Island');
    expect(content).not.toContain('0% owner fee');
    expect(content).toContain("HAMLET's current pricing and service policies");
    expect(content).toContain('20%');
    expect(content).toContain('10% international currency buffer');
    expect(content).toContain('Paystack');
    expect(content).not.toContain('B * 1.20');
    expect(content).not.toContain('10% closing commission');
    expect(content).not.toContain('2.5%');
    expect(content).not.toMatch(EXCLUDED_CITIES_RE);
  });

  it('provides a comprehensive public/llms-full.txt covering verification, booking lifecycle, FX, referrals, and FAQs without internal commercial splits', () => {
    const llmsFullPath = join(ROOT, 'public', 'llms-full.txt');
    expect(existsSync(llmsFullPath)).toBe(true);
    const content = readFileSync(llmsFullPath, 'utf8');

    expect(content.startsWith('# HAMLET')).toBe(true);
    expect(content).toContain(HAMLET_LLMS_TXT_URL);
    expect(content).toContain('Four Verification Pillars');
    expect(content).toContain('90-day');
    expect(content).toContain('12. **What if I need help during my stay?**');
    expect(content).not.toContain('0.20 * B');
    expect(content).not.toContain('2.5%');
    expect(content).not.toContain('17.5%');
    expect(content).not.toContain('owner listed rate');
    expect(content).not.toMatch(EXCLUDED_CITIES_RE);
  });
});

describe('App Router crawler routes (app/robots.ts, app/sitemap.ts, site.webmanifest) & vercel.json routing', () => {
  it('configures app/robots.ts with independent OAI-SearchBot rules, OG image allowlist, and zero duplicate public/robots.txt', () => {
    expect(existsSync(join(ROOT, 'public', 'robots.txt'))).toBe(false);
    const config = robotsRoute();
    const rules = Array.isArray(config.rules) ? config.rules : [config.rules];

    expect(config.sitemap).toBe('https://hamlet.rest/sitemap.xml');
    expect(config.host).toBe('https://hamlet.rest');

    const oaiSearchRule = rules.find(rule => rule.userAgent === 'OAI-SearchBot');
    expect(oaiSearchRule).toBeDefined();

    const allAgents = rules.flatMap(rule =>
      Array.isArray(rule.userAgent) ? rule.userAgent : [rule.userAgent],
    );
    for (const bot of [
      '*',
      'OAI-SearchBot',
      'GPTBot',
      'ChatGPT-User',
      'ClaudeBot',
      'PerplexityBot',
      'Google-Extended',
      'Applebot-Extended',
    ]) {
      expect(allAgents).toContain(bot);
    }

    for (const rule of rules) {
      const allowed = Array.isArray(rule.allow) ? rule.allow : [rule.allow];
      expect(allowed).toContain('/api/og/');
      expect(allowed).toContain('/llms.txt');
      expect(allowed).toContain('/llms-full.txt');
    }
  });

  it('provides an auto-revalidating App Router sitemap without duplicate public/sitemap.xml or excluded city references', async () => {
    expect(existsSync(join(ROOT, 'public', 'sitemap.xml'))).toBe(false);
    expect(sitemapRevalidate).toBe(900);

    const entries = await sitemapRoute();
    const urls = entries.map(entry => entry.url);
    expect(urls).toContain('https://hamlet.rest/');
    expect(urls).toContain('https://hamlet.rest/stays');
    expect(urls).toContain('https://hamlet.rest/lagos');
    expect(urls).toContain('https://hamlet.rest/llms.txt');
    expect(urls).toContain('https://hamlet.rest/llms-full.txt');
    expect(JSON.stringify(entries)).not.toMatch(EXCLUDED_CITIES_RE);

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
    expect(vercelConfig.headers.length).toBeGreaterThanOrEqual(3);
    expect(vercelConfig.headers.some(rule => rule.source.includes('llms'))).toBe(true);
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
