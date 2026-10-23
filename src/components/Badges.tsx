import type { BookingStatus, PropertyStatus, IssueStatus, LedgerStatus, DocStatus, ApplicationStatus } from '../lib/types';
import { ShieldCheck, Clock, FileWarning, PauseCircle, BadgeCheck, Circle, Loader2, CalendarClock, CheckCircle2, XCircle, Ban, RefreshCcw, AlertCircle, UserX } from 'lucide-react';

const pill = 'chip border';

export function PropertyStatusPill({ status }: { status: PropertyStatus }) {
  const map: Record<PropertyStatus, { cls: string; label: string; Icon: typeof Circle }> = {
    approved: { cls: 'bg-jade-50 text-jade-800 border-jade-200', label: 'Approved · Live', Icon: BadgeCheck },
    submitted: { cls: 'bg-amber-50 text-amber-800 border-amber-200', label: 'Submitted · In review', Icon: Clock },
    needs_correction: { cls: 'bg-orange-50 text-orange-800 border-orange-200', label: 'Needs correction', Icon: FileWarning },
    rejected: { cls: 'bg-red-50 text-red-800 border-red-200', label: 'Rejected', Icon: XCircle },
    suspended: { cls: 'bg-red-100 text-red-900 border-red-300', label: 'Suspended', Icon: PauseCircle },
  };
  const { cls, label, Icon } = map[status];
  return <span className={`${pill} ${cls}`}><Icon size={12} />{label}</span>;
}

export function BookingStatusPill({ status }: { status: BookingStatus }) {
  const map: Record<BookingStatus, { cls: string; label: string; Icon: typeof Circle }> = {
    requested: { cls: 'bg-sky-50 text-sky-800 border-sky-200', label: 'Requested', Icon: Circle },
    checking: { cls: 'bg-violet-50 text-violet-800 border-violet-200', label: 'Checking availability & terms', Icon: Loader2 },
    awaiting_payment: { cls: 'bg-amber-50 text-amber-900 border-amber-300', label: 'Accepted · Awaiting payment', Icon: CalendarClock },
    confirmed: { cls: 'bg-jade-50 text-jade-800 border-jade-300', label: 'Confirmed', Icon: CheckCircle2 },
    completed: { cls: 'bg-ink-100 text-ink-800 border-ink-200', label: 'Completed', Icon: CheckCircle2 },
    cancelled: { cls: 'bg-red-50 text-red-800 border-red-200', label: 'Cancelled', Icon: Ban },
    expired: { cls: 'bg-stone-100 text-stone-700 border-stone-300', label: 'Expired — payment deadline passed', Icon: Clock },
    refunded: { cls: 'bg-teal-50 text-teal-800 border-teal-200', label: 'Refunded', Icon: RefreshCcw },
    disputed: { cls: 'bg-orange-50 text-orange-900 border-orange-300', label: 'Disputed', Icon: AlertCircle },
    declined: { cls: 'bg-red-50 text-red-800 border-red-200', label: 'Declined by host', Icon: XCircle },
    no_show: { cls: 'bg-stone-100 text-stone-700 border-stone-300', label: 'No-show', Icon: UserX },
  };
  const { cls, label, Icon } = map[status];
  return <span className={`${pill} ${cls}`}><Icon size={12} />{label}</span>;
}

export function IssueStatusPill({ status }: { status: IssueStatus }) {
  const map: Record<IssueStatus, string> = {
    open: 'bg-sky-50 text-sky-800 border-sky-200',
    assigned: 'bg-violet-50 text-violet-800 border-violet-200',
    investigating: 'bg-amber-50 text-amber-900 border-amber-300',
    escalated: 'bg-red-100 text-red-900 border-red-300',
    resolved: 'bg-jade-50 text-jade-800 border-jade-300',
    closed: 'bg-ink-100 text-ink-700 border-ink-200',
  };
  return <span className={`${pill} ${map[status]} capitalize`}>{status}</span>;
}

export function LedgerStatusPill({ status }: { status: LedgerStatus }) {
  const map: Record<LedgerStatus, string> = {
    recorded: 'bg-stone-100 text-stone-700 border-stone-300',
    reconciled: 'bg-sky-50 text-sky-800 border-sky-200',
    settled: 'bg-jade-50 text-jade-800 border-jade-300',
    pending: 'bg-amber-50 text-amber-900 border-amber-300',
    flagged: 'bg-red-100 text-red-900 border-red-300',
  };
  return <span className={`${pill} ${map[status]} capitalize`}>{status}</span>;
}

export function DocStatusBadge({ status }: { status: DocStatus }) {
  const map: Record<DocStatus, { cls: string; label: string }> = {
    verified: { cls: 'bg-jade-50 text-jade-800 border-jade-200', label: 'Verified' },
    pending_review: { cls: 'bg-amber-50 text-amber-900 border-amber-200', label: 'Pending review' },
    missing: { cls: 'bg-red-50 text-red-800 border-red-200', label: 'Missing' },
    self_reported: { cls: 'bg-violet-50 text-violet-800 border-violet-200', label: 'Self-reported' },
  };
  const { cls, label } = map[status];
  return <span className={`${pill} ${cls}`}>{label}</span>;
}

export function TrustBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-brass-400/50 bg-gradient-to-r from-brass-500/15 to-transparent py-1 pl-1.5 pr-3 text-[11px] font-bold text-brass-700 [&>svg]:shrink-0">
      <ShieldCheck size={13} strokeWidth={2.5} className="shrink-0" />{label}
    </span>
  );
}

export function SeverityDot({ severity }: { severity: 'low' | 'medium' | 'high' | 'critical' }) {
  const cls = { low: 'bg-sky-400', medium: 'bg-amber-400', high: 'bg-orange-500', critical: 'bg-red-600' }[severity];
  return <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${cls}`} title={`${severity} severity`} />;
}

export function SeverityPill({ severity }: { severity: 'low' | 'medium' | 'high' | 'critical' }) {
  const map: Record<'low' | 'medium' | 'high' | 'critical', string> = {
    low: 'bg-sky-50 text-sky-800 border-sky-200',
    medium: 'bg-amber-50 text-amber-900 border-amber-300',
    high: 'bg-orange-50 text-orange-900 border-orange-300',
    critical: 'bg-red-100 text-red-900 border-red-300',
  };
  return <span className={`${pill} ${map[severity]} capitalize`}>{severity}</span>;
}

export function ApplicationStatusPill({ status }: { status: ApplicationStatus }) {
  const map: Record<ApplicationStatus, { cls: string; label: string }> = {
    pending: { cls: 'bg-amber-50 text-amber-900 border-amber-200', label: 'Pending review' },
    approved: { cls: 'bg-jade-50 text-jade-800 border-jade-200', label: 'Approved' },
    needs_correction: { cls: 'bg-orange-50 text-orange-900 border-orange-200', label: 'Needs correction' },
    rejected: { cls: 'bg-red-50 text-red-800 border-red-200', label: 'Rejected' },
  };
  const { cls, label } = map[status];
  return <span className={`${pill} ${cls}`}>{label}</span>;
}

export function VerifiedTick({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full bg-jade-600 text-white ${className}`}>
      <ShieldCheck size={11} strokeWidth={3} className="shrink-0" />
    </span>
  );
}
