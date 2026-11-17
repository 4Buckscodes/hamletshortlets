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
    default: 'HAMLET.REST — Lagos, on your terms.',
    template: '%s | HAMLET.REST',
  },
  description:
    'Find a shortlet in Lagos with a little more soul. The right neighbourhood, the right kind of space, all yours.',
  applicationName: 'HAMLET.REST',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'HAMLET.REST',
    locale: 'en_NG',
    title: 'HAMLET.REST — Lagos, on your terms.',
    description: 'Find a shortlet in Lagos with a little more soul.',
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
