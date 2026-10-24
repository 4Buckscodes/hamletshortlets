// ─── HAMLET Authoritative Property Availability Engine (§3) ──────────────────
// Publication status (draft / submitted / approved / paused / rejected / suspended / archived)
// is completely independent from calendar availability.
// Approved properties remain discoverable when occupied; this module derives
// authoritative guest-facing availability labels, next available check-in date,
// and date-range conflict checks from one unified calendar model.

import type {
  AvailabilityBlockType,
  AvailabilityConfirmationStatus,
  Booking,
  Property,
  PropertyAvailabilityBlock,
  PublicCalendarSpan,
} from './types';
import { daysUntilLagosDate, formatDate, lagosIsoDateOffset } from './pricing';

export type GuestAvailabilityTone =
  | 'available'
  | 'booked'
  | 'unavailable'
  | 'needs_confirmation';

export type CurrentAvailabilityStatus =
  | 'available_now'
  | 'currently_booked'
  | 'currently_unavailable'
  | 'needs_confirmation';

export type SelectedDatesAvailabilityStatus =
  | 'none'
  | 'available'
  | 'needs_confirmation'
  | 'unavailable';

export interface PropertyAvailabilitySummary {
  propertyId: string;
  /** Primary guest-facing status label per §3.2. */
  label: string;
  /** Alias for label used on marketplace cards & detail badges. */
  primaryBadgeLabel: string;
  /** Guest-facing label specific to the currently selected date range. */
  selectedDatesLabel: string;
  tone: GuestAvailabilityTone;
  currentStatus: CurrentAvailabilityStatus;
  selectedDatesStatus: SelectedDatesAvailabilityStatus;
  confirmationStatus: AvailabilityConfirmationStatus;
  /** Authoritative YYYY-MM-DD next open check-in date when reliably known; null if unconfirmed/unknown. */
  nextAvailableDate: string | null;
  /** Authoritative formatted label: "Next available: [date]" when nextAvailableDate is known. */
  nextAvailableLabel: string | null;
  /** Optional secondary relative label (e.g. "Available in 3 days"), never a live countdown. */
  relativeAvailableLabel: string | null;
  /** Alias for relativeAvailableLabel. */
  relativeDaysUntilAvailable: string | null;
  isBookedTodayOnHamlet: boolean;
  isUnavailableToday: boolean;
  needsConfirmation: boolean;
  availableForSelectedDates: boolean | null;
  blockingSpans: PublicCalendarSpan[];
  occupiedSpans: PublicCalendarSpan[];
}

export function isNeedsConfirmationStatus(status?: AvailabilityConfirmationStatus): boolean {
  return (
    status === 'needs_confirmation' ||
    status === 'manual_confirmation' ||
    status === 'unconfirmed'
  );
}

export function formatConfirmationStatusLabel(status?: AvailabilityConfirmationStatus): string {
  if (isNeedsConfirmationStatus(status)) {
    return 'Availability needs confirmation';
  }
  return 'Confirmed calendar';
}

export function formatBlockTypeLabel(blockType: AvailabilityBlockType): string {
  switch (blockType) {
    case 'external_booking':
      return 'External occupancy';
    case 'maintenance':
      return 'Maintenance / inspection';
    case 'owner_block':
    default:
      return 'Owner blocked';
  }
}

export function buildPropertyCalendarSpans(input: {
  property: Pick<Property, 'id' | 'unavailableBlocks'>;
  bookings?: Pick<Booking, 'propertyId' | 'checkIn' | 'checkOut' | 'status' | 'paymentDeadline'>[];
  publicSpans?: PublicCalendarSpan[];
  now?: Date;
}): PublicCalendarSpan[] {
  const nowMs = (input.now ?? new Date()).getTime();
  const spans: PublicCalendarSpan[] = [];
  const seen = new Set<string>();

  const pushSpan = (span: PublicCalendarSpan) => {
    if (!span.startDate || !span.endDate || span.endDate <= span.startDate) return;
    const key = `${span.kind}:${span.startDate}:${span.endDate}`;
    if (seen.has(key)) return;
    seen.add(key);
    spans.push(span);
  };

  for (const b of input.bookings ?? []) {
    if (b.propertyId !== input.property.id) continue;
    if (b.status === 'confirmed') {
      pushSpan({
        propertyId: input.property.id,
        startDate: b.checkIn,
        endDate: b.checkOut,
        kind: 'hamlet_booking',
      });
    } else if (
      b.status === 'awaiting_payment' &&
      (!b.paymentDeadline || new Date(b.paymentDeadline).getTime() > nowMs)
    ) {
      pushSpan({
        propertyId: input.property.id,
        startDate: b.checkIn,
        endDate: b.checkOut,
        kind: 'payment_hold',
      });
    }
  }

  for (const block of input.property.unavailableBlocks ?? []) {
    pushSpan({
      propertyId: input.property.id,
      startDate: block.startDate,
      endDate: block.endDate,
      kind: 'unavailable_block',
    });
  }

  for (const pub of input.publicSpans ?? []) {
    if (pub.propertyId !== input.property.id) continue;
    pushSpan(pub);
  }

  return spans.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate));
}

export function spansOverlapRange(
  spans: PublicCalendarSpan[],
  checkIn: string,
  checkOut: string,
): boolean {
  if (!checkIn || !checkOut || checkOut <= checkIn) return false;
  return spans.some(span => span.startDate < checkOut && span.endDate > checkIn);
}

export function computeNextAvailableDate(input: {
  firstAvailableDate?: string | null;
  availabilityConfirmationStatus?: Property['availabilityConfirmationStatus'];
  spans: PublicCalendarSpan[];
  todayIso?: string;
}): string | null {
  const todayIso = input.todayIso ?? lagosIsoDateOffset(0);
  const needsConfirmation = isNeedsConfirmationStatus(input.availabilityConfirmationStatus);

  // Do not fabricate an availability date when calendar confirmation is required and no first date was supplied (§3.3).
  if (needsConfirmation && !input.firstAvailableDate) {
    return null;
  }

  let cursor =
    input.firstAvailableDate && input.firstAvailableDate > todayIso
      ? input.firstAvailableDate
      : todayIso;

  // Advance cursor past any contiguous or overlapping unavailable/booked periods.
  let advanced = true;
  let guard = 0;
  while (advanced && guard < 500) {
    advanced = false;
    guard += 1;
    for (const span of input.spans) {
      if (span.startDate <= cursor && cursor < span.endDate) {
        cursor = span.endDate;
        advanced = true;
      }
    }
  }

  return cursor;
}

export interface ComputeAvailabilityInput {
  property: Pick<
    Property,
    'id' | 'firstAvailableDate' | 'availabilityConfirmationStatus' | 'unavailableBlocks'
  >;
  bookings?: Pick<Booking, 'propertyId' | 'checkIn' | 'checkOut' | 'status' | 'paymentDeadline'>[];
  publicSpans?: PublicCalendarSpan[];
  publicCalendarSpans?: PublicCalendarSpan[];
  selectedDates?: { checkIn?: string; checkOut?: string };
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  todayIso?: string;
  now?: Date;
}

export function getPropertyAvailabilitySummary(
  input: ComputeAvailabilityInput,
): PropertyAvailabilitySummary {
  const todayIso = input.todayIso ?? lagosIsoDateOffset(0);
  const spans = buildPropertyCalendarSpans({
    property: input.property,
    bookings: input.bookings,
    publicSpans: input.publicSpans ?? input.publicCalendarSpans,
    now: input.now,
  });

  const confirmationStatus: AvailabilityConfirmationStatus =
    input.property.availabilityConfirmationStatus ?? 'confirmed_calendar';
  const needsConfirmation = isNeedsConfirmationStatus(confirmationStatus);

  // Only show "Currently booked" when the property actually has a confirmed HAMLET stay covering today (§3.2).
  const isBookedTodayOnHamlet = spans.some(
    s => s.kind === 'hamlet_booking' && s.startDate <= todayIso && todayIso < s.endDate,
  );

  const isBlockedOrFutureStartToday =
    Boolean(input.property.firstAvailableDate && input.property.firstAvailableDate > todayIso) ||
    spans.some(
      s => s.kind !== 'hamlet_booking' && s.startDate <= todayIso && todayIso < s.endDate,
    );

  const isUnavailableToday = isBookedTodayOnHamlet || isBlockedOrFutureStartToday;

  const currentStatus: CurrentAvailabilityStatus = isBookedTodayOnHamlet
    ? 'currently_booked'
    : isBlockedOrFutureStartToday
      ? 'currently_unavailable'
      : needsConfirmation
        ? 'needs_confirmation'
        : 'available_now';

  const nextAvailableDate = computeNextAvailableDate({
    firstAvailableDate: input.property.firstAvailableDate,
    availabilityConfirmationStatus: confirmationStatus,
    spans,
    todayIso,
  });

  const nextAvailableLabel = nextAvailableDate
    ? `Next available: ${formatDate(nextAvailableDate)}`
    : null;

  let relativeAvailableLabel: string | null = null;
  if (nextAvailableDate) {
    const daysAway = daysUntilLagosDate(nextAvailableDate, todayIso);
    if (daysAway <= 0) relativeAvailableLabel = 'Available today';
    else if (daysAway === 1) relativeAvailableLabel = 'Available tomorrow';
    else relativeAvailableLabel = `Available in ${daysAway} days`;
  }

  const upcomingSpans = spans.filter(s => s.endDate > todayIso);

  const selIn = (input.selectedDates?.checkIn ?? input.requestedCheckIn ?? '').trim();
  const selOut = (input.selectedDates?.checkOut ?? input.requestedCheckOut ?? '').trim();
  const hasValidSelection = Boolean(selIn && selOut && selOut > selIn);

  if (hasValidSelection) {
    const beforeToday = selIn < todayIso;
    const beforeFirstAvailable = Boolean(
      input.property.firstAvailableDate && selIn < input.property.firstAvailableDate,
    );
    const hasOverlap = spansOverlapRange(spans, selIn, selOut);

    if (beforeToday || beforeFirstAvailable || hasOverlap) {
      const label = 'Unavailable for selected dates';
      return {
        propertyId: input.property.id,
        label,
        primaryBadgeLabel: label,
        selectedDatesLabel: label,
        tone: 'unavailable',
        currentStatus,
        selectedDatesStatus: 'unavailable',
        confirmationStatus,
        nextAvailableDate,
        nextAvailableLabel,
        relativeAvailableLabel,
        relativeDaysUntilAvailable: relativeAvailableLabel,
        isBookedTodayOnHamlet,
        isUnavailableToday,
        needsConfirmation,
        availableForSelectedDates: false,
        blockingSpans: spans,
        occupiedSpans: upcomingSpans,
      };
    }

    if (needsConfirmation) {
      const label = 'Availability needs confirmation';
      return {
        propertyId: input.property.id,
        label,
        primaryBadgeLabel: label,
        selectedDatesLabel: label,
        tone: 'needs_confirmation',
        currentStatus,
        selectedDatesStatus: 'needs_confirmation',
        confirmationStatus,
        nextAvailableDate,
        nextAvailableLabel,
        relativeAvailableLabel,
        relativeDaysUntilAvailable: relativeAvailableLabel,
        isBookedTodayOnHamlet,
        isUnavailableToday,
        needsConfirmation: true,
        availableForSelectedDates: true,
        blockingSpans: spans,
        occupiedSpans: upcomingSpans,
      };
    }

    const label = 'Available for your dates';
    return {
      propertyId: input.property.id,
      label,
      primaryBadgeLabel: label,
      selectedDatesLabel: label,
      tone: 'available',
      currentStatus,
      selectedDatesStatus: 'available',
      confirmationStatus,
      nextAvailableDate,
      nextAvailableLabel,
      relativeAvailableLabel,
      relativeDaysUntilAvailable: relativeAvailableLabel,
      isBookedTodayOnHamlet,
      isUnavailableToday,
      needsConfirmation: false,
      availableForSelectedDates: true,
      blockingSpans: spans,
      occupiedSpans: upcomingSpans,
    };
  }

  if (isBookedTodayOnHamlet) {
    const label = 'Currently booked';
    return {
      propertyId: input.property.id,
      label,
      primaryBadgeLabel: label,
      selectedDatesLabel: label,
      tone: 'booked',
      currentStatus: 'currently_booked',
      selectedDatesStatus: 'none',
      confirmationStatus,
      nextAvailableDate,
      nextAvailableLabel,
      relativeAvailableLabel,
      relativeDaysUntilAvailable: relativeAvailableLabel,
      isBookedTodayOnHamlet: true,
      isUnavailableToday: true,
      needsConfirmation,
      availableForSelectedDates: null,
      blockingSpans: spans,
      occupiedSpans: upcomingSpans,
    };
  }

  if (isBlockedOrFutureStartToday) {
    const label = 'Currently unavailable';
    return {
      propertyId: input.property.id,
      label,
      primaryBadgeLabel: label,
      selectedDatesLabel: label,
      tone: 'unavailable',
      currentStatus: 'currently_unavailable',
      selectedDatesStatus: 'none',
      confirmationStatus,
      nextAvailableDate,
      nextAvailableLabel,
      relativeAvailableLabel,
      relativeDaysUntilAvailable: relativeAvailableLabel,
      isBookedTodayOnHamlet: false,
      isUnavailableToday: true,
      needsConfirmation,
      availableForSelectedDates: null,
      blockingSpans: spans,
      occupiedSpans: upcomingSpans,
    };
  }

  if (needsConfirmation) {
    const label = 'Availability needs confirmation';
    return {
      propertyId: input.property.id,
      label,
      primaryBadgeLabel: label,
      selectedDatesLabel: label,
      tone: 'needs_confirmation',
      currentStatus: 'needs_confirmation',
      selectedDatesStatus: 'none',
      confirmationStatus,
      nextAvailableDate,
      nextAvailableLabel,
      relativeAvailableLabel,
      relativeDaysUntilAvailable: relativeAvailableLabel,
      isBookedTodayOnHamlet: false,
      isUnavailableToday: false,
      needsConfirmation: true,
      availableForSelectedDates: null,
      blockingSpans: spans,
      occupiedSpans: upcomingSpans,
    };
  }

  const label = nextAvailableLabel ?? 'Available';
  return {
    propertyId: input.property.id,
    label,
    primaryBadgeLabel: relativeAvailableLabel === 'Available today' ? 'Available now' : label,
    selectedDatesLabel: label,
    tone: 'available',
    currentStatus: 'available_now',
    selectedDatesStatus: 'none',
    confirmationStatus,
    nextAvailableDate,
    nextAvailableLabel,
    relativeAvailableLabel,
    relativeDaysUntilAvailable: relativeAvailableLabel,
    isBookedTodayOnHamlet: false,
    isUnavailableToday: false,
    needsConfirmation: false,
    availableForSelectedDates: null,
    blockingSpans: spans,
    occupiedSpans: upcomingSpans,
  };
}

export const computePropertyAvailabilitySummary = getPropertyAvailabilitySummary;

export function normalizeAvailabilityBlock(
  input: Omit<PropertyAvailabilityBlock, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
): PropertyAvailabilityBlock | null {
  const startDate = input.startDate.trim();
  const endDate = input.endDate.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return null;
  }
  if (endDate <= startDate) return null;
  return {
    id: input.id ?? `blk-${startDate}-${endDate}-${input.blockType}`,
    propertyId: input.propertyId,
    startDate,
    endDate,
    blockType: input.blockType,
    source: input.source ?? 'partner',
    note: input.note?.trim() || undefined,
    createdBy: input.createdBy,
    createdByName: input.createdByName,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}
