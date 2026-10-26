import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Search,
  ShieldCheck,
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
import { HAMLET_BRAND_NAME, HAMLET_USP, usePageMeta } from '../lib/brand';
import { addDaysToIsoDate, lagosIsoDateOffset } from '../lib/pricing';

const QUICK_AREAS = [
  'Lagos Mainland',
  'Yaba',
  'Surulere',
  'Shomolu',
  'Ikeja GRA',
  'Victoria Island',
  'Ikoyi',
  'Lekki Phase 1',
] as const;

const HERO_SLIDES = [
  {
    src: '/images/hero-sample-living.jpg',
    room: 'Living room',
    alt: 'Thoughtfully furnished sample apartment living room with bouclé sofa, warm brass floor lamp, and balcony palms',
  },
  {
    src: '/images/hero-sample-bedroom.jpg',
    room: 'Primary bedroom',
    alt: 'Thoughtfully furnished sample apartment primary bedroom with upholstered linen king bed and walnut joinery',
  },
  {
    src: '/images/hero-sample-kitchen.jpg',
    room: 'Kitchen & dining',
    alt: 'Thoughtfully furnished sample apartment open-plan marble kitchen island and walnut dining table',
  },
  {
    src: '/images/hero-sample-lounge.jpg',
    room: 'Study & terrace',
    alt: 'Thoughtfully furnished sample apartment walnut workspace and twilight terrace lounge',
  },
] as const;

const NEIGHBOURHOOD_CARDS = [
  {
    name: 'Yaba',
    corridor: 'Mainland',
    sub: 'Sabo · Alagomeji · Akoka',
    matchArea: 'Yaba',
    to: '/stays?area=Yaba',
    img: '/images/prop/studio-1.jpg',
  },
  {
    name: 'Surulere',
    corridor: 'Mainland',
    sub: 'Bode Thomas · Adeniran Ogunsanya',
    matchArea: 'Surulere',
    to: '/stays?area=Surulere',
    img: '/images/prop/bed-1.jpg',
  },
  {
    name: 'Shomolu',
    corridor: 'Mainland',
    sub: 'Palmgrove · Onipanu · Gbagada',
    matchArea: 'Shomolu',
    to: '/stays?area=Shomolu',
    img: '/images/prop/kitchen-1.jpg',
  },
  {
    name: 'Ikeja GRA',
    corridor: 'Mainland',
    sub: 'Airport axis · Maryland · Magodo',
    matchArea: 'Ikeja GRA',
    to: '/stays?area=Ikeja+GRA',
    img: '/images/prop/duplex.jpg',
  },
  {
    name: 'Victoria Island',
    corridor: 'Island',
    sub: 'Adeola Odeku · Ahmadu Bello',
    matchArea: 'Victoria Island',
    to: '/stays?area=Victoria+Island',
    img: '/images/prop/living-1.jpg',
  },
  {
    name: 'Ikoyi',
    corridor: 'Island',
    sub: 'Old Ikoyi · Banana Island · Falomo',
    matchArea: 'Ikoyi',
    to: '/stays?area=Ikoyi',
    img: '/images/prop/penthouse.jpg',
  },
  {
    name: 'Lekki Phase 1',
    corridor: 'Island',
    sub: 'Admiralty Way · Oniru',
    matchArea: 'Lekki Phase 1',
    to: '/stays?area=Lekki+Phase+1',
    img: '/images/prop/pool-1.jpg',
  },
  {
    name: 'Ajah',
    corridor: 'Island',
    sub: 'Chevron · Orchid Road · Sangotedo',
    matchArea: 'Ajah',
    to: '/stays?area=Ajah',
    img: '/images/prop/exterior-1.jpg',
  },
] as const;

type BoardFilter = 'all' | 'mainland' | 'island';

export default function Home() {
  usePageMeta(
    'HAMLET for Your Shortlets | Shortlets in Lagos — Mainland & Island',
    'Find verified shortlets across Lagos Mainland (Yaba, Shomolu, Surulere, Ikeja & environs) and Lagos Island (Lekki, Victoria Island, Ikoyi, Ajah) with transparent Naira, USD & GBP pricing.',
    { canonicalPath: '/' },
  );

  const { state, backendReady, backendError } = useHamlet();
  const { formatStayPrice } = useCurrency();
  const { openHoratio } = useHoratio();
  const navigate = useNavigate();

  const [area, setArea] = useState('');
  const [searchSide, setSearchSide] = useState<'all' | 'mainland' | 'island'>('all');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(2);
  const [boardFilter, setBoardFilter] = useState<BoardFilter>('all');
  const [heroSlide, setHeroSlide] = useState(0);
  const [slideshowPaused, setSlideshowPaused] = useState(false);

  useEffect(() => {
    if (slideshowPaused) return;
    const timer = window.setInterval(() => {
      setHeroSlide(prev => (prev + 1) % HERO_SLIDES.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [heroSlide, slideshowPaused]);

  const minDate = lagosIsoDateOffset(0);
  const approved = state.properties.filter(p => p.status === 'approved');

  const boardProperties = approved
    .filter(p => {
      if (boardFilter === 'mainland') return isMainlandProperty(p);
      if (boardFilter === 'island') return !isMainlandProperty(p);
      return true;
    })
    .slice(0, 6);

  const floorPriceFor = (matchArea: string): string | null => {
    const matches = approved.filter(p => matchesLagosAreaFilter(p, matchArea));
    if (matches.length === 0) return null;
    const minRate = Math.min(...matches.map(p => p.nightlyRate));
    return formatStayPrice(Math.round(minRate * 1.2));
  };

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (area) params.set('area', area);
    else if (searchSide !== 'all') params.set('side', searchSide);
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    if (guests > 1) params.set('guests', String(guests));
    navigate(`/stays${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <GuestLayout>
      {/* ── Full-Clarity Sample Interior Hero Slideshow ────────────── */}
      <section
        className="relative flex min-h-[430px] flex-col justify-end overflow-hidden bg-ink-950 text-paper sm:min-h-[530px] lg:min-h-[610px]"
        onMouseEnter={() => setSlideshowPaused(true)}
        onMouseLeave={() => setSlideshowPaused(false)}
      >
        {/* Crossfading sample apartment interior slides — 100% full brightness */}
        <div className="absolute inset-0" aria-hidden="true">
          {HERO_SLIDES.map((slide, index) => {
            const isCurrent = index === heroSlide;
            return (
              <img
                key={slide.src}
                src={slide.src}
                alt={slide.alt}
                loading="eager"
                decoding="async"
                className={`absolute inset-0 h-full w-full object-cover object-center brightness-[1.03] contrast-[1.02] transition-all duration-1000 ease-out ${
                  isCurrent ? 'scale-100 opacity-100' : 'scale-105 opacity-0'
                }`}
              />
            );
          })}
        </div>

        {/* Localized bottom/left vignette only — leaves the furnished room bright & unobstructed */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-ink-950/80 via-ink-950/25 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-full bg-gradient-to-r from-ink-950/55 via-ink-950/15 to-transparent lg:w-3/5" />

        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-14 pt-24 sm:px-6 sm:pb-20 sm:pt-32">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-brass-400/50 bg-ink-950/70 px-3.5 py-1 text-[11px] font-bold tracking-wide text-brass-300 backdrop-blur-md">
                <ShieldCheck size={13} className="shrink-0 text-brass-400" />
                <span>
                  {HAMLET_BRAND_NAME} · {HAMLET_USP}
                </span>
              </div>

              <h1 className="mt-3.5 font-display text-4xl font-bold leading-[1.05] tracking-tight text-white drop-shadow-[0_2px_18px_rgba(8,15,30,0.65)] sm:text-5xl lg:text-6xl">
                Lagos is big.{' '}
                <span className="italic text-brass-300">Your stay, sorted.</span>
              </h1>

              <p className="mt-2.5 max-w-lg text-sm font-semibold text-white/95 drop-shadow-[0_1px_10px_rgba(8,15,30,0.7)] sm:text-base">
                Verified shortlets across Lagos Mainland &amp; Island. Pay only after availability is confirmed.
              </p>
            </div>

            {/* Sample interior room switcher + prev/next controls */}
            <div className="flex flex-wrap items-center gap-2 self-start lg:self-end">
              <div
                className="flex flex-wrap items-center gap-1 rounded-2xl border border-white/25 bg-ink-950/65 p-1 backdrop-blur-md sm:rounded-full"
                role="tablist"
                aria-label="Sample apartment rooms"
              >
                <span className="px-2.5 text-[10.5px] font-bold uppercase tracking-wider text-brass-300">
                  Sample interior
                </span>
                {HERO_SLIDES.map((slide, index) => {
                  const active = index === heroSlide;
                  return (
                    <button
                      key={slide.src}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      aria-label={`Show ${slide.room}`}
                      onClick={() => setHeroSlide(index)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                        active
                          ? 'bg-brass-400 text-ink-950 shadow-2xs'
                          : 'text-white/85 hover:bg-white/15 hover:text-white'
                      }`}
                    >
                      {slide.room}
                    </button>
                  );
                })}
              </div>

              <div className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-ink-950/65 p-1 backdrop-blur-md">
                <button
                  type="button"
                  aria-label="Previous interior photo"
                  onClick={() =>
                    setHeroSlide(prev => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)
                  }
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15 hover:text-white [&>svg]:shrink-0"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  type="button"
                  aria-label="Next interior photo"
                  onClick={() => setHeroSlide(prev => (prev + 1) % HERO_SLIDES.length)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15 hover:text-white [&>svg]:shrink-0"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Search Dock (below hero so interior photos stay unobstructed) ── */}
      <div className="relative z-20 mx-auto -mt-8 max-w-6xl px-4 sm:-mt-11 sm:px-6">
        <form
          onSubmit={onSearch}
          className="rounded-3xl border border-ink-100 bg-white p-3.5 text-ink-900 shadow-[0_24px_60px_-20px_rgba(14,31,59,0.28)] sm:p-5"
        >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 pb-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'all', label: 'All Lagos' },
                    { id: 'mainland', label: 'Lagos Mainland' },
                    { id: 'island', label: 'Lagos Island' },
                  ] as const
                ).map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setSearchSide(tab.id);
                      if (tab.id === 'mainland') setArea('Lagos Mainland');
                      else if (tab.id === 'all' && area === 'Lagos Mainland') setArea('');
                      else if (tab.id === 'island' && area === 'Lagos Mainland') setArea('');
                    }}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                      searchSide === tab.id
                        ? 'bg-ink-900 text-white'
                        : 'bg-paper text-ink-600 hover:bg-clay hover:text-ink-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <CurrencyToggle />
            </div>

            {/* Quick area chips */}
            <div className="mb-3.5 flex items-center gap-1.5 overflow-x-auto overscroll-x-contain pb-1">
              {QUICK_AREAS.map(hub => {
                const selected = area === hub;
                return (
                  <button
                    key={hub}
                    type="button"
                    onClick={() => setArea(selected ? '' : hub)}
                    className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold transition ${
                      selected
                        ? 'border-brass-600 bg-brass-500 text-ink-950'
                        : 'border-ink-200 bg-paper/75 text-ink-700 hover:border-ink-400'
                    }`}
                  >
                    {hub}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-12">
              <label className="flex min-w-0 items-center gap-2.5 rounded-2xl border border-ink-100 bg-paper/65 px-3.5 py-2.5 lg:col-span-4">
                <MapPin size={17} className="shrink-0 text-brass-600" />
                <div className="min-w-0 flex-1">
                  <span className="block text-[10px] font-extrabold uppercase tracking-wider text-ink-400">
                    Where
                  </span>
                  <select
                    aria-label="Neighbourhood"
                    value={area}
                    onChange={e => setArea(e.target.value)}
                    className="w-full truncate bg-transparent text-[13.5px] font-bold text-ink-900 focus:outline-none"
                  >
                    <option value="">All Lagos areas</option>
                    <optgroup label="Lagos Mainland">
                      {MAINLAND_AREAS.map(a => (
                        <option key={a} value={a}>
                          {a === 'Lagos Mainland' ? 'Lagos Mainland (All)' : a}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Lagos Island & Lekki">
                      {ISLAND_AND_LEKKI_AREAS.map(a => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </label>

              <label className="flex min-w-0 items-center gap-2.5 rounded-2xl border border-ink-100 bg-paper/65 px-3.5 py-2.5 lg:col-span-3">
                <Calendar size={17} className="shrink-0 text-brass-600" />
                <div className="min-w-0 flex-1">
                  <span className="block text-[10px] font-extrabold uppercase tracking-wider text-ink-400">
                    Check in
                  </span>
                  <input
                    type="date"
                    min={minDate}
                    value={checkIn}
                    onChange={e => {
                      const nextIn = e.target.value;
                      setCheckIn(nextIn);
                      if (nextIn && checkOut && checkOut <= nextIn) {
                        setCheckOut(addDaysToIsoDate(nextIn, 2));
                      }
                    }}
                    className="w-full min-w-0 bg-transparent text-[13px] font-bold text-ink-900 focus:outline-none"
                  />
                </div>
              </label>

              <label className="flex min-w-0 items-center gap-2.5 rounded-2xl border border-ink-100 bg-paper/65 px-3.5 py-2.5 lg:col-span-3">
                <Calendar size={17} className="shrink-0 text-brass-600" />
                <div className="min-w-0 flex-1">
                  <span className="block text-[10px] font-extrabold uppercase tracking-wider text-ink-400">
                    Check out
                  </span>
                  <input
                    type="date"
                    min={checkIn ? addDaysToIsoDate(checkIn, 1) : addDaysToIsoDate(minDate, 1)}
                    value={checkOut}
                    onChange={e => setCheckOut(e.target.value)}
                    className="w-full min-w-0 bg-transparent text-[13px] font-bold text-ink-900 focus:outline-none"
                  />
                </div>
              </label>

              <div className="flex items-stretch gap-2 lg:col-span-2">
                <label className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-ink-100 bg-paper/65 px-3 py-2.5">
                  <Users size={16} className="shrink-0 text-brass-600" />
                  <div className="min-w-0 flex-1">
                    <span className="block text-[10px] font-extrabold uppercase tracking-wider text-ink-400">
                      Guests
                    </span>
                    <select
                      aria-label="Guests"
                      value={guests}
                      onChange={e => setGuests(Number(e.target.value))}
                      className="w-full bg-transparent text-[13px] font-bold text-ink-900 focus:outline-none"
                    >
                      {[1, 2, 3, 4, 6, 8, 10].map(n => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>

                <button
                  type="submit"
                  className="btn-jade min-h-12 shrink-0 !rounded-2xl !px-5 text-sm shadow-sm"
                >
                  <Search size={16} />
                  <span className="sm:inline">Search</span>
                </button>
              </div>
            </div>
          </form>
      </div>

      {/* ── Available Stays ────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Lagos marketplace</p>
            <h2 className="mt-1 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
              Available stays
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-full border border-ink-200 bg-white p-1">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'mainland', label: 'Mainland' },
                  { id: 'island', label: 'Island' },
                ] as const
              ).map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setBoardFilter(tab.id)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                    boardFilter === tab.id
                      ? 'bg-ink-900 text-white'
                      : 'text-ink-600 hover:text-ink-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <Link to="/stays" className="btn-outline !rounded-full !px-4 !py-2 text-xs">
              View all <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Area jump links */}
        <div className="mt-5 flex items-center gap-2 overflow-x-auto overscroll-x-contain pb-2">
          {[
            { label: 'Lagos Mainland', to: '/stays?area=Lagos+Mainland' },
            { label: 'Yaba', to: '/stays?area=Yaba' },
            { label: 'Surulere', to: '/stays?area=Surulere' },
            { label: 'Shomolu', to: '/stays?area=Shomolu' },
            { label: 'Ikeja GRA', to: '/stays?area=Ikeja+GRA' },
            { label: 'Victoria Island', to: '/stays?area=Victoria+Island' },
            { label: 'Ikoyi', to: '/stays?area=Ikoyi' },
            { label: 'Lekki Phase 1', to: '/stays?area=Lekki+Phase+1' },
            { label: 'Ajah', to: '/stays?area=Ajah' },
          ].map(chip => (
            <Link
              key={chip.label}
              to={chip.to}
              className="shrink-0 rounded-full border border-ink-200 bg-white px-3.5 py-1.5 text-xs font-bold text-ink-700 transition hover:border-ink-900 hover:bg-ink-900 hover:text-white"
            >
              {chip.label}
            </Link>
          ))}
        </div>

        {backendError ? (
          <div
            role="alert"
            className="mt-6 rounded-3xl border border-red-200 bg-red-50 px-6 py-5 text-sm font-semibold text-red-900"
          >
            Could not load stays ({backendError}). Please refresh the page.
          </div>
        ) : !backendReady ? (
          <div
            role="status"
            className="mt-6 rounded-3xl border border-ink-100 bg-white px-6 py-14 text-center text-sm font-semibold text-ink-500"
          >
            Loading stays…
          </div>
        ) : boardProperties.length > 0 ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {boardProperties.map(p => (
              <PropertyCard key={p.id} p={p} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-ink-200 bg-white px-6 py-12 text-center">
            <h3 className="font-display text-2xl font-bold text-ink-900">
              {approved.length === 0 ? 'New verified stays arriving soon.' : 'No stays in this corridor yet.'}
            </h3>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {boardFilter !== 'all' ? (
                <button
                  type="button"
                  onClick={() => setBoardFilter('all')}
                  className="btn-jade !rounded-full"
                >
                  Show all Lagos
                </button>
              ) : (
                <Link to="/partner/register" className="btn-jade !rounded-full">
                  <Building2 size={15} /> List a property
                </Link>
              )}
              <button
                type="button"
                onClick={() => openHoratio()}
                className="btn-outline !rounded-full"
              >
                <Sparkles size={15} className="text-brass-600" /> Ask Horatio
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Browse by Area ─────────────────────────────────────────── */}
      <section className="border-t border-ink-100 bg-clay/45 py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Mainland &amp; Island</p>
              <h2 className="mt-1 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
                Browse by area
              </h2>
            </div>
            <Link to="/lagos" className="btn-outline !rounded-full !px-5 !py-2 text-xs">
              Lagos guide <ArrowRight size={14} />
            </Link>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {NEIGHBOURHOOD_CARDS.map(card => {
              const floor = floorPriceFor(card.matchArea);
              return (
                <Link
                  key={card.name}
                  to={card.to}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-2xs transition duration-300 hover:-translate-y-1 hover:border-ink-300 hover:shadow-md"
                >
                  <div className="relative h-44 overflow-hidden bg-clay">
                    <img
                      src={card.img}
                      alt={card.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-ink-950/70 to-transparent" />
                    <span className="absolute left-3 top-3 rounded-full bg-ink-950/75 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-brass-300 backdrop-blur-md">
                      {card.corridor}
                    </span>
                    <h3 className="absolute bottom-2.5 left-3.5 right-3.5 font-display text-xl font-bold text-white drop-shadow-xs">
                      {card.name}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between gap-2 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[11.5px] font-medium text-ink-500">{card.sub}</p>
                      <p className="mt-0.5 text-xs font-extrabold text-ink-900">
                        {floor ? `From ${floor} / night` : 'Browse stays'}
                      </p>
                    </div>
                    <ArrowUpRight
                      size={15}
                      className="shrink-0 text-ink-400 transition group-hover:text-ink-900"
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Compact Partner Callout ────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14">
        <div className="flex flex-col items-start justify-between gap-5 rounded-3xl bg-ink-950 px-6 py-8 text-paper sm:flex-row sm:items-center sm:px-10">
          <div>
            <p className="eyebrow-light">0% owner fee</p>
            <h2 className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">
              Own or manage a shortlet in Lagos?
            </h2>
            <p className="mt-1 text-sm font-medium text-ink-300">
              Keep 100% of your listed rate. Closing agents and referrers earn recorded commissions.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/partner/register" className="btn-brass !rounded-full !px-6">
              List a property <ArrowRight size={15} />
            </Link>
            <Link
              to="/how-it-works"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-white/15 [&>svg]:shrink-0"
            >
              How it works
            </Link>
          </div>
        </div>
      </section>
    </GuestLayout>
  );
}
