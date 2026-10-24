import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  Compass,
  Plane,
  ShieldCheck,
  Wifi,
} from 'lucide-react';
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
    subareas: 'Sabo · Alagomeji · Akoka · Ebute Metta · Jibowu',
    tagline: 'Tech hubs, campuses & fast Third Mainland Bridge links',
    body: 'Searching for shortlets in Yaba? Stay close to Lagos’s technology corridor, universities, medical centres, and quick Third Mainland Bridge links to Lagos Island.',
    href: '/stays?area=Yaba',
    img: '/images/prop/studio-1.jpg',
  },
  {
    name: 'Surulere & Environs',
    matchArea: 'Surulere',
    subareas: 'Bode Thomas · Adeniran Ogunsanya · Eric Moore · Aguda · Iponri',
    tagline: 'Residential calm, creative studios & central connectivity',
    body: 'Explore serviced apartments in Surulere with easy access to shopping, dining, stadiums, creative studios, and central routes connecting both Mainland and Island.',
    href: '/stays?area=Surulere',
    img: '/images/prop/bed-1.jpg',
  },
  {
    name: 'Shomolu & Environs',
    matchArea: 'Shomolu',
    subareas: 'Palmgrove · Onipanu · Pedro · Fadeyi · Gbagada · Anthony · Ilupeju',
    tagline: 'Central Ikorodu Road & Gbagada expressway corridor',
    body: 'Need a practical Mainland base around Shomolu, Palmgrove, Onipanu, or nearby Gbagada and Ilupeju? Compare power arrangements, gated parking, and proximity to commercial hubs.',
    href: '/stays?area=Shomolu',
    img: '/images/prop/kitchen-1.jpg',
  },
  {
    name: 'Ikeja & Northern Mainland',
    matchArea: 'Ikeja GRA',
    subareas: 'Ikeja GRA · Maryland · Opebi · Ogudu · Magodo',
    tagline: 'Airport proximity, corporate offices & quiet gated GRAs',
    body: 'Consider apartments in Ikeja GRA, Maryland, Ogudu, and Magodo for seamless Murtala Muhammed Airport transfers, mainland business districts, and family stays.',
    href: '/stays?area=Ikeja+GRA',
    img: '/images/prop/duplex.jpg',
  },
];

const ISLAND_GUIDES = [
  {
    name: 'Victoria Island',
    matchArea: 'Victoria Island',
    subareas: 'Adeola Odeku · Ahmadu Bello Way · Saka Tinubu · Oniru border',
    tagline: 'Corporate & diplomatic visits, conferences & city dining',
    body: 'Explore accommodation suited to corporate visits, meetings, conferences, and stays close to Lagos Island’s primary business districts.',
    href: '/stays?area=Victoria+Island',
    img: '/images/prop/living-1.jpg',
  },
  {
    name: 'Ikoyi & Banana Island',
    matchArea: 'Ikoyi',
    subareas: 'Old Ikoyi · Awolowo Road · Banana Island · Falomo',
    tagline: 'Private residential stays, controlled access & lagoon calm',
    body: 'Compare quieter residential apartments and penthouses across Ikoyi and Banana Island with documented building security, power, and parking.',
    href: '/stays?area=Ikoyi',
    img: '/images/prop/penthouse.jpg',
  },
  {
    name: 'Lekki Phase 1 & Oniru',
    matchArea: 'Lekki Phase 1',
    subareas: 'Admiralty Way · Freedom Way · Oniru waterfront',
    tagline: 'Serviced apartments near dining, lifestyle & coastal venues',
    body: 'Explore apartments close to dining spots, retail, entertainment, and coastal destinations across Lekki Phase 1 and Oniru.',
    href: '/stays?area=Lekki+Phase+1',
    img: '/images/prop/pool-1.jpg',
  },
  {
    name: 'Ajah Corridor',
    matchArea: 'Ajah',
    subareas: 'Chevron · Orchid Road · Sangotedo · Lekki–Epe axis',
    tagline: 'Spacious residential duplexes & longer family stays',
    body: 'Explore shortlets in Ajah for family visits, longer stays, and plans centred around the residential Lekki–Ajah corridor.',
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

const CORRIDOR_ANCHORS = [
  {
    title: 'Third Mainland & Carter spine',
    detail: 'Links Yaba, Ebute Metta, Shomolu & Gbagada directly into Lagos Island and Victoria Island.',
  },
  {
    title: 'Murtala Muhammed Airport axis',
    detail: 'Ikeja GRA, Maryland, Magodo & Ilupeju provide practical access for domestic and international flights.',
  },
  {
    title: 'Lekki–Oniru–Ajah corridor',
    detail: 'Stretches from Victoria Island and Oniru through Lekki Phase 1 into residential Ajah.',
  },
  {
    title: 'Verified power & access',
    detail: 'Every HAMLET listing records power backup, house rules, and Wayfinder arrival readiness upfront.',
  },
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
      {/* Editorial Hero */}
      <section className="relative overflow-hidden bg-ink-950 text-paper">
        <img
          src="/images/lagos-hero.jpg"
          alt="Lagos cityscape"
          className="absolute inset-0 h-full w-full object-cover opacity-38"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950/95 via-ink-950/80 to-ink-950/45" />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="eyebrow-light">The Lagos shortlet field guide</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold leading-[1.06] text-white sm:text-5xl">
            Where to stay across Lagos Mainland &amp; Island.
          </h1>
          <p className="mt-4 max-w-2xl text-sm font-medium leading-relaxed text-ink-200 sm:text-base">
            Eight corridors, one standard: every home published on HAMLET completes manual verification before listing. Choose your axis —{' '}
            <strong className="text-brass-300">Lagos Mainland</strong> (Yaba, Shomolu, Surulere &amp; Ikeja) or{' '}
            <strong className="text-brass-300">Lagos Island &amp; Lekki</strong> — with upfront pricing in ₦, $ and £.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link to="/stays?area=Lagos+Mainland" className="btn-brass !rounded-full !px-6">
              Explore Lagos Mainland <ArrowRight size={15} />
            </Link>
            <Link
              to="/stays?side=Island"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/8 px-5 py-3 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/15 [&>svg]:shrink-0"
            >
              Explore Lagos Island
            </Link>
            <CurrencyToggle variant="dark" />
          </div>

          {/* 4 Axis Anchors */}
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CORRIDOR_ANCHORS.map(anchor => (
              <div
                key={anchor.title}
                className="rounded-2xl border border-white/12 bg-ink-900/75 p-4 backdrop-blur-md"
              >
                <p className="text-xs font-extrabold text-brass-300">{anchor.title}</p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-ink-200">{anchor.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lagos Mainland Spotlight */}
      <section id="lagos-mainland" className="border-b border-ink-100 bg-paper py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="eyebrow">Value · connectivity · airport axis</p>
              <h2 className="mt-1.5 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
                Lagos Mainland &amp; environs
              </h2>
              <p className="mt-1.5 text-sm font-medium text-ink-600">
                Yaba, Shomolu, Surulere, Gbagada, Maryland, Ikeja GRA, and surrounding Mainland hubs.
              </p>
            </div>
            <Link to="/stays?area=Lagos+Mainland" className="btn-jade !rounded-full !px-5 !py-2.5 text-xs">
              All Mainland stays <ArrowRight size={14} />
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
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

          <div className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {MAINLAND_GUIDES.map(n => {
              const floor = floorPriceFor(n.matchArea);
              return (
                <article
                  key={n.name}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-2xs transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="relative h-40 overflow-hidden bg-clay">
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
                    <p className="mt-2 text-xs font-bold text-ink-800">{n.tagline}</p>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-600">{n.body}</p>
                    <Link
                      to={n.href}
                      className="mt-auto inline-flex items-center justify-between border-t border-ink-100 pt-3.5 text-xs font-extrabold text-ink-900 group-hover:text-brass-700"
                    >
                      <span>{floor ? `from ${floor} / night` : `Explore ${n.name.split(' ')[0]}`}</span>
                      <ArrowUpRight size={14} className="shrink-0" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Lagos Island & Lekki Corridor */}
      <section className="border-b border-ink-100 bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="eyebrow">Corporate · coastal · residential</p>
              <h2 className="mt-1.5 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
                Lagos Island &amp; Lekki corridor
              </h2>
              <p className="mt-1.5 text-sm font-medium text-ink-600">
                Victoria Island, Ikoyi, Banana Island, Lekki Phase 1, Oniru, and the Ajah corridor.
              </p>
            </div>
            <Link to="/stays?side=Island" className="btn-outline !rounded-full !px-5 !py-2.5 text-xs">
              All Island stays <ArrowRight size={14} />
            </Link>
          </div>

          <div className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {ISLAND_GUIDES.map(n => {
              const floor = floorPriceFor(n.matchArea);
              return (
                <article
                  key={n.name}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-ink-100 bg-paper/55 shadow-2xs transition hover:-translate-y-1 hover:bg-white hover:shadow-md"
                >
                  <div className="relative h-40 overflow-hidden bg-clay">
                    <img
                      src={n.img}
                      alt={n.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-950/65 to-transparent" />
                    <span className="absolute bottom-3 left-3 rounded-full bg-ink-950/80 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-brass-300 backdrop-blur-md">
                      Lagos Island
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-display text-xl font-bold text-ink-900">{n.name}</h3>
                    <p className="mt-1 text-[11px] font-bold text-brass-700">{n.subareas}</p>
                    <p className="mt-2 text-xs font-bold text-ink-800">{n.tagline}</p>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-600">{n.body}</p>
                    <Link
                      to={n.href}
                      className="mt-auto inline-flex items-center justify-between border-t border-ink-100 pt-3.5 text-xs font-extrabold text-ink-900 group-hover:text-brass-700"
                    >
                      <span>{floor ? `from ${floor} / night` : `Explore ${n.name}`}</span>
                      <ArrowUpRight size={14} className="shrink-0" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Traveller Decision Cards */}
      <section className="border-b border-ink-100 bg-clay/50 py-12 sm:py-14">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:px-6 md:grid-cols-3">
          <div className="rounded-3xl border border-ink-100 bg-white p-6">
            <Compass size={20} className="text-brass-600" />
            <h3 className="mt-3 font-display text-lg font-bold text-ink-900">First visit to Lagos?</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">
              Compare Victoria Island or Lekki Phase 1 for business and coastal dining, or Yaba and Surulere for central Mainland access across bridges.
            </p>
          </div>
          <div className="rounded-3xl border border-ink-100 bg-white p-6">
            <Wifi size={20} className="text-brass-600" />
            <h3 className="mt-3 font-display text-lg font-bold text-ink-900">Working remotely?</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">
              Filter by <strong>24/7 Power</strong> + <strong>Workspace</strong> + <strong>Wi-Fi</strong> on the search page to verify backup power and desk setup before requesting dates.
            </p>
          </div>
          <div className="rounded-3xl border border-ink-100 bg-white p-6">
            <Plane size={20} className="text-brass-600" />
            <h3 className="mt-3 font-display text-lg font-bold text-ink-900">Arriving via MMIA?</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">
              Ikeja GRA, Maryland, and Magodo keep airport transfers short — and every confirmed stay includes Wayfinder arrival instructions.
            </p>
          </div>
        </div>
      </section>

      {/* Live Inventory Preview */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Available inventory</p>
            <h2 className="mt-1.5 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
              Shortlets across Lagos
            </h2>
            <p className="mt-1 text-sm font-medium text-ink-600">
              Compare prices in Naira (₦), US Dollars ($), or British Pounds (£) and review full property details before requesting to book.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <CurrencyToggle />
            <Link to="/stays" className="btn-dark !rounded-full !px-5 !py-2.5 text-xs">
              Filter by area &amp; dates <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {backendError ? (
          <div
            role="alert"
            className="mt-7 rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-sm font-semibold text-red-800"
          >
            Something didn’t go as planned loading Lagos stays: {backendError}
          </div>
        ) : !backendReady ? (
          <div className="mt-7 rounded-3xl border border-ink-100 bg-white px-6 py-10 text-center text-sm font-semibold text-ink-500">
            Finding spaces that fit your plans…
          </div>
        ) : approved.length > 0 ? (
          <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {approved.slice(0, 6).map(p => (
              <PropertyCard key={p.id} p={p} />
            ))}
          </div>
        ) : (
          <div className="mt-7 rounded-3xl border border-ink-100 bg-white px-6 py-12 text-center sm:px-10">
            <ShieldCheck size={30} className="mx-auto text-emerald-700" />
            <h3 className="mt-3 font-display text-2xl font-bold text-ink-900">
              We’re still adding stays in this area.
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-sm font-medium leading-relaxed text-ink-500">
              Try another neighbourhood or check back as more verified properties across Lagos Mainland and Island complete inspection.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/partner/register" className="btn-jade !rounded-full">
                <Building2 size={15} /> List your Lagos property
              </Link>
              <Link to="/how-it-works" className="btn-outline !rounded-full">
                How HAMLET works
              </Link>
            </div>
          </div>
        )}
      </section>
    </GuestLayout>
  );
}
