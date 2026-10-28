'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  Calendar,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  ISLAND_AND_LEKKI_AREAS,
  isMainlandArea,
  MAINLAND_AREAS,
} from '@/lib/areas';
import { addDaysToIsoDate, guestFacingNightlyNgn, lagosIsoDateOffset } from '@/lib/pricing';
import { useCurrency } from '@/lib/currency';
import type { PublicStayRecord } from '@/lib/next-supabase';
import {
  NextCurrencySwitcher,
  StayListingCard,
  useNextHoratio,
} from '@/components/site/SiteShell';

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

const NEIGHBOURHOOD_CARDS = [
  {
    name: 'Yaba',
    corridor: 'Mainland',
    sub: 'Sabo · Alagomeji · Akoka',
    href: '/stays?area=Yaba',
    img: '/images/prop/studio-1.jpg',
  },
  {
    name: 'Surulere',
    corridor: 'Mainland',
    sub: 'Bode Thomas · Adeniran Ogunsanya',
    href: '/stays?area=Surulere',
    img: '/images/prop/bed-1.jpg',
  },
  {
    name: 'Shomolu',
    corridor: 'Mainland',
    sub: 'Palmgrove · Onipanu · Gbagada',
    href: '/stays?area=Shomolu',
    img: '/images/prop/kitchen-1.jpg',
  },
  {
    name: 'Ikeja GRA',
    corridor: 'Mainland',
    sub: 'Airport axis · Maryland · Magodo',
    href: '/stays?area=Ikeja+GRA',
    img: '/images/prop/duplex.jpg',
  },
  {
    name: 'Victoria Island',
    corridor: 'Island',
    sub: 'Adeola Odeku · Ahmadu Bello',
    href: '/stays?area=Victoria+Island',
    img: '/images/prop/living-1.jpg',
  },
  {
    name: 'Ikoyi',
    corridor: 'Island',
    sub: 'Old Ikoyi · Banana Island · Falomo',
    href: '/stays?area=Ikoyi',
    img: '/images/prop/penthouse.jpg',
  },
  {
    name: 'Lekki Phase 1',
    corridor: 'Island',
    sub: 'Admiralty Way · Oniru',
    href: '/stays?area=Lekki+Phase 1',
    img: '/images/prop/pool-1.jpg',
  },
  {
    name: 'Ajah',
    corridor: 'Island',
    sub: 'Chevron · Orchid Road · Sangotedo',
    href: '/stays?area=Ajah',
    img: '/images/prop/exterior-1.jpg',
  },
] as const;

type BoardFilter = 'all' | 'mainland' | 'island';

export function HomeMarketplaceExperience({
  approvedStays,
}: {
  approvedStays: PublicStayRecord[];
  connected?: boolean;
}) {
  const router = useRouter();
  const { formatPrice } = useCurrency();
  const { openHoratio } = useNextHoratio();

  const [area, setArea] = useState('');
  const [searchSide, setSearchSide] = useState<'all' | 'mainland' | 'island'>('all');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(2);
  const [boardFilter, setBoardFilter] = useState<BoardFilter>('all');

  const minDate = lagosIsoDateOffset(0);

  const boardStays = approvedStays
    .filter(stay => {
      if (boardFilter === 'mainland') return isMainlandArea(stay.area || '');
      if (boardFilter === 'island') return !isMainlandArea(stay.area || '');
      return true;
    })
    .slice(0, 6);

  function floorPriceFor(targetArea: string): string | null {
    const matches = approvedStays.filter(
      s => (s.area || '').toLowerCase() === targetArea.toLowerCase(),
    );
    if (matches.length === 0) return null;
    const minOwnerRate = Math.min(...matches.map(s => Number(s.nightly_rate || 0)));
    if (!(minOwnerRate > 0)) return null;
    return formatPrice(guestFacingNightlyNgn(minOwnerRate), { roundWhole: true });
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (area) params.set('area', area);
    else if (searchSide !== 'all') params.set('side', searchSide);
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    if (guests > 1) params.set('guests', String(guests));
    const qs = params.toString();
    router.push(qs ? `/stays?${qs}` : '/stays');
  }

  return (
    <>
      {/* ── Editorial discovery hero: photographic collage, no rotating carousel ── */}
      <section className="relative overflow-hidden bg-paper">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 pb-14 pt-10 sm:px-6 sm:pb-16 sm:pt-14 lg:grid-cols-[0.82fr_1.18fr] lg:gap-12 lg:px-8 lg:py-16">
          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-jade-700/15 bg-white px-3.5 py-1.5 text-[11px] font-bold tracking-wide text-ink-800 shadow-2xs">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-jade-700" />
              <span>HAMLET.REST · Verified Lagos shortlets</span>
            </div>

            <h1 className="mt-5 font-display text-5xl font-bold leading-[0.98] tracking-tight text-ink-950 sm:text-6xl lg:text-7xl">
              Find your{' '}
              <span className="italic text-jade-700">stay.</span>
            </h1>

            <p className="mt-5 max-w-md text-base leading-relaxed text-ink-600 sm:text-lg">
              Thoughtfully selected shortlets across Lagos Island and Mainland.
              Find a place that feels right, then make it yours for a while.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-ink-600">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-jade-700" /> Reviewed listings</span>
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-jade-700" /> Lagos, made easier</span>
            </div>
          </div>

          <div className="relative mx-auto grid w-full max-w-2xl grid-cols-[1.2fr_0.8fr] gap-3 sm:gap-4">
            <div className="relative row-span-2 min-h-[320px] overflow-hidden rounded-[1.75rem] bg-clay sm:min-h-[440px]">
              <img
                src="/images/hero-sample-living.jpg"
                alt="Warm, furnished shortlet living room with balcony greenery"
                loading="eager"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/70 to-transparent p-4 pt-16 sm:p-5 sm:pt-20">
                <span className="inline-flex rounded-full border border-white/30 bg-ink-950/35 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                  Made for your kind of stay
                </span>
              </div>
            </div>
            <div className="relative min-h-[150px] overflow-hidden rounded-[1.5rem] bg-clay sm:min-h-[210px]">
              <img
                src="/images/hero-sample-bedroom.jpg"
                alt="Calm shortlet bedroom with an upholstered bed and warm finishes"
                loading="eager"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
            <div className="relative min-h-[150px] overflow-hidden rounded-[1.5rem] bg-clay sm:min-h-[210px]">
              <img
                src="/images/hero-sample-kitchen.jpg"
                alt="Contemporary shortlet kitchen and dining space"
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute bottom-3 right-3 rounded-full border border-white/30 bg-white/90 px-3 py-1.5 text-[10px] font-bold text-ink-900 shadow-sm">
                Lagos Island &amp; Mainland
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Elevated Search Dock (below hero so interior photos stay clear) ── */}
      <div className="relative z-20 mx-auto -mt-8 max-w-6xl px-4 sm:-mt-11 sm:px-6">
        <form
          action="/stays"
          method="get"
          onSubmit={handleSearchSubmit}
          className="rounded-3xl border border-ink-100 bg-white p-4 text-ink-900 shadow-[0_24px_60px_-20px_rgba(14,31,59,0.28)] sm:p-5"
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
                    else if (area === 'Lagos Mainland') setArea('');
                  }}
                  className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                    searchSide === tab.id
                      ? 'bg-ink-900 text-white'
                      : 'bg-paper text-ink-600 hover:bg-clay hover:text-ink-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <NextCurrencySwitcher />
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
                  className={`shrink-0 cursor-pointer rounded-full border px-3 py-1 text-[11px] font-bold transition ${
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
              <MapPin className="h-[17px] w-[17px] shrink-0 text-brass-600" />
              <div className="min-w-0 flex-1">
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-ink-400">
                  Where
                </span>
                <select
                  name="area"
                  aria-label="Choose a Lagos neighbourhood"
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
              <Calendar className="h-[17px] w-[17px] shrink-0 text-brass-600" />
              <div className="min-w-0 flex-1">
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-ink-400">
                  Check in
                </span>
                <input
                  name="checkIn"
                  type="date"
                  min={minDate}
                  aria-label="Check-in date"
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
              <Calendar className="h-[17px] w-[17px] shrink-0 text-brass-600" />
              <div className="min-w-0 flex-1">
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-ink-400">
                  Check out
                </span>
                <input
                  name="checkOut"
                  type="date"
                  min={checkIn ? addDaysToIsoDate(checkIn, 1) : addDaysToIsoDate(minDate, 1)}
                  aria-label="Check-out date"
                  value={checkOut}
                  onChange={e => setCheckOut(e.target.value)}
                  className="w-full min-w-0 bg-transparent text-[13px] font-bold text-ink-900 focus:outline-none"
                />
              </div>
            </label>

            <div className="flex items-stretch gap-2 lg:col-span-2">
              <label className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-ink-100 bg-paper/65 px-3 py-2.5">
                <Users className="h-4 w-4 shrink-0 text-brass-600" />
                <div className="min-w-0 flex-1">
                  <span className="block text-[10px] font-extrabold uppercase tracking-wider text-ink-400">
                    Guests
                  </span>
                  <select
                    name="guests"
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
                <Search className="h-4 w-4 shrink-0" />
                <span>Search</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ── Available Stays Marketplace Board ──────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Lagos marketplace</p>
            <h2 className="mt-1 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
              Stays you might love
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
                  className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                    boardFilter === tab.id
                      ? 'bg-ink-900 text-white'
                      : 'text-ink-600 hover:text-ink-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <Link href="/stays" className="btn-outline !rounded-full !px-4 !py-2 text-xs">
              View all <ArrowRight className="h-3.5 w-3.5 shrink-0" />
            </Link>
          </div>
        </div>

        {/* Area jump links */}
        <div className="mt-5 flex items-center gap-2 overflow-x-auto overscroll-x-contain pb-2">
          {[
            { label: 'Lagos Mainland', href: '/stays?area=Lagos+Mainland' },
            { label: 'Yaba', href: '/stays?area=Yaba' },
            { label: 'Surulere', href: '/stays?area=Surulere' },
            { label: 'Shomolu', href: '/stays?area=Shomolu' },
            { label: 'Ikeja GRA', href: '/stays?area=Ikeja+GRA' },
            { label: 'Victoria Island', href: '/stays?area=Victoria+Island' },
            { label: 'Ikoyi', href: '/stays?area=Ikoyi' },
            { label: 'Lekki Phase 1', href: '/stays?area=Lekki+Phase+1' },
            { label: 'Ajah', href: '/stays?area=Ajah' },
          ].map(chip => (
            <Link
              key={chip.label}
              href={chip.href}
              className="shrink-0 rounded-full border border-ink-200 bg-white px-3.5 py-1.5 text-xs font-bold text-ink-700 transition hover:border-ink-900 hover:bg-ink-900 hover:text-white"
            >
              {chip.label}
            </Link>
          ))}
        </div>

        {boardStays.length > 0 ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {boardStays.map(stay => (
              <StayListingCard key={stay.id} stay={stay} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-ink-200 bg-white px-6 py-12 text-center shadow-2xs">
            <h3 className="font-display text-2xl font-bold text-ink-900">
              {approvedStays.length === 0
                ? 'New verified stays arriving soon.'
                : 'No stays in this corridor yet.'}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">
              HAMLET publishes listings only after review — never placeholder or simulated inventory.
            </p>
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
                <Link href="/partners/apply" className="btn-jade !rounded-full">
                  <Building2 className="h-4 w-4 shrink-0" /> List a property
                </Link>
              )}
              <button
                type="button"
                onClick={() => openHoratio()}
                className="btn-outline !rounded-full"
              >
                <Sparkles className="h-4 w-4 shrink-0 text-brass-600" /> Ask Horatio
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Browse by Area (Photographic Mainland & Island Grid) ───── */}
      <section className="border-t border-ink-100 bg-clay/45 py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Mainland &amp; Island</p>
              <h2 className="mt-1 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
                Explore Lagos
              </h2>
            </div>
            <Link href="/lagos" className="btn-outline !rounded-full !px-5 !py-2 text-xs">
              Lagos guide <ArrowRight className="h-3.5 w-3.5 shrink-0" />
            </Link>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {NEIGHBOURHOOD_CARDS.map(card => {
              const floor = floorPriceFor(card.name);
              return (
                <Link
                  key={card.name}
                  href={card.href}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-2xs transition duration-300 hover:-translate-y-1 hover:border-ink-300 hover:shadow-md"
                >
                  <div className="relative h-44 overflow-hidden bg-clay">
                    <img
                      src={card.img}
                      alt={card.name}
                      loading="lazy"
                      className="h-full w-full object-cover opacity-100 transition duration-700 group-hover:scale-105"
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-ink-950/75 to-transparent" />
                    <span className="absolute left-3 top-3 rounded-full bg-ink-950/75 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-brass-300 backdrop-blur-md">
                      {card.corridor}
                    </span>
                    <h3 className="absolute bottom-2.5 left-3.5 right-3.5 font-display text-xl font-bold text-white drop-shadow-xs">
                      {card.name}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between gap-2 px-4 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-[11.5px] font-medium text-ink-500">
                        {card.sub}
                      </p>
                      <p className="mt-0.5 text-xs font-extrabold text-ink-900">
                        {floor ? `From ${floor} / night` : 'Browse stays'}
                      </p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-400 transition group-hover:text-ink-900" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Compact Partner Callout Banner ─────────────────────────── */}
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
            <Link href="/partners/apply" className="btn-brass !rounded-full !px-6">
              List a property <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-white/15"
            >
              How it works
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
