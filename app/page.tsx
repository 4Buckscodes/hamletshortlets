import Link from 'next/link';
import { ArrowDownRight, ArrowRight, ArrowUpRight, MapPin, Menu, ShieldCheck, Sparkles } from 'lucide-react';

const areas = ['Lekki', 'Victoria Island', 'Ikoyi', 'Yaba', 'Ikeja GRA', 'Surulere'];
const destinations = [
  { name: 'Island living', area: 'Lekki · Ikoyi · Victoria Island', image: '/images/prop/penthouse.jpg', href: '/stays?area=Lekki' },
  { name: 'The mainland edit', area: 'Yaba · Ikeja · Surulere', image: '/images/prop/duplex.jpg', href: '/stays?area=Yaba' },
  { name: 'Room to recharge', area: 'Find your own corner of Lagos', image: '/images/prop/bed-1.jpg', href: '/stays' },
];

export default function HomePage() {
  return (
    <main>
      <header className="site-header">
        <div className="shell header-inner">
          <Link href="/" className="wordmark" aria-label="Hamlet Rest home"><span className="wordmark-mark">h</span><span>HAMLET<span className="wordmark-dot">.</span>REST</span></Link>
          <nav className="desktop-nav" aria-label="Main navigation"><Link href="/stays">Find a stay</Link><Link href="/lagos">The Lagos guide</Link><Link href="/how-it-works">How it works</Link></nav>
          <div className="header-actions"><Link className="partner-link" href="/partners/apply">List your property</Link><Link className="sign-in" href="/signin">Sign in <ArrowUpRight size={15} /></Link><Link className="mobile-menu" href="/stays" aria-label="Explore stays"><Menu size={21} /></Link></div>
        </div>
      </header>

      <section className="hero">
        <div className="hero-photo" role="img" aria-label="Warm, thoughtfully furnished Lagos apartment with a bright terrace" />
        <div className="hero-shade" />
        <div className="shell hero-content">
          <p className="hero-kicker"><span className="kicker-line" /> A considered way to stay in Lagos</p>
          <h1>Arrive well.<br /><em>Stay a while.</em></h1>
          <p className="hero-copy">Good spaces make a good trip. Find a shortlet that feels like yours, wherever Lagos takes you.</p>
          <a className="hero-discover" href="#find-a-stay">Discover your stay <ArrowDownRight size={17} /></a>
        </div>
        <div className="hero-caption"><span>01 / LAGOS, NIGERIA</span><span>Spaces with a sense of place</span></div>
      </section>

      <section className="search-section" id="find-a-stay" aria-label="Search for a stay">
        <div className="shell">
          <form action="/stays" method="get" className="search-panel">
            <label className="search-field destination-field"><span className="field-icon"><MapPin size={18} /></span><span className="field-copy"><span className="field-label">Destination</span><select name="area" defaultValue="" aria-label="Choose a Lagos neighbourhood"><option value="">Anywhere in Lagos</option>{areas.map(area => <option key={area} value={area}>{area}</option>)}</select></span></label>
            <label className="search-field"><span className="field-copy"><span className="field-label">Check in</span><input name="checkIn" type="date" aria-label="Check-in date" /></span></label>
            <label className="search-field"><span className="field-copy"><span className="field-label">Check out</span><input name="checkOut" type="date" aria-label="Check-out date" /></span></label>
            <button className="search-button" type="submit"><span>Explore stays</span><ArrowRight size={17} /></button>
          </form>
          <div className="search-note"><span>Not sure where to start?</span><div className="area-links">{areas.slice(0, 4).map(area => <Link key={area} href={`/stays?area=${encodeURIComponent(area)}`}>{area}</Link>)}</div></div>
        </div>
      </section>

      <section className="destinations-section shell">
        <div className="section-heading"><div><p className="eyebrow"><span>01</span> FIND YOUR NEIGHBOURHOOD</p><h2>A city of many moods.</h2></div><Link className="text-link" href="/stays">View all stays <ArrowUpRight size={16} /></Link></div>
        <div className="destination-grid">{destinations.map((place, index) => <Link className={`destination-card destination-card-${index + 1}`} key={place.name} href={place.href}><img src={place.image} alt="" loading="lazy" /><span className="destination-overlay" /><span className="destination-number">0{index + 1} / LAGOS</span><span className="destination-info"><span><strong>{place.name}</strong><small>{place.area}</small></span><span className="destination-arrow"><ArrowUpRight size={19} /></span></span></Link>)}</div>
      </section>

      <section className="promise-section"><div className="shell promise-inner"><div className="promise-heading"><p className="eyebrow"><span>02</span> THE HAMLET DIFFERENCE</p><h2>Less guesswork.<br /><em>More feeling at home.</em></h2></div><div className="promise-copy"><p>Finding a place to stay should feel like the start of the trip, not the hard part. We bring the details forward and keep you in control from first look to arrival.</p><Link className="text-link" href="/how-it-works">A little more about us <ArrowUpRight size={16} /></Link></div><div className="promise-rule" /><div className="promise-points"><div><ShieldCheck size={19} /><span><strong>Clear, considered details</strong><small>Know what to expect before you ask.</small></span></div><div><Sparkles size={19} /><span><strong>A more personal search</strong><small>Explore the neighbourhood that suits you.</small></span></div><div><ArrowRight size={19} /><span><strong>Your booking, your pace</strong><small>Request first. Confirm after availability.</small></span></div></div></div></section>

      <footer className="site-footer"><div className="shell"><div className="footer-main"><Link href="/" className="wordmark footer-wordmark"><span className="wordmark-mark">h</span><span>HAMLET<span className="wordmark-dot">.</span>REST</span></Link><p>Your stay, sorted.<br />Lagos, Nigeria.</p><div className="footer-links"><Link href="/lagos">Neighbourhood guide</Link><Link href="/faqs">FAQs</Link><Link href="/safety">Trust & safety</Link><Link href="/about">About Hamlet</Link></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} HAMLET.REST</span><span>Made for finding your place.</span></div></div></footer>
    </main>
  );
}
