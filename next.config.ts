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
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
          { key: 'X-XSS-Protection', value: '0' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(self)' },
        ],
      },
    ];
  },
  serverExternalPackages: ['sharp'],
  outputFileTracingIncludes: {
    '/api/og/default': SHARE_ARTWORK_TRACED_ASSETS,
    '/api/og/property/[id]': SHARE_ARTWORK_TRACED_ASSETS,
    '/api/partner/share/card': SHARE_ARTWORK_TRACED_ASSETS,
    '/api/share/qr': SHARE_ARTWORK_TRACED_ASSETS,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};

export default nextConfig;
