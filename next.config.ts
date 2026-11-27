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

const markdownAccept = [
  { type: 'header' as const, key: 'accept', value: '(.*)text/markdown(.*)' },
];

function markdownRewrite(source: string, destination: string) {
  return { source, destination, has: markdownAccept };
}

const markdownVaryHeaders = [
  '/',
  '/stays',
  '/stays/:id',
  '/lagos',
  '/how-it-works',
  '/safety',
  '/about',
  '/faqs',
  '/legal',
  '/partners/apply',
].map(source => ({
  source,
  headers: [
    { key: 'Vary', value: 'Accept' },
    { key: 'Content-Signal', value: 'ai-train=no, search=yes, ai-input=yes' },
  ],
}));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['sharp'],
  outputFileTracingIncludes: {
    '/api/og/default': SHARE_ARTWORK_TRACED_ASSETS,
    '/api/og/property/[id]': SHARE_ARTWORK_TRACED_ASSETS,
    '/api/partner/share/card': SHARE_ARTWORK_TRACED_ASSETS,
    '/api/share/qr': SHARE_ARTWORK_TRACED_ASSETS,
  },
  async rewrites() {
    return {
      beforeFiles: [
        markdownRewrite('/', '/md'),
        markdownRewrite('/stays', '/md/stays'),
        markdownRewrite('/stays/:id', '/md/stays/:id'),
        markdownRewrite('/lagos', '/md/lagos'),
        markdownRewrite('/how-it-works', '/md/how-it-works'),
        markdownRewrite('/safety', '/md/safety'),
        markdownRewrite('/about', '/md/about'),
        markdownRewrite('/faqs', '/md/faqs'),
        markdownRewrite('/legal', '/md/legal'),
        markdownRewrite('/partners/apply', '/md/partners/apply'),
      ],
    };
  },
  async headers() {
    return [
      {
        // Keep *.vercel.app mirrors out of search results so hamlet.rest stays the canonical site.
        source: '/:path*',
        has: [{ type: 'host', value: '.*\\.vercel\\.app$' }],
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      ...markdownVaryHeaders,
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
