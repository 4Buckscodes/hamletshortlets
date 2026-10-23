import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { PlusCircle, BedDouble, Bath, Users, FileWarning, RefreshCcw, Pencil, X, ShieldCheck } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useHamlet } from '../../lib/store';
import { useToast } from '../../lib/toast';
import { PropertyStatusPill, DocStatusBadge } from '../../components/Badges';
import { myPartnerProperties } from '../../lib/partnerUtils';
import { formatNaira } from '../../lib/pricing';
import { AREAS } from '../../lib/seed';
import type { Property } from '../../lib/types';

const PROPERTY_TYPES = ['Penthouse', 'Serviced apartment', 'Apartment', 'Studio apartment', 'Duplex', 'Villa', 'Terrace'];

export default function PartnerProperties() {
  const { state, reviewProperty, updateAndResubmitProperty } = useHamlet();
  const { toast } = useToast();
  const userId = state.session!.userId;
  const isSuspended = state.session?.accountStatus === 'suspended';
  const myProps = useMemo(() => myPartnerProperties(state, userId), [state, userId]);
  const [openDocs, setOpenDocs] = useState<string | null>(null);
  const [editing, setEditing] = useState<Property | null>(null);

  // Edit & resubmit modal state
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Serviced apartment');
  const [area, setArea] = useState('Victoria Island');
  const [address, setAddress] = useState('');
  const [nightlyRate, setNightlyRate] = useState(0);
  const [cleaningFee, setCleaningFee] = useState(0);
  const [deposit, setDeposit] = useState(0);
  const [bedrooms, setBedrooms] = useState(1);
  const [bathrooms, setBathrooms] = useState(1);
  const [capacity, setCapacity] = useState(2);
  const [bedSetup, setBedSetup] = useState('');
  const [authorityBasis, setAuthorityBasis] = useState('');
  const [houseRulesText, setHouseRulesText] = useState('');
  const [correctionSummary, setCorrectionSummary] = useState('');
  const [saving, setSaving] = useState(false);

  const openEditor = (p: Property) => {
    setEditing(p);
    setTitle(p.title);
    setType(p.type);
    setArea(p.area);
    setAddress(p.address);
    setNightlyRate(p.nightlyRate);
    setCleaningFee(p.cleaningFee);
    setDeposit(p.deposit);
    setBedrooms(p.bedrooms);
    setBathrooms(p.bathrooms);
    setCapacity(p.capacity);
    setBedSetup(p.bedSetup);
    setAuthorityBasis(p.authorityBasis);
    setHouseRulesText(p.houseRules.join('\n'));
    setCorrectionSummary('');
  };

  const submitCorrections = async () => {
    if (!editing) return;
    if (title.trim().length < 8 || address.trim().length < 10) {
      toast('Provide a valid property title (min 8 chars) and full Lagos address (min 10 chars).', 'error');
      return;
    }
    if (authorityBasis.trim().length < 9) {
      toast('Describe your authority to list (min 9 chars).', 'error');
      return;
    }
    if (nightlyRate < 20_000) {
      toast('Nightly rate must be at least ₦20,000.', 'error');
      return;
    }
    setSaving(true);
    try {
      await updateAndResubmitProperty(
        editing.id,
        {
          title: title.trim(),
          type,
          area,
          address: address.trim(),
          nightlyRate,
          cleaningFee,
          mandatoryCharges: cleaningFee > 0 ? [{ label: 'Cleaning & turnover (mandatory)', amount: cleaningFee }] : [],
          deposit,
          bedrooms,
          bathrooms,
          capacity,
          bedSetup: bedSetup.trim(),
          amenities: editing.amenities,
          images: editing.images,
          houseRules: houseRulesText.split('\n').map(s => s.trim()).filter(Boolean),
          submittedRole: editing.submittedRole,
          authorityBasis: authorityBasis.trim(),
          docs: editing.docs.length > 0 ? editing.docs : [
            { label: 'Certificate of occupancy / title deed', status: 'self_reported' },
            { label: 'Government-issued ID of owner', status: 'self_reported' },
            { label: 'Proof of authority / management mandate', status: 'self_reported' },
            { label: 'Property inspection report', status: 'missing' },
          ],
        },
        correctionSummary.trim() || undefined,
      );
      toast('Corrections saved and listing resubmitted for review.', 'info');
      setEditing(null);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not resubmit corrections.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-brass-400">Listings</p>
          <h1 className="mt-1.5 font-display text-2xl font-black text-ink-50 sm:text-3xl">My properties</h1>
          <p className="mt-1 max-w-lg text-[12px] font-medium text-ink-300">Only approved, non-suspended listings appear publicly. Documentation evidence is reviewed by HAMLET — checked boxes on submission are self-reported until reviewed.</p>
        </div>
        {!isSuspended && (
          <Link to="/partner/properties/new" className="btn-brass !py-3"><PlusCircle size={17} /> List a new property</Link>
        )}
      </div>

      <div className="mt-6 grid gap-4">
        {myProps.length === 0 && (
          <div className="rounded-2xl border border-dashed border-ink-700 bg-ink-900/50 px-6 py-16 text-center">
            <p className="font-display text-xl font-black text-ink-100">No properties yet</p>
            <p className="mx-auto mt-2 max-w-sm text-[12.5px] font-medium text-ink-400">Submit your first Lagos shortlet. Every submission is reviewed manually — you'll track status here from submitted → needs correction / approved / rejected.</p>
            {!isSuspended && <Link to="/partner/properties/new" className="btn-brass mt-6"><PlusCircle size={16} /> Start submission</Link>}
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
              <div className="flex shrink-0 flex-col items-start justify-between gap-3 sm:items-end">
                <button onClick={() => setOpenDocs(openDocs === p.id ? null : p.id)} className="btn-ghost-dark !px-3 !py-2 text-[11px]">
                  Documentation ({p.docs.filter(d => d.status === 'verified').length}/{p.docs.length} verified)
                </button>
                {p.status === 'needs_correction' && !isSuspended && (
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <button onClick={() => openEditor(p)} className="btn-brass !px-3.5 !py-2 text-[11px]">
                      <Pencil size={13} /> Edit & resubmit
                    </button>
                    <button onClick={async () => {
                      try {
                        await reviewProperty(p.id, 'submitted', 'Resubmitted by partner after corrections');
                        toast('Resubmitted for review.', 'info');
                      } catch (error) {
                        toast(error instanceof Error ? error.message : 'Could not resubmit property.', 'error');
                      }
                    }} className="btn-ghost-dark !border !border-ink-700 !px-3 !py-2 text-[11px]">
                      <RefreshCcw size={13} /> Quick resubmit
                    </button>
                  </div>
                )}
              </div>
            </div>
            {openDocs === p.id && (
              <div className="border-t border-ink-800 bg-ink-850/60 px-5 py-4">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink-400">Documentation evidence — reviewed by HAMLET</p>
                <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                  {p.docs.map(d => (
                    <li key={d.label} className="flex items-center justify-between gap-2 rounded-xl border border-ink-800 bg-ink-900 px-3 py-2">
                      <span className="min-w-0 break-words text-[11.5px] font-medium text-ink-100">{d.label}{d.note && <span className="block text-[10px] font-normal text-ink-400">{d.note}</span>}</span>
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

      {/* Edit & resubmit modal */}
      <AnimatePresence>
        {editing && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => { if (!saving) setEditing(null); }} />
            <motion.div initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }} className="relative max-h-[92dvh] w-full max-w-2xl overflow-y-auto overscroll-y-contain rounded-2xl border border-ink-800 bg-ink-900 p-4 shadow-2xl sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-brass-400">Address reviewer feedback</p>
                  <h2 className="mt-1 font-display text-xl font-black text-ink-50">Edit & resubmit listing</h2>
                </div>
                <button disabled={saving} onClick={() => setEditing(null)} className="shrink-0 rounded-lg p-1.5 text-ink-400 hover:bg-ink-800 hover:text-white" aria-label="Close"><X size={18} /></button>
              </div>

              {editing.reviewNote && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-orange-500/35 bg-orange-500/10 px-3.5 py-2.5 text-[11.5px] font-medium text-orange-200">
                  <FileWarning size={15} className="mt-0.5 shrink-0" />
                  <span><strong>Reviewer note:</strong> {editing.reviewNote}</span>
                </div>
              )}

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="label-dark">Property title</span>
                  <input className="input-dark" value={title} onChange={e => setTitle(e.target.value)} />
                </label>
                <label>
                  <span className="label-dark">Property type</span>
                  <select className="input-dark" value={type} onChange={e => setType(e.target.value)}>
                    {PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </label>
                <label>
                  <span className="label-dark">Lagos area</span>
                  <select className="input-dark" value={area} onChange={e => setArea(e.target.value)}>
                    {AREAS.map(a => <option key={a}>{a}</option>)}
                  </select>
                </label>
                <label className="sm:col-span-2">
                  <span className="label-dark">Full Lagos address</span>
                  <input className="input-dark" value={address} onChange={e => setAddress(e.target.value)} />
                </label>
                <label>
                  <span className="label-dark">Nightly rate (₦)</span>
                  <input type="number" min={20000} step={5000} className="input-dark" value={nightlyRate} onChange={e => setNightlyRate(Number(e.target.value))} />
                </label>
                <label>
                  <span className="label-dark">Cleaning & turnover (₦)</span>
                  <input type="number" min={0} step={1000} className="input-dark" value={cleaningFee} onChange={e => setCleaningFee(Number(e.target.value))} />
                </label>
                <label>
                  <span className="label-dark">Refundable deposit (₦)</span>
                  <input type="number" min={0} step={5000} className="input-dark" value={deposit} onChange={e => setDeposit(Number(e.target.value))} />
                </label>
                <label>
                  <span className="label-dark">Bed setup</span>
                  <input className="input-dark" value={bedSetup} onChange={e => setBedSetup(e.target.value)} />
                </label>
                <label>
                  <span className="label-dark">Bedrooms</span>
                  <input type="number" min={1} className="input-dark" value={bedrooms} onChange={e => setBedrooms(Number(e.target.value))} />
                </label>
                <label>
                  <span className="label-dark">Bathrooms</span>
                  <input type="number" min={1} className="input-dark" value={bathrooms} onChange={e => setBathrooms(Number(e.target.value))} />
                </label>
                <label>
                  <span className="label-dark">Guest capacity</span>
                  <input type="number" min={1} max={20} className="input-dark" value={capacity} onChange={e => setCapacity(Number(e.target.value))} />
                </label>
                <label className="sm:col-span-2">
                  <span className="label-dark">Authority to list (basis & mandate reference)</span>
                  <textarea className="input-dark min-h-[64px]" value={authorityBasis} onChange={e => setAuthorityBasis(e.target.value)} />
                </label>
                <label className="sm:col-span-2">
                  <span className="label-dark">House rules (one per line)</span>
                  <textarea className="input-dark min-h-[64px]" value={houseRulesText} onChange={e => setHouseRulesText(e.target.value)} />
                </label>
                <label className="sm:col-span-2">
                  <span className="label-dark">What did you correct? (logged for reviewer)</span>
                  <input className="input-dark" placeholder="e.g. Updated authority mandate reference and confirmed market nightly rate" value={correctionSummary} onChange={e => setCorrectionSummary(e.target.value)} />
                </label>
              </div>

              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button disabled={saving} onClick={() => setEditing(null)} className="btn-ghost-dark !py-2.5 text-[12px]">Cancel</button>
                <button disabled={saving} onClick={() => void submitCorrections()} className="btn-brass !py-2.5 text-[12px] disabled:opacity-50">
                  <ShieldCheck size={14} /> {saving ? 'Submitting…' : 'Save & resubmit for review'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
