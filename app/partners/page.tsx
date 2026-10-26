'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import PropertySubmissionForm from './property-submission-form';
import PropertyEditPanel from './property-edit-panel';

type ManagedProperty = { property_id: string; access_role: string; scope: string; status: string; properties?: { title?: string; area?: string; status?: string; nightly_rate?: number } | null };
export default function PartnerWorkspacePage() {
  const db = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    return url && key ? createClient(url, key) : null;
  }, []);
  const [listings, setListings] = useState<ManagedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let active = true;
    async function load() {
      if (!db) { setError('Partner workspace is not configured on this deployment.'); setLoading(false); return; }
      const { data: session } = await db.auth.getSession();
      if (!session.session) { window.location.assign('/signin?next=/partners'); return; }
      const { data: profile, error: profileError } = await db.from('profiles').select('role').eq('id', session.session.user.id).maybeSingle();
      if (profileError || profile?.role !== 'partner') {
        if (active) { setError('Partner access is not active on this account yet. Create an account first, then contact HAMLET to complete partner verification.'); setLoading(false); }
        return;
      }
      const { data, error: listingError } = await db.from('property_access')
        .select('property_id,access_role,scope,status,properties(title,area,status,nightly_rate)')
        .eq('user_id', session.session.user.id).eq('status', 'active');
      if (!active) return;
      if (listingError) setError('We could not load your managed properties. Please refresh and try again.');
      else setListings((data || []) as unknown as ManagedProperty[]);
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [db]);
  const money = (n: number) => '₦' + Number(n || 0).toLocaleString('en-NG');
  async function togglePublication(item: ManagedProperty) {
    const status = item.properties?.status;
    if (!db || !['approved', 'paused'].includes(status || '')) return;
    const nextPaused = status === 'approved';
    const confirmed = window.confirm(nextPaused
      ? 'Pause this listing? Guests will no longer see it as available to book.'
      : 'Resume this listing? It will return to approved publication status.');
    if (!confirmed) return;
    setActionId(item.property_id); setError(''); setNotice('');
    try {
      const { data: auth } = await db.auth.getSession();
      if (!auth.session) { window.location.assign('/signin?next=/partners'); return; }
      const { error: rpcError } = await db.rpc('set_property_publication_pause', {
        target_property_id: item.property_id,
        paused: nextPaused,
        pause_note: nextPaused ? 'Partner paused listing from native workspace' : 'Partner resumed listing from native workspace',
      });
      if (rpcError) throw new Error(rpcError.message);
      setListings(current => current.map(row => row.property_id === item.property_id
        ? { ...row, properties: row.properties ? { ...row.properties, status: nextPaused ? 'paused' : 'approved' } : row.properties }
        : row));
      setNotice(nextPaused ? 'Listing paused. It is no longer publicly bookable.' : 'Listing resumed and returned to approved status.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update listing publication status.');
    } finally { setActionId(''); }
  }
  return <main style={{ minHeight: '100svh', background: 'var(--paper)' }}>
    <header style={{ background: '#fff', borderBottom: '1px solid var(--line)' }}><div className="shell" style={{ minHeight: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><Link href="/" style={{ fontWeight: 850, fontSize: 19 }}>HAMLET<span style={{ color: 'var(--gold)' }}>.REST</span></Link><Link href="/stays" className="secondary-button">View marketplace</Link></div></header>
    <section className="shell" style={{ paddingBlock: 34, maxWidth: 1000 }}>
      <p style={{ color: '#806522', textTransform: 'uppercase', letterSpacing: '.12em', fontSize: 11, fontWeight: 800 }}>HAMLET partners</p>
      <h1 className="serif" style={{ fontSize: 'clamp(34px,6vw,52px)', fontWeight: 500, margin: '8px 0 12px' }}>Your property workspace</h1>
      <p style={{ color: 'var(--muted)', lineHeight: 1.7, maxWidth: 650 }}>View properties assigned to your account and continue managing existing listing workflows. Every new property is reviewed before it appears publicly.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, margin: '22px 0 28px' }}><Link href="/legacy" className="primary-button">Open full partner tools</Link><Link href="/partners/bookings" className="secondary-button">Booking requests</Link><Link href="/partners/availability" className="secondary-button">Availability calendar</Link><Link href="/account/bookings" className="secondary-button">Guest booking view</Link><Link href="/partners/apply" className="secondary-button">Apply to become a partner</Link></div>
      {notice && <p role="status" style={{ color: '#24552b', padding: '10px 12px', background: '#edf6ed', borderRadius: 10 }}>{notice}</p>}
      {loading ? <p role="status">Loading your property workspace…</p> : error ? <div role="alert" style={{ padding: 16, borderRadius: 14, background: '#fff', border: '1px solid var(--line)', lineHeight: 1.7 }}>{error}</div> : listings.length ? <div style={{ display: 'grid', gap: 12 }}>{listings.map(item => <article key={item.property_id} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 18, padding: 18, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}><div><h2 style={{ margin: '0 0 5px', fontSize: 19 }}>{item.properties?.title || 'Property listing'}</h2><p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>{item.properties?.area || 'Location pending'} · {item.access_role} · {item.properties?.status || 'status unavailable'}</p></div><div style={{ display: 'grid', justifyItems: 'end', gap: 8 }}><strong>{money(Number(item.properties?.nightly_rate || 0))}<span style={{ color: 'var(--muted)', fontWeight: 450, fontSize: 12 }}> / night</span></strong>{['approved', 'paused'].includes(item.properties?.status || '') && <button type="button" className="secondary-button" disabled={actionId === item.property_id} onClick={() => void togglePublication(item)}>{actionId === item.property_id ? 'Saving…' : item.properties?.status === 'approved' ? 'Pause listing' : 'Resume listing'}</button>}<PropertyEditPanel propertyId={item.property_id} status={item.properties?.status || ''}/></div></article>)}</div> : <div style={{ padding: 28, borderRadius: 20, border: '1px dashed #c8c1b1', textAlign: 'center', background: '#fff' }}><h2 className="serif" style={{ fontWeight: 500 }}>No properties assigned yet</h2><p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>Your listings will appear here once HAMLET grants partner access.</p><Link href="/legacy" className="primary-button">Open partner tools</Link></div>}
      {!loading && !error && <PropertySubmissionForm />}
    </section>
  </main>;
}
