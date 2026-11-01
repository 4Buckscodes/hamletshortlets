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
import { ISLAND_AND_LEKKI_AREAS, MAINLAND_AREAS } from '@/lib/areas';
import {
  parseDiscoverySearchParams,
  type DiscoveryFilterState,
  type ShowcaseConceptRecord,
} from '@/lib/discovery';
import type { PublicStayRecord } from '@/lib/next-supabase';
import { lagosIsoDateOffset } from '@/lib/pricing';
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

export function HomeMarketplaceExperience({
  approvedStays,
  showcaseConcepts = [],
  queryError = false,
}: {
  approvedStays: PublicStayRecord[];
  showcaseConcepts?: ShowcaseConceptRecord[];
  queryError?: boolean;
}) {
  const router = useRouter();
  const todayIso = useMemo(() => lagosIsoDateOffset(0), []);

  const [area, setArea] = useState('');
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
      if (parsed.area) setArea(parsed.area);
      if (parsed.checkIn) setCheckIn(parsed.checkIn);
      if (parsed.checkOut) setCheckOut(parsed.checkOut);
      if (parsed.guests > 1) setGuests(String(parsed.guests));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function onHeroSearch(event: FormEvent<HTMLFormElement>) {
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

  return (
    <div>
      {/* ── Focused Lagos Discovery Hero ── */}
      <section className="relative overflow-hidden border-b border-ink-800 bg-ink-950 text-paper">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(200,162,74,0.16),transparent_60%),radial-gradient(ellipse_at_bottom_left,rgba(15,106,82,0.18),transparent_55%)]"
        />

        <div className="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:py-16">
          <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-10">
            <div className="min-w-0 lg:col-span-7">
              <div className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3.5 py-1.5 text-[11px] font-bold tracking-wider text-brass-300">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-brass-400" />
                <span className="uppercase">Your stay, sorted.</span>
                <span className="text-ink-400">·</span>
                <span className="text-ink-200">Lagos Island &amp; Mainland</span>
              </div>

              <h1 className="mt-4 font-display text-3xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[3.35rem]">
                Find your next stay.
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-200 sm:text-base">
                Verified shortlet apartments across Lagos — clear details, trusted hosts, and straightforward booking requests.
              </p>

              {/* Mobile-first search card */}
              <form
                onSubmit={onHeroSearch}
                aria-label="Search Lagos shortlet stays"
                className="mt-6 rounded-3xl border border-white/15 bg-white p-3 text-ink-900 shadow-2xl sm:p-4"
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
                    No instant card charge — partners confirm availability before any payment link opens.
                  </p>
                  <button
                    type="submit"
                    className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full bg-ink-950 px-6 text-xs font-extrabold text-white transition hover:bg-ink-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500 sm:text-sm"
                  >
                    <Search className="h-4 w-4 shrink-0 text-brass-400" />
                    <span>Search stays</span>
                  </button>
                </div>
              </form>

              {/* Quick Lagos Island & Mainland corridor links */}
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
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
                    className="inline-flex min-h-8 items-center rounded-full border border-white/15 bg-white/8 px-3 text-xs font-semibold text-ink-100 transition hover:border-brass-400 hover:text-white"
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
      </section>

      {/* ── Available Stays Marketplace Board ── */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <DiscoveryMarketplace
          key={urlKey}
          mode="homepage"
          approvedStays={approvedStays}
          showcaseConcepts={showcaseConcepts}
          initialFilters={urlFilters}
          queryError={queryError}
        />
      </div>

      {/* ── Concise Partner & Verification Strip ── */}
      <section className="border-t border-ink-200/80 bg-clay/50">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-5 px-4 py-10 sm:px-6 md:flex-row md:items-center">
          <div className="min-w-0 max-w-2xl">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-brass-700">
              Property owners &amp; verified managers
            </p>
            <h2 className="mt-1 font-display text-xl font-bold text-ink-950 sm:text-2xl">
              Own or manage a verified shortlet in Lagos?
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-600 sm:text-sm">
              Property owners keep 100% of their listed nightly rate (0% owner fee). Learn how HAMLET verifies ownership, identity, authority, and physical condition before listings go live.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/partners/apply" className="primary-button min-h-11 px-5">
              <Building2 className="h-4 w-4 shrink-0 text-brass-400" />
              Apply as a partner
            </Link>
            <Link href="/about" className="secondary-button min-h-11 px-5">
              How verification works <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
