// ─── HAMLET Competitive Readiness Domain Models & Pure Helpers ──────────────
// Covers:
//   Feature 1 — Agent Deal Board (Fixed Agent Payout & Owner Net Rate)
//   Feature 2 — Property Duplicate Detection & Owner-Authorised Agents
//   Feature 4 — Caution Fee Lifecycle & Check-In / Check-Out Inspection Tracker
//   Feature 5 — Booking Response & Availability Freshness Indicators
//   Feature 6 — Deal-Aware WhatsApp Sharing & Attribution Helpers
//   Feature 7 — Structured 7-Check Property Trust Profile
//   Section 6 — Horatio Grounded Data Readiness (zero paid AI / zero hallucination)

import {
  formatNaira,
  guestFacingNightlyNgn,
  validateAndComputeAgentDealTerms,
  type AgentDealBillingUnit,
  type AgentDealStructure,
} from './pricing';
import { HAMLET_CANONICAL_ORIGIN } from './structured-data';

// ─── Feature 1: Agent Deal Board ─────────────────────────────────────────────

export type AgentDealExclusivity = 'open_network' | 'exclusive_agent';
export type AgentDealStatus = 'draft' | 'published' | 'paused' | 'withdrawn' | 'expired';
export type AgentDealDecision = 'accepted' | 'declined';

export interface AgentDealRecord {
  id: string;
  deal_code: string;
  property_id: string;
  created_by: string;
  title: string;
  deal_structure: AgentDealStructure;
  billing_unit: AgentDealBillingUnit;
  unit_nights: number;
  authorised_selling_price_ngn: number;
  owner_allocation_ngn: number;
  agent_payout_ngn: number;
  min_stay_nights: number;
  starts_on: string;
  expires_on: string | null;
  booking_responsibilities: string;
  cancellation_conditions: string;
  exclusivity: AgentDealExclusivity;
  exclusive_agent_id: string | null;
  status: AgentDealStatus;
  terms_version: number;
  created_at: string;
  updated_at: string;
  properties?: {
    id?: string;
    title?: string;
    area?: string;
    property_type?: string | null;
    bedrooms?: number | null;
    capacity?: number | null;
    nightly_rate?: number;
    refundable_deposit?: number;
    status?: string;
  } | null;
}

export interface AcceptedDealTermsSnapshot {
  deal_id: string;
  deal_code: string;
  property_id: string;
  title: string;
  deal_structure: AgentDealStructure;
  billing_unit: AgentDealBillingUnit;
  unit_nights: number;
  authorised_selling_price_ngn: number;
  owner_allocation_ngn: number;
  agent_payout_ngn: number;
  min_stay_nights: number;
  starts_on: string;
  expires_on: string | null;
  booking_responsibilities: string;
  cancellation_conditions: string;
  exclusivity: AgentDealExclusivity;
  terms_version: number;
  created_by: string;
  accepted_at: string;
}

export interface AgentDealAcceptanceRecord {
  id: string;
  deal_id: string;
  property_id: string;
  agent_id: string;
  decision: AgentDealDecision;
  accepted_terms_snapshot: AcceptedDealTermsSnapshot;
  share_link_id: string | null;
  share_token?: string | null;
  responded_at: string;
  updated_at: string;
}

export interface DealBoardFilterInput {
  area?: string;
  propertyType?: string;
  maxSellingPriceNgn?: number | null;
  minAgentPayoutNgn?: number | null;
  dealStructure?: '' | AgentDealStructure;
}

export function filterAvailableAgentDeals(
  deals: ReadonlyArray<AgentDealRecord>,
  filters: DealBoardFilterInput,
  viewerAgentId?: string | null,
  todayIso = new Date().toISOString().slice(0, 10),
): AgentDealRecord[] {
  return deals.filter(deal => {
    if (deal.status !== 'published') return false;
    if (deal.expires_on && deal.expires_on < todayIso) return false;
    if (
      deal.exclusivity === 'exclusive_agent' &&
      deal.exclusive_agent_id &&
      viewerAgentId &&
      deal.exclusive_agent_id !== viewerAgentId &&
      deal.created_by !== viewerAgentId
    ) {
      return false;
    }

    if (filters.area && filters.area.trim()) {
      const targetArea = filters.area.trim().toLowerCase();
      const propArea = (deal.properties?.area || '').toLowerCase();
      if (!propArea.includes(targetArea)) return false;
    }

    if (filters.propertyType && filters.propertyType.trim()) {
      const targetType = filters.propertyType.trim().toLowerCase();
      const propType = (deal.properties?.property_type || '').toLowerCase();
      if (!propType.includes(targetType)) return false;
    }

    if (
      typeof filters.maxSellingPriceNgn === 'number' &&
      Number.isFinite(filters.maxSellingPriceNgn) &&
      filters.maxSellingPriceNgn > 0 &&
      deal.authorised_selling_price_ngn > filters.maxSellingPriceNgn
    ) {
      return false;
    }

    if (
      typeof filters.minAgentPayoutNgn === 'number' &&
      Number.isFinite(filters.minAgentPayoutNgn) &&
      filters.minAgentPayoutNgn > 0 &&
      deal.agent_payout_ngn < filters.minAgentPayoutNgn
    ) {
      return false;
    }

    if (filters.dealStructure && deal.deal_structure !== filters.dealStructure) {
      return false;
    }

    return true;
  });
}

/**
 * Generates an authorised HAMLET property + deal URL ONLY after the agent has
 * accepted the deal and obtained a server-issued share token (`hsl_...`).
 */
export function buildAuthorisedDealShareUrl(params: {
  propertyId: string;
  shareToken: string;
  dealCode: string;
  origin?: string;
}): string {
  const cleanPropertyId = params.propertyId.trim();
  const cleanToken = params.shareToken.trim().toLowerCase();
  const cleanDeal = params.dealCode.trim().toUpperCase();
  if (!cleanPropertyId || !/^hsl_[a-z0-9]{16,64}$/.test(cleanToken)) {
    throw new Error('Deal terms must be accepted before generating an authorised partner link.');
  }
  const baseOrigin = (params.origin || HAMLET_CANONICAL_ORIGIN).replace(/\/+$/, '');
  const url = new URL(`${baseOrigin}/stays/${encodeURIComponent(cleanPropertyId)}`);
  url.searchParams.set('ref', cleanToken);
  if (cleanDeal) {
    url.searchParams.set('deal', cleanDeal);
  }
  url.searchParams.set('src', 'whatsapp_deal');
  return url.toString();
}

export function buildDealWhatsAppSummary(params: {
  propertyTitle: string;
  area: string;
  dealStructure: AgentDealStructure;
  billingUnit: AgentDealBillingUnit;
  authorisedSellingPriceNgn: number;
  minStayNights: number;
  shareUrl: string;
}): { text: string; whatsappUrl: string } {
  const unitTerms = validateAndComputeAgentDealTerms({
    dealStructure: params.dealStructure,
    billingUnit: params.billingUnit,
    authorisedSellingPriceNgn: params.authorisedSellingPriceNgn,
    ownerAllocationNgn:
      params.dealStructure === 'owner_net_rate' ? params.authorisedSellingPriceNgn : undefined,
    agentPayoutNgn: params.dealStructure === 'fixed_agent_payout' ? 0 : undefined,
  });
  const guestDisplayRate = guestFacingNightlyNgn(unitTerms.authorisedSellingPriceNgn);
  const unitLabel = params.billingUnit === 'per_week' ? 'week' : 'night';
  const lines = [
    `*${params.propertyTitle.trim()}* — ${params.area.trim()}, Lagos`,
    `Authorised HAMLET stay rate: ${formatNaira(guestDisplayRate)} / ${unitLabel} (min ${params.minStayNights} ${params.minStayNights === 1 ? 'night' : 'nights'})`,
    `View verified details & request dates on HAMLET: ${params.shareUrl}`,
  ];
  const text = lines.join('\n');
  return {
    text,
    whatsappUrl: `https://wa.me/?text=${encodeURIComponent(text)}`,
  };
}

// ─── Feature 2: Duplicate Detection & Submitter Role Integrity ───────────────

export type SubmitterRelationshipRole = 'owner' | 'authorised_manager' | 'sourcing_agent';

/**
 * Ensures an agent never automatically becomes the owner of a property merely by submitting it.
 */
export function resolveSubmitterAccessRole(submittedRoleInput?: string | null): {
  relationship: SubmitterRelationshipRole;
  accessRole: string;
  scope: string;
} {
  const raw = (submittedRoleInput || '').trim().toLowerCase();
  if (
    raw.includes('agent') ||
    raw.includes('introducer') ||
    raw.includes('broker') ||
    raw.includes('marketer') ||
    raw.includes('scout')
  ) {
    return {
      relationship: 'sourcing_agent',
      accessRole: 'sourcing_agent',
      scope: 'Property sourcing submission — requires owner authority verification',
    };
  }
  if (raw.includes('manager') || raw.includes('co-host') || raw.includes('operator')) {
    return {
      relationship: 'authorised_manager',
      accessRole: 'authorised_manager',
      scope: 'Authorised property manager — pending mandate verification',
    };
  }
  if (raw.includes('owner') || raw.includes('landlord')) {
    return {
      relationship: 'owner',
      accessRole: 'owner',
      scope: 'Declared property owner — pending title & identity verification',
    };
  }
  return {
    relationship: 'authorised_manager',
    accessRole: 'submitter',
    scope: 'Submitter — pending authority review',
  };
}

export interface DuplicateComparisonProperty {
  id: string;
  title: string;
  area: string;
  publicAddress: string;
  buildingOrEstate?: string | null;
  unitIdentifier?: string | null;
  ownerOrSubmitterId?: string | null;
  imageUrls?: ReadonlyArray<string>;
  status?: string;
}

export interface DuplicateDetectionFlagCandidate {
  matchedPropertyId: string;
  matchedTitle: string;
  confidenceScore: number;
  matchReasons: string[];
}

function normalizeTokenSet(input: string | null | undefined): Set<string> {
  const cleaned = (input || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length >= 3 && !['lagos', 'street', 'road', 'close', 'apartment', 'flat', 'shortlet', 'the', 'and'].includes(token));
  return new Set(cleaned);
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function cleanNorm(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Non-destructive duplicate detector: flags likely duplicates for Admin investigation
 * without auto-deleting or merging legitimate distinct units in the same building.
 */
export function detectLikelyPropertyDuplicates(
  candidate: Omit<DuplicateComparisonProperty, 'id'> & { id?: string },
  existingProperties: ReadonlyArray<DuplicateComparisonProperty>,
): DuplicateDetectionFlagCandidate[] {
  const results: DuplicateDetectionFlagCandidate[] = [];
  const candArea = cleanNorm(candidate.area);
  const candAddr = cleanNorm(candidate.publicAddress);
  const candBuilding = cleanNorm(candidate.buildingOrEstate);
  const candUnit = cleanNorm(candidate.unitIdentifier);
  const candAddrTokens = normalizeTokenSet(`${candidate.publicAddress} ${candidate.buildingOrEstate || ''}`);
  const candTitleTokens = normalizeTokenSet(candidate.title);
  const candImages = new Set((candidate.imageUrls || []).map(u => u.trim()).filter(Boolean));

  for (const existing of existingProperties) {
    if (candidate.id && existing.id === candidate.id) continue;
    if (existing.status && ['rejected', 'archived'].includes(existing.status)) continue;

    let score = 0;
    const reasons: string[] = [];

    const existArea = cleanNorm(existing.area);
    const existAddr = cleanNorm(existing.publicAddress);
    const existBuilding = cleanNorm(existing.buildingOrEstate);
    const existUnit = cleanNorm(existing.unitIdentifier);

    if (candAddr && existAddr && candAddr === existAddr && candArea === existArea) {
      score += 55;
      reasons.push('identical_public_address');
    } else {
      const addrSim = jaccardSimilarity(
        candAddrTokens,
        normalizeTokenSet(`${existing.publicAddress} ${existing.buildingOrEstate || ''}`),
      );
      if (addrSim >= 0.6 && candArea === existArea) {
        score += 35;
        reasons.push('high_address_similarity');
      }
    }

    if (candBuilding && existBuilding && candBuilding === existBuilding) {
      if (candUnit && existUnit && candUnit === existUnit) {
        score += 45;
        reasons.push('same_building_and_unit');
      } else if (!candUnit || !existUnit) {
        score += 25;
        reasons.push('same_building_unspecified_unit');
      }
    }

    const titleSim = jaccardSimilarity(candTitleTokens, normalizeTokenSet(existing.title));
    if (titleSim >= 0.6) {
      score += 20;
      reasons.push('similar_listing_title');
    }

    let sharedImages = 0;
    for (const img of existing.imageUrls || []) {
      if (candImages.has(img.trim())) sharedImages += 1;
    }
    if (sharedImages > 0) {
      score += Math.min(50, 35 + (sharedImages - 1) * 10);
      reasons.push('shared_property_images');
    }

    if (
      score >= 25 &&
      candidate.ownerOrSubmitterId &&
      existing.ownerOrSubmitterId &&
      candidate.ownerOrSubmitterId !== existing.ownerOrSubmitterId
    ) {
      score += 15;
      reasons.push('conflicting_submitter_identity');
    }

    if (score >= 45) {
      results.push({
        matchedPropertyId: existing.id,
        matchedTitle: existing.title,
        confidenceScore: Math.min(100, score),
        matchReasons: reasons,
      });
    }
  }

  return results.sort((a, b) => b.confidenceScore - a.confidenceScore);
}

// ─── Feature 4: Caution Fee & Inspection Tracker ─────────────────────────────

export type CautionDepositLifecycleStatus =
  | 'not_applicable'
  | 'due'
  | 'received'
  | 'inspection_pending'
  | 'refund_approved'
  | 'partially_refunded'
  | 'disputed'
  | 'refunded'
  | 'refund_completed';

export const CAUTION_STATUS_LABELS: Record<CautionDepositLifecycleStatus, string> = {
  not_applicable: 'Not applicable (₦0 caution fee)',
  due: 'Due prior to check-in',
  received: 'Received & recorded',
  inspection_pending: 'Post-checkout inspection pending',
  refund_approved: 'Refund approved',
  partially_refunded: 'Partially refunded (documented deduction)',
  disputed: 'Under dispute review',
  refunded: 'Refunded',
  refund_completed: 'Refunded',
};

export const HONEST_CAUTION_CUSTODY_DISCLOSURE =
  'Caution fee records, check-in/check-out inspections, and deduction evidence are tracked on HAMLET for transparency and reconciliation. HAMLET does not operate an unregulated third-party escrow custody service.';

export interface InspectionEvidenceItem {
  url: string;
  media_type: 'photo' | 'video';
  caption: string;
  captured_at: string;
}

export interface CautionDamageClaimInput {
  depositAmountNgn: number;
  claimedAmountNgn: number;
  issueDescription: string;
  evidence: ReadonlyArray<InspectionEvidenceItem>;
  excludesNormalWearAndTear: boolean;
}

export function validateCautionDamageClaim(input: CautionDamageClaimInput): void {
  if (!input.excludesNormalWearAndTear) {
    throw new Error(
      'Normal wear and tear cannot be claimed as a caution fee deduction.',
    );
  }
  const claimed = Math.round(Number(input.claimedAmountNgn));
  if (!Number.isFinite(claimed) || claimed <= 0) {
    throw new Error('Claimed deduction amount must be greater than ₦0.');
  }
  if (claimed > Math.round(Number(input.depositAmountNgn))) {
    throw new Error('Claimed deduction cannot exceed the recorded caution fee.');
  }
  if ((input.issueDescription || '').trim().length < 12) {
    throw new Error(
      'Provide a clear description of the reported damage or missing item (minimum 12 characters).',
    );
  }
  if (!Array.isArray(input.evidence) || input.evidence.length === 0) {
    throw new Error(
      'At least one timestamped photo or video evidence item is required for a damage deduction.',
    );
  }
}

// ─── Feature 5: Booking Response & Availability Indicators ───────────────────

export type BookingMode = 'request_to_book' | 'instant_confirmation';

export interface AvailabilityFreshnessSummary {
  bookingMode: BookingMode;
  bookingModeLabel: string;
  bookingModeDescription: string;
  freshnessTone: 'fresh' | 'moderate' | 'stale' | 'unknown';
  lastUpdatedLabel: string;
  daysSinceUpdate: number | null;
}

export function computeAvailabilityFreshness(params: {
  bookingMode?: string | null;
  lastAvailabilityUpdate?: string | null;
  confirmationStatus?: string | null;
  nowIso?: string;
}): AvailabilityFreshnessSummary {
  const mode: BookingMode =
    params.bookingMode === 'instant_confirmation'
      ? 'instant_confirmation'
      : 'request_to_book';
  const bookingModeLabel =
    mode === 'instant_confirmation'
      ? 'Instant confirmation'
      : 'Request to book';
  const bookingModeDescription =
    mode === 'instant_confirmation'
      ? 'Dates are pre-confirmed by the host calendar; payment window opens immediately.'
      : 'Host confirms genuine availability first before your 48-hour payment window opens.';

  if (!params.lastAvailabilityUpdate) {
    return {
      bookingMode: mode,
      bookingModeLabel,
      bookingModeDescription,
      freshnessTone: 'unknown',
      lastUpdatedLabel:
        params.confirmationStatus === 'needs_confirmation'
          ? 'Host confirms dates on each request'
          : 'Availability confirmed on request',
      daysSinceUpdate: null,
    };
  }

  const nowMs = new Date(params.nowIso || new Date().toISOString()).getTime();
  const updatedMs = new Date(params.lastAvailabilityUpdate).getTime();
  if (Number.isNaN(updatedMs)) {
    return {
      bookingMode: mode,
      bookingModeLabel,
      bookingModeDescription,
      freshnessTone: 'unknown',
      lastUpdatedLabel: 'Availability confirmed on request',
      daysSinceUpdate: null,
    };
  }

  const days = Math.max(0, Math.floor((nowMs - updatedMs) / 86_400_000));
  if (params.confirmationStatus === 'needs_confirmation' || days > 14) {
    return {
      bookingMode: mode,
      bookingModeLabel,
      bookingModeDescription,
      freshnessTone: 'stale',
      lastUpdatedLabel: `Availability updated ${days}d ago · host reconfirms on request`,
      daysSinceUpdate: days,
    };
  }
  if (days <= 3) {
    return {
      bookingMode: mode,
      bookingModeLabel,
      bookingModeDescription,
      freshnessTone: 'fresh',
      lastUpdatedLabel:
        days === 0
          ? 'Availability updated today'
          : `Availability updated ${days} ${days === 1 ? 'day' : 'days'} ago`,
      daysSinceUpdate: days,
    };
  }
  return {
    bookingMode: mode,
    bookingModeLabel,
    bookingModeDescription,
    freshnessTone: 'moderate',
    lastUpdatedLabel: `Availability updated ${days} days ago`,
    daysSinceUpdate: days,
  };
}

export interface BookingResponseIndicator {
  bookingStatusLabel: string;
  ownerResponseLabel: string;
  isAwaitingPartner: boolean;
  isOverdue: boolean;
  hoursWaiting: number;
}

export function computeBookingResponseIndicator(params: {
  status: string;
  createdAt?: string | null;
  nowIso?: string;
  overdueHoursThreshold?: number;
}): BookingResponseIndicator {
  const threshold = params.overdueHoursThreshold ?? 12;
  const nowMs = new Date(params.nowIso || new Date().toISOString()).getTime();
  const createdMs = params.createdAt ? new Date(params.createdAt).getTime() : nowMs;
  const hoursWaiting = Number.isNaN(createdMs)
    ? 0
    : Math.max(0, Math.floor((nowMs - createdMs) / 3_600_000));

  const isAwaitingPartner = ['requested', 'checking'].includes(params.status);
  const isOverdue = isAwaitingPartner && hoursWaiting >= threshold;

  switch (params.status) {
    case 'requested':
      return {
        bookingStatusLabel: 'Pending confirmation',
        ownerResponseLabel: isOverdue
          ? `Overdue response (${hoursWaiting}h waiting — reminder flagged)`
          : 'Awaiting owner/manager review',
        isAwaitingPartner: true,
        isOverdue,
        hoursWaiting,
      };
    case 'checking':
      return {
        bookingStatusLabel: 'Pending confirmation',
        ownerResponseLabel: isOverdue
          ? `Availability check overdue (${hoursWaiting}h waiting)`
          : 'Owner/manager checking calendar',
        isAwaitingPartner: true,
        isOverdue,
        hoursWaiting,
      };
    case 'awaiting_payment':
      return {
        bookingStatusLabel: 'Accepted — awaiting payment',
        ownerResponseLabel: 'Confirmed available by host (48h payment hold open)',
        isAwaitingPartner: false,
        isOverdue: false,
        hoursWaiting,
      };
    case 'confirmed':
      return {
        bookingStatusLabel: 'Confirmed booking',
        ownerResponseLabel: 'Host accepted & payment verified',
        isAwaitingPartner: false,
        isOverdue: false,
        hoursWaiting,
      };
    case 'completed':
      return {
        bookingStatusLabel: 'Completed stay',
        ownerResponseLabel: 'Stay completed',
        isAwaitingPartner: false,
        isOverdue: false,
        hoursWaiting,
      };
    case 'declined':
      return {
        bookingStatusLabel: 'Declined booking',
        ownerResponseLabel: 'Declined by owner/manager (dates unavailable)',
        isAwaitingPartner: false,
        isOverdue: false,
        hoursWaiting,
      };
    case 'cancelled':
      return {
        bookingStatusLabel: 'Cancelled booking',
        ownerResponseLabel: 'Booking cancelled',
        isAwaitingPartner: false,
        isOverdue: false,
        hoursWaiting,
      };
    default:
      return {
        bookingStatusLabel: params.status.replace(/_/g, ' '),
        ownerResponseLabel: 'Status recorded',
        isAwaitingPartner: false,
        isOverdue: false,
        hoursWaiting,
      };
  }
}

// ─── Feature 7: Structured 7-Check Property Trust Profile ────────────────────

export type TrustCheckCode =
  | 'details_submitted'
  | 'owner_identity_reviewed'
  | 'management_authority_reviewed'
  | 'listing_reviewed'
  | 'physical_inspection_completed'
  | 'property_info_updated'
  | 'documents_reviewed';

export type TrustCheckStatus =
  | 'verified'
  | 'pending_review'
  | 'additional_docs_requested'
  | 'rejected'
  | 'not_started';

export const TRUST_CHECK_DEFINITIONS: ReadonlyArray<{
  code: TrustCheckCode;
  label: string;
  guestDescription: string;
}> = [
  {
    code: 'details_submitted',
    label: 'Property details submitted',
    guestDescription: 'Core specifications, photos, house rules and Lagos location submitted.',
  },
  {
    code: 'owner_identity_reviewed',
    label: 'Owner identity reviewed',
    guestDescription: 'Government-issued identity of the property owner or principal reviewed.',
  },
  {
    code: 'management_authority_reviewed',
    label: 'Property ownership or management authority reviewed',
    guestDescription: 'Title evidence or signed management mandate authorising shortlet operations reviewed.',
  },
  {
    code: 'listing_reviewed',
    label: 'Listing reviewed by HAMLET',
    guestDescription: 'Pricing disclosures, amenities and listing accuracy reviewed by HAMLET operations.',
  },
  {
    code: 'physical_inspection_completed',
    label: 'Physical inspection completed',
    guestDescription: 'On-site inspection of rooms, backup power, water and safety completed.',
  },
  {
    code: 'property_info_updated',
    label: 'Property information updated',
    guestDescription: 'Availability settings, rates and property details kept current.',
  },
  {
    code: 'documents_reviewed',
    label: 'Relevant documents reviewed',
    guestDescription: 'Supporting compliance and authority documentation reviewed (kept confidential).',
  },
] as const;

export interface PublicTrustCheckItem {
  check_code: TrustCheckCode;
  label: string;
  guestDescription: string;
  status: TrustCheckStatus;
  public_summary: string | null;
  inspection_outcome: string | null;
  reviewed_at: string | null;
}

export interface PublicPropertyTrustSummary {
  /** Never claims full verification unless all 7 checks are genuinely verified. */
  headlineLabel: string;
  allChecksVerified: boolean;
  verifiedCount: number;
  totalChecks: number;
  /** Checks that have genuinely occurred (`status === 'verified'`). */
  completedChecks: PublicTrustCheckItem[];
  /** Remaining checks shown transparently without pretending they are verified. */
  pendingChecks: PublicTrustCheckItem[];
}

export function buildPublicPropertyTrustSummary(params: {
  trustChecks?: ReadonlyArray<{
    check_code: string;
    status: string;
    public_summary?: string | null;
    inspection_outcome?: string | null;
    reviewed_at?: string | null;
  }> | null;
  legacyVerification?: Record<string, string> | null;
  propertyUpdatedAt?: string | null;
}): PublicPropertyTrustSummary {
  const rowMap = new Map<
    string,
    {
      status: TrustCheckStatus;
      public_summary: string | null;
      inspection_outcome: string | null;
      reviewed_at: string | null;
    }
  >();

  for (const row of params.trustChecks || []) {
    const validStatus: TrustCheckStatus = (
      [
        'verified',
        'pending_review',
        'additional_docs_requested',
        'rejected',
        'not_started',
      ] as const
    ).includes(row.status as TrustCheckStatus)
      ? (row.status as TrustCheckStatus)
      : 'not_started';
    rowMap.set(row.check_code, {
      status: validStatus,
      public_summary: row.public_summary || null,
      inspection_outcome: row.inspection_outcome || null,
      reviewed_at: row.reviewed_at || null,
    });
  }

  const leg = params.legacyVerification ?? {};
  const mapLegacy = (val?: string): TrustCheckStatus =>
    val === 'verified' ? 'verified' : val === 'pending_review' ? 'pending_review' : 'not_started';

  const items: PublicTrustCheckItem[] = TRUST_CHECK_DEFINITIONS.map(def => {
    const explicit = rowMap.get(def.code);
    if (explicit) {
      return {
        check_code: def.code,
        label: def.label,
        guestDescription: def.guestDescription,
        status: explicit.status,
        public_summary: explicit.public_summary,
        inspection_outcome: explicit.inspection_outcome,
        reviewed_at: explicit.reviewed_at,
      };
    }

    // Derive conservatively from genuine legacy verification fields without overclaiming
    let fallbackStatus: TrustCheckStatus = 'not_started';
    if (def.code === 'details_submitted') {
      fallbackStatus = 'verified';
    } else if (def.code === 'owner_identity_reviewed') {
      fallbackStatus = mapLegacy(leg.identity);
    } else if (def.code === 'management_authority_reviewed') {
      fallbackStatus =
        leg.ownership === 'verified' && leg.authority === 'verified'
          ? 'verified'
          : leg.ownership === 'verified' || leg.authority === 'verified'
            ? 'pending_review'
            : mapLegacy(leg.authority);
    } else if (def.code === 'documents_reviewed') {
      fallbackStatus = mapLegacy(leg.ownership);
    } else if (def.code === 'physical_inspection_completed') {
      fallbackStatus = mapLegacy(leg.inspection);
    } else if (def.code === 'property_info_updated' && params.propertyUpdatedAt) {
      fallbackStatus = 'verified';
    }

    return {
      check_code: def.code,
      label: def.label,
      guestDescription: def.guestDescription,
      status: fallbackStatus,
      public_summary: null,
      inspection_outcome: null,
      reviewed_at:
        fallbackStatus === 'verified' ? params.propertyUpdatedAt || null : null,
    };
  });

  const completedChecks = items.filter(item => item.status === 'verified');
  const pendingChecks = items.filter(item => item.status !== 'verified');
  const allChecksVerified = completedChecks.length === items.length;

  const headlineLabel = allChecksVerified
    ? `All ${items.length} trust checks completed`
    : `${completedChecks.length} of ${items.length} trust checks completed`;

  return {
    headlineLabel,
    allChecksVerified,
    verifiedCount: completedChecks.length,
    totalChecks: items.length,
    completedChecks,
    pendingChecks,
  };
}

// ─── Section 6: Horatio Structured Data Readiness (Zero Hallucination) ───────

export interface HoratioGroundedStayRecord {
  id: string;
  title: string;
  area: string;
  nightlyRateNgn: number;
  cautionDepositNgn: number;
  amenities: ReadonlyArray<string>;
  acceptsWeekendBookings?: boolean;
  authorisedAgentCount?: number;
  verifiedTrustCheckCount?: number;
}

export interface HoratioGroundedBookingRecord {
  reference: string;
  propertyTitle: string;
  status: string;
  checkIn: string;
  checkOut: string;
}

export function answerHoratioFromActualRecords(params: {
  question: string;
  approvedStays: ReadonlyArray<HoratioGroundedStayRecord>;
  guestBookings?: ReadonlyArray<HoratioGroundedBookingRecord>;
}): { answer: string; matchedPropertyIds: string[] } {
  const q = params.question.trim().toLowerCase();
  const stays = params.approvedStays;

  if (q.includes('booking status') || q.includes('my booking')) {
    const bookings = params.guestBookings ?? [];
    if (bookings.length === 0) {
      return {
        answer: 'No booking records were found for the current session. Open My Bookings after signing in to view live request statuses.',
        matchedPropertyIds: [],
      };
    }
    const summary = bookings
      .slice(0, 3)
      .map(b => `${b.reference} (${b.propertyTitle}): ${b.status.replace(/_/g, ' ')}`)
      .join('; ');
    return {
      answer: `Recorded booking status: ${summary}.`,
      matchedPropertyIds: [],
    };
  }

  const areaFiltered = stays.filter(stay => q.includes(stay.area.toLowerCase()));
  const scope = areaFiltered.length > 0 ? areaFiltered : stays;

  if (q.includes('caution')) {
    if (scope.length === 0) {
      return {
        answer: 'No approved properties matched that query in current HAMLET records.',
        matchedPropertyIds: [],
      };
    }
    const lines = scope.map(
      s =>
        `${s.title} (${s.area}): ${
          s.cautionDepositNgn > 0
            ? `${formatNaira(s.cautionDepositNgn)} refundable caution deposit`
            : 'no caution deposit required'
        }`,
    );
    return {
      answer: `Recorded caution deposits: ${lines.join('; ')}.`,
      matchedPropertyIds: scope.map(s => s.id),
    };
  }

  if (q.includes('authorised agent') || q.includes('authorized agent')) {
    const withAgents = scope.filter(s => (s.authorisedAgentCount ?? 0) > 0);
    if (withAgents.length === 0) {
      return {
        answer: 'None of the matched approved properties currently have active authorised agents on record.',
        matchedPropertyIds: [],
      };
    }
    return {
      answer: `Approved properties with authorised agents: ${withAgents
        .map(s => `${s.title} (${s.authorisedAgentCount} authorised)`)
        .join('; ')}.`,
      matchedPropertyIds: withAgents.map(s => s.id),
    };
  }

  if (q.includes('weekend')) {
    const weekendReady = scope.filter(s => s.acceptsWeekendBookings !== false);
    if (weekendReady.length === 0) {
      return {
        answer: 'No approved properties accepting weekend bookings were found in current records.',
        matchedPropertyIds: [],
      };
    }
    return {
      answer: `Approved properties open to weekend requests: ${weekendReady
        .map(s => `${s.title} in ${s.area}`)
        .join('; ')}.`,
      matchedPropertyIds: weekendReady.map(s => s.id),
    };
  }

  if (q.includes('amenit')) {
    if (scope.length === 0) {
      return {
        answer: 'No approved properties matched that query in current HAMLET records.',
        matchedPropertyIds: [],
      };
    }
    return {
      answer: scope
        .map(s => `${s.title}: ${s.amenities.slice(0, 6).join(', ') || 'No amenities listed'}`)
        .join(' | '),
      matchedPropertyIds: scope.map(s => s.id),
    };
  }

  if (scope.length === 0) {
    return {
      answer: 'No approved properties are currently recorded for that area on HAMLET.',
      matchedPropertyIds: [],
    };
  }

  return {
    answer: `Approved stays on record (${scope.length}): ${scope
      .map(
        s =>
          `${s.title} in ${s.area} (${formatNaira(
            guestFacingNightlyNgn(s.nightlyRateNgn),
          )}/night)`,
      )
      .join('; ')}.`,
    matchedPropertyIds: scope.map(s => s.id),
  };
}
