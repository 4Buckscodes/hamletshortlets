'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  PauseCircle,
  PlayCircle,
  Plus,
  Share2,
} from 'lucide-react';
import {
  getBrowserSupabase,
  isMissingSchemaObjectError,
  PARTNER_PROPERTY_SELECT,
} from '@/lib/next-supabase';
import { PartnerShareActions } from '@/components/share/PartnerShareActions';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import { PartnerNav } from './partner-nav';

type PartnerProperty = {
  id: string;
  title: string;
  area: string;
  property_type: string | null;
  bedrooms: number | null;
  capacity: number | null;
  nightly_rate: number;
  status: string;
  trust_label: string;
  review_note: string | null;
  updated_at: string;
  allow_partner_sharing?: boolean;
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
  const [shareFlagsDeployed, setShareFlagsDeployed] = useState(false);
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

    const [{ data: profile }, { data: applications }] = await Promise.all([
      db
        .from('profiles')
        .select('role,full_name')
        .eq('id', user.id)
        .maybeSingle(),
      db
        .from('partner_applications')
        .select('role,status')
        .eq('applicant_id', user.id)
        .in('status', ['pending', 'needs_correction'])
        .order('submitted_at', { ascending: false })
        .limit(1),
    ]);

    const application = applications?.[0];
    const hasPendingInventoryApplication =
      Boolean(application) &&
      ['Property owner', 'Authorised manager', 'Multi-property operator'].includes(
        String(application?.role),
      );
    const profileRole = String(profile?.role || 'guest');
    const userRole =
      profileRole === 'guest' && hasPendingInventoryApplication
        ? 'partner_applicant'
        : profileRole;
    setRole(userRole);
    setPartnerName(String(profile?.full_name || ''));

    if (!['partner', 'partner_applicant', 'admin'].includes(userRole)) {
      setLoading(false);
      return;
    }

    const [propResult, shareFlagResult, bookingResult] = await Promise.all([
      db
        .from('properties')
        .select(PARTNER_PROPERTY_SELECT)
        .order('updated_at', { ascending: false }),
      db.from('properties').select('id,allow_partner_sharing'),
      db
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .in('status', ['requested', 'checking']),
    ]);

    const flagMap = new Map<string, boolean>();
    if (!shareFlagResult.error && Array.isArray(shareFlagResult.data)) {
      setShareFlagsDeployed(true);
      for (const row of shareFlagResult.data as Array<{
        id: string;
        allow_partner_sharing?: boolean;
      }>) {
        flagMap.set(row.id, row.allow_partner_sharing !== false);
      }
    } else if (!isMissingSchemaObjectError(shareFlagResult.error)) {
      setShareFlagsDeployed(false);
    }

    if (propResult.error) {
      setError('We could not load your properties. Refresh and try again.');
    } else {
      const merged = ((propResult.data || []) as unknown as PartnerProperty[]).map(
        row => ({
          ...row,
          allow_partner_sharing: flagMap.has(row.id)
            ? flagMap.get(row.id)
            : true,
        }),
      );
      setProperties(merged);
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

  async function toggleNetworkSharing(property: PartnerProperty) {
    if (!db) return;
    const nextValue = property.allow_partner_sharing === false;
    setBusyId(property.id);
    setError('');
    setNotice('');
    try {
      const { error: rpcError } = await db.rpc('set_property_sharing_permission', {
        target_property_id: property.id,
        allow_sharing: nextValue,
      });
      if (rpcError) throw new Error(rpcError.message);
      setNotice(
        nextValue
          ? `"${property.title}" is now open to HAMLET partner network sharing.`
          : `"${property.title}" is restricted to direct owner and manager sharing only.`,
      );
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Could not update partner sharing permission.',
      );
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <main className="shell flex-1 py-6 sm:py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Partner Workspace</p>
            <h1 className="serif mt-2 text-3xl font-medium text-ink-900 sm:text-5xl">
              {partnerName
                ? `${partnerName.split(' ')[0]}’s partner desk`
                : 'Manage stays & bookings'}
            </h1>
          </div>
          {(['partner', 'partner_applicant', 'admin'].includes(role)) && (
            <Link
              href="/partners/properties/new"
              className="inline-flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-full border border-brass-400/70 bg-ink-900 px-6 text-[15px] font-extrabold text-white shadow-[0_12px_28px_-12px_rgba(14,31,59,0.6)] transition hover:-translate-y-0.5 hover:border-brass-400 hover:bg-ink-800 sm:w-auto sm:shrink-0"
            >
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brass-500 text-ink-950">
                <Plus className="h-4 w-4 stroke-[2.75]" />
              </span>
              <span>Add a new listing</span>
            </Link>
          )}
        </div>

        {(role === 'partner' || role === 'admin') && (
          <div className="mt-5">
            <PartnerNav current="overview" hideNewListingAction />
          </div>
        )}

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
        ) : !['partner', 'partner_applicant', 'admin'].includes(role) ? (
          <section className="mt-8 max-w-2xl rounded-3xl border border-ink-200 bg-white p-7">
            <h2 className="serif m-0 text-2xl font-medium text-ink-900">
              Partner application received
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              Your partner application is being reviewed. You can already upload properties for HAMLET review. Booking operations and earnings access become available after partner verification.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/partners/properties/new" className="primary-button">
                Upload your first property →
              </Link>
              <Link href="/account" className="secondary-button">
                Back to guest account
              </Link>
            </div>
          </section>
        ) : (
          <>
            {/* Summary Metrics */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-7 sm:grid-cols-4 sm:gap-3.5">
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

            {/* HAMLET Share Engine Banner */}
            <section className="mt-6 flex flex-col justify-between gap-4 rounded-3xl border border-brass-300/60 bg-ink-950 p-5 text-white sm:flex-row sm:items-center sm:p-6">
              <div className="max-w-2xl">
                <p className="m-0 text-[11px] font-extrabold uppercase tracking-widest text-brass-400">
                  HAMLET Share Engine
                </p>
                <h2 className="serif m-0 mt-1 text-xl font-medium text-white sm:text-2xl">
                  Market approved stays on WhatsApp with tracked attribution
                </h2>
                <p className="m-0 mt-1 text-xs leading-relaxed text-white/75">
                  Share verified Lagos listings with one tap, download branded cards and QR codes, and track visits through completed stays.
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <Link
                  href="/partners/marketing"
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-full bg-brass-500 px-4 text-xs font-extrabold text-ink-950 transition hover:bg-brass-400"
                >
                  <Share2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Open Share & Studio</span>
                </Link>
                <Link
                  href="/partners/analytics"
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 text-xs font-bold text-white transition hover:bg-white/20"
                >
                  <BarChart3 className="h-3.5 w-3.5 shrink-0" />
                  <span>My performance</span>
                </Link>
              </div>
            </section>

            {/* Properties Section */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <h2 className="serif m-0 text-2xl font-medium text-ink-900">
                Your properties ({properties.length})
              </h2>
              <Link href="/partners/properties/new" className="primary-button">
                <Plus className="h-4 w-4 shrink-0" />
                Add a new listing
              </Link>
            </div>

            {properties.length > 0 ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {properties.map(p => (
                  <article
                    key={p.id}
                    className="flex flex-col justify-between rounded-3xl border border-ink-100 bg-white p-5 sm:p-6"
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

                      {p.status === 'approved' && (
                        <div className="mt-4 rounded-2xl border border-ink-100 bg-paper/70 p-3.5">
                          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink-700">
                              Instant distribution
                            </span>
                            {shareFlagsDeployed && (
                              <button
                                type="button"
                                disabled={busyId === p.id}
                                onClick={() => void toggleNetworkSharing(p)}
                                className="cursor-pointer text-[11px] font-bold text-brass-700 underline underline-offset-2 hover:text-ink-950 disabled:opacity-50"
                              >
                                {p.allow_partner_sharing === false
                                  ? 'Network sharing: Off (Enable)'
                                  : 'Network sharing: Open'}
                              </button>
                            )}
                          </div>
                          <PartnerShareActions
                            stay={{
                              id: p.id,
                              title: p.title,
                              area: p.area,
                              propertyType: p.property_type,
                              bedrooms: p.bedrooms,
                              capacity: p.capacity,
                              ownerNightlyRateNgn: p.nightly_rate,
                            }}
                          />
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
              <div className="mt-5 rounded-3xl border border-dashed border-ink-300 bg-white p-8 text-center sm:p-10">
                <h3 className="serif text-2xl font-medium text-ink-900">
                  No direct properties submitted yet
                </h3>
                <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-ink-600">
                  You can submit a property you own or manage, or browse approved HAMLET stays in Share & Studio to refer guests immediately.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <Link href="/partners/properties/new" className="primary-button">
                    <Plus className="h-4 w-4 shrink-0" />
                    Add a new listing
                  </Link>
                  <Link href="/partners/marketing" className="secondary-button">
                    Browse stays to share →
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
