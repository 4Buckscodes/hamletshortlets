import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2, XCircle, FileWarning, PauseCircle, ShieldCheck, Search, Ban, RotateCcw, FileText,
} from 'lucide-react';
import { useHamlet } from '../../lib/store';
import { useToast } from '../../lib/toast';
import { PropertyStatusPill, DocStatusBadge } from '../../components/Badges';
import type { Property, PropertyStatus } from '../../lib/types';
import { formatNaira, formatDateTime } from '../../lib/pricing';

const TABS: { key: PropertyStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'needs_correction', label: 'Needs correction' },
  { key: 'approved', label: 'Approved (live)' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'suspended', label: 'Suspended' },
];

export default function AdminProperties() {
  const { state, reviewProperty } = useHamlet();
  const { toast } = useToast();
  const [tab, setTab] = useState<PropertyStatus | 'all'>('submitted');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<{ id: string; action: 'approve' | 'needs_correction' | 'reject' | 'suspend' | 'reinstate' } | null>(null);
  const [note, setNote] = useState('');
  const [verificationDraft, setVerificationDraft] = useState<Property['verification'] | null>(null);
  const [saving, setSaving] = useState(false);

  const q = query.trim().toLowerCase();
  const selectedProperty = noteFor ? state.properties.find(property => property.id === noteFor.id) : undefined;
  const openDecision = (id: string, action: NonNullable<typeof noteFor>['action']) => {
    const property = state.properties.find(item => item.id === id);
    if (!property) return;
    setNoteFor({ id, action });
    setNote('');
    setVerificationDraft({ ...property.verification });
  };
  const filtered = state.properties.filter(p =>
    (tab === 'all' || p.status === tab) &&
    (!q || [p.title, p.area, p.ownerName, p.submittedBy, p.address].join(' ').toLowerCase().includes(q)),
  );

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
      <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-brass-400">Verification workflow</p>
      <h1 className="mt-1.5 font-display text-2xl font-black text-ink-50 sm:text-3xl">Property review</h1>
      <p className="mt-1 max-w-2xl text-[12px] font-medium text-ink-300">States: submitted → needs correction → approved / rejected / suspended. Only approved, non-suspended listings are publicly discoverable. Every decision is audit-logged with your name.</p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {TABS.map(t => {
            const count = t.key === 'all' ? state.properties.length : state.properties.filter(p => p.status === t.key).length;
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
        {filtered.map(p => (
          <article key={p.id} className="overflow-hidden rounded-2xl border border-ink-800 bg-ink-900">
            <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row">
              <img src={p.images[0]} alt="" className="h-36 w-full shrink-0 rounded-xl object-cover lg:w-48" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <PropertyStatusPill status={p.status} />
                  {getDuplicateStatus(p) === 'exact' && (
                    <span className="chip border border-red-400/60 bg-red-400/15 text-red-300">Duplicate title & address</span>
                  )}
                  {getDuplicateStatus(p) === 'address_only' && (
                    <span className="chip border border-amber-400/50 bg-amber-400/10 text-amber-300">Same address — verify distinct unit</span>
                  )}
                  <span className="text-[9.5px] font-bold uppercase tracking-widest text-ink-500">{p.type} · {p.area} · submitted {formatDateTime(p.createdAt).split('·')[0]}</span>
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
                <p className="mt-2 text-[10.5px] font-semibold text-ink-500">Submitter: {p.submittedBy} — {p.submittedRole} · <span className="text-ink-400">{p.authorityBasis}</span></p>
                {p.reviewNote && <p className="mt-1.5 rounded-lg border border-ink-800 bg-ink-850 px-3 py-2 text-[10.5px] font-medium text-ink-300"><FileText size={11} className="mr-1 inline" />Last review note: {p.reviewNote}</p>}
              </div>
              <div className="flex shrink-0 flex-col items-stretch justify-center gap-2 lg:w-44">
                <p className="text-left font-display text-base font-black tabular-nums text-brass-300 lg:text-right">{formatNaira(p.nightlyRate)}<span className="text-[10px] text-ink-500">/night</span></p>
                {p.status === 'approved' && (
                  <button onClick={() => openDecision(p.id, 'suspend')} className="flex items-center justify-center gap-1.5 rounded-xl border border-red-800 bg-red-950/40 px-3 py-2.5 text-[11px] font-bold text-red-300 transition hover:bg-red-950 [&>svg]:shrink-0"><PauseCircle size={14} /> Suspend</button>
                )}
                {p.status === 'suspended' && (
                  <button onClick={() => openDecision(p.id, 'reinstate')} className="flex items-center justify-center gap-1.5 rounded-xl border border-jade-700 bg-jade-950/40 px-3 py-2.5 text-[11px] font-bold text-jade-300 transition hover:bg-jade-950 [&>svg]:shrink-0"><RotateCcw size={14} /> Reinstate</button>
                )}
                {(p.status === 'submitted' || p.status === 'needs_correction') && (<>
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
        ))}
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
    </div>
  );
}
