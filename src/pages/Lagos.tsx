import { Link } from 'react-router-dom';
import { ArrowRight, Banknote, KeyRound, Lock, MapPin, ShieldCheck, Wifi, Zap } from 'lucide-react';
import { GuestLayout } from '../components/Navbar';
import { PropertyCard } from '../components/PropertyCard';
import { CurrencyToggle } from '../components/CurrencyToggle';
import { useHamlet } from '../lib/store';
import { usePageMeta } from '../lib/brand';

const NEIGHBOURHOOD_GUIDES = [
  {
    name: 'Lekki',
    tagline: 'For the lifestyle and the plans around it',
    body: 'Looking for shortlets in Lekki? Explore apartments close to dining spots, shopping, entertainment, and popular social destinations. Lekki can suit couples, groups, families, and travellers who want a lively base for their time in Lagos.',
    note: 'Check the exact location and likely journey to your planned destinations before booking.',
    href: '/stays?q=Lekki',
  },
  {
    name: 'Victoria Island',
    tagline: 'For business and city convenience',
    body: 'Need a shortlet in Victoria Island? Explore accommodation suited to corporate visits, meetings, conferences, and stays close to Lagos Island’s business districts. Look for practical amenities, a suitable workspace, and clear arrival arrangements.',
    href: '/stays?area=Victoria+Island',
  },
  {
    name: 'Ikoyi',
    tagline: 'For a more private city stay',
    body: 'If you value a quieter residential setting, explore shortlets in Ikoyi. Compare apartment features, building access, parking, and proximity to your planned destinations.',
    href: '/stays?area=Ikoyi',
  },
  {
    name: 'Ikeja',
    tagline: 'For mainland convenience',
    body: 'Searching for shortlets in Ikeja? Consider apartments that make it easier to reach mainland business districts, family addresses, and transport connections. Confirm the precise location and route to the places you need to visit.',
    href: '/stays?q=Ikeja',
  },
  {
    name: 'Ajah',
    tagline: 'For residential stays and room to settle in',
    body: 'Explore shortlets in Ajah for family visits, longer stays, and plans centred around the Lekki–Ajah corridor. Review transport considerations, nearby amenities, and power arrangements before making your decision.',
    href: '/stays?area=Ajah',
  },
];

export default function Lagos() {
  usePageMeta(
    'Shortlets in Lagos | Find Apartments for Your Stay — HAMLET',
    'Explore shortlets in Lagos, from Lekki and Victoria Island to Ikoyi and Ikeja. Compare locations, amenities, prices, and check-in details on HAMLET.',
  );

  const { state, backendReady, backendError } = useHamlet();
  const approved = state.properties.filter(p => p.status === 'approved');

  return (
    <GuestLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-ink-950 text-paper">
        <img
          src="/images/lagos-hero.jpg"
          alt="Lagos cityscape"
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950/95 via-ink-950/75 to-ink-950/35" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-brass-300">
            Lagos shortlets & serviced apartments
          </p>
          <h1 className="mt-3 max-w-2xl font-display text-4xl font-black leading-tight sm:text-5xl">
            Find your place in Lagos.
          </h1>
          <p className="mt-3 max-w-2xl text-base font-semibold text-brass-200">
            Lagos is easier to enjoy when your accommodation works with your plans.
          </p>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-ink-100">
            Whether you’re coming for meetings on Victoria Island, a weekend around Lekki, a family visit on the mainland, or a few days away from your routine, HAMLET helps you explore shortlets in Lagos with the details you need to make a confident choice.
          </p>
          <p className="mt-2.5 max-w-2xl text-sm font-medium leading-relaxed text-ink-200">
            Compare apartment locations, available amenities, guest capacity, and booking terms before choosing your next stay. From a practical base for business to a comfortable apartment for a weekend staycation in Lagos, start with the neighbourhood that makes the most sense for you.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link to="/stays" className="btn-brass min-h-12">
              Browse shortlets in Lagos <ArrowRight size={15} />
            </Link>
            <CurrencyToggle variant="dark" />
          </div>
        </div>
      </section>

      {/* Explore Lagos by neighbourhood */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="max-w-2xl">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-jade-700">Neighbourhood guide</p>
          <h2 className="mt-1.5 font-display text-3xl font-black text-ink-900 sm:text-4xl">
            Explore Lagos by neighbourhood
          </h2>
          <p className="mt-2 text-sm font-medium text-ink-500">
            Select a neighbourhood to filter available stays and review proximity to your planned destinations.
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {NEIGHBOURHOOD_GUIDES.map(n => (
            <article key={n.name} className="flex flex-col rounded-2xl border border-ink-100 bg-white p-6 shadow-2xs">
              <div className="flex items-center gap-2 text-jade-700">
                <MapPin size={17} className="shrink-0" />
                <span className="text-[11px] font-extrabold uppercase tracking-[0.16em]">Lagos</span>
              </div>
              <h3 className="mt-2 font-display text-xl font-black text-ink-900">{n.name}</h3>
              <p className="mt-0.5 text-[12.5px] font-bold text-ink-700">{n.tagline}</p>
              <p className="mt-2.5 text-[13px] leading-relaxed text-ink-600">{n.body}</p>
              {n.note && <p className="mt-2 text-[11.5px] font-semibold text-ink-500">{n.note}</p>}
              <Link
                to={n.href}
                className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[12.5px] font-extrabold text-jade-800 hover:text-jade-900"
              >
                Explore {n.name} stays <ArrowRight size={13} className="shrink-0" />
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* Available Lagos stays */}
      <section className="border-y border-ink-100 bg-clay/60 py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-jade-700">Available inventory</p>
              <h2 className="mt-1.5 font-display text-3xl font-black text-ink-900 sm:text-4xl">
                Shortlets in Lagos
              </h2>
              <p className="mt-1.5 text-sm font-medium text-ink-600">
                Compare prices in Naira (₦), US Dollars ($), or British Pounds (£) and inspect full property details before requesting to book.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <CurrencyToggle />
              <Link to="/stays" className="btn-dark !py-2.5 text-[12px]">
                Filter by dates & amenities <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {backendError ? (
            <div role="alert" className="mt-7 rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-sm font-semibold text-red-800">
              Something didn’t go as planned loading Lagos stays: {backendError}
            </div>
          ) : !backendReady ? (
            <div className="mt-7 rounded-2xl border border-ink-100 bg-white px-6 py-10 text-center text-sm font-semibold text-ink-500">
              Finding spaces that fit your plans…
            </div>
          ) : approved.length > 0 ? (
            <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {approved.slice(0, 6).map(p => (
                <PropertyCard key={p.id} p={p} />
              ))}
            </div>
          ) : (
            <div className="mt-7 rounded-3xl border border-ink-100 bg-white px-6 py-12 text-center sm:px-10">
              <ShieldCheck size={30} className="mx-auto text-jade-700" />
              <h3 className="mt-3 font-display text-2xl font-black text-ink-900">
                We’re still adding stays in this area.
              </h3>
              <p className="mx-auto mt-2 max-w-xl text-sm font-medium leading-relaxed text-ink-500">
                Try another neighbourhood or check back as more properties become available. Every Lagos shortlet on HAMLET completes manual verification before going live.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link to="/partner/register" className="btn-jade">List your Lagos property</Link>
                <Link to="/how-it-works" className="btn-outline">How HAMLET works</Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* What to look for when booking a Lagos shortlet */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="max-w-3xl">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-jade-700">Practical booking checklist</p>
          <h2 className="mt-2 font-display text-3xl font-black text-ink-900 sm:text-4xl">
            What to look for when booking a Lagos shortlet
          </h2>
          <p className="mt-3 text-sm font-medium leading-relaxed text-ink-600">
            Lagos traffic can change how convenient a property feels. A beautiful apartment may not be the right choice if it puts you too far from the places you need to reach. Before booking, consider:
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { Icon: MapPin, title: 'Location', body: 'How close is the property to your meetings, events, or family?' },
            { Icon: Zap, title: 'Power', body: 'Is there an inverter or generator? What exactly does the backup support?' },
            { Icon: Wifi, title: 'Internet', body: 'Is Wi-Fi provided, and are speed or backup arrangements specified?' },
            { Icon: Lock, title: 'Access and security', body: 'What are the building entry procedures and security arrangements?' },
            { Icon: Banknote, title: 'Total price', body: 'What charges apply beyond the advertised nightly rate?' },
            { Icon: KeyRound, title: 'Check-in', body: 'Who will assist with access, and what happens if you arrive late?' },
          ].map(({ Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-ink-100 bg-white p-5">
              <Icon size={20} className="shrink-0 text-jade-700" />
              <h3 className="mt-3 font-display text-base font-black text-ink-900">{title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">{body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-3xl bg-ink-950 p-7 text-paper sm:p-10">
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <h2 className="font-display text-2xl font-black sm:text-3xl">Find a Lagos stay that works for you.</h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-ink-200">
                From luxury shortlets in Victoria Island to convenient apartments in Ikeja and lifestyle-led stays in Lekki, choose based on the experience you want and the practical details that matter.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/stays" className="btn-brass min-h-12">
                Browse shortlets in Lagos <ArrowRight size={15} />
              </Link>
              <Link to="/faqs" className="inline-flex min-h-12 items-center rounded-xl border border-white/25 bg-white/5 px-4 py-3 text-sm font-bold text-paper transition hover:bg-white/10">
                Read booking FAQs
              </Link>
            </div>
          </div>
        </div>
      </section>
    </GuestLayout>
  );
}
