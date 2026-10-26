'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, LifeBuoy, Building2, ShieldCheck } from 'lucide-react';
import { getBrowserSupabase } from '@/lib/next-supabase';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import { FormField, FIELD_INPUT_CLASS } from '@/components/forms/ProgressiveFormPrimitives';
import { AccountNav } from './account-nav';

interface ProfileSummary {
  id: string;
  full_name: string | null;
  phone: string | null;
  company: string | null;
  role: string;
  account_status: string | null;
}

export default function GuestAccountOverviewPage() {
  const db = useMemo(() => getBrowserSupabase(), []);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [bookingCount, setBookingCount] = useState(0);
  const [awaitingPaymentCount, setAwaitingPaymentCount] = useState(0);
  const [openIssueCount, setOpenIssueCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!db) {
      setError('Account access is not configured on this deployment.');
      setLoading(false);
      return;
    }
    const { data: auth } = await db.auth.getSession();
    const user = auth.session?.user;
    if (!user) {
      window.location.assign('/signin?next=/account');
      return;
    }
    setEmail(user.email || '');

    const [profileRes, bookingsRes, issuesRes] = await Promise.all([
      db
        .from('profiles')
        .select('id,full_name,phone,company,role,account_status')
        .eq('id', user.id)
        .maybeSingle(),
      db.from('bookings').select('id,status').eq('guest_id', user.id),
      db.from('booking_issues').select('id,status').eq('reporter_id', user.id),
    ]);

    if (profileRes.data) {
      const p = profileRes.data as ProfileSummary;
      setProfile(p);
      setFullName(p.full_name || '');
      setPhone(p.phone || '');
      setCompany(p.company || '');
    }
    const bookings = bookingsRes.data ?? [];
    setBookingCount(bookings.length);
    setAwaitingPaymentCount(
      bookings.filter(b => b.status === 'awaiting_payment').length,
    );
    const issues = issuesRes.data ?? [];
    setOpenIssueCount(
      issues.filter(i => !['resolved', 'closed'].includes(String(i.status))).length,
    );
    setLoading(false);
  }, [db]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db) return;
    if (fullName.trim().length < 2) {
      setError('Enter your full name (at least 2 characters).');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const { error: rpcError } = await db.rpc('update_own_profile', {
        next_full_name: fullName.trim(),
        next_phone: phone.trim() || null,
        next_company: company.trim() || null,
      });
      if (rpcError) throw new Error(rpcError.message);
      setNotice('Your profile details have been updated.');
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not update your profile.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <main className="shell flex-1 py-8 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Your HAMLET Account</p>
            <h1 className="serif mt-2 text-3xl font-medium text-ink-900 sm:text-5xl">
              {fullName ? `Welcome, ${fullName.split(' ')[0]}.` : 'Your account'}
            </h1>
          </div>
          <AccountNav current="overview" />
        </div>

        {loading ? (
          <p role="status" className="mt-8 text-sm text-ink-600">
            Loading your account…
          </p>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-7">
              {/* Quick Summary Cards */}
              <div className="grid gap-3.5 sm:grid-cols-3">
                <Link
                  href="/account/bookings"
                  className="rounded-2xl border border-ink-100 bg-white p-4 transition hover:border-ink-900"
                >
                  <CalendarDays className="h-5 w-5 text-brass-600" />
                  <p className="m-0 mt-3 font-mono text-2xl font-extrabold text-ink-900">
                    {bookingCount}
                  </p>
                  <p className="m-0 mt-0.5 text-xs font-semibold text-ink-500">
                    Booking requests
                  </p>
                </Link>

                <Link
                  href="/account/bookings"
                  className="rounded-2xl border border-ink-100 bg-white p-4 transition hover:border-ink-900"
                >
                  <ShieldCheck className="h-5 w-5 text-emerald-700" />
                  <p className="m-0 mt-3 font-mono text-2xl font-extrabold text-ink-900">
                    {awaitingPaymentCount}
                  </p>
                  <p className="m-0 mt-0.5 text-xs font-semibold text-ink-500">
                    Awaiting payment
                  </p>
                </Link>

                <Link
                  href="/account/issues"
                  className="rounded-2xl border border-ink-100 bg-white p-4 transition hover:border-ink-900"
                >
                  <LifeBuoy className="h-5 w-5 text-ink-800" />
                  <p className="m-0 mt-3 font-mono text-2xl font-extrabold text-ink-900">
                    {openIssueCount}
                  </p>
                  <p className="m-0 mt-0.5 text-xs font-semibold text-ink-500">
                    Open support issues
                  </p>
                </Link>
              </div>

              {/* Role Workspace Shortcuts */}
              {profile?.role === 'partner' && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-200 bg-white p-5">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-6 w-6 text-brass-600" />
                    <div>
                      <p className="m-0 text-sm font-bold text-ink-900">
                        Verified Partner Account
                      </p>
                      <p className="m-0 text-xs text-ink-500">
                        Manage your properties, booking requests, availability and earnings.
                      </p>
                    </div>
                  </div>
                  <Link href="/partners" className="primary-button">
                    Open Partner Workspace →
                  </Link>
                </div>
              )}

              {profile?.role === 'admin' && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-200 bg-white p-5">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-6 w-6 text-brass-600" />
                    <div>
                      <p className="m-0 text-sm font-bold text-ink-900">
                        HAMLET Administrator Account
                      </p>
                      <p className="m-0 text-xs text-ink-500">
                        Review properties, partner applications, bookings, issues and settlements.
                      </p>
                    </div>
                  </div>
                  <Link href="/admin" className="primary-button">
                    Open Admin Console →
                  </Link>
                </div>
              )}

              {(!profile || profile.role === 'guest') && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-white p-5">
                  <div>
                    <p className="m-0 text-sm font-bold text-ink-900">
                      Own, manage or refer shortlets in Lagos?
                    </p>
                    <p className="m-0 mt-0.5 text-xs text-ink-500">
                      Submit a short partner application to list or manage stays on HAMLET.
                    </p>
                  </div>
                  <Link href="/partners/apply" className="secondary-button">
                    Become a partner
                  </Link>
                </div>
              )}
            </div>

            {/* Compact Contact Profile Card */}
            <section className="rounded-3xl border border-ink-100 bg-white p-6 lg:col-span-5">
              <h2 className="serif m-0 text-2xl font-medium text-ink-900">
                Contact details
              </h2>
              <p className="mt-1 mb-5 text-xs leading-relaxed text-ink-500">
                Keep your name and phone current for booking confirmations. Account roles cannot be changed here.
              </p>

              <form onSubmit={saveProfile} className="space-y-4">
                <FormField label="Account email">
                  {fieldProps => (
                    <input
                      {...fieldProps}
                      disabled
                      value={email}
                      className={`${FIELD_INPUT_CLASS} bg-paper text-ink-500`}
                    />
                  )}
                </FormField>

                <FormField label="Full name">
                  {fieldProps => (
                    <input
                      {...fieldProps}
                      required
                      minLength={2}
                      maxLength={120}
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className={FIELD_INPUT_CLASS}
                    />
                  )}
                </FormField>

                <FormField label="Phone number" optional>
                  {fieldProps => (
                    <input
                      {...fieldProps}
                      type="tel"
                      inputMode="tel"
                      maxLength={32}
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+234…"
                      className={FIELD_INPUT_CLASS}
                    />
                  )}
                </FormField>

                {profile?.role === 'partner' && (
                  <FormField label="Business / trading name" optional>
                    {fieldProps => (
                      <input
                        {...fieldProps}
                        maxLength={160}
                        value={company}
                        onChange={e => setCompany(e.target.value)}
                        className={FIELD_INPUT_CLASS}
                      />
                    )}
                  </FormField>
                )}

                {error && (
                  <p role="alert" className="m-0 text-xs font-semibold text-red-700">
                    {error}
                  </p>
                )}
                {notice && (
                  <p role="status" className="m-0 text-xs font-semibold text-emerald-700">
                    {notice}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="primary-button min-h-[48px] w-full"
                >
                  {saving ? 'Saving changes…' : 'Save profile details'}
                </button>
              </form>
            </section>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
