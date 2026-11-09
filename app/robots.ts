import type { MetadataRoute } from 'next';
import { HAMLET_CANONICAL_ORIGIN } from '@/lib/structured-data';

const PUBLIC_DISCOVERY_ALLOW: string[] = [
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
  '/api/og/',
  '/llms.txt',
  '/llms-full.txt',
];

const PRIVATE_WORKSPACE_DISALLOW: string[] = [
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
  '/partners/analytics',
  '/partners/marketing',
  '/signin',
  '/auth/',
  '/api/',
  '/legacy',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [...PUBLIC_DISCOVERY_ALLOW],
        disallow: [...PRIVATE_WORKSPACE_DISALLOW],
      },
      // Configured independently from GPTBot: OAI-SearchBot governs search link surfacing, not model training.
      {
        userAgent: 'OAI-SearchBot',
        allow: [...PUBLIC_DISCOVERY_ALLOW],
        disallow: [...PRIVATE_WORKSPACE_DISALLOW],
      },
      // User-triggered & answer-engine retrieval crawlers
      {
        userAgent: [
          'ChatGPT-User',
          'PerplexityBot',
          'Claude-SearchBot',
          'Claude-Web',
          'Applebot-Extended',
        ],
        allow: [...PUBLIC_DISCOVERY_ALLOW],
        disallow: [...PRIVATE_WORKSPACE_DISALLOW],
      },
      // Foundation-model training crawlers (decoupled from OAI-SearchBot and answer-engine bots)
      {
        userAgent: ['GPTBot', 'ClaudeBot', 'Google-Extended', 'CCBot'],
        allow: [...PUBLIC_DISCOVERY_ALLOW],
        disallow: [...PRIVATE_WORKSPACE_DISALLOW],
      },
    ],
    sitemap: `${HAMLET_CANONICAL_ORIGIN}/sitemap.xml`,
    host: HAMLET_CANONICAL_ORIGIN,
  };
}
