import Link from 'next/link';
import { ArrowDown, ArrowRight, ArrowUpRight, MapPin, Menu, ShieldCheck, Sparkles } from 'lucide-react';

const areas = ['Lekki', 'Victoria Island', 'Ikoyi', 'Yaba', 'Ikeja GRA', 'Surulere'];
const destinations = [
  { name: 'Island energy', area: 'Lekki · Ikoyi · Victoria Island', image: '/images/prop/penthouse.jpg', href: '/stays?area=Lekki', number: '01' },
  { name: 'Mainland rhythm', area: 'Yaba · Ikeja · Surulere', image: '/images/prop/duplex.jpg', href: '/stays?area=Yaba', number: '02' },
  { name: 'A little hideaway', area: 'Your own corner of Lagos', image: '/images/prop/bed-1.jpg', href: '/stays', number: '03' },
];

export default function HomePage() {
  return (
    <main className="home-page">
      <header className="home-header">
        <div className="home-shell home-header-inner">
          <Link href="/" className="home-wordmark" aria-label="Hamlet Rest home"><span className="home-mark">H</span><span>HAMLET<span className="home-period">.</span>REST</span></Link>
          <nav className="home-nav" aria-label="Main navigation"><Link href="/stays">Find a stay</Link><Link href="/lagos">Lagos, locally</Link><Link href="/how-it-works">How it works</Link></nav>
          <div className="home-actions"><Link className="home-host-link" href="/partners/apply">Host with us <ArrowUpRight size={14} /></Link><Link className="home-sign-in" href="/signin">Sign in</Link><Link className="home-menu" href="/stays" aria-label="Explore stays"><Menu size={19} /></Link></div>
        </div>
      </header>

      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-shell home-hero-grid">
          <div className="home-hero-copy">
            <p className="home-kicker"><span className="home-kicker-dot" /> NOT JUST A PLACE TO SLEEP. A WAY IN.</p>
            <h1 id="home-title">Lagos,<br /><span>on your</span><br /><em>terms.</em></h1>
            <div className="home-intro-row"><p>Find a shortlet with a little more soul. The right side of town, the right kind of space, all yours.</p><a href="#find-your-stay" className="home-scroll" aria-label="Scroll to find your stay"><ArrowDown size={18} /></a></div>
            <div className="home-coordinate">06° 27&apos; N <span>·</span> 03° 24&apos; E</div>
          </div>
          <div className="home-hero-art">
            <div className="home-photo-frame"><img src="/images/hamlet-lagos-hero.png" alt="Sunlit Lagos apartment with tactile green and terracotta details" /><span className="home-image-index">A GOOD PLACE TO LAND <b>— LAGOS, NG</b></span></div>
            <div className="home-stamp" aria-label="Lagos, Nigeria"><span>YOUR CITY</span><strong>YOUR<br />STAY</strong><span>HAMLET · 2026</span></div>
            <span className="home-side-note">IN GOOD COMPANY, ALWAYS</span>
          </div>
        </div>
        <div className="home-hero-bottom home-shell"><span>MADE FOR THE WAY LAGOS MOVES</span><span>SCROLL TO FIND YOUR PLACE <ArrowDown size={13} /></span></div>
      </section>

      <section className="home-search" id="find-your-stay" aria-label="Search for a stay"><div className="home-shell">
        <div className="home-search-heading"><span>01 / MAKE IT YOURS</span><h2>Where to?</h2></div>
        <form action="/stays" method="get" className="home-search-form">
          <label className="home-search-field home-destination"><span><MapPin size={17} /> THE NEIGHBOURHOOD</span><select name="area" defaultValue="" aria-label="Choose a Lagos neighbourhood"><option value="">Anywhere in Lagos</option>{areas.map(area => <option key={area} value={area}>{area}</option>)}</select></label>
          <label className="home-search-field"><span>CHECK IN</span><input name="checkIn" type="date" aria-label="Check-in date" /></label>
          <label className="home-search-field"><span>CHECK OUT</span><input name="checkOut" type="date" aria-label="Check-out date" /></label>
          <button className="home-search-button" type="submit"><span>Find my stay</span><ArrowRight size={18} /></button>
        </form>
        <div className="home-area-quick"><span>START WITH A VIBE</span>{areas.slice(0, 4).map(area => <Link key={area} href={`/stays?area=${encodeURIComponent(area)}`}>{area}</Link>)}</div>
      </div></section>

      <section className="home-neighbourhoods home-shell">
        <div className="home-section-top"><div><p className="home-section-label">02 / PICK YOUR PACE</p><h2>Every Lagos<br /><em>has a Lagos.</em></h2></div><p className="home-section-aside">One city. A hundred different ways to feel at home. Start wherever your kind of Lagos begins.</p></div>
        <div className="home-destination-grid">{destinations.map((place, index) => <Link className={`home-destination home-destination-${index + 1}`} key={place.number} href={place.href}><img src={place.image} alt="" loading="lazy" /><span className="home-destination-tint" /><span className="home-destination-meta">LAGOS / {place.number}</span><span className="home-destination-caption"><span><strong>{place.name}</strong><small>{place.area}</small></span><span className="home-destination-arrow"><ArrowUpRight size={19} /></span></span></Link>)}</div>
        <Link className="home-all-stays" href="/stays">See every stay in Lagos <ArrowRight size={16} /></Link>
      </section>

      <section className="home-belief"><div className="home-shell home-belief-grid"><div><p className="home-section-label">03 / THE HAMLET FEELING</p><h2>Good stays.<br /><em>Zero guesswork.</em></h2></div><div className="home-belief-copy"><p>We put the real details up front, so you can spend less time second-guessing and more time getting excited about the trip.</p><Link href="/how-it-works">Here&apos;s how we make it easier <ArrowUpRight size={16} /></Link></div><div className="home-belief-points"><div><ShieldCheck size={19} /><span><strong>Know before you go</strong><small>Clear details. No surprises at the door.</small></span></div><div><Sparkles size={19} /><span><strong>Find your kind of Lagos</strong><small>Neighbourhoods with personality.</small></span></div><div><ArrowRight size={19} /><span><strong>Stay in control</strong><small>Request first. Confirm when you&apos;re ready.</small></span></div></div></div></section>

      <footer className="home-footer"><div className="home-shell"><div className="home-footer-main"><div><Link href="/" className="home-wordmark home-footer-mark"><span className="home-mark">H</span><span>HAMLET<span className="home-period">.</span>REST</span></Link><p>Make yourself at home.<br />Lagos, Nigeria.</p></div><nav aria-label="Footer navigation"><Link href="/lagos">The Lagos guide</Link><Link href="/faqs">FAQs</Link><Link href="/safety">Trust & safety</Link><Link href="/about">About Hamlet</Link></nav><span className="home-footer-big">HOME,<br /><em>but elsewhere.</em></span></div><div className="home-footer-bottom"><span>© {new Date().getFullYear()} HAMLET.REST</span><span>06° 27&apos; N · 03° 24&apos; E</span></div></div></footer>
    </main>
  );
}
