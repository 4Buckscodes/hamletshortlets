'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getBrowserSupabase } from '@/lib/next-supabase';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import { AdminNav } from './admin-nav';

export default function AdminOverviewPage() {
  const db = useMemo(() => getBrowserSupabase(), []);
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({
    pendingProperties: 0,
    approvedProperties: 0,
    pendingPartners: 0,
    activeBookings: 0,
    openIssues: 0,
    pendingLedger: 0,
  });
  const [sweeping, setSweeping] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!db) {
      setError('Admin console is not configured on this deployment.');
      setLoading(false);
      return;
    }
    const { data: session } = await db.auth.getSession();
    const user = session.session?.user;
    if (!user) {
      window.location.assign('/signin?next=/admin');
      return;
    }
    const { data: profile } = await db
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'admin') {
      setAllowed(false);
      setLoading(false);
      return;
    }
    setAllowed(true);

    const [propPending, propLive, partnerPending, bookingsActive, issuesOpen, ledgerPending] =
      await Promise.all([
        db
          .from('properties')
          .select('id', { count: 'exact', head: true })
          .in('status', ['submitted', 'pending_review']),
        db
          .from('properties')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'approved'),
        db
          .from('partner_applications')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
        db
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .in('status', ['requested', 'checking', 'awaiting_payment', 'confirmed']),
        db
          .from('booking_issues')
          .select('id', { count: 'exact', head: true })
          .in('status', ['open', 'assigned', 'investigating', 'escalated']),
        db
          .from('booking_payment_records')
          .select('id', { count: 'exact', head: true })
          .eq('payout_status', 'pending'),
      ]);

    setCounts({
      pendingProperties: propPending.count || 0,
      approvedProperties: propLive.count || 0,
      pendingPartners: partnerPending.count || 0,
      activeBookings: bookingsActive.count || 0,
      openIssues: issuesOpen.count || 0,
      pendingLedger: ledgerPending.count || 0,
    });
    setLoading(false);
  }, [db]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function sweepOverdueHolds() {
    if (!db) return;
    setSweeping(true);
    setError('');
    setNotice('');
    try {
      const { data, error: rpcError } = await db.rpc('expire_overdue_bookings');
      if (rpcError) throw new Error(rpcError.message);
      setNotice(`Swept overdue 48-hour payment holds (${Number(data || 0)} expired).`);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not run expiry sweep.');
    } finally {
      setSweeping(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <main className="shell flex-1 py-8 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">HAMLET Operations Console</p>
            <h1 className="serif mt-2 text-3xl font-medium text-ink-900 sm:text-5xl">
              Marketplace operations overview
            </h1>
          </div>
          {allowed && <AdminNav current="overview" />}
        </div>

        {loading ? (
          <p className="mt-8 text-sm text-ink-600">Checking administrator access…</p>
        ) : !allowed ? (
          <div
            role="alert"
            className="mt-8 max-w-xl rounded-3xl border border-red-200 bg-white p-6 text-sm text-red-900"
          >
            Administrator permissions are required to access HAMLET operations queues.
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {error && (
              <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800">
                {error}
              </p>
            )}
            {notice && (
              <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
                {notice}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/admin/properties"
                className="rounded-3xl border border-ink-100 bg-white p-6 transition hover:border-ink-900"
              >
                <span className="text-xs font-bold uppercase tracking-wider text-brass-700">
                  Property Review Queue
                </span>
                <p className="m-0 mt-2 font-mono text-3xl font-extrabold text-ink-900">
                  {counts.pendingProperties}
                </p>
                <p className="m-0 mt-1 text-xs text-ink-500">
                  Awaiting 4-pillar review · {counts.approvedProperties} live on marketplace →
                </p>
              </Link>

              <Link
                href="/admin/partners"
                className="rounded-3xl border border-ink-100 bg-white p-6 transition hover:border-ink-900"
              >
                <span className="text-xs font-bold uppercase tracking-wider text-brass-700">
                  Partner Applications
                </span>
                <p className="m-0 mt-2 font-mono text-3xl font-extrabold text-ink-900">
                  {counts.pendingPartners}
                </p>
                <p className="m-0 mt-1 text-xs text-ink-500">
                  Pending onboarding review →
                </p>
              </Link>

              <Link
                href="/admin/bookings"
                className="rounded-3xl border border-ink-100 bg-white p-6 transition hover:border-ink-900"
              >
                <span className="text-xs font-bold uppercase tracking-wider text-brass-700">
                  Active Bookings & Holds
                </span>
                <p className="m-0 mt-2 font-mono text-3xl font-extrabold text-ink-900">
                  {counts.activeBookings}
                </p>
                <p className="m-0 mt-1 text-xs text-ink-500">
                  Requested, awaiting payment or confirmed →
                </p>
              </Link>

              <Link
                href="/admin/issues"
                className="rounded-3xl border border-ink-100 bg-white p-6 transition hover:border-ink-900"
              >
                <span className="text-xs font-bold uppercase tracking-wider text-brass-700">
                  Open Support Issues
                </span>
                <p className="m-0 mt-2 font-mono text-3xl font-extrabold text-ink-900">
                  {counts.openIssues}
                </p>
                <p className="m-0 mt-1 text-xs text-ink-500">
                  Audited guest & stay support reports →
                </p>
              </Link>

              <Link
                href="/admin/settlements"
                className="rounded-3xl border border-ink-100 bg-white p-6 transition hover:border-ink-900"
              >
                <span className="text-xs font-bold uppercase tracking-wider text-brass-700">
                  Ledger & Caution Queue
                </span>
                <p className="m-0 mt-2 font-mono text-3xl font-extrabold text-ink-900">
                  {counts.pendingLedger}
                </p>
                <p className="m-0 mt-1 text-xs text-ink-500">
                  Pending payout reconciliation entries →
                </p>
              </Link>

              <Link
                href="/admin/audit"
                className="rounded-3xl border border-ink-100 bg-white p-6 transition hover:border-ink-900"
              >
                <span className="text-xs font-bold uppercase tracking-wider text-brass-700">
                  Governance & Directory
                </span>
                <p className="m-0 mt-2 serif text-2xl font-medium text-ink-900">
                  Accounts & Audit Log
                </p>
                <p className="m-0 mt-1 text-xs text-ink-500">
                  Inspect immutable operational trail →
                </p>
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-ink-100 bg-white p-5">
              <div>
                <p className="m-0 text-sm font-bold text-ink-900">
                  48-hour unpaid booking hold maintenance
                </p>
                <p className="m-0 text-xs text-ink-500">
                  Expires overdue awaiting-payment holds and logs each release in the audit trail.
                </p>
              </div>
              <button
                type="button"
                disabled={sweeping}
                onClick={() => void sweepOverdueHolds()}
                className="secondary-button min-h-[42px]"
              >
                {sweeping ? 'Sweeping…' : 'Sweep overdue holds'}
              </button>
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
