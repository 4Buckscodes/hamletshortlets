import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicSupabase } from '@/lib/supabase-public';

type Props={params:Promise<{id:string}>};
type Stay={id:string;title:string;property_type:string|null;area:string|null;city:string|null;public_address:string|null;nightly_rate:number|string|null;bedrooms:number|null;bathrooms:number|null;capacity:number|null;bed_setup:string|null;image_urls:string[]|null;amenities:string[]|null;house_rules:string[]|null;trust_label:string|null;public_location_summary:string|null;cleaning_fee:number|string|null;refundable_deposit:number|string|null};
export async function generateMetadata({params}:Props){const {id}=await params;const db=getPublicSupabase();if(!db)return {title:'Stay details'};const {data}=await db.from('properties').select('title,area').eq('id',id).eq('status','approved').maybeSingle();return {title:data?data.title+' in '+(data.area||'Lagos'):'Stay details'};}
export default async function PropertyDetailPage({params}:Props){
 const {id}=await params;const db=getPublicSupabase();
 if(!db)return <main className="shell" style={{paddingBlock:40}}><Link href="/stays">← Back to stays</Link><h1 className="serif">Stay details</h1><p>Configure the public Supabase environment to load approved listing details.</p></main>;
 const {data,error}=await db.from('properties').select('id,title,property_type,area,city,public_address,nightly_rate,bedrooms,bathrooms,capacity,bed_setup,image_urls,amenities,house_rules,trust_label,public_location_summary,cleaning_fee,refundable_deposit').eq('id',id).eq('status','approved').maybeSingle();
 if(error||!data)notFound();const p=data as Stay;const images=p.image_urls??[];
 return <main style={{minHeight:'100svh',background:'var(--paper)'}}>
 <header style={{background:'#fff',borderBottom:'1px solid var(--line)'}}><div className="shell" style={{minHeight:68,display:'flex',justifyContent:'space-between',alignItems:'center'}}><Link href="/" style={{fontWeight:850,fontSize:19}}>HAMLET<span style={{color:'var(--gold)'}}>.REST</span></Link><Link href="/stays" className="secondary-button" style={{minHeight:42}}>← All stays</Link></div></header>
 <section className="shell" style={{paddingBlock:24}}>
 <p style={{color:'#806522',fontSize:11,fontWeight:800,letterSpacing:'.12em',textTransform:'uppercase'}}>{p.area||p.city||'Lagos'}{p.trust_label?' · '+p.trust_label:''}</p>
 <h1 className="serif" style={{fontSize:'clamp(34px,6vw,56px)',fontWeight:500,letterSpacing:'-.035em',margin:'8px 0 18px'}}>{p.title}</h1>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,250px),1fr))',gap:10}}>{images.length?images.slice(0,5).map((url,i)=><img key={url} src={url} alt={p.title+' photo '+(i+1)} style={{width:'100%',height:230,objectFit:'cover',borderRadius:16}}/>):<div style={{minHeight:250,borderRadius:18,background:'linear-gradient(135deg,#e7dfce,#f7f3e9)',display:'grid',placeItems:'center',color:'#806522',fontSize:56}}>⌂</div>}</div>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,290px),1fr))',gap:24,marginTop:24}}>
 <div><h2 style={{fontSize:20}}>About this stay</h2><p style={{color:'var(--muted)',lineHeight:1.7}}>{p.public_location_summary||p.public_address||'Located in '+(p.area||p.city||'Lagos')+'.'}</p><p style={{color:'var(--muted)',lineHeight:1.7}}>{p.property_type||'Shortlet'} · {p.bedrooms??'—'} bedrooms · {p.bathrooms??'—'} bathrooms · up to {p.capacity??'—'} guests{p.bed_setup?' · '+p.bed_setup:''}</p>
 {p.amenities?.length?<><h2 style={{fontSize:20,marginTop:26}}>What this place offers</h2><div style={{display:'flex',flexWrap:'wrap',gap:8}}>{p.amenities.map(a=><span key={a} className="pill">{a}</span>)}</div></>:null}
 {p.house_rules?.length?<><h2 style={{fontSize:20,marginTop:26}}>House rules</h2><ul style={{color:'var(--muted)',lineHeight:1.8}}>{p.house_rules.map(r=><li key={r}>{r}</li>)}</ul></>:null}</div>
 <aside style={{alignSelf:'start',background:'#fff',border:'1px solid var(--line)',borderRadius:22,padding:22}}><p style={{margin:'0 0 8px',color:'var(--muted)',fontSize:12}}>Nightly rate before applicable fees</p><strong style={{fontSize:26}}>₦{Number(p.nightly_rate||0).toLocaleString('en-NG')} <span style={{fontWeight:450,fontSize:12,color:'var(--muted)'}}>/ night</span></strong>{Number(p.cleaning_fee||0)>0&&<p style={{color:'var(--muted)',fontSize:13}}>Cleaning fee: ₦{Number(p.cleaning_fee).toLocaleString('en-NG')}</p>}{Number(p.refundable_deposit||0)>0&&<p style={{color:'var(--muted)',fontSize:13}}>Refundable caution deposit: ₦{Number(p.refundable_deposit).toLocaleString('en-NG')}</p>}<p style={{color:'var(--muted)',fontSize:12,lineHeight:1.7}}>Availability and final pricing are confirmed as part of the booking request. This page does not take payment.</p><Link href="/signin" className="primary-button" style={{width:'100%'}}>Sign in to continue</Link></aside>
 </div></section></main>;
}
