'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  getBrowserSupabase,
  isMissingSchemaObjectError,
  triggerBookingNotificationDispatchBestEffort,
} from '@/lib/next-supabase';
import {
  CAUTION_STATUS_LABELS,
  computeBookingResponseIndicator,
  validateCautionDamageClaim,
  type CautionDepositLifecycleStatus,
} from '@/lib/competitive-readiness';
import { formatDate, formatNaira } from '@/lib/pricing';
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
  created_at?: string | null;
  properties?: { title?: string; area?: string } | null;
  profiles?: { full_name?: string; phone?: string } | null;
};

type CautionRow = {
  booking_id: string;
  amount_ngn: number;
  status: CautionDepositLifecycleStatus;
  damage_claimed_amount_ngn?: number;
  damage_issue_description?: string | null;
  guest_deduction_response?: string | null;
};

type InspectionRow = {
  id: string;
  booking_id: string;
  inspection_stage: 'check_in' | 'check_out';
  property_condition: string;
  guest_acknowledgement_status: string;
  recorded_at: string;
};

type EnquiryRow = {
  id: string;
  property_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  message: string;
  status: string;
  partner_response?: string | null;
  created_at: string;
  properties?: { title?: string } | null;
};

export default function PartnerBookingsPage() {
  const db = useMemo(() => getBrowserSupabase(), []);
  const [role, setRole] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cautionByBooking, setCautionByBooking] = useState<Record<string, CautionRow>>({});
  const [inspectionsByBooking, setInspectionsByBooking] = useState<
    Record<string, InspectionRow[]>
  >({});
  const [enquiries, setEnquiries] = useState<EnquiryRow[]>([]);
  const [sprintReady, setSprintReady] = useState(false);
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

  // Inspection drawer
  const [inspectionTarget, setInspectionTarget] = useState<Booking | null>(null);
  const [inspStage, setInspStage] = useState<'check_in' | 'check_out'>('check_in');
  const [inspCondition, setInspCondition] = useState<
    'excellent' | 'good' | 'fair' | 'issues_noted'
  >('good');
  const [inspFurniture, setInspFurniture] = useState(
    'Sofa, beds, TV, fridge and AC units checked and operational.',
  );
  const [inspDamage, setInspDamage] = useState('');
  const [inspMissing, setInspMissing] = useState('');
  const [inspUtilities, setInspUtilities] = useState(
    'Inverter/backup power, water pressure and Wi-Fi verified.',
  );
  const [inspEvidenceUrl, setInspEvidenceUrl] = useState('');
  const [inspEvidenceCaption, setInspEvidenceCaption] = useState('');

  // Caution damage claim drawer
  const [claimTarget, setClaimTarget] = useState<Booking | null>(null);
  const [claimAmountInput, setClaimAmountInput] = useState('');
  const [claimIssueInput, setClaimIssueInput] = useState('');
  const [claimEvidenceUrlInput, setClaimEvidenceUrlInput] = useState('');
  const [claimExcludeWearTear, setClaimExcludeWearTear] = useState(true);

  // Enquiry reply drawer
  const [enquiryTarget, setEnquiryTarget] = useState<EnquiryRow | null>(null);
  const [enquiryReplyText, setEnquiryReplyText] = useState('');

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

    const [bookingRes, cautionRes, inspRes, enqRes] = await Promise.all([
      db
        .from('bookings')
        .select(
          'id,reference,property_id,check_in,check_out,guest_count,accommodation_subtotal,guest_total,refundable_deposit,special_requests,status,payment_deadline,created_at,properties(title,area),profiles!bookings_guest_id_fkey(full_name,phone)',
        )
        .order('created_at', { ascending: false }),
      db
        .from('booking_caution_deposits')
        .select(
          'booking_id,amount_ngn,status,damage_claimed_amount_ngn,damage_issue_description,guest_deduction_response',
        ),
      db
        .from('property_inspections')
        .select(
          'id,booking_id,inspection_stage,property_condition,guest_acknowledgement_status,recorded_at',
        ),
      db
        .from('property_enquiries')
        .select(
          'id,property_id,guest_name,guest_email,guest_phone,message,status,partner_response,created_at,properties(title)',
        )
        .order('created_at', { ascending: false }),
    ]);

    if (bookingRes.error) {
      setError('We could not load booking requests. Refresh and try again.');
    } else {
      setBookings((bookingRes.data || []) as unknown as Booking[]);
      setError('');
    }

    if (!inspRes.error) {
      setSprintReady(true);
      const map: Record<string, InspectionRow[]> = {};
      for (const row of (inspRes.data || []) as unknown as InspectionRow[]) {
        map[row.booking_id] = [...(map[row.booking_id] || []), row];
      }
      setInspectionsByBooking(map);
    } else if (isMissingSchemaObjectError(inspRes.error)) {
      setSprintReady(false);
    }

    if (!cautionRes.error && Array.isArray(cautionRes.data)) {
      const cmap: Record<string, CautionRow> = {};
      for (const row of cautionRes.data as unknown as CautionRow[]) {
        cmap[row.booking_id] = row;
      }
      setCautionByBooking(cmap);
    }

    if (!enqRes.error && Array.isArray(enqRes.data)) {
      setEnquiries(enqRes.data as unknown as EnquiryRow[]);
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

  async function handleSubmitInspection(event: FormEvent) {
    event.preventDefault();
    if (!db || !inspectionTarget) return;
    setError('');
    setNotice('');
    setBusyId(inspectionTarget.id);
    try {
      const evidenceItems = inspEvidenceUrl.trim()
        ? [
            {
              url: inspEvidenceUrl.trim(),
              media_type: 'photo',
              caption:
                inspEvidenceCaption.trim() || `${inspStage.replace('_', '-')} condition photo`,
              captured_at: new Date().toISOString(),
            },
          ]
        : [];

      const { error: rpcErr } = await db.rpc('submit_property_inspection', {
        target_booking_id: inspectionTarget.id,
        stage_input: inspStage,
        condition_input: inspCondition,
        furniture_notes: inspFurniture,
        damage_notes: inspDamage,
        missing_notes: inspMissing,
        utilities_notes: inspUtilities,
        evidence_items: evidenceItems,
      });
      if (rpcErr) throw new Error(rpcErr.message);

      setInspectionTarget(null);
      setInspEvidenceUrl('');
      setInspEvidenceCaption('');
      setNotice(
        `${inspStage === 'check_in' ? 'Check-in' : 'Check-out'} inspection saved for ${inspectionTarget.reference}.`,
      );
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save inspection.');
    } finally {
      setBusyId('');
    }
  }

  async function handleSubmitCautionClaim(event: FormEvent) {
    event.preventDefault();
    if (!db || !claimTarget) return;
    setError('');
    setNotice('');
    setBusyId(claimTarget.id);
    try {
      const claimedNgn = Math.round(Number(claimAmountInput || 0));
      const evidence = claimEvidenceUrlInput.trim()
        ? [
            {
              url: claimEvidenceUrlInput.trim(),
              media_type: 'photo' as const,
              caption: claimIssueInput.trim().slice(0, 80),
              captured_at: new Date().toISOString(),
            },
          ]
        : [];

      validateCautionDamageClaim({
        depositAmountNgn: Number(claimTarget.refundable_deposit || 0),
        claimedAmountNgn: claimedNgn,
        issueDescription: claimIssueInput,
        evidence,
        excludesNormalWearAndTear: claimExcludeWearTear,
      });

      const { error: rpcErr } = await db.rpc('submit_caution_damage_claim', {
        target_booking_id: claimTarget.id,
        issue_description: claimIssueInput,
        claimed_amount_ngn: claimedNgn,
        evidence_items: evidence,
        excludes_wear_and_tear: claimExcludeWearTear,
      });
      if (rpcErr) throw new Error(rpcErr.message);

      setClaimTarget(null);
      setClaimAmountInput('');
      setClaimIssueInput('');
      setClaimEvidenceUrlInput('');
      setNotice(
        `Caution deduction claim recorded for ${claimTarget.reference}. Guest can review and respond before admin reconciliation.`,
      );
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not submit caution claim.',
      );
    } finally {
      setBusyId('');
    }
  }

  async function handleReplyToEnquiry(event: FormEvent) {
    event.preventDefault();
    if (!db || !enquiryTarget) return;
    setError('');
    setNotice('');
    setBusyId(enquiryTarget.id);
    try {
      const { error: rpcErr } = await db.rpc('respond_to_property_enquiry', {
        target_enquiry_id: enquiryTarget.id,
        response_message: enquiryReplyText,
        next_status: 'answered',
      });
      if (rpcErr) throw new Error(rpcErr.message);
      setEnquiryTarget(null);
      setEnquiryReplyText('');
      setNotice(`Reply recorded for ${enquiryTarget.guest_name}.`);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not send enquiry reply.');
    } finally {
      setBusyId('');
    }
  }

  const overdueCount = useMemo(
    () =>
      bookings.filter(
        b =>
          computeBookingResponseIndicator({
            status: b.status,
            createdAt: b.created_at,
          }).isOverdue,
      ).length,
    [bookings],
  );

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <main className="shell flex-1 py-8 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Partner Booking Review</p>
            <h1 className="serif mt-2 text-3xl font-medium text-ink-900 sm:text-5xl">
              Booking requests
            </h1>
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

        {overdueCount > 0 && (
          <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs font-semibold text-amber-950">
            Action needed: {overdueCount} booking{' '}
            {overdueCount === 1 ? 'request has' : 'requests have'} waited over 12 hours for calendar confirmation. Prompt confirmation protects guest trust.
          </div>
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
                  <div className="text-right">
                    <span className="inline-block rounded-full bg-paper px-3.5 py-1.5 text-xs font-bold text-ink-900">
                      {
                        computeBookingResponseIndicator({
                          status: b.status,
                          createdAt: b.created_at,
                        }).bookingStatusLabel
                      }
                    </span>
                    <p
                      className={`m-0 mt-1 text-[11px] font-semibold ${
                        computeBookingResponseIndicator({
                          status: b.status,
                          createdAt: b.created_at,
                        }).isOverdue
                          ? 'text-amber-800'
                          : 'text-ink-500'
                      }`}
                    >
                      {
                        computeBookingResponseIndicator({
                          status: b.status,
                          createdAt: b.created_at,
                        }).ownerResponseLabel
                      }
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-600">
                  <span>
                    Owner allocation:{' '}
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
                  <span>
                    Caution deposit (separate):{' '}
                    <strong className="font-mono text-ink-900">
                      {Number(b.refundable_deposit) > 0
                        ? `${formatNaira(Number(b.refundable_deposit))} (${
                            CAUTION_STATUS_LABELS[
                              cautionByBooking[b.id]?.status || 'due'
                            ]
                          })`
                        : CAUTION_STATUS_LABELS.not_applicable}
                    </strong>
                  </span>
                </div>

                {(inspectionsByBooking[b.id]?.length || 0) > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-2 text-[11px] text-ink-700">
                    {inspectionsByBooking[b.id].map(insp => (
                      <span
                        key={insp.id}
                        className="rounded-full border border-ink-200 bg-paper px-3 py-1 font-semibold"
                      >
                        {insp.inspection_stage === 'check_in' ? 'Check-in' : 'Check-out'}:{' '}
                        {insp.property_condition.replace('_', ' ')} (guest:{' '}
                        {insp.guest_acknowledgement_status})
                      </span>
                    ))}
                  </div>
                )}

                {cautionByBooking[b.id]?.guest_deduction_response && (
                  <p className="mt-2.5 mb-0 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
                    <strong>Guest response on caution claim:</strong>{' '}
                    {cautionByBooking[b.id].guest_deduction_response}
                  </p>
                )}

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

                  {sprintReady && ['confirmed', 'completed'].includes(b.status) && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setInspStage(b.status === 'completed' ? 'check_out' : 'check_in');
                          setInspectionTarget(b);
                        }}
                        className="secondary-button min-h-[44px]"
                      >
                        Record inspection
                      </button>

                      {Number(b.refundable_deposit) > 0 && (
                        <button
                          type="button"
                          onClick={() => setClaimTarget(b)}
                          className="secondary-button min-h-[44px]"
                        >
                          Caution claim
                        </button>
                      )}
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

        {enquiries.length > 0 && (
          <section className="mt-10">
            <h2 className="serif text-2xl font-medium text-ink-900">
              Guest enquiries ({enquiries.length})
            </h2>
            <div className="mt-4 space-y-3">
              {enquiries.map(enq => (
                <article
                  key={enq.id}
                  className="rounded-3xl border border-ink-100 bg-white p-5 text-xs"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="m-0 font-bold text-ink-900">
                        {enq.guest_name} ({enq.guest_email}) ·{' '}
                        {enq.properties?.title || enq.property_id}
                      </p>
                      <p className="m-0 mt-0.5 text-ink-500">
                        Sent {formatDate(enq.created_at)}
                      </p>
                    </div>
                    <span className="rounded-full bg-paper px-3 py-1 font-bold text-ink-800">
                      {enq.status}
                    </span>
                  </div>
                  <p className="m-0 mt-2 text-ink-700">{enq.message}</p>
                  {enq.partner_response ? (
                    <p className="m-0 mt-2 rounded-2xl bg-emerald-50 p-3 text-emerald-950">
                      <strong>Your reply:</strong> {enq.partner_response}
                    </p>
                  ) : (
                    sprintReady && (
                      <button
                        type="button"
                        onClick={() => {
                          setEnquiryReplyText('');
                          setEnquiryTarget(enq);
                        }}
                        className="secondary-button mt-3 min-h-[38px] text-xs"
                      >
                        Respond to enquiry
                      </button>
                    )
                  )}
                </article>
              ))}
            </div>
          </section>
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

        <FocusedDrawer
          open={Boolean(inspectionTarget)}
          title="Property condition inspection"
          subtitle={inspectionTarget?.reference || ''}
          onClose={() => setInspectionTarget(null)}
        >
          {inspectionTarget && (
            <form onSubmit={handleSubmitInspection} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Inspection stage">
                  {fieldProps => (
                    <select
                      {...fieldProps}
                      value={inspStage}
                      onChange={e =>
                        setInspStage(e.target.value as 'check_in' | 'check_out')
                      }
                      className={FIELD_INPUT_CLASS}
                    >
                      <option value="check_in">Check-in inspection</option>
                      <option value="check_out">Check-out inspection</option>
                    </select>
                  )}
                </FormField>
                <FormField label="Overall condition">
                  {fieldProps => (
                    <select
                      {...fieldProps}
                      value={inspCondition}
                      onChange={e =>
                        setInspCondition(
                          e.target.value as 'excellent' | 'good' | 'fair' | 'issues_noted',
                        )
                      }
                      className={FIELD_INPUT_CLASS}
                    >
                      <option value="excellent">Excellent</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="issues_noted">Issues noted</option>
                    </select>
                  )}
                </FormField>
              </div>

              <FormField label="Furniture & appliances">
                {fieldProps => (
                  <textarea
                    {...fieldProps}
                    rows={2}
                    required
                    value={inspFurniture}
                    onChange={e => setInspFurniture(e.target.value)}
                    className={`${FIELD_INPUT_CLASS} resize-y`}
                  />
                )}
              </FormField>

              <FormField label="Utilities & backup power">
                {fieldProps => (
                  <textarea
                    {...fieldProps}
                    rows={2}
                    required
                    value={inspUtilities}
                    onChange={e => setInspUtilities(e.target.value)}
                    className={`${FIELD_INPUT_CLASS} resize-y`}
                  />
                )}
              </FormField>

              <FormField label="Existing or reported damage" optional>
                {fieldProps => (
                  <textarea
                    {...fieldProps}
                    rows={2}
                    value={inspDamage}
                    onChange={e => setInspDamage(e.target.value)}
                    placeholder="Leave blank if none; normal wear & tear is excluded."
                    className={`${FIELD_INPUT_CLASS} resize-y`}
                  />
                )}
              </FormField>

              <FormField label="Missing items" optional>
                {fieldProps => (
                  <input
                    {...fieldProps}
                    type="text"
                    value={inspMissing}
                    onChange={e => setInspMissing(e.target.value)}
                    placeholder="Leave blank if all inventory is accounted for."
                    className={FIELD_INPUT_CLASS}
                  />
                )}
              </FormField>

              <FormField label="Timestamped photo/video evidence URL" optional>
                {fieldProps => (
                  <input
                    {...fieldProps}
                    type="url"
                    value={inspEvidenceUrl}
                    onChange={e => setInspEvidenceUrl(e.target.value)}
                    placeholder="https://…"
                    className={FIELD_INPUT_CLASS}
                  />
                )}
              </FormField>

              <FormField label="Evidence caption" optional>
                {fieldProps => (
                  <input
                    {...fieldProps}
                    type="text"
                    value={inspEvidenceCaption}
                    onChange={e => setInspEvidenceCaption(e.target.value)}
                    placeholder="e.g. Living room condition at handover"
                    className={FIELD_INPUT_CLASS}
                  />
                )}
              </FormField>

              <button
                type="submit"
                disabled={Boolean(busyId)}
                className="primary-button min-h-[48px] w-full"
              >
                Save inspection checklist
              </button>
            </form>
          )}
        </FocusedDrawer>

        <FocusedDrawer
          open={Boolean(claimTarget)}
          title="Submit caution deduction claim"
          subtitle={claimTarget?.reference || ''}
          onClose={() => setClaimTarget(null)}
        >
          {claimTarget && (
            <form onSubmit={handleSubmitCautionClaim} className="space-y-4">
              <p className="m-0 rounded-2xl bg-paper p-3 text-xs text-ink-700">
                Recorded caution deposit:{' '}
                <strong>{formatNaira(Number(claimTarget.refundable_deposit))}</strong>. Every deduction claim requires timestamped photo/video evidence and is open to guest response and HAMLET admin review.
              </p>

              <FormField label="Claimed deduction amount (₦)">
                {fieldProps => (
                  <input
                    {...fieldProps}
                    type="number"
                    min={500}
                    max={Number(claimTarget.refundable_deposit)}
                    required
                    value={claimAmountInput}
                    onChange={e => setClaimAmountInput(e.target.value)}
                    className={FIELD_INPUT_CLASS}
                  />
                )}
              </FormField>

              <FormField label="Description of damage or missing item">
                {fieldProps => (
                  <textarea
                    {...fieldProps}
                    rows={3}
                    required
                    minLength={12}
                    value={claimIssueInput}
                    onChange={e => setClaimIssueInput(e.target.value)}
                    placeholder="Describe specific damage beyond normal wear and tear…"
                    className={`${FIELD_INPUT_CLASS} resize-y`}
                  />
                )}
              </FormField>

              <FormField label="Timestamped photo/video evidence URL">
                {fieldProps => (
                  <input
                    {...fieldProps}
                    type="url"
                    required
                    value={claimEvidenceUrlInput}
                    onChange={e => setClaimEvidenceUrlInput(e.target.value)}
                    placeholder="https://…"
                    className={FIELD_INPUT_CLASS}
                  />
                )}
              </FormField>

              <label className="flex items-start gap-2.5 text-xs text-ink-800">
                <input
                  type="checkbox"
                  checked={claimExcludeWearTear}
                  onChange={e => setClaimExcludeWearTear(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  I confirm this claim relates to actual damage or missing items and excludes normal wear and tear.
                </span>
              </label>

              <button
                type="submit"
                disabled={Boolean(busyId)}
                className="primary-button min-h-[48px] w-full"
              >
                Submit documented claim
              </button>
            </form>
          )}
        </FocusedDrawer>

        <FocusedDrawer
          open={Boolean(enquiryTarget)}
          title="Respond to guest enquiry"
          subtitle={enquiryTarget?.guest_name || ''}
          onClose={() => setEnquiryTarget(null)}
        >
          {enquiryTarget && (
            <form onSubmit={handleReplyToEnquiry} className="space-y-4">
              <p className="m-0 rounded-2xl bg-paper p-3 text-xs text-ink-700">
                {enquiryTarget.message}
              </p>
              <FormField label="Your response">
                {fieldProps => (
                  <textarea
                    {...fieldProps}
                    rows={3}
                    required
                    minLength={4}
                    value={enquiryReplyText}
                    onChange={e => setEnquiryReplyText(e.target.value)}
                    className={`${FIELD_INPUT_CLASS} resize-y`}
                  />
                )}
              </FormField>
              <button
                type="submit"
                disabled={Boolean(busyId)}
                className="primary-button min-h-[48px] w-full"
              >
                Save response
              </button>
            </form>
          )}
        </FocusedDrawer>
      </main>

      <SiteFooter />
    </div>
  );
}
