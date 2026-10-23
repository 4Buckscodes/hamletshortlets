// ─── HAMLET domain model (Release 1 — Lagos pilot) ──────────────────────────

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
  accountStatus?: 'active' | 'suspended';
  suspensionReason?: string;
}

export type PropertyStatus =
  | 'approved'
  | 'submitted'
  | 'needs_correction'
  | 'rejected'
  | 'suspended';

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
  nightlyRate: number;
  cleaningFee: number; // treated as known mandatory charge
  mandatoryCharges: MandatoryCharge[];
  deposit: number; // refundable — never fee-bearing
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
  accommodationSubtotal: number;
  mandatoryCharges: MandatoryCharge[];
  mandatoryTotal: number;
  hamletGuestFee: number;
  guestTotal: number;
  deposit: number;
  // processing-fee policy deliberately undecided — see spec. Not charged, not displayed at checkout.
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
}

export type LedgerType =
  | 'guest_charge'
  | 'guest_service_fee'
  | 'accommodation_revenue'
  | 'mandatory_charges'
  | 'provider_charge'
  | 'partner_commission'
  | 'deposit_hold'
  | 'refund';

export type LedgerStatus = 'recorded' | 'reconciled' | 'settled' | 'pending' | 'flagged';

export interface LedgerEntry {
  id: string;
  at: string;
  bookingRef: string;
  propertyTitle?: string;
  type: LedgerType;
  description: string;
  amount: number; // ₦, always positive magnitude
  status: LedgerStatus;
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


