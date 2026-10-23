import {
  createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode,
} from 'react';
import type {
  Account, Session, Property, Booking, LedgerEntry, Issue, IssueStatus,
  PartnerApplication, PartnerAssignment, AuditEntry, AccountRole, TimelineEvent,
  BookingNotificationRecord, NotificationEventType, NotificationRecipientType,
} from './types';
import {
  seedAccounts, seedProperties, seedBookings, seedLedger, seedIssues,
  seedApplications, seedAssignments, seedAudit,
} from './seed';
import { calculateGuestPricing, nightsBetween, formatNaira } from './pricing';
import { extractEdgeFunctionError, isSupabaseConfigured, supabase } from './supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export interface FeedbackItem {
  id: string; at: string; bookingRef: string; propertyTitle?: string; guestName: string;
  rating: number; text: string; category: string;
}

export interface DBState {
  accounts: Account[];
  properties: Property[];
  bookings: Booking[];
  ledger: LedgerEntry[];
  issues: Issue[];
  applications: PartnerApplication[];
  assignments: PartnerAssignment[];
  audit: AuditEntry[];
  feedback: FeedbackItem[];
  notifications: BookingNotificationRecord[];
  session: Session | null;
}

const emptyState = (): DBState => ({
  accounts: [], properties: [], bookings: [], ledger: [], issues: [],
  applications: [], assignments: [], audit: [], feedback: [], notifications: [], session: null,
});

const DB_KEY = 'hamlet-db-v1';
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
        notifications: parsed.notifications ?? [],
        accounts: parsed.accounts.map(a => ({ ...a, password: 'demo1234' })),
        session: sessionRaw ? JSON.parse(sessionRaw) : null,
      };
    }
  } catch { /* fall through to seed */ }
  return {
    accounts: seedAccounts, properties: seedProperties, bookings: seedBookings,
    ledger: seedLedger, issues: seedIssues, applications: seedApplications,
    assignments: seedAssignments, audit: seedAudit, feedback: [], notifications: [], session: null,
  };
}

// ─── Actions ─────────────────────────────────────────────────────────────────
type Action =
  | { type: 'HYDRATE'; state: DBState }
  | { type: 'SIGN_IN'; session: Session }
  | { type: 'SIGN_OUT' }
  | { type: 'REGISTER_GUEST'; account: Account; session: Session }
  | { type: 'REGISTER_PARTNER'; account: Account; application: PartnerApplication }
  | { type: 'ADD_PROPERTY'; property: Property }
  | { type: 'UPDATE_AND_RESUBMIT_PROPERTY'; id: string; patch: Omit<Property, 'id' | 'status' | 'verification' | 'trustLabel' | 'assignedPartnerIds' | 'createdAt' | 'ownerId' | 'ownerName' | 'submittedBy'>; actor: Session; note?: string }
  | { type: 'PROPERTY_REVIEW'; id: string; status: Property['status']; note?: string; verification?: Property['verification']; actor: Session }
  | { type: 'SET_PARTNER_STATUS'; partnerId: string; status: 'active' | 'suspended'; reason: string; cascadeSuspend: boolean; actor: Session }
  | { type: 'ADD_BOOKING'; booking: Booking }
  | { type: 'BOOKING_TRANSITION'; id: string; to: Booking['status']; actor: Session; note?: string; reason?: string }
  | { type: 'VERIFY_PAYMENT'; id: string; actor: Session; providerRef: string; provider: string }
  | { type: 'RECORD_REFUND'; id: string; actor: Session; amount: number; providerRef?: string; note: string }
  | { type: 'ADD_LEDGER'; entries: LedgerEntry[] }
  | { type: 'RECONCILE_LEDGER'; id: string; actor: Session; status: LedgerEntry['status']; variance: number; note?: string }
  | { type: 'ADD_ISSUE'; issue: Issue }
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
  review_note?: string; created_at: string; updated_at: string;
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
  status: Booking['status']; special_requests?: string; payment_deadline?: string;
  payment_provider?: string; payment_reference?: string; refund_status: Booking['refundStatus'];
  refund_amount?: number; cancel_reason?: string; created_at: string; timeline: TimelineEvent[];
};

type RemoteApplication = {
  id: string; applicant_id: string; full_name: string; email: string; phone: string; company: string; role: string;
  areas: string[]; properties_count: number; motivation: string; status: PartnerApplication['status'];
  review_note?: string; submitted_at: string;
};

type RemoteFeedback = {
  id: string; booking_id: string; guest_id: string; rating: number;
  category: string; feedback_text: string; created_at: string;
};

type RemoteIssue = {
  id: string; reference: string; booking_id: string; reporter_id: string; category: Issue['category'];
  severity: Issue['severity']; subject: string; description: string; status: IssueStatus;
  assignee_id?: string; assignee_name?: string; resolution?: string; evidence: string[];
  timeline?: TimelineEvent[]; created_at: string; updated_at: string;
};

type RemoteLedgerRow = {
  id: string; booking_id: string; record_type: LedgerEntry['type']; amount: number;
  provider_reference?: string; status: LedgerEntry['status']; description: string;
  variance: number; note?: string; operator_name: string; created_at: string;
};

type RemoteProfile = {
  id: string; full_name: string; role: AccountRole; phone?: string;
  company?: string; partner_role?: string; account_status?: 'active' | 'suspended';
  suspension_reason?: string; created_at: string;
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
    createdAt: row.created_at,
  };
}

function toRemoteBooking(
  row: RemoteBooking,
  property: Property | undefined,
  session: Session,
  profileById?: Map<string, RemoteProfile>,
): Booking {
  const guestProfile = profileById?.get(row.guest_id);
  return {
    id: row.id,
    ref: row.reference,
    propertyId: row.property_id,
    propertyTitle: property?.title ?? 'Stay',
    area: property?.area ?? '',
    guestId: row.guest_id,
    guestName: row.guest_id === session.userId ? session.name : (guestProfile?.full_name || 'Guest'),
    guestEmail: row.guest_id === session.userId ? session.email : '',
    checkIn: row.check_in,
    checkOut: row.check_out,
    nights: nightsBetween(row.check_in, row.check_out),
    guests: row.guest_count,
    accommodationSubtotal: row.accommodation_subtotal,
    mandatoryCharges: row.mandatory_charges ?? [],
    mandatoryTotal: row.mandatory_total,
    hamletGuestFee: row.hamlet_guest_fee,
    guestTotal: row.guest_total,
    deposit: row.refundable_deposit,
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

async function loadSupabaseState(user: SupabaseUser | null): Promise<DBState> {
  if (!supabase) return emptyState();
  if (!user) {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Could not load approved stays: ${error.message}`);
    return { ...emptyState(), properties: ((data ?? []) as unknown as RemoteProperty[]).map(row => toRemoteProperty(row, '', [])) };
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
    partnerRole: profile.partner_role ?? undefined,
    company: profile.company ?? undefined,
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
  ] = await Promise.all([
    supabase.from('profiles').select('id,full_name,role,phone,company,partner_role,account_status,suspension_reason,created_at').order('created_at', { ascending: false }),
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
  ]) {
    if (result.error) throw new Error(`Could not load HAMLET data: ${result.error.message}`);
  }

  const profileRows = (profilesResult.data ?? []) as unknown as RemoteProfile[];
  const profileById = new Map(profileRows.map(item => [item.id, item]));
  const propertyRows = (propertyResult.data ?? []) as unknown as RemoteProperty[];
  const accesses = (accessResult.data ?? []) as unknown as Array<{
    property_id: string; user_id: string; access_role: string; scope: string;
    commission_rate: number | null; commission_note: string; status: 'active' | 'revoked';
    granted_at: string; revoked_at?: string;
  }>;
  const submissions = new Map(
    (privateRecordResult.data ?? []).map(record => [
      record.property_id,
      record.record_data as RemotePropertySubmission,
    ]),
  );
  const properties = propertyRows.map(row => toRemoteProperty(row, user.id, accesses, submissions.get(row.id), profileById));
  const propertyById = new Map(properties.map(property => [property.id, property]));
  const bookings = ((bookingResult.data ?? []) as unknown as RemoteBooking[])
    .map(row => toRemoteBooking(row, propertyById.get(row.property_id), session, profileById));
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
    submittedAt: application.submitted_at,
    status: application.status,
    reviewNote: application.review_note,
  }));
  const bookingById = new Map(bookings.map(booking => [booking.id, booking]));
  const ledger: LedgerEntry[] = ((ledgerResult.data ?? []) as unknown as RemoteLedgerRow[]).map(row => {
    const booking = bookingById.get(row.booking_id);
    return {
      id: row.id,
      at: row.created_at,
      bookingRef: booking?.ref ?? row.booking_id,
      propertyTitle: booking?.propertyTitle,
      type: row.record_type,
      description: row.description || row.record_type.replace(/_/g, ' '),
      amount: row.amount,
      status: row.status,
      providerRef: row.provider_reference ?? undefined,
      operator: row.operator_name || 'System',
      variance: row.variance ?? 0,
      note: row.note ?? undefined,
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
      reporterType: (reporterProfile?.role === 'partner' ? 'partner' : reporterProfile?.role === 'admin' ? 'internal' : 'guest') as Issue['reporterType'],
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
    ? profileRows.map(row => ({
        id: row.id,
        name: row.id === user.id ? session.name : (row.full_name || 'HAMLET user'),
        email: row.id === user.id ? session.email : '',
        password: '',
        role: row.role,
        partnerRole: row.partner_role ?? undefined,
        company: row.company ?? undefined,
        phone: row.phone ?? undefined,
        accountStatus: row.account_status ?? 'active',
        suspensionReason: row.suspension_reason ?? undefined,
        createdAt: row.created_at,
      }))
    : [{
        id: user.id,
        name: session.name,
        email: session.email,
        password: '',
        role: session.role,
        partnerRole: session.partnerRole,
        company: session.company,
        phone: profile.phone ?? undefined,
        accountStatus: session.accountStatus ?? 'active',
        suspensionReason: session.suspensionReason,
        createdAt: profile.created_at,
      }];
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

  return {
    ...emptyState(),
    accounts,
    properties,
    bookings,
    ledger,
    issues,
    applications,
    assignments,
    audit,
    feedback,
    notifications,
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
        audit: [auditEntry(action.account.name, 'partner', 'partner_application_submitted', action.application.company, `Role: ${action.application.role} · ${action.application.areas.join(', ')}`), ...state.audit],
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
        audit: [auditEntry(action.property.submittedBy, action.property.submittedRole, 'property_submitted', action.property.title, 'Property submitted for review'), ...state.audit],
      };
    case 'UPDATE_AND_RESUBMIT_PROPERTY': {
      const p = state.properties.find(x => x.id === action.id);
      if (!p) return state;
      const updatedDocs = action.patch.docs.map(d => {
        const existingVerified = p.docs.find(ed => ed.label === d.label && ed.status === 'verified');
        return existingVerified ? existingVerified : { ...d, status: d.status === 'missing' ? ('missing' as const) : ('self_reported' as const) };
      });
      const updatedProperty: Property = {
        ...p,
        ...action.patch,
        docs: updatedDocs,
        status: 'submitted',
        trustLabel: 'Under review',
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
          auditEntry(action.actor.name, action.actor.role, 'property_resubmitted', updatedProperty.title, action.note ?? 'Listing details and authority declarations updated and resubmitted for review.'),
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
    case 'ADD_BOOKING':
      return {
        ...state,
        bookings: [action.booking, ...state.bookings],
        notifications: [
          ...buildDemoNotifications(action.booking, 'booking_request_created', ['guest', 'partner', 'operations']),
          ...state.notifications,
        ],
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
        notifications: [...demoTransitionNotifications, ...state.notifications],
        audit: [auditEntry(action.actor.name, action.actor.role, auditAction, b.ref, `→ ${action.to}${action.reason ? ` · ${action.reason}` : ''}`), ...state.audit],
      };
    }
    case 'VERIFY_PAYMENT': {
      const b = state.bookings.find(x => x.id === action.id);
      if (!b) return state;
      const at = nowIso();
      const updated: Booking = {
        ...b, status: 'confirmed', paymentRef: action.providerRef, paymentProvider: action.provider,
        timeline: [
          ...b.timeline,
          { at, label: 'Payment verified server-side via provider webhook', actor: `System (${action.provider})`, detail: `Ref ${action.providerRef} · ${formatNaira(b.guestTotal)}` },
          { at, label: 'Booking confirmed — availability rechecked. No overlap.', actor: 'System' },
        ],
      };
      const entries: LedgerEntry[] = [
        { id: uid(), at, bookingRef: b.ref, propertyTitle: b.propertyTitle, type: 'guest_charge', description: `Guest payment verified via webhook (${b.nights} nights + mandatory charges + 3% HAMLET guest fee)`, amount: b.guestTotal, status: 'reconciled', operator: `System (${action.provider} webhook)`, variance: 0, providerRef: action.providerRef },
        { id: uid(), at, bookingRef: b.ref, propertyTitle: b.propertyTitle, type: 'accommodation_revenue', description: `Owner accommodation revenue (${b.nights} nights · 0% HAMLET owner fee)`, amount: b.accommodationSubtotal, status: 'recorded', operator: `System (${action.provider} webhook)`, variance: 0, providerRef: action.providerRef },
        ...(b.mandatoryTotal > 0 ? [{ id: uid(), at, bookingRef: b.ref, propertyTitle: b.propertyTitle, type: 'mandatory_charges' as const, description: 'Disclosed mandatory property charges (owner settlement)', amount: b.mandatoryTotal, status: 'recorded' as const, operator: `System (${action.provider} webhook)`, variance: 0, providerRef: action.providerRef }] : []),
        { id: uid(), at, bookingRef: b.ref, propertyTitle: b.propertyTitle, type: 'guest_service_fee', description: `HAMLET guest service fee (3.0% × ${formatNaira(b.accommodationSubtotal)})`, amount: b.hamletGuestFee, status: 'reconciled', operator: `System (${action.provider} webhook)`, variance: 0, providerRef: action.providerRef },
        ...(b.deposit > 0 ? [{ id: uid(), at, bookingRef: b.ref, propertyTitle: b.propertyTitle, type: 'deposit_hold' as const, description: 'Refundable security deposit — held, not revenue. Excluded from fee base.', amount: b.deposit, status: 'recorded' as const, operator: `System (${action.provider} webhook)`, variance: 0, providerRef: action.providerRef }] : []),
      ];
      return {
        ...state,
        bookings: state.bookings.map(x => (x.id === action.id ? updated : x)),
        ledger: [...entries, ...state.ledger],
        audit: [
          auditEntry(action.actor.name, action.actor.role, 'payment_verified', b.ref, `Webhook signature verified server-side. ${formatNaira(b.guestTotal)} confirmed. Idempotency key ${action.providerRef}`),
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
        ledger: [refundEntry, ...state.ledger],
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
  signIn: (email: string, password: string) => Promise<{ ok: boolean; role?: AccountRole; error?: string }>;
  signUpGuest: (input: { name: string; email: string; password: string; phone?: string }) => Promise<{ ok: boolean; needsEmailConfirmation?: boolean; error?: string }>;
  signOut: () => Promise<void>;
  registerPartner: (input: { name: string; email: string; phone: string; company: string; role: string; areas: string[]; propertiesCount: number; motivation: string }) => Promise<{ ok: boolean; error?: string }>;
  submitProperty: (input: Omit<Property, 'id' | 'status' | 'verification' | 'trustLabel' | 'docs' | 'assignedPartnerIds' | 'createdAt' | 'ownerId' | 'ownerName' | 'submittedBy' | 'submittedRole' | 'authorityBasis'> & Pick<Property, 'authorityBasis' | 'docs'> & Partial<Pick<Property, 'submittedRole'>>) => Promise<{ ok: boolean; error?: string; property?: Property }>;
  updateAndResubmitProperty: (id: string, input: Omit<Property, 'id' | 'status' | 'verification' | 'trustLabel' | 'assignedPartnerIds' | 'createdAt' | 'ownerId' | 'ownerName' | 'submittedBy'>, correctionNote?: string) => Promise<void>;
  reviewProperty: (id: string, status: Property['status'], note?: string, verification?: Property['verification']) => Promise<void>;
  setPartnerAccountStatus: (partnerId: string, status: 'active' | 'suspended', reason: string, cascadeSuspendProperties?: boolean) => Promise<void>;
  requestBooking: (input: { property: Property; guestId: string; guestName: string; guestEmail: string; checkIn: string; checkOut: string; guests: number; specialRequests?: string }) => Promise<{ ok: boolean; error?: string; booking?: Booking }>;
  bookingTransition: (id: string, to: Booking['status'], opts?: { note?: string; reason?: string }) => Promise<void>;
  retryBookingNotifications: (bookingId: string) => Promise<{ ok: boolean; sent: number; failed: number; error?: string }>;
  verifyPayment: (id: string) => void;
  initializeBookingCheckout: (bookingId: string, callbackUrl?: string) => Promise<{ authorizationUrl: string; reference: string }>;
  recordBookingRefund: (id: string, input: { amount: number; providerRef?: string; note: string }) => Promise<void>;
  reconcileLedgerEntry: (id: string, input: { status: LedgerEntry['status']; variance?: number; note?: string }) => Promise<void>;
  recordLedgerAdjustment: (input: { bookingId: string; type: LedgerEntry['type']; amount: number; status: LedgerEntry['status']; description: string; providerRef?: string; variance?: number; note?: string }) => Promise<void>;
  reportIssue: (input: { bookingRef?: string; propertyTitle?: string; category: Issue['category']; severity: Issue['severity']; subject: string; description: string; reporter: string; reporterType: Issue['reporterType'] }) => Promise<Issue>;
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
    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
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
      dispatch({ type: 'SIGN_IN', session: { userId: account.id, role: account.role, name: account.name, email: account.email, partnerRole: account.partnerRole, company: account.company, accountStatus: account.accountStatus ?? 'active', suspensionReason: account.suspensionReason } });
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
          return { ok: true };
        } catch (loadError) {
          return { ok: false, error: loadError instanceof Error ? loadError.message : 'Account was created but its profile could not be loaded.' };
        }
      }

      if (state.accounts.some(a => a.email.toLowerCase() === normalizedEmail)) {
        return { ok: false, error: 'An account with that email already exists. Sign in instead.' };
      }
      const account: Account = {
        id: uid(),
        name: trimmedName,
        email: normalizedEmail,
        password,
        role: 'guest',
        phone: trimmedPhone || undefined,
        accountStatus: 'active',
        createdAt: nowIso(),
      };
      const session: Session = {
        userId: account.id,
        role: 'guest',
        name: account.name,
        email: account.email,
        accountStatus: 'active',
      };
      dispatch({ type: 'REGISTER_GUEST', account, session });
      return { ok: true };
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
    registerPartner: async (input) => {
      if (supabase) {
        const session = state.session;
        if (!session) return { ok: false, error: 'Create a guest account and sign in before submitting a partner application.' };
        if (session.role !== 'guest') return { ok: false, error: 'Only guest accounts can submit a partner application.' };
        const { error } = await supabase.from('partner_applications').insert({
          applicant_id: session.userId,
          full_name: input.name.trim(),
          email: input.email.trim(),
          phone: input.phone.trim(),
          company: input.company.trim(),
          role: input.role,
          areas: input.areas,
          properties_count: input.propertiesCount,
          motivation: input.motivation.trim(),
        });
        if (error) return { ok: false, error: error.message };
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) return { ok: false, error: authError.message };
        try {
          dispatch({ type: 'HYDRATE', state: await loadSupabaseState(authData.user) });
        } catch (loadError) {
          setBackendError(loadError instanceof Error ? loadError.message : 'Application saved, but the workspace could not refresh.');
        }
        return { ok: true };
      }
      const account: Account = {
        id: uid(), name: input.name, email: input.email, password: 'demo1234', role: 'partner',
        partnerRole: input.role, company: input.company, phone: input.phone, createdAt: nowIso(),
      };
      const application: PartnerApplication = {
        id: uid(), ...input, submittedAt: nowIso(), status: 'pending',
      };
      dispatch({ type: 'REGISTER_PARTNER', account, application });
      return { ok: true };
    },
    submitProperty: async (input) => {
      const s = state.session;
      if (supabase) {
        if (!s || s.role !== 'partner') {
          return { ok: false, error: 'Only approved partner accounts can submit properties.' };
        }
        const { data: propertyId, error } = await supabase.rpc('submit_partner_property', {
          listing_data: {
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
          },
          submission_data: {
            authority_basis: input.authorityBasis,
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
        status: 'submitted',
        trustLabel: 'Under review',
        verification: { ownership: 'pending_review', identity: 'pending_review', authority: 'pending_review', inspection: 'missing' },
        docs: [
          { label: 'Certificate of occupancy / title deed', status: 'pending_review' },
          { label: 'Government-issued ID of owner', status: 'pending_review' },
          { label: 'Proof of authority / management mandate', status: 'pending_review' },
          { label: 'Property inspection report', status: 'missing' },
        ],
        assignedPartnerIds: s ? [s.userId] : [],
        ownerId: s?.userId ?? 'unknown',
        ownerName: s?.name ?? 'Partner',
        submittedBy: s?.name ?? 'Partner',
        submittedRole: s?.partnerRole ?? 'Partner',
        authorityBasis: input.authorityBasis ?? 'Submitted via partner portal — evidence under review',
        createdAt: nowIso(),
      };
      dispatch({ type: 'ADD_PROPERTY', property });
      return { ok: true, property };
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
    requestBooking: async ({ property, guestId, guestName, guestEmail, checkIn, checkOut, guests, specialRequests }) => {
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
      // Overlap prevention: no confirmed or awaiting_payment booking may overlap the requested range.
      const clash = state.bookings.find(b =>
        b.propertyId === property.id &&
        (b.status === 'confirmed' || b.status === 'awaiting_payment') &&
        new Date(b.checkIn) < new Date(checkOut) && new Date(b.checkOut) > new Date(checkIn));
      if (clash) return { ok: false, error: `Those dates conflict with an existing booking (${clash.ref}). Please choose different dates.` };
      const pricing = calculateGuestPricing({
        accommodationSubtotal: nights * property.nightlyRate,
        mandatoryCharges: property.mandatoryCharges,
        refundableDeposit: property.deposit,
      });
      const seq = 10 + state.bookings.length;
      const booking: Booking = {
        id: uid(), ref: `HML-2026-${String(seq).padStart(4, '0')}`,
        propertyId: property.id, propertyTitle: property.title, area: property.area,
        guestId, guestName, guestEmail, checkIn, checkOut, nights, guests,
        accommodationSubtotal: pricing.accommodationSubtotal,
        mandatoryCharges: pricing.mandatoryCharges,
        mandatoryTotal: pricing.mandatoryChargesTotal,
        hamletGuestFee: pricing.hamletGuestServiceFee,
        guestTotal: pricing.guestTotal,
        deposit: pricing.refundableDeposit,
        status: 'requested', requestedAt: nowIso(), specialRequests,
        timeline: [{ at: nowIso(), label: 'Booking requested', actor: `Guest · ${guestName}`, detail: 'Awaiting availability & terms check' }],
      };
      dispatch({ type: 'ADD_BOOKING', booking });
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
        const booking = state.bookings.find(item => item.ref === input.bookingRef);
        if (!booking) throw new Error('Could not find that booking. Refresh your bookings and try again.');
        const { data, error } = await supabase.from('booking_issues').insert({
          reference: `HML-IS-${crypto.randomUUID().slice(0, 12).toUpperCase()}`,
          booking_id: booking.id,
          reporter_id: state.session.userId,
          category: input.category,
          severity: input.severity,
          subject: input.subject,
          description: input.description,
        }).select('*').single();
        if (error) throw new Error(`Could not report the issue: ${error.message}`);
        const issue: Issue = {
          id: data.id, ref: data.reference, bookingRef: booking.ref,
          propertyTitle: booking.propertyTitle, category: data.category,
          severity: data.severity, subject: data.subject, description: data.description,
          reporter: state.session.name, reporterType: 'guest', status: data.status,
          createdAt: data.created_at, updatedAt: data.updated_at,
          evidence: data.evidence ?? [], resolution: data.resolution,
          timeline: (data.timeline as TimelineEvent[] | undefined) ?? [],
        };
        dispatch({ type: 'HYDRATE', state: { ...state, issues: [issue, ...state.issues] } });
        return issue;
      }
      const seq = 7 + state.issues.length;
      const issue: Issue = {
        id: uid(), ref: `HML-IS-${String(seq).padStart(4, '0')}`, ...input,
        status: 'open', createdAt: nowIso(), updatedAt: nowIso(),
        evidence: [],
        timeline: [{ at: nowIso(), label: 'Issue reported', actor: input.reporter }],
      };
      dispatch({ type: 'ADD_ISSUE', issue });
      return issue;
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
      return [
        ...new Set(
          state.bookings
            .filter(
              b =>
                new Date(b.checkIn) < new Date(checkOut) &&
                new Date(b.checkOut) > new Date(checkIn) &&
                (b.status === 'confirmed' ||
                  (b.status === 'awaiting_payment' &&
                    (!b.paymentDeadline || new Date(b.paymentDeadline).getTime() > now))),
            )
            .map(b => b.propertyId),
        ),
      ];
    },
    refreshState: async () => {
      if (!supabase) return;
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw new Error(sessionError.message);
      dispatch({ type: 'HYDRATE', state: await loadSupabaseState(sessionData.session?.user ?? null) });
    },
    addFeedback: (item) => dispatch({ type: 'ADD_FEEDBACK', item: { ...item, id: uid(), at: nowIso() } }),
    resetDemo: () => dispatch({ type: 'RESET' }),
  }), [state, backendReady, backendError, handleApplicationReview]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- Keep context hooks beside the provider they consume.
export function useHamlet() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useHamlet must be used within HamletProvider');
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components -- Keep context hooks beside the provider they consume.
export function useRequireRole(role: AccountRole): Session | null {
  const { state } = useHamlet();
  return state.session?.role === role ? state.session : null;
}
