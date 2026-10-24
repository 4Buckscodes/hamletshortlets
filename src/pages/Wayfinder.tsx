import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft, Navigation, MapPin, ShieldCheck, Building2, DoorOpen, KeyRound,
  Copy, Check, Phone, AlertTriangle, HelpCircle, ExternalLink, Eye, EyeOff,
  Lock, Clock, Wifi, Compass, X, LifeBuoy, CheckCircle2, Info,
} from 'lucide-react';
import { GuestLayout } from '../components/Navbar';
import { ArrivalPhoto } from '../components/ArrivalPhoto';
import { useHoratio } from '../components/HoratioDrawer';
import { useHamlet } from '../lib/store';
import { usePageMeta } from '../lib/brand';
import { useToast } from '../lib/toast';
import { buildWorkspaceSignInPath } from '../lib/authRedirect';
import { formatDate, formatDateTime } from '../lib/pricing';
import {
  ARRIVAL_ISSUE_TYPE_LABELS,
  buildCopyableDriverSummary,
  buildGoogleMapsDirectionsUrl,
  CHECKIN_METHOD_LABELS,
  computeWayfinderReadiness,
  COORDINATE_POINT_TYPE_LABELS,
  formatCoordinatePair,
  STEP_TYPE_LABELS,
  WAYPOINT_TYPE_LABELS,
} from '../lib/wayfinder';
import type { ArrivalIssueType, GuestBookingWayfinderView, Issue } from '../lib/types';

export default function Wayfinder() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const location = useLocation();
  const {
    state,
    backendReady,
    getGuestBookingWayfinder,
    reportArrivalIssue,
    recordWayfinderEvent,
  } = useHamlet();
  const { toast } = useToast();
  const { openHoratio } = useHoratio();

  const [loadState, setLoadState] = useState<{
    targetId: string;
    data: GuestBookingWayfinderView | null;
    error: string | null;
  }>({ targetId: '', data: null, error: null });

  const [revealCodes, setRevealCodes] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [arrivalCategory, setArrivalCategory] = useState<ArrivalIssueType>('cannot_find_entrance');
  const [severity, setSeverity] = useState<Issue['severity']>('high');
  const [stepKey, setStepKey] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [evidenceNote, setEvidenceNote] = useState('');
  const [submittingIssue, setSubmittingIssue] = useState(false);

  const session = state.session;

  usePageMeta(
    loadState.data
      ? `Wayfinder · ${loadState.data.propertyTitle} | HAMLET`
      : 'HAMLET Wayfinder · Arrival Guidance',
    'Verified door-to-door arrival guidance and check-in instructions for your confirmed HAMLET stay.',
    { noindex: true, structuredData: null },
  );

  useEffect(() => {
    let active = true;
    const id = bookingId?.trim() ?? '';
    if (!backendReady || !session || !id) {
      return () => { active = false; };
    }

    void getGuestBookingWayfinder(id)
      .then(view => {
        if (!active) return;
        setLoadState({ targetId: id, data: view, error: null });
        void recordWayfinderEvent(view.bookingId, 'wayfinder_opened', {
          guide_available: view.guideAvailable,
          wayfinder_status: view.wayfinderStatus,
        });
        if (view.guideAvailable) {
          void recordWayfinderEvent(view.bookingId, 'arrival_guide_viewed', {
            revision: view.guide?.publishedRevision ?? 0,
          });
        }
      })
      .catch(err => {
        if (!active) return;
        setLoadState({
          targetId: id,
          data: null,
          error: err instanceof Error ? err.message : 'Could not load arrival guidance.',
        });
      });

    return () => {
      active = false;
    };
  }, [bookingId, backendReady, session, getGuestBookingWayfinder, recordWayfinderEvent]);

  const trimmedBookingId = bookingId?.trim() ?? '';
  const view = loadState.targetId === trimmedBookingId ? loadState.data : null;
  const errorMsg = loadState.targetId === trimmedBookingId ? loadState.error : null;
  const loading = !backendReady || (Boolean(session && trimmedBookingId) && loadState.targetId !== trimmedBookingId);

  const guide = view?.guide ?? null;

  const readiness = useMemo(
    () =>
      view
        ? computeWayfinderReadiness(
            { wayfinderStatus: view.wayfinderStatus },
            guide,
          )
        : null,
    [view, guide],
  );

  const primaryDirectionsUrl = useMemo(
    () =>
      guide
        ? buildGoogleMapsDirectionsUrl({
            latitude: guide.destinationLatitude,
            longitude: guide.destinationLongitude,
          })
        : null,
    [guide],
  );

  const driverCopyText = useMemo(() => {
    if (!view) return '';
    return buildCopyableDriverSummary({
      propertyTitle: view.propertyTitle,
      publicAddress: view.publicAddress,
      area: view.area,
      city: view.city,
      landmarks: view.publicLandmarks,
      estateOrBuildingName: guide?.estateOrBuildingName,
      preferredEntranceLabel: guide?.preferredEntranceLabel,
      parkingOrDropoffInstructions: guide?.parkingOrDropoffInstructions,
    });
  }, [view, guide]);

  const copyText = async (key: string, value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      toast(`${label} copied.`);
      window.setTimeout(() => {
        setCopiedKey(prev => (prev === key ? null : prev));
      }, 2200);
    } catch {
      toast(`Could not copy automatically — select and copy manually.`, 'error');
    }
  };

  if (!backendReady || loading) {
    return (
      <GuestLayout>
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <Compass size={36} className="mx-auto animate-pulse text-jade-700" />
          <p role="status" className="mt-3 text-sm font-semibold text-ink-600">
            Loading your verified Wayfinder arrival guide…
          </p>
        </div>
      </GuestLayout>
    );
  }

  if (!session) {
    const signInPath = buildWorkspaceSignInPath(`${location.pathname}${location.search}`);
    return (
      <GuestLayout>
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <Lock size={38} className="mx-auto text-jade-700" />
          <h1 className="mt-4 font-display text-2xl font-black text-ink-900">
            Sign in to open Wayfinder
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            Arrival guides, entrance pins, and check-in instructions are protected and available only to the authenticated guest on a confirmed booking.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <Link to={signInPath} className="btn-jade">
              Sign in to continue
            </Link>
            <Link to="/stays" className="btn-outline">
              Browse stays
            </Link>
          </div>
        </div>
      </GuestLayout>
    );
  }

  if (errorMsg || !view) {
    return (
      <GuestLayout>
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <AlertTriangle size={38} className="mx-auto text-amber-600" />
          <h1 className="mt-4 font-display text-2xl font-black text-ink-900">
            Wayfinder unavailable for this booking
          </h1>
          <p role="alert" className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950">
            {errorMsg || 'We could not find an eligible confirmed booking for this arrival guide.'}
          </p>
          <p className="mt-3 text-xs font-medium leading-relaxed text-ink-500">
            Door-to-door arrival guidance unlocks once a booking request is accepted and payment is confirmed server-side.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <Link to="/account" className="btn-jade">
              Back to My Bookings
            </Link>
            <Link to="/safety" className="btn-outline">
              Guest protection & support
            </Link>
          </div>
        </div>
      </GuestLayout>
    );
  }

  const isCompletedStay = view.bookingStatus === 'completed';
  const hasEntranceSection = Boolean(
    guide &&
      (guide.preferredEntranceLabel.trim() ||
        guide.entranceInstructions.trim() ||
        guide.securityDeskInstructions.trim() ||
        guide.entrancePhotoUrl),
  );
  const hasBuildingSection = Boolean(
    guide &&
      (guide.estateOrBuildingName.trim() ||
        guide.buildingOrBlock.trim() ||
        guide.buildingInstructions.trim() ||
        guide.parkingOrDropoffInstructions.trim() ||
        guide.buildingPhotoUrl),
  );
  const hasApartmentSection = Boolean(
    guide &&
      (guide.floorLabel.trim() ||
        guide.apartmentIdentifier.trim() ||
        guide.liftOrStairsInstructions.trim() ||
        guide.routeToDoor.trim() ||
        guide.doorLandmarkPhotoUrl),
  );
  const hasCheckInSection = Boolean(
    guide &&
      (guide.checkInInstructions.trim() ||
        guide.arrivalRestrictions.trim() ||
        guide.arrivalContactName.trim() ||
        guide.arrivalContactPhone.trim() ||
        view.hasSensitiveCodes),
  );

  const handleOpenDirections = (label: string) => {
    void recordWayfinderEvent(view.bookingId, 'directions_clicked', { target_label: label });
  };

  const handleHelpAction = (actionName: string) => {
    void recordWayfinderEvent(view.bookingId, 'help_action_selected', { action: actionName });
  };

  const submitArrivalProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (issueDescription.trim().length < 10) {
      toast('Please describe what is confusing or inaccurate (at least 10 characters).', 'error');
      return;
    }
    setSubmittingIssue(true);
    try {
      const created = await reportArrivalIssue({
        bookingId: view.bookingId,
        bookingRef: view.bookingReference,
        propertyTitle: view.propertyTitle,
        arrivalCategory,
        severity,
        description: issueDescription.trim(),
        stepKey: stepKey || undefined,
        evidence: evidenceNote.trim() ? [evidenceNote.trim()] : [],
      });
      toast(`Arrival issue ${created.ref} logged with HAMLET support.`);
      setIssueDescription('');
      setEvidenceNote('');
      setReportOpen(false);
      setHelpOpen(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not submit arrival issue.', 'error');
    } finally {
      setSubmittingIssue(false);
    }
  };

  return (
    <GuestLayout>
      {/* Top sticky return bar for mobile travellers switching back from Google Maps */}
      <div className="sticky top-16 z-30 border-b border-ink-200 bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-2.5 sm:px-6">
          <Link
            to={`/account?booking=${encodeURIComponent(view.bookingId)}`}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[12px] font-extrabold text-ink-800 transition hover:bg-ink-100"
          >
            <ArrowLeft size={15} className="shrink-0" />
            <span>My booking ({view.bookingReference})</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openHoratio(`How do I arrive and check in for booking ${view.bookingReference}?`)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-[11.5px] font-bold text-ink-800 transition hover:border-ink-400"
            >
              <span>Ask Horatio</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setHelpOpen(true);
                handleHelpAction('open_trouble_drawer');
              }}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-[11.5px] font-extrabold text-amber-950 transition hover:bg-amber-100"
            >
              <HelpCircle size={14} className="shrink-0 text-amber-700" />
              <span>Trouble finding stay?</span>
            </button>
          </div>
        </div>
      </div>

      {/* Header — Question 1: Am I going to the right property? */}
      <section className="bg-ink-950 text-paper">
        <div className="mx-auto max-w-3xl px-4 py-7 sm:px-6 sm:py-9">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brass-400/40 bg-brass-500/15 px-3 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-brass-300">
              <Compass size={12} className="shrink-0" /> HAMLET Wayfinder
            </span>
            <span className="rounded-md bg-white/10 px-2.5 py-1 font-mono text-[11px] font-bold text-ink-100">
              {view.bookingReference}
            </span>
            {readiness && (
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold ${
                  readiness.tone === 'jade'
                    ? 'border-jade-400/40 bg-jade-500/20 text-jade-200'
                    : readiness.tone === 'sky'
                      ? 'border-sky-400/40 bg-sky-500/20 text-sky-200'
                      : 'border-amber-400/40 bg-amber-500/20 text-amber-200'
                }`}
              >
                <ShieldCheck size={12} className="shrink-0" />
                {readiness.badgeLabel}
              </span>
            )}
          </div>

          <h1 className="mt-3 font-display text-2xl font-black leading-tight text-white sm:text-3xl">
            {view.propertyTitle}
          </h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-medium text-ink-200">
            <span className="inline-flex items-center gap-1">
              <MapPin size={14} className="shrink-0 text-brass-400" />
              {view.publicAddress} · {view.area}, {view.city}
            </span>
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2.5 rounded-2xl border border-white/10 bg-white/5 p-3.5 text-[12px] sm:grid-cols-3">
            <div>
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-ink-400">Check-in</span>
              <span className="mt-0.5 block font-bold text-white">{formatDate(view.checkIn)}</span>
              <span className="block text-[11px] text-brass-300">{guide?.checkInWindowLabel || 'From 2:00 PM'}</span>
            </div>
            <div>
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-ink-400">Check-out</span>
              <span className="mt-0.5 block font-bold text-white">{formatDate(view.checkOut)}</span>
              <span className="block text-[11px] text-ink-300">{view.guestCount} guest{view.guestCount > 1 ? 's' : ''}</span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-ink-400">Booking state</span>
              <span className="mt-0.5 inline-flex items-center gap-1 font-bold text-jade-300">
                <CheckCircle2 size={13} className="shrink-0" />
                {isCompletedStay ? 'Completed stay (archived guide)' : 'Confirmed reservation'}
              </span>
            </div>
          </div>

          {guide?.guestIntroduction && (
            <p className="mt-4 rounded-2xl border border-white/10 bg-ink-900 px-4 py-3 text-[13px] font-medium leading-relaxed text-ink-100">
              {guide.guestIntroduction}
            </p>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        {view.newerRevisionAvailable && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-[12.5px] font-semibold text-sky-950">
            <Info size={16} className="mt-0.5 shrink-0 text-sky-700" />
            <span>
              HAMLET verified an updated arrival note for this property since your initial confirmation. Showing the latest verified guidance below.
            </span>
          </div>
        )}

        {/* Honest Incomplete / Missing Guide State */}
        {!view.guideAvailable && (
          <section className="rounded-3xl border border-amber-200 bg-amber-50/90 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle size={22} className="mt-0.5 shrink-0 text-amber-700" />
              <div>
                <h2 className="font-display text-lg font-black text-amber-950">
                  Your arrival guide is being prepared
                </h2>
                <p className="mt-1 text-[13px] font-medium leading-relaxed text-amber-900">
                  Your arrival guide is being prepared. Contact support if you need help planning your arrival. Below is the verified listing address and landmark summary currently on file.
                </p>
                <div className="mt-4 rounded-2xl border border-amber-200 bg-white p-4 text-[13px] text-ink-800">
                  <p className="font-bold text-ink-900">{view.publicAddress}</p>
                  <p className="mt-0.5 text-[12px] text-ink-500">{view.area}, {view.city}</p>
                  {view.publicLandmarks.length > 0 && (
                    <p className="mt-2 text-[12px] font-semibold text-ink-700">
                      Landmarks: {view.publicLandmarks.join(' · ')}
                    </p>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => void copyText('fallback-addr', driverCopyText, 'Address & landmarks')}
                    className="btn-outline !py-2.5 text-[12px]"
                  >
                    {copiedKey === 'fallback-addr' ? <Check size={14} /> : <Copy size={14} />}
                    Copy address for driver
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReportOpen(true);
                      handleHelpAction('report_missing_guide');
                    }}
                    className="btn-jade !py-2.5 text-[12px]"
                  >
                    <LifeBuoy size={14} /> Request arrival assistance
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* STEP 1: Navigate to the property */}
        <section id="step-navigate" className="card overflow-hidden p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-jade-700">
                Step 1 · Navigate to the property
              </span>
              <h2 className="mt-1 font-display text-xl font-black text-ink-900">
                Reach the verified entrance pin
              </h2>
            </div>
            {guide && guide.coordinatesChecked && (
              <span className="shrink-0 rounded-full border border-jade-200 bg-jade-50 px-2.5 py-1 text-[10.5px] font-bold text-jade-800">
                Pin checked
              </span>
            )}
          </div>

          <div className="mt-3 rounded-2xl border border-ink-100 bg-ink-50/60 p-4">
            <p className="text-[13.5px] font-bold text-ink-900">
              {guide?.preferredEntranceLabel || view.publicAddress}
            </p>
            <p className="mt-0.5 text-[12.5px] font-medium text-ink-600">
              {view.publicAddress} · {view.area}, {view.city}
            </p>
            {guide && formatCoordinatePair(guide.destinationLatitude, guide.destinationLongitude) && (
              <p className="mt-1.5 text-[11.5px] font-semibold text-ink-500">
                Pin target: <strong className="text-ink-800">{COORDINATE_POINT_TYPE_LABELS[guide.coordinatePointType]}</strong>{' '}
                <span className="font-mono text-[11px]">
                  ({formatCoordinatePair(guide.destinationLatitude, guide.destinationLongitude)})
                </span>
              </p>
            )}
            {view.publicLandmarks.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {view.publicLandmarks.map(lm => (
                  <span key={lm} className="rounded-lg border border-ink-200 bg-white px-2.5 py-1 text-[11.5px] font-semibold text-ink-700">
                    {lm}
                  </span>
                ))}
              </div>
            )}
            {guide?.ambiguityNotes && (
              <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] font-semibold leading-relaxed text-amber-950">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-700" />
                <span>{guide.ambiguityNotes}</span>
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
            {primaryDirectionsUrl ? (
              <a
                href={primaryDirectionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleOpenDirections('primary_destination_pin')}
                className="btn-jade min-h-12 flex-1 justify-center text-[13.5px]"
              >
                <Navigation size={16} className="shrink-0" />
                Get Directions in Google Maps
                <ExternalLink size={13} className="shrink-0 opacity-80" />
              </a>
            ) : (
              <div className="flex-1 rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 text-[12px] font-semibold text-ink-600">
                Verified GPS pin not yet attached — use the copyable street address and landmarks below.
              </div>
            )}
            <button
              type="button"
              onClick={() => void copyText('driver-summary', driverCopyText, 'Driver directions & address')}
              className="btn-outline min-h-12 justify-center text-[12.5px]"
            >
              {copiedKey === 'driver-summary' ? <Check size={15} /> : <Copy size={15} />}
              Copy for driver
            </button>
          </div>

          <p className="mt-3 text-[11.5px] font-medium leading-relaxed text-ink-500">
            External maps guide you to the street or gate — they cannot see inside residential compounds or floors. Keep this HAMLET tab open for Steps 2–5 once you arrive at the gate.
          </p>

          {/* Optional extra verified waypoints (e.g. road turn-off, parking ramp) */}
          {guide && guide.waypoints.length > 0 && (
            <div className="mt-4 border-t border-ink-100 pt-4">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-400">
                Additional verified property waypoints
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {guide.waypoints.map(wp => {
                  const wpUrl = buildGoogleMapsDirectionsUrl({
                    latitude: wp.latitude,
                    longitude: wp.longitude,
                  });
                  return (
                    <div key={wp.id} className="flex flex-col justify-between rounded-2xl border border-ink-100 bg-white p-3.5">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-jade-700">
                          {WAYPOINT_TYPE_LABELS[wp.pointType]}
                        </span>
                        <p className="mt-0.5 text-[13px] font-bold text-ink-900">{wp.label}</p>
                        {wp.instructions && (
                          <p className="mt-1 text-[12px] font-medium text-ink-600">{wp.instructions}</p>
                        )}
                      </div>
                      {wpUrl && (
                        <a
                          href={wpUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => handleOpenDirections(wp.label)}
                          className="mt-2.5 inline-flex items-center gap-1 text-[11.5px] font-extrabold text-jade-700 hover:underline"
                        >
                          <Navigation size={12} /> Open pin in Maps <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* STEP 2: Find the entrance */}
        {hasEntranceSection && guide && (
          <section id="step-entrance" className="card p-5 sm:p-6">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-jade-700">
              Step 2 · Find the entrance
            </span>
            <h2 className="mt-1 font-display text-xl font-black text-ink-900">
              {guide.preferredEntranceLabel || 'Gate & security clearance'}
            </h2>

            {guide.entranceInstructions && (
              <p className="mt-2.5 text-[14px] font-medium leading-relaxed text-ink-800">
                {guide.entranceInstructions}
              </p>
            )}

            {guide.securityDeskInstructions && (
              <div className="mt-3 rounded-2xl border border-ink-100 bg-clay/50 p-3.5 text-[13px] font-medium text-ink-800">
                <span className="block text-[10.5px] font-extrabold uppercase tracking-wider text-ink-500">
                  At security / gatehouse
                </span>
                <p className="mt-1">{guide.securityDeskInstructions}</p>
              </div>
            )}

            {guide.entrancePhotoUrl && (
              <ArrivalPhoto
                src={guide.entrancePhotoUrl}
                alt={guide.preferredEntranceLabel || 'Verified property entrance'}
                caption={guide.preferredEntranceLabel ? `Entrance view: ${guide.preferredEntranceLabel}` : undefined}
                className="mt-4"
              />
            )}
          </section>
        )}

        {/* STEP 3: Find the building */}
        {hasBuildingSection && guide && (
          <section id="step-building" className="card p-5 sm:p-6">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-jade-700">
              Step 3 · Find the building
            </span>
            <h2 className="mt-1 flex items-center gap-2 font-display text-xl font-black text-ink-900">
              <Building2 size={20} className="shrink-0 text-jade-700" />
              <span>{guide.buildingOrBlock || guide.estateOrBuildingName || 'Building & compound route'}</span>
            </h2>
            {guide.estateOrBuildingName && guide.buildingOrBlock && (
              <p className="mt-0.5 text-[12px] font-bold text-ink-500">
                Inside {guide.estateOrBuildingName}
              </p>
            )}

            {guide.buildingInstructions && (
              <p className="mt-2.5 text-[14px] font-medium leading-relaxed text-ink-800">
                {guide.buildingInstructions}
              </p>
            )}

            {guide.parkingOrDropoffInstructions && (
              <div className="mt-3 rounded-2xl border border-ink-100 bg-ink-50/70 p-3.5 text-[12.5px] font-medium text-ink-700">
                <strong className="text-ink-900">Parking & drop-off:</strong> {guide.parkingOrDropoffInstructions}
              </div>
            )}

            {guide.buildingPhotoUrl && (
              <ArrivalPhoto
                src={guide.buildingPhotoUrl}
                alt={guide.buildingOrBlock || 'Building exterior'}
                caption={guide.buildingOrBlock ? `Building identifier: ${guide.buildingOrBlock}` : undefined}
                className="mt-4"
              />
            )}
          </section>
        )}

        {/* STEP 4: Find your apartment door */}
        {guide && (
          <section id="step-door" className="card p-5 sm:p-6">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-jade-700">
              Step 4 · Find your apartment door
            </span>
            <h2 className="mt-1 flex items-center gap-2 font-display text-xl font-black text-ink-900">
              <DoorOpen size={20} className="shrink-0 text-jade-700" />
              <span>
                {guide.apartmentIdentifier
                  ? `${guide.apartmentIdentifier}${guide.floorLabel ? ` · ${guide.floorLabel}` : ''}`
                  : 'Floor, corridor & apartment door'}
              </span>
            </h2>

            {hasApartmentSection ? (
              <>
                {(guide.floorLabel || guide.apartmentIdentifier) && (
                  <div className="mt-3 grid grid-cols-2 gap-2.5">
                    {guide.floorLabel && (
                      <div className="rounded-xl border border-ink-100 bg-ink-50/70 px-3.5 py-2.5">
                        <span className="block text-[10px] font-extrabold uppercase tracking-wider text-ink-400">Floor</span>
                        <span className="mt-0.5 block text-[13.5px] font-black text-ink-900">{guide.floorLabel}</span>
                      </div>
                    )}
                    {guide.apartmentIdentifier && (
                      <div className="rounded-xl border border-ink-100 bg-ink-50/70 px-3.5 py-2.5">
                        <span className="block text-[10px] font-extrabold uppercase tracking-wider text-ink-400">Apartment / Door</span>
                        <span className="mt-0.5 block text-[13.5px] font-black text-ink-900">{guide.apartmentIdentifier}</span>
                      </div>
                    )}
                  </div>
                )}

                {guide.liftOrStairsInstructions && (
                  <p className="mt-3 text-[13.5px] font-semibold text-ink-800">
                    <span className="text-ink-500">Lift / stairs:</span> {guide.liftOrStairsInstructions}
                  </p>
                )}

                {guide.routeToDoor && (
                  <p className="mt-2.5 text-[14px] font-medium leading-relaxed text-ink-800">
                    {guide.routeToDoor}
                  </p>
                )}

                {guide.doorLandmarkPhotoUrl && (
                  <ArrivalPhoto
                    src={guide.doorLandmarkPhotoUrl}
                    alt={guide.apartmentIdentifier || 'Corridor and apartment door landmark'}
                    caption="Corridor / door identifier"
                    className="mt-4"
                  />
                )}
              </>
            ) : (
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] font-medium text-amber-950">
                Specific floor and apartment-door steps have not been added yet. Call the arrival contact below once you reach the entrance gate.
              </div>
            )}
          </section>
        )}

        {/* Optional Partner-Ordered Step-by-Step Walkthrough */}
        {guide && guide.steps.length > 0 && (
          <section className="card p-5 sm:p-6">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-jade-700">
              Quick arrival checklist
            </span>
            <h2 className="mt-1 font-display text-lg font-black text-ink-900">
              Gate-to-door walkthrough ({guide.steps.length} steps)
            </h2>
            <ol className="mt-4 space-y-3">
              {guide.steps.map(step => (
                <li key={step.id} className="rounded-2xl border border-ink-100 bg-ink-50/50 p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-900 font-display text-xs font-black text-brass-400">
                      {step.stepOrder}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-jade-700">
                        {STEP_TYPE_LABELS[step.stepType]}
                      </span>
                      <h3 className="font-display text-[15px] font-bold text-ink-900">{step.heading}</h3>
                      <p className="mt-1 text-[13.5px] font-medium leading-relaxed text-ink-700">
                        {step.instruction}
                      </p>
                      {step.landmark && (
                        <p className="mt-1.5 text-[12px] font-semibold text-ink-600">
                          Landmark: <span className="text-ink-900">{step.landmark}</span>
                        </p>
                      )}
                      {step.accessRequirement && (
                        <p className="mt-1 text-[12px] font-semibold text-amber-900">
                          Required here: {step.accessRequirement}
                        </p>
                      )}
                      {step.photoUrl && (
                        <ArrivalPhoto src={step.photoUrl} alt={step.heading} className="mt-3" />
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* STEP 5: Check-in & Protected Access Codes */}
        {hasCheckInSection && guide && (
          <section id="step-checkin" className="card p-5 sm:p-6">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-jade-700">
              Step 5 · Check in securely
            </span>
            <h2 className="mt-1 flex items-center gap-2 font-display text-xl font-black text-ink-900">
              <KeyRound size={20} className="shrink-0 text-jade-700" />
              <span>{CHECKIN_METHOD_LABELS[guide.checkInMethod]}</span>
            </h2>

            {guide.checkInInstructions && (
              <p className="mt-2.5 text-[14px] font-medium leading-relaxed text-ink-800">
                {guide.checkInInstructions}
              </p>
            )}

            {guide.arrivalRestrictions && (
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[12.5px] font-semibold text-amber-950">
                Arrival rule: {guide.arrivalRestrictions}
              </div>
            )}

            {/* Time-bounded Sensitive Access Codes */}
            {view.hasSensitiveCodes && (
              <div className="mt-4 rounded-2xl border border-ink-200 bg-ink-950 p-4 text-paper sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Lock size={16} className="shrink-0 text-brass-400" />
                    <span className="text-[12px] font-extrabold uppercase tracking-wider text-brass-300">
                      Protected arrival & Wi-Fi codes
                    </span>
                  </div>
                  {view.codesUnlocked && view.secrets && (
                    <button
                      type="button"
                      onClick={() => setRevealCodes(prev => !prev)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-[11.5px] font-bold text-white transition hover:bg-white/15"
                    >
                      {revealCodes ? <EyeOff size={14} /> : <Eye size={14} />}
                      {revealCodes ? 'Hide codes' : 'Reveal codes'}
                    </button>
                  )}
                </div>

                {isCompletedStay ? (
                  <p className="mt-2.5 text-[12.5px] font-medium text-ink-300">
                    This stay is completed — active gate, smart-lock, and lockbox codes are automatically retired after check-out for resident security.
                  </p>
                ) : view.codesUnlocked && view.secrets ? (
                  <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                    {[
                      { key: 'gate', label: 'Estate / Gate code', val: view.secrets.gateAccessCode },
                      { key: 'bldg', label: 'Building / Lobby access', val: view.secrets.buildingAccessCode },
                      { key: 'door', label: 'Door smart-lock / lockbox', val: view.secrets.lockboxOrSmartlockCode },
                      {
                        key: 'wifi',
                        label: view.secrets.wifiNetworkName ? `Wi-Fi (${view.secrets.wifiNetworkName})` : 'Wi-Fi password',
                        val: view.secrets.wifiPassword,
                      },
                    ]
                      .filter(item => item.val.trim().length > 0)
                      .map(item => (
                        <div key={item.key} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink-900 px-3.5 py-2.5">
                          <div className="min-w-0">
                            <span className="block text-[10px] font-extrabold uppercase tracking-wider text-ink-400">
                              {item.key === 'wifi' && <Wifi size={11} className="mr-1 inline text-brass-300" />}
                              {item.label}
                            </span>
                            <span className="mt-0.5 block truncate font-mono text-[14px] font-black text-white">
                              {revealCodes ? item.val : '••••••••'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => void copyText(`secret-${item.key}`, item.val, item.label)}
                            className="shrink-0 rounded-lg border border-white/15 bg-white/10 p-2 text-brass-300 transition hover:bg-white/20"
                            aria-label={`Copy ${item.label}`}
                          >
                            {copiedKey === `secret-${item.key}` ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="mt-2.5 flex items-start gap-2 text-[12.5px] font-medium text-ink-200">
                    <Clock size={15} className="mt-0.5 shrink-0 text-brass-400" />
                    <span>
                      For property security, gate and lockbox codes unlock automatically ahead of check-in
                      {view.codesUnlockAt ? ` (${formatDateTime(view.codesUnlockAt)})` : ''}. Your route, landmarks, and arrival contact above are ready now.
                    </span>
                  </p>
                )}
              </div>
            )}

            {/* Arrival Contact */}
            {(guide.arrivalContactName || guide.arrivalContactPhone) && !isCompletedStay && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-ink-50/70 p-4">
                <div>
                  <span className="block text-[10.5px] font-extrabold uppercase tracking-wider text-ink-400">
                    Authorised check-in contact
                  </span>
                  <p className="mt-0.5 text-[14px] font-bold text-ink-900">
                    {guide.arrivalContactName || 'Property Arrival Desk'}
                    {guide.arrivalContactRole ? ` · ${guide.arrivalContactRole}` : ''}
                  </p>
                  {guide.arrivalContactPhone && (
                    <p className="font-mono text-[12.5px] font-semibold text-ink-600">{guide.arrivalContactPhone}</p>
                  )}
                </div>
                {guide.arrivalContactPhone && (
                  <a
                    href={`tel:${guide.arrivalContactPhone.replace(/\s+/g, '')}`}
                    onClick={() => handleHelpAction('call_arrival_contact')}
                    className="btn-jade min-h-11 !px-4 !py-2.5 text-[12.5px]"
                  >
                    <Phone size={14} /> Call arrival desk
                  </a>
                )}
              </div>
            )}
          </section>
        )}

        {/* NEED HELP? Permanent Outdoor Recovery Card */}
        <section className="rounded-3xl border border-ink-200 bg-white p-5 shadow-xs sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-black text-ink-900">
                I’m having trouble finding my stay
              </h2>
              <p className="mt-0.5 text-[12.5px] font-medium text-ink-600">
                Report a wrong pin, unclear compound turn, or check-in problem directly linked to booking {view.bookingReference}.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setReportOpen(true);
                  handleHelpAction('open_report_arrival_issue');
                }}
                className="btn-jade min-h-11 !px-4 !py-2.5 text-[12.5px]"
              >
                <LifeBuoy size={14} /> Report location / arrival issue
              </button>
              <Link
                to="/account"
                onClick={() => handleHelpAction('open_account_support')}
                className="btn-outline min-h-11 !px-4 !py-2.5 text-[12.5px]"
              >
                Support tickets
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* Quick Recovery Drawer ("Trouble finding stay?") */}
      <AnimatePresence>
        {helpOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-xs" onClick={() => setHelpOpen(false)} />
            <motion.div
              initial={{ y: 50 }}
              animate={{ y: 0 }}
              exit={{ y: 50, opacity: 0 }}
              className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-amber-700">
                    Arrival recovery · {view.bookingReference}
                  </p>
                  <h2 className="mt-0.5 font-display text-xl font-black text-ink-900">
                    Need help getting inside?
                  </h2>
                </div>
                <button type="button" onClick={() => setHelpOpen(false)} aria-label="Close">
                  <X size={20} className="text-ink-400" />
                </button>
              </div>

              <div className="mt-4 grid gap-2.5">
                {hasEntranceSection && (
                  <a
                    href="#step-entrance"
                    onClick={() => {
                      setHelpOpen(false);
                      handleHelpAction('jump_to_entrance');
                    }}
                    className="flex items-center justify-between rounded-2xl border border-ink-200 px-4 py-3 text-[13px] font-bold text-ink-900 hover:bg-ink-50"
                  >
                    <span>Review gate & security instructions</span>
                    <Compass size={16} className="text-jade-700" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => void copyText('drawer-addr', driverCopyText, 'Address & landmarks')}
                  className="flex items-center justify-between rounded-2xl border border-ink-200 px-4 py-3 text-left text-[13px] font-bold text-ink-900 hover:bg-ink-50"
                >
                  <span>Copy property address & landmarks</span>
                  <Copy size={16} className="text-jade-700" />
                </button>
                {primaryDirectionsUrl && (
                  <a
                    href={primaryDirectionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleOpenDirections('trouble_drawer_maps')}
                    className="flex items-center justify-between rounded-2xl border border-ink-200 px-4 py-3 text-[13px] font-bold text-ink-900 hover:bg-ink-50"
                  >
                    <span>Open Google Maps directions again</span>
                    <Navigation size={16} className="text-jade-700" />
                  </a>
                )}
                {guide?.arrivalContactPhone && !isCompletedStay && (
                  <a
                    href={`tel:${guide.arrivalContactPhone.replace(/\s+/g, '')}`}
                    onClick={() => handleHelpAction('drawer_call_contact')}
                    className="flex items-center justify-between rounded-2xl border border-jade-200 bg-jade-50 px-4 py-3 text-[13px] font-bold text-jade-950 hover:bg-jade-100"
                  >
                    <span>Call {guide.arrivalContactName || 'arrival contact'} ({guide.arrivalContactPhone})</span>
                    <Phone size={16} className="text-jade-700" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setHelpOpen(false);
                    setReportOpen(true);
                  }}
                  className="btn-jade mt-1 w-full justify-center py-3 text-[13px]"
                >
                  <LifeBuoy size={15} /> Report inaccurate pin or arrival issue
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report Arrival Issue Modal */}
      <AnimatePresence>
        {reportOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-xs" onClick={() => !submittingIssue && setReportOpen(false)} />
            <motion.form
              onSubmit={e => void submitArrivalProblem(e)}
              initial={{ y: 50 }}
              animate={{ y: 0 }}
              exit={{ y: 50, opacity: 0 }}
              className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-jade-700">
                    Wayfinder Support · {view.bookingReference}
                  </p>
                  <h2 className="mt-0.5 font-display text-xl font-black text-ink-900">
                    Report an arrival issue
                  </h2>
                </div>
                <button type="button" onClick={() => setReportOpen(false)} aria-label="Close">
                  <X size={20} className="text-ink-400" />
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="label">What went wrong?</span>
                  <select
                    className="input"
                    value={arrivalCategory}
                    onChange={e => setArrivalCategory(e.target.value as ArrivalIssueType)}
                  >
                    {(Object.entries(ARRIVAL_ISSUE_TYPE_LABELS) as Array<[ArrivalIssueType, string]>).map(
                      ([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="block">
                  <span className="label">Urgency</span>
                  <select
                    className="input"
                    value={severity}
                    onChange={e => setSeverity(e.target.value as Issue['severity'])}
                  >
                    {(['medium', 'high', 'critical', 'low'] as const).map(s => (
                      <option key={s} value={s}>
                        {s.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="label">Stage (optional)</span>
                  <select className="input" value={stepKey} onChange={e => setStepKey(e.target.value)}>
                    <option value="">General arrival</option>
                    <option value="step_1_pin">Step 1 · Map pin</option>
                    <option value="step_2_entrance">Step 2 · Estate / street gate</option>
                    <option value="step_3_building">Step 3 · Building / block</option>
                    <option value="step_4_door">Step 4 · Floor / apartment door</option>
                    <option value="step_5_checkin">Step 5 · Check-in / lock code</option>
                  </select>
                </label>
              </div>

              <label className="mt-3 block">
                <span className="label">Details for HAMLET support</span>
                <textarea
                  className="input min-h-[88px] resize-none"
                  value={issueDescription}
                  onChange={e => setIssueDescription(e.target.value)}
                  placeholder="Describe where you are standing, which gate/sign you see, or what did not work…"
                />
              </label>

              <label className="mt-3 block">
                <span className="label">Photo / landmark note (optional)</span>
                <input
                  className="input"
                  value={evidenceNote}
                  onChange={e => setEvidenceNote(e.target.value)}
                  placeholder="e.g. Standing at Gate A green sign on Bourdillon Rd"
                />
              </label>

              <p className="mt-2.5 text-[11px] font-medium text-ink-400">
                HAMLET does not track your live GPS. Submitting creates a tracked support ticket on booking {view.bookingReference}.
              </p>

              <button
                type="submit"
                disabled={submittingIssue}
                className="btn-jade mt-4 w-full justify-center py-3 disabled:opacity-50"
              >
                {submittingIssue ? 'Logging arrival issue…' : 'Submit arrival issue'}
              </button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </GuestLayout>
  );
}
