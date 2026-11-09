'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { isMainlandArea } from '@/lib/areas';
import { CURRENCY_SYMBOLS, useCurrency } from '@/lib/currency';
import {
  buildDiscoverySearchParams,
  DEFAULT_DISCOVERY_FILTERS,
  DISCOVERY_NEIGHBOURHOODS,
  filterAndSortApprovedStays,
  formatAccommodationLabel,
  getStayTrustStatus,
  getValidPublicGuestNightlyNgn,
  isApprovedBookableStay,
  isStudioProperty,
  type CorridorSideFilter,
} from '@/lib/discovery';
import type { PublicStayRecord } from '@/lib/next-supabase';
import { lagosIsoDateOffset } from '@/lib/pricing';

export interface HomeMarketplaceExperienceProps {
  approvedStays: PublicStayRecord[];
  queryError?: boolean | string | null;
}

const ISLAND_CHIPS = [
  'Victoria Island',
  'Lekki Phase 1',
  'Ikate',
  'Ikoyi',
] as const;

const MAINLAND_CHIPS = ['Yaba', 'Surulere', 'Shomolu'] as const;

const LAGOS_LANDMARKS = [
  {
    src: 'https://images.unsplash.com/photo-1719314313652-d9835e0c52c3?auto=format&fit=crop&fm=jpg&q=85&w=1800',
    alt: 'Lekki–Ikoyi Link Bridge over the Lagos Lagoon',
  },
  {
    src: 'https://www.ekoatlantic.com/wp-content/uploads/2023/11/DJI_0042.jpg',
    alt: 'Eko Atlantic coastline and skyline, Lagos',
  },
  {
    src: 'https://global.ariseplay.com/amg/www.arise.tv/uploads/2021/02/National-Theatre.jpg',
    alt: 'National Theatre, Iganmu, Lagos',
  },
] as const;

const ALL_CHIPS = [...ISLAND_CHIPS, ...MAINLAND_CHIPS] as const;

const VERIFICATION_PILLARS = [
  {
    num: '01',
    title: 'Title & lease',
    description: 'Ownership or tenancy rights checked.',
  },
  {
    num: '02',
    title: 'Host identity',
    description: 'The person behind the listing is verified.',
  },
  {
    num: '03',
    title: 'Authority',
    description: 'Permission to let the property confirmed.',
  },
  {
    num: '04',
    title: 'Inspection',
    description: 'Visited in person in Lagos.',
  },
] as const;

function addDaysIso(isoDate: string, days: number): string {
  const parsed = new Date(`${isoDate}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime())) return lagosIsoDateOffset(days);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function formatPillDate(isoDate: string): string {
  if (!isoDate) return '';
  const parsed = new Date(`${isoDate}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

function formatAvailableFromDate(isoDate: string | null | undefined): string | null {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const parsed = new Date(`${isoDate}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime())) return null;
  return parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatCompactBedFact(
  bedrooms: number | null | undefined,
  propertyType: string | null | undefined,
): string {
  if (isStudioProperty(propertyType, bedrooms) && (!bedrooms || bedrooms <= 0)) {
    return 'Studio';
  }
  const count = Math.max(0, Math.trunc(Number(bedrooms ?? 0)));
  if (count === 0) return 'Studio';
  return count === 1 ? '1 bed' : `${count} beds`;
}

function HomepageStayCard({ property }: { property: PublicStayRecord }) {
  const { currency, formatPrice } = useCurrency();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [failedUrls, setFailedUrls] = useState<Record<string, boolean>>({});
  const [carouselPaused, setCarouselPaused] = useState(false);

  const images = useMemo(
    () =>
      (property.image_urls ?? [])
        .map((src: string) => src.trim())
        .filter((src: string) => src.length > 0 && !failedUrls[src]),
    [property.image_urls, failedUrls],
  );

  const areaName = (property.area || 'Lagos').trim();
  const isMainland = isMainlandArea(areaName);
  const accommodationLabel = formatAccommodationLabel(
    property.property_type,
    property.bedrooms,
  );
  const bedFactLabel = formatCompactBedFact(property.bedrooms, property.property_type);
  const trust = getStayTrustStatus(property);
  const guestNightlyNgn = getValidPublicGuestNightlyNgn(property.guest_nightly_ngn);
  const bathrooms = Math.max(1, Math.trunc(Number(property.bathrooms ?? 1)));
  const maxGuests = Math.max(1, Math.trunc(Number(property.capacity ?? 1)));

  const cleanAmenities = useMemo(
    () =>
      (property.amenities ?? [])
        .map((amenity: string) => amenity.trim())
        .filter(Boolean),
    [property.amenities],
  );
  const visibleAmenities = cleanAmenities.slice(0, 3);
  const remainingAmenityCount = Math.max(
    0,
    cleanAmenities.length - visibleAmenities.length,
  );

  const availableFromLabel = formatAvailableFromDate(property.first_available_date);
  const detailHref = `/stays/${encodeURIComponent(property.id)}`;

  const handleTrackScroll = () => {
    const el = trackRef.current;
    if (!el || el.clientWidth <= 0 || images.length === 0) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    const clamped = Math.max(0, Math.min(images.length - 1, idx));
    if (clamped !== activeSlide) {
      setActiveSlide(clamped);
    }
  };

  const scrollToSlide = (index: number) => {
    const el = trackRef.current;
    if (!el || images.length === 0) return;
    const clamped = Math.max(0, Math.min(images.length - 1, index));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' });
    setActiveSlide(clamped);
  };

  useEffect(() => {
    if (images.length < 2 || carouselPaused) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches) return;
    const advance = () => {
      if (document.visibilityState !== 'visible') return;
      const next = (activeSlide + 1) % images.length;
      const node = trackRef.current;
      if (!node) return;
      node.scrollTo({ left: next * node.clientWidth, behavior: 'smooth' });
      setActiveSlide(next);
    };
    const timer = window.setInterval(advance, 4800);
    return () => window.clearInterval(timer);
  }, [activeSlide, carouselPaused, images.length]);

  return (
    <article className="hamlet-depth flex flex-col overflow-hidden rounded-[26px] border border-[#E8E6DD] bg-white shadow-[0_3px_8px_rgba(18,31,60,0.05),0_18px_42px_-20px_rgba(18,31,60,0.24)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_12px_30px_-12px_rgba(18,31,60,0.32)]">
      {/* 4:3 Photo Carousel or Monogram Fallback */}
      <div className="relative aspect-[16/10] overflow-hidden bg-[#285744] sm:aspect-[4/3]" onMouseEnter={() => setCarouselPaused(true)} onMouseLeave={() => setCarouselPaused(false)} onFocusCapture={() => setCarouselPaused(true)} onBlurCapture={() => setCarouselPaused(false)}>
        {images.length > 0 ? (
          <>
            <div
              ref={trackRef}
              onScroll={handleTrackScroll}
              className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {images.map((src: string, index: number) => (
                <Link
                  key={`${property.id}-slide-${index}`}
                  href={detailHref}
                  aria-label={`View ${property.title} photo ${index + 1} of ${images.length}`}
                  className="block h-full w-full flex-[0_0_100%] snap-center"
                >
                  <img
                    src={src}
                    alt={
                      index === 0
                        ? `${property.title} — verified shortlet in ${areaName}, Lagos`
                        : `${property.title} — photo ${index + 1}`
                    }
                    loading={index === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    onError={() =>
                      setFailedUrls(prev => (prev[src] ? prev : { ...prev, [src]: true }))
                    }
                    className="block h-full w-full object-cover"
                  />
                </Link>
              ))}
            </div>

            {images.length > 1 && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5"
              >
                {images.map((_: string, index: number) => (
                  <button
                    key={`${property.id}-dot-${index}`}
                    type="button"
                    tabIndex={-1}
                    onClick={() => scrollToSlide(index)}
                    className={`pointer-events-auto h-1.5 cursor-pointer rounded-full border-0 p-0 transition-all ${
                      index === activeSlide ? 'w-[18px] bg-white' : 'w-1.5 bg-white/55'
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <Link
            href={detailHref}
            aria-label={`View ${property.title} in ${areaName}`}
            className="grid h-full w-full place-items-center p-6 text-center text-[13px] text-[#DADFD5]"
          >
            <div>
              <strong className="mb-1 block font-display text-[30px] font-bold text-[#B58A52]">
                H
              </strong>
              <span>Photos coming soon</span>
            </div>
          </Link>
        )}

        {/* Verification Badge */}
        <span className="pointer-events-none absolute top-3.5 left-3.5 inline-flex items-center gap-1.5 rounded-[20px] border border-[#A6F4C5] bg-[#ECFDF3] px-3 py-1.5 text-[12px] font-semibold text-[#0B5534] shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0B5534"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="shrink-0"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
          {trust.badge}
        </span>
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col px-4 pt-3.5 pb-4 sm:px-5 sm:pt-[18px] sm:pb-5">
        <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold uppercase tracking-[1.2px] text-[#755638]">
          <span className="rounded-[12px] bg-[#173F32] px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[1.5px] text-[#B58A52]">
            {isMainland ? 'Mainland' : 'Island'}
          </span>
          <span>
            {areaName} · {accommodationLabel}
          </span>
        </div>

        <h3 className="mt-2 font-display text-[18px] font-bold leading-[1.2] text-[#173F32] sm:mt-2.5 sm:text-[22px]">
          <Link href={detailHref} className="transition hover:text-[#755638]">
            {property.title}
          </Link>
        </h3>

        {/* Bed / Bath / Guest Facts */}
        <ul className="mt-2.5 flex list-none flex-wrap gap-3 p-0 text-[13px] text-[#34483D] sm:mt-3 sm:gap-3.5 sm:text-[14px]">
          <li className="inline-flex items-center gap-1.5">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="shrink-0 text-[#596B60]"
            >
              <path d="M3 18v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5M3 13V8a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v5M2 18h20" />
            </svg>
            <span>{bedFactLabel}</span>
          </li>
          <li className="inline-flex items-center gap-1.5">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="shrink-0 text-[#596B60]"
            >
              <path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3zM6 12V5a2 2 0 0 1 2-2h1" />
            </svg>
            <span>
              {bathrooms} {bathrooms === 1 ? 'bath' : 'baths'}
            </span>
          </li>
          <li className="inline-flex items-center gap-1.5">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="shrink-0 text-[#596B60]"
            >
              <circle cx="9" cy="8" r="3" />
              <path d="M3 19c0-3 2.7-5 6-5s6 2 6 5M16 11a2.5 2.5 0 1 0 0-5M21 19c0-2.4-2-4.2-4.5-4.5" />
            </svg>
            <span>
              {maxGuests} {maxGuests === 1 ? 'guest' : 'guests'}
            </span>
          </li>
        </ul>

        {/* Amenity Pills */}
        {visibleAmenities.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5 sm:mt-3.5">
            {visibleAmenities.map((amenity: string) => (
              <span
                key={amenity}
                className="rounded-[14px] border border-[#D9D8CD] bg-white px-2.5 py-[5px] text-[12.5px] text-[#34483D]"
              >
                {amenity}
              </span>
            ))}
            {remainingAmenityCount > 0 && (
              <span className="rounded-[14px] border border-transparent bg-transparent px-1 py-[5px] text-[12.5px] font-semibold text-[#755638]">
                +{remainingAmenityCount} more
              </span>
            )}
          </div>
        )}

        {/* Price + View Stay CTA */}
        <div className="mt-auto pt-3 sm:pt-[18px]">
          <div className="flex items-center justify-between gap-3 border-t border-[#EEE9DC] pt-4">
            <div className="min-w-0">
              {guestNightlyNgn !== null ? (
                <>
                  <b className="block text-[24px] font-semibold leading-[1.1] tracking-[-0.3px] text-[#173F32]">
                    {formatPrice(guestNightlyNgn, { roundWhole: true })}
                  </b>
                  <small className="text-[12.5px] text-[#596B60]">
                    {currency === 'NGN' ? 'per night' : `per night (${currency})`}
                  </small>
                </>
              ) : (
                <>
                  <b className="block text-[18px] font-semibold leading-[1.2] text-[#173F32]">
                    Rate on request
                  </b>
                  <small className="text-[12.5px] text-[#596B60]">contact concierge</small>
                </>
              )}
            </div>

            <Link
              href={detailHref}
              className="inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-[24px] bg-[#173F32] px-[22px] text-[15px] font-semibold whitespace-nowrap text-[#F7F4ED] transition hover:bg-[#285744]"
            >
              View stay →
            </Link>
          </div>

          <p className="mt-3 hidden items-center gap-1.5 text-[12.5px] text-[#596B60] sm:flex">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="shrink-0"
            >
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M16 3v4M8 3v4M3 10h18" />
            </svg>
            <span>
              {availableFromLabel
                ? `From ${availableFromLabel} · partner confirms dates`
                : 'Partner confirms dates before card charge'}
            </span>
          </p>
        </div>
      </div>
    </article>
  );
}

export function HomeMarketplaceExperience({
  approvedStays,
  queryError = null,
}: HomeMarketplaceExperienceProps) {
  const router = useRouter();
  const { currency } = useCurrency();
  const railRef = useRef<HTMLDivElement | null>(null);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedSide, setSelectedSide] = useState<CorridorSideFilter>('all');
  const [selectedArea, setSelectedArea] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(2);
  const [guestsTouched, setGuestsTouched] = useState(false);
  const [activeRailArea, setActiveRailArea] = useState('');

  const todayIso = useMemo(() => lagosIsoDateOffset(0), []);
  const minCheckOutIso = useMemo(
    () => (checkIn ? addDaysIso(checkIn, 1) : addDaysIso(todayIso, 1)),
    [checkIn, todayIso],
  );

  const bookableStays = useMemo(
    () => approvedStays.filter(isApprovedBookableStay),
    [approvedStays],
  );



  const displayedStays = useMemo(
    () =>
      activeRailArea
        ? filterAndSortApprovedStays(bookableStays, {
            ...DEFAULT_DISCOVERY_FILTERS,
            area: activeRailArea,
          })
        : bookableStays,
    [activeRailArea, bookableStays],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const readAreaFromUrl = () => {
      const areaFromQuery =
        new URLSearchParams(window.location.search).get('area')?.trim() || '';
      setActiveRailArea(areaFromQuery);
    };
    const timer = window.setTimeout(readAreaFromUrl, 0);
    window.addEventListener('popstate', readAreaFromUrl);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('popstate', readAreaFromUrl);
    };
  }, []);

  const syncRailAreaToUrl = (nextArea: string) => {
    setActiveRailArea(nextArea);
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (nextArea) {
      url.searchParams.set('area', nextArea);
    } else {
      url.searchParams.delete('area');
    }
    window.history.replaceState(
      window.history.state,
      '',
      `${url.pathname}${url.search}${url.hash}`,
    );
  };

  const scrollNeighbourhoodRail = (direction: -1 | 1) => {
    const node = railRef.current;
    if (!node) return;
    const distance = Math.max(240, Math.round(node.clientWidth * 0.72));
    node.scrollBy({ left: direction * distance, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!sheetOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSheetOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [sheetOpen]);

  const visibleChips = useMemo(() => {
    if (selectedSide === 'island') return ISLAND_CHIPS;
    if (selectedSide === 'mainland') return MAINLAND_CHIPS;
    return ALL_CHIPS;
  }, [selectedSide]);

  const handleSelectSide = (nextSide: CorridorSideFilter) => {
    setSelectedSide(nextSide);
    if (
      nextSide === 'island' &&
      selectedArea &&
      !(ISLAND_CHIPS as readonly string[]).includes(selectedArea)
    ) {
      setSelectedArea('');
    } else if (
      nextSide === 'mainland' &&
      selectedArea &&
      !(MAINLAND_CHIPS as readonly string[]).includes(selectedArea)
    ) {
      setSelectedArea('');
    }
  };

  const handleToggleChip = (chip: string) => {
    setSelectedArea(prev => (prev === chip ? '' : chip));
  };

  const handleCheckInChange = (nextIn: string) => {
    setCheckIn(nextIn);
    if (nextIn && checkOut && checkOut <= nextIn) {
      setCheckOut(addDaysIso(nextIn, 1));
    }
  };

  const handleClearSearch = () => {
    setSelectedSide('all');
    setSelectedArea('');
    setCheckIn('');
    setCheckOut('');
    setGuests(2);
    setGuestsTouched(false);
  };

  const handleShowStays = () => {
    const areaParam =
      selectedArea ||
      (selectedSide === 'mainland' ? 'Lagos Mainland' : '');
    const sideParam: CorridorSideFilter =
      selectedArea
        ? 'all'
        : selectedSide === 'island'
          ? 'island'
          : 'all';

    const params = buildDiscoverySearchParams({
      ...DEFAULT_DISCOVERY_FILTERS,
      area: areaParam,
      side: sideParam,
      checkIn,
      checkOut,
      guests: guestsTouched || guests !== 2 ? guests : 1,
    });
    const queryString = params.toString();
    setSheetOpen(false);
    router.push(queryString ? `/stays?${queryString}` : '/stays');
  };

  const pillWhereLabel =
    selectedArea ||
    (selectedSide === 'island'
      ? 'Lagos Island'
      : selectedSide === 'mainland'
        ? 'Lagos Mainland'
        : 'Anywhere in Lagos');

  const pillSubLabel = useMemo(() => {
    const datePart =
      checkIn && checkOut
        ? `${formatPillDate(checkIn)} – ${formatPillDate(checkOut)}`
        : checkIn
          ? `From ${formatPillDate(checkIn)}`
          : 'Add dates';
    return `${datePart} · ${guests} ${guests === 1 ? 'guest' : 'guests'}`;
  }, [checkIn, checkOut, guests]);

  const currencyLabel = `${CURRENCY_SYMBOLS[currency]} ${currency}`;

  return (
    <div className="bg-[#F7F4ED] text-[#173F32]">
      {/* ── Hero: Lagos landmarks + Cream Search Sheet ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#102D24] via-[#173F32] to-[#285744] text-[#F7F4ED]">
        <div className="relative z-10 mx-auto max-w-6xl lg:grid lg:grid-cols-12 lg:items-center lg:gap-8 lg:px-6 lg:pt-8">
          <div className="px-5 pt-8 pb-8 lg:col-span-6 lg:px-0 lg:pt-10 lg:pb-12">
            <h1 className="mt-0 font-display text-[34px] font-bold leading-[1.1] tracking-tight text-[#F7F4ED] min-[375px]:text-[40px] sm:text-5xl lg:text-[52px]">
              Lagos feels better here.
            </h1>
          </div>

          <div className="relative px-5 pb-8 lg:col-span-6 lg:px-0 lg:pb-10">
            <div className="relative mx-auto grid aspect-[1.28/1] w-full max-w-[560px] grid-cols-[1.15fr_.85fr] grid-rows-2 gap-3 sm:gap-4">
              <div className="hamlet-depth group relative row-span-2 overflow-hidden rounded-[28px] border border-white/25 bg-[#285744] shadow-[0_26px_54px_-28px_rgba(0,0,0,.72)]">
                <img src={LAGOS_LANDMARKS[0].src} alt={LAGOS_LANDMARKS[0].alt} fetchPriority="high" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.045]" />
              </div>
              {LAGOS_LANDMARKS.slice(1).map(landmark => (
                <div key={landmark.src} className="hamlet-depth group relative overflow-hidden rounded-[24px] border border-white/25 bg-[#285744] shadow-[0_20px_42px_-24px_rgba(0,0,0,.7)]">
                  <img src={landmark.src} alt={landmark.alt} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.045]" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Curved Warm Ivory Search Sheet */}
        <div
          role="search"
          aria-label="Search Lagos shortlets"
          className="relative z-10 rounded-t-[28px] bg-[#F7F4ED] px-5 pt-[22px] pb-[26px] text-[#173F32] lg:rounded-t-[36px] lg:px-6 lg:pt-7 lg:pb-8"
        >
          <div className="mx-auto max-w-2xl">
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={sheetOpen}
              className="flex min-h-[68px] w-full cursor-pointer items-center gap-3.5 rounded-[34px] border border-[#D9D8CD] bg-white pr-2.5 pl-[22px] text-left shadow-[0_6px_18px_rgba(18,31,60,0.08)] transition hover:border-[#B58A52]"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#755638"
                strokeWidth="2.2"
                strokeLinecap="round"
                aria-hidden="true"
                className="shrink-0"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>

              <span className="min-w-0 flex-1">
                <strong className="block truncate text-[16px] font-semibold text-[#173F32]">
                  {pillWhereLabel}
                </strong>
                <span className="mt-0.5 block truncate text-[13px] text-[#596B60]">
                  {pillSubLabel}
                </span>
              </span>

              <span
                aria-hidden="true"
                className="ml-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#173F32] text-[#B58A52]"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M4 6h16M7 12h10M10 18h4" />
                </svg>
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Interactive "Find a stay" Filter Sheet / Modal ── */}
      {sheetOpen && (
        <div
          onClick={event => {
            if (event.target === event.currentTarget) {
              setSheetOpen(false);
            }
          }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(10,18,34,0.58)] sm:items-center sm:p-5"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Find a stay"
            className="max-h-[92dvh] w-full max-w-[440px] overflow-y-auto overscroll-y-contain rounded-t-[28px] bg-[#F7F4ED] px-5 pt-2.5 pb-[calc(24px+env(safe-area-inset-bottom,0px))] text-[#173F32] shadow-2xl sm:max-w-[480px] sm:rounded-[28px] sm:pt-5"
          >
            <div
              aria-hidden="true"
              className="mx-auto mb-3.5 h-1 w-10 rounded-full bg-[#C9C8BC] sm:hidden"
            />

            <div className="mb-1 flex items-center justify-between">
              <h2 className="m-0 font-display text-[24px] font-bold text-[#173F32]">
                Find a stay
              </h2>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Close search"
                className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-[#D9D8CD] bg-transparent text-[#173F32] transition hover:border-[#173F32]"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            {/* Where */}
            <label className="mt-[18px] mb-2 block text-[11px] font-semibold uppercase tracking-[1.8px] text-[#755638]">
              Where
            </label>
            <div
              role="tablist"
              aria-label="Lagos corridor"
              className="grid grid-cols-3 rounded-[24px] bg-[#EEEAE0] p-1"
            >
              {(
                [
                  { value: 'all', label: 'Anywhere' },
                  { value: 'island', label: 'Island' },
                  { value: 'mainland', label: 'Mainland' },
                ] as const
              ).map(option => {
                const active = selectedSide === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => handleSelectSide(option.value)}
                    className={`min-h-[44px] cursor-pointer rounded-[20px] border-0 text-[14px] font-semibold transition ${
                      active
                        ? 'bg-[#173F32] text-[#F7F4ED]'
                        : 'bg-transparent text-[#173F32]'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-2.5 flex flex-wrap gap-2">
              {visibleChips.map((chip: string) => {
                const active = selectedArea === chip;
                return (
                  <button
                    key={chip}
                    type="button"
                    aria-pressed={active}
                    onClick={() => handleToggleChip(chip)}
                    className={`min-h-[40px] cursor-pointer rounded-[20px] border px-3.5 text-[13.5px] font-medium transition ${
                      active
                        ? 'border-[#173F32] bg-[#173F32] text-[#F7F4ED]'
                        : 'border-[#D9D8CD] bg-white text-[#173F32] hover:border-[#173F32]'
                    }`}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>

            {/* When */}
            <label className="mt-[18px] mb-2 block text-[11px] font-semibold uppercase tracking-[1.8px] text-[#755638]">
              When
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-[16px] border border-[#D9D8CD] bg-white px-3.5 py-2.5 focus-within:border-[#173F32]">
                <span className="block text-[11px] font-semibold uppercase tracking-[1px] text-[#596B60]">
                  Check-in
                </span>
                <input
                  type="date"
                  aria-label="Check-in"
                  min={todayIso}
                  value={checkIn}
                  onChange={event => handleCheckInChange(event.target.value)}
                  className="mt-1 w-full border-0 bg-transparent p-0 text-base font-medium text-[#173F32] focus:outline-none"
                />
              </div>

              <div className="rounded-[16px] border border-[#D9D8CD] bg-white px-3.5 py-2.5 focus-within:border-[#173F32]">
                <span className="block text-[11px] font-semibold uppercase tracking-[1px] text-[#596B60]">
                  Check-out
                </span>
                <input
                  type="date"
                  aria-label="Check-out"
                  min={minCheckOutIso}
                  value={checkOut}
                  onChange={event => setCheckOut(event.target.value)}
                  className="mt-1 w-full border-0 bg-transparent p-0 text-base font-medium text-[#173F32] focus:outline-none"
                />
              </div>
            </div>

            {/* Who */}
            <label className="mt-[18px] mb-2 block text-[11px] font-semibold uppercase tracking-[1.8px] text-[#755638]">
              Who
            </label>
            <div className="flex items-center justify-between rounded-[16px] border border-[#D9D8CD] bg-white px-4 py-3">
              <div>
                <b className="block text-[15px] font-semibold text-[#173F32]">Guests</b>
                <small className="text-[12.5px] text-[#596B60]">Adults &amp; children</small>
              </div>
              <div className="flex items-center gap-3.5">
                <button
                  type="button"
                  aria-label="Fewer guests"
                  disabled={guests <= 1}
                  onClick={() => {
                    setGuestsTouched(true);
                    setGuests(prev => Math.max(1, prev - 1));
                  }}
                  className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-[#173F32] bg-white text-[20px] leading-none text-[#173F32] transition disabled:cursor-not-allowed disabled:opacity-35"
                >
                  −
                </button>
                <output
                  aria-live="polite"
                  className="min-w-[20px] text-center text-[17px] font-semibold text-[#173F32]"
                >
                  {guests}
                </output>
                <button
                  type="button"
                  aria-label="More guests"
                  disabled={guests >= 10}
                  onClick={() => {
                    setGuestsTouched(true);
                    setGuests(prev => Math.min(10, prev + 1));
                  }}
                  className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-[#173F32] bg-white text-[20px] leading-none text-[#173F32] transition disabled:cursor-not-allowed disabled:opacity-35"
                >
                  +
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-[22px] flex gap-2.5">
              <button
                type="button"
                onClick={handleClearSearch}
                className="min-h-[54px] cursor-pointer rounded-[27px] border border-[#173F32] bg-transparent px-[22px] text-[15px] font-semibold text-[#173F32] transition hover:bg-[#EEEAE0]"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleShowStays}
                className="min-h-[54px] flex-1 cursor-pointer rounded-[27px] border-0 bg-[#173F32] px-5 text-[16px] font-semibold text-[#F7F4ED] transition hover:bg-[#285744]"
              >
                Show stays
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Explore Lagos Neighbourhoods Rail (Immediately Below Filters) ── */}
      <section
        aria-labelledby="neighbourhood-rail-heading"
        className="mx-auto max-w-6xl space-y-3.5 px-5 pt-2 pb-6 sm:px-6 lg:pt-4 lg:pb-8"
      >
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="m-0 text-[11px] font-extrabold uppercase tracking-[0.18em] text-brass-700">
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
          className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-5 pb-2 pt-0.5 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <button
            type="button"
            aria-pressed={!activeRailArea}
            onClick={() => syncRailAreaToUrl('')}
            className={`group flex min-h-[76px] w-[156px] shrink-0 snap-start cursor-pointer flex-col justify-between rounded-2xl border p-3.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500 sm:w-[172px] ${
              !activeRailArea
                ? 'border-ink-950 bg-ink-950 text-white shadow-sm'
                : 'border-ink-200 bg-white text-ink-900 hover:border-ink-500'
            }`}
          >
            <span
              className={`text-[10px] font-extrabold uppercase tracking-wider ${
                !activeRailArea ? 'text-brass-300' : 'text-brass-700'
              }`}
            >
              Every corridor
            </span>
            <span className="font-display text-base font-bold leading-tight">
              All Lagos
            </span>
            <span
              className={`text-[11px] ${
                !activeRailArea ? 'text-ink-200' : 'text-ink-500'
              }`}
            >
              Island &amp; Mainland
            </span>
          </button>

          {DISCOVERY_NEIGHBOURHOODS.map(hood => {
            const selected =
              activeRailArea.trim().toLowerCase() === hood.name.toLowerCase();
            return (
              <button
                key={hood.name}
                type="button"
                aria-pressed={selected}
                onClick={() => syncRailAreaToUrl(selected ? '' : hood.name)}
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

      {/* ── Available Stays Marketplace Board ── */}
      <section
        id="stays"
        aria-label="Verified stays"
        className="mx-auto max-w-6xl px-5 pt-2 pb-8 sm:px-6 lg:pt-4 lg:pb-12"
      >
        <div className="mb-4 flex items-baseline justify-between gap-3 lg:mb-6">
          <h2 className="m-0 font-display text-[26px] font-bold leading-[1.2] text-[#173F32] lg:text-[32px]">
            Verified stays
          </h2>
          <span className="shrink-0 text-[13px] font-medium text-[#596B60]">
            {displayedStays.length} available · {currencyLabel}
          </span>
        </div>

        {activeRailArea && (
          <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-[#E8E6DD] bg-white px-4 py-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#596B60]">
              Active filter:
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#173F32] px-3 py-1 text-xs font-semibold text-[#F7F4ED]">
              {activeRailArea}
            </span>
            <button
              type="button"
              onClick={() => syncRailAreaToUrl('')}
              className="ml-auto inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full px-3 text-xs font-extrabold text-[#755638] underline-offset-4 hover:underline"
            >
              <RotateCcw className="h-3.5 w-3.5 shrink-0" />
              <span>Clear filters</span>
            </button>
          </div>
        )}

        {Boolean(queryError) && (
          <div className="mb-5 rounded-[20px] border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            We couldn&apos;t refresh live listings right now
            {typeof queryError === 'string' ? ` (${queryError})` : ''}. Please reload or browse{' '}
            <Link href="/stays" className="font-semibold underline">
              all stays
            </Link>
            .
          </div>
        )}

        {displayedStays.length === 0 ? (
          <div className="rounded-[26px] border border-[#E8E6DD] bg-white p-8 text-center shadow-[0_1px_2px_rgba(18,31,60,0.06)]">
            <h3 className="font-display text-[22px] font-bold text-[#173F32]">
              {activeRailArea
                ? `No verified stays in ${activeRailArea} right now`
                : 'Verified stays are updating'}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-[14.5px] leading-relaxed text-[#596B60]">
              {activeRailArea
                ? 'Clear filters to see all verified stays across Lagos, or ask Horatio to help source a stay in this neighbourhood.'
                : 'Every property on HAMLET is physically inspected in Lagos before it goes live. Check back shortly or ask Horatio to help source a verified stay.'}
            </p>
            {activeRailArea && (
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => syncRailAreaToUrl('')}
                  className="inline-flex min-h-[46px] cursor-pointer items-center justify-center gap-1.5 rounded-full bg-[#173F32] px-6 text-sm font-semibold text-[#F7F4ED] transition hover:bg-[#285744]"
                >
                  <RotateCcw className="h-4 w-4 shrink-0" />
                  <span>Clear filters</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div
            className={`grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 ${
              displayedStays.length >= 3 ? 'lg:grid-cols-3' : ''
            }`}
          >
            {displayedStays.map((stay: PublicStayRecord) => (
              <HomepageStayCard key={stay.id} property={stay} />
            ))}
          </div>
        )}

        <div className="mt-[18px] lg:mt-7">
          <Link
            href="/stays"
            className="flex min-h-[52px] w-full items-center justify-center rounded-[26px] border border-[#173F32] px-7 text-[15px] font-semibold text-[#173F32] transition hover:bg-[#173F32] hover:text-[#F7F4ED] sm:inline-flex sm:w-auto"
          >
            See all stays →
          </Link>
        </div>
      </section>

      {/* ── HAMLET editorial welcome and ecosystem strip ── */}
      <section className="mx-auto grid max-w-6xl gap-5 px-5 pt-8 pb-5 sm:px-6 lg:grid-cols-[1.2fr_.8fr] lg:gap-8 lg:pt-12">
        <div className="hamlet-depth relative overflow-hidden rounded-[28px] border border-white/80 bg-gradient-to-br from-white/90 to-[#EEEAE0] p-6 shadow-[0_16px_42px_-24px_rgba(23,63,50,.28),inset_0_1px_0_rgba(255,255,255,.9)] sm:p-8">
          <div className="absolute -right-10 -top-12 h-44 w-44 rounded-full border border-[#B58A52]/35" />
          <div className="absolute -right-2 -top-4 h-28 w-28 rounded-full border border-[#B58A52]/35" />
          <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#755638]">The HAMLET difference</p>
          <h2 className="serif mt-2 max-w-xl text-2xl font-medium leading-tight text-[#173F32] sm:text-3xl">A better stay starts with the details that matter.</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#596B60]">From who is authorised to host you to the practical details of each apartment, we make the important information easier to understand before you request.</p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {VERIFICATION_PILLARS.map(item => (
              <div key={item.num} className="border-t border-[#B58A52]/60 pt-3">
                <span className="block text-[10px] font-bold tracking-widest text-[#987044]">{item.num}</span>
                <b className="mt-1 block text-sm text-[#173F32]">{item.title}</b>
                <span className="mt-1 block text-[11px] leading-snug text-[#6C7D72]">{item.description}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="hamlet-depth flex flex-col justify-between overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#245744] via-[#173F32] to-[#102D24] p-6 text-[#F7F4ED] shadow-[0_22px_48px_-22px_rgba(10,35,27,.62),inset_0_1px_0_rgba(255,255,255,.14)] sm:p-8">
          <div>
            <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#D5B879]">More than a place to stay</p>
            <h2 className="serif mt-2 text-2xl font-medium leading-tight sm:text-3xl">A network for people who make hospitality happen.</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#DADFD5]">Owners, managers and property professionals can bring quality stays to HAMLET and grow their business through a connected partner ecosystem.</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/partners/apply" className="inline-flex min-h-11 items-center rounded-full bg-[#B58A52] px-5 text-sm font-bold text-[#102D24] transition hover:bg-[#D5B879]">Become a partner ↗</Link>
            <Link href="/partners" className="inline-flex min-h-11 items-center rounded-full border border-white/35 px-5 text-sm font-semibold text-white transition hover:bg-white/10">Partner workspace</Link>
          </div>
        </div>
      </section>

    </div>
  );
}

export default HomeMarketplaceExperience;
