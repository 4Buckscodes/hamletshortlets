import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Building2, ShieldCheck } from 'lucide-react';
import { GuestLayout } from '../components/Navbar';
import { PropertyCard } from '../components/PropertyCard';
import { CurrencyToggle } from '../components/CurrencyToggle';
import { useHamlet } from '../lib/store';
import { useCurrency } from '../lib/currency';
import { matchesLagosAreaFilter } from '../lib/areas';
import { usePageMeta } from '../lib/brand';
import { buildLagosGuideStructuredData } from '../lib/seo';

const MAINLAND_GUIDES = [
  {
    name: 'Yaba & Environs',
    matchArea: 'Yaba',
    subareas: 'Sabo · Alagomeji · Akoka · Ebute Metta',
    body: 'Tech hubs, campuses, and fast Third Mainland Bridge access to Lagos Island.',
    href: '/stays?area=Yaba',
    img: '/images/prop/studio-1.jpg',
  },
  {
    name: 'Surulere & Environs',
    matchArea: 'Surulere',
    subareas: 'Bode Thomas · Adeniran Ogunsanya · Eric Moore',
    body: 'Tree-lined streets, creative studios, and central Mainland–Island links.',
    href: '/stays?area=Surulere',
    img: '/images/prop/bed-1.jpg',
  },
  {
    name: 'Shomolu & Environs',
    matchArea: 'Shomolu',
    subareas: 'Palmgrove · Onipanu · Gbagada · Ilupeju',
    body: 'Central Ikorodu Road and Gbagada expressway access.',
    href: '/stays?area=Shomolu',
    img: '/images/prop/kitchen-1.jpg',
  },
  {
    name: 'Ikeja & Northern Mainland',
    matchArea: 'Ikeja GRA',
    subareas: 'Ikeja GRA · Maryland · Ogudu · Magodo',
    body: 'Close to Murtala Muhammed Airport, corporate offices, and gated GRAs.',
    href: '/stays?area=Ikeja+GRA',
    img: '/images/prop/duplex.jpg',
  },
];

const ISLAND_GUIDES = [
  {
    name: 'Victoria Island',
    matchArea: 'Victoria Island',
    subareas: 'Adeola Odeku · Ahmadu Bello · Saka Tinubu',
    body: 'Business districts, conferences, embassies, and city dining.',
    href: '/stays?area=Victoria+Island',
    img: '/images/prop/living-1.jpg',
  },
  {
    name: 'Ikoyi & Banana Island',
    matchArea: 'Ikoyi',
    subareas: 'Old Ikoyi · Awolowo Road · Banana Island',
    body: 'Quiet residential apartments and penthouses with controlled access.',
    href: '/stays?area=Ikoyi',
    img: '/images/prop/penthouse.jpg',
  },
  {
    name: 'Lekki Phase 1 & Oniru',
    matchArea: 'Lekki Phase 1',
    subareas: 'Admiralty Way · Freedom Way · Oniru',
    body: 'Serviced apartments near dining, retail, and waterfront venues.',
    href: '/stays?area=Lekki+Phase+1',
    img: '/images/prop/pool-1.jpg',
  },
  {
    name: 'Ajah Corridor',
    matchArea: 'Ajah',
    subareas: 'Chevron · Orchid Road · Sangotedo',
    body: 'Spacious duplexes and apartments suited for longer stays.',
    href: '/stays?area=Ajah',
    img: '/images/prop/exterior-1.jpg',
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

const LAGOS_GUIDE_SCHEMA = buildLagosGuideStructuredData([
  ...MAINLAND_GUIDES,
  ...ISLAND_GUIDES,
]);

export default function Lagos() {
  usePageMeta(
    'Shortlets in Lagos | Mainland (Yaba, Shomolu, Surulere) & Island — HAMLET',
    'Explore shortlets across Lagos Mainland — Yaba, Shomolu, Surulere, Gbagada, Maryland, Ikeja & environs — and Lagos Island (Lekki, Victoria Island, Ikoyi, Ajah) on HAMLET.',
    { canonicalPath: '/lagos', structuredData: LAGOS_GUIDE_SCHEMA },
  );

  const { state, backendReady, backendError } = useHamlet();
  const { formatStayPrice } = useCurrency();
  const approved = state.properties.filter(p => p.status === 'approved');

  const floorPriceFor = (matchArea: string): string | null => {
    const matches = approved.filter(p => matchesLagosAreaFilter(p, matchArea));
    if (matches.length === 0) return null;
    const minRate = Math.min(...matches.map(p => p.nightlyRate));
    return formatStayPrice(Math.round(minRate * 1.2));
  };

  return (
    <GuestLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-ink-950 text-paper">
        <img
          src="/images/lagos-hero.jpg"
          alt="Lagos cityscape"
          className="absolute inset-0 h-full w-full object-cover opacity-38"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950/95 via-ink-950/80 to-ink-950/45" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="eyebrow-light">Lagos area guide</p>
          <h1 className="mt-2.5 max-w-2xl font-display text-4xl font-bold leading-[1.06] text-white sm:text-5xl">
            Lagos Mainland &amp; Island.
          </h1>
          <p className="mt-3 max-w-xl text-sm font-medium text-ink-200 sm:text-base">
            Compare verified stays across <strong className="text-brass-300">Lagos Mainland</strong> (Yaba, Shomolu, Surulere &amp; Ikeja) and <strong className="text-brass-300">Lagos Island</strong> in ₦, $, or £.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link to="/stays?area=Lagos+Mainland" className="btn-brass !rounded-full !px-6">
              Lagos Mainland <ArrowRight size={15} />
            </Link>
            <Link
              to="/stays?side=Island"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/8 px-5 py-3 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/15 [&>svg]:shrink-0"
            >
              Lagos Island
            </Link>
            <CurrencyToggle variant="dark" />
          </div>
        </div>
      </section>

      {/* Lagos Mainland */}
      <section id="lagos-mainland" className="border-b border-ink-100 bg-paper py-12 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Mainland</p>
              <h2 className="mt-1 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
                Lagos Mainland &amp; environs
              </h2>
            </div>
            <Link to="/stays?area=Lagos+Mainland" className="btn-jade !rounded-full !px-5 !py-2.5 text-xs">
              All Mainland stays <ArrowRight size={14} />
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {MAINLAND_ENVIRONS_CHIPS.map(chip => (
              <Link
                key={chip.label}
                to={chip.to}
                className="rounded-full border border-ink-200 bg-white px-3.5 py-1.5 text-xs font-bold text-ink-800 transition hover:border-ink-900 hover:bg-ink-900 hover:text-white"
              >
                {chip.label}
              </Link>
            ))}
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {MAINLAND_GUIDES.map(n => {
              const floor = floorPriceFor(n.matchArea);
              return (
                <article
                  key={n.name}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-2xs transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="relative h-38 overflow-hidden bg-clay">
                    <img
                      src={n.img}
                      alt={n.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-950/65 to-transparent" />
                    <span className="absolute bottom-3 left-3 rounded-full bg-ink-950/80 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-brass-300 backdrop-blur-md">
                      Mainland
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-display text-xl font-bold text-ink-900">{n.name}</h3>
                    <p className="mt-1 text-[11px] font-bold text-brass-700">{n.subareas}</p>
                    <p className="mt-2 text-[12.5px] leading-relaxed text-ink-600">{n.body}</p>
                    <Link
                      to={n.href}
                      className="mt-auto inline-flex items-center justify-between border-t border-ink-100 pt-3.5 text-xs font-extrabold text-ink-900 group-hover:text-brass-700"
                    >
                      <span>{floor ? `From ${floor} / night` : `Browse ${n.matchArea}`}</span>
                      <ArrowUpRight size={14} className="shrink-0" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Lagos Island */}
      <section className="border-b border-ink-100 bg-white py-12 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Island</p>
              <h2 className="mt-1 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
                Lagos Island &amp; Lekki
              </h2>
            </div>
            <Link to="/stays?side=Island" className="btn-outline !rounded-full !px-5 !py-2.5 text-xs">
              All Island stays <ArrowRight size={14} />
            </Link>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {ISLAND_GUIDES.map(n => {
              const floor = floorPriceFor(n.matchArea);
              return (
                <article
                  key={n.name}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-ink-100 bg-paper/55 shadow-2xs transition hover:-translate-y-1 hover:bg-white hover:shadow-md"
                >
                  <div className="relative h-38 overflow-hidden bg-clay">
                    <img
                      src={n.img}
                      alt={n.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-950/65 to-transparent" />
                    <span className="absolute bottom-3 left-3 rounded-full bg-ink-950/80 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-brass-300 backdrop-blur-md">
                      Island
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-display text-xl font-bold text-ink-900">{n.name}</h3>
                    <p className="mt-1 text-[11px] font-bold text-brass-700">{n.subareas}</p>
                    <p className="mt-2 text-[12.5px] leading-relaxed text-ink-600">{n.body}</p>
                    <Link
                      to={n.href}
                      className="mt-auto inline-flex items-center justify-between border-t border-ink-100 pt-3.5 text-xs font-extrabold text-ink-900 group-hover:text-brass-700"
                    >
                      <span>{floor ? `From ${floor} / night` : `Browse ${n.matchArea}`}</span>
                      <ArrowUpRight size={14} className="shrink-0" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Live Inventory Preview */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Available now</p>
            <h2 className="mt-1 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
              Shortlets across Lagos
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <CurrencyToggle />
            <Link to="/stays" className="btn-dark !rounded-full !px-5 !py-2.5 text-xs">
              Filter all stays <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {backendError ? (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-sm font-semibold text-red-800"
          >
            Could not load stays ({backendError}).
          </div>
        ) : !backendReady ? (
          <div className="mt-6 rounded-3xl border border-ink-100 bg-white px-6 py-10 text-center text-sm font-semibold text-ink-500">
            Loading stays…
          </div>
        ) : approved.length > 0 ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {approved.slice(0, 6).map(p => (
              <PropertyCard key={p.id} p={p} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-ink-100 bg-white px-6 py-10 text-center">
            <ShieldCheck size={28} className="mx-auto text-emerald-700" />
            <h3 className="mt-3 font-display text-2xl font-bold text-ink-900">
              More stays arriving soon.
            </h3>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link to="/partner/register" className="btn-jade !rounded-full">
                <Building2 size={15} /> List a property
              </Link>
            </div>
          </div>
        )}
      </section>
    </GuestLayout>
  );
}
