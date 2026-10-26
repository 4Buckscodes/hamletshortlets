import SignInForm from './signin-form';

export const metadata = {
  title: 'Sign in or create an account',
  description: 'Sign in to your HAMLET account or create an account to get started with shortlet stays.',
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return (
    <main className="shell" style={{ minHeight: '100svh', display: 'grid', alignContent: 'center', paddingBlock: 32 }}>
      <a href="/" style={{ fontWeight: 850, fontSize: 20, marginBottom: 24, width: 'fit-content' }}>
        HAMLET<span style={{ color: 'var(--gold)' }}>.REST</span>
      </a>
      <section style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 24, padding: 'clamp(22px, 5vw, 36px)', maxWidth: 480, width: '100%', boxShadow: '0 18px 55px rgba(14,31,59,.06)' }}>
        <p style={{ color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '.12em', fontSize: 11, fontWeight: 800, margin: '0 0 10px' }}>Your stay, sorted.</p>
        <h1 className="serif" style={{ fontSize: 38, fontWeight: 500, margin: '0 0 10px' }}>Welcome to HAMLET.</h1>
        <p style={{ color: 'var(--muted)', lineHeight: 1.7, margin: '0 0 24px' }}>
          Sign in to continue or create an account to start planning your next stay.
        </p>
        <SignInForm />
      </section>
      <p style={{ maxWidth: 480, color: 'var(--muted)', fontSize: 12, lineHeight: 1.6, marginTop: 16 }}>
        Need partner access? Create your account first, then submit a partner application through the HAMLET workspace.
      </p>
    </main>
  );
}
