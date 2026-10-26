'use client';

import { FormEvent, useState } from 'react';
const field: React.CSSProperties = { width: '100%', minHeight: 44, border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px', background: '#fff', color: 'var(--navy)' };
const labelStyle: React.CSSProperties = { display: 'grid', gap: 6, fontSize: 12, fontWeight: 750 };
export default function PropertySubmissionForm() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage('');
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const csv = (key: string) => String(form.get(key) || '').split(',').map(v => v.trim()).filter(Boolean);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) { setError('Property submissions are not configured on this deployment.'); return; }
    setBusy(true);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const db = createClient(url, key);
      const { data: session } = await db.auth.getSession();
      if (!session.session) { window.location.assign('/signin?next=/partners'); return; }
      const response = await fetch('/api/partner/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.session.access_token },
        body: JSON.stringify({
          title: form.get('title'), propertyType: form.get('propertyType'), area: form.get('area'), address: form.get('address'),
          nightlyRate: Number(form.get('nightlyRate')), cleaningFee: Number(form.get('cleaningFee') || 0), deposit: Number(form.get('deposit') || 0),
          bedrooms: Number(form.get('bedrooms')), bathrooms: Number(form.get('bathrooms')), capacity: Number(form.get('capacity')),
          bedSetup: form.get('bedSetup'), amenities: csv('amenities'), imageUrls: csv('imageUrls'), houseRules: csv('houseRules'),
          authorityBasis: form.get('authorityBasis'), submittedRole: 'Property partner',
        }),
      });
      const result = await response.json() as { error?: string; message?: string; property?: { id: string } };
      if (!response.ok) throw new Error(result.error || 'Submission failed.');
      setMessage((result.message || 'Listing submitted.') + (result.property?.id ? ' Listing ID: ' + result.property.id : ''));
      formElement.reset();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not submit this listing.'); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} style={{ display: 'grid', gap: 14, marginTop: 22, padding: 20, borderRadius: 20, border: '1px solid var(--line)', background: '#fff' }}>
    <h2 style={{ margin: 0, fontSize: 21 }}>Submit a property</h2>
    <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }}>Listings are submitted for review and stay hidden until approved. Use HTTPS image URLs; separate multiple values with commas.</p>
    <label style={labelStyle}>Property title<input name="title" required minLength={4} maxLength={120} placeholder="e.g. Calm 2-bedroom apartment in Lekki" style={field}/></label>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,180px),1fr))', gap: 12 }}>
      <label style={labelStyle}>Property type<select name="propertyType" required style={field}><option value="">Choose type</option><option>Apartment</option><option>Duplex</option><option>Terrace</option><option>Detached house</option><option>Studio</option><option>Villa</option><option>Serviced apartment</option></select></label>
      <label style={labelStyle}>Neighbourhood<input name="area" required maxLength={100} placeholder="Lekki Phase 1" style={field}/></label>
    </div>
    <label style={labelStyle}>Property address<input name="address" required minLength={6} maxLength={240} placeholder="Address for verification (not necessarily public)" style={field}/></label>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,130px),1fr))', gap: 12 }}>
      <label style={labelStyle}>Nightly rate (₦)<input name="nightlyRate" required type="number" min="1" step="1" style={field}/></label>
      <label style={labelStyle}>Cleaning fee (₦)<input name="cleaningFee" type="number" min="0" step="1" defaultValue="0" style={field}/></label>
      <label style={labelStyle}>Refundable deposit (₦)<input name="deposit" type="number" min="0" step="1" defaultValue="0" style={field}/></label>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,130px),1fr))', gap: 12 }}>
      <label style={labelStyle}>Bedrooms<input name="bedrooms" required type="number" min="0" max="100" defaultValue="1" style={field}/></label>
      <label style={labelStyle}>Bathrooms<input name="bathrooms" required type="number" min="0" max="100" defaultValue="1" style={field}/></label>
      <label style={labelStyle}>Guest capacity<input name="capacity" required type="number" min="1" max="50" defaultValue="2" style={field}/></label>
    </div>
    <label style={labelStyle}>Bed setup<input name="bedSetup" maxLength={120} placeholder="1 queen bed, 1 sofa bed" style={field}/></label>
    <label style={labelStyle}>Amenities, comma-separated<input name="amenities" maxLength={1000} placeholder="Wi-Fi, generator, pool, parking" style={field}/></label>
    <label style={labelStyle}>HTTPS image URLs, comma-separated<textarea name="imageUrls" rows={3} placeholder="https://…/living-room.jpg" style={{ ...field, resize: 'vertical' }}/></label>
    <label style={labelStyle}>House rules, comma-separated<textarea name="houseRules" rows={2} placeholder="No smoking, valid ID required" style={{ ...field, resize: 'vertical' }}/></label>
    <label style={labelStyle}>Your authority to list this property<textarea name="authorityBasis" required minLength={9} maxLength={600} rows={3} placeholder="I own this property / I have written authority from the owner…" style={{ ...field, resize: 'vertical' }}/></label>
    {error && <p role="alert" style={{ margin: 0, color: '#9f2d20', fontSize: 13 }}>{error}</p>}
    {message && <p role="status" style={{ margin: 0, color: '#236238', fontSize: 13, lineHeight: 1.6 }}>{message}</p>}
    <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit for review'}</button>
  </form>;
}
