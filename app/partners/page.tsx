'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, PauseCircle, PlayCircle, Plus } from 'lucide-react';
import {
  getBrowserSupabase,
  PARTNER_PROPERTY_SELECT,
} from '@/lib/next-supabase';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import { PartnerNav } from './partner-nav';

type PartnerProperty = {
  id: string;
  title: string;
  area: string;
  nightly_rate: number;
  status: string;
  trust_label: string;
  review_note: string | null;
  updated_at: string;
};

const STATUS_BADGE: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  pending_review: 'Under review',
  needs_correction: 'Correction requested',
  approved: 'Live on marketplace',
  paused: 'Paused by partner',
  suspended: 'Suspended by ops',
  rejected: 'Not approved',
};

export default function PartnerDashboardPage() {
  const db = useMemo(() => getBrowserSupabase(), []);
  const [role, setRole] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [properties, setProperties] = useState<PartnerProperty[]>([]);
  const [pendingBookingCount, setPendingBookingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!db) {
      setError('Partner workspace is not configured on this deployment.');
      setLoading(false);
      return;
    }
    const { data: session } = await db.auth.getSession();
    const user = session.session?.user;
    if (!user) {
      window.location.assign('/signin?next=/partners');
      return;
    }

    const { data: profile } = await db
      .from('profiles')
      .select('role,full_name')
      .eq('id', user.id)
      .maybeSingle();

    const userRole = String(profile?.role || 'guest');
    setRole(userRole);
    setPartnerName(String(profile?.full_name || ''));

    if (userRole !== 'partner' && userRole !== 'admin') {
      setLoading(false);
      return;
    }

    const [propResult, bookingResult] = await Promise.all([
      db
        .from('properties')
        .select(PARTNER_PROPERTY_SELECT)
        .order('updated_at', { ascending: false }),
      db
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .in('status', ['requested', 'checking']),
    ]);

    if (propResult.error) {
      setError('We could not load your properties. Refresh and try again.');
    } else {
      setProperties((propResult.data || []) as unknown as PartnerProperty[]);
      setError('');
    }
    setPendingBookingCount(bookingResult.count || 0);
    setLoading(false);
  }, [db]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function togglePause(property: PartnerProperty) {
    if (!db) return;
    setBusyId(property.id);
    setError('');
    setNotice('');
    try {
      if (property.status === 'approved') {
        const { error: rpcError } = await db.rpc('set_property_publication_pause', {
          target_property_id: property.id,
          paused: true,
          pause_note: 'Paused from partner dashboard.',
        });
        if (rpcError) throw new Error(rpcError.message);
        setNotice(`"${property.title}" is now paused and hidden from new search results.`);
      } else if (property.status === 'paused') {
        const { error: rpcError } = await db.rpc('set_property_publication_pause', {
          target_property_id: property.id,
          paused: false,
          pause_note: 'Resumed from partner dashboard.',
        });
        if (rpcError) throw new Error(rpcError.message);
        setNotice(`"${property.title}" is live on the marketplace again.`);
      }
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not update listing status.',
      );
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <main className="shell flex-1 py-8 sm:py-12">
        <div className="workspace-heading flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Partner Workspace</p>
            <h1 className="serif mt-2 text-3xl font-medium text-ink-900 sm:text-5xl">
              {partnerName
                ? `${partnerName.split(' ')[0]}’s partner desk`
                : 'Manage stays & bookings'}
            </h1>
          </div>
          {(role === 'partner' || role === 'admin') && (
            <PartnerNav current="overview" />
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
        {notice && (
          <p
            role="status"
            className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800"
          >
            {notice}
          </p>
        )}

        {loading ? (
          <p role="status" className="mt-8 text-sm text-ink-600">
            Loading partner workspace…
          </p>
        ) : role !== 'partner' && role !== 'admin' ? (
          <section className="mt-8 max-w-2xl rounded-3xl border border-ink-200 bg-white p-7">
            <h2 className="serif m-0 text-2xl font-medium text-ink-900">
              Partner approval required
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              Your account currently has guest access. Apply or check your application status to unlock property submissions, calendar controls and referral earnings.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/partners/apply" className="primary-button">
                Open partner application →
              </Link>
              <Link href="/account" className="secondary-button">
                Back to guest account
              </Link>
            </div>
          </section>
        ) : (
          <>
            {/* Summary Metrics */}
            <div className="mt-7 grid gap-3.5 sm:grid-cols-4">
              <div className="rounded-2xl border border-ink-100 bg-white p-4">
                <p className="m-0 text-xs font-semibold text-ink-500">Total listings</p>
                <p className="m-0 mt-1 font-mono text-2xl font-extrabold text-ink-900">
                  {properties.length}
                </p>
              </div>
              <div className="rounded-2xl border border-ink-100 bg-white p-4">
                <p className="m-0 text-xs font-semibold text-ink-500">Live on marketplace</p>
                <p className="m-0 mt-1 font-mono text-2xl font-extrabold text-emerald-800">
                  {properties.filter(p => p.status === 'approved').length}
                </p>
              </div>
              <div className="rounded-2xl border border-ink-100 bg-white p-4">
                <p className="m-0 text-xs font-semibold text-ink-500">Needs correction / draft</p>
                <p className="m-0 mt-1 font-mono text-2xl font-extrabold text-amber-800">
                  {
                    properties.filter(p =>
                      ['needs_correction', 'draft'].includes(p.status),
                    ).length
                  }
                </p>
              </div>
              <Link
                href="/partners/bookings"
                className="rounded-2xl border border-ink-100 bg-white p-4 transition hover:border-ink-900"
              >
                <p className="m-0 text-xs font-semibold text-ink-500">
                  Booking requests awaiting response
                </p>
                <p className="m-0 mt-1 font-mono text-2xl font-extrabold text-brass-700">
                  {pendingBookingCount} →
                </p>
              </Link>
            </div>

            {/* Properties Section */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <h2 className="serif m-0 text-2xl font-medium text-ink-900">
                Your properties ({properties.length})
              </h2>
              <Link href="/partners/properties/new" className="primary-button">
                <Plus className="h-4 w-4 shrink-0" />
                Submit a new stay
              </Link>
            </div>

            {properties.length > 0 ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {properties.map(p => (
                  <article
                    key={p.id}
                    className="flex flex-col justify-between rounded-3xl border border-ink-100 bg-white p-6"
                  >
                    <div>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-brass-700">
                            {p.area} · Lagos
                          </span>
                          <h3 className="serif m-0 mt-1 text-2xl font-medium text-ink-900">
                            {p.title}
                          </h3>
                        </div>
                        <span className="rounded-full bg-paper px-3 py-1 text-xs font-bold text-ink-800">
                          {STATUS_BADGE[p.status] || p.status}
                        </span>
                      </div>

                      <p className="m-0 mt-2 text-xs text-ink-500">
                        Owner base rate:{' '}
                        <strong className="font-mono text-ink-900">
                          ₦{Number(p.nightly_rate || 0).toLocaleString('en-NG')}/night
                        </strong>{' '}
                        · Trust label: {p.trust_label}
                      </p>

                      {p.review_note && (
                        <div className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" />
                          <span>
                            <strong>Review note:</strong> {p.review_note}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2 border-t border-ink-100 pt-4">
                      <Link
                        href={`/partners/properties/${encodeURIComponent(p.id)}/edit`}
                        className="secondary-button min-h-[42px]"
                      >
                        {['needs_correction', 'draft'].includes(p.status)
                          ? 'Edit & resubmit'
                          : 'Manage listing'}
                      </Link>

                      <Link
                        href={`/partners/availability?property=${encodeURIComponent(p.id)}`}
                        className="secondary-button min-h-[42px]"
                      >
                        Calendar
                      </Link>

                      {(p.status === 'approved' || p.status === 'paused') && (
                        <button
                          type="button"
                          disabled={busyId === p.id}
                          onClick={() => void togglePause(p)}
                          className="secondary-button min-h-[42px]"
                        >
                          {p.status === 'approved' ? (
                            <>
                              <PauseCircle className="h-4 w-4 shrink-0" />
                              Pause
                            </>
                          ) : (
                            <>
                              <PlayCircle className="h-4 w-4 shrink-0" />
                              Resume
                            </>
                          )}
                        </button>
                      )}

                      {p.status === 'approved' && (
                        <Link
                          href={`/stays/${encodeURIComponent(p.id)}`}
                          className="secondary-button min-h-[42px]"
                        >
                          Public page →
                        </Link>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-3xl border border-dashed border-ink-300 bg-white p-10 text-center">
                <h3 className="serif text-2xl font-medium text-ink-900">
                  No properties submitted yet
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">
                  Use the 7-step listing wizard to upload photos, preview guest pricing, save drafts and submit your first Lagos stay for HAMLET review.
                </p>
                <div className="mt-5">
                  <Link href="/partners/properties/new" className="primary-button">
                    Start 7-step listing wizard →
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
