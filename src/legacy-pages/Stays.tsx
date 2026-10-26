import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  SlidersHorizontal,
  SearchX,
  Building2,
  Search,
  Heart,
  Sparkles,
} from 'lucide-react';
import { GuestLayout } from '../components/Navbar';
import { PropertyCard } from '../components/PropertyCard';
import { CurrencyToggle } from '../components/CurrencyToggle';
import { useHoratio } from '../components/HoratioDrawer';
import { useHamlet } from '../lib/store';
import { useCurrency } from '../lib/currency';
import { useWishlist } from '../lib/wishlist';
import { usePageMeta } from '../lib/brand';
import {
  ISLAND_AND_LEKKI_AREAS,
  isMainlandProperty,
  MAINLAND_AREAS,
  matchesLagosAreaFilter,
} from '../lib/areas';
import { addDaysToIsoDate, lagosIsoDateOffset } from '../lib/pricing';
import { computePropertyAvailabilitySummary } from '../lib/availability';

const AMENITY_FILTERS = [
  'Wifi',
  'Pool',
  'Gym',
  'Parking',
  '24/7 Power',
  'Security',
  'Workspace',
  'Kitchen',
  'Generator',
  'Concierge',
];
const TYPE_FILTERS = [
  'All types',
  'Penthouse',
  'Serviced apartment',
  'Apartment',
  'Studio apartment',
  'Duplex',
  'Villa',
];
const MAX_PRICE_TIERS = [120_000, 240_000, 420_000, 600_000, 900_000, 1_200_000];
const MAINLAND_QUICK_HUBS = [
  'Lagos Mainland',
  'Yaba',
  'Surulere',
  'Shomolu',
  'Ikeja GRA',
  'Gbagada',
  'Maryland',
  'Ilupeju',
  'Ebute Metta',
  'Magodo',
] as const;

type SortMode = 'recommended' | 'price_asc' | 'price_desc' | 'capacity';

export default function Stays() {
  usePageMeta(
    'Explore Shortlets in Lagos | Mainland & Island Apartments — HAMLET',
    'Browse shortlets across Lagos Mainland (Yaba, Shomolu, Surulere, Ikeja, Gbagada, Maryland & environs) and Lagos Island (Lekki, VI, Ikoyi, Ajah). Compare prices in Naira, USD, or GBP.',
  );

  const { state, getUnavailablePropertyIds, backendReady, backendError } = useHamlet();
  const { formatStayPrice } = useCurrency();
  const { savedIds } = useWishlist();
  const { openHoratio } = useHoratio();
  const [params, setParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [unavailableIds, setUnavailableIds] = useState<Set<string>>(() => new Set());

  const keyword = params.get('q') ?? '';
  const area = params.get('area') ?? '';
  const side = params.get('side') ?? '';
  const savedOnly = params.get('saved') === '1';
  const sort = (params.get('sort') as SortMode | null) ?? 'recommended';
  const checkIn = params.get('checkIn') ?? '';
  const checkOut = params.get('checkOut') ?? '';
  const availabilityMode = params.get('avail') ?? 'all';
  const guests = Number(params.get('guests') ?? '1');
  const maxPrice = params.get('maxPrice') ?? '';
  const type = params.get('type') ?? 'All types';
  const amenities = (params.get('amenities') ?? '').split(',').filter(Boolean);
  const minDate = lagosIsoDateOffset(0);
  const totalApproved = state.properties.filter(p => p.status === 'approved').length;

  useEffect(() => {
    let active = true;
    const validWindow = Boolean(checkIn && checkOut && new Date(checkOut) > new Date(checkIn));
    if (!validWindow) {
      Promise.resolve().then(() => {
        if (active) setUnavailableIds(new Set());
      });
      return () => {
        active = false;
      };
    }
    void getUnavailablePropertyIds(checkIn, checkOut)
      .then(ids => {
        if (active) setUnavailableIds(new Set(ids));
      })
      .catch(() => {
        if (active) setUnavailableIds(new Set());
      });
    return () => {
      active = false;
    };
  }, [checkIn, checkOut, getUnavailablePropertyIds, state.bookings]);

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next, { replace: true });
  };

  const toggleAmenity = (a: string) => {
    const next = amenities.includes(a) ? amenities.filter(x => x !== a) : [...amenities, a];
    update({ amenities: next.join(',') });
  };

  const normalizedQuery = keyword.trim().toLowerCase();
  const isMainlandActive =
    side.toLowerCase() === 'mainland' ||
    MAINLAND_AREAS.some(m => m.toLowerCase() === area.trim().toLowerCase());

  const results = state.properties
    .filter(p => p.status === 'approved')
    .filter(p => !savedOnly || savedIds.includes(p.id))
    .filter(p => {
      if (side.toLowerCase() === 'mainland') return isMainlandProperty(p);
      if (side.toLowerCase() === 'island') return !isMainlandProperty(p);
      return true;
    })
    .filter(p => !unavailableIds.has(p.id))
    .filter(p => {
      if (availabilityMode === 'all') return true;
      const summary = computePropertyAvailabilitySummary({
        property: p,
        bookings: state.bookings,
        publicCalendarSpans: state.publicCalendarSpans,
      });
      if (availabilityMode === 'now') return summary.currentStatus === 'available_now';
      if (availabilityMode === 'future') return summary.currentStatus !== 'available_now';
      return true;
    })
    .filter(p => {
      if (!normalizedQuery) return true;
      if (matchesLagosAreaFilter(p, normalizedQuery)) return true;
      const haystack = `${p.title} ${p.area} ${p.address} ${p.type}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    })
    .filter(p => !area || matchesLagosAreaFilter(p, area))
    .filter(p => p.capacity >= guests)
    .filter(p => !maxPrice || Math.round(p.nightlyRate * 1.2) <= Number(maxPrice))
    .filter(p => type === 'All types' || p.type === type)
    .filter(p => amenities.every(a => p.amenities.includes(a)))
    .sort((a, b) => {
      if (sort === 'price_asc') return a.nightlyRate - b.nightlyRate;
      if (sort === 'price_desc') return b.nightlyRate - a.nightlyRate;
      if (sort === 'capacity') return b.capacity - a.capacity || a.nightlyRate - b.nightlyRate;
      // Recommended: fully inspected & Wayfinder-ready homes first, then price ascending
      const score = (x: typeof a) =>
        (x.verification.inspection === 'verified' ? 2 : 0) +
        (x.wayfinderStatus === 'guide_ready' ? 1 : 0);
      const diff = score(b) - score(a);
      return diff !== 0 ? diff : a.nightlyRate - b.nightlyRate;
    });

  const forwardQuery = new URLSearchParams();
  if (checkIn) forwardQuery.set('checkIn', checkIn);
  if (checkOut) forwardQuery.set('checkOut', checkOut);
  if (guests > 1) forwardQuery.set('guests', String(guests));

  const headingText = savedOnly
    ? 'Saved stays'
    : keyword.trim()
      ? `“${keyword.trim()}”`
      : area === 'Lagos Mainland' || side.toLowerCase() === 'mainland'
        ? 'Lagos Mainland stays'
        : side.toLowerCase() === 'island'
          ? 'Lagos Island stays'
          : area
            ? `Stays in ${area}`
            : 'Explore stays';

  return (
    <GuestLayout>
      {/* Editorial Top Header */}
      <div className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-brass-600">
                <Link to="/lagos" className="hover:underline">
                  Lagos
                </Link>
              </div>
              <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
                {headingText}
              </h1>
              <p className="mt-1 text-[13px] font-medium text-ink-500">
                {!backendReady
                  ? 'Loading stays…'
                  : `${results.length} stay${results.length === 1 ? '' : 's'}${checkIn && checkOut ? ` · ${checkIn} → ${checkOut}` : ''}`}
              </p>
              {backendError && (
                <p role="alert" className="mt-2 text-sm font-semibold text-red-700">
                  Could not load stays ({backendError}).
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <CurrencyToggle />
              <button
                type="button"
                onClick={() => openHoratio()}
                className="inline-flex items-center gap-1.5 rounded-full border border-brass-400/60 bg-paper px-3.5 py-2 text-xs font-bold text-ink-900 transition hover:border-brass-500 [&>svg]:shrink-0"
              >
                <Sparkles size={13} className="text-brass-600" />
                Ask Horatio
              </button>
            </div>
          </div>

          {/* Corridor + Sort Control Bar */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { label: 'All Lagos', nextSide: '', nextArea: '' },
                { label: 'Lagos Mainland', nextSide: 'Mainland', nextArea: '' },
                { label: 'Lagos Island', nextSide: 'Island', nextArea: '' },
              ].map(tab => {
                const active =
                  tab.nextSide === ''
                    ? !side && area !== 'Lagos Mainland' && !savedOnly
                    : side.toLowerCase() === tab.nextSide.toLowerCase();
                return (
                  <button
                    key={tab.label}
                    type="button"
                    onClick={() =>
                      update({ side: tab.nextSide, area: tab.nextArea, saved: '' })
                    }
                    className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                      active
                        ? 'bg-ink-900 text-white'
                        : 'border border-ink-200 bg-paper/70 text-ink-700 hover:border-ink-400'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => update({ saved: savedOnly ? '' : '1' })}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition [&>svg]:shrink-0 ${
                  savedOnly
                    ? 'border-brass-600 bg-brass-500 text-ink-950'
                    : 'border-ink-200 bg-white text-ink-700 hover:border-ink-400'
                }`}
              >
                <Heart size={12} className={savedOnly ? 'fill-ink-950' : 'text-brass-600'} />
                Saved ({savedIds.length})
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'recommended', label: 'Recommended' },
                  { id: 'price_asc', label: 'Price: low → high' },
                  { id: 'price_desc', label: 'Price: high → low' },
                  { id: 'capacity', label: 'Largest group' },
                ] as const
              ).map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => update({ sort: opt.id === 'recommended' ? '' : opt.id })}
                  className={`rounded-full px-3 py-1.5 text-[11.5px] font-bold transition ${
                    sort === opt.id
                      ? 'bg-clay text-ink-950 ring-1 ring-ink-300'
                      : 'text-ink-500 hover:bg-paper hover:text-ink-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl gap-7 px-4 py-7 sm:px-6 lg:grid lg:grid-cols-12">
        <div className="mb-4 lg:hidden">
          <button
            type="button"
            onClick={() => setShowFilters(v => !v)}
            className="btn-outline !rounded-full !py-2.5 text-[12px]"
          >
            <SlidersHorizontal size={15} /> {showFilters ? 'Hide filters' : 'Filters & amenities'}
          </button>
        </div>

        {/* Filters Sidebar — preserves sticky scroll responsiveness invariants */}
        <aside className={`${showFilters ? 'block' : 'hidden'} lg:col-span-3 lg:block`}>
          <div className="card mb-6 p-5 lg:mb-0 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:overscroll-y-contain">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink-900">
                <SlidersHorizontal size={16} className="shrink-0 text-brass-600" /> Filters
              </h2>
              <button
                type="button"
                onClick={() => setParams({}, { replace: true })}
                className="text-[11px] font-extrabold uppercase tracking-wide text-jade-700 hover:text-jade-800"
              >
                Clear all
              </button>
            </div>

            <div className="mt-4">
              <label className="label" htmlFor="f-q">
                Neighbourhood or keyword
              </label>
              <div className="relative">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
                />
                <input
                  id="f-q"
                  type="search"
                  placeholder="e.g. Yaba, Surulere, Shomolu, Lekki…"
                  className="input !pl-8.5"
                  value={keyword}
                  onChange={e => update({ q: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="label" htmlFor="f-area">
                Area
              </label>
              <select
                id="f-area"
                className="input"
                value={area}
                onChange={e => update({ area: e.target.value, side: '' })}
              >
                <option value="">All Lagos areas</option>
                <optgroup label="Lagos Mainland & Environs">
                  {MAINLAND_AREAS.map(a => (
                    <option key={a} value={a}>
                      {a === 'Lagos Mainland' ? 'Lagos Mainland (All)' : a}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Lagos Island & Lekki Corridor">
                  {ISLAND_AND_LEKKI_AREAS.map(a => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <label className="min-w-0">
                <span className="label">Check-in</span>
                <input
                  type="date"
                  min={minDate}
                  className="input min-w-0 !px-2.5 text-[12px]"
                  value={checkIn}
                  onChange={e => {
                    const nextIn = e.target.value;
                    if (nextIn && checkOut && checkOut <= nextIn) {
                      update({ checkIn: nextIn, checkOut: addDaysToIsoDate(nextIn, 2) });
                    } else {
                      update({ checkIn: nextIn });
                    }
                  }}
                />
              </label>
              <label className="min-w-0">
                <span className="label">Check-out</span>
                <input
                  type="date"
                  min={checkIn ? addDaysToIsoDate(checkIn, 1) : addDaysToIsoDate(minDate, 1)}
                  className="input min-w-0 !px-2.5 text-[12px]"
                  value={checkOut}
                  onChange={e => update({ checkOut: e.target.value })}
                />
              </label>
            </div>

            <div className="mt-4">
              <label className="label" htmlFor="f-guests">
                Guests
              </label>
              <select
                id="f-guests"
                className="input"
                value={guests}
                onChange={e => update({ guests: e.target.value === '1' ? '' : e.target.value })}
              >
                {[1, 2, 3, 4, 6, 8, 10].map(n => (
                  <option key={n} value={n}>
                    {n}+ guests
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <label className="label" htmlFor="f-avail">
                Calendar availability
              </label>
              <select
                id="f-avail"
                className="input"
                value={availabilityMode}
                onChange={e => update({ avail: e.target.value === 'all' ? '' : e.target.value })}
              >
                <option value="all">All approved stays (now + future)</option>
                <option value="now">Available right now</option>
                <option value="future">Currently occupied · Future dates</option>
              </select>
            </div>

            <div className="mt-4">
              <label className="label" htmlFor="f-price">
                Max nightly stay price
              </label>
              <select
                id="f-price"
                className="input"
                value={maxPrice}
                onChange={e => update({ maxPrice: e.target.value })}
              >
                <option value="">No maximum</option>
                {MAX_PRICE_TIERS.map(tier => (
                  <option key={tier} value={String(tier)}>
                    {formatStayPrice(tier)}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <label className="label">Property type</label>
              <div className="flex flex-wrap gap-1.5">
                {TYPE_FILTERS.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => update({ type: t === 'All types' ? '' : t })}
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
                      type === t
                        ? 'border-ink-900 bg-ink-900 text-white'
                        : 'border-ink-200 text-ink-600 hover:border-ink-400'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <label className="label">Amenities</label>
              <div className="flex flex-wrap gap-1.5">
                {AMENITY_FILTERS.map(a => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleAmenity(a)}
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
                      amenities.includes(a)
                        ? 'border-brass-600 bg-brass-500 text-ink-950'
                        : 'border-ink-200 text-ink-600 hover:border-ink-400'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Results Column */}
        <div className="lg:col-span-9">
          {isMainlandActive && (
            <div className="mb-5 rounded-2xl border border-ink-200 bg-white p-4 shadow-2xs">
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-brass-700">
                Lagos Mainland
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {MAINLAND_QUICK_HUBS.map(hub => {
                  const selected =
                    area === hub || (hub === 'Lagos Mainland' && !area && side === 'Mainland');
                  return (
                    <button
                      key={hub}
                      type="button"
                      onClick={() => update({ area: hub, side: '' })}
                      className={`rounded-full border px-3 py-1 text-[11px] font-bold transition ${
                        selected
                          ? 'border-ink-900 bg-ink-900 text-white'
                          : 'border-ink-200 bg-paper text-ink-700 hover:border-ink-400'
                      }`}
                    >
                      {hub === 'Lagos Mainland' ? 'All Mainland' : hub}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!backendReady ? (
            <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
              <p role="status" className="font-display text-lg font-bold text-ink-800">
                Loading stays…
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
              <SearchX size={36} className="text-ink-300" />
              <h2 className="font-display text-2xl font-bold text-ink-900">
                {savedOnly
                  ? 'No saved stays yet.'
                  : totalApproved === 0
                    ? 'More stays arriving soon.'
                    : 'No stays match these filters.'}
              </h2>
              <p className="max-w-sm text-[13px] font-medium text-ink-500">
                {savedOnly
                  ? 'Tap the heart icon on any listing to save it here.'
                  : totalApproved === 0
                    ? 'Check back soon or list a property in Lagos.'
                    : 'Adjust your dates, area, or filters.'}
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-2.5">
                {totalApproved === 0 && !savedOnly ? (
                  <>
                    <Link to="/partner/register" className="btn-jade !rounded-full !py-2.5 text-[12px]">
                      <Building2 size={14} /> List your property
                    </Link>
                    <Link to="/lagos" className="btn-outline !rounded-full !py-2.5 text-[12px]">
                      Lagos neighbourhood guide
                    </Link>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setParams({}, { replace: true })}
                      className="btn-jade !rounded-full !py-2.5 text-[12px]"
                    >
                      Clear filters
                    </button>
                    <Link to="/lagos" className="btn-outline !rounded-full !py-2.5 text-[12px]">
                      Browse Lagos neighbourhoods
                    </Link>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {results.map(p => (
                <PropertyCard key={p.id} p={p} searchQuery={forwardQuery.toString()} />
              ))}
            </div>
          )}
        </div>
      </div>
    </GuestLayout>
  );
}
