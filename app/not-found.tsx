import Link from 'next/link';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';

export default function NotFound() {
  return (
    <div className="hm-page" style={{ display: 'flex', flexDirection: 'column' }}>
      <SiteHeader />
      <main className="hm-main hm-status-screen hm-band hm-band-arrive" style={{ flex: 1 }}>
        <div className="hm-shell hm-band-inner">
          <p className="hm-label">404 · Page not found</p>
          <h1 className="hm-display">
            Page not found.
            <br />
            <em>Let’s get you somewhere good.</em>
          </h1>
          <p className="hm-body">This page or listing is unavailable.</p>
          <div className="hm-band-actions">
            <Link href="/stays" className="hm-btn hm-btn-lime">
              Explore Lagos stays
            </Link>
            <Link href="/" className="hm-btn hm-btn-ghost">
              Back to homepage
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
