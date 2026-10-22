import { useState } from 'react';
import { Plus, Ban, ShieldCheck, Percent, X } from 'lucide-react';
import { useHamlet } from '../../lib/store';
import { useToast } from '../../lib/toast';
import { formatDate } from '../../lib/pricing';

export default function AdminAssignments() {
  const { state, grantAssignment, revokeAssignment } = useHamlet();
  const { toast } = useToast();
  const [showGrant, setShowGrant] = useState(false);
  const partners = state.accounts.filter(a => a.role === 'partner');
  const approvedProps = state.properties.filter(p => p.status === 'approved');

  const [propertyId, setPropertyId] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [scope, setScope] = useState('Full management — pricing, availability, guest comms');
  const [commission, setCommission] = useState('none');
  const [commissionNote, setCommissionNote] = useState('');

  const grant = () => {
    const p = approvedProps.find(x => x.id === propertyId);
    const partner = partners.find(x => x.id === partnerId);
    if (!p || !partner) { toast('Select both a property and a partner.', 'error'); return; }
    const rate = commission === 'none' ? null : Number(commission) / 100;
    if (rate !== null && commissionNote.trim().length < 8) { toast('A commission requires a written-note reference (min 8 chars).', 'error'); return; }
    grantAssignment({
      propertyId: p.id, propertyTitle: p.title, partnerId: partner.id, partnerName: partner.name,
      partnerRole: partner.partnerRole ?? 'Partner', scope: scope.trim(),
      commissionRate: rate,
      commissionNote: rate === null ? 'No commission agreed' : commissionNote.trim(),
    });
    toast(`${partner.name} assigned to ${p.title}.`);
    setShowGrant(false); setPropertyId(''); setPartnerId(''); setCommission('none'); setCommissionNote('');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-brass-400">Explicit authorisation</p>
          <h1 className="mt-1.5 font-display text-2xl font-black text-ink-50 sm:text-3xl">Property assignments & commissions</h1>
          <p className="mt-1 max-w-2xl text-[12px] font-medium text-ink-300">Who may act on which property — scoped, dated, revocable. Commissions exist only where specifically agreed and are recorded here and in the ledger; never automated, never assumed.</p>
        </div>
        <button onClick={() => setShowGrant(v => !v)} className="btn-brass !py-3 text-[12px]">{showGrant ? <X size={15} /> : <Plus size={15} />}{showGrant ? 'Close' : 'Grant assignment'}</button>
      </div>

      {showGrant && (
        <div className="mt-5 rounded-2xl border border-brass-500/30 bg-ink-900 p-5">
          <h2 className="font-display text-base font-black text-ink-50">Grant scoped access</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label><span className="label-dark">Property (approved only)</span>
              <select className="input-dark" value={propertyId} onChange={e => setPropertyId(e.target.value)}>
                <option value="">Select property…</option>
                {approvedProps.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </label>
            <label><span className="label-dark">Partner</span>
              <select className="input-dark" value={partnerId} onChange={e => setPartnerId(e.target.value)}>
                <option value="">Select partner…</option>
                {partners.map(p => <option key={p.id} value={p.id}>{p.name} — {p.partnerRole}</option>)}
              </select>
            </label>
            <label className="sm:col-span-2"><span className="label-dark">Scope of authority</span><input className="input-dark" value={scope} onChange={e => setScope(e.target.value)} /></label>
            <label><span className="label-dark">Commission (only if agreed)</span>
              <select className="input-dark" value={commission} onChange={e => setCommission(e.target.value)}>
                <option value="none">None agreed</option>
                <option value="5">5% of accommodation revenue</option>
                <option value="10">10% of accommodation revenue</option>
                <option value="12">12% of accommodation revenue</option>
                <option value="15">15% of accommodation revenue</option>
              </select>
            </label>
            {commission !== 'none' && <label><span className="label-dark">Written agreement reference</span><input className="input-dark" placeholder="e.g. mandate #CM-2026-021" value={commissionNote} onChange={e => setCommissionNote(e.target.value)} /></label>}
          </div>
          <button onClick={grant} className="btn-brass mt-4 !py-2.5 text-[12px]"><ShieldCheck size={14} /> Grant — audit-logged</button>
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-ink-800">
        <table className="w-full min-w-[820px] text-left">
          <thead className="bg-ink-900"><tr><th className="th">Property</th><th className="th">Partner</th><th className="th">Scope</th><th className="th">Commission</th><th className="th">Granted</th><th className="th">Status</th><th className="th" /></tr></thead>
          <tbody className="divide-y divide-ink-800 bg-ink-900/60">
            {state.assignments.map(a => (
              <tr key={a.id} className={`transition hover:bg-ink-850 ${a.status === 'revoked' ? 'opacity-55' : ''}`}>
                <td className="td max-w-[200px]"><span className="line-clamp-1 text-[12px] font-bold text-ink-50">{a.propertyTitle}</span></td>
                <td className="td"><span className="text-[12px] font-semibold text-ink-100">{a.partnerName}</span><span className="block text-[9.5px] font-semibold text-ink-500">{a.partnerRole}</span></td>
                <td className="td max-w-[240px] text-[10.5px] leading-snug text-ink-300">{a.scope}</td>
                <td className="td">{a.commissionRate === null ? <span className="text-[10.5px] font-bold text-ink-400">None agreed</span> : <span className="flex items-center gap-1 text-[12px] font-black text-brass-300"><Percent size={12} />{(a.commissionRate * 100).toFixed(1)}%<span className="block max-w-[130px] text-[8.5px] font-semibold normal-case leading-tight text-ink-500">{a.commissionNote}</span></span>}</td>
                <td className="td whitespace-nowrap text-[10.5px] font-semibold text-ink-300">{formatDate(a.grantedAt)}{a.revokedAt && <span className="block text-red-400">revoked {formatDate(a.revokedAt)}</span>}</td>
                <td className="td"><span className={`chip border ${a.status === 'active' ? 'border-jade-500/40 bg-jade-500/10 text-jade-300' : 'border-red-500/40 bg-red-500/10 text-red-300'}`}>{a.status}</span></td>
                <td className="td">{a.status === 'active' && <button onClick={() => { revokeAssignment(a.id); toast('Assignment revoked — access removed immediately.', 'info'); }} className="flex items-center gap-1 rounded-lg border border-red-800 px-2.5 py-1.5 text-[10px] font-bold text-red-300 hover:bg-red-950"><Ban size={12} /> Revoke</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
