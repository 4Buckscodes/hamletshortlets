import type { Metadata } from 'next';
import HamletDesignPrototype from './prototype';

export const metadata: Metadata = {
  title: 'HAMLET Design Preview',
  description: 'Interactive concept prototype for the HAMLET guest, partner and operations experiences.',
  robots: { index: false, follow: false },
};

export default function DesignPreviewPage() {
  return <HamletDesignPrototype />;
}
