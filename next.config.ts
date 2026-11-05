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
  async rewrites() {
    return [{ source: '/properties/:slug', destination: '/stays/:slug' }];
  },
  reactStrictMode: true,
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
