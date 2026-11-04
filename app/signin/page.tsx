import type { Metadata } from 'next';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import SignInForm from './signin-form';

export const metadata: Metadata = {
  title: 'Sign in or create an account',
  description:
    'Sign in to your HAMLET.REST account or create an account with Google or email to request shortlet stays in Lagos.',
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <main className="shell flex flex-1 items-center justify-center py-10 sm:py-16">
        <div className="w-full max-w-md">
          <section data-hamlet-reveal className="rounded-3xl border border-ink-200 bg-white p-6 shadow-md sm:p-8">
            <p className="eyebrow">Your stay, sorted.</p>
            <h1 className="serif mt-2 mb-5 text-3xl font-medium text-ink-900 sm:text-4xl">
              Welcome to HAMLET.
            </h1>
            <SignInForm />
          </section>

          <p className="mt-4 text-center text-xs leading-relaxed text-ink-500">
            Listing or managing stays? Sign in first, then join the Partner Network.
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
