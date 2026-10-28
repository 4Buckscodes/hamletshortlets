'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BadgeCheck, CircleUserRound, ShieldCheck, Sparkles } from 'lucide-react';
import { getBrowserSupabase } from '@/lib/next-supabase';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';

type Profile = { full_name: string | null; role: string | null; phone: string | null };

export default function PartnerStartDashboard() {
  const db = useMemo(() => getBrowserSupabase(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!db) {
        if (alive) {
          setError('HAMLET account access is not configured on this deployment.');
          setLoading(false);
        }
        return;
      }
      const { data: auth } = await db.auth.getSession();
      const user = auth.session?.user;
      if (!user) {
        window.location.assign('/signin?mode=signup&next=%2Fpartners%2Fapply');
        return;
      }
      setEmail(user.email ?? '');
      const { data, error: profileError } = await db
        .from('profiles')
        .select('full_name,role,phone')
        .eq('id', user.id)
        .maybeSingle();
      if (!alive) return;
      if (profileError) setError('We could not load your profile. Refresh and try again.');
      setProfile((data as Profile | null) ?? {
        full_name: String(user.user_metadata?.full_name ?? ''),
        role: 'guest',
        phone: String(user.user_metadata?.phone ?? ''),
      });
      setLoading(false);
    }
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => { alive = false; window.clearTimeout(timer); };
  }, [db]);

  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || 'there';
  const isApprovedPartner = profile?.role === 'partner' || profile?.role === 'admin';

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />
      <main className="shell flex-1 py-8 sm:py-12">
        <section className="max-w-4xl">
          <p className="eyebrow">Your HAMLET dashboard</p>
          <h1 className="serif mt-2 text-3xl font-medium text-ink-900 sm:text-5xl">
            {loading ? 'Your space is getting ready' : `Welcome, ${firstName}.`}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-600 sm:text-base">
            Your account is ready to start. You do not need to submit your NIN just to create an account. We will explain any additional checks when you choose an activity that requires them.
          </p>
        </section>

        {error && <p role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
        {loading ? (
          <p role="status" className="mt-8 text-sm text-ink-600">Loading your account…</p>
        ) : (
          <>
            <section className="mt-7 grid gap-4 md:grid-cols-3">
              <article className="rounded-3xl border border-ink-100 bg-white p-5">
                <CircleUserRound className="h-5 w-5 text-brass-700" />
                <h2 className="mt-3 text-base font-bold text-ink-900">Your account</h2>
                <p className="mt-1 break-all text-sm text-ink-600">{email || 'Email not available'}</p>
                <p className="mt-3 text-xs text-ink-500">Account access: {isApprovedPartner ? 'Partner workspace enabled' : 'Basic account'}</p>
              </article>
              <article className="rounded-3xl border border-ink-100 bg-white p-5">
                <ShieldCheck className="h-5 w-5 text-brass-700" />
                <h2 className="mt-3 text-base font-bold text-ink-900">Verification, when needed</h2>
                <p className="mt-1 text-sm leading-relaxed text-ink-600">Explore HAMLET first. Identity or authority checks are requested only for features that need additional trust or compliance checks.</p>
              </article>
              <article className="rounded-3xl border border-ink-100 bg-white p-5">
                <Sparkles className="h-5 w-5 text-brass-700" />
                <h2 className="mt-3 text-base font-bold text-ink-900">Your partner level</h2>
                <p className="mt-2 inline-flex rounded-full border border-ink-200 bg-paper px-3 py-1 text-xs font-extrabold text-ink-900">VIP 1 · Registered</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">You are not yet an identity-verified partner. Upgrade to VIP 2 when you are ready to complete identity verification. Some actions will remain restricted until the relevant checks are approved.</p>
                <p className="mt-2 text-xs text-ink-500">Identity verification can be started from your partner dashboard when the verification flow is available.</p>
              </article>
            </section>

            <section className="mt-6 rounded-3xl border border-ink-200 bg-white p-6 sm:p-8">
              <div className="flex items-start gap-3">
                <BadgeCheck className="mt-1 h-5 w-5 shrink-0 text-brass-700" />
                <div>
                  <h2 className="serif m-0 text-2xl font-medium text-ink-900">Choose your next step</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-600">
                    You can browse stays now or begin a partner application. Property management, owner data, booking operations and rewards remain subject to approval, owner authorisation and any checks required for that activity.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                {isApprovedPartner ? (
                  <Link href="/partners" className="primary-button">Open partner workspace <ArrowRight className="h-4 w-4" /></Link>
                ) : (
                  <Link href="/partners/apply/form" className="primary-button">Continue partner application <ArrowRight className="h-4 w-4" /></Link>
                )}
                <Link href="/stays" className="secondary-button">Explore stays</Link>
                <Link href="/account" className="secondary-button">Guest account</Link>
              </div>
            </section>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
