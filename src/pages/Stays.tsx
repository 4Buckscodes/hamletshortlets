import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, SearchX, ShieldCheck } from 'lucide-react';
import { GuestLayout } from '../components/Navbar';
import { PropertyCard } from '../components/PropertyCard';
import { useHamlet } from '../lib/store';
import { AREAS } from '../lib/seed';

const AMENITY_FILTERS = ['Wifi', 'Pool', 'Gym', 'Parking', '24/7 Power', 'Security', 'Workspace', 'Kitchen', 'Generator', 'Concierge'];
const TYPE_FILTERS = ['All types', 'Penthouse', 'Serviced apartment', 'Apartment', 'Studio apartment', 'Duplex', 'Villa'];

function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function Stays() {
  const { state, getUnavailablePropertyIds, backendReady, backendError } = useHamlet();
  const [params, setParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [unavailableIds, setUnavailableIds] = useState<Set<string>>(() => new Set());

  const area = params.get('area') ?? '';
  const checkIn = params.get('checkIn') ?? '';
  const checkOut = params.get('checkOut') ?? '';
  const guests = Number(params.get('guests') ?? '1');
  const maxPrice = params.get('maxPrice') ?? '';
  const type = params.get('type') ?? 'All types';
  const amenities = (params.get('amenities') ?? '').split(',').filter(Boolean);
  const minDate = todayIso();

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

  // Only approved, non-suspended listings without overlapping confirmed/held bookings are discoverable for selected dates.
  const results = state.properties
    .filter(p => p.status === 'approved')
    .filter(p => !unavailableIds.has(p.id))
    .filter(p => !area || p.area === area)
    .filter(p => p.capacity >= guests)
    .filter(p => !maxPrice || p.nightlyRate <= Number(maxPrice))
    .filter(p => type === 'All types' || p.type === type)
    .filter(p => amenities.every(a => p.amenities.includes(a)))
    .sort((a, b) => a.nightlyRate - b.nightlyRate);

  return (
    <GuestLayout>
      <div className="border-b border-ink-100 bg-clay/60">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <h1 className="font-display text-2xl font-black text-ink-900 sm:text-3xl">Explore verified Lagos stays</h1>
          <p className="mt-1 text-[12.5px] font-medium text-ink-500">
            {results.length} approved propert{results.length === 1 ? 'y' : 'ies'}{area ? ` in ${area}` : ''}{checkIn && checkOut ? ` · ${checkIn} → ${checkOut}` : ''} · capacity {guests}+ · only approved listings are shown
          </p>
          {backendError && <p role="alert" className="mt-2 text-sm font-semibold text-red-700">Could not load stays: {backendError}</p>}
          {!backendReady && <p role="status" className="mt-2 text-sm font-semibold text-ink-500">Loading verified stays…</p>}
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
              <label className="label" htmlFor="f-area">Area</label>
              <select id="f-area" className="input" value={area} onChange={e => update({ area: e.target.value })}>
                <option value="">All Lagos areas</option>
                {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
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
                  onChange={e => update({ checkIn: e.target.value })}
                />
              </label>
              <label className="min-w-0">
                <span className="label">Check-out</span>
                <input
                  type="date"
                  min={checkIn || minDate}
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
              <label className="label" htmlFor="f-price">Max nightly rate</label>
              <select id="f-price" className="input" value={maxPrice} onChange={e => update({ maxPrice: e.target.value })}>
                <option value="">No maximum</option>
                <option value="100000">₦100,000</option>
                <option value="200000">₦200,000</option>
                <option value="350000">₦350,000</option>
                <option value="500000">₦500,000</option>
                <option value="750000">₦750,000</option>
                <option value="1000000">₦1,000,000</option>
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
              Only approved, non-suspended listings appear here. Verification outcomes are recorded honestly — see each listing's trust badge.
            </div>
          </div>
        </aside>

        {/* Results */}
        <div className="lg:col-span-9">
          {results.length === 0 ? (
            <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
              <SearchX size={40} className="text-ink-300" />
              <h2 className="font-display text-xl font-black text-ink-900">No matches — yet</h2>
              <p className="max-w-sm text-[13px] font-medium text-ink-500">No approved properties match those filters right now. Try widening your search or dates — new supply is approved weekly.</p>
              <button onClick={() => setParams({}, { replace: true })} className="btn-jade mt-2 !py-2.5 text-[12px]">Clear filters</button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {results.map(p => <PropertyCard key={p.id} p={p} searchQuery={params.toString()} />)}
            </div>
          )}
        </div>
      </div>
    </GuestLayout>
  );
}
