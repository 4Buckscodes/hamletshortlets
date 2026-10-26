export const metadata = { title: 'How it works', description: 'Understand the HAMLET shortlet request-to-book journey.' };

const steps = [
  ['01', 'Find a stay', 'Explore Lagos areas and compare the property details that matter to you.'],
  ['02', 'Send a request', 'Share your dates and guest details. The property partner checks availability and terms.'],
  ['03', 'Pay securely', 'When your request is accepted, follow the payment instructions. A booking is confirmed only after payment is verified.'],
  ['04', 'Get ready to arrive', 'Keep your booking details and support options close for your stay.'],
];

export default function HowItWorksPage() {
  return <main className="shell" style={{ minHeight: '100svh', paddingBlock: 28 }}>
    <a href="/" style={{ fontWeight: 850, fontSize: 20 }}>HAMLET<span style={{ color: 'var(--gold)' }}>.REST</span></a>
    <section style={{ paddingBlock: 'clamp(36px, 7vw, 76px)', maxWidth: 820 }}>
      <p style={{ color: '#806522', textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 800, fontSize: 11 }}>Simple by design</p>
      <h1 className="serif" style={{ fontSize: 'clamp(38px, 7vw, 64px)', lineHeight: 1.05, fontWeight: 500, margin: '12px 0 18px' }}>From search to stay.</h1>
      <p style={{ color: 'var(--muted)', fontSize: 17, lineHeight: 1.8, maxWidth: 620 }}>A clear request-to-book process, so you know what is happening and what comes next.</p>
      <div style={{ display: 'grid', gap: 12, marginTop: 28 }}>
        {steps.map(([n, title, detail]) => <article key={n} style={{ display: 'grid', gridTemplateColumns: '44px 1fr', gap: 16, padding: 20, background: '#fff', border: '1px solid var(--line)', borderRadius: 20 }}>
          <span style={{ color: '#9a772c', fontWeight: 850 }}>{n}</span><div><h2 style={{ margin: '0 0 7px', fontSize: 18 }}>{title}</h2><p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.7, fontSize: 14 }}>{detail}</p></div>
        </article>)}
      </div>
      <a href="/stays" className="primary-button" style={{ marginTop: 24 }}>Explore stays →</a>
    </section>
  </main>;
}
