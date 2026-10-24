import { useEffect, useMemo, useState } from 'react';
import { Copy, Check, Share2, Gift, Clock, Users, Banknote, ShieldCheck, ExternalLink } from 'lucide-react';
import { useHamlet } from '../../lib/store';
import { useToast } from '../../lib/toast';
import {
  buildCanonicalReferralUrl,
  buildReferralWhatsAppShareUrl,
  HAMLET_CANONICAL_ORIGIN,
} from '../../lib/referrals';
import { formatNaira, formatDate } from '../../lib/pricing';

export default function PartnerReferrals() {
  const { state, ensureMyReferralCode } = useHamlet();
  const { toast } = useToast();
  const session = state.session!;
  const myAccount = state.accounts.find(a => a.id === session.userId);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedAgentLink, setCopiedAgentLink] = useState(false);

  const referralCode = myAccount?.referralCode || generatedCode || '';

  useEffect(() => {
    if (myAccount?.referralCode) return;
    let active = true;
    void ensureMyReferralCode()
      .then(code => {
        if (active) setGeneratedCode(code);
      })
      .catch(() => { /* surfaced if user clicks copy */ });
    return () => { active = false; };
  }, [myAccount?.referralCode, ensureMyReferralCode]);

  const referralUrl = referralCode ? buildCanonicalReferralUrl(referralCode) : '';
  const whatsappShareUrl = referralCode
    ? buildReferralWhatsAppShareUrl(referralCode, session.name)
    : '';
  const agentBookingUrl = referralCode
    ? `${HAMLET_CANONICAL_ORIGIN}/#/stays?agent=${encodeURIComponent(referralCode)}`
    : '';

  const myReferrals = useMemo(
    () => state.partnerReferrals.filter(r => r.referrerPartnerId === session.userId),
    [state.partnerReferrals, session.userId],
  );
  const myRewards = useMemo(
    () => state.partnerReferralRewards.filter(rw => rw.referrerPartnerId === session.userId),
    [state.partnerReferralRewards, session.userId],
  );

  const pendingAmount = myRewards
    .filter(r => r.payoutStatus === 'pending')
    .reduce((sum, r) => sum + r.rewardAmountNgn, 0);
  const approvedOrPaidAmount = myRewards
    .filter(r => r.payoutStatus === 'approved' || r.payoutStatus === 'paid')
    .reduce((sum, r) => sum + r.rewardAmountNgn, 0);
  const activeCount = myReferrals.filter(r => r.status === 'active').length;

  const copyText = async (value: string, kind: 'partner' | 'agent') => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      if (kind === 'partner') {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } else {
        setCopiedAgentLink(true);
        setTimeout(() => setCopiedAgentLink(false), 2000);
      }
      toast('Copied to clipboard.');
    } catch {
      toast('Could not copy automatically — select the link manually.', 'error');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-brass-400">Partner Growth & Attribution</p>
      <h1 className="mt-1.5 font-display text-2xl font-black text-ink-50 sm:text-3xl">Partner referrals & 90-day rewards</h1>
      <p className="mt-1 max-w-2xl text-[12px] font-medium text-ink-300">
        Invite trusted Lagos property owners, managers, and closing agents to join HAMLET using your canonical <span className="font-mono text-brass-300">https://www.hamlet.rest/</span> referral link.
      </p>

      {/* Shareable Referral Card */}
      <div className="mt-6 grid gap-4 lg:grid-cols-12">
        <div className="rounded-2xl border border-brass-500/35 bg-ink-900 p-5 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-wider text-brass-400">
              <Gift size={14} /> Your Partner Onboarding Referral Link
            </span>
            <span className="rounded-lg border border-ink-700 bg-ink-950 px-2.5 py-1 font-mono text-[11.5px] font-bold text-brass-300">
              {referralCode || 'Generating…'}
            </span>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              readOnly
              value={referralUrl}
              aria-label="Partner referral URL"
              className="input-dark flex-1 font-mono text-[12px] text-ink-100"
            />
            <button
              type="button"
              disabled={!referralUrl}
              onClick={() => void copyText(referralUrl, 'partner')}
              className="btn-brass shrink-0 !px-4 !py-2.5 text-[12px]"
            >
              {copiedLink ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy link</>}
            </button>
            {whatsappShareUrl && (
              <a
                href={whatsappShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost-dark shrink-0 !border !border-jade-500/40 !px-4 !py-2.5 text-[12px] text-jade-300 hover:bg-jade-500/10"
              >
                <Share2 size={14} /> Share on WhatsApp <ExternalLink size={12} />
              </a>
            )}
          </div>

          {/* Closing Agent Link (distinct attribution #3) */}
          <div className="mt-4 border-t border-ink-800 pt-3.5">
            <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-ink-400">
              Your Closing Agent Guest Booking Link (10% closing commission)
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-ink-400">
              Share with guests when closing a stay — attributes you as Closing Agent without altering property introducer or manager records.
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                readOnly
                value={agentBookingUrl}
                aria-label="Closing agent booking URL"
                className="input-dark flex-1 font-mono text-[11.5px] text-ink-200"
              />
              <button
                type="button"
                disabled={!agentBookingUrl}
                onClick={() => void copyText(agentBookingUrl, 'agent')}
                className="btn-ghost-dark shrink-0 !border !border-ink-700 !px-3.5 !py-2 text-[11.5px]"
              >
                {copiedAgentLink ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy agent link</>}
              </button>
            </div>
          </div>
        </div>

        {/* Commercial Rules Summary */}
        <div className="rounded-2xl border border-ink-800 bg-ink-900/80 p-5 lg:col-span-5">
          <p className="flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-wider text-jade-300">
            <ShieldCheck size={14} /> Referral commercial terms
          </p>
          <ul className="mt-3 space-y-2 text-[11.5px] font-medium leading-relaxed text-ink-200">
            <li>• <strong>No sign-up or activation bonus:</strong> rewards are tied strictly to completed, paid bookings.</li>
            <li>• <strong>1st completed booking activates:</strong> when your referred partner closes their first completed stay, the referral relationship activates and starts a <strong>90-day earning window</strong> (₦0 payout on booking #1).</li>
            <li>• <strong>2.5% recurring reward for 90 days:</strong> on every subsequent completed stay closed by that referred partner within the 90-day window, you earn <strong>2.5% of the owner’s listed NGN rate (B)</strong>, funded from HAMLET’s 20% markup.</li>
            <li>• <strong>Single-level & clean attribution:</strong> no multi-level overrides, no self-referrals, and cancelled/refunded stays automatically reverse uncompleted rewards.</li>
          </ul>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-4">
        {[
          { label: 'Referred partners', value: String(myReferrals.length), sub: `${activeCount} currently in active 90-day window`, Icon: Users },
          { label: 'Active 90-day windows', value: String(activeCount), sub: 'Earning 2.5% on subsequent completed stays', Icon: Clock },
          { label: 'Pending referral rewards', value: formatNaira(pendingAmount), sub: 'Awaiting payout approval', Icon: Gift },
          { label: 'Approved / paid rewards', value: formatNaira(approvedOrPaidAmount), sub: 'Reconciled in settlement ledger', Icon: Banknote },
        ].map(c => (
          <div key={c.label} className="rounded-2xl border border-ink-800 bg-ink-900 p-4">
            <c.Icon size={18} className="text-brass-400" />
            <p className="mt-2.5 font-display text-xl font-black tabular-nums text-ink-50">{c.value}</p>
            <p className="mt-0.5 text-[10px] font-extrabold uppercase tracking-wider text-ink-400">{c.label}</p>
            <p className="mt-0.5 text-[10.5px] font-medium text-ink-500">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Referred Partners Table */}
      <h2 className="mt-8 text-[11px] font-extrabold uppercase tracking-[0.2em] text-ink-400">Referred partners & window status</h2>
      <div className="mt-2 overflow-x-auto overscroll-x-contain rounded-2xl border border-ink-800">
        <table className="w-full min-w-[720px] text-left">
          <thead className="bg-ink-900">
            <tr>
              <th className="th">Partner</th>
              <th className="th">Registered</th>
              <th className="th">Status</th>
              <th className="th">90-Day Window</th>
              <th className="th">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-800 bg-ink-900/60">
            {myReferrals.map(r => (
              <tr key={r.id} className="hover:bg-ink-850">
                <td className="td">
                  <p className="text-[12px] font-bold text-ink-100">{r.referredName ?? 'Partner'}</p>
                  {r.referredCompany && <p className="text-[10.5px] text-ink-400">{r.referredCompany}</p>}
                </td>
                <td className="td text-[11.5px] text-ink-300">{formatDate(r.registeredAt)}</td>
                <td className="td">
                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                    r.status === 'active'
                      ? 'border-jade-500/40 bg-jade-500/15 text-jade-300'
                      : r.status === 'verified'
                        ? 'border-sky-500/40 bg-sky-500/15 text-sky-300'
                        : r.status === 'pending_verification'
                          ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                          : 'border-ink-700 bg-ink-800 text-ink-300'
                  }`}>
                    {r.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="td text-[11.5px] text-ink-200">
                  {r.eligibilityStartsAt && r.eligibilityEndsAt
                    ? `${formatDate(r.eligibilityStartsAt)} → ${formatDate(r.eligibilityEndsAt)}`
                    : r.status === 'verified'
                      ? 'Awaiting 1st completed booking to activate'
                      : '—'}
                </td>
                <td className="td text-[11px] text-ink-400">{r.disputeNote ?? 'Single-level verified attribution'}</td>
              </tr>
            ))}
            {myReferrals.length === 0 && (
              <tr><td colSpan={5} className="td py-10 text-center text-ink-500">No referred partners yet — share your canonical referral link above.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Rewards Ledger Table */}
      <h2 className="mt-8 text-[11px] font-extrabold uppercase tracking-[0.2em] text-ink-400">Referral activation & 2.5% reward history</h2>
      <div className="mt-2 overflow-x-auto overscroll-x-contain rounded-2xl border border-ink-800">
        <table className="w-full min-w-[720px] text-left">
          <thead className="bg-ink-900">
            <tr>
              <th className="th">Date</th>
              <th className="th">Booking Ref</th>
              <th className="th">Closing Agent</th>
              <th className="th">Owner Listed Rate (B)</th>
              <th className="th">Reward (2.5%)</th>
              <th className="th">Payout Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-800 bg-ink-900/60">
            {myRewards.map(rw => (
              <tr key={rw.id} className="hover:bg-ink-850">
                <td className="td text-[11.5px] text-ink-300">{formatDate(rw.createdAt)}</td>
                <td className="td font-mono text-[11px] font-bold text-brass-300">{rw.bookingRef}</td>
                <td className="td text-[12px] text-ink-200">{rw.referredAgentName ?? 'Referred partner'}</td>
                <td className="td tabular-nums text-ink-200">{formatNaira(rw.ownerListedPriceNgn)}</td>
                <td className="td font-bold tabular-nums text-jade-300">
                  {rw.payoutStatus === 'activated_no_payout' ? '₦0 (Window activated)' : formatNaira(rw.rewardAmountNgn)}
                </td>
                <td className="td">
                  <span className="rounded-full border border-ink-700 bg-ink-800 px-2.5 py-0.5 text-[10px] font-bold uppercase text-ink-200">
                    {rw.payoutStatus.replace(/_/g, ' ')}
                  </span>
                </td>
              </tr>
            ))}
            {myRewards.length === 0 && (
              <tr><td colSpan={6} className="td py-10 text-center text-ink-500">No referral activations or rewards recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
