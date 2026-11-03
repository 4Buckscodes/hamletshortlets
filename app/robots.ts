import type { MetadataRoute } from 'next';
import { HAMLET_CANONICAL_ORIGIN } from '@/lib/structured-data';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/partners/apply',
          '/partners/apply/form',
          '/llms.txt',
          '/llms-full.txt',
        ],
        disallow: [
          '/account',
          '/account/',
          '/admin',
          '/admin/',
          '/partners/bookings',
          '/partners/availability',
          '/partners/properties',
          '/partners/earnings',
          '/partners/profile',
          '/partners/start',
          '/signin',
          '/api/',
          '/legacy',
        ],
      },
      {
        userAgent: [
          'GPTBot',
          'OAI-SearchBot',
          'ChatGPT-User',
          'ClaudeBot',
          'Claude-Web',
          'PerplexityBot',
          'Google-Extended',
          'Applebot-Extended',
          'CCBot',
        ],
        allow: [
          '/',
          '/stays',
          '/lagos',
          '/how-it-works',
          '/safety',
          '/about',
          '/faqs',
          '/legal',
          '/partners/apply',
          '/partners/apply/form',
          '/llms.txt',
          '/llms-full.txt',
        ],
        disallow: ['/account', '/admin', '/signin', '/api/', '/legacy'],
      },
    ],
    sitemap: `${HAMLET_CANONICAL_ORIGIN}/sitemap.xml`,
    host: HAMLET_CANONICAL_ORIGIN,
  };
}
