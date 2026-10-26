'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

type Booking = {
  id: string; reference: string; check_in: string; check_out: string; guest_count: number;
  guest_total: number; refundable_deposit: number; status: string; created_at: string;
  properties?: { title?: string; area?: string } | null;
};
const statusLabel: Record<string, string> = {
  requested: 'Awaiting partner response', checking: 'Availability being checked',
  awaiting_payment: 'Awaiting payment', confirmed: 'Confirmed', completed: 'Completed',
  cancelled: 'Cancelled', expired: 'Expired', refunded: 'Refunded', disputed: 'Under review',
  declined: 'Declined', no_show: 'No-show',
};

export default function GuestBookingsPage() {
  const db = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    return url && key ? createClient(url, key) : null;
  }, []);
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    let active = true;
    async function load() {
      if (!db) { setMessage('Account access is not configured on this deployment.'); setLoading(false); return; }
      const { data: session } = await db.auth.getSession();
      if (!session.session) { window.location.assign('/signin?next=/account/bookings'); return; }
      const { data, error } = await db.from('bookings')
        .select('id,reference,check_in,check_out,guest_count,guest_total,refundable_deposit,status,created_at,properties(title,area)')
        .order('created_at', { ascending: false });
      if (!active) return;
      if (error) setMessage('We could not load your booking requests. Please refresh and try again.');
      else setItems((data || []) as unknown as Booking[]);
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [db]);
  async function cancelBooking(booking: Booking) {
    if (!db || !window.confirm('Cancel booking request ' + booking.reference + '?')) return;
    setMessage('');
    setBusy(booking.id);
    try {
      const { error } = await db.rpc('transition_booking', { target_booking_id: booking.id, next_status: 'cancelled', transition_note: 'Cancelled by guest from account bookings.' });
      if (error) throw new Error(error.message);
      setMessage('Booking request ' + booking.reference + ' was cancelled.');
      const { data } = await db.from('bookings').select('id,reference,check_in,check_out,guest_count,guest_total,refundable_deposit,status,created_at,properties(title,area)').order('created_at', { ascending: false });
      setItems((data || []) as unknown as Booking[]);
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : 'Could not cancel this booking request.'); }
    finally { setBusy(''); }
  }
  const money = (amount: number) => '₦' + Number(amount || 0).toLocaleString('en-NG');
  return <main style={{ minHeight: '100svh', background: 'var(--paper)' }}>
    <header style={{ background: '#fff', borderBottom: '1px solid var(--line)' }}><div className="shell" style={{ minHeight: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><Link href="/" style={{ fontWeight: 850, fontSize: 19 }}>HAMLET<span style={{ color: 'var(--gold)' }}>.REST</span></Link><Link href="/stays" className="secondary-button">Explore stays</Link></div></header>
    <section className="shell" style={{ paddingBlock: 34, maxWidth: 900 }}>
      <p style={{ color: '#806522', textTransform: 'uppercase', letterSpacing: '.12em', fontSize: 11, fontWeight: 800 }}>Your account</p>
      <h1 className="serif" style={{ fontSize: 'clamp(34px,6vw,52px)', fontWeight: 500, margin: '8px 0 12px' }}>Your booking requests</h1>
      <p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>Track the status of your stay requests. A request is not confirmed until the property partner accepts it.</p>
      {loading ? <p role="status">Loading your bookings…</p> : message ? <p role="alert">{message}</p> : items.length ? <div style={{ display: 'grid', gap: 12, marginTop: 24 }}>{items.map(b => <article key={b.id} style={{ padding: 18, border: '1px solid var(--line)', borderRadius: 18, background: '#fff' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'start', justifyContent: 'space-between', gap: 12 }}>
          <div><p style={{ margin: 0, color: '#806522', fontSize: 11, fontWeight: 800 }}>{b.reference}</p><h2 style={{ margin: '6px 0', fontSize: 19 }}>{b.properties?.title || 'HAMLET stay'}</h2><p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>{b.properties?.area || 'Nigeria'} · {b.check_in} → {b.check_out} · {b.guest_count} guest(s)</p></div>
          <span style={{ background: '#f1eee7', borderRadius: 999, padding: '7px 10px', fontSize: 12, fontWeight: 750 }}>{statusLabel[b.status] || b.status}</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, borderTop: '1px solid var(--line)', marginTop: 16, paddingTop: 14, fontSize: 13 }}><span>Estimated guest total <strong>{money(b.guest_total)}</strong></span>{Number(b.refundable_deposit) > 0 && <span>Refundable caution deposit <strong>{money(b.refundable_deposit)}</strong></span>}</div>{['requested','checking','awaiting_payment'].includes(b.status) && <div style={{ marginTop: 14 }}><button className="secondary-button" disabled={busy===b.id} onClick={() => void cancelBooking(b)}>{busy===b.id ? 'Cancelling…' : 'Cancel request'}</button></div>}
      </article>)}</div> : <div style={{ marginTop: 24, padding: 28, border: '1px dashed #c8c1b1', borderRadius: 20, textAlign: 'center', background: '#fff' }}><h2 className="serif" style={{ fontWeight: 500 }}>No booking requests yet</h2><p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>Find a stay you like and send a request to get started.</p><Link href="/stays" className="primary-button">Explore stays</Link></div>}
    </section>
  </main>;
}
