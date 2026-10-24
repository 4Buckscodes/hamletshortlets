import { describe, expect, it } from 'vitest';
import {
  buildCopyableDriverSummary,
  buildGoogleMapsDirectionsUrl,
  canOpenBookingWayfinder,
  computeWayfinderReadiness,
  evaluateCheckInCodeWindow,
  evaluateGuestBookingWayfinder,
  formatCoordinatePair,
  isWithinLagosMetroBounds,
  isWithinNigeriaBounds,
  validateCoordinates,
} from './wayfinder';
import { isNoIndexPath } from './seo';
import type { Booking, Property, Session, WayfinderGuide, WayfinderSecrets } from './types';

function makeSampleGuide(overrides: Partial<WayfinderGuide> = {}): WayfinderGuide {
  return {
    id: 'wfg-test-01',
    propertyId: 'p-test-01',
    publicationStatus: 'approved',
    needsReverification: false,
    destinationLatitude: 6.44782,
    destinationLongitude: 3.43841,
    coordinatePointType: 'estate_gate',
    coordinateSource: 'manual_entry',
    ambiguityNotes: 'Enter via Gate A off Bourdillon Road.',
    guestIntroduction: 'Welcome to your stay.',
    preferredEntranceLabel: 'Gate A (Main Security)',
    entranceInstructions: 'Stop at the green barrier and state your booking ref.',
    securityDeskInstructions: 'Present photo ID at the gatehouse.',
    estateOrBuildingName: 'Bourdillon Court',
    buildingOrBlock: 'Tower B',
    buildingInstructions: 'Drive 50m straight to Tower B lobby.',
    parkingOrDropoffInstructions: 'Visitor bay B-12.',
    floorLabel: '5th Floor',
    apartmentIdentifier: 'Apartment 5B',
    liftOrStairsInstructions: 'Take Lift 1 to Level 5.',
    routeToDoor: 'Turn left out of the lift; second door on the right.',
    checkInMethod: 'smart_lock',
    checkInWindowLabel: '2:00 PM – 10:00 PM',
    arrivalRestrictions: 'Register late arrivals before 9 PM.',
    checkInInstructions: 'Enter your 6-digit keypad code followed by #.',
    arrivalContactName: 'Tunde Desk',
    arrivalContactPhone: '+2348000001111',
    arrivalContactRole: 'Concierge',
    publishedRevision: 1,
    coordinatesChecked: true,
    writtenDirectionsChecked: true,
    photosChecked: true,
    physicallyVisited: false,
    guestArrivalTested: false,
    waypoints: [],
    steps: [],
    updatedAt: '2026-10-24T10:00:00Z',
    ...overrides,
  };
}

function makeSampleSecrets(overrides: Partial<WayfinderSecrets> = {}): WayfinderSecrets {
  return {
    propertyId: 'p-test-01',
    gateAccessCode: 'GATE-9912',
    buildingAccessCode: 'BLDG-4421',
    lockboxOrSmartlockCode: '884210#',
    wifiNetworkName: 'HAMLET_5B',
    wifiPassword: 'StayVerified2026',
    releaseHoursBeforeCheckIn: 24,
    updatedAt: '2026-10-24T10:00:00Z',
    ...overrides,
  };
}

function makeSampleProperty(overrides: Partial<Property> = {}): Property {
  return {
    id: 'p-test-01',
    title: 'Ikoyi Test Residence',
    type: 'Apartment',
    area: 'Ikoyi',
    city: 'Lagos',
    address: '14 Bourdillon Close, Ikoyi, Lagos',
    nightlyRate: 250000,
    cleaningFee: 25000,
    mandatoryCharges: [],
    deposit: 150000,
    bedrooms: 2,
    bathrooms: 2,
    capacity: 4,
    bedSetup: '2 King',
    amenities: ['Wifi', '24/7 Power'],
    images: ['/images/prop/living-1.jpg'],
    houseRules: ['Check-in from 2:00 PM'],
    status: 'approved',
    trustLabel: 'Verified by HAMLET',
    ownerId: 'u-partner-01',
    ownerName: 'Partner One',
    submittedBy: 'Partner One',
    submittedRole: 'Owner',
    authorityBasis: 'Registered deed holder',
    assignedPartnerIds: [],
    verification: {
      ownership: 'verified',
      identity: 'verified',
      authority: 'verified',
      inspection: 'verified',
    },
    docs: [],
    createdAt: '2026-10-01T10:00:00Z',
    publicLandmarks: ['Off Bourdillon Road', '4 mins from Ikoyi Club'],
    locationAccuracy: 'verified_entrance',
    wayfinderStatus: 'guide_ready',
    ...overrides,
  };
}

function makeSampleBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 'bk-test-01',
    ref: 'HML-2026-9901',
    propertyId: 'p-test-01',
    propertyTitle: 'Ikoyi Test Residence',
    area: 'Ikoyi',
    guestId: 'u-guest-01',
    guestName: 'Ada Guest',
    guestEmail: 'ada@guest.test',
    checkIn: '2026-10-25',
    checkOut: '2026-10-28',
    nights: 3,
    guests: 2,
    mandatoryCharges: [],
    mandatoryTotal: 0,
    accommodationSubtotal: 775000,
    hamletGuestFee: 155000,
    guestTotal: 930000,
    deposit: 150000,
    status: 'confirmed',
    requestedAt: '2026-10-20T10:00:00Z',
    timeline: [],
    ...overrides,
  };
}

function makeGuestSession(userId = 'u-guest-01'): Session {
  return {
    userId,
    name: 'Ada Guest',
    email: 'ada@guest.test',
    role: 'guest',
    accountStatus: 'active',
  };
}

describe('HAMLET Wayfinder Core Services & Unit Rules', () => {
  describe('Coordinate Validation & Bounding Boxes', () => {
    it('accepts valid Lagos entrance coordinates with 6 decimal precision', () => {
      const res = validateCoordinates(6.4478234, 3.4384129);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.latitude).toBe(6.447823);
        expect(res.longitude).toBe(3.438413);
        expect(res.withinNigeriaBounds).toBe(true);
        expect(res.withinLagosMetroBounds).toBe(true);
      }
      expect(isWithinNigeriaBounds(6.447823, 3.438413)).toBe(true);
      expect(isWithinLagosMetroBounds(6.447823, 3.438413)).toBe(true);
    });

    it('rejects (0, 0) Gulf of Guinea default coordinates and non-finite inputs', () => {
      const zero = validateCoordinates(0, 0);
      expect(zero.ok).toBe(false);
      if (!zero.ok) {
        expect(zero.error).toMatch(/0, 0/);
      }
      expect(validateCoordinates(null, 3.43).ok).toBe(false);
      expect(validateCoordinates(Number.NaN, 3.43).ok).toBe(false);
      expect(validateCoordinates('abc', '3.43').ok).toBe(false);
    });

    it('rejects out-of-range latitudes/longitudes and flags swapped coordinates outside Nigeria', () => {
      expect(validateCoordinates(95, 3.43).ok).toBe(false);
      expect(validateCoordinates(6.45, 195).ok).toBe(false);
      // Swapped Lagos coordinates (lat=3.43, lng=6.45 -> lat < 4.0 Nigeria southern bound)
      const swapped = validateCoordinates(3.43841, 6.44782);
      expect(swapped.ok).toBe(true);
      if (swapped.ok) {
        expect(swapped.withinNigeriaBounds).toBe(false);
      }
    });

    it('recognizes non-Lagos Nigerian coordinates cleanly for future multi-city reuse', () => {
      const res = validateCoordinates(9.0765, 7.3986);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.withinNigeriaBounds).toBe(true);
        expect(res.withinLagosMetroBounds).toBe(false);
      }
    });

    it('formats coordinate pairs cleanly or returns null for invalid coordinates', () => {
      expect(formatCoordinatePair(6.44782, 3.43841)).toBe('6.44782, 3.43841');
      expect(formatCoordinatePair(0, 0)).toBeNull();
    });
  });

  describe('Safe Google Maps Directions URL Builder', () => {
    it('builds exact Google Maps universal navigation links from validated coordinates', () => {
      const url = buildGoogleMapsDirectionsUrl({
        latitude: 6.44782,
        longitude: 3.43841,
      });
      expect(url).toBe(
        'https://www.google.com/maps/dir/?api=1&destination=6.44782%2C3.43841&dir_action=navigate',
      );
    });

    it('refuses invalid or placeholder coordinates', () => {
      expect(buildGoogleMapsDirectionsUrl({ latitude: 0, longitude: 0 })).toBeNull();
      expect(buildGoogleMapsDirectionsUrl({ latitude: null, longitude: null })).toBeNull();
    });
  });

  describe('Wayfinder Completeness & Readiness Calculation', () => {
    it('separates full door-to-door readiness from partial verified pins and unverified submissions', () => {
      const fullGuide = makeSampleGuide();
      const prop = makeSampleProperty();
      const ready = computeWayfinderReadiness(prop, fullGuide);
      expect(ready.isCompleteDoorToDoor).toBe(true);
      expect(ready.hasValidCoordinates).toBe(true);
      expect(ready.status).toBe('guide_ready');

      const partialGuide = makeSampleGuide({
        floorLabel: '',
        apartmentIdentifier: '',
        routeToDoor: '',
        checkInInstructions: '',
      });
      const partial = computeWayfinderReadiness(
        makeSampleProperty({ wayfinderStatus: 'guide_incomplete' }),
        partialGuide,
      );
      expect(partial.hasValidCoordinates).toBe(true);
      expect(partial.isCompleteDoorToDoor).toBe(false);
      expect(partial.missingStages).toContain('Floor & apartment door route');

      const unverified = computeWayfinderReadiness(
        makeSampleProperty({ wayfinderStatus: 'awaiting_verification' }),
        makeSampleGuide({ publicationStatus: 'submitted' }),
      );
      expect(unverified.isApprovedForGuests).toBe(false);
      expect(unverified.status).toBe('awaiting_verification');
    });
  });

  describe('Booking State Gating & Time-Bounded Access Code Protection', () => {
    it('strictly blocks unconfirmed, unpaid, cancelled, expired, or other-guest bookings', () => {
      const prop = makeSampleProperty();
      const guide = makeSampleGuide();
      const secrets = makeSampleSecrets();
      const guestSession = makeGuestSession('u-guest-01');

      for (const blockedStatus of [
        'requested',
        'checking',
        'awaiting_payment',
        'cancelled',
        'declined',
        'expired',
        'no_show',
      ] as const) {
        const b = makeSampleBooking({ status: blockedStatus });
        expect(canOpenBookingWayfinder(b.status)).toBe(false);
        expect(
          evaluateGuestBookingWayfinder({
            booking: b,
            property: prop,
            guide,
            secrets,
            session: guestSession,
          }).ok,
        ).toBe(false);
      }

      // Wrong guest cannot open confirmed booking Wayfinder
      const confirmed = makeSampleBooking({ status: 'confirmed' });
      expect(
        evaluateGuestBookingWayfinder({
          booking: confirmed,
          property: prop,
          guide,
          secrets,
          session: makeGuestSession('u-stranger-99'),
        }).ok,
      ).toBe(false);
    });

    it('gates sensitive access codes to the check-in release window and retires them on completed stays', () => {
      const prop = makeSampleProperty();
      const guide = makeSampleGuide();
      const secrets = makeSampleSecrets({ releaseHoursBeforeCheckIn: 24 });
      const guestSession = makeGuestSession('u-guest-01');
      const booking = makeSampleBooking({
        status: 'confirmed',
        checkIn: '2026-10-28',
        checkOut: '2026-10-31',
      });

      // 4 days before check-in -> guide visible, sensitive codes locked
      const earlyNow = new Date('2026-10-24T09:00:00Z');
      const earlyRes = evaluateGuestBookingWayfinder({
        booking,
        property: prop,
        guide,
        secrets,
        session: guestSession,
        now: earlyNow,
      });
      expect(earlyRes.ok).toBe(true);
      if (earlyRes.ok) {
        expect(earlyRes.data.guideAvailable).toBe(true);
        expect(earlyRes.data.hasSensitiveCodes).toBe(true);
        expect(earlyRes.data.codesUnlocked).toBe(false);
        expect(earlyRes.data.secrets).toBeNull();
        expect(earlyRes.data.codesUnlockAt).toBe('2026-10-27T13:00:00.000Z');
      }

      // 5 hours before 14:00 WAT check-in -> sensitive codes unlocked!
      const windowNow = new Date('2026-10-28T08:00:00Z');
      const activeRes = evaluateGuestBookingWayfinder({
        booking,
        property: prop,
        guide,
        secrets,
        session: guestSession,
        now: windowNow,
      });
      expect(activeRes.ok).toBe(true);
      if (activeRes.ok) {
        expect(activeRes.data.codesUnlocked).toBe(true);
        expect(activeRes.data.secrets?.lockboxOrSmartlockCode).toBe('884210#');
      }

      // Completed stay -> archived guide summary allowed, sensitive codes retired
      const completedBooking = makeSampleBooking({
        status: 'completed',
        checkIn: '2026-10-20',
        checkOut: '2026-10-23',
      });
      const completedWindow = evaluateCheckInCodeWindow({
        bookingStatus: 'completed',
        checkIn: '2026-10-20',
        checkOut: '2026-10-23',
        now: new Date('2026-10-21T12:00:00Z'),
      });
      expect(completedWindow.codesUnlocked).toBe(false);

      const completedRes = evaluateGuestBookingWayfinder({
        booking: completedBooking,
        property: prop,
        guide,
        secrets,
        session: guestSession,
        now: new Date('2026-10-24T12:00:00Z'),
      });
      expect(completedRes.ok).toBe(true);
      if (completedRes.ok) {
        expect(completedRes.data.codesUnlocked).toBe(false);
        expect(completedRes.data.secrets).toBeNull();
      }
    });
  });

  describe('Driver Summary & Search Indexing Privacy', () => {
    it('builds a clean driver/ride-hailing text summary without leaking access codes', () => {
      const text = buildCopyableDriverSummary({
        propertyTitle: 'Ikoyi Test Residence',
        publicAddress: '14 Bourdillon Close',
        area: 'Ikoyi',
        city: 'Lagos',
        landmarks: ['Off Bourdillon Road'],
        estateOrBuildingName: 'Bourdillon Court',
        preferredEntranceLabel: 'Gate A',
        parkingOrDropoffInstructions: 'Visitor bay B-12',
      });
      expect(text).toContain('Bourdillon Court');
      expect(text).toContain('Gate A');
      expect(text).not.toContain('884210#');
    });

    it('marks /wayfinder routes as noindex in SEO helpers', () => {
      expect(isNoIndexPath('/wayfinder')).toBe(true);
      expect(isNoIndexPath('/wayfinder/bk-01')).toBe(true);
    });
  });
});
