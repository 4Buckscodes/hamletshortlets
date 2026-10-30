import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import '@fontsource-variable/inter';
import '@fontsource-variable/playfair-display';
import './globals.css';
import { SiteProviders } from '@/components/site/SiteShell';
import ReferralAttributionCapture from '@/components/site/ReferralAttributionCapture';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.hamlet.rest'),
  title: {
    default: 'HAMLET.REST — Your stay, sorted.',
    template: '%s | HAMLET.REST',
  },
  description:
    'Find your next shortlet in Lagos across Victoria Island, Ikoyi, Lekki, Yaba, Shomolu, Surulere and Ikeja GRA. Transparent pricing and verified booking steps.',
  applicationName: 'HAMLET.REST',
  manifest: '/site.webmanifest',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  alternates: {
    canonical: '/',
    types: {
      'text/plain': '/llms.txt',
    },
  },
  openGraph: {
    type: 'website',
    siteName: 'HAMLET.REST',
    locale: 'en_NG',
    title: 'HAMLET.REST — Your stay, sorted.',
    description:
      'Find your next shortlet in Lagos across Island and Mainland neighbourhoods with transparent pricing and partner-confirmed bookings.',
    url: 'https://www.hamlet.rest/',
    images: [
      {
        url: '/images/lagos-hero.jpg',
        width: 867,
        height: 650,
        alt: 'HAMLET.REST — Shortlet stays in Lagos',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HAMLET.REST — Your stay, sorted.',
    description: 'Find your next shortlet in Lagos. Transparent pricing and accountable stays.',
    images: ['/images/lagos-hero.jpg'],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#0E1F3B',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-NG">
      <body>
        <SiteProviders>
          <Suspense fallback={null}>
            <ReferralAttributionCapture />
          </Suspense>
          {children}
        </SiteProviders>
      </body>
    </html>
  );
}
