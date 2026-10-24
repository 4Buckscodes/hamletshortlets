import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  X, Compass, Navigation, ExternalLink, LocateFixed, UploadCloud, Loader2,
  Plus, Trash2, Lock, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { useHamlet } from '../lib/store';
import { useToast } from '../lib/toast';
import {
  buildGoogleMapsDirectionsUrl,
  CHECKIN_METHOD_LABELS,
  COORDINATE_POINT_TYPE_LABELS,
  STEP_TYPE_LABELS,
  validateCoordinates,
  WAYPOINT_TYPE_LABELS,
} from '../lib/wayfinder';
import type {
  CheckInMethod,
  CoordinatePointType,
  CoordinateSource,
  Property,
  WayfinderGuide,
  WayfinderSecrets,
  WayfinderStepType,
  WayfinderSubmissionInput,
  WayfinderWaypointType,
} from '../lib/types';

interface WayfinderEditorModalProps {
  property: Property;
  existingGuide?: WayfinderGuide;
  existingSecrets?: WayfinderSecrets;
  onClose: () => void;
}

export function WayfinderEditorModal({
  property,
  existingGuide,
  existingSecrets,
  onClose,
}: WayfinderEditorModalProps) {
  const { submitPropertyWayfinder, uploadArrivalGuidePhoto } = useHamlet();
  const { toast } = useToast();

  const pending = existingGuide?.pendingSubmission ?? null;

  const [landmarksText, setLandmarksText] = useState(
    (pending?.publicLandmarks ?? property.publicLandmarks ?? []).join(', '),
  );
  const [publicLocationSummary, setPublicLocationSummary] = useState(
    pending?.publicLocationSummary ?? property.publicLocationSummary ?? '',
  );
  const [latStr, setLatStr] = useState(() => {
    const val = pending?.destinationLatitude ?? existingGuide?.destinationLatitude ?? null;
    return val !== null && val !== undefined ? String(val) : '';
  });
  const [lngStr, setLngStr] = useState(() => {
    const val = pending?.destinationLongitude ?? existingGuide?.destinationLongitude ?? null;
    return val !== null && val !== undefined ? String(val) : '';
  });
  const [coordinatePointType, setCoordinatePointType] = useState<CoordinatePointType>(
    pending?.coordinatePointType ?? existingGuide?.coordinatePointType ?? 'estate_gate',
  );
  const [coordinateSource, setCoordinateSource] = useState<CoordinateSource>(
    pending?.coordinateSource ?? existingGuide?.coordinateSource ?? 'manual_entry',
  );
  const [ambiguityNotes, setAmbiguityNotes] = useState(
    pending?.ambiguityNotes ?? existingGuide?.ambiguityNotes ?? '',
  );
  const [guestIntroduction, setGuestIntroduction] = useState(
    pending?.guestIntroduction ?? existingGuide?.guestIntroduction ?? '',
  );

  const [preferredEntranceLabel, setPreferredEntranceLabel] = useState(
    pending?.preferredEntranceLabel ?? existingGuide?.preferredEntranceLabel ?? '',
  );
  const [entranceInstructions, setEntranceInstructions] = useState(
    pending?.entranceInstructions ?? existingGuide?.entranceInstructions ?? '',
  );
  const [securityDeskInstructions, setSecurityDeskInstructions] = useState(
    pending?.securityDeskInstructions ?? existingGuide?.securityDeskInstructions ?? '',
  );
  const [entrancePhotoUrl, setEntrancePhotoUrl] = useState(
    pending?.entrancePhotoUrl ?? existingGuide?.entrancePhotoUrl ?? '',
  );

  const [estateOrBuildingName, setEstateOrBuildingName] = useState(
    pending?.estateOrBuildingName ?? existingGuide?.estateOrBuildingName ?? '',
  );
  const [buildingOrBlock, setBuildingOrBlock] = useState(
    pending?.buildingOrBlock ?? existingGuide?.buildingOrBlock ?? '',
  );
  const [buildingInstructions, setBuildingInstructions] = useState(
    pending?.buildingInstructions ?? existingGuide?.buildingInstructions ?? '',
  );
  const [parkingOrDropoffInstructions, setParkingOrDropoffInstructions] = useState(
    pending?.parkingOrDropoffInstructions ?? existingGuide?.parkingOrDropoffInstructions ?? '',
  );
  const [buildingPhotoUrl, setBuildingPhotoUrl] = useState(
    pending?.buildingPhotoUrl ?? existingGuide?.buildingPhotoUrl ?? '',
  );

  const [floorLabel, setFloorLabel] = useState(
    pending?.floorLabel ?? existingGuide?.floorLabel ?? '',
  );
  const [apartmentIdentifier, setApartmentIdentifier] = useState(
    pending?.apartmentIdentifier ?? existingGuide?.apartmentIdentifier ?? '',
  );
  const [liftOrStairsInstructions, setLiftOrStairsInstructions] = useState(
    pending?.liftOrStairsInstructions ?? existingGuide?.liftOrStairsInstructions ?? '',
  );
  const [routeToDoor, setRouteToDoor] = useState(
    pending?.routeToDoor ?? existingGuide?.routeToDoor ?? '',
  );
  const [doorLandmarkPhotoUrl, setDoorLandmarkPhotoUrl] = useState(
    pending?.doorLandmarkPhotoUrl ?? existingGuide?.doorLandmarkPhotoUrl ?? '',
  );

  const [checkInMethod, setCheckInMethod] = useState<CheckInMethod>(
    pending?.checkInMethod ?? existingGuide?.checkInMethod ?? 'host_meet',
  );
  const [checkInWindowLabel, setCheckInWindowLabel] = useState(
    pending?.checkInWindowLabel ?? existingGuide?.checkInWindowLabel ?? 'From 2:00 PM',
  );
  const [arrivalRestrictions, setArrivalRestrictions] = useState(
    pending?.arrivalRestrictions ?? existingGuide?.arrivalRestrictions ?? '',
  );
  const [checkInInstructions, setCheckInInstructions] = useState(
    pending?.checkInInstructions ?? existingGuide?.checkInInstructions ?? '',
  );
  const [arrivalContactName, setArrivalContactName] = useState(
    pending?.arrivalContactName ?? existingGuide?.arrivalContactName ?? '',
  );
  const [arrivalContactPhone, setArrivalContactPhone] = useState(
    pending?.arrivalContactPhone ?? existingGuide?.arrivalContactPhone ?? '',
  );
  const [arrivalContactRole, setArrivalContactRole] = useState(
    pending?.arrivalContactRole ?? existingGuide?.arrivalContactRole ?? 'Property Manager',
  );

  const [gateAccessCode, setGateAccessCode] = useState(
    pending?.secrets?.gateAccessCode ?? existingSecrets?.gateAccessCode ?? '',
  );
  const [buildingAccessCode, setBuildingAccessCode] = useState(
    pending?.secrets?.buildingAccessCode ?? existingSecrets?.buildingAccessCode ?? '',
  );
  const [lockboxCode, setLockboxCode] = useState(
    pending?.secrets?.lockboxOrSmartlockCode ?? existingSecrets?.lockboxOrSmartlockCode ?? '',
  );
  const [wifiNetworkName, setWifiNetworkName] = useState(
    pending?.secrets?.wifiNetworkName ?? existingSecrets?.wifiNetworkName ?? '',
  );
  const [wifiPassword, setWifiPassword] = useState(
    pending?.secrets?.wifiPassword ?? existingSecrets?.wifiPassword ?? '',
  );
  const [releaseHoursBeforeCheckIn, setReleaseHoursBeforeCheckIn] = useState(
    pending?.secrets?.releaseHoursBeforeCheckIn ?? existingSecrets?.releaseHoursBeforeCheckIn ?? 24,
  );

  const [waypoints, setWaypoints] = useState<WayfinderSubmissionInput['waypoints']>(
    pending?.waypoints ??
      (existingGuide?.waypoints ?? []).map(w => ({
        pointType: w.pointType,
        label: w.label,
        latitude: w.latitude,
        longitude: w.longitude,
        instructions: w.instructions,
        photoUrl: w.photoUrl,
      })),
  );
  const [steps, setSteps] = useState<WayfinderSubmissionInput['steps']>(
    pending?.steps ??
      (existingGuide?.steps ?? []).map(s => ({
        stepType: s.stepType,
        heading: s.heading,
        instruction: s.instruction,
        landmark: s.landmark,
        photoUrl: s.photoUrl,
        accessRequirement: s.accessRequirement,
        latitude: s.latitude,
        longitude: s.longitude,
      })),
  );

  const [locatingGps, setLocatingGps] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<'entrance' | 'building' | 'door' | null>(null);
  const [saving, setSaving] = useState(false);

  const entranceFileRef = useRef<HTMLInputElement | null>(null);
  const buildingFileRef = useRef<HTMLInputElement | null>(null);
  const doorFileRef = useRef<HTMLInputElement | null>(null);

  const parsedLat = latStr.trim() ? Number(latStr.trim()) : null;
  const parsedLng = lngStr.trim() ? Number(lngStr.trim()) : null;
  const coordValidation =
    parsedLat !== null || parsedLng !== null
      ? validateCoordinates(parsedLat, parsedLng)
      : null;

  const previewMapsUrl = buildGoogleMapsDirectionsUrl({
    latitude: parsedLat,
    longitude: parsedLng,
  });

  const captureOnSiteGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast('Browser geolocation is unavailable on this device. Enter coordinates manually.', 'error');
      return;
    }
    setLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLatStr(pos.coords.latitude.toFixed(6));
        setLngStr(pos.coords.longitude.toFixed(6));
        setCoordinateSource('gps_on_site');
        setLocatingGps(false);
        toast('Captured current GPS coordinates — verify the pin in Google Maps before submitting.');
      },
      err => {
        setLocatingGps(false);
        toast(`Could not read GPS (${err.message}). Enter coordinates manually.`, 'error');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  };

  const handlePhotoUpload = async (
    slot: 'entrance' | 'building' | 'door',
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingSlot(slot);
    try {
      const storageRef = await uploadArrivalGuidePhoto(property.id, file);
      if (slot === 'entrance') setEntrancePhotoUrl(storageRef);
      if (slot === 'building') setBuildingPhotoUrl(storageRef);
      if (slot === 'door') setDoorLandmarkPhotoUrl(storageRef);
      toast('Protected arrival photograph attached.');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not upload arrival photo.', 'error');
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleSave = async (saveAsDraft: boolean) => {
    if (!saveAsDraft) {
      if (parsedLat === null || parsedLng === null) {
        toast('Enter destination latitude and longitude before submitting for HAMLET verification.', 'error');
        return;
      }
      const check = validateCoordinates(parsedLat, parsedLng);
      if (!check.ok) {
        toast(check.error, 'error');
        return;
      }
      if (!check.withinNigeriaBounds) {
        toast('Coordinates are outside Nigeria geographic bounds — check latitude and longitude order.', 'error');
        return;
      }
      if (!preferredEntranceLabel.trim() && !entranceInstructions.trim()) {
        toast('Describe the entrance or security gate so guests know where to enter.', 'error');
        return;
      }
    }

    setSaving(true);
    try {
      const res = await submitPropertyWayfinder(
        property.id,
        {
          publicLandmarks: landmarksText
            .split(',')
            .map(s => s.trim())
            .filter(Boolean),
          publicLocationSummary: publicLocationSummary.trim(),
          destinationLatitude: parsedLat,
          destinationLongitude: parsedLng,
          coordinatePointType,
          coordinateSource,
          ambiguityNotes: ambiguityNotes.trim(),
          guestIntroduction: guestIntroduction.trim(),
          preferredEntranceLabel: preferredEntranceLabel.trim(),
          entranceInstructions: entranceInstructions.trim(),
          securityDeskInstructions: securityDeskInstructions.trim(),
          entrancePhotoUrl: entrancePhotoUrl.trim() || undefined,
          estateOrBuildingName: estateOrBuildingName.trim(),
          buildingOrBlock: buildingOrBlock.trim(),
          buildingInstructions: buildingInstructions.trim(),
          parkingOrDropoffInstructions: parkingOrDropoffInstructions.trim(),
          buildingPhotoUrl: buildingPhotoUrl.trim() || undefined,
          floorLabel: floorLabel.trim(),
          apartmentIdentifier: apartmentIdentifier.trim(),
          liftOrStairsInstructions: liftOrStairsInstructions.trim(),
          routeToDoor: routeToDoor.trim(),
          doorLandmarkPhotoUrl: doorLandmarkPhotoUrl.trim() || undefined,
          checkInMethod,
          checkInWindowLabel: checkInWindowLabel.trim() || 'From 2:00 PM',
          arrivalRestrictions: arrivalRestrictions.trim(),
          checkInInstructions: checkInInstructions.trim(),
          arrivalContactName: arrivalContactName.trim(),
          arrivalContactPhone: arrivalContactPhone.trim(),
          arrivalContactRole: arrivalContactRole.trim(),
          waypoints,
          steps,
          secrets: {
            gateAccessCode: gateAccessCode.trim(),
            buildingAccessCode: buildingAccessCode.trim(),
            lockboxOrSmartlockCode: lockboxCode.trim(),
            wifiNetworkName: wifiNetworkName.trim(),
            wifiPassword: wifiPassword.trim(),
            releaseHoursBeforeCheckIn,
          },
        },
        saveAsDraft,
      );
      toast(
        saveAsDraft
          ? 'Wayfinder draft saved.'
          : res.stagedAsPending
            ? 'Updated arrival guide submitted for admin re-review. Active confirmed guests continue seeing the approved version until verified.'
            : 'Wayfinder arrival guide submitted for HAMLET verification.',
      );
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save Wayfinder arrival guide.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-ink-950/75 backdrop-blur-sm" onClick={() => !saving && onClose()} />
      <motion.div
        initial={{ y: 40 }}
        animate={{ y: 0 }}
        exit={{ y: 40, opacity: 0 }}
        className="relative max-h-[92dvh] w-full max-w-3xl overflow-y-auto overscroll-y-contain rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.2em] text-jade-700">
              <Compass size={13} /> HAMLET Wayfinder · Door-to-Door Arrival Setup
            </p>
            <h2 className="mt-1 font-display text-xl font-black text-ink-900">{property.title}</h2>
            <p className="mt-0.5 text-[12px] font-medium text-ink-500">
              {property.address} · {property.area}, Lagos
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="shrink-0">
            <X size={20} className="text-ink-400" />
          </button>
        </div>

        {existingGuide?.publicationStatus === 'approved' && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-jade-200 bg-jade-50 px-4 py-3 text-[12px] font-semibold text-jade-900">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-jade-700" />
            <span>
              Published revision #{existingGuide.publishedRevision} is currently live for confirmed guests. Submitting changes stages a new revision for HAMLET verification without overwriting active stays prematurely.
            </span>
          </div>
        )}

        {existingGuide?.reviewerNote && (existingGuide.publicationStatus === 'needs_correction' || existingGuide.needsReverification) && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-[12px] font-semibold text-amber-950">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-700" />
            <span>
              <strong>Admin review note:</strong> {existingGuide.reviewerNote}
            </span>
          </div>
        )}

        <div className="mt-5 space-y-6">
          {/* 1. Public Location Summary */}
          <section className="rounded-2xl border border-ink-100 bg-ink-50/40 p-4">
            <h3 className="font-display text-sm font-black text-ink-900">
              1. Public location summary (safe before booking)
            </h3>
            <p className="mt-0.5 text-[11.5px] font-medium text-ink-500">
              Shown on public listing pages. Do NOT enter gate codes, lockbox numbers, or apartment numbers here.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="label">Nearby public landmarks (comma-separated)</span>
                <input
                  className="input"
                  value={landmarksText}
                  onChange={e => setLandmarksText(e.target.value)}
                  placeholder="e.g. Off Bourdillon Road, 4 mins from Ikoyi Club"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="label">General neighbourhood & approach note</span>
                <input
                  className="input"
                  value={publicLocationSummary}
                  onChange={e => setPublicLocationSummary(e.target.value)}
                  placeholder="e.g. Gated residential close in central Ikoyi with paved dual-lane approach."
                />
              </label>
            </div>
          </section>

          {/* 2. Verified Destination Coordinates */}
          <section className="rounded-2xl border border-ink-100 bg-ink-50/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-sm font-black text-ink-900">
                  2. Destination GPS coordinates (confirmed guests only)
                </h3>
                <p className="mt-0.5 text-[11.5px] font-medium text-ink-500">
                  Pin the exact gate or entrance where a guest’s driver should stop — not a random street midpoint.
                </p>
              </div>
              <button
                type="button"
                disabled={locatingGps}
                onClick={captureOnSiteGps}
                className="btn-outline !px-3 !py-1.5 text-[11.5px]"
              >
                {locatingGps ? <Loader2 size={13} className="animate-spin" /> : <LocateFixed size={13} />}
                Use my on-site GPS
              </button>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="label">Latitude (decimal)</span>
                <input
                  className="input font-mono text-[12.5px]"
                  value={latStr}
                  onChange={e => {
                    setLatStr(e.target.value);
                    if (coordinateSource === 'gps_on_site') setCoordinateSource('manual_entry');
                  }}
                  placeholder="e.g. 6.447820"
                />
              </label>
              <label className="block">
                <span className="label">Longitude (decimal)</span>
                <input
                  className="input font-mono text-[12.5px]"
                  value={lngStr}
                  onChange={e => {
                    setLngStr(e.target.value);
                    if (coordinateSource === 'gps_on_site') setCoordinateSource('manual_entry');
                  }}
                  placeholder="e.g. 3.438410"
                />
              </label>
              <label className="block">
                <span className="label">What does this pin mark?</span>
                <select
                  className="input"
                  value={coordinatePointType}
                  onChange={e => setCoordinatePointType(e.target.value as CoordinatePointType)}
                >
                  {(Object.entries(COORDINATE_POINT_TYPE_LABELS) as Array<[CoordinatePointType, string]>).map(
                    ([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </label>
            </div>

            {coordValidation && !coordValidation.ok && (
              <p className="mt-2 text-[11.5px] font-bold text-red-700">{coordValidation.error}</p>
            )}
            {coordValidation?.ok && !coordValidation.withinNigeriaBounds && (
              <p className="mt-2 text-[11.5px] font-bold text-red-700">
                Coordinates fall outside Nigeria — check whether latitude and longitude were swapped.
              </p>
            )}
            {coordValidation?.ok && coordValidation.withinNigeriaBounds && !coordValidation.withinLagosMetroBounds && (
              <p className="mt-2 text-[11.5px] font-semibold text-amber-800">
                Coordinates are valid within Nigeria, outside Greater Lagos bounds — double-check pin placement.
              </p>
            )}
            {previewMapsUrl && (
              <div className="mt-2.5">
                <a
                  href={previewMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-jade-700 hover:underline"
                >
                  <Navigation size={13} /> Test this pin in Google Maps <ExternalLink size={11} />
                </a>
              </div>
            )}

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="label">Map / street ambiguity warning (optional)</span>
                <input
                  className="input"
                  value={ambiguityNotes}
                  onChange={e => setAmbiguityNotes(e.target.value)}
                  placeholder="e.g. Do not turn into the service lane behind the hotel"
                />
              </label>
              <label className="block">
                <span className="label">Short welcome summary for Wayfinder top banner</span>
                <input
                  className="input"
                  value={guestIntroduction}
                  onChange={e => setGuestIntroduction(e.target.value)}
                  placeholder="e.g. Welcome — enter via Gate A and proceed to Tower B Lift."
                />
              </label>
            </div>
          </section>

          {/* 3. Entrance, Building & Door Guidance */}
          <section className="rounded-2xl border border-ink-100 bg-ink-50/40 p-4">
            <h3 className="font-display text-sm font-black text-ink-900">
              3. Gate → Building → Floor → Apartment door
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="label">Preferred entrance / gate name</span>
                <input
                  className="input"
                  value={preferredEntranceLabel}
                  onChange={e => setPreferredEntranceLabel(e.target.value)}
                  placeholder="e.g. Bourdillon Court Main Gate (Gate A)"
                />
              </label>
              <label className="block">
                <span className="label">Estate / compound name</span>
                <input
                  className="input"
                  value={estateOrBuildingName}
                  onChange={e => setEstateOrBuildingName(e.target.value)}
                  placeholder="e.g. Bourdillon Court"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="label">Entrance visual cue & approach instructions</span>
                <textarea
                  className="input min-h-[68px]"
                  value={entranceInstructions}
                  onChange={e => setEntranceInstructions(e.target.value)}
                  placeholder="Describe the gate colour, sign, or turn from the street…"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="label">Security / gatehouse clearance instructions</span>
                <input
                  className="input"
                  value={securityDeskInstructions}
                  onChange={e => setSecurityDeskInstructions(e.target.value)}
                  placeholder="e.g. Give your full name and HAMLET booking ref at the gatehouse."
                />
              </label>

              {/* Entrance Photo */}
              <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
                <input
                  ref={entranceFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => void handlePhotoUpload('entrance', e)}
                />
                <button
                  type="button"
                  disabled={uploadingSlot === 'entrance'}
                  onClick={() => entranceFileRef.current?.click()}
                  className="btn-outline !px-3 !py-1.5 text-[11.5px]"
                >
                  {uploadingSlot === 'entrance' ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
                  Upload entrance photo
                </button>
                <input
                  className="input flex-1 !py-1.5 text-[12px]"
                  value={entrancePhotoUrl}
                  onChange={e => setEntrancePhotoUrl(e.target.value)}
                  placeholder="Or paste entrance photo reference / URL"
                />
              </div>

              <label className="block">
                <span className="label">Building / block / wing identifier</span>
                <input
                  className="input"
                  value={buildingOrBlock}
                  onChange={e => setBuildingOrBlock(e.target.value)}
                  placeholder="e.g. Block B (West Wing)"
                />
              </label>
              <label className="block">
                <span className="label">Parking & drop-off note</span>
                <input
                  className="input"
                  value={parkingOrDropoffInstructions}
                  onChange={e => setParkingOrDropoffInstructions(e.target.value)}
                  placeholder="e.g. Visitor bays B-12 & B-13 in front of lobby"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="label">Directions from gate to building lobby</span>
                <textarea
                  className="input min-h-[68px]"
                  value={buildingInstructions}
                  onChange={e => setBuildingInstructions(e.target.value)}
                  placeholder="e.g. Drive 60m straight past the palm roundabout; Block B is on the right."
                />
              </label>

              {/* Building Photo */}
              <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
                <input
                  ref={buildingFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => void handlePhotoUpload('building', e)}
                />
                <button
                  type="button"
                  disabled={uploadingSlot === 'building'}
                  onClick={() => buildingFileRef.current?.click()}
                  className="btn-outline !px-3 !py-1.5 text-[11.5px]"
                >
                  {uploadingSlot === 'building' ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
                  Upload building photo
                </button>
                <input
                  className="input flex-1 !py-1.5 text-[12px]"
                  value={buildingPhotoUrl}
                  onChange={e => setBuildingPhotoUrl(e.target.value)}
                  placeholder="Or paste building photo reference / URL"
                />
              </div>

              <label className="block">
                <span className="label">Floor label</span>
                <input
                  className="input"
                  value={floorLabel}
                  onChange={e => setFloorLabel(e.target.value)}
                  placeholder="e.g. 5th Floor"
                />
              </label>
              <label className="block">
                <span className="label">Apartment / door identifier</span>
                <input
                  className="input"
                  value={apartmentIdentifier}
                  onChange={e => setApartmentIdentifier(e.target.value)}
                  placeholder="e.g. Apartment 5B (Brass Plaque)"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="label">Lift or staircase instructions</span>
                <input
                  className="input"
                  value={liftOrStairsInstructions}
                  onChange={e => setLiftOrStairsInstructions(e.target.value)}
                  placeholder="e.g. Take passenger lift #1 or #2 to Level 5."
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="label">Corridor route to the apartment door</span>
                <textarea
                  className="input min-h-[64px]"
                  value={routeToDoor}
                  onChange={e => setRouteToDoor(e.target.value)}
                  placeholder="e.g. Step out of lift, turn left — second walnut door on your right."
                />
              </label>

              {/* Door Photo */}
              <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
                <input
                  ref={doorFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => void handlePhotoUpload('door', e)}
                />
                <button
                  type="button"
                  disabled={uploadingSlot === 'door'}
                  onClick={() => doorFileRef.current?.click()}
                  className="btn-outline !px-3 !py-1.5 text-[11.5px]"
                >
                  {uploadingSlot === 'door' ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
                  Upload corridor / door photo
                </button>
                <input
                  className="input flex-1 !py-1.5 text-[12px]"
                  value={doorLandmarkPhotoUrl}
                  onChange={e => setDoorLandmarkPhotoUrl(e.target.value)}
                  placeholder="Or paste door landmark photo reference / URL"
                />
              </div>
            </div>
          </section>

          {/* 4. Check-In & Time-Bounded Access Secrets */}
          <section className="rounded-2xl border border-ink-100 bg-ink-50/40 p-4">
            <h3 className="flex items-center gap-1.5 font-display text-sm font-black text-ink-900">
              <Lock size={14} className="text-jade-700" /> 4. Check-in & time-bounded access codes
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="label">Check-in method</span>
                <select
                  className="input"
                  value={checkInMethod}
                  onChange={e => setCheckInMethod(e.target.value as CheckInMethod)}
                >
                  {(Object.entries(CHECKIN_METHOD_LABELS) as Array<[CheckInMethod, string]>).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label">Check-in window</span>
                <input
                  className="input"
                  value={checkInWindowLabel}
                  onChange={e => setCheckInWindowLabel(e.target.value)}
                  placeholder="e.g. 2:00 PM – 10:00 PM"
                />
              </label>
              <label className="block">
                <span className="label">Release codes before check-in</span>
                <select
                  className="input"
                  value={releaseHoursBeforeCheckIn}
                  onChange={e => setReleaseHoursBeforeCheckIn(Number(e.target.value))}
                >
                  <option value={6}>6 hours before</option>
                  <option value={12}>12 hours before</option>
                  <option value={24}>24 hours before</option>
                  <option value={48}>48 hours before</option>
                </select>
              </label>

              <label className="block sm:col-span-3">
                <span className="label">Check-in instructions</span>
                <textarea
                  className="input min-h-[64px]"
                  value={checkInInstructions}
                  onChange={e => setCheckInInstructions(e.target.value)}
                  placeholder="Explain how the guest receives keys or operates the keypad…"
                />
              </label>
              <label className="block sm:col-span-3">
                <span className="label">Arrival restrictions (ID rules, late arrival cutoffs)</span>
                <input
                  className="input"
                  value={arrivalRestrictions}
                  onChange={e => setArrivalRestrictions(e.target.value)}
                  placeholder="e.g. Arrivals after 10 PM require advance gate pass registration."
                />
              </label>

              <label className="block">
                <span className="label">Arrival contact name</span>
                <input className="input" value={arrivalContactName} onChange={e => setArrivalContactName(e.target.value)} />
              </label>
              <label className="block">
                <span className="label">Arrival contact phone</span>
                <input className="input" value={arrivalContactPhone} onChange={e => setArrivalContactPhone(e.target.value)} placeholder="+234…" />
              </label>
              <label className="block">
                <span className="label">Contact role</span>
                <input className="input" value={arrivalContactRole} onChange={e => setArrivalContactRole(e.target.value)} />
              </label>
            </div>

            <div className="mt-4 rounded-xl border border-ink-200 bg-white p-3.5">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-500">
                Protected entry & Wi-Fi secrets (never shown publicly or outside the active check-in window)
              </p>
              <div className="mt-2.5 grid gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="label">Estate / gate code</span>
                  <input className="input font-mono text-[12px]" value={gateAccessCode} onChange={e => setGateAccessCode(e.target.value)} />
                </label>
                <label className="block">
                  <span className="label">Building / lobby code</span>
                  <input className="input font-mono text-[12px]" value={buildingAccessCode} onChange={e => setBuildingAccessCode(e.target.value)} />
                </label>
                <label className="block">
                  <span className="label">Door smart-lock / lockbox</span>
                  <input className="input font-mono text-[12px]" value={lockboxCode} onChange={e => setLockboxCode(e.target.value)} />
                </label>
                <label className="block">
                  <span className="label">Wi-Fi network (SSID)</span>
                  <input className="input text-[12px]" value={wifiNetworkName} onChange={e => setWifiNetworkName(e.target.value)} />
                </label>
                <label className="block sm:col-span-2">
                  <span className="label">Wi-Fi password</span>
                  <input className="input font-mono text-[12px]" value={wifiPassword} onChange={e => setWifiPassword(e.target.value)} />
                </label>
              </div>
            </div>
          </section>

          {/* 5. Optional Extra Ordered Walkthrough Steps & Waypoints */}
          <section className="rounded-2xl border border-ink-100 bg-ink-50/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-sm font-black text-ink-900">
                  5. Optional numbered walkthrough steps & extra pins
                </h3>
                <p className="text-[11px] font-medium text-ink-500">
                  Add extra compound turns or secondary pins (e.g. basement parking ramp) for large estates.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSteps(prev => [
                      ...prev,
                      { stepType: 'security', heading: '', instruction: '', landmark: '', accessRequirement: '' },
                    ])
                  }
                  className="btn-outline !px-2.5 !py-1.5 text-[11px]"
                >
                  <Plus size={12} /> Add step
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setWaypoints(prev => [
                      ...prev,
                      {
                        pointType: 'parking_dropoff',
                        label: '',
                        latitude: parsedLat ?? 6.45,
                        longitude: parsedLng ?? 3.43,
                        instructions: '',
                      },
                    ])
                  }
                  className="btn-outline !px-2.5 !py-1.5 text-[11px]"
                >
                  <Plus size={12} /> Add extra waypoint
                </button>
              </div>
            </div>

            {steps.length > 0 && (
              <div className="mt-3 space-y-2.5">
                {steps.map((st, idx) => (
                  <div key={idx} className="rounded-xl border border-ink-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-extrabold text-jade-800">Step #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => setSteps(prev => prev.filter((_, i) => i !== idx))}
                        className="text-red-600 hover:text-red-800"
                        aria-label="Remove step"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <select
                        className="input !py-1.5 text-[12px]"
                        value={st.stepType}
                        onChange={e =>
                          setSteps(prev =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, stepType: e.target.value as WayfinderStepType } : item,
                            ),
                          )
                        }
                      >
                        {(Object.entries(STEP_TYPE_LABELS) as Array<[WayfinderStepType, string]>).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                      <input
                        className="input !py-1.5 text-[12px]"
                        placeholder="Heading (e.g. Clear Gate A security)"
                        value={st.heading}
                        onChange={e =>
                          setSteps(prev =>
                            prev.map((item, i) => (i === idx ? { ...item, heading: e.target.value } : item)),
                          )
                        }
                      />
                      <input
                        className="input !py-1.5 text-[12px] sm:col-span-2"
                        placeholder="Clear instruction…"
                        value={st.instruction}
                        onChange={e =>
                          setSteps(prev =>
                            prev.map((item, i) => (i === idx ? { ...item, instruction: e.target.value } : item)),
                          )
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {waypoints.length > 0 && (
              <div className="mt-3 space-y-2.5">
                {waypoints.map((wp, idx) => (
                  <div key={idx} className="rounded-xl border border-ink-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-extrabold text-ink-700">Waypoint #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => setWaypoints(prev => prev.filter((_, i) => i !== idx))}
                        className="text-red-600 hover:text-red-800"
                        aria-label="Remove waypoint"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-4">
                      <select
                        className="input !py-1.5 text-[12px]"
                        value={wp.pointType}
                        onChange={e =>
                          setWaypoints(prev =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, pointType: e.target.value as WayfinderWaypointType } : item,
                            ),
                          )
                        }
                      >
                        {(Object.entries(WAYPOINT_TYPE_LABELS) as Array<[WayfinderWaypointType, string]>).map(
                          ([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ),
                        )}
                      </select>
                      <input
                        className="input !py-1.5 text-[12px]"
                        placeholder="Label"
                        value={wp.label}
                        onChange={e =>
                          setWaypoints(prev =>
                            prev.map((item, i) => (i === idx ? { ...item, label: e.target.value } : item)),
                          )
                        }
                      />
                      <input
                        className="input font-mono !py-1.5 text-[12px]"
                        placeholder="Lat"
                        value={String(wp.latitude)}
                        onChange={e =>
                          setWaypoints(prev =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, latitude: Number(e.target.value) || 0 } : item,
                            ),
                          )
                        }
                      />
                      <input
                        className="input font-mono !py-1.5 text-[12px]"
                        placeholder="Lng"
                        value={String(wp.longitude)}
                        onChange={e =>
                          setWaypoints(prev =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, longitude: Number(e.target.value) || 0 } : item,
                            ),
                          )
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2.5 border-t border-ink-100 pt-4">
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave(true)}
            className="btn-outline !px-4 !py-2.5 text-[12.5px] disabled:opacity-50"
          >
            Save draft
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave(false)}
            className="btn-jade !px-5 !py-2.5 text-[12.5px] disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Submit Wayfinder for verification'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
