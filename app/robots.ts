import type { MetadataRoute } from 'next';
import { HAMLET_CANONICAL_ORIGIN } from '@/lib/structured-data';

const PRIVATE_ROUTES = [
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
];

const AI_DISCOVERY_BOTS = [
  'OAI-SearchBot',
  'ChatGPT-User',
  'Claude-SearchBot',
  'ClaudeBot',
  'PerplexityBot',
  'Google-Extended',
  'Applebot-Extended',
  'Meta-ExternalAgent',
  'DuckAssistBot',
];

const PUBLIC_AI_ROUTES = [
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
  '/llms-stays.txt',
  '/api/og/',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/api/og/'],
        disallow: PRIVATE_ROUTES,
      },
      {
        userAgent: AI_DISCOVERY_BOTS,
        allow: PUBLIC_AI_ROUTES,
        disallow: PRIVATE_ROUTES,
      },
    ],
    sitemap: `${HAMLET_CANONICAL_ORIGIN}/sitemap.xml`,
    host: HAMLET_CANONICAL_ORIGIN,
  };
}
