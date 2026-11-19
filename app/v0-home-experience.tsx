'use client';

import Link from 'next/link';
import { ArrowDown, ArrowRight, ArrowUpRight, MapPin, ShieldCheck, Sparkles } from 'lucide-react';
import type { PublicStayRecord } from '@/lib/next-supabase';
import { StayListingCard } from '@/components/site/SiteShell';
import { LAGOS_AREAS } from '@/lib/areas';

const destinations = [
  { name: 'Island energy', area: 'Lekki · Ikoyi · Victoria Island', image: '/images/prop/penthouse.jpg', href: '/stays?area=Lekki', number: '01' },
  { name: 'Mainland rhythm', area: 'Yaba · Ikeja · Surulere', image: '/images/prop/duplex.jpg', href: '/stays?area=Yaba', number: '02' },
  { name: 'A little hideaway', area: 'Find your own corner of Lagos', image: '/images/prop/bed-1.jpg', href: '/stays', number: '03' },
];

export function V0HomeExperience({ approvedStays }: { approvedStays: PublicStayRecord[] }) {
  const featured = approvedStays.slice(0, 6);
  return (
    <div className="home-page">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-shell home-hero-grid">
          <div className="home-hero-copy">
            <p className="home-kicker"><span className="home-kicker-dot" /> NOT JUST A PLACE TO SLEEP. A WAY IN.</p>
            <h1 id="home-title">Find your<br /><span>place to</span><br /><em>belong.</em></h1>
            <div className="home-hero-cta"><Link href="/stays" className="hm-btn hm-btn-lime">Find a stay <ArrowRight size={16} aria-hidden="true" /></Link><a href="#find-your-stay" className="hm-btn hm-btn-ghost">Search dates</a></div><div className="home-intro-row"><p>Discover stays across Nigeria, starting in Lagos. Find a space that fits the way you travel.</p><a href="#find-your-stay" className="home-scroll" aria-label="Scroll to find your stay"><ArrowDown size={18} /></a></div>
            <div className="home-coordinate">LAGOS, NIGERIA <span>·</span> STARTING POINT</div>
          </div>
          <div className="home-hero-art">
            <div className="home-photo-frame"><picture><source type="image/webp" srcSet="/images/hamlet-lagos-hero-760.webp 760w, /images/hamlet-lagos-hero-1280.webp 1280w" sizes="(max-width: 760px) 100vw, 55vw" /><img src="/images/hamlet-lagos-hero-1280.jpg" srcSet="/images/hamlet-lagos-hero-760.jpg 760w, /images/hamlet-lagos-hero-1280.jpg 1280w" sizes="(max-width: 760px) 100vw, 55vw" width={1312} height={816} alt="Lagos city skyline and waterfront" fetchPriority="high" decoding="async" /></picture><span className="home-image-index">A GOOD PLACE TO LAND <b>— NIGERIA</b></span></div>
            <div className="home-stamp" aria-label="Lagos, Nigeria"><span>YOUR CITY</span><strong>YOUR<br />STAY</strong><span>HAMLET · 2026</span></div>
            <span className="home-side-note">IN GOOD COMPANY, ALWAYS</span>
          </div>
        </div>
        <div className="home-hero-bottom home-shell"><span>MADE FOR WHEREVER LIFE TAKES YOU</span><span>SCROLL TO FIND YOUR PLACE <ArrowDown size={13} /></span></div>
      </section>

      <section className="home-search" id="find-your-stay" aria-label="Search for a stay">
        <div className="home-shell">
          <div className="home-search-heading"><span>01 / MAKE IT YOURS</span><h2>Where to?</h2></div>
          <form action="/stays" method="get" className="home-search-form" role="search" aria-label="Search Lagos shortlets">
            <label className="home-search-field home-destination"><span><MapPin size={17} /> THE DESTINATION</span><input name="area" type="text" list="hamlet-destinations" placeholder="Lekki, Ikoyi, Yaba…" aria-label="Enter a Lagos area" /><datalist id="hamlet-destinations">{LAGOS_AREAS.map(area => <option key={area} value={area} />)}</datalist></label>
            <label className="home-search-field"><span>CHECK IN</span><input name="checkIn" type="date" aria-label="Check-in date" /></label>
            <label className="home-search-field"><span>CHECK OUT</span><input name="checkOut" type="date" aria-label="Check-out date" /></label>
            <label className="home-search-field home-guests"><span>GUESTS</span><select name="guests" defaultValue="2" aria-label="Number of guests">{[1,2,3,4,5,6,7,8,9,10,12,15,20].map(count => <option key={count} value={count}>{count} {count===1?'guest':'guests'}</option>)}</select></label>
            <button className="home-search-button" type="submit"><span>Find my stay</span><ArrowRight size={18} /></button>
          </form>
          <div className="home-area-quick"><span>START WITH A VIBE · LAGOS</span>{['Lekki','Victoria Island','Ikoyi','Yaba'].map(area => <Link key={area} href={`/stays?area=${encodeURIComponent(area)}`}>{area}</Link>)}</div>
        </div>
      </section>


      <section className="home-live-stays">
        <div className="home-shell">
          <div className="home-section-top"><div><p className="home-section-label">02 / REAL PLACES, LIVE LISTINGS</p><h2>Find somewhere<br /><em>that feels right.</em></h2></div><Link className="home-all-stays" href="/stays">View all stays <ArrowRight size={16}/></Link></div>
          {featured.length ? <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{featured.map(stay => <StayListingCard key={stay.id} stay={stay}/>)}</div> : <div className="home-empty-stays"><p>New stays are being prepared. Check back soon or explore Lagos neighbourhoods.</p><Link href="/stays">Explore stays <ArrowRight size={16}/></Link></div>}
        </div>
      </section>

      <section className="home-neighbourhoods home-neighbourhoods-compact home-shell" aria-label="Lagos neighbourhoods">
        <div className="home-section-top"><div><p className="home-section-label">03 / PICK YOUR PACE</p><h2>Every place <em>has its feeling.</em></h2></div><p className="home-section-aside">From the energy of the city to a quieter escape, choose the setting that feels right.</p></div>
        <div className="home-destination-grid">{destinations.map((place, index) => <Link className={`home-destination home-destination-${index + 1}`} key={place.number} href={place.href}><img src={place.image} alt="" loading="lazy" /><span className="home-destination-tint" /><span className="home-destination-meta">LAGOS / {place.number}</span><span className="home-destination-caption"><span><strong>{place.name}</strong><small>{place.area}</small></span><span className="home-destination-arrow"><ArrowUpRight size={19} /></span></span></Link>)}</div>
              </section>
      <section className="home-belief"><div className="home-shell home-belief-grid"><div><p className="home-section-label">04 / THE HAMLET FEELING</p><h2>Good stays.<br /><em>Zero guesswork.</em></h2></div><div className="home-belief-copy"><p>We put the real details up front, so you can spend less time second-guessing and more time getting excited about the trip.</p><Link href="/how-it-works">Here&apos;s how we make it easier <ArrowUpRight size={16} /></Link></div><div className="home-belief-points"><div><ShieldCheck size={19} /><span><strong>Know before you go</strong><small>Key details are clear before you request.</small></span></div><div><Sparkles size={19} /><span><strong>Find your kind of place</strong><small>Places with personality.</small></span></div><div><ArrowRight size={19} /><span><strong>Stay in control</strong><small>Request first. Confirm when you&apos;re ready.</small></span></div></div></div></section>
    </div>
  );
}
