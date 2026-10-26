import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/inter';
import '@fontsource-variable/playfair-display';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.hamlet.rest'),
  title: {
    default: 'HAMLET.REST — Your stay, sorted.',
    template: '%s | HAMLET.REST',
  },
  description:
    'Find your next shortlet in Lagos. Explore stays, compare the details and request your booking with confidence.',
  applicationName: 'HAMLET.REST',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'HAMLET.REST',
    locale: 'en_NG',
    title: 'HAMLET.REST — Your stay, sorted.',
    description: 'Find your next shortlet in Lagos.',
    url: 'https://www.hamlet.rest/',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#0E1F3B',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-NG">
      <body>{children}</body>
    </html>
  );
}
