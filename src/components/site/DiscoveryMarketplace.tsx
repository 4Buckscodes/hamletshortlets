'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
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
  isMainlandArea,
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
  formatAccommodationLabel,
  getActiveFilterBadges,
  getStayTrustStatus,
  validatePriceRange,
  validateStayDates,
  type ActiveFilterBadge,
  type DiscoveryFilterState,
  type DiscoverySortKey,
} from '@/lib/discovery';
import { getBrowserSupabase, type PublicStayRecord } from '@/lib/next-supabase';
import { lagosIsoDateOffset } from '@/lib/pricing';
import {
  FocusedDrawer,
  StepperCounter,
} from '@/components/forms/ProgressiveFormPrimitives';
import { Button, Card, Chip, ChipRow, SectionHeader, StayCard, StayGrid } from '@/components/ui';
import { GuestInterestPanel } from './GuestInterestPanel';
import { StayNightlyPrice } from './SiteShell';

export interface DiscoveryMarketplaceProps {
  mode: 'homepage' | 'stays';
  approvedStays: PublicStayRecord[];
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
    <div className="hm-discovery" style={{ display: 'grid', gap: 48 }}>
      {/* Neighbourhood rail: image toggles that filter the results below. */}
      <section aria-labelledby="neighbourhood-rail-heading" style={{ display: 'grid', gap: 18 }}>
        <SectionHeader
          id="neighbourhood-rail-heading"
          label="Island & Lagos Mainland corridors"
          title="Explore Lagos"
          accent="neighbourhoods."
          aside={
            <div className="hm-rail-controls">
              <button type="button" className="hm-arrow" onClick={() => scrollNeighbourhoodRail(-1)} aria-label="Scroll neighbourhoods left">
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
              <button type="button" className="hm-arrow" onClick={() => scrollNeighbourhoodRail(1)} aria-label="Scroll neighbourhoods right">
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          }
          className="hm-section-head-tight"
        />

        <div ref={railRef} role="region" aria-label="Lagos neighbourhoods" className="hm-rail">
          <button
            type="button"
            aria-pressed={!filters.area && filters.side === 'all'}
            onClick={() => updateFilters({ area: '', side: 'all' })}
            className="hm-rail-item hm-rail-item-all"
          >
            <span className="hm-rail-item-text">
              <small>Every corridor</small>
              <b>All Lagos</b>
              <span>Island &amp; Mainland</span>
            </span>
          </button>

          {DISCOVERY_NEIGHBOURHOODS.map(hood => {
            const selected = filters.area.trim().toLowerCase() === hood.name.toLowerCase();
            return (
              <button
                key={hood.name}
                type="button"
                aria-pressed={selected}
                onClick={() => updateFilters({ area: selected ? '' : hood.name, side: 'all' })}
                className="hm-rail-item"
              >
                <img src={hood.image} alt={hood.alt} loading="lazy" decoding="async" />
                <span className="hm-rail-item-text">
                  <small>Lagos {hood.corridor}</small>
                  <b>{hood.name}</b>
                  <span>{hood.subtitle}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Results: filters, live summary and the stay grid. */}
      <section id="places-worth-staying-in" aria-labelledby="discovery-results-heading" style={{ display: 'grid', gap: 22, scrollMarginTop: 96 }}>
        <SectionHeader
          id="discovery-results-heading"
          label={mode === 'homepage' ? 'Verified Lagos shortlets' : '02 / Real places, live listings'}
          title="Places worth"
          accent="staying in."
          aside={
            mode === 'homepage' ? (
              <Button href={fullCatalogueHref} variant="ghost" size="sm" arrow>
                View all stays
              </Button>
            ) : undefined
          }
        />

        <Card style={{ display: 'grid', gap: 16 }}>
          <div className="hm-filter-toolbar">
            <ChipRow label="Lagos corridor">
              {(
                [
                  { id: 'all', label: 'All Lagos' },
                  { id: 'mainland', label: 'Lagos Mainland' },
                  { id: 'island', label: 'Lagos Island' },
                ] as const
              ).map(tab => (
                <Chip key={tab.id} pressed={filters.side === tab.id && !filters.area} onClick={() => updateFilters({ side: tab.id, area: '' })}>
                  {tab.label}
                </Chip>
              ))}
            </ChipRow>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
              <Chip className="hm-only-compact" onClick={() => setDrawerOpen(true)}>
                <SlidersHorizontal size={14} aria-hidden="true" />
                Filters{activeBadges.length > 0 ? ` (${activeBadges.length})` : ''}
              </Chip>
              <label className="hm-sort">
                Sort
                <select
                  aria-label="Sort properties"
                  value={filters.sort}
                  onChange={e => updateFilters({ sort: e.target.value as DiscoverySortKey })}
                  className="hm-input"
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

          <div className="hm-filter-grid">
            <label className="hm-field">
              <span className="hm-field-label">Neighbourhood</span>
              <select value={filters.area} onChange={e => updateFilters({ area: e.target.value, side: 'all' })} className="hm-input">
                <AreaOptions />
              </select>
            </label>
            <label className="hm-field">
              <span className="hm-field-label">Type</span>
              <select value={filters.type} onChange={e => updateFilters({ type: e.target.value })} className="hm-input">
                {ACCOMMODATION_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value || 'any'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="hm-field">
              <span className="hm-field-label">Bedrooms</span>
              <select value={filters.minBedrooms} onChange={e => updateFilters({ minBedrooms: Number(e.target.value) || 0 })} className="hm-input">
                {BEDROOM_FILTER_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="hm-field">
              <span className="hm-field-label">Min ₦ / night</span>
              <input type="text" inputMode="numeric" value={filters.minPriceInput} onChange={e => updateFilters({ minPriceInput: sanitisePrice(e.target.value) })} placeholder="No min" className="hm-input" aria-invalid={!priceValidation.valid || undefined} />
            </label>
            <label className="hm-field">
              <span className="hm-field-label">Max ₦ / night</span>
              <input type="text" inputMode="numeric" value={filters.maxPriceInput} onChange={e => updateFilters({ maxPriceInput: sanitisePrice(e.target.value) })} placeholder="No max" className="hm-input" aria-invalid={!priceValidation.valid || undefined} />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, minWidth: 0 }}>
              <label className="hm-field">
                <span className="hm-field-label">Check-in</span>
                <input type="date" min={todayIso} value={filters.checkIn} onChange={e => updateFilters({ checkIn: e.target.value })} className="hm-input" style={{ paddingInline: 8 }} />
              </label>
              <label className="hm-field">
                <span className="hm-field-label">Check-out</span>
                <input type="date" min={filters.checkIn || todayIso} value={filters.checkOut} onChange={e => updateFilters({ checkOut: e.target.value })} className="hm-input" style={{ paddingInline: 8 }} />
              </label>
            </div>
          </div>

          {!priceValidation.valid && priceValidation.error && (
            <p role="alert" className="hm-notice hm-notice-bad" style={{ margin: 0 }}>
              <AlertCircle size={16} aria-hidden="true" />
              <span>{priceValidation.error}</span>
            </p>
          )}

          {dateValidation.hasAnyDate && !dateValidation.valid && dateValidation.error && (
            <p role="status" className="hm-notice hm-notice-warn" style={{ margin: 0 }}>
              <AlertCircle size={16} aria-hidden="true" />
              <span>{dateValidation.error}</span>
            </p>
          )}

          {dateValidation.valid && !dateRpcSupported && (
            <p className="hm-notice" style={{ margin: 0 }}>
              Dates ({filters.checkIn} → {filters.checkOut}) are confirmed by the host on request.
            </p>
          )}

          {activeBadges.length > 0 && (
            <>
              <hr className="hm-rule" />
              <div className="hm-chip-row">
                <span className="hm-field-label">Active filters</span>
                {activeBadges.map(badge => (
                  <Chip key={badge.key} onClick={() => removeBadge(badge.key)} aria-label={`Remove filter ${badge.label}`}>
                    {badge.label}
                    <X size={14} aria-hidden="true" />
                  </Chip>
                ))}
                <Button variant="quiet" size="sm" onClick={clearAllFilters}>
                  <RotateCcw size={14} aria-hidden="true" />
                  Clear filters
                </Button>
              </div>
            </>
          )}
        </Card>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <p aria-live="polite" className="hm-label" style={{ fontSize: 12 }}>
            {queryError
              ? 'Marketplace temporarily unavailable'
              : approvedStays.length === 0
                ? 'No stays published yet'
                : `${filteredApproved.length} verified ${filteredApproved.length === 1 ? 'stay' : 'stays'} available`}
            {filters.area ? ` · ${filters.area}` : ''}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {checkingDates && (
              <span role="status" className="hm-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                Checking dates…
              </span>
            )}
            <span className="hm-meta" style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700 }}>
              {symbol} ({currency})
            </span>
          </div>
        </div>

        {queryError ? (
          <Card role="alert" style={{ display: 'grid', justifyItems: 'center', gap: 12, padding: 40, textAlign: 'center' }}>
            <span className="hm-status hm-status-bad">Connection problem</span>
            <h3 className="hm-h3">Could not load live stays.</h3>
            <p className="hm-body">Please refresh or contact hello@hamlet.rest.</p>
            <div className="hm-chip-row" style={{ justifyContent: 'center' }}>
              <Button onClick={() => router.refresh()}>Retry</Button>
              <Button href="/lagos" variant="ghost">
                Lagos guide
              </Button>
            </div>
          </Card>
        ) : approvedStays.length === 0 ? (
          <Card style={{ display: 'grid', gap: 22, padding: 'clamp(20px, 4vw, 40px)' }}>
            <div style={{ display: 'grid', justifyItems: 'center', gap: 12, textAlign: 'center' }}>
              <span className="hm-status hm-status-info">Verification in progress</span>
              <h3 className="hm-h3" style={{ fontSize: 26 }}>
                {filters.area ? `No verified stays published in ${filters.area} yet.` : 'Verified Lagos stays are completing onboarding.'}
              </h3>
              {activeBadges.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  <RotateCcw size={14} aria-hidden="true" />
                  Clear filters
                </Button>
              )}
            </div>
            <GuestInterestPanel preferredArea={filters.area} preferredType={filters.type} />
            <p className="hm-meta" style={{ textAlign: 'center' }}>
              Own or manage a verified shortlet in Lagos?{' '}
              <Link href="/partners/apply" className="hm-link" style={{ fontSize: 13 }}>
                Apply to list on HAMLET
              </Link>
            </p>
          </Card>
        ) : filteredApproved.length === 0 ? (
          <Card style={{ display: 'grid', justifyItems: 'center', gap: 12, padding: 'clamp(24px, 5vw, 48px)', textAlign: 'center' }}>
            <h3 className="hm-h3" style={{ fontSize: 26 }}>
              No verified stays match these filters.
            </h3>
            <p className="hm-body" style={{ maxWidth: 520 }}>
              {!priceValidation.valid && priceValidation.error ? priceValidation.error : 'Clear filters or broaden your search.'}
            </p>
            <div className="hm-chip-row" style={{ justifyContent: 'center' }}>
              <Button onClick={clearAllFilters}>
                <RotateCcw size={16} aria-hidden="true" />
                Clear filters
              </Button>
              <Button href="/lagos" variant="ghost">
                Lagos guide
              </Button>
            </div>
          </Card>
        ) : (
          <StayGrid>
            {filteredApproved.map((stay, index) => (
              <StayResultCard key={stay.id} stay={stay} querySuffix={detailQuerySuffix} index={index} />
            ))}
          </StayGrid>
        )}
      </section>

      {/* Mobile / tablet filter drawer */}
      <FocusedDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Filter Lagos stays">
        <div style={{ display: 'grid', gap: 16 }}>
          <label className="hm-field">
            <span className="hm-field-label">Lagos neighbourhood</span>
            <select value={filters.area} onChange={e => updateFilters({ area: e.target.value, side: 'all' })} className="hm-input">
              <AreaOptions />
            </select>
          </label>

          <label className="hm-field">
            <span className="hm-field-label">Accommodation type</span>
            <select value={filters.type} onChange={e => updateFilters({ type: e.target.value })} className="hm-input">
              {ACCOMMODATION_TYPE_OPTIONS.map(opt => (
                <option key={opt.value || 'any'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <StepperCounter label="Minimum bedrooms" value={filters.minBedrooms} min={0} max={6} zeroLabel="Any" onChange={v => updateFilters({ minBedrooms: v })} />
          <StepperCounter label="Guests" value={filters.guests} min={1} max={16} onChange={v => updateFilters({ guests: v })} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label className="hm-field">
              <span className="hm-field-label">Min price (₦)</span>
              <input type="text" inputMode="numeric" value={filters.minPriceInput} onChange={e => updateFilters({ minPriceInput: sanitisePrice(e.target.value) })} placeholder="No min" className="hm-input" />
            </label>
            <label className="hm-field">
              <span className="hm-field-label">Max price (₦)</span>
              <input type="text" inputMode="numeric" value={filters.maxPriceInput} onChange={e => updateFilters({ maxPriceInput: sanitisePrice(e.target.value) })} placeholder="No max" className="hm-input" />
            </label>
          </div>

          {!priceValidation.valid && priceValidation.error && (
            <p role="alert" className="hm-field-error" style={{ margin: 0 }}>
              {priceValidation.error}
            </p>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label className="hm-field">
              <span className="hm-field-label">Check-in</span>
              <input type="date" min={todayIso} value={filters.checkIn} onChange={e => updateFilters({ checkIn: e.target.value })} className="hm-input" />
            </label>
            <label className="hm-field">
              <span className="hm-field-label">Check-out</span>
              <input type="date" min={filters.checkIn || todayIso} value={filters.checkOut} onChange={e => updateFilters({ checkOut: e.target.value })} className="hm-input" />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 8 }}>
            <Button variant="ghost" block onClick={clearAllFilters}>
              Clear filters
            </Button>
            <Button block onClick={() => setDrawerOpen(false)}>
              Show results
            </Button>
          </div>
        </div>
      </FocusedDrawer>
    </div>
  );
}

function sanitisePrice(value: string) {
  return value.replace(/[^\d]/g, '').slice(0, 10);
}

function AreaOptions() {
  return (
    <>
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
    </>
  );
}

/** One stay in the results grid, built on the kit StayCard with the listing's real photo, trust badge and all-in price. */
function StayResultCard({ stay, querySuffix, index }: { stay: PublicStayRecord; querySuffix: string; index: number }) {
  const images = useMemo(() => (stay.image_urls ?? []).map(url => url.trim()).filter(Boolean), [stay.image_urls]);
  const [failed, setFailed] = useState(0);
  const photo = images[failed] ?? '';
  const trust = getStayTrustStatus(stay);
  const area = (stay.area || '').trim();
  const corridor = area ? (isMainlandArea(area) ? 'Mainland' : 'Island') : null;
  const locationText = area || 'Location pending';
  const capacity = typeof stay.capacity === 'number' && stay.capacity > 0 ? ` · up to ${stay.capacity} ${stay.capacity === 1 ? 'guest' : 'guests'}` : '';

  return (
    <StayCard
      href={`/stays/${encodeURIComponent(stay.id)}${querySuffix}`}
      imageSrc={photo}
      imageAlt={`${stay.title} in ${locationText}`}
      onImageError={() => setFailed(count => count + 1)}
      tag={[trust.verified ? 'Verified' : 'Approved', area || null, corridor].filter(Boolean).join(' · ')}
      title={stay.title}
      meta={`${formatAccommodationLabel(stay.property_type, stay.bedrooms)}${capacity}`}
      price={<StayNightlyPrice guestNightlyNgn={Number(stay.guest_nightly_ngn ?? 0)} />}
      priceSuffix="· fees included"
      revealIndex={index}
    />
  );
}
