import { Link } from 'react-router-dom';
import {
  Users,
  BedDouble,
  Bath,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  CalendarClock,
  Heart,
} from 'lucide-react';
import type { Property } from '../lib/types';
import { estimateAllInclusiveNightly } from '../lib/pricing';
import { computePropertyAvailabilitySummary } from '../lib/availability';
import { isMainlandProperty } from '../lib/areas';
import { useCurrency } from '../lib/currency';
import { useHamlet } from '../lib/store';
import { useWishlist } from '../lib/wishlist';
import { useToast } from '../lib/toast';

export function PropertyCard({ p, searchQuery }: { p: Property; searchQuery?: string }) {
  const { state } = useHamlet();
  const { formatStayPrice, currency, activeRateIsAvailable } = useCurrency();
  const { isSaved, toggleSaved } = useWishlist();
  const { toast } = useToast();

  const saved = isSaved(p.id);
  const guestNightlyNgn = Math.round(p.nightlyRate * 1.2);
  const est = estimateAllInclusiveNightly(p);

  const parsedQuery = new URLSearchParams(searchQuery ?? '');
  const reqCheckIn = parsedQuery.get('checkIn') || undefined;
  const reqCheckOut = parsedQuery.get('checkOut') || undefined;

  const availability = computePropertyAvailabilitySummary({
    property: p,
    bookings: state.bookings,
    publicCalendarSpans: state.publicCalendarSpans,
    requestedCheckIn: reqCheckIn,
    requestedCheckOut: reqCheckOut,
  });

  const hasVerifiedPillar =
    p.verification.ownership === 'verified' ||
    p.verification.identity === 'verified' ||
    p.verification.authority === 'verified' ||
    p.verification.inspection === 'verified';

  const verificationLabel =
    p.verification.inspection === 'verified'
      ? 'Verified'
      : hasVerifiedPillar
        ? 'Docs reviewed'
        : null;

  const corridorLabel = isMainlandProperty(p) ? 'Mainland' : 'Island';
  const hasPowerBackup = p.amenities.includes('24/7 Power') || p.amenities.includes('Generator');
  const powerLabel = p.amenities.includes('24/7 Power')
    ? '24/7 Power'
    : p.amenities.includes('Generator')
      ? 'Backup Power'
      : null;

  const availabilityPillTone =
    availability.selectedDatesStatus === 'unavailable'
      ? 'border-red-200/90 bg-red-50/95 text-red-900'
      : availability.currentStatus === 'currently_booked' ||
          availability.currentStatus === 'currently_unavailable'
        ? 'border-amber-200/90 bg-amber-50/95 text-amber-950'
        : 'border-emerald-200/90 bg-emerald-50/95 text-emerald-900';

  return (
    <Link
      to={`/stays/${p.id}${searchQuery ? `?${searchQuery}` : ''}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-[0_1px_2px_rgba(14,31,59,0.05),0_12px_28px_-14px_rgba(14,31,59,0.16)] transition duration-300 hover:-translate-y-1 hover:border-ink-200 hover:shadow-[0_24px_48px_-18px_rgba(14,31,59,0.28)]"
    >
      {/* Image Header */}
      <div className="relative aspect-[16/11] w-full overflow-hidden bg-clay">
        <img
          src={p.images[0]}
          alt={p.title}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/75 via-ink-950/10 to-transparent" />

        {/* Top badges + Save toggle */}
        <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-2">
          <span
            className={`inline-flex max-w-[calc(100%-3rem)] items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-extrabold shadow-xs backdrop-blur-md ${availabilityPillTone}`}
          >
            <CalendarClock size={11} className="shrink-0" />
            <span className="truncate">{availability.primaryBadgeLabel}</span>
          </span>

          <button
            type="button"
            aria-label={saved ? `Remove ${p.title} from saved stays` : `Save ${p.title}`}
            onClick={event => {
              event.preventDefault();
              event.stopPropagation();
              const nowSaved = toggleSaved(p.id);
              toast(nowSaved ? 'Saved to your shortlist.' : 'Removed from saved stays.', 'info');
            }}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/30 bg-ink-950/55 text-white backdrop-blur-md transition hover:bg-ink-950/80"
          >
            <Heart
              size={14}
              className={saved ? 'fill-brass-400 text-brass-400' : 'text-white'}
            />
          </button>
        </div>

        {/* Bottom overlay: Verification + Corridor */}
        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-1.5">
          {verificationLabel ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brass-400/45 bg-ink-950/80 py-1 pl-2 pr-2.5 text-[10.5px] font-bold text-brass-300 backdrop-blur-md">
              <ShieldCheck size={12} className="shrink-0 text-brass-400" />
              <span className="truncate">{verificationLabel}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-ink-950/75 px-2.5 py-1 text-[10px] font-semibold text-ink-200 backdrop-blur-md">
              {p.trustLabel}
            </span>
          )}
          <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-900 backdrop-blur-md">
            {p.type}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.13em] text-ink-500">
          <span className="truncate">
            {p.area} · {corridorLabel}
          </span>
          {(availability.currentStatus === 'currently_booked' ||
            availability.currentStatus === 'currently_unavailable') &&
            availability.nextAvailableLabel &&
            availability.primaryBadgeLabel !== availability.nextAvailableLabel && (
              <span className="shrink-0 font-semibold normal-case tracking-normal text-emerald-700">
                {availability.nextAvailableLabel}
              </span>
            )}
        </div>

        <h3 className="mt-1.5 line-clamp-2 min-h-[2.7rem] font-display text-[17px] font-bold leading-snug text-ink-900 transition group-hover:text-jade-800">
          {p.title}
        </h3>

        {/* Spec Strip */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-ink-700">
          <span className="inline-flex items-center gap-1 rounded-full border border-ink-100 bg-paper/80 px-2.5 py-1">
            <BedDouble size={12} className="shrink-0 text-ink-500" />
            {p.bedrooms} {p.bedrooms === 1 ? 'bed' : 'beds'}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-ink-100 bg-paper/80 px-2.5 py-1">
            <Bath size={12} className="shrink-0 text-ink-500" />
            {p.bathrooms} {p.bathrooms === 1 ? 'bath' : 'baths'}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-ink-100 bg-paper/80 px-2.5 py-1">
            <Users size={12} className="shrink-0 text-ink-500" />
            {p.capacity} guests
          </span>
          {hasPowerBackup && powerLabel && (
            <span className="inline-flex items-center gap-1 rounded-full border border-brass-300/60 bg-brass-200/25 px-2.5 py-1 font-bold text-ink-900">
              <Zap size={11} className="shrink-0 text-brass-700" />
              {powerLabel}
            </span>
          )}
        </div>

        {/* Price & Action Footer */}
        <div className="mt-auto pt-4">
          <div className="flex items-end justify-between gap-3 border-t border-ink-100 pt-3.5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-1">
                <span className="font-display text-[20px] font-bold tabular-nums text-ink-900">
                  {formatStayPrice(guestNightlyNgn)}
                </span>
                <span className="text-[11.5px] font-semibold text-ink-500">/ night</span>
              </div>
              {(est > guestNightlyNgn || (currency !== 'NGN' && activeRateIsAvailable)) && (
                <p className="mt-0.5 truncate text-[10.5px] font-medium text-ink-500">
                  {est > guestNightlyNgn ? `~${formatStayPrice(est)}/nt with fees` : 'Quoted stay rate'}
                  {currency !== 'NGN' && activeRateIsAvailable ? ' · incl. 10% FX buffer' : ''}
                </p>
              )}
            </div>
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink-200 bg-paper text-ink-900 transition group-hover:border-ink-900 group-hover:bg-ink-900 group-hover:text-white">
              <ArrowUpRight size={15} className="shrink-0" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
