'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Building2,
  Calendar,
  MapPin,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  ISLAND_AND_LEKKI_AREAS,
  MAINLAND_AREAS,
  isMainlandArea,
} from '@/lib/areas';
import {
  parseDiscoverySearchParams,
  type DiscoveryFilterState,
} from '@/lib/discovery';

type LagosSideOption = DiscoveryFilterState['side'];
import type { PublicStayRecord } from '@/lib/next-supabase';
import { APPROVED_OWNER_SERVICES_POLICY_COPY, lagosIsoDateOffset } from '@/lib/pricing';
import { DiscoveryMarketplace } from '@/components/site/DiscoveryMarketplace';

const HERO_COLLAGE = [
  {
    src: '/images/prop/living-1.jpg',
    alt: 'Bright furnished shortlet living room in Lagos',
    badge: 'Victoria Island · Ikoyi · Lekki',
  },
  {
    src: '/images/prop/bed-1.jpg',
    alt: 'Furnished bedroom inside a Lagos shortlet apartment',
    badge: 'Yaba · Surulere · Ikeja GRA',
  },
  {
    src: '/images/prop/kitchen-1.jpg',
    alt: 'Modern fitted apartment kitchen in Lagos',
    badge: '4-pillar property verification',
  },
] as const;

const MOBILE_ISLAND_CHIPS = [
  'Lekki Phase 1',
  'Ikate',
  'Victoria Island',
  'Ikoyi',
  'Oniru',
  'Ajah',
] as const;

const MOBILE_MAINLAND_CHIPS = [
  'Yaba',
  'Ikeja GRA',
  'Surulere',
  'Shomolu',
  'Maryland',
  'Gbagada',
] as const;

const MOBILE_ANYWHERE_CHIPS = [
  'Lekki Phase 1',
  'Victoria Island',
  'Yaba',
  'Ikoyi',
  'Ikeja GRA',
  'Surulere',
  'Ikate',
  'Shomolu',
] as const;

function formatShortDateRange(checkIn: string, checkOut: string): string {
  if (!checkIn && !checkOut) return 'Add check-in / out';
  const fmt = (iso: string) => {
    const parsed = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return iso;
    return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };
  if (checkIn && checkOut) return `${fmt(checkIn)} – ${fmt(checkOut)}`;
  if (checkIn) return `${fmt(checkIn)} · Add out`;
  return `Add in · ${fmt(checkOut)}`;
}

export function HomeMarketplaceExperience({
  approvedStays,
  queryError = false,
}: {
  approvedStays: PublicStayRecord[];
  queryError?: boolean;
}) {
  const router = useRouter();
  const todayIso = useMemo(() => lagosIsoDateOffset(0), []);

  // Desktop search state (defaults to Anywhere in Lagos)
  const [area, setArea] = useState('');
  // Mobile hero search sheet state (defaults to Island + Lekki Phase 1 per mobile design spec)
  const [mobileSide, setMobileSide] = useState<LagosSideOption>('island');
  const [mobileArea, setMobileArea] = useState<string>('Lekki Phase 1');
  const [mobileDatesOpen, setMobileDatesOpen] = useState(false);

  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('2');
  const [urlFilters, setUrlFilters] = useState<Partial<DiscoveryFilterState> | undefined>(
    undefined,
  );
  const [urlKey, setUrlKey] = useState('initial');

  useEffect(() => {
    if (typeof window === 'undefined' || !window.location.search) return;
    const sp = new URLSearchParams(window.location.search);
    const record: Record<string, string | undefined> = {};
    sp.forEach((value, key) => {
      record[key] = value;
    });
    const parsed = parseDiscoverySearchParams(record);
    const timer = window.setTimeout(() => {
      setUrlFilters(parsed);
      setUrlKey(window.location.search);
      if (parsed.area) {
        setArea(parsed.area);
        setMobileArea(parsed.area);
        setMobileSide(isMainlandArea(parsed.area) ? 'mainland' : 'island');
      } else if (parsed.side === 'island' || parsed.side === 'mainland') {
        setMobileSide(parsed.side);
        setMobileArea('');
      } else if (sp.has('side')) {
        setMobileSide('all');
        setMobileArea('');
      }
      if (parsed.checkIn) setCheckIn(parsed.checkIn);
      if (parsed.checkOut) setCheckOut(parsed.checkOut);
      if (parsed.guests > 1) setGuests(String(parsed.guests));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const visibleMobileChips = useMemo(() => {
    if (mobileSide === 'island') return MOBILE_ISLAND_CHIPS;
    if (mobileSide === 'mainland') return MOBILE_MAINLAND_CHIPS;
    return MOBILE_ANYWHERE_CHIPS;
  }, [mobileSide]);

  function handleMobileSideSelect(nextSide: LagosSideOption) {
    setMobileSide(nextSide);
    if (nextSide === 'island') {
      setMobileArea(prev =>
        prev && !isMainlandArea(prev) ? prev : 'Lekki Phase 1',
      );
    } else if (nextSide === 'mainland') {
      setMobileArea(prev => (prev && isMainlandArea(prev) ? prev : 'Yaba'));
    } else {
      setMobileArea('');
    }
  }

  function handleMobileChipToggle(chip: string) {
    setMobileArea(prev => (prev === chip ? '' : chip));
  }

  function onDesktopHeroSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (area.trim()) params.set('area', area.trim());
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    const parsedGuests = Number(guests);
    if (Number.isInteger(parsedGuests) && parsedGuests > 1) {
      params.set('guests', String(parsedGuests));
    }
    const qs = params.toString();
    router.push(qs ? `/stays?${qs}` : '/stays');
  }

  function onMobileHeroSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (mobileSide === 'island' || mobileSide === 'mainland') {
      params.set('side', mobileSide);
    }
    if (mobileArea.trim()) {
      params.set('area', mobileArea.trim());
    }
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    const parsedGuests = Number(guests);
    if (Number.isInteger(parsedGuests) && parsedGuests > 1) {
      params.set('guests', String(parsedGuests));
    }
    const qs = params.toString();
    router.push(qs ? `/stays?${qs}` : '/stays');
  }

  return (
    <div>
      {/* ── Focused Lagos Discovery Hero ── */}
      <section className="relative overflow-hidden bg-[#0E1F3B] text-[#F8F5EE] lg:border-b lg:border-ink-800 lg:bg-ink-950 lg:text-paper">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(ellipse_at_top_right,rgba(200,162,74,0.16),transparent_60%),radial-gradient(ellipse_at_bottom_left,rgba(15,106,82,0.18),transparent_55%)] lg:block"
        />

        <div className="relative z-10 mx-auto max-w-7xl px-5 pt-5 pb-0 sm:px-6 lg:py-16">
          <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-10">
            <div className="min-w-0 lg:col-span-7">
              {/* Mobile editorial eyebrow */}
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[2px] text-[#C9A45C] lg:hidden">
                Verified Shortlets · Lagos
              </p>

              {/* Desktop trust pill */}
              <div className="hidden max-w-full flex-wrap items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3.5 py-1.5 text-[11px] font-bold tracking-wider text-brass-300 lg:inline-flex">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-brass-400" />
                <span className="uppercase">Your stay, sorted.</span>
                <span className="text-ink-400">·</span>
                <span className="text-ink-200">Lagos Island &amp; Mainland</span>
              </div>

              <h1 className="mt-2.5 font-display text-[34px] font-bold leading-[1.1] tracking-tight text-[#F8F5EE] min-[375px]:text-[40px] sm:text-5xl lg:mt-4 lg:text-[3.35rem] lg:leading-[1.08] lg:text-white">
                Find your next stay.
              </h1>

              {/* Mobile lagoon-side subcopy */}
              <p className="mt-2.5 max-w-[300px] text-[15px] leading-[1.5] text-[#C5CCDA] sm:max-w-md lg:hidden">
                Island or Mainland — pick your side of the lagoon.
              </p>

              {/* Desktop subcopy */}
              <p className="mt-3 hidden max-w-xl text-base leading-relaxed text-ink-200 lg:block">
                Verified shortlets across Lagos Island and Mainland.
              </p>

              {/* Desktop search card */}
              <form
                onSubmit={onDesktopHeroSearch}
                aria-label="Search Lagos shortlet stays"
                className="mt-6 hidden rounded-3xl border border-white/15 bg-white p-4 text-ink-900 shadow-2xl lg:block"
              >
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-12">
                  <label className="flex min-h-12 min-w-0 items-center gap-2.5 rounded-2xl border border-ink-100 bg-paper/75 px-3.5 py-2 focus-within:border-ink-900 sm:col-span-2 lg:col-span-4">
                    <MapPin className="h-4 w-4 shrink-0 text-brass-700" />
                    <div className="min-w-0 flex-1">
                      <span className="block text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                        Location
                      </span>
                      <select
                        aria-label="Location or Lagos neighbourhood"
                        value={area}
                        onChange={e => setArea(e.target.value)}
                        className="w-full min-w-0 bg-transparent text-xs font-bold text-ink-950 outline-none sm:text-sm"
                      >
                        <option value="">Anywhere in Lagos</option>
                        <optgroup label="Lagos Island & Lekki">
                          {ISLAND_AND_LEKKI_AREAS.map(item => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Lagos Mainland">
                          <option value="Lagos Mainland">All Lagos Mainland</option>
                          {MAINLAND_AREAS.map(item => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  </label>

                  <label className="flex min-h-12 min-w-0 items-center gap-2 rounded-2xl border border-ink-100 bg-paper/75 px-3 py-2 focus-within:border-ink-900 lg:col-span-3">
                    <Calendar className="h-4 w-4 shrink-0 text-brass-700" />
                    <div className="min-w-0 flex-1">
                      <span className="block text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                        Check-in
                      </span>
                      <input
                        type="date"
                        min={todayIso}
                        value={checkIn}
                        onChange={e => setCheckIn(e.target.value)}
                        className="w-full min-w-0 bg-transparent text-xs font-bold text-ink-950 outline-none"
                      />
                    </div>
                  </label>

                  <label className="flex min-h-12 min-w-0 items-center gap-2 rounded-2xl border border-ink-100 bg-paper/75 px-3 py-2 focus-within:border-ink-900 lg:col-span-3">
                    <Calendar className="h-4 w-4 shrink-0 text-brass-700" />
                    <div className="min-w-0 flex-1">
                      <span className="block text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                        Check-out
                      </span>
                      <input
                        type="date"
                        min={checkIn || todayIso}
                        value={checkOut}
                        onChange={e => setCheckOut(e.target.value)}
                        className="w-full min-w-0 bg-transparent text-xs font-bold text-ink-950 outline-none"
                      />
                    </div>
                  </label>

                  <label className="flex min-h-12 min-w-0 items-center gap-2 rounded-2xl border border-ink-100 bg-paper/75 px-3 py-2 focus-within:border-ink-900 sm:col-span-2 lg:col-span-2">
                    <Users className="h-4 w-4 shrink-0 text-brass-700" />
                    <div className="min-w-0 flex-1">
                      <span className="block text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                        Guests
                      </span>
                      <select
                        aria-label="Number of guests"
                        value={guests}
                        onChange={e => setGuests(e.target.value)}
                        className="w-full min-w-0 bg-transparent text-xs font-bold text-ink-950 outline-none sm:text-sm"
                      >
                        {[1, 2, 3, 4, 5, 6, 8, 10].map(count => (
                          <option key={count} value={count}>
                            {count} {count === 1 ? 'guest' : 'guests'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </label>
                </div>

                <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="m-0 px-1 text-[11px] font-medium text-ink-500">
                    No card charged until the host confirms availability.
                  </p>
                  <button
                    type="submit"
                    className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full bg-ink-950 px-6 text-xs font-extrabold text-white transition-colors hover:bg-ink-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500 sm:text-sm"
                  >
                    <Search className="h-4 w-4 shrink-0 text-brass-400" />
                    <span>Search stays</span>
                  </button>
                </div>
              </form>

              {/* Desktop quick Lagos Island & Mainland corridor links */}
              <div className="mt-4 hidden flex-wrap items-center gap-2 text-xs lg:flex">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-400">
                  Popular:
                </span>
                {[
                  'Lekki Phase 1',
                  'Ikate',
                  'Victoria Island',
                  'Ikoyi',
                  'Yaba',
                  'Surulere',
                  'Shomolu',
                ].map(corridor => (
                  <Link
                    key={corridor}
                    href={`/stays?area=${encodeURIComponent(corridor)}`}
                    className="inline-flex min-h-8 items-center rounded-full border border-white/15 bg-white/8 px-3 text-xs font-semibold text-ink-100 transition-colors hover:border-brass-400 hover:text-white"
                  >
                    {corridor}
                  </Link>
                ))}
              </div>
            </div>

            {/* Static architectural collage on desktop (no zoom or scale transitions) */}
            <div className="hidden lg:col-span-5 lg:grid lg:grid-cols-2 lg:gap-3.5">
              <div className="relative col-span-2 aspect-[16/10] overflow-hidden rounded-3xl border border-white/15 bg-ink-900">
                <img
                  src={HERO_COLLAGE[0].src}
                  alt={HERO_COLLAGE[0].alt}
                  decoding="async"
                  className="h-full w-full object-cover opacity-95"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/85 via-ink-950/35 to-transparent p-4">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-brass-300">
                    {HERO_COLLAGE[0].badge}
                  </span>
                </div>
              </div>

              {HERO_COLLAGE.slice(1).map(panel => (
                <div
                  key={panel.src}
                  className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/15 bg-ink-900"
                >
                  <img
                    src={panel.src}
                    alt={panel.alt}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover opacity-95"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/85 to-transparent p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-100">
                      {panel.badge}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Lagos Lagoon & Lekki-Ikoyi Bridge Architectural Illustration */}
        <svg
          viewBox="0 0 390 210"
          aria-hidden="true"
          className="pointer-events-none -mt-2 -mb-7 block h-auto w-full max-w-2xl mx-auto select-none lg:hidden"
        >
          <circle cx="296" cy="64" r="30" fill="#C9A45C" />
          <g fill="#16294A">
            <rect x="8" y="110" width="26" height="100" />
            <rect x="40" y="86" width="22" height="124" />
            <rect x="68" y="120" width="30" height="90" />
            <rect x="104" y="98" width="20" height="112" />
          </g>
          <g fill="#1B3358">
            <rect x="262" y="104" width="28" height="106" />
            <rect x="296" y="124" width="24" height="86" />
            <rect x="326" y="92" width="22" height="118" />
            <rect x="354" y="116" width="30" height="94" />
          </g>
          <path d="M0 150Q195 70 390 150" stroke="#C9A45C" strokeWidth="2" fill="none" />
          <path d="M0 156H390" stroke="#C9A45C" strokeWidth="2" />
          <g stroke="#C9A45C" strokeWidth="1" opacity="0.6">
            <path d="M65 132V156M130 117V156M195 110V156M260 117V156M325 132V156" />
          </g>
        </svg>

        {/* Mobile Warm Ivory Search Sheet */}
        <div className="relative z-10 overflow-hidden rounded-t-[28px] bg-[#F8F5EE] px-5 pt-5 pb-5 text-[#0E1F3B] lg:hidden">
          <form
            onSubmit={onMobileHeroSearch}
            aria-label="Search Lagos shortlet stays on mobile"
            className="mx-auto flex max-w-xl flex-col gap-3.5"
          >
            {/* 1. Lagoon side 3-way segmented control */}
            <div
              role="group"
              aria-label="Choose side of Lagos"
              className="flex gap-1 rounded-[22px] bg-[#ECE7DB] p-1"
            >
              {(
                [
                  { id: 'island', label: 'Island' },
                  { id: 'mainland', label: 'Mainland' },
                  { id: 'all', label: 'Anywhere' },
                ] as const
              ).map(option => {
                const active = mobileSide === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => handleMobileSideSelect(option.id)}
                    className={`h-[44px] flex-1 cursor-pointer rounded-[18px] text-[14px] font-semibold transition-colors ${
                      active
                        ? 'bg-[#0E1F3B] text-[#F8F5EE]'
                        : 'bg-transparent text-[#0E1F3B] hover:bg-white/60'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            {/* 2. Horizontally scrollable neighbourhood chips */}
            <div className="-mx-5 flex gap-2 overflow-x-auto overscroll-x-contain px-5 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {visibleMobileChips.map(chip => {
                const selected = mobileArea === chip;
                return (
                  <button
                    key={chip}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => handleMobileChipToggle(chip)}
                    className={`h-[40px] shrink-0 cursor-pointer rounded-[20px] border px-4 text-[14px] font-medium transition-colors ${
                      selected
                        ? 'border-[#0E1F3B] bg-[#0E1F3B] text-[#F8F5EE]'
                        : 'border-[#D6D0C0] bg-white text-[#0E1F3B] hover:border-[#0E1F3B]'
                    }`}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>

            {/* 3. DATES + GUESTS dual interactive cards */}
            <div className="flex gap-2.5">
              <button
                type="button"
                aria-expanded={mobileDatesOpen}
                aria-controls="mobile-hero-dates-panel"
                onClick={() => setMobileDatesOpen(prev => !prev)}
                className="min-h-[60px] min-w-0 flex-[3] cursor-pointer rounded-[16px] border border-[#D6D0C0] bg-white px-4 py-2.5 text-left text-[#0E1F3B] transition-colors hover:border-[#0E1F3B]"
              >
                <span className="block text-[11px] font-semibold uppercase tracking-[1px] text-[#5B6475]">
                  Dates
                </span>
                <span className="mt-[3px] block truncate text-[15px] font-medium text-[#0E1F3B]">
                  {formatShortDateRange(checkIn, checkOut)}
                </span>
              </button>

              <label className="relative min-h-[60px] min-w-0 flex-[2] cursor-pointer rounded-[16px] border border-[#D6D0C0] bg-white px-4 py-2.5 text-left text-[#0E1F3B] transition-colors focus-within:border-[#0E1F3B] hover:border-[#0E1F3B]">
                <span className="block text-[11px] font-semibold uppercase tracking-[1px] text-[#5B6475]">
                  Guests
                </span>
                <span
                  aria-hidden="true"
                  className="mt-[3px] block truncate text-[15px] font-medium text-[#0E1F3B]"
                >
                  {guests} {Number(guests) === 1 ? 'guest' : 'guests'}
                </span>
                <select
                  aria-label="Mobile number of guests"
                  value={guests}
                  onChange={e => setGuests(e.target.value)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0 text-base"
                >
                  {[1, 2, 3, 4, 5, 6, 8, 10].map(count => (
                    <option key={count} value={count}>
                      {count} {count === 1 ? 'guest' : 'guests'}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {mobileDatesOpen && (
              <div
                id="mobile-hero-dates-panel"
                className="rounded-[18px] border border-[#D6D0C0] bg-white p-3.5"
              >
                <div className="grid grid-cols-1 gap-2.5 min-[375px]:grid-cols-2">
                  <label className="block min-w-0 rounded-xl border border-[#E5DFD2] bg-[#F8F5EE] px-3 py-2">
                    <span className="block text-[10px] font-semibold uppercase tracking-[1px] text-[#5B6475]">
                      Check-in
                    </span>
                    <input
                      type="date"
                      min={todayIso}
                      value={checkIn}
                      onChange={e => setCheckIn(e.target.value)}
                      className="mt-0.5 w-full min-w-0 bg-transparent text-base font-medium text-[#0E1F3B] outline-none"
                    />
                  </label>
                  <label className="block min-w-0 rounded-xl border border-[#E5DFD2] bg-[#F8F5EE] px-3 py-2">
                    <span className="block text-[10px] font-semibold uppercase tracking-[1px] text-[#5B6475]">
                      Check-out
                    </span>
                    <input
                      type="date"
                      min={checkIn || todayIso}
                      value={checkOut}
                      onChange={e => setCheckOut(e.target.value)}
                      className="mt-0.5 w-full min-w-0 bg-transparent text-base font-medium text-[#0E1F3B] outline-none"
                    />
                  </label>
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCheckIn('');
                      setCheckOut('');
                    }}
                    className="cursor-pointer px-2 py-1 text-xs font-semibold text-[#5B6475] underline underline-offset-2"
                  >
                    Clear dates
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileDatesOpen(false)}
                    className="cursor-pointer rounded-full bg-[#0E1F3B] px-4 py-1.5 text-xs font-semibold text-[#F8F5EE]"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

            {/* 4. Primary pill Search stays CTA */}
            <button
              type="submit"
              className="flex h-[56px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-[28px] bg-[#0E1F3B] text-[16px] font-semibold text-[#F8F5EE] transition-colors hover:bg-[#16294A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A45C]"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#C9A45C"
                strokeWidth="2.2"
                strokeLinecap="round"
                aria-hidden="true"
                className="shrink-0"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <span>Search stays</span>
            </button>

            {/* 5. Reassurance microcopy */}
            <p className="m-0 text-center text-[12.5px] leading-[1.4] text-[#4A5468]">
              No card charged until the host confirms availability.
            </p>

            {/* 6. 4-pillar verification strip */}
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-[#DDD7C8] pt-3 text-[10.5px] font-semibold tracking-[0.5px] text-[#0E1F3B] min-[375px]:text-[11px]">
              <span>· TITLE</span>
              <span>· IDENTITY</span>
              <span>· AUTHORITY</span>
              <span>· INSPECTION</span>
            </div>
          </form>
        </div>
      </section>

      {/* ── Available Stays Marketplace Board ── */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <DiscoveryMarketplace
          key={urlKey}
          mode="homepage"
          approvedStays={approvedStays}
          initialFilters={urlFilters}
          queryError={queryError}
        />
      </div>

      {/* ── Partner CTA Card (Mobile Navy Card + Desktop Strip) ── */}
      <section className="bg-[#F8F5EE] px-4 pb-10 pt-2 sm:px-6 md:border-t md:border-ink-200/80 md:bg-clay/50 md:py-10">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[28px] bg-[#0E1F3B] px-6 py-7 text-[#F8F5EE] shadow-xl md:flex md:items-center md:justify-between md:gap-6 md:rounded-none md:bg-transparent md:p-0 md:text-ink-950 md:shadow-none">
            <div className="min-w-0 max-w-2xl">
              <p className="m-0 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#C9A45C] md:text-brass-700">
                Property owners &amp; verified managers
              </p>
              <h2 className="mt-2 font-display text-[26px] font-bold leading-[1.18] text-[#F8F5EE] md:mt-1 md:text-2xl md:text-ink-950">
                Own or manage a verified shortlet in Lagos?
              </h2>
              <p className="mt-2.5 text-[15px] leading-[1.55] text-[#C5CCDA] md:hidden">
                List with HAMLET for visibility, booking and property management support.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-[#9AA6BC] md:mt-1 md:text-sm md:text-ink-600">
                {APPROVED_OWNER_SERVICES_POLICY_COPY}
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 md:mt-0 md:shrink-0 md:flex-row md:flex-wrap md:items-center">
              <Link
                href="/partners/apply"
                className="inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-full bg-[#C9A45C] px-6 text-[16px] font-semibold text-[#0E1F3B] transition-colors hover:bg-[#D5B26B] md:min-h-11 md:w-auto md:bg-ink-950 md:px-5 md:text-sm md:font-bold md:text-white md:hover:bg-ink-800"
              >
                <Building2 className="hidden h-4 w-4 shrink-0 text-brass-400 md:inline-block" />
                <span>Apply as a partner</span>
              </Link>
              <Link
                href="/about"
                className="secondary-button hidden min-h-11 px-5 md:inline-flex"
              >
                How verification works <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
