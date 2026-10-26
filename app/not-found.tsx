import Link from 'next/link';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />
      <main className="shell flex flex-1 flex-col items-center justify-center py-20 text-center">
        <p className="eyebrow">404 · Page not found</p>
        <h1 className="serif mt-3 text-4xl font-medium text-ink-900 sm:text-5xl">
          We could not find that page.
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-500">
          The listing or page you followed may have moved, been paused, or is no longer published.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/stays" className="primary-button">
            Explore Lagos stays
          </Link>
          <Link href="/" className="secondary-button">
            Back to homepage
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
