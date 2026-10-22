import { Link } from 'react-router-dom';
import { Users, BedDouble, Bath, ShieldCheck, Wifi } from 'lucide-react';
import type { Property } from '../lib/types';
import { estimateAllInclusiveNightly, formatNaira } from '../lib/pricing';

export function PropertyCard({ p }: { p: Property }) {
  const est = estimateAllInclusiveNightly(p);
  const verified = p.verification.inspection === 'verified';
  return (
    <Link to={`/stays/${p.id}`} className="group block overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-16px_rgba(16,29,22,0.35)]">
      <div className="relative h-52 overflow-hidden">
        <img src={p.images[0]} alt={p.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 via-transparent to-transparent" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-ink-950/70 py-1 pl-1.5 pr-2.5 text-[10.5px] font-bold text-brass-300 backdrop-blur">
          <ShieldCheck size={12} />{verified ? 'Inspection verified' : 'Documentation verified'}
        </span>
        <span className="absolute bottom-3 left-3 text-[11px] font-bold uppercase tracking-[0.14em] text-white/90">{p.area} · Lagos</span>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-[16px] font-bold leading-snug text-ink-900 line-clamp-2 min-h-[2.6rem]">{p.title}</h3>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] font-medium text-ink-500">
          <span className="inline-flex items-center gap-1"><BedDouble size={13} />{p.bedrooms} bd</span>
          <span className="inline-flex items-center gap-1"><Bath size={13} />{p.bathrooms} ba</span>
          <span className="inline-flex items-center gap-1"><Users size={13} />sleeps {p.capacity}</span>
          {p.amenities.includes('Wifi') && <span className="inline-flex items-center gap-1"><Wifi size={13} />wifi</span>}
        </div>
        <div className="mt-3 flex items-baseline justify-between border-t border-ink-50 pt-3">
          <div>
            <span className="font-display text-[19px] font-black text-ink-900">{formatNaira(est)}</span>
            <span className="text-[11.5px] font-semibold text-ink-500"> /night incl. fees</span>
            <p className="text-[10px] font-medium text-ink-400">Illustrative · full stay total shown before payment</p>
          </div>
          <span className="rounded-lg bg-jade-50 px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wide text-jade-800">Request to book</span>
        </div>
      </div>
    </Link>
  );
}
