'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  getBrowserSupabase,
  isMissingSchemaObjectError,
  PARTNER_PROPERTY_SELECT,
} from '@/lib/next-supabase';
import {
  TRUST_CHECK_DEFINITIONS,
  type TrustCheckCode,
  type TrustCheckStatus,
} from '@/lib/competitive-readiness';
import { formatDate } from '@/lib/pricing';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import {
  FocusedDrawer,
  FormField,
  FIELD_INPUT_CLASS,
} from '@/components/forms/ProgressiveFormPrimitives';
import { AdminNav } from '../admin-nav';

type PropertyRow = {
  id: string;
  title: string;
  area: string;
  public_address: string;
  nightly_rate: number;
  cleaning_fee: number;
  refundable_deposit: number;
  bedrooms: number;
  bathrooms: number;
  capacity: number;
  image_urls: string[];
  status: string;
  trust_label: string;
  verification: Record<string, string> | null;
  review_note: string | null;
  updated_at: string;
};

type AssignmentRow = {
  property_id: string;
  user_id: string;
  access_role: string;
  scope: string;
  commission_rate: number | null;
  commission_note: string | null;
};

type PartnerOption = {
  id: string;
  full_name: string | null;
  email: string;
  partner_role: string | null;
  company: string | null;
  account_status: string;
};

type DuplicateFlagRow = {
  id: string;
  property_id: string;
  matched_property_id: string;
  confidence_score: number;
  match_reasons: string[];
  status: 'open' | 'confirmed_duplicate' | 'distinct_unit_approved' | 'dismissed';
  review_decision_note: string | null;
  created_at: string;
};

type TrustCheckRow = {
  id: string;
  property_id: string;
  check_code: TrustCheckCode;
  status: TrustCheckStatus;
  public_summary: string | null;
  internal_review_note: string | null;
  inspection_outcome: string | null;
  reviewer_label: string;
  reviewed_at: string | null;
};

const PILLARS = ['ownership', 'identity', 'authority', 'inspection'] as const;
const OUTCOMES = ['verified', 'pending_review', 'self_reported', 'missing'] as const;

export default function AdminPropertiesPage() {
  const db = useMemo(() => getBrowserSupabase(), []);
  const [allowed, setAllowed] = useState(false);
  const [items, setItems] = useState<PropertyRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [duplicateFlags, setDuplicateFlags] = useState<DuplicateFlagRow[]>([]);
  const [trustChecks, setTrustChecks] = useState<TrustCheckRow[]>([]);
  const [sprintReady, setSprintReady] = useState(false);
  const [filter, setFilter] = useState<'queue' | 'all' | 'duplicates'>('queue');

  // Duplicate Flag Review Drawer
  const [activeDuplicate, setActiveDuplicate] = useState<DuplicateFlagRow | null>(null);
  const [duplicateDecision, setDuplicateDecision] = useState<
    'confirmed_duplicate' | 'distinct_unit_approved' | 'dismissed'
  >('distinct_unit_approved');
  const [duplicateSuspend, setDuplicateSuspend] = useState(false);
  const [duplicateNote, setDuplicateNote] = useState('');

  // Structured 7-Check Trust Profile Drawer
  const [trustTarget, setTrustTarget] = useState<PropertyRow | null>(null);
  const [selectedCheckCode, setSelectedCheckCode] =
    useState<TrustCheckCode>('owner_identity_reviewed');
  const [selectedCheckStatus, setSelectedCheckStatus] =
    useState<TrustCheckStatus>('verified');
  const [checkPublicSummary, setCheckPublicSummary] = useState('');
  const [checkInternalNote, setCheckInternalNote] = useState('');
  const [checkInspectionOutcome, setCheckInspectionOutcome] = useState('');

  const [selected, setSelected] = useState<PropertyRow | null>(null);
  const [decision, setDecision] = useState('approved');
  const [pillars, setPillars] = useState<Record<string, string>>({
    ownership: 'pending_review',
    identity: 'pending_review',
    authority: 'pending_review',
    inspection: 'pending_review',
  });
  const [reviewNote, setReviewNote] = useState('');

  const [assignmentTarget, setAssignmentTarget] = useState<PropertyRow | null>(null);
  const [partnerId, setPartnerId] = useState('');
  const [authorityScope, setAuthorityScope] = useState(
    'Verified manager — bookings & calendar',
  );
  const [commissionRate, setCommissionRate] = useState('');
  const [commissionNote, setCommissionNote] = useState('');

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!db) {
      setError('Admin property review is not configured.');
      setLoading(false);
      return;
    }
    const { data: session } = await db.auth.getSession();
    const user = session.session?.user;
    if (!user) {
      window.location.assign('/signin?next=/admin/properties');
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

    const [propRes, accessRes, dirRes, dupRes, trustRes] = await Promise.all([
      db
        .from('properties')
        .select(PARTNER_PROPERTY_SELECT)
        .order('updated_at', { ascending: false }),
      db
        .from('property_access')
        .select('property_id, user_id, access_role, scope, commission_rate, commission_note'),
      db.rpc('get_admin_directory'),
      db
        .from('property_duplicate_flags')
        .select(
          'id,property_id,matched_property_id,confidence_score,match_reasons,status,review_decision_note,created_at',
        )
        .order('confidence_score', { ascending: false }),
      db
        .from('property_trust_checks')
        .select(
          'id,property_id,check_code,status,public_summary,internal_review_note,inspection_outcome,reviewer_label,reviewed_at',
        ),
    ]);

    if (!dupRes.error) {
      setSprintReady(true);
      setDuplicateFlags((dupRes.data || []) as unknown as DuplicateFlagRow[]);
    } else if (isMissingSchemaObjectError(dupRes.error)) {
      setSprintReady(false);
    }

    if (!trustRes.error && Array.isArray(trustRes.data)) {
      setTrustChecks(trustRes.data as unknown as TrustCheckRow[]);
    }

    if (propRes.error) {
      setError('Could not load properties.');
    } else {
      setItems((propRes.data || []) as unknown as PropertyRow[]);
    }
    setAssignments((accessRes.data || []) as AssignmentRow[]);
    setPartners(
      ((dirRes.data || []) as PartnerOption[]).filter(
        u => u.account_status === 'active' && u.partner_role !== undefined,
      ),
    );
    setLoading(false);
  }, [db]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function openReview(prop: PropertyRow) {
    setSelected(prop);
    setDecision(prop.status === 'approved' ? 'needs_correction' : 'approved');
    setPillars({
      ownership: prop.verification?.ownership || 'pending_review',
      identity: prop.verification?.identity || 'pending_review',
      authority: prop.verification?.authority || 'pending_review',
      inspection: prop.verification?.inspection || 'pending_review',
    });
    setReviewNote(
      prop.review_note ||
        (prop.status !== 'approved'
          ? 'Four-pillar review verified by HAMLET operations.'
          : ''),
    );
    setError('');
  }

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || !selected) return;
    if (reviewNote.trim().length < 10) {
      setError(
        'Provide a documented reviewer note of at least 10 characters for the audit log.',
      );
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const { error: rpcError } = await db.rpc('review_partner_property', {
        target_property_id: selected.id,
        next_status: decision,
        reviewer_note: reviewNote.trim(),
        verification_data: pillars,
      });
      if (rpcError) throw new Error(rpcError.message);
      setNotice(`"${selected.title}" updated to ${decision}.`);
      setSelected(null);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Review action failed.');
    } finally {
      setBusy(false);
    }
  }

  async function submitGrantAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || !assignmentTarget || !partnerId) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const parsedRate = commissionRate.trim() ? Number(commissionRate) : null;
      const { error: rpcError } = await db.rpc('grant_property_assignment', {
        target_property_id: assignmentTarget.id,
        target_partner_id: partnerId,
        authority_scope: authorityScope.trim(),
        agreed_commission_rate: Number.isFinite(parsedRate) ? parsedRate : null,
        agreed_commission_note: commissionNote.trim(),
      });
      if (rpcError) throw new Error(rpcError.message);
      setNotice(`Partner access granted on "${assignmentTarget.title}".`);
      setPartnerId('');
      setCommissionRate('');
      setCommissionNote('');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not grant assignment.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRevokeAssignment(propId: string, targetUserId: string) {
    if (!db) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const { error: rpcError } = await db.rpc('revoke_property_assignment', {
        target_property_id: propId,
        target_partner_id: targetUserId,
        revocation_note: 'Revoked via HAMLET Admin Operations Console.',
      });
      if (rpcError) throw new Error(rpcError.message);
      setNotice('Partner assignment revoked.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not revoke assignment.');
    } finally {
      setBusy(false);
    }
  }

  async function handleReviewDuplicateFlag(event: FormEvent) {
    event.preventDefault();
    if (!db || !activeDuplicate) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const { error: rpcErr } = await db.rpc('review_property_duplicate_flag', {
        target_flag_id: activeDuplicate.id,
        decision_status: duplicateDecision,
        decision_note: duplicateNote,
        suspend_flagged_property:
          duplicateDecision === 'confirmed_duplicate' ? duplicateSuspend : false,
      });
      if (rpcErr) throw new Error(rpcErr.message);
      setNotice(`Duplicate flag resolved as ${duplicateDecision.replace(/_/g, ' ')}.`);
      setActiveDuplicate(null);
      setDuplicateNote('');
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not review duplicate flag.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveTrustCheck(event: FormEvent) {
    event.preventDefault();
    if (!db || !trustTarget) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const { error: rpcErr } = await db.rpc('admin_review_property_trust_check', {
        target_property_id: trustTarget.id,
        target_check_code: selectedCheckCode,
        next_status: selectedCheckStatus,
        public_summary_input: checkPublicSummary || null,
        internal_note_input: checkInternalNote,
        inspection_outcome_input: checkInspectionOutcome || null,
      });
      if (rpcErr) throw new Error(rpcErr.message);
      setNotice(
        `Trust check "${selectedCheckCode.replace(/_/g, ' ')}" updated to ${selectedCheckStatus}.`,
      );
      setCheckInternalNote('');
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not update trust check.',
      );
    } finally {
      setBusy(false);
    }
  }

  const displayed =
    filter === 'queue'
      ? items.filter(i =>
          ['submitted', 'pending_review', 'needs_correction'].includes(i.status),
        )
      : items;

  const propById = useMemo(() => {
    const map = new Map<string, PropertyRow>();
    for (const item of items) map.set(item.id, item);
    return map;
  }, [items]);

  const targetAssignments = assignmentTarget
    ? assignments.filter(a => a.property_id === assignmentTarget.id)
    : [];

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <main className="shell flex-1 py-8 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Four-Pillar Listing Verification</p>
            <h1 className="serif mt-2 text-3xl font-medium text-ink-900 sm:text-5xl">
              Property review queue
            </h1>
          </div>
          {allowed && <AdminNav current="properties" />}
        </div>

        {!loading && allowed && (
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={() => setFilter('queue')}
              className={
                filter === 'queue'
                  ? 'primary-button min-h-[40px]'
                  : 'secondary-button min-h-[40px]'
              }
            >
              Review queue (
              {
                items.filter(i =>
                  ['submitted', 'pending_review', 'needs_correction'].includes(
                    i.status,
                  ),
                ).length
              }
              )
            </button>
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={
                filter === 'all'
                  ? 'primary-button min-h-[40px]'
                  : 'secondary-button min-h-[40px]'
              }
            >
              All properties ({items.length})
            </button>
            {sprintReady && (
              <button
                type="button"
                onClick={() => setFilter('duplicates')}
                className={
                  filter === 'duplicates'
                    ? 'primary-button min-h-[40px]'
                    : 'secondary-button min-h-[40px]'
                }
              >
                Duplicate flags (
                {duplicateFlags.filter(f => f.status === 'open').length})
              </button>
            )}
          </div>
        )}

        {error && (
          <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800">
            {error}
          </p>
        )}
        {notice && (
          <p className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
            {notice}
          </p>
        )}

        {loading ? (
          <p className="mt-8 text-sm text-ink-600">Loading property queue…</p>
        ) : !allowed ? (
          <p className="mt-8 text-sm text-red-800">Administrator access required.</p>
        ) : filter === 'duplicates' ? (
          duplicateFlags.length > 0 ? (
            <div className="mt-6 space-y-4">
              {duplicateFlags.map(flag => {
                const flaggedProp = propById.get(flag.property_id);
                const matchedProp = propById.get(flag.matched_property_id);
                return (
                  <article
                    key={flag.id}
                    className="rounded-3xl border border-ink-100 bg-white p-6 text-xs"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <span className="font-mono font-extrabold text-amber-800">
                          {flag.confidence_score}% similarity · {flag.status}
                        </span>
                        <h2 className="serif m-0 mt-1 text-xl font-medium text-ink-900">
                          {flaggedProp?.title || flag.property_id} vs{' '}
                          {matchedProp?.title || flag.matched_property_id}
                        </h2>
                        <p className="m-0 mt-1 text-ink-600">
                          Signals:{' '}
                          {Array.isArray(flag.match_reasons)
                            ? flag.match_reasons.join(', ')
                            : 'similarity match'}
                        </p>
                      </div>
                      {flag.status === 'open' && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDuplicate(flag);
                            setDuplicateDecision('distinct_unit_approved');
                            setDuplicateSuspend(false);
                            setDuplicateNote('');
                          }}
                          className="primary-button min-h-[40px] text-xs"
                        >
                          Investigate & resolve
                        </button>
                      )}
                    </div>
                    {flag.review_decision_note && (
                      <p className="m-0 mt-2 rounded-2xl bg-paper p-3 text-ink-700">
                        <strong>Admin note:</strong> {flag.review_decision_note}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-8 rounded-3xl border border-dashed border-ink-300 bg-white p-10 text-center text-sm text-ink-500">
              No property duplicate flags recorded.
            </div>
          )
        ) : displayed.length > 0 ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {displayed.map(p => (
              <article
                key={p.id}
                className="flex flex-col justify-between rounded-3xl border border-ink-100 bg-white p-6"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-brass-700">
                        {p.area} · {p.bedrooms} bd · up to {p.capacity} guests
                      </span>
                      <h2 className="serif m-0 mt-1 text-2xl font-medium text-ink-900">
                        {p.title}
                      </h2>
                    </div>
                    <span className="rounded-full bg-paper px-3 py-1 text-xs font-bold text-ink-900">
                      {p.status}
                    </span>
                  </div>
                  <p className="m-0 mt-2 text-xs text-ink-500">
                    {p.public_address} · Base B: ₦
                    {Number(p.nightly_rate || 0).toLocaleString('en-NG')}/night ·{' '}
                    {(p.image_urls || []).length} photos
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-ink-100 pt-4">
                  {sprintReady && (
                    <button
                      type="button"
                      onClick={() => {
                        setTrustTarget(p);
                        setCheckInternalNote('');
                      }}
                      className="secondary-button min-h-[42px]"
                    >
                      7-Check Trust (
                      {
                        trustChecks.filter(
                          c => c.property_id === p.id && c.status === 'verified',
                        ).length
                      }
                      /7)
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setAssignmentTarget(p)}
                    className="secondary-button min-h-[42px]"
                  >
                    Assignments (
                    {assignments.filter(a => a.property_id === p.id).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => openReview(p)}
                    className="primary-button min-h-[42px]"
                  >
                    Open review drawer
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-dashed border-ink-300 bg-white p-10 text-center text-sm text-ink-500">
            No properties in this view right now.
          </div>
        )}

        {/* 4-Pillar Review Drawer */}
        <FocusedDrawer
          open={Boolean(selected)}
          title={selected?.title || 'Review property'}
          subtitle={
            selected ? `${selected.area} · Current: ${selected.status}` : undefined
          }
          onClose={() => setSelected(null)}
        >
          {selected && (
            <form onSubmit={submitReview} className="space-y-4">
              {selected.image_urls?.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {selected.image_urls.slice(0, 3).map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt=""
                      className="aspect-[4/3] w-full rounded-xl object-cover opacity-100"
                    />
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {PILLARS.map(pillar => (
                  <FormField
                    key={pillar}
                    label={`${pillar.charAt(0).toUpperCase()}${pillar.slice(1)} pillar`}
                  >
                    {fieldProps => (
                      <select
                        {...fieldProps}
                        value={pillars[pillar]}
                        onChange={e =>
                          setPillars(prev => ({
                            ...prev,
                            [pillar]: e.target.value,
                          }))
                        }
                        className={FIELD_INPUT_CLASS}
                      >
                        {OUTCOMES.map(out => (
                          <option key={out} value={out}>
                            {out.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                    )}
                  </FormField>
                ))}
              </div>

              <FormField label="Publication decision">
                {fieldProps => (
                  <select
                    {...fieldProps}
                    value={decision}
                    onChange={e => setDecision(e.target.value)}
                    className={FIELD_INPUT_CLASS}
                  >
                    <option value="approved">Approve & publish live</option>
                    <option value="needs_correction">Request partner correction</option>
                    <option value="rejected">Reject submission</option>
                    <option value="suspended">Suspend listing</option>
                  </select>
                )}
              </FormField>

              <FormField
                label="Reviewer note (min 10 characters)"
                hint="Shared with the submitting partner."
              >
                {fieldProps => (
                  <textarea
                    {...fieldProps}
                    rows={3}
                    minLength={10}
                    maxLength={800}
                    required
                    value={reviewNote}
                    onChange={e => setReviewNote(e.target.value)}
                    placeholder="Verification note for partner…"
                    className={`${FIELD_INPUT_CLASS} resize-y`}
                  />
                )}
              </FormField>

              <button
                type="submit"
                disabled={busy}
                className="primary-button min-h-[48px] w-full"
              >
                {busy ? 'Recording decision…' : 'Save verification decision'}
              </button>
            </form>
          )}
        </FocusedDrawer>

        {/* Partner Assignment Drawer */}
        <FocusedDrawer
          open={Boolean(assignmentTarget)}
          title={assignmentTarget ? `Assignments · ${assignmentTarget.title}` : 'Assignments'}
          onClose={() => setAssignmentTarget(null)}
        >
          {assignmentTarget && (
            <div className="space-y-5">
              <div>
                <p className="m-0 text-xs font-extrabold uppercase tracking-wider text-ink-500">
                  Current partner assignments
                </p>
                {targetAssignments.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {targetAssignments.map(a => {
                      const pUser = partners.find(u => u.id === a.user_id);
                      return (
                        <div
                          key={`${a.property_id}-${a.user_id}`}
                          className="flex items-center justify-between gap-2 rounded-2xl border border-ink-100 bg-paper p-3 text-xs"
                        >
                          <div>
                            <strong className="text-ink-900">
                              {pUser?.full_name || pUser?.email || a.user_id.slice(0, 8)}
                            </strong>
                            <p className="m-0 mt-0.5 text-ink-500">
                              {a.access_role} · {a.scope}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void handleRevokeAssignment(a.property_id, a.user_id)
                            }
                            className="secondary-button min-h-[36px] px-3 py-1 text-xs"
                          >
                            Revoke
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-ink-500">
                    No active partner assignments on this listing.
                  </p>
                )}
              </div>

              <form onSubmit={submitGrantAssignment} className="space-y-3 border-t border-ink-100 pt-4">
                <FormField label="Assign active partner">
                  {fieldProps => (
                    <select
                      {...fieldProps}
                      required
                      value={partnerId}
                      onChange={e => setPartnerId(e.target.value)}
                      className={FIELD_INPUT_CLASS}
                    >
                      <option value="">Choose approved partner…</option>
                      {partners.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.full_name || p.email} ({p.email})
                        </option>
                      ))}
                    </select>
                  )}
                </FormField>

                <FormField label="Authority scope">
                  {fieldProps => (
                    <input
                      {...fieldProps}
                      required
                      value={authorityScope}
                      onChange={e => setAuthorityScope(e.target.value)}
                      className={FIELD_INPUT_CLASS}
                    />
                  )}
                </FormField>

                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Commission rate" optional>
                    {fieldProps => (
                      <input
                        {...fieldProps}
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={commissionRate}
                        onChange={e => setCommissionRate(e.target.value)}
                        placeholder="e.g. 0.10"
                        className={FIELD_INPUT_CLASS}
                      />
                    )}
                  </FormField>
                  <FormField label="Commission note" optional>
                    {fieldProps => (
                      <input
                        {...fieldProps}
                        value={commissionNote}
                        onChange={e => setCommissionNote(e.target.value)}
                        placeholder="Optional note"
                        className={FIELD_INPUT_CLASS}
                      />
                    )}
                  </FormField>
                </div>

                <button
                  type="submit"
                  disabled={busy || !partnerId}
                  className="primary-button min-h-[48px] w-full"
                >
                  {busy ? 'Granting…' : 'Grant property assignment'}
                </button>
              </form>
            </div>
          )}
        </FocusedDrawer>

        {/* Duplicate Investigation Drawer */}
        <FocusedDrawer
          open={Boolean(activeDuplicate)}
          title="Resolve candidate duplicate listing"
          subtitle="Never auto-deletes records; keeps full audit history."
          onClose={() => setActiveDuplicate(null)}
        >
          {activeDuplicate && (
            <form onSubmit={handleReviewDuplicateFlag} className="space-y-4">
              <FormField label="Resolution">
                {fieldProps => (
                  <select
                    {...fieldProps}
                    value={duplicateDecision}
                    onChange={e =>
                      setDuplicateDecision(
                        e.target.value as
                          | 'confirmed_duplicate'
                          | 'distinct_unit_approved'
                          | 'dismissed',
                      )
                    }
                    className={FIELD_INPUT_CLASS}
                  >
                    <option value="distinct_unit_approved">
                      Distinct apartment/unit in same building (approve separation)
                    </option>
                    <option value="confirmed_duplicate">
                      Confirmed duplicate submission
                    </option>
                    <option value="dismissed">False positive (dismiss flag)</option>
                  </select>
                )}
              </FormField>

              {duplicateDecision === 'confirmed_duplicate' && (
                <label className="flex items-start gap-2 text-xs text-ink-800">
                  <input
                    type="checkbox"
                    checked={duplicateSuspend}
                    onChange={e => setDuplicateSuspend(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    Suspend or reject the duplicate submission so guests only book the single canonical property record.
                  </span>
                </label>
              )}

              <FormField label="Investigation & audit note">
                {fieldProps => (
                  <textarea
                    {...fieldProps}
                    rows={3}
                    required
                    minLength={8}
                    value={duplicateNote}
                    onChange={e => setDuplicateNote(e.target.value)}
                    placeholder="Record ownership/unit findings…"
                    className={`${FIELD_INPUT_CLASS} resize-y`}
                  />
                )}
              </FormField>

              <button
                type="submit"
                disabled={busy}
                className="primary-button min-h-[46px] w-full"
              >
                {busy ? 'Saving…' : 'Record duplicate decision'}
              </button>
            </form>
          )}
        </FocusedDrawer>

        {/* Structured 7-Check Property Trust Review Drawer */}
        <FocusedDrawer
          open={Boolean(trustTarget)}
          title="7-Check Property Trust Review"
          subtitle={trustTarget?.title || ''}
          onClose={() => setTrustTarget(null)}
        >
          {trustTarget && (
            <div className="space-y-5">
              <div className="space-y-2">
                {TRUST_CHECK_DEFINITIONS.map(def => {
                  const row = trustChecks.find(
                    c =>
                      c.property_id === trustTarget.id && c.check_code === def.code,
                  );
                  return (
                    <div
                      key={def.code}
                      className="rounded-2xl border border-ink-100 bg-paper p-3 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-ink-900">{def.label}</strong>
                        <span className="rounded-full bg-white px-2.5 py-0.5 font-bold text-ink-700">
                          {row?.status || 'not_started'}
                        </span>
                      </div>
                      {row?.internal_review_note && (
                        <p className="m-0 mt-1 text-[11px] text-ink-600">
                          Internal note: {row.internal_review_note} (
                          {row.reviewer_label}
                          {row.reviewed_at ? ` · ${formatDate(row.reviewed_at)}` : ''})
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleSaveTrustCheck} className="space-y-3 border-t border-ink-200 pt-4">
                <FormField label="Check to review">
                  {fieldProps => (
                    <select
                      {...fieldProps}
                      value={selectedCheckCode}
                      onChange={e =>
                        setSelectedCheckCode(e.target.value as TrustCheckCode)
                      }
                      className={FIELD_INPUT_CLASS}
                    >
                      {TRUST_CHECK_DEFINITIONS.map(def => (
                        <option key={def.code} value={def.code}>
                          {def.label}
                        </option>
                      ))}
                    </select>
                  )}
                </FormField>

                <FormField label="Decision">
                  {fieldProps => (
                    <select
                      {...fieldProps}
                      value={selectedCheckStatus}
                      onChange={e =>
                        setSelectedCheckStatus(e.target.value as TrustCheckStatus)
                      }
                      className={FIELD_INPUT_CLASS}
                    >
                      <option value="verified">Approve / mark completed</option>
                      <option value="additional_docs_requested">
                        Request additional documents
                      </option>
                      <option value="pending_review">Mark pending review</option>
                      <option value="rejected">Reject check</option>
                    </select>
                  )}
                </FormField>

                {selectedCheckCode === 'physical_inspection_completed' && (
                  <FormField label="Inspection outcome summary" optional>
                    {fieldProps => (
                      <input
                        {...fieldProps}
                        type="text"
                        value={checkInspectionOutcome}
                        onChange={e => setCheckInspectionOutcome(e.target.value)}
                        placeholder="e.g. Passed on-site check (inverter, water, rooms verified)"
                        className={FIELD_INPUT_CLASS}
                      />
                    )}
                  </FormField>
                )}

                <FormField label="Public guest summary (never include private doc numbers)" optional>
                  {fieldProps => (
                    <input
                      {...fieldProps}
                      type="text"
                      value={checkPublicSummary}
                      onChange={e => setCheckPublicSummary(e.target.value)}
                      placeholder="Optional non-sensitive summary shown on listing…"
                      className={FIELD_INPUT_CLASS}
                    />
                  )}
                </FormField>

                <FormField label="Confidential internal reviewer note">
                  {fieldProps => (
                    <textarea
                      {...fieldProps}
                      rows={2}
                      required
                      minLength={6}
                      value={checkInternalNote}
                      onChange={e => setCheckInternalNote(e.target.value)}
                      placeholder="Private note stored for admin audit only…"
                      className={`${FIELD_INPUT_CLASS} resize-y`}
                    />
                  )}
                </FormField>

                <button
                  type="submit"
                  disabled={busy}
                  className="primary-button min-h-[46px] w-full"
                >
                  {busy ? 'Saving…' : 'Save check review'}
                </button>
              </form>
            </div>
          )}
        </FocusedDrawer>
      </main>

      <SiteFooter />
    </div>
  );
}
