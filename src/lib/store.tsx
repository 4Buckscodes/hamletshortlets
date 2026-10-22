import {
  createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode,
} from 'react';
import type {
  Account, Session, Property, Booking, LedgerEntry, Issue, IssueStatus,
  PartnerApplication, PartnerAssignment, AuditEntry, AccountRole, TimelineEvent,
} from './types';
import {
  seedAccounts, seedProperties, seedBookings, seedLedger, seedIssues,
  seedApplications, seedAssignments, seedAudit,
} from './seed';
import { calculateGuestPricing, nightsBetween, formatNaira } from './pricing';
import { isSupabaseConfigured, supabase } from './supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export interface FeedbackItem {
  id: string; at: string; bookingRef: string; guestName: string;
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
  session: Session | null;
}

const emptyState = (): DBState => ({
  accounts: [], properties: [], bookings: [], ledger: [], issues: [],
  applications: [], assignments: [], audit: [], feedback: [], session: null,
});

const DB_KEY = 'hamlet-db-v1';
const SESSION_KEY = 'hamlet-session-v1';

function initialState(): DBState {
  if (isSupabaseConfigured) return emptyState();
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Omit<DBState, 'session'>;
      const sessionRaw = localStorage.getItem(SESSION_KEY);
      return { ...parsed, accounts: parsed.accounts.map(a => ({ ...a, password: 'demo1234' })), session: sessionRaw ? JSON.parse(sessionRaw) : null };
    }
  } catch { /* fall through to seed */ }
  return {
    accounts: seedAccounts, properties: seedProperties, bookings: seedBookings,
    ledger: seedLedger, issues: seedIssues, applications: seedApplications,
    assignments: seedAssignments, audit: seedAudit, feedback: [], session: null,
  };
}

// ─── Actions ─────────────────────────────────────────────────────────────────
type Action =
  | { type: 'HYDRATE'; state: DBState }
  | { type: 'SIGN_IN'; session: Session }
  | { type: 'SIGN_OUT' }
  | { type: 'REGISTER_PARTNER'; account: Account; application: PartnerApplication }
  | { type: 'ADD_PROPERTY'; property: Property }
  | { type: 'PROPERTY_REVIEW'; id: string; status: Property['status']; note?: string; actor: Session }
  | { type: 'ADD_BOOKING'; booking: Booking }
  | { type: 'BOOKING_TRANSITION'; id: string; to: Booking['status']; actor: Session; note?: string; reason?: string }
  | { type: 'VERIFY_PAYMENT'; id: string; actor: Session; providerRef: string; provider: string }
  | { type: 'ADD_LEDGER'; entries: LedgerEntry[] }
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
  created_at: string; updated_at: string;
};

type RemoteBooking = {
  id: string; reference: string; property_id: string; guest_id: string; check_in: string; check_out: string;
  guest_count: number; accommodation_subtotal: number; mandatory_charges: Property['mandatoryCharges'];
  mandatory_total: number; hamlet_guest_fee: number; guest_total: number; refundable_deposit: number;
  status: Booking['status']; special_requests?: string; payment_deadline?: string;
  payment_provider?: string; payment_reference?: string; refund_status: Booking['refundStatus'];
  refund_amount?: number; created_at: string; timeline: TimelineEvent[];
};

type RemoteApplication = {
  id: string; full_name: string; email: string; phone: string; company: string; role: string;
  areas: string[]; properties_count: number; motivation: string; status: PartnerApplication['status'];
  review_note?: string; submitted_at: string;
};

type RemoteIssue = {
  id: string; reference: string; booking_id: string; category: Issue['category'];
  severity: Issue['severity']; subject: string; description: string; status: IssueStatus;
  assignee_id?: string; resolution?: string; evidence: string[]; created_at: string; updated_at: string;
};

function toRemoteProperty(row: RemoteProperty, userId: string, accesses: { property_id: string; user_id: string }[]): Property {
  const propertyAccess = accesses.filter(access => access.property_id === row.id);
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
    ownerName: 'HAMLET partner',
    ownerId: propertyAccess.find(access => access.user_id === userId)?.user_id ?? '',
    submittedBy: 'HAMLET partner',
    submittedRole: 'Property partner',
    authorityBasis: 'Verification details are recorded on this listing.',
    docs: [],
    assignedPartnerIds: propertyAccess.map(access => access.user_id),
    createdAt: row.created_at,
  };
}

function toRemoteBooking(row: RemoteBooking, property: Property | undefined, session: Session): Booking {
  return {
    id: row.id,
    ref: row.reference,
    propertyId: row.property_id,
    propertyTitle: property?.title ?? 'Stay',
    area: property?.area ?? '',
    guestId: row.guest_id,
    guestName: row.guest_id === session.userId ? session.name : 'Guest',
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
  };

  const [propertyResult, accessResult, bookingResult, applicationResult, issueResult] = await Promise.all([
    supabase.from('properties').select('*').order('created_at', { ascending: false }),
    supabase.from('property_access').select('property_id,user_id,access_role,scope,commission_rate,commission_note,status,granted_at,revoked_at'),
    supabase.from('bookings').select('*').order('created_at', { ascending: false }),
    supabase.from('partner_applications').select('*').order('submitted_at', { ascending: false }),
    supabase.from('booking_issues').select('*').order('created_at', { ascending: false }),
  ]);

  for (const result of [propertyResult, accessResult, bookingResult, applicationResult, issueResult]) {
    if (result.error) throw new Error(`Could not load HAMLET data: ${result.error.message}`);
  }

  const propertyRows = (propertyResult.data ?? []) as unknown as RemoteProperty[];
  const accesses = (accessResult.data ?? []) as unknown as Array<{
    property_id: string; user_id: string; access_role: string; scope: string;
    commission_rate: number | null; commission_note: string; status: 'active' | 'revoked';
    granted_at: string; revoked_at?: string;
  }>;
  const properties = propertyRows.map(row => toRemoteProperty(row, user.id, accesses));
  const propertyById = new Map(properties.map(property => [property.id, property]));
  const bookings = ((bookingResult.data ?? []) as unknown as RemoteBooking[])
    .map(row => toRemoteBooking(row, propertyById.get(row.property_id), session));
  const applications = ((applicationResult.data ?? []) as unknown as RemoteApplication[]).map(application => ({
    id: application.id,
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
  const issues = ((issueResult.data ?? []) as unknown as RemoteIssue[]).map(issue => {
    const booking = bookingById.get(issue.booking_id);
    return {
      id: issue.id,
      ref: issue.reference,
      bookingRef: booking?.ref,
      propertyTitle: booking?.propertyTitle,
      category: issue.category,
      severity: issue.severity,
      subject: issue.subject,
      description: issue.description,
      reporter: 'HAMLET user',
      reporterType: 'guest' as const,
      status: issue.status,
      assignee: issue.assignee_id,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      evidence: issue.evidence ?? [],
      resolution: issue.resolution,
      timeline: [],
    };
  });
  const assignments: PartnerAssignment[] = accesses.map(access => ({
    id: `${access.property_id}:${access.user_id}`,
    propertyId: access.property_id,
    propertyTitle: propertyById.get(access.property_id)?.title ?? 'Property',
    partnerId: access.user_id,
    partnerName: access.user_id === user.id ? session.name : 'Authorised partner',
    partnerRole: access.access_role,
    scope: access.scope,
    commissionRate: access.commission_rate,
    commissionNote: access.commission_note,
    status: access.status,
    grantedAt: access.granted_at,
    revokedAt: access.revoked_at,
  }));
  const account: Account = {
    id: user.id,
    name: session.name,
    email: session.email,
    password: '',
    role: session.role,
    partnerRole: session.partnerRole,
    company: session.company,
    phone: profile.phone ?? undefined,
    createdAt: profile.created_at,
  };

  return {
    ...emptyState(),
    accounts: [account],
    properties,
    bookings,
    issues,
    applications,
    assignments,
    session,
  };
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
    case 'PROPERTY_REVIEW': {
      const p = state.properties.find(x => x.id === action.id);
      if (!p) return state;
      const labels: Record<string, string> = {
        approved: 'listing_approved', needs_correction: 'listing_needs_correction',
        rejected: 'listing_rejected', suspended: 'listing_suspended', submitted: 'listing_resubmitted',
      };
      const updatedProperty = { ...p, status: action.status, reviewNote: action.note ?? p.reviewNote };
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
      return { ...state, bookings: [action.booking, ...state.bookings] };
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
      return {
        ...state,
        bookings: state.bookings.map(x => (x.id === action.id ? updated : x)),
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
        { id: uid(), at, bookingRef: b.ref, propertyTitle: b.propertyTitle, type: 'guest_charge', description: `Guest accommodation charge (${b.nights} nights + mandatory charges)`, amount: b.accommodationSubtotal + b.mandatoryTotal, status: 'reconciled', operator: action.actor.name, variance: 0, providerRef: action.providerRef },
        { id: uid(), at, bookingRef: b.ref, propertyTitle: b.propertyTitle, type: 'guest_service_fee', description: `HAMLET guest service fee (3.0% × ${formatNaira(b.accommodationSubtotal)})`, amount: b.hamletGuestFee, status: 'reconciled', operator: action.actor.name, variance: 0, providerRef: action.providerRef },
        { id: uid(), at, bookingRef: b.ref, propertyTitle: b.propertyTitle, type: 'deposit_hold', description: 'Refundable security deposit — held, not revenue. Excluded from fee base.', amount: b.deposit, status: 'recorded', operator: action.actor.name, variance: 0 },
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
    case 'ADD_LEDGER':
      return { ...state, ledger: [...action.entries, ...state.ledger] };
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
  signUpGuest: (input: { name: string; email: string; password: string }) => Promise<{ ok: boolean; needsEmailConfirmation?: boolean; error?: string }>;
  signOut: () => Promise<void>;
  registerPartner: (input: { name: string; email: string; phone: string; company: string; role: string; areas: string[]; propertiesCount: number; motivation: string }) => Promise<{ ok: boolean; error?: string }>;
  submitProperty: (input: Omit<Property, 'id' | 'status' | 'verification' | 'trustLabel' | 'docs' | 'assignedPartnerIds' | 'createdAt' | 'ownerId' | 'ownerName' | 'submittedBy' | 'submittedRole' | 'authorityBasis'> & Partial<Pick<Property, 'authorityBasis'>>) => Property;
  reviewProperty: (id: string, status: Property['status'], note?: string) => void;
  requestBooking: (input: { property: Property; guestId: string; guestName: string; guestEmail: string; checkIn: string; checkOut: string; guests: number; specialRequests?: string }) => Promise<{ ok: boolean; error?: string; booking?: Booking }>;
  bookingTransition: (id: string, to: Booking['status'], opts?: { note?: string; reason?: string }) => void;
  verifyPayment: (id: string) => void;
  reportIssue: (input: { bookingRef?: string; propertyTitle?: string; category: Issue['category']; severity: Issue['severity']; subject: string; description: string; reporter: string; reporterType: Issue['reporterType'] }) => Promise<Issue>;
  updateIssue: (id: string, status: IssueStatus, opts?: { note?: string; assignee?: string; resolution?: string }) => void;
  reviewApplication: (id: string, status: PartnerApplication['status'], note?: string) => void;
  approvePartner: (applicationId: string) => void;
  grantAssignment: (input: Omit<PartnerAssignment, 'id' | 'grantedAt' | 'status'>) => void;
  revokeAssignment: (id: string) => void;
  addFeedback: (item: Omit<FeedbackItem, 'id' | 'at'>) => void;
  resetDemo: () => void;
}

const StoreContext = createContext<Store | null>(null);

export function HamletProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined as unknown as DBState, initialState);
  const [backendReady, setBackendReady] = useState(!isSupabaseConfigured);
  const [backendError, setBackendError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
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

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setBackendError(`Could not restore your Supabase session: ${error.message}`);
        setBackendReady(true);
        return;
      }
      void load(data.session?.user ?? null);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => { void load(session?.user ?? null); }, 0);
    });
    return () => {
      active = false;
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
      if (account.password !== password) return { ok: false, error: 'Incorrect password. Try demo1234 for demo accounts.' };
      dispatch({ type: 'SIGN_IN', session: { userId: account.id, role: account.role, name: account.name, email: account.email, partnerRole: account.partnerRole, company: account.company } });
      return { ok: true, role: account.role };
    },
    signUpGuest: async ({ name, email, password }) => {
      if (!supabase) return { ok: false, error: 'Account creation is only available when Supabase is configured.' };
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: name.trim() } },
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
    submitProperty: (input) => {
      const s = state.session;
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
      return property;
    },
    reviewProperty: (id, status, note) => {
      if (!state.session) return;
      dispatch({ type: 'PROPERTY_REVIEW', id, status, note, actor: state.session });
    },
    requestBooking: async ({ property, guestId, guestName, guestEmail, checkIn, checkOut, guests, specialRequests }) => {
      if (supabase) {
        if (!state.session || state.session.role !== 'guest') {
          return { ok: false, error: 'Sign in with a guest account to request this stay.' };
        }
        const nights = nightsBetween(checkIn, checkOut);
        if (nights <= 0) return { ok: false, error: 'Check-out must be after check-in.' };
        if (nights > 60) return { ok: false, error: 'Stays are limited to 60 nights.' };
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
    bookingTransition: (id, to, opts) => {
      if (!state.session) return;
      dispatch({ type: 'BOOKING_TRANSITION', id, to, actor: state.session, note: opts?.note, reason: opts?.reason });
    },
    verifyPayment: (id) => {
      if (supabase) {
        setBackendError('Online payments are not enabled until a verified payment-provider webhook is configured.');
        return;
      }
      if (!state.session) return;
      const b = state.bookings.find(x => x.id === id);
      if (!b) return;
      const providerRef = `PSK_webhook_${uid().slice(0, 10)}`;
      dispatch({ type: 'VERIFY_PAYMENT', id, actor: state.session, providerRef, provider: 'Paystack' });
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
          evidence: data.evidence ?? [], resolution: data.resolution, timeline: [],
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
    updateIssue: (id, status, opts) => {
      if (!state.session) return;
      dispatch({ type: 'ISSUE_UPDATE', id, status, actor: state.session, note: opts?.note, assignee: opts?.assignee, resolution: opts?.resolution });
    },
    reviewApplication: (id, status, note) => {
      if (!state.session) return;
      dispatch({ type: 'REVIEW_APPLICATION', id, status, actor: state.session, note });
    },
    approvePartner: (applicationId) => {
      if (!state.session) return;
      dispatch({ type: 'CREATE_PARTNER_FROM_APPLICATION', applicationId, actor: state.session });
    },
    grantAssignment: (input) => {
      const actor = state.session;
      dispatch({ type: 'ADD_ASSIGNMENT', assignment: { ...input, id: uid(), grantedAt: nowIso(), status: 'active' }, actorName: actor?.name ?? 'HAMLET operations', actorRole: actor?.role ?? 'admin' });
    },
    revokeAssignment: (id) => {
      if (!state.session) return;
      dispatch({ type: 'REVOKE_ASSIGNMENT', id, actor: state.session });
    },
    addFeedback: (item) => dispatch({ type: 'ADD_FEEDBACK', item: { ...item, id: uid(), at: nowIso() } }),
    resetDemo: () => dispatch({ type: 'RESET' }),
  }), [state, backendReady, backendError]);

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
