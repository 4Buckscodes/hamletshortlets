import Link from 'next/link';
import type { Metadata } from 'next';
import inventory from '../../docs/lagos-showcase-inventory.json';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';

type SearchParams = Promise<{ area?: string }>;
const properties = inventory.properties;

export const metadata: Metadata = {
  title: 'Explore Lagos Property Previews | HAMLET',
  description: 'Explore illustrative Lagos shortlet concepts on HAMLET. These previews are not real listings and are not available to book.',
  alternates: { canonical: '/stays' },
};

const money = (value: number) => new Intl.NumberFormat('en-NG', {
  style: 'currency', currency: 'NGN', maximumFractionDigits: 0,
}).format(value);

export default async function StaysPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const area = (params.area || '').trim();
  const visible = properties.filter(property => !area || property.area.toLowerCase().includes(area.toLowerCase()));

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />
      <main className="flex-1">
        <section className="bg-ink-950 py-12 text-white sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <p className="eyebrow-light">HAMLET · LAGOS SHOWCASE</p>
            <h1 className="mt-3 max-w-3xl font-display text-3xl font-bold leading-tight sm:text-5xl">
              Find your kind of <span className="italic text-brass-300">Lagos stay.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-200 sm:text-base">
              Explore the kinds of shortlet homes we are bringing together across Lagos. Our property catalogue is being prepared with local owners and property partners.
            </p>
            <div className="mt-5 inline-flex rounded-full border border-brass-400/50 bg-brass-300/10 px-4 py-2 text-xs font-bold text-brass-200">
              SHOWCASE PREVIEW · BOOKINGS NOT OPEN
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold text-ink-900">Lagos property previews</h2>
              <p className="mt-1 text-sm text-ink-500">{visible.length} illustrative concepts · not live inventory</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Link href="/stays" className="rounded-full border border-ink-300 bg-white px-3 py-2 font-semibold">All areas</Link>
              <Link href="/stays?area=Lekki" className="rounded-full border border-ink-300 bg-white px-3 py-2 font-semibold">Lekki</Link>
              <Link href="/stays?area=Ikeja" className="rounded-full border border-ink-300 bg-white px-3 py-2 font-semibold">Ikeja</Link>
              <Link href="/stays?area=Yaba" className="rounded-full border border-ink-300 bg-white px-3 py-2 font-semibold">Yaba</Link>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((property, index) => (
              <Link key={property.id} href={`/stays/showcase/${property.id}`}
                className="group overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <div className={`relative grid aspect-[4/3] place-items-center overflow-hidden bg-gradient-to-br ${index % 3 === 0 ? 'from-[#d9c9b3] to-[#f3eee6]' : index % 3 === 1 ? 'from-[#b8c4bb] to-[#e8ece7]' : 'from-[#c8c1b5] to-[#eee9df]'}`}>
                  <div className="text-center">
                    <span className="block text-5xl text-ink-700/50">⌂</span>
                    <span className="mt-2 block text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink-700/70">Illustrative concept</span>
                  </div>
                  <span className="absolute left-3 top-3 rounded-full bg-ink-950/85 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-brass-200">Preview only</span>
                </div>
                <div className="p-5">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-brass-700">{property.area} · {property.property_type}</p>
                  <h3 className="mt-2 font-display text-lg font-bold text-ink-900 group-hover:text-jade-700">{property.title}</h3>
                  <p className="mt-2 text-xs text-ink-500">{property.bedrooms} bedrooms · {property.bathrooms} bathrooms · Up to {property.capacity} guests</p>
                  <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3">
                    <div><span className="block text-[10px] text-ink-500">Illustrative nightly estimate</span><strong className="text-base text-ink-900">{money(property.nightly_rate_ngn)}</strong></div>
                    <span className="text-xs font-bold text-ink-800">Explore concept →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <p className="mt-7 rounded-2xl border border-brass-300/70 bg-brass-50 p-4 text-xs leading-relaxed text-ink-700">
            Important: These are fictional showcase concepts, not actual HAMLET partner properties. Images are placeholders, prices are illustrative estimates, and amenities and availability have not been confirmed. No booking requests or payments are accepted for these previews.
          </p>
          <div className="mt-8 rounded-3xl bg-ink-950 p-6 text-white sm:p-8">
            <h2 className="font-display text-2xl font-bold">Own or manage a shortlet in Lagos?</h2>
            <p className="mt-2 max-w-xl text-sm text-ink-200">Join the HAMLET founding property partners and help build the real catalogue.</p>
            <Link href="/partners/apply" className="primary-button mt-5 inline-flex">Become a property partner</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
