'use client';
import Link from 'next/link';
import { useEffect,useMemo,useState } from 'react';
import { ArrowRight,BadgeCheck,ShieldCheck,Users } from 'lucide-react';
import { getBrowserSupabase } from '@/lib/next-supabase';
import { SiteHeader,SiteFooter } from '@/components/site/SiteShell';

const ROLES=[['property_owner','Property owner'],['authorised_manager','Authorised manager'],['multi_property_operator','Multi-property operator'],['closing_agent','Closing agent']] as const;
type Membership={primary_role:string;company:string;phone:string;status:'active'|'suspended';joined_at:string};
export default function PartnerStartDashboard(){
 const db=useMemo(()=>getBrowserSupabase(),[]);
 const [name,setName]=useState('');const [email,setEmail]=useState('');const [membership,setMembership]=useState<Membership|null>(null);
 const [role,setRole]=useState('property_owner');const [company,setCompany]=useState('');const [phone,setPhone]=useState('');
 const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [error,setError]=useState('');
 useEffect(()=>{let live=true;async function load(){if(!db){setError('HAMLET account access is not configured.');setLoading(false);return;}
 const {data:auth}=await db.auth.getSession();const user=auth.session?.user;if(!user){window.location.assign('/signin?mode=signup&next=%2Fpartners%2Fstart');return;}
 setEmail(user.email||'');const [{data:p},{data:m}]=await Promise.all([db.from('profiles').select('full_name,phone').eq('id',user.id).maybeSingle(),db.from('partner_network_memberships').select('primary_role,company,phone,status,joined_at').eq('user_id',user.id).maybeSingle()]);
 if(!live)return;setName(p?.full_name||String(user.user_metadata?.full_name||''));setPhone(m?.phone||p?.phone||String(user.user_metadata?.phone||''));if(m){setMembership(m as Membership);setRole(m.primary_role);setCompany(m.company);}setLoading(false);}
 const t=window.setTimeout(()=>{void load();},0);return()=>{live=false;window.clearTimeout(t);};},[db]);
 async function join(e:React.FormEvent<HTMLFormElement>){e.preventDefault();if(!db)return;setSaving(true);setError('');const {data,error:e2}=await db.rpc('join_partner_network',{next_role:role,next_company:company,next_phone:phone});if(e2)setError(e2.message);else setMembership(data as Membership);setSaving(false);}
 const first=name.trim().split(/\s+/)[0]||'there';const roleLabel=ROLES.find(([v])=>v===membership?.primary_role)?.[1]||membership?.primary_role;
 return <div className="flex min-h-dvh flex-col bg-paper"><SiteHeader/><main className="shell flex-1 py-8 sm:py-12">
 <p className="eyebrow">HAMLET Partner Network</p><h1 className="serif mt-2 text-3xl font-medium text-ink-900 sm:text-5xl">{loading?'Your partner space is getting ready':`Welcome, ${first}.`}</h1>
 <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-600 sm:text-base">Join the network in minutes. No manual approval is needed just to register. Property authority, identity checks and listing publication are reviewed separately when required.</p>
 {error&&<p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
 {loading?<p role="status" className="mt-8 text-sm">Loading your account…</p>:<>
 <div className="mt-7 grid gap-4 md:grid-cols-3">
 <article className="rounded-3xl border border-ink-100 bg-white p-5"><Users className="h-5 w-5 text-brass-700"/><h2 className="mt-3 font-bold text-ink-900">Your account</h2><p className="mt-1 break-all text-sm text-ink-600">{email}</p><p className="mt-2 text-xs text-ink-500">Registration is free to start.</p></article>
 <article className="rounded-3xl border border-ink-100 bg-white p-5"><ShieldCheck className="h-5 w-5 text-brass-700"/><h2 className="mt-3 font-bold text-ink-900">Progressive trust</h2><p className="mt-1 text-sm text-ink-600">You can join immediately. Managing properties, accessing owner information, handling bookings and payouts require separate authority checks.</p></article>
 <article className="rounded-3xl border border-ink-100 bg-white p-5"><BadgeCheck className="h-5 w-5 text-brass-700"/><h2 className="mt-3 font-bold text-ink-900">Network status</h2><p className="mt-2 text-xs font-extrabold uppercase">{membership?.status==='suspended'?'Suspended':membership?'Active · Registered':'Not registered yet'}</p><p className="mt-1 text-sm text-ink-600">{membership?'Your network profile is on record.':'Complete the short form to join.'}</p></article></div>
 {membership?.status==='suspended'?<section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-6"><h2 className="serif text-2xl text-ink-900">Membership suspended</h2><p className="mt-2 text-sm text-ink-700">Contact HAMLET support. You cannot reactivate a suspended membership yourself.</p></section>:membership?<section className="mt-6 rounded-3xl border border-ink-200 bg-white p-6 sm:p-8"><BadgeCheck className="h-6 w-6 text-brass-700"/><h2 className="serif mt-3 text-2xl text-ink-900">You’re in the network.</h2><p className="mt-2 text-sm text-ink-600">Registered as {roleLabel} · {membership.company}</p><p className="mt-2 text-sm text-ink-600">Membership alone does not grant private property access, booking management, payouts or public listing rights.</p><div className="mt-5 flex flex-wrap gap-3"><Link href="/partners/apply/form" className="primary-button">Continue property / authority checks <ArrowRight className="h-4 w-4"/></Link><Link href="/stays" className="secondary-button">Explore stays</Link></div></section>:<form onSubmit={join} className="mt-6 max-w-2xl rounded-3xl border border-ink-200 bg-white p-6 sm:p-8"><h2 className="serif text-2xl text-ink-900">Join the HAMLET partner network</h2><p className="mt-2 text-sm text-ink-600">Tell us how you work. You can complete verification when you need a restricted capability.</p>
 <label className="mt-5 block text-xs font-bold text-ink-700">Primary role<select value={role} onChange={e=>setRole(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm">{ROLES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
 <label className="mt-4 block text-xs font-bold text-ink-700">Business / display name<input required minLength={2} maxLength={160} value={company} onChange={e=>setCompany(e.target.value)} placeholder="Your business or name" className="mt-2 min-h-12 w-full rounded-xl border border-ink-200 px-3 text-sm"/></label>
 <label className="mt-4 block text-xs font-bold text-ink-700">Phone number<input required value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+234…" className="mt-2 min-h-12 w-full rounded-xl border border-ink-200 px-3 text-sm"/></label>
 <button disabled={saving} type="submit" className="primary-button mt-6 w-full">{saving?'Joining…':'Join partner network →'}</button></form>}
 <p className="mt-6 text-xs text-ink-500">Property submission, owner authority, identity checks and public listing approval remain separate steps.</p></>}
 </main><SiteFooter/></div>;
}
