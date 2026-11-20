'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getBrowserSupabase } from '@/lib/next-supabase';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import {
  FormField,
  OptionCardGroup,
  StepFooterActions,
  StepProgressHeader,
} from '@/components/forms/ProgressiveFormPrimitives';
import { AccountNav } from '../account-nav';
import { statusEntry } from '@/lib/statusLabels';
import { StatusPill } from '@/components/ui/StatusPill';

type Booking = {
  id: string;
  reference: string;
  status: string;
  check_in: string;
  check_out: string;
  properties?: { title?: string } | null;
};

type Issue = {
  id: string;
  reference: string;
  booking_id: string;
  category: string;
  severity: string;
  subject: string;
  description: string;
  status: string;
  resolution: string | null;
  created_at: string;
};

const ISSUE_STATUS: Record<string, string> = {
  open: 'Open',
  assigned: 'Assigned',
  investigating: 'Being investigated',
  escalated: 'Escalated',
  resolved: 'Resolved',
  closed: 'Closed',
};

const ISSUE_STEPS = [
  {
    id: 'booking',
    title: 'Booking & issue type',
    shortLabel: '1. Booking & type',
  },
  {
    id: 'details',
    title: 'Urgency & details',
    shortLabel: '2. Details',
  },
  {
    id: 'evidence',
    title: 'Review & submit',
    shortLabel: '3. Submit',
  },
] as const;

/**
 * Guest-friendly categories. `db` is the value report_booking_issue accepts
 * (Property condition, Payment & billing, Booking conflict, Safety & security,
 * Host conduct, Guest conduct, Damages, Access & check-in, Other).
 */
const CATEGORY_OPTIONS = [
  {
    value: 'outage',
    db: 'Property condition',
    label: 'Power, water or internet outage',
    description: 'No power or generator, no water, or the Wi-Fi is down.',
  },
  {
    value: 'access',
    db: 'Access & check-in',
    label: 'Access or check-in problem',
    description: 'Gate entry, keys, lockbox or partner handover delay.',
  },
  {
    value: 'not_as_described',
    db: 'Property condition',
    label: 'Property not as described',
    description: 'Rooms or amenities differ from the listing.',
  },
  {
    value: 'maintenance',
    db: 'Property condition',
    label: 'Cleanliness or maintenance',
    description: 'Housekeeping, AC or appliance issue.',
  },
  {
    value: 'safety',
    db: 'Safety & security',
    label: 'Safety concern',
    description: 'Security, electrical hazard or urgent personal safety issue.',
  },
  {
    value: 'payment',
    db: 'Payment & billing',
    label: 'Payment, caution deposit or refund',
    description: 'Receipt, caution inspection or refund question.',
  },
  {
    value: 'other',
    db: 'Other',
    label: 'Other booking question',
    description: 'Anything else tied to your stay.',
  },
] as const;

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low', description: 'Minor note — no immediate stay disruption.' },
  { value: 'medium', label: 'Medium', description: 'Needs timely partner or support follow-up.' },
  { value: 'high', label: 'High', description: 'Affecting your stay right now.' },
  {
    value: 'critical',
    label: 'Critical',
    badge: 'Urgent',
    description: 'Locked out at check-in or immediate safety concern.',
  },
] as const;

export default function AccountIssuesPage() {
  const db = useMemo(() => getBrowserSupabase(), []);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [step, setStep] = useState(0);
  const [bookingId, setBookingId] = useState('');
  const [category, setCategory] = useState<string>(CATEGORY_OPTIONS[0].value);
  const [severity, setSeverity] = useState('medium');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceNote, setEvidenceNote] = useState('');
  const errorRef = useRef<HTMLParagraphElement | null>(null);
  const [followupNotes, setFollowupNotes] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyFollowupId, setBusyFollowupId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  // Errors take focus and scroll into view, so they are never off-screen above the form.
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const load = useCallback(async () => {
    if (!db) {
      setError('Issue reporting is not configured on this deployment.');
      setLoading(false);
      return;
    }
    const { data: auth } = await db.auth.getSession();
    if (!auth.session) {
      window.location.assign('/signin?next=/account/issues');
      return;
    }
    const [bookingResult, issueResult] = await Promise.all([
      db
        .from('bookings')
        .select('id,reference,status,check_in,check_out,properties(title)')
        .order('created_at', { ascending: false }),
      db
        .from('booking_issues')
        .select(
          'id,reference,booking_id,category,severity,subject,description,status,resolution,created_at',
        )
        .order('created_at', { ascending: false }),
    ]);
    if (bookingResult.error) {
      setError('We could not load your bookings. Refresh and try again.');
    } else {
      const list = (bookingResult.data || []) as unknown as Booking[];
      setBookings(list);
      const qBooking = new URLSearchParams(window.location.search).get('bookingId');
      if (qBooking && list.some(b => b.id === qBooking)) {
        setBookingId(qBooking);
      } else {
        // Mid-stay guests are almost always reporting about the stay they are in.
        const today = new Date().toISOString().slice(0, 10);
        const current = list.find(b => b.status === 'confirmed' && b.check_in <= today && today <= b.check_out);
        if (current) setBookingId(current.id);
        else if (list.length === 1) setBookingId(list[0].id);
      }
    }
    if (issueResult.error) {
      setError('We could not load your reported issues. Refresh and try again.');
    } else {
      setIssues((issueResult.data || []) as Issue[]);
    }
    setLoading(false);
  }, [db]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function handleStepSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (step === 0) {
      if (!bookingId) {
        setError('Choose the booking this issue relates to.');
        return;
      }
      setStep(1);
      return;
    }

    if (step === 1) {
      if (subject.trim().length < 4) {
        setError('Enter a short summary of at least 4 characters.');
        return;
      }
      if (description.trim().length < 10) {
        setError('Describe what happened in at least 10 characters.');
        return;
      }
      setStep(2);
      return;
    }

    if (!db) return;
    setSaving(true);
    try {
      const evidenceItems = evidenceNote.trim()
        ? [{ note: evidenceNote.trim(), added_at: new Date().toISOString() }]
        : [];

      const { error: rpcError } = await db.rpc('report_booking_issue', {
        target_booking_id: bookingId,
        issue_category: CATEGORY_OPTIONS.find(option => option.value === category)?.db ?? 'Other',
        issue_severity: severity,
        issue_subject: subject.trim(),
        issue_description: `${CATEGORY_OPTIONS.find(option => option.value === category)?.label ?? 'Other'}: ${description.trim()}`,
        evidence_items: evidenceItems,
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      setMessage(
        'Your report is with HAMLET operations and linked to your booking. You can follow its progress under “Your reported issues” below.',
      );
      setSubject('');
      setDescription('');
      setEvidenceNote('');
      setSeverity('medium');
      setStep(0);
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'We could not submit the issue. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function addEvidence(issueId: string) {
    const note = (followupNotes[issueId] || '').trim();
    if (!db || note.length < 4) {
      setError('Enter at least 4 characters to add a follow-up note.');
      return;
    }
    setBusyFollowupId(issueId);
    setError('');
    setMessage('');
    try {
      const { error: rpcError } = await db.rpc('append_issue_evidence', {
        target_issue_id: issueId,
        evidence_note: note,
      });
      if (rpcError) throw new Error(rpcError.message);
      setFollowupNotes(prev => ({ ...prev, [issueId]: '' }));
      setMessage('Follow-up evidence note added to your report.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not add note.');
    } finally {
      setBusyFollowupId('');
    }
  }

  const bookingLabel = (id: string) => {
    const b = bookings.find(item => item.id === id);
    return b ? `${b.properties?.title || 'HAMLET stay'} · ${b.reference}` : 'Booking';
  };

  return (
    <div className="hm-page" style={{ display: 'flex', flexDirection: 'column' }}>
      <SiteHeader />

      <main className="hm-main" style={{ flex: 1 }}>
        <section className="hm-band hm-band-arrive" aria-labelledby="account-title">
          <div className="hm-shell hm-band-inner">
            <div className="hm-band-row">
              <div className="hm-band-copy">
                <p className="hm-label">Guest account · Support</p>
                <h1 id="account-title" className="hm-display" style={{ fontSize: 'clamp(40px, 5.4vw, 72px)' }}>
                  Report or track
                  <br />
                  <em>an issue.</em>
                </h1>
                <p className="hm-body">In your stay and something is wrong? Report it here and HAMLET operations will follow up. For anything urgent, also email hello@hamlet.rest.</p>
              </div>
              <Link href="/stays" className="hm-btn hm-btn-lime">
                Find a new stay <span aria-hidden="true">→</span>
              </Link>
            </div>
            <AccountNav current="issues" />
          </div>
        </section>
        <div className="hm-shell hm-section-tight hm-account">

        {error && (
          <p
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className="mt-5 hm-notice hm-notice-bad"
            style={{ outline: 'none', scrollMarginTop: 96 }}
          >
            {error}
          </p>
        )}
        {message && (
          <p
            role="status"
            className="mt-5 hm-notice hm-notice-ok"
          >
            {message}
          </p>
        )}

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-12">
          <section className="hm-card p-6 lg:col-span-7">
            {!loading && bookings.length === 0 ? (
              <div className="py-6 text-center">
                <h2 className="serif text-2xl font-medium text-ink-900">
                  No bookings on this account yet
                </h2>
                <p className="mt-2 text-sm text-ink-500">
                  Booking support reports attach to an active or past booking request.
                </p>
                <div className="mt-5">
                  <Link href="/stays" className="hm-btn hm-btn-primary">
                    Explore Lagos stays
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleStepSubmit} className="space-y-4" noValidate>
                <StepProgressHeader
                  steps={ISSUE_STEPS}
                  currentStep={step}
                  onSelectStep={idx => setStep(idx)}
                  maxCompletedStep={step}
                />

                {step === 0 && (
                  <div className="space-y-4">
                    <FormField label="Which booking is affected?">
                      {fieldProps => (
                        <select
                          {...fieldProps}
                          required
                          value={bookingId}
                          onChange={e => setBookingId(e.target.value)}
                          className="hm-input"
                        >
                          <option value="">Choose a booking</option>
                          {bookings
                            .filter(b => !['declined', 'cancelled', 'expired'].includes(b.status))
                            .map(b => (
                              <option key={b.id} value={b.id}>
                                {b.properties?.title || 'HAMLET stay'} · {b.reference} · {statusEntry(b.status).label}
                              </option>
                            ))}
                        </select>
                      )}
                    </FormField>

                    <div>
                      <p className="mb-2 text-sm font-bold text-ink-900">Issue category</p>
                      <OptionCardGroup
                        ariaLabel="Issue category"
                        options={CATEGORY_OPTIONS}
                        value={category}
                        onChange={setCategory}
                      />
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-4">
                    <div>
                      <p className="mb-2 text-sm font-bold text-ink-900">Urgency level</p>
                      <OptionCardGroup
                        ariaLabel="Issue urgency"
                        options={SEVERITY_OPTIONS}
                        value={severity}
                        onChange={setSeverity}
                      />
                    </div>

                    <FormField label="Short summary">
                      {fieldProps => (
                        <input
                          {...fieldProps}
                          required
                          minLength={4}
                          maxLength={120}
                          value={subject}
                          onChange={e => setSubject(e.target.value)}
                          placeholder="e.g. Gate security did not have check-in clearance"
                          className="hm-input"
                        />
                      )}
                    </FormField>

                    <FormField label="What happened?">
                      {fieldProps => (
                        <textarea
                          {...fieldProps}
                          required
                          minLength={10}
                          maxLength={5000}
                          rows={4}
                          value={description}
                          onChange={e => setDescription(e.target.value)}
                          placeholder="Describe what happened…"
                          className={`hm-input resize-y`}
                        />
                      )}
                    </FormField>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-ink-100 bg-paper p-4 text-xs leading-relaxed text-ink-700">
                      <p className="m-0 font-bold text-ink-900">{bookingLabel(bookingId)}</p>
                      <p className="m-0 mt-1">
                        Category: <strong>{category}</strong> · Urgency:{' '}
                        <strong className="uppercase">{severity}</strong>
                      </p>
                      <p className="m-0 mt-1 font-semibold text-ink-900">{subject}</p>
                    </div>

                    <FormField
                      label="Anything else that helps"
                      hint="You can paste a link to a photo."
                      optional
                    >
                      {fieldProps => (
                        <textarea
                          {...fieldProps}
                          rows={3}
                          maxLength={1000}
                          value={evidenceNote}
                          onChange={e => setEvidenceNote(e.target.value)}
                          placeholder="Optional supporting detail…"
                          className={`hm-input resize-y`}
                        />
                      )}
                    </FormField>
                  </div>
                )}

                <StepFooterActions
                  canGoBack={step > 0}
                  onBack={() => setStep(s => Math.max(0, s - 1))}
                  isLastStep={step === 2}
                  nextLabel="Continue"
                  submitLabel="Submit issue report"
                  busy={saving}
                  busyLabel="Submitting…"
                />
              </form>
            )}
          </section>

          <section className="space-y-4 lg:col-span-5">
            <h2 className="serif m-0 text-2xl font-medium text-ink-900">
              Your reported issues ({issues.length})
            </h2>
            {loading ? (
              <p className="text-sm text-ink-600">Loading your reports…</p>
            ) : issues.length > 0 ? (
              <div className="space-y-3.5">
                {issues.map(issue => (
                  <article
                    key={issue.id}
                    className="rounded-2xl border border-ink-100 bg-white p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <strong className="text-sm text-ink-900">{issue.subject}</strong>
                      <StatusPill tone={statusEntry(issue.status).tone}>{ISSUE_STATUS[issue.status] || statusEntry(issue.status).label}</StatusPill>
                    </div>
                    <p className="m-0 mt-1 text-xs text-ink-500">
                      {issue.reference} · {bookingLabel(issue.booking_id)} · {issue.category} ·{' '}
                      <span className="uppercase font-semibold">{issue.severity}</span>
                    </p>
                    <p className="mt-2.5 mb-0 whitespace-pre-wrap text-xs leading-relaxed text-ink-700">
                      {issue.description}
                    </p>
                    {issue.resolution && (
                      <div className="mt-3 rounded-xl bg-emerald-50/70 p-3 text-xs text-emerald-900">
                        <strong>Operations update:</strong> {issue.resolution}
                      </div>
                    )}
                    {!['resolved', 'closed'].includes(issue.status) && (
                      <div className="mt-3 flex gap-2 pt-2 border-t border-ink-100">
                        <input
                          type="text"
                          maxLength={500}
                          value={followupNotes[issue.id] || ''}
                          onChange={e =>
                            setFollowupNotes(prev => ({
                              ...prev,
                              [issue.id]: e.target.value,
                            }))
                          }
                          placeholder="Add follow-up note…"
                          aria-label={`Follow-up note for ${issue.reference}`}
                          className="hm-input min-h-[44px] flex-1"
                        />
                        <button
                          type="button"
                          disabled={busyFollowupId === issue.id}
                          onClick={() => void addEvidence(issue.id)}
                          className="hm-btn hm-btn-ghost min-h-[44px] px-3.5 text-xs"
                        >
                          {busyFollowupId === issue.id ? 'Adding…' : 'Add note'}
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-6 text-xs text-ink-500">
                You have not reported any booking issues.
              </div>
            )}
          </section>
        </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
