import { Link } from 'react-router-dom';
import { ArrowRight, Banknote, KeyRound, Lock, MapPin, ShieldCheck, Wifi, Zap } from 'lucide-react';
import { GuestLayout } from '../components/Navbar';
import { PropertyCard } from '../components/PropertyCard';
import { CurrencyToggle } from '../components/CurrencyToggle';
import { useHamlet } from '../lib/store';
import { usePageMeta } from '../lib/brand';

const MAINLAND_GUIDES = [
  {
    name: 'Yaba & Environs',
    subareas: 'Sabo · Alagomeji · Akoka · Ebute Metta · Jibowu',
    tagline: 'For tech hubs, campuses & central Mainland access',
    body: 'Searching for shortlets in Yaba? Stay close to Lagos’s technology corridor, universities, medical centres, and quick Third Mainland Bridge links to Lagos Island.',
    href: '/stays?area=Yaba',
  },
  {
    name: 'Surulere & Environs',
    subareas: 'Bode Thomas · Adeniran Ogunsanya · Eric Moore · Aguda · Iponri',
    tagline: 'For vibrant residential streets, studios & family visits',
    body: 'Explore serviced apartments in Surulere with easy access to shopping, dining, stadiums, creative studios, and central routes connecting both Mainland and Island.',
    href: '/stays?area=Surulere',
  },
  {
    name: 'Shomolu & Environs',
    subareas: 'Palmgrove · Onipanu · Pedro · Fadeyi · Gbagada · Anthony · Ilupeju',
    tagline: 'For central Ikorodu Road & Gbagada expressway links',
    body: 'Need a practical Mainland base around Shomolu, Palmgrove, Onipanu, or nearby Gbagada and Ilupeju? Compare power arrangements, gated parking, and proximity to commercial hubs.',
    href: '/stays?area=Shomolu',
  },
  {
    name: 'Ikeja & Northern Mainland',
    subareas: 'Ikeja GRA · Maryland · Opebi · Ogudu · Magodo',
    tagline: 'For airport proximity, corporate offices & quiet GRAs',
    body: 'Consider apartments in Ikeja GRA, Maryland, Ogudu, and Magodo for seamless Murtala Muhammed Airport transfers, mainland business districts, and family stays.',
    href: '/stays?q=Ikeja',
  },
];

const ISLAND_GUIDES = [
  {
    name: 'Lekki',
    tagline: 'For the lifestyle and the plans around it',
    body: 'Explore apartments close to dining spots, shopping, entertainment, and social destinations across Lekki Phase 1 and Oniru.',
    href: '/stays?q=Lekki',
  },
  {
    name: 'Victoria Island',
    tagline: 'For business and city convenience',
    body: 'Explore accommodation suited to corporate visits, meetings, conferences, and stays close to Lagos Island’s business districts.',
    href: '/stays?area=Victoria+Island',
  },
  {
    name: 'Ikoyi',
    tagline: 'For a more private city stay',
    body: 'Compare quieter residential apartments across Ikoyi and Banana Island with clear building access, security, and parking.',
    href: '/stays?area=Ikoyi',
  },
  {
    name: 'Ajah',
    tagline: 'For residential stays and room to settle in',
    body: 'Explore shortlets in Ajah for family visits, longer stays, and plans centred around the Lekki–Ajah corridor.',
    href: '/stays?area=Ajah',
  },
];

const MAINLAND_ENVIRONS_CHIPS = [
  { label: 'All Lagos Mainland', to: '/stays?area=Lagos+Mainland' },
  { label: 'Yaba', to: '/stays?area=Yaba' },
  { label: 'Shomolu', to: '/stays?area=Shomolu' },
  { label: 'Surulere', to: '/stays?area=Surulere' },
  { label: 'Gbagada', to: '/stays?area=Gbagada' },
  { label: 'Maryland', to: '/stays?area=Maryland' },
  { label: 'Ilupeju', to: '/stays?area=Ilupeju' },
  { label: 'Ebute Metta', to: '/stays?area=Ebute+Metta' },
  { label: 'Ogudu', to: '/stays?area=Ogudu' },
  { label: 'Magodo', to: '/stays?area=Magodo' },
  { label: 'Ikeja GRA', to: '/stays?area=Ikeja+GRA' },
];

export default function Lagos() {
  usePageMeta(
    'Shortlets in Lagos | Mainland (Yaba, Shomolu, Surulere) & Island — HAMLET',
    'Explore shortlets across Lagos Mainland — Yaba, Shomolu, Surulere, Gbagada, Maryland, Ikeja & environs — and Lagos Island (Lekki, Victoria Island, Ikoyi, Ajah) on HAMLET.',
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
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-18">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-brass-300">
            Lagos Mainland & Island shortlets
          </p>
          <h1 className="mt-3 max-w-2xl font-display text-4xl font-black leading-tight sm:text-5xl">
            Find your place in Lagos.
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-ink-100 sm:text-base">
            Whether your plans are centred around <strong className="text-brass-200">Lagos Mainland</strong> — Yaba, Shomolu, Surulere, Gbagada, Maryland, and Ikeja — or <strong className="text-brass-200">Lagos Island & Lekki</strong>, explore apartments with upfront pricing and confirmed arrival details.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link to="/stays?area=Lagos+Mainland" className="btn-brass min-h-12">
              Explore Lagos Mainland <ArrowRight size={15} />
            </Link>
            <Link to="/stays" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-4 py-3 text-sm font-bold text-paper transition hover:bg-white/10">
              Browse all Lagos stays
            </Link>
            <CurrencyToggle variant="dark" />
          </div>
        </div>
      </section>

      {/* Lagos Mainland Spotlight: Yaba, Shomolu, Surulere & Environs */}
      <section id="lagos-mainland" className="border-b border-ink-100 bg-paper py-12 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-jade-700">
                Lagos Mainland & Environs
              </p>
              <h2 className="mt-1.5 font-display text-2xl font-black text-ink-900 sm:text-3xl">
                Yaba, Shomolu, Surulere & surrounding hubs
              </h2>
              <p className="mt-1.5 text-sm font-medium text-ink-600">
                Stay close to Mainland business corridors, universities, family addresses, Murtala Muhammed Airport, and fast bridge connections to the Island.
              </p>
            </div>
            <Link to="/stays?area=Lagos+Mainland" className="btn-jade !py-2.5 text-xs">
              View all Mainland stays <ArrowRight size={14} />
            </Link>
          </div>

          {/* Quick Environs Chips */}
          <div className="mt-5 flex flex-wrap gap-2">
            {MAINLAND_ENVIRONS_CHIPS.map(chip => (
              <Link
                key={chip.label}
                to={chip.to}
                className="rounded-full border border-jade-200 bg-jade-50/70 px-3.5 py-1.5 text-xs font-bold text-jade-900 transition hover:border-jade-600 hover:bg-jade-700 hover:text-white"
              >
                {chip.label}
              </Link>
            ))}
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {MAINLAND_GUIDES.map(n => (
              <article key={n.name} className="flex flex-col rounded-2xl border border-ink-100 bg-white p-5 shadow-2xs">
                <div className="flex items-center gap-2 text-jade-700">
                  <MapPin size={16} className="shrink-0" />
                  <span className="text-[10.5px] font-extrabold uppercase tracking-[0.16em]">Lagos Mainland</span>
                </div>
                <h3 className="mt-2 font-display text-lg font-black text-ink-900">{n.name}</h3>
                <p className="mt-0.5 text-[11px] font-bold text-jade-800">{n.subareas}</p>
                <p className="mt-2 text-[12px] font-bold text-ink-800">{n.tagline}</p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-600">{n.body}</p>
                <Link
                  to={n.href}
                  className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[12px] font-extrabold text-jade-800 hover:text-jade-900"
                >
                  Explore {n.name.split(' ')[0]} stays <ArrowRight size={13} className="shrink-0" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Lagos Island & Lekki Corridor */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14">
        <div className="max-w-2xl">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-jade-700">Lagos Island & Lekki Corridor</p>
          <h2 className="mt-1.5 font-display text-2xl font-black text-ink-900 sm:text-3xl">
            Victoria Island, Ikoyi, Lekki & Ajah
          </h2>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {ISLAND_GUIDES.map(n => (
            <article key={n.name} className="flex flex-col rounded-2xl border border-ink-100 bg-white p-5 shadow-2xs">
              <div className="flex items-center gap-2 text-jade-700">
                <MapPin size={16} className="shrink-0" />
                <span className="text-[10.5px] font-extrabold uppercase tracking-[0.16em]">Lagos Island / Lekki</span>
              </div>
              <h3 className="mt-2 font-display text-lg font-black text-ink-900">{n.name}</h3>
              <p className="mt-0.5 text-[12px] font-bold text-ink-700">{n.tagline}</p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-ink-600">{n.body}</p>
              <Link
                to={n.href}
                className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[12px] font-extrabold text-jade-800 hover:text-jade-900"
              >
                Explore {n.name} stays <ArrowRight size={13} className="shrink-0" />
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* Available Lagos stays */}
      <section className="border-y border-ink-100 bg-clay/60 py-12 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-jade-700">Available inventory</p>
              <h2 className="mt-1.5 font-display text-3xl font-black text-ink-900 sm:text-4xl">
                Shortlets across Lagos
              </h2>
              <p className="mt-1.5 text-sm font-medium text-ink-600">
                Compare prices in Naira (₦), US Dollars ($), or British Pounds (£) and inspect full property details before requesting to book.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <CurrencyToggle />
              <Link to="/stays" className="btn-dark !py-2.5 text-[12px]">
                Filter by area & dates <ArrowRight size={14} />
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
                Try another neighbourhood or check back as more properties across Lagos Mainland and Island become available.
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
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14">
        <div className="max-w-3xl">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-jade-700">Practical booking checklist</p>
          <h2 className="mt-2 font-display text-2xl font-black text-ink-900 sm:text-3xl">
            What to check before booking in Lagos
          </h2>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { Icon: MapPin, title: 'Location & bridge routes', body: 'Check proximity to your Mainland or Island meetings, events, or family.' },
            { Icon: Zap, title: 'Power backup', body: 'Confirm whether 24/7 estate power, inverter, or generator backup is included.' },
            { Icon: Wifi, title: 'Internet', body: 'Check whether Wi-Fi or workspace arrangements suit remote work.' },
            { Icon: Lock, title: 'Access & security', body: 'Review gated street/estate entry procedures and security.' },
            { Icon: Banknote, title: 'Total price', body: 'Review cleaning charges, the 20% domestic stay markup, and refundable caution deposit upfront.' },
            { Icon: KeyRound, title: 'Check-in window', body: 'Confirm arrival hours and host or manager contact arrangements.' },
          ].map(({ Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-ink-100 bg-white p-5">
              <Icon size={20} className="shrink-0 text-jade-700" />
              <h3 className="mt-3 font-display text-base font-black text-ink-900">{title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </GuestLayout>
  );
}
