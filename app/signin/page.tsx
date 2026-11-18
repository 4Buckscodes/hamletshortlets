import type { Metadata } from 'next';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import SignInForm from './signin-form';

export const metadata: Metadata = {
  title: 'Sign in or create an account',
  description:
    'Sign in to your HAMLET.REST account or create an account with Google or email to request shortlet stays in Lagos.',
  robots: { index: false, follow: false },
};

const POINTS = [
  { title: 'Guests', text: 'Request verified stays and track every booking in one place.' },
  { title: 'Partners', text: 'Create an account to open your partner workspace straight away.' },
  { title: 'Private', text: 'Your details stay with HAMLET and are never shown to other guests.' },
] as const;

export default function SignInPage() {
  return (
    <div className="hm-page" style={{ display: 'flex', flexDirection: 'column' }}>
      <SiteHeader />

      <main className="hm-main hm-auth" style={{ flex: 1 }}>
        <section className="hm-auth-panel hm-band hm-band-arrive" aria-labelledby="signin-title">
          <img src="/images/lagos-hero.jpg" alt="" className="hm-auth-photo" />
          <div className="hm-auth-copy">
            <p className="hm-label">Your stay, sorted.</p>
            <h1 id="signin-title" className="hm-display">
              Welcome
              <br />
              to <span className="hm-auth-lime">HAMLET</span>
              <em>.</em>
            </h1>
          </div>
          <ul className="hm-auth-points">
            {POINTS.map(point => (
              <li key={point.title}>
                <b>{point.title}</b>
                <span>{point.text}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="hm-auth-form" aria-label="Sign in or create an account">
          <div className="hm-auth-card">
            <SignInForm />
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
