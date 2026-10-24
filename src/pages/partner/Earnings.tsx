import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Banknote, Info, Receipt, TrendingUp, Gift, HandCoins } from 'lucide-react';
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

  // Closing agent commissions (10% of owner listed price B) where this partner closed the booking
  const myClosedBookings = useMemo(() => {
    const map = new Map<string, {
      id: string;
      ref: string;
      propertyTitle: string;
      ownerListedPriceNgn: number;
      closingAgentCommissionNgn: number;
      status: typeof state.bookings[number]['status'];
    }>();
    for (const b of state.bookings) {
      if (b.closingAgentId === userId && ['confirmed', 'completed'].includes(b.status)) {
        map.set(b.id, {
          id: b.id,
          ref: b.ref,
          propertyTitle: b.propertyTitle,
          ownerListedPriceNgn: b.ownerListedPriceNgn ?? b.accommodationSubtotal,
          closingAgentCommissionNgn: b.closingAgentCommissionNgn ?? 0,
          status: b.status,
        });
      }
    }
    const closedSummaries = state.closedAgentBookings ?? [];
    for (const cb of closedSummaries) {
      if (['confirmed', 'completed'].includes(cb.status) && !map.has(cb.bookingId)) {
        map.set(cb.bookingId, {
          id: cb.bookingId,
          ref: cb.bookingRef,
          propertyTitle: cb.propertyTitle,
          ownerListedPriceNgn: cb.ownerListedPriceNgn,
          closingAgentCommissionNgn: cb.closingAgentCommissionNgn,
          status: cb.status,
        });
      }
    }
    return Array.from(map.values());
  }, [state, userId]);
  const totalClosingCommission = myClosedBookings.reduce((s, b) => s + b.closingAgentCommissionNgn, 0);

  // Recurring referral rewards (2.5% of owner listed price B within 90-day window)
  const myReferralRewards = state.partnerReferralRewards.filter(rw => rw.referrerPartnerId === userId && rw.payoutStatus !== 'reversed');
  const totalReferralEarned = myReferralRewards.reduce((s, rw) => s + rw.rewardAmountNgn, 0);

  // Ledger lines tied to my bookings or where I am beneficiary
  const myRefs = new Set(myBookings.map(b => b.ref));
  const myLedger = state.ledger.filter(l => myRefs.has(l.bookingRef) || l.beneficiaryUserId === userId);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-brass-400">Proceeds, commissions & settlement</p>
      <h1 className="mt-1.5 font-display text-2xl font-black text-ink-50 sm:text-3xl">Earnings & settlement</h1>

      <div className="mt-3 flex items-start gap-3 rounded-2xl border border-brass-500/30 bg-brass-500/5 px-4 py-3.5 text-[12px] font-semibold leading-relaxed text-brass-200">
        <Info size={16} className="mt-0.5 shrink-0" />
        <span>
          <strong>HAMLET owner fee is 0%.</strong> Owners receive 100% of their listed accommodation rate (B) + mandatory charges. Guests pay HAMLET’s 20% domestic accommodation markup, which funds closing agent commissions (10% of B) and direct partner referral rewards (2.5% of B during an active 90-day window) without ever reducing owner proceeds.
        </span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Owner / property proceeds', value: formatNaira(totalProceeds), sub: `${settleable.length} bookings · ${totalNights} nights (0% owner fee)`, Icon: Banknote },
          { label: 'Closing agent commissions (10%)', value: formatNaira(totalClosingCommission), sub: `${myClosedBookings.length} booking(s) closed with your agent code`, Icon: HandCoins },
          { label: 'Partner referral rewards (2.5%)', value: formatNaira(totalReferralEarned), sub: `${myReferralRewards.filter(r => r.rewardAmountNgn > 0).length} recurring reward(s) · 90-day window`, Icon: Gift },
          { label: 'My ledger entries', value: String(myLedger.length), sub: 'Auditable settlement & payout status', Icon: Receipt },
        ].map(c => (
          <div key={c.label} className="rounded-2xl border border-ink-800 bg-ink-900 p-4 sm:p-5">
            <c.Icon size={20} className="shrink-0 text-brass-400" />
            <p className="mt-3 break-words font-display text-xl font-black tabular-nums text-ink-50 sm:text-2xl">{c.value}</p>
            <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-ink-400">{c.label}</p>
            <p className="mt-0.5 text-[10.5px] font-medium text-ink-500">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <Link to="/partner/referrals" className="btn-ghost-dark !border !border-ink-700 !px-3.5 !py-2 text-[11.5px]">
          <TrendingUp size={14} /> Open Partner Referral Link & 90-Day Tracker
        </Link>
      </div>

      <h2 className="mt-6 text-[11px] font-extrabold uppercase tracking-[0.2em] text-ink-400">Property owner / manager booking proceeds</h2>
      <div className="mt-2 overflow-x-auto overscroll-x-contain rounded-2xl border border-ink-800">
        <table className="w-full min-w-[720px] text-left">
          <thead className="bg-ink-900"><tr><th className="th">Booking</th><th className="th">Stay</th><th className="th">Owner Rate (B)</th><th className="th">Mandatory</th><th className="th">Your Proceeds (0% fee)</th><th className="th">Status</th></tr></thead>
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
            {myBookings.length === 0 && <tr><td colSpan={6} className="td py-10 text-center text-ink-500">No property bookings yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {myClosedBookings.length > 0 && (
        <>
          <h2 className="mt-8 text-[11px] font-extrabold uppercase tracking-[0.2em] text-ink-400">Closing agent bookings (10% of owner listed price)</h2>
          <div className="mt-2 overflow-x-auto overscroll-x-contain rounded-2xl border border-ink-800">
            <table className="w-full min-w-[680px] text-left">
              <thead className="bg-ink-900"><tr><th className="th">Booking</th><th className="th">Property</th><th className="th">Owner Listed Rate (B)</th><th className="th">Agent Commission (10%)</th><th className="th">Booking Status</th></tr></thead>
              <tbody className="divide-y divide-ink-800 bg-ink-900/60">
                {myClosedBookings.map(b => (
                  <tr key={b.id} className="transition hover:bg-ink-850">
                    <td className="td font-mono text-[10.5px] font-bold text-brass-300">{b.ref}</td>
                    <td className="td text-[12px] font-semibold text-ink-100">{b.propertyTitle}</td>
                    <td className="td tabular-nums text-ink-200">{formatNaira(b.ownerListedPriceNgn)}</td>
                    <td className="td font-bold tabular-nums text-jade-300">{formatNaira(b.closingAgentCommissionNgn)}</td>
                    <td className="td"><BookingStatusPill status={b.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 className="mt-8 text-[11px] font-extrabold uppercase tracking-[0.2em] text-ink-400">Ledger & payout lines (read-only)</h2>
      <div className="mt-2 overflow-x-auto overscroll-x-contain rounded-2xl border border-ink-800">
        <table className="w-full min-w-[760px] text-left">
          <thead className="bg-ink-900"><tr><th className="th">When</th><th className="th">Booking</th><th className="th">Type</th><th className="th">Description</th><th className="th">Amount</th><th className="th">Payout Status</th></tr></thead>
          <tbody className="divide-y divide-ink-800 bg-ink-900/60">
            {myLedger.map(l => (
              <tr key={l.id} className="transition hover:bg-ink-850">
                <td className="td whitespace-nowrap text-[11px] font-semibold text-ink-300">{formatDate(l.at)}</td>
                <td className="td font-mono text-[10.5px] text-brass-300">{l.bookingRef}</td>
                <td className="td"><span className="rounded-md bg-ink-800 px-2 py-0.5 font-mono text-[9.5px] font-bold uppercase text-ink-200">{l.type.replace(/_/g, ' ')}</span></td>
                <td className="td max-w-[260px] text-[11px] leading-snug text-ink-200">{l.description}{l.note && <span className="block text-[10px] text-ink-400">{l.note}</span>}</td>
                <td className="td font-semibold tabular-nums text-ink-100">{formatNaira(l.amount)}</td>
                <td className="td"><span className="rounded-full border border-ink-700 bg-ink-800 px-2.5 py-0.5 text-[10px] font-bold uppercase text-ink-200">{(l.payoutStatus ?? l.status).replace(/_/g, ' ')}</span></td>
              </tr>
            ))}
            {myLedger.length === 0 && <tr><td colSpan={6} className="td py-10 text-center text-ink-500">No ledger lines yet — they appear after payment verification.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
