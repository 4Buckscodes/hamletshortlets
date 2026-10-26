import Link from 'next/link';
import type { Metadata } from 'next';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';

export const metadata: Metadata = {
  title: 'About HAMLET.REST',
  description:
    'Learn how HAMLET.REST by Abundance Abodes brings verification, transparent pricing and partner-confirmed accountability to Lagos shortlets.',
  alternates: { canonical: '/about' },
};

const PILLARS = [
  {
    num: '01',
    title: 'Clear verification status',
    body: 'Every listing shows the actual review state of ownership, partner identity, authority to list and physical inspection — never assuming unreviewed claims are verified.',
  },
  {
    num: '02',
    title: 'Transparent stay pricing',
    body: 'Guests see the itemised stay total upfront in NGN, USD or GBP, while refundable caution deposits remain separate and unbuffered.',
  },
  {
    num: '03',
    title: 'Partner-confirmed availability',
    body: 'A search result or inquiry is never misrepresented as an instant booking. Partners confirm dates first, then a 48-hour payment window opens.',
  },
  {
    num: '04',
    title: 'Documented support & audit trail',
    body: 'Guests can report issues directly against their booking reference, and every operational transition is recorded in an immutable audit log.',
  },
] as const;

export default function AboutPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <main className="shell flex-1 py-10 sm:py-14">
        <p className="eyebrow">About HAMLET · An Abundance Abodes Product</p>
        <h1 className="serif mt-2 max-w-3xl text-4xl font-medium tracking-tight text-ink-900 sm:text-6xl">
          Shortlets, with accountability.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-600">
          A good stay is about more than beautiful pictures. Built in Lagos by Abundance Abodes, HAMLET.REST connects guests with vetted shortlet owners, managers and operators through a transparent request-to-confirm workflow.
        </p>

        {/* Four Pillars of a Better Stay (lives on /about per product rules) */}
        <section className="mt-10">
          <p className="eyebrow">Our standard</p>
          <h2 className="serif mt-1.5 text-3xl font-medium text-ink-900">
            Four pillars of a better stay
          </h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {PILLARS.map(pillar => (
              <article
                key={pillar.num}
                className="rounded-3xl border border-ink-100 bg-white p-6"
              >
                <span className="font-mono text-xs font-extrabold text-brass-600">
                  {pillar.num}
                </span>
                <h3 className="serif mt-2 text-2xl font-medium text-ink-900">
                  {pillar.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  {pillar.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-3xl bg-ink-900 p-7 text-white sm:p-10">
          <h2 className="serif m-0 text-3xl font-medium">Your stay, sorted.</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-200">
            Explore Lagos stays across the Island and Mainland, read our{' '}
            <Link href="/safety" className="underline">
              trust & safety standards
            </Link>
            , or apply to join the{' '}
            <Link href="/partners/apply" className="underline">
              HAMLET partner network
            </Link>
            .
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/stays"
              className="primary-button bg-brass-500 text-ink-950 hover:bg-brass-400"
            >
              Explore Lagos stays →
            </Link>
            <Link
              href="/partners/apply"
              className="secondary-button border-ink-700 bg-transparent text-white hover:bg-ink-800"
            >
              Become a partner
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
