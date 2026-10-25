export const metadata = { title: 'Sign in', robots: { index: false, follow: false } };

export default function SignInPage() {
  return <main className="shell" style={{ minHeight: '100svh', display: 'grid', alignContent: 'center', paddingBlock: 32 }}>
    <a href="/" style={{ fontWeight: 850, fontSize: 20, marginBottom: 24 }}>HAMLET<span style={{ color: 'var(--gold)' }}>.REST</span></a>
    <section style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 24, padding: 'clamp(22px, 5vw, 36px)', maxWidth: 480 }}>
      <h1 className="serif" style={{ fontSize: 38, fontWeight: 500, margin: '0 0 10px' }}>Welcome back.</h1>
      <p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>Authentication is being connected to the existing HAMLET Supabase account flow as part of the migration. Your current sign-in remains on the existing application until that connection is ready.</p>
      <a className="primary-button" href="https://www.hamlet.rest/" style={{ marginTop: 12 }}>Return to current HAMLET</a>
      <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 18 }}>We will not ask you to create a duplicate account during the migration.</p>
    </section>
  </main>;
}
