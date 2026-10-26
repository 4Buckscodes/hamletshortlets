import Link from 'next/link';
import { ArrowRight, MapPin, Search } from 'lucide-react';
import { getPublicSupabase } from '@/lib/supabase-public';
import { PUBLIC_PROPERTY_SELECT, type PublicStayRecord } from '@/lib/next-supabase';
import { ISLAND_AND_LEKKI_AREAS, MAINLAND_AREAS } from '@/lib/areas';
import { SiteHeader, SiteFooter, StayListingCard } from '@/components/site/SiteShell';
import { HomeSampleSlideshow } from './home-slideshow';

export const revalidate = 60;

const FEATURED_CORRIDORS = [
  {
    name: 'Victoria Island',
    region: 'Island',
    summary: 'Business meetings, dining corridors, and serviced residences.',
  },
  {
    name: 'Ikoyi',
    region: 'Island',
    summary: 'Quiet residential avenues and executive apartments.',
  },
  {
    name: 'Lekki Phase 1',
    region: 'Island',
    summary: 'Modern apartments, group stays, and lifestyle access.',
  },
  {
    name: 'Yaba',
    region: 'Lagos Mainland',
    summary: 'Tech hubs, campus visits, Alagomeji, and Sabo.',
  },
  {
    name: 'Shomolu',
    region: 'Lagos Mainland',
    summary: 'Central Mainland access around Palmgrove and Onipanu.',
  },
  {
    name: 'Surulere',
    region: 'Lagos Mainland',
    summary: 'Bode Thomas, Adeniran Ogunsanya, and family visits.',
  },
  {
    name: 'Ikeja GRA',
    region: 'Lagos Mainland',
    summary: 'Tree-lined avenues convenient to MMIA airport.',
  },
  {
    name: 'Gbagada',
    region: 'Lagos Mainland',
    summary: 'Quick Third Mainland & Island-Mainland link estates.',
  },
] as const;

export default async function HomePage() {
  const db = getPublicSupabase();
  let approvedStays: PublicStayRecord[] = [];
  let connected = false;

  if (db) {
    const { data, error } = await db
      .from('properties')
      .select(PUBLIC_PROPERTY_SELECT)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(6);
    if (!error) {
      approvedStays = (data ?? []) as PublicStayRecord[];
      connected = true;
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <main className="flex-1">
        {/* Concise Marketplace Hero */}
        <section className="border-b border-ink-100 bg-gradient-to-b from-white via-paper to-paper py-10 sm:py-14">
          <div className="shell">
            <div className="grid items-center gap-8 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <p className="eyebrow">Lagos shortlets · Island & Mainland</p>
                <h1 className="serif mt-3 text-4xl leading-[1.04] font-medium tracking-tight text-ink-900 sm:text-6xl">
                  Find your next stay in Lagos.{' '}
                  <span className="italic text-brass-600">Your stay, sorted.</span>
                </h1>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-600">
                  Compare verified listing details, transparent all-in stay pricing, and clear house rules across Lagos Island and Lagos Mainland before you request to book.
                </p>

                {/* Compact Progressive Search Bar */}
                <form
                  action="/stays"
                  method="get"
                  className="mt-6 grid gap-3 rounded-3xl border border-ink-200 bg-white p-3.5 shadow-md sm:grid-cols-2 lg:grid-cols-4"
                >
                  <label className="grid gap-1 px-2 py-1">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink-500">
                      Where in Lagos
                    </span>
                    <select
                      name="area"
                      defaultValue=""
                      aria-label="Choose a Lagos neighbourhood"
                      className="min-h-[42px] w-full bg-transparent text-sm font-semibold text-ink-900 focus:outline-none"
                    >
                      <option value="">All Lagos</option>
                      <optgroup label="Lagos Island & Lekki">
                        {ISLAND_AND_LEKKI_AREAS.map(a => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Lagos Mainland & Environs">
                        {MAINLAND_AREAS.map(a => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </label>

                  <label className="grid gap-1 border-t border-ink-100 px-2 py-1 sm:border-t-0 sm:border-l">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink-500">
                      Check-in
                    </span>
                    <input
                      name="checkIn"
                      type="date"
                      aria-label="Check-in date"
                      className="min-h-[42px] w-full bg-transparent text-sm font-semibold text-ink-900 focus:outline-none"
                    />
                  </label>

                  <label className="grid gap-1 border-t border-ink-100 px-2 py-1 lg:border-t-0 lg:border-l">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink-500">
                      Check-out
                    </span>
                    <input
                      name="checkOut"
                      type="date"
                      aria-label="Check-out date"
                      className="min-h-[42px] w-full bg-transparent text-sm font-semibold text-ink-900 focus:outline-none"
                    />
                  </label>

                  <div className="flex items-end">
                    <button type="submit" className="primary-button min-h-[48px] w-full">
                      <Search className="h-4 w-4 shrink-0" />
                      Search stays
                    </button>
                  </div>
                </form>

                {/* Quick Area Pills */}
                <div
                  aria-label="Popular Lagos neighbourhoods"
                  className="mt-4 flex gap-2 overflow-x-auto overscroll-x-contain pb-1"
                >
                  {[
                    'Victoria Island',
                    'Ikoyi',
                    'Lekki Phase 1',
                    'Lagos Mainland',
                    'Yaba',
                    'Shomolu',
                    'Surulere',
                    'Ikeja GRA',
                  ].map(area => (
                    <Link
                      key={area}
                      href={`/stays?area=${encodeURIComponent(area)}`}
                      className="pill text-xs font-bold text-ink-800 hover:border-ink-900"
                    >
                      {area}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-5">
                <HomeSampleSlideshow />
              </div>
            </div>
          </div>
        </section>

        {/* Live Approved Stays Section */}
        <section className="shell py-12 sm:py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Marketplace</p>
              <h2 className="serif mt-1.5 text-3xl font-medium text-ink-900 sm:text-4xl">
                Available stays
              </h2>
            </div>
            <Link
              href="/stays"
              className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-bold text-ink-900 hover:text-jade-600"
            >
              View all stays <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
          </div>

          {approvedStays.length > 0 ? (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {approvedStays.map(stay => (
                <StayListingCard key={stay.id} stay={stay} />
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-dashed border-ink-300 bg-white/80 p-8 text-center sm:p-10">
              <h3 className="serif text-2xl font-medium text-ink-900">
                {connected
                  ? 'Approved stays will appear here as listings pass verification'
                  : 'Connect public Supabase variables to load live approved stays'}
              </h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-ink-500">
                {connected
                  ? 'HAMLET displays only approved listings — never sample or placeholder properties as bookable inventory. Manage or submit a Lagos property through the partner workspace.'
                  : 'Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to display live approved inventory.'}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Link href="/lagos" className="secondary-button">
                  Explore Lagos neighbourhoods
                </Link>
                <Link href="/partners/apply" className="primary-button">
                  List a property with HAMLET
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* Browse by Area (Island & Lagos Mainland) */}
        <section className="border-t border-ink-100 bg-white py-12 sm:py-16">
          <div className="shell">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Island & Lagos Mainland</p>
                <h2 className="serif mt-1.5 text-3xl font-medium text-ink-900 sm:text-4xl">
                  Browse by area
                </h2>
              </div>
              <Link
                href="/lagos"
                className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-bold text-ink-900 hover:text-jade-600"
              >
                Full Lagos guide <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            </div>

            <div className="mt-6 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURED_CORRIDORS.map(corridor => (
                <Link
                  key={corridor.name}
                  href={`/stays?area=${encodeURIComponent(corridor.name)}`}
                  className="group flex flex-col justify-between rounded-2xl border border-ink-100 bg-paper/60 p-5 transition hover:border-ink-900 hover:bg-white"
                >
                  <div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-brass-700">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {corridor.region}
                    </span>
                    <h3 className="serif mt-1.5 text-xl font-medium text-ink-900">
                      {corridor.name}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-ink-500">
                      {corridor.summary}
                    </p>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-ink-800 group-hover:translate-x-0.5 transition">
                    Explore {corridor.name} <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
