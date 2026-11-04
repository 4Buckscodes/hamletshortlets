'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Info, Share2 } from 'lucide-react';
import { getBrowserSupabase, isMissingSchemaObjectError } from '@/lib/next-supabase';
import { formatNaira } from '@/lib/pricing';
import type { PartnerMarketingPerformance } from '@/lib/share-engine';
import { PartnerShareActions } from '@/components/share/PartnerShareActions';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import { PartnerNav } from '../partner-nav';

type WindowOption = {
  id: '7d' | '30d' | '90d' | 'all';
  label: string;
  days: number | null;
};

const WINDOWS: WindowOption[] = [
  { id: '7d', label: 'Last 7 days', days: 7 },
  { id: '30d', label: 'Last 30 days', days: 30 },
  { id: '90d', label: 'Last 90 days', days: 90 },
  { id: 'all', label: 'All time', days: null },
];

const EMPTY_PERFORMANCE: PartnerMarketingPerformance = {
  window_days: null,
  events: {
    share_initiated: 0,
    whatsapp_handoff: 0,
    link_copied: 0,
    card_generated: 0,
    qr_generated: 0,
    link_visited: 0,
    unique_visitors: 0,
    enquiries_generated: 0,
  },
  financials: {
    booking_requests: 0,
    open_booking_requests: 0,
    confirmed_bookings: 0,
    completed_bookings: 0,
    potential_opportunity_ngn: 0,
    earnings_pending_ngn: 0,
    earnings_eligible_ngn: 0,
    earnings_paid_ngn: 0,
    earnings_reversed_ngn: 0,
  },
  properties: [],
};

export default function PartnerMarketingAnalyticsPage() {
  const db = useMemo(() => getBrowserSupabase(), []);
  const [role, setRole] = useState('');
  const [selectedWindow, setSelectedWindow] = useState<WindowOption>(WINDOWS[1]);
  const [data, setData] = useState<PartnerMarketingPerformance>(EMPTY_PERFORMANCE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(
    async (windowOpt: WindowOption) => {
      if (!db) {
        setError('Partner workspace is not configured on this deployment.');
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data: sessionRes } = await db.auth.getSession();
      const user = sessionRes.session?.user;
      if (!user) {
        window.location.assign('/signin?next=/partners/analytics');
        return;
      }

      const { data: profile } = await db
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const userRole = String(profile?.role || 'guest');
      setRole(userRole);
      if (userRole !== 'partner' && userRole !== 'admin') {
        setLoading(false);
        return;
      }

      const { data: perfData, error: rpcError } = await db.rpc(
        'get_my_marketing_performance',
        {
          window_days: windowOpt.days,
        },
      );

      if (!rpcError && perfData) {
        const parsed = perfData as PartnerMarketingPerformance;
        setData({
          window_days: parsed.window_days ?? windowOpt.days,
          events: {
            ...EMPTY_PERFORMANCE.events,
            ...(parsed.events || {}),
          },
          financials: {
            ...EMPTY_PERFORMANCE.financials,
            ...(parsed.financials || {}),
          },
          properties: Array.isArray(parsed.properties) ? parsed.properties : [],
        });
        setError('');
      } else if (isMissingSchemaObjectError(rpcError)) {
        setData(EMPTY_PERFORMANCE);
        setError('');
      } else if (rpcError) {
        setError(rpcError.message || 'Could not load marketing performance.');
      }

      setLoading(false);
    },
    [db],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load(selectedWindow);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load, selectedWindow]);

  const ev = data.events;
  const fin = data.financials;
  const conversionPct =
    ev.unique_visitors > 0
      ? Math.min(100, (fin.confirmed_bookings / ev.unique_visitors) * 100)
      : 0;

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <main className="shell flex-1 py-8 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Partner Distribution Analytics</p>
            <h1 className="serif mt-2 text-3xl font-medium text-ink-900 sm:text-5xl">
              My Marketing Performance
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-600">
              Live share, visit, enquiry, booking, and commission settlement metrics reconciled directly with the HAMLET ledger.
            </p>
          </div>
          {(role === 'partner' || role === 'admin') && (
            <PartnerNav current="analytics" />
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800"
          >
            {error}
          </p>
        )}

        {role !== 'partner' && role !== 'admin' && !loading ? (
          <section className="mt-8 max-w-2xl rounded-3xl border border-ink-200 bg-white p-7">
            <h2 className="serif m-0 text-2xl font-medium text-ink-900">
              Partner approval required
            </h2>
            <div className="mt-4">
              <Link href="/partners/apply" className="primary-button">
                Join Partner Network →
              </Link>
            </div>
          </section>
        ) : (
          <>
            {/* Time Window Selector */}
            <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
              <div
                role="group"
                aria-label="Analytics time window"
                className="flex flex-wrap gap-2"
              >
                {WINDOWS.map(w => {
                  const active = selectedWindow.id === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setSelectedWindow(w)}
                      className={
                        active
                          ? 'min-h-[40px] cursor-pointer rounded-full bg-ink-950 px-4 text-xs font-bold text-white'
                          : 'min-h-[40px] cursor-pointer rounded-full border border-ink-200 bg-white px-4 text-xs font-bold text-ink-700 hover:border-ink-900'
                      }
                    >
                      {w.label}
                    </button>
                  );
                })}
              </div>

              <Link
                href="/partners/marketing"
                className="secondary-button min-h-[40px] text-xs"
              >
                <Share2 className="h-3.5 w-3.5 shrink-0" />
                <span>Share a stay</span>
              </Link>
            </div>

            {/* Funnel Metrics */}
            <section aria-label="Distribution funnel metrics" className="mt-6">
              <h2 className="serif m-0 text-xl font-medium text-ink-900 sm:text-2xl">
                Distribution & conversion funnel
              </h2>

              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-ink-100 bg-white p-4">
                  <p className="m-0 text-xs font-semibold text-ink-500">
                    Shares initiated
                  </p>
                  <p className="m-0 mt-1 font-mono text-2xl font-extrabold text-ink-950">
                    {ev.share_initiated}
                  </p>
                  <p className="m-0 mt-1 text-[11px] text-ink-500">
                    {ev.card_generated} cards · {ev.qr_generated} QRs
                  </p>
                </div>

                <div className="rounded-2xl border border-ink-100 bg-white p-4">
                  <p className="m-0 text-xs font-semibold text-ink-500">
                    WhatsApp handoffs
                  </p>
                  <p className="m-0 mt-1 font-mono text-2xl font-extrabold text-emerald-800">
                    {ev.whatsapp_handoff}
                  </p>
                  <p className="m-0 mt-1 text-[11px] text-ink-500">
                    {ev.link_copied} links copied
                  </p>
                </div>

                <div className="rounded-2xl border border-ink-100 bg-white p-4">
                  <p className="m-0 text-xs font-semibold text-ink-500">
                    Property link visits
                  </p>
                  <p className="m-0 mt-1 font-mono text-2xl font-extrabold text-ink-950">
                    {ev.link_visited}
                  </p>
                  <p className="m-0 mt-1 text-[11px] text-ink-500">
                    {ev.unique_visitors} unique visitors
                  </p>
                </div>

                <div className="rounded-2xl border border-ink-100 bg-white p-4">
                  <p className="m-0 text-xs font-semibold text-ink-500">
                    Enquiries & requests
                  </p>
                  <p className="m-0 mt-1 font-mono text-2xl font-extrabold text-ink-950">
                    {fin.booking_requests}
                  </p>
                  <p className="m-0 mt-1 text-[11px] text-ink-500">
                    {ev.enquiries_generated} guest enquiries
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-ink-100 bg-white p-4">
                  <p className="m-0 text-xs font-semibold text-ink-500">
                    Confirmed bookings
                  </p>
                  <p className="m-0 mt-1 font-mono text-2xl font-extrabold text-emerald-800">
                    {fin.confirmed_bookings}
                  </p>
                </div>

                <div className="rounded-2xl border border-ink-100 bg-white p-4">
                  <p className="m-0 text-xs font-semibold text-ink-500">
                    Completed stays
                  </p>
                  <p className="m-0 mt-1 font-mono text-2xl font-extrabold text-ink-950">
                    {fin.completed_bookings}
                  </p>
                </div>

                <div className="rounded-2xl border border-ink-100 bg-white p-4">
                  <p className="m-0 text-xs font-semibold text-ink-500">
                    Unique visitor → booking rate
                  </p>
                  <p className="m-0 mt-1 font-mono text-2xl font-extrabold text-brass-700">
                    {conversionPct.toFixed(1)}%
                  </p>
                </div>
              </div>

              <p className="m-0 mt-3 flex items-start gap-2 text-xs text-ink-500">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" />
                <span>
                  WhatsApp handoffs record when you open WhatsApp from HAMLET; WhatsApp does not report back whether a message was ultimately sent.
                </span>
              </p>
            </section>

            {/* Financial Settlement Breakdown */}
            <section aria-label="Commission and settlement breakdown" className="mt-8">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="serif m-0 text-xl font-medium text-ink-900 sm:text-2xl">
                  Attributed commission ledger
                </h2>
                <Link
                  href="/partners/earnings"
                  className="text-xs font-bold text-brass-700 underline underline-offset-2 hover:text-ink-950"
                >
                  Open full payout ledger →
                </Link>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-ink-100 bg-white p-4">
                  <p className="m-0 text-xs font-semibold text-ink-500">
                    Potential opportunity
                  </p>
                  <p className="m-0 mt-1 font-mono text-xl font-extrabold text-ink-700">
                    {formatNaira(fin.potential_opportunity_ngn)}
                  </p>
                  <p className="m-0 mt-1 text-[11px] text-ink-500">
                    Unpaid booking requests (not yet earned)
                  </p>
                </div>

                <div className="rounded-2xl border border-ink-100 bg-white p-4">
                  <p className="m-0 text-xs font-semibold text-ink-500">
                    Pending completion
                  </p>
                  <p className="m-0 mt-1 font-mono text-xl font-extrabold text-amber-800">
                    {formatNaira(fin.earnings_pending_ngn)}
                  </p>
                  <p className="m-0 mt-1 text-[11px] text-ink-500">
                    Confirmed stays awaiting guest checkout
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                  <p className="m-0 text-xs font-semibold text-emerald-900">
                    Eligible for payout
                  </p>
                  <p className="m-0 mt-1 font-mono text-xl font-extrabold text-emerald-800">
                    {formatNaira(fin.earnings_eligible_ngn)}
                  </p>
                  <p className="m-0 mt-1 text-[11px] text-emerald-800/80">
                    Completed stays approved in ledger
                  </p>
                </div>

                <div className="rounded-2xl border border-ink-100 bg-white p-4">
                  <p className="m-0 text-xs font-semibold text-ink-500">
                    Paid & settled
                  </p>
                  <p className="m-0 mt-1 font-mono text-xl font-extrabold text-ink-950">
                    {formatNaira(fin.earnings_paid_ngn)}
                  </p>
                  <p className="m-0 mt-1 text-[11px] text-ink-500">
                    {fin.earnings_reversed_ngn > 0
                      ? `Reversed/refunded: ${formatNaira(fin.earnings_reversed_ngn)}`
                      : 'Caution deposits excluded from commissions'}
                  </p>
                </div>
              </div>
            </section>

            {/* Property-by-Property Breakdown */}
            <section aria-label="Property performance breakdown" className="mt-9">
              <h2 className="serif m-0 text-xl font-medium text-ink-900 sm:text-2xl">
                Performance by property
              </h2>

              {loading ? (
                <p role="status" className="mt-4 text-xs text-ink-500">
                  Refreshing property metrics…
                </p>
              ) : data.properties.length === 0 ? (
                <div className="mt-4 rounded-3xl border border-dashed border-ink-300 bg-white p-8 text-center">
                  <p className="m-0 text-sm font-bold text-ink-900">
                    No tracked shares or attributed bookings yet
                  </p>
                  <p className="mx-auto mt-1 max-w-md text-xs text-ink-600">
                    Share an approved stay on WhatsApp or download a QR flyer from Share & Studio to start tracking visits and bookings here.
                  </p>
                  <div className="mt-4">
                    <Link href="/partners/marketing" className="primary-button text-xs">
                      Open Share & Studio →
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  {/* Mobile cards (< md) for zero horizontal scroll */}
                  <div className="mt-4 space-y-3 md:hidden">
                    {data.properties.map(row => (
                      <article
                        key={row.property_id}
                        className="rounded-2xl border border-ink-100 bg-white p-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="m-0 text-[11px] font-extrabold uppercase tracking-wider text-brass-700">
                              {row.area || 'Lagos'}
                            </p>
                            <h3 className="m-0 mt-0.5 text-sm font-bold text-ink-950">
                              {row.title}
                            </h3>
                          </div>
                          <span className="rounded-full bg-paper px-2.5 py-0.5 text-[10px] font-bold text-ink-700">
                            {row.shares} shares
                          </span>
                        </div>

                        <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-ink-100 pt-3 text-xs">
                          <div>
                            <dt className="text-[10px] text-ink-500">Visits</dt>
                            <dd className="m-0 font-mono font-bold text-ink-900">
                              {row.visits} ({row.unique_visitors}u)
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[10px] text-ink-500">Requests</dt>
                            <dd className="m-0 font-mono font-bold text-ink-900">
                              {row.booking_requests} ({row.enquiries} enq)
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[10px] text-ink-500">Confirmed</dt>
                            <dd className="m-0 font-mono font-bold text-emerald-800">
                              {row.confirmed_bookings} ({row.completed_bookings} done)
                            </dd>
                          </div>
                        </dl>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 pt-3 text-xs">
                          <span className="text-ink-600">
                            Eligible / Paid:{' '}
                            <strong className="font-mono text-ink-950">
                              {formatNaira(
                                row.eligible_earnings_ngn + row.paid_earnings_ngn,
                              )}
                            </strong>
                          </span>
                          <PartnerShareActions
                            compact
                            stay={{
                              id: row.property_id,
                              title: row.title,
                              area: row.area,
                            }}
                          />
                        </div>
                      </article>
                    ))}
                  </div>

                  {/* Desktop table (md+) */}
                  <div className="mt-4 hidden overflow-hidden rounded-3xl border border-ink-100 bg-white md:block">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-ink-100 bg-paper/70 text-[11px] font-extrabold uppercase tracking-wider text-ink-600">
                          <th className="px-5 py-3.5">Property</th>
                          <th className="px-3 py-3.5">Shares</th>
                          <th className="px-3 py-3.5">Visits (Unique)</th>
                          <th className="px-3 py-3.5">Enquiries</th>
                          <th className="px-3 py-3.5">Requests</th>
                          <th className="px-3 py-3.5">Confirmed / Done</th>
                          <th className="px-3 py-3.5">Pending / Eligible / Paid</th>
                          <th className="px-5 py-3.5 text-right">Quick share</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-100">
                        {data.properties.map(row => (
                          <tr key={row.property_id} className="hover:bg-paper/40">
                            <td className="px-5 py-4">
                              <p className="m-0 font-bold text-ink-950">
                                <Link
                                  href={`/stays/${encodeURIComponent(row.property_id)}`}
                                  className="hover:underline"
                                >
                                  {row.title}
                                </Link>
                              </p>
                              <p className="m-0 mt-0.5 text-[11px] text-ink-500">
                                {row.area || 'Lagos'}
                              </p>
                            </td>
                            <td className="px-3 py-4 font-mono text-ink-800">
                              {row.shares}
                            </td>
                            <td className="px-3 py-4 font-mono font-bold text-ink-900">
                              {row.visits}{' '}
                              <span className="font-normal text-ink-500">
                                ({row.unique_visitors})
                              </span>
                            </td>
                            <td className="px-3 py-4 font-mono text-ink-800">
                              {row.enquiries}
                            </td>
                            <td className="px-3 py-4 font-mono text-ink-900">
                              {row.booking_requests}
                            </td>
                            <td className="px-3 py-4 font-mono">
                              <span className="font-bold text-emerald-800">
                                {row.confirmed_bookings}
                              </span>{' '}
                              / {row.completed_bookings}
                            </td>
                            <td className="px-3 py-4 font-mono text-[11px]">
                              <span className="text-amber-800">
                                {formatNaira(row.pending_earnings_ngn)}
                              </span>{' '}
                              ·{' '}
                              <span className="font-bold text-emerald-800">
                                {formatNaira(row.eligible_earnings_ngn)}
                              </span>{' '}
                              ·{' '}
                              <span className="text-ink-950">
                                {formatNaira(row.paid_earnings_ngn)}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <div className="inline-block">
                                <PartnerShareActions
                                  compact
                                  stay={{
                                    id: row.property_id,
                                    title: row.title,
                                    area: row.area,
                                  }}
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
