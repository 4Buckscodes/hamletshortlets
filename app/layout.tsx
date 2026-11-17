import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/inter';
import '@fontsource-variable/playfair-display';
import './globals.css';
import SiteFooter from './site-footer';
import MotionExperience from './motion-experience';
import SiteNav from './site-nav';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.hamlet.rest'),
  title: {
    default: 'HAMLET.REST — Find your place to belong.',
    template: '%s | HAMLET.REST',
  },
  description:
    'Discover shortlet stays across Nigeria, starting in Lagos. Find a space that fits the way you travel.',
  applicationName: 'HAMLET.REST',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'HAMLET.REST',
    locale: 'en_NG',
    title: 'HAMLET.REST — Find your place to belong.',
    description: 'Find a stay that feels right, wherever you are going.',
    url: 'https://www.hamlet.rest/',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#172119',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-NG">
      <body><MotionExperience><SiteNav />{children}<SiteFooter /></MotionExperience></body>
    </html>
  );
}
