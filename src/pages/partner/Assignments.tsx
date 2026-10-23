import { useState } from 'react';
import { KeyRound, Ban, ShieldCheck, Percent } from 'lucide-react';
import { useHamlet } from '../../lib/store';
import { useToast } from '../../lib/toast';
import { formatDate } from '../../lib/pricing';

export default function PartnerAssignments() {
  const { state, revokeAssignment } = useHamlet();
  const { toast } = useToast();
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const myId = state.session!.userId;
  const mine = state.assignments.filter(a => a.partnerId === myId);

  const handleRevoke = async (id: string) => {
    setRevokingId(id);
    try {
      await revokeAssignment(id, 'Partner voluntarily relinquished property access.');
      toast('Access revoked immediately.', 'info');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not revoke assignment.', 'error');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-brass-400">Authority & commissions</p>
      <h1 className="mt-1.5 font-display text-2xl font-black text-ink-50 sm:text-3xl">Property assignments</h1>
      <p className="mt-1 max-w-2xl text-[12px] font-medium leading-relaxed text-ink-300">Explicit authorisation records for every property you may act on. Commissions are recorded <strong>only where specifically agreed in writing</strong> — never assumed, never auto-split, never auto-paid. Revocation removes your access immediately.</p>

      <div className="mt-6 grid gap-4">
        {mine.length === 0 && <p className="rounded-2xl border border-dashed border-ink-700 px-6 py-14 text-center text-[12.5px] font-semibold text-ink-400">No assignments yet. Assignments are granted by HAMLET operations after your application and the property review are approved.</p>}
        {mine.map(a => (
          <article key={a.id} className={`rounded-2xl border p-5 ${a.status === 'active' ? 'border-ink-800 bg-ink-900' : 'border-red-900/50 bg-red-950/20 opacity-70'}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`chip border ${a.status === 'active' ? 'border-jade-500/40 bg-jade-500/10 text-jade-300' : 'border-red-500/40 bg-red-500/10 text-red-300'}`}>{a.status === 'active' ? <ShieldCheck size={11} /> : <Ban size={11} />}{a.status}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-ink-500">{a.partnerRole}</span>
                </div>
                <h2 className="mt-1.5 font-display text-lg font-bold text-ink-50">{a.propertyTitle}</h2>
                <p className="mt-1 max-w-lg text-[11.5px] font-medium leading-snug text-ink-300"><span className="text-ink-400">Scope:</span> {a.scope}</p>
                <p className="mt-1 text-[10.5px] font-semibold text-ink-500">Granted {formatDate(a.grantedAt)}{a.revokedAt ? ` · Revoked ${formatDate(a.revokedAt)}` : ''}</p>
              </div>
              <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                <div className="sm:text-right">
                  <p className="flex items-center gap-1 font-display text-xl font-black text-brass-300 sm:justify-end"><Percent size={15} className="shrink-0" />{a.commissionRate === null ? 'None' : `${(a.commissionRate * 100).toFixed(1)}%`}</p>
                  <p className="max-w-[220px] text-[9.5px] font-semibold leading-snug text-ink-400">{a.commissionNote}</p>
                </div>
                {a.status === 'active' && (
                  <button disabled={revokingId === a.id} onClick={() => void handleRevoke(a.id)} className="btn-ghost-dark !border !border-red-900/60 !px-3.5 !py-2 text-[11px] text-red-300 hover:bg-red-950 hover:text-red-200 disabled:opacity-50"><Ban size={13} /> {revokingId === a.id ? 'Revoking…' : 'Revoke my access'}</button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-ink-800 bg-ink-900 px-5 py-4 text-[11px] font-medium leading-relaxed text-ink-400">
        <KeyRound size={15} className="mt-0.5 shrink-0 text-brass-400" />
        <span>Partner commissions are recorded here and in the ledger only when specifically agreed. Automated commission splitting and payouts are a deferred feature — settlements during the pilot are manual, reconciled against provider records, and authorised by HAMLET operations. To dispute an assignment or commission record, contact operations@hamlet.ng.</span>
      </div>
    </div>
  );
}
