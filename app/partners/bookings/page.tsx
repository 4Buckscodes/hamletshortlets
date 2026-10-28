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
import { PartnerNav } from '../partner-nav';

type Booking = {
  id: string;
  reference: string;
  property_id: string;
  check_in: string;
  check_out: string;
  guest_count: number;
  accommodation_subtotal: number;
  guest_total: number;
  refundable_deposit: number;
  special_requests: string | null;
  status: string;
  payment_deadline: string | null;
  properties?: { title?: string; area?: string } | null;
  profiles?: { full_name?: string; phone?: string } | null;
};

export default function PartnerBookingsPage() {
  const db = useMemo(() => getBrowserSupabase(), []);
  const [role, setRole] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Focused response drawer
  const [decisionTarget, setDecisionTarget] = useState<{
    booking: Booking;
    nextStatus: string;
    label: string;
  } | null>(null);
  const [decisionNote, setDecisionNote] = useState('');

  const load = useCallback(async () => {
    if (!db) {
      setError('Partner bookings are not configured on this deployment.');
      setLoading(false);
      return;
    }
    const { data: session } = await db.auth.getSession();
    const user = session.session?.user;
    if (!user) {
      window.location.assign('/signin?next=/partners/bookings');
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

    const { data, error: queryError } = await db
      .from('bookings')
      .select(
        'id,reference,property_id,check_in,check_out,guest_count,accommodation_subtotal,guest_total,refundable_deposit,special_requests,status,payment_deadline,properties(title,area),profiles!bookings_guest_id_fkey(full_name,phone)',
      )
      .order('created_at', { ascending: false });

    if (queryError) {
      setError('We could not load booking requests. Refresh and try again.');
    } else {
      setBookings((data || []) as unknown as Booking[]);
      setError('');
    }
    setLoading(false);
  }, [db]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function executeTransition(
    booking: Booking,
    nextStatus: string,
    noteText: string,
  ) {
    if (!db) return;
    setError('');
    setNotice('');
    setBusyId(booking.id);

    try {
      // Pre-check active holds/confirmed stays or calendar blocks before opening a 48h hold
      if (nextStatus === 'awaiting_payment') {
        const { data: unavailable } = await db.rpc('get_unavailable_property_ids', {
          requested_check_in: booking.check_in,
          requested_check_out: booking.check_out,
        });
        if (Array.isArray(unavailable) && unavailable.includes(booking.property_id)) {
          throw new Error(
            'Those dates now conflict with an active calendar block, 48-hour payment hold, or confirmed stay on this property.',
          );
        }
      }

      const { error: rpcError } = await db.rpc('transition_booking', {
        target_booking_id: booking.id,
        next_status: nextStatus,
        transition_note: noteText.trim() || `Updated to ${nextStatus} by property partner.`,
      });
      if (rpcError) throw new Error(rpcError.message);

      void triggerBookingNotificationDispatchBestEffort(db, booking.id);
      setNotice(`Booking ${booking.reference} updated to ${nextStatus.replace(/_/g, ' ')}.`);
      setDecisionTarget(null);
      setDecisionNote('');
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not update booking status.',
      );
    } finally {
      setBusyId('');
    }
  }

  function handleDecisionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!decisionTarget) return;
    if (
      decisionTarget.nextStatus === 'declined' &&
      decisionNote.trim().length < 4
    ) {
      setError('Provide a short reason so the guest understands why dates were declined.');
      return;
    }
    void executeTransition(
      decisionTarget.booking,
      decisionTarget.nextStatus,
      decisionNote,
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <main className="shell flex-1 py-8 sm:py-12">
        <div className="workspace-heading flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Partner Booking Review</p>
            <h1 className="serif mt-2 text-3xl font-medium text-ink-900 sm:text-5xl">
              Respond to booking requests
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-600">
              Confirm dates to open a 48-hour Paystack payment window for the guest, or decline with a clear note if dates are unavailable.
            </p>
          </div>
          {(role === 'partner' || role === 'admin') && (
            <PartnerNav current="bookings" />
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
          <p className="mt-8 text-sm text-ink-600">Loading booking requests…</p>
        ) : bookings.length > 0 ? (
          <div className="mt-6 space-y-4">
            {bookings.map(b => (
              <article
                key={b.id}
                className="rounded-3xl border border-ink-100 bg-white p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="font-mono text-xs font-extrabold text-brass-700">
                      {b.reference}
                    </span>
                    <h2 className="serif m-0 mt-1 text-2xl font-medium text-ink-900">
                      {b.properties?.title || 'Assigned property'}
                    </h2>
                    <p className="m-0 mt-1 text-xs text-ink-500">
                      {b.check_in} → {b.check_out} · {b.guest_count}{' '}
                      {b.guest_count === 1 ? 'guest' : 'guests'} · Guest:{' '}
                      <strong className="text-ink-900">
                        {b.profiles?.full_name || 'Verified guest'}
                      </strong>
                    </p>
                  </div>
                  <span className="rounded-full bg-paper px-3.5 py-1.5 text-xs font-bold text-ink-900">
                    {b.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-600">
                  <span>
                    Owner net stay base (<em>B</em>):{' '}
                    <strong className="font-mono text-ink-900">
                      ₦{Number(b.accommodation_subtotal || 0).toLocaleString('en-NG')}
                    </strong>
                  </span>
                  <span>
                    Guest stay total:{' '}
                    <strong className="font-mono text-ink-900">
                      ₦{Number(b.guest_total || 0).toLocaleString('en-NG')}
                    </strong>
                  </span>
                  {Number(b.refundable_deposit) > 0 && (
                    <span>
                      Caution deposit:{' '}
                      <strong className="font-mono text-ink-900">
                        ₦{Number(b.refundable_deposit).toLocaleString('en-NG')}
                      </strong>
                    </span>
                  )}
                </div>

                {b.special_requests && (
                  <p className="mt-3 mb-0 rounded-2xl bg-paper p-3 text-xs text-ink-700">
                    <strong>Guest note:</strong> {b.special_requests}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2.5 border-t border-ink-100 pt-4">
                  {b.status === 'requested' && (
                    <button
                      type="button"
                      disabled={busyId === b.id}
                      onClick={() =>
                        void executeTransition(
                          b,
                          'checking',
                          'Partner is checking calendar availability.',
                        )
                      }
                      className="secondary-button min-h-[44px]"
                    >
                      Mark checking
                    </button>
                  )}

                  {['requested', 'checking'].includes(b.status) && (
                    <>
                      <button
                        type="button"
                        disabled={busyId === b.id}
                        onClick={() => {
                          setDecisionNote('');
                          setDecisionTarget({
                            booking: b,
                            nextStatus: 'awaiting_payment',
                            label: 'Accept dates & open 48h payment hold',
                          });
                        }}
                        className="primary-button min-h-[44px]"
                      >
                        Accept & request payment
                      </button>

                      <button
                        type="button"
                        disabled={busyId === b.id}
                        onClick={() => {
                          setDecisionNote('');
                          setDecisionTarget({
                            booking: b,
                            nextStatus: 'declined',
                            label: 'Decline booking request',
                          });
                        }}
                        className="secondary-button min-h-[44px]"
                      >
                        Decline
                      </button>
                    </>
                  )}

                  {b.status === 'confirmed' && (
                    <>
                      <button
                        type="button"
                        disabled={busyId === b.id}
                        onClick={() => {
                          setDecisionNote('');
                          setDecisionTarget({
                            booking: b,
                            nextStatus: 'completed',
                            label: 'Mark stay completed',
                          });
                        }}
                        className="primary-button min-h-[44px]"
                      >
                        Mark stay completed
                      </button>

                      <button
                        type="button"
                        disabled={busyId === b.id}
                        onClick={() => {
                          setDecisionNote('');
                          setDecisionTarget({
                            booking: b,
                            nextStatus: 'no_show',
                            label: 'Record guest no-show',
                          });
                        }}
                        className="secondary-button min-h-[44px]"
                      >
                        Record no-show
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-dashed border-ink-300 bg-white p-10 text-center text-sm text-ink-500">
            No booking requests have arrived for your assigned properties yet.
          </div>
        )}

        <FocusedDrawer
          open={Boolean(decisionTarget)}
          title={decisionTarget?.label || 'Respond to booking'}
          subtitle={decisionTarget?.booking.reference}
          onClose={() => setDecisionTarget(null)}
        >
          {decisionTarget && (
            <form onSubmit={handleDecisionSubmit} className="space-y-4">
              <div className="rounded-2xl bg-paper p-4 text-xs text-ink-700">
                <p className="m-0 font-bold text-ink-900">
                  {decisionTarget.booking.properties?.title || 'Stay'} ·{' '}
                  {decisionTarget.booking.check_in} → {decisionTarget.booking.check_out}
                </p>
                <p className="m-0 mt-1">
                  Guest: {decisionTarget.booking.profiles?.full_name || 'Verified guest'} (
                  {decisionTarget.booking.guest_count} guests)
                </p>
              </div>

              <FormField
                label={
                  decisionTarget.nextStatus === 'declined'
                    ? 'Reason for declining'
                    : 'Note for guest / audit log'
                }
                optional={decisionTarget.nextStatus !== 'declined'}
              >
                {fieldProps => (
                  <textarea
                    {...fieldProps}
                    rows={3}
                    maxLength={500}
                    required={decisionTarget.nextStatus === 'declined'}
                    value={decisionNote}
                    onChange={e => setDecisionNote(e.target.value)}
                    placeholder={
                      decisionTarget.nextStatus === 'declined'
                        ? 'e.g. Dates already booked on an external channel.'
                        : 'Optional handover or welcome note…'
                    }
                    className={`${FIELD_INPUT_CLASS} resize-y`}
                  />
                )}
              </FormField>

              <button
                type="submit"
                disabled={Boolean(busyId)}
                className="primary-button min-h-[48px] w-full"
              >
                {busyId ? 'Updating…' : decisionTarget.label}
              </button>
            </form>
          )}
        </FocusedDrawer>
      </main>

      <SiteFooter />
    </div>
  );
}
