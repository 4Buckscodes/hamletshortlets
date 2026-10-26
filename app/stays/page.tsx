import Link from 'next/link';
import { getPublicSupabase } from '@/lib/supabase-public';

type SearchParams = Promise<{ area?: string; checkIn?: string; checkOut?: string }>;
type Stay = { id:string; title:string; property_type:string|null; area:string|null; city:string|null; nightly_rate:number|string|null; bedrooms:number|null; bathrooms:number|null; capacity:number|null; image_urls:string[]|null; trust_label:string|null };
const areas=['Lekki','Victoria Island','Ikoyi','Yaba','Ikeja GRA','Surulere'];
export const metadata={title:'Explore shortlets in Lagos',description:'Explore approved shortlets across Lagos on HAMLET.REST.'};

export default async function StaysPage({searchParams}:{searchParams:SearchParams}) {
 const params=await searchParams;
 const area=params.area&&areas.includes(params.area)?params.area:'';
 const supabase=getPublicSupabase();
 let stays:Stay[]=[];
 let connected=false;
 let availabilityVerified=false;
 let availabilityMessage='';
 if(supabase){
  let query=supabase.from('properties').select('id,title,property_type,area,city,nightly_rate,bedrooms,bathrooms,capacity,image_urls,trust_label').eq('status','approved').order('created_at',{ascending:false}).limit(100);
  if(area) query=query.ilike('area',area);
  const result=await query;
  if(!result.error){
   stays=(result.data??[]) as Stay[];connected=true;
   if(params.checkIn && params.checkOut && /^\d{4}-\d{2}-\d{2}$/.test(params.checkIn) && /^\d{4}-\d{2}-\d{2}$/.test(params.checkOut) && params.checkOut > params.checkIn){
    const calendar=await supabase.rpc('get_unavailable_property_ids',{requested_check_in:params.checkIn,requested_check_out:params.checkOut});
    if(!calendar.error){
     const unavailable=new Set((calendar.data??[]) as string[]);
     stays=stays.filter(stay=>!unavailable.has(stay.id));
     availabilityVerified=true;
     availabilityMessage='Calendar conflicts filtered; partner confirmation is still required.';
    }else{
     availabilityMessage='We could not verify calendar availability for these dates. Contact the partner before making plans.';
    }
   }else if(params.checkIn || params.checkOut){
    availabilityMessage='Choose a valid check-in and check-out date to check calendar conflicts.';
   }
  }
 }
 return <main style={{minHeight:'100vh',background:'var(--paper)'}}>
  <header style={{background:'#fff',borderBottom:'1px solid var(--line)'}}><div className="shell" style={{minHeight:68,display:'flex',alignItems:'center',justifyContent:'space-between'}}><Link href="/" style={{fontWeight:850,fontSize:19}}>HAMLET<span style={{color:'var(--gold)'}}>.REST</span></Link><Link href="/" className="secondary-button" style={{minHeight:42}}>Home</Link></div></header>
  <section className="shell" style={{paddingBlock:'30px 70px'}}>
   <p style={{color:'#806522',textTransform:'uppercase',letterSpacing:'.12em',fontWeight:800,fontSize:11}}>Explore Lagos</p>
   <h1 className="serif" style={{fontSize:'clamp(34px,7vw,58px)',fontWeight:500,letterSpacing:'-.04em',margin:'8px 0 12px'}}>Find your kind of stay.</h1>
   <p style={{color:'var(--muted)',lineHeight:1.65,maxWidth:620}}>Explore approved property listings. Dates can be checked against recorded calendar conflicts; a property partner must still confirm your dates.</p>{availabilityMessage&&<p role="status" style={{fontSize:13,color:'var(--muted)',marginTop:10}}>{availabilityMessage}</p>}
   <form action="/stays" method="get" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,190px),1fr))',alignItems:'end',gap:12,padding:16,background:'#fff',border:'1px solid var(--line)',borderRadius:22,marginTop:22}}>
    <label style={{display:'grid',gap:7,fontSize:12,fontWeight:750}}>Neighbourhood<select name="area" defaultValue={area} className="pill" style={{width:'100%',borderRadius:12}}><option value="">Anywhere in Lagos</option>{areas.map(a=><option key={a} value={a}>{a}</option>)}</select></label>
    <label style={{display:'grid',gap:7,fontSize:12,fontWeight:750}}>Check-in<input name="checkIn" type="date" defaultValue={params.checkIn??''} className="pill" style={{width:'100%',borderRadius:12}}/></label>
    <label style={{display:'grid',gap:7,fontSize:12,fontWeight:750}}>Check-out<input name="checkOut" type="date" defaultValue={params.checkOut??''} className="pill" style={{width:'100%',borderRadius:12}}/></label>
    <button className="primary-button" type="submit">Update search →</button>
   </form>
   <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap',margin:'28px 0 16px'}}><h2 style={{margin:0,fontSize:17}}>{stays.length} {stays.length===1?'stay':'stays'}{area?' in '+area:' to explore'}</h2><span style={{color:'var(--muted)',fontSize:12}}>{connected?(availabilityVerified?'Calendar checked for selected dates':'Live approved listings'):'Listings connection not configured'}</span></div>
   {stays.length>0?<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,260px),1fr))',gap:18}}>{stays.map(p=><Link key={p.id} href={'/stays/'+p.id} style={{background:'#fff',border:'1px solid var(--line)',borderRadius:20,overflow:'hidden',minWidth:0}}>
    {p.image_urls?.[0]?<div style={{aspectRatio:'4/3',background:'#e8e4da'}}><img src={p.image_urls[0]} alt={p.title} loading="lazy" style={{width:'100%',height:'100%',objectFit:'cover'}}/></div>:<div style={{aspectRatio:'4/3',display:'grid',placeItems:'center',background:'linear-gradient(135deg,#e7dfce,#f7f3e9)',color:'#806522',fontSize:42}}>⌂</div>}
    <div style={{padding:16}}><div style={{display:'flex',gap:8,alignItems:'center',justifyContent:'space-between'}}><span style={{fontSize:11,fontWeight:800,textTransform:'uppercase',letterSpacing:'.08em',color:'#806522'}}>{p.area||p.city||'Lagos'}</span>{p.trust_label&&<span style={{fontSize:10,color:'#236b52',fontWeight:750}}>{p.trust_label}</span>}</div><h3 style={{fontSize:18,lineHeight:1.35,margin:'9px 0'}}>{p.title}</h3><p style={{margin:'0 0 12px',fontSize:12,color:'var(--muted)'}}>{p.property_type||'Shortlet'} · {p.bedrooms??'—'} bed · {p.bathrooms??'—'} bath · up to {p.capacity??'—'} guests</p><strong>₦{Number(p.nightly_rate||0).toLocaleString('en-NG')} <span style={{fontWeight:450,fontSize:12,color:'var(--muted)'}}>/ night before applicable fees</span></strong></div>
   </Link>)}</div>:<div style={{marginTop:14,borderRadius:20,border:'1px dashed #c8c1b1',padding:'30px 20px',textAlign:'center',background:'rgba(255,255,255,.55)'}}><div aria-hidden="true" style={{fontSize:28,marginBottom:8}}>⌂</div><h2 className="serif" style={{fontSize:25,fontWeight:500,margin:'0 0 8px'}}>{connected?'No approved stays match this search yet':'Live listings need configuration'}</h2><p style={{maxWidth:520,margin:'0 auto 18px',color:'var(--muted)',fontSize:14,lineHeight:1.7}}>{connected?'Try another neighbourhood or clear the filter. Only approved property records are shown.':'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in the Next.js environment to read approved properties. No sample listings are shown.'}</p><Link href="/stays" className="secondary-button">Clear search</Link></div>}
  </section>
 </main>;
}
