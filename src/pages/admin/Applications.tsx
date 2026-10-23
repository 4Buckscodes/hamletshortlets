import { useState } from 'react';
import { CheckCircle2, FileWarning, XCircle, Building2, Phone, Mail, KeyRound, ShieldAlert, ShieldCheck, Ban } from 'lucide-react';
import { useHamlet } from '../../lib/store';
import { useToast } from '../../lib/toast';
import { timeAgo } from '../../lib/pricing';
import type { Account, ApplicationStatus } from '../../lib/types';

export default function AdminApplications() {
  const { state, reviewApplication, approvePartner, setPartnerAccountStatus } = useHamlet();
  const { toast } = useToast();
  const [tab, setTab] = useState<ApplicationStatus | 'all'>('pending');
  const [noteFor, setNoteFor] = useState<{ id: string; action: 'approve' | 'needs_correction' | 'reject' } | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Partner account governance state
  const [govTarget, setGovTarget] = useState<{ partner: Account; nextStatus: 'active' | 'suspended' } | null>(null);
  const [govReason, setGovReason] = useState('');
  const [cascadeSuspend, setCascadeSuspend] = useState(true);
  const [govSaving, setGovSaving] = useState(false);

  const list = state.applications.filter(a => tab === 'all' || a.status === tab);
  const partnerAccounts = state.accounts.filter(a => a.role === 'partner');

  const review = async () => {
    if (!noteFor) return;
    if (note.trim().length < 10) { toast('Describe what is needed (min 10 characters).', 'error'); return; }
    setSaving(true);
    try {
      if (noteFor.action === 'approve') await approvePartner(noteFor.id, note.trim());
      else await reviewApplication(noteFor.id, noteFor.action === 'needs_correction' ? 'needs_correction' : 'rejected', note.trim());
      toast(noteFor.action === 'approve' ? 'Application approved — applicant role updated to partner.' : noteFor.action === 'reject' ? 'Application rejected and logged.' : 'Correction requested and logged.', 'info');
      setNoteFor(null);
      setNote('');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not save application decision.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const applyPartnerGovernance = async () => {
    if (!govTarget) return;
    if (govReason.trim().length < 10) {
      toast('Provide a documented reason (min 10 characters).', 'error');
      return;
    }
    setGovSaving(true);
    try {
      await setPartnerAccountStatus(
        govTarget.partner.id,
        govTarget.nextStatus,
        govReason.trim(),
        cascadeSuspend,
      );
      toast(
        govTarget.nextStatus === 'suspended'
          ? `${govTarget.partner.name} suspended and audit-logged.`
          : `${govTarget.partner.name} reinstated to active partner status.`,
        govTarget.nextStatus === 'suspended' ? 'info' : 'success',
      );
      setGovTarget(null);
      setGovReason('');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not update partner account status.', 'error');
    } finally {
      setGovSaving(false);
    }
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
      <h1 className="mt-1.5 font-display text-2xl font-black text-ink-50 sm:text-3xl">Partner applications & governance</h1>
      <p className="mt-1 max-w-2xl text-[12px] font-medium text-ink-300">Approval changes the applicant’s existing account to the partner role — never admin access. Approved partners can be suspended or reinstated below when justified, with documented audit trails.</p>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {(['pending', 'needs_correction', 'approved', 'rejected', 'all'] as const).map(t => {
          const n = t === 'all' ? state.applications.length : state.applications.filter(a => a.status === t).length;
          return <button key={t} onClick={() => setTab(t)} className={`rounded-xl border px-3 py-2 text-[11px] font-bold capitalize transition ${tab === t ? 'border-brass-500 bg-brass-500 text-ink-950' : 'border-ink-800 text-ink-300 hover:border-ink-600'}`}>{t.replace('_', ' ')} ({n})</button>;
        })}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {list.map(a => (
          <article key={a.id} className="flex flex-col rounded-2xl border border-ink-800 bg-ink-900 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className={`chip border ${statusCls[a.status]} capitalize`}>{a.status.replace('_', ' ')}</span>
                <h2 className="mt-2 break-words font-display text-lg font-bold text-ink-50">{a.name}</h2>
                <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-brass-300"><Building2 size={12} className="shrink-0" /><span className="min-w-0 break-words">{a.company} · {a.role}</span></p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10.5px] font-medium text-ink-400">
                  <span className="inline-flex min-w-0 items-center gap-1"><Mail size={11} className="shrink-0" /><span className="break-all">{a.email}</span></span>
                  <span className="inline-flex items-center gap-1"><Phone size={11} className="shrink-0" />{a.phone}</span>
                </p>
              </div>
              <p className="shrink-0 text-[10px] font-semibold text-ink-500">{timeAgo(a.submittedAt)}</p>
            </div>
            {a.motivation && <p className="mt-3 break-words text-[12px] font-medium leading-relaxed text-ink-200">“{a.motivation}”</p>}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] font-semibold text-ink-400">
              <span>Areas: {a.areas.join(', ')}</span>
              <span>Properties: {a.propertiesCount}</span>
            </div>
            {a.reviewNote && <p className="mt-3 break-words rounded-xl border border-ink-800 bg-ink-850 px-3 py-2 text-[10.5px] font-medium text-ink-300"><span className="font-extrabold uppercase text-[9px] text-ink-500">Reviewer note: </span>{a.reviewNote}</p>}
            {(a.status === 'pending' || a.status === 'needs_correction') && (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-800 pt-4 [&>button>svg]:shrink-0">
                <button onClick={() => { setNoteFor({ id: a.id, action: 'approve' }); setNote(''); }} className="flex items-center gap-1.5 rounded-xl bg-jade-600 px-4 py-2.5 text-[11.5px] font-bold text-white hover:bg-jade-500"><CheckCircle2 size={14} /> Approve partner</button>
                <button onClick={() => { setNoteFor(noteFor?.id === a.id ? null : { id: a.id, action: 'needs_correction' }); setNote(''); }} className="flex items-center gap-1.5 rounded-xl border border-amber-700 bg-amber-950/40 px-4 py-2.5 text-[11.5px] font-bold text-amber-300 hover:bg-amber-950"><FileWarning size={14} /> Request correction</button>
                <button onClick={() => { setNoteFor({ id: a.id, action: 'reject' }); setNote(''); }} className="flex items-center gap-1.5 rounded-xl border border-red-800 px-4 py-2.5 text-[11.5px] font-bold text-red-300 hover:bg-red-950"><XCircle size={14} /> Reject</button>
              </div>
            )}
            {noteFor?.id === a.id && (
              <div className="mt-3 rounded-xl border border-amber-800/50 bg-amber-950/10 p-3">
                <p className="mb-2 text-[11px] font-semibold text-ink-300">{noteFor.action === 'approve' ? 'Approval note' : noteFor.action === 'reject' ? 'Reason for rejection' : 'What must they provide?'}</p>
                <textarea autoFocus className="input-dark min-h-[64px] !text-[12px]" placeholder="Document the decision (min 10 characters)" value={note} onChange={e => setNote(e.target.value)} />
                <div className="mt-2 flex flex-wrap gap-2">
                  <button onClick={() => void review()} disabled={saving} className="rounded-xl bg-amber-600 px-3.5 py-2 text-[11px] font-bold text-ink-950 hover:bg-amber-500 disabled:opacity-50">{saving ? 'Saving…' : `Confirm ${noteFor.action === 'needs_correction' ? 'correction request' : noteFor.action}`}</button>
                  <button onClick={() => setNoteFor(null)} disabled={saving} className="rounded-xl border border-ink-700 px-3.5 py-2 text-[11px] font-bold text-ink-300">Cancel</button>
                </div>
              </div>
            )}
          </article>
        ))}
        {list.length === 0 && <p className="col-span-full rounded-2xl border border-dashed border-ink-700 py-14 text-center text-[12.5px] font-semibold text-ink-400">Queue clear — nothing here.</p>}
      </div>

      {/* Partner Account Governance (Suspend / Reinstate) */}
      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.22em] text-brass-400"><ShieldAlert size={13} className="shrink-0" /> Partner account governance</p>
            <h2 className="mt-1 font-display text-xl font-black text-ink-50">Approved partner directory ({partnerAccounts.length})</h2>
            <p className="mt-0.5 text-[11.5px] font-medium text-ink-400">Suspend partners immediately for misrepresentation, safety violations, or off-platform payment solicitation. Every suspension or reinstatement is audit-logged.</p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto overscroll-x-contain rounded-2xl border border-ink-800">
          <table className="w-full min-w-[680px] text-left">
            <thead className="bg-ink-900">
              <tr>
                <th className="th">Partner</th>
                <th className="th">Role / Company</th>
                <th className="th">Account status</th>
                <th className="th">Notes</th>
                <th className="th text-right">Governance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800 bg-ink-900/60">
              {partnerAccounts.map(p => {
                const suspended = p.accountStatus === 'suspended';
                return (
                  <tr key={p.id} className="transition hover:bg-ink-850">
                    <td className="td">
                      <span className="font-bold text-ink-50">{p.name}</span>
                      {p.phone && <span className="block text-[10px] text-ink-500">{p.phone}</span>}
                    </td>
                    <td className="td text-[11.5px]">
                      <span className="font-semibold text-brass-300">{p.partnerRole ?? 'Partner'}</span>
                      <span className="block text-[10.5px] text-ink-400">{p.company ?? '—'}</span>
                    </td>
                    <td className="td">
                      {suspended ? (
                        <span className="chip border border-red-500/50 bg-red-500/15 text-red-300">Suspended</span>
                      ) : (
                        <span className="chip border border-jade-500/40 bg-jade-500/10 text-jade-300">Active</span>
                      )}
                    </td>
                    <td className="td max-w-[260px] text-[10.5px] text-ink-400">
                      {p.suspensionReason ?? 'Good standing'}
                    </td>
                    <td className="td text-right">
                      {suspended ? (
                        <button
                          onClick={() => { setGovTarget({ partner: p, nextStatus: 'active' }); setGovReason(''); }}
                          className="inline-flex items-center gap-1 rounded-lg border border-jade-700 bg-jade-950/40 px-3 py-1.5 text-[10.5px] font-bold text-jade-300 hover:bg-jade-950"
                        >
                          <ShieldCheck size={12} /> Reinstate
                        </button>
                      ) : (
                        <button
                          onClick={() => { setGovTarget({ partner: p, nextStatus: 'suspended' }); setGovReason(''); setCascadeSuspend(true); }}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-800 bg-red-950/40 px-3 py-1.5 text-[10.5px] font-bold text-red-300 hover:bg-red-950"
                        >
                          <Ban size={12} /> Suspend partner
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {partnerAccounts.length === 0 && (
                <tr><td colSpan={5} className="td py-10 text-center text-ink-500">No approved partner accounts yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {govTarget && (
          <div className="mt-4 rounded-2xl border border-brass-500/35 bg-ink-900 p-5">
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brass-300">
              {govTarget.nextStatus === 'suspended'
                ? `Suspend partner: ${govTarget.partner.name}`
                : `Reinstate partner: ${govTarget.partner.name}`}
            </p>
            <label className="mt-3 block">
              <span className="label-dark">Documented governance reason (required, min 10 characters)</span>
              <textarea
                autoFocus
                className="input-dark min-h-[70px] text-[12px]"
                placeholder={govTarget.nextStatus === 'suspended' ? 'Document incident ref, misrepresentation, or compliance breach…' : 'Document verification / remediation completed prior to reinstatement…'}
                value={govReason}
                onChange={e => setGovReason(e.target.value)}
              />
            </label>
            {govTarget.nextStatus === 'suspended' && (
              <label className="mt-2.5 flex items-start gap-2.5 text-[11.5px] font-semibold text-ink-200">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#C9A227]"
                  checked={cascadeSuspend}
                  onChange={e => setCascadeSuspend(e.target.checked)}
                />
                <span>Also suspend any publicly approved listings submitted by this partner</span>
              </label>
            )}
            <div className="mt-3.5 flex flex-wrap gap-2">
              <button disabled={govSaving} onClick={() => void applyPartnerGovernance()} className="btn-brass !px-4 !py-2 text-[11.5px] disabled:opacity-50">
                {govSaving ? 'Saving…' : 'Confirm & audit-log'}
              </button>
              <button disabled={govSaving} onClick={() => setGovTarget(null)} className="btn-ghost-dark !px-3.5 !py-2 text-[11px]">Cancel</button>
            </div>
          </div>
        )}
      </section>

      <p className="mt-6 flex items-start gap-2 text-[10px] font-medium leading-relaxed text-ink-500"><KeyRound size={12} className="mt-0.5 shrink-0" />Approved applicants keep their existing sign-in and receive partner-role access only. Admin access is provisioned separately — never through this screen.</p>
    </div>
  );
}
