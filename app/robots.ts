import type { MetadataRoute } from 'next';
import { HAMLET_CANONICAL_ORIGIN } from '@/lib/structured-data';

export default function robots(): MetadataRoute.Robots {
  const publicRoutes = [
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
  ];

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/api/og/'],
        disallow: [
          '/account',
          '/account/',
          '/admin',
          '/admin/',
          '/partners/analytics',
          '/partners/bookings',
          '/partners/availability',
          '/partners/marketing',
          '/partners/properties',
          '/partners/earnings',
          '/partners/profile',
          '/partners/start',
          '/signin',
          '/auth/',
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
        allow: [...publicRoutes, '/api/og/'],
        disallow: [
          '/account',
          '/admin',
          '/partners/analytics',
          '/partners/bookings',
          '/partners/availability',
          '/partners/marketing',
          '/partners/properties',
          '/partners/earnings',
          '/partners/profile',
          '/partners/start',
          '/signin',
          '/auth/',
          '/api/',
          '/legacy',
        ],
      },
    ],
    sitemap: `${HAMLET_CANONICAL_ORIGIN}/sitemap.xml`,
    host: HAMLET_CANONICAL_ORIGIN,
  };
}
