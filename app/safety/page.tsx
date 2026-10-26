export const metadata = { title: 'Trust and safety', description: 'How HAMLET approaches property review, booking clarity and guest support.' };

export default function SafetyPage() {
  return <main className="shell" style={{ paddingBlock: 28, minHeight: '100svh' }}>
    <a href="/" style={{ fontWeight: 850, fontSize: 20 }}>HAMLET<span style={{ color: 'var(--gold)' }}>.REST</span></a>
    <section style={{ maxWidth: 760, paddingBlock: 'clamp(38px, 8vw, 84px)' }}>
      <p style={{ color: '#806522', textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 800, fontSize: 11 }}>Trust matters</p>
      <h1 className="serif" style={{ fontSize: 'clamp(38px, 7vw, 64px)', lineHeight: 1.05, fontWeight: 500, margin: '12px 0 20px' }}>Clear details. Accountable stays.</h1>
      <p style={{ color: 'var(--muted)', fontSize: 17, lineHeight: 1.8 }}>HAMLET is building a review-led marketplace with clear property information, documented booking decisions and a support path when something goes wrong.</p>
      <p style={{ color: 'var(--muted)', lineHeight: 1.8 }}>Trust labels should reflect the evidence actually reviewed. A listing being present on HAMLET is not, by itself, a guarantee of title, ownership or every property claim.</p>
      <a href="/" className="primary-button" style={{ marginTop: 12 }}>Back to discovery</a>
    </section>
  </main>;
}
