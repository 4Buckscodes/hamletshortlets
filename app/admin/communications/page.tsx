'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getBrowserSupabase } from '@/lib/next-supabase';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import { AdminNav } from '../admin-nav';

type AdminNotification = {
  id: string;
  event_type: string;
  title: string;
  message: string;
  target_type: string | null;
  target_id: string | null;
  recipient_email: string | null;
  read_at: string | null;
  created_at: string;
};

export default function AdminCommunicationsPage() {
  const db = useMemo(() => getBrowserSupabase(), []);
  const [allowed, setAllowed] = useState(false);
  const [rows, setRows] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!db) {
      setError('Communications inbox is not configured on this deployment.');
      setLoading(false);
      return;
    }
    const { data: session } = await db.auth.getSession();
    const user = session.session?.user;
    if (!user) {
      window.location.assign('/signin?next=/admin/communications');
      return;
    }
    const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (profile?.role !== 'admin') {
      setAllowed(false);
      setLoading(false);
      return;
    }
    setAllowed(true);
    const { data, error: queryError } = await db
      .from('admin_notifications')
      .select('id,event_type,title,message,target_type,target_id,recipient_email,read_at,created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (queryError) setError('Could not load notifications. Apply the communications-centre migration and try again.');
    else setRows((data || []) as AdminNotification[]);
    setLoading(false);
  }, [db]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function markRead(id: string) {
    if (!db) return;
    const { error: updateError } = await db
      .from('admin_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id);
    if (updateError) setError('Could not update notification status.');
    else setRows(current => current.map(row => row.id === id ? { ...row, read_at: new Date().toISOString() } : row));
  }

  const unread = rows.filter(row => !row.read_at).length;

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />
      <main className="shell flex-1 py-8 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Elsinore · Operations</p>
            <h1 className="serif mt-2 text-3xl font-medium text-ink-900 sm:text-5xl">Communications</h1>
            <p className="mt-2 text-sm text-ink-600">{unread} unread · Latest 200 operational events</p>
          </div>
          {allowed && <AdminNav current="communications" />}
        </div>
        {error && <p role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800">{error}</p>}
        {loading ? <p className="mt-8 text-sm text-ink-600">Loading communications…</p> : !allowed ? (
          <p className="mt-8 text-sm text-red-800">Administrator access required.</p>
        ) : rows.length ? (
          <div className="mt-6 space-y-3">
            {rows.map(row => (
              <article key={row.id} className={`rounded-2xl border bg-white p-5 ${row.read_at ? 'border-ink-100' : 'border-brass-400'}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="m-0 text-sm font-bold text-ink-900">{row.title}</h2>
                      {!row.read_at && <span className="rounded-full bg-brass-100 px-2 py-1 text-[10px] font-bold text-brass-800">NEW</span>}
                    </div>
                    <p className="mt-2 text-sm text-ink-700">{row.message}</p>
                    <p className="mt-2 text-xs text-ink-500">{row.event_type} · {new Date(row.created_at).toLocaleString('en-NG')}{row.recipient_email ? ` · ${row.recipient_email}` : ''}</p>
                    {row.target_type === 'partner_application' && row.target_id && <Link className="mt-3 inline-block text-xs font-bold text-brass-800 underline" href="/admin/partners">Open partner queue →</Link>}
                  </div>
                  {!row.read_at && <button type="button" onClick={() => void markRead(row.id)} className="secondary-button min-h-[38px] text-xs">Mark read</button>}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-dashed border-ink-300 bg-white p-10 text-center text-sm text-ink-500">No operational notifications yet.</div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
