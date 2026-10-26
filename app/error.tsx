'use client';

import Link from 'next/link';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';

export default function GlobalRouteError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />
      <main className="shell flex flex-1 flex-col items-center justify-center py-20 text-center">
        <p className="eyebrow">Temporary interruption</p>
        <h1 className="serif mt-3 text-4xl font-medium text-ink-900 sm:text-5xl">
          Something interrupted this view.
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-500">
          No booking or payment state was changed. Try reloading this page or return to Lagos stays.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="primary-button">
            Try again
          </button>
          <Link href="/stays" className="secondary-button">
            Explore stays
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
