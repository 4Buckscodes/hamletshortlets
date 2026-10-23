import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Banknote, Building2, CalendarDays, ChevronRight,
  MapPin, Search, ShieldCheck, SlidersHorizontal, Users, Zap,
} from 'lucide-react';
import { GuestLayout } from '../components/Navbar';
import { PropertyCard } from '../components/PropertyCard';
import { CurrencyToggle } from '../components/CurrencyToggle';
import { useHamlet } from '../lib/store';
import { AREAS } from '../lib/seed';
import { addDaysToIsoDate, lagosIsoDateOffset } from '../lib/pricing';
import { HAMLET_TAGLINE, usePageMeta } from '../lib/brand';

const QUICK_AREAS = [
  { label: 'All Lagos', match: '' },
  { label: 'Lekki', match: 'lekki' },
  { label: 'Victoria Island', match: 'victoria island' },
  { label: 'Ikoyi', match: 'ikoyi' },
  { label: 'Ikeja', match: 'ikeja' },
  { label: 'Ajah', match: 'ajah' },
  { label: 'Oniru', match: 'oniru' },
  { label: 'Banana Island', match: 'banana island' },
];

const QUICK_AMENITIES = ['24/7 Power', 'Wifi', 'Pool', 'Workspace'] as const;

const NEIGHBOURHOOD_CARDS = [
  { name: 'Lekki', tag: 'Dining, lifestyle & coastal stays', href: '/stays?q=Lekki' },
  { name: 'Victoria Island', tag: 'Business districts & city access', href: '/stays?area=Victoria+Island' },
  { name: 'Ikoyi', tag: 'Quiet residential Island stays', href: '/stays?area=Ikoyi' },
  { name: 'Ikeja', tag: 'Mainland & airport convenience', href: '/stays?q=Ikeja' },
  { name: 'Ajah', tag: 'Spacious Lekki–Ajah stays', href: '/stays?area=Ajah' },
];

export default function Home() {
  usePageMeta(
    'HAMLET Shortlets | Find Your Next Stay in Lagos',
    'Explore shortlets in Lagos, from Lekki and Victoria Island to Ikoyi and Ikeja. Compare locations, amenities, prices, and check-in details on HAMLET.',
  );

  const { state, backendReady, backendError } = useHamlet();
  const navigate = useNavigate();

  const today = lagosIsoDateOffset(0);
  const [area, setArea] = useState('');
  const [checkIn, setCheckIn] = useState(() => lagosIsoDateOffset(1));
  const [checkOut, setCheckOut] = useState(() => lagosIsoDateOffset(3));
  const [guests, setGuests] = useState(2);

  // Instant marketplace filters right on the landing page
  const [activeAreaFilter, setActiveAreaFilter] = useState('');
  const [activeAmenity, setActiveAmenity] = useState('');

  const approved = useMemo(
    () => state.properties.filter(property => property.status === 'approved'),
    [state.properties],
  );

  const filteredMarketplace = useMemo(() => {
    return approved.filter(p => {
      if (activeAreaFilter) {
        const hay = `${p.area} ${p.address} ${p.title}`.toLowerCase();
        if (!hay.includes(activeAreaFilter)) return false;
      }
      if (activeAmenity && !p.amenities.includes(activeAmenity)) return false;
      return true;
    });
  }, [approved, activeAreaFilter, activeAmenity]);

  const displayedStays = filteredMarketplace.slice(0, 9);
  const minCheckOut = addDaysToIsoDate(checkIn, 1);

  const search = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = new URLSearchParams();
    if (area) query.set('area', area);
    query.set('checkIn', checkIn);
    query.set('checkOut', checkOut);
    query.set('guests', String(guests));
    navigate(`/stays?${query.toString()}`);
  };

  return (
    <GuestLayout>
      {/* ── 1. Compact Search Hero ───────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-ink-950">
        <img
          src="/images/prop/penthouse.jpg"
          alt="Lagos shortlet apartment interior"
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950/95 via-ink-950/80 to-ink-950/45" />
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="max-w-2xl">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-brass-300">
              Lagos shortlets · {HAMLET_TAGLINE}
            </p>
            <h1 className="mt-2 font-display text-3xl font-black leading-[1.06] tracking-tight text-paper sm:text-5xl">
              Come in. Settle down. Feel at home.
            </h1>
            <p className="mt-2.5 max-w-xl text-sm font-medium text-ink-200 sm:text-[15px]">
              Browse verified Lagos apartments with upfront pricing, confirmed amenities, and clear arrival details.
            </p>
          </div>

          <form
            id="stay-search"
            onSubmit={search}
            className="mt-6 grid scroll-mt-24 grid-cols-1 gap-2 rounded-2xl border border-white/15 bg-ink-900/95 p-2.5 shadow-2xl backdrop-blur-md sm:grid-cols-2 lg:max-w-5xl lg:grid-cols-5"
          >
            <label className="flex min-h-13 items-center gap-2 rounded-xl bg-ink-800/80 px-3 py-2">
              <MapPin size={16} className="shrink-0 text-brass-400" />
              <span className="min-w-0 flex-1">
                <span className="block text-[9.5px] font-extrabold uppercase tracking-widest text-ink-300">Location</span>
                <select
                  value={area}
                  onChange={event => setArea(event.target.value)}
                  aria-label="Where would you like to stay?"
                  className="w-full bg-transparent text-[13px] font-bold text-white outline-none [&>option]:text-ink-900"
                >
                  <option value="">All Lagos areas</option>
                  {AREAS.map(destination => (
                    <option key={destination} value={destination}>{destination}</option>
                  ))}
                </select>
              </span>
            </label>
            <label className="flex min-h-13 min-w-0 items-center gap-2 rounded-xl bg-ink-800/80 px-3 py-2">
              <CalendarDays size={16} className="shrink-0 text-brass-400" />
              <span className="min-w-0 flex-1">
                <span className="block text-[9.5px] font-extrabold uppercase tracking-widest text-ink-300">Check-in</span>
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
                  className="w-full min-w-0 bg-transparent text-[12px] font-bold text-white outline-none [color-scheme:dark]"
                />
              </span>
            </label>
            <label className="flex min-h-13 min-w-0 items-center gap-2 rounded-xl bg-ink-800/80 px-3 py-2">
              <CalendarDays size={16} className="shrink-0 text-brass-400" />
              <span className="min-w-0 flex-1">
                <span className="block text-[9.5px] font-extrabold uppercase tracking-widest text-ink-300">Check-out</span>
                <input
                  type="date"
                  required
                  value={checkOut}
                  min={minCheckOut}
                  aria-label="Check-out date"
                  onChange={event => setCheckOut(event.target.value)}
                  className="w-full min-w-0 bg-transparent text-[12px] font-bold text-white outline-none [color-scheme:dark]"
                />
              </span>
            </label>
            <label className="flex min-h-13 items-center gap-2 rounded-xl bg-ink-800/80 px-3 py-2">
              <Users size={16} className="shrink-0 text-brass-400" />
              <span className="min-w-0 flex-1">
                <span className="block text-[9.5px] font-extrabold uppercase tracking-widest text-ink-300">Guests</span>
                <select
                  value={guests}
                  onChange={event => setGuests(Number(event.target.value))}
                  aria-label="Guests"
                  className="w-full bg-transparent text-[13px] font-bold text-white outline-none [&>option]:text-ink-900"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(count => (
                    <option key={count} value={count}>{count} guest{count === 1 ? '' : 's'}</option>
                  ))}
                </select>
              </span>
            </label>
            <button type="submit" className="btn-brass min-h-13 w-full lg:px-3">
              <Search size={16} /> Search stays
            </button>
          </form>
        </div>
      </section>

      {/* ── 2. Primary Marketplace Section (Front & Center) ──────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-11">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-black text-ink-900 sm:text-3xl">
              Explore shortlets in Lagos
            </h2>
            <p className="mt-0.5 text-xs font-medium text-ink-500">
              {!backendReady
                ? 'Finding spaces that fit your plans…'
                : approved.length > 0
                  ? `${filteredMarketplace.length} available stay${filteredMarketplace.length === 1 ? '' : 's'} · 3% guest fee disclosed upfront`
                  : 'Verified Lagos apartments · manual review before listing'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CurrencyToggle />
            <Link to="/stays" className="btn-outline !py-2 text-[12px]">
              <SlidersHorizontal size={14} /> All filters
            </Link>
          </div>
        </div>

        {/* Quick horizontal neighbourhood & amenity filter bar */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto overscroll-x-contain pb-2">
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
                className={`inline-flex min-h-9 shrink-0 items-center rounded-full border px-3 text-xs font-semibold transition ${
                  active
                    ? 'border-jade-700 bg-jade-700 text-white'
                    : 'border-ink-200 bg-clay/70 text-ink-700 hover:border-jade-500'
                }`}
              >
                {amenity === 'Wifi' ? 'Wi-Fi' : amenity}
              </button>
            );
          })}
        </div>

        {/* Marketplace Grid */}
        {backendError ? (
          <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-sm font-semibold text-red-800">
            Something didn’t go as planned loading stays: {backendError}
          </div>
        ) : !backendReady ? (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(n => (
              <div key={n} className="h-80 animate-pulse rounded-2xl border border-ink-100 bg-white p-4">
                <div className="h-44 rounded-xl bg-ink-100" />
                <div className="mt-4 h-4 w-3/4 rounded bg-ink-100" />
                <div className="mt-2 h-3 w-1/2 rounded bg-ink-100" />
              </div>
            ))}
          </div>
        ) : displayedStays.length > 0 ? (
          <>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {displayedStays.map(property => (
                <PropertyCard key={property.id} p={property} />
              ))}
            </div>
            <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-5">
              <p className="text-xs font-medium text-ink-500">
                Showing {displayedStays.length} of {filteredMarketplace.length} matching Lagos stay{filteredMarketplace.length === 1 ? '' : 's'}.
              </p>
              <Link to="/stays" className="btn-jade !py-2.5 text-xs">
                View all stays & availability <ArrowRight size={14} />
              </Link>
            </div>
          </>
        ) : approved.length > 0 ? (
          <div className="mt-5 rounded-2xl border border-ink-100 bg-white px-6 py-10 text-center">
            <p className="font-display text-lg font-bold text-ink-900">No stays match that quick filter.</p>
            <p className="mt-1 text-xs font-medium text-ink-500">Reset quick filters or open the full search to explore all available homes.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setActiveAreaFilter('');
                  setActiveAmenity('');
                }}
                className="btn-jade !py-2 text-xs"
              >
                Show all stays ({approved.length})
              </button>
              <Link to="/stays" className="btn-outline !py-2 text-xs">Full search</Link>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-3xl border border-ink-100 bg-white px-6 py-11 text-center shadow-2xs sm:px-10">
            <span className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-jade-200 bg-jade-50 px-3 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-jade-800">
              <ShieldCheck size={13} className="shrink-0" /> Verified Lagos supply onboarding
            </span>
            <h3 className="mt-3 font-display text-xl font-black text-ink-900 sm:text-2xl">
              We’re onboarding verified Lagos stays now.
            </h3>
            <p className="mx-auto mt-1.5 max-w-md text-xs font-medium leading-relaxed text-ink-500 sm:text-[13px]">
              Every apartment completes manual document and inspection review before appearing in the marketplace.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              <Link to="/stays" className="btn-jade !py-2.5 text-xs">
                Open marketplace search <ArrowRight size={14} />
              </Link>
              <Link to="/partner/register" className="btn-outline !py-2.5 text-xs">
                List your Lagos property
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* ── 3. Compact Neighbourhood Shortcuts ──────────────────────────── */}
      <section className="border-t border-ink-100 bg-clay/50 py-10 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="font-display text-xl font-black text-ink-900 sm:text-2xl">
              Browse by Lagos neighbourhood
            </h2>
            <Link to="/lagos" className="inline-flex items-center gap-1 text-xs font-extrabold text-jade-800 hover:underline">
              Lagos neighbourhood guide <ChevronRight size={14} className="shrink-0" />
            </Link>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {NEIGHBOURHOOD_CARDS.map(item => (
              <Link
                key={item.name}
                to={item.href}
                className="group flex items-center justify-between gap-2 rounded-2xl border border-ink-100 bg-white p-4 transition hover:-translate-y-0.5 hover:border-jade-400 hover:shadow-sm"
              >
                <div className="min-w-0">
                  <p className="font-display text-base font-black text-ink-900 group-hover:text-jade-800">{item.name}</p>
                  <p className="mt-0.5 truncate text-[11.5px] font-medium text-ink-500">{item.tag}</p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-ink-400 transition group-hover:translate-x-0.5 group-hover:text-jade-700" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. Concise Trust Strip + Partner Callout ─────────────────────── */}
      <section className="border-t border-ink-100 bg-paper py-10 sm:py-12">
        <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6">
          <div className="grid gap-3 rounded-2xl border border-ink-100 bg-white p-4 sm:grid-cols-3 sm:p-5">
            <div className="flex items-center gap-3">
              <ShieldCheck size={20} className="shrink-0 text-jade-700" />
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-ink-900">Reviewed listings</p>
                <p className="text-[11.5px] text-ink-500">Ownership, authority & inspection status shown</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Zap size={20} className="shrink-0 text-jade-700" />
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-ink-900">Power & Wi-Fi stated</p>
                <p className="text-[11.5px] text-ink-500">Check backup & check-in rules before booking</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Banknote size={20} className="shrink-0 text-jade-700" />
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-ink-900">Upfront total pricing</p>
                  <p className="text-[11.5px] text-ink-500">Compare in ₦, $ or £ · webhook-verified checkout</p>
                </div>
              </div>
              <Link to="/about" className="shrink-0 text-[11.5px] font-extrabold text-jade-800 hover:underline">
                About us →
              </Link>
            </div>
          </div>

          <div className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-ink-950 px-5 py-5 text-paper sm:flex-row sm:items-center sm:px-7">
            <div className="flex items-center gap-3">
              <Building2 size={22} className="shrink-0 text-brass-400" />
              <div>
                <p className="font-display text-base font-black sm:text-lg">
                  Own or manage a shortlet in Lagos?
                </p>
                <p className="text-xs font-medium text-ink-300">
                  0% owner fee · Reach verified guests and manage bookings in one workspace.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Link to="/partner/register" className="btn-brass !py-2.5 text-xs">
                List your property <ArrowRight size={14} />
              </Link>
              <Link
                to="/signin"
                className="inline-flex items-center rounded-xl border border-white/20 bg-white/5 px-3.5 py-2.5 text-xs font-bold text-paper transition hover:bg-white/10"
              >
                Partner sign in
              </Link>
            </div>
          </div>
        </div>
      </section>
    </GuestLayout>
  );
}
