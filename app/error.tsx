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
    <div className="hm-page" style={{ display: 'flex', flexDirection: 'column' }}>
      <SiteHeader />
      <main className="hm-main hm-status-screen hm-band hm-band-arrive" style={{ flex: 1 }}>
        <div className="hm-shell hm-band-inner">
          <p className="hm-label">Temporary interruption</p>
          <h1 className="hm-display">
            Could not load this view.
            <br />
            <em>Give it another go.</em>
          </h1>
          <p className="hm-body">Try reloading or return to stays.</p>
          <div className="hm-band-actions">
            <button type="button" onClick={reset} className="hm-btn hm-btn-lime">
              Try again
            </button>
            <Link href="/stays" className="hm-btn hm-btn-ghost">
              Explore stays
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
