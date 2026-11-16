'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BadgeCheck, ChevronDown, ShieldCheck, Users } from 'lucide-react';
import { getBrowserSupabase } from '@/lib/next-supabase';
import { APPROVED_OWNER_SERVICES_POLICY_COPY } from '@/lib/pricing';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';

const ROLES = [
  ['property_owner', 'Property owner'],
  ['authorised_manager', 'Authorised manager'],
  ['multi_property_operator', 'Multi-property operator'],
  ['closing_agent', 'Closing agent'],
] as const;

type Membership = {
  primary_role: string;
  company: string;
  phone: string;
  status: 'active' | 'suspended';
  joined_at: string;
};

const INPUT_CLASS =
  'mt-2 min-h-[48px] w-full rounded-xl border border-ink-200 bg-white px-3.5 py-3 text-base text-ink-900 placeholder-ink-400 transition focus:border-ink-900 focus:outline-none sm:text-sm';

export default function PartnerStartDashboard() {
  const db = useMemo(() => getBrowserSupabase(), []);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [membership, setMembership] = useState<Membership | null>(null);
  const [role, setRole] = useState('property_owner');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    async function load() {
      if (!db) {
        setError('HAMLET account access is not configured.');
        setLoading(false);
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const refCode = params.get('ref')?.trim();
      if (refCode) {
        setReferralCode(refCode.toUpperCase());
        try {
          window.localStorage.setItem('hamlet:referral-code', refCode.toUpperCase());
        } catch {
          // Ignore restricted storage environments.
        }
      }

      const { data: auth } = await db.auth.getSession();
      const user = auth.session?.user;
      if (!user) {
        const currentPath =
          window.location.pathname === '/partners/start'
            ? '/partners/start'
            : '/partners/apply';
        const nextTarget = refCode
          ? `${currentPath}?ref=${encodeURIComponent(refCode.toUpperCase())}`
          : currentPath;
        const signInParams = new URLSearchParams({
          mode: 'signup',
          next: nextTarget,
        });
        if (refCode) {
          signInParams.set('ref', refCode.toUpperCase());
        }
        window.location.assign(`/signin?${signInParams.toString()}`);
        return;
      }

      setEmail(user.email || '');
      const [{ data: p }, { data: m }] = await Promise.all([
        db
          .from('profiles')
          .select('full_name,phone,company,referred_by_code,referral_code')
          .eq('id', user.id)
          .maybeSingle(),
        db
          .from('partner_network_memberships')
          .select('primary_role,company,phone,status,joined_at')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      if (!live) return;
      setName(
        p?.full_name ||
          String(
            user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              '',
          ),
      );
      setPhone(m?.phone || p?.phone || String(user.user_metadata?.phone || ''));
      setCompany(m?.company || p?.company || '');
      setReferralCode(refCode?.toUpperCase() || p?.referred_by_code || '');
      if (m) {
        setMembership(m as Membership);
        setRole(m.primary_role);
      }
      setLoading(false);
    }

    const t = window.setTimeout(() => {
      void load();
    }, 0);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [db]);

  async function join(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!db) return;
    setSaving(true);
    setError('');

    const { data, error: e2 } = await db.rpc('join_partner_network', {
      next_role: role,
      next_company: company.trim(),
      next_phone: phone.trim(),
      referral_code_input: referralCode.trim().toUpperCase() || null,
    });

    if (e2) {
      if (e2.code === 'PGRST202' || /schema cache/i.test(e2.message)) {
        setError(
          'Partner registration is temporarily unavailable. Please refresh and try again; your workspace will open as soon as registration completes.',
        );
      } else {
        setError(e2.message);
      }
    } else {
      setMembership(data as Membership);
      window.localStorage.removeItem('hamlet:referral-code');
      window.location.assign('/partners');
      return;
    }
    setSaving(false);
  }

  const first = name.trim().split(/\s+/)[0] || 'there';
  const roleLabel =
    ROLES.find(([v]) => v === membership?.primary_role)?.[1] ||
    membership?.primary_role;

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />
      <main className="shell flex-1 py-8 sm:py-12">
        <p className="eyebrow">HAMLET Partner Network</p>
        <h1 className="serif mt-2 text-3xl font-medium text-ink-900 sm:text-5xl">
          {loading ? 'Preparing your workspace' : `Welcome, ${first}.`}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-600 sm:text-base">
          Create your partner profile and enter your workspace immediately. Upload properties, share approved stays, track earnings and invite other partners without waiting for manual account approval.
        </p>
        <p className="mt-2.5 max-w-2xl text-xs leading-relaxed text-ink-500">
          {APPROVED_OWNER_SERVICES_POLICY_COPY}
        </p>

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <p className="m-0">{error}</p></div>
        )}

        {loading ? (
          <p role="status" className="mt-8 text-sm">
            Loading your account…
          </p>
        ) : (
          <>
            <div className="mt-7 grid gap-4 md:grid-cols-3">
              <article className="rounded-3xl border border-ink-100 bg-white p-5">
                <Users className="h-5 w-5 text-brass-700" />
                <h2 className="mt-3 font-bold text-ink-900">Your account</h2>
                <p className="mt-1 break-all text-sm text-ink-600">{email}</p>
              </article>
              <article className="rounded-3xl border border-ink-100 bg-white p-5">
                <ShieldCheck className="h-5 w-5 text-brass-700" />
                <h2 className="mt-3 font-bold text-ink-900">Verification</h2>
                <p className="mt-1 text-sm text-ink-600">
                  Your workspace opens immediately. Property submissions are reviewed before publication; identity checks are only required before a payout.
                </p>
              </article>
              <article className="rounded-3xl border border-ink-100 bg-white p-5">
                <BadgeCheck className="h-5 w-5 text-brass-700" />
                <h2 className="mt-3 font-bold text-ink-900">Network status</h2>
                <p className="mt-2 text-xs font-extrabold uppercase">
                  {membership?.status === 'suspended'
                    ? 'Suspended'
                    : membership
                      ? 'Active · Registered'
                      : 'Not registered yet'}
                </p>
              </article>
            </div>

            {membership?.status === 'suspended' ? (
              <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-6">
                <h2 className="serif text-2xl text-ink-900">
                  Membership suspended
                </h2>
                <p className="mt-2 text-sm text-ink-700">
                  Contact HAMLET support. You cannot reactivate a suspended
                  membership yourself.
                </p>
              </section>
            ) : membership ? (
              <section className="mt-6 rounded-3xl border border-ink-200 bg-white p-6 sm:p-8">
                <BadgeCheck className="h-6 w-6 text-brass-700" />
                <h2 className="serif mt-3 text-2xl text-ink-900">
                  You’re in the network.
                </h2>
                <p className="mt-2 text-sm text-ink-600">
                  Registered as {roleLabel} · {membership.company}
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href="/partners" className="primary-button">
                    Open your partner workspace{' '}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/stays" className="secondary-button">
                    Explore stays
                  </Link>
                </div>
              </section>
            ) : (
              <form
                onSubmit={join}
                className="mt-6 max-w-2xl rounded-3xl border border-ink-200 bg-white p-6 sm:p-8"
              >
                <h2 className="serif text-2xl text-ink-900">
                  Join the HAMLET partner network
                </h2>

                <label className="mt-5 block text-xs font-bold text-ink-700">
                  Primary role
                  <div className="relative mt-2">
                    <select
                      value={role}
                      onChange={e => setRole(e.target.value)}
                      className="min-h-[48px] w-full appearance-none rounded-xl border border-ink-200 bg-white py-3 pl-3.5 pr-10 text-base text-ink-900 transition focus:border-ink-900 focus:outline-none sm:text-sm"
                    >
                      {ROLES.map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      aria-hidden="true"
                      className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500"
                    />
                  </div>
                </label>

                <label className="mt-4 block text-xs font-bold text-ink-700">
                  Business / display name
                  <input
                    required
                    minLength={2}
                    maxLength={160}
                    value={company}
                    onChange={e => setCompany(e.target.value)}
                    placeholder="Your business or name"
                    className={INPUT_CLASS}
                  />
                </label>

                <label className="mt-4 block text-xs font-bold text-ink-700">
                  Phone number
                  <input
                    required
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+234…"
                    className={INPUT_CLASS}
                  />
                </label>

                <label className="mt-4 block text-xs font-bold text-ink-700">
                  Referral code <span className="font-normal text-ink-400">· optional</span>
                  <input
                    value={referralCode}
                    onChange={e => setReferralCode(e.target.value.toUpperCase())}
                    placeholder="HML-XXXXX"
                    maxLength={24}
                    className={INPUT_CLASS}
                  />
                </label>

                <button
                  disabled={saving}
                  type="submit"
                  className="primary-button mt-6 min-h-[48px] w-full"
                >
                  {saving ? 'Joining…' : 'Join partner network →'}
                </button>
              </form>
            )}
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
