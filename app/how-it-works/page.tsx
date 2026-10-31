import type { Metadata } from 'next';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import { CeremonyExplorer } from './ceremony-explorer';

export const metadata: Metadata = {
  title: 'How HAMLET Works — Booking Shortlets Made Clear',
  description:
    'Four clear steps to find, request, confirm, and check into a verified Lagos shortlet on HAMLET.REST — with upfront pricing and server-verified Paystack checkout.',
  alternates: { canonical: '/how-it-works' },
};

const LIFECYCLE_STATES = [
  { step: '1', code: 'requested', sub: 'Dates reviewed by partner' },
  { step: '2', code: 'awaiting_payment', sub: '48-hour Paystack hold' },
  { step: '3', code: 'confirmed', sub: 'Server-verified payment' },
  { step: '4', code: 'completed', sub: 'Caution deposit inspected' },
] as const;

export default function HowItWorksPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <main className="flex-1">
        <section data-hamlet-reveal className="border-b border-ink-800 bg-ink-950 text-paper">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
            <p className="eyebrow-light">How it works</p>
            <h1 className="mt-2.5 max-w-2xl font-display text-4xl font-bold leading-[1.06] text-white sm:text-5xl">
              Booked clearly.{' '}
              <span className="italic text-brass-300">Paid only when confirmed.</span>
            </h1>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
          <CeremonyExplorer />

          <section data-hamlet-reveal className="mt-10 rounded-3xl bg-ink-950 p-6 text-paper sm:p-8">
            <p className="eyebrow-light">Booking lifecycle</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {LIFECYCLE_STATES.map(s => (
                <div
                  key={s.step}
                  className="rounded-2xl border border-white/12 bg-ink-900/90 p-4"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brass-500 font-mono text-xs font-black text-ink-950">
                    {s.step}
                  </span>
                  <p className="mt-2.5 font-mono text-xs font-bold text-brass-300">{s.code}</p>
                  <p className="mt-1 text-xs font-medium text-ink-300">{s.sub}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
