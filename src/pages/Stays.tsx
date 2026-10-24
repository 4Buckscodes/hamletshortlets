import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, SearchX, ShieldCheck, Building2, Search } from 'lucide-react';
import { GuestLayout } from '../components/Navbar';
import { PropertyCard } from '../components/PropertyCard';
import { CurrencyToggle } from '../components/CurrencyToggle';
import { useHamlet } from '../lib/store';
import { useCurrency } from '../lib/currency';
import { usePageMeta } from '../lib/brand';
import {
  ISLAND_AND_LEKKI_AREAS,
  MAINLAND_AREAS,
  matchesLagosAreaFilter,
} from '../lib/areas';
import { addDaysToIsoDate, lagosIsoDateOffset } from '../lib/pricing';
import { computePropertyAvailabilitySummary } from '../lib/availability';

const AMENITY_FILTERS = ['Wifi', 'Pool', 'Gym', 'Parking', '24/7 Power', 'Security', 'Workspace', 'Kitchen', 'Generator', 'Concierge'];
const TYPE_FILTERS = ['All types', 'Penthouse', 'Serviced apartment', 'Apartment', 'Studio apartment', 'Duplex', 'Villa'];
const MAX_PRICE_TIERS = [120_000, 240_000, 420_000, 600_000, 900_000, 1_200_000];
const MAINLAND_QUICK_HUBS = ['Lagos Mainland', 'Yaba', 'Surulere', 'Shomolu', 'Ikeja GRA', 'Gbagada', 'Maryland', 'Ilupeju', 'Ebute Metta', 'Magodo'] as const;

export default function Stays() {
  usePageMeta(
    'Explore Shortlets in Lagos | Mainland & Island Apartments — HAMLET',
    'Browse shortlets across Lagos Mainland (Yaba, Shomolu, Surulere, Ikeja, Gbagada, Maryland & environs) and Lagos Island (Lekki, VI, Ikoyi, Ajah). Compare prices in Naira, USD, or GBP.',
  );

  const { state, getUnavailablePropertyIds, backendReady, backendError } = useHamlet();
  const { formatStayPrice } = useCurrency();
  const [params, setParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [unavailableIds, setUnavailableIds] = useState<Set<string>>(() => new Set());

  const keyword = params.get('q') ?? '';
  const area = params.get('area') ?? '';
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
      return () => { active = false; };
    }
    void getUnavailablePropertyIds(checkIn, checkOut)
      .then(ids => {
        if (active) setUnavailableIds(new Set(ids));
      })
      .catch(() => {
        if (active) setUnavailableIds(new Set());
      });
    return () => { active = false; };
  }, [checkIn, checkOut, getUnavailablePropertyIds, state.bookings]);

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v); else next.delete(k);
    }
    setParams(next, { replace: true });
  };

  const toggleAmenity = (a: string) => {
    const next = amenities.includes(a) ? amenities.filter(x => x !== a) : [...amenities, a];
    update({ amenities: next.join(',') });
  };

  const normalizedQuery = keyword.trim().toLowerCase();
  const isMainlandActive = MAINLAND_AREAS.some(m => m.toLowerCase() === area.trim().toLowerCase());

  // Approved listings remain discoverable for future dates unless filtered by a specific unavailable date range or availability filter.
  const results = state.properties
    .filter(p => p.status === 'approved')
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
    .sort((a, b) => a.nightlyRate - b.nightlyRate);

  const forwardQuery = new URLSearchParams();
  if (checkIn) forwardQuery.set('checkIn', checkIn);
  if (checkOut) forwardQuery.set('checkOut', checkOut);
  if (guests > 1) forwardQuery.set('guests', String(guests));

  return (
    <GuestLayout>
      <div className="border-b border-ink-100 bg-clay/60">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4 px-4 py-6 sm:px-6">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-jade-700">
              <Link to="/lagos" className="hover:underline">Lagos shortlets</Link>
              <span>·</span>
              <span>Your stay, sorted.</span>
            </div>
            <h1 className="mt-1 font-display text-2xl font-black text-ink-900 sm:text-3xl">
              {keyword.trim()
                ? `Stays matching “${keyword.trim()}”`
                : area === 'Lagos Mainland'
                  ? 'Shortlets in Lagos Mainland (Yaba, Shomolu, Surulere & environs)'
                  : area
                    ? `Shortlets in ${area}`
                    : 'Explore Lagos stays'}
            </h1>
            <p className="mt-1 text-[12.5px] font-medium text-ink-500">
              {!backendReady
                ? 'Finding spaces that fit your plans…'
                : `${results.length} approved propert${results.length === 1 ? 'y' : 'ies'}${area ? ` in ${area}` : ''}${checkIn && checkOut ? ` · ${checkIn} → ${checkOut}` : ''} · capacity ${guests}+`}
            </p>
            {backendError && (
              <p role="alert" className="mt-2 text-sm font-semibold text-red-700">
                Something didn’t go as planned ({backendError}). Please refresh the page and try again.
              </p>
            )}
          </div>
          <CurrencyToggle />
        </div>
      </div>

      <div className="mx-auto max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid lg:grid-cols-12">
        <div className="mb-4 lg:hidden">
          <button onClick={() => setShowFilters(v => !v)} className="btn-outline !py-2.5 text-[12px]">
            <SlidersHorizontal size={15} /> {showFilters ? 'Hide filters' : 'Show filters'}
          </button>
        </div>

        {/* Filters */}
        <aside className={`${showFilters ? 'block' : 'hidden'} lg:col-span-3 lg:block`}>
          <div className="card mb-6 p-5 lg:mb-0 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:overscroll-y-contain">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-base font-black text-ink-900"><SlidersHorizontal size={16} className="shrink-0" /> Filters</h2>
              <button
                onClick={() => setParams({}, { replace: true })}
                className="text-[11px] font-extrabold uppercase tracking-wide text-jade-700 hover:text-jade-800"
              >Clear all</button>
            </div>

            <div className="mt-4">
              <label className="label" htmlFor="f-q">Neighbourhood or keyword</label>
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
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
              <label className="label" htmlFor="f-area">Area</label>
              <select id="f-area" className="input" value={area} onChange={e => update({ area: e.target.value })}>
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
                    <option key={a} value={a}>{a}</option>
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
            {checkIn && checkOut && (
              <p className="mt-1.5 text-[10px] font-medium leading-snug text-ink-500">
                Excludes homes with confirmed/held bookings on these dates. Final availability is still verified by the host on request.
              </p>
            )}

            <div className="mt-4">
              <label className="label" htmlFor="f-guests">Guests (min capacity)</label>
              <select id="f-guests" className="input" value={guests} onChange={e => update({ guests: e.target.value === '1' ? '' : e.target.value })}>
                {[1, 2, 3, 4, 6, 8, 10].map(n => <option key={n} value={n}>{n}+ guests</option>)}
              </select>
            </div>

            <div className="mt-4">
              <label className="label" htmlFor="f-avail">Calendar availability</label>
              <select id="f-avail" className="input" value={availabilityMode} onChange={e => update({ avail: e.target.value === 'all' ? '' : e.target.value })}>
                <option value="all">All approved stays (now + future)</option>
                <option value="now">Available right now</option>
                <option value="future">Currently occupied · Future dates</option>
              </select>
            </div>

            <div className="mt-4">
              <label className="label" htmlFor="f-price">Max nightly stay price</label>
              <select id="f-price" className="input" value={maxPrice} onChange={e => update({ maxPrice: e.target.value })}>
                <option value="">No maximum</option>
                {MAX_PRICE_TIERS.map(tier => (
                  <option key={tier} value={String(tier)}>{formatStayPrice(tier)}</option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <label className="label">Property type</label>
              <div className="flex flex-wrap gap-1.5">
                {TYPE_FILTERS.map(t => (
                  <button key={t} onClick={() => update({ type: t === 'All types' ? '' : t })}
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${type === t ? 'border-jade-600 bg-jade-700 text-white' : 'border-ink-200 text-ink-600 hover:border-ink-400'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <label className="label">Amenities</label>
              <div className="flex flex-wrap gap-1.5">
                {AMENITY_FILTERS.map(a => (
                  <button key={a} onClick={() => toggleAmenity(a)}
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${amenities.includes(a) ? 'border-jade-600 bg-jade-700 text-white' : 'border-ink-200 text-ink-600 hover:border-ink-400'}`}>
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-jade-50 p-3 text-[10.5px] font-semibold leading-relaxed text-jade-900">
              <ShieldCheck size={13} className="mb-1 shrink-0" />
              Only approved, non-suspended listings appear here. Verification outcomes are recorded honestly — see each listing’s trust badge.
            </div>
          </div>
        </aside>

        {/* Results */}
        <div className="lg:col-span-9">
          {isMainlandActive && (
            <div className="mb-4 rounded-2xl border border-jade-200 bg-jade-50/70 p-3.5">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-jade-800">
                Lagos Mainland & Environs
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {MAINLAND_QUICK_HUBS.map(hub => {
                  const selected = area === hub;
                  return (
                    <button
                      key={hub}
                      type="button"
                      onClick={() => update({ area: hub })}
                      className={`rounded-full border px-3 py-1 text-[11px] font-bold transition ${
                        selected
                          ? 'border-jade-700 bg-jade-700 text-white'
                          : 'border-jade-200 bg-white text-ink-700 hover:border-jade-500'
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
              <p role="status" className="font-display text-lg font-bold text-ink-800">Finding spaces that fit your plans…</p>
            </div>
          ) : results.length === 0 ? (
            <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
              <SearchX size={40} className="text-ink-300" />
              <h2 className="font-display text-xl font-black text-ink-900">
                {totalApproved === 0 ? 'We’re still adding stays in this area.' : 'Nothing matches your search right now.'}
              </h2>
              <p className="max-w-md text-[13px] font-medium leading-relaxed text-ink-500">
                {totalApproved === 0
                  ? 'Try another neighbourhood or check back as more properties become available. Property owners and managers across Lagos Mainland and Island can apply to list now.'
                  : 'Try adjusting your dates, location, or filters to see more available stays.'}
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-2.5">
                {totalApproved === 0 ? (
                  <>
                    <Link to="/partner/register" className="btn-jade !py-2.5 text-[12px]">
                      <Building2 size={14} /> List your property
                    </Link>
                    <Link to="/lagos" className="btn-outline !py-2.5 text-[12px]">Lagos neighbourhood guide</Link>
                  </>
                ) : (
                  <>
                    <button onClick={() => setParams({}, { replace: true })} className="btn-jade !py-2.5 text-[12px]">Clear filters</button>
                    <Link to="/lagos" className="btn-outline !py-2.5 text-[12px]">Browse Lagos neighbourhoods</Link>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {results.map(p => <PropertyCard key={p.id} p={p} searchQuery={forwardQuery.toString()} />)}
            </div>
          )}
        </div>
      </div>
    </GuestLayout>
  );
}
