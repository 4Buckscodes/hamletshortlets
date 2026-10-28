import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, ArrowUpRight, Building2 } from 'lucide-react';
import { buildLagosGuideStructuredData } from '@/lib/seo';
import { SiteHeader, SiteFooter, NextCurrencySwitcher } from '@/components/site/SiteShell';

export const metadata: Metadata = {
  title: 'Shortlets in Lagos — Mainland (Yaba, Shomolu, Surulere) & Island Guide',
  description:
    'Explore shortlets across Lagos Mainland — Yaba, Shomolu, Surulere, Gbagada, Maryland, Ikeja GRA & environs — and Lagos Island (Victoria Island, Ikoyi, Lekki Phase 1, Ajah) on HAMLET.REST.',
  alternates: { canonical: '/lagos' },
};

const MAINLAND_GUIDES = [
  {
    name: 'Yaba & Environs',
    subareas: 'Sabo · Alagomeji · Akoka · Ebute Metta',
    body: 'Tech hubs, campuses, and fast Third Mainland Bridge access to Lagos Island.',
    href: '/stays?area=Yaba',
    img: '/images/prop/studio-1.jpg',
  },
  {
    name: 'Surulere & Environs',
    subareas: 'Bode Thomas · Adeniran Ogunsanya · Eric Moore',
    body: 'Tree-lined avenues, creative studios, and central Mainland–Island links.',
    href: '/stays?area=Surulere',
    img: '/images/prop/bed-1.jpg',
  },
  {
    name: 'Shomolu & Environs',
    subareas: 'Palmgrove · Onipanu · Gbagada · Ilupeju',
    body: 'Central Ikorodu Road and Gbagada expressway access across Lagos.',
    href: '/stays?area=Shomolu',
    img: '/images/prop/kitchen-1.jpg',
  },
  {
    name: 'Ikeja & Northern Mainland',
    subareas: 'Ikeja GRA · Maryland · Ogudu · Magodo',
    body: 'Convenient to Murtala Muhammed Airport, corporate offices, and gated GRAs.',
    href: '/stays?area=Ikeja+GRA',
    img: '/images/prop/duplex.jpg',
  },
] as const;

const ISLAND_GUIDES = [
  {
    name: 'Victoria Island',
    subareas: 'Adeola Odeku · Ahmadu Bello · Saka Tinubu',
    body: 'Business districts, conferences, embassies, and city dining.',
    href: '/stays?area=Victoria+Island',
    img: '/images/prop/living-1.jpg',
  },
  {
    name: 'Ikoyi & Banana Island',
    subareas: 'Old Ikoyi · Awolowo Road · Banana Island',
    body: 'Quiet residential apartments and penthouses with controlled estate access.',
    href: '/stays?area=Ikoyi',
    img: '/images/prop/penthouse.jpg',
  },
  {
    name: 'Lekki Phase 1 & Oniru',
    subareas: 'Admiralty Way · Freedom Way · Oniru',
    body: 'Serviced apartments near dining, retail, and waterfront venues.',
    href: '/stays?area=Lekki+Phase+1',
    img: '/images/prop/pool-1.jpg',
  },
  {
    name: 'Ajah Corridor',
    subareas: 'Chevron · Orchid Road · Sangotedo',
    body: 'Spacious duplexes and apartments suited for family and extended stays.',
    href: '/stays?area=Ajah',
    img: '/images/prop/exterior-1.jpg',
  },
] as const;

const MAINLAND_CHIPS = [
  { label: 'All Lagos Mainland', href: '/stays?area=Lagos+Mainland' },
  { label: 'Yaba', href: '/stays?area=Yaba' },
  { label: 'Shomolu', href: '/stays?area=Shomolu' },
  { label: 'Surulere', href: '/stays?area=Surulere' },
  { label: 'Gbagada', href: '/stays?area=Gbagada' },
  { label: 'Maryland', href: '/stays?area=Maryland' },
  { label: 'Ilupeju', href: '/stays?area=Ilupeju' },
  { label: 'Ebute Metta', href: '/stays?area=Ebute+Metta' },
  { label: 'Ogudu', href: '/stays?area=Ogudu' },
  { label: 'Magodo', href: '/stays?area=Magodo' },
  { label: 'Ikeja GRA', href: '/stays?area=Ikeja+GRA' },
] as const;

export default function LagosGuidePage() {
  const schema = buildLagosGuideStructuredData([...MAINLAND_GUIDES, ...ISLAND_GUIDES]);

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <main className="flex-1">
        {/* Full-bleed Lagos Hero */}
        <section className="page-hero relative overflow-hidden bg-ink-950 text-paper">
          <img
            src="/images/lagos-hero.jpg"
            alt="Lagos cityscape"
            className="absolute inset-0 h-full w-full object-cover opacity-100"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink-950/85 via-ink-950/50 to-ink-950/15" />
          <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
            <p className="eyebrow-light">Lagos area guide</p>
            <h1 className="mt-2.5 max-w-2xl font-display text-4xl font-bold leading-[1.06] text-white sm:text-5xl">
              Lagos Mainland &amp;{' '}
              <span className="italic text-brass-300">Lagos Island.</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm font-medium leading-relaxed text-ink-200 sm:text-base">
              Compare verified stays across <strong className="text-brass-300">Lagos Mainland</strong> (Yaba, Shomolu, Surulere &amp; Ikeja) and <strong className="text-brass-300">Lagos Island</strong> in ₦, $, or £.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/stays?area=Lagos+Mainland" className="btn-brass !rounded-full !px-6">
                Lagos Mainland <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
              <Link
                href="/stays?side=island"
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/20"
              >
                Lagos Island
              </Link>
              <NextCurrencySwitcher variant="dark" />
            </div>
          </div>
        </section>

        {/* Lagos Mainland & Environs */}
        <section className="border-b border-ink-100 bg-paper py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Mainland</p>
                <h2 className="mt-1 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
                  Lagos Mainland &amp; environs
                </h2>
              </div>
              <Link
                href="/stays?area=Lagos+Mainland"
                className="btn-outline !rounded-full !px-5 !py-2 text-xs"
              >
                Browse Mainland <ArrowRight className="h-3.5 w-3.5 shrink-0" />
              </Link>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {MAINLAND_CHIPS.map(chip => (
                <Link
                  key={chip.label}
                  href={chip.href}
                  className="rounded-full border border-ink-200 bg-white px-3.5 py-1.5 text-xs font-bold text-ink-700 transition hover:border-ink-900 hover:bg-ink-900 hover:text-white"
                >
                  {chip.label}
                </Link>
              ))}
            </div>

            <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {MAINLAND_GUIDES.map(item => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-2xs transition duration-300 hover:-translate-y-1 hover:border-ink-300 hover:shadow-md"
                >
                  <div className="relative h-44 overflow-hidden bg-clay">
                    <img
                      src={item.img}
                      alt={item.name}
                      loading="lazy"
                      className="h-full w-full object-cover opacity-100 transition duration-700 group-hover:scale-105"
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-ink-950/75 to-transparent" />
                    <span className="absolute left-3 top-3 rounded-full bg-ink-950/75 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-brass-300 backdrop-blur-md">
                      Mainland
                    </span>
                    <h3 className="absolute bottom-2.5 left-3.5 right-3.5 font-display text-xl font-bold text-white">
                      {item.name}
                    </h3>
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div>
                      <p className="text-[11px] font-bold text-brass-700">{item.subareas}</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-ink-600">{item.body}</p>
                    </div>
                    <span className="mt-4 inline-flex items-center justify-between border-t border-ink-100 pt-3 text-xs font-extrabold text-ink-900">
                      <span>Explore stays</span>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-400 transition group-hover:text-ink-900" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Lagos Island & Lekki Corridor */}
        <section className="border-b border-ink-100 bg-clay/45 py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Island &amp; Lekki</p>
                <h2 className="mt-1 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
                  Lagos Island &amp; Lekki corridor
                </h2>
              </div>
              <Link
                href="/stays?side=island"
                className="btn-outline !rounded-full !px-5 !py-2 text-xs"
              >
                Browse Island <ArrowRight className="h-3.5 w-3.5 shrink-0" />
              </Link>
            </div>

            <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {ISLAND_GUIDES.map(item => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-2xs transition duration-300 hover:-translate-y-1 hover:border-ink-300 hover:shadow-md"
                >
                  <div className="relative h-44 overflow-hidden bg-clay">
                    <img
                      src={item.img}
                      alt={item.name}
                      loading="lazy"
                      className="h-full w-full object-cover opacity-100 transition duration-700 group-hover:scale-105"
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-ink-950/75 to-transparent" />
                    <span className="absolute left-3 top-3 rounded-full bg-ink-950/75 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-brass-300 backdrop-blur-md">
                      Island
                    </span>
                    <h3 className="absolute bottom-2.5 left-3.5 right-3.5 font-display text-xl font-bold text-white">
                      {item.name}
                    </h3>
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div>
                      <p className="text-[11px] font-bold text-brass-700">{item.subareas}</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-ink-600">{item.body}</p>
                    </div>
                    <span className="mt-4 inline-flex items-center justify-between border-t border-ink-100 pt-3 text-xs font-extrabold text-ink-900">
                      <span>Explore stays</span>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-400 transition group-hover:text-ink-900" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Partner CTA */}
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14">
          <div className="flex flex-col items-start justify-between gap-5 rounded-3xl bg-ink-950 px-6 py-8 text-paper sm:flex-row sm:items-center sm:px-10">
            <div>
              <p className="eyebrow-light">Partner across Lagos</p>
              <h2 className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">
                Have a verified stay in Mainland or Island Lagos?
              </h2>
            </div>
            <Link href="/partners/apply" className="btn-brass !rounded-full !px-6">
              <Building2 className="h-4 w-4 shrink-0" /> Apply as a partner
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
