import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, MapPin } from 'lucide-react';
import { buildLagosGuideStructuredData } from '@/lib/seo';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';

export const metadata: Metadata = {
  title: 'Lagos Shortlets by Neighbourhood — Island & Mainland Guide',
  description:
    'Explore Lagos shortlet corridors across Victoria Island, Ikoyi, Lekki Phase 1, Oniru, Yaba, Shomolu, Surulere, Gbagada and Ikeja GRA on HAMLET.REST.',
  alternates: { canonical: '/lagos' },
  openGraph: {
    title: 'Lagos Shortlets Neighbourhood Guide | HAMLET.REST',
    description:
      'Compare Lagos Island and Lagos Mainland shortlet neighbourhoods before you book.',
    url: 'https://www.hamlet.rest/lagos',
  },
};

const ISLAND_CORRIDORS = [
  {
    name: 'Victoria Island',
    subareas: 'Adeola Odeku · Oniru border · Ahmadu Bello · Eko Atlantic axis',
    detail:
      'Convenient for corporate offices, dining, waterfront meetings and Island venues. Always check estate access rules and commute timing.',
  },
  {
    name: 'Ikoyi',
    subareas: 'Old Ikoyi · Bourdillon · Parkview · Banana Island',
    detail:
      'Calm residential avenues suited to executive stays and longer visits. Review visitor policies, parking and power arrangements on each listing.',
  },
  {
    name: 'Lekki Phase 1 & Oniru',
    subareas: 'Admiralty Way · Freedom Way · Oniru Private Estate · Marwa',
    detail:
      'Wide choice of modern apartments, duplexes and group stays. Confirm estate gate protocols, power backup hours and quiet-hour rules.',
  },
  {
    name: 'Chevron & Ajah Corridor',
    subareas: 'Chevron Drive · Osapa · Ikate · Sangotedo axis',
    detail:
      'Residential estates with spacious duplexes and family shortlets. Factor Lekki-Epe Expressway travel windows into your daily schedule.',
  },
] as const;

const MAINLAND_CORRIDORS = [
  {
    name: 'Yaba',
    subareas: 'Alagomeji · Sabo · Akoka · Ebute Metta · Herbert Macaulay',
    detail:
      'Central Lagos Mainland base near universities, technology studios and the Third Mainland Bridge link to Victoria Island.',
  },
  {
    name: 'Shomolu',
    subareas: 'Palmgrove · Onipanu · Pedro · Ikorodu Road corridor',
    detail:
      'Direct Mainland arterial connectivity along Ikorodu Road with quick access to Yaba, Anthony, Maryland and Ikeja.',
  },
  {
    name: 'Surulere',
    subareas: 'Bode Thomas · Adeniran Ogunsanya · Eric Moore · Aguda',
    detail:
      'Established residential streets popular for family visits, creative productions, stadium events and central Lagos access.',
  },
  {
    name: 'Ikeja GRA, Maryland & Gbagada',
    subareas: 'Ikeja GRA · Maryland · Ilupeju · Gbagada Phase 1 & 2 · Magodo',
    detail:
      'Ideal for Murtala Muhammed Airport (MMIA) arrivals, Mainland corporate headquarters and gated residential estates.',
  },
] as const;

export default function LagosGuidePage() {
  const structuredData = buildLagosGuideStructuredData(
    [...ISLAND_CORRIDORS, ...MAINLAND_CORRIDORS].map(item => ({
      name: item.name,
      body: item.detail,
      href: `/stays?area=${encodeURIComponent(item.name)}`,
    })),
  );

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <main className="shell flex-1 py-10 sm:py-14">
        <p className="eyebrow">Lagos Field Guide</p>
        <h1 className="serif mt-2 max-w-3xl text-4xl font-medium tracking-tight text-ink-900 sm:text-6xl">
          Choose the right Lagos base — Island or Mainland.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-600">
          In Lagos, choosing the right corridor near your meetings, family or flights matters as much as the apartment itself. Start with the axis that fits your week, then compare approved stays.
        </p>

        {/* Lagos Mainland & Environs */}
        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Mainland Corridors</p>
              <h2 className="serif mt-1 text-2xl font-medium text-ink-900 sm:text-3xl">
                Lagos Mainland — Yaba, Shomolu, Surulere & environs
              </h2>
            </div>
            <Link
              href="/stays?area=Lagos+Mainland"
              className="secondary-button min-h-[42px]"
            >
              Browse all Lagos Mainland →
            </Link>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {MAINLAND_CORRIDORS.map(area => (
              <article
                key={area.name}
                className="flex flex-col justify-between rounded-3xl border border-ink-100 bg-white p-6"
              >
                <div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-brass-700">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {area.subareas}
                  </span>
                  <h3 className="serif mt-2 text-2xl font-medium text-ink-900">
                    {area.name}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">
                    {area.detail}
                  </p>
                </div>
                <div className="mt-5">
                  <Link
                    href={`/stays?area=${encodeURIComponent(area.name)}`}
                    className="inline-flex min-h-[42px] items-center gap-1.5 text-sm font-bold text-ink-900 hover:text-jade-600"
                  >
                    Explore {area.name} stays <ArrowRight className="h-4 w-4 shrink-0" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Lagos Island & Lekki */}
        <section className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Island & Lekki Corridors</p>
              <h2 className="serif mt-1 text-2xl font-medium text-ink-900 sm:text-3xl">
                Victoria Island, Ikoyi, Lekki Phase 1 & Oniru
              </h2>
            </div>
            <Link href="/stays" className="secondary-button min-h-[42px]">
              Browse all stays →
            </Link>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {ISLAND_CORRIDORS.map(area => (
              <article
                key={area.name}
                className="flex flex-col justify-between rounded-3xl border border-ink-100 bg-white p-6"
              >
                <div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-brass-700">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {area.subareas}
                  </span>
                  <h3 className="serif mt-2 text-2xl font-medium text-ink-900">
                    {area.name}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">
                    {area.detail}
                  </p>
                </div>
                <div className="mt-5">
                  <Link
                    href={`/stays?area=${encodeURIComponent(area.name)}`}
                    className="inline-flex min-h-[42px] items-center gap-1.5 text-sm font-bold text-ink-900 hover:text-jade-600"
                  >
                    Explore {area.name} stays <ArrowRight className="h-4 w-4 shrink-0" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Practical Checklist */}
        <section className="mt-12 rounded-3xl border border-ink-100 bg-white p-6 sm:p-8">
          <h2 className="serif m-0 text-2xl font-medium text-ink-900">
            Before you request a Lagos booking
          </h2>
          <ul className="mt-4 space-y-2 pl-5 text-sm leading-relaxed text-ink-600">
            <li>Check the neighbourhood relative to your daily appointments rather than distance on a map alone.</li>
            <li>Review power backup arrangements (24/7 estate power, inverter or generator schedule) on the listing page.</li>
            <li>Compare the total stay price and separate refundable caution deposit before sending a request.</li>
            <li>Wait for partner date confirmation and server-verified payment before treating any stay as confirmed.</li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/stays" className="primary-button">
              Search Lagos stays
            </Link>
            <Link href="/how-it-works" className="secondary-button">
              How HAMLET bookings work
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
