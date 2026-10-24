import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2, XCircle, FileWarning, PauseCircle, ShieldCheck, Search, Ban, RotateCcw, FileText, CalendarClock, Compass, Navigation, ExternalLink, AlertTriangle, X,
} from 'lucide-react';
import { useHamlet } from '../../lib/store';
import { useToast } from '../../lib/toast';
import { PropertyStatusPill, DocStatusBadge } from '../../components/Badges';
import type { Property, PropertyStatus, WayfinderReviewInput, WayfinderVerificationMethod } from '../../lib/types';
import { formatNaira, formatDateTime, guestFacingNightlyNgn } from '../../lib/pricing';
import { computePropertyAvailabilitySummary } from '../../lib/availability';
import { buildGoogleMapsDirectionsUrl, computeWayfinderReadiness, COORDINATE_POINT_TYPE_LABELS, formatCoordinatePair, VERIFICATION_METHOD_LABELS } from '../../lib/wayfinder';

type AdminPropertyTab = PropertyStatus | 'all' | 'wayfinder_queue' | 'incomplete_guides';

const TABS: { key: AdminPropertyTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'needs_correction', label: 'Needs correction' },
  { key: 'approved', label: 'Approved (live)' },
  { key: 'wayfinder_queue', label: 'Wayfinder queue' },
  { key: 'incomplete_guides', label: 'Live · Incomplete guide' },
  { key: 'paused', label: 'Paused' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'suspended', label: 'Suspended' },
];

export default function AdminProperties() {
  const { state, reviewProperty, reviewPropertyWayfinder } = useHamlet();
  const { toast } = useToast();
  const [tab, setTab] = useState<AdminPropertyTab>('submitted');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<{ id: string; action: 'approve' | 'needs_correction' | 'reject' | 'suspend' | 'reinstate' } | null>(null);
  const [note, setNote] = useState('');
  const [verificationDraft, setVerificationDraft] = useState<Property['verification'] | null>(null);
  const [saving, setSaving] = useState(false);

  // Admin Wayfinder Verification Modal state
  const [wayfinderModalProp, setWayfinderModalProp] = useState<Property | null>(null);
  const [wfDecision, setWfDecision] = useState<WayfinderReviewInput['decision']>('approve_guide');
  const [wfVerificationMethod, setWfVerificationMethod] = useState<WayfinderVerificationMethod>('staff_desk_review');
  const [wfCoordsChecked, setWfCoordsChecked] = useState(true);
  const [wfWrittenChecked, setWfWrittenChecked] = useState(true);
  const [wfPhotosChecked, setWfPhotosChecked] = useState(false);
  const [wfPhysicallyVisited, setWfPhysicallyVisited] = useState(false);
  const [wfArrivalTested, setWfArrivalTested] = useState(false);
  const [wfNotes, setWfNotes] = useState('');
  const [wfSaving, setWfSaving] = useState(false);

  const openWayfinderReview = (p: Property) => {
    const g = state.wayfinderGuides.find(item => item.propertyId === p.id);
    setWayfinderModalProp(p);
    setWfDecision('approve_guide');
    setWfVerificationMethod(g?.verificationMethod ?? 'staff_desk_review');
    setWfCoordsChecked(g?.coordinatesChecked ?? true);
    setWfWrittenChecked(g?.writtenDirectionsChecked ?? true);
    setWfPhotosChecked(g?.photosChecked ?? Boolean(g?.entrancePhotoUrl || g?.buildingPhotoUrl || g?.doorLandmarkPhotoUrl));
    setWfPhysicallyVisited(g?.physicallyVisited ?? false);
    setWfArrivalTested(g?.guestArrivalTested ?? false);
    setWfNotes('');
  };

  const submitWayfinderDecision = async () => {
    if (!wayfinderModalProp) return;
    if (wfNotes.trim().length < 8) {
      toast('Enter a documented Wayfinder verification note (min 8 chars).', 'error');
      return;
    }
    setWfSaving(true);
    try {
      await reviewPropertyWayfinder(wayfinderModalProp.id, {
        decision: wfDecision,
        verificationMethod: wfVerificationMethod,
        coordinatesChecked: wfCoordsChecked,
        writtenDirectionsChecked: wfWrittenChecked,
        photosChecked: wfPhotosChecked,
        physicallyVisited: wfPhysicallyVisited,
        guestArrivalTested: wfArrivalTested,
        reviewerNote: wfNotes.trim(),
      });
      toast(
        wfDecision === 'approve_guide'
          ? 'Complete Wayfinder arrival guide verified and published for confirmed stays.'
          : wfDecision === 'approve_pin_only'
            ? 'Entrance pin verified (guide marked partial until door steps are added).'
            : wfDecision === 'needs_correction'
              ? 'Partner requested to correct arrival guide.'
              : 'Wayfinder decision recorded.',
      );
      setWayfinderModalProp(null);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not record Wayfinder review.', 'error');
    } finally {
      setWfSaving(false);
    }
  };

  const isWayfinderPending = (p: Property) => {
    const g = state.wayfinderGuides.find(item => item.propertyId === p.id);
    return (
      p.wayfinderStatus === 'awaiting_verification' ||
      g?.publicationStatus === 'submitted' ||
      g?.pendingStatus === 'submitted'
    );
  };

  const isLiveGuideIncomplete = (p: Property) => {
    if (p.status !== 'approved') return false;
    const g = state.wayfinderGuides.find(item => item.propertyId === p.id);
    const readiness = computeWayfinderReadiness(p, g ?? null);
    return !readiness.isCompleteDoorToDoor;
  };

  const q = query.trim().toLowerCase();
  const selectedProperty = noteFor ? state.properties.find(property => property.id === noteFor.id) : undefined;
  const openDecision = (id: string, action: NonNullable<typeof noteFor>['action']) => {
    const property = state.properties.find(item => item.id === id);
    if (!property) return;
    setNoteFor({ id, action });
    setNote('');
    setVerificationDraft({ ...property.verification });
  };
  const filtered = state.properties.filter(p => {
    const matchesTab =
      tab === 'all'
        ? true
        : tab === 'wayfinder_queue'
          ? isWayfinderPending(p)
          : tab === 'incomplete_guides'
            ? isLiveGuideIncomplete(p)
            : p.status === tab;
    return (
      matchesTab &&
      (!q || [p.title, p.area, p.ownerName, p.submittedBy, p.address].join(' ').toLowerCase().includes(q))
    );
  });

  const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
  const getDuplicateStatus = (property: Property): 'exact' | 'address_only' | null => {
    const others = state.properties.filter(other => other.id !== property.id && other.status !== 'rejected');
    const sameAreaAddress = others.filter(
      other =>
        normalize(other.area) === normalize(property.area) &&
        normalize(other.address) === normalize(property.address),
    );
    if (sameAreaAddress.length === 0) return null;
    if (sameAreaAddress.some(other => normalize(other.title) === normalize(property.title))) return 'exact';
    return 'address_only';
  };

  const act = async () => {
    if (!noteFor) return;
    if (note.trim().length < 10) {
      toast('Add a reviewer note (min 10 characters) — decisions must be documented.', 'error');
      return;
    }
    const map = { approve: 'approved', needs_correction: 'needs_correction', reject: 'rejected', suspend: 'suspended', reinstate: 'approved' } as const;
    if (!verificationDraft) return;
    if (map[noteFor.action] === 'approved' && Object.values(verificationDraft).some(value => value !== 'verified')) {
      toast('To approve, verify ownership, identity, authority to list, and inspection.', 'error');
      return;
    }
    setSaving(true);
    try {
      await reviewProperty(noteFor.id, map[noteFor.action], note.trim(), verificationDraft);
      toast(noteFor.action === 'approve' ? 'Listing approved — now publicly discoverable.' : 'Decision recorded and audit-logged.', 'info');
      setNoteFor(null); setNote(''); setVerificationDraft(null);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not record the property decision.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const actionLabel = { approve: 'Approve', needs_correction: 'Request correction', reject: 'Reject', suspend: 'Suspend', reinstate: 'Reinstate' };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-brass-400">Verification & decoupled availability workflow</p>
      <h1 className="mt-1.5 font-display text-2xl font-black text-ink-50 sm:text-3xl">Property review & calendar visibility</h1>
      <p className="mt-1 max-w-3xl text-[12px] font-medium text-ink-300">Publication status (submitted → needs correction → approved / paused / rejected / suspended) is independent of calendar occupancy. Occupied homes with verified documents can be approved so guests can discover and book future open dates.</p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {TABS.map(t => {
            const count =
              t.key === 'all'
                ? state.properties.length
                : t.key === 'wayfinder_queue'
                  ? state.properties.filter(isWayfinderPending).length
                  : t.key === 'incomplete_guides'
                    ? state.properties.filter(isLiveGuideIncomplete).length
                    : state.properties.filter(p => p.status === t.key).length;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} className={`rounded-xl border px-3 py-2 text-[11px] font-bold transition ${tab === t.key ? 'border-brass-500 bg-brass-500 text-ink-950' : 'border-ink-800 text-ink-300 hover:border-ink-600'}`}>
                {t.label} <span className="opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
        <label className="flex w-full min-w-0 items-center gap-2 rounded-xl border border-ink-800 bg-ink-900 px-3 py-2.5 sm:min-w-52 sm:flex-1 sm:max-w-xs">
          <Search size={15} className="shrink-0 text-ink-500" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search title, area, owner…" className="w-full min-w-0 bg-transparent text-[12.5px] font-medium text-ink-50 outline-none placeholder:text-ink-500" />
        </label>
      </div>

      <div className="mt-5 grid gap-4">
        {filtered.map(p => {
          const avail = computePropertyAvailabilitySummary({
            property: p,
            bookings: state.bookings,
            publicCalendarSpans: state.publicCalendarSpans,
          });
          const wfGuide = state.wayfinderGuides.find(g => g.propertyId === p.id);
          const wfReadiness = computeWayfinderReadiness(p, wfGuide ?? null);
          return (
          <article key={p.id} className="overflow-hidden rounded-2xl border border-ink-800 bg-ink-900">
            <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row">
              <img src={p.images[0]} alt="" className="h-36 w-full shrink-0 rounded-xl object-cover lg:w-48" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <PropertyStatusPill status={p.status} />
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                    avail.currentStatus === 'available_now'
                      ? 'border-jade-500/40 bg-jade-500/10 text-jade-300'
                      : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                  }`}>
                    <CalendarClock size={11} />
                    {avail.primaryBadgeLabel}
                    {avail.nextAvailableLabel && avail.primaryBadgeLabel !== avail.nextAvailableLabel ? ` · ${avail.nextAvailableLabel}` : ''}
                  </span>
                  {getDuplicateStatus(p) === 'exact' && (
                    <span className="chip border border-red-400/60 bg-red-400/15 text-red-300">Duplicate title & address</span>
                  )}
                  {getDuplicateStatus(p) === 'address_only' && (
                    <span className="chip border border-amber-400/50 bg-amber-400/10 text-amber-300">Same address — verify distinct unit</span>
                  )}
                  <span className="text-[9.5px] font-bold uppercase tracking-widest text-ink-500">{p.type} · {p.area} · submitted {formatDateTime(p.createdAt).split('·')[0]}</span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                      wfReadiness.tone === 'jade'
                        ? 'border-jade-500/40 bg-jade-500/10 text-jade-300'
                        : wfReadiness.tone === 'sky'
                          ? 'border-sky-500/40 bg-sky-500/10 text-sky-300'
                          : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                    }`}
                  >
                    <Compass size={11} />
                    {wfReadiness.badgeLabel}
                    {wfGuide?.pendingStatus === 'submitted' ? ' · Staged update' : ''}
                  </span>
                </div>
                <h2 className="mt-1.5 font-display text-lg font-bold text-ink-50">{p.title}</h2>
                <p className="mt-0.5 text-[11px] font-medium text-ink-400">{p.address}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[10.5px] font-semibold text-ink-300 sm:grid-cols-4">
                  {(['ownership', 'identity', 'authority', 'inspection'] as const).map(k => (
                    <div key={k} className="rounded-lg border border-ink-800 bg-ink-850 px-2.5 py-1.5">
                      <span className="block text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-ink-400">{k}</span>
                      <span className={p.verification[k] === 'verified' ? 'text-jade-400' : p.verification[k] === 'missing' ? 'text-red-400' : 'text-amber-400'}>{p.verification[k] === 'verified' ? '✓ Verified' : p.verification[k] === 'pending_review' ? '◷ Pending' : p.verification[k] === 'missing' ? '✕ Missing' : '◔ Self-reported'}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[10.5px] font-semibold text-ink-500">
                  Submitter: {p.submittedBy} — {p.submittedRole} · <span className="text-ink-400">{p.authorityBasis}</span>
                  {p.calendarResponsiblePerson ? ` · Calendar: ${p.calendarResponsiblePerson}` : ''}
                  {p.unavailableBlocks && p.unavailableBlocks.length > 0 ? ` · ${p.unavailableBlocks.length} blocked window(s)` : ''}
                </p>
                {p.reviewNote && <p className="mt-1.5 rounded-lg border border-ink-800 bg-ink-850 px-3 py-2 text-[10.5px] font-medium text-ink-300"><FileText size={11} className="mr-1 inline" />Last review note: {p.reviewNote}</p>}
              </div>
              <div className="flex shrink-0 flex-col items-stretch justify-center gap-2 lg:w-48">
                <div className="text-left lg:text-right">
                  <p className="font-display text-base font-black tabular-nums text-brass-300">{formatNaira(p.nightlyRate)}<span className="text-[10px] text-ink-500">/night (B)</span></p>
                  <p className="text-[10.5px] font-semibold tabular-nums text-ink-400">Guest: {formatNaira(guestFacingNightlyNgn(p.nightlyRate))}/night</p>
                </div>
                <button
                  type="button"
                  onClick={() => openWayfinderReview(p)}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-brass-500/40 bg-brass-500/10 px-3 py-2 text-[11px] font-bold text-brass-300 transition hover:bg-brass-500/20 [&>svg]:shrink-0"
                >
                  <Compass size={14} /> Review Wayfinder
                </button>
                {(p.status === 'approved' || p.status === 'paused') && (
                  <button onClick={() => openDecision(p.id, 'suspend')} className="flex items-center justify-center gap-1.5 rounded-xl border border-red-800 bg-red-950/40 px-3 py-2.5 text-[11px] font-bold text-red-300 transition hover:bg-red-950 [&>svg]:shrink-0"><PauseCircle size={14} /> Suspend</button>
                )}
                {(p.status === 'suspended' || p.status === 'paused') && (
                  <button onClick={() => openDecision(p.id, 'reinstate')} className="flex items-center justify-center gap-1.5 rounded-xl border border-jade-700 bg-jade-950/40 px-3 py-2.5 text-[11px] font-bold text-jade-300 transition hover:bg-jade-950 [&>svg]:shrink-0"><RotateCcw size={14} /> Reinstate</button>
                )}
                {(p.status === 'submitted' || p.status === 'pending_review' || p.status === 'needs_correction') && (<>
                  <button onClick={() => openDecision(p.id, 'approve')} className="flex items-center justify-center gap-1.5 rounded-xl bg-jade-600 px-3 py-2.5 text-[11px] font-bold text-white transition hover:bg-jade-500 [&>svg]:shrink-0"><CheckCircle2 size={14} /> Approve</button>
                  <button onClick={() => openDecision(p.id, 'needs_correction')} className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-600 bg-amber-950/40 px-3 py-2.5 text-[11px] font-bold text-amber-300 transition hover:bg-amber-950 [&>svg]:shrink-0"><FileWarning size={14} /> Needs correction</button>
                  <button onClick={() => openDecision(p.id, 'reject')} className="flex items-center justify-center gap-1.5 rounded-xl border border-red-800 bg-red-950/40 px-3 py-2.5 text-[11px] font-bold text-red-300 transition hover:bg-red-950 [&>svg]:shrink-0"><XCircle size={14} /> Reject</button>
                </>)}
                {p.status === 'rejected' && <p className="text-center text-[10px] font-semibold text-ink-500">Applicant may reapply with complete evidence.</p>}
              </div>
            </div>
            <div className="border-t border-ink-800">
              <button onClick={() => setOpen(open === p.id ? null : p.id)} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-ink-400 hover:text-ink-100 sm:px-5"><span>Documentation evidence ({p.docs.filter(d => d.status === 'verified').length}/{p.docs.length} verified)</span><span className="shrink-0">{open === p.id ? '−' : '+'}</span></button>
              {open === p.id && (
                <ul className="grid gap-1.5 px-4 pb-4 sm:grid-cols-2 sm:px-5">
                  {p.docs.map(d => (
                    <li key={d.label} className="flex items-center justify-between gap-2 rounded-xl border border-ink-800 bg-ink-850 px-3 py-2">
                      <span className="min-w-0 break-words text-[11px] font-medium leading-snug text-ink-100">{d.label}{d.note && <span className="block text-[9.5px] font-normal text-ink-500">{d.note}</span>}</span>
                      <DocStatusBadge status={d.status} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </article>
        );
        })}
        {filtered.length === 0 && <p className="rounded-2xl border border-dashed border-ink-700 py-14 text-center text-[12.5px] font-semibold text-ink-400">Nothing in this queue.</p>}
      </div>

      {/* Decision modal */}
      <AnimatePresence>
        {noteFor && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => { if (!saving) setNoteFor(null); }} />
            <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97, opacity: 0 }} className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-y-contain rounded-2xl border border-ink-800 bg-ink-900 p-4 shadow-2xl sm:p-6">
              <h2 className="flex items-center gap-2 font-display text-lg font-black text-ink-50"><ShieldCheck size={19} className="shrink-0 text-brass-400" />{actionLabel[noteFor.action]} — documented decision</h2>
              <p className="mt-1 text-[11px] font-medium text-ink-400">For approval, confirm each item was verified from evidence. Declarations alone are not proof. This decision and its verification outcomes are audit-logged.</p>
              {selectedProperty && verificationDraft && <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {([
                  ['ownership', 'Ownership'],
                  ['identity', 'Identity'],
                  ['authority', 'Authority to list'],
                  ['inspection', 'Inspection'],
                ] as const).map(([key, label]) => (
                  <label key={key}><span className="label-dark">{label}</span>
                    <select className="input-dark" value={verificationDraft[key]} onChange={event => setVerificationDraft(current => current ? { ...current, [key]: event.target.value as Property['verification'][typeof key] } : current)}>
                      {['pending_review', 'verified', 'self_reported', 'missing'].map(value => <option key={value} value={value}>{value.replace('_', ' ')}</option>)}
                    </select>
                  </label>
                ))}
              </div>}
              <label className="mt-4 block"><span className="label-dark">Reviewer note (required, min 10 chars)</span>
                <textarea autoFocus className="input-dark min-h-[90px]" placeholder={noteFor.action === 'needs_correction' ? 'What must the submitter fix?…' : noteFor.action === 'suspend' ? 'Grounds for suspension…' : 'Reasoning…'} value={note} onChange={e => setNote(e.target.value)} />
              </label>
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button onClick={() => setNoteFor(null)} disabled={saving} className="btn-ghost-dark !py-2.5 text-[12px]">Cancel</button>
                <button onClick={() => void act()} disabled={saving} className={`btn !px-4 !py-2.5 text-[12px] disabled:opacity-50 ${noteFor.action === 'approve' || noteFor.action === 'reinstate' ? 'bg-jade-600 text-white hover:bg-jade-500' : 'bg-red-600 text-white hover:bg-red-500'}`}><Ban size={14} /> {saving ? 'Saving…' : `Confirm ${actionLabel[noteFor.action].toLowerCase()}`}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Wayfinder Verification Modal */}
      <AnimatePresence>
        {wayfinderModalProp && (() => {
          const g = state.wayfinderGuides.find(item => item.propertyId === wayfinderModalProp.id);
          const secrets = state.wayfinderSecrets.find(item => item.propertyId === wayfinderModalProp.id);
          const staged = g?.pendingSubmission ?? null;
          const inspectLat = staged?.destinationLatitude ?? g?.destinationLatitude ?? null;
          const inspectLng = staged?.destinationLongitude ?? g?.destinationLongitude ?? null;
          const inspectCoordType = staged?.coordinatePointType ?? g?.coordinatePointType ?? 'estate_gate';
          const inspectMapsUrl = buildGoogleMapsDirectionsUrl({ latitude: inspectLat, longitude: inspectLng });

          return (
            <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => !wfSaving && setWayfinderModalProp(null)} />
              <motion.div initial={{ scale: 0.96, y: 14 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }} className="relative max-h-[92dvh] w-full max-w-2xl overflow-y-auto overscroll-y-contain rounded-2xl border border-ink-800 bg-ink-900 p-5 shadow-2xl sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-brass-400">
                      <Compass size={12} /> HAMLET Wayfinder · Location & Arrival Verification
                    </p>
                    <h2 className="mt-1 font-display text-xl font-black text-ink-50">{wayfinderModalProp.title}</h2>
                    <p className="text-[11.5px] font-medium text-ink-400">{wayfinderModalProp.address} · {wayfinderModalProp.area}</p>
                  </div>
                  <button type="button" onClick={() => setWayfinderModalProp(null)} aria-label="Close" className="text-ink-400 hover:text-white">
                    <X size={20} />
                  </button>
                </div>

                {!g && (
                  <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-[12px] font-medium text-amber-200">
                    The partner has not submitted a Wayfinder arrival guide for this listing yet.
                  </div>
                )}

                {staged && (
                  <div className="mt-4 rounded-xl border border-sky-500/30 bg-sky-500/10 p-3.5 text-[11.5px] font-semibold text-sky-200">
                    Post-approval update staged by partner — reviewing staged draft before replacing live revision #{g?.publishedRevision ?? 0}.
                  </div>
                )}

                {g && (
                  <div className="mt-4 space-y-3 rounded-xl border border-ink-800 bg-ink-950/60 p-4 text-[12px] text-ink-200">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-400">Destination pin</span>
                        <p className="font-mono text-[12.5px] font-bold text-ink-50">
                          {formatCoordinatePair(inspectLat, inspectLng) || 'Not set'} · {COORDINATE_POINT_TYPE_LABELS[inspectCoordType]}
                        </p>
                      </div>
                      {inspectMapsUrl && (
                        <a
                          href={inspectMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-brass-500/40 bg-brass-500/15 px-3 py-1.5 text-[11px] font-extrabold text-brass-300 hover:bg-brass-500/25"
                        >
                          <Navigation size={12} /> Inspect pin in Google Maps <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                    <div className="grid gap-2 border-t border-ink-800 pt-3 sm:grid-cols-2">
                      <div>
                        <span className="block text-[10px] font-extrabold uppercase text-ink-500">Entrance / Gate</span>
                        <p>{(staged?.preferredEntranceLabel ?? g.preferredEntranceLabel) || '—'}</p>
                        <p className="mt-0.5 text-[11px] text-ink-400">{(staged?.entranceInstructions ?? g.entranceInstructions) || 'No entrance instructions'}</p>
                      </div>
                      <div>
                        <span className="block text-[10px] font-extrabold uppercase text-ink-500">Building & Door</span>
                        <p>{(staged?.buildingOrBlock ?? g.buildingOrBlock) || '—'} · {(staged?.floorLabel ?? g.floorLabel) || '—'} · {(staged?.apartmentIdentifier ?? g.apartmentIdentifier) || '—'}</p>
                        <p className="mt-0.5 text-[11px] text-ink-400">{(staged?.routeToDoor ?? g.routeToDoor) || 'No door route'}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="block text-[10px] font-extrabold uppercase text-ink-500">Check-in & Contact</span>
                        <p>
                          {(staged?.arrivalContactName ?? g.arrivalContactName) || 'No contact name'} ({(staged?.arrivalContactPhone ?? g.arrivalContactPhone) || 'No phone'}) ·{' '}
                          {secrets ? 'Protected entry/Wi-Fi secrets stored' : 'No entry codes stored'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label>
                    <span className="label-dark">Verification decision</span>
                    <select className="input-dark" value={wfDecision} onChange={e => setWfDecision(e.target.value as WayfinderReviewInput['decision'])}>
                      <option value="approve_guide">Approve complete door-to-door guide</option>
                      <option value="approve_pin_only">Approve entrance pin only (partial guide)</option>
                      <option value="needs_correction">Request partner correction</option>
                      <option value="disable">Disable live guide</option>
                    </select>
                  </label>
                  <label>
                    <span className="label-dark">Verification method</span>
                    <select
                      className="input-dark"
                      value={wfVerificationMethod}
                      onChange={e => setWfVerificationMethod(e.target.value as WayfinderVerificationMethod)}
                    >
                      {(Object.entries(VERIFICATION_METHOD_LABELS) as Array<[WayfinderVerificationMethod, string]>).map(
                        ([k, label]) => (
                          <option key={k} value={k}>
                            {label}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                </div>

                <div className="mt-4 rounded-xl border border-ink-800 bg-ink-850 p-3.5">
                  <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-ink-400">
                    Evidence checklist (be strictly truthful — never mark physical testing unless actually performed on-site)
                  </p>
                  <div className="mt-2.5 grid gap-2 text-[11.5px] font-semibold text-ink-100 sm:grid-cols-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={wfCoordsChecked} onChange={e => setWfCoordsChecked(e.target.checked)} />
                      Entrance coordinates checked on map
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={wfWrittenChecked} onChange={e => setWfWrittenChecked(e.target.checked)} />
                      Written gate-to-door steps checked
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={wfPhotosChecked} onChange={e => setWfPhotosChecked(e.target.checked)} />
                      Arrival photographs checked
                    </label>
                    <label className="flex items-center gap-2 text-amber-200">
                      <input type="checkbox" checked={wfPhysicallyVisited} onChange={e => setWfPhysicallyVisited(e.target.checked)} />
                      Physically visited on-site
                    </label>
                    <label className="flex items-center gap-2 text-amber-200 sm:col-span-2">
                      <input type="checkbox" checked={wfArrivalTested} onChange={e => setWfArrivalTested(e.target.checked)} />
                      Documented street-to-door field test completed
                    </label>
                  </div>
                  {(wfPhysicallyVisited || wfArrivalTested) && (
                    <p className="mt-2 flex items-center gap-1.5 text-[10.5px] font-bold text-amber-300">
                      <AlertTriangle size={12} /> Confirm physical field-test date and inspector name in the reviewer note below.
                    </p>
                  )}
                </div>

                <label className="mt-4 block">
                  <span className="label-dark">Wayfinder verification note (required, min 8 chars)</span>
                  <textarea
                    className="input-dark min-h-[76px]"
                    value={wfNotes}
                    onChange={e => setWfNotes(e.target.value)}
                    placeholder="Document map pin check, gate clarity, or required partner fixes…"
                  />
                </label>

                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" disabled={wfSaving} onClick={() => setWayfinderModalProp(null)} className="btn-ghost-dark !py-2.5 text-[12px]">
                    Cancel
                  </button>
                  <button type="button" disabled={wfSaving} onClick={() => void submitWayfinderDecision()} className="btn-brass !py-2.5 text-[12px] disabled:opacity-50">
                    {wfSaving ? 'Recording…' : 'Record Wayfinder decision'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
