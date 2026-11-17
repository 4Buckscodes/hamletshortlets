import SignInForm from './signin-form';

export const metadata = {
  title: 'Sign in or create an account',
  description: 'Sign in to your HAMLET account or create an account to get started with shortlet stays.',
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="auth-eyebrow">A better way to stay</p>
        <h1>Come on in.</h1>
        <p className="auth-lede">Sign in to pick up where you left off, or create an account and find your next Lagos stay.</p>
        <SignInForm />
      </section>
      <p className="auth-partner-note">Looking to list or manage a property? <a href="/partners/apply">Partner with HAMLET</a> and bring your space to the right guests.</p>
    </main>
  );
}
