import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, Landmark, ScrollText, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useHamlet } from '../../lib/store';
import { useToast } from '../../lib/toast';
import { LedgerStatusPill } from '../../components/Badges';
import type { LedgerEntry, LedgerStatus, LedgerType } from '../../lib/types';
import { formatNaira, formatDateTime } from '../../lib/pricing';

const TYPE_META: Record<LedgerType, { label: string; cls: string }> = {
  guest_charge: { label: 'Guest charge', cls: 'text-sky-300 border-sky-500/30 bg-sky-500/10' },
  guest_service_fee: { label: 'HAMLET guest fee', cls: 'text-brass-300 border-brass-500/30 bg-brass-500/10' },
  accommodation_revenue: { label: 'Owner revenue', cls: 'text-jade-300 border-jade-500/30 bg-jade-500/10' },
  mandatory_charges: { label: 'Mandatory charges', cls: 'text-teal-300 border-teal-500/30 bg-teal-500/10' },
  provider_charge: { label: 'Provider charge', cls: 'text-violet-300 border-violet-500/30 bg-violet-500/10' },
  partner_commission: { label: 'Partner commission', cls: 'text-orange-300 border-orange-500/30 bg-orange-500/10' },
  deposit_hold: { label: 'Deposit hold', cls: 'text-stone-300 border-stone-500/30 bg-stone-500/10' },
  refund: { label: 'Refund', cls: 'text-red-300 border-red-500/30 bg-red-500/10' },
};

export default function AdminLedger() {
  const { state, reconcileLedgerEntry } = useHamlet();
  const { toast } = useToast();
  const [filter, setFilter] = useState<'all' | LedgerType>('all');
  const [selected, setSelected] = useState<LedgerEntry | null>(null);
  const [nextStatus, setNextStatus] = useState<LedgerStatus>('reconciled');
  const [nextVariance, setNextVariance] = useState<number>(0);
  const [reconcileNote, setReconcileNote] = useState('');
  const [saving, setSaving] = useState(false);

  const entries = state.ledger.filter(l => filter === 'all' || l.type === filter);
  const totals = useMemo(() => {
    const sum = (t: LedgerType) => state.ledger.filter(l => l.type === t).reduce((s, l) => s + l.amount, 0);
    return {
      guest_charge: sum('guest_charge'),
      guest_service_fee: sum('guest_service_fee'),
      accommodation_revenue: sum('accommodation_revenue'),
      mandatory_charges: sum('mandatory_charges'),
      provider_charge: sum('provider_charge'),
      partner_commission: sum('partner_commission'),
      deposit_hold: sum('deposit_hold'),
      refund: sum('refund'),
      variance: state.ledger.reduce((s, l) => s + Math.abs(l.variance), 0),
    };
  }, [state.ledger]);

  const cards: { type: LedgerType; value: number }[] = [
    { type: 'guest_charge', value: totals.guest_charge },
    { type: 'guest_service_fee', value: totals.guest_service_fee },
    { type: 'accommodation_revenue', value: totals.accommodation_revenue },
    { type: 'mandatory_charges', value: totals.mandatory_charges },
    { type: 'provider_charge', value: totals.provider_charge },
    { type: 'partner_commission', value: totals.partner_commission },
    { type: 'deposit_hold', value: totals.deposit_hold },
    { type: 'refund', value: totals.refund },
  ];

  const openReconcile = (entry: LedgerEntry) => {
    setSelected(entry);
    setNextStatus(entry.status === 'recorded' ? 'reconciled' : entry.status);
    setNextVariance(entry.variance);
    setReconcileNote(entry.note ?? '');
  };

  const saveReconciliation = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await reconcileLedgerEntry(selected.id, {
        status: nextStatus,
        variance: nextVariance,
        note: reconcileNote.trim() || undefined,
      });
      toast(`Ledger line ${selected.bookingRef} marked ${nextStatus}.`);
      setSelected(null);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not update ledger entry.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-brass-400">Financial records</p>
      <h1 className="mt-1.5 font-display text-2xl font-black text-ink-50 sm:text-3xl">Transaction ledger & settlement</h1>
      <p className="mt-1 max-w-2xl text-[12px] font-medium text-ink-300">Controlled pilot ledger — every line carries booking reference, amount, status, provider reference, fee calc, refunds, variance and the responsible operator. Manual reconciliation; HAMLET holds no customer funds; no internal wallet.</p>

      {/* Undecided policy banner */}
      <div className="mt-4 flex flex-wrap items-start gap-3 rounded-2xl border border-violet-500/30 bg-violet-500/5 px-4 py-3.5 text-[11px] font-semibold leading-relaxed text-violet-200">
        <Info size={16} className="mt-0.5 shrink-0" />
        <span><strong>Provider processing-fee policy: undecided.</strong> Provider charges are recorded in the ledger for reconciliation but are <strong>never</strong> passed to guests, never hard-coded, and never deducted from owner proceeds without the written policy. Written sign-off required before enabling any pass-through — this is a launch dependency.</span>
      </div>

      {/* Concept cards */}
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
        {cards.map(c => (
          <button key={c.type} onClick={() => setFilter(filter === c.type ? 'all' : c.type)} className={`rounded-2xl border p-3 text-left transition ${filter === c.type ? 'border-brass-500 bg-brass-500/15' : 'border-ink-800 bg-ink-900 hover:border-ink-700'}`}>
            <span className={`chip border !px-2 !py-0.5 text-[8.5px] uppercase ${TYPE_META[c.type].cls}`}>{TYPE_META[c.type].label}</span>
            <p className="mt-1.5 font-display text-[15px] font-black tabular-nums text-ink-50">{formatNaira(c.value)}</p>
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] font-bold text-ink-200">{entries.length} line{entries.length === 1 ? '' : 's'}{filter !== 'all' && <> · filtered: <span className="text-brass-300">{TYPE_META[filter].label}</span></>}</p>
        <div className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[11.5px] font-black ${totals.variance === 0 ? 'border-jade-500/40 bg-jade-500/10 text-jade-300' : 'border-red-400/50 bg-red-400/10 text-red-300'}`}>
          {totals.variance === 0 ? <Landmark size={14} /> : <AlertTriangle size={14} />}
          {totals.variance === 0 ? 'Ledger reconciled — zero variance' : `Open variance: ${formatNaira(totals.variance)} (under review)`}
        </div>
      </div>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-ink-800">
        <table className="w-full min-w-[940px] text-left">
          <thead className="bg-ink-900"><tr><th className="th">Recorded</th><th className="th">Booking</th><th className="th">Type / concept</th><th className="th">Description & note</th><th className="th">Provider ref</th><th className="th text-right">Amount</th><th className="th text-right">Variance</th><th className="th">Status</th><th className="th">Operator</th><th className="th" /></tr></thead>
          <tbody className="divide-y divide-ink-800 bg-ink-900/60">
            {entries.map(l => (
              <tr key={l.id} className={`transition hover:bg-ink-850 ${l.variance !== 0 ? 'bg-red-950/20' : ''}`}>
                <td className="td whitespace-nowrap text-[10.5px] font-semibold text-ink-300">{formatDateTime(l.at)}</td>
                <td className="td font-mono text-[10.5px] font-bold text-brass-300">{l.bookingRef}</td>
                <td className="td"><span className={`chip border !px-2 !py-0.5 text-[9px] uppercase ${TYPE_META[l.type].cls}`}>{TYPE_META[l.type].label}</span></td>
                <td className="td max-w-[280px] text-[11px] leading-snug">{l.description}{l.note && <span className="block text-[9.5px] leading-snug text-ink-500">{l.note}</span>}</td>
                <td className="td max-w-[120px] truncate font-mono text-[9.5px] text-ink-400">{l.providerRef ?? '—'}</td>
                <td className="td text-right tabular-nums font-bold text-ink-50">{formatNaira(l.amount)}</td>
                <td className={`td text-right tabular-nums font-bold ${l.variance !== 0 ? 'text-red-400' : 'text-jade-400'}`}>{l.variance === 0 ? '—' : formatNaira(l.variance)}</td>
                <td className="td"><LedgerStatusPill status={l.status} /></td>
                <td className="td whitespace-nowrap text-[10.5px] font-semibold text-ink-300">{l.operator}</td>
                <td className="td text-right">
                  <button onClick={() => openReconcile(l)} className="rounded-lg border border-ink-700 px-2.5 py-1 text-[10px] font-bold text-ink-200 hover:border-brass-500/50 hover:text-brass-300">
                    Reconcile
                  </button>
                </td>
              </tr>
            ))}
            {entries.length === 0 && <tr><td colSpan={10} className="td py-12 text-center text-ink-500">No lines of this type yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <p className="mt-4 flex items-start gap-2 text-[10px] font-medium leading-relaxed text-ink-500"><ScrollText size={12} className="mt-0.5 shrink-0" /> Pilot operating procedure: weekly manual reconciliation against provider statements by two operators; owner settlements via bank transfer with dual sign-off; fee variances escalated to operations leadership within 24h; deposits held separately and released post-inspection. Automated splitting, payouts and pass-through are deferred releases.</p>

      <AnimatePresence>
        {selected && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => { if (!saving) setSelected(null); }} />
            <motion.div initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }} className="relative w-full max-w-md rounded-2xl border border-ink-800 bg-ink-900 p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10.5px] font-bold text-brass-300">{selected.bookingRef} · {TYPE_META[selected.type].label}</p>
                  <h2 className="mt-1 font-display text-lg font-black text-ink-50">Reconcile ledger line</h2>
                </div>
                <button onClick={() => setSelected(null)} disabled={saving} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-800 hover:text-white"><X size={18} /></button>
              </div>
              <p className="mt-2 text-[11.5px] font-medium text-ink-300">{selected.description} · <strong className="text-ink-50">{formatNaira(selected.amount)}</strong></p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="label-dark">Status</span>
                  <select className="input-dark" value={nextStatus} onChange={e => setNextStatus(e.target.value as LedgerStatus)}>
                    {(['recorded', 'reconciled', 'settled', 'pending', 'flagged'] as const).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="label-dark">Variance (₦, 0 = clean)</span>
                  <input type="number" className="input-dark" value={nextVariance} onChange={e => setNextVariance(Number(e.target.value))} />
                </label>
              </div>
              <label className="mt-3 block">
                <span className="label-dark">Operator reconciliation note {(nextStatus === 'flagged' || nextVariance !== 0) ? '(required, min 8 chars)' : '(optional)'}</span>
                <textarea className="input-dark min-h-[76px]" placeholder="Statement batch ref, bank transfer reference, or variance explanation…" value={reconcileNote} onChange={e => setReconcileNote(e.target.value)} />
              </label>

              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setSelected(null)} disabled={saving} className="btn-ghost-dark !py-2.5 text-[12px]">Cancel</button>
                <button onClick={() => void saveReconciliation()} disabled={saving} className="btn-brass !py-2.5 text-[12px] disabled:opacity-50">
                  <CheckCircle2 size={14} /> {saving ? 'Saving…' : 'Save & audit-log'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
