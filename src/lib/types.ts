// ─── HAMLET domain model (Lagos marketplace — Availability, Referrals, Pricing, FX & Settlement) ─

export type AccountRole = 'guest' | 'partner' | 'admin';

export interface Account {
  id: string;
  name: string;
  email: string;
  password: string;
  role: AccountRole;
  partnerRole?: string; // owner | agent | property_manager | shortlet_operator | cohost | referral
  company?: string;
  phone?: string;
  referralCode?: string;
  referredByPartnerId?: string | null;
  referredByCode?: string | null;
  accountStatus?: 'active' | 'suspended';
  suspensionReason?: string;
  createdAt: string;
}

export interface Session {
  userId: string;
  role: AccountRole;
  name: string;
  email: string;
  phone?: string;
  partnerRole?: string;
  company?: string;
  referralCode?: string;
  accountStatus?: 'active' | 'suspended';
  suspensionReason?: string;
}

export type PropertyStatus =
  | 'draft'
  | 'submitted'
  | 'pending_review'
  | 'needs_correction'
  | 'approved'
  | 'paused'
  | 'rejected'
  | 'suspended'
  | 'archived';

export type AvailabilityConfirmationStatus =
  | 'confirmed'
  | 'confirmed_calendar'
  | 'needs_confirmation'
  | 'manual_confirmation'
  | 'unconfirmed';

export type AvailabilityBlockType = 'owner_block' | 'external_booking' | 'maintenance';

export interface PropertyAvailabilityBlock {
  id: string;
  propertyId: string;
  startDate: string; // YYYY-MM-DD (inclusive)
  endDate: string; // YYYY-MM-DD (exclusive check-out boundary)
  blockType: AvailabilityBlockType;
  source?: 'partner' | 'admin' | 'submission' | 'manager' | 'owner';
  note?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PublicCalendarSpan {
  propertyId: string;
  startDate: string;
  endDate: string;
  kind: 'hamlet_booking' | 'payment_hold' | 'unavailable_block';
}

export type DocStatus = 'verified' | 'pending_review' | 'missing' | 'self_reported';

export interface DocItem {
  label: string;
  status: DocStatus;
  note?: string;
}

export interface MandatoryCharge {
  label: string;
  amount: number; // per stay, ₦
}

export interface Property {
  id: string;
  title: string;
  type: string;
  area: string;
  address: string;
  /** Owner's listed accommodation price per night in NGN (B_night). */
  nightlyRate: number;
  cleaningFee: number; // known mandatory non-accommodation charge
  mandatoryCharges: MandatoryCharge[];
  deposit: number; // refundable caution fee — never fee-bearing, never buffered
  bedrooms: number;
  bathrooms: number;
  capacity: number;
  bedSetup: string;
  amenities: string[];
  images: string[];
  houseRules: string[];
  status: PropertyStatus;
  verification: {
    ownership: DocStatus;
    identity: DocStatus;
    authority: DocStatus;
    inspection: DocStatus;
  };
  trustLabel: string;
  ownerName: string;
  ownerId: string;
  submittedBy: string;
  submittedRole: string;
  authorityBasis: string;
  docs: DocItem[];
  assignedPartnerIds: string[];
  reviewNote?: string;
  createdAt: string;
  // ── Independent availability & attribution fields (§3 & §4.3) ──
  firstAvailableDate?: string | null; // YYYY-MM-DD when known
  availabilityConfirmationStatus?: AvailabilityConfirmationStatus;
  calendarResponsiblePerson?: string;
  calendarResponsibleName?: string;
  calendarResponsibleUserId?: string;
  lastAvailabilityUpdate?: string;
  availabilityUpdatedAt?: string;
  unavailableBlocks?: PropertyAvailabilityBlock[];
  introducerPartnerId?: string | null;
  propertyIntroducerId?: string | null;
  introducedAt?: string;
  managerPartnerId?: string | null;
  propertyManagerId?: string | null;
  authorisedManagerId?: string | null;
  managerAssignedAt?: string;
  // ── HAMLET Wayfinder public-safe location metadata ──
  city?: string;
  publicLandmarks?: string[];
  publicLocationSummary?: string;
  locationAccuracy?: LocationAccuracy;
  wayfinderStatus?: WayfinderStatus;
}

export type BookingStatus =
  | 'requested'
  | 'checking'
  | 'awaiting_payment'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'refunded'
  | 'disputed'
  | 'declined'
  | 'no_show';

export type CautionDepositStatus =
  | 'not_applicable'
  | 'due'
  | 'received'
  | 'inspection_pending'
  | 'refund_approved'
  | 'partially_refunded'
  | 'refund_partially_completed'
  | 'disputed'
  | 'refund_disputed'
  | 'refund_completed';

export type CautionFeeStatus = CautionDepositStatus;

export type PayoutStatus =
  | 'not_applicable'
  | 'not_ready'
  | 'pending'
  | 'approved'
  | 'settled'
  | 'paid'
  | 'withheld'
  | 'reversed';

export type SupportedCurrency = 'NGN' | 'USD' | 'GBP';

export interface TimelineEvent {
  at: string;
  label: string;
  actor: string;
  detail?: string;
}

export interface Booking {
  id: string;
  ref: string;
  propertyId: string;
  propertyTitle: string;
  area: string;
  guestId: string;
  guestName: string;
  guestEmail: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  /** Owner's listed accommodation subtotal in NGN (B). */
  accommodationSubtotal: number;
  mandatoryCharges: MandatoryCharge[];
  mandatoryTotal: number;
  /** 20% domestic markup on owner's listed accommodation subtotal (B × 20%). */
  hamletGuestFee: number;
  /** Authoritative domestic NGN stay total (excluding refundable caution deposit). */
  guestTotal: number;
  /** Separate refundable caution deposit in NGN. */
  deposit: number;
  status: BookingStatus;
  requestedAt: string;
  paymentDeadline?: string;
  paymentRef?: string;
  paymentProvider?: string;
  specialRequests?: string;
  cancelReason?: string;
  refundStatus?: 'none' | 'pending_review' | 'processed';
  refundAmount?: number;
  timeline: TimelineEvent[];
  // ── Booking pricing, FX quote, attribution & settlement snapshot (§4.3, §5, §6, §7, §9) ──
  ownerListedPriceNgn?: number;
  domesticMarkupRate?: number;
  domesticMarkupNgn?: number;
  domesticGuestPriceNgn?: number;
  domesticGuestAccommodationNgn?: number;
  closingAgentCommissionNgn?: number;
  directReferrerRewardNgn?: number;
  referrerRewardNgn?: number;
  hamletAllocationNgn?: number;
  paymentReserveNgn?: number;
  actualPaymentFeeNgn?: number;
  quoteCurrency?: SupportedCurrency;
  selectedGuestCurrency?: SupportedCurrency;
  settlementCurrency?: 'NGN';
  currencyPair?: string;
  fxRatePair?: string;
  fxRate?: number;
  exchangeRateNgnPerUnit?: number;
  fxRateSource?: string;
  exchangeRateSource?: string;
  fxQuotedAt?: string;
  exchangeRateTimestamp?: string;
  internationalBufferRate?: number;
  convertedBaseAmount?: number;
  internationalConvertedBaseMinor?: number;
  internationalBufferAmount?: number;
  internationalBufferMinor?: number;
  internationalBufferNgnEquiv?: number;
  quotedGuestTotal?: number;
  quotedStayTotalMinor?: number;
  quotedGrandTotalMinor?: number;
  settlementTotalNgn?: number;
  quoteExpiresAt?: string | null;
  pricingRulesVersion?: string;
  // ── 5 independent attribution roles (§4.3) ──
  propertyIntroducerId?: string | null;
  propertyManagerId?: string | null;
  authorisedManagerId?: string | null;
  closingAgentId?: string | null;
  closingAgentName?: string;
  closingAgentCode?: string | null;
  closingAgentAttributedAt?: string;
  directReferrerId?: string | null;
  directReferrerName?: string;
  referralId?: string | null;
  guestReferralSource?: string | null;
  guestReferredAt?: string;
  cautionFeeStatus?: CautionDepositStatus;
  payoutStatus?: PayoutStatus;
  // ── HAMLET Wayfinder confirmed-booking revision snapshot ──
  wayfinderSnapshot?: WayfinderGuideSnapshot | null;
  wayfinderSnapshotRevision?: number | null;
}

export interface CautionDepositRecord {
  id: string;
  bookingId: string;
  bookingRef?: string;
  propertyId: string;
  propertyTitle?: string;
  guestId?: string;
  guestName?: string;
  amountNgn: number;
  amountDueNgn?: number;
  amountReceivedNgn?: number;
  deductedAmountNgn: number;
  proposedDeductionNgn?: number;
  approvedDeductionNgn?: number;
  refundedAmountNgn: number;
  amountRefundedNgn?: number;
  status: CautionDepositStatus;
  collectionReference?: string;
  refundReference?: string;
  inspectionNotes?: string;
  deductionReason?: string;
  decisionNote?: string;
  decisionBy?: string;
  decidedBy?: string;
  decisionAt?: string;
  decidedAt?: string;
  evidence: string[];
  deductionEvidence?: string[];
  history?: TimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export type PartnerReferralStatus =
  | 'pending_verification'
  | 'registered'
  | 'verified'
  | 'active'
  | 'expired'
  | 'disputed'
  | 'revoked';

export type ReferralRelationshipStatus = PartnerReferralStatus;

export interface PartnerReferral {
  id: string;
  referrerPartnerId: string;
  referrerName: string;
  referrerPartnerName?: string;
  referredPartnerId: string;
  referredName: string;
  referredPartnerName?: string;
  referredCompany?: string;
  referredPartnerCompany?: string;
  referredPartnerRole?: string;
  referralCode: string;
  referralCodeUsed?: string;
  applicationId?: string;
  status: PartnerReferralStatus;
  earningWindowDays: number;
  registeredAt: string;
  attributedAt?: string;
  verifiedAt?: string;
  activatedAt?: string;
  activatingBookingId?: string;
  activatingBookingRef?: string;
  eligibilityStartsAt?: string;
  eligibilityEndsAt?: string;
  disputeReason?: string;
  disputeNote?: string;
  resolutionNote?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  updatedAt?: string;
}

export type ReferralRewardStatus =
  | 'activated_no_payout'
  | 'pending'
  | 'approved'
  | 'paid'
  | 'reversed'
  | 'withheld';

export interface PartnerReferralReward {
  id: string;
  referralId: string;
  referrerPartnerId: string;
  referrerPartnerName?: string;
  referredClosingAgentId: string;
  referredPartnerId?: string;
  referredAgentName?: string;
  referredPartnerName?: string;
  bookingId: string;
  bookingRef: string;
  propertyTitle?: string;
  ownerListedPriceNgn: number;
  rewardRate: number; // 0 for 1st activating booking, 0.025 (2.5%) for qualifying subsequent bookings
  rewardAmountNgn: number;
  payoutStatus: ReferralRewardStatus | PayoutStatus;
  status?: ReferralRewardStatus;
  reversalReason?: string;
  paidReference?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ExchangeRateConfig {
  currency: Exclude<SupportedCurrency, 'NGN'>;
  currencyPair: string; // 'NGN/USD' | 'NGN/GBP' | 'USD_NGN' | 'GBP_NGN'
  ngnPerUnit: number;
  bufferRate?: number;
  source: string;
  quoteTtlMinutes?: number;
  effectiveAt?: string;
  quotedAt?: string;
  expiresAt?: string | null;
  isActive: boolean;
  updatedBy?: string;
  updatedAt?: string;
}

export type LedgerType =
  | 'guest_charge'
  | 'guest_service_fee'
  | 'accommodation_revenue'
  | 'mandatory_charges'
  | 'closing_agent_commission'
  | 'referral_reward'
  | 'hamlet_allocation'
  | 'payment_reserve'
  | 'provider_charge'
  | 'international_buffer'
  | 'partner_commission'
  | 'deposit_hold'
  | 'caution_refund'
  | 'caution_deduction'
  | 'commission_reversal'
  | 'referral_reversal'
  | 'refund';

export type LedgerStatus = 'recorded' | 'reconciled' | 'settled' | 'pending' | 'flagged';

export interface LedgerEntry {
  id: string;
  at: string;
  bookingRef: string;
  bookingId?: string;
  propertyTitle?: string;
  beneficiaryUserId?: string | null;
  beneficiaryPartnerId?: string | null;
  type: LedgerType;
  description: string;
  amount: number; // ₦ integer, always non-negative magnitude
  currency?: SupportedCurrency;
  status: LedgerStatus;
  payoutStatus?: PayoutStatus;
  providerRef?: string;
  operator: string; // responsible operator
  variance: number; // ledger vs provider difference (0 = clean)
  note?: string;
}

export type IssueCategory =
  | 'Property condition'
  | 'Payment & billing'
  | 'Booking conflict'
  | 'Safety & security'
  | 'Host conduct'
  | 'Guest conduct'
  | 'Damages'
  | 'Access & check-in'
  | 'Other';

export type IssueStatus = 'open' | 'assigned' | 'investigating' | 'escalated' | 'resolved' | 'closed';

export interface Issue {
  id: string;
  ref: string;
  bookingRef?: string;
  propertyTitle?: string;
  category: IssueCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  subject: string;
  description: string;
  reporter: string;
  reporterType: 'guest' | 'partner' | 'internal';
  status: IssueStatus;
  assignee?: string;
  createdAt: string;
  updatedAt: string;
  evidence: string[];
  resolution?: string;
  timeline: TimelineEvent[];
  arrivalIssueType?: ArrivalIssueType;
  wayfinderStepKey?: string;
}

export type ApplicationStatus = 'pending' | 'approved' | 'needs_correction' | 'rejected';

export interface PartnerApplication {
  id: string;
  applicantId?: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  areas: string[];
  propertiesCount: number;
  motivation: string;
  referredByCode?: string | null;
  referralCodeUsed?: string | null;
  referredByPartnerId?: string | null;
  referredByPartnerName?: string;
  submittedAt: string;
  status: ApplicationStatus;
  reviewNote?: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  actorRole: string;
  action: string;
  target: string;
  detail: string;
}

export interface PartnerAssignment {
  id: string;
  propertyId: string;
  propertyTitle: string;
  partnerId: string;
  partnerName: string;
  partnerRole: string;
  scope: string;
  commissionRate: number | null; // null = no commission agreed
  commissionNote: string;
  status: 'active' | 'revoked';
  grantedAt: string;
  revokedAt?: string;
}

export type NotificationEventType =
  | 'booking_request_created'
  | 'booking_availability_confirmed'
  | 'booking_availability_declined'
  | 'booking_payment_confirmed'
  | 'booking_cancelled'
  | 'booking_expired'
  | 'booking_refunded';

export type NotificationRecipientType = 'guest' | 'partner' | 'operations';

export type NotificationDeliveryStatus =
  | 'pending'
  | 'processing'
  | 'sent'
  | 'failed'
  | 'skipped';

export interface BookingNotificationRecord {
  id: string;
  bookingId: string;
  bookingRef: string;
  propertyId: string;
  eventType: NotificationEventType;
  recipientType: NotificationRecipientType;
  recipientEmail?: string;
  subject?: string;
  deliveryStatus: NotificationDeliveryStatus;
  provider: string;
  providerMessageId?: string;
  attemptCount: number;
  maxAttempts: number;
  lastError?: string;
  idempotencyKey: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminBootstrapEmail {
  email: string;
  note: string;
  addedBy?: string;
  createdAt: string;
}

// ─── HAMLET Wayfinder Domain Model ───────────────────────────────────────────

export type LocationAccuracy =
  | 'missing'
  | 'approximate_area'
  | 'street_level'
  | 'verified_entrance';

export type WayfinderStatus =
  | 'location_missing'
  | 'location_submitted'
  | 'awaiting_verification'
  | 'location_verified'
  | 'guide_incomplete'
  | 'guide_ready'
  | 'needs_correction'
  | 'disabled';

export type WayfinderPublicationStatus =
  | 'draft'
  | 'submitted'
  | 'needs_correction'
  | 'approved'
  | 'disabled';

export type CoordinatePointType =
  | 'property_entrance'
  | 'road_access'
  | 'estate_gate'
  | 'preferred_guest_entrance'
  | 'building_entrance'
  | 'dropoff_parking';

export type CoordinateSource =
  | 'manual_entry'
  | 'gps_on_site'
  | 'google_maps_pin'
  | 'staff_verified_survey';

export type CheckInMethod =
  | 'host_meet'
  | 'security_desk'
  | 'smart_lock'
  | 'lockbox'
  | 'concierge';

export type WayfinderWaypointType =
  | 'main_road_access'
  | 'estate_entrance'
  | 'preferred_guest_entrance'
  | 'building_entrance'
  | 'parking_dropoff'
  | 'other_waypoint';

export type WayfinderStepType =
  | 'navigate'
  | 'entrance'
  | 'security'
  | 'building'
  | 'floor_corridor'
  | 'apartment_door'
  | 'checkin';

export type WayfinderVerificationMethod =
  | 'staff_desk_review'
  | 'map_imagery_crosscheck'
  | 'partner_rep_confirmation'
  | 'physical_onsite_check'
  | 'documented_arrival_test';

export type ArrivalIssueType =
  | 'incorrect_map_pin'
  | 'cannot_find_entrance'
  | 'cannot_find_building'
  | 'cannot_find_apartment'
  | 'checkin_instructions_unclear'
  | 'access_method_not_working'
  | 'other_arrival_problem';

export type WayfinderEventType =
  | 'wayfinder_opened'
  | 'directions_clicked'
  | 'arrival_guide_viewed'
  | 'help_action_selected'
  | 'arrival_issue_reported'
  | 'guide_flagged_incomplete'
  | 'ease_of_arrival_feedback';

export interface WayfinderWaypoint {
  id: string;
  propertyId: string;
  pointType: WayfinderWaypointType;
  label: string;
  latitude: number;
  longitude: number;
  instructions: string;
  photoUrl?: string;
  sortOrder: number;
  verificationStatus: 'submitted' | 'verified' | 'needs_correction';
}

export interface WayfinderStep {
  id: string;
  propertyId: string;
  stepOrder: number;
  stepType: WayfinderStepType;
  heading: string;
  instruction: string;
  landmark?: string;
  accessRequirement?: string;
  photoUrl?: string;
  latitude?: number | null;
  longitude?: number | null;
  verificationStatus: 'submitted' | 'verified' | 'needs_correction';
}

export interface WayfinderSecrets {
  propertyId: string;
  gateAccessCode: string;
  buildingAccessCode: string;
  lockboxOrSmartlockCode: string;
  wifiNetworkName: string;
  wifiPassword: string;
  releaseHoursBeforeCheckIn: number;
  updatedAt?: string;
}

export interface WayfinderGuideSnapshot {
  publishedRevision: number;
  destinationLatitude: number | null;
  destinationLongitude: number | null;
  coordinatePointType: CoordinatePointType;
  coordinateSource: CoordinateSource;
  ambiguityNotes: string;
  guestIntroduction: string;
  estateOrBuildingName: string;
  preferredEntranceLabel: string;
  entranceInstructions: string;
  entrancePhotoUrl?: string;
  securityDeskInstructions: string;
  buildingOrBlock: string;
  buildingInstructions: string;
  buildingPhotoUrl?: string;
  floorLabel: string;
  apartmentIdentifier: string;
  liftOrStairsInstructions: string;
  routeToDoor: string;
  doorLandmarkPhotoUrl?: string;
  parkingOrDropoffInstructions: string;
  arrivalRestrictions: string;
  checkInMethod: CheckInMethod;
  checkInWindowLabel: string;
  checkInInstructions: string;
  arrivalContactName: string;
  arrivalContactRole: string;
  arrivalContactPhone: string;
  coordinatesChecked: boolean;
  writtenDirectionsChecked: boolean;
  photosChecked: boolean;
  physicallyVisited: boolean;
  guestArrivalTested: boolean;
  verifiedAt?: string;
  waypoints: WayfinderWaypoint[];
  steps: WayfinderStep[];
}

export interface WayfinderGuide extends WayfinderGuideSnapshot {
  id: string;
  propertyId: string;
  publicationStatus: WayfinderPublicationStatus;
  needsReverification: boolean;
  verificationMethod?: WayfinderVerificationMethod;
  verifiedBy?: string;
  reviewerNote?: string;
  pendingStatus?: 'draft' | 'submitted' | 'needs_correction' | null;
  pendingSubmission?: Partial<WayfinderSubmissionInput> | null;
  pendingSubmittedAt?: string;
  updatedAt: string;
}

export interface WayfinderSubmissionInput {
  city?: string;
  publicLandmarks: string[];
  publicLocationSummary: string;
  destinationLatitude: number | null;
  destinationLongitude: number | null;
  coordinatePointType: CoordinatePointType;
  coordinateSource: CoordinateSource;
  ambiguityNotes: string;
  guestIntroduction: string;
  estateOrBuildingName: string;
  preferredEntranceLabel: string;
  entranceInstructions: string;
  entrancePhotoUrl?: string;
  securityDeskInstructions: string;
  buildingOrBlock: string;
  buildingInstructions: string;
  buildingPhotoUrl?: string;
  floorLabel: string;
  apartmentIdentifier: string;
  liftOrStairsInstructions: string;
  routeToDoor: string;
  doorLandmarkPhotoUrl?: string;
  parkingOrDropoffInstructions: string;
  arrivalRestrictions: string;
  checkInMethod: CheckInMethod;
  checkInWindowLabel: string;
  checkInInstructions: string;
  arrivalContactName: string;
  arrivalContactRole: string;
  arrivalContactPhone: string;
  waypoints: Array<{
    pointType: WayfinderWaypointType;
    label: string;
    latitude: number;
    longitude: number;
    instructions: string;
    photoUrl?: string;
  }>;
  steps: Array<{
    stepType: WayfinderStepType;
    heading: string;
    instruction: string;
    landmark?: string;
    accessRequirement?: string;
    photoUrl?: string;
    latitude?: number | null;
    longitude?: number | null;
  }>;
  secrets?: {
    gateAccessCode: string;
    buildingAccessCode: string;
    lockboxOrSmartlockCode: string;
    wifiNetworkName: string;
    wifiPassword: string;
    releaseHoursBeforeCheckIn: number;
  };
}

export interface WayfinderReviewInput {
  decision: 'approve_guide' | 'approve_pin_only' | 'needs_correction' | 'disable';
  verificationMethod: WayfinderVerificationMethod;
  coordinatesChecked: boolean;
  writtenDirectionsChecked: boolean;
  photosChecked: boolean;
  physicallyVisited: boolean;
  guestArrivalTested: boolean;
  reviewerNote: string;
}

export interface WayfinderEventRecord {
  id: string;
  bookingId?: string;
  propertyId: string;
  actorId: string;
  eventType: WayfinderEventType;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface GuestBookingWayfinderView {
  bookingId: string;
  bookingReference: string;
  bookingStatus: BookingStatus;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  propertyId: string;
  propertyTitle: string;
  area: string;
  city: string;
  publicAddress: string;
  publicLandmarks: string[];
  wayfinderStatus: WayfinderStatus;
  guideAvailable: boolean;
  guide: WayfinderGuideSnapshot | null;
  confirmedSnapshot: WayfinderGuideSnapshot | null;
  newerRevisionAvailable: boolean;
  hasSensitiveCodes: boolean;
  codesUnlocked: boolean;
  codesUnlockAt: string | null;
  codesExpireAt: string | null;
  secrets: Omit<WayfinderSecrets, 'propertyId' | 'releaseHoursBeforeCheckIn' | 'updatedAt'> | null;
}

