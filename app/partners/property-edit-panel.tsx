'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

type EditableProperty = {
  id: string; title: string; property_type: string; area: string; public_address: string;
  nightly_rate: number; cleaning_fee: number; refundable_deposit: number; bedrooms: number;
  bathrooms: number; capacity: number; bed_setup: string | null; amenities: string[] | null;
  image_urls: string[] | null; house_rules: string[] | null; first_available_date: string | null;
  availability_confirmation_status: string | null; calendar_responsible_person: string | null;
  status: string;
};
const inputStyle: React.CSSProperties = { width: '100%', minHeight: 42, border: '1px solid var(--line)', borderRadius: 9, padding: '9px 11px', background: '#fff', color: 'var(--navy)' };
const labelStyle: React.CSSProperties = { display: 'grid', gap: 5, fontSize: 12, fontWeight: 750 };
const split = (value: string) => value.split(',').map(item => item.trim()).filter(Boolean);
export default function PropertyEditPanel({ propertyId, status }: { propertyId: string; status: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [property, setProperty] = useState<EditableProperty | null>(null);
  const [authority, setAuthority] = useState('');
  const [correction, setCorrection] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const allowed = status === 'draft' || status === 'needs_correction';
  async function load() {
    setOpen(true); setError(''); setNotice('');
    if (property) return;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) { setError('Property editing is not configured on this deployment.'); return; }
    setLoading(true);
    try {
      const db = createClient(url, key);
      const { data: auth } = await db.auth.getSession();
      if (!auth.session) { window.location.assign('/signin?next=/partners'); return; }
      const { data, error: queryError } = await db.from('properties')
        .select('id,title,property_type,area,public_address,nightly_rate,cleaning_fee,refundable_deposit,bedrooms,bathrooms,capacity,bed_setup,amenities,image_urls,house_rules,first_available_date,availability_confirmation_status,calendar_responsible_person,status')
        .eq('id', propertyId).maybeSingle();
      if (queryError) throw new Error(queryError.message);
      if (!data || !['draft', 'needs_correction'].includes(data.status)) throw new Error('Only draft or correction-requested listings can be edited here.');
      setProperty(data as EditableProperty);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load listing details.'); }
    finally { setLoading(false); }
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!property) return;
    setError(''); setNotice('');
    const form = new FormData(event.currentTarget);
    const title = String(form.get('title') || '').trim();
    const area = String(form.get('area') || '').trim();
    const address = String(form.get('address') || '').trim();
    const nightlyRate = Number(form.get('nightlyRate'));
    const cleaningFee = Number(form.get('cleaningFee') || 0);
    const deposit = Number(form.get('deposit') || 0);
    const bedrooms = Number(form.get('bedrooms'));
    const bathrooms = Number(form.get('bathrooms'));
    const capacity = Number(form.get('capacity'));
    const imageUrls = split(String(form.get('imageUrls') || '')).slice(0, 12);
    const saveAsDraft = form.get('saveAsDraft') === 'on';
    if (title.length < 8 || area.length < 2 || address.length < 10 || !Number.isInteger(nightlyRate) || nightlyRate < 1 ||
      !Number.isInteger(cleaningFee) || cleaningFee < 0 || !Number.isInteger(deposit) || deposit < 0 ||
      !Number.isInteger(bedrooms) || bedrooms < 0 || !Number.isInteger(bathrooms) || bathrooms < 0 ||
      !Number.isInteger(capacity) || capacity < 1 || capacity > 50) {
      setError('Check the title, address, price, room counts and guest capacity.'); return;
    }
    if (imageUrls.some(value => { try { return new URL(value).protocol !== 'https:'; } catch { return true; } })) {
      setError('Every photo must be a valid HTTPS URL.'); return;
    }
    if (!saveAsDraft && imageUrls.length < 1) { setError('Add at least one HTTPS photo before submitting for review.'); return; }
    if (!saveAsDraft && authority.trim().length < 9) { setError('Please confirm your authority to list this property (at least 9 characters).'); return; }
    setSaving(true);
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      if (!url || !key) throw new Error('Property editing is not configured.');
      const db = createClient(url, key);
      const { data: auth } = await db.auth.getSession();
      if (!auth.session) { window.location.assign('/signin?next=/partners'); return; }
      const { error: rpcError } = await db.rpc('update_and_resubmit_partner_property', {
        target_property_id: propertyId,
        listing_data: {
          title, property_type: String(form.get('propertyType') || '').trim(), area, public_address: address,
          nightly_rate: nightlyRate, cleaning_fee: cleaningFee,
          mandatory_charges: cleaningFee > 0 ? [{ label: 'Cleaning fee', amount: cleaningFee }] : [],
          refundable_deposit: deposit, bedrooms, bathrooms, capacity,
          bed_setup: String(form.get('bedSetup') || '').trim(),
          amenities: split(String(form.get('amenities') || '')).slice(0, 30),
          image_urls: imageUrls, house_rules: split(String(form.get('houseRules') || '')).slice(0, 30),
          first_available_date: String(form.get('firstAvailableDate') || '') || null,
          availability_confirmation_status: String(form.get('confirmationStatus') || 'confirmed'),
          calendar_responsible_person: String(form.get('calendarResponsiblePerson') || '').trim() || null,
          save_as_draft: saveAsDraft,
        },
        submission_data: {
          authority_basis: authority.trim(),
          submitted_role: 'Property partner',
          docs: [
            { label: 'Ownership / title evidence', status: 'self_reported' },
            { label: 'Identity evidence', status: 'self_reported' },
            { label: 'Authority to list', status: 'self_reported' },
          ],
        },
        correction_note: correction.trim() || null,
      });
      if (rpcError) throw new Error(rpcError.message);
      setNotice(saveAsDraft ? 'Draft saved. It remains hidden from guests.' : 'Listing submitted for HAMLET review. It remains hidden until approved.');
      setProperty({ ...property, title, property_type: String(form.get('propertyType') || ''), area, public_address: address, nightly_rate: nightlyRate, cleaning_fee: cleaningFee, refundable_deposit: deposit, bedrooms, bathrooms, capacity, bed_setup: String(form.get('bedSetup') || ''), amenities: split(String(form.get('amenities') || '')), image_urls: imageUrls, house_rules: split(String(form.get('houseRules') || '')), first_available_date: String(form.get('firstAvailableDate') || '') || null, availability_confirmation_status: String(form.get('confirmationStatus') || 'confirmed'), calendar_responsible_person: String(form.get('calendarResponsiblePerson') || ''), status: saveAsDraft ? 'draft' : 'submitted' });
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save listing changes.'); }
    finally { setSaving(false); }
  }
  if (!allowed) return null;
  return <div style={{ marginTop: 8 }}>
    <button type="button" className="secondary-button" onClick={() => open ? setOpen(false) : void load()}>{open ? 'Close editor' : status === 'draft' ? 'Edit draft' : 'Correct & resubmit'}</button>
    {open && <div style={{ marginTop: 12, border: '1px solid var(--line)', borderRadius: 14, padding: 16, background: '#fbfaf7' }}>
      {loading ? <p role="status">Loading listing details…</p> : error && !property ? <p role="alert">{error}</p> : property && <form onSubmit={save} style={{ display: 'grid', gap: 12 }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>Edit a draft or address requested corrections. Submitting sends it back for review; it is not published automatically.</p>
        <label style={labelStyle}>Title<input name="title" required minLength={8} maxLength={120} defaultValue={property.title} style={inputStyle}/></label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,180px),1fr))', gap: 10 }}>
          <label style={labelStyle}>Type<input name="propertyType" required defaultValue={property.property_type} style={inputStyle}/></label>
          <label style={labelStyle}>Neighbourhood<input name="area" required defaultValue={property.area} style={inputStyle}/></label>
        </div>
        <label style={labelStyle}>Property address<input name="address" required minLength={10} defaultValue={property.public_address} style={inputStyle}/></label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,120px),1fr))', gap: 10 }}>
          <label style={labelStyle}>Nightly rate (₦)<input name="nightlyRate" type="number" min="1" step="1" required defaultValue={property.nightly_rate} style={inputStyle}/></label>
          <label style={labelStyle}>Cleaning fee (₦)<input name="cleaningFee" type="number" min="0" step="1" defaultValue={property.cleaning_fee} style={inputStyle}/></label>
          <label style={labelStyle}>Refundable deposit (₦)<input name="deposit" type="number" min="0" step="1" defaultValue={property.refundable_deposit} style={inputStyle}/></label>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,100px),1fr))', gap: 10 }}>
          <label style={labelStyle}>Bedrooms<input name="bedrooms" type="number" min="0" required defaultValue={property.bedrooms} style={inputStyle}/></label>
          <label style={labelStyle}>Bathrooms<input name="bathrooms" type="number" min="0" required defaultValue={property.bathrooms} style={inputStyle}/></label>
          <label style={labelStyle}>Guest capacity<input name="capacity" type="number" min="1" max="50" required defaultValue={property.capacity} style={inputStyle}/></label>
        </div>
        <label style={labelStyle}>Bed setup<input name="bedSetup" defaultValue={property.bed_setup || ''} style={inputStyle}/></label>
        <label style={labelStyle}>Amenities (comma-separated)<input name="amenities" defaultValue={(property.amenities || []).join(', ')} style={inputStyle}/></label>
        <label style={labelStyle}>HTTPS photo URLs, comma-separated (up to 12)<textarea name="imageUrls" rows={3} defaultValue={(property.image_urls || []).join(', ')} style={{ ...inputStyle, resize: 'vertical' }}/></label>
        <label style={labelStyle}>House rules (comma-separated)<textarea name="houseRules" rows={2} defaultValue={(property.house_rules || []).join(', ')} style={{ ...inputStyle, resize: 'vertical' }}/></label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,180px),1fr))', gap: 10 }}>
          <label style={labelStyle}>First available date<input name="firstAvailableDate" type="date" defaultValue={property.first_available_date || ''} style={inputStyle}/></label>
          <label style={labelStyle}>Availability confirmation<select name="confirmationStatus" defaultValue={property.availability_confirmation_status || 'confirmed'} style={inputStyle}><option value="confirmed">Calendar confirmed</option><option value="needs_confirmation">Needs partner confirmation</option></select></label>
        </div>
        <label style={labelStyle}>Calendar contact person<input name="calendarResponsiblePerson" defaultValue={property.calendar_responsible_person || ''} style={inputStyle}/></label>
        <label style={labelStyle}>Authority to list this property<textarea value={authority} onChange={e => setAuthority(e.target.value)} rows={2} placeholder="Confirm ownership or written permission to list…" style={{ ...inputStyle, resize: 'vertical' }}/></label>
        <label style={labelStyle}>Correction summary (optional)<textarea value={correction} onChange={e => setCorrection(e.target.value)} rows={2} maxLength={500} placeholder="What did you change to address the review feedback?" style={{ ...inputStyle, resize: 'vertical' }}/></label>
        {status === 'draft' && <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}><input type="checkbox" name="saveAsDraft"/> Save as draft instead of submitting</label>}
        {error && <p role="alert" style={{ margin: 0, color: '#9f2d20' }}>{error}</p>}
        {notice && <p role="status" style={{ margin: 0, color: '#236238' }}>{notice}</p>}
        <button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes & submit for review'}</button>
      </form>}
    </div>}
  </div>;
}
