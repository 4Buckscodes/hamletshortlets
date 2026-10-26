'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const field: React.CSSProperties = { width: '100%', minHeight: 46, border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px', background: '#fff', color: 'var(--navy)' };
const labelStyle: React.CSSProperties = { display: 'grid', gap: 6, fontSize: 12, fontWeight: 750 };
export default function PartnerApplicationPage() {
  const db = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    return url && key ? createClient(url, key) : null;
  }, []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage('');
    if (!db) { setError('Partner applications are not configured on this deployment.'); return; }
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const userResult = await db.auth.getUser();
    const user = userResult.data.user;
    if (!user) { window.location.assign('/signin?next=/partners/apply'); return; }
    const fullName = String(form.get('fullName') || '').trim();
    const phone = String(form.get('phone') || '').trim();
    const company = String(form.get('company') || '').trim();
    const role = String(form.get('role') || '').trim();
    const areas = String(form.get('areas') || '').split(',').map(v => v.trim()).filter(Boolean).slice(0, 10);
    const count = Number(form.get('propertiesCount'));
    const motivation = String(form.get('motivation') || '').trim();
    if (fullName.length < 2 || phone.length < 7 || company.length < 2 || role.length < 2 || !areas.length || !Number.isInteger(count) || count < 0 || motivation.length < 20) {
      setError('Complete all required details. Explain your experience in at least 20 characters.'); return;
    }
    setBusy(true);
    try {
      const { error: appError } = await db.from('partner_applications').insert({
        applicant_id: user.id, full_name: fullName, email: user.email || '', phone, company, role, areas,
        properties_count: count, motivation, status: 'pending',
      });
      if (appError) throw appError;
      setMessage('Your partner application has been submitted for review. Your account remains a guest account until HAMLET approves the application.');
      formElement.reset();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'We could not submit your application.'); }
    finally { setBusy(false); }
  }
  return <main style={{ minHeight: '100svh', background: 'var(--paper)' }}>
    <header style={{ background: '#fff', borderBottom: '1px solid var(--line)' }}><div className="shell" style={{ minHeight: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><Link href="/" style={{ fontWeight: 850, fontSize: 19 }}>HAMLET<span style={{ color: 'var(--gold)' }}>.REST</span></Link><Link href="/partners" className="secondary-button">Partner workspace</Link></div></header>
    <section className="shell" style={{ maxWidth: 760, paddingBlock: 34 }}>
      <p style={{ color: '#806522', textTransform: 'uppercase', letterSpacing: '.12em', fontSize: 11, fontWeight: 800 }}>Join HAMLET partners</p>
      <h1 className="serif" style={{ fontSize: 'clamp(34px,6vw,52px)', fontWeight: 500, margin: '8px 0 12px' }}>Let’s grow your property business.</h1>
      <p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>Apply as a property owner, manager, operator, co-host, closing agent or referral partner. HAMLET reviews applications before partner permissions are granted.</p>
      <form onSubmit={submit} style={{ display: 'grid', gap: 14, marginTop: 22, padding: 20, borderRadius: 20, border: '1px solid var(--line)', background: '#fff' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: 12 }}>
          <label style={labelStyle}>Full name<input name="fullName" required minLength={2} maxLength={120} style={field}/></label>
          <label style={labelStyle}>Phone number<input name="phone" required minLength={7} maxLength={32} autoComplete="tel" placeholder="+234…" style={field}/></label>
        </div>
        <label style={labelStyle}>Business / company name<input name="company" required minLength={2} maxLength={160} style={field}/></label>
        <label style={labelStyle}>Partner role<select name="role" required style={field}><option value="">Choose your role</option><option value="owner">Property owner</option><option value="property_manager">Property manager</option><option value="shortlet_operator">Shortlet operator</option><option value="cohost">Co-host</option><option value="closing_agent">Closing agent</option><option value="referral">Referral partner</option></select></label>
        <label style={labelStyle}>Areas you cover in Lagos<input name="areas" required placeholder="Lekki, Victoria Island, Ikeja" style={field}/></label>
        <label style={labelStyle}>Properties you can bring<input name="propertiesCount" required type="number" min="0" max="10000" defaultValue="1" style={field}/></label>
        <label style={labelStyle}>Experience and reason for joining<textarea name="motivation" required minLength={20} maxLength={1500} rows={4} placeholder="Tell us about your properties, experience or network…" style={{ ...field, resize: 'vertical' }}/></label>
        {error && <p role="alert" style={{ margin: 0, color: '#9f2d20', fontSize: 13 }}>{error}</p>}
        {message && <p role="status" style={{ margin: 0, color: '#236238', fontSize: 13, lineHeight: 1.6 }}>{message}</p>}
        <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Submitting application…' : 'Submit partner application'}</button>
      </form>
    </section>
  </main>;
}
