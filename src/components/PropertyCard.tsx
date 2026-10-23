import { Link } from 'react-router-dom';
import { Users, BedDouble, Bath, ShieldCheck, Wifi, Zap, ArrowRight } from 'lucide-react';
import type { Property } from '../lib/types';
import { estimateAllInclusiveNightly } from '../lib/pricing';
import { useCurrency } from '../lib/currency';

export function PropertyCard({ p, searchQuery }: { p: Property; searchQuery?: string }) {
  const { formatPrice, currency } = useCurrency();
  const est = estimateAllInclusiveNightly(p);

  const hasVerifiedPillar =
    p.verification.ownership === 'verified' ||
    p.verification.identity === 'verified' ||
    p.verification.authority === 'verified' ||
    p.verification.inspection === 'verified';

  const verificationLabel =
    p.verification.inspection === 'verified'
      ? 'HAMLET verified · Inspected'
      : hasVerifiedPillar
        ? 'HAMLET verified · Docs reviewed'
        : null;

  const hasPowerBackup = p.amenities.includes('24/7 Power') || p.amenities.includes('Generator');
  const hasWifi = p.amenities.includes('Wifi');
  const checkInRule = p.houseRules.find(r => r.toLowerCase().includes('check-in'));

  return (
    <Link
      to={`/stays/${p.id}${searchQuery ? `?${searchQuery}` : ''}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-16px_rgba(16,29,22,0.35)]"
    >
      <div className="relative h-52 overflow-hidden">
        <img
          src={p.images[0]}
          alt={p.title}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/75 via-transparent to-transparent" />
        {verificationLabel && (
          <span className="absolute left-3 top-3 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-full bg-ink-950/75 py-1 pl-1.5 pr-2.5 text-[10.5px] font-bold text-brass-300 backdrop-blur">
            <ShieldCheck size={12} className="shrink-0" />
            <span className="truncate">{verificationLabel}</span>
          </span>
        )}
        <span className="absolute bottom-3 left-3 right-3 truncate text-[11px] font-bold uppercase tracking-[0.14em] text-white/95">
          {p.area} · Lagos
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="min-h-[2.6rem] line-clamp-2 font-display text-[16px] font-bold leading-snug text-ink-900">
          {p.title}
        </h3>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] font-medium text-ink-500">
          <span className="inline-flex items-center gap-1"><BedDouble size={13} className="shrink-0" />{p.bedrooms} bd</span>
          <span className="inline-flex items-center gap-1"><Bath size={13} className="shrink-0" />{p.bathrooms} ba</span>
          <span className="inline-flex items-center gap-1"><Users size={13} className="shrink-0" />{p.capacity} guests</span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {hasPowerBackup && (
            <span className="inline-flex items-center gap-1 rounded-md border border-ink-100 bg-ink-50/70 px-2 py-0.5 text-[10.5px] font-semibold text-ink-700">
              <Zap size={11} className="shrink-0 text-amber-600" />
              {p.amenities.includes('24/7 Power') && p.amenities.includes('Generator')
                ? '24/7 Power · Generator'
                : p.amenities.includes('24/7 Power')
                  ? '24/7 Power'
                  : 'Generator backup'}
            </span>
          )}
          {hasWifi && (
            <span className="inline-flex items-center gap-1 rounded-md border border-ink-100 bg-ink-50/70 px-2 py-0.5 text-[10.5px] font-semibold text-ink-700">
              <Wifi size={11} className="shrink-0 text-jade-700" /> Wi-Fi
            </span>
          )}
          {checkInRule && (
            <span className="truncate rounded-md border border-ink-100 bg-ink-50/70 px-2 py-0.5 text-[10.5px] font-medium text-ink-500">
              {checkInRule}
            </span>
          )}
        </div>

        <div className="mt-auto pt-3">
          <div className="flex flex-wrap items-end justify-between gap-2 border-t border-ink-50 pt-3">
            <div className="min-w-0">
              <span className="font-display text-[19px] font-black tabular-nums text-ink-900">
                {formatPrice(p.nightlyRate)}
              </span>
              <span className="text-[11.5px] font-semibold text-ink-500"> /night</span>
              <p className="text-[10px] font-medium text-ink-400">
                Est. {formatPrice(est)}/night incl. fees{currency !== 'NGN' ? ' · settled in ₦' : ''}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-jade-50 px-2.5 py-1.5 text-[11px] font-extrabold text-jade-800 transition group-hover:bg-jade-700 group-hover:text-white">
              View apartment <ArrowRight size={12} className="shrink-0" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
