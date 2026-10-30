'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { getBrowserSupabase } from '@/lib/next-supabase';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import { PartnerNav } from '../partner-nav';

type PartnerBookingRow = {
  id: string;
  reference: string;
  accommodation_subtotal: number;
  mandatory_charges: Array<{ label?: string; amount?: number }> | null;
  status: string;
  check_in: string;
  check_out: string;
  properties?: { title?: string } | null;
};

type CommissionRow = {
  id: string;
  booking_id: string;
  booking_reference: string;
  reward_amount_ngn: number;
  status: string;
  created_at: string;
};

export default function PartnerEarningsPage() {
  const db = useMemo(() => getBrowserSupabase(), []);
  const [role, setRole] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedGuest, setCopiedGuest] = useState(false);
  const [bookings, setBookings] = useState<PartnerBookingRow[]>([]);
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!db) {
      setError('Earnings data is not configured on this deployment.');
      setLoading(false);
      return;
    }
    const { data: session } = await db.auth.getSession();
    const user = session.session?.user;
    if (!user) {
      window.location.assign('/signin?next=/partners/earnings');
      return;
    }

    const { data: profile } = await db
      .from('profiles')
      .select('role,referral_code')
      .eq('id', user.id)
      .maybeSingle();

    const userRole = String(profile?.role || 'guest');
    setRole(userRole);
    // Ensure referral code exists for active partners
    let activeCode = String(profile?.referral_code || '');
    if (!activeCode && userRole === 'partner') {
      const { data: ensured } = await db.rpc('ensure_my_referral_code');
      if (typeof ensured === 'string') activeCode = ensured;
    }
    setReferralCode(activeCode);

    if (userRole !== 'partner' && userRole !== 'admin') {
      setLoading(false);
      return;
    }

    const [bookingsRes, commRes] = await Promise.all([
      db
        .from('bookings')
        .select(
          'id,reference,accommodation_subtotal,mandatory_charges,status,check_in,check_out,properties(title)',
        )
        .in('status', ['confirmed', 'completed'])
        .order('created_at', { ascending: false }),
      db
        .from('partner_referral_rewards')
        .select('id,booking_id,booking_reference,reward_amount_ngn,status,created_at')
        .eq('referrer_partner_id', user.id)
        .order('created_at', { ascending: false }),
    ]);

    if (!bookingsRes.error) {
      setBookings((bookingsRes.data || []) as unknown as PartnerBookingRow[]);
    }
    if (!commRes.error) {
      setCommissions((commRes.data || []) as CommissionRow[]);
    }
    setLoading(false);
  }, [db]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const sumCharges = (row: PartnerBookingRow) =>
    (row.mandatory_charges || []).reduce(
      (s, ch) => s + Number(ch?.amount || 0),
      0,
    );

  const completedOwnerGross = bookings
    .filter(b => b.status === 'completed')
    .reduce(
      (sum, b) => sum + Number(b.accommodation_subtotal || 0) + sumCharges(b),
      0,
    );

  const projectedConfirmedOwnerGross = bookings
    .filter(b => b.status === 'confirmed')
    .reduce(
      (sum, b) => sum + Number(b.accommodation_subtotal || 0) + sumCharges(b),
      0,
    );

  const settledCommissions = commissions
    .filter(c => c.status === 'paid' || c.status === 'settled')
    .reduce((sum, c) => sum + Number(c.reward_amount_ngn || 0), 0);

  const pendingCommissions = commissions
    .filter(c => !['paid', 'settled', 'reversed', 'void'].includes(c.status))
    .reduce((sum, c) => sum + Number(c.reward_amount_ngn || 0), 0);

  function copyReferralLink() {
    if (!referralCode) return;
    const url = `${window.location.origin}/partners/apply?ref=${encodeURIComponent(referralCode)}`;
    void navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  function copyGuestReferralLink() {
    if (!referralCode) return;
    const url = `${window.location.origin}/?ref=${encodeURIComponent(referralCode)}`;
    void navigator.clipboard.writeText(url);
    setCopiedGuest(true);
    window.setTimeout(() => setCopiedGuest(false), 2000);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <main className="shell flex-1 py-8 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Earnings, Commissions & Referrals</p>
            <h1 className="serif mt-2 text-3xl font-medium text-ink-900 sm:text-5xl">
              Partner ledger overview
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-600">
              Projected figures reflect confirmed stays in progress; settled figures reflect completed stays and reconciled ledger entries.
            </p>
          </div>
          {(role === 'partner' || role === 'admin') && (
            <PartnerNav current="earnings" />
          )}
        </div>

        {error && (
          <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800">
            {error}
          </p>
        )}

        {loading ? (
          <p className="mt-8 text-sm text-ink-600">Loading ledger…</p>
        ) : (
          <div className="mt-8 space-y-6">
            <div className="grid gap-3.5 sm:grid-cols-4">
              <div className="rounded-2xl border border-ink-100 bg-white p-4">
                <p className="m-0 text-xs font-semibold text-ink-500">
                  Completed stay owner base (B + cleaning)
                </p>
                <p className="m-0 mt-1 font-mono text-2xl font-extrabold text-emerald-800">
                  ₦{completedOwnerGross.toLocaleString('en-NG')}
                </p>
              </div>
              <div className="rounded-2xl border border-ink-100 bg-white p-4">
                <p className="m-0 text-xs font-semibold text-ink-500">
                  Projected (confirmed stays in progress)
                </p>
                <p className="m-0 mt-1 font-mono text-2xl font-extrabold text-ink-900">
                  ₦{projectedConfirmedOwnerGross.toLocaleString('en-NG')}
                </p>
              </div>
              <div className="rounded-2xl border border-ink-100 bg-white p-4">
                <p className="m-0 text-xs font-semibold text-ink-500">
                  Pending agent / referral commissions
                </p>
                <p className="m-0 mt-1 font-mono text-2xl font-extrabold text-brass-700">
                  ₦{pendingCommissions.toLocaleString('en-NG')}
                </p>
              </div>
              <div className="rounded-2xl border border-ink-100 bg-white p-4">
                <p className="m-0 text-xs font-semibold text-ink-500">
                  Reconciled commissions paid
                </p>
                <p className="m-0 mt-1 font-mono text-2xl font-extrabold text-ink-900">
                  ₦{settledCommissions.toLocaleString('en-NG')}
                </p>
              </div>
            </div>

            {referralCode && (
              <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-ink-200 bg-white p-6">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-brass-700">
                    Your Partner Referral Code (2.5% of B · 90-day window)
                  </span>
                  <p className="m-0 mt-1 font-mono text-2xl font-extrabold text-ink-900">
                    {referralCode}
                  </p>
                  <p className="m-0 mt-1 text-xs text-ink-500">
                    Share your invite link with verified closing agents or property owners joining HAMLET.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={copyGuestReferralLink}
                    className="secondary-button min-h-[46px]"
                  >
                    {copiedGuest ? <><Check className="h-4 w-4 shrink-0 text-emerald-700" /> Guest link copied</> : <><Copy className="h-4 w-4 shrink-0" /> Copy guest link</>}
                  </button>
                  <button
                    type="button"
                    onClick={copyReferralLink}
                    className="secondary-button min-h-[46px]"
                  >
                    {copied ? <><Check className="h-4 w-4 shrink-0 text-emerald-700" /> Partner link copied</> : <><Copy className="h-4 w-4 shrink-0" /> Copy partner invite</>}
                  </button>
                </div>
              </section>
            )}

            <section className="rounded-3xl border border-ink-100 bg-white p-6">
              <h2 className="serif m-0 text-2xl font-medium text-ink-900">
                Commission & referral ledger entries ({commissions.length})
              </h2>
              {commissions.length > 0 ? (
                <div className="mt-4 divide-y divide-ink-100 text-xs">
                  {commissions.map(item => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-3"
                    >
                      <div>
                        <strong className="font-mono text-ink-900">
                          {item.booking_reference}
                        </strong>{' '}
                        · 2.5% direct partner referral
                        <p className="m-0 text-ink-500">
                          Recorded {new Date(item.created_at).toLocaleDateString('en-NG')}
                        </p>
                      </div>
                      <div className="text-right">
                        <strong className="font-mono text-sm text-ink-900">
                          ₦{Number(item.reward_amount_ngn || 0).toLocaleString('en-NG')}
                        </strong>
                        <span className="ml-2 rounded-full bg-paper px-2.5 py-0.5 text-[11px] font-bold text-ink-700">
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-ink-500">
                  No closing-agent or referral commission ledger entries recorded yet.
                </p>
              )}
            </section>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
