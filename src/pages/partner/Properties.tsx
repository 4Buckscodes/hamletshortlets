import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { PlusCircle, BedDouble, Bath, Users, FileWarning, RefreshCcw } from 'lucide-react';
import { useHamlet } from '../../lib/store';
import { useToast } from '../../lib/toast';
import { PropertyStatusPill, DocStatusBadge } from '../../components/Badges';
import { myPartnerProperties } from '../../lib/partnerUtils';
import { formatNaira } from '../../lib/pricing';

export default function PartnerProperties() {
  const { state, reviewProperty } = useHamlet();
  const { toast } = useToast();
  const userId = state.session!.userId;
  const myProps = useMemo(() => myPartnerProperties(state, userId), [state, userId]);
  const [openDocs, setOpenDocs] = useState<string | null>(null);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-brass-400">Listings</p>
          <h1 className="mt-1.5 font-display text-2xl font-black text-ink-50 sm:text-3xl">My properties</h1>
          <p className="mt-1 max-w-lg text-[12px] font-medium text-ink-300">Only approved, non-suspended listings appear publicly. Documentation evidence is reviewed by HAMLET — checked boxes on submission are self-reported until reviewed.</p>
        </div>
        <Link to="/partner/properties/new" className="btn-brass !py-3"><PlusCircle size={17} /> List a new property</Link>
      </div>

      <div className="mt-6 grid gap-4">
        {myProps.length === 0 && (
          <div className="rounded-2xl border border-dashed border-ink-700 bg-ink-900/50 px-6 py-16 text-center">
            <p className="font-display text-xl font-black text-ink-100">No properties yet</p>
            <p className="mx-auto mt-2 max-w-sm text-[12.5px] font-medium text-ink-400">Submit your first Lagos shortlet. Every submission is reviewed manually — you'll track status here from submitted → needs correction / approved / rejected.</p>
            <Link to="/partner/properties/new" className="btn-brass mt-6"><PlusCircle size={16} /> Start submission</Link>
          </div>
        )}
        {myProps.map(p => (
          <article key={p.id} className="overflow-hidden rounded-2xl border border-ink-800 bg-ink-900">
            <div className="flex flex-col gap-4 p-5 sm:flex-row">
              <img src={p.images[0]} alt={p.title} className="h-40 w-full shrink-0 rounded-xl object-cover sm:w-52" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <PropertyStatusPill status={p.status} />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-ink-500">{p.type} · {p.area}</span>
                </div>
                <h2 className="mt-1.5 font-display text-lg font-bold text-ink-50">{p.title}</h2>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] font-semibold text-ink-300">
                  <span className="inline-flex items-center gap-1.5"><BedDouble size={13} />{p.bedrooms} bd</span>
                  <span className="inline-flex items-center gap-1.5"><Bath size={13} />{p.bathrooms} ba</span>
                  <span className="inline-flex items-center gap-1.5"><Users size={13} />sleeps {p.capacity}</span>
                  <span className="font-bold text-brass-300">{formatNaira(p.nightlyRate)}/night</span>
                </p>
                <p className="mt-1.5 text-[11px] font-medium text-ink-500">{p.address}</p>
                <p className="mt-1 text-[10.5px] font-semibold text-ink-500">Authority: {p.authorityBasis}</p>
                {p.reviewNote && (
                  <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-[11.5px] font-medium leading-snug text-orange-200">
                    <FileWarning size={14} className="mt-0.5 shrink-0" />{p.reviewNote}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end justify-between gap-3">
                <button onClick={() => setOpenDocs(openDocs === p.id ? null : p.id)} className="btn-ghost-dark !px-3 !py-2 text-[11px]">
                  Documentation ({p.docs.filter(d => d.status === 'verified').length}/{p.docs.length} verified)
                </button>
                {p.status === 'needs_correction' && (
                  <button onClick={async () => {
                    try {
                      await reviewProperty(p.id, 'submitted', 'Resubmitted by partner after corrections');
                      toast('Resubmitted for review.', 'info');
                    } catch (error) {
                      toast(error instanceof Error ? error.message : 'Could not resubmit property.', 'error');
                    }
                  }} className="btn-brass !px-4 !py-2 text-[11px]">
                    <RefreshCcw size={13} /> Resubmit
                  </button>
                )}
              </div>
            </div>
            {openDocs === p.id && (
              <div className="border-t border-ink-800 bg-ink-850/60 px-5 py-4">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink-400">Documentation evidence — reviewed by HAMLET</p>
                <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                  {p.docs.map(d => (
                    <li key={d.label} className="flex items-center justify-between gap-2 rounded-xl border border-ink-800 bg-ink-900 px-3 py-2">
                      <span className="text-[11.5px] font-medium text-ink-100">{d.label}{d.note && <span className="block text-[10px] font-normal text-ink-400">{d.note}</span>}</span>
                      <DocStatusBadge status={d.status} />
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[10px] font-medium leading-snug text-ink-500">“Self-reported” means the submitter attested to the document; it is NOT verified until HAMLET reviews the evidence. HAMLET records verification outcomes honestly rather than issuing blanket trust claims.</p>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
