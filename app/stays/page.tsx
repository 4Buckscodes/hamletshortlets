type SearchParams = Promise<{ area?: string; checkIn?: string; checkOut?: string }>;

const allowedAreas = ['Lekki', 'Victoria Island', 'Ikoyi', 'Yaba', 'Ikeja GRA', 'Surulere'];

export const metadata = {
  title: 'Explore shortlets in Lagos',
  description: 'Search Lagos shortlets by neighbourhood and travel dates on HAMLET.REST.',
};

export default async function StaysPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const area = params.area && allowedAreas.includes(params.area) ? params.area : '';
  const checkIn = params.checkIn ?? '';
  const checkOut = params.checkOut ?? '';

  return (
    <main style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid var(--line)' }}>
        <div className="shell" style={{ minHeight: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="/" style={{ fontWeight: 850, fontSize: 19 }}>HAMLET<span style={{ color: 'var(--gold)' }}>.REST</span></a>
          <a href="/" className="secondary-button" style={{ minHeight: 42 }}>Home</a>
        </div>
      </header>
      <section className="shell" style={{ paddingBlock: '34px 72px' }}>
        <p style={{ color: '#806522', textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 800, fontSize: 11 }}>Explore Lagos</p>
        <h1 className="serif" style={{ fontSize: 'clamp(34px, 7vw, 58px)', fontWeight: 500, letterSpacing: '-.04em', margin: '8px 0 12px' }}>Find your kind of stay.</h1>
        <p style={{ color: 'var(--muted)', lineHeight: 1.65, maxWidth: 620 }}>Your search is ready. We’re connecting this new Next.js experience to HAMLET’s approved live listings next, so results and availability will come from the real marketplace—not sample data.</p>
        <form action="/stays" method="get" style={{ display: 'grid', gap: 12, padding: 16, background: '#fff', border: '1px solid var(--line)', borderRadius: 22, marginTop: 24 }}>
          <label style={{ display: 'grid', gap: 7, fontSize: 12, fontWeight: 750 }}>Neighbourhood
            <select name="area" defaultValue={area} className="pill" style={{ width: '100%', borderRadius: 12, justifyContent: 'start' }}>
              <option value="">Anywhere in Lagos</option>{allowedAreas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 7, fontSize: 12, fontWeight: 750 }}>Check-in
            <input name="checkIn" type="date" defaultValue={checkIn} className="pill" style={{ width: '100%', borderRadius: 12 }} />
          </label>
          <label style={{ display: 'grid', gap: 7, fontSize: 12, fontWeight: 750 }}>Check-out
            <input name="checkOut" type="date" defaultValue={checkOut} className="pill" style={{ width: '100%', borderRadius: 12 }} />
          </label>
          <button className="primary-button" type="submit">Update search →</button>
        </form>
        {(area || checkIn || checkOut) && <div style={{ marginTop: 20, padding: 16, borderRadius: 16, background: '#fff', border: '1px solid var(--line)' }}>
          <strong>Search details</strong><p style={{ color: 'var(--muted)', marginBottom: 0, lineHeight: 1.7 }}>{area || 'Anywhere in Lagos'} · {checkIn || 'Check-in not selected'} → {checkOut || 'Check-out not selected'}</p>
        </div>}
        <div style={{ marginTop: 24, borderRadius: 20, border: '1px dashed #c8c1b1', padding: '28px 20px', textAlign: 'center', background: 'rgba(255,255,255,.55)' }}>
          <div aria-hidden="true" style={{ fontSize: 28, marginBottom: 8 }}>⌂</div>
          <h2 className="serif" style={{ fontSize: 25, fontWeight: 500, margin: '0 0 8px' }}>Real stays, coming into this view next</h2>
          <p style={{ maxWidth: 500, margin: '0 auto 18px', color: 'var(--muted)', fontSize: 14, lineHeight: 1.7 }}>We won’t show invented listings or pretend dates are available. The next build step connects this search experience to approved HAMLET property data.</p>
          <a href="/" className="secondary-button">Back to HAMLET</a>
        </div>
      </section>
    </main>
  );
}
