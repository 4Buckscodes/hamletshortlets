'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { getBrowserSupabase } from '@/lib/next-supabase';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import { FormField, FIELD_INPUT_CLASS } from '@/components/forms/ProgressiveFormPrimitives';
import { PartnerNav } from '../partner-nav';

type AssignmentRow = {
  property_id: string;
  access_role: string;
  scope: string | null;
  status: string;
  granted_at: string;
  properties?: { title?: string; area?: string; status?: string } | null;
};

export default function PartnerProfilePage() {
  const db = useMemo(() => getBrowserSupabase(), []);
  const [role, setRole] = useState('');
  const [partnerRole, setPartnerRole] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!db) {
      setError('Partner profile is not configured on this deployment.');
      setLoading(false);
      return;
    }
    const { data: session } = await db.auth.getSession();
    const user = session.session?.user;
    if (!user) {
      window.location.assign('/signin?next=/partners/profile');
      return;
    }

    const [profileRes, assignRes] = await Promise.all([
      db
        .from('profiles')
        .select('role,partner_role,referral_code,full_name,phone,company')
        .eq('id', user.id)
        .maybeSingle(),
      db
        .from('property_access')
        .select('property_id,access_role,scope,status,granted_at,properties(title,area,status)')
        .eq('user_id', user.id)
        .order('granted_at', { ascending: false }),
    ]);

    if (profileRes.data) {
      setRole(String(profileRes.data.role || 'guest'));
      setPartnerRole(String(profileRes.data.partner_role || 'Property partner'));
      setReferralCode(String(profileRes.data.referral_code || ''));
      setFullName(String(profileRes.data.full_name || ''));
      setPhone(String(profileRes.data.phone || ''));
      setCompany(String(profileRes.data.company || ''));
    }

    if (!assignRes.error) {
      setAssignments((assignRes.data || []) as unknown as AssignmentRow[]);
    }
    setLoading(false);
  }, [db]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function savePartnerProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db) return;
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
      setNotice('Partner contact & business profile saved.');
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not update partner profile.',
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
            <p className="eyebrow">Partner Identity & Authority</p>
            <h1 className="serif mt-2 text-3xl font-medium text-ink-900 sm:text-5xl">
              Profile & property assignments
            </h1>
          </div>
          {(role === 'partner' || role === 'admin') && (
            <PartnerNav current="profile" />
          )}
        </div>

        {loading ? (
          <p className="mt-8 text-sm text-ink-600">Loading partner profile…</p>
        ) : (
          <div className="mt-8 grid items-start gap-6 lg:grid-cols-12">
            <section data-hamlet-reveal className="rounded-3xl border border-ink-100 bg-white p-6 lg:col-span-5">
              <span className="rounded-full bg-paper px-3 py-1 text-xs font-bold text-brass-700">
                {partnerRole}
              </span>
              {referralCode && (
                <p className="m-0 mt-2 text-xs text-ink-500">
                  Referral code: <strong className="font-mono text-ink-900">{referralCode}</strong>
                </p>
              )}

              <form onSubmit={savePartnerProfile} className="mt-5 space-y-4">
                <FormField label="Full name">
                  {fieldProps => (
                    <input
                      {...fieldProps}
                      required
                      minLength={2}
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className={FIELD_INPUT_CLASS}
                    />
                  )}
                </FormField>

                <FormField label="Phone number">
                  {fieldProps => (
                    <input
                      {...fieldProps}
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className={FIELD_INPUT_CLASS}
                    />
                  )}
                </FormField>

                <FormField label="Company / trading name">
                  {fieldProps => (
                    <input
                      {...fieldProps}
                      value={company}
                      onChange={e => setCompany(e.target.value)}
                      className={FIELD_INPUT_CLASS}
                    />
                  )}
                </FormField>

                {error && <p className="m-0 text-xs font-semibold text-red-700">{error}</p>}
                {notice && (
                  <p className="m-0 text-xs font-semibold text-emerald-700">{notice}</p>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="primary-button min-h-[48px] w-full"
                >
                  {saving ? 'Saving…' : 'Save partner profile'}
                </button>
              </form>
            </section>

            <section data-hamlet-reveal className="rounded-3xl border border-ink-100 bg-white p-6 lg:col-span-7">
              <h2 className="serif m-0 text-2xl font-medium text-ink-900">
                Property management assignments ({assignments.length})
              </h2>
              <p className="mt-1 text-xs text-ink-500">
                Explicit per-property permissions granted through your submissions or HAMLET operations.
              </p>

              {assignments.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {assignments.map(a => (
                    <div
                      key={`${a.property_id}-${a.access_role}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-ink-100 bg-paper p-4 text-xs"
                    >
                      <div>
                        <strong className="text-sm text-ink-900">
                          {a.properties?.title || a.property_id}
                        </strong>
                        <p className="m-0 mt-0.5 text-ink-500">
                          {a.properties?.area || 'Lagos'} · Access role:{' '}
                          <strong className="text-ink-800">{a.access_role}</strong>
                          {a.scope ? ` · ${a.scope}` : ''}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 font-bold text-ink-800">
                        {a.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-xs text-ink-500">
                  No property assignments yet — submit a property listing to create your first owner/manager assignment.
                </p>
              )}
            </section>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
