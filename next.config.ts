import type { NextConfig } from 'next';

const SHARE_ARTWORK_TRACED_ASSETS = [
  './node_modules/@fontsource/inter/files/inter-latin-400-normal.woff',
  './node_modules/@fontsource/inter/files/inter-latin-ext-400-normal.woff',
  './node_modules/@fontsource/inter/files/inter-latin-600-normal.woff',
  './node_modules/@fontsource/inter/files/inter-latin-ext-600-normal.woff',
  './node_modules/@fontsource/inter/files/inter-latin-700-normal.woff',
  './node_modules/@fontsource/inter/files/inter-latin-ext-700-normal.woff',
  './node_modules/@fontsource/playfair-display/files/playfair-display-latin-500-normal.woff',
  './node_modules/@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff',
  './public/images/lagos-hero.jpg',
  './public/images/prop/living-1.jpg',
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['sharp'],
  outputFileTracingIncludes: {
    '/api/og/default': SHARE_ARTWORK_TRACED_ASSETS,
    '/api/og/property/[id]': SHARE_ARTWORK_TRACED_ASSETS,
    '/api/partner/share/card': SHARE_ARTWORK_TRACED_ASSETS,
    '/api/share/qr': SHARE_ARTWORK_TRACED_ASSETS,
  },
  async redirects() {
    return [
      { source: '/terms', destination: '/legal#terms', permanent: true },
      { source: '/privacy', destination: '/legal#privacy', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        // Keep *.vercel.app mirrors out of search results so hamlet.rest stays the canonical site.
        source: '/:path*',
        has: [{ type: 'host', value: '.*\\.vercel\\.app$' }],
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};

export default nextConfig;
