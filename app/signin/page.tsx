import type { Metadata } from 'next';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import SignInForm from './signin-form';

export const metadata: Metadata = {
  title: 'Sign in or create an account',
  description:
    'Sign in to your HAMLET.REST account or create a guest account in two quick steps to request shortlet stays in Lagos.',
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
            <h1 className="serif mt-2 text-3xl font-medium text-ink-900 sm:text-4xl">
              Welcome to HAMLET.
            </h1>
            <p className="mt-2 mb-6 text-sm leading-relaxed text-ink-500">
              Sign in to manage bookings and workspaces, or create your account in two short steps.
            </p>
            <SignInForm />
          </section>

          <p className="mt-4 text-center text-xs leading-relaxed text-ink-500">
            Applying as an owner, property manager, operator, closing agent or referrer? Create your account first, then complete the short Partner Application.
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
