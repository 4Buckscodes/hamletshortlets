import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  Bath,
  BedDouble,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  MapPin,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  XCircle,
} from 'lucide-react';
import { useHamlet } from '../../lib/store';
import { useToast } from '../../lib/toast';
import { BookingStatusPill, PropertyStatusPill } from '../../components/Badges';
import { buildWorkspaceSignInPath } from '../../lib/authRedirect';
import { propertyIdsOf } from '../../lib/partnerUtils';
import { formatDate, formatDateTime, formatNaira } from '../../lib/pricing';

export default function PartnerBookingReview() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { state, bookingTransition, transitionCautionDeposit, refreshState, backendConfigured, signOut } = useHamlet();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const session = state.session!;
  const userId = session.userId;
  const isSuspended = session.accountStatus === 'suspended';

  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [partnerNote, setPartnerNote] = useState('');
  const [showDeclineBox, setShowDeclineBox] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [busyAction, setBusyAction] = useState<'checking' | 'awaiting_payment' | 'declined' | null>(null);
  const [inspectionNote, setInspectionNote] = useState('');
  const [savingCaution, setSavingCaution] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const authorizedPropertyIds = useMemo(
    () => new Set(propertyIdsOf(state, userId)),
    [state, userId],
  );

  const normalizedParam = (bookingId ?? '').trim().toLowerCase();
  const matchedBooking = useMemo(
    () =>
      state.bookings.find(
        b => b.id.toLowerCase() === normalizedParam || b.ref.toLowerCase() === normalizedParam,
      ),
    [state.bookings, normalizedParam],
  );

  const isAuthorizedForBooking = Boolean(
    matchedBooking && authorizedPropertyIds.has(matchedBooking.propertyId),
  );
  const booking = isAuthorizedForBooking ? matchedBooking : undefined;

  const property = useMemo(
    () => (booking ? state.properties.find(p => p.id === booking.propertyId) : undefined),
    [state.properties, booking],
  );

  const myAssignment = useMemo(
    () =>
      booking
        ? state.assignments.find(
            a => a.propertyId === booking.propertyId && a.partnerId === userId && a.status === 'active',
          )
        : undefined,
    [state.assignments, booking, userId],
  );

  const overlappingActiveBookings = useMemo(() => {
    if (!booking) return [];
    return state.bookings.filter(
      other =>
        other.id !== booking.id &&
        other.propertyId === booking.propertyId &&
        (other.status === 'confirmed' || other.status === 'awaiting_payment') &&
        new Date(other.checkIn) < new Date(booking.checkOut) &&
        new Date(other.checkOut) > new Date(booking.checkIn),
    );
  }, [state.bookings, booking]);

  const handleSwitchAccount = async () => {
    const returnUrl = buildWorkspaceSignInPath(`${location.pathname}${location.search}`);
    try {
      await signOut();
    } catch {
      // Continue to sign-in screen
    }
    navigate(returnUrl);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshState();
      toast('Latest booking state loaded.');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not refresh booking state.', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  if (!booking) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Link
          to="/partner/bookings"
          className="inline-flex items-center gap-1.5 text-[12px] font-bold text-ink-300 hover:text-white"
        >
          <ArrowLeft size={14} className="shrink-0" /> Back to partner bookings
        </Link>

        <div
          role="alert"
          className="mx-auto mt-8 max-w-xl rounded-2xl border border-red-500/35 bg-ink-900 p-6 text-center sm:p-8"
        >
          <ShieldAlert size={40} className="mx-auto text-red-400" />
          <p className="mt-3 text-[10.5px] font-extrabold uppercase tracking-[0.2em] text-red-300">
            Access restricted or booking unavailable
          </p>
          <h1 className="mt-1.5 font-display text-2xl font-black text-ink-50">
            You cannot view this booking request
          </h1>
          <p className="mt-2 text-[12.5px] font-medium leading-relaxed text-ink-300">
            Either this booking reference does not exist or your signed-in partner account (
            <span className="font-bold text-ink-100">{session.email}</span>) does not hold active
            management authority for the requested property. Private property and guest details are
            not disclosed.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <Link to="/partner/bookings" className="btn-brass !py-2.5 text-[12px]">
              Go to my bookings
            </Link>
            <button
              type="button"
              onClick={() => void handleSwitchAccount()}
              className="btn-ghost-dark !border !border-ink-700 !py-2.5 text-[12px]"
            >
              Sign in with another partner account
            </button>
          </div>
        </div>
      </div>
    );
  }

  const actionable =
    !isSuspended && (booking.status === 'requested' || booking.status === 'checking');
  const partnerProceeds = booking.accommodationSubtotal + booking.mandatoryTotal;
  const images = property?.images ?? [];
  const safeImageIdx = images.length > 0 ? selectedImageIdx % images.length : 0;

  const submitDecision = async (
    nextStatus: 'checking' | 'awaiting_payment' | 'declined',
    noteOverride?: string,
  ) => {
    setBusyAction(nextStatus);
    try {
      const cleanNote = (noteOverride ?? partnerNote).trim() || undefined;
      await bookingTransition(booking.id, nextStatus, {
        note: cleanNote,
        reason: nextStatus === 'declined' ? cleanNote : undefined,
      });
      if (nextStatus === 'awaiting_payment') {
        toast(
          `${booking.ref} availability confirmed — 48-hour payment window opened for the guest.`,
          'success',
        );
        setPartnerNote('');
      } else if (nextStatus === 'declined') {
        toast(`${booking.ref} marked unavailable and declined.`, 'info');
        setShowDeclineBox(false);
        setDeclineReason('');
      } else {
        toast(`${booking.ref} marked as checking availability & terms.`, 'info');
      }
    } catch (error) {
      toast(
        error instanceof Error ? error.message : 'Could not record availability decision.',
        'error',
      );
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Top breadcrumb & refresh rail */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/partner/bookings"
          className="inline-flex items-center gap-1.5 text-[12px] font-bold text-ink-300 hover:text-white"
        >
          <ArrowLeft size={14} className="shrink-0" /> All partner bookings
        </Link>
        {backendConfigured && (
          <button
            type="button"
            disabled={refreshing}
            onClick={() => void handleRefresh()}
            className="btn-ghost-dark !border !border-ink-700 !px-3.5 !py-2 text-[11.5px] disabled:opacity-50"
          >
            <RefreshCcw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh status
          </button>
        )}
      </div>

      {/* Header */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-brass-400">
            Partner availability review
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
            <h1 className="break-words font-display text-2xl font-black text-ink-50 sm:text-3xl">
              Booking {booking.ref}
            </h1>
            <BookingStatusPill status={booking.status} />
          </div>
          <p className="mt-1 text-[12px] font-medium text-ink-300">
            Requested {formatDateTime(booking.requestedAt)} · Review the exact property and guest
            stay terms below before submitting your decision.
          </p>
        </div>
        <div className="rounded-2xl border border-brass-500/30 bg-brass-500/10 px-4 py-3 sm:text-right">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-brass-300">
            Your proceeds (0% owner fee)
          </p>
          <p className="mt-0.5 font-display text-2xl font-black tabular-nums text-brass-200">
            {formatNaira(partnerProceeds)}
          </p>
        </div>
      </div>

      {/* Overlap alert if another active booking intersects these dates */}
      {overlappingActiveBookings.length > 0 && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-3 rounded-2xl border border-red-500/40 bg-red-950/50 px-4 py-3.5 text-[12px] font-semibold text-red-200 sm:px-5"
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-400" />
          <div className="min-w-0">
            <p className="font-extrabold uppercase tracking-wider text-red-300">
              Date conflict detected ({overlappingActiveBookings.length})
            </p>
            <p className="mt-0.5 leading-relaxed">
              These dates overlap active booking{' '}
              {overlappingActiveBookings.map(o => `${o.ref} (${o.status.replace('_', ' ')})`).join(', ')}.
              Server validation prevents confirming overlapping dates.
            </p>
          </div>
        </div>
      )}

      {/* Distinct Two-Column Review Grid: Property Details vs Guest Booking Request */}
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        {/* ── Left Column: Property Being Requested ── */}
        <section
          aria-labelledby="property-section-heading"
          className="overflow-hidden rounded-2xl border border-ink-800 bg-ink-900 lg:col-span-6"
        >
          <div className="border-b border-ink-800 bg-ink-850/60 px-4 py-3 sm:px-5">
            <p className="flex items-center gap-2 text-[10.5px] font-extrabold uppercase tracking-[0.2em] text-brass-400">
              <Building2 size={14} className="shrink-0" />
              <span id="property-section-heading">1. Property being requested</span>
            </p>
          </div>

          {images.length > 0 && (
            <div className="p-4 pb-0 sm:p-5 sm:pb-0">
              <div className="overflow-hidden rounded-xl border border-ink-800">
                <img
                  src={images[safeImageIdx]}
                  alt={`${property?.title ?? booking.propertyTitle} — photo ${safeImageIdx + 1}`}
                  className="h-52 w-full object-cover sm:h-60"
                />
              </div>
              {images.length > 1 && (
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {images.slice(0, 4).map((src, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImageIdx(idx)}
                      className={`overflow-hidden rounded-lg border-2 transition ${
                        idx === safeImageIdx
                          ? 'border-brass-400 opacity-100'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={src} alt="" className="h-14 w-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              {property && <PropertyStatusPill status={property.status} />}
              {property?.trustLabel && (
                <span className="inline-flex items-center gap-1 rounded-full border border-jade-600/40 bg-jade-950/50 px-2.5 py-0.5 text-[10px] font-bold text-jade-300">
                  <ShieldCheck size={12} className="shrink-0" /> {property.trustLabel}
                </span>
              )}
            </div>

            <h2 className="mt-2 break-words font-display text-xl font-black text-ink-50">
              {property?.title ?? booking.propertyTitle}
            </h2>

            <p className="mt-1 flex items-start gap-1.5 text-[12px] font-semibold text-ink-300">
              <MapPin size={14} className="mt-0.5 shrink-0 text-brass-400" />
              <span>
                {property ? `${property.address} · ${property.area}` : `${booking.area}, Lagos`}
              </span>
            </p>

            {property && (
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-ink-800 py-3 text-[11.5px] font-semibold text-ink-200">
                <span className="inline-flex items-center gap-1.5">
                  <BedDouble size={14} className="shrink-0 text-brass-400" />
                  {property.bedrooms} bed · {property.bedSetup}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Bath size={14} className="shrink-0 text-brass-400" />
                  {property.bathrooms} bath
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users size={14} className="shrink-0 text-brass-400" />
                  Sleeps {property.capacity}
                </span>
              </div>
            )}

            {/* Partner assignment / authority summary */}
            <div className="mt-4 rounded-xl border border-ink-800 bg-ink-950/60 p-3.5 text-[11.5px]">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-400">
                Your partner authority on this listing
              </p>
              <p className="mt-1 font-bold text-ink-100">
                {myAssignment?.partnerRole ?? session.partnerRole ?? property?.submittedRole ?? 'Authorised Partner'}{' '}
                · {session.name}
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-ink-400">
                Scope: {myAssignment?.scope ?? property?.authorityBasis ?? 'Active property partner'}
              </p>
            </div>

            {property && property.amenities.length > 0 && (
              <div className="mt-4">
                <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-ink-400">
                  <Sparkles size={12} className="shrink-0 text-brass-400" /> Key amenities
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {property.amenities.map(amenity => (
                    <span
                      key={amenity}
                      className="rounded-lg border border-ink-800 bg-ink-850 px-2.5 py-1 text-[11px] font-semibold text-ink-200"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {property && property.houseRules.length > 0 && (
              <div className="mt-4">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-400">
                  Disclosed house rules
                </p>
                <ul className="mt-1.5 space-y-1 text-[11.5px] font-medium text-ink-300">
                  {property.houseRules.map(rule => (
                    <li key={rule} className="break-words">
                      • {rule}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* ── Right Column: Guest Request Details & Availability Decision ── */}
        <div className="space-y-6 lg:col-span-6">
          <section
            aria-labelledby="request-section-heading"
            className="overflow-hidden rounded-2xl border border-ink-800 bg-ink-900"
          >
            <div className="border-b border-ink-800 bg-ink-850/60 px-4 py-3 sm:px-5">
              <p className="flex items-center gap-2 text-[10.5px] font-extrabold uppercase tracking-[0.2em] text-brass-400">
                <FileText size={14} className="shrink-0" />
                <span id="request-section-heading">2. Guest booking request details</span>
              </p>
            </div>

            <div className="p-4 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-ink-800 bg-ink-950/60 p-3.5">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-400">
                    Check-in → Check-out
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-[13px] font-bold text-ink-50">
                    <CalendarDays size={14} className="shrink-0 text-brass-400" />
                    <span>
                      {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold text-ink-400">
                    {booking.nights} night{booking.nights === 1 ? '' : 's'}
                  </p>
                </div>

                <div className="rounded-xl border border-ink-800 bg-ink-950/60 p-3.5">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-400">
                    Guest & party size
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-[13px] font-bold text-ink-50">
                    <Users size={14} className="shrink-0 text-brass-400" />
                    <span className="break-words">{booking.guestName}</span>
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold text-ink-400">
                    {booking.guests} guest{booking.guests === 1 ? '' : 's'}
                    {property ? ` (max ${property.capacity})` : ''}
                  </p>
                </div>
              </div>

              {/* Guest note / special requests */}
              <div className="mt-4 rounded-xl border border-ink-800 bg-ink-950/50 p-3.5">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-400">
                  Guest special requests / arrival note
                </p>
                <p className="mt-1 break-words text-[12px] font-medium text-ink-200">
                  {booking.specialRequests
                    ? `“${booking.specialRequests}”`
                    : 'No special requests submitted.'}
                </p>
              </div>

              {/* Financial breakdown */}
              <div className="mt-4 rounded-xl border border-ink-800 bg-ink-950/60 p-4">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-400">
                  Pricing & proceeds breakdown
                </p>
                <dl className="mt-2.5 space-y-1.5 text-[12px] font-medium text-ink-200">
                  <div className="flex justify-between gap-3">
                    <dt className="min-w-0">
                      Accommodation ({booking.nights} night{booking.nights === 1 ? '' : 's'})
                    </dt>
                    <dd className="shrink-0 tabular-nums">
                      {formatNaira(booking.accommodationSubtotal)}
                    </dd>
                  </div>
                  {booking.mandatoryCharges.map(charge => (
                    <div key={charge.label} className="flex justify-between gap-3">
                      <dt className="min-w-0 break-words">{charge.label}</dt>
                      <dd className="shrink-0 tabular-nums">{formatNaira(charge.amount)}</dd>
                    </div>
                  ))}
                  {booking.mandatoryCharges.length === 0 && booking.mandatoryTotal > 0 && (
                    <div className="flex justify-between gap-3">
                      <dt className="min-w-0">Disclosed mandatory charges</dt>
                      <dd className="shrink-0 tabular-nums">{formatNaira(booking.mandatoryTotal)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-3 border-t border-ink-800 pt-2 font-bold text-brass-300">
                    <dt className="min-w-0">Your gross proceeds (0% HAMLET owner fee)</dt>
                    <dd className="shrink-0 tabular-nums">{formatNaira(partnerProceeds)}</dd>
                  </div>
                  <div className="flex justify-between gap-3 pt-1 text-[11px] text-ink-400">
                    <dt className="min-w-0">HAMLET domestic accommodation markup (20% paid by guest)</dt>
                    <dd className="shrink-0 tabular-nums">{formatNaira(booking.hamletGuestFee)}</dd>
                  </div>
                  <div className="flex justify-between gap-3 text-[11px] font-semibold text-ink-300">
                    <dt className="min-w-0">Guest stay total (before caution deposit)</dt>
                    <dd className="shrink-0 tabular-nums">{formatNaira(booking.guestTotal)}</dd>
                  </div>
                  <div className="flex justify-between gap-3 text-[11px] text-ink-400">
                    <dt className="min-w-0">Refundable caution deposit (held separately, unbuffered)</dt>
                    <dd className="shrink-0 tabular-nums">{formatNaira(booking.deposit)}</dd>
                  </div>
                </dl>
                {(() => {
                  const caution = state.cautionDeposits.find(cd => cd.bookingId === booking.id);
                  if (!caution) return null;
                  return (
                    <div className="mt-3 rounded-xl border border-ink-800 bg-ink-900 p-3 text-[11.5px] text-ink-200">
                      <p className="font-bold text-brass-300">
                        Caution deposit: {formatNaira(caution.amountNgn)} · <span className="uppercase">{caution.status.replace(/_/g, ' ')}</span>
                      </p>
                      {caution.inspectionNotes && <p className="mt-1 text-ink-400">Inspection note: {caution.inspectionNotes}</p>}
                      {!isSuspended && ['confirmed', 'completed'].includes(booking.status) && ['received', 'inspection_pending'].includes(caution.status) && (
                        <div className="mt-2.5 space-y-2 border-t border-ink-800 pt-2.5">
                          <input
                            className="input-dark !py-1.5 text-[11.5px]"
                            placeholder="Post-checkout inspection notes / evidence ref…"
                            value={inspectionNote}
                            onChange={e => setInspectionNote(e.target.value)}
                          />
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={savingCaution}
                              onClick={async () => {
                                setSavingCaution(true);
                                try {
                                  await transitionCautionDeposit(booking.id, 'refund_approved', {
                                    refundedAmountNgn: caution.amountNgn,
                                    deductedAmountNgn: 0,
                                    inspectionNotes: inspectionNote.trim() || 'Post-checkout inspection clear — full refund approved by host.',
                                  });
                                  toast('Full caution deposit refund approved.');
                                } catch (err) {
                                  toast(err instanceof Error ? err.message : 'Could not update deposit.', 'error');
                                } finally {
                                  setSavingCaution(false);
                                }
                              }}
                              className="btn-brass !px-3 !py-1.5 text-[11px]"
                            >
                              Approve full deposit refund
                            </button>
                            <button
                              type="button"
                              disabled={savingCaution}
                              onClick={async () => {
                                if (inspectionNote.trim().length < 8) {
                                  toast('Enter damage/evidence notes (min 8 chars) to request HAMLET admin review.', 'error');
                                  return;
                                }
                                setSavingCaution(true);
                                try {
                                  await transitionCautionDeposit(booking.id, 'refund_disputed', {
                                    inspectionNotes: inspectionNote.trim(),
                                    evidence: [inspectionNote.trim()],
                                  });
                                  toast('Inspection evidence logged — escalated to HAMLET operations for deduction review.', 'info');
                                } catch (err) {
                                  toast(err instanceof Error ? err.message : 'Could not update deposit.', 'error');
                                } finally {
                                  setSavingCaution(false);
                                }
                              }}
                              className="btn-ghost-dark !border !border-amber-500/40 !px-3 !py-1.5 text-[11px] text-amber-300"
                            >
                              Flag damage for admin deduction review
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </section>

          {/* ── Decision Controls OR Already-Handled State ── */}
          <section
            aria-labelledby="decision-section-heading"
            className="overflow-hidden rounded-2xl border border-brass-500/35 bg-ink-900"
          >
            <div className="border-b border-ink-800 bg-brass-500/10 px-4 py-3 sm:px-5">
              <p className="flex items-center gap-2 text-[10.5px] font-extrabold uppercase tracking-[0.2em] text-brass-300">
                <CheckCircle2 size={14} className="shrink-0" />
                <span id="decision-section-heading">3. Availability decision</span>
              </p>
            </div>

            <div className="p-4 sm:p-5">
              {actionable ? (
                <>
                  <p className="text-[12px] font-medium leading-relaxed text-ink-200">
                    Confirming availability holds these dates for{' '}
                    <strong className="text-ink-50">48 hours</strong> while the guest completes
                    payment on HAMLET (<span className="font-mono text-[11px]">awaiting_payment</span>
                    ). The booking is <strong className="text-brass-300">not confirmed</strong>{' '}
                    until Paystack’s server webhook verifies payment.
                  </p>

                  <label className="mt-4 block">
                    <span className="label-dark">
                      Optional note for guest & HAMLET operations (included in confirmation update)
                    </span>
                    <input
                      className="input-dark !py-2 text-[12px]"
                      placeholder="e.g. Check-in from 2:00 PM; estate gate pass issued after payment confirmation…"
                      value={partnerNote}
                      onChange={e => setPartnerNote(e.target.value)}
                    />
                  </label>

                  <div className="mt-4 flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      disabled={busyAction !== null || overlappingActiveBookings.length > 0}
                      onClick={() => void submitDecision('awaiting_payment')}
                      className="btn-brass !px-4 !py-2.5 text-[12px] disabled:opacity-50"
                    >
                      <CheckCircle2 size={15} />
                      {busyAction === 'awaiting_payment'
                        ? 'Confirming availability…'
                        : 'Confirm availability — set 48h payment window'}
                    </button>

                    {booking.status === 'requested' && (
                      <button
                        type="button"
                        disabled={busyAction !== null}
                        onClick={() => void submitDecision('checking')}
                        className="btn-ghost-dark !border !border-ink-700 !px-3.5 !py-2.5 text-[11.5px] disabled:opacity-50"
                      >
                        <Clock3 size={14} />
                        {busyAction === 'checking' ? 'Saving…' : 'Mark as checking'}
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={busyAction !== null}
                      onClick={() => setShowDeclineBox(prev => !prev)}
                      className="btn-ghost-dark !border !border-red-900/60 !px-3.5 !py-2.5 text-[11.5px] text-red-300 hover:text-red-200 disabled:opacity-50"
                    >
                      <XCircle size={15} /> Property unavailable — decline
                    </button>
                  </div>

                  {showDeclineBox && (
                    <div className="mt-4 rounded-xl border border-red-500/35 bg-red-950/30 p-4">
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-red-300">
                        Confirm property unavailable
                      </p>
                      <p className="mt-1 text-[11.5px] font-medium text-ink-300">
                        The guest and HAMLET operations will be notified that these dates cannot be
                        accommodated. No payment will be collected.
                      </p>
                      <input
                        autoFocus
                        className="input-dark mt-3 !py-2 text-[12px]"
                        placeholder="Reason for declining (shared respectfully with guest)…"
                        value={declineReason}
                        onChange={e => setDeclineReason(e.target.value)}
                      />
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busyAction !== null}
                          onClick={() =>
                            void submitDecision(
                              'declined',
                              declineReason.trim() ||
                                'Requested dates are unavailable after calendar review.',
                            )
                          }
                          className="rounded-xl bg-red-600 px-4 py-2 text-[11.5px] font-bold text-white hover:bg-red-500 disabled:opacity-50"
                        >
                          {busyAction === 'declined'
                            ? 'Recording decision…'
                            : 'Confirm property unavailable'}
                        </button>
                        <button
                          type="button"
                          disabled={busyAction !== null}
                          onClick={() => setShowDeclineBox(false)}
                          className="btn-ghost-dark !px-3 !py-2 text-[11px]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-xl border border-ink-800 bg-ink-950/70 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-brass-300">
                      {isSuspended ? 'Decisions paused' : 'Availability review already handled'}
                    </span>
                    <BookingStatusPill status={booking.status} />
                  </div>
                  <p className="mt-2 text-[12px] font-medium leading-relaxed text-ink-300">
                    {isSuspended
                      ? 'Your partner account is currently suspended. Booking actions are disabled until HAMLET operations reinstates your account.'
                      : booking.status === 'awaiting_payment'
                        ? `Availability has already been confirmed. Waiting for guest payment${booking.paymentDeadline ? ` until ${formatDateTime(booking.paymentDeadline)}` : ''}. This booking becomes confirmed only after Paystack’s server webhook verifies payment — never accept screenshots or off-platform receipts.`
                        : booking.status === 'confirmed'
                          ? 'Guest payment has been verified server-side and this stay is confirmed. Duplicate availability decisions are locked.'
                          : booking.status === 'declined'
                            ? 'This booking request was already marked unavailable (declined). Conflicting decisions are prevented.'
                            : `This booking is currently ${booking.status.replace('_', ' ')}. No further availability decision can be submitted.`}
                  </p>
                </div>
              )}

              {/* Activity & Audit Timeline */}
              <div className="mt-5 border-t border-ink-800 pt-4">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink-400">
                  Recorded booking timeline
                </p>
                <ol className="mt-2.5 space-y-2.5">
                  {booking.timeline.map((event, idx) => (
                    <li
                      key={idx}
                      className="relative border-l-2 border-ink-800 pl-3.5 text-[11px] leading-snug"
                    >
                      <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-brass-400" />
                      <p className="font-bold text-ink-100">{event.label}</p>
                      <p className="text-[10.5px] font-medium text-ink-400">
                        {formatDateTime(event.at)} · {event.actor}
                        {event.detail ? ` · ${event.detail}` : ''}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
