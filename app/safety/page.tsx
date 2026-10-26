import Link from 'next/link';
import type { Metadata } from 'next';
import { ShieldCheck, BadgeCheck, AlertTriangle, Lock } from 'lucide-react';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';

export const metadata: Metadata = {
  title: 'Trust and Safety',
  description:
    'How HAMLET.REST reviews shortlet listings, labels verification evidence honestly, protects guest payments, and handles stay issues.',
  alternates: { canonical: '/safety' },
};

export default function SafetyPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <main className="shell flex-1 py-10 sm:py-14">
        <p className="eyebrow">Trust & Safety</p>
        <h1 className="serif mt-2 max-w-3xl text-4xl font-medium tracking-tight text-ink-900 sm:text-6xl">
          Honest labels. Accountable stays.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-600">
          HAMLET is a review-led marketplace. Every partner application and submitted property goes through human review before appearing publicly, and every trust badge reflects what has actually been checked.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <article className="rounded-3xl border border-ink-100 bg-white p-6">
            <BadgeCheck className="h-6 w-6 text-emerald-700" />
            <h2 className="serif mt-3 text-2xl font-medium text-ink-900">
              Four-pillar listing review
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              Administrators record separate outcomes for Ownership/Title, Partner Identity, Authority to List, and Physical Inspection. A listing only receives the HAMLET Verified label when all four pillars are marked verified.
            </p>
          </article>

          <article className="rounded-3xl border border-ink-100 bg-white p-6">
            <Lock className="h-6 w-6 text-ink-900" />
            <h2 className="serif mt-3 text-2xl font-medium text-ink-900">
              Verified payment protection
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              Guests never pay off-platform to request dates. Checkout initializes server-side only after partner confirmation, and bookings confirm exclusively from signed Paystack webhook verification.
            </p>
          </article>

          <article className="rounded-3xl border border-ink-100 bg-white p-6">
            <ShieldCheck className="h-6 w-6 text-brass-700" />
            <h2 className="serif mt-3 text-2xl font-medium text-ink-900">
              Verified vs. self-reported transparency
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              Partner-submitted declarations start as <em>Self-reported</em> or <em>Pending review</em>. HAMLET does not treat a listing’s presence on the platform as an automatic legal warranty of title.
            </p>
          </article>

          <article className="rounded-3xl border border-ink-100 bg-white p-6">
            <AlertTriangle className="h-6 w-6 text-red-700" />
            <h2 className="serif mt-3 text-2xl font-medium text-ink-900">
              Something wrong during a stay?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              Open your account issue desk to file a severity-tagged report linked to your booking reference. Critical safety or access issues are flagged immediately for HAMLET operations review.
            </p>
          </article>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/account/issues" className="primary-button">
            Report a booking issue
          </Link>
          <Link href="/legal" className="secondary-button">
            Read legal & privacy terms
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
