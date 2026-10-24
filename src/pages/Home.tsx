import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  Compass,
  Lock,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
} from 'lucide-react';
import { GuestLayout } from '../components/Navbar';
import { PropertyCard } from '../components/PropertyCard';
import { CurrencyToggle } from '../components/CurrencyToggle';
import { useHoratio } from '../components/HoratioDrawer';
import { useHamlet } from '../lib/store';
import { useCurrency } from '../lib/currency';
import {
  ISLAND_AND_LEKKI_AREAS,
  isMainlandProperty,
  MAINLAND_AREAS,
  matchesLagosAreaFilter,
} from '../lib/areas';
import {
  addDaysToIsoDate,
  calculateGuestPricing,
  calculateMarkupAllocation,
  formatNaira,
  lagosIsoDateOffset,
} from '../lib/pricing';
import {
  HAMLET_BRAND_NAME,
  HAMLET_MANTRA,
  HAMLET_TAGLINE,
  HAMLET_USP,
  usePageMeta,
} from '../lib/brand';

const HERO_ISLAND_CHIPS = [
  'Victoria Island',
  'Ikoyi',
  'Lekki Phase 1',
  'Oniru',
  'Banana Island',
  'Ajah',
] as const;

const HERO_MAINLAND_CHIPS = [
  'Lagos Mainland',
  'Yaba',
  'Surulere',
  'Shomolu',
  'Ikeja GRA',
  'Gbagada',
  'Maryland',
] as const;

const QUICK_AREAS = [
  { label: 'All Lagos', match: '' },
  { label: 'Lagos Mainland', match: 'Lagos Mainland' },
  { label: 'Yaba', match: 'Yaba' },
  { label: 'Surulere', match: 'Surulere' },
  { label: 'Shomolu', match: 'Shomolu' },
  { label: 'Ikeja GRA', match: 'Ikeja GRA' },
  { label: 'Gbagada', match: 'Gbagada' },
  { label: 'Victoria Island', match: 'Victoria Island' },
  { label: 'Ikoyi', match: 'Ikoyi' },
  { label: 'Lekki Phase 1', match: 'Lekki Phase 1' },
  { label: 'Oniru', match: 'Oniru' },
  { label: 'Ajah', match: 'Ajah' },
] as const;

const QUICK_AMENITIES = ['24/7 Power', 'Wifi', 'Pool', 'Workspace'] as const;

const MARQUEE_ITEMS = [
  'Shortlets, with accountability',
  '48h payment hold — pay only after host confirms availability',
  '0% owner fee — owners keep 100% of listed NGN rate',
  'Lagos Mainland: Yaba, Shomolu, Surulere, Ikeja & environs',
  'Lagos Island: Victoria Island, Ikoyi, Lekki Phase 1, Oniru & Ajah',
  'Paystack signed server-webhook confirmation only',
  'Refundable caution deposit tracked separately & reviewed post-checkout',
  'Wayfinder step-by-step arrival guidance unlocked on confirmation',
] as const;

const CEREMONY_STEPS = [
  {
    num: '01',
    title: 'Request the home',
    body: 'Choose your dates, guest count, and display currency (₦, $ or £). Acknowledge house rules and caution deposit terms — zero card charge.',
  },
  {
    num: '02',
    title: 'Availability locked',
    body: 'The property owner, authorised partner, or HAMLET operations confirms your dates and terms before checkout ever opens.',
  },
  {
    num: '03',
    title: '48h Paystack window',
    body: 'Pay inside your account within 48 hours. Reservations confirm exclusively via Paystack’s signed server-side webhook — never screenshots.',
  },
  {
    num: '04',
    title: 'Arrive & settle in',
    body: 'Verified Wayfinder entrance pins, compound turns, and check-in instructions unlock in your account through check-out.',
  },
] as const;

const NEIGHBOURHOOD_FIELD_GUIDE = [
  {
    corridor: 'Lagos Mainland',
    name: 'Yaba & Environs',
    matchArea: 'Yaba',
    subareas: 'Sabo, Alagomeji, Akoka, Ebute Metta, Jibowu',
    href: '/stays?area=Yaba',
    img: '/images/prop/studio-1.jpg',
  },
  {
    corridor: 'Lagos Mainland',
    name: 'Surulere & Environs',
    matchArea: 'Surulere',
    subareas: 'Bode Thomas, Adeniran Ogunsanya, Eric Moore, Aguda',
    href: '/stays?area=Surulere',
    img: '/images/prop/bed-1.jpg',
  },
  {
    corridor: 'Lagos Mainland',
    name: 'Shomolu & Environs',
    matchArea: 'Shomolu',
    subareas: 'Palmgrove, Onipanu, Pedro, Gbagada & Ilupeju',
    href: '/stays?area=Shomolu',
    img: '/images/prop/kitchen-1.jpg',
  },
  {
    corridor: 'Lagos Mainland',
    name: 'Ikeja & Northern Mainland',
    matchArea: 'Ikeja GRA',
    subareas: 'Ikeja GRA, Maryland, Opebi, Ogudu, Magodo',
    href: '/stays?area=Ikeja+GRA',
    img: '/images/prop/duplex.jpg',
  },
  {
    corridor: 'Lagos Island',
    name: 'Victoria Island',
    matchArea: 'Victoria Island',
    subareas: 'Adeola Odeku, Ahmadu Bello Way, Oniru border',
    href: '/stays?area=Victoria+Island',
    img: '/images/prop/living-1.jpg',
  },
  {
    corridor: 'Lagos Island',
    name: 'Ikoyi & Banana Island',
    matchArea: 'Ikoyi',
    subareas: 'Old Ikoyi, Awolowo Road, Banana Island, Falomo',
    href: '/stays?area=Ikoyi',
    img: '/images/prop/penthouse.jpg',
  },
  {
    corridor: 'Lagos Island',
    name: 'Lekki Phase 1 & Oniru',
    matchArea: 'Lekki Phase 1',
    subareas: 'Admiralty Way, Freedom Way, Oniru waterfront',
    href: '/stays?area=Lekki+Phase+1',
    img: '/images/prop/pool-1.jpg',
  },
  {
    corridor: 'Lagos Island',
    name: 'Ajah Corridor',
    matchArea: 'Ajah',
    subareas: 'Chevron, Orchid Road, Sangotedo, Lekki–Ajah axis',
    href: '/stays?area=Ajah',
    img: '/images/prop/exterior-1.jpg',
  },
] as const;

export default function Home() {
  usePageMeta(
    'HAMLET Shortlets | Find Your Next Stay in Lagos',
    'Explore shortlets across Lagos Mainland (Yaba, Shomolu, Surulere, Ikeja & environs) and Lagos Island (Lekki, Victoria Island, Ikoyi & Ajah) on HAMLET.',
  );

  const { state, backendReady, backendError, backendConfigured } = useHamlet();
  const { formatStayPrice, currency } = useCurrency();
  const { openHoratio } = useHoratio();
  const navigate = useNavigate();

  const today = lagosIsoDateOffset(0);
  const [heroCorridor, setHeroCorridor] = useState<'all' | 'island' | 'mainland'>('all');
  const [area, setArea] = useState('');
  const [checkIn, setCheckIn] = useState(() => lagosIsoDateOffset(1));
  const [checkOut, setCheckOut] = useState(() => lagosIsoDateOffset(3));
  const [guests, setGuests] = useState(2);

  // Marketplace board filters
  const [boardSide, setBoardSide] = useState<'all' | 'mainland' | 'island'>('all');
  const [activeAreaFilter, setActiveAreaFilter] = useState('');
  const [activeAmenity, setActiveAmenity] = useState('');

  // Interactive pricing calculator state (uses central calculateMarkupAllocation)
  const [sampleOwnerRate, setSampleOwnerRate] = useState(200_000);
  const [sampleHasReferrer, setSampleHasReferrer] = useState(true);

  const approved = useMemo(
    () => state.properties.filter(property => property.status === 'approved'),
    [state.properties],
  );

  const filteredMarketplace = useMemo(() => {
    return approved.filter(p => {
      if (boardSide === 'mainland' && !isMainlandProperty(p)) return false;
      if (boardSide === 'island' && isMainlandProperty(p)) return false;
      if (activeAreaFilter && !matchesLagosAreaFilter(p, activeAreaFilter)) {
        return false;
      }
      if (activeAmenity && !p.amenities.includes(activeAmenity)) return false;
      return true;
    });
  }, [approved, boardSide, activeAreaFilter, activeAmenity]);

  const displayedStays = filteredMarketplace.slice(0, 9);
  const minCheckOut = addDaysToIsoDate(checkIn, 1);

  // Walkthrough preview uses real approved listing if available, or transparent example math
  const spotlightStay = approved[0] ?? null;
  const walkthroughPricing = useMemo(() => {
    const baseRate = spotlightStay ? spotlightStay.nightlyRate * 3 : 450_000;
    const charges = spotlightStay ? spotlightStay.mandatoryCharges : [];
    const deposit = spotlightStay ? spotlightStay.deposit : 150_000;
    return calculateGuestPricing({
      accommodationSubtotal: baseRate,
      mandatoryCharges: charges,
      refundableDeposit: deposit,
    });
  }, [spotlightStay]);

  // Interactive calculator powered strictly by central pricing engine
  const sliderAllocation = useMemo(
    () =>
      calculateMarkupAllocation({
        ownerListedPriceNgn: sampleOwnerRate,
        hasClosingAgent: true,
        hasEligibleReferrer: sampleHasReferrer,
      }),
    [sampleOwnerRate, sampleHasReferrer],
  );

  const corridorFloorPrice = (matchArea: string): string | null => {
    const matching = approved.filter(p => matchesLagosAreaFilter(p, matchArea));
    if (matching.length === 0) return null;
    const minOwnerRate = Math.min(...matching.map(p => p.nightlyRate));
    return formatStayPrice(Math.round(minOwnerRate * 1.2));
  };

  const search = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = new URLSearchParams();
    if (area) query.set('area', area);
    else if (heroCorridor === 'mainland') query.set('area', 'Lagos Mainland');
    else if (heroCorridor === 'island') query.set('side', 'Island');
    query.set('checkIn', checkIn);
    query.set('checkOut', checkOut);
    query.set('guests', String(guests));
    navigate(`/stays?${query.toString()}`);
  };

  const heroQuickChips =
    heroCorridor === 'mainland'
      ? HERO_MAINLAND_CHIPS
      : heroCorridor === 'island'
        ? HERO_ISLAND_CHIPS
        : (['Lagos Mainland', 'Yaba', 'Surulere', 'Shomolu', 'Victoria Island', 'Ikoyi', 'Lekki Phase 1'] as const);

  return (
    <GuestLayout>
      {/* ── 1. Split Editorial Hero + Corridor Search Bar ────────────────── */}
      <section className="relative overflow-hidden bg-ink-950 text-paper">
        <img
          src="/images/lagos-hero.jpg"
          alt="Lagos skyline and shortlet corridor"
          className="absolute inset-0 h-full w-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-ink-950/95 via-ink-950/84 to-ink-900/75" />

        <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6 sm:pb-14 sm:pt-12">
          <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-10">
            {/* Left Editorial Column */}
            <div className="lg:col-span-7">
              <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-white/15 bg-white/6 px-3.5 py-1.5 backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-brass-400 live-dot" />
                <span className="text-[10.5px] font-extrabold uppercase tracking-[0.2em] text-brass-300">
                  {HAMLET_BRAND_NAME} · {HAMLET_USP}
                </span>
              </div>

              <h1 className="mt-4 font-display text-4xl font-bold leading-[1.04] tracking-tight text-white sm:text-5xl lg:text-[58px]">
                Lagos is big.{' '}
                <span className="block italic text-brass-300">{HAMLET_TAGLINE}</span>
              </h1>

              <p className="mt-4 max-w-xl text-sm font-medium leading-relaxed text-ink-200 sm:text-[15.5px]">
                Verified shortlets across <strong className="text-white">Lagos Mainland</strong> (Yaba, Shomolu, Surulere &amp; Ikeja) and <strong className="text-white">Lagos Island</strong> (Victoria Island, Ikoyi, Lekki &amp; Ajah) — upfront pricing in ₦, $ and £, and zero payment until your dates are confirmed.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <a href="#stay-search" className="btn-brass !rounded-full !px-6 !py-3.5">
                  Find my stay <ArrowRight size={16} />
                </a>
                <Link
                  to="/how-it-works"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/6 px-5 py-3.5 text-sm font-bold text-white backdrop-blur-md transition hover:border-white/40 hover:bg-white/12 [&>svg]:shrink-0"
                >
                  How HAMLET works
                </Link>
                <button
                  type="button"
                  onClick={() => openHoratio('Stays in Lagos Mainland with 24/7 power')}
                  className="inline-flex items-center gap-1.5 rounded-full border border-brass-400/35 bg-ink-900/80 px-4 py-3 text-xs font-bold text-brass-300 transition hover:border-brass-400 hover:text-white [&>svg]:shrink-0"
                >
                  <Sparkles size={14} /> Ask Horatio
                </button>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-5 text-[11.5px] font-semibold text-ink-300">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck size={14} className="shrink-0 text-brass-400" />
                  NDPR-aligned verification
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Lock size={14} className="shrink-0 text-brass-400" />
                  Paystack webhook-secured
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Banknote size={14} className="shrink-0 text-brass-400" />
                  0% owner fee
                </span>
                {!backendConfigured && (
                  <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                    Demo seed preview
                  </span>
                )}
              </div>
            </div>

            {/* Right Interactive Ceremony Preview Card */}
            <div className="lg:col-span-5">
              <div className="overflow-hidden rounded-3xl border border-white/15 bg-ink-900/88 p-5 shadow-2xl backdrop-blur-xl sm:p-6">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-brass-400/35 bg-brass-500/12 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-brass-300">
                    <Clock size={11} className="shrink-0" />
                    Booking ceremony walkthrough
                  </span>
                  <span className="font-mono text-[10.5px] font-bold text-ink-300">
                    3 nights · {currency}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-3.5 rounded-2xl border border-white/10 bg-ink-950/75 p-3">
                  <img
                    src={spotlightStay?.images[0] ?? '/images/prop/living-1.jpg'}
                    alt={spotlightStay?.title ?? 'Verified Lagos apartment preview'}
                    className="h-14 w-16 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-[15px] font-bold text-white">
                      {spotlightStay ? spotlightStay.title : 'Verified Lagos Residence (Sample)'}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] font-medium text-ink-300">
                      {spotlightStay
                        ? `${spotlightStay.area} · ${spotlightStay.trustLabel}`
                        : 'Ownership, identity, authority & inspection reviewed'}
                    </p>
                  </div>
                </div>

                <ol className="mt-4 space-y-2.5 text-[12px]">
                  <li className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/4 px-3.5 py-2.5">
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-400" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white">1. Request submitted — ₦0 charged</p>
                      <p className="text-[11px] text-ink-300">House rules &amp; refundable deposit terms acknowledged</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/4 px-3.5 py-2.5">
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-400" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white">2. Availability confirmed by host</p>
                      <p className="text-[11px] text-ink-300">Calendar checked · 48-hour payment hold opened</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3 rounded-xl border border-brass-400/45 bg-brass-500/12 px-3.5 py-2.5">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brass-500 font-mono text-[10px] font-black text-ink-950">
                      3
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-brass-200">Pay within 48h window</p>
                      <p className="text-[11px] text-ink-200">
                        Confirmed only by Paystack server webhook · Wayfinder unlocks
                      </p>
                    </div>
                  </li>
                </ol>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-400">
                      3-night stay quote
                    </p>
                    <p className="font-display text-xl font-bold tabular-nums text-white">
                      {formatStayPrice(walkthroughPricing.guestTotal)}
                      <span className="ml-1.5 font-sans text-[11px] font-medium text-ink-300">
                        + {formatNaira(walkthroughPricing.refundableDeposit)} deposit
                      </span>
                    </p>
                  </div>
                  {spotlightStay ? (
                    <Link
                      to={`/stays/${spotlightStay.id}`}
                      className="btn-brass !rounded-full !px-4 !py-2 text-xs"
                    >
                      Inspect home <ArrowUpRight size={14} />
                    </Link>
                  ) : (
                    <Link to="/how-it-works" className="btn-brass !rounded-full !px-4 !py-2 text-xs">
                      See full process <ArrowUpRight size={14} />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Corridor-Tabbed Search Console */}
          <div
            id="stay-search"
            className="mt-8 scroll-mt-24 rounded-3xl border border-white/15 bg-white p-3 text-ink-900 shadow-[0_24px_60px_-20px_rgba(9,21,40,0.65)] sm:p-4"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 pb-3">
              <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Lagos corridor">
                {[
                  { id: 'all', label: 'All Lagos' },
                  { id: 'mainland', label: 'Lagos Mainland' },
                  { id: 'island', label: 'Lagos Island & Lekki' },
                ].map(tab => {
                  const active = heroCorridor === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => {
                        setHeroCorridor(tab.id as 'all' | 'island' | 'mainland');
                        if (tab.id === 'mainland') setArea('Lagos Mainland');
                        else if (tab.id === 'all') setArea('');
                        else setArea('');
                      }}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                        active
                          ? 'bg-ink-900 text-white'
                          : 'bg-paper text-ink-700 hover:bg-clay'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-800">
                <ShieldCheck size={14} className="shrink-0 text-emerald-700" />
                <span>Approved &amp; reviewed homes only</span>
              </div>
            </div>

            {/* Quick Neighbourhood Chips */}
            <div className="mb-3 flex items-center gap-1.5 overflow-x-auto overscroll-x-contain pb-1">
              <span className="shrink-0 text-[10.5px] font-extrabold uppercase tracking-wider text-ink-400">
                Quick pick:
              </span>
              {heroQuickChips.map(chip => {
                const selected = area === chip;
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setArea(selected ? '' : chip)}
                    className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold transition ${
                      selected
                        ? 'border-brass-600 bg-brass-500 text-ink-950'
                        : 'border-ink-200 bg-paper/70 text-ink-700 hover:border-ink-400'
                    }`}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>

            <form
              onSubmit={search}
              className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-12"
            >
              <label className="flex min-h-14 items-center gap-2.5 rounded-2xl border border-ink-200 bg-paper/60 px-3.5 py-2 transition focus-within:border-ink-900 focus-within:bg-white lg:col-span-4">
                <MapPin size={17} className="shrink-0 text-brass-600" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[9.5px] font-extrabold uppercase tracking-widest text-ink-500">
                    Where in Lagos
                  </span>
                  <select
                    value={area}
                    onChange={event => setArea(event.target.value)}
                    aria-label="Where would you like to stay?"
                    className="w-full bg-transparent text-[13px] font-bold text-ink-900 outline-none"
                  >
                    <option value="">All Lagos areas</option>
                    <optgroup label="Lagos Mainland & Environs">
                      {MAINLAND_AREAS.map(destination => (
                        <option key={destination} value={destination}>
                          {destination === 'Lagos Mainland'
                            ? 'Lagos Mainland (Yaba, Shomolu, Surulere & environs)'
                            : destination}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Lagos Island & Lekki Corridor">
                      {ISLAND_AND_LEKKI_AREAS.map(destination => (
                        <option key={destination} value={destination}>
                          {destination}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </span>
              </label>

              <label className="flex min-h-14 min-w-0 items-center gap-2.5 rounded-2xl border border-ink-200 bg-paper/60 px-3.5 py-2 transition focus-within:border-ink-900 focus-within:bg-white lg:col-span-2">
                <CalendarDays size={16} className="shrink-0 text-brass-600" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[9.5px] font-extrabold uppercase tracking-widest text-ink-500">
                    Check in
                  </span>
                  <input
                    type="date"
                    required
                    value={checkIn}
                    min={today}
                    aria-label="Check-in date"
                    onChange={event => {
                      const nextCheckIn = event.target.value;
                      setCheckIn(nextCheckIn);
                      if (checkOut <= nextCheckIn) setCheckOut(addDaysToIsoDate(nextCheckIn, 2));
                    }}
                    className="w-full min-w-0 bg-transparent text-[12.5px] font-bold text-ink-900 outline-none"
                  />
                </span>
              </label>

              <label className="flex min-h-14 min-w-0 items-center gap-2.5 rounded-2xl border border-ink-200 bg-paper/60 px-3.5 py-2 transition focus-within:border-ink-900 focus-within:bg-white lg:col-span-2">
                <CalendarDays size={16} className="shrink-0 text-brass-600" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[9.5px] font-extrabold uppercase tracking-widest text-ink-500">
                    Check out
                  </span>
                  <input
                    type="date"
                    required
                    value={checkOut}
                    min={minCheckOut}
                    aria-label="Check-out date"
                    onChange={event => setCheckOut(event.target.value)}
                    className="w-full min-w-0 bg-transparent text-[12.5px] font-bold text-ink-900 outline-none"
                  />
                </span>
              </label>

              <label className="flex min-h-14 items-center gap-2.5 rounded-2xl border border-ink-200 bg-paper/60 px-3.5 py-2 transition focus-within:border-ink-900 focus-within:bg-white lg:col-span-2">
                <Users size={16} className="shrink-0 text-brass-600" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[9.5px] font-extrabold uppercase tracking-widest text-ink-500">
                    Guests
                  </span>
                  <select
                    value={guests}
                    onChange={event => setGuests(Number(event.target.value))}
                    aria-label="Guests"
                    className="w-full bg-transparent text-[13px] font-bold text-ink-900 outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(count => (
                      <option key={count} value={count}>
                        {count} guest{count === 1 ? '' : 's'}
                      </option>
                    ))}
                  </select>
                </span>
              </label>

              <button
                type="submit"
                className="btn-dark min-h-14 w-full !rounded-2xl sm:col-span-2 lg:col-span-2"
              >
                <Search size={16} /> Search stays
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ── 2. Editorial Ticker / Marquee Strip ──────────────────────────── */}
      <div className="overflow-hidden border-b border-ink-100 bg-ink-900 py-2.5 text-[11.5px] font-semibold text-ink-200">
        <div className="hamlet-marquee-track gap-8 px-4">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, idx) => (
            <span key={`${item}-${idx}`} className="inline-flex shrink-0 items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-brass-400" aria-hidden="true" />
              <span>{item}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── 3. The HAMLET Board (Primary Marketplace) ────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Inspected &amp; listed</p>
            <h2 className="mt-1.5 font-display text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
              On the HAMLET board
            </h2>
            <p className="mt-1 text-xs font-medium text-ink-500 sm:text-[13px]">
              {!backendReady
                ? 'Finding spaces that fit your plans…'
                : approved.length > 0
                  ? `${filteredMarketplace.length} approved stay${filteredMarketplace.length === 1 ? '' : 's'}${activeAreaFilter ? ` in ${activeAreaFilter}` : ''} · upfront guest pricing in ${currency} (0% owner fee)`
                  : 'Verified Lagos Mainland & Island apartments · manual review before listing'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Corridor switcher: All / Mainland / Island */}
            <div className="inline-flex rounded-full border border-ink-200 bg-white p-1 shadow-2xs">
              {[
                { id: 'all', label: 'All' },
                { id: 'mainland', label: 'Mainland' },
                { id: 'island', label: 'Island' },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setBoardSide(tab.id as 'all' | 'mainland' | 'island')}
                  className={`rounded-full px-3.5 py-1 text-xs font-bold transition ${
                    boardSide === tab.id
                      ? 'bg-ink-900 text-white'
                      : 'text-ink-600 hover:text-ink-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <CurrencyToggle />
            <Link to="/stays" className="btn-outline !rounded-full !px-4 !py-2 text-xs">
              <SlidersHorizontal size={14} /> All filters
            </Link>
          </div>
        </div>

        {/* Quick horizontal neighbourhood & amenity filter bar */}
        <div className="mt-5 flex items-center gap-2 overflow-x-auto overscroll-x-contain pb-2">
          {QUICK_AREAS.map(item => {
            const active = activeAreaFilter === item.match;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => setActiveAreaFilter(item.match)}
                className={`inline-flex min-h-9 shrink-0 items-center rounded-full border px-3.5 text-xs font-bold transition ${
                  active
                    ? 'border-ink-900 bg-ink-900 text-white'
                    : 'border-ink-200 bg-white text-ink-700 hover:border-ink-400'
                }`}
              >
                {item.label}
              </button>
            );
          })}
          <span className="mx-1 h-4 w-px shrink-0 bg-ink-200" aria-hidden="true" />
          {QUICK_AMENITIES.map(amenity => {
            const active = activeAmenity === amenity;
            return (
              <button
                key={amenity}
                type="button"
                onClick={() => setActiveAmenity(active ? '' : amenity)}
                className={`inline-flex min-h-9 shrink-0 items-center rounded-full border px-3.5 text-xs font-semibold transition ${
                  active
                    ? 'border-brass-600 bg-brass-500 text-ink-950'
                    : 'border-ink-200 bg-clay/70 text-ink-700 hover:border-brass-500'
                }`}
              >
                {amenity === 'Wifi' ? 'Wi-Fi' : amenity}
              </button>
            );
          })}
        </div>

        {/* Marketplace Grid */}
        {backendError ? (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-sm font-semibold text-red-800"
          >
            Something didn’t go as planned loading stays: {backendError}
          </div>
        ) : !backendReady ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(n => (
              <div
                key={n}
                className="h-92 animate-pulse rounded-3xl border border-ink-100 bg-white p-4"
              >
                <div className="aspect-[16/11] rounded-2xl bg-ink-100" />
                <div className="mt-4 h-4 w-3/4 rounded bg-ink-100" />
                <div className="mt-2 h-3 w-1/2 rounded bg-ink-100" />
              </div>
            ))}
          </div>
        ) : displayedStays.length > 0 ? (
          <>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {displayedStays.map(property => (
                <PropertyCard key={property.id} p={property} />
              ))}
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-6">
              <p className="text-xs font-medium text-ink-500">
                Showing {displayedStays.length} of {filteredMarketplace.length} matching Lagos stay
                {filteredMarketplace.length === 1 ? '' : 's'}.
              </p>
              <Link to="/stays" className="btn-jade !rounded-full !px-5 !py-2.5 text-xs">
                View all approved stays <ArrowRight size={14} />
              </Link>
            </div>
          </>
        ) : approved.length > 0 ? (
          <div className="mt-6 rounded-3xl border border-ink-100 bg-white px-6 py-12 text-center shadow-2xs">
            <p className="font-display text-xl font-bold text-ink-900">
              No stays match that quick filter.
            </p>
            <p className="mt-1 text-xs font-medium text-ink-500">
              Reset quick filters or open the full search to explore all available homes.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setBoardSide('all');
                  setActiveAreaFilter('');
                  setActiveAmenity('');
                }}
                className="btn-jade !rounded-full !py-2.5 text-xs"
              >
                Show all stays ({approved.length})
              </button>
              <Link to="/stays" className="btn-outline !rounded-full !py-2.5 text-xs">
                Full search
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-ink-100 bg-white px-6 py-12 text-center shadow-2xs sm:px-10">
            <span className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-emerald-800">
              <ShieldCheck size={13} className="shrink-0" /> Verified Lagos supply onboarding
            </span>
            <h3 className="mt-3 font-display text-2xl font-bold text-ink-900">
              We’re onboarding verified Lagos Mainland &amp; Island stays now.
            </h3>
            <p className="mx-auto mt-2 max-w-lg text-[13px] font-medium leading-relaxed text-ink-500">
              Every apartment across Yaba, Shomolu, Surulere, Ikeja, Lekki, Victoria Island &amp; Ikoyi completes manual document and inspection review before appearing publicly.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
              <Link to="/stays" className="btn-jade !rounded-full !py-2.5 text-xs">
                Open marketplace search <ArrowRight size={14} />
              </Link>
              <Link to="/partner/register" className="btn-outline !rounded-full !py-2.5 text-xs">
                List your Lagos property
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* ── 4. The HAMLET Ceremony (01–04) ───────────────────────────────── */}
      <section className="border-y border-ink-100 bg-white py-14 sm:py-18">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">The HAMLET ceremony</p>
              <h2 className="mt-1.5 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
                Request → confirm → stay.
              </h2>
            </div>
            <Link
              to="/how-it-works"
              className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-paper px-4 py-2 text-xs font-bold text-ink-900 transition hover:border-ink-900 [&>svg]:shrink-0"
            >
              Full walkthrough <ArrowRight size={14} />
            </Link>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CEREMONY_STEPS.map(step => (
              <article
                key={step.num}
                className="flex flex-col rounded-3xl border border-ink-100 bg-paper/65 p-6 transition hover:border-brass-400 hover:bg-white hover:shadow-sm"
              >
                <span className="font-mono text-xs font-extrabold tracking-widest text-brass-600">
                  {step.num}
                </span>
                <h3 className="mt-3 font-display text-xl font-bold text-ink-900">{step.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-600">{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. Neighbourhood Field Guide (Mainland + Island) ─────────────── */}
      <section className="bg-paper py-14 sm:py-18">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Know your Lagos</p>
              <h2 className="mt-1.5 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
                Neighbourhood field guide
              </h2>
              <p className="mt-1 text-[13px] font-medium text-ink-500">
                Lagos Mainland (Yaba, Shomolu, Surulere &amp; Ikeja) and Lagos Island &amp; Lekki corridors
              </p>
            </div>
            <Link
              to="/lagos"
              className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-4 py-2 text-xs font-bold text-ink-900 transition hover:border-ink-900 [&>svg]:shrink-0"
            >
              Open full Lagos guide <ArrowRight size={14} />
            </Link>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {NEIGHBOURHOOD_FIELD_GUIDE.map(card => {
              const floor = corridorFloorPrice(card.matchArea);
              return (
                <Link
                  key={card.name}
                  to={card.href}
                  className="group relative flex min-h-60 flex-col justify-end overflow-hidden rounded-3xl border border-ink-200/80 bg-ink-950 p-5 text-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <img
                    src={card.img}
                    alt={card.name}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover opacity-65 transition duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/55 to-transparent" />
                  <div className="relative">
                    <span className="inline-block rounded-full border border-white/20 bg-ink-950/65 px-2.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-brass-300 backdrop-blur-md">
                      {card.corridor}
                    </span>
                    <h3 className="mt-2 font-display text-xl font-bold leading-snug text-white">
                      {card.name}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-[11.5px] font-medium text-ink-200">
                      {card.subareas}
                    </p>
                    <div className="mt-3 flex items-center justify-between border-t border-white/15 pt-2.5 text-[11.5px] font-bold text-brass-300">
                      <span>{floor ? `from ${floor} / night` : 'Explore corridor stays'}</span>
                      <ArrowUpRight
                        size={14}
                        className="shrink-0 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 6. Interactive Pricing Transparency ("Every naira, accounted for") */}
      <section className="border-t border-ink-100 bg-clay/55 py-14 sm:py-18">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-5">
              <p className="eyebrow">Radical transparency</p>
              <h2 className="mt-2 font-display text-3xl font-bold leading-tight text-ink-900 sm:text-4xl">
                Every naira, accounted for.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-600">
                Owners pay <strong className="text-ink-900">0%</strong> and receive 100% of their listed NGN accommodation rate (<strong>B</strong>). Domestic guests pay <strong>B × 1.20</strong> — with every allocation recorded transparently in the HAMLET settlement ledger.
              </p>

              <ul className="mt-5 space-y-2.5 text-[13px] font-semibold text-ink-800">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-700" />
                  <span>Owner keeps 100% of listed rate B (0% owner fee)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-700" />
                  <span>
                    Refundable caution deposit itemised separately — never marked up, buffered, or described as instant; refunded after post-checkout inspection
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-700" />
                  <span>
                    USD ($) &amp; GBP (£) quotes add a single 10% international buffer and settle in NGN via Paystack
                  </span>
                </li>
              </ul>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/legal/pricing" className="btn-outline !rounded-full !bg-white !px-5 !py-2.5 text-xs">
                  Read full fees &amp; settlement policy <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-3xl border border-ink-200 bg-white p-5 shadow-md sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <label
                      htmlFor="owner-rate-slider"
                      className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-500"
                    >
                      Slide owner’s listed rate (B)
                    </label>
                    <p className="mt-0.5 font-display text-3xl font-bold tabular-nums text-ink-900">
                      {formatNaira(sliderAllocation.ownerListedPriceNgn)}
                      <span className="ml-1.5 font-sans text-xs font-semibold text-ink-400">
                        owner receives 100%
                      </span>
                    </p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-ink-200 bg-paper px-3 py-1.5 text-[11.5px] font-bold text-ink-800">
                    <input
                      type="checkbox"
                      checked={sampleHasReferrer}
                      onChange={e => setSampleHasReferrer(e.target.checked)}
                      className="h-3.5 w-3.5 accent-[#C9A44A]"
                    />
                    <span>Active 90d partner referrer</span>
                  </label>
                </div>

                <input
                  id="owner-rate-slider"
                  type="range"
                  min={30_000}
                  max={500_000}
                  step={5_000}
                  value={sampleOwnerRate}
                  onChange={e => setSampleOwnerRate(Number(e.target.value))}
                  className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-ink-100 accent-[#0E1F3B]"
                />
                <div className="mt-1 flex justify-between font-mono text-[10.5px] font-bold text-ink-400">
                  <span>₦30k</span>
                  <span>₦250k</span>
                  <span>₦500k</span>
                </div>

                <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2 rounded-2xl bg-ink-950 px-4 py-3.5 text-white sm:px-5">
                  <span className="text-xs font-bold uppercase tracking-wider text-brass-300">
                    Domestic guest accommodation (B × 1.20)
                  </span>
                  <span className="font-display text-2xl font-bold tabular-nums">
                    {formatNaira(sliderAllocation.domesticGuestPriceNgn)}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  <div className="rounded-2xl border border-ink-100 bg-paper/75 p-3">
                    <p className="text-[10.5px] font-bold text-ink-500">Closing agent</p>
                    <p className="mt-1 font-mono text-xs font-extrabold text-ink-900">
                      {formatNaira(sliderAllocation.closingAgentCommissionNgn)}
                    </p>
                    <p className="text-[10px] font-semibold text-brass-700">10% of B</p>
                  </div>
                  <div className="rounded-2xl border border-ink-100 bg-paper/75 p-3">
                    <p className="text-[10.5px] font-bold text-ink-500">Direct referrer</p>
                    <p className="mt-1 font-mono text-xs font-extrabold text-ink-900">
                      {formatNaira(sliderAllocation.directReferrerRewardNgn)}
                    </p>
                    <p className="text-[10px] font-semibold text-brass-700">
                      {sampleHasReferrer ? '2.5% of B' : '0% (none)'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-ink-100 bg-paper/75 p-3">
                    <p className="text-[10.5px] font-bold text-ink-500">HAMLET allocation</p>
                    <p className="mt-1 font-mono text-xs font-extrabold text-ink-900">
                      {formatNaira(sliderAllocation.hamletAllocationNgn)}
                    </p>
                    <p className="text-[10px] font-semibold text-ink-500">
                      {sampleHasReferrer ? '5% of B' : '7.5% of B'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-ink-100 bg-paper/75 p-3">
                    <p className="text-[10.5px] font-bold text-ink-500">Payment reserve</p>
                    <p className="mt-1 font-mono text-xs font-extrabold text-ink-900">
                      {formatNaira(sliderAllocation.paymentReserveNgn)}
                    </p>
                    <p className="text-[10px] font-semibold text-ink-500">2.5% of B</p>
                  </div>
                </div>

                <p className="mt-3.5 text-[11.5px] font-medium leading-relaxed text-ink-500">
                  In USD or GBP? This same accommodation quotes at{' '}
                  <strong className="text-ink-900">
                    {formatStayPrice(sliderAllocation.domesticGuestPriceNgn)}
                  </strong>{' '}
                  in your active display currency ({currency}), settling in NGN via Paystack. Owners and authorised agents may also agree property-specific commercial mandates recorded on HAMLET before booking.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. Closing Editorial Callout ─────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="relative overflow-hidden rounded-3xl bg-ink-950 p-7 text-paper shadow-xl sm:p-12">
          <img
            src="/images/prop/penthouse.jpg"
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-28"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/90 to-ink-950/55" />
          <div className="relative flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <p className="eyebrow-light">{HAMLET_MANTRA}</p>
              <h2 className="mt-2 font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
                Sleep in a home with accountability — or bring yours to the right guests.
              </h2>
              <p className="mt-2.5 text-sm font-medium leading-relaxed text-ink-200">
                Inspect photos, power arrangements, house rules, and Wayfinder arrival readiness upfront. Property owners, managers, and hospitality partners list with 0% owner fee.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/stays" className="btn-brass !rounded-full !px-6">
                Browse verified stays <ArrowRight size={15} />
              </Link>
              <Link
                to="/partner/register"
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/8 px-5 py-3 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/15 [&>svg]:shrink-0"
              >
                <Building2 size={15} /> Partner with HAMLET
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Subtle Wayfinder & Horatio footer ribbon */}
      <section className="border-t border-ink-100 bg-white py-5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 text-xs font-semibold text-ink-600 sm:px-6">
          <span className="inline-flex items-center gap-2">
            <Compass size={15} className="shrink-0 text-brass-600" />
            <span>Every confirmed HAMLET booking unlocks Wayfinder arrival guidance in your account.</span>
          </span>
          <Link to="/about#four-pillars" className="font-bold text-ink-900 hover:underline">
            Explore how HAMLET works &amp; our story →
          </Link>
        </div>
      </section>
    </GuestLayout>
  );
}
