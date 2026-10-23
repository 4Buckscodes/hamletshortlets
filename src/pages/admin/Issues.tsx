import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, UserPlus, AlertOctagon, SearchCheck, CheckCheck, FileText, Paperclip, PlusCircle } from 'lucide-react';
import { useHamlet } from '../../lib/store';
import { useToast } from '../../lib/toast';
import { IssueStatusPill, SeverityDot } from '../../components/Badges';
import type { IssueStatus, Issue } from '../../lib/types';
import { formatDateTime } from '../../lib/pricing';

export default function AdminIssues() {
  const { state, updateIssue, reportIssue, appendIssueEvidence } = useHamlet();
  const { toast } = useToast();
  const [selected, setSelected] = useState<Issue | null>(null);
  const [note, setNote] = useState('');
  const [evidenceInput, setEvidenceInput] = useState('');
  const [filter, setFilter] = useState<'active' | 'all'>('active');
  const [saving, setSaving] = useState(false);

  // Ops-initiated issue creation modal
  const [showLogModal, setShowLogModal] = useState(false);
  const [bookingRef, setBookingRef] = useState('');
  const [category, setCategory] = useState<Issue['category']>('Access & check-in');
  const [severity, setSeverity] = useState<Issue['severity']>('medium');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [initialEvidence, setInitialEvidence] = useState('');
  const [creating, setCreating] = useState(false);

  const issues = state.issues
    .filter(i => filter === 'all' || !['resolved', 'closed'].includes(i.status))
    .sort((a, b) => ({ critical: 0, high: 1, medium: 2, low: 3 }[a.severity] - { critical: 0, high: 1, medium: 2, low: 3 }[b.severity]));

  const activeIssue = selected ? (state.issues.find(i => i.id === selected.id) ?? selected) : null;

  const setStatus = async (status: IssueStatus) => {
    if (!activeIssue) return;
    const trimmed = note.trim();
    if ((status === 'resolved' || status === 'closed') && trimmed.length < 8 && !activeIssue.resolution) {
      toast('Enter a documented resolution summary (min 8 characters) before resolving or closing.', 'error');
      return;
    }
    setSaving(true);
    try {
      await updateIssue(activeIssue.id, status, {
        note: trimmed || undefined,
        resolution: status === 'resolved' || status === 'closed' ? (trimmed || activeIssue.resolution) : undefined,
      });
      toast(`Issue ${activeIssue.ref} → ${status}.`, status === 'escalated' ? 'error' : 'info');
      setSelected(null);
      setNote('');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not update issue.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const assign = async () => {
    if (!activeIssue) return;
    const assigneeName = state.session?.name ?? 'HAMLET operations';
    setSaving(true);
    try {
      await updateIssue(activeIssue.id, 'assigned', {
        assignee: assigneeName,
        assigneeId: state.session?.userId,
        note: note.trim() || `Assigned to ${assigneeName}`,
      });
      toast(`${activeIssue.ref} assigned to ${assigneeName}.`);
      setNote('');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not assign issue.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const attachEvidence = async () => {
    if (!activeIssue) return;
    const trimmed = evidenceInput.trim();
    if (trimmed.length < 4) {
      toast('Enter an evidence description or link (min 4 characters).', 'error');
      return;
    }
    setSaving(true);
    try {
      await appendIssueEvidence(activeIssue.id, trimmed);
      setEvidenceInput('');
      toast(`Evidence attached to ${activeIssue.ref}.`);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not attach evidence.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const createOpsIssue = async () => {
    if (!bookingRef) {
      toast('Select a booking reference for the operational issue.', 'error');
      return;
    }
    if (subject.trim().length < 4 || description.trim().length < 10) {
      toast('Enter a subject (min 4 chars) and description (min 10 chars).', 'error');
      return;
    }
    const targetBooking = state.bookings.find(b => b.ref === bookingRef);
    setCreating(true);
    try {
      const created = await reportIssue({
        bookingRef,
        propertyTitle: targetBooking?.propertyTitle,
        category,
        severity,
        subject: subject.trim(),
        description: description.trim(),
        reporter: state.session?.name ?? 'HAMLET operations',
        reporterType: 'internal',
        evidence: initialEvidence.trim() ? [initialEvidence.trim()] : [],
      });
      toast(`Operational issue ${created.ref} logged.`);
      setShowLogModal(false);
      setSubject('');
      setDescription('');
      setInitialEvidence('');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not log operational issue.', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-brass-400">Issue resolution</p>
          <h1 className="mt-1.5 font-display text-2xl font-black text-ink-50 sm:text-3xl">Issues & accountability</h1>
          <p className="mt-1 max-w-xl text-[12px] font-medium text-ink-300">Report → assign → investigate → escalate → resolve → close. Every action, note and evidence artefact is recorded against the issue and audit-logged.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1.5">
            {(['active', 'all'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`rounded-xl border px-3.5 py-2 text-[11px] font-bold capitalize transition ${filter === f ? 'border-brass-500 bg-brass-500 text-ink-950' : 'border-ink-800 text-ink-300'}`}>{f} ({f === 'active' ? state.issues.filter(i => !['resolved', 'closed'].includes(i.status)).length : state.issues.length})</button>
            ))}
          </div>
          {state.bookings.length > 0 && (
            <button
              onClick={() => {
                if (!bookingRef && state.bookings[0]) setBookingRef(state.bookings[0].ref);
                setShowLogModal(true);
              }}
              className="btn-brass !py-2 text-[11.5px]"
            >
              <PlusCircle size={14} /> Log ops issue
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        {issues.map(i => (
          <button key={i.id} onClick={() => setSelected(i)} className="flex w-full flex-col gap-2.5 rounded-2xl border border-ink-800 bg-ink-900 p-4 text-left transition hover:border-ink-600 hover:bg-ink-850 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
              <SeverityDot severity={i.severity} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10.5px] font-bold text-brass-300">{i.ref}</span>
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-ink-500">{i.category}</span>
                </div>
                <p className="mt-0.5 line-clamp-1 text-[13px] font-bold text-ink-50">{i.subject}</p>
                <p className="text-[10.5px] font-semibold text-ink-500">Reporter: {i.reporter} ({i.reporterType}){i.bookingRef ? ` · Booking ${i.bookingRef}` : ''}{i.propertyTitle ? ` · ${i.propertyTitle}` : ''}</p>
              </div>
            </div>
            <div className="pl-5 sm:shrink-0 sm:pl-0">
              <IssueStatusPill status={i.status} />
            </div>
          </button>
        ))}
        {issues.length === 0 && <p className="rounded-2xl border border-dashed border-ink-700 py-14 text-center text-[12.5px] font-semibold text-ink-400">No issues in this view.</p>}
      </div>

      {/* Log ops issue modal */}
      <AnimatePresence>
        {showLogModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => { if (!creating) setShowLogModal(false); }} />
            <motion.div initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }} className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto overscroll-y-contain rounded-2xl border border-ink-800 bg-ink-900 p-5 shadow-2xl sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-brass-400">Operations desk</p>
                  <h2 className="mt-1 font-display text-xl font-black text-ink-50">Log booking issue</h2>
                </div>
                <button disabled={creating} onClick={() => setShowLogModal(false)} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-800 hover:text-white" aria-label="Close"><X size={18} /></button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="label-dark">Booking</span>
                  <select className="input-dark" value={bookingRef} onChange={e => setBookingRef(e.target.value)}>
                    {state.bookings.map(b => (
                      <option key={b.id} value={b.ref}>{b.ref} · {b.propertyTitle} ({b.guestName})</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="label-dark">Category</span>
                  <select className="input-dark" value={category} onChange={e => setCategory(e.target.value as Issue['category'])}>
                    {(['Access & check-in', 'Property condition', 'Booking conflict', 'Host conduct', 'Damages', 'Safety & security', 'Guest conduct', 'Payment & billing', 'Other'] as Issue['category'][]).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label>
                  <span className="label-dark">Severity</span>
                  <select className="input-dark" value={severity} onChange={e => setSeverity(e.target.value as Issue['severity'])}>
                    {(['low', 'medium', 'high', 'critical'] as Issue['severity'][]).map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                  </select>
                </label>
                <label className="sm:col-span-2">
                  <span className="label-dark">Subject</span>
                  <input className="input-dark" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Gate pass delay reported via HAMLET support phone" />
                </label>
                <label className="sm:col-span-2">
                  <span className="label-dark">Description</span>
                  <textarea className="input-dark min-h-[84px]" value={description} onChange={e => setDescription(e.target.value)} placeholder="Document operational context, guest/partner call notes, and immediate action…" />
                </label>
                <label className="sm:col-span-2">
                  <span className="label-dark">Initial evidence note or link (optional)</span>
                  <input className="input-dark" value={initialEvidence} onChange={e => setInitialEvidence(e.target.value)} placeholder="e.g. Support call timestamp 15:40 WAT" />
                </label>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button disabled={creating} onClick={() => setShowLogModal(false)} className="btn-ghost-dark !py-2.5 text-[12px]">Cancel</button>
                <button disabled={creating} onClick={() => void createOpsIssue()} className="btn-brass !py-2.5 text-[12px] disabled:opacity-50">
                  {creating ? 'Logging…' : 'Create issue'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail drawer */}
      <AnimatePresence>
        {activeIssue && (
          <motion.div className="fixed inset-0 z-50 flex justify-end overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/70" onClick={() => setSelected(null)} />
            <motion.aside initial={{ x: 480 }} animate={{ x: 0 }} exit={{ x: 480 }} transition={{ type: 'spring', damping: 32, stiffness: 300 }} className="relative h-dvh w-full max-w-lg overflow-y-auto overscroll-y-contain border-l border-ink-800 bg-ink-900 dark-scroll">
              <div className="sticky top-0 z-10 border-b border-ink-800 bg-ink-900/95 px-4 py-4 backdrop-blur sm:px-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] font-bold text-brass-300"><span>{activeIssue.ref}</span><span>·</span><IssueStatusPill status={activeIssue.status} /></p>
                    <h2 className="mt-1.5 break-words font-display text-lg font-black leading-snug text-ink-50">{activeIssue.subject}</h2>
                  </div>
                  <button onClick={() => setSelected(null)} className="shrink-0 rounded-lg p-2 text-ink-400 hover:bg-ink-800 hover:text-white" aria-label="Close"><X size={20} /></button>
                </div>
              </div>
              <div className="p-4 sm:p-6">
                <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                  <span className="rounded-md border border-ink-800 bg-ink-850 px-2.5 py-1 text-ink-200">{activeIssue.category}</span>
                  <span className="flex items-center gap-1.5 rounded-md border border-ink-800 bg-ink-850 px-2.5 py-1 capitalize text-ink-200"><SeverityDot severity={activeIssue.severity} />{activeIssue.severity} severity</span>
                  {activeIssue.assignee && <span className="rounded-md border border-ink-800 bg-ink-850 px-2.5 py-1 text-ink-200">Assignee: {activeIssue.assignee}</span>}
                </div>
                <p className="mt-4 break-words text-[12.5px] font-medium leading-relaxed text-ink-100">{activeIssue.description}</p>
                <p className="mt-2 text-[10.5px] font-semibold text-ink-500">Reported {formatDateTime(activeIssue.createdAt)} by {activeIssue.reporter} ({activeIssue.reporterType})</p>

                <div className="mt-4">
                  <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink-500"><Paperclip size={12} className="shrink-0" /> Evidence ({activeIssue.evidence.length})</p>
                  {activeIssue.evidence.length > 0 && (
                    <ul className="mt-1.5 space-y-1.5">{activeIssue.evidence.map((e, idx) => <li key={idx} className="flex items-center gap-2 rounded-lg border border-ink-800 bg-ink-850 px-3 py-2 text-[11.5px] font-medium text-ink-100"><FileText size={13} className="shrink-0 text-ink-500" /><span className="min-w-0 break-all">{e}</span></li>)}</ul>
                  )}
                  {!['resolved', 'closed'].includes(activeIssue.status) && (
                    <div className="mt-2 flex gap-2">
                      <input
                        className="input-dark flex-1 !py-2 text-[12px]"
                        placeholder="Attach evidence note, inspection photo URL, or receipt ref…"
                        value={evidenceInput}
                        onChange={e => setEvidenceInput(e.target.value)}
                      />
                      <button disabled={saving} onClick={() => void attachEvidence()} className="btn-ghost-dark shrink-0 !border !border-ink-700 !px-3 !py-2 text-[11px] disabled:opacity-50">
                        Attach
                      </button>
                    </div>
                  )}
                </div>

                {activeIssue.resolution && <p className="mt-4 break-words rounded-xl border border-jade-500/30 bg-jade-500/10 px-4 py-3 text-[11.5px] font-medium text-jade-200"><strong>Resolution:</strong> {activeIssue.resolution}</p>}

                <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink-500">Timeline</p>
                <ol className="mt-2 border-l-2 border-ink-800 pl-4">
                  {activeIssue.timeline.map((t, i) => (
                    <li key={i} className="relative pb-3 text-[11px] last:pb-0">
                      <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-brass-400" />
                      <p className="font-bold text-ink-100">{t.label}</p>
                      <p className="break-words text-[9.5px] font-medium text-ink-500">{formatDateTime(t.at)} · {t.actor}{t.detail ? ` · ${t.detail}` : ''}</p>
                    </li>
                  ))}
                </ol>

                {/* Actions */}
                {!['resolved', 'closed'].includes(activeIssue.status) && (
                  <div className="mt-5 border-t border-ink-800 pt-4">
                    <label className="block"><span className="label-dark">Action note (recorded)</span>
                      <textarea className="input-dark min-h-[64px]" placeholder="What did you do / decide / find?…" value={note} onChange={e => setNote(e.target.value)} />
                    </label>
                    <div className="mt-3 flex flex-wrap gap-2 [&>button>svg]:shrink-0">
                      <button disabled={saving} onClick={() => void assign()} className="flex items-center gap-1.5 rounded-xl border border-ink-700 px-3 py-2 text-[11px] font-bold text-ink-100 hover:bg-ink-800 disabled:opacity-50"><UserPlus size={13} /> Assign to me</button>
                      <button disabled={saving} onClick={() => void setStatus('investigating')} className="flex items-center gap-1.5 rounded-xl border border-sky-800 bg-sky-950/40 px-3 py-2 text-[11px] font-bold text-sky-300 hover:bg-sky-950 disabled:opacity-50"><SearchCheck size={13} /> Investigating</button>
                      <button disabled={saving} onClick={() => void setStatus('escalated')} className="flex items-center gap-1.5 rounded-xl border border-orange-800 bg-orange-950/40 px-3 py-2 text-[11px] font-bold text-orange-300 hover:bg-orange-950 disabled:opacity-50"><AlertOctagon size={13} /> Escalate</button>
                      <button disabled={saving} onClick={() => void setStatus('resolved')} className="flex items-center gap-1.5 rounded-xl border border-jade-700 bg-jade-950/40 px-3 py-2 text-[11px] font-bold text-jade-300 hover:bg-jade-950 disabled:opacity-50"><CheckCheck size={13} /> Resolve</button>
                      <button disabled={saving} onClick={() => void setStatus('closed')} className="flex items-center gap-1.5 rounded-xl bg-ink-700 px-3 py-2 text-[11px] font-bold text-ink-100 hover:bg-ink-600 disabled:opacity-50"><X size={13} /> Close</button>
                    </div>
                  </div>
                )}
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
