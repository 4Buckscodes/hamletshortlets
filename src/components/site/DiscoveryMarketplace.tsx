'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RotateCcw,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  ISLAND_AND_LEKKI_AREAS,
  MAINLAND_AREAS,
} from '@/lib/areas';
import { CURRENCY_SYMBOLS, useCurrency } from '@/lib/currency';
import {
  ACCOMMODATION_TYPE_OPTIONS,
  BEDROOM_FILTER_OPTIONS,
  DEFAULT_DISCOVERY_FILTERS,
  DISCOVERY_NEIGHBOURHOODS,
  DISCOVERY_SORT_OPTIONS,
  buildDiscoverySearchParams,
  filterAndSortApprovedStays,
  getActiveFilterBadges,
  validatePriceRange,
  validateStayDates,
  type ActiveFilterBadge,
  type DiscoveryFilterState,
  type DiscoverySortKey,
} from '@/lib/discovery';
import { getBrowserSupabase, type AnyPublicStay } from '@/lib/next-supabase';
import { lagosIsoDateOffset } from '@/lib/pricing';
import {
  FIELD_INPUT_CLASS,
  FocusedDrawer,
  StepperCounter,
} from '@/components/forms/ProgressiveFormPrimitives';
import { GuestInterestPanel } from './GuestInterestPanel';
import { StayListingCard } from './SiteShell';

export interface DiscoveryMarketplaceProps {
  mode: 'homepage' | 'stays';
  approvedStays: AnyPublicStay[];
  initialFilters?: Partial<DiscoveryFilterState>;
  initialUnavailableIds?: string[] | null;
  availabilitySupported?: boolean;
  queryError?: boolean;
}

export function DiscoveryMarketplace({
  mode,
  approvedStays,
  initialFilters,
  initialUnavailableIds = null,
  availabilitySupported = true,
  queryError = false,
}: DiscoveryMarketplaceProps) {
  const router = useRouter();
  const { currency } = useCurrency();
  const symbol = CURRENCY_SYMBOLS[currency];
  const railRef = useRef<HTMLDivElement | null>(null);
  const todayIso = useMemo(() => lagosIsoDateOffset(0), []);

  const [filters, setFilters] = useState<DiscoveryFilterState>(() => ({
    ...DEFAULT_DISCOVERY_FILTERS,
    ...initialFilters,
  }));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const initialPairKey =
    initialFilters?.checkIn && initialFilters?.checkOut
      ? `${initialFilters.checkIn}|${initialFilters.checkOut}`
      : '';
  const [dateLookup, setDateLookup] = useState<{
    pairKey: string;
    ids: ReadonlySet<string> | null;
    supported: boolean;
  }>(() => ({
    pairKey: initialUnavailableIds !== null ? initialPairKey : '',
    ids: initialUnavailableIds ? new Set(initialUnavailableIds) : null,
    supported: availabilitySupported,
  }));
  const [checkingDatesPair, setCheckingDatesPair] = useState<string | null>(null);

  // Sync filters softly to the browser URL so links remain shareable without triggering server reloads.
  const syncUrlParams = useCallback(
    (nextFilters: DiscoveryFilterState) => {
      if (typeof window === 'undefined') return;
      const params = buildDiscoverySearchParams(nextFilters);
      const qs = params.toString();
      const basePath = mode === 'stays' ? '/stays' : window.location.pathname;
      const nextUrl = qs ? `${basePath}?${qs}` : basePath;
      window.history.replaceState(window.history.state, '', nextUrl);
    },
    [mode],
  );

  const updateFilters = useCallback(
    (
      updater:
        | Partial<DiscoveryFilterState>
        | ((prev: DiscoveryFilterState) => DiscoveryFilterState),
    ) => {
      setFilters(prev => {
        const next =
          typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
        syncUrlParams(next);
        return next;
      });
    },
    [syncUrlParams],
  );

  const clearAllFilters = useCallback(() => {
    setFilters(DEFAULT_DISCOVERY_FILTERS);
    syncUrlParams(DEFAULT_DISCOVERY_FILTERS);
  }, [syncUrlParams]);

  const removeBadge = useCallback(
    (key: ActiveFilterBadge['key']) => {
      updateFilters(prev => {
        switch (key) {
          case 'area':
            return { ...prev, area: '' };
          case 'side':
            return { ...prev, side: 'all' };
          case 'type':
            return { ...prev, type: '' };
          case 'minBedrooms':
            return { ...prev, minBedrooms: 0 };
          case 'minPrice':
            return { ...prev, minPriceInput: '' };
          case 'maxPrice':
            return { ...prev, maxPriceInput: '' };
          case 'guests':
            return { ...prev, guests: 1 };
          case 'dates':
            return { ...prev, checkIn: '', checkOut: '' };
          default:
            return prev;
        }
      });
    },
    [updateFilters],
  );

  const dateValidation = useMemo(
    () => validateStayDates(filters.checkIn, filters.checkOut, todayIso),
    [filters.checkIn, filters.checkOut, todayIso],
  );

  const activeDatePairKey = dateValidation.valid
    ? `${filters.checkIn}|${filters.checkOut}`
    : '';

  // Live Supabase calendar conflict check via `get_unavailable_property_ids` RPC when valid dates change.
  useEffect(() => {
    if (!activeDatePairKey || approvedStays.length === 0) return;
    if (dateLookup.pairKey === activeDatePairKey) return;

    const db = getBrowserSupabase();
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      if (!db) {
        setDateLookup({
          pairKey: activeDatePairKey,
          ids: null,
          supported: false,
        });
        return;
      }

      setCheckingDatesPair(activeDatePairKey);
      void Promise.resolve(
        db.rpc('get_unavailable_property_ids', {
          requested_check_in: filters.checkIn,
          requested_check_out: filters.checkOut,
        }),
      )
        .then(({ data, error }) => {
          if (cancelled) return;
          if (error) {
            setDateLookup({
              pairKey: activeDatePairKey,
              ids: null,
              supported: false,
            });
          } else {
            setDateLookup({
              pairKey: activeDatePairKey,
              ids: new Set(Array.isArray(data) ? data.map(id => String(id)) : []),
              supported: true,
            });
          }
        })
        .catch(() => {
          if (!cancelled) {
            setDateLookup({
              pairKey: activeDatePairKey,
              ids: null,
              supported: false,
            });
          }
        })
        .finally(() => {
          if (!cancelled) {
            setCheckingDatesPair(prev => (prev === activeDatePairKey ? null : prev));
          }
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    activeDatePairKey,
    approvedStays.length,
    dateLookup.pairKey,
    filters.checkIn,
    filters.checkOut,
  ]);

  const unavailableSet =
    activeDatePairKey && dateLookup.pairKey === activeDatePairKey
      ? dateLookup.ids
      : null;
  const dateRpcSupported =
    !activeDatePairKey || dateLookup.pairKey !== activeDatePairKey
      ? availabilitySupported
      : dateLookup.supported;
  const checkingDates =
    Boolean(activeDatePairKey) && checkingDatesPair === activeDatePairKey;

  const priceValidation = useMemo(
    () => validatePriceRange(filters.minPriceInput, filters.maxPriceInput),
    [filters.minPriceInput, filters.maxPriceInput],
  );

  const filteredApproved = useMemo(
    () =>
      filterAndSortApprovedStays(approvedStays, filters, {
        unavailableIds: unavailableSet,
        todayIso,
      }),
    [approvedStays, filters, todayIso, unavailableSet],
  );

  const activeBadges = useMemo(() => getActiveFilterBadges(filters), [filters]);

  const detailQuerySuffix = useMemo(() => {
    const qp = new URLSearchParams();
    if (dateValidation.valid) {
      qp.set('checkIn', filters.checkIn);
      qp.set('checkOut', filters.checkOut);
    }
    if (filters.guests > 1) {
      qp.set('guests', String(filters.guests));
    }
    const qs = qp.toString();
    return qs ? `?${qs}` : '';
  }, [dateValidation.valid, filters.checkIn, filters.checkOut, filters.guests]);

  const fullCatalogueHref = useMemo(() => {
    const params = buildDiscoverySearchParams(filters);
    const qs = params.toString();
    return qs ? `/stays?${qs}` : '/stays';
  }, [filters]);

  function scrollNeighbourhoodRail(direction: -1 | 1) {
    const node = railRef.current;
    if (!node) return;
    node.scrollBy({ left: direction * 280, behavior: 'smooth' });
  }

  return (
    <div className="space-y-8">
      {/* ── Horizontally Scrollable Lagos Neighbourhood Discovery Rail ── */}
      <section aria-labelledby="neighbourhood-rail-heading" className="space-y-3.5">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-brass-700">
              Island &amp; Lagos Mainland corridors
            </p>
            <h2
              id="neighbourhood-rail-heading"
              className="mt-1 font-display text-xl font-bold text-ink-950 sm:text-2xl"
            >
              Explore Lagos neighbourhoods
            </h2>
          </div>

          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={() => scrollNeighbourhoodRail(-1)}
              aria-label="Scroll neighbourhoods left"
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-ink-200 bg-white text-ink-800 shadow-2xs transition hover:border-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500"
            >
              <ChevronLeft className="h-4 w-4 shrink-0" />
            </button>
            <button
              type="button"
              onClick={() => scrollNeighbourhoodRail(1)}
              aria-label="Scroll neighbourhoods right"
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-ink-200 bg-white text-ink-800 shadow-2xs transition hover:border-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500"
            >
              <ChevronRight className="h-4 w-4 shrink-0" />
            </button>
          </div>
        </div>

        <div
          ref={railRef}
          role="region"
          aria-label="Lagos neighbourhoods"
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2 pt-0.5"
        >
          <button
            type="button"
            aria-pressed={!filters.area && filters.side === 'all'}
            onClick={() => updateFilters({ area: '', side: 'all' })}
            className={`group flex min-h-[76px] w-[156px] shrink-0 snap-start cursor-pointer flex-col justify-between rounded-2xl border p-3.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500 sm:w-[172px] ${
              !filters.area && filters.side === 'all'
                ? 'border-ink-950 bg-ink-950 text-white shadow-sm'
                : 'border-ink-200 bg-white text-ink-900 hover:border-ink-500'
            }`}
          >
            <span
              className={`text-[10px] font-extrabold uppercase tracking-wider ${
                !filters.area && filters.side === 'all'
                  ? 'text-brass-300'
                  : 'text-brass-700'
              }`}
            >
              Every corridor
            </span>
            <span className="font-display text-base font-bold leading-tight">
              All Lagos
            </span>
            <span
              className={`text-[11px] ${
                !filters.area && filters.side === 'all'
                  ? 'text-ink-200'
                  : 'text-ink-500'
              }`}
            >
              Island &amp; Mainland
            </span>
          </button>

          {DISCOVERY_NEIGHBOURHOODS.map(hood => {
            const selected =
              filters.area.trim().toLowerCase() === hood.name.toLowerCase();
            return (
              <button
                key={hood.name}
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  updateFilters({
                    area: selected ? '' : hood.name,
                    side: 'all',
                  })
                }
                className={`group flex min-h-[76px] w-[204px] shrink-0 snap-start cursor-pointer items-center gap-3 rounded-2xl border p-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500 sm:w-[224px] ${
                  selected
                    ? 'border-ink-950 bg-ink-950 text-white shadow-sm'
                    : 'border-ink-200 bg-white text-ink-900 hover:border-ink-500'
                }`}
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-clay">
                  <img
                    src={hood.image}
                    alt={hood.alt}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <span
                    className={`block text-[10px] font-extrabold uppercase tracking-wider ${
                      selected ? 'text-brass-300' : 'text-brass-700'
                    }`}
                  >
                    Lagos {hood.corridor}
                  </span>
                  <span className="mt-0.5 block truncate font-display text-sm font-bold leading-snug sm:text-base">
                    {hood.name}
                  </span>
                  <span
                    className={`mt-0.5 block truncate text-[11px] ${
                      selected ? 'text-ink-200' : 'text-ink-500'
                    }`}
                  >
                    {hood.subtitle}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Property Discovery Section Header, Controls & Results ── */}
      <section
        id="places-worth-staying-in"
        aria-labelledby="discovery-results-heading"
        className="space-y-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-brass-700">
              {mode === 'homepage'
                ? 'Verified Lagos shortlets'
                : 'Lagos shortlet marketplace'}
            </p>
            <h2
              id="discovery-results-heading"
              className="mt-1 font-display text-2xl font-bold text-ink-950 sm:text-3xl"
            >
              Places worth staying in
            </h2>
          </div>

          {mode === 'homepage' && (
            <Link
              href={fullCatalogueHref}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 self-start rounded-full border border-ink-200 bg-white px-4 text-xs font-extrabold text-ink-900 shadow-2xs transition hover:border-ink-900 sm:self-auto"
            >
              <span>View all stays</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0" />
            </Link>
          )}
        </div>

        {/* Corridor quick pills + Mobile filter trigger + Desktop inline filter bar */}
        <div className="rounded-3xl border border-ink-100 bg-white p-3.5 shadow-2xs sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex max-w-full items-center gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5">
              {(
                [
                  { id: 'all', label: 'All Lagos' },
                  { id: 'mainland', label: 'Lagos Mainland' },
                  { id: 'island', label: 'Lagos Island' },
                ] as const
              ).map(tab => {
                const active = filters.side === tab.id && !filters.area;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => updateFilters({ side: tab.id, area: '' })}
                    className={`min-h-11 shrink-0 cursor-pointer rounded-full px-4 text-xs font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500 ${
                      active
                        ? 'bg-ink-950 text-white'
                        : 'border border-ink-200 bg-paper text-ink-800 hover:border-ink-500'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border border-ink-200 bg-paper px-4 text-xs font-extrabold text-ink-900 transition hover:border-ink-900 sm:flex-initial lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4 shrink-0 text-brass-700" />
                <span>
                  Filters{activeBadges.length > 0 ? ` (${activeBadges.length})` : ''}
                </span>
              </button>

              <label className="flex min-h-11 flex-1 items-center gap-2 rounded-full border border-ink-200 bg-paper px-3.5 text-xs font-bold text-ink-700 sm:flex-initial">
                <span className="shrink-0 text-ink-500">Sort</span>
                <select
                  aria-label="Sort properties"
                  value={filters.sort}
                  onChange={e =>
                    updateFilters({ sort: e.target.value as DiscoverySortKey })
                  }
                  className="min-w-0 flex-1 bg-transparent font-extrabold text-ink-950 outline-none"
                >
                  {DISCOVERY_SORT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* Desktop / Tablet Expanded Combined Filters */}
          <div className="mt-3.5 hidden gap-3 border-t border-ink-100 pt-3.5 lg:grid lg:grid-cols-6">
            <label className="min-w-0">
              <span className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-ink-500">
                Neighbourhood
              </span>
              <select
                value={filters.area}
                onChange={e =>
                  updateFilters({ area: e.target.value, side: 'all' })
                }
                className={FIELD_INPUT_CLASS}
              >
                <option value="">Any Lagos area</option>
                <optgroup label="Lagos Mainland">
                  <option value="Lagos Mainland">All Lagos Mainland</option>
                  {MAINLAND_AREAS.map(a => (
                    <option key={a} value={a}>
                      {a}
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
            </label>

            <label className="min-w-0">
              <span className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-ink-500">
                Accommodation type
              </span>
              <select
                value={filters.type}
                onChange={e => updateFilters({ type: e.target.value })}
                className={FIELD_INPUT_CLASS}
              >
                {ACCOMMODATION_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value || 'any'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="min-w-0">
              <span className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-ink-500">
                Bedrooms
              </span>
              <select
                value={filters.minBedrooms}
                onChange={e =>
                  updateFilters({ minBedrooms: Number(e.target.value) || 0 })
                }
                className={FIELD_INPUT_CLASS}
              >
                {BEDROOM_FILTER_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="min-w-0">
              <span className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-ink-500">
                Min price (₦ / night)
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={filters.minPriceInput}
                onChange={e =>
                  updateFilters({
                    minPriceInput: e.target.value.replace(/[^\d]/g, '').slice(0, 10),
                  })
                }
                placeholder="No min"
                className={FIELD_INPUT_CLASS}
              />
            </label>

            <label className="min-w-0">
              <span className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-ink-500">
                Max price (₦ / night)
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={filters.maxPriceInput}
                onChange={e =>
                  updateFilters({
                    maxPriceInput: e.target.value.replace(/[^\d]/g, '').slice(0, 10),
                  })
                }
                placeholder="No max"
                className={FIELD_INPUT_CLASS}
              />
            </label>

            <div className="grid min-w-0 grid-cols-2 gap-2">
              <label className="min-w-0">
                <span className="mb-1 block truncate text-[11px] font-extrabold uppercase tracking-wider text-ink-500">
                  Check-in
                </span>
                <input
                  type="date"
                  min={todayIso}
                  value={filters.checkIn}
                  onChange={e => updateFilters({ checkIn: e.target.value })}
                  className="min-h-[48px] w-full min-w-0 rounded-xl border border-ink-200 bg-white px-2.5 py-2 text-xs text-ink-900 focus:border-ink-900 focus:outline-none"
                />
              </label>
              <label className="min-w-0">
                <span className="mb-1 block truncate text-[11px] font-extrabold uppercase tracking-wider text-ink-500">
                  Check-out
                </span>
                <input
                  type="date"
                  min={filters.checkIn || todayIso}
                  value={filters.checkOut}
                  onChange={e => updateFilters({ checkOut: e.target.value })}
                  className="min-h-[48px] w-full min-w-0 rounded-xl border border-ink-200 bg-white px-2.5 py-2 text-xs text-ink-900 focus:border-ink-900 focus:outline-none"
                />
              </label>
            </div>
          </div>

          {/* Inline validation errors */}
          {!priceValidation.valid && priceValidation.error && (
            <p
              role="alert"
              className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-800"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{priceValidation.error}</span>
            </p>
          )}

          {dateValidation.hasAnyDate && !dateValidation.valid && dateValidation.error && (
            <p
              role="status"
              className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-950"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-800" />
              <span>{dateValidation.error}</span>
            </p>
          )}

          {dateValidation.valid && !dateRpcSupported && (
            <p className="mt-3 rounded-xl border border-ink-200 bg-paper px-3.5 py-2 text-xs text-ink-600">
              Dates ({filters.checkIn} → {filters.checkOut}) are confirmed by the host on request.
            </p>
          )}

          {/* Active filter chips + Clear filters */}
          {activeBadges.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
                Active filters:
              </span>
              {activeBadges.map(badge => (
                <button
                  key={badge.key}
                  type="button"
                  onClick={() => removeBadge(badge.key)}
                  aria-label={`Remove filter ${badge.label}`}
                  className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-ink-200 bg-paper px-3 text-xs font-bold text-ink-900 transition hover:border-ink-900"
                >
                  <span>{badge.label}</span>
                  <X className="h-3.5 w-3.5 shrink-0 text-ink-500" />
                </button>
              ))}
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full px-3 text-xs font-extrabold text-brass-700 underline-offset-4 hover:underline"
              >
                <RotateCcw className="h-3.5 w-3.5 shrink-0" />
                <span>Clear filters</span>
              </button>
            </div>
          )}
        </div>

        {/* Live Result Summary Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <p
            aria-live="polite"
            className="m-0 text-sm font-bold text-ink-900"
          >
            {queryError
              ? 'Marketplace temporarily unavailable'
              : approvedStays.length === 0
                ? 'No stays published yet'
                : `${filteredApproved.length} ${
                    filteredApproved.length === 1 ? 'stay' : 'stays'
                  } available`}
            {filters.area ? ` in ${filters.area}` : ''}
          </p>

          <div className="flex items-center gap-3">
            {checkingDates && (
              <span
                role="status"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-600"
              >
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-brass-700" />
                Checking dates…
              </span>
            )}
            <span className="font-mono text-[11px] font-bold text-ink-500">
              {symbol} ({currency})
            </span>
          </div>
        </div>

        {/* 1. Error State */}
        {queryError ? (
          <div
            role="alert"
            className="rounded-3xl border border-red-200 bg-white p-6 text-center shadow-2xs sm:p-8"
          >
            <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-red-50 text-red-700">
              <AlertCircle className="h-5 w-5 shrink-0" />
            </div>
            <h3 className="mt-3 font-display text-xl font-bold text-ink-950">
              Could not load live stays.
            </h3>
            <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-ink-600">
              Please refresh or contact hello@hamlet.rest.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => router.refresh()}
                className="primary-button min-h-11 px-6"
              >
                Retry
              </button>
              <Link href="/lagos" className="secondary-button min-h-11 px-5">
                Lagos guide
              </Link>
            </div>
          </div>
        ) : approvedStays.length === 0 ? (
          /* 2. Honest Zero-Approved-Stays Early-Access State */
          <div className="rounded-3xl border border-ink-200 bg-white p-5 shadow-2xs sm:p-8">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center rounded-full border border-brass-400/60 bg-brass-200/30 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-ink-900">
                Verification in progress
              </span>
              <h3 className="mt-3 font-display text-xl font-bold text-ink-950 sm:text-2xl">
                {filters.area
                  ? `No approved stays are published in ${filters.area} yet.`
                  : 'Approved Lagos stays are completing listing review.'}
              </h3>
              {activeBadges.length > 0 && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border border-ink-200 bg-paper px-4 text-xs font-bold text-ink-900 hover:border-ink-900"
                  >
                    <RotateCcw className="h-3.5 w-3.5 shrink-0" />
                    Clear filters
                  </button>
                </div>
              )}
            </div>

            <div className="mt-6">
              <GuestInterestPanel
                preferredArea={filters.area}
                preferredType={filters.type}
              />
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs text-ink-600">
              <span>Own or manage a shortlet in Lagos?</span>
              <Link
                href="/partners/apply"
                className="font-extrabold text-ink-950 underline underline-offset-4 hover:text-brass-700"
              >
                Apply to list on HAMLET →
              </Link>
            </div>
          </div>
        ) : filteredApproved.length === 0 ? (
          /* 3. Filtered Empty State (approved properties exist, none match active filters) */
          <div className="rounded-3xl border border-ink-200 bg-white p-6 text-center shadow-2xs sm:p-10">
            <h3 className="font-display text-xl font-bold text-ink-950 sm:text-2xl">
              No approved stays match these filters.
            </h3>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-ink-600">
              {!priceValidation.valid && priceValidation.error
                ? priceValidation.error
                : 'Clear filters or broaden your search.'}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={clearAllFilters}
                className="primary-button min-h-11 px-6"
              >
                <RotateCcw className="h-4 w-4 shrink-0" />
                Clear filters
              </button>
              <Link href="/lagos" className="secondary-button min-h-11 px-5">
                Lagos guide
              </Link>
            </div>
          </div>
        ) : (
          /* 4. Real Approved Bookable Stays Grid */
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredApproved.map(stay => (
              <StayListingCard
                key={stay.id}
                stay={stay}
                querySuffix={detailQuerySuffix}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Mobile / Tablet Filter Drawer (Preserves FocusedDrawer) ── */}
      <FocusedDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Filter Lagos stays"
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-ink-800">
              Lagos neighbourhood
            </span>
            <select
              value={filters.area}
              onChange={e =>
                updateFilters({ area: e.target.value, side: 'all' })
              }
              className={FIELD_INPUT_CLASS}
            >
              <option value="">Any Lagos area</option>
              <optgroup label="Lagos Mainland">
                <option value="Lagos Mainland">All Lagos Mainland</option>
                {MAINLAND_AREAS.map(a => (
                  <option key={a} value={a}>
                    {a}
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
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-ink-800">
              Accommodation type
            </span>
            <select
              value={filters.type}
              onChange={e => updateFilters({ type: e.target.value })}
              className={FIELD_INPUT_CLASS}
            >
              {ACCOMMODATION_TYPE_OPTIONS.map(opt => (
                <option key={opt.value || 'any'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <StepperCounter
            label="Minimum bedrooms"
            value={filters.minBedrooms}
            min={0}
            max={6}
            zeroLabel="Any"
            onChange={v => updateFilters({ minBedrooms: v })}
          />

          <StepperCounter
            label="Guests"
            value={filters.guests}
            min={1}
            max={16}
            onChange={v => updateFilters({ guests: v })}
          />

          <div className="grid grid-cols-2 gap-3">
            <label className="min-w-0">
              <span className="mb-1.5 block text-xs font-bold text-ink-800">
                Min price (₦)
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={filters.minPriceInput}
                onChange={e =>
                  updateFilters({
                    minPriceInput: e.target.value.replace(/[^\d]/g, '').slice(0, 10),
                  })
                }
                placeholder="No min"
                className={FIELD_INPUT_CLASS}
              />
            </label>
            <label className="min-w-0">
              <span className="mb-1.5 block text-xs font-bold text-ink-800">
                Max price (₦)
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={filters.maxPriceInput}
                onChange={e =>
                  updateFilters({
                    maxPriceInput: e.target.value.replace(/[^\d]/g, '').slice(0, 10),
                  })
                }
                placeholder="No max"
                className={FIELD_INPUT_CLASS}
              />
            </label>
          </div>

          {!priceValidation.valid && priceValidation.error && (
            <p role="alert" className="m-0 text-xs font-semibold text-red-700">
              {priceValidation.error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="min-w-0">
              <span className="mb-1.5 block text-xs font-bold text-ink-800">
                Check-in
              </span>
              <input
                type="date"
                min={todayIso}
                value={filters.checkIn}
                onChange={e => updateFilters({ checkIn: e.target.value })}
                className={FIELD_INPUT_CLASS}
              />
            </label>
            <label className="min-w-0">
              <span className="mb-1.5 block text-xs font-bold text-ink-800">
                Check-out
              </span>
              <input
                type="date"
                min={filters.checkIn || todayIso}
                value={filters.checkOut}
                onChange={e => updateFilters({ checkOut: e.target.value })}
                className={FIELD_INPUT_CLASS}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={clearAllFilters}
              className="secondary-button min-h-12 w-full"
            >
              Clear filters
            </button>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="primary-button min-h-12 w-full"
            >
              Show results
            </button>
          </div>
        </div>
      </FocusedDrawer>
    </div>
  );
}
