import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/account/', '/admin/', '/partners/bookings', '/partners/availability', '/signin', '/api/', '/legacy'] },
    ],
    sitemap: 'https://www.hamlet.rest/sitemap.xml',
    host: 'https://www.hamlet.rest',
  };
}
