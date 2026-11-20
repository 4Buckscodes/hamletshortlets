'use client';

import Link from 'next/link';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';

/** Workspace error: plain message, stay in the partner workspace, one way to retry. */
export default function PartnerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="hm-page" style={{ display: 'flex', flexDirection: 'column' }}>
      <SiteHeader />
      <main className="hm-main hm-workspace" style={{ flex: 1 }}>
        <div className="hm-card hm-card-pad" style={{ display: 'grid', gap: 12, maxWidth: 640 }}>
          <p className="hm-label">Partner workspace</p>
          <h1 className="hm-h3">This page didn&apos;t load.</h1>
          <p className="hm-body">
            Something went wrong while loading this view. Reload to try again; if it keeps happening, contact hello@hamlet.rest with the code below.
          </p>
          {error.digest ? <p className="hm-meta">Error code: {error.digest}</p> : null}
          <div className="hm-chip-row">
            <button type="button" onClick={reset} className="hm-btn hm-btn-primary">
              Reload
            </button>
            <Link href="/partners" className="hm-btn hm-btn-ghost">
              Back to your workspace
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
