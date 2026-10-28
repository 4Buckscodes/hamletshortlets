'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { SlidersHorizontal, Search, RotateCcw } from 'lucide-react';
import { ISLAND_AND_LEKKI_AREAS, MAINLAND_AREAS } from '@/lib/areas';
import { guestFacingNightlyNgn } from '@/lib/pricing';
import type { PublicStayRecord } from '@/lib/next-supabase';
import { StayListingCard } from '@/components/site/SiteShell';
import {
  FocusedDrawer,
  StepperCounter,
  FIELD_INPUT_CLASS,
} from '@/components/forms/ProgressiveFormPrimitives';

const PROPERTY_TYPES = [
  'Apartment',
  'Serviced apartment',
  'Studio apartment',
  'Duplex',
  'Penthouse',
  'Villa',
  'Terrace',
] as const;

type SortKey = 'newest' | 'price_asc' | 'price_desc';

export interface StaysInitialFilters {
  area: string;
  checkIn: string;
  checkOut: string;
  guests: number | null;
  bedrooms: number | null;
  maxPrice: number | null;
  type: string;
}

export function StaysExplorer({
  stays,
  connected,
  availabilityVerified,
  availabilityMessage,
  initialFilters,
}: {
  stays: PublicStayRecord[];
  connected: boolean;
  availabilityVerified: boolean;
  availabilityMessage: string;
  initialFilters: StaysInitialFilters;
}) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [area, setArea] = useState(initialFilters.area);
  const [checkIn, setCheckIn] = useState(initialFilters.checkIn);
  const [checkOut, setCheckOut] = useState(initialFilters.checkOut);
  const [guests, setGuests] = useState(initialFilters.guests ?? 1);
  const [bedrooms, setBedrooms] = useState(initialFilters.bedrooms ?? 0);
  const [maxPrice, setMaxPrice] = useState(
    initialFilters.maxPrice ? String(initialFilters.maxPrice) : '',
  );
  const [type, setType] = useState(initialFilters.type);
  const [sort, setSort] = useState<SortKey>('newest');

  const activeFilterCount = [
    Boolean(initialFilters.area),
    Boolean(initialFilters.checkIn && initialFilters.checkOut),
    Boolean(initialFilters.guests && initialFilters.guests > 1),
    Boolean(initialFilters.bedrooms && initialFilters.bedrooms > 0),
    Boolean(initialFilters.maxPrice),
    Boolean(initialFilters.type),
  ].filter(Boolean).length;

  const sortedStays = useMemo(() => {
    const copy = [...stays];
    if (sort === 'price_asc') {
      copy.sort(
        (a, b) =>
          guestFacingNightlyNgn(Number(a.nightly_rate || 0)) -
          guestFacingNightlyNgn(Number(b.nightly_rate || 0)),
      );
    } else if (sort === 'price_desc') {
      copy.sort(
        (a, b) =>
          guestFacingNightlyNgn(Number(b.nightly_rate || 0)) -
          guestFacingNightlyNgn(Number(a.nightly_rate || 0)),
      );
    }
    return copy;
  }, [stays, sort]);

  const detailQuerySuffix = useMemo(() => {
    const qs = new URLSearchParams();
    if (initialFilters.checkIn) qs.set('checkIn', initialFilters.checkIn);
    if (initialFilters.checkOut) qs.set('checkOut', initialFilters.checkOut);
    if (initialFilters.guests) qs.set('guests', String(initialFilters.guests));
    const str = qs.toString();
    return str ? `?${str}` : '';
  }, [initialFilters.checkIn, initialFilters.checkOut, initialFilters.guests]);

  function applySearch(overrides?: Partial<{ area: string }>) {
    const params = new URLSearchParams();
    const nextArea = overrides?.area !== undefined ? overrides.area : area;
    if (nextArea) params.set('area', nextArea);
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    if (guests > 1) params.set('guests', String(guests));
    if (bedrooms > 0) params.set('bedrooms', String(bedrooms));
    if (type) params.set('type', type);
    if (maxPrice.trim()) params.set('maxPrice', maxPrice.trim());
    setDrawerOpen(false);
    const qs = params.toString();
    router.push(qs ? `/stays?${qs}` : '/stays');
  }

  function clearAll() {
    setArea('');
    setCheckIn('');
    setCheckOut('');
    setGuests(1);
    setBedrooms(0);
    setMaxPrice('');
    setType('');
    setDrawerOpen(false);
    router.push('/stays');
  }

  return (
    <div>
      {/* Compact Mobile-First Search Bar + Filter Sheet Trigger */}
      <form
        onSubmit={e => {
          e.preventDefault();
          applySearch();
        }}
        className="mt-6 grid gap-3.5 rounded-3xl border border-ink-100 bg-white p-4 shadow-[0_1px_2px_rgba(14,31,59,0.04),0_16px_40px_-28px_rgba(14,31,59,0.28)] sm:grid-cols-2 sm:p-5 lg:grid-cols-5"
      >
        <label className="grid gap-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink-500">
            Neighbourhood
          </span>
          <select
            value={area}
            onChange={e => setArea(e.target.value)}
            aria-label="Filter by Lagos neighbourhood"
            className={FIELD_INPUT_CLASS}
          >
            <option value="">All Lagos</option>
            <optgroup label="Island & Lekki">
              {ISLAND_AND_LEKKI_AREAS.map(a => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </optgroup>
            <optgroup label="Lagos Mainland & Environs">
              {MAINLAND_AREAS.map(a => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </optgroup>
          </select>
        </label>

        <label className="grid gap-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink-500">
            Check-in
          </span>
          <input
            type="date"
            value={checkIn}
            onChange={e => setCheckIn(e.target.value)}
            className={FIELD_INPUT_CLASS}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink-500">
            Check-out
          </span>
          <input
            type="date"
            min={checkIn || undefined}
            value={checkOut}
            onChange={e => setCheckOut(e.target.value)}
            className={FIELD_INPUT_CLASS}
          />
        </label>

        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-2">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="secondary-button min-h-[48px] flex-1"
          >
            <SlidersHorizontal className="h-4 w-4 shrink-0" />
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </button>
          <button type="submit" className="primary-button min-h-[48px] flex-1">
            <Search className="h-4 w-4 shrink-0" />
            Search
          </button>
        </div>
      </form>

      {/* Quick corridor shortcuts */}
      <section aria-label="Popular Lagos areas" className="mt-4 rounded-3xl border border-ink-100 bg-white/75 p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="m-0 text-sm font-bold text-ink-900">Popular locations</h2>
            <p className="m-0 mt-0.5 text-xs text-ink-500">Choose a neighbourhood to narrow your search.</p>
          </div>
          {area && (
            <button
              type="button"
              onClick={() => { setArea(''); applySearch({ area: '' }); }}
              className="inline-flex min-h-9 items-center rounded-full px-3 text-xs font-bold text-ink-600 transition hover:bg-paper hover:text-ink-900"
            >
              Clear location
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'All Lagos', value: '' },
            { label: 'Lagos Mainland', value: 'Lagos Mainland' },
            { label: 'Victoria Island', value: 'Victoria Island' },
            { label: 'Ikoyi', value: 'Ikoyi' },
            { label: 'Lekki Phase 1', value: 'Lekki Phase 1' },
            { label: 'Yaba', value: 'Yaba' },
            { label: 'Shomolu', value: 'Shomolu' },
            { label: 'Surulere', value: 'Surulere' },
            { label: 'Ikeja GRA', value: 'Ikeja GRA' },
          ].map(chip => {
            const active = area === chip.value;
            return (
              <button
                key={chip.label}
                type="button"
                onClick={() => { setArea(chip.value); applySearch({ area: chip.value }); }}
                aria-pressed={active}
                className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500 focus-visible:ring-offset-2 ${
                  active
                    ? 'border-ink-900 bg-ink-900 text-white shadow-sm'
                    : 'border-ink-200 bg-white text-ink-700 hover:border-brass-500 hover:bg-brass-200/25 hover:text-ink-950'
                }`}
              >
                {active && <span aria-hidden="true" className="text-brass-300">✓</span>}
                {chip.label}
              </button>
            );
          })}
        </div>
      </section>

      {availabilityMessage && (
        <p
          role="status"
          className="mt-3 rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-xs font-medium text-ink-600"
        >
          {availabilityMessage}
        </p>
      )}

      {/* Results Count + Sort */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="m-0 text-base font-bold text-ink-900">
            {sortedStays.length} {sortedStays.length === 1 ? 'stay' : 'stays'}
            {initialFilters.area ? ` in ${initialFilters.area}` : ' across Lagos'}
          </h2>
          <p className="m-0 mt-0.5 text-xs text-ink-500">
            {connected
              ? availabilityVerified
                ? 'Calendar conflicts checked · Partner confirmation still required'
                : 'Approved listings · Nightly prices include HAMLET domestic stay fee'
              : 'Listings connection not configured'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-bold text-ink-600">
            Sort
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortKey)}
              className="min-h-[40px] rounded-full border border-ink-200 bg-white px-3 text-xs font-bold text-ink-900"
            >
              <option value="newest">Recommended</option>
              <option value="price_asc">Price: low → high</option>
              <option value="price_desc">Price: high → low</option>
            </select>
          </label>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex min-h-[40px] cursor-pointer items-center gap-1 rounded-full border border-ink-200 bg-white px-3 text-xs font-bold text-ink-700 hover:border-ink-500"
            >
              <RotateCcw className="h-3 w-3 shrink-0" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Results Grid or Truthful Empty State */}
      {sortedStays.length > 0 ? (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sortedStays.map(stay => (
            <StayListingCard
              key={stay.id}
              stay={stay}
              querySuffix={detailQuerySuffix}
            />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-3xl border border-dashed border-ink-300 bg-white/80 p-8 text-center sm:p-12">
          <h3 className="serif text-2xl font-medium text-ink-900">
            {connected
              ? 'No approved stays match this search yet'
              : 'Live listings need configuration'}
          </h3>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-ink-500">
            {connected
              ? 'Try clearing one or more filters or broadening your Lagos area. Only verified/approved property records are displayed.'
              : 'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in the deployment environment. No fake sample listings are shown.'}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {activeFilterCount > 0 && (
              <button type="button" onClick={clearAll} className="secondary-button">
                Clear all filters
              </button>
            )}
            <Link href="/partners/apply" className="primary-button">
              Become a HAMLET partner
            </Link>
          </div>
        </div>
      )}

      {/* Slide-over / Bottom-sheet Filter Drawer */}
      <FocusedDrawer
        open={drawerOpen}
        title="Filter stays"
        subtitle="Refine by guests, bedrooms, property type and nightly budget"
        onClose={() => setDrawerOpen(false)}
      >
        <div className="space-y-5">
          <StepperCounter
            label="Guests"
            hint="Minimum guest capacity needed"
            value={guests}
            min={1}
            max={20}
            onChange={setGuests}
          />

          <StepperCounter
            label="Minimum bedrooms"
            hint="Choose Any or minimum bedroom count"
            value={bedrooms}
            min={0}
            max={10}
            zeroLabel="Any"
            onChange={setBedrooms}
          />

          <div>
            <p className="mb-2 text-sm font-bold text-ink-900">Property type</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={type === ''}
                onClick={() => setType('')}
                className={`min-h-[42px] cursor-pointer rounded-full border px-3.5 text-xs font-bold ${
                  type === ''
                    ? 'border-ink-900 bg-ink-900 text-white'
                    : 'border-ink-200 bg-white text-ink-700'
                }`}
              >
                Any type
              </button>
              {PROPERTY_TYPES.map(pt => (
                <button
                  key={pt}
                  type="button"
                  aria-pressed={type === pt}
                  onClick={() => setType(pt)}
                  className={`min-h-[42px] cursor-pointer rounded-full border px-3.5 text-xs font-bold ${
                    type === pt
                      ? 'border-ink-900 bg-ink-900 text-white'
                      : 'border-ink-200 bg-white text-ink-700'
                  }`}
                >
                  {pt}
                </button>
              ))}
            </div>
          </div>

          <label className="grid gap-1.5">
            <span className="text-sm font-bold text-ink-900">
              Maximum guest nightly budget (₦)
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={20000}
              max={100000000}
              step={5000}
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              placeholder="Any budget (e.g. 250000)"
              className={FIELD_INPUT_CLASS}
            />
            <span className="text-xs text-ink-500">
              Filters against the guest-facing NGN nightly rate.
            </span>
          </label>

          <div className="flex items-center justify-between gap-3 border-t border-ink-100 pt-4">
            <button type="button" onClick={clearAll} className="secondary-button">
              Clear all
            </button>
            <button
              type="button"
              onClick={() => applySearch()}
              className="primary-button flex-1"
            >
              Show matching stays
            </button>
          </div>
        </div>
      </FocusedDrawer>
    </div>
  );
}
