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

type PartnerApp = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  areas: string[];
  properties_count: number;
  motivation: string;
  referred_by_code?: string | null;
  status: string;
  review_note: string | null;
  submitted_at: string;
};

export default function AdminPartnersPage() {
  const db = useMemo(() => getBrowserSupabase(), []);
  const [allowed, setAllowed] = useState(false);
  const [apps, setApps] = useState<PartnerApp[]>([]);
  const [selected, setSelected] = useState<PartnerApp | null>(null);
  const [decision, setDecision] = useState('approved');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!db) {
      setError('Admin partner queue is not configured.');
      setLoading(false);
      return;
    }
    const { data: session } = await db.auth.getSession();
    const user = session.session?.user;
    if (!user) {
      window.location.assign('/signin?next=/admin/partners');
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
      .from('partner_applications')
      .select(
        'id,full_name,email,phone,company,role,areas,properties_count,motivation,referred_by_code,status,review_note,submitted_at',
      )
      .order('submitted_at', { ascending: false });

    if (queryError) {
      setError('Could not load partner applications.');
    } else {
      setApps((data || []) as PartnerApp[]);
    }
    setLoading(false);
  }, [db]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function submitDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || !selected) return;
    if (decision !== 'approved' && note.trim().length < 10) {
      setError('Add a reviewer note of at least 10 characters when requesting corrections or rejecting an application.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const { error: rpcError } = await db.rpc('review_partner_application', {
        target_application_id: selected.id,
        next_status: decision,
        reviewer_note: note.trim(),
      });
      if (rpcError) throw new Error(rpcError.message);
      setNotice(`Application for ${selected.company} marked ${decision}.`);
      setSelected(null);
      setNote('');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Review failed.');
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
            <p className="eyebrow">Partner Onboarding Review</p>
            <h1 className="serif mt-2 text-3xl font-medium text-ink-900 sm:text-5xl">
              Partner applications
            </h1>
          </div>
          {allowed && <AdminNav current="partners" />}
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
          <p className="mt-8 text-sm text-ink-600">Loading applications…</p>
        ) : !allowed ? (
          <p className="mt-8 text-sm text-red-800">Administrator access required.</p>
        ) : apps.length > 0 ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {apps.map(app => (
              <article
                key={app.id}
                className="flex flex-col justify-between rounded-3xl border border-ink-100 bg-white p-6"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-brass-700">
                        {app.role}
                      </span>
                      <h2 className="serif m-0 mt-1 text-2xl font-medium text-ink-900">
                        {app.company}
                      </h2>
                    </div>
                    <span className="rounded-full bg-paper px-3 py-1 text-xs font-bold text-ink-900">
                      {app.status}
                    </span>
                  </div>
                  <p className="m-0 mt-2 text-xs text-ink-600">
                    {app.full_name} · {app.email} · {app.phone}
                  </p>
                  <p className="m-0 mt-1 text-xs text-ink-500">
                    Areas: {(app.areas || []).join(', ')} · Units: {app.properties_count}
                    {app.referred_by_code ? ` · Ref: ${app.referred_by_code}` : ''}
                  </p>
                </div>

                <div className="mt-4 flex justify-end border-t border-ink-100 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(app);
                      setDecision('approved');
                      setNote(app.review_note || '');
                    }}
                    className="primary-button min-h-[42px]"
                  >
                    Review application
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-dashed border-ink-300 bg-white p-10 text-center text-sm text-ink-500">
            No partner applications submitted yet.
          </div>
        )}

        <FocusedDrawer
          open={Boolean(selected)}
          title={selected?.company || 'Review partner application'}
          subtitle={selected ? `${selected.full_name} · ${selected.role}` : undefined}
          onClose={() => setSelected(null)}
        >
          {selected && (
            <form onSubmit={submitDecision} className="space-y-4">
              <div className="rounded-2xl bg-paper p-4 text-xs leading-relaxed text-ink-700">
                <p className="m-0 font-bold text-ink-900">Applicant summary</p>
                <p className="m-0 mt-1 whitespace-pre-wrap">{selected.motivation}</p>
              </div>

              <FormField label="Decision">
                {fieldProps => (
                  <select
                    {...fieldProps}
                    value={decision}
                    onChange={e => setDecision(e.target.value)}
                    className={FIELD_INPUT_CLASS}
                  >
                    <option value="approved">Approve & grant partner access</option>
                    <option value="needs_correction">Request correction from applicant</option>
                    <option value="rejected">Reject application</option>
                  </select>
                )}
              </FormField>

              <FormField
                label="Reviewer note"
                optional={decision === 'approved'}
              >
                {fieldProps => (
                  <textarea
                    {...fieldProps}
                    rows={3}
                    maxLength={600}
                    required={decision !== 'approved'}
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Verification notes or requested corrections…"
                    className={`${FIELD_INPUT_CLASS} resize-y`}
                  />
                )}
              </FormField>

              <button
                type="submit"
                disabled={busy}
                className="primary-button min-h-[48px] w-full"
              >
                {busy ? 'Saving…' : 'Record partner decision'}
              </button>
            </form>
          )}
        </FocusedDrawer>
      </main>

      <SiteFooter />
    </div>
  );
}
