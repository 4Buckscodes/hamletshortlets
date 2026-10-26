'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  getBrowserSupabase,
  triggerBookingNotificationDispatchBestEffort,
} from '@/lib/next-supabase';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import {
  FocusedDrawer,
  FormField,
  FIELD_INPUT_CLASS,
} from '@/components/forms/ProgressiveFormPrimitives';
import { AdminNav } from '../admin-nav';

type AdminBooking = {
  id: string;
  reference: string;
  property_id: string;
  check_in: string;
  check_out: string;
  guest_count: number;
  accommodation_subtotal: number;
  guest_total: number;
  refundable_deposit: number;
  status: string;
  payment_reference: string | null;
  properties?: { title?: string; area?: string } | null;
  profiles?: { full_name?: string; phone?: string } | null;
};

export default function AdminBookingsPage() {
  const db = useMemo(() => getBrowserSupabase(), []);
  const [allowed, setAllowed] = useState(false);
  const [items, setItems] = useState<AdminBooking[]>([]);
  const [selected, setSelected] = useState<AdminBooking | null>(null);
  const [mode, setMode] = useState<'transition' | 'refund'>('transition');
  const [nextStatus, setNextStatus] = useState('checking');
  const [note, setNote] = useState('');
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundRef, setRefundRef] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!db) {
      setError('Admin bookings are not configured.');
      setLoading(false);
      return;
    }
    const { data: session } = await db.auth.getSession();
    const user = session.session?.user;
    if (!user) {
      window.location.assign('/signin?next=/admin/bookings');
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

    const { data, error: queryError } = await db
      .from('bookings')
      .select(
        'id,reference,property_id,check_in,check_out,guest_count,accommodation_subtotal,guest_total,refundable_deposit,status,payment_reference,properties(title,area),profiles!bookings_guest_id_fkey(full_name,phone)',
      )
      .order('created_at', { ascending: false });

    if (queryError) {
      setError('Could not load bookings.');
    } else {
      setItems((data || []) as unknown as AdminBooking[]);
    }
    setLoading(false);
  }, [db]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function handleAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || !selected) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'refund') {
        if (refundAmount <= 0 || note.trim().length < 6) {
          throw new Error(
            'Enter a positive NGN refund amount and reconciliation note.',
          );
        }
        const { error: rpcError } = await db.rpc('record_booking_refund', {
          target_booking_id: selected.id,
          refund_amount_naira: Math.round(refundAmount),
          provider_ref: refundRef.trim() || null,
          refund_note: note.trim(),
        });
        if (rpcError) throw new Error(rpcError.message);
        setNotice(
          `Recorded ledger refund entry for ${selected.reference}. Remember: execute the external bank/Paystack reversal separately if not already processed.`,
        );
      } else {
        const { error: rpcError } = await db.rpc('transition_booking', {
          target_booking_id: selected.id,
          next_status: nextStatus,
          transition_note: note.trim() || `Transitioned to ${nextStatus} by admin.`,
        });
        if (rpcError) throw new Error(rpcError.message);
        void triggerBookingNotificationDispatchBestEffort(db, selected.id);
        setNotice(`Booking ${selected.reference} moved to ${nextStatus}.`);
      }
      setSelected(null);
      setNote('');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Action failed.');
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
            <p className="eyebrow">Booking & Hold Oversight</p>
            <h1 className="serif mt-2 text-3xl font-medium text-ink-900 sm:text-5xl">
              All bookings
            </h1>
          </div>
          {allowed && <AdminNav current="bookings" />}
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
          <p className="mt-8 text-sm text-ink-600">Loading bookings…</p>
        ) : !allowed ? (
          <p className="mt-8 text-sm text-red-800">Administrator access required.</p>
        ) : items.length > 0 ? (
          <div className="mt-6 space-y-3.5">
            {items.map(b => (
              <article
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-ink-100 bg-white p-5"
              >
                <div>
                  <span className="font-mono text-xs font-extrabold text-brass-700">
                    {b.reference}
                  </span>{' '}
                  · <strong className="text-sm text-ink-900">{b.properties?.title || 'Stay'}</strong>
                  <p className="m-0 mt-1 text-xs text-ink-500">
                    Guest: {b.profiles?.full_name || 'Guest'} · {b.check_in} → {b.check_out} · Stay total: ₦
                    {Number(b.guest_total || 0).toLocaleString('en-NG')}
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="rounded-full bg-paper px-3 py-1 text-xs font-bold text-ink-800">
                    {b.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(b);
                      setMode('transition');
                      setNextStatus('checking');
                      setRefundAmount(Number(b.guest_total || 0));
                      setNote('');
                    }}
                    className="secondary-button min-h-[40px]"
                  >
                    Manage
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-dashed border-ink-300 bg-white p-10 text-center text-sm text-ink-500">
            No bookings recorded yet.
          </div>
        )}

        <FocusedDrawer
          open={Boolean(selected)}
          title={selected?.reference || 'Manage booking'}
          subtitle={
            selected
              ? `${selected.profiles?.full_name || 'Guest'} · Current: ${selected.status}`
              : undefined
          }
          onClose={() => setSelected(null)}
        >
          {selected && (
            <form onSubmit={handleAction} className="space-y-4">
              <div className="flex gap-1.5 rounded-full bg-paper p-1">
                <button
                  type="button"
                  onClick={() => setMode('transition')}
                  className={`min-h-[40px] flex-1 cursor-pointer rounded-full text-xs font-bold ${
                    mode === 'transition' ? 'bg-white text-ink-900 shadow-xs' : 'text-ink-600'
                  }`}
                >
                  Status transition
                </button>
                <button
                  type="button"
                  onClick={() => setMode('refund')}
                  className={`min-h-[40px] flex-1 cursor-pointer rounded-full text-xs font-bold ${
                    mode === 'refund' ? 'bg-white text-ink-900 shadow-xs' : 'text-ink-600'
                  }`}
                >
                  Record ledger refund
                </button>
              </div>

              {mode === 'transition' ? (
                <FormField
                  label="Next booking status"
                  hint="Confirmed status is normally set by verified Paystack webhook."
                >
                  {fieldProps => (
                    <select
                      {...fieldProps}
                      value={nextStatus}
                      onChange={e => setNextStatus(e.target.value)}
                      className={FIELD_INPUT_CLASS}
                    >
                      <option value="checking">checking</option>
                      <option value="awaiting_payment">awaiting_payment (48h hold)</option>
                      <option value="completed">completed</option>
                      <option value="disputed">disputed</option>
                      <option value="cancelled">cancelled</option>
                      <option value="declined">declined</option>
                      <option value="no_show">no_show</option>
                    </select>
                  )}
                </FormField>
              ) : (
                <>
                  <p className="m-0 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
                    <strong>Reconciliation notice:</strong> Recording a refund updates HAMLET’s internal ledger and reverses un-disbursed commission rows. Execute actual Paystack/bank money movement separately.
                  </p>
                  <FormField label="Refund amount (NGN)">
                    {fieldProps => (
                      <input
                        {...fieldProps}
                        required
                        type="number"
                        min={1}
                        value={refundAmount}
                        onChange={e => setRefundAmount(Number(e.target.value))}
                        className={FIELD_INPUT_CLASS}
                      />
                    )}
                  </FormField>
                  <FormField label="Paystack / bank refund reference" optional>
                    {fieldProps => (
                      <input
                        {...fieldProps}
                        value={refundRef}
                        onChange={e => setRefundRef(e.target.value)}
                        placeholder="Optional external refund reference"
                        className={FIELD_INPUT_CLASS}
                      />
                    )}
                  </FormField>
                </>
              )}

              <FormField label="Audit note">
                {fieldProps => (
                  <textarea
                    {...fieldProps}
                    required
                    minLength={4}
                    rows={3}
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Reason recorded in admin_audit_log…"
                    className={`${FIELD_INPUT_CLASS} resize-y`}
                  />
                )}
              </FormField>

              <button
                type="submit"
                disabled={busy}
                className="primary-button min-h-[48px] w-full"
              >
                {busy ? 'Recording…' : 'Confirm audited action'}
              </button>
            </form>
          )}
        </FocusedDrawer>
      </main>

      <SiteFooter />
    </div>
  );
}
