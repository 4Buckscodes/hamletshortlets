'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

type Property = { id: string; title: string; property_type: string; area: string; public_address: string; nightly_rate: number; bedrooms: number; bathrooms: number; capacity: number; image_urls: string[]; status: string; trust_label: string; verification: Record<string, string>; review_note?: string | null; created_at: string };
const stages = ['ownership', 'identity', 'authority', 'inspection'] as const;
const field: React.CSSProperties = { width: '100%', minHeight: 44, border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px', background: '#fff', color: 'var(--navy)' };
export default function AdminPropertiesPage() {
  const db = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    return url && key ? createClient(url, key) : null;
  }, []);
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [verification, setVerification] = useState<Record<string, Record<string, string>>>({});
  const [busy, setBusy] = useState('');
  const load = useCallback(async () => {
    if (!db) { setError('Admin tools are not configured.'); setLoading(false); return; }
    const { data: session } = await db.auth.getSession();
    if (!session.session) { window.location.assign('/signin?next=/admin/properties'); return; }
    const { data: profile, error: profileError } = await db.from('profiles').select('role').eq('id', session.session.user.id).maybeSingle();
    if (profileError || profile?.role !== 'admin') { setError('Administrator access is required.'); setLoading(false); return; }
    const { data, error: queryError } = await db.from('properties').select('id,title,property_type,area,public_address,nightly_rate,bedrooms,bathrooms,capacity,image_urls,status,trust_label,verification,review_note,created_at').in('status', ['submitted','needs_correction','approved','suspended','paused']).order('created_at',{ascending:false}).limit(100);
    if (queryError) setError('Could not load property reviews.');
    else setItems((data || []) as Property[]);
    setLoading(false);
  }, [db]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  async function review(property: Property, decision: string) {
    setError(''); setNotice('');
    const note = notes[property.id]?.trim() || '';
    if (note.length < 10) { setError('Add a review note of at least 10 characters for ' + property.title + '.'); return; }
    const selected = verification[property.id] || Object.fromEntries(stages.map(k => [k, property.verification?.[k] || 'pending_review']));
    if (decision === 'approved' && stages.some(k => selected[k] !== 'verified')) { setError('All four verification checks must be marked verified before approval.'); return; }
    setBusy(property.id);
    try {
      const { data: session } = await db!.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error('Your session expired. Sign in again.');
      const response = await fetch('/api/admin/properties/review', { method: 'POST', headers: { 'Content-Type':'application/json', Authorization:'Bearer '+token }, body: JSON.stringify({ propertyId: property.id, decision, note, verification: selected }) });
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || 'Review failed.');
      setNotice(result.message || 'Review saved.');
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Review failed.'); }
    finally { setBusy(''); }
  }
  const money = (n:number) => '₦'+Number(n||0).toLocaleString('en-NG');
  return <main style={{ minHeight:'100svh',background:'var(--paper)' }}>
    <header style={{ background:'#fff',borderBottom:'1px solid var(--line)' }}><div className="shell" style={{ minHeight:68,display:'flex',alignItems:'center',justifyContent:'space-between' }}><Link href="/" style={{ fontWeight:850,fontSize:19 }}>HAMLET<span style={{color:'var(--gold)'}}>.REST</span></Link><Link href="/legacy" className="secondary-button">Full admin console</Link></div></header>
    <section className="shell" style={{ maxWidth:1100,paddingBlock:34 }}>
      <p style={{color:'#806522',textTransform:'uppercase',letterSpacing:'.12em',fontSize:11,fontWeight:800}}>Operations</p><h1 className="serif" style={{fontSize:'clamp(34px,6vw,52px)',fontWeight:500,margin:'8px 0 12px'}}>Property review queue</h1>
      <p style={{color:'var(--muted)',lineHeight:1.7}}>Review evidence declarations and listing details. HAMLET will not mark a listing verified until all four verification outcomes are explicitly verified.</p>
      {error&&<p role="alert" style={{background:'#fff0ee',padding:12,borderRadius:10,color:'#9f2d20'}}>{error}</p>}{notice&&<p role="status" style={{background:'#edf7ef',padding:12,borderRadius:10,color:'#236238'}}>{notice}</p>}
      {loading?<p role="status">Loading review queue…</p>:items.length===0?<div style={{padding:28,background:'#fff',borderRadius:18,textAlign:'center'}}>No listings are waiting in the review queue.</div>:<div style={{display:'grid',gap:16,marginTop:22}}>{items.map(p=>{
        const selected=verification[p.id]||Object.fromEntries(stages.map(k=>[k,p.verification?.[k]||'pending_review']));
        return <article key={p.id} style={{background:'#fff',border:'1px solid var(--line)',borderRadius:20,padding:18}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,250px),1fr))',gap:18}}>
            <div>{p.image_urls?.[0]&&<img src={p.image_urls[0]} alt={p.title} style={{width:'100%',aspectRatio:'4/3',objectFit:'cover',borderRadius:14}}/>}<p style={{fontSize:11,color:'#806522',fontWeight:800,textTransform:'uppercase',marginBottom:6}}>{p.status} · {p.area}</p><h2 style={{fontSize:22,margin:'0 0 8px'}}>{p.title}</h2><p style={{fontSize:13,color:'var(--muted)',lineHeight:1.7}}>{p.property_type} · {p.bedrooms} bed · {p.bathrooms} bath · {p.capacity} guests<br/>{p.public_address}</p><strong>{money(p.nightly_rate)} / night</strong>{p.review_note&&<p style={{fontSize:12,color:'#9f2d20'}}>Previous note: {p.review_note}</p>}</div>
            <div style={{display:'grid',gap:10,alignContent:'start'}}><h3 style={{margin:0,fontSize:16}}>Verification checklist</h3>{stages.map(k=><label key={k} style={{display:'grid',gap:5,fontSize:12,fontWeight:750,textTransform:'capitalize'}}>{k}<select value={selected[k]||'pending_review'} onChange={e=>setVerification(v=>({...v,[p.id]:{...(v[p.id]||selected),[k]:e.target.value}}))} style={field}><option value="pending_review">Pending review</option><option value="verified">Verified</option><option value="missing">Missing</option><option value="self_reported">Self-reported only</option></select></label>)}<label style={{display:'grid',gap:6,fontSize:12,fontWeight:750}}>Reviewer note (required)<textarea value={notes[p.id]??''} onChange={e=>setNotes(v=>({...v,[p.id]:e.target.value}))} minLength={10} maxLength={1000} rows={3} placeholder="Explain the decision and any outstanding evidence…" style={{...field,resize:'vertical'}}/></label><div style={{display:'flex',flexWrap:'wrap',gap:8}}>{p.status==='submitted'||p.status==='needs_correction'?<><button className="primary-button" disabled={busy===p.id} onClick={()=>void review(p,'approved')}>Approve verified listing</button><button className="secondary-button" disabled={busy===p.id} onClick={()=>void review(p,'needs_correction')}>Request corrections</button><button className="secondary-button" disabled={busy===p.id} onClick={()=>void review(p,'rejected')}>Reject</button></>:<><button className="secondary-button" disabled={busy===p.id} onClick={()=>void review(p,p.status==='approved'?'paused':'approved')}>{p.status==='approved'?'Pause listing':'Reinstate listing'}</button></>}</div></div>
          </div>
        </article>;
      })}</div>}
    </section>
  </main>;
}
