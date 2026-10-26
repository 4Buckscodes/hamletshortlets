'use client';

import { FormEvent, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { calculateGuestPricing, nightsBetween } from '@/lib/pricing';

type Props = { propertyId: string; nightlyRate: number; cleaningFee: number; deposit: number; capacity: number | null };
const inputStyle: React.CSSProperties = { width: '100%', minHeight: 46, border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px', background: '#fff', color: 'var(--navy)' };

export default function BookingRequestForm({ propertyId, nightlyRate, cleaningFee, deposit, capacity }: Props) {
  const db = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    return url && key ? createClient(url, key) : null;
  }, []);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('1');
  const [requests, setRequests] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const nights = checkIn && checkOut && checkOut > checkIn ? nightsBetween(checkIn, checkOut) : 0;
  const pricing = calculateGuestPricing({ accommodationSubtotal: nightlyRate * nights, mandatoryCharges: cleaningFee > 0 ? [{ label: 'Cleaning fee', amount: cleaningFee }] : [], refundableDeposit: deposit });
  const money = (n: number) => '₦' + Math.round(n).toLocaleString('en-NG');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage('');
    if (!db) { setError('Booking is temporarily unavailable. Please try again later.'); return; }
    if (!nights || nights < 1) { setError('Choose a valid check-in and check-out date.'); return; }
    if (checkIn < new Date().toISOString().slice(0, 10)) { setError('Check-in must be today or later.'); return; }
    if (capacity && Number(guests) > capacity) { setError('This stay does not accommodate that many guests.'); return; }
    setBusy(true);
    try {
      const { data: { user } } = await db.auth.getUser();
      if (!user) { window.location.assign('/signin?next=' + encodeURIComponent(window.location.pathname)); return; }
      const { data: sessionData } = await db.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) { window.location.assign('/signin?next=' + encodeURIComponent(window.location.pathname)); return; }
      const response = await fetch('/api/booking-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + accessToken },
        body: JSON.stringify({ propertyId, checkIn, checkOut, guests: Number(guests), specialRequests: requests.trim() }),
      });
      const result = await response.json() as { error?: string; booking?: { reference?: string }; message?: string };
      if (!response.ok) throw new Error(result.error || 'We could not submit the booking request.');
      setMessage((result.message || 'Request sent.') + (result.booking?.reference ? ' Reference: ' + result.booking.reference + '.' : ''));
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'We could not submit the request. Please try again.'); }
    finally { setBusy(false); }
  }

  return <form onSubmit={submit} style={{ display: 'grid', gap: 13, marginTop: 18 }}>
    <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 750 }}>Check-in<input required type="date" min={new Date().toISOString().slice(0,10)} value={checkIn} onChange={e=>setCheckIn(e.target.value)} style={inputStyle}/></label>
    <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 750 }}>Check-out<input required type="date" min={checkIn || new Date().toISOString().slice(0,10)} value={checkOut} onChange={e=>setCheckOut(e.target.value)} style={inputStyle}/></label>
    <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 750 }}>Guests<select value={guests} onChange={e=>setGuests(e.target.value)} style={inputStyle}>{Array.from({length:Math.min(capacity||10,10)},(_,i)=><option key={i} value={i+1}>{i+1} {i===0?'guest':'guests'}</option>)}</select></label>
    <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 750 }}>Special requests (optional)<textarea value={requests} onChange={e=>setRequests(e.target.value)} rows={3} maxLength={1000} placeholder="Anything the host should know?" style={{...inputStyle,resize:'vertical'}}/></label>
    {nights > 0 && <div style={{ borderTop:'1px solid var(--line)', paddingTop:12, display:'grid',gap:7,fontSize:13 }}><div style={{display:'flex',justifyContent:'space-between'}}><span>{money(nightlyRate)} × {nights} nights</span><span>{money(pricing.accommodationSubtotal)}</span></div>{cleaningFee>0&&<div style={{display:'flex',justifyContent:'space-between'}}><span>Cleaning fee</span><span>{money(cleaningFee)}</span></div>}<div style={{display:'flex',justifyContent:'space-between'}}><span>HAMLET guest fee (20%)</span><span>{money(pricing.hamletGuestServiceFee)}</span></div><div style={{display:'flex',justifyContent:'space-between',fontWeight:800,fontSize:16}}><span>Estimated total</span><span>{money(pricing.guestTotal)}</span></div>{deposit>0&&<div style={{display:'flex',justifyContent:'space-between',color:'var(--muted)'}}><span>Refundable caution deposit (separate)</span><span>{money(deposit)}</span></div>}</div>}
    {error&&<p role="alert" style={{color:'#9f2d20',fontSize:13}}>{error}</p>}{message&&<p role="status" style={{color:'#236238',fontSize:13,lineHeight:1.6}}>{message}</p>}
    <button className="primary-button" disabled={busy} type="submit">{busy?'Sending request…':'Request to book'}</button>
    <p style={{fontSize:11,color:'var(--muted)',lineHeight:1.6,margin:0}}>No payment is taken here. Your request is pending until the partner confirms availability. Final totals must be verified before payment.</p>
  </form>;
}
