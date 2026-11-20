'use client';

import Link from 'next/link';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';

/** Workspace error: plain message, stay in the admin console, one way to retry. */
export default function AdminError({
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
          <p className="hm-label">Admin console</p>
          <h1 className="hm-h3">This page didn&apos;t load.</h1>
          <p className="hm-body">
            Something went wrong while loading this view. Reload to try again; if it keeps happening, share the code below with the HAMLET team.
          </p>
          {error.digest ? <p className="hm-meta">Error code: {error.digest}</p> : null}
          <div className="hm-chip-row">
            <button type="button" onClick={reset} className="hm-btn hm-btn-primary">
              Reload
            </button>
            <Link href="/admin" className="hm-btn hm-btn-ghost">
              Back to the console
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
