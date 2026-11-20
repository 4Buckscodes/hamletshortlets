import type { StatusTone } from '@/components/ui/StatusPill';

type Entry = { label: string; tone: StatusTone };

/** One plain-language label and one tone per status, shared by guest, partner and admin screens. */
const STATUS: Record<string, Entry> = {
  // bookings
  requested: { label: 'Awaiting partner response', tone: 'warn' },
  checking: { label: 'Availability being checked', tone: 'warn' },
  awaiting_payment: { label: 'Accepted · awaiting payment', tone: 'info' },
  confirmed: { label: 'Confirmed · payment verified', tone: 'ok' },
  completed: { label: 'Completed', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  expired: { label: 'Payment hold expired', tone: 'neutral' },
  refunded: { label: 'Refunded', tone: 'neutral' },
  disputed: { label: 'Under operations review', tone: 'bad' },
  declined: { label: 'Declined', tone: 'bad' },
  no_show: { label: 'No-show recorded', tone: 'bad' },
  // listings and applications
  draft: { label: 'Draft', tone: 'neutral' },
  submitted: { label: 'Submitted', tone: 'info' },
  pending_review: { label: 'Under review', tone: 'info' },
  pending: { label: 'Pending', tone: 'info' },
  needs_correction: { label: 'Correction requested', tone: 'warn' },
  approved: { label: 'Live on marketplace', tone: 'ok' },
  paused: { label: 'Paused', tone: 'neutral' },
  suspended: { label: 'Suspended', tone: 'bad' },
  rejected: { label: 'Not approved', tone: 'bad' },
  // issues and ledger
  open: { label: 'Open', tone: 'warn' },
  in_progress: { label: 'In progress', tone: 'info' },
  resolved: { label: 'Resolved', tone: 'ok' },
  closed: { label: 'Closed', tone: 'neutral' },
  verified: { label: 'Verified', tone: 'ok' },
  paid: { label: 'Paid', tone: 'ok' },
  failed: { label: 'Failed', tone: 'bad' },
};

export function statusEntry(status: string | null | undefined): Entry {
  if (!status) return { label: 'Unknown', tone: 'neutral' };
  return STATUS[status] ?? { label: status.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()), tone: 'neutral' };
}
