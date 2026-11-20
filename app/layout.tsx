import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import './globals.css';
import '@/components/ui/hamlet-ui.css';
import '@/components/ui/home.css';
import { JsonLd } from '@/components/seo/JsonLd';
import { SiteProviders } from '@/components/site/SiteShell';
import ReferralAttributionCapture from '@/components/site/ReferralAttributionCapture';
import { MotionProvider } from '@/components/ui/motion';
import { GlobalMotion } from '@/components/site/GlobalMotion';
import { ThemeScript } from '@/components/ui/ThemeScript';
import {
  buildGlobalStructuredDataGraph,
  HAMLET_BRAND,
  HAMLET_CANONICAL_ORIGIN,
} from '@/lib/structured-data';

export const metadata: Metadata = {
  metadataBase: new URL(HAMLET_CANONICAL_ORIGIN),
  title: {
    default: 'HAMLET.REST — Your stay, sorted.',
    template: '%s | HAMLET.REST',
  },
  description:
    'Find your next shortlet in Lagos across Victoria Island, Ikoyi, Lekki, Yaba, Shomolu, Surulere and Ikeja GRA. Transparent pricing and verified booking steps.',
  applicationName: HAMLET_BRAND,
  manifest: '/site.webmanifest',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  alternates: {
    types: {
      'text/plain': '/llms.txt',
    },
  },
  openGraph: {
    type: 'website',
    siteName: HAMLET_BRAND,
    locale: 'en_NG',
    title: 'HAMLET.REST — Your stay, sorted.',
    description:
      'Shortlets, with accountability. Verified apartments across Lagos Island and Lagos Mainland.',
    images: [
      {
        url: '/api/og/default',
        width: 1200,
        height: 630,
        alt: 'HAMLET — Your stay, sorted. Shortlets, with accountability.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HAMLET.REST — Your stay, sorted.',
    description: 'Shortlets, with accountability. Verified stays across Lagos.',
    images: ['/api/og/default'],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#f4f3ef',
  width: 'device-width',
  initialScale: 1,
};

const GLOBAL_STRUCTURED_DATA = buildGlobalStructuredDataGraph();

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-NG" data-hm-dark="on" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <link rel="preload" href="/fonts/hanken-grotesk-latin-wght.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/newsreader-latin-wght.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <JsonLd id="hamlet-global-jsonld" data={GLOBAL_STRUCTURED_DATA} />
      </head>
      <body>
        <SiteProviders>
          <Suspense fallback={null}>
            <ReferralAttributionCapture />
          </Suspense>
          <GlobalMotion />
          <MotionProvider>{children}</MotionProvider>
        </SiteProviders>
      </body>
    </html>
  );
}
