import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/llms.txt', '/llms-full.txt'],
        disallow: [
          '/account',
          '/account/',
          '/admin',
          '/admin/',
          '/partners',
          '/partners/bookings',
          '/partners/availability',
          '/partners/properties',
          '/partners/earnings',
          '/partners/profile',
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
          'PerplexityBot',
          'Google-Extended',
          'Applebot-Extended',
        ],
        allow: ['/', '/stays', '/lagos', '/how-it-works', '/safety', '/about', '/faqs', '/legal', '/partners/apply', '/llms.txt', '/llms-full.txt'],
        disallow: ['/account', '/admin', '/signin', '/api/', '/legacy'],
      },
    ],
    sitemap: 'https://www.hamlet.rest/sitemap.xml',
    host: 'https://www.hamlet.rest',
  };
}
