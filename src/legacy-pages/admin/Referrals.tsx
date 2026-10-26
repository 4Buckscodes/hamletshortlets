import { useState } from 'react';
import { Gift, Globe, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useHamlet } from '../../lib/store';
import { useToast } from '../../lib/toast';
import { formatNaira, formatDate, formatDateTime } from '../../lib/pricing';
import type { ReferralRelationshipStatus } from '../../lib/types';

export default function AdminReferrals() {
  const { state, resolveReferralDispute, updateExchangeRateConfig } = useHamlet();
  const { toast } = useToast();

  // Dispute / governance controls
  const [selectedRefId, setSelectedRefId] = useState<string | null>(null);
  const [nextStatus, setNextStatus] = useState<ReferralRelationshipStatus>('active');
  const [windowDays, setWindowDays] = useState<number>(90);
  const [resolutionNote, setResolutionNote] = useState('');
  const [savingDispute, setSavingDispute] = useState(false);

  // FX Configuration state
  const usdRate = state.exchangeRates.find(r => r.currency === 'USD');
  const gbpRate = state.exchangeRates.find(r => r.currency === 'GBP');
  const [usdNgn, setUsdNgn] = useState<number>(usdRate?.ngnPerUnit ?? 1600);
  const [usdSource, setUsdSource] = useState<string>(usdRate?.source ?? 'HAMLET Treasury Reference Rate');
  const [usdActive, setUsdActive] = useState<boolean>(usdRate?.isActive ?? true);
  const [gbpNgn, setGbpNgn] = useState<number>(gbpRate?.ngnPerUnit ?? 2050);
  const [gbpSource, setGbpSource] = useState<string>(gbpRate?.source ?? 'HAMLET Treasury Reference Rate');
  const [gbpActive, setGbpActive] = useState<boolean>(gbpRate?.isActive ?? true);
  const [savingFx, setSavingFx] = useState<'USD' | 'GBP' | null>(null);

  const saveFx = async (currency: 'USD' | 'GBP') => {
    setSavingFx(currency);
    try {
      await updateExchangeRateConfig({
        currency,
        ngnPerUnit: currency === 'USD' ? usdNgn : gbpNgn,
        source: currency === 'USD' ? usdSource : gbpSource,
        quoteTtlMinutes: 30,
        isActive: currency === 'USD' ? usdActive : gbpActive,
      });
      toast(`${currency}/NGN exchange rate configuration updated and audit-logged.`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not update FX configuration.', 'error');
    } finally {
      setSavingFx(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-brass-400">Attribution & International Pricing</p>
      <h1 className="mt-1.5 font-display text-2xl font-black text-ink-50 sm:text-3xl">Partner referrals & FX rate governance</h1>
      <p className="mt-1 max-w-2xl text-[12px] font-medium text-ink-300">
        Audit single-level partner referral attributions, manage configurable 90-day 2.5% recurring earning windows, resolve attribution disputes with audit logging, and configure authoritative USD/GBP FX rates for the 10% international currency buffer.
      </p>

      {/* FX Rate Configuration Section (§6.2 & §11.4) */}
      <section className="mt-6 rounded-2xl border border-ink-800 bg-ink-900 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-base font-black text-ink-50">
            <Globe size={18} className="text-brass-400" /> International FX Rates & 10% Buffer Configuration
          </h2>
          <span className="rounded-full border border-sky-500/35 bg-sky-500/10 px-3 py-0.5 text-[10px] font-bold uppercase text-sky-300">
            International stay price = (B × 1.20 / FX) × 1.10 · Caution deposit unbuffered
          </span>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {/* USD */}
          <div className="rounded-xl border border-ink-800 bg-ink-950/60 p-4">
            <div className="flex items-center justify-between">
              <p className="font-display text-sm font-black text-ink-100">USD / NGN Quote Rate</p>
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-ink-300">
                <input type="checkbox" checked={usdActive} onChange={e => setUsdActive(e.target.checked)} className="accent-brass-500" />
                Active
              </label>
            </div>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              <label>
                <span className="label-dark">Naira per $1 USD</span>
                <input type="number" min={1} className="input-dark" value={usdNgn} onChange={e => setUsdNgn(Number(e.target.value))} />
              </label>
              <label>
                <span className="label-dark">Rate source</span>
                <input className="input-dark" value={usdSource} onChange={e => setUsdSource(e.target.value)} />
              </label>
            </div>
            {usdRate && (
              <p className="mt-2 text-[10.5px] text-ink-400">
                Last updated: {formatDateTime(usdRate.quotedAt ?? usdRate.effectiveAt ?? new Date().toISOString())} · Quote TTL: {usdRate.quoteTtlMinutes ?? 30} mins
              </p>
            )}
            <button
              type="button"
              disabled={savingFx === 'USD'}
              onClick={() => void saveFx('USD')}
              className="btn-brass mt-3 !px-4 !py-2 text-[11.5px]"
            >
              {savingFx === 'USD' ? 'Saving…' : 'Update USD/NGN rate'}
            </button>
          </div>

          {/* GBP */}
          <div className="rounded-xl border border-ink-800 bg-ink-950/60 p-4">
            <div className="flex items-center justify-between">
              <p className="font-display text-sm font-black text-ink-100">GBP / NGN Quote Rate</p>
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-ink-300">
                <input type="checkbox" checked={gbpActive} onChange={e => setGbpActive(e.target.checked)} className="accent-brass-500" />
                Active
              </label>
            </div>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              <label>
                <span className="label-dark">Naira per £1 GBP</span>
                <input type="number" min={1} className="input-dark" value={gbpNgn} onChange={e => setGbpNgn(Number(e.target.value))} />
              </label>
              <label>
                <span className="label-dark">Rate source</span>
                <input className="input-dark" value={gbpSource} onChange={e => setGbpSource(e.target.value)} />
              </label>
            </div>
            {gbpRate && (
              <p className="mt-2 text-[10.5px] text-ink-400">
                Last updated: {formatDateTime(gbpRate.quotedAt ?? gbpRate.effectiveAt ?? new Date().toISOString())} · Quote TTL: {gbpRate.quoteTtlMinutes ?? 30} mins
              </p>
            )}
            <button
              type="button"
              disabled={savingFx === 'GBP'}
              onClick={() => void saveFx('GBP')}
              className="btn-brass mt-3 !px-4 !py-2 text-[11.5px]"
            >
              {savingFx === 'GBP' ? 'Saving…' : 'Update GBP/NGN rate'}
            </button>
          </div>
        </div>
      </section>

      {/* Partner Referral Attribution & Dispute Governance (§4.4 & §11.4) */}
      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-ink-400">
          <Gift size={14} className="text-brass-400" /> Partner referral relationships & 90-day windows ({state.partnerReferrals.length})
        </h2>
        <div className="mt-2 overflow-x-auto overscroll-x-contain rounded-2xl border border-ink-800">
          <table className="w-full min-w-[860px] text-left">
            <thead className="bg-ink-900">
              <tr>
                <th className="th">Referrer Partner</th>
                <th className="th">Referred Partner</th>
                <th className="th">Code</th>
                <th className="th">Status</th>
                <th className="th">Window (Days)</th>
                <th className="th">Eligibility Window</th>
                <th className="th">Governance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800 bg-ink-900/60">
              {state.partnerReferrals.map(r => (
                <tr key={r.id} className="hover:bg-ink-850">
                  <td className="td text-[12px] font-bold text-ink-100">{r.referrerName ?? r.referrerPartnerId}</td>
                  <td className="td">
                    <p className="text-[12px] font-bold text-ink-100">{r.referredName ?? r.referredPartnerId}</p>
                    {r.referredCompany && <p className="text-[10.5px] text-ink-400">{r.referredCompany}</p>}
                  </td>
                  <td className="td font-mono text-[11px] text-brass-300">{r.referralCode}</td>
                  <td className="td">
                    <span className="rounded-full border border-ink-700 bg-ink-800 px-2.5 py-0.5 text-[10px] font-bold uppercase text-ink-200">
                      {r.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="td text-[11.5px] text-ink-200">{r.earningWindowDays}d</td>
                  <td className="td text-[11.5px] text-ink-300">
                    {r.eligibilityStartsAt && r.eligibilityEndsAt
                      ? `${formatDate(r.eligibilityStartsAt)} → ${formatDate(r.eligibilityEndsAt)}`
                      : 'Not yet activated'}
                  </td>
                  <td className="td">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRefId(r.id);
                        setNextStatus(r.status);
                        setWindowDays(r.earningWindowDays);
                        setResolutionNote(r.disputeNote ?? '');
                      }}
                      className="rounded-lg border border-ink-700 px-2.5 py-1 text-[10.5px] font-bold text-ink-200 hover:border-brass-500/50 hover:text-brass-300"
                    >
                      Review / resolve
                    </button>
                  </td>
                </tr>
              ))}
              {state.partnerReferrals.length === 0 && (
                <tr><td colSpan={7} className="td py-10 text-center text-ink-500">No partner referral relationships recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {selectedRefId && (
          <div className="mt-4 rounded-2xl border border-brass-500/40 bg-ink-900 p-5">
            <h3 className="flex items-center gap-2 font-display text-base font-black text-ink-50">
              <ShieldCheck size={17} className="text-brass-400" /> Audit-logged Attribution Governance Decision
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label>
                <span className="label-dark">Relationship status</span>
                <select className="input-dark" value={nextStatus} onChange={e => setNextStatus(e.target.value as ReferralRelationshipStatus)}>
                  {(['pending_verification', 'verified', 'active', 'window_expired', 'disputed', 'blocked'] as const).map(s => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="label-dark">Configurable earning window (days)</span>
                <input type="number" min={1} max={365} className="input-dark" value={windowDays} onChange={e => setWindowDays(Number(e.target.value))} />
              </label>
              <label className="sm:col-span-3">
                <span className="label-dark">Documented resolution note (min 10 chars — recorded in audit log)</span>
                <input className="input-dark" value={resolutionNote} onChange={e => setResolutionNote(e.target.value)} placeholder="Explain attribution verification, duplicate check, or dispute decision…" />
              </label>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={savingDispute}
                onClick={async () => {
                  setSavingDispute(true);
                  try {
                    await resolveReferralDispute(selectedRefId, nextStatus, resolutionNote, windowDays);
                    toast('Referral attribution updated and audit-logged.');
                    setSelectedRefId(null);
                  } catch (err) {
                    toast(err instanceof Error ? err.message : 'Could not update referral.', 'error');
                  } finally {
                    setSavingDispute(false);
                  }
                }}
                className="btn-brass !px-4 !py-2 text-[11.5px]"
              >
                <CheckCircle2 size={14} /> Save & audit-log
              </button>
              <button type="button" onClick={() => setSelectedRefId(null)} className="btn-ghost-dark !px-3.5 !py-2 text-[11.5px]">Cancel</button>
            </div>
          </div>
        )}
      </section>

      {/* Referral Rewards History */}
      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-ink-400">
          <AlertTriangle size={14} className="text-brass-400" /> Referral activations & 2.5% recurring rewards ({state.partnerReferralRewards.length})
        </h2>
        <div className="mt-2 overflow-x-auto overscroll-x-contain rounded-2xl border border-ink-800">
          <table className="w-full min-w-[780px] text-left">
            <thead className="bg-ink-900">
              <tr>
                <th className="th">Date</th>
                <th className="th">Booking</th>
                <th className="th">Closing Agent</th>
                <th className="th">Owner Rate (B)</th>
                <th className="th">Reward (2.5%)</th>
                <th className="th">Payout Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800 bg-ink-900/60">
              {state.partnerReferralRewards.map(rw => (
                <tr key={rw.id} className="hover:bg-ink-850">
                  <td className="td text-[11.5px] text-ink-300">{formatDate(rw.createdAt)}</td>
                  <td className="td font-mono text-[11px] font-bold text-brass-300">{rw.bookingRef}</td>
                  <td className="td text-[12px] text-ink-200">{rw.referredAgentName ?? rw.referredClosingAgentId}</td>
                  <td className="td tabular-nums text-ink-200">{formatNaira(rw.ownerListedPriceNgn)}</td>
                  <td className="td font-bold tabular-nums text-jade-300">
                    {rw.payoutStatus === 'activated_no_payout' ? '₦0 (Activation booking #1)' : formatNaira(rw.rewardAmountNgn)}
                  </td>
                  <td className="td">
                    <span className="rounded-full border border-ink-700 bg-ink-800 px-2.5 py-0.5 text-[10px] font-bold uppercase text-ink-200">
                      {rw.payoutStatus.replace(/_/g, ' ')}
                    </span>
                  </td>
                </tr>
              ))}
              {state.partnerReferralRewards.length === 0 && (
                <tr><td colSpan={6} className="td py-10 text-center text-ink-500">No referral rewards recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
