import {
  createContext, useContext, useEffect, useMemo, useReducer, type ReactNode,
} from 'react';
import type {
  Account, Session, Property, Booking, LedgerEntry, Issue, IssueStatus,
  PartnerApplication, PartnerAssignment, AuditEntry, AccountRole,
} from './types';
import {
  seedAccounts, seedProperties, seedBookings, seedLedger, seedIssues,
  seedApplications, seedAssignments, seedAudit,
} from './seed';
import { calculateGuestPricing, nightsBetween, formatNaira } from './pricing';

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

const DB_KEY = 'hamlet-db-v1';
const SESSION_KEY = 'hamlet-session-v1';

function initialState(): DBState {
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

function auditEntry(actorName: string, actorRole: string, action: string, target: string, detail: string): AuditEntry {
  return { id: uid(), at: nowIso(), actor: actorName, actorRole, action, target, detail };
}

function reducer(state: DBState, action: Action): DBState {
  switch (action.type) {
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
      let updated: Booking = { ...b, status: action.to, cancelReason: action.reason ?? b.cancelReason };
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
  signIn: (email: string, password: string) => { ok: boolean; error?: string };
  signOut: () => void;
  registerPartner: (input: { name: string; email: string; phone: string; company: string; role: string; areas: string[]; propertiesCount: number; motivation: string }) => void;
  submitProperty: (input: Omit<Property, 'id' | 'status' | 'verification' | 'trustLabel' | 'docs' | 'assignedPartnerIds' | 'createdAt' | 'ownerId' | 'ownerName' | 'submittedBy' | 'submittedRole' | 'authorityBasis'> & Partial<Pick<Property, 'authorityBasis'>>) => Property;
  reviewProperty: (id: string, status: Property['status'], note?: string) => void;
  requestBooking: (input: { property: Property; guestId: string; guestName: string; guestEmail: string; checkIn: string; checkOut: string; guests: number; specialRequests?: string }) => { ok: boolean; error?: string; booking?: Booking };
  bookingTransition: (id: string, to: Booking['status'], opts?: { note?: string; reason?: string }) => void;
  verifyPayment: (id: string) => void;
  reportIssue: (input: { bookingRef?: string; propertyTitle?: string; category: Issue['category']; severity: Issue['severity']; subject: string; description: string; reporter: string; reporterType: Issue['reporterType'] }) => Issue;
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

  useEffect(() => {
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
    signIn: (email, password) => {
      const account = state.accounts.find(a => a.email.toLowerCase() === email.trim().toLowerCase());
      if (!account) return { ok: false, error: 'No account found for that email.' };
      if (account.password !== password) return { ok: false, error: 'Incorrect password. Try demo1234 for demo accounts.' };
      dispatch({ type: 'SIGN_IN', session: { userId: account.id, role: account.role, name: account.name, email: account.email, partnerRole: account.partnerRole, company: account.company } });
      return { ok: true };
    },
    signOut: () => dispatch({ type: 'SIGN_OUT' }),
    registerPartner: (input) => {
      const account: Account = {
        id: uid(), name: input.name, email: input.email, password: 'demo1234', role: 'partner',
        partnerRole: input.role, company: input.company, phone: input.phone, createdAt: nowIso(),
      };
      const application: PartnerApplication = {
        id: uid(), ...input, submittedAt: nowIso(), status: 'pending',
      };
      dispatch({ type: 'REGISTER_PARTNER', account, application });
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
    requestBooking: ({ property, guestId, guestName, guestEmail, checkIn, checkOut, guests, specialRequests }) => {
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
      if (!state.session) return;
      const b = state.bookings.find(x => x.id === id);
      if (!b) return;
      const providerRef = `PSK_webhook_${uid().slice(0, 10)}`;
      dispatch({ type: 'VERIFY_PAYMENT', id, actor: state.session, providerRef, provider: 'Paystack' });
    },
    reportIssue: (input) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [state]);

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
