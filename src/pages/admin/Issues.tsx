import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, UserPlus, AlertOctagon, SearchCheck, CheckCheck, FileText, Paperclip } from 'lucide-react';
import { useHamlet } from '../../lib/store';
import { useToast } from '../../lib/toast';
import { IssueStatusPill, SeverityDot } from '../../components/Badges';
import type { IssueStatus, Issue } from '../../lib/types';
import { formatDateTime } from '../../lib/pricing';

export default function AdminIssues() {
  const { state, updateIssue } = useHamlet();
  const { toast } = useToast();
  const [selected, setSelected] = useState<Issue | null>(null);
  const [note, setNote] = useState('');
  const [filter, setFilter] = useState<'active' | 'all'>('active');
  const [saving, setSaving] = useState(false);

  const issues = state.issues
    .filter(i => filter === 'all' || !['resolved', 'closed'].includes(i.status))
    .sort((a, b) => ({ critical: 0, high: 1, medium: 2, low: 3 }[a.severity] - { critical: 0, high: 1, medium: 2, low: 3 }[b.severity]));

  const setStatus = async (status: IssueStatus) => {
    if (!selected) return;
    const trimmed = note.trim();
    if ((status === 'resolved' || status === 'closed') && trimmed.length < 8 && !selected.resolution) {
      toast('Enter a documented resolution summary (min 8 characters) before resolving or closing.', 'error');
      return;
    }
    setSaving(true);
    try {
      await updateIssue(selected.id, status, {
        note: trimmed || undefined,
        resolution: status === 'resolved' || status === 'closed' ? (trimmed || selected.resolution) : undefined,
      });
      toast(`Issue ${selected.ref} → ${status}.`, status === 'escalated' ? 'error' : 'info');
      setSelected(null);
      setNote('');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not update issue.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const assign = async () => {
    if (!selected) return;
    const assigneeName = state.session?.name ?? 'HAMLET operations';
    setSaving(true);
    try {
      await updateIssue(selected.id, 'assigned', {
        assignee: assigneeName,
        assigneeId: state.session?.userId,
        note: note.trim() || `Assigned to ${assigneeName}`,
      });
      toast(`${selected.ref} assigned to ${assigneeName}.`);
      setSelected(null);
      setNote('');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not assign issue.', 'error');
    } finally {
      setSaving(false);
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
        <div className="flex gap-1.5">
          {(['active', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-xl border px-3.5 py-2 text-[11px] font-bold capitalize transition ${filter === f ? 'border-brass-500 bg-brass-500 text-ink-950' : 'border-ink-800 text-ink-300'}`}>{f} ({f === 'active' ? state.issues.filter(i => !['resolved', 'closed'].includes(i.status)).length : state.issues.length})</button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        {issues.map(i => (
          <button key={i.id} onClick={() => setSelected(i)} className="flex w-full flex-wrap items-center gap-3 rounded-2xl border border-ink-800 bg-ink-900 p-4 text-left transition hover:border-ink-600 hover:bg-ink-850">
            <SeverityDot severity={i.severity} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10.5px] font-bold text-brass-300">{i.ref}</span>
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-ink-500">{i.category}</span>
              </div>
              <p className="mt-0.5 line-clamp-1 text-[13px] font-bold text-ink-50">{i.subject}</p>
              <p className="text-[10.5px] font-semibold text-ink-500">Reporter: {i.reporter} ({i.reporterType}){i.bookingRef ? ` · Booking ${i.bookingRef}` : ''}{i.propertyTitle ? ` · ${i.propertyTitle}` : ''}</p>
            </div>
            <IssueStatusPill status={i.status} />
          </button>
        ))}
        {issues.length === 0 && <p className="rounded-2xl border border-dashed border-ink-700 py-14 text-center text-[12.5px] font-semibold text-ink-400">No issues in this view.</p>}
      </div>

      {/* Detail drawer */}
      <AnimatePresence>
        {selected && (
          <motion.div className="fixed inset-0 z-50 flex justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/70" onClick={() => setSelected(null)} />
            <motion.aside initial={{ x: 480 }} animate={{ x: 0 }} exit={{ x: 480 }} transition={{ type: 'spring', damping: 32, stiffness: 300 }} className="relative h-full w-full max-w-lg overflow-y-auto border-l border-ink-800 bg-ink-900 dark-scroll">
              <div className="sticky top-0 z-10 border-b border-ink-800 bg-ink-900/95 px-6 py-4 backdrop-blur">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-[11px] font-bold text-brass-300">{selected.ref} · <IssueStatusPill status={selected.status} /></p>
                    <h2 className="mt-1.5 font-display text-lg font-black leading-snug text-ink-50">{selected.subject}</h2>
                  </div>
                  <button onClick={() => setSelected(null)} className="rounded-lg p-2 text-ink-400 hover:bg-ink-800 hover:text-white"><X size={20} /></button>
                </div>
              </div>
              <div className="p-6">
                <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                  <span className="rounded-md border border-ink-800 bg-ink-850 px-2.5 py-1 text-ink-200">{selected.category}</span>
                  <span className="flex items-center gap-1.5 rounded-md border border-ink-800 bg-ink-850 px-2.5 py-1 capitalize text-ink-200"><SeverityDot severity={selected.severity} />{selected.severity} severity</span>
                  {selected.assignee && <span className="rounded-md border border-ink-800 bg-ink-850 px-2.5 py-1 text-ink-200">Assignee: {selected.assignee}</span>}
                </div>
                <p className="mt-4 text-[12.5px] font-medium leading-relaxed text-ink-100">{selected.description}</p>
                <p className="mt-2 text-[10.5px] font-semibold text-ink-500">Reported {formatDateTime(selected.createdAt)} by {selected.reporter} ({selected.reporterType})</p>

                {selected.evidence.length > 0 && (
                  <div className="mt-4">
                    <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink-500"><Paperclip size={12} /> Evidence</p>
                    <ul className="mt-1.5 space-y-1.5">{selected.evidence.map(e => <li key={e} className="flex items-center gap-2 rounded-lg border border-ink-800 bg-ink-850 px-3 py-2 text-[11.5px] font-medium text-ink-100"><FileText size={13} className="shrink-0 text-ink-500" />{e}</li>)}</ul>
                  </div>
                )}
                {selected.resolution && <p className="mt-4 rounded-xl border border-jade-500/30 bg-jade-500/10 px-4 py-3 text-[11.5px] font-medium text-jade-200"><strong>Resolution:</strong> {selected.resolution}</p>}

                <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink-500">Timeline</p>
                <ol className="mt-2 border-l-2 border-ink-800 pl-4">
                  {selected.timeline.map((t, i) => (
                    <li key={i} className="relative pb-3 text-[11px] last:pb-0">
                      <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-brass-400" />
                      <p className="font-bold text-ink-100">{t.label}</p>
                      <p className="text-[9.5px] font-medium text-ink-500">{formatDateTime(t.at)} · {t.actor}{t.detail ? ` · ${t.detail}` : ''}</p>
                    </li>
                  ))}
                </ol>

                {/* Actions */}
                {!['resolved', 'closed'].includes(selected.status) && (
                  <div className="mt-5 border-t border-ink-800 pt-4">
                    <label className="block"><span className="label-dark">Action note (recorded)</span>
                      <textarea className="input-dark min-h-[64px]" placeholder="What did you do / decide / find?…" value={note} onChange={e => setNote(e.target.value)} />
                    </label>
                    <div className="mt-3 flex flex-wrap gap-2">
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
