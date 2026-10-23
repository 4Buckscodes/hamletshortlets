import { useMemo } from 'react';
import { Banknote, Info, Receipt, TrendingUp } from 'lucide-react';
import { useHamlet } from '../../lib/store';
import { propertyIdsOf } from '../../lib/partnerUtils';
import { formatNaira, formatDate, ownerProceeds } from '../../lib/pricing';
import { BookingStatusPill } from '../../components/Badges';

export default function PartnerEarnings() {
  const { state } = useHamlet();
  const userId = state.session!.userId;
  const propIds = useMemo(() => new Set(propertyIdsOf(state, userId)), [state, userId]);
  const myBookings = state.bookings.filter(b => propIds.has(b.propertyId));

  const settleable = myBookings.filter(b => ['completed', 'confirmed', 'disputed'].includes(b.status));
  const totalProceeds = settleable.reduce((s, b) => s + ownerProceeds({ accommodationSubtotal: b.accommodationSubtotal, mandatoryChargesTotal: b.mandatoryTotal }), 0);
  const totalNights = settleable.reduce((s, b) => s + b.nights, 0);
  const totalGuestFeeExcluded = settleable.reduce((s, b) => s + b.hamletGuestFee, 0);

  // Ledger lines tied to my bookings (read-only visibility)
  const myRefs = new Set(myBookings.map(b => b.ref));
  const myLedger = state.ledger.filter(l => myRefs.has(l.bookingRef));

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-brass-400">Owner earnings</p>
      <h1 className="mt-1.5 font-display text-2xl font-black text-ink-50 sm:text-3xl">Earnings & settlement</h1>

      <div className="mt-3 flex items-start gap-3 rounded-2xl border border-brass-500/30 bg-brass-500/5 px-4 py-3.5 text-[12px] font-semibold leading-relaxed text-brass-200">
        <Info size={16} className="mt-0.5 shrink-0" />
        <span><strong>HAMLET owner service fee is 0%.</strong> Guests pay HAMLET's 3% guest fee — it is never deducted from your proceeds. Your settlement = accommodation subtotal + mandatory charges. Settlements are manual and recorded in the controlled ledger during the pilot.</span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: 'Total owner proceeds', value: formatNaira(totalProceeds), sub: `${settleable.length} settled/active bookings · ${totalNights} nights`, Icon: Banknote },
          { label: 'Guest fees paid by guests', value: formatNaira(totalGuestFeeExcluded), sub: 'Never deducted from your proceeds', Icon: TrendingUp },
          { label: 'My ledger entries', value: String(myLedger.length), sub: 'Read-only view — full control stays with HAMLET operations', Icon: Receipt },
        ].map(c => (
          <div key={c.label} className="rounded-2xl border border-ink-800 bg-ink-900 p-5">
            <c.Icon size={20} className="text-brass-400" />
            <p className="mt-3 font-display text-2xl font-black tabular-nums text-ink-50">{c.value}</p>
            <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-ink-400">{c.label}</p>
            <p className="mt-0.5 text-[10.5px] font-medium text-ink-500">{c.sub}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-[11px] font-extrabold uppercase tracking-[0.2em] text-ink-400">Booking-by-booking proceeds</h2>
      <div className="mt-2 overflow-x-auto rounded-2xl border border-ink-800">
        <table className="w-full min-w-[720px] text-left">
          <thead className="bg-ink-900"><tr><th className="th">Booking</th><th className="th">Stay</th><th className="th">Subtotal</th><th className="th">Mandatory</th><th className="th">Your proceeds (0% fee)</th><th className="th">Status</th></tr></thead>
          <tbody className="divide-y divide-ink-800 bg-ink-900/60">
            {myBookings.map(b => (
              <tr key={b.id} className="transition hover:bg-ink-850">
                <td className="td"><span className="font-mono text-[10.5px] font-bold text-brass-300">{b.ref}</span><span className="block text-[10px] font-semibold text-ink-400">{formatDate(b.checkIn)}</span></td>
                <td className="td max-w-[180px]"><span className="line-clamp-1 text-[12px] font-semibold text-ink-100">{b.propertyTitle}</span></td>
                <td className="td tabular-nums text-ink-200">{formatNaira(b.accommodationSubtotal)}</td>
                <td className="td tabular-nums text-ink-200">{formatNaira(b.mandatoryTotal)}</td>
                <td className="td font-bold tabular-nums text-ink-50">{formatNaira(ownerProceeds({ accommodationSubtotal: b.accommodationSubtotal, mandatoryChargesTotal: b.mandatoryTotal }))}</td>
                <td className="td"><BookingStatusPill status={b.status} /></td>
              </tr>
            ))}
            {myBookings.length === 0 && <tr><td colSpan={6} className="td py-10 text-center text-ink-500">No bookings yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 text-[11px] font-extrabold uppercase tracking-[0.2em] text-ink-400">Ledger lines for my bookings (read-only)</h2>
      <div className="mt-2 overflow-x-auto rounded-2xl border border-ink-800">
        <table className="w-full min-w-[720px] text-left">
          <thead className="bg-ink-900"><tr><th className="th">When</th><th className="th">Type</th><th className="th">Description</th><th className="th">Amount</th><th className="th">Variance</th></tr></thead>
          <tbody className="divide-y divide-ink-800 bg-ink-900/60">
            {myLedger.map(l => (
              <tr key={l.id} className="transition hover:bg-ink-850">
                <td className="td whitespace-nowrap text-[11px] font-semibold text-ink-300">{formatDate(l.at)}</td>
                <td className="td"><span className="rounded-md bg-ink-800 px-2 py-0.5 font-mono text-[9.5px] font-bold uppercase text-ink-200">{l.type.replace(/_/g, ' ')}</span></td>
                <td className="td max-w-[280px] text-[11px] leading-snug text-ink-200">{l.description}{l.note && <span className="block text-[10px] text-ink-400">{l.note}</span>}</td>
                <td className="td font-semibold tabular-nums text-ink-100">{formatNaira(l.amount)}</td>
                <td className={`td tabular-nums font-bold ${l.variance !== 0 ? 'text-red-400' : 'text-jade-400'}`}>{l.variance === 0 ? '—' : formatNaira(l.variance)}</td>
              </tr>
            ))}
            {myLedger.length === 0 && <tr><td colSpan={5} className="td py-10 text-center text-ink-500">No ledger lines yet — they appear after payment verification.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
