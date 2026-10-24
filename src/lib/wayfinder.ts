// ─── HAMLET Wayfinder Core Services ──────────────────────────────────────────
// Modular, pure, provider-independent services for:
//   1. Coordinate validation & geographic boundary checks (Lagos + Nigeria-wide reusable)
//   2. External Google Maps navigation URL generation (zero API key required)
//   3. Honest arrival guide readiness evaluation
//   4. Booking eligibility & check-in window code-release calculation (Africa/Lagos WAT)
//   5. Copyable offline/driver arrival summaries (never leaking sensitive access codes)

import type {
  ArrivalIssueType,
  Booking,
  CheckInMethod,
  CoordinatePointType,
  CoordinateSource,
  GuestBookingWayfinderView,
  Property,
  Session,
  WayfinderGuide,
  WayfinderGuideSnapshot,
  WayfinderSecrets,
  WayfinderStatus,
  WayfinderStepType,
  WayfinderVerificationMethod,
  WayfinderWaypointType,
} from './types';

export interface ValidatedCoordinates {
  latitude: number;
  longitude: number;
  withinNigeriaBounds: boolean;
  withinLagosMetroBounds: boolean;
}

export type CoordinateValidationResult =
  | ({ ok: true } & ValidatedCoordinates)
  | { ok: false; error: string };

/** Geographic bounding box for Nigeria (reusable as HAMLET expands to future Nigerian cities). */
export const NIGERIA_BOUNDS = {
  minLat: 4.0,
  maxLat: 14.0,
  minLng: 2.5,
  maxLng: 15.0,
} as const;

/** Approximate bounding box for Greater Lagos (Mainland, Island, Lekki–Epe & Badagry corridors). */
export const LAGOS_METRO_BOUNDS = {
  minLat: 6.35,
  maxLat: 6.75,
  minLng: 2.7,
  maxLng: 4.05,
} as const;

export function isWithinNigeriaBounds(latitude: number, longitude: number): boolean {
  return (
    latitude >= NIGERIA_BOUNDS.minLat &&
    latitude <= NIGERIA_BOUNDS.maxLat &&
    longitude >= NIGERIA_BOUNDS.minLng &&
    longitude <= NIGERIA_BOUNDS.maxLng
  );
}

export function isWithinLagosMetroBounds(latitude: number, longitude: number): boolean {
  return (
    latitude >= LAGOS_METRO_BOUNDS.minLat &&
    latitude <= LAGOS_METRO_BOUNDS.maxLat &&
    longitude >= LAGOS_METRO_BOUNDS.minLng &&
    longitude <= LAGOS_METRO_BOUNDS.maxLng
  );
}

/** Validates numeric latitude and longitude, rejecting NaN, out-of-range values, and Null Island (0, 0). */
export function validateCoordinates(
  rawLat: unknown,
  rawLng: unknown,
): CoordinateValidationResult {
  if (rawLat === null || rawLat === undefined || rawLat === '' || rawLng === null || rawLng === undefined || rawLng === '') {
    return { ok: false, error: 'Both latitude and longitude are required.' };
  }

  const lat = typeof rawLat === 'number' ? rawLat : Number(String(rawLat).trim());
  const lng = typeof rawLng === 'number' ? rawLng : Number(String(rawLng).trim());

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, error: 'Coordinates must be valid decimal numbers (for example, 6.4281 and 3.4219).' };
  }

  if (lat < -90 || lat > 90) {
    return { ok: false, error: 'Latitude must be between -90 and 90 degrees.' };
  }

  if (lng < -180 || lng > 180) {
    return { ok: false, error: 'Longitude must be between -180 and 180 degrees.' };
  }

  if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) {
    return { ok: false, error: 'Placeholder coordinates (0, 0) are not valid. Enter the real property or gate pin.' };
  }

  const roundedLat = Number(lat.toFixed(6));
  const roundedLng = Number(lng.toFixed(6));

  return {
    ok: true,
    latitude: roundedLat,
    longitude: roundedLng,
    withinNigeriaBounds: isWithinNigeriaBounds(roundedLat, roundedLng),
    withinLagosMetroBounds: isWithinLagosMetroBounds(roundedLat, roundedLng),
  };
}

/**
 * Generates a safe, provider-independent Google Maps navigation URL from validated coordinates.
 * Never fabricates routes or travel times, and returns `null` if coordinates are missing or invalid.
 */
export function buildGoogleMapsDirectionsUrl(coords: {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
}): string | null {
  const validated = validateCoordinates(coords.latitude, coords.longitude);
  if (!validated.ok) return null;

  const destination = encodeURIComponent(`${validated.latitude},${validated.longitude}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&dir_action=navigate`;
}

/** Formats decimal coordinates cleanly for display without implying indoor apartment precision. */
export function formatCoordinatePair(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): string | null {
  const validated = validateCoordinates(latitude, longitude);
  if (!validated.ok) return null;
  return `${validated.latitude.toFixed(5)}, ${validated.longitude.toFixed(5)}`;
}

export interface WayfinderReadinessSummary {
  status: WayfinderStatus;
  badgeLabel: string;
  guestSummary: string;
  tone: 'jade' | 'amber' | 'sky' | 'red' | 'neutral';
  hasValidCoordinates: boolean;
  hasEntranceGuidance: boolean;
  hasBuildingGuidance: boolean;
  hasApartmentDoorGuidance: boolean;
  hasCheckInGuidance: boolean;
  isApprovedForGuests: boolean;
  isCompleteDoorToDoor: boolean;
  hasPendingPartnerUpdate: boolean;
  missingStages: string[];
}

/** Evaluates honest arrival readiness without conflating general listing approval with door-to-door verification. */
export function computeWayfinderReadiness(
  property: Pick<Property, 'wayfinderStatus' | 'locationAccuracy'> | undefined,
  guide?: WayfinderGuide | WayfinderGuideSnapshot | null,
): WayfinderReadinessSummary {
  const pubStatus = guide && 'publicationStatus' in guide ? guide.publicationStatus : guide ? 'approved' : undefined;
  const hasPendingPartnerUpdate = Boolean(
    guide && 'pendingStatus' in guide && guide.pendingStatus === 'submitted',
  );

  const coordCheck = guide
    ? validateCoordinates(guide.destinationLatitude, guide.destinationLongitude)
    : { ok: false as const, error: 'Missing' };
  const hasValidCoordinates = coordCheck.ok;
  const hasEntranceGuidance = Boolean(
    guide && (guide.entranceInstructions.trim().length >= 8 || guide.preferredEntranceLabel.trim().length >= 3),
  );
  const hasBuildingGuidance = Boolean(
    guide && (guide.buildingOrBlock.trim().length >= 2 || guide.buildingInstructions.trim().length >= 8 || guide.estateOrBuildingName.trim().length >= 3),
  );
  const hasApartmentDoorGuidance = Boolean(
    guide && (guide.routeToDoor.trim().length >= 8 || guide.apartmentIdentifier.trim().length >= 1),
  );
  const hasCheckInGuidance = Boolean(
    guide && guide.checkInInstructions.trim().length >= 8,
  );

  const missingStages: string[] = [];
  if (!hasValidCoordinates) missingStages.push('Destination entrance coordinates');
  if (!hasEntranceGuidance) missingStages.push('Gate / entrance instructions');
  if (!hasApartmentDoorGuidance) missingStages.push('Floor & apartment door route');
  if (!hasCheckInGuidance) missingStages.push('Check-in instructions');

  const isApprovedForGuests = pubStatus === 'approved';
  const isCompleteDoorToDoor =
    isApprovedForGuests &&
    Boolean(guide?.coordinatesChecked) &&
    Boolean(guide?.writtenDirectionsChecked) &&
    hasValidCoordinates &&
    hasEntranceGuidance &&
    (hasApartmentDoorGuidance || hasCheckInGuidance);

  const rawStatus: WayfinderStatus = (() => {
    if (pubStatus === 'disabled' || property?.wayfinderStatus === 'disabled') return 'disabled';
    if (pubStatus === 'needs_correction' || property?.wayfinderStatus === 'needs_correction') return 'needs_correction';
    if (isCompleteDoorToDoor) return 'guide_ready';
    if (isApprovedForGuests && hasValidCoordinates) return 'guide_incomplete';
    if (pubStatus === 'submitted' || property?.wayfinderStatus === 'awaiting_verification') return 'awaiting_verification';
    if (pubStatus === 'draft' && hasValidCoordinates) return 'location_submitted';
    return property?.wayfinderStatus ?? 'location_missing';
  })();

  switch (rawStatus) {
    case 'guide_ready':
      return {
        status: 'guide_ready',
        badgeLabel: 'Arrival guide ready',
        guestSummary: 'Verified entrance coordinates and door-to-door arrival instructions are ready for confirmed guests.',
        tone: 'jade',
        hasValidCoordinates,
        hasEntranceGuidance,
        hasBuildingGuidance,
        hasApartmentDoorGuidance,
        hasCheckInGuidance,
        isApprovedForGuests,
        isCompleteDoorToDoor: true,
        hasPendingPartnerUpdate,
        missingStages,
      };
    case 'guide_incomplete':
    case 'location_verified':
      return {
        status: 'guide_incomplete',
        badgeLabel: 'Entrance verified · Guide partial',
        guestSummary: 'The property entrance pin is verified, while indoor building-to-door steps are still being completed.',
        tone: 'sky',
        hasValidCoordinates,
        hasEntranceGuidance,
        hasBuildingGuidance,
        hasApartmentDoorGuidance,
        hasCheckInGuidance,
        isApprovedForGuests,
        isCompleteDoorToDoor: false,
        hasPendingPartnerUpdate,
        missingStages,
      };
    case 'awaiting_verification':
      return {
        status: 'awaiting_verification',
        badgeLabel: 'Awaiting HAMLET verification',
        guestSummary: 'Your arrival guide has been submitted by the property partner and is awaiting HAMLET verification.',
        tone: 'amber',
        hasValidCoordinates,
        hasEntranceGuidance,
        hasBuildingGuidance,
        hasApartmentDoorGuidance,
        hasCheckInGuidance,
        isApprovedForGuests: false,
        isCompleteDoorToDoor: false,
        hasPendingPartnerUpdate,
        missingStages,
      };
    case 'needs_correction':
      return {
        status: 'needs_correction',
        badgeLabel: 'Guide needs correction',
        guestSummary: 'This property’s arrival directions are currently flagged for correction by HAMLET operations.',
        tone: 'red',
        hasValidCoordinates,
        hasEntranceGuidance,
        hasBuildingGuidance,
        hasApartmentDoorGuidance,
        hasCheckInGuidance,
        isApprovedForGuests: false,
        isCompleteDoorToDoor: false,
        hasPendingPartnerUpdate,
        missingStages,
      };
    case 'disabled':
      return {
        status: 'disabled',
        badgeLabel: 'Guide paused for review',
        guestSummary: 'Wayfinder directions are temporarily paused while HAMLET verifies updated arrival details.',
        tone: 'red',
        hasValidCoordinates,
        hasEntranceGuidance,
        hasBuildingGuidance,
        hasApartmentDoorGuidance,
        hasCheckInGuidance,
        isApprovedForGuests: false,
        isCompleteDoorToDoor: false,
        hasPendingPartnerUpdate,
        missingStages,
      };
    case 'location_submitted':
      return {
        status: 'location_submitted',
        badgeLabel: 'Draft location saved',
        guestSummary: 'Your arrival guide is being prepared. Contact support if you need help planning your arrival.',
        tone: 'amber',
        hasValidCoordinates,
        hasEntranceGuidance,
        hasBuildingGuidance,
        hasApartmentDoorGuidance,
        hasCheckInGuidance,
        isApprovedForGuests: false,
        isCompleteDoorToDoor: false,
        hasPendingPartnerUpdate,
        missingStages,
      };
    default:
      return {
        status: 'location_missing',
        badgeLabel: 'Arrival guide in preparation',
        guestSummary: 'Your arrival guide is being prepared. Contact support if you need help planning your arrival.',
        tone: 'neutral',
        hasValidCoordinates,
        hasEntranceGuidance,
        hasBuildingGuidance,
        hasApartmentDoorGuidance,
        hasCheckInGuidance,
        isApprovedForGuests: false,
        isCompleteDoorToDoor: false,
        hasPendingPartnerUpdate,
        missingStages,
      };
  }
}

export interface AccessWindowEvaluation {
  codesUnlocked: boolean;
  unlockAtIso: string;
  expireAtIso: string;
}

/**
 * Evaluates the check-in code release window anchored to Africa/Lagos (UTC+01:00).
 * Check-in anchor: 14:00 WAT on `checkIn` minus `releaseHoursBeforeCheckIn` (default 24h).
 * Expiry cutoff: 18:00 WAT on `checkOut` so departed/completed stays never retain active codes.
 */
export function evaluateCheckInCodeWindow(params: {
  bookingStatus: Booking['status'];
  checkIn: string;
  checkOut: string;
  releaseHoursBeforeCheckIn?: number;
  now?: Date;
}): AccessWindowEvaluation {
  const releaseHours = Math.min(168, Math.max(1, Math.round(params.releaseHoursBeforeCheckIn ?? 24)));
  const checkInAnchorMs = Date.parse(`${params.checkIn}T14:00:00+01:00`);
  const checkOutCutoffMs = Date.parse(`${params.checkOut}T18:00:00+01:00`);
  const unlockAtMs = checkInAnchorMs - releaseHours * 3_600_000;
  const nowMs = (params.now ?? new Date()).getTime();

  const codesUnlocked =
    params.bookingStatus === 'confirmed' &&
    Number.isFinite(unlockAtMs) &&
    Number.isFinite(checkOutCutoffMs) &&
    nowMs >= unlockAtMs &&
    nowMs <= checkOutCutoffMs;

  return {
    codesUnlocked,
    unlockAtIso: Number.isFinite(unlockAtMs) ? new Date(unlockAtMs).toISOString() : '',
    expireAtIso: Number.isFinite(checkOutCutoffMs) ? new Date(checkOutCutoffMs).toISOString() : '',
  };
}

/** Determines whether a booking status is eligible to open Wayfinder at all. */
export function canOpenBookingWayfinder(bookingStatus: Booking['status']): boolean {
  return bookingStatus === 'confirmed' || bookingStatus === 'completed';
}

/**
 * Authoritative client/demo evaluation matching `public.get_guest_booking_wayfinder` in PostgreSQL.
 * Never exposes sensitive codes to unconfirmed, completed, cancelled, or other guests' bookings.
 */
export function evaluateGuestBookingWayfinder(params: {
  booking: Booking | undefined;
  property: Property | undefined;
  guide: WayfinderGuide | undefined;
  secrets: WayfinderSecrets | undefined;
  session: Session | null;
  canManageProperty?: boolean;
  now?: Date;
}): { ok: true; data: GuestBookingWayfinderView } | { ok: false; error: string } {
  const { booking, property, guide, secrets, session, canManageProperty = false, now } = params;

  if (!session) {
    return { ok: false, error: 'Sign in to view Wayfinder arrival guidance.' };
  }
  if (session.accountStatus === 'suspended') {
    return { ok: false, error: 'Your account is currently suspended. Contact HAMLET operations.' };
  }
  if (!booking || !property) {
    return { ok: false, error: 'Booking not found.' };
  }
  if (booking.guestId !== session.userId && session.role !== 'admin' && !canManageProperty) {
    return { ok: false, error: 'You do not have permission to view arrival guidance for this booking.' };
  }
  if (!canOpenBookingWayfinder(booking.status)) {
    return {
      ok: false,
      error: 'Wayfinder arrival instructions unlock only after your booking is confirmed.',
    };
  }

  const hasApprovedGuide = Boolean(guide && guide.publicationStatus === 'approved');
  const activeSnapshot: WayfinderGuideSnapshot | null = hasApprovedGuide && guide
    ? {
        publishedRevision: guide.publishedRevision,
        destinationLatitude: guide.destinationLatitude,
        destinationLongitude: guide.destinationLongitude,
        coordinatePointType: guide.coordinatePointType,
        coordinateSource: guide.coordinateSource,
        ambiguityNotes: guide.ambiguityNotes,
        guestIntroduction: guide.guestIntroduction,
        estateOrBuildingName: guide.estateOrBuildingName,
        preferredEntranceLabel: guide.preferredEntranceLabel,
        entranceInstructions: guide.entranceInstructions,
        entrancePhotoUrl: guide.entrancePhotoUrl,
        securityDeskInstructions: guide.securityDeskInstructions,
        buildingOrBlock: guide.buildingOrBlock,
        buildingInstructions: guide.buildingInstructions,
        buildingPhotoUrl: guide.buildingPhotoUrl,
        floorLabel: guide.floorLabel,
        apartmentIdentifier: guide.apartmentIdentifier,
        liftOrStairsInstructions: guide.liftOrStairsInstructions,
        routeToDoor: guide.routeToDoor,
        doorLandmarkPhotoUrl: guide.doorLandmarkPhotoUrl,
        parkingOrDropoffInstructions: guide.parkingOrDropoffInstructions,
        arrivalRestrictions: guide.arrivalRestrictions,
        checkInMethod: guide.checkInMethod,
        checkInWindowLabel: guide.checkInWindowLabel,
        checkInInstructions: guide.checkInInstructions,
        arrivalContactName: guide.arrivalContactName,
        arrivalContactRole: guide.arrivalContactRole,
        arrivalContactPhone: guide.arrivalContactPhone,
        coordinatesChecked: guide.coordinatesChecked,
        writtenDirectionsChecked: guide.writtenDirectionsChecked,
        photosChecked: guide.photosChecked,
        physicallyVisited: guide.physicallyVisited,
        guestArrivalTested: guide.guestArrivalTested,
        verifiedAt: guide.verifiedAt,
        waypoints: guide.waypoints.filter(w => w.verificationStatus === 'verified'),
        steps: guide.steps.filter(s => s.verificationStatus === 'verified'),
      }
    : booking.wayfinderSnapshot ?? null;

  const hasSensitiveCodes = Boolean(
    secrets &&
      (secrets.gateAccessCode.trim() ||
        secrets.buildingAccessCode.trim() ||
        secrets.lockboxOrSmartlockCode.trim() ||
        secrets.wifiPassword.trim()),
  );

  const windowEval = evaluateCheckInCodeWindow({
    bookingStatus: booking.status,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    releaseHoursBeforeCheckIn: secrets?.releaseHoursBeforeCheckIn ?? 24,
    now,
  });

  const codesUnlocked = Boolean(hasApprovedGuide && hasSensitiveCodes && windowEval.codesUnlocked);
  const readiness = computeWayfinderReadiness(property, guide ?? activeSnapshot);

  return {
    ok: true,
    data: {
      bookingId: booking.id,
      bookingReference: booking.ref,
      bookingStatus: booking.status,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      guestCount: booking.guests,
      propertyId: property.id,
      propertyTitle: property.title,
      area: property.area,
      city: property.city || 'Lagos',
      publicAddress: property.address,
      publicLandmarks: property.publicLandmarks ?? [],
      wayfinderStatus: readiness.status,
      guideAvailable: Boolean(activeSnapshot),
      guide: activeSnapshot,
      confirmedSnapshot: booking.wayfinderSnapshot ?? activeSnapshot,
      newerRevisionAvailable: Boolean(
        booking.wayfinderSnapshotRevision &&
          activeSnapshot &&
          booking.wayfinderSnapshotRevision < activeSnapshot.publishedRevision,
      ),
      hasSensitiveCodes,
      codesUnlocked,
      codesUnlockAt: hasSensitiveCodes ? windowEval.unlockAtIso : null,
      codesExpireAt: hasSensitiveCodes ? windowEval.expireAtIso : null,
      secrets:
        codesUnlocked && secrets
          ? {
              gateAccessCode: secrets.gateAccessCode,
              buildingAccessCode: secrets.buildingAccessCode,
              lockboxOrSmartlockCode: secrets.lockboxOrSmartlockCode,
              wifiNetworkName: secrets.wifiNetworkName,
              wifiPassword: secrets.wifiPassword,
            }
          : null,
    },
  };
}

/** Builds a clean, non-sensitive summary suitable for copying or sharing with a ride-hailing driver. */
export function buildCopyableDriverSummary(params: {
  propertyTitle: string;
  publicAddress: string;
  area: string;
  city?: string;
  landmarks?: string[];
  estateOrBuildingName?: string;
  preferredEntranceLabel?: string;
  parkingOrDropoffInstructions?: string;
}): string {
  const lines = [
    `Destination: ${params.estateOrBuildingName?.trim() || params.propertyTitle}`,
    `Address: ${params.publicAddress} (${params.area}, ${params.city || 'Lagos'})`,
  ];
  if (params.preferredEntranceLabel?.trim()) {
    lines.push(`Entrance / Gate: ${params.preferredEntranceLabel.trim()}`);
  }
  if (params.landmarks && params.landmarks.length > 0) {
    lines.push(`Nearby landmarks: ${params.landmarks.join(' · ')}`);
  }
  if (params.parkingOrDropoffInstructions?.trim()) {
    lines.push(`Drop-off / parking: ${params.parkingOrDropoffInstructions.trim()}`);
  }
  return lines.join('\n');
}

export const COORDINATE_POINT_TYPE_LABELS: Record<CoordinatePointType, string> = {
  estate_gate: 'Estate main gate',
  preferred_guest_entrance: 'Preferred guest entrance',
  property_entrance: 'Standalone property entrance',
  building_entrance: 'Building / tower entrance',
  road_access: 'Main road turn-off / access point',
  dropoff_parking: 'Guest drop-off / parking gate',
};

export const COORDINATE_SOURCE_LABELS: Record<CoordinateSource, string> = {
  manual_entry: 'Partner manual pin / coordinates',
  gps_on_site: 'Captured on-site at entrance',
  google_maps_pin: 'Verified Google Maps entrance pin',
  staff_verified_survey: 'HAMLET staff survey',
};

export const CHECKIN_METHOD_LABELS: Record<CheckInMethod, string> = {
  host_meet: 'Host or manager meets guest on arrival',
  security_desk: 'Reception / estate security desk handover',
  smart_lock: 'Smart lock keypad at apartment door',
  lockbox: 'Secure key lockbox on premises',
  concierge: '24/7 building concierge desk',
};

export const WAYPOINT_TYPE_LABELS: Record<WayfinderWaypointType, string> = {
  main_road_access: 'Main road turn-off',
  estate_entrance: 'Estate gate',
  preferred_guest_entrance: 'Preferred guest gate',
  building_entrance: 'Building entrance',
  parking_dropoff: 'Parking / drop-off point',
  other_waypoint: 'Landmark waypoint',
};

export const STEP_TYPE_LABELS: Record<WayfinderStepType, string> = {
  navigate: 'Navigate to entrance',
  entrance: 'Estate / street entrance',
  security: 'Security / gate clearance',
  building: 'Find the building / block',
  floor_corridor: 'Lift, stairs & floor',
  apartment_door: 'Apartment door',
  checkin: 'Check-in & access',
};

export const VERIFICATION_METHOD_LABELS: Record<WayfinderVerificationMethod, string> = {
  staff_desk_review: 'HAMLET staff review of coordinates & instructions',
  map_imagery_crosscheck: 'Satellite & street-map cross-check',
  partner_rep_confirmation: 'Confirmed with authorised property representative',
  physical_onsite_check: 'Physical on-site check by HAMLET',
  documented_arrival_test: 'Documented end-to-end arrival test',
};

export const ARRIVAL_ISSUE_TYPE_LABELS: Record<ArrivalIssueType, string> = {
  incorrect_map_pin: 'Incorrect map pin',
  cannot_find_entrance: 'Cannot find entrance',
  cannot_find_building: 'Cannot find building',
  cannot_find_apartment: 'Cannot find apartment',
  checkin_instructions_unclear: 'Check-in instructions unclear',
  access_method_not_working: 'Access method not working',
  other_arrival_problem: 'Other arrival problem',
};
