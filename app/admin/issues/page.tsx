'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { getBrowserSupabase } from '@/lib/next-supabase';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import {
  FocusedDrawer,
  FormField,
  FIELD_INPUT_CLASS,
} from '@/components/forms/ProgressiveFormPrimitives';
import { AdminNav } from '../admin-nav';

type AdminIssue = {
  id: string;
  reference: string;
  booking_id: string;
  category: string;
  severity: string;
  subject: string;
  description: string;
  status: string;
  assignee_name: string | null;
  resolution: string | null;
  created_at: string;
};

export default function AdminIssuesPage() {
  const db = useMemo(() => getBrowserSupabase(), []);
  const [allowed, setAllowed] = useState(false);
  const [issues, setIssues] = useState<AdminIssue[]>([]);
  const [selected, setSelected] = useState<AdminIssue | null>(null);
  const [nextStatus, setNextStatus] = useState('investigating');
  const [assigneeName, setAssigneeName] = useState('');
  const [resolutionText, setResolutionText] = useState('');
  const [actionNote, setActionNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!db) {
      setError('Admin issues queue is not configured.');
      setLoading(false);
      return;
    }
    const { data: session } = await db.auth.getSession();
    const user = session.session?.user;
    if (!user) {
      window.location.assign('/signin?next=/admin/issues');
      return;
    }
    const { data: profile } = await db
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (profile?.role !== 'admin') {
      setAllowed(false);
      setLoading(false);
      return;
    }
    setAllowed(true);

    const { data, error: queryError } = await db
      .from('booking_issues')
      .select(
        'id,reference,booking_id,category,severity,subject,description,status,assignee_name,resolution,created_at',
      )
      .order('created_at', { ascending: false });

    if (queryError) {
      setError('Could not load reported issues.');
    } else {
      setIssues((data || []) as AdminIssue[]);
    }
    setLoading(false);
  }, [db]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function submitTransition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || !selected) return;
    if (
      ['resolved', 'closed'].includes(nextStatus) &&
      resolutionText.trim().length < 6
    ) {
      setError('Enter a clear resolution summary before resolving or closing an issue.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const { error: rpcError } = await db.rpc('transition_booking_issue', {
        target_issue_id: selected.id,
        next_status: nextStatus,
        action_note: actionNote.trim() || `Updated to ${nextStatus}`,
        next_assignee_id: null,
        next_assignee_name: assigneeName.trim() || null,
        resolution_summary: resolutionText.trim() || null,
      });
      if (rpcError) throw new Error(rpcError.message);
      setNotice(`Issue ${selected.reference} moved to ${nextStatus}.`);
      setSelected(null);
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not update issue.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <main className="shell flex-1 py-8 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Audited Issue Accountability</p>
            <h1 className="serif mt-2 text-3xl font-medium text-ink-900 sm:text-5xl">
              Guest & booking support queue
            </h1>
          </div>
          {allowed && <AdminNav current="issues" />}
        </div>

        {error && (
          <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800">
            {error}
          </p>
        )}
        {notice && (
          <p className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
            {notice}
          </p>
        )}

        {loading ? (
          <p className="mt-8 text-sm text-ink-600">Loading support queue…</p>
        ) : !allowed ? (
          <p className="mt-8 text-sm text-red-800">Administrator access required.</p>
        ) : issues.length > 0 ? (
          <div className="mt-6 space-y-4">
            {issues.map(issue => (
              <article
                key={issue.id}
                className="flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-ink-100 bg-white p-6"
              >
                <div className="max-w-2xl">
                  <span className="font-mono text-xs font-extrabold text-brass-700">
                    {issue.reference} · {issue.severity.toUpperCase()}
                  </span>
                  <h2 className="serif m-0 mt-1 text-2xl font-medium text-ink-900">
                    {issue.subject}
                  </h2>
                  <p className="m-0 mt-1 text-xs text-ink-500">
                    {issue.category} · Status: <strong>{issue.status}</strong>
                    {issue.assignee_name ? ` · Assigned: ${issue.assignee_name}` : ''}
                  </p>
                  <p className="m-0 mt-2 whitespace-pre-wrap text-xs leading-relaxed text-ink-700">
                    {issue.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelected(issue);
                    setNextStatus(
                      issue.status === 'open' ? 'investigating' : 'resolved',
                    );
                    setAssigneeName(issue.assignee_name || 'HAMLET Operations');
                    setResolutionText(issue.resolution || '');
                    setActionNote('');
                  }}
                  className="primary-button min-h-[42px]"
                >
                  Respond / transition
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-dashed border-ink-300 bg-white p-10 text-center text-sm text-ink-500">
            No booking issues reported.
          </div>
        )}

        <FocusedDrawer
          open={Boolean(selected)}
          title={selected?.subject || 'Update issue'}
          subtitle={selected ? `${selected.reference} · ${selected.severity}` : undefined}
          onClose={() => setSelected(null)}
        >
          {selected && (
            <form onSubmit={submitTransition} className="space-y-4">
              <FormField label="Next issue status">
                {fieldProps => (
                  <select
                    {...fieldProps}
                    value={nextStatus}
                    onChange={e => setNextStatus(e.target.value)}
                    className={FIELD_INPUT_CLASS}
                  >
                    <option value="assigned">assigned</option>
                    <option value="investigating">investigating</option>
                    <option value="escalated">escalated</option>
                    <option value="resolved">resolved</option>
                    <option value="closed">closed</option>
                  </select>
                )}
              </FormField>

              <FormField label="Operations owner / assignee" optional>
                {fieldProps => (
                  <input
                    {...fieldProps}
                    value={assigneeName}
                    onChange={e => setAssigneeName(e.target.value)}
                    placeholder="e.g. Lagos Support Lead"
                    className={FIELD_INPUT_CLASS}
                  />
                )}
              </FormField>

              <FormField
                label="Resolution summary (visible to guest)"
                optional={!['resolved', 'closed'].includes(nextStatus)}
              >
                {fieldProps => (
                  <textarea
                    {...fieldProps}
                    rows={3}
                    required={['resolved', 'closed'].includes(nextStatus)}
                    value={resolutionText}
                    onChange={e => setResolutionText(e.target.value)}
                    placeholder="Explain how the issue was resolved…"
                    className={`${FIELD_INPUT_CLASS} resize-y`}
                  />
                )}
              </FormField>

              <FormField label="Internal timeline note" optional>
                {fieldProps => (
                  <input
                    {...fieldProps}
                    value={actionNote}
                    onChange={e => setActionNote(e.target.value)}
                    placeholder="Short timeline entry"
                    className={FIELD_INPUT_CLASS}
                  />
                )}
              </FormField>

              <button
                type="submit"
                disabled={busy}
                className="primary-button min-h-[48px] w-full"
              >
                {busy ? 'Saving…' : 'Record audited issue update'}
              </button>
            </form>
          )}
        </FocusedDrawer>
      </main>

      <SiteFooter />
    </div>
  );
}
