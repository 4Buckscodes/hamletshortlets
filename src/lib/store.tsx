/* eslint-disable react-refresh/only-export-components */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode,
} from 'react';
import type {
  Account, Session, Property, Booking, LedgerEntry, Issue, IssueStatus,
  PartnerApplication, PartnerAssignment, AuditEntry, AccountRole, TimelineEvent,
  BookingNotificationRecord, NotificationEventType, NotificationRecipientType,
  AdminBootstrapEmail, PropertyAvailabilityBlock, PublicCalendarSpan,
  PartnerReferral, PartnerReferralReward, CautionDepositRecord, CautionDepositStatus,
  ExchangeRateConfig, SupportedCurrency, PayoutStatus,
  AvailabilityConfirmationStatus, AvailabilityBlockType, ReferralRelationshipStatus,
} from './types';
import {
  seedAccounts, seedProperties, seedBookings, seedLedger, seedIssues,
  seedApplications, seedAssignments, seedAudit,
  seedPartnerReferrals, seedPartnerReferralRewards, seedCautionDeposits, seedExchangeRates,
} from './seed';
import {
  buildDefaultExchangeRates, calculateBookingCurrencyQuote, calculateGuestPricing,
  nightsBetween, formatNaira,
} from './pricing';
import {
  buildPartnerReferralCode, evaluateReferralOnBookingCompletion, normalizeReferralCode,
} from './referrals';
import { extractEdgeFunctionError, isSupabaseConfigured, supabase } from './supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

const PARTNER_REF_STORAGE_KEY = 'hamlet_partner_ref_code_v1';
const CLOSING_AGENT_STORAGE_KEY = 'hamlet_closing_agent_code_v1';

export function captureUrlAttributionParams(): void {
  try {
    if (typeof window === 'undefined') return;
    const sources = [window.location.search];
    const hashIdx = window.location.hash.indexOf('?');
    if (hashIdx >= 0) sources.push(window.location.hash.slice(hashIdx));
    for (const src of sources) {
      if (!src) continue;
      const params = new URLSearchParams(src);
      const refCode = normalizeReferralCode(params.get('ref'));
      if (refCode) window.localStorage.setItem(PARTNER_REF_STORAGE_KEY, refCode);
      const agentCode = normalizeReferralCode(params.get('agent'));
      if (agentCode) window.localStorage.setItem(CLOSING_AGENT_STORAGE_KEY, agentCode);
    }
  } catch {
    // Ignore storage access errors in restricted browsing contexts.
  }
}

export function getPersistedPartnerRefCode(): string {
  try {
    if (typeof window === 'undefined') return '';
    return normalizeReferralCode(window.localStorage.getItem(PARTNER_REF_STORAGE_KEY));
  } catch {
    return '';
  }
}

export function clearPersistedPartnerRefCode(): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(PARTNER_REF_STORAGE_KEY);
  } catch {
    // Ignore storage access errors.
  }
}

export function getPersistedClosingAgentCode(): string {
  try {
    if (typeof window === 'undefined') return '';
    return normalizeReferralCode(window.localStorage.getItem(CLOSING_AGENT_STORAGE_KEY));
  } catch {
    return '';
  }
}

export interface FeedbackItem {
  id: string; at: string; bookingRef: string; propertyTitle?: string; guestName: string;
  rating: number; text: string; category: string;
}

export interface ClosedAgentBookingSummary {
  bookingId: string;
  bookingRef: string;
  propertyId: string;
  propertyTitle: string;
  area?: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  status: Booking['status'];
  ownerListedPriceNgn: number;
  closingAgentCommissionNgn: number;
  createdAt: string;
}

export interface DBState {
  accounts: Account[];
  properties: Property[];
  publicCalendarSpans: PublicCalendarSpan[];
  bookings: Booking[];
  closedAgentBookings?: ClosedAgentBookingSummary[];
  ledger: LedgerEntry[];
  issues: Issue[];
  applications: PartnerApplication[];
  assignments: PartnerAssignment[];
  partnerReferrals: PartnerReferral[];
  partnerReferralRewards: PartnerReferralReward[];
  cautionDeposits: CautionDepositRecord[];
  exchangeRates: ExchangeRateConfig[];
  audit: AuditEntry[];
  feedback: FeedbackItem[];
  notifications: BookingNotificationRecord[];
  adminBootstrapEmails: AdminBootstrapEmail[];
  session: Session | null;
}

const emptyState = (): DBState => ({
  accounts: [], properties: [], publicCalendarSpans: [], bookings: [], closedAgentBookings: [], ledger: [], issues: [],
  applications: [], assignments: [], partnerReferrals: [], partnerReferralRewards: [],
  cautionDeposits: [], exchangeRates: buildDefaultExchangeRates(),
  audit: [], feedback: [], notifications: [],
  adminBootstrapEmails: [], session: null,
});

const DB_KEY = 'hamlet-db-v2';
const SESSION_KEY = 'hamlet-session-v1';

function initialState(): DBState {
  if (isSupabaseConfigured) return emptyState();
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Omit<DBState, 'session'>> & { accounts: Account[] };
      const sessionRaw = localStorage.getItem(SESSION_KEY);
      return {
        ...emptyState(),
        ...parsed,
        publicCalendarSpans: parsed.publicCalendarSpans ?? [],
        partnerReferrals: parsed.partnerReferrals ?? seedPartnerReferrals,
        partnerReferralRewards: parsed.partnerReferralRewards ?? seedPartnerReferralRewards,
        cautionDeposits: parsed.cautionDeposits ?? seedCautionDeposits,
        exchangeRates: parsed.exchangeRates ?? seedExchangeRates,
        notifications: parsed.notifications ?? [],
        adminBootstrapEmails: parsed.adminBootstrapEmails ?? [],
        accounts: parsed.accounts.map(a => ({ ...a, password: 'demo1234' })),
        session: sessionRaw ? JSON.parse(sessionRaw) : null,
      };
    }
  } catch { /* fall through to seed */ }
  return {
    accounts: seedAccounts, properties: seedProperties, publicCalendarSpans: [],
    bookings: seedBookings, ledger: seedLedger, issues: seedIssues,
    applications: seedApplications, assignments: seedAssignments,
    partnerReferrals: seedPartnerReferrals,
    partnerReferralRewards: seedPartnerReferralRewards,
    cautionDeposits: seedCautionDeposits,
    exchangeRates: seedExchangeRates,
    audit: seedAudit, feedback: [], notifications: [],
    adminBootstrapEmails: [{ email: 'admin@hamlet.ng', note: 'Pilot demo administrator', createdAt: new Date().toISOString() }],
    session: null,
  };
}

// ─── Actions ─────────────────────────────────────────────────────────────────
type Action =
  | { type: 'HYDRATE'; state: DBState }
  | { type: 'SIGN_IN'; session: Session }
  | { type: 'SIGN_OUT' }
  | { type: 'UPDATE_PROFILE'; name: string; phone?: string; company?: string }
  | { type: 'REGISTER_GUEST'; account: Account; session: Session }
  | { type: 'REGISTER_PARTNER'; account: Account; application: PartnerApplication; referral?: PartnerReferral }
  | { type: 'RESUBMIT_PARTNER_APPLICATION'; id: string; patch: Pick<PartnerApplication, 'name' | 'phone' | 'company' | 'role' | 'areas' | 'propertiesCount' | 'motivation' | 'referredByCode'>; actor: Session }
  | { type: 'ADD_PROPERTY'; property: Property }
  | { type: 'UPDATE_AND_RESUBMIT_PROPERTY'; id: string; patch: Omit<Property, 'id' | 'status' | 'verification' | 'trustLabel' | 'assignedPartnerIds' | 'createdAt' | 'ownerId' | 'ownerName' | 'submittedBy'>; actor: Session; note?: string; saveAsDraft?: boolean }
  | { type: 'PROPERTY_REVIEW'; id: string; status: Property['status']; note?: string; verification?: Property['verification']; actor: Session }
  | { type: 'UPDATE_PROPERTY_AVAILABILITY'; id: string; firstAvailableDate?: string | null; availabilityConfirmationStatus: 'confirmed' | 'needs_confirmation'; calendarResponsiblePerson?: string; actor: Session }
  | { type: 'ADD_AVAILABILITY_BLOCK'; propertyId: string; block: PropertyAvailabilityBlock; actor: Session }
  | { type: 'REMOVE_AVAILABILITY_BLOCK'; propertyId: string; blockId: string; actor: Session }
  | { type: 'SET_PROPERTY_PAUSE'; propertyId: string; paused: boolean; note?: string; actor: Session }
  | { type: 'SET_PARTNER_STATUS'; partnerId: string; status: 'active' | 'suspended'; reason: string; cascadeSuspend: boolean; actor: Session }
  | { type: 'SET_GUEST_STATUS'; guestId: string; status: 'active' | 'suspended'; reason: string; actor: Session }
  | { type: 'AUTHORIZE_ADMIN_EMAIL'; email: string; note: string; actor: Session }
  | { type: 'ADD_BOOKING'; booking: Booking; cautionDeposit?: CautionDepositRecord }
  | { type: 'REFRESH_BOOKING_QUOTE'; bookingId: string; patch: Partial<Booking> }
  | { type: 'BOOKING_TRANSITION'; id: string; to: Booking['status']; actor: Session; note?: string; reason?: string }
  | { type: 'VERIFY_PAYMENT'; id: string; actor: Session; providerRef: string; provider: string }
  | { type: 'RECORD_REFUND'; id: string; actor: Session; amount: number; providerRef?: string; note: string }
  | { type: 'TRANSITION_CAUTION_DEPOSIT'; bookingId: string; status: CautionDepositStatus; deductedAmountNgn?: number; refundedAmountNgn?: number; inspectionNotes?: string; deductionReason?: string; refundReference?: string; evidence?: string[]; actor: Session }
  | { type: 'UPDATE_EXCHANGE_RATE'; config: ExchangeRateConfig; actor: Session }
  | { type: 'RESOLVE_REFERRAL_DISPUTE'; referralId: string; status: PartnerReferral['status']; note: string; overrideWindowDays?: number; actor: Session }
  | { type: 'UPDATE_PAYOUT_STATUS'; entryId: string; payoutStatus: PayoutStatus; note?: string; actor: Session }
  | { type: 'ADD_LEDGER'; entries: LedgerEntry[] }
  | { type: 'RECONCILE_LEDGER'; id: string; actor: Session; status: LedgerEntry['status']; variance: number; note?: string }
  | { type: 'ADD_ISSUE'; issue: Issue }
  | { type: 'APPEND_ISSUE_EVIDENCE'; id: string; evidenceNote: string; actor: Session }
  | { type: 'ISSUE_UPDATE'; id: string; status: IssueStatus; actor: Session; note?: string; assignee?: string; resolution?: string }
  | { type: 'REVIEW_APPLICATION'; id: string; status: PartnerApplication['status']; actor: Session; note?: string }
  | { type: 'CREATE_PARTNER_FROM_APPLICATION'; applicationId: string; actor: Session }
  | { type: 'ADD_ASSIGNMENT'; assignment: PartnerAssignment; actorName: string; actorRole: string }
  | { type: 'REVOKE_ASSIGNMENT'; id: string; actor: Session }
  | { type: 'ADD_FEEDBACK'; item: FeedbackItem }
  | { type: 'AUDIT'; actor: Session | { name: string; role: string }; action: string; target: string; detail: string }
  | { type: 'RESET' };

const nowIso = () => new Date().toISOString();
const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random()}`);

type RemoteProperty = {
  id: string; title: string; property_type: string; area: string; public_address: string;
  nightly_rate: number; cleaning_fee: number; mandatory_charges: Property['mandatoryCharges'];
  refundable_deposit: number; bedrooms: number; bathrooms: number; capacity: number;
  bed_setup: string; amenities: string[]; image_urls: string[]; house_rules: string[];
  status: Property['status']; verification: Property['verification']; trust_label: string;
  review_note?: string; first_available_date?: string | null;
  availability_confirmation_status?: 'confirmed' | 'needs_confirmation';
  calendar_responsible_person?: string | null;
  calendar_responsible_user_id?: string | null;
  last_availability_update?: string | null;
  property_introducer_id?: string | null;
  authorised_manager_id?: string | null;
  created_at: string; updated_at: string;
};

type RemoteAvailabilityBlock = {
  id: string; property_id: string; start_date: string; end_date: string;
  block_type: PropertyAvailabilityBlock['blockType'];
  source: PropertyAvailabilityBlock['source'];
  note?: string | null; created_by?: string | null; created_at: string;
};

type RemotePublicSpan = {
  property_id: string; start_date: string; end_date: string;
  kind: PublicCalendarSpan['kind'];
};

type RemotePropertySubmission = {
  authority_basis?: string;
  submitted_role?: string;
  docs?: Property['docs'];
};

type RemoteBooking = {
  id: string; reference: string; property_id: string; guest_id: string; check_in: string; check_out: string;
  guest_count: number; accommodation_subtotal: number; mandatory_charges: Property['mandatoryCharges'];
  mandatory_total: number; hamlet_guest_fee: number; guest_total: number; refundable_deposit: number;
  property_introducer_id?: string | null; authorised_manager_id?: string | null;
  closing_agent_id?: string | null; direct_referrer_id?: string | null; guest_referral_source?: string | null;
  pricing_rules_version?: string; owner_listed_price_ngn?: number;
  domestic_markup_rate?: number; domestic_markup_ngn?: number; domestic_guest_price_ngn?: number;
  closing_agent_commission_ngn?: number; direct_referrer_reward_ngn?: number;
  hamlet_allocation_ngn?: number; payment_reserve_ngn?: number; actual_payment_fee_ngn?: number;
  quote_currency?: SupportedCurrency; currency_pair?: Booking['currencyPair'];
  exchange_rate_ngn_per_unit?: number; exchange_rate_source?: string; exchange_rate_timestamp?: string;
  international_buffer_rate?: number; converted_base_amount?: number; international_buffer_amount?: number;
  international_buffer_ngn_equiv?: number; quoted_guest_total?: number; settlement_total_ngn?: number;
  quote_expires_at?: string | null;
  status: Booking['status']; special_requests?: string; payment_deadline?: string;
  payment_provider?: string; payment_reference?: string; refund_status: Booking['refundStatus'];
  refund_amount?: number; cancel_reason?: string; created_at: string; timeline: TimelineEvent[];
};

type RemoteApplication = {
  id: string; applicant_id: string; full_name: string; email: string; phone: string; company: string; role: string;
  areas: string[]; properties_count: number; motivation: string; status: PartnerApplication['status'];
  referred_by_code?: string | null; referred_by_partner_id?: string | null;
  review_note?: string; submitted_at: string;
};

type RemotePartnerReferral = {
  id: string; referrer_partner_id: string; referred_partner_id: string; referral_code: string;
  status: PartnerReferral['status']; earning_window_days: number;
  registered_at: string; verified_at?: string | null; activated_at?: string | null;
  activating_booking_id?: string | null; eligibility_starts_at?: string | null;
  eligibility_ends_at?: string | null; dispute_note?: string | null; resolved_by?: string | null;
};

type RemotePartnerReferralReward = {
  id: string; referral_id: string; referrer_partner_id: string; referred_closing_agent_id: string;
  booking_id: string; booking_reference: string; owner_listed_price_ngn: number;
  reward_rate: number; reward_amount_ngn: number; payout_status: PartnerReferralReward['payoutStatus'];
  reversal_reason?: string | null; created_at: string;
};

type RemoteCautionDeposit = {
  id: string; booking_id: string; property_id: string; guest_id: string; amount_ngn: number;
  status: CautionDepositStatus; deducted_amount_ngn: number; refunded_amount_ngn: number;
  collection_reference?: string | null; refund_reference?: string | null;
  inspection_notes?: string | null; deduction_reason?: string | null; evidence: string[];
  decision_by?: string | null; decision_at?: string | null; created_at: string; updated_at: string;
};

type RemoteExchangeRate = {
  currency: 'USD' | 'GBP'; currency_pair: 'NGN/USD' | 'NGN/GBP';
  ngn_per_unit: number; buffer_rate: number; source: string;
  effective_at: string; expires_at?: string | null; is_active: boolean;
  updated_by?: string | null; updated_at: string;
};

type RemoteFeedback = {
  id: string; booking_id: string; guest_id: string; rating: number;
  category: string; feedback_text: string; created_at: string;
};

type RemoteIssue = {
  id: string; reference: string; booking_id: string; reporter_id: string;
  reporter_type?: Issue['reporterType']; category: Issue['category'];
  severity: Issue['severity']; subject: string; description: string; status: IssueStatus;
  assignee_id?: string; assignee_name?: string; resolution?: string; evidence: string[];
  timeline?: TimelineEvent[]; created_at: string; updated_at: string;
};

type RemoteAdminDirectoryRow = {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: AccountRole;
  partner_role: string;
  company: string;
  account_status: 'active' | 'suspended';
  suspension_reason: string;
  created_at: string;
};

type RemoteAdminBootstrapEmailRow = {
  email: string;
  note: string;
  added_by?: string | null;
  created_at: string;
};

type RemoteLedgerRow = {
  id: string; booking_id: string; record_type: LedgerEntry['type']; amount: number;
  provider_reference?: string; status: LedgerEntry['status']; description: string;
  variance: number; note?: string; operator_name: string;
  beneficiary_user_id?: string | null; payout_status?: PayoutStatus;
  created_at: string;
};

type RemoteProfile = {
  id: string; full_name: string; role: AccountRole; phone?: string;
  company?: string; partner_role?: string; account_status?: 'active' | 'suspended';
  suspension_reason?: string; referral_code?: string | null;
  referred_by_partner_id?: string | null; referred_by_code?: string | null;
  created_at: string;
};

type RemoteAuditEntry = {
  id: string; actor_id: string; actor_role: string; action: string; target: string; detail: string; created_at: string;
};

type RemoteBookingNotificationRow = {
  id: string;
  booking_id: string;
  booking_reference: string;
  property_id: string;
  event_type: NotificationEventType;
  recipient_type: NotificationRecipientType;
  recipient_email?: string | null;
  subject?: string | null;
  delivery_status: BookingNotificationRecord['deliveryStatus'];
  provider: string;
  provider_message_id?: string | null;
  attempt_count: number;
  max_attempts: number;
  last_error?: string | null;
  idempotency_key: string;
  sent_at?: string | null;
  created_at: string;
  updated_at: string;
};

async function invokeBookingNotificationsEdgeFunction(
  bookingId: string,
  opts?: { forceRetry?: boolean },
): Promise<{ ok: boolean; sent: number; failed: number; error?: string }> {
  if (!supabase) {
    return {
      ok: false,
      sent: 0,
      failed: 0,
      error: 'Supabase is not configured in local demo mode.',
    };
  }
  try {
    const { data, error } = await supabase.functions.invoke('booking-notifications', {
      body: {
        bookingId,
        ...(opts?.forceRetry ? { forceRetry: true } : {}),
      },
    });
    if (error) {
      const detailedError = await extractEdgeFunctionError(
        error,
        'Notification dispatch request failed.',
      );
      return { ok: false, sent: 0, failed: 0, error: detailedError };
    }
    const payload = (data ?? {}) as {
      ok?: boolean;
      sent?: number;
      failed?: number;
      error?: string;
    };
    return {
      ok: Boolean(payload.ok),
      sent: typeof payload.sent === 'number' ? payload.sent : 0,
      failed: typeof payload.failed === 'number' ? payload.failed : 0,
      error: payload.error,
    };
  } catch (err) {
    return {
      ok: false,
      sent: 0,
      failed: 0,
      error: err instanceof Error ? err.message : 'Notification dispatch request failed.',
    };
  }
}

function toRemoteProperty(
  row: RemoteProperty,
  userId: string,
  accesses: { property_id: string; user_id: string; access_role?: string }[],
  submission?: RemotePropertySubmission,
  profileById?: Map<string, RemoteProfile>,
  blocksByPropertyId?: Map<string, PropertyAvailabilityBlock[]>,
): Property {
  const propertyAccess = accesses.filter(access => access.property_id === row.id);
  const submitterAccess = propertyAccess.find(access => access.access_role === 'submitter') ?? propertyAccess[0];
  const submitterProfile = submitterAccess ? profileById?.get(submitterAccess.user_id) : undefined;
  const resolvedPartnerName = submitterProfile?.full_name || 'HAMLET partner';
  return {
    id: row.id,
    title: row.title,
    type: row.property_type,
    area: row.area,
    address: row.public_address,
    nightlyRate: row.nightly_rate,
    cleaningFee: row.cleaning_fee,
    mandatoryCharges: row.mandatory_charges ?? [],
    deposit: row.refundable_deposit,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    capacity: row.capacity,
    bedSetup: row.bed_setup,
    amenities: row.amenities ?? [],
    images: row.image_urls ?? [],
    houseRules: row.house_rules ?? [],
    status: row.status,
    verification: row.verification ?? { ownership: 'pending_review', identity: 'pending_review', authority: 'pending_review', inspection: 'missing' },
    trustLabel: row.trust_label,
    ownerName: resolvedPartnerName,
    ownerId: propertyAccess.find(access => access.user_id === userId)?.user_id ?? submitterAccess?.user_id ?? '',
    submittedBy: resolvedPartnerName,
    submittedRole: submission?.submitted_role ?? 'Property partner',
    authorityBasis: submission?.authority_basis ?? 'Verification details are recorded on this listing.',
    docs: submission?.docs ?? [],
    assignedPartnerIds: propertyAccess.map(access => access.user_id),
    reviewNote: row.review_note ?? undefined,
    firstAvailableDate: row.first_available_date ?? null,
    availabilityConfirmationStatus: row.availability_confirmation_status ?? 'confirmed',
    calendarResponsiblePerson: row.calendar_responsible_person ?? resolvedPartnerName,
    calendarResponsibleUserId: row.calendar_responsible_user_id ?? undefined,
    lastAvailabilityUpdate: row.last_availability_update ?? row.updated_at,
    unavailableBlocks: blocksByPropertyId?.get(row.id) ?? [],
    propertyIntroducerId: row.property_introducer_id ?? undefined,
    authorisedManagerId: row.authorised_manager_id ?? undefined,
    createdAt: row.created_at,
  };
}

function toRemoteBooking(
  row: RemoteBooking,
  property: Property | undefined,
  session: Session,
  profileById?: Map<string, RemoteProfile>,
  adminDirectoryById?: Map<string, RemoteAdminDirectoryRow>,
): Booking {
  const guestProfile = profileById?.get(row.guest_id);
  const adminDirGuest = adminDirectoryById?.get(row.guest_id);
  const closingAgentProfile = row.closing_agent_id ? profileById?.get(row.closing_agent_id) : undefined;
  const closingAgentDir = row.closing_agent_id ? adminDirectoryById?.get(row.closing_agent_id) : undefined;
  const referrerProfile = row.direct_referrer_id ? profileById?.get(row.direct_referrer_id) : undefined;
  const referrerDir = row.direct_referrer_id ? adminDirectoryById?.get(row.direct_referrer_id) : undefined;
  const quoteCurr = row.quote_currency ?? 'NGN';
  const fxRateVal = row.exchange_rate_ngn_per_unit !== undefined ? Number(row.exchange_rate_ngn_per_unit) : 1;
  const convBaseVal = row.converted_base_amount !== undefined ? Number(row.converted_base_amount) : row.guest_total;
  const intlBufVal = row.international_buffer_amount !== undefined ? Number(row.international_buffer_amount) : 0;
  const quotedTotalVal = row.quoted_guest_total !== undefined ? Number(row.quoted_guest_total) : row.guest_total;
  const isForeign = quoteCurr === 'USD' || quoteCurr === 'GBP';
  return {
    id: row.id,
    ref: row.reference,
    propertyId: row.property_id,
    propertyTitle: property?.title ?? 'Stay',
    area: property?.area ?? '',
    guestId: row.guest_id,
    guestName: row.guest_id === session.userId ? session.name : (guestProfile?.full_name || adminDirGuest?.full_name || 'Guest'),
    guestEmail: row.guest_id === session.userId ? session.email : (adminDirGuest?.email ?? ''),
    checkIn: row.check_in,
    checkOut: row.check_out,
    nights: nightsBetween(row.check_in, row.check_out),
    guests: row.guest_count,
    accommodationSubtotal: row.accommodation_subtotal,
    ownerListedPriceNgn: row.owner_listed_price_ngn ?? row.accommodation_subtotal,
    domesticMarkupRate: row.domestic_markup_rate !== undefined ? Number(row.domestic_markup_rate) : 0.2,
    domesticMarkupNgn: row.domestic_markup_ngn ?? row.hamlet_guest_fee,
    domesticGuestPriceNgn: row.domestic_guest_price_ngn ?? row.accommodation_subtotal + row.hamlet_guest_fee,
    mandatoryCharges: row.mandatory_charges ?? [],
    mandatoryTotal: row.mandatory_total,
    hamletGuestFee: row.hamlet_guest_fee,
    guestTotal: row.guest_total,
    deposit: row.refundable_deposit,
    propertyIntroducerId: row.property_introducer_id ?? null,
    propertyManagerId: row.authorised_manager_id ?? null,
    authorisedManagerId: row.authorised_manager_id ?? null,
    closingAgentId: row.closing_agent_id ?? null,
    closingAgentName: closingAgentProfile?.full_name || closingAgentDir?.full_name || undefined,
    directReferrerId: row.direct_referrer_id ?? null,
    directReferrerName: referrerProfile?.full_name || referrerDir?.full_name || undefined,
    guestReferralSource: row.guest_referral_source ?? null,
    closingAgentCommissionNgn: row.closing_agent_commission_ngn ?? 0,
    directReferrerRewardNgn: row.direct_referrer_reward_ngn ?? 0,
    hamletAllocationNgn: row.hamlet_allocation_ngn ?? 0,
    paymentReserveNgn: row.payment_reserve_ngn ?? 0,
    actualPaymentFeeNgn: row.actual_payment_fee_ngn ?? 0,
    quoteCurrency: quoteCurr,
    currencyPair: row.currency_pair ?? 'NGN/NGN',
    fxRatePair: isForeign ? (row.currency_pair ?? `NGN/${quoteCurr}`) : undefined,
    exchangeRateNgnPerUnit: fxRateVal,
    fxRate: isForeign ? fxRateVal : undefined,
    exchangeRateSource: row.exchange_rate_source ?? 'domestic_ngn',
    fxRateSource: isForeign ? (row.exchange_rate_source ?? 'HAMLET Treasury Reference Rate') : undefined,
    exchangeRateTimestamp: row.exchange_rate_timestamp ?? row.created_at,
    fxQuotedAt: isForeign ? (row.exchange_rate_timestamp ?? row.created_at) : undefined,
    internationalBufferRate: row.international_buffer_rate !== undefined ? Number(row.international_buffer_rate) : 0,
    convertedBaseAmount: convBaseVal,
    internationalConvertedBaseMinor: isForeign ? Math.round(convBaseVal * 100) : undefined,
    internationalBufferAmount: intlBufVal,
    internationalBufferMinor: isForeign ? Math.round(intlBufVal * 100) : undefined,
    internationalBufferNgnEquiv: row.international_buffer_ngn_equiv ?? 0,
    quotedGuestTotal: quotedTotalVal,
    quotedStayTotalMinor: isForeign ? Math.round(quotedTotalVal * 100) : row.guest_total,
    settlementTotalNgn: row.settlement_total_ngn ?? row.guest_total,
    quoteExpiresAt: row.quote_expires_at ?? null,
    pricingRulesVersion: row.pricing_rules_version ?? undefined,
    status: row.status,
    requestedAt: row.created_at,
    paymentDeadline: row.payment_deadline,
    paymentProvider: row.payment_provider,
    paymentRef: row.payment_reference,
    specialRequests: row.special_requests,
    cancelReason: row.cancel_reason,
    refundStatus: row.refund_status,
    refundAmount: row.refund_amount,
    timeline: row.timeline ?? [],
  };
}

function mapRemoteExchangeRates(rows: RemoteExchangeRate[]): ExchangeRateConfig[] {
  if (!rows || rows.length === 0) return buildDefaultExchangeRates();
  return rows.map(r => ({
    currency: r.currency,
    currencyPair: r.currency_pair,
    ngnPerUnit: Number(r.ngn_per_unit),
    bufferRate: Number(r.buffer_rate),
    source: r.source,
    effectiveAt: r.effective_at,
    expiresAt: r.expires_at ?? null,
    isActive: Boolean(r.is_active),
    updatedBy: r.updated_by ?? undefined,
    updatedAt: r.updated_at,
  }));
}

async function loadSupabaseState(user: SupabaseUser | null): Promise<DBState> {
  if (!supabase) return emptyState();
  const safeQuery = async <T,>(promise: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> => {
    try {
      const res = await promise;
      if (res.error || !res.data) return [];
      return Array.isArray(res.data) ? (res.data as T[]) : [];
    } catch {
      return [];
    }
  };

  if (!user) {
    const [{ data, error }, publicSpansRaw, fxRatesRaw] = await Promise.all([
      supabase.from('properties').select('*').eq('status', 'approved').order('created_at', { ascending: false }),
      safeQuery<RemotePublicSpan>(supabase.rpc('get_public_property_calendar', { target_property_ids: null })),
      safeQuery<RemoteExchangeRate>(supabase.from('currency_exchange_rates').select('*')),
    ]);
    if (error) throw new Error(`Could not load approved stays: ${error.message}`);
    const publicCalendarSpans: PublicCalendarSpan[] = publicSpansRaw.map(s => ({
      propertyId: s.property_id,
      startDate: s.start_date,
      endDate: s.end_date,
      kind: s.kind,
    }));
    return {
      ...emptyState(),
      properties: ((data ?? []) as unknown as RemoteProperty[]).map(row => toRemoteProperty(row, '', [])),
      publicCalendarSpans,
      exchangeRates: mapRemoteExchangeRates(fxRatesRaw),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (profileError) throw new Error(`Could not load your profile: ${profileError.message}`);

  const session: Session = {
    userId: user.id,
    role: profile.role as AccountRole,
    name: profile.full_name || user.user_metadata.full_name || user.email || 'HAMLET user',
    email: user.email ?? '',
    phone: (profile.phone as string | undefined) || (user.user_metadata.phone as string | undefined) || undefined,
    partnerRole: profile.partner_role ?? undefined,
    company: profile.company ?? undefined,
    referralCode: (profile.referral_code as string | undefined) ?? undefined,
    accountStatus: (profile.account_status as 'active' | 'suspended' | undefined) ?? 'active',
    suspensionReason: (profile.suspension_reason as string | undefined) ?? undefined,
  };

  const { error: expiryError } = await supabase.rpc('expire_overdue_bookings');
  if (expiryError) throw new Error(`Could not process expired booking deadlines: ${expiryError.message}`);

  const [
    profilesResult,
    propertyResult,
    accessResult,
    privateRecordResult,
    bookingResult,
    ledgerResult,
    applicationResult,
    issueResult,
    feedbackResult,
    auditResult,
    notificationResult,
    adminDirectoryResult,
    adminBootstrapResult,
    publicSpansRaw,
    blocksRaw,
    referralsRaw,
    referralRewardsRaw,
    cautionDepositsRaw,
    fxRatesRaw,
  ] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('properties').select('*').order('created_at', { ascending: false }),
    supabase.from('property_access').select('property_id,user_id,access_role,scope,commission_rate,commission_note,status,granted_at,revoked_at'),
    supabase.from('property_private_records').select('property_id,record_type,record_data').eq('record_type', 'partner_submission'),
    supabase.from('bookings').select('*').order('created_at', { ascending: false }),
    supabase.from('booking_payment_records').select('*').order('created_at', { ascending: false }),
    supabase.from('partner_applications').select('*').order('submitted_at', { ascending: false }),
    supabase.from('booking_issues').select('*').order('created_at', { ascending: false }),
    supabase.from('booking_feedback').select('*').order('created_at', { ascending: false }),
    supabase.from('admin_audit_log').select('*').order('created_at', { ascending: false }).limit(100),
    session.role === 'admin'
      ? supabase.from('booking_notifications').select('*').order('created_at', { ascending: false }).limit(250)
      : Promise.resolve({ data: [], error: null }),
    session.role === 'admin'
      ? supabase.rpc('get_admin_directory')
      : Promise.resolve({ data: [], error: null }),
    session.role === 'admin'
      ? supabase.from('admin_bootstrap_emails').select('*').order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    safeQuery<RemotePublicSpan>(supabase.rpc('get_public_property_calendar', { target_property_ids: null })),
    safeQuery<RemoteAvailabilityBlock>(supabase.from('property_availability_blocks').select('*').order('start_date', { ascending: true })),
    safeQuery<RemotePartnerReferral>(supabase.from('partner_referrals').select('*').order('created_at', { ascending: false })),
    safeQuery<RemotePartnerReferralReward>(supabase.from('partner_referral_rewards').select('*').order('created_at', { ascending: false })),
    safeQuery<RemoteCautionDeposit>(supabase.from('booking_caution_deposits').select('*').order('created_at', { ascending: false })),
    safeQuery<RemoteExchangeRate>(supabase.from('currency_exchange_rates').select('*')),
  ]);

  for (const result of [
    profilesResult,
    propertyResult,
    accessResult,
    privateRecordResult,
    bookingResult,
    ledgerResult,
    applicationResult,
    issueResult,
    feedbackResult,
    auditResult,
    notificationResult,
    adminDirectoryResult,
    adminBootstrapResult,
  ]) {
    if (result.error) throw new Error(`Could not load HAMLET data: ${result.error.message}`);
  }

  const profileRows = (profilesResult.data ?? []) as unknown as RemoteProfile[];
  const profileById = new Map(profileRows.map(item => [item.id, item]));
  const adminDirectoryRows = (adminDirectoryResult.data ?? []) as unknown as RemoteAdminDirectoryRow[];
  const adminDirectoryById = new Map(adminDirectoryRows.map(item => [item.id, item]));
  const propertyRows = (propertyResult.data ?? []) as unknown as RemoteProperty[];
  const accesses = (accessResult.data ?? []) as unknown as Array<{
    property_id: string; user_id: string; access_role: string; scope: string;
    commission_rate: number | null; commission_note: string; status: 'active' | 'revoked';
    granted_at: string; revoked_at?: string;
  }>;
  const blocksByPropertyId = new Map<string, PropertyAvailabilityBlock[]>();
  for (const b of blocksRaw) {
    const mapped: PropertyAvailabilityBlock = {
      id: b.id,
      propertyId: b.property_id,
      startDate: b.start_date,
      endDate: b.end_date,
      blockType: b.block_type,
      source: b.source,
      note: b.note ?? undefined,
      createdBy: b.created_by ?? undefined,
      createdAt: b.created_at,
    };
    const arr = blocksByPropertyId.get(b.property_id) ?? [];
    arr.push(mapped);
    blocksByPropertyId.set(b.property_id, arr);
  }
  const submissions = new Map(
    (privateRecordResult.data ?? []).map(record => [
      record.property_id,
      record.record_data as RemotePropertySubmission,
    ]),
  );
  const properties = propertyRows.map(row =>
    toRemoteProperty(row, user.id, accesses, submissions.get(row.id), profileById, blocksByPropertyId),
  );
  const propertyById = new Map(properties.map(property => [property.id, property]));
  const bookings = ((bookingResult.data ?? []) as unknown as RemoteBooking[])
    .map(row => toRemoteBooking(row, propertyById.get(row.property_id), session, profileById, adminDirectoryById));
  const applications = ((applicationResult.data ?? []) as unknown as RemoteApplication[]).map(application => ({
    id: application.id,
    applicantId: application.applicant_id,
    name: application.full_name,
    email: application.email,
    phone: application.phone,
    company: application.company,
    role: application.role,
    areas: application.areas,
    propertiesCount: application.properties_count,
    motivation: application.motivation,
    referredByCode: application.referred_by_code ?? null,
    referredByPartnerId: application.referred_by_partner_id ?? null,
    submittedAt: application.submitted_at,
    status: application.status,
    reviewNote: application.review_note,
  }));
  // Safe partner attribution summary for referred partner names & closing-agent bookings (no guest PII)
  let partnerSummary: {
    referred_partners?: Array<{ referral_id: string; referred_partner_id: string; referred_name: string; referred_company?: string | null }>;
    referred_rewards?: Array<{ reward_id: string; referred_agent_name: string }>;
    closed_bookings?: Array<{
      booking_id: string;
      booking_reference: string;
      property_id: string;
      property_title: string;
      area?: string;
      check_in: string;
      check_out: string;
      nights: number;
      status: Booking['status'];
      owner_listed_price_ngn: number;
      closing_agent_commission_ngn: number;
      created_at: string;
    }>;
  } = {};
  if (session.role === 'partner') {
    try {
      const { data: summaryData } = await supabase.rpc('get_my_partner_attribution_summary');
      if (summaryData && typeof summaryData === 'object') {
        partnerSummary = summaryData as typeof partnerSummary;
      }
    } catch {
      // Gracefully fall back if migration is not yet applied
    }
  }
  const referredNameByReferralId = new Map(
    (partnerSummary.referred_partners ?? []).map(item => [item.referral_id, item]),
  );
  const rewardAgentNameById = new Map(
    (partnerSummary.referred_rewards ?? []).map(item => [item.reward_id, item.referred_agent_name]),
  );
  const closedAgentBookings: ClosedAgentBookingSummary[] = (partnerSummary.closed_bookings ?? []).map(cb => ({
    bookingId: cb.booking_id,
    bookingRef: cb.booking_reference,
    propertyId: cb.property_id,
    propertyTitle: cb.property_title,
    area: cb.area ?? '',
    checkIn: cb.check_in,
    checkOut: cb.check_out,
    nights: cb.nights,
    status: cb.status,
    ownerListedPriceNgn: cb.owner_listed_price_ngn,
    closingAgentCommissionNgn: cb.closing_agent_commission_ngn,
    createdAt: cb.created_at,
  }));
  const closedBookingById = new Map(closedAgentBookings.map(cb => [cb.bookingId, cb]));

  const bookingById = new Map(bookings.map(booking => [booking.id, booking]));
  const ledger: LedgerEntry[] = ((ledgerResult.data ?? []) as unknown as RemoteLedgerRow[]).map(row => {
    const booking = bookingById.get(row.booking_id);
    const closedBooking = closedBookingById.get(row.booking_id);
    return {
      id: row.id,
      at: row.created_at,
      bookingRef: booking?.ref ?? closedBooking?.bookingRef ?? row.booking_id,
      propertyTitle: booking?.propertyTitle ?? closedBooking?.propertyTitle,
      type: row.record_type,
      description: row.description || row.record_type.replace(/_/g, ' '),
      amount: row.amount,
      status: row.status,
      providerRef: row.provider_reference ?? undefined,
      operator: row.operator_name || 'System',
      variance: row.variance ?? 0,
      note: row.note ?? undefined,
      beneficiaryUserId: row.beneficiary_user_id ?? undefined,
      payoutStatus: row.payout_status ?? 'not_applicable',
    };
  });
  const issues = ((issueResult.data ?? []) as unknown as RemoteIssue[]).map(issue => {
    const booking = bookingById.get(issue.booking_id);
    const reporterProfile = profileById.get(issue.reporter_id);
    const assigneeProfile = issue.assignee_id ? profileById.get(issue.assignee_id) : undefined;
    return {
      id: issue.id,
      ref: issue.reference,
      bookingRef: booking?.ref,
      propertyTitle: booking?.propertyTitle,
      category: issue.category,
      severity: issue.severity,
      subject: issue.subject,
      description: issue.description,
      reporter: issue.reporter_id === user.id ? session.name : (reporterProfile?.full_name || 'HAMLET user'),
      reporterType: (issue.reporter_type ?? (reporterProfile?.role === 'partner' ? 'partner' : reporterProfile?.role === 'admin' ? 'internal' : 'guest')) as Issue['reporterType'],
      status: issue.status,
      assignee: issue.assignee_name ?? assigneeProfile?.full_name ?? issue.assignee_id,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      evidence: issue.evidence ?? [],
      resolution: issue.resolution,
      timeline: issue.timeline ?? [],
    };
  });
  const assignments: PartnerAssignment[] = accesses.map(access => {
    const partnerProfile = profileById.get(access.user_id);
    return {
      id: `${access.property_id}:${access.user_id}`,
      propertyId: access.property_id,
      propertyTitle: propertyById.get(access.property_id)?.title ?? 'Property',
      partnerId: access.user_id,
      partnerName: access.user_id === user.id ? session.name : (partnerProfile?.full_name || 'Authorised partner'),
      partnerRole: access.access_role,
      scope: access.scope,
      commissionRate: access.commission_rate,
      commissionNote: access.commission_note,
      status: access.status,
      grantedAt: access.granted_at,
      revokedAt: access.revoked_at,
    };
  });
  const accounts: Account[] = profileRows.length > 0
    ? profileRows.map(row => {
        const dirEntry = adminDirectoryById.get(row.id);
        return {
          id: row.id,
          name: row.id === user.id ? session.name : (row.full_name || dirEntry?.full_name || 'HAMLET user'),
          email: row.id === user.id ? session.email : (dirEntry?.email ?? ''),
          password: '',
          role: row.role,
          partnerRole: row.partner_role || dirEntry?.partner_role || undefined,
          company: row.company || dirEntry?.company || undefined,
          phone: row.phone || dirEntry?.phone || undefined,
          referralCode: row.referral_code ?? undefined,
          referredByPartnerId: row.referred_by_partner_id ?? null,
          referredByCode: row.referred_by_code ?? null,
          accountStatus: row.account_status ?? dirEntry?.account_status ?? 'active',
          suspensionReason: row.suspension_reason || dirEntry?.suspension_reason || undefined,
          createdAt: row.created_at,
        };
      })
    : [{
        id: user.id,
        name: session.name,
        email: session.email,
        password: '',
        role: session.role,
        partnerRole: session.partnerRole,
        company: session.company,
        phone: profile.phone ?? undefined,
        referralCode: (profile.referral_code as string | undefined) ?? undefined,
        referredByPartnerId: (profile.referred_by_partner_id as string | undefined) ?? null,
        referredByCode: (profile.referred_by_code as string | undefined) ?? null,
        accountStatus: session.accountStatus ?? 'active',
        suspensionReason: session.suspensionReason,
        createdAt: profile.created_at,
      }];

  const publicCalendarSpans: PublicCalendarSpan[] = publicSpansRaw.map(s => ({
    propertyId: s.property_id,
    startDate: s.start_date,
    endDate: s.end_date,
    kind: s.kind,
  }));

  const partnerReferrals: PartnerReferral[] = referralsRaw.map(r => {
    const referrerProf = profileById.get(r.referrer_partner_id);
    const referredProf = profileById.get(r.referred_partner_id);
    const summaryRef = referredNameByReferralId.get(r.id);
    return {
      id: r.id,
      referrerPartnerId: r.referrer_partner_id,
      referrerName: referrerProf?.full_name || 'HAMLET partner',
      referredPartnerId: r.referred_partner_id,
      referredName: referredProf?.full_name || summaryRef?.referred_name || 'Referred partner',
      referredCompany: referredProf?.company ?? summaryRef?.referred_company ?? undefined,
      referralCode: r.referral_code,
      status: r.status,
      earningWindowDays: r.earning_window_days,
      registeredAt: r.registered_at,
      verifiedAt: r.verified_at ?? undefined,
      activatedAt: r.activated_at ?? undefined,
      activatingBookingId: r.activating_booking_id ?? undefined,
      eligibilityStartsAt: r.eligibility_starts_at ?? undefined,
      eligibilityEndsAt: r.eligibility_ends_at ?? undefined,
      disputeNote: r.dispute_note ?? undefined,
      resolvedBy: r.resolved_by ?? undefined,
    };
  });

  const partnerReferralRewards: PartnerReferralReward[] = referralRewardsRaw.map(rw => {
    const agentProf = profileById.get(rw.referred_closing_agent_id);
    return {
      id: rw.id,
      referralId: rw.referral_id,
      referrerPartnerId: rw.referrer_partner_id,
      referredClosingAgentId: rw.referred_closing_agent_id,
      referredAgentName: agentProf?.full_name || rewardAgentNameById.get(rw.id) || 'Closing agent',
      bookingId: rw.booking_id,
      bookingRef: rw.booking_reference,
      ownerListedPriceNgn: rw.owner_listed_price_ngn,
      rewardRate: Number(rw.reward_rate),
      rewardAmountNgn: rw.reward_amount_ngn,
      payoutStatus: rw.payout_status,
      reversalReason: rw.reversal_reason ?? undefined,
      createdAt: rw.created_at,
    };
  });

  const cautionDeposits: CautionDepositRecord[] = cautionDepositsRaw.map(cd => {
    const booking = bookingById.get(cd.booking_id);
    const prop = propertyById.get(cd.property_id);
    return {
      id: cd.id,
      bookingId: cd.booking_id,
      bookingRef: booking?.ref,
      propertyId: cd.property_id,
      propertyTitle: prop?.title ?? booking?.propertyTitle,
      guestId: cd.guest_id,
      guestName: booking?.guestName,
      amountNgn: cd.amount_ngn,
      status: cd.status,
      deductedAmountNgn: cd.deducted_amount_ngn,
      refundedAmountNgn: cd.refunded_amount_ngn,
      collectionReference: cd.collection_reference ?? undefined,
      refundReference: cd.refund_reference ?? undefined,
      inspectionNotes: cd.inspection_notes ?? undefined,
      deductionReason: cd.deduction_reason ?? undefined,
      evidence: Array.isArray(cd.evidence) ? cd.evidence : [],
      decisionBy: cd.decision_by ?? undefined,
      decisionAt: cd.decision_at ?? undefined,
      createdAt: cd.created_at,
      updatedAt: cd.updated_at,
    };
  });
  const feedback: FeedbackItem[] = ((feedbackResult.data ?? []) as unknown as RemoteFeedback[]).map(row => {
    const booking = bookingById.get(row.booking_id);
    const guestProfile = profileById.get(row.guest_id);
    return {
      id: row.id,
      at: row.created_at,
      bookingRef: booking?.ref ?? row.booking_id,
      propertyTitle: booking?.propertyTitle,
      guestName: row.guest_id === user.id ? session.name : (guestProfile?.full_name || 'Guest'),
      rating: row.rating,
      text: row.feedback_text,
      category: row.category,
    };
  });
  const audit: AuditEntry[] = ((auditResult.data ?? []) as unknown as RemoteAuditEntry[]).map(entry => {
    const actorProfile = profileById.get(entry.actor_id);
    return {
      id: entry.id,
      at: entry.created_at,
      actor: entry.actor_id === user.id
        ? session.name
        : actorProfile?.full_name || (entry.actor_role === 'admin' ? 'HAMLET administrator' : entry.actor_role === 'system' ? 'HAMLET system' : 'HAMLET partner'),
      actorRole: entry.actor_role,
      action: entry.action,
      target: entry.target,
      detail: entry.detail,
    };
  });
  const notifications: BookingNotificationRecord[] = (
    (notificationResult.data ?? []) as unknown as RemoteBookingNotificationRow[]
  ).map(row => ({
    id: row.id,
    bookingId: row.booking_id,
    bookingRef: row.booking_reference,
    propertyId: row.property_id,
    eventType: row.event_type,
    recipientType: row.recipient_type,
    recipientEmail: row.recipient_email ?? undefined,
    subject: row.subject ?? undefined,
    deliveryStatus: row.delivery_status,
    provider: row.provider,
    providerMessageId: row.provider_message_id ?? undefined,
    attemptCount: row.attempt_count,
    maxAttempts: row.max_attempts,
    lastError: row.last_error ?? undefined,
    idempotencyKey: row.idempotency_key,
    sentAt: row.sent_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  const adminBootstrapEmails: AdminBootstrapEmail[] = (
    (adminBootstrapResult.data ?? []) as unknown as RemoteAdminBootstrapEmailRow[]
  ).map(row => ({
    email: row.email,
    note: row.note,
    addedBy: row.added_by ?? undefined,
    createdAt: row.created_at,
  }));

  return {
    ...emptyState(),
    accounts,
    properties,
    publicCalendarSpans,
    bookings,
    closedAgentBookings,
    ledger,
    issues,
    applications,
    assignments,
    partnerReferrals,
    partnerReferralRewards,
    cautionDeposits,
    exchangeRates: mapRemoteExchangeRates(fxRatesRaw),
    audit,
    feedback,
    notifications,
    adminBootstrapEmails,
    session,
  };
}

function buildDemoNotifications(
  booking: Booking,
  eventType: NotificationEventType,
  recipients: NotificationRecipientType[],
): BookingNotificationRecord[] {
  const now = nowIso();
  return recipients.map(recipientType => ({
    id: uid(),
    bookingId: booking.id,
    bookingRef: booking.ref,
    propertyId: booking.propertyId,
    eventType,
    recipientType,
    recipientEmail: recipientType === 'guest' ? booking.guestEmail : undefined,
    deliveryStatus: 'skipped',
    provider: 'demo-preview',
    attemptCount: 0,
    maxAttempts: 3,
    lastError: 'Local demo mode — live email delivery runs via deployed Supabase Edge Function & Resend.',
    idempotencyKey: `${booking.id}:${eventType}:${recipientType}`,
    createdAt: now,
    updatedAt: now,
  }));
}

function auditEntry(actorName: string, actorRole: string, action: string, target: string, detail: string): AuditEntry {
  return { id: uid(), at: nowIso(), actor: actorName, actorRole, action, target, detail };
}

function reducer(state: DBState, action: Action): DBState {
  switch (action.type) {
    case 'HYDRATE':
      return action.state;
    case 'RESET': {
      localStorage.removeItem(DB_KEY); localStorage.removeItem(SESSION_KEY);
      return initialState();
    }
    case 'SIGN_IN':
      localStorage.setItem(SESSION_KEY, JSON.stringify(action.session));
      return { ...state, session: action.session };
    case 'SIGN_OUT':
      localStorage.removeItem(SESSION_KEY);
      return { ...state, session: null };
    case 'UPDATE_PROFILE': {
      if (!state.session) return state;
      const nextSession: Session = {
        ...state.session,
        name: action.name,
        phone: action.phone || undefined,
        company: action.company ?? state.session.company,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
      return {
        ...state,
        session: nextSession,
        accounts: state.accounts.map(a =>
          a.id === nextSession.userId
            ? { ...a, name: action.name, phone: action.phone || undefined, company: action.company ?? a.company }
            : a,
        ),
      };
    }
    case 'REGISTER_GUEST':
      localStorage.setItem(SESSION_KEY, JSON.stringify(action.session));
      return {
        ...state,
        accounts: [...state.accounts, action.account],
        session: action.session,
        audit: [
          auditEntry(action.account.name, 'guest', 'guest_registered', action.account.email, 'Guest account created'),
          ...state.audit,
        ],
      };
    case 'REGISTER_PARTNER':
      return {
        ...state,
        accounts: [...state.accounts, action.account],
        applications: [action.application, ...state.applications],
        partnerReferrals: action.referral
          ? [action.referral, ...state.partnerReferrals]
          : state.partnerReferrals,
        audit: [auditEntry(action.account.name, 'partner', 'partner_application_submitted', action.application.company, `Role: ${action.application.role} · ${action.application.areas.join(', ')}${action.application.referredByCode ? ` · Ref: ${action.application.referredByCode}` : ''}`), ...state.audit],
      };
    case 'RESUBMIT_PARTNER_APPLICATION':
      return {
        ...state,
        applications: state.applications.map(a =>
          a.id === action.id
            ? {
                ...a,
                ...action.patch,
                status: 'pending' as const,
                submittedAt: nowIso(),
              }
            : a,
        ),
        audit: [
          auditEntry(
            action.actor.name,
            action.actor.role,
            'partner_application_resubmitted',
            action.patch.company,
            'Applicant updated details and resubmitted partner application for review.',
          ),
          ...state.audit,
        ],
      };
    case 'ADD_PROPERTY':
      return {
        ...state,
        properties: [action.property, ...state.properties],
        assignments: [{
          id: uid(), propertyId: action.property.id, propertyTitle: action.property.title,
          partnerId: action.property.ownerId, partnerName: action.property.submittedBy,
          partnerRole: action.property.submittedRole, scope: 'Submitter — pending review',
          commissionRate: null, commissionNote: 'No commission agreed', status: 'active', grantedAt: nowIso(),
        }, ...state.assignments],
        audit: [auditEntry(action.property.submittedBy, action.property.submittedRole, action.property.status === 'draft' ? 'property_draft_saved' : 'property_submitted', action.property.title, action.property.status === 'draft' ? 'Property saved as draft' : 'Property submitted for review'), ...state.audit],
      };
    case 'UPDATE_AND_RESUBMIT_PROPERTY': {
      const p = state.properties.find(x => x.id === action.id);
      if (!p) return state;
      const keepDraft = p.status === 'draft' && Boolean(action.saveAsDraft);
      const updatedDocs = action.patch.docs.map(d => {
        const existingVerified = p.docs.find(ed => ed.label === d.label && ed.status === 'verified');
        return existingVerified ? existingVerified : { ...d, status: d.status === 'missing' ? ('missing' as const) : ('self_reported' as const) };
      });
      const updatedProperty: Property = {
        ...p,
        ...action.patch,
        docs: updatedDocs,
        status: keepDraft ? 'draft' : 'submitted',
        trustLabel: keepDraft ? 'Draft' : 'Under review',
        verification: {
          ownership: p.verification.ownership === 'verified' ? 'verified' : 'pending_review',
          identity: p.verification.identity === 'verified' ? 'verified' : 'pending_review',
          authority: p.verification.authority === 'verified' ? 'verified' : 'pending_review',
          inspection: p.verification.inspection === 'verified' ? 'verified' : 'missing',
        },
      };
      return {
        ...state,
        properties: state.properties.map(x => (x.id === action.id ? updatedProperty : x)),
        audit: [
          auditEntry(
            action.actor.name,
            action.actor.role,
            keepDraft ? 'property_draft_updated' : p.status === 'draft' ? 'property_submitted' : 'property_resubmitted',
            updatedProperty.title,
            action.note ?? (keepDraft ? 'Draft listing updated.' : 'Listing details and authority declarations updated and resubmitted for review.'),
          ),
          ...state.audit,
        ],
      };
    }
    case 'SET_PARTNER_STATUS': {
      const partner = state.accounts.find(a => a.id === action.partnerId);
      if (!partner) return state;
      const nextAccounts = state.accounts.map(a =>
        a.id === action.partnerId
          ? {
              ...a,
              accountStatus: action.status,
              suspensionReason: action.status === 'suspended' ? action.reason : undefined,
            }
          : a,
      );
      let cascadedCount = 0;
      const nextProperties = action.status === 'suspended' && action.cascadeSuspend
        ? state.properties.map(prop => {
            if (prop.status === 'approved' && prop.ownerId === action.partnerId) {
              cascadedCount += 1;
              return {
                ...prop,
                status: 'suspended' as const,
                trustLabel: 'Under review',
                reviewNote: `Listing suspended following partner account suspension: ${action.reason}`,
              };
            }
            return prop;
          })
        : state.properties;
      return {
        ...state,
        accounts: nextAccounts,
        properties: nextProperties,
        audit: [
          auditEntry(
            action.actor.name,
            action.actor.role,
            action.status === 'suspended' ? 'partner_suspended' : 'partner_reinstated',
            partner.name,
            action.status === 'suspended'
              ? `Partner account suspended (${cascadedCount} approved listing(s) suspended). Reason: ${action.reason}`
              : `Partner account reinstated to active. Note: ${action.reason}`,
          ),
          ...state.audit,
        ],
      };
    }
    case 'PROPERTY_REVIEW': {
      const p = state.properties.find(x => x.id === action.id);
      if (!p) return state;
      const labels: Record<string, string> = {
        approved: 'listing_approved', needs_correction: 'listing_needs_correction',
        rejected: 'listing_rejected', suspended: 'listing_suspended', submitted: 'listing_resubmitted',
      };
      const updatedProperty = {
        ...p,
        status: action.status,
        reviewNote: action.note ?? p.reviewNote,
        verification: action.verification ?? p.verification,
        trustLabel: action.status === 'approved' ? 'HAMLET verified' : action.status === 'suspended' ? 'Suspended' : p.trustLabel,
      };
      // suspension revokes active assignments
      let assignments = state.assignments;
      if (action.status === 'suspended') {
        assignments = assignments.map(a =>
          a.propertyId === p.id && a.status === 'active'
            ? { ...a, status: 'revoked' as const, revokedAt: nowIso() }
            : a);
      }
      return {
        ...state,
        properties: state.properties.map(x => (x.id === action.id ? updatedProperty : x)),
        assignments,
        audit: [auditEntry(action.actor.name, action.actor.role, labels[action.status] ?? 'listing_reviewed', `${p.id} · ${p.title}`, action.note ?? `Status set to ${action.status}`), ...state.audit],
      };
    }
    case 'UPDATE_PROPERTY_AVAILABILITY': {
      const p = state.properties.find(x => x.id === action.id);
      if (!p) return state;
      const updated: Property = {
        ...p,
        firstAvailableDate: action.firstAvailableDate ?? null,
        availabilityConfirmationStatus: action.availabilityConfirmationStatus,
        calendarResponsiblePerson: action.calendarResponsiblePerson || p.calendarResponsiblePerson || action.actor.name,
        calendarResponsibleUserId: action.actor.userId,
        lastAvailabilityUpdate: nowIso(),
      };
      return {
        ...state,
        properties: state.properties.map(x => (x.id === action.id ? updated : x)),
        audit: [
          auditEntry(
            action.actor.name,
            action.actor.role,
            'property_availability_updated',
            p.title,
            `First available: ${action.firstAvailableDate ?? 'immediate'} · status: ${action.availabilityConfirmationStatus}`,
          ),
          ...state.audit,
        ],
      };
    }
    case 'ADD_AVAILABILITY_BLOCK': {
      const p = state.properties.find(x => x.id === action.propertyId);
      if (!p) return state;
      const updated: Property = {
        ...p,
        unavailableBlocks: [...(p.unavailableBlocks ?? []), action.block],
        lastAvailabilityUpdate: nowIso(),
      };
      return {
        ...state,
        properties: state.properties.map(x => (x.id === action.propertyId ? updated : x)),
        audit: [
          auditEntry(
            action.actor.name,
            action.actor.role,
            'property_block_added',
            p.title,
            `Blocked ${action.block.startDate} → ${action.block.endDate} (${action.block.blockType})`,
          ),
          ...state.audit,
        ],
      };
    }
    case 'REMOVE_AVAILABILITY_BLOCK': {
      const p = state.properties.find(x => x.id === action.propertyId);
      if (!p) return state;
      const updated: Property = {
        ...p,
        unavailableBlocks: (p.unavailableBlocks ?? []).filter(b => b.id !== action.blockId),
        lastAvailabilityUpdate: nowIso(),
      };
      return {
        ...state,
        properties: state.properties.map(x => (x.id === action.propertyId ? updated : x)),
        audit: [
          auditEntry(
            action.actor.name,
            action.actor.role,
            'property_block_removed',
            p.title,
            `Removed calendar block ${action.blockId}`,
          ),
          ...state.audit,
        ],
      };
    }
    case 'SET_PROPERTY_PAUSE': {
      const p = state.properties.find(x => x.id === action.propertyId);
      if (!p) return state;
      const nextStatus: Property['status'] = action.paused ? 'paused' : 'approved';
      return {
        ...state,
        properties: state.properties.map(x => (x.id === action.propertyId ? { ...x, status: nextStatus } : x)),
        audit: [
          auditEntry(
            action.actor.name,
            action.actor.role,
            `property_${nextStatus}`,
            p.title,
            action.note ?? `Publication status set to ${nextStatus}`,
          ),
          ...state.audit,
        ],
      };
    }
    case 'ADD_BOOKING':
      return {
        ...state,
        bookings: [action.booking, ...state.bookings],
        cautionDeposits: action.cautionDeposit
          ? [action.cautionDeposit, ...state.cautionDeposits]
          : state.cautionDeposits,
        notifications: [
          ...buildDemoNotifications(action.booking, 'booking_request_created', ['guest', 'partner', 'operations']),
          ...state.notifications,
        ],
      };
    case 'REFRESH_BOOKING_QUOTE':
      return {
        ...state,
        bookings: state.bookings.map(b => (b.id === action.bookingId ? { ...b, ...action.patch } : b)),
      };
    case 'BOOKING_TRANSITION': {
      const b = state.bookings.find(x => x.id === action.id);
      if (!b) return state;
      const at = nowIso();
      const ev = (label: string, detail?: string) => ({ at, label, actor: `${action.actor.name} (${action.actor.role})`, detail });
      const updated: Booking = { ...b, status: action.to, cancelReason: action.reason ?? b.cancelReason };
      switch (action.to) {
        case 'checking': updated.timeline = [...b.timeline, ev('Availability & terms being checked', action.note)]; break;
        case 'awaiting_payment': {
          const deadline = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
          updated.paymentDeadline = deadline;
          updated.timeline = [...b.timeline, ev('Accepted — awaiting payment', `Payment deadline: ${new Date(deadline).toLocaleString('en-GB')}${action.note ? ` · ${action.note}` : ''}`)];
          break;
        }
        case 'declined': updated.timeline = [...b.timeline, ev('Declined by owner', action.note)]; break;
        case 'cancelled': updated.timeline = [...b.timeline, ev('Booking cancelled', action.reason)]; break;
        case 'expired': updated.timeline = [...b.timeline, ev('Payment deadline expired — booking expired', 'Availability released and rechecked')]; break;
        case 'completed': updated.timeline = [...b.timeline, ev('Stay completed')]; break;
        case 'disputed': updated.timeline = [...b.timeline, ev('Booking disputed — issue resolution in progress', action.note)]; break;
        case 'no_show': updated.timeline = [...b.timeline, ev('No-show recorded', action.note)]; break;
        case 'refunded': updated.timeline = [...b.timeline, ev('Refund processed', action.note)]; updated.refundStatus = 'processed'; break;
        default: updated.timeline = [...b.timeline, ev(`Status → ${action.to}`, action.note)];
      }

      let nextReferrals = state.partnerReferrals;
      let nextRewards = state.partnerReferralRewards;
      let nextLedger = state.ledger;
      let nextCaution = state.cautionDeposits;

      if (action.to === 'completed') {
        nextCaution = state.cautionDeposits.map(cd =>
          cd.bookingId === b.id && cd.status === 'received'
            ? { ...cd, status: 'inspection_pending' as const, updatedAt: at }
            : cd,
        );
        nextLedger = state.ledger.map(le =>
          le.bookingRef === b.ref && le.payoutStatus === 'pending' &&
          (le.type === 'closing_agent_commission' || le.type === 'accommodation_revenue' || le.type === 'mandatory_charges')
            ? { ...le, payoutStatus: 'approved' as const }
            : le,
        );

        if (b.closingAgentId) {
          const refRecord = state.partnerReferrals.find(r => r.referredPartnerId === b.closingAgentId);
          if (refRecord) {
            const evalRes = evaluateReferralOnBookingCompletion({
              referral: refRecord,
              referrerAccountActive: true,
              referredAccountActive: true,
              bookingId: b.id,
              bookingStatus: 'completed',
              closingAgentId: b.closingAgentId,
              ownerListedPriceNgn: b.ownerListedPriceNgn ?? b.accommodationSubtotal,
              completedAtIso: at,
            });
            if (evalRes.action === 'activate_only') {
              nextReferrals = state.partnerReferrals.map(r =>
                r.id === refRecord.id
                  ? {
                      ...r,
                      status: 'active' as const,
                      activatedAt: evalRes.nextActivatedAt,
                      activatingBookingId: b.id,
                      eligibilityStartsAt: evalRes.nextActivatedAt,
                      eligibilityEndsAt: evalRes.nextEligibilityEndsAt,
                    }
                  : r,
              );
              nextRewards = [
                {
                  id: uid(),
                  referralId: refRecord.id,
                  referrerPartnerId: refRecord.referrerPartnerId,
                  referredClosingAgentId: b.closingAgentId,
                  bookingId: b.id,
                  bookingRef: b.ref,
                  ownerListedPriceNgn: b.ownerListedPriceNgn ?? b.accommodationSubtotal,
                  rewardRate: 0,
                  rewardAmountNgn: 0,
                  payoutStatus: 'activated_no_payout',
                  createdAt: at,
                },
                ...state.partnerReferralRewards,
              ];
            } else if (evalRes.action === 'award_recurring') {
              updated.directReferrerId = refRecord.referrerPartnerId;
              updated.directReferrerRewardNgn = evalRes.rewardAmountNgn;
              const markup = updated.domesticMarkupNgn ?? updated.hamletGuestFee;
              updated.hamletAllocationNgn = Math.max(
                0,
                markup - (updated.closingAgentCommissionNgn ?? 0) - evalRes.rewardAmountNgn - (updated.paymentReserveNgn ?? 0),
              );
              nextRewards = [
                {
                  id: uid(),
                  referralId: refRecord.id,
                  referrerPartnerId: refRecord.referrerPartnerId,
                  referredClosingAgentId: b.closingAgentId,
                  bookingId: b.id,
                  bookingRef: b.ref,
                  ownerListedPriceNgn: b.ownerListedPriceNgn ?? b.accommodationSubtotal,
                  rewardRate: evalRes.rewardRate,
                  rewardAmountNgn: evalRes.rewardAmountNgn,
                  payoutStatus: 'pending',
                  createdAt: at,
                },
                ...state.partnerReferralRewards,
              ];
              nextLedger = [
                {
                  id: uid(),
                  at,
                  bookingRef: b.ref,
                  propertyTitle: b.propertyTitle,
                  type: 'referral_reward',
                  description: 'Direct partner referral reward (2.5% of owner listed price within 90-day window)',
                  amount: evalRes.rewardAmountNgn,
                  status: 'recorded',
                  operator: action.actor.name,
                  variance: 0,
                  beneficiaryUserId: refRecord.referrerPartnerId,
                  payoutStatus: 'pending',
                },
                ...nextLedger,
              ];
            }
          }
        }
      } else if (action.to === 'cancelled' || action.to === 'no_show') {
        const reversals: LedgerEntry[] = [];
        nextLedger = state.ledger.map(le => {
          if (
            le.bookingRef === b.ref &&
            (le.type === 'closing_agent_commission' || le.type === 'referral_reward' || le.type === 'partner_commission') &&
            (le.payoutStatus === 'pending' || le.payoutStatus === 'approved')
          ) {
            reversals.push({
              id: uid(),
              at,
              bookingRef: b.ref,
              propertyTitle: b.propertyTitle,
              type: le.type === 'referral_reward' ? 'referral_reversal' : 'commission_reversal',
              description: `Reversed due to ${action.to}`,
              amount: le.amount,
              status: 'reconciled',
              operator: action.actor.name,
              variance: 0,
              beneficiaryUserId: le.beneficiaryUserId,
              payoutStatus: 'reversed',
            });
            return { ...le, payoutStatus: 'reversed' as const };
          }
          return le;
        });
        nextLedger = [...reversals, ...nextLedger];
        nextRewards = state.partnerReferralRewards.map(rw =>
          rw.bookingId === b.id ? { ...rw, payoutStatus: 'reversed' as const, reversalReason: action.to } : rw,
        );
      }

      const auditAction = action.to === 'completed' ? 'booking_completed'
        : action.to === 'cancelled' ? 'booking_cancelled'
        : action.to === 'expired' ? 'booking_expired'
        : action.to === 'disputed' ? 'booking_disputed'
        : 'booking_status_change';
      const demoTransitionNotifications =
        (b.status === 'requested' || b.status === 'checking') && action.to === 'awaiting_payment'
          ? buildDemoNotifications(updated, 'booking_availability_confirmed', ['guest', 'operations'])
          : (b.status === 'requested' || b.status === 'checking') && action.to === 'declined'
            ? buildDemoNotifications(updated, 'booking_availability_declined', ['guest', 'operations'])
            : [];
      return {
        ...state,
        bookings: state.bookings.map(x => (x.id === action.id ? updated : x)),
        partnerReferrals: nextReferrals,
        partnerReferralRewards: nextRewards,
        ledger: nextLedger,
        cautionDeposits: nextCaution,
        notifications: [...demoTransitionNotifications, ...state.notifications],
        audit: [auditEntry(action.actor.name, action.actor.role, auditAction, b.ref, `→ ${action.to}${action.reason ? ` · ${action.reason}` : ''}`), ...state.audit],
      };
    }
    case 'VERIFY_PAYMENT': {
      const b = state.bookings.find(x => x.id === action.id);
      if (!b) return state;
      const at = nowIso();
      const paidNgn = b.settlementTotalNgn ?? b.guestTotal;
      const updated: Booking = {
        ...b, status: 'confirmed', paymentRef: action.providerRef, paymentProvider: action.provider,
        timeline: [
          ...b.timeline,
          { at, label: 'Payment verified server-side via provider webhook', actor: `System (${action.provider})`, detail: `Ref ${action.providerRef} · ${formatNaira(paidNgn)}` },
          { at, label: 'Booking confirmed — availability rechecked. No overlap.', actor: 'System' },
        ],
      };
      const entries: LedgerEntry[] = [
        { id: uid(), at, bookingRef: b.ref, propertyTitle: b.propertyTitle, type: 'guest_charge', description: `Guest payment verified via webhook (${b.nights} nights + mandatory charges + 20% domestic accommodation markup)`, amount: paidNgn, status: 'reconciled', operator: `System (${action.provider} webhook)`, variance: 0, providerRef: action.providerRef },
        { id: uid(), at, bookingRef: b.ref, propertyTitle: b.propertyTitle, type: 'accommodation_revenue', description: `Owner accommodation revenue (${b.nights} nights · 0% HAMLET owner fee)`, amount: b.accommodationSubtotal, status: 'recorded', operator: `System (${action.provider} webhook)`, variance: 0, providerRef: action.providerRef, payoutStatus: 'pending' },
        ...(b.mandatoryTotal > 0 ? [{ id: uid(), at, bookingRef: b.ref, propertyTitle: b.propertyTitle, type: 'mandatory_charges' as const, description: 'Disclosed mandatory property charges (owner settlement)', amount: b.mandatoryTotal, status: 'recorded' as const, operator: `System (${action.provider} webhook)`, variance: 0, providerRef: action.providerRef, payoutStatus: 'pending' as const }] : []),
        { id: uid(), at, bookingRef: b.ref, propertyTitle: b.propertyTitle, type: 'guest_service_fee', description: `HAMLET 20% domestic accommodation markup (20.0% × ${formatNaira(b.accommodationSubtotal)})`, amount: b.hamletGuestFee, status: 'reconciled', operator: `System (${action.provider} webhook)`, variance: 0, providerRef: action.providerRef },
        ...(b.closingAgentId && (b.closingAgentCommissionNgn ?? 0) > 0 ? [{ id: uid(), at, bookingRef: b.ref, propertyTitle: b.propertyTitle, type: 'closing_agent_commission' as const, description: 'Closing agent commission (10.0% of owner listed price)', amount: b.closingAgentCommissionNgn ?? 0, status: 'recorded' as const, operator: `System (${action.provider} webhook)`, variance: 0, providerRef: `${action.providerRef}:closing_agent`, beneficiaryUserId: b.closingAgentId, payoutStatus: 'pending' as const }] : []),
        ...((b.paymentReserveNgn ?? 0) > 0 ? [{ id: uid(), at, bookingRef: b.ref, propertyTitle: b.propertyTitle, type: 'payment_reserve' as const, description: 'Internal payment & settlement cost reserve (2.5% of owner listed price)', amount: b.paymentReserveNgn ?? 0, status: 'reconciled' as const, operator: `System (${action.provider} webhook)`, variance: 0, providerRef: `${action.providerRef}:payment_reserve`, note: 'Internal budget only — actual gateway charges recorded separately.' }] : []),
        ...((b.hamletAllocationNgn ?? 0) > 0 ? [{ id: uid(), at, bookingRef: b.ref, propertyTitle: b.propertyTitle, type: 'hamlet_allocation' as const, description: 'HAMLET net markup allocation', amount: b.hamletAllocationNgn ?? 0, status: 'reconciled' as const, operator: `System (${action.provider} webhook)`, variance: 0, providerRef: `${action.providerRef}:hamlet_allocation` }] : []),
        ...((b.internationalBufferNgnEquiv ?? 0) > 0 ? [{ id: uid(), at, bookingRef: b.ref, propertyTitle: b.propertyTitle, type: 'international_buffer' as const, description: `International 10% currency buffer (${b.quoteCurrency} quote)`, amount: b.internationalBufferNgnEquiv ?? 0, status: 'reconciled' as const, operator: `System (${action.provider} webhook)`, variance: 0, providerRef: `${action.providerRef}:fx_buffer` }] : []),
        ...(b.deposit > 0 ? [{ id: uid(), at, bookingRef: b.ref, propertyTitle: b.propertyTitle, type: 'deposit_hold' as const, description: 'Refundable caution deposit — tracked separately, excluded from markup & commissions.', amount: b.deposit, status: 'recorded' as const, operator: `System (${action.provider} webhook)`, variance: 0, providerRef: action.providerRef }] : []),
      ];
      const nextCaution = b.deposit > 0
        ? state.cautionDeposits.some(cd => cd.bookingId === b.id)
          ? state.cautionDeposits.map(cd => (cd.bookingId === b.id && cd.status === 'due' ? { ...cd, status: 'received' as const, collectionReference: action.providerRef, updatedAt: at } : cd))
          : [{ id: uid(), bookingId: b.id, bookingRef: b.ref, propertyId: b.propertyId, propertyTitle: b.propertyTitle, guestId: b.guestId, guestName: b.guestName, amountNgn: b.deposit, status: 'received' as const, deductedAmountNgn: 0, refundedAmountNgn: 0, collectionReference: action.providerRef, evidence: [], createdAt: at, updatedAt: at }, ...state.cautionDeposits]
        : state.cautionDeposits;
      return {
        ...state,
        bookings: state.bookings.map(x => (x.id === action.id ? updated : x)),
        ledger: [...entries, ...state.ledger],
        cautionDeposits: nextCaution,
        audit: [
          auditEntry(action.actor.name, action.actor.role, 'payment_verified', b.ref, `Webhook signature verified server-side. ${formatNaira(paidNgn)} confirmed. Idempotency key ${action.providerRef}`),
          ...state.audit,
        ],
      };
    }
    case 'TRANSITION_CAUTION_DEPOSIT': {
      const target = state.cautionDeposits.find(cd => cd.bookingId === action.bookingId);
      if (!target) return state;
      const at = nowIso();
      const updatedCd: CautionDepositRecord = {
        ...target,
        status: action.status,
        deductedAmountNgn: action.deductedAmountNgn ?? target.deductedAmountNgn,
        refundedAmountNgn: action.refundedAmountNgn ?? target.refundedAmountNgn,
        inspectionNotes: action.inspectionNotes ?? target.inspectionNotes,
        deductionReason: action.deductionReason ?? target.deductionReason,
        refundReference: action.refundReference ?? target.refundReference,
        evidence: action.evidence ?? target.evidence,
        decisionBy: action.actor.role === 'admin' ? action.actor.userId : target.decisionBy,
        decisionAt: action.actor.role === 'admin' ? at : target.decisionAt,
        updatedAt: at,
      };
      const extraLedger: LedgerEntry[] = [];
      if (action.actor.role === 'admin' && (action.status === 'partially_refunded' || action.status === 'refund_completed')) {
        if ((action.deductedAmountNgn ?? 0) > 0) {
          extraLedger.push({
            id: uid(), at, bookingRef: target.bookingRef ?? target.bookingId, propertyTitle: target.propertyTitle,
            type: 'caution_deduction', description: `Caution deposit deduction — ${action.deductionReason ?? 'Inspection damage'}`,
            amount: action.deductedAmountNgn ?? 0, status: 'reconciled', operator: action.actor.name, variance: 0,
          });
        }
        if ((action.refundedAmountNgn ?? 0) > 0) {
          extraLedger.push({
            id: uid(), at, bookingRef: target.bookingRef ?? target.bookingId, propertyTitle: target.propertyTitle,
            type: 'caution_refund', description: 'Caution deposit refunded to guest post-inspection',
            amount: action.refundedAmountNgn ?? 0, status: 'reconciled', operator: action.actor.name, variance: 0,
          });
        }
      }
      return {
        ...state,
        cautionDeposits: state.cautionDeposits.map(cd => (cd.id === target.id ? updatedCd : cd)),
        ledger: [...extraLedger, ...state.ledger],
        audit: [
          auditEntry(action.actor.name, action.actor.role, `caution_deposit_${action.status}`, target.bookingRef ?? target.bookingId, `Status → ${action.status}`),
          ...state.audit,
        ],
      };
    }
    case 'UPDATE_EXCHANGE_RATE': {
      const exists = state.exchangeRates.some(r => r.currency === action.config.currency);
      const nextRates = exists
        ? state.exchangeRates.map(r => (r.currency === action.config.currency ? action.config : r))
        : [...state.exchangeRates, action.config];
      return {
        ...state,
        exchangeRates: nextRates,
        audit: [
          auditEntry(action.actor.name, action.actor.role, 'exchange_rate_updated', action.config.currencyPair, `${action.config.currencyPair} set to ${action.config.ngnPerUnit} (${action.config.source})`),
          ...state.audit,
        ],
      };
    }
    case 'RESOLVE_REFERRAL_DISPUTE': {
      const target = state.partnerReferrals.find(r => r.id === action.referralId);
      if (!target) return state;
      return {
        ...state,
        partnerReferrals: state.partnerReferrals.map(r =>
          r.id === action.referralId
            ? {
                ...r,
                status: action.status,
                earningWindowDays: action.overrideWindowDays ?? r.earningWindowDays,
                disputeNote: action.note,
                resolvedBy: action.actor.userId,
              }
            : r,
        ),
        audit: [
          auditEntry(action.actor.name, action.actor.role, `referral_${action.status}`, target.referralCode, action.note),
          ...state.audit,
        ],
      };
    }
    case 'UPDATE_PAYOUT_STATUS': {
      const entry = state.ledger.find(l => l.id === action.entryId);
      if (!entry) return state;
      return {
        ...state,
        ledger: state.ledger.map(l =>
          l.id === action.entryId
            ? { ...l, payoutStatus: action.payoutStatus, status: action.payoutStatus === 'paid' ? 'settled' : l.status, note: action.note ?? l.note }
            : l,
        ),
        partnerReferralRewards: entry.type === 'referral_reward'
          ? state.partnerReferralRewards.map(rw => (rw.bookingRef === entry.bookingRef ? { ...rw, payoutStatus: action.payoutStatus } : rw))
          : state.partnerReferralRewards,
        audit: [
          auditEntry(action.actor.name, action.actor.role, `payout_${action.payoutStatus}`, entry.bookingRef, `${entry.type} → ${action.payoutStatus}`),
          ...state.audit,
        ],
      };
    }
    case 'RECORD_REFUND': {
      const b = state.bookings.find(x => x.id === action.id);
      if (!b) return state;
      const at = nowIso();
      const updated: Booking = {
        ...b,
        status: 'refunded',
        refundStatus: 'processed',
        refundAmount: action.amount,
        timeline: [
          ...b.timeline,
          {
            at,
            label: 'Refund processed',
            actor: `${action.actor.name} (${action.actor.role})`,
            detail: `${formatNaira(action.amount)} · ${action.note}${action.providerRef ? ` · Ref ${action.providerRef}` : ''}`,
          },
        ],
      };
      const refundReversals: LedgerEntry[] = [];
      const reversedLedger = state.ledger.map(le => {
        if (
          le.bookingRef === b.ref &&
          (le.type === 'closing_agent_commission' || le.type === 'referral_reward' || le.type === 'partner_commission') &&
          (le.payoutStatus === 'pending' || le.payoutStatus === 'approved')
        ) {
          refundReversals.push({
            id: uid(),
            at,
            bookingRef: b.ref,
            propertyTitle: b.propertyTitle,
            type: le.type === 'referral_reward' ? 'referral_reversal' : 'commission_reversal',
            description: `Reversed due to refund (${action.note})`,
            amount: le.amount,
            status: 'reconciled',
            operator: action.actor.name,
            variance: 0,
            beneficiaryUserId: le.beneficiaryUserId,
            payoutStatus: 'reversed',
          });
          return { ...le, payoutStatus: 'reversed' as const };
        }
        return le;
      });
      const nextRewards = state.partnerReferralRewards.map(rw =>
        rw.bookingId === b.id && rw.payoutStatus !== 'paid' && rw.payoutStatus !== 'reversed'
          ? { ...rw, payoutStatus: 'reversed' as const, reversalReason: `refunded (${action.note})` }
          : rw,
      );
      const refundEntry: LedgerEntry = {
        id: uid(),
        at,
        bookingRef: b.ref,
        propertyTitle: b.propertyTitle,
        type: 'refund',
        description: `Guest refund processed — ${action.note}`,
        amount: action.amount,
        status: 'reconciled',
        providerRef: action.providerRef,
        operator: action.actor.name,
        variance: 0,
        note: action.note,
      };
      return {
        ...state,
        bookings: state.bookings.map(x => (x.id === action.id ? updated : x)),
        partnerReferralRewards: nextRewards,
        ledger: [refundEntry, ...refundReversals, ...reversedLedger],
        audit: [
          auditEntry(action.actor.name, action.actor.role, 'booking_refunded', b.ref, `Refunded ${formatNaira(action.amount)}: ${action.note}`),
          ...state.audit,
        ],
      };
    }
    case 'ADD_LEDGER':
      return { ...state, ledger: [...action.entries, ...state.ledger] };
    case 'RECONCILE_LEDGER': {
      const entry = state.ledger.find(x => x.id === action.id);
      if (!entry) return state;
      const updatedEntry: LedgerEntry = {
        ...entry,
        status: action.status,
        variance: action.variance,
        note: action.note ?? entry.note,
        operator: action.actor.name,
      };
      return {
        ...state,
        ledger: state.ledger.map(x => (x.id === action.id ? updatedEntry : x)),
        audit: [
          auditEntry(action.actor.name, action.actor.role, `ledger_${action.status}`, entry.bookingRef, `${entry.type} → ${action.status} · variance ${formatNaira(action.variance)}${action.note ? ` · ${action.note}` : ''}`),
          ...state.audit,
        ],
      };
    }
    case 'ADD_ISSUE':
      return { ...state, issues: [action.issue, ...state.issues] };
    case 'APPEND_ISSUE_EVIDENCE': {
      const targetIssue = state.issues.find(x => x.id === action.id);
      if (!targetIssue) return state;
      const at = nowIso();
      const updatedIssue: Issue = {
        ...targetIssue,
        evidence: [...targetIssue.evidence, action.evidenceNote],
        updatedAt: at,
        timeline: [
          ...targetIssue.timeline,
          { at, label: 'Evidence recorded', actor: action.actor.name, detail: action.evidenceNote },
        ],
      };
      return {
        ...state,
        issues: state.issues.map(x => (x.id === action.id ? updatedIssue : x)),
        audit: [
          auditEntry(action.actor.name, action.actor.role, 'issue_evidence_added', targetIssue.ref, `Evidence added: ${action.evidenceNote}`),
          ...state.audit,
        ],
      };
    }
    case 'SET_GUEST_STATUS': {
      const guest = state.accounts.find(a => a.id === action.guestId);
      if (!guest) return state;
      return {
        ...state,
        accounts: state.accounts.map(a =>
          a.id === action.guestId
            ? {
                ...a,
                accountStatus: action.status,
                suspensionReason: action.status === 'suspended' ? action.reason : undefined,
              }
            : a,
        ),
        audit: [
          auditEntry(
            action.actor.name,
            action.actor.role,
            action.status === 'suspended' ? 'guest_suspended' : 'guest_reinstated',
            guest.name,
            action.status === 'suspended'
              ? `Guest account suspended. Reason: ${action.reason}`
              : `Guest account reinstated to active. Note: ${action.reason}`,
          ),
          ...state.audit,
        ],
      };
    }
    case 'AUTHORIZE_ADMIN_EMAIL': {
      const normalized = action.email.trim().toLowerCase();
      const matched = state.accounts.find(a => a.email.toLowerCase() === normalized);
      const nextBootstrap: AdminBootstrapEmail = {
        email: normalized,
        note: action.note,
        addedBy: action.actor.userId,
        createdAt: nowIso(),
      };
      return {
        ...state,
        adminBootstrapEmails: [
          nextBootstrap,
          ...state.adminBootstrapEmails.filter(item => item.email !== normalized),
        ],
        accounts: matched
          ? state.accounts.map(a =>
              a.id === matched.id
                ? { ...a, role: 'admin' as const, accountStatus: 'active' as const, suspensionReason: undefined, company: a.company || 'HAMLET' }
                : a,
            )
          : state.accounts,
        audit: [
          auditEntry(
            action.actor.name,
            action.actor.role,
            matched ? 'admin_role_granted' : 'admin_email_preauthorized',
            normalized,
            matched
              ? `Existing account promoted to HAMLET admin. Reason: ${action.note}`
              : `Email pre-authorized for HAMLET admin access on sign-up. Reason: ${action.note}`,
          ),
          ...state.audit,
        ],
      };
    }
    case 'ISSUE_UPDATE': {
      const i = state.issues.find(x => x.id === action.id);
      if (!i) return state;
      const at = nowIso();
      const updated: Issue = {
        ...i, status: action.status, assignee: action.assignee ?? i.assignee,
        resolution: action.resolution ?? i.resolution, updatedAt: at,
        timeline: [...i.timeline, { at, label: `Status → ${action.status}`, actor: action.actor.name, detail: action.note }],
      };
      const label = action.status === 'escalated' ? 'issue_escalated' : action.status === 'resolved' || action.status === 'closed' ? 'issue_closed' : 'issue_updated';
      return {
        ...state,
        issues: state.issues.map(x => (x.id === action.id ? updated : x)),
        audit: [auditEntry(action.actor.name, action.actor.role, label, i.ref, action.note ?? `Status → ${action.status}`), ...state.audit],
      };
    }
    case 'REVIEW_APPLICATION':
      return {
        ...state,
        applications: state.applications.map(a => (a.id === action.id ? { ...a, status: action.status, reviewNote: action.note ?? a.reviewNote } : a)),
        audit: [auditEntry(action.actor.name, action.actor.role, 'partner_application_reviewed', action.id, `Status → ${action.status}${action.note ? ` · ${action.note}` : ''}`), ...state.audit],
      };
    case 'CREATE_PARTNER_FROM_APPLICATION': {
      const a = state.applications.find(x => x.id === action.applicationId);
      if (!a) return state;
      // idempotent: partner account may already exist
      const existing = state.accounts.find(x => x.email === a.email);
      const account: Account = existing ?? {
        id: uid(), name: a.name, email: a.email, password: 'demo1234', role: 'partner',
        partnerRole: a.role, company: a.company, phone: a.phone, createdAt: nowIso(),
      };
      return {
        ...state,
        accounts: existing ? state.accounts : [...state.accounts, account],
        applications: state.applications.map(x => (x.id === a.id ? { ...x, status: 'approved' } : x)),
        audit: [auditEntry(action.actor.name, action.actor.role, 'partner_approved', a.company, `Partner account created for ${a.name} (${a.role}). Temp password: demo1234`), ...state.audit],
      };
    }
    case 'ADD_ASSIGNMENT':
      return {
        ...state,
        assignments: [action.assignment, ...state.assignments],
        audit: [auditEntry(action.actorName, action.actorRole, 'assignment_granted', action.assignment.propertyTitle, `${action.assignment.partnerName} (${action.assignment.partnerRole}) — commission: ${action.assignment.commissionRate === null ? 'none agreed' : `${(action.assignment.commissionRate * 100).toFixed(1)}%`}`), ...state.audit],
      };
    case 'REVOKE_ASSIGNMENT': {
      const a = state.assignments.find(x => x.id === action.id);
      if (!a) return state;
      return {
        ...state,
        assignments: state.assignments.map(x => (x.id === action.id ? { ...x, status: 'revoked' as const, revokedAt: nowIso() } : x)),
        audit: [auditEntry(action.actor.name, action.actor.role, 'assignment_revoked', a.propertyTitle, `${a.partnerName} — access revoked`), ...state.audit],
      };
    }
    case 'ADD_FEEDBACK':
      return { ...state, feedback: [action.item, ...state.feedback] };
    case 'AUDIT':
      return { ...state, audit: [auditEntry(action.actor.name, action.actor.role, action.action, action.target, action.detail), ...state.audit] };
    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────
interface Store {
  state: DBState;
  backendConfigured: boolean;
  backendReady: boolean;
  backendError: string | null;
  passwordRecoveryPending: boolean;
  clearPasswordRecovery: () => void;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; role?: AccountRole; error?: string }>;
  signUpGuest: (input: { name: string; email: string; password: string; phone?: string }) => Promise<{ ok: boolean; role?: AccountRole; needsEmailConfirmation?: boolean; error?: string }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ ok: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ ok: boolean; error?: string }>;
  updateProfile: (input: { name: string; phone?: string; company?: string }) => Promise<{ ok: boolean; error?: string }>;
  registerPartner: (input: { name: string; email: string; phone: string; company: string; role: string; areas: string[]; propertiesCount: number; motivation: string; password?: string; referralCode?: string }) => Promise<{ ok: boolean; needsEmailConfirmation?: boolean; error?: string }>;
  resubmitPartnerApplication: (id: string, input: { name: string; phone: string; company: string; role: string; areas: string[]; propertiesCount: number; motivation: string; referralCode?: string }) => Promise<void>;
  uploadPropertyImage: (file: File) => Promise<string>;
  submitProperty: (input: Omit<Property, 'id' | 'status' | 'verification' | 'trustLabel' | 'docs' | 'assignedPartnerIds' | 'createdAt' | 'ownerId' | 'ownerName' | 'submittedBy' | 'submittedRole' | 'authorityBasis'> & Pick<Property, 'authorityBasis' | 'docs'> & Partial<Pick<Property, 'submittedRole'>> & { saveAsDraft?: boolean }) => Promise<{ ok: boolean; error?: string; property?: Property }>;
  updateAndResubmitProperty: (id: string, input: Omit<Property, 'id' | 'status' | 'verification' | 'trustLabel' | 'assignedPartnerIds' | 'createdAt' | 'ownerId' | 'ownerName' | 'submittedBy'> & { saveAsDraft?: boolean }, correctionNote?: string) => Promise<void>;
  updatePropertyAvailabilitySettings: (propertyId: string, input: { firstAvailableDate: string | null; availabilityConfirmationStatus: AvailabilityConfirmationStatus; calendarResponsiblePerson?: string }) => Promise<void>;
  addPropertyAvailabilityBlock: (propertyId: string, input: { startDate: string; endDate: string; blockType: AvailabilityBlockType; note?: string }) => Promise<void>;
  removePropertyAvailabilityBlock: (propertyId: string, blockId: string) => Promise<void>;
  setPropertyPublicationPause: (propertyId: string, paused: boolean, note?: string) => Promise<void>;
  reviewProperty: (id: string, status: Property['status'], note?: string, verification?: Property['verification']) => Promise<void>;
  setPartnerAccountStatus: (partnerId: string, status: 'active' | 'suspended', reason: string, cascadeSuspendProperties?: boolean) => Promise<void>;
  setGuestAccountStatus: (guestId: string, status: 'active' | 'suspended', reason: string) => Promise<void>;
  authorizeAdminEmail: (email: string, note: string) => Promise<{ promotedExisting: boolean }>;
  ensureMyReferralCode: () => Promise<string>;
  resolveReferralCode: (code: string) => Promise<{ valid: boolean; code: string; referrerName?: string; referrerCompany?: string }>;
  resolveReferralDispute: (referralId: string, status: ReferralRelationshipStatus, note: string, overrideWindowDays?: number) => Promise<void>;
  requestBooking: (input: { property: Property; guestId: string; guestName: string; guestEmail: string; checkIn: string; checkOut: string; guests: number; specialRequests?: string; quoteCurrency?: SupportedCurrency; closingAgentCode?: string; guestReferralSource?: string }) => Promise<{ ok: boolean; error?: string; booking?: Booking }>;
  refreshBookingFxQuote: (bookingId: string, quoteCurrency: SupportedCurrency) => Promise<void>;
  transitionCautionDeposit: (bookingId: string, status: CautionDepositStatus, opts?: { deductedAmountNgn?: number; refundedAmountNgn?: number; inspectionNotes?: string; deductionReason?: string; refundReference?: string; evidence?: string[] }) => Promise<void>;
  updateExchangeRateConfig: (input: { currency: 'USD' | 'GBP'; ngnPerUnit: number; source: string; quoteTtlMinutes?: number; isActive?: boolean; expiresAt?: string | null }) => Promise<void>;
  updatePayoutStatus: (entryId: string, payoutStatus: PayoutStatus, note?: string) => Promise<void>;
  bookingTransition: (id: string, to: Booking['status'], opts?: { note?: string; reason?: string }) => Promise<void>;
  retryBookingNotifications: (bookingId: string) => Promise<{ ok: boolean; sent: number; failed: number; error?: string }>;
  verifyPayment: (id: string) => void;
  initializeBookingCheckout: (bookingId: string, callbackUrl?: string) => Promise<{ authorizationUrl: string; reference: string }>;
  recordBookingRefund: (id: string, input: { amount: number; providerRef?: string; note: string }) => Promise<void>;
  reconcileLedgerEntry: (id: string, input: { status: LedgerEntry['status']; variance?: number; note?: string }) => Promise<void>;
  recordLedgerAdjustment: (input: { bookingId: string; type: LedgerEntry['type']; amount: number; status: LedgerEntry['status']; description: string; providerRef?: string; variance?: number; note?: string }) => Promise<void>;
  reportIssue: (input: { bookingRef?: string; propertyTitle?: string; category: Issue['category']; severity: Issue['severity']; subject: string; description: string; reporter: string; reporterType: Issue['reporterType']; evidence?: string[] }) => Promise<Issue>;
  appendIssueEvidence: (issueId: string, evidenceNote: string) => Promise<void>;
  updateIssue: (id: string, status: IssueStatus, opts?: { note?: string; assignee?: string; assigneeId?: string; resolution?: string }) => Promise<void>;
  reviewApplication: (id: string, status: PartnerApplication['status'], note?: string) => Promise<void>;
  approvePartner: (applicationId: string, note?: string) => Promise<void>;
  grantAssignment: (input: Omit<PartnerAssignment, 'id' | 'grantedAt' | 'status'>) => Promise<void>;
  revokeAssignment: (id: string, note?: string) => Promise<void>;
  submitBookingFeedback: (input: { bookingId: string; bookingRef: string; propertyTitle?: string; rating: number; category: string; text: string }) => Promise<void>;
  addFeedback: (item: Omit<FeedbackItem, 'id' | 'at'>) => void;
  getUnavailablePropertyIds: (checkIn: string, checkOut: string) => Promise<string[]>;
  refreshState: () => Promise<void>;
  resetDemo: () => void;
}

const StoreContext = createContext<Store | null>(null);

export function HamletProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined as unknown as DBState, initialState);
  const [backendReady, setBackendReady] = useState(!isSupabaseConfigured);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [passwordRecoveryPending, setPasswordRecoveryPending] = useState(false);

  useEffect(() => {
    captureUrlAttributionParams();
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let active = true;
    const load = async (user: SupabaseUser | null) => {
      try {
        const nextState = await loadSupabaseState(user);
        if (!active) return;
        dispatch({ type: 'HYDRATE', state: nextState });
        setBackendError(null);
      } catch (error) {
        if (active) setBackendError(error instanceof Error ? error.message : 'Could not load Supabase data.');
      } finally {
        if (active) setBackendReady(true);
      }
    };

    void client.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setBackendError(`Could not restore your Supabase session: ${error.message}`);
        setBackendReady(true);
        return;
      }
      void load(data.session?.user ?? null);
    });
    const { data: authListener } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecoveryPending(true);
      }
      window.setTimeout(() => { void load(session?.user ?? null); }, 0);
    });
    const expiryTimer = window.setInterval(() => {
      void (async () => {
        const { data, error: sessionError } = await client.auth.getSession();
        if (!active) return;
        if (sessionError) {
          setBackendError(`Could not check booking deadlines: ${sessionError.message}`);
          return;
        }
        if (!data.session) return;
        const { data: expiredCount, error } = await client.rpc('expire_overdue_bookings');
        if (!active) return;
        if (error) {
          setBackendError(`Could not process expired booking deadlines: ${error.message}`);
          return;
        }
        if (expiredCount > 0) void load(data.session.user);
      })();
    }, 60_000);
    return () => {
      active = false;
      window.clearInterval(expiryTimer);
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    const { session, ...rest } = state;
    try {
      // Passwords never persist — rehydrated accounts use the pilot demo credential.
      const sanitized = { ...rest, accounts: rest.accounts.map(a => ({ ...a, password: '' })) };
      localStorage.setItem(DB_KEY, JSON.stringify(sanitized));
      if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      else localStorage.removeItem(SESSION_KEY);
    } catch { /* storage full — app still works in-memory */ }
  }, [state]);

  const handleApplicationReview = useCallback(async (
    id: string,
    status: PartnerApplication['status'],
    note?: string,
    createDemoPartner = false,
  ) => {
    if (!state.session) return;
    if (supabase) {
      if (state.session.role !== 'admin') throw new Error('Only administrators can review partner applications.');
      if (status === 'pending') throw new Error('Applications cannot be moved back to pending.');
      const reviewerNote = note?.trim() ?? '';
      if (reviewerNote.length < 10) throw new Error('A reviewer note of at least 10 characters is required.');
      const { error } = await supabase.rpc('review_partner_application', {
        target_application_id: id,
        next_status: status,
        reviewer_note: reviewerNote,
      });
      if (error) throw new Error(`Could not review partner application: ${error.message}`);
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error(`Application decision saved, but refresh failed: ${authError.message}`);
      try {
        dispatch({ type: 'HYDRATE', state: await loadSupabaseState(authData.user) });
      } catch (refreshError) {
        const message = refreshError instanceof Error ? refreshError.message : 'The workspace could not refresh.';
        setBackendError(message);
        throw new Error(`Application decision was saved, but the admin queue could not refresh: ${message}`);
      }
      return;
    }

    dispatch({ type: 'REVIEW_APPLICATION', id, status, actor: state.session, note });
    if (createDemoPartner) dispatch({ type: 'CREATE_PARTNER_FROM_APPLICATION', applicationId: id, actor: state.session });
  }, [state.session]);

  const store = useMemo<Store>(() => ({
    state,
    backendConfigured: isSupabaseConfigured,
    backendReady,
    backendError,
    passwordRecoveryPending,
    clearPasswordRecovery: () => setPasswordRecoveryPending(false),
    signIn: async (email, password) => {
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) return { ok: false, error: error.message };
        try {
          const remote = await loadSupabaseState(data.user);
          dispatch({ type: 'HYDRATE', state: remote });
          setBackendError(null);
          return { ok: true, role: remote.session?.role };
        } catch (loadError) {
          await supabase.auth.signOut();
          return { ok: false, error: loadError instanceof Error ? loadError.message : 'Could not load your account.' };
        }
      }
      const account = state.accounts.find(a => a.email.toLowerCase() === email.trim().toLowerCase());
      if (!account) return { ok: false, error: 'No account found for that email.' };
      if (account.accountStatus === 'suspended') return { ok: false, error: 'This account has been suspended by HAMLET operations.' };
      if (account.password !== password) return { ok: false, error: 'Incorrect password. Try demo1234 for demo accounts.' };
      dispatch({ type: 'SIGN_IN', session: { userId: account.id, role: account.role, name: account.name, email: account.email, phone: account.phone, partnerRole: account.partnerRole, company: account.company, accountStatus: account.accountStatus ?? 'active', suspensionReason: account.suspensionReason } });
      return { ok: true, role: account.role };
    },
    signUpGuest: async ({ name, email, password, phone }) => {
      const trimmedName = name.trim();
      const normalizedEmail = email.trim().toLowerCase();
      const trimmedPhone = phone?.trim() ?? '';
      if (trimmedName.length < 2) return { ok: false, error: 'Enter your full name (at least 2 characters).' };
      if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) return { ok: false, error: 'Enter a valid email address.' };
      if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };

      if (supabase) {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              full_name: trimmedName,
              ...(trimmedPhone ? { phone: trimmedPhone } : {}),
            },
          },
        });
        if (error) return { ok: false, error: error.message };
        if (!data.session) return { ok: true, needsEmailConfirmation: true };
        try {
          const remote = await loadSupabaseState(data.user);
          dispatch({ type: 'HYDRATE', state: remote });
          return { ok: true, role: remote.session?.role };
        } catch (loadError) {
          return { ok: false, error: loadError instanceof Error ? loadError.message : 'Account was created but its profile could not be loaded.' };
        }
      }

      const preauthorizedAdmin = state.adminBootstrapEmails.some(item => item.email === normalizedEmail);
      if (state.accounts.some(a => a.email.toLowerCase() === normalizedEmail)) {
        return { ok: false, error: 'An account with that email already exists. Sign in instead.' };
      }
      const assignedRole: AccountRole = preauthorizedAdmin ? 'admin' : 'guest';
      const account: Account = {
        id: uid(),
        name: trimmedName,
        email: normalizedEmail,
        password,
        role: assignedRole,
        company: preauthorizedAdmin ? 'HAMLET' : undefined,
        phone: trimmedPhone || undefined,
        accountStatus: 'active',
        createdAt: nowIso(),
      };
      const session: Session = {
        userId: account.id,
        role: assignedRole,
        name: account.name,
        email: account.email,
        phone: account.phone,
        company: account.company,
        accountStatus: 'active',
      };
      dispatch({ type: 'REGISTER_GUEST', account, session });
      return { ok: true, role: assignedRole };
    },
    signOut: async () => {
      if (supabase) {
        const { error } = await supabase.auth.signOut();
        if (error) throw new Error(`Could not sign out: ${error.message}`);
        dispatch({ type: 'HYDRATE', state: await loadSupabaseState(null) });
        return;
      }
      dispatch({ type: 'SIGN_OUT' });
    },
    requestPasswordReset: async (email) => {
      const normalized = email.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(normalized)) {
        return { ok: false, error: 'Enter a valid email address.' };
      }
      if (supabase) {
        const redirectTo = `${window.location.origin}${window.location.pathname}#/signin?mode=reset`;
        const { error } = await supabase.auth.resetPasswordForEmail(normalized, { redirectTo });
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      }
      return { ok: true };
    },
    updatePassword: async (newPassword) => {
      if (newPassword.length < 6) {
        return { ok: false, error: 'New password must be at least 6 characters.' };
      }
      if (supabase) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) return { ok: false, error: error.message };
        setPasswordRecoveryPending(false);
        return { ok: true };
      }
      setPasswordRecoveryPending(false);
      return { ok: true };
    },
    updateProfile: async ({ name, phone, company }) => {
      const cleanName = name.trim();
      const cleanPhone = phone?.trim() ?? '';
      const cleanCompany = company?.trim();
      if (cleanName.length < 2) {
        return { ok: false, error: 'Enter your full name (at least 2 characters).' };
      }
      if (!state.session) {
        return { ok: false, error: 'Sign in before updating your profile.' };
      }
      if (supabase) {
        const { error } = await supabase.rpc('update_own_profile', {
          next_full_name: cleanName,
          next_phone: cleanPhone || null,
          next_company: cleanCompany ?? null,
        });
        if (error) return { ok: false, error: error.message };
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) return { ok: false, error: authError.message };
        dispatch({ type: 'HYDRATE', state: await loadSupabaseState(authData.user) });
        return { ok: true };
      }
      dispatch({ type: 'UPDATE_PROFILE', name: cleanName, phone: cleanPhone, company: cleanCompany });
      return { ok: true };
    },
    registerPartner: async (input) => {
      const normalizedRefCode = normalizeReferralCode(input.referralCode || getPersistedPartnerRefCode());
      if (supabase) {
        let applicantUserId = state.session?.userId;
        let applicantEmail = state.session?.email ?? input.email.trim().toLowerCase();

        if (!state.session) {
          if (!input.password || input.password.length < 6) {
            return { ok: false, error: 'Choose a password of at least 6 characters to create your HAMLET account.' };
          }
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: applicantEmail,
            password: input.password,
            options: {
              data: {
                full_name: input.name.trim(),
                phone: input.phone.trim(),
                ...(normalizedRefCode ? { referral_code: normalizedRefCode } : {}),
              },
            },
          });
          if (signUpError) return { ok: false, error: signUpError.message };
          if (!signUpData.session || !signUpData.user) {
            return { ok: true, needsEmailConfirmation: true };
          }
          applicantUserId = signUpData.user.id;
          applicantEmail = signUpData.user.email ?? applicantEmail;
        } else if (state.session.role !== 'guest') {
          return {
            ok: false,
            error:
              state.session.role === 'partner'
                ? 'Your account is already an approved HAMLET Partner. Open your Partner Workspace instead.'
                : 'Sign in with a non-admin account to submit a partner application.',
          };
        }

        if (state.applications.some(a => a.applicantId === applicantUserId && a.status === 'pending')) {
          return { ok: false, error: 'You already have a pending partner application under review.' };
        }

        const { error } = await supabase.from('partner_applications').insert({
          applicant_id: applicantUserId!,
          full_name: input.name.trim(),
          email: applicantEmail,
          phone: input.phone.trim(),
          company: input.company.trim(),
          role: input.role,
          areas: input.areas,
          properties_count: input.propertiesCount,
          motivation: input.motivation.trim(),
          referred_by_code: normalizedRefCode || null,
        });
        if (error) return { ok: false, error: error.message };
        clearPersistedPartnerRefCode();
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) return { ok: false, error: authError.message };
        try {
          dispatch({ type: 'HYDRATE', state: await loadSupabaseState(authData.user) });
        } catch (loadError) {
          setBackendError(loadError instanceof Error ? loadError.message : 'Application saved, but the workspace could not refresh.');
        }
        return { ok: true };
      }

      const referrerAccount = normalizedRefCode
        ? state.accounts.find(
            a =>
              a.role === 'partner' &&
              a.accountStatus !== 'suspended' &&
              normalizeReferralCode(a.referralCode) === normalizedRefCode &&
              a.email.toLowerCase() !== input.email.trim().toLowerCase(),
          )
        : undefined;
      if (normalizedRefCode && state.accounts.some(a => normalizeReferralCode(a.referralCode) === normalizedRefCode && a.email.toLowerCase() === input.email.trim().toLowerCase())) {
        return { ok: false, error: 'Self-referrals are not permitted.' };
      }
      const generatedOwnCode = buildPartnerReferralCode(
        input.name,
        `${input.email}-${Date.now()}`,
        new Set(state.accounts.map(a => normalizeReferralCode(a.referralCode)).filter(Boolean)),
      );
      const account: Account = {
        id: uid(), name: input.name, email: input.email, password: input.password || 'demo1234', role: 'partner',
        partnerRole: input.role, company: input.company, phone: input.phone,
        referralCode: generatedOwnCode,
        referredByPartnerId: referrerAccount?.id ?? null,
        referredByCode: referrerAccount ? normalizedRefCode : null,
        createdAt: nowIso(),
      };
      const application: PartnerApplication = {
        id: uid(), applicantId: account.id, ...input,
        referredByCode: referrerAccount ? normalizedRefCode : undefined,
        referredByPartnerId: referrerAccount?.id,
        submittedAt: nowIso(), status: 'pending',
      };
      const referral: PartnerReferral | undefined = referrerAccount
        ? {
            id: uid(),
            referrerPartnerId: referrerAccount.id,
            referrerName: referrerAccount.name,
            referredPartnerId: account.id,
            referredName: account.name,
            referredCompany: account.company,
            referralCode: normalizedRefCode,
            status: 'pending_verification',
            earningWindowDays: 90,
            registeredAt: nowIso(),
          }
        : undefined;
      clearPersistedPartnerRefCode();
      dispatch({ type: 'REGISTER_PARTNER', account, application, referral });
      return { ok: true };
    },
    resubmitPartnerApplication: async (id, input) => {
      if (!state.session) throw new Error('Sign in before updating your partner application.');
      const normalizedRef = input.referralCode !== undefined ? (normalizeReferralCode(input.referralCode) || null) : undefined;
      if (supabase) {
        const payload: Record<string, unknown> = {
          full_name: input.name.trim(),
          phone: input.phone.trim(),
          company: input.company.trim(),
          role: input.role,
          areas: input.areas,
          properties_count: input.propertiesCount,
          motivation: input.motivation.trim(),
        };
        if (normalizedRef !== undefined) {
          payload.referred_by_code = normalizedRef;
        }
        const { error } = await supabase.rpc('resubmit_partner_application', {
          target_application_id: id,
          application_data: payload,
        });
        if (error) throw new Error(`Could not resubmit application: ${error.message}`);
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw new Error(`Application updated, but refresh failed: ${authError.message}`);
        dispatch({ type: 'HYDRATE', state: await loadSupabaseState(authData.user) });
        return;
      }
      dispatch({
        type: 'RESUBMIT_PARTNER_APPLICATION',
        id,
        patch: {
          name: input.name.trim(),
          phone: input.phone.trim(),
          company: input.company.trim(),
          role: input.role,
          areas: input.areas,
          propertiesCount: input.propertiesCount,
          motivation: input.motivation.trim(),
          ...(normalizedRef !== undefined ? { referredByCode: normalizedRef } : {}),
        },
        actor: state.session,
      });
    },
    uploadPropertyImage: async (file) => {
      if (!state.session) throw new Error('Sign in before uploading property photos.');
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Only JPEG, PNG, and WebP property photos are supported.');
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Each photo must be 5 MB or smaller.');
      }
      if (supabase) {
        const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
        const objectPath = `${state.session.userId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('property-media')
          .upload(objectPath, file, { contentType: file.type, upsert: false });
        if (uploadError) {
          throw new Error(`Could not upload photo: ${uploadError.message}`);
        }
        const { data } = supabase.storage.from('property-media').getPublicUrl(objectPath);
        return data.publicUrl;
      }
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') resolve(reader.result);
          else reject(new Error('Could not read selected image.'));
        };
        reader.onerror = () => reject(new Error('Could not read selected image.'));
        reader.readAsDataURL(file);
      });
    },
    submitProperty: async (input) => {
      const s = state.session;
      const isDraft = Boolean(input.saveAsDraft);
      const effectiveAuthority =
        isDraft && (!input.authorityBasis || input.authorityBasis.trim().length < 9)
          ? 'Draft authority declaration pending completion'
          : input.authorityBasis;
      if (supabase) {
        if (!s || s.role !== 'partner') {
          return { ok: false, error: 'Only approved partner accounts can submit properties.' };
        }
        const { data: propertyId, error } = await supabase.rpc('submit_partner_property', {
          listing_data: {
            status: isDraft ? 'draft' : 'submitted',
            title: input.title,
            property_type: input.type,
            area: input.area,
            public_address: input.address,
            nightly_rate: input.nightlyRate,
            cleaning_fee: input.cleaningFee,
            mandatory_charges: input.mandatoryCharges,
            refundable_deposit: input.deposit,
            bedrooms: input.bedrooms,
            bathrooms: input.bathrooms,
            capacity: input.capacity,
            bed_setup: input.bedSetup,
            amenities: input.amenities,
            image_urls: input.images,
            house_rules: input.houseRules,
            first_available_date: input.firstAvailableDate ?? null,
            availability_confirmation_status:
              input.availabilityConfirmationStatus === 'needs_confirmation' ||
              input.availabilityConfirmationStatus === 'manual_confirmation' ||
              input.availabilityConfirmationStatus === 'unconfirmed'
                ? 'needs_confirmation'
                : 'confirmed',
            calendar_responsible_person: input.calendarResponsiblePerson ?? s.name,
            unavailable_blocks: (input.unavailableBlocks ?? []).map(b => ({
              start_date: b.startDate,
              end_date: b.endDate,
              block_type: b.blockType,
              note: b.note ?? '',
            })),
          },
          submission_data: {
            authority_basis: effectiveAuthority,
            submitted_role: input.submittedRole ?? s.partnerRole ?? 'Property partner',
            docs: input.docs,
          },
        });
        if (error) return { ok: false, error: `Could not submit property: ${error.message}` };
        try {
          const { data: authData, error: authError } = await supabase.auth.getUser();
          if (authError) throw authError;
          const fresh = await loadSupabaseState(authData.user);
          dispatch({ type: 'HYDRATE', state: fresh });
          const property = fresh.properties.find(item => item.id === propertyId);
          if (!property) throw new Error('The property was submitted but could not be found in your workspace.');
          return { ok: true, property };
        } catch (refreshError) {
          setBackendError(refreshError instanceof Error ? refreshError.message : 'Property submitted, but the workspace could not refresh.');
          return { ok: false, error: 'The property may have been submitted, but its status could not be refreshed. Check My properties before retrying.' };
        }
      }
      const property: Property = {
        ...input,
        id: `p-${uid().slice(0, 8)}`,
        status: isDraft ? 'draft' : 'submitted',
        trustLabel: isDraft ? 'Draft' : 'Under review',
        verification: { ownership: 'pending_review', identity: 'pending_review', authority: 'pending_review', inspection: 'missing' },
        docs: input.docs && input.docs.length > 0 ? input.docs : [
          { label: 'Certificate of occupancy / title deed', status: 'pending_review' },
          { label: 'Government-issued ID of owner', status: 'pending_review' },
          { label: 'Proof of authority / management mandate', status: 'pending_review' },
          { label: 'Property inspection report', status: 'missing' },
        ],
        assignedPartnerIds: s ? [s.userId] : [],
        ownerId: s?.userId ?? 'unknown',
        ownerName: s?.name ?? 'Partner',
        submittedBy: s?.name ?? 'Partner',
        submittedRole: input.submittedRole ?? s?.partnerRole ?? 'Partner',
        authorityBasis: effectiveAuthority ?? 'Submitted via partner portal — evidence under review',
        introducerPartnerId: s?.userId,
        managerPartnerId: s?.userId,
        availabilityConfirmationStatus: input.availabilityConfirmationStatus ?? 'manual_confirmation',
        firstAvailableDate: input.firstAvailableDate ?? null,
        calendarResponsiblePerson: input.calendarResponsiblePerson ?? s?.name ?? 'Partner',
        calendarResponsibleUserId: s?.userId,
        lastAvailabilityUpdate: nowIso(),
        unavailableBlocks: input.unavailableBlocks ?? [],
        createdAt: nowIso(),
      };
      dispatch({ type: 'ADD_PROPERTY', property });
      return { ok: true, property };
    },
    updatePropertyAvailabilitySettings: async (propertyId, input) => {
      if (!state.session) throw new Error('Sign in before updating property availability.');
      const normalizedConfirmation: 'confirmed' | 'needs_confirmation' =
        input.availabilityConfirmationStatus === 'needs_confirmation' ||
        input.availabilityConfirmationStatus === 'manual_confirmation' ||
        input.availabilityConfirmationStatus === 'unconfirmed'
          ? 'needs_confirmation'
          : 'confirmed';
      if (supabase) {
        const { error } = await supabase.rpc('update_property_availability_settings', {
          target_property_id: propertyId,
          next_first_available_date: input.firstAvailableDate,
          next_confirmation_status: normalizedConfirmation,
          next_responsible_person: input.calendarResponsiblePerson?.trim() || null,
        });
        if (error) throw new Error(`Could not update availability settings: ${error.message}`);
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw new Error(authError.message);
        dispatch({ type: 'HYDRATE', state: await loadSupabaseState(authData.user) });
        return;
      }
      dispatch({
        type: 'UPDATE_PROPERTY_AVAILABILITY',
        id: propertyId,
        firstAvailableDate: input.firstAvailableDate,
        availabilityConfirmationStatus: normalizedConfirmation,
        calendarResponsiblePerson: input.calendarResponsiblePerson,
        actor: state.session,
      });
    },
    addPropertyAvailabilityBlock: async (propertyId, input) => {
      if (!state.session) throw new Error('Sign in before adding calendar unavailable dates.');
      if (!input.startDate || !input.endDate || input.endDate <= input.startDate) {
        throw new Error('Block end date must be after start date.');
      }
      if (supabase) {
        const { error } = await supabase.rpc('add_property_availability_block', {
          target_property_id: propertyId,
          block_start: input.startDate,
          block_end: input.endDate,
          kind: input.blockType,
          block_source: state.session.role === 'admin' ? 'admin' : 'partner',
          block_note: input.note?.trim() || null,
        });
        if (error) throw new Error(`Could not add availability block: ${error.message}`);
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw new Error(authError.message);
        dispatch({ type: 'HYDRATE', state: await loadSupabaseState(authData.user) });
        return;
      }
      const clash = state.bookings.find(
        b =>
          b.propertyId === propertyId &&
          b.status === 'confirmed' &&
          b.checkIn < input.endDate &&
          b.checkOut > input.startDate,
      );
      if (clash) {
        throw new Error(`Cannot block dates overlapping confirmed HAMLET booking (${clash.ref}).`);
      }
      const block: PropertyAvailabilityBlock = {
        id: uid(),
        propertyId,
        startDate: input.startDate,
        endDate: input.endDate,
        blockType: input.blockType,
        note: input.note?.trim() || undefined,
        createdBy: state.session.userId,
        createdByName: state.session.name,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      dispatch({ type: 'ADD_AVAILABILITY_BLOCK', propertyId, block, actor: state.session });
    },
    removePropertyAvailabilityBlock: async (propertyId, blockId) => {
      if (!state.session) throw new Error('Sign in before removing a calendar block.');
      if (supabase) {
        const { error } = await supabase.rpc('remove_property_availability_block', {
          target_block_id: blockId,
        });
        if (error) throw new Error(`Could not remove calendar block: ${error.message}`);
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw new Error(authError.message);
        dispatch({ type: 'HYDRATE', state: await loadSupabaseState(authData.user) });
        return;
      }
      dispatch({ type: 'REMOVE_AVAILABILITY_BLOCK', propertyId, blockId, actor: state.session });
    },
    setPropertyPublicationPause: async (propertyId, paused, note) => {
      if (!state.session) throw new Error('Sign in before changing listing publication status.');
      if (supabase) {
        const { error } = await supabase.rpc('set_property_publication_pause', {
          target_property_id: propertyId,
          paused,
          pause_note: note?.trim() || null,
        });
        if (error) throw new Error(`Could not update publication status: ${error.message}`);
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw new Error(authError.message);
        dispatch({ type: 'HYDRATE', state: await loadSupabaseState(authData.user) });
        return;
      }
      dispatch({ type: 'SET_PROPERTY_PAUSE', propertyId, paused, note, actor: state.session });
    },
    reviewProperty: async (id, status, note, verification) => {
      if (!state.session) return;
      if (supabase) {
        const property = state.properties.find(item => item.id === id);
        if (!property) throw new Error('Property not found. Refresh the review queue and try again.');
        if (state.session.role === 'partner' && status === 'submitted') {
          const { error } = await supabase.rpc('resubmit_partner_property', { target_property_id: id });
          if (error) throw new Error(`Could not resubmit property: ${error.message}`);
        } else {
          if (state.session.role !== 'admin') throw new Error('Only administrators can record property review decisions.');
          if (!verification) throw new Error('Verification outcomes are required for a property review.');
        const reviewerNote = note?.trim() ?? '';
        if (reviewerNote.length < 10) throw new Error('A reviewer note of at least 10 characters is required.');
        const { error } = await supabase.rpc('review_partner_property', {
          target_property_id: id,
          next_status: status,
          reviewer_note: reviewerNote,
          verification_data: verification,
        });
        if (error) throw new Error(`Could not record property review: ${error.message}`);
        }
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw new Error(`Property status changed, but refresh failed: ${authError.message}`);
        try {
          dispatch({ type: 'HYDRATE', state: await loadSupabaseState(authData.user) });
        } catch (refreshError) {
          const message = refreshError instanceof Error ? refreshError.message : 'The workspace could not refresh.';
          setBackendError(message);
          throw new Error(`Property decision was saved, but the review queue could not refresh: ${message}`);
        }
        return;
      }
      dispatch({ type: 'PROPERTY_REVIEW', id, status, note, verification, actor: state.session });
    },
    requestBooking: async ({ property, guestId, guestName, guestEmail, checkIn, checkOut, guests, specialRequests, quoteCurrency = 'NGN', closingAgentCode, guestReferralSource }) => {
      const resolvedAgentCode = normalizeReferralCode(closingAgentCode || getPersistedClosingAgentCode());
      if (supabase) {
        if (!state.session || state.session.role !== 'guest') {
          return { ok: false, error: 'Sign in with a guest account to request this stay.' };
        }
        const nights = nightsBetween(checkIn, checkOut);
        if (nights <= 0) return { ok: false, error: 'Check-out must be after check-in.' };
        if (nights > 60) return { ok: false, error: 'Stays are limited to 60 nights.' };
        const todayLagos = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Africa/Lagos',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date());
        if (checkIn < todayLagos) return { ok: false, error: 'Check-in cannot be in the past.' };
        const pricing = calculateGuestPricing({
          accommodationSubtotal: nights * property.nightlyRate,
          mandatoryCharges: property.mandatoryCharges,
          refundableDeposit: property.deposit,
        });
        const reference = `HML-${crypto.randomUUID().slice(0, 12).toUpperCase()}`;
        const { data, error } = await supabase.from('bookings').insert({
          reference,
          property_id: property.id,
          guest_id: guestId,
          check_in: checkIn,
          check_out: checkOut,
          guest_count: guests,
          accommodation_subtotal: pricing.accommodationSubtotal,
          mandatory_charges: pricing.mandatoryCharges,
          mandatory_total: pricing.mandatoryChargesTotal,
          hamlet_guest_fee: pricing.hamletGuestServiceFee,
          guest_total: pricing.guestTotal,
          refundable_deposit: pricing.refundableDeposit,
          quote_currency: quoteCurrency,
          guest_referral_source: resolvedAgentCode || guestReferralSource?.trim() || null,
          special_requests: specialRequests,
        }).select('*').single();
        if (error) return { ok: false, error: error.message };
        // Non-blocking notification dispatch: booking creation must succeed even if email delivery fails.
        void invokeBookingNotificationsEdgeFunction(data.id);
        try {
          const { data: authData, error: authError } = await supabase.auth.getUser();
          if (authError) throw authError;
          const fresh = await loadSupabaseState(authData.user);
          dispatch({ type: 'HYDRATE', state: fresh });
          return { ok: true, booking: fresh.bookings.find(item => item.id === data.id) };
        } catch (loadError) {
          setBackendError(loadError instanceof Error ? loadError.message : 'Booking request saved but booking details could not refresh.');
          return { ok: false, error: 'Your booking request was saved, but its confirmation could not be loaded. Check your account before retrying.' };
        }
      }
      const nights = nightsBetween(checkIn, checkOut);
      if (nights <= 0) return { ok: false, error: 'Check-out must be after check-in.' };
      if (new Date(checkIn) < new Date(new Date().toDateString())) return { ok: false, error: 'Check-in cannot be in the past.' };
      if (property.firstAvailableDate && checkIn < property.firstAvailableDate) {
        return { ok: false, error: `This property is next available from ${property.firstAvailableDate}.` };
      }
      const blockClash = (property.unavailableBlocks ?? []).find(
        bl => bl.startDate < checkOut && bl.endDate > checkIn,
      );
      if (blockClash) {
        return { ok: false, error: 'Those dates are marked unavailable on the property calendar. Please choose different dates.' };
      }
      // Overlap prevention: no confirmed or awaiting_payment booking may overlap the requested range.
      const clash = state.bookings.find(b =>
        b.propertyId === property.id &&
        (b.status === 'confirmed' || b.status === 'awaiting_payment') &&
        new Date(b.checkIn) < new Date(checkOut) && new Date(b.checkOut) > new Date(checkIn));
      if (clash) return { ok: false, error: `Those dates conflict with an existing booking (${clash.ref}). Please choose different dates.` };

      const matchedAgent = resolvedAgentCode
        ? state.accounts.find(
            a =>
              a.role === 'partner' &&
              a.accountStatus !== 'suspended' &&
              normalizeReferralCode(a.referralCode) === resolvedAgentCode &&
              a.id !== guestId,
          )
        : undefined;
      const activeReferral = matchedAgent
        ? state.partnerReferrals.find(
            r =>
              r.referredPartnerId === matchedAgent.id &&
              r.status === 'active' &&
              (!r.eligibilityEndsAt || new Date(r.eligibilityEndsAt).getTime() >= Date.now()),
          )
        : undefined;

      const ownerListedPriceNgn = nights * property.nightlyRate;
      const pricing = calculateGuestPricing({
        accommodationSubtotal: ownerListedPriceNgn,
        mandatoryCharges: property.mandatoryCharges,
        refundableDeposit: property.deposit,
        hasClosingAgent: Boolean(matchedAgent),
        hasQualifyingDirectReferrer: Boolean(activeReferral),
      });
      const fxConfig = quoteCurrency !== 'NGN'
        ? state.exchangeRates.find(r => r.currency === quoteCurrency) ?? null
        : null;
      const fxQuote = calculateBookingCurrencyQuote({
        ownerListedPriceNgn,
        mandatoryChargesTotalNgn: pricing.mandatoryChargesTotal,
        refundableDepositNgn: pricing.refundableDeposit,
        quoteCurrency,
        exchangeRateConfig: fxConfig,
        hasClosingAgent: Boolean(matchedAgent),
        hasQualifyingDirectReferrer: Boolean(activeReferral),
      });

      const seq = 10 + state.bookings.length;
      const bookingId = uid();
      const bookingRef = `HML-2026-${String(seq).padStart(4, '0')}`;
      const booking: Booking = {
        id: bookingId, ref: bookingRef,
        propertyId: property.id, propertyTitle: property.title, area: property.area,
        guestId, guestName, guestEmail, checkIn, checkOut, nights, guests,
        ownerListedPriceNgn,
        domesticMarkupNgn: pricing.hamletGuestServiceFee,
        domesticGuestPriceNgn: pricing.domesticGuestPriceNgn,
        closingAgentCommissionNgn: pricing.allocation.closingAgentCommissionNgn,
        directReferrerRewardNgn: pricing.allocation.directReferrerRewardNgn,
        hamletAllocationNgn: pricing.allocation.hamletAllocationNgn,
        paymentReserveNgn: pricing.allocation.paymentReserveNgn,
        accommodationSubtotal: pricing.accommodationSubtotal,
        mandatoryCharges: pricing.mandatoryCharges,
        mandatoryTotal: pricing.mandatoryChargesTotal,
        hamletGuestFee: pricing.hamletGuestServiceFee,
        guestTotal: pricing.guestTotal,
        deposit: pricing.refundableDeposit,
        quoteCurrency: fxQuote.quoteCurrency,
        settlementCurrency: 'NGN',
        fxRatePair: fxQuote.fxRatePair ?? undefined,
        fxRate: fxQuote.fxRate ?? undefined,
        fxRateSource: fxQuote.fxRateSource ?? undefined,
        fxQuotedAt: fxQuote.fxQuotedAt ?? undefined,
        quoteExpiresAt: fxQuote.quoteExpiresAt ?? undefined,
        internationalConvertedBaseMinor: fxQuote.convertedBaseMinor ?? undefined,
        internationalBufferMinor: fxQuote.internationalBufferMinor ?? undefined,
        internationalBufferNgnEquiv: fxQuote.internationalBufferNgnEquiv,
        quotedStayTotalMinor: fxQuote.quotedStayTotalMinor,
        quotedGrandTotalMinor: fxQuote.quotedGrandTotalMinor,
        settlementTotalNgn: fxQuote.settlementTotalNgn,
        propertyIntroducerId: property.introducerPartnerId ?? property.ownerId,
        propertyManagerId: property.managerPartnerId ?? property.ownerId,
        closingAgentId: matchedAgent?.id ?? null,
        closingAgentName: matchedAgent?.name,
        closingAgentCode: matchedAgent ? resolvedAgentCode : null,
        directReferrerId: activeReferral?.referrerPartnerId ?? null,
        guestReferralSource: guestReferralSource?.trim() || null,
        status: 'requested', requestedAt: nowIso(), specialRequests,
        timeline: [{ at: nowIso(), label: 'Booking requested', actor: `Guest · ${guestName}`, detail: `Awaiting availability & terms check (${fxQuote.quoteCurrency} quote)` }],
      };
      const cautionDeposit: CautionDepositRecord | undefined = pricing.refundableDeposit > 0
        ? {
            id: uid(),
            bookingId,
            bookingRef,
            propertyId: property.id,
            propertyTitle: property.title,
            guestId,
            guestName,
            amountNgn: pricing.refundableDeposit,
            status: 'due',
            deductedAmountNgn: 0,
            refundedAmountNgn: 0,
            evidence: [],
            createdAt: nowIso(),
            updatedAt: nowIso(),
          }
        : undefined;
      dispatch({ type: 'ADD_BOOKING', booking, cautionDeposit });
      return { ok: true, booking };
    },
    bookingTransition: async (id, to, opts) => {
      if (!state.session) return;
      if (supabase) {
        const client = supabase;
        const { error } = await client.rpc('transition_booking', {
          target_booking_id: id,
          next_status: to,
          transition_note: opts?.reason ?? opts?.note ?? null,
        });
        if (error) throw new Error(`Could not update booking: ${error.message}`);
        if (to === 'awaiting_payment' || to === 'declined') {
          const isAdminSession = state.session.role === 'admin';
          void invokeBookingNotificationsEdgeFunction(id).then(async () => {
            if (!isAdminSession) return;
            try {
              const { data: latestAuth } = await client.auth.getUser();
              if (latestAuth.user) {
                dispatch({ type: 'HYDRATE', state: await loadSupabaseState(latestAuth.user) });
              }
            } catch { /* non-fatal background refresh */ }
          });
        }
        const { data: authData, error: authError } = await client.auth.getUser();
        if (authError) throw new Error(`Booking updated, but refresh failed: ${authError.message}`);
        try {
          dispatch({ type: 'HYDRATE', state: await loadSupabaseState(authData.user) });
        } catch (refreshError) {
          const message = refreshError instanceof Error ? refreshError.message : 'The workspace could not refresh.';
          setBackendError(message);
          throw new Error(`Booking updated, but booking details could not refresh: ${message}`);
        }
        return;
      }
      dispatch({ type: 'BOOKING_TRANSITION', id, to, actor: state.session, note: opts?.note, reason: opts?.reason });
    },
    retryBookingNotifications: async (bookingId) => {
      if (!state.session) {
        return { ok: false, sent: 0, failed: 0, error: 'Sign in before retrying notifications.' };
      }
      const res = await invokeBookingNotificationsEdgeFunction(bookingId, { forceRetry: true });
      if (supabase) {
        try {
          const { data: authData } = await supabase.auth.getUser();
          if (authData.user) {
            dispatch({ type: 'HYDRATE', state: await loadSupabaseState(authData.user) });
          }
        } catch { /* keep dispatch result */ }
      }
      return res;
    },
    verifyPayment: (id) => {
      if (supabase) {
        setBackendError('Online payments are confirmed exclusively via verified Paystack server webhooks.');
        return;
      }
      if (!state.session) return;
      const b = state.bookings.find(x => x.id === id);
      if (!b) return;
      const providerRef = `PSK_webhook_${uid().slice(0, 10)}`;
      dispatch({ type: 'VERIFY_PAYMENT', id, actor: state.session, providerRef, provider: 'Paystack' });
    },
    recordBookingRefund: async (id, input) => {
      if (!state.session) throw new Error('Sign in before recording a booking refund.');
      const trimmedNote = input.note.trim();
      if (trimmedNote.length < 8) throw new Error('A refund note (min 8 characters) is required.');
      const amount = Math.round(input.amount);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error('Refund amount must be a positive Naira value.');
      if (supabase) {
        const { error } = await supabase.rpc('record_booking_refund', {
          target_booking_id: id,
          refund_amount_naira: amount,
          provider_ref: input.providerRef?.trim() || null,
          refund_note: trimmedNote,
        });
        if (error) throw new Error(`Could not record refund: ${error.message}`);
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw new Error(`Refund recorded, but refresh failed: ${authError.message}`);
        dispatch({ type: 'HYDRATE', state: await loadSupabaseState(authData.user) });
        return;
      }
      dispatch({
        type: 'RECORD_REFUND',
        id,
        actor: state.session,
        amount,
        providerRef: input.providerRef?.trim() || undefined,
        note: trimmedNote,
      });
    },
    reconcileLedgerEntry: async (id, input) => {
      if (!state.session) throw new Error('Sign in before reconciling ledger entries.');
      const variance = Math.round(input.variance ?? 0);
      const trimmedNote = input.note?.trim() || undefined;
      if ((input.status === 'flagged' || variance !== 0) && (!trimmedNote || trimmedNote.length < 8)) {
        throw new Error('A reconciliation note (min 8 characters) is required when flagging or recording a variance.');
      }
      if (supabase) {
        const { error } = await supabase.rpc('reconcile_ledger_entry', {
          target_entry_id: id,
          next_status: input.status,
          next_variance: variance,
          reconciliation_note: trimmedNote ?? null,
        });
        if (error) throw new Error(`Could not reconcile ledger entry: ${error.message}`);
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw new Error(`Ledger entry updated, but refresh failed: ${authError.message}`);
        dispatch({ type: 'HYDRATE', state: await loadSupabaseState(authData.user) });
        return;
      }
      dispatch({
        type: 'RECONCILE_LEDGER',
        id,
        actor: state.session,
        status: input.status,
        variance,
        note: trimmedNote,
      });
    },
    reportIssue: async (input) => {
      if (supabase) {
        if (!state.session) throw new Error('Sign in before reporting a booking issue.');
        const booking = state.bookings.find(item => item.ref === input.bookingRef || item.id === input.bookingRef);
        if (!booking) throw new Error('Could not find that booking. Refresh your bookings and try again.');
        const { data: createdId, error } = await supabase.rpc('report_booking_issue', {
          target_booking_id: booking.id,
          issue_category: input.category,
          issue_severity: input.severity,
          issue_subject: input.subject.trim(),
          issue_description: input.description.trim(),
          evidence_items: input.evidence ?? [],
        });
        if (error) throw new Error(`Could not report the issue: ${error.message}`);
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw new Error(`Issue saved, but refresh failed: ${authError.message}`);
        const fresh = await loadSupabaseState(authData.user);
        dispatch({ type: 'HYDRATE', state: fresh });
        const created = fresh.issues.find(i => i.id === createdId) ?? fresh.issues[0];
        if (!created) throw new Error('Issue reported, but could not load updated issue record.');
        return created;
      }
      const seq = 7 + state.issues.length;
      const issue: Issue = {
        id: uid(), ref: `HML-IS-${String(seq).padStart(4, '0')}`, ...input,
        status: 'open', createdAt: nowIso(), updatedAt: nowIso(),
        evidence: input.evidence ?? [],
        timeline: [{ at: nowIso(), label: `Issue reported (${input.reporterType})`, actor: input.reporter }],
      };
      dispatch({ type: 'ADD_ISSUE', issue });
      return issue;
    },
    appendIssueEvidence: async (issueId, evidenceNote) => {
      if (!state.session) throw new Error('Sign in before attaching issue evidence.');
      const cleanNote = evidenceNote.trim();
      if (cleanNote.length < 4) throw new Error('Provide an evidence description of at least 4 characters.');
      if (supabase) {
        const { error } = await supabase.rpc('append_issue_evidence', {
          target_issue_id: issueId,
          evidence_note: cleanNote,
        });
        if (error) throw new Error(`Could not record evidence: ${error.message}`);
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw new Error(`Evidence recorded, but refresh failed: ${authError.message}`);
        dispatch({ type: 'HYDRATE', state: await loadSupabaseState(authData.user) });
        return;
      }
      dispatch({ type: 'APPEND_ISSUE_EVIDENCE', id: issueId, evidenceNote: cleanNote, actor: state.session });
    },
    updateIssue: async (id, status, opts) => {
      if (!state.session) throw new Error('Sign in before updating an issue.');
      if (supabase) {
        const { error } = await supabase.rpc('transition_booking_issue', {
          target_issue_id: id,
          next_status: status,
          action_note: opts?.note?.trim() || null,
          next_assignee_id: opts?.assigneeId ?? (status === 'assigned' ? state.session.userId : null),
          next_assignee_name: opts?.assignee?.trim() || null,
          resolution_summary: opts?.resolution?.trim() || null,
        });
        if (error) throw new Error(`Could not update issue: ${error.message}`);
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw new Error(`Issue updated, but refresh failed: ${authError.message}`);
        dispatch({ type: 'HYDRATE', state: await loadSupabaseState(authData.user) });
        return;
      }
      dispatch({ type: 'ISSUE_UPDATE', id, status, actor: state.session, note: opts?.note, assignee: opts?.assignee, resolution: opts?.resolution });
    },
    reviewApplication: (id, status, note) => handleApplicationReview(id, status, note),
    approvePartner: (id, note) => handleApplicationReview(id, 'approved', note ?? 'Partner application approved after manual review.', true),
    grantAssignment: async (input) => {
      const actor = state.session;
      if (!actor) throw new Error('Sign in as an administrator before granting property assignments.');
      if (supabase) {
        const { error } = await supabase.rpc('grant_property_assignment', {
          target_property_id: input.propertyId,
          target_partner_id: input.partnerId,
          authority_scope: input.scope.trim(),
          agreed_commission_rate: input.commissionRate,
          agreed_commission_note: input.commissionNote.trim(),
        });
        if (error) throw new Error(`Could not grant assignment: ${error.message}`);
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw new Error(`Assignment granted, but refresh failed: ${authError.message}`);
        dispatch({ type: 'HYDRATE', state: await loadSupabaseState(authData.user) });
        return;
      }
      dispatch({ type: 'ADD_ASSIGNMENT', assignment: { ...input, id: uid(), grantedAt: nowIso(), status: 'active' }, actorName: actor.name, actorRole: actor.role });
    },
    revokeAssignment: async (id, note) => {
      if (!state.session) throw new Error('Sign in before revoking a property assignment.');
      const target = state.assignments.find(item => item.id === id);
      if (!target) throw new Error('Property assignment not found.');
      if (supabase) {
        const { error } = await supabase.rpc('revoke_property_assignment', {
          target_property_id: target.propertyId,
          target_partner_id: target.partnerId,
          revocation_note: note?.trim() || null,
        });
        if (error) throw new Error(`Could not revoke assignment: ${error.message}`);
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw new Error(`Assignment revoked, but refresh failed: ${authError.message}`);
        dispatch({ type: 'HYDRATE', state: await loadSupabaseState(authData.user) });
        return;
      }
      dispatch({ type: 'REVOKE_ASSIGNMENT', id, actor: state.session });
    },
    updateAndResubmitProperty: async (id, input, correctionNote) => {
      if (!state.session) throw new Error('Sign in before editing a property.');
      if (state.session.accountStatus === 'suspended') {
        throw new Error('Your partner account is currently suspended. Contact HAMLET operations.');
      }
      const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
      const duplicate = state.properties.find(
        other =>
          other.id !== id &&
          other.status !== 'rejected' &&
          other.status !== 'archived' &&
          normalize(other.area) === normalize(input.area) &&
          normalize(other.address) === normalize(input.address) &&
          normalize(other.title) === normalize(input.title),
      );
      if (duplicate) {
        throw new Error('A listing with this title and address already exists in this area.');
      }
      if (supabase) {
        const { error } = await supabase.rpc('update_and_resubmit_partner_property', {
          target_property_id: id,
          listing_data: {
            save_as_draft: Boolean(input.saveAsDraft),
            title: input.title,
            property_type: input.type,
            area: input.area,
            public_address: input.address,
            nightly_rate: input.nightlyRate,
            cleaning_fee: input.cleaningFee,
            mandatory_charges: input.mandatoryCharges,
            refundable_deposit: input.deposit,
            bedrooms: input.bedrooms,
            bathrooms: input.bathrooms,
            capacity: input.capacity,
            bed_setup: input.bedSetup,
            amenities: input.amenities,
            image_urls: input.images,
            house_rules: input.houseRules,
            first_available_date: input.firstAvailableDate ?? null,
            availability_confirmation_status: input.availabilityConfirmationStatus ?? 'manual_confirmation',
            calendar_responsible_person: input.calendarResponsiblePerson ?? state.session.name,
          },
          submission_data: {
            authority_basis: input.authorityBasis,
            submitted_role: input.submittedRole || state.session.partnerRole || 'Property partner',
            docs: input.docs.map(doc => ({
              label: doc.label,
              status: doc.status === 'missing' ? 'missing' : 'self_reported',
            })),
          },
          correction_note: correctionNote?.trim() || null,
        });
        if (error) throw new Error(`Could not save corrections: ${error.message}`);
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw new Error(`Corrections saved, but refresh failed: ${authError.message}`);
        dispatch({ type: 'HYDRATE', state: await loadSupabaseState(authData.user) });
        return;
      }
      dispatch({
        type: 'UPDATE_AND_RESUBMIT_PROPERTY',
        id,
        patch: input,
        actor: state.session,
        note: correctionNote?.trim() || undefined,
        saveAsDraft: Boolean(input.saveAsDraft),
      });
    },
    setPartnerAccountStatus: async (partnerId, status, reason, cascadeSuspendProperties = true) => {
      if (!state.session || state.session.role !== 'admin') {
        throw new Error('Only administrators can suspend or reinstate partner accounts.');
      }
      const trimmedReason = reason.trim();
      if (trimmedReason.length < 10) {
        throw new Error('A documented reason of at least 10 characters is required.');
      }
      if (supabase) {
        const { error } = await supabase.rpc('set_partner_account_status', {
          target_partner_id: partnerId,
          next_status: status,
          reason_note: trimmedReason,
          cascade_suspend_properties: cascadeSuspendProperties,
        });
        if (error) throw new Error(`Could not update partner status: ${error.message}`);
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw new Error(`Partner status updated, but refresh failed: ${authError.message}`);
        dispatch({ type: 'HYDRATE', state: await loadSupabaseState(authData.user) });
        return;
      }
      dispatch({
        type: 'SET_PARTNER_STATUS',
        partnerId,
        status,
        reason: trimmedReason,
        cascadeSuspend: cascadeSuspendProperties,
        actor: state.session,
      });
    },
    setGuestAccountStatus: async (guestId, status, reason) => {
      if (!state.session || state.session.role !== 'admin') {
        throw new Error('Only administrators can suspend or reinstate guest accounts.');
      }
      const trimmedReason = reason.trim();
      if (trimmedReason.length < 10) {
        throw new Error('A documented reason of at least 10 characters is required.');
      }
      if (supabase) {
        const { error } = await supabase.rpc('set_guest_account_status', {
          target_guest_id: guestId,
          next_status: status,
          reason_note: trimmedReason,
        });
        if (error) throw new Error(`Could not update guest account status: ${error.message}`);
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw new Error(`Guest status updated, but refresh failed: ${authError.message}`);
        dispatch({ type: 'HYDRATE', state: await loadSupabaseState(authData.user) });
        return;
      }
      dispatch({
        type: 'SET_GUEST_STATUS',
        guestId,
        status,
        reason: trimmedReason,
        actor: state.session,
      });
    },
    authorizeAdminEmail: async (email, note) => {
      if (!state.session || state.session.role !== 'admin') {
        throw new Error('Only administrators can authorize admin operators.');
      }
      const cleanEmail = email.trim().toLowerCase();
      const cleanNote = note.trim();
      if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
        throw new Error('Enter a valid operator email address.');
      }
      if (cleanNote.length < 10) {
        throw new Error('Provide a documented reason of at least 10 characters.');
      }
      if (supabase) {
        const { data, error } = await supabase.rpc('authorize_admin_email', {
          target_email: cleanEmail,
          reason_note: cleanNote,
        });
        if (error) throw new Error(`Could not authorize admin email: ${error.message}`);
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw new Error(`Admin authorization saved, but refresh failed: ${authError.message}`);
        dispatch({ type: 'HYDRATE', state: await loadSupabaseState(authData.user) });
        const payload = (data ?? {}) as { promoted_existing?: boolean };
        return { promotedExisting: Boolean(payload.promoted_existing) };
      }
      const promotedExisting = state.accounts.some(a => a.email.toLowerCase() === cleanEmail);
      dispatch({ type: 'AUTHORIZE_ADMIN_EMAIL', email: cleanEmail, note: cleanNote, actor: state.session });
      return { promotedExisting };
    },
    initializeBookingCheckout: async (bookingId, callbackUrl) => {
      if (!supabase) {
        throw new Error('Server checkout initialization is only used in connected Supabase mode.');
      }
      const { data, error } = await supabase.functions.invoke<{
        ok?: boolean;
        authorization_url?: string;
        reference?: string;
        error?: string;
      }>('paystack-initialize', {
        body: {
          booking_id: bookingId,
          callback_url: callbackUrl ?? `${window.location.origin}${window.location.pathname}#/account?payment=returned`,
        },
      });
      if (error) {
        const detailedError = await extractEdgeFunctionError(
          error,
          'Online checkout is awaiting live Paystack merchant configuration. Do not pay outside HAMLET.',
        );
        throw new Error(detailedError);
      }
      if (!data?.ok || !data.authorization_url || !data.reference) {
        throw new Error(
          data?.error ?? 'Online checkout is awaiting live Paystack merchant configuration. Do not pay outside HAMLET.',
        );
      }
      return { authorizationUrl: data.authorization_url, reference: data.reference };
    },
    recordLedgerAdjustment: async (input) => {
      if (!state.session || state.session.role !== 'admin') {
        throw new Error('Only administrators can record manual ledger adjustments.');
      }
      const desc = input.description.trim();
      if (desc.length < 8) throw new Error('Provide a description of at least 8 characters.');
      const amount = Math.round(input.amount);
      if (!Number.isFinite(amount) || amount < 0) throw new Error('Amount must be a non-negative Naira value.');
      const variance = Math.round(input.variance ?? 0);
      const note = input.note?.trim() || undefined;
      if (supabase) {
        const { error } = await supabase.rpc('record_ledger_adjustment', {
          target_booking_id: input.bookingId,
          entry_type: input.type,
          entry_amount: amount,
          entry_status: input.status,
          entry_description: desc,
          provider_ref: input.providerRef?.trim() || null,
          entry_variance: variance,
          entry_note: note ?? null,
        });
        if (error) throw new Error(`Could not record ledger adjustment: ${error.message}`);
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw new Error(`Ledger entry recorded, but refresh failed: ${authError.message}`);
        dispatch({ type: 'HYDRATE', state: await loadSupabaseState(authData.user) });
        return;
      }
      const booking = state.bookings.find(b => b.id === input.bookingId || b.ref === input.bookingId);
      if (!booking) throw new Error('Booking not found for ledger adjustment.');
      const entry: LedgerEntry = {
        id: uid(),
        at: nowIso(),
        bookingRef: booking.ref,
        propertyTitle: booking.propertyTitle,
        type: input.type,
        description: desc,
        amount,
        status: input.status,
        providerRef: input.providerRef?.trim() || undefined,
        operator: state.session.name,
        variance,
        note,
      };
      dispatch({ type: 'ADD_LEDGER', entries: [entry] });
      dispatch({
        type: 'AUDIT',
        actor: state.session,
        action: 'ledger_manual_adjustment',
        target: booking.ref,
        detail: `Recorded ${input.type} (${formatNaira(amount)}, status=${input.status}): ${desc}`,
      });
    },
    submitBookingFeedback: async (input) => {
      if (!state.session || state.session.role !== 'guest') {
        throw new Error('Sign in as the booking guest to submit private feedback.');
      }
      const cleanText = input.text.trim();
      if (cleanText.length < 5) {
        throw new Error('Please write at least 5 characters of private feedback.');
      }
      if (state.feedback.some(f => f.bookingRef === input.bookingRef)) {
        throw new Error('Private feedback has already been submitted for this stay.');
      }
      if (supabase) {
        const { error } = await supabase.rpc('submit_booking_feedback', {
          target_booking_id: input.bookingId,
          feedback_rating: input.rating,
          feedback_category: input.category,
          feedback_comment: cleanText,
        });
        if (error) throw new Error(`Could not submit feedback: ${error.message}`);
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw new Error(`Feedback saved, but refresh failed: ${authError.message}`);
        dispatch({ type: 'HYDRATE', state: await loadSupabaseState(authData.user) });
        return;
      }
      dispatch({
        type: 'ADD_FEEDBACK',
        item: {
          id: uid(),
          at: nowIso(),
          bookingRef: input.bookingRef,
          propertyTitle: input.propertyTitle,
          guestName: state.session.name,
          rating: input.rating,
          category: input.category,
          text: cleanText,
        },
      });
      dispatch({
        type: 'AUDIT',
        actor: state.session,
        action: 'guest_feedback_submitted',
        target: input.bookingRef,
        detail: `Private pilot feedback (${input.rating}/5 · ${input.category}) recorded.`,
      });
    },
    ensureMyReferralCode: async () => {
      if (!state.session) throw new Error('Sign in before requesting a partner referral code.');
      if (supabase) {
        const { data, error } = await supabase.rpc('ensure_my_referral_code');
        if (error) throw new Error(`Could not obtain referral code: ${error.message}`);
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (!authError) {
          dispatch({ type: 'HYDRATE', state: await loadSupabaseState(authData.user) });
        }
        return String(data);
      }
      const existing = state.accounts.find(a => a.id === state.session?.userId)?.referralCode;
      if (existing) return existing;
      return buildPartnerReferralCode(state.session.name, state.session.userId);
    },
    resolveReferralCode: async (code) => {
      const normalized = normalizeReferralCode(code);
      if (!normalized) return { valid: false, code: '' };
      if (supabase) {
        const { data, error } = await supabase.rpc('resolve_referral_code', { code_input: normalized });
        if (error || !data) return { valid: false, code: normalized };
        const payload = data as {
          valid?: boolean;
          code?: string;
          referral_code?: string;
          partner_name?: string;
          referrer_name?: string;
          company?: string;
          referrer_company?: string;
        };
        return {
          valid: Boolean(payload.valid),
          code: payload.referral_code ?? payload.code ?? normalized,
          referrerName: payload.partner_name ?? payload.referrer_name,
          referrerCompany: payload.company ?? payload.referrer_company,
        };
      }
      const partner = state.accounts.find(
        a =>
          a.role === 'partner' &&
          a.accountStatus !== 'suspended' &&
          normalizeReferralCode(a.referralCode) === normalized,
      );
      if (!partner) return { valid: false, code: normalized };
      return {
        valid: true,
        code: normalized,
        referrerName: partner.name,
        referrerCompany: partner.company,
      };
    },
    resolveReferralDispute: async (referralId, status, note, overrideWindowDays) => {
      if (!state.session || state.session.role !== 'admin') {
        throw new Error('Only administrators can resolve referral attribution disputes.');
      }
      const trimmedNote = note.trim();
      if (trimmedNote.length < 10) {
        throw new Error('Provide an attribution resolution note of at least 10 characters.');
      }
      if (supabase) {
        const { error } = await supabase.rpc('admin_resolve_referral_dispute', {
          target_referral_id: referralId,
          next_status: status,
          resolution_note: trimmedNote,
          override_window_days: overrideWindowDays ?? null,
        });
        if (error) throw new Error(`Could not resolve referral dispute: ${error.message}`);
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw new Error(authError.message);
        dispatch({ type: 'HYDRATE', state: await loadSupabaseState(authData.user) });
        return;
      }
      dispatch({
        type: 'RESOLVE_REFERRAL_DISPUTE',
        referralId,
        status,
        note: trimmedNote,
        overrideWindowDays,
        actor: state.session,
      });
    },
    refreshBookingFxQuote: async (bookingId, quoteCurrency) => {
      if (!state.session) throw new Error('Sign in before refreshing a booking currency quote.');
      if (supabase) {
        const { error } = await supabase.rpc('refresh_booking_fx_quote', {
          target_booking_id: bookingId,
          target_currency: quoteCurrency,
        });
        if (error) throw new Error(`Could not refresh currency quote: ${error.message}`);
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw new Error(authError.message);
        dispatch({ type: 'HYDRATE', state: await loadSupabaseState(authData.user) });
        return;
      }
      const booking = state.bookings.find(b => b.id === bookingId);
      if (!booking) throw new Error('Booking not found.');
      const fxConfig = quoteCurrency !== 'NGN'
        ? state.exchangeRates.find(r => r.currency === quoteCurrency) ?? null
        : null;
      const fxQuote = calculateBookingCurrencyQuote({
        ownerListedPriceNgn: booking.ownerListedPriceNgn ?? booking.accommodationSubtotal,
        mandatoryChargesTotalNgn: booking.mandatoryTotal,
        refundableDepositNgn: booking.deposit,
        quoteCurrency,
        exchangeRateConfig: fxConfig,
        hasClosingAgent: Boolean(booking.closingAgentId),
        hasQualifyingDirectReferrer: Boolean(booking.directReferrerId),
      });
      dispatch({
        type: 'REFRESH_BOOKING_QUOTE',
        bookingId,
        patch: {
          quoteCurrency: fxQuote.quoteCurrency,
          fxRatePair: fxQuote.fxRatePair ?? undefined,
          fxRate: fxQuote.fxRate ?? undefined,
          fxRateSource: fxQuote.fxRateSource ?? undefined,
          fxQuotedAt: fxQuote.fxQuotedAt ?? undefined,
          quoteExpiresAt: fxQuote.quoteExpiresAt ?? undefined,
          internationalConvertedBaseMinor: fxQuote.convertedBaseMinor ?? undefined,
          internationalBufferMinor: fxQuote.internationalBufferMinor ?? undefined,
          internationalBufferNgnEquiv: fxQuote.internationalBufferNgnEquiv,
          quotedStayTotalMinor: fxQuote.quotedStayTotalMinor,
          quotedGrandTotalMinor: fxQuote.quotedGrandTotalMinor,
          settlementTotalNgn: fxQuote.settlementTotalNgn,
        },
      });
    },
    transitionCautionDeposit: async (bookingId, status, opts) => {
      if (!state.session) throw new Error('Sign in before updating a caution deposit.');
      if (supabase) {
        const { error } = await supabase.rpc('transition_caution_deposit', {
          target_booking_id: bookingId,
          next_status: status,
          deducted_ngn: opts?.deductedAmountNgn ?? 0,
          refunded_ngn: opts?.refundedAmountNgn ?? 0,
          inspection_note: opts?.inspectionNotes?.trim() || null,
          deduction_note: opts?.deductionReason?.trim() || null,
          refund_ref: opts?.refundReference?.trim() || null,
          evidence_items: opts?.evidence ?? null,
        });
        if (error) throw new Error(`Could not update caution deposit: ${error.message}`);
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw new Error(authError.message);
        dispatch({ type: 'HYDRATE', state: await loadSupabaseState(authData.user) });
        return;
      }
      dispatch({
        type: 'TRANSITION_CAUTION_DEPOSIT',
        bookingId,
        status,
        deductedAmountNgn: opts?.deductedAmountNgn,
        refundedAmountNgn: opts?.refundedAmountNgn,
        inspectionNotes: opts?.inspectionNotes,
        deductionReason: opts?.deductionReason,
        refundReference: opts?.refundReference,
        evidence: opts?.evidence,
        actor: state.session,
      });
    },
    updateExchangeRateConfig: async (input) => {
      if (!state.session || state.session.role !== 'admin') {
        throw new Error('Only administrators can configure FX exchange rates.');
      }
      if (!Number.isFinite(input.ngnPerUnit) || input.ngnPerUnit <= 0) {
        throw new Error('Exchange rate must be a positive number of Naira per unit.');
      }
      if (supabase) {
        const { error } = await supabase.rpc('upsert_exchange_rate_config', {
          target_currency: input.currency,
          next_ngn_per_unit: input.ngnPerUnit,
          rate_source: input.source.trim(),
          next_is_active: input.isActive ?? true,
          next_expires_at: input.expiresAt ?? null,
        });
        if (error) throw new Error(`Could not update exchange rate: ${error.message}`);
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw new Error(authError.message);
        dispatch({ type: 'HYDRATE', state: await loadSupabaseState(authData.user) });
        return;
      }
      const config: ExchangeRateConfig = {
        currency: input.currency,
        currencyPair: `${input.currency}_NGN`,
        ngnPerUnit: input.ngnPerUnit,
        source: input.source.trim(),
        quoteTtlMinutes: input.quoteTtlMinutes ?? 30,
        isActive: input.isActive ?? true,
        quotedAt: nowIso(),
        expiresAt: input.expiresAt ?? null,
        updatedBy: state.session.userId,
      };
      dispatch({ type: 'UPDATE_EXCHANGE_RATE', config, actor: state.session });
    },
    updatePayoutStatus: async (entryId, payoutStatus, note) => {
      if (!state.session || state.session.role !== 'admin') {
        throw new Error('Only administrators can update commission or settlement payout status.');
      }
      if (supabase) {
        const { error } = await supabase.rpc('update_payout_status', {
          target_entry_id: entryId,
          next_payout_status: payoutStatus,
          payout_note: note?.trim() || null,
        });
        if (error) throw new Error(`Could not update payout status: ${error.message}`);
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw new Error(authError.message);
        dispatch({ type: 'HYDRATE', state: await loadSupabaseState(authData.user) });
        return;
      }
      dispatch({
        type: 'UPDATE_PAYOUT_STATUS',
        entryId,
        payoutStatus,
        note: note?.trim() || undefined,
        actor: state.session,
      });
    },
    getUnavailablePropertyIds: async (checkIn, checkOut) => {
      if (!checkIn || !checkOut || new Date(checkOut) <= new Date(checkIn)) return [];
      if (supabase) {
        const { data, error } = await supabase.rpc('get_unavailable_property_ids', {
          requested_check_in: checkIn,
          requested_check_out: checkOut,
        });
        if (error) throw new Error(`Could not check stay availability: ${error.message}`);
        return (data as string[] | null) ?? [];
      }
      const now = Date.now();
      const unavailable = new Set<string>();
      for (const b of state.bookings) {
        if (
          b.checkIn < checkOut &&
          b.checkOut > checkIn &&
          (b.status === 'confirmed' ||
            (b.status === 'awaiting_payment' &&
              (!b.paymentDeadline || new Date(b.paymentDeadline).getTime() > now)))
        ) {
          unavailable.add(b.propertyId);
        }
      }
      for (const p of state.properties) {
        if (p.firstAvailableDate && checkIn < p.firstAvailableDate) {
          unavailable.add(p.id);
        }
        for (const bl of p.unavailableBlocks ?? []) {
          if (bl.startDate < checkOut && bl.endDate > checkIn) {
            unavailable.add(p.id);
          }
        }
      }
      return [...unavailable];
    },
    refreshState: async () => {
      if (!supabase) return;
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw new Error(sessionError.message);
      dispatch({ type: 'HYDRATE', state: await loadSupabaseState(sessionData.session?.user ?? null) });
    },
    addFeedback: (item) => dispatch({ type: 'ADD_FEEDBACK', item: { ...item, id: uid(), at: nowIso() } }),
    resetDemo: () => dispatch({ type: 'RESET' }),
  }), [state, backendReady, backendError, passwordRecoveryPending, handleApplicationReview]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useHamlet() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useHamlet must be used within HamletProvider');
  return ctx;
}

export function useRequireRole(role: AccountRole): Session | null {
  const { state } = useHamlet();
  return state.session?.role === role ? state.session : null;
}
