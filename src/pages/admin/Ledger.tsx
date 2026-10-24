import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, Info, Landmark, PlusCircle, ScrollText, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useHamlet } from '../../lib/store';
import { useToast } from '../../lib/toast';
import { LedgerStatusPill } from '../../components/Badges';
import type { LedgerEntry, LedgerStatus, LedgerType, PayoutStatus } from '../../lib/types';
import { formatNaira, formatDateTime, lagosIsoDateOffset, reconcilePaymentReserveVsActualFee } from '../../lib/pricing';
import { downloadCsvFile } from '../../lib/csv';

const TYPE_META: Record<LedgerType, { label: string; cls: string }> = {
  guest_charge: { label: 'Guest charge', cls: 'text-sky-300 border-sky-500/30 bg-sky-500/10' },
  guest_service_fee: { label: '20% domestic markup', cls: 'text-brass-300 border-brass-500/30 bg-brass-500/10' },
  accommodation_revenue: { label: 'Owner revenue (B)', cls: 'text-jade-300 border-jade-500/30 bg-jade-500/10' },
  mandatory_charges: { label: 'Mandatory charges', cls: 'text-teal-300 border-teal-500/30 bg-teal-500/10' },
  provider_charge: { label: 'Actual Paystack fee', cls: 'text-violet-300 border-violet-500/30 bg-violet-500/10' },
  partner_commission: { label: 'Partner commission', cls: 'text-orange-300 border-orange-500/30 bg-orange-500/10' },
  closing_agent_commission: { label: 'Closing agent (10%)', cls: 'text-amber-300 border-amber-500/30 bg-amber-500/10' },
  referral_reward: { label: 'Referral reward (2.5%)', cls: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' },
  hamlet_allocation: { label: 'HAMLET allocation', cls: 'text-brass-200 border-brass-400/30 bg-brass-400/10' },
  payment_reserve: { label: 'Payment reserve (2.5%)', cls: 'text-indigo-300 border-indigo-500/30 bg-indigo-500/10' },
  international_buffer: { label: '10% FX buffer', cls: 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10' },
  deposit_hold: { label: 'Caution deposit hold', cls: 'text-stone-300 border-stone-500/30 bg-stone-500/10' },
  caution_deduction: { label: 'Caution deduction', cls: 'text-orange-200 border-orange-400/30 bg-orange-400/10' },
  caution_refund: { label: 'Caution refund', cls: 'text-teal-200 border-teal-400/30 bg-teal-400/10' },
  commission_reversal: { label: 'Commission reversal', cls: 'text-red-300 border-red-500/30 bg-red-500/10' },
  referral_reversal: { label: 'Referral reversal', cls: 'text-red-300 border-red-500/30 bg-red-500/10' },
  refund: { label: 'Booking refund', cls: 'text-red-300 border-red-500/30 bg-red-500/10' },
};

const SUMMARY_TYPES: LedgerType[] = [
  'guest_charge',
  'guest_service_fee',
  'accommodation_revenue',
  'closing_agent_commission',
  'referral_reward',
  'hamlet_allocation',
  'payment_reserve',
  'provider_charge',
];

export default function AdminLedger() {
  const { state, reconcileLedgerEntry, recordLedgerAdjustment, updatePayoutStatus } = useHamlet();
  const { toast } = useToast();
  const [filter, setFilter] = useState<'all' | LedgerType>('all');
  const [selected, setSelected] = useState<LedgerEntry | null>(null);
  const [nextStatus, setNextStatus] = useState<LedgerStatus>('reconciled');
  const [nextPayoutStatus, setNextPayoutStatus] = useState<PayoutStatus>('not_applicable');
  const [nextVariance, setNextVariance] = useState<number>(0);
  const [reconcileNote, setReconcileNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Manual ledger adjustment modal state
  const [showAdd, setShowAdd] = useState(false);
  const [adjBookingId, setAdjBookingId] = useState('');
  const [adjType, setAdjType] = useState<LedgerType>('accommodation_revenue');
  const [adjAmount, setAdjAmount] = useState<number>(0);
  const [adjStatus, setAdjStatus] = useState<LedgerStatus>('settled');
  const [adjDesc, setAdjDesc] = useState('');
  const [adjRef, setAdjRef] = useState('');
  const [adjVariance, setAdjVariance] = useState<number>(0);
  const [adjNote, setAdjNote] = useState('');
  const [adjSaving, setAdjSaving] = useState(false);

  const entries = state.ledger.filter(l => filter === 'all' || l.type === filter);
  const totals = useMemo(() => {
    const sum = (t: LedgerType) => state.ledger.filter(l => l.type === t).reduce((s, l) => s + l.amount, 0);
    const paymentReserve = sum('payment_reserve');
    const providerCharge = sum('provider_charge');
    return {
      byType: Object.fromEntries((Object.keys(TYPE_META) as LedgerType[]).map(t => [t, sum(t)])) as Record<LedgerType, number>,
      reserveReconciliation: reconcilePaymentReserveVsActualFee(paymentReserve, providerCharge),
      variance: state.ledger.reduce((s, l) => s + Math.abs(l.variance), 0),
    };
  }, [state.ledger]);

  const openReconcile = (entry: LedgerEntry) => {
    setSelected(entry);
    setNextStatus(entry.status === 'recorded' ? 'reconciled' : entry.status);
    setNextPayoutStatus(entry.payoutStatus ?? 'not_applicable');
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
      if (nextPayoutStatus !== (selected.payoutStatus ?? 'not_applicable') && nextPayoutStatus !== 'not_applicable') {
        await updatePayoutStatus(selected.id, nextPayoutStatus, reconcileNote.trim() || undefined);
      }
      toast(`Ledger line ${selected.bookingRef} updated.`);
      setSelected(null);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not update ledger entry.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveAdjustment = async () => {
    if (!adjBookingId) { toast('Select a booking reference.', 'error'); return; }
    setAdjSaving(true);
    try {
      await recordLedgerAdjustment({
        bookingId: adjBookingId,
        type: adjType,
        amount: adjAmount,
        status: adjStatus,
        description: adjDesc,
        providerRef: adjRef || undefined,
        variance: adjVariance,
        note: adjNote || undefined,
      });
      toast('Manual ledger entry recorded and audit-logged.');
      setShowAdd(false);
      setAdjDesc('');
      setAdjRef('');
      setAdjNote('');
      setAdjAmount(0);
      setAdjVariance(0);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not record manual ledger entry.', 'error');
    } finally {
      setAdjSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-brass-400">Financial records & allocation reconciliation</p>
          <h1 className="mt-1.5 font-display text-2xl font-black text-ink-50 sm:text-3xl">Transaction ledger & settlement</h1>
          <p className="mt-1 max-w-2xl text-[12px] font-medium text-ink-300">
            Idempotent booking settlement ledger — records owner listed revenue (B), 20% domestic markup allocations (10% closing agent, 2.5% recurring referrer, 5%/7.5% HAMLET allocation, 2.5% internal payment reserve), actual Paystack fees, 10% FX buffers, and separate refundable caution deposit movements.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              downloadCsvFile(
                `hamlet-ledger-${lagosIsoDateOffset(0)}.csv`,
                ['Booking Ref', 'Type', 'Amount (NGN)', 'Status', 'Payout Status', 'Variance (NGN)', 'Provider Ref', 'Description', 'Operator', 'Recorded At', 'Note'],
                entries.map(e => [
                  e.bookingRef,
                  e.type,
                  e.amount,
                  e.status,
                  e.payoutStatus ?? 'not_applicable',
                  e.variance,
                  e.providerRef ?? '',
                  e.description,
                  e.operator,
                  e.at,
                  e.note ?? '',
                ]),
              );
              toast(`Exported ${entries.length} ledger row(s) to CSV.`);
            }}
            disabled={entries.length === 0}
            className="btn-ghost-dark !border !border-ink-700 !py-2.5 text-[12px] disabled:opacity-40"
          >
            <Download size={14} /> Export CSV ({entries.length})
          </button>
          <button onClick={() => { setShowAdd(true); if (!adjBookingId && state.bookings[0]) setAdjBookingId(state.bookings[0].id); }} className="btn-brass !py-2.5 text-[12px]">
            <PlusCircle size={15} /> Record manual entry
          </button>
        </div>
      </div>

      {/* Payment Reserve vs Actual Paystack Fee Reconciliation (§5.4) */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 px-4 py-3.5 text-[11.5px] font-semibold leading-relaxed text-indigo-200">
        <div className="flex items-start gap-2.5">
          <Info size={16} className="mt-0.5 shrink-0 text-indigo-300" />
          <span>
            <strong>2.5% Internal Payment Reserve vs Actual Paystack Fees:</strong> Budgeted reserve = <strong>{formatNaira(totals.reserveReconciliation.paymentReserveNgn)}</strong> · Actual gateway charges = <strong>{formatNaira(totals.reserveReconciliation.actualPaystackFeeNgn)}</strong> · Net reserve delta = <strong>{formatNaira(totals.reserveReconciliation.reserveVarianceNgn)}</strong> ({totals.reserveReconciliation.status.replace('_', ' ')}). The 2.5% reserve is strictly an internal budget allocation — never represented as the actual Paystack charge.
          </span>
        </div>
      </div>

      {/* Concept cards */}
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
        {SUMMARY_TYPES.map(t => (
          <button key={t} onClick={() => setFilter(filter === t ? 'all' : t)} className={`rounded-2xl border p-3 text-left transition ${filter === t ? 'border-brass-500 bg-brass-500/15' : 'border-ink-800 bg-ink-900 hover:border-ink-700'}`}>
            <span className={`chip border !px-2 !py-0.5 text-[9.5px] uppercase ${TYPE_META[t].cls}`}>{TYPE_META[t].label}</span>
            <p className="mt-1.5 break-words font-display text-[15px] font-black tabular-nums text-ink-50">{formatNaira(totals.byType[t])}</p>
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[12px] font-bold text-ink-200">{entries.length} line{entries.length === 1 ? '' : 's'}</p>
          <select
            aria-label="Filter by ledger type"
            className="input-dark !w-auto !py-1.5 text-[11.5px]"
            value={filter}
            onChange={e => setFilter(e.target.value as 'all' | LedgerType)}
          >
            <option value="all">All ledger concepts</option>
            {(Object.keys(TYPE_META) as LedgerType[]).map(t => (
              <option key={t} value={t}>{TYPE_META[t].label}</option>
            ))}
          </select>
        </div>
        <div className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[11.5px] font-black [&>svg]:shrink-0 ${totals.variance === 0 ? 'border-jade-500/40 bg-jade-500/10 text-jade-300' : 'border-red-400/50 bg-red-400/10 text-red-300'}`}>
          {totals.variance === 0 ? <Landmark size={14} /> : <AlertTriangle size={14} />}
          {totals.variance === 0 ? 'Ledger reconciled — zero variance' : `Open variance: ${formatNaira(totals.variance)} (under review)`}
        </div>
      </div>

      <div className="mt-3 overflow-x-auto overscroll-x-contain rounded-2xl border border-ink-800">
        <table className="w-full min-w-[980px] text-left">
          <thead className="bg-ink-900"><tr><th className="th">Recorded</th><th className="th">Booking</th><th className="th">Type / concept</th><th className="th">Description & note</th><th className="th">Provider ref</th><th className="th text-right">Amount</th><th className="th text-right">Variance</th><th className="th">Status</th><th className="th">Payout</th><th className="th" /></tr></thead>
          <tbody className="divide-y divide-ink-800 bg-ink-900/60">
            {entries.map(l => (
              <tr key={l.id} className={`transition hover:bg-ink-850 ${l.variance !== 0 ? 'bg-red-950/20' : ''}`}>
                <td className="td whitespace-nowrap text-[10.5px] font-semibold text-ink-300">{formatDateTime(l.at)}</td>
                <td className="td font-mono text-[10.5px] font-bold text-brass-300">{l.bookingRef}</td>
                <td className="td"><span className={`chip border !px-2 !py-0.5 text-[9.5px] uppercase ${TYPE_META[l.type]?.cls ?? ''}`}>{TYPE_META[l.type]?.label ?? l.type}</span></td>
                <td className="td max-w-[260px] text-[11px] leading-snug text-ink-200">{l.description}{l.note && <span className="block text-[10px] leading-snug text-ink-400">{l.note}</span>}</td>
                <td className="td max-w-[120px] truncate font-mono text-[10px] text-ink-400">{l.providerRef ?? '—'}</td>
                <td className="td text-right tabular-nums font-bold text-ink-50">{formatNaira(l.amount)}</td>
                <td className={`td text-right tabular-nums font-bold ${l.variance !== 0 ? 'text-red-400' : 'text-jade-400'}`}>{l.variance === 0 ? '—' : formatNaira(l.variance)}</td>
                <td className="td"><LedgerStatusPill status={l.status} /></td>
                <td className="td">
                  <span className="rounded-full border border-ink-700 bg-ink-800 px-2 py-0.5 text-[9.5px] font-bold uppercase text-ink-300">
                    {(l.payoutStatus ?? 'n/a').replace(/_/g, ' ')}
                  </span>
                </td>
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

      <p className="mt-4 flex items-start gap-2 text-[10px] font-medium leading-relaxed text-ink-500"><ScrollText size={12} className="mt-0.5 shrink-0" /> Settlement governance: owner revenue, closing agent 10% commissions, and recurring 2.5% partner referral rewards progress auditable payout states (pending → approved → paid / reversed). Caution deposits are reconciled separately post-inspection.</p>

      <AnimatePresence>
        {selected && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => { if (!saving) setSelected(null); }} />
            <motion.div initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }} className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-y-contain rounded-2xl border border-ink-800 bg-ink-900 p-4 shadow-2xl sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[10.5px] font-bold text-brass-300">{selected.bookingRef} · {TYPE_META[selected.type]?.label ?? selected.type}</p>
                  <h2 className="mt-1 font-display text-lg font-black text-ink-50">Reconcile ledger & payout</h2>
                </div>
                <button onClick={() => setSelected(null)} disabled={saving} className="shrink-0 rounded-lg p-1.5 text-ink-400 hover:bg-ink-800 hover:text-white" aria-label="Close"><X size={18} /></button>
              </div>
              <p className="mt-2 break-words text-[11.5px] font-medium text-ink-300">{selected.description} · <strong className="tabular-nums text-ink-50">{formatNaira(selected.amount)}</strong></p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="label-dark">Ledger status</span>
                  <select className="input-dark" value={nextStatus} onChange={e => setNextStatus(e.target.value as LedgerStatus)}>
                    {(['recorded', 'reconciled', 'settled', 'pending', 'flagged'] as const).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="label-dark">Payout status</span>
                  <select className="input-dark" value={nextPayoutStatus} onChange={e => setNextPayoutStatus(e.target.value as PayoutStatus)}>
                    {(['not_applicable', 'pending', 'approved', 'paid', 'withheld', 'reversed'] as const).map(s => (
                      <option key={s} value={s}>{s.replace('_', ' ')}</option>
                    ))}
                  </select>
                </label>
                <label className="sm:col-span-2">
                  <span className="label-dark">Variance (₦, 0 = clean)</span>
                  <input type="number" className="input-dark" value={nextVariance} onChange={e => setNextVariance(Number(e.target.value))} />
                </label>
              </div>
              <label className="mt-3 block">
                <span className="label-dark">Operator reconciliation note {(nextStatus === 'flagged' || nextVariance !== 0) ? '(required, min 8 chars)' : '(optional)'}</span>
                <textarea className="input-dark min-h-[76px]" placeholder="Statement batch ref, bank transfer reference, or variance explanation…" value={reconcileNote} onChange={e => setReconcileNote(e.target.value)} />
              </label>

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button onClick={() => setSelected(null)} disabled={saving} className="btn-ghost-dark !py-2.5 text-[12px]">Cancel</button>
                <button onClick={() => void saveReconciliation()} disabled={saving} className="btn-brass !py-2.5 text-[12px] disabled:opacity-50">
                  <CheckCircle2 size={14} /> {saving ? 'Saving…' : 'Save & audit-log'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAdd && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => { if (!adjSaving) setShowAdd(false); }} />
            <motion.div initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }} className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto overscroll-y-contain rounded-2xl border border-ink-800 bg-ink-900 p-4 shadow-2xl sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-brass-400">Manual settlement / adjustment</p>
                  <h2 className="mt-1 font-display text-lg font-black text-ink-50">Record ledger entry</h2>
                </div>
                <button onClick={() => setShowAdd(false)} disabled={adjSaving} className="shrink-0 rounded-lg p-1.5 text-ink-400 hover:bg-ink-800 hover:text-white" aria-label="Close"><X size={18} /></button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="label-dark">Booking</span>
                  <select className="input-dark" value={adjBookingId} onChange={e => setAdjBookingId(e.target.value)}>
                    <option value="">— select booking —</option>
                    {state.bookings.map(b => (
                      <option key={b.id} value={b.id}>{b.ref} · {b.propertyTitle} ({b.status})</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="label-dark">Concept / type</span>
                  <select className="input-dark" value={adjType} onChange={e => setAdjType(e.target.value as LedgerType)}>
                    {(Object.keys(TYPE_META) as LedgerType[]).map(t => (
                      <option key={t} value={t}>{TYPE_META[t].label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="label-dark">Status</span>
                  <select className="input-dark" value={adjStatus} onChange={e => setAdjStatus(e.target.value as LedgerStatus)}>
                    {(['recorded', 'reconciled', 'settled', 'pending', 'flagged'] as const).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="label-dark">Amount (₦)</span>
                  <input type="number" min={0} className="input-dark" value={adjAmount} onChange={e => setAdjAmount(Number(e.target.value))} />
                </label>
                <label>
                  <span className="label-dark">Variance (₦, 0 = clean)</span>
                  <input type="number" className="input-dark" value={adjVariance} onChange={e => setAdjVariance(Number(e.target.value))} />
                </label>
                <label className="sm:col-span-2">
                  <span className="label-dark">Description (min 8 characters)</span>
                  <input className="input-dark" placeholder="e.g. Actual Paystack webhook settlement fee / owner NIP payout" value={adjDesc} onChange={e => setAdjDesc(e.target.value)} />
                </label>
                <label>
                  <span className="label-dark">Provider / bank ref (optional)</span>
                  <input className="input-dark" placeholder="e.g. NIP_SETTLE_0092" value={adjRef} onChange={e => setAdjRef(e.target.value)} />
                </label>
                <label>
                  <span className="label-dark">Operator note (optional)</span>
                  <input className="input-dark" placeholder="Batch or dual sign-off ref" value={adjNote} onChange={e => setAdjNote(e.target.value)} />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button onClick={() => setShowAdd(false)} disabled={adjSaving} className="btn-ghost-dark !py-2.5 text-[12px]">Cancel</button>
                <button onClick={() => void saveAdjustment()} disabled={adjSaving} className="btn-brass !py-2.5 text-[12px] disabled:opacity-50">
                  <CheckCircle2 size={14} /> {adjSaving ? 'Recording…' : 'Record & audit-log'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
