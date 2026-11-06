'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  getBrowserSupabase,
  isMissingSchemaObjectError,
} from '@/lib/next-supabase';
import {
  CAUTION_STATUS_LABELS,
  HONEST_CAUTION_CUSTODY_DISCLOSURE,
  type CautionDepositLifecycleStatus,
} from '@/lib/competitive-readiness';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import {
  FocusedDrawer,
  FormField,
  FIELD_INPUT_CLASS,
} from '@/components/forms/ProgressiveFormPrimitives';
import { AdminNav } from '../admin-nav';

type LedgerEntry = {
  id: string;
  booking_id: string;
  record_type: string;
  amount: number;
  status: string;
  payout_status: string | null;
  provider_reference: string | null;
  description: string | null;
  created_at: string;
  bookings?: { reference?: string } | null;
};

type CautionRow = {
  id: string;
  booking_id: string;
  amount_ngn: number;
  deducted_amount_ngn: number;
  refunded_amount_ngn: number;
  status: CautionDepositLifecycleStatus;
  inspection_notes: string | null;
  deduction_reason: string | null;
  damage_issue_description?: string | null;
  damage_claimed_amount_ngn?: number;
  guest_deduction_response?: string | null;
  evidence?: Array<{ url?: string; caption?: string; captured_at?: string }> | null;
  bookings?: { reference?: string } | null;
};

export default function AdminSettlementsPage() {
  const db = useMemo(() => getBrowserSupabase(), []);
  const [allowed, setAllowed] = useState(false);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [cautions, setCautions] = useState<CautionRow[]>([]);
  const [sprintReady, setSprintReady] = useState(false);

  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);
  const [nextPayoutStatus, setNextPayoutStatus] = useState('approved');
  const [payoutNote, setPayoutNote] = useState('');

  const [selectedCaution, setSelectedCaution] = useState<CautionRow | null>(null);
  const [cautionStatus, setCautionStatus] = useState<
    'refund_approved' | 'partially_refunded' | 'refunded' | 'disputed'
  >('refund_approved');
  const [deductedNgn, setDeductedNgn] = useState(0);
  const [inspectionNote, setInspectionNote] = useState('');

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!db) {
      setError('Admin ledger is not configured.');
      setLoading(false);
      return;
    }
    const { data: session } = await db.auth.getSession();
    const user = session.session?.user;
    if (!user) {
      window.location.assign('/signin?next=/admin/settlements');
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

    const [ledgerRes, sprintCautionRes] = await Promise.all([
      db
        .from('booking_payment_records')
        .select(
          'id,booking_id,record_type,amount,status,payout_status,provider_reference,description,created_at,bookings(reference)',
        )
        .order('created_at', { ascending: false })
        .limit(100),
      db
        .from('booking_caution_deposits')
        .select(
          'id,booking_id,amount_ngn,deducted_amount_ngn,refunded_amount_ngn,status,inspection_notes,deduction_reason,damage_issue_description,damage_claimed_amount_ngn,guest_deduction_response,evidence,bookings(reference)',
        )
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    if (!ledgerRes.error && Array.isArray(ledgerRes.data)) {
      setEntries(ledgerRes.data as unknown as LedgerEntry[]);
    }

    if (!sprintCautionRes.error && Array.isArray(sprintCautionRes.data)) {
      setSprintReady(true);
      setCautions(sprintCautionRes.data as unknown as CautionRow[]);
    } else if (isMissingSchemaObjectError(sprintCautionRes.error)) {
      setSprintReady(false);
      const fallbackCaution = await db
        .from('booking_caution_deposits')
        .select(
          'id,booking_id,amount_ngn,deducted_amount_ngn,refunded_amount_ngn,status,inspection_notes,deduction_reason,evidence,bookings(reference)',
        )
        .order('created_at', { ascending: false })
        .limit(50);
      if (!fallbackCaution.error && Array.isArray(fallbackCaution.data)) {
        setCautions(fallbackCaution.data as unknown as CautionRow[]);
      }
    }
    setLoading(false);
  }, [db]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function savePayoutStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || !selectedEntry) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const { error: rpcError } = await db.rpc('update_payout_status', {
        target_entry_id: selectedEntry.id,
        next_payout_status: nextPayoutStatus,
        payout_note: payoutNote.trim() || null,
      });
      if (rpcError) throw new Error(rpcError.message);
      setNotice(
        `Updated ledger reconciliation status to ${nextPayoutStatus} (administrative ledger record only).`,
      );
      setSelectedEntry(null);
      setPayoutNote('');
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not update payout status.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveCautionTransition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || !selectedCaution) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const total = Number(selectedCaution.amount_ngn || 0);
      const cleanDeduct = Math.max(0, Math.min(total, Math.round(deductedNgn)));
      const refunded = Math.max(0, total - cleanDeduct);

      if (sprintReady) {
        const { error: rpcErr } = await db.rpc('admin_resolve_caution_deposit_status', {
          target_booking_id: selectedCaution.booking_id,
          next_status: cautionStatus,
          approved_deduction_ngn: cleanDeduct,
          approved_refund_ngn: refunded,
          review_note: inspectionNote.trim() || 'Reviewed by HAMLET operations.',
        });
        if (rpcErr) throw new Error(rpcErr.message);
      } else {
        const legacyStatus =
          cautionStatus === 'refunded' ? 'refund_completed' : cautionStatus;
        const { error: rpcError } = await db.rpc('transition_caution_deposit', {
          target_booking_id: selectedCaution.booking_id,
          next_status: legacyStatus,
          deducted_ngn: cleanDeduct,
          refunded_ngn: refunded,
          inspection_note: inspectionNote.trim() || 'Inspection recorded by operations.',
          deduction_note: cleanDeduct > 0 ? inspectionNote.trim() : null,
          refund_ref: null,
          evidence_items: null,
        });
        if (rpcError) throw new Error(rpcError.message);
      }

      setNotice(
        `Caution deposit for ${selectedCaution.bookings?.reference || selectedCaution.booking_id} updated to ${cautionStatus.replace(/_/g, ' ')}.`,
      );
      setSelectedCaution(null);
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Could not update caution deposit.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <main className="shell flex-1 py-8 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Ledger, Settlements & Caution Deposits</p>
            <h1 className="serif mt-2 text-3xl font-medium text-ink-900 sm:text-5xl">
              Financial reconciliation
            </h1>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-ink-600">
              Accommodation revenue, platform fees, agent allocations, and separate refundable caution deposits are reconciled independently.
            </p>
          </div>
          {allowed && <AdminNav current="settlements" />}
        </div>

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
          <p className="mt-8 text-sm text-ink-600">Loading ledger…</p>
        ) : !allowed ? (
          <p className="mt-8 text-sm text-red-800">Administrator access required.</p>
        ) : (
          <div className="mt-8 space-y-8">
            <section className="rounded-3xl border border-ink-100 bg-white p-6">
              <h2 className="serif m-0 text-2xl font-medium text-ink-900">
                Payment & payout ledger ({entries.length})
              </h2>
              {entries.length > 0 ? (
                <div className="mt-4 divide-y divide-ink-100 text-xs">
                  {entries.map(item => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3.5"
                    >
                      <div>
                        <strong className="font-mono text-ink-900">
                          {item.bookings?.reference || item.booking_id}
                        </strong>{' '}
                        ·{' '}
                        <span className="capitalize">
                          {item.record_type.replace(/_/g, ' ')}
                        </span>
                        <p className="m-0 mt-0.5 text-ink-500">
                          {item.description || 'Ledger entry'}
                          {item.provider_reference
                            ? ` · Ref: ${item.provider_reference}`
                            : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <strong className="font-mono text-sm text-ink-900">
                          ₦{Number(item.amount || 0).toLocaleString('en-NG')}
                        </strong>
                        <span className="rounded-full bg-paper px-2.5 py-1 font-bold text-ink-700">
                          {item.payout_status || item.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEntry(item);
                            setNextPayoutStatus(item.payout_status || 'approved');
                            setPayoutNote('');
                          }}
                          className="secondary-button min-h-[36px] px-3 text-xs"
                        >
                          Reconcile
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-xs text-ink-500">
                  No payment ledger entries recorded yet.
                </p>
              )}
            </section>

            <section className="rounded-3xl border border-ink-100 bg-white p-6">
              <h2 className="serif m-0 text-2xl font-medium text-ink-900">
                Caution deposits & inspection claims ({cautions.length})
              </h2>
              <p className="mt-1 text-xs text-ink-500">
                {HONEST_CAUTION_CUSTODY_DISCLOSURE}
              </p>
              {cautions.length > 0 ? (
                <div className="mt-4 divide-y divide-ink-100 text-xs">
                  {cautions.map(c => (
                    <div
                      key={c.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3.5"
                    >
                      <div className="space-y-1">
                        <div>
                          <strong className="font-mono text-ink-900">
                            {c.bookings?.reference || c.booking_id}
                          </strong>{' '}
                          · Caution deposit: ₦
                          {Number(c.amount_ngn || 0).toLocaleString('en-NG')}
                        </div>
                        <p className="m-0 text-ink-600">
                          Status:{' '}
                          <strong>
                            {CAUTION_STATUS_LABELS[c.status] || c.status}
                          </strong>{' '}
                          · Approved deduction: ₦
                          {Number(c.deducted_amount_ngn || 0).toLocaleString('en-NG')} ·
                          Refunded: ₦
                          {Number(c.refunded_amount_ngn || 0).toLocaleString('en-NG')}
                        </p>
                        {c.damage_issue_description && (
                          <p className="m-0 text-amber-900">
                            <strong>Claimed issue (₦{Number(c.damage_claimed_amount_ngn || 0).toLocaleString('en-NG')}):</strong>{' '}
                            {c.damage_issue_description}
                          </p>
                        )}
                        {c.guest_deduction_response && (
                          <p className="m-0 text-emerald-900">
                            <strong>Guest response:</strong> {c.guest_deduction_response}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCaution(c);
                          setCautionStatus('refund_approved');
                          setDeductedNgn(
                            Number(
                              c.damage_claimed_amount_ngn || c.deducted_amount_ngn || 0,
                            ),
                          );
                          setInspectionNote(
                            c.inspection_notes || c.damage_issue_description || '',
                          );
                        }}
                        className="secondary-button min-h-[36px] px-3 text-xs"
                      >
                        Review & resolve
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-xs text-ink-500">
                  No caution deposit records yet.
                </p>
              )}
            </section>
          </div>
        )}

        <FocusedDrawer
          open={Boolean(selectedEntry)}
          title="Update payout reconciliation status"
          subtitle={selectedEntry?.bookings?.reference || selectedEntry?.booking_id}
          onClose={() => setSelectedEntry(null)}
        >
          {selectedEntry && (
            <form onSubmit={savePayoutStatus} className="space-y-4">
              <FormField label="Reconciliation status">
                {fieldProps => (
                  <select
                    {...fieldProps}
                    value={nextPayoutStatus}
                    onChange={e => setNextPayoutStatus(e.target.value)}
                    className={FIELD_INPUT_CLASS}
                  >
                    <option value="pending">pending</option>
                    <option value="approved">approved (ready for bank payout)</option>
                    <option value="paid">paid (bank transfer completed)</option>
                    <option value="withheld">withheld (under dispute)</option>
                    <option value="reversed">reversed</option>
                  </select>
                )}
              </FormField>

              <FormField label="Reconciliation note" optional>
                {fieldProps => (
                  <textarea
                    {...fieldProps}
                    rows={3}
                    value={payoutNote}
                    onChange={e => setPayoutNote(e.target.value)}
                    placeholder="Bank batch ID or reconciliation note…"
                    className={`${FIELD_INPUT_CLASS} resize-y`}
                  />
                )}
              </FormField>

              <button
                type="submit"
                disabled={busy}
                className="primary-button min-h-[48px] w-full"
              >
                {busy ? 'Saving…' : 'Record ledger status'}
              </button>
            </form>
          )}
        </FocusedDrawer>

        <FocusedDrawer
          open={Boolean(selectedCaution)}
          title="Resolve caution deposit & claim"
          subtitle={
            selectedCaution?.bookings?.reference || selectedCaution?.booking_id
          }
          onClose={() => setSelectedCaution(null)}
        >
          {selectedCaution && (
            <form onSubmit={saveCautionTransition} className="space-y-4">
              {Array.isArray(selectedCaution.evidence) &&
                selectedCaution.evidence.length > 0 && (
                  <div className="space-y-1.5 rounded-2xl bg-paper p-3 text-xs">
                    <strong className="text-ink-900">Submitted media evidence:</strong>
                    {selectedCaution.evidence.map((ev, idx) => (
                      <p key={idx} className="m-0">
                        <a
                          href={ev.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-brass-700 underline"
                        >
                          Evidence #{idx + 1}
                        </a>
                        {ev.caption ? ` — ${ev.caption}` : ''}
                      </p>
                    ))}
                  </div>
                )}

              <FormField label="Resolution status">
                {fieldProps => (
                  <select
                    {...fieldProps}
                    value={cautionStatus}
                    onChange={e =>
                      setCautionStatus(
                        e.target.value as
                          | 'refund_approved'
                          | 'partially_refunded'
                          | 'refunded'
                          | 'disputed',
                      )
                    }
                    className={FIELD_INPUT_CLASS}
                  >
                    <option value="refund_approved">Refund approved</option>
                    <option value="partially_refunded">
                      Partially refunded (documented deduction)
                    </option>
                    <option value="refunded">Refunded (completed)</option>
                    <option value="disputed">Keep in disputed review</option>
                  </select>
                )}
              </FormField>

              <FormField label="Approved deduction (₦ — normal wear & tear excluded)">
                {fieldProps => (
                  <input
                    {...fieldProps}
                    type="number"
                    min={0}
                    max={selectedCaution.amount_ngn}
                    value={deductedNgn}
                    onChange={e => setDeductedNgn(Number(e.target.value))}
                    className={FIELD_INPUT_CLASS}
                  />
                )}
              </FormField>

              <FormField label="Admin review & reconciliation note">
                {fieldProps => (
                  <textarea
                    {...fieldProps}
                    required
                    minLength={6}
                    rows={3}
                    value={inspectionNote}
                    onChange={e => setInspectionNote(e.target.value)}
                    placeholder="Record evidence review outcome…"
                    className={`${FIELD_INPUT_CLASS} resize-y`}
                  />
                )}
              </FormField>

              <button
                type="submit"
                disabled={busy}
                className="primary-button min-h-[48px] w-full"
              >
                {busy ? 'Saving…' : 'Save caution resolution'}
              </button>
            </form>
          )}
        </FocusedDrawer>
      </main>

      <SiteFooter />
    </div>
  );
}
