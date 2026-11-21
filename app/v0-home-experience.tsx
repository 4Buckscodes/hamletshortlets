'use client';

import Link from 'next/link';
import { Search, ShieldCheck } from 'lucide-react';
import { FocusedDrawer } from '@/components/forms/ProgressiveFormPrimitives';
import type { PublicStayRecord } from '@/lib/next-supabase';
import { StayListingCard } from '@/components/site/SiteShell';
import { LAGOS_AREAS } from '@/lib/areas';
import { DateInput } from '@/components/ui/DateInput';
import { lagosIsoDateOffset } from '@/lib/pricing';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { m } from '@/components/ui/motion';

function addDaysIso(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const destinations = [
  { name: 'Island energy', area: 'Lekki, Ikoyi, Victoria Island', image: '/images/prop/penthouse.jpg', href: '/stays?side=island', note: 'Waterfront towers, restaurants and the business district close by.' },
  { name: 'Mainland rhythm', area: 'Yaba, Ikeja, Surulere', image: '/images/prop/duplex.jpg', href: '/stays?area=Lagos+Mainland', note: 'Lively streets, easy access to the airport and the city\'s culture.' },
  { name: 'A little hideaway', area: 'Find your own corner of Lagos', image: '/images/prop/bed-1.jpg', href: '/stays', note: 'Browse everything that is live and pick what suits the trip.' },
];

const promises = [
  { title: 'Verified before it goes live', body: 'Ownership, the partner\'s identity and the place itself are checked.' },
  { title: 'Prices with fees included', body: 'Our service fee is already in the nightly price. Cleaning and the refundable deposit are shown separately before you request.' },
  { title: 'Nothing to pay until accepted', body: 'Request first. Pay only once the partner says yes.' },
];

const EASE = [0.2, 0.7, 0.2, 1] as const;
const HERO_HEADLINE = 'Find your place to belong.';

/**
 * Hero motion, "golden hour over the lagoon". The entrance (photo opening like a window, headline
 * rising word by word, a pass of warm light, copy fading up) is pure CSS in home.css: it starts at
 * first paint, needs no JavaScript or hydration, never hides the hero image from the browser, and
 * adds no script weight. The only script is a small pointer-depth effect for mouse users, started
 * once the browser is idle so it can never compete with loading.
 */
function useHeroDepth(root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const scope = root.current;
    const art = scope?.querySelector<HTMLElement>('.hp-hero-art');
    if (!scope || !art) return;
    const query = '(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine) and (min-width: 901px)';
    const mq = window.matchMedia(query);
    let frame = 0;
    let listening = false;
    const move = (event: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const box = scope.getBoundingClientRect();
        const nx = (event.clientX - box.left) / box.width - 0.5;
        const ny = (event.clientY - box.top) / box.height - 0.5;
        art.style.setProperty('--hx', `${(-nx * 18).toFixed(1)}px`);
        art.style.setProperty('--hy', `${(-ny * 12).toFixed(1)}px`);
      });
    };
    const start = () => {
      if (!mq.matches || listening) return;
      listening = true;
      scope.addEventListener('pointermove', move, { passive: true });
    };
    const hasIdle = 'requestIdleCallback' in window;
    const handle = hasIdle ? window.requestIdleCallback(start) : window.setTimeout(start, 1500);
    return () => {
      if (hasIdle) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
      cancelAnimationFrame(frame);
      scope.removeEventListener('pointermove', move);
      art.style.removeProperty('--hx');
      art.style.removeProperty('--hy');
    };
  }, [root]);
}

export function V0HomeExperience({ approvedStays }: { approvedStays: PublicStayRecord[] }) {
  const featured = approvedStays.slice(0, 6);
  const today = lagosIsoDateOffset(0);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [area, setArea] = useState('');
  const [guests, setGuests] = useState('2');
  const [searchOpen, setSearchOpen] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  useHeroDepth(heroRef);
  const shortDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const pillDates = checkIn && checkOut ? `${shortDate(checkIn)} – ${shortDate(checkOut)}` : 'Add dates';
  const searchForm = (variant: 'inline' | 'sheet') => (
    <form action="/stays" method="get" className={`hp-search-form hp-search-form-${variant}`} role="search" aria-label="Search Lagos shortlets">
      <label className="hp-field hp-field-wide"><span>Destination</span><input name="area" type="text" list={`hamlet-destinations-${variant}`} placeholder="Lekki, Ikoyi, Yaba…" aria-label="Enter a Lagos area" value={area} onChange={event => setArea(event.target.value)} autoComplete="off" /><datalist id={`hamlet-destinations-${variant}`}>{LAGOS_AREAS.map(name => <option key={name} value={name} />)}</datalist></label>
      <label className="hp-field"><span>Check in</span><DateInput name="checkIn" aria-label="Check-in date" min={today} defaultValue={checkIn} onChange={event => { setCheckIn(event.target.value); setCheckOut(''); }} /></label>
      <label className="hp-field"><span>Check out</span><DateInput key={checkIn || 'none'} name="checkOut" aria-label="Check-out date" min={checkIn ? addDaysIso(checkIn, 1) : addDaysIso(today, 1)} max={checkIn ? addDaysIso(checkIn, 60) : undefined} defaultValue={checkOut} onChange={event => setCheckOut(event.target.value)} /></label>
      <label className="hp-field"><span>Guests</span><select name="guests" value={guests} onChange={event => setGuests(event.target.value)} aria-label="Number of guests">{[1,2,3,4,5,6,7,8,9,10].map(count => <option key={count} value={count}>{count} {count===1?'guest':'guests'}</option>)}</select></label>
      <Button type="submit" className="hp-search-submit">Find my stay</Button>
    </form>
  );
  return (
    <div className="hp">
      <section className="hp-hero" aria-labelledby="home-title" ref={heroRef}>
        <div className="hp-shell hp-hero-grid">
          <div className="hp-hero-copy">
            <p className="hp-note">Verified shortlets in Lagos</p>
            <h1 id="home-title">{HERO_HEADLINE.split(' ').map((word, index, all) => (<span key={`${word}-${index}`}><span className="hp-word"><span className="hp-word-in" style={{ '--i': index } as React.CSSProperties}>{word}</span></span>{index < all.length - 1 ? ' ' : null}</span>))}</h1>
            <p className="hp-lede">Verified stays across Lagos, from Victoria Island to Yaba. Find a space that fits the way you travel.</p>
            <div className="hp-actions">
              <Button href="/stays">Find a stay</Button>
              <a href="#find-your-stay" className="hm-btn hm-btn-ghost" onClick={event => { if (window.matchMedia('(max-width: 760px)').matches) { event.preventDefault(); setSearchOpen(true); } }}>Search dates</a>
            </div>
            <p className="hp-trust"><ShieldCheck size={16} aria-hidden="true" /> Nothing to pay until the partner accepts your request.</p>
          </div>
          <figure className="hp-hero-art">
            <div className="hp-hero-frame" data-hero-parallax>
              <picture><source type="image/webp" srcSet="/images/hamlet-lagos-hero-760.webp 760w, /images/hamlet-lagos-hero-1280.webp 1280w" sizes="(max-width: 760px) 100vw, 55vw" /><img src="/images/hamlet-lagos-hero-1280.jpg" srcSet="/images/hamlet-lagos-hero-760.jpg 760w, /images/hamlet-lagos-hero-1280.jpg 1280w" sizes="(max-width: 760px) 100vw, 55vw" width={1312} height={816} alt="Living room with a view over the Lagos waterfront" fetchPriority="high" decoding="async" /></picture>
              <span className="hp-hero-glow" aria-hidden="true" />
            </div>
            <figcaption className="hp-hero-caption">Victoria Island, Lagos</figcaption>
          </figure>
        </div>
      </section>

      <section className="hp-search" id="find-your-stay" aria-label="Search for a stay">
        <div className="hp-shell">
          <h2 className="hp-h2">Where to?</h2>
          <button type="button" className="hp-pill" onClick={() => setSearchOpen(true)} aria-haspopup="dialog" aria-label="Search Lagos stays: choose area, dates and guests">
            <span className="hp-pill-text"><b>{area.trim() || 'Anywhere in Lagos'}</b><span>{pillDates} · {guests} {guests === '1' ? 'guest' : 'guests'}</span></span>
            <span className="hp-pill-icon" aria-hidden="true"><Search size={18} /></span>
          </button>
          {searchForm('inline')}
          <div className="hp-quick"><span>Popular areas</span>{['Lekki','Victoria Island','Ikoyi','Yaba'].map(name => <Chip key={name} href={`/stays?area=${encodeURIComponent(name)}`}>{name}</Chip>)}</div>
        </div>
        <FocusedDrawer open={searchOpen} onClose={() => setSearchOpen(false)} title="Find a stay" subtitle="Where, when and how many">
          {searchForm('sheet')}
        </FocusedDrawer>
      </section>

      <section className="hp-section" aria-labelledby="live-title">
        <div className="hp-shell">
          <div className="hp-head"><div><p className="hp-note">{featured.length ? 'Real places, live listings' : 'Verified stays'}</p><h2 className="hp-h2" id="live-title">Find somewhere that feels right.</h2></div><Link className="hm-link" href="/stays">View all stays</Link></div>
          {featured.length ? <div className="hp-stays">{featured.map(stay => <StayListingCard key={stay.id} stay={stay}/>)}</div> : <div className="hp-empty" data-hamlet-reveal><p className="hp-empty-title">New verified stays are on their way.</p><p className="hm-body">Every listing passes HAMLET&apos;s four checks before it appears here. Meanwhile, browse by area and we will show what is live.</p><div className="hm-chip-row">{['Victoria Island','Lekki Phase 1','Ikoyi','Yaba','Ikeja GRA'].map(name => <Chip key={name} href={`/stays?area=${encodeURIComponent(name)}`}>{name}</Chip>)}</div></div>}
        </div>
      </section>

      <section className="hp-section hp-section-ruled" aria-label="Lagos neighbourhoods">
        <div className="hp-shell">
          <div className="hp-head"><div><h2 className="hp-h2" id="pace-title">Every place has its feeling.</h2></div><p className="hm-body hp-head-aside">From the energy of the city to a quieter escape, choose the setting that feels right.</p></div>
          <ul className="hp-places">
            {destinations.map(place => (
              <li key={place.name} data-hamlet-reveal>
                <m.div className="hp-place" initial="rest" whileHover="hover" whileFocus="hover" animate="rest">
                  <Link href={place.href} className="hp-place-link">
                    <m.span className="hp-place-text" variants={{ rest: { x: 0 }, hover: { x: 6 } }} transition={{ duration: 0.3, ease: EASE }}>
                      <strong>{place.name}</strong>
                      <span>{place.area}</span>
                      <small>{place.note}</small>
                    </m.span>
                    <span className="hp-place-photo"><m.img src={place.image} alt="" loading="lazy" variants={{ rest: { scale: 1 }, hover: { scale: 1.05 } }} transition={{ duration: 0.4, ease: EASE }} /></span>
                  </Link>
                </m.div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="hp-section hp-belief" aria-labelledby="belief-title">
        <div className="hp-shell hp-belief-grid">
          <div>
            <h2 className="hp-h2" id="belief-title">Good stays. Zero guesswork.</h2>
            <p className="hm-body">We put the real details up front, so you can spend less time second-guessing and more time getting excited about the trip.</p>
            <div className="hp-actions"><Button href="/stays">Find a stay</Button><Link href="/how-it-works" className="hm-link">Here&apos;s how we make it easier</Link></div>
          </div>
          <dl className="hp-promises">
            {promises.map(item => <div key={item.title} data-hamlet-reveal><dt>{item.title}</dt><dd>{item.body}</dd></div>)}
          </dl>
        </div>
      </section>
    </div>
  );
}
