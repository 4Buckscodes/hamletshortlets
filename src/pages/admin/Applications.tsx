import { useState } from 'react';
import { CheckCircle2, FileWarning, XCircle, Building2, Phone, Mail, KeyRound } from 'lucide-react';
import { useHamlet } from '../../lib/store';
import { useToast } from '../../lib/toast';
import { timeAgo } from '../../lib/pricing';
import type { ApplicationStatus } from '../../lib/types';

export default function AdminApplications() {
  const { state, reviewApplication, approvePartner } = useHamlet();
  const { toast } = useToast();
  const [tab, setTab] = useState<ApplicationStatus | 'all'>('pending');
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const list = state.applications.filter(a => tab === 'all' || a.status === tab);

  const requestCorrection = (id: string) => {
    if (note.trim().length < 10) { toast('Describe what is needed (min 10 characters).', 'error'); return; }
    reviewApplication(id, 'needs_correction', note.trim());
    toast('Correction requested — applicant notified.', 'info');
    setNoteFor(null); setNote('');
  };
  const reject = (id: string) => {
    reviewApplication(id, 'rejected', note.trim() || 'Application rejected after review.');
    toast('Application rejected and logged.', 'info');
    setNoteFor(null); setNote('');
  };
  const approve = (id: string, name: string) => {
    approvePartner(id);
    toast(`${name} approved — partner account created (temp password demo1234).`);
  };

  const statusCls: Record<ApplicationStatus, string> = {
    pending: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
    approved: 'border-jade-500/40 bg-jade-500/10 text-jade-300',
    needs_correction: 'border-orange-400/40 bg-orange-400/10 text-orange-300',
    rejected: 'border-red-400/40 bg-red-400/10 text-red-300',
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-brass-400">Partner network</p>
      <h1 className="mt-1.5 font-display text-2xl font-black text-ink-50 sm:text-3xl">Partner applications</h1>
      <p className="mt-1 max-w-2xl text-[12px] font-medium text-ink-300">Approval creates a partner account with role-based access — never admin. Public registration cannot grant privileged access by design.</p>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {(['pending', 'needs_correction', 'approved', 'rejected', 'all'] as const).map(t => {
          const n = t === 'all' ? state.applications.length : state.applications.filter(a => a.status === t).length;
          return <button key={t} onClick={() => setTab(t)} className={`rounded-xl border px-3 py-2 text-[11px] font-bold capitalize transition ${tab === t ? 'border-brass-500 bg-brass-500 text-ink-950' : 'border-ink-800 text-ink-300 hover:border-ink-600'}`}>{t.replace('_', ' ')} ({n})</button>;
        })}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {list.map(a => (
          <article key={a.id} className="flex flex-col rounded-2xl border border-ink-800 bg-ink-900 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className={`chip border ${statusCls[a.status]} capitalize`}>{a.status.replace('_', ' ')}</span>
                <h2 className="mt-2 font-display text-lg font-bold text-ink-50">{a.name}</h2>
                <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-brass-300"><Building2 size={12} />{a.company} · {a.role}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 text-[10.5px] font-medium text-ink-400">
                  <span className="inline-flex items-center gap-1"><Mail size={11} />{a.email}</span>
                  <span className="inline-flex items-center gap-1"><Phone size={11} />{a.phone}</span>
                </p>
              </div>
              <p className="shrink-0 text-[10px] font-semibold text-ink-500">{timeAgo(a.submittedAt)}</p>
            </div>
            <p className="mt-3 text-[12px] font-medium leading-relaxed text-ink-200">“{a.motivation}”</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] font-semibold text-ink-400">
              <span>Areas: {a.areas.join(', ')}</span>
              <span>Properties: {a.propertiesCount}</span>
            </div>
            {a.reviewNote && <p className="mt-3 rounded-xl border border-ink-800 bg-ink-850 px-3 py-2 text-[10.5px] font-medium text-ink-300"><span className="font-extrabold uppercase text-[9px] text-ink-500">Reviewer note: </span>{a.reviewNote}</p>}
            {(a.status === 'pending' || a.status === 'needs_correction') && (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-800 pt-4">
                <button onClick={() => approve(a.id, a.name)} className="flex items-center gap-1.5 rounded-xl bg-jade-600 px-4 py-2.5 text-[11.5px] font-bold text-white hover:bg-jade-500"><CheckCircle2 size={14} /> Approve — create account</button>
                <button onClick={() => setNoteFor(noteFor === a.id ? null : a.id)} className="flex items-center gap-1.5 rounded-xl border border-amber-700 bg-amber-950/40 px-4 py-2.5 text-[11.5px] font-bold text-amber-300 hover:bg-amber-950"><FileWarning size={14} /> Request correction</button>
              </div>
            )}
            {noteFor === a.id && (
              <div className="mt-3 rounded-xl border border-amber-800/50 bg-amber-950/10 p-3">
                <textarea autoFocus className="input-dark min-h-[64px] !text-[12px]" placeholder="What must they provide? (min 10 characters)" value={note} onChange={e => setNote(e.target.value)} />
                <div className="mt-2 flex gap-2">
                  <button onClick={() => requestCorrection(a.id)} className="rounded-xl bg-amber-600 px-3.5 py-2 text-[11px] font-bold text-ink-950 hover:bg-amber-500">Send correction request</button>
                  <button onClick={() => reject(a.id)} className="flex items-center gap-1.5 rounded-xl border border-red-800 px-3.5 py-2 text-[11px] font-bold text-red-300 hover:bg-red-950"><XCircle size={13} /> Reject instead</button>
                </div>
              </div>
            )}
          </article>
        ))}
        {list.length === 0 && <p className="col-span-full rounded-2xl border border-dashed border-ink-700 py-14 text-center text-[12.5px] font-semibold text-ink-400">Queue clear — nothing here.</p>}
      </div>

      <p className="mt-6 flex items-start gap-2 text-[10px] font-medium leading-relaxed text-ink-500"><KeyRound size={12} className="mt-0.5 shrink-0" />Approved partners get a partner-role account only. Admin access is provisioned manually in production via the admin provisioning procedure — never through this screen.</p>
    </div>
  );
}
