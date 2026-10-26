'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getBrowserSupabase } from '@/lib/next-supabase';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import { FIELD_INPUT_CLASS } from '@/components/forms/ProgressiveFormPrimitives';
import { AdminNav } from '../admin-nav';

type AuditRow = {
  id: string;
  actor_role: string;
  action: string;
  target: string;
  detail: string;
  created_at: string;
};

export default function AdminAuditLogPage() {
  const db = useMemo(() => getBrowserSupabase(), []);
  const [allowed, setAllowed] = useState(false);
  const [entries, setEntries] = useState<AuditRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!db) {
      setError('Audit log is not configured.');
      setLoading(false);
      return;
    }
    const { data: session } = await db.auth.getSession();
    const user = session.session?.user;
    if (!user) {
      window.location.assign('/signin?next=/admin/audit');
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
      .from('admin_audit_log')
      .select('id,actor_role,action,target,detail,created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (queryError) {
      setError('Could not load audit trail.');
    } else {
      setEntries((data || []) as AuditRow[]);
    }
    setLoading(false);
  }, [db]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const filtered = entries.filter(item => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      item.action.toLowerCase().includes(q) ||
      item.target.toLowerCase().includes(q) ||
      item.detail.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <main className="shell flex-1 py-8 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Immutable Operations Trail</p>
            <h1 className="serif mt-2 text-3xl font-medium text-ink-900 sm:text-5xl">
              Audit log
            </h1>
          </div>
          {allowed && <AdminNav current="audit" />}
        </div>

        {error && (
          <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800">
            {error}
          </p>
        )}

        {loading ? (
          <p className="mt-8 text-sm text-ink-600">Loading audit log…</p>
        ) : !allowed ? (
          <p className="mt-8 text-sm text-red-800">Administrator access required.</p>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="max-w-md">
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Filter by action, booking ref or target…"
                aria-label="Filter audit log"
                className={FIELD_INPUT_CLASS}
              />
            </div>

            <div className="rounded-3xl border border-ink-100 bg-white p-6">
              {filtered.length > 0 ? (
                <div className="divide-y divide-ink-100 text-xs">
                  {filtered.map(row => (
                    <div key={row.id} className="py-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <strong className="font-mono text-ink-900">
                          {row.action}
                        </strong>
                        <span className="text-ink-500">
                          {row.actor_role} ·{' '}
                          {new Date(row.created_at).toLocaleString('en-NG')}
                        </span>
                      </div>
                      <p className="m-0 mt-1 text-ink-700">
                        <strong>Target:</strong> {row.target} — {row.detail}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-ink-500">
                  No matching audit log entries.
                </p>
              )}
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
