// ─── HAMLET Partner Referral, Attribution & Recurring Reward Engine (§4 & §8.1) ─
// Rules:
//   - Canonical partner recruitment URL uses https://www.hamlet.rest/partners/apply?ref=CODE
//   - Single direct referrer per partner; no self-referrals; no multi-level / cascading rewards.
//   - No registration or property-upload bonuses.
//   - Referred closing agent's FIRST completed eligible booking activates the referral relationship
//     (₦0 recurring reward) and opens the configurable 90-day earning window.
//   - Subsequent completed eligible bookings within the 90-day window earn 2.5% of the owner's
//     listed accommodation price B in NGN.
//   - Cancelled, refunded, uncompleted or fraudulent bookings earn ₦0 (and reverse unpaid rewards).

import type { PartnerReferral } from './types';
import {
  DEFAULT_REFERRAL_WINDOW_DAYS,
  DIRECT_REFERRER_REWARD_RATE,
  multiplyNairaBasisPoints,
} from './pricing';

export const HAMLET_PRODUCTION_ORIGIN = 'https://www.hamlet.rest';
export const HAMLET_CANONICAL_ORIGIN = HAMLET_PRODUCTION_ORIGIN;
export const REFERRAL_CODE_REGEX = /^HML-[A-Z0-9]{4,14}$/;

export function normalizeReferralCode(raw?: string | null): string {
  if (!raw) return '';
  return raw.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
}

export function isValidReferralCodeFormat(code?: string | null): boolean {
  const clean = normalizeReferralCode(code);
  return REFERRAL_CODE_REGEX.test(clean);
}

/** Deterministic, human-readable partner referral code generator for demo & fallback use. */
export function generatePartnerReferralCode(
  nameOrEmail: string,
  uniqueSeed: string,
  existingCodes?: Set<string>,
): string {
  const alpha = nameOrEmail
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3)
    .padEnd(3, 'P');
  let attempt = 0;
  while (attempt < 50) {
    let hash = 2166136261;
    const input = `${nameOrEmail}:${uniqueSeed}:${attempt}`;
    for (let i = 0; i < input.length; i += 1) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    const suffix = (hash >>> 0)
      .toString(36)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .padStart(5, '0')
      .slice(0, 5);
    const candidate = `HML-${alpha}${suffix}`;
    if (!existingCodes || !existingCodes.has(candidate)) {
      return candidate;
    }
    attempt += 1;
  }
  return `HML-${alpha}${Date.now().toString(36).toUpperCase().slice(-5)}`;
}

export const buildPartnerReferralCode = generatePartnerReferralCode;

/** Partner recruitment link: attribution is captured on the current Next.js route. */
export function buildPartnerReferralUrl(referralCode: string): string {
  const clean = normalizeReferralCode(referralCode);
  return `${HAMLET_PRODUCTION_ORIGIN}/partners/apply?ref=${encodeURIComponent(clean)}`;
}

export const buildCanonicalReferralUrl = buildPartnerReferralUrl;

/** Guest discovery link. The code is captured and carried into guest sign-up. */
export function buildGuestReferralUrl(referralCode: string): string {
  const clean = normalizeReferralCode(referralCode);
  return `${HAMLET_PRODUCTION_ORIGIN}/?ref=${encodeURIComponent(clean)}`;
}

/** Shareable closing-agent stay discovery link on the current Next.js routes. */
export function buildClosingAgentShareUrl(referralCode: string, propertyId?: string): string {
  const clean = normalizeReferralCode(referralCode);
  const route = propertyId ? `/stays/${encodeURIComponent(propertyId)}` : '/stays';
  const separator = route.includes('?') ? '&' : '?';
  return `${HAMLET_PRODUCTION_ORIGIN}${route}${separator}agent=${encodeURIComponent(clean)}`;
}

/** WhatsApp referral share link with encoded production URL and message (§4.2). */
export function buildWhatsAppReferralShareUrl(referralCode: string, partnerName?: string): string {
  const referralUrl = buildPartnerReferralUrl(referralCode);
  const intro = partnerName?.trim()
    ? `${partnerName.trim()} invited you to join the HAMLET Partner Network in Lagos.`
    : 'Join the HAMLET Partner Network in Lagos to list verified shortlets and close bookings.';
  const message = `${intro} Register with my partner referral link: ${referralUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export const buildReferralWhatsAppShareUrl = buildWhatsAppReferralShareUrl;

export interface ReferralCompletionEvaluationInput {
  referral: Pick<
    PartnerReferral,
    | 'id'
    | 'referrerPartnerId'
    | 'referredPartnerId'
    | 'status'
    | 'earningWindowDays'
    | 'activatedAt'
    | 'activatingBookingId'
    | 'eligibilityStartsAt'
    | 'eligibilityEndsAt'
  >;
  referrerAccountActive: boolean;
  referredAccountActive: boolean;
  bookingId: string;
  bookingStatus: string;
  closingAgentId?: string | null;
  ownerListedPriceNgn: number;
  completedAtIso?: string;
}

export interface ReferralCompletionEvaluationResult {
  action: 'none' | 'activate_only' | 'award_recurring' | 'window_expired';
  rewardRate: number;
  rewardAmountNgn: number;
  reason: string;
  nextActivatedAt?: string;
  nextEligibilityEndsAt?: string;
}

/**
 * Pure, deterministic evaluation of a booking against HAMLET's recurring referral rules (§4.4 & §8.1).
 */
export function evaluateReferralOnBookingCompletion(
  input: ReferralCompletionEvaluationInput,
): ReferralCompletionEvaluationResult {
  const { referral } = input;
  const completedAt = input.completedAtIso ? new Date(input.completedAtIso) : new Date();

  if (input.bookingStatus !== 'completed') {
    return {
      action: 'none',
      rewardRate: 0,
      rewardAmountNgn: 0,
      reason: 'Only completed eligible stays qualify for referral activation or rewards.',
    };
  }

  if (!input.closingAgentId || input.closingAgentId !== referral.referredPartnerId) {
    return {
      action: 'none',
      rewardRate: 0,
      rewardAmountNgn: 0,
      reason: 'Referred partner is not the validly attributed closing agent on this booking.',
    };
  }

  if (
    referral.referrerPartnerId === referral.referredPartnerId ||
    referral.referrerPartnerId === input.closingAgentId
  ) {
    return {
      action: 'none',
      rewardRate: 0,
      rewardAmountNgn: 0,
      reason: 'Self-referrals are prohibited.',
    };
  }

  if (!input.referrerAccountActive || !input.referredAccountActive) {
    return {
      action: 'none',
      rewardRate: 0,
      rewardAmountNgn: 0,
      reason: 'Both referrer and referred partner accounts must be verified and active.',
    };
  }

  if (
    referral.status === 'revoked' ||
    referral.status === 'disputed' ||
    referral.status === 'registered' ||
    referral.status === 'pending_verification'
  ) {
    return {
      action: 'none',
      rewardRate: 0,
      rewardAmountNgn: 0,
      reason: `Referral status "${referral.status}" is not eligible for activation or payout.`,
    };
  }

  // Idempotency guard: if this exact booking already activated the referral, do nothing.
  if (referral.activatingBookingId && referral.activatingBookingId === input.bookingId) {
    return {
      action: 'none',
      rewardRate: 0,
      rewardAmountNgn: 0,
      reason: 'This booking already activated the referral relationship.',
    };
  }

  // Rule: First completed eligible booking activates the referral relationship (₦0 reward)
  // and starts the configurable 90-day earning window.
  if (referral.status === 'verified' && !referral.activatedAt) {
    const windowDays =
      referral.earningWindowDays > 0 ? referral.earningWindowDays : DEFAULT_REFERRAL_WINDOW_DAYS;
    const endsAt = new Date(completedAt.getTime() + windowDays * 86_400_000).toISOString();
    return {
      action: 'activate_only',
      rewardRate: 0,
      rewardAmountNgn: 0,
      reason: `First completed eligible booking activated referral; ${windowDays}-day earning window opened (no payout on activating booking).`,
      nextActivatedAt: completedAt.toISOString(),
      nextEligibilityEndsAt: endsAt,
    };
  }

  if (referral.status === 'active' && referral.eligibilityEndsAt) {
    const endsAtMs = new Date(referral.eligibilityEndsAt).getTime();
    const startsAtMs = referral.eligibilityStartsAt
      ? new Date(referral.eligibilityStartsAt).getTime()
      : 0;

    if (completedAt.getTime() < startsAtMs || completedAt.getTime() > endsAtMs) {
      return {
        action: 'window_expired',
        rewardRate: 0,
        rewardAmountNgn: 0,
        reason: 'Booking completed outside the 90-day referral earning window.',
      };
    }

    const rewardAmountNgn = multiplyNairaBasisPoints(input.ownerListedPriceNgn, 250); // 2.5% of B
    return {
      action: 'award_recurring',
      rewardRate: DIRECT_REFERRER_REWARD_RATE,
      rewardAmountNgn,
      reason:
        'Qualifying subsequent completed booking within 90-day window — 2.5% of owner listed price.',
    };
  }

  return {
    action: 'none',
    rewardRate: 0,
    rewardAmountNgn: 0,
    reason: 'Referral earning window is not active.',
  };
}
