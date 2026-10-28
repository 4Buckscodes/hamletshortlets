'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { getBrowserSupabase } from '@/lib/next-supabase';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import {
  FormField,
  OptionCardGroup,
  StepFooterActions,
  StepProgressHeader,
  FIELD_INPUT_CLASS,
} from '@/components/forms/ProgressiveFormPrimitives';
import { AccountNav } from '../account-nav';

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
    description: 'Select the booking affected and what kind of help you need.',
  },
  {
    id: 'details',
    title: 'Urgency & what happened',
    shortLabel: '2. Details',
    description: 'Choose the urgency level and describe what occurred.',
  },
  {
    id: 'evidence',
    title: 'Evidence note & submit',
    shortLabel: '3. Submit',
    description: 'Add any supporting reference link or note, then send to HAMLET operations.',
  },
] as const;

const CATEGORY_OPTIONS = [
  {
    value: 'Access or check-in problem',
    label: 'Access or check-in problem',
    description: 'Gate entry, keys, lockbox or partner handover delay.',
  },
  {
    value: 'Property not as described',
    label: 'Property not as described',
    description: 'Rooms, power backup, or amenities differ from the listing.',
  },
  {
    value: 'Cleanliness or maintenance',
    label: 'Cleanliness or maintenance',
    description: 'Housekeeping, water, AC or appliance issue.',
  },
  {
    value: 'Safety concern',
    label: 'Safety concern',
    description: 'Security, electrical hazard or urgent personal safety issue.',
  },
  {
    value: 'Payment or refund',
    label: 'Payment, caution deposit or refund',
    description: 'Receipt, caution inspection or refund question.',
  },
  {
    value: 'Other',
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
  const [followupNotes, setFollowupNotes] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyFollowupId, setBusyFollowupId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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
      } else if (list.length === 1) {
        setBookingId(list[0].id);
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
        issue_category: category,
        issue_severity: severity,
        issue_subject: subject.trim(),
        issue_description: description.trim(),
        evidence_items: evidenceItems,
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      setMessage(
        'Your support report has been logged with HAMLET operations and linked to your booking.',
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
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <main className="shell flex-1 py-8 sm:py-12">
        <div className="workspace-heading flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Guest Support</p>
            <h1 className="serif mt-2 text-3xl font-medium text-ink-900 sm:text-5xl">
              Report or track a booking issue
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-600">
              Reports are linked directly to your booking reference for HAMLET operations review. Never include passwords or full payment card numbers.
            </p>
          </div>
          <AccountNav current="issues" />
        </div>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800"
          >
            {error}
          </p>
        )}
        {message && (
          <p
            role="status"
            className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800"
          >
            {message}
          </p>
        )}

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-12">
          <section className="rounded-3xl border border-ink-100 bg-white p-6 lg:col-span-7">
            {!loading && bookings.length === 0 ? (
              <div className="py-6 text-center">
                <h2 className="serif text-2xl font-medium text-ink-900">
                  No bookings on this account yet
                </h2>
                <p className="mt-2 text-sm text-ink-500">
                  Booking support reports attach to an active or past booking request.
                </p>
                <div className="mt-5">
                  <Link href="/stays" className="primary-button">
                    Explore Lagos stays
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleStepSubmit} className="space-y-4">
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
                          className={FIELD_INPUT_CLASS}
                        >
                          <option value="">Choose a booking</option>
                          {bookings.map(b => (
                            <option key={b.id} value={b.id}>
                              {b.properties?.title || 'HAMLET stay'} · {b.reference} ({b.status})
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
                          className={FIELD_INPUT_CLASS}
                        />
                      )}
                    </FormField>

                    <FormField
                      label="What happened?"
                      hint="Share times, what you expected, and what help you need."
                    >
                      {fieldProps => (
                        <textarea
                          {...fieldProps}
                          required
                          minLength={10}
                          maxLength={5000}
                          rows={4}
                          value={description}
                          onChange={e => setDescription(e.target.value)}
                          placeholder="Provide clear context so operations can assist promptly…"
                          className={`${FIELD_INPUT_CLASS} resize-y`}
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
                      label="Supporting evidence note or HTTPS photo link"
                      optional
                      hint="Optional: add a photo link, receipt reference, or inspection detail."
                    >
                      {fieldProps => (
                        <textarea
                          {...fieldProps}
                          rows={3}
                          maxLength={1000}
                          value={evidenceNote}
                          onChange={e => setEvidenceNote(e.target.value)}
                          placeholder="Optional supporting detail…"
                          className={`${FIELD_INPUT_CLASS} resize-y`}
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
                      <span className="rounded-full bg-paper px-2.5 py-1 text-[11px] font-bold text-ink-800">
                        {ISSUE_STATUS[issue.status] || issue.status}
                      </span>
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
                          className="min-h-[42px] flex-1 rounded-xl border border-ink-200 px-3 text-xs"
                        />
                        <button
                          type="button"
                          disabled={busyFollowupId === issue.id}
                          onClick={() => void addEvidence(issue.id)}
                          className="secondary-button min-h-[42px] px-3.5 text-xs"
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
      </main>

      <SiteFooter />
    </div>
  );
}
