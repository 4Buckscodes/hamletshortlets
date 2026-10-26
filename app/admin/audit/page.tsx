'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import AdminNav from '../admin-nav';

type AuditRow = { id: string; actor_id: string | null; actor_role: string; action: string; target: string; detail: string; created_at: string };
const field: React.CSSProperties = { width: '100%', minHeight: 44, border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px', background: '#fff', color: 'var(--navy)' };

export default function AdminAuditPage() {
  const db = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    return url && key ? createClient(url, key) : null;
  }, []);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [action, setAction] = useState('all');

  const load = useCallback(async () => {
    if (!db) { setError('Admin audit tools are not configured.'); setLoading(false); return; }
    const { data: auth } = await db.auth.getSession();
    if (!auth.session) { window.location.assign('/signin?next=/admin/audit'); return; }
    const { data: profile, error: profileError } = await db.from('profiles').select('role').eq('id', auth.session.user.id).maybeSingle();
    if (profileError || profile?.role !== 'admin') { setError('Administrator access is required.'); setLoading(false); return; }
    const { data, error: queryError } = await db.from('admin_audit_log').select('id,actor_id,actor_role,action,target,detail,created_at').order('created_at', { ascending: false }).limit(500);
    if (queryError) setError('Could not load the audit log. Check the deployed schema and administrator permissions.');
    else { setRows((data || []) as AuditRow[]); setError(''); }
    setLoading(false);
  }, [db]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async data loading synchronizes the page with Supabase.
  useEffect(() => { void load(); }, [load]);
  const actions = useMemo(() => [...new Set(rows.map(row => row.action).filter(Boolean))].sort(), [rows]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(row => (action === 'all' || row.action === action) && (!q || [row.actor_id, row.actor_role, row.action, row.target, row.detail].some(value => String(value || '').toLowerCase().includes(q))));
  }, [rows, query, action]);

  return <main style={{ minHeight: '100svh', background: 'var(--paper)' }}>
    <header style={{ background: '#fff', borderBottom: '1px solid var(--line)' }}><div className="shell" style={{ minHeight: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}><Link href="/" style={{ fontWeight: 850, fontSize: 19 }}>HAMLET<span style={{ color: 'var(--gold)' }}>.REST</span></Link><AdminNav current="audit" /></div></header>
    <section className="shell" style={{ maxWidth: 1120, paddingBlock: 34 }}>
      <p style={{ color: '#806522', textTransform: 'uppercase', letterSpacing: '.12em', fontSize: 11, fontWeight: 800 }}>Operations · Read only</p>
      <h1 className="serif" style={{ fontSize: 'clamp(34px,6vw,52px)', fontWeight: 500, margin: '8px 0 12px' }}>Audit trail</h1>
      <p style={{ color: 'var(--muted)', lineHeight: 1.7, maxWidth: 760 }}>Review recent recorded operations, including status changes and administrative decisions. This view is read-only and shows up to the latest 500 records.</p>
      {error && <p role="alert" style={{ background: '#fff0ed', color: '#8a3025', padding: 12, borderRadius: 10 }}>{error}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10, marginBlock: 20 }}>
        <input aria-label="Search audit trail" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search actor, target, action or detail" style={field} />
        <select aria-label="Filter by action" value={action} onChange={e => setAction(e.target.value)} style={field}><option value="all">All actions</option>{actions.map(item => <option key={item} value={item}>{item}</option>)}</select>
      </div>
      {loading ? <p>Loading audit trail…</p> : filtered.length === 0 ? <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: 24 }}><h2 style={{ marginTop: 0 }}>No audit records found</h2><p style={{ color: 'var(--muted)' }}>Try another search or action filter.</p></div> : <div style={{ display: 'grid', gap: 10 }}>{filtered.map(row => <article key={row.id} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}><strong>{row.action.replaceAll('_', ' ')}</strong><time dateTime={row.created_at} style={{ color: 'var(--muted)', fontSize: 12 }}>{new Date(row.created_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos' })}</time></div>
        <p style={{ margin: '8px 0', fontSize: 13 }}><strong>Target:</strong> {row.target || '—'} · <strong>Actor role:</strong> {row.actor_role || '—'}</p>
        <p style={{ margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{row.detail || 'No additional detail recorded.'}</p>
        {row.actor_id && <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: 11 }}>Actor ID: {row.actor_id}</p>}
      </article>)}</div>}
      <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 18 }}>Showing {filtered.length} of {rows.length} loaded records. This page does not modify audit entries.</p>
    </section>
  </main>;
}
