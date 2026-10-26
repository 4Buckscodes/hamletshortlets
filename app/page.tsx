import Link from 'next/link';

const areas = ['Lekki', 'Victoria Island', 'Ikoyi', 'Yaba', 'Ikeja GRA', 'Surulere'];

export default function HomePage() {
  return (
    <main>
      <header style={{ background: '#fff', borderBottom: '1px solid var(--line)' }}>
        <div className="shell" style={{ minHeight: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <Link href="/" aria-label="HAMLET.REST home" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <span aria-hidden="true" style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 13, background: 'var(--navy)', color: 'var(--gold)', fontFamily: 'Georgia, serif', fontSize: 23 }}>H</span>
            <span style={{ fontWeight: 850, letterSpacing: '-.04em', fontSize: 20 }}>HAMLET<span style={{ color: 'var(--gold)' }}>.REST</span></span>
          </Link>
          <nav aria-label="Main navigation" style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 14, fontWeight: 650 }}>
            <Link href="/stays">Explore stays</Link>
            <Link href="/partners/apply">Become a partner</Link>
            <Link href="/signin" className="secondary-button" style={{ minHeight: 42, paddingInline: 16 }}>Sign in</Link>
          </nav>
        </div>
      </header>

      <section style={{ paddingBlock: 'clamp(42px, 8vw, 92px) 44px', background: 'radial-gradient(ellipse at 85% 10%, #e8dfc8 0, transparent 38%), var(--paper)' }}>
        <div className="shell">
          <p style={{ margin: '0 0 14px', color: '#806522', fontSize: 12, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase' }}>A better way to stay in Lagos</p>
          <h1 className="serif" style={{ maxWidth: 760, margin: 0, fontSize: 'clamp(42px, 8.2vw, 82px)', lineHeight: 1.02, letterSpacing: '-.045em', fontWeight: 500 }}>
            Find a stay that <span style={{ color: '#9a772c', fontStyle: 'italic' }}>feels right.</span>
          </h1>
          <p style={{ maxWidth: 560, margin: '22px 0 30px', color: '#586579', fontSize: 'clamp(16px, 2vw, 19px)', lineHeight: 1.7 }}>
            Thoughtful shortlets, clearer details and a booking journey that keeps you in control. Your stay, sorted.
          </p>
          <form action="/stays" method="get" style={{ background: '#fff', border: '1px solid #e4dfd3', borderRadius: 24, padding: 12, display: 'grid', gap: 10, boxShadow: '0 18px 55px rgba(14,31,59,.08)' }}>
            <label style={{ display: 'grid', gap: 7, padding: '8px 10px' }}>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Where in Lagos?</span>
              <select name="area" defaultValue="" aria-label="Choose a Lagos area" style={{ minHeight: 38, width: '100%', border: 0, background: 'transparent', color: 'var(--navy)', outlineOffset: 2 }}>
                <option value="">Anywhere in Lagos</option>
                {areas.map(area => <option key={area} value={area}>{area}</option>)}
              </select>
            </label>
            <div style={{ height: 1, background: 'var(--line)' }} />
            <label style={{ display: 'grid', gap: 7, padding: '8px 10px' }}>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Check-in</span>
              <input name="checkIn" type="date" aria-label="Check-in date" min={new Date().toLocaleDateString('en-CA')} style={{ minHeight: 38, border: 0, background: 'transparent', color: 'var(--navy)', width: '100%' }} />
            </label>
            <div style={{ height: 1, background: 'var(--line)' }} />
            <label style={{ display: 'grid', gap: 7, padding: '8px 10px' }}>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Check-out</span>
              <input name="checkOut" type="date" aria-label="Check-out date" style={{ minHeight: 38, border: 0, background: 'transparent', color: 'var(--navy)', width: '100%' }} />
            </label>
            <button className="primary-button" type="submit" style={{ width: '100%', gap: 10 }}>Search stays <span aria-hidden="true">→</span></button>
          </form>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBlock: 18, marginInline: -2 }} aria-label="Popular Lagos areas">
            {areas.map(area => <Link key={area} className="pill" href={`/stays?area=${encodeURIComponent(area)}`}>{area}</Link>)}
          </div>
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 12 }}>Search dates and areas to explore suitable stays. Availability is confirmed during the booking process.</p>
        </div>
      </section>

      <section className="shell" style={{ paddingBlock: '38px 64px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'end', justifyContent: 'space-between', gap: 16, marginBottom: 22 }}>
          <div>
            <p style={{ margin: '0 0 8px', color: '#806522', fontSize: 11, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase' }}>Start exploring</p>
            <h2 className="serif" style={{ margin: 0, fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 500, letterSpacing: '-.03em' }}>Lagos, your way.</h2>
          </div>
          <Link href="/stays" style={{ fontWeight: 750, fontSize: 14 }}>Explore all stays <span aria-hidden="true">→</span></Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 155px), 1fr))', gap: 12 }}>
          {[
            ['Island living', 'Lekki, Ikoyi & Victoria Island', '01'],
            ['Mainland favourites', 'Yaba, Ikeja & Surulere', '02'],
            ['A quick reset', 'Find a place to slow down', '03'],
          ].map(([title, description, number]) => (
            <Link key={number} href="/stays" style={{ minHeight: 160, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: 22, border: '1px solid var(--line)', background: '#fff', padding: 20 }}>
              <span style={{ color: '#9a772c', fontSize: 12, fontWeight: 800 }}>{number}</span>
              <span><strong style={{ display: 'block', fontSize: 17, marginBottom: 7 }}>{title}</strong><span style={{ display: 'block', color: 'var(--muted)', fontSize: 13, lineHeight: 1.5 }}>{description}</span></span>
            </Link>
          ))}
        </div>
      </section>

      <footer style={{ background: 'var(--navy-deep)', color: '#fff', paddingBlock: 28 }}>
        <div className="shell" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16, fontSize: 13 }}>
          <span>© {new Date().getFullYear()} HAMLET.REST · Your stay, sorted.</span>
          <div style={{ display: 'flex', gap: 18 }}><Link href="/safety">Our approach to trust</Link><Link href="/how-it-works">How it works</Link></div>
        </div>
      </footer>
      <style>{`@media (min-width: 760px) { .desktop-link { display: inline-flex !important; } form[action="/stays"] { grid-template-columns: 1.2fr 1fr 1fr auto !important; align-items: center; border-radius: 999px !important; padding: 8px 10px !important; } form[action="/stays"] > div { width: 1px; height: 42px; } form[action="/stays"] button { width: auto !important; } }`}</style>
    </main>
  );
}
