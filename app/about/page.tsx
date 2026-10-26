import Link from 'next/link';

export const metadata = {
  title: 'About HAMLET.REST',
  description: 'Learn how HAMLET.REST helps guests discover Nigerian shortlets with clearer listing details, transparent booking steps and partner-led confirmation.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return <main style={{minHeight:'100svh',background:'var(--paper)'}}>
    <header style={{background:'#fff',borderBottom:'1px solid var(--line)'}}><div className="shell" style={{minHeight:68,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}><Link href="/" style={{fontWeight:850,fontSize:19}}>HAMLET<span style={{color:'var(--gold)'}}>.REST</span></Link><Link href="/stays" className="primary-button">Explore stays</Link></div></header>
    <section className="shell" style={{paddingBlock:'48px 72px',maxWidth:920}}>
      <p style={{color:'#806522',fontSize:11,fontWeight:800,letterSpacing:'.12em',textTransform:'uppercase'}}>About us</p>
      <h1 className="serif" style={{fontSize:'clamp(40px,7vw,68px)',fontWeight:500,lineHeight:1.04,margin:'8px 0 18px',maxWidth:780}}>A clearer way to find your next stay.</h1>
      <p style={{fontSize:18,lineHeight:1.85,color:'var(--muted)',maxWidth:740}}>HAMLET.REST is being built to make shortlet discovery and booking easier to navigate. We want guests to compare useful details, understand the steps before committing, and know who needs to confirm a booking.</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,240px),1fr))',gap:14,marginTop:28}}>
        <article style={{background:'#fff',border:'1px solid var(--line)',borderRadius:18,padding:22}}><h2 className="serif" style={{fontSize:25,fontWeight:500,margin:'0 0 10px'}}>Clarity before commitment</h2><p style={{color:'var(--muted)',fontSize:14,lineHeight:1.8,margin:0}}>Listing details, house rules and price components should be understandable before you request a stay.</p></article>
        <article style={{background:'#fff',border:'1px solid var(--line)',borderRadius:18,padding:22}}><h2 className="serif" style={{fontSize:25,fontWeight:500,margin:'0 0 10px'}}>Confirmation matters</h2><p style={{color:'var(--muted)',fontSize:14,lineHeight:1.8,margin:0}}>A search result or request is not a confirmed booking. Availability and booking status must be confirmed through the platform workflow.</p></article>
        <article style={{background:'#fff',border:'1px solid var(--line)',borderRadius:18,padding:22}}><h2 className="serif" style={{fontSize:25,fontWeight:500,margin:'0 0 10px'}}>Accountability</h2><p style={{color:'var(--muted)',fontSize:14,lineHeight:1.8,margin:0}}>Guests need a clear path to report a problem, and property partners need tools to manage listing information and availability.</p></article>
      </div>
      <section style={{marginTop:30,padding:24,borderRadius:18,background:'var(--navy)',color:'#fff'}}><h2 className="serif" style={{fontSize:28,fontWeight:500,margin:'0 0 10px'}}>Your stay, sorted.</h2><p style={{lineHeight:1.8,color:'#e1e7ef',maxWidth:650}}>Explore stays, read our <Link href="/faqs" style={{textDecoration:'underline'}}>frequently asked questions</Link>, or learn how the <Link href="/how-it-works" style={{textDecoration:'underline'}}>booking process works</Link>.</p><Link href="/stays" className="primary-button" style={{background:'var(--gold)',color:'var(--navy)',marginTop:8}}>Find a stay →</Link></section>
    </section>
  </main>;
}
