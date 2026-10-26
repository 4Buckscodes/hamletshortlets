import Link from 'next/link';
export const metadata = {
  title: 'Lagos Shortlets by Neighbourhood',
  description: 'Explore Lagos shortlet areas, from Lekki and Ikoyi to Victoria Island, Yaba and Ikeja. Compare location, stay details and booking steps with HAMLET.REST.',
  alternates: { canonical: '/lagos' },
  openGraph: { title: 'Explore Lagos Shortlets | HAMLET.REST', description: 'A practical guide to choosing a shortlet area in Lagos.', url: 'https://www.hamlet.rest/lagos' },
};
const areas = [
  { name: 'Lekki', detail: 'A broad choice of apartments for leisure stays, visits with friends and longer work trips. Check the exact estate, access route and power arrangements before booking.' },
  { name: 'Victoria Island', detail: 'A useful base for many business meetings, restaurants and Island activities. Compare the address and likely travel time to your specific destination.' },
  { name: 'Ikoyi', detail: 'Often considered for quieter, premium stays. Confirm house rules, guest access, parking and the facilities included in the listed rate.' },
  { name: 'Yaba', detail: 'A practical option for university visits, technology hubs and Mainland plans. Check commute time to appointments on the Island.' },
  { name: 'Ikeja GRA', detail: 'Worth considering for airport-related trips, Mainland meetings and plans around Ikeja. Confirm distance to the airport for your travel time.' },
  { name: 'Surulere', detail: 'A central Mainland option for family visits, events and local plans. Check traffic routes and the exact property location before choosing.' },
];
export default function LagosGuidePage() {
 return <main style={{minHeight:'100svh',background:'var(--paper)'}}>
  <header style={{background:'#fff',borderBottom:'1px solid var(--line)'}}><div className="shell" style={{minHeight:68,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}><Link href="/" style={{fontWeight:850,fontSize:19}}>HAMLET<span style={{color:'var(--gold)'}}>.REST</span></Link><Link href="/stays" className="primary-button">Explore stays</Link></div></header>
  <section className="shell" style={{paddingBlock:'42px 70px',maxWidth:1000}}>
   <p style={{color:'#806522',fontSize:11,fontWeight:800,letterSpacing:'.12em',textTransform:'uppercase'}}>Neighbourhood guide</p>
   <h1 className="serif" style={{fontSize:'clamp(38px,7vw,64px)',fontWeight:500,lineHeight:1.05,margin:'8px 0 18px'}}>Choose your Lagos base.</h1>
   <p style={{maxWidth:720,color:'var(--muted)',fontSize:17,lineHeight:1.8}}>The best shortlet is not only about the apartment. It is also about where you need to be, how you will get around, and which house rules and facilities fit your plans. Start with the neighbourhood, then compare the actual listing details.</p>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,280px),1fr))',gap:14,marginTop:28}}>{areas.map(area=><article key={area.name} style={{background:'#fff',border:'1px solid var(--line)',borderRadius:18,padding:20}}><h2 className="serif" style={{fontSize:25,fontWeight:500,margin:'0 0 9px'}}>{area.name}</h2><p style={{color:'var(--muted)',lineHeight:1.75,fontSize:14,margin:'0 0 14px'}}>{area.detail}</p><Link href={'/stays?area='+encodeURIComponent(area.name)} style={{fontWeight:750,color:'var(--navy)'}}>Explore {area.name} →</Link></article>)}</div>
   <section style={{marginTop:34,padding:22,background:'#fff',borderRadius:18,border:'1px solid var(--line)'}}><h2 className="serif" style={{fontSize:27,fontWeight:500,margin:'0 0 10px'}}>Before you request a booking</h2><ul style={{paddingLeft:20,color:'var(--muted)',lineHeight:1.9}}><li>Confirm the full address and travel time to your main destination.</li><li>Read guest limits, check-in rules, cancellation terms and house rules.</li><li>Review the itemised price, mandatory charges and any refundable caution deposit.</li><li>Ask the partner to confirm your dates; calendar checks do not replace host confirmation.</li></ul><Link href="/how-it-works" className="secondary-button">How HAMLET bookings work</Link></section>
  </section>
 </main>;
}
