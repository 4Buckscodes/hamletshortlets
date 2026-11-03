'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getBrowserSupabase } from '@/lib/next-supabase';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import { AdminNav } from '../../admin-nav';

type Member = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  primary_role: string;
  company: string;
  phone: string;
  status: string;
  joined_at: string;
  suspension_reason: string | null;
};

export default function PartnerNetworkAdminPage() {
  const db = useMemo(() => getBrowserSupabase(), []);
  const [allowed, setAllowed] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    if (!db) {
      setError('Database connection unavailable.');
      setLoading(false);
      return;
    }

    const { data: session } = await db.auth.getSession();
    const user = session.session?.user;
    if (!user) {
      window.location.assign('/signin?next=/admin/partners/network');
      return;
    }

    const { data: profile } = await db
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'admin') {
      setAllowed(false);
      setLoading(false);
      return;
    }

    setAllowed(true);
    const { data, error: e } = await db.rpc('list_partner_network_members');
    if (e) {
      setError(e.message);
    } else {
      setMembers((data || []) as Member[]);
      setError('');
    }
    setLoading(false);
  }, [db]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(t);
  }, [load]);

  async function update(m: Member, status: 'active' | 'suspended') {
    if (!db) return;
    setBusy(m.user_id);
    setError('');
    const { error: e } = await db.rpc('set_partner_network_status', {
      target_member_id: m.user_id,
      next_status: status,
      reason_note: reason[m.user_id] || '',
    });
    if (e) {
      setError(e.message);
    } else {
      setReason(v => ({ ...v, [m.user_id]: '' }));
      await load();
    }
    setBusy('');
  }

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />
      <main className="shell flex-1 py-8 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Administration</p>
            <h1 className="serif mt-2 text-3xl font-medium text-ink-900 sm:text-5xl">
              Partner network
            </h1>
          </div>
          {allowed && <AdminNav current="network" />}
        </div>

        {error && (
          <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">
            {error}
          </p>
        )}

        {loading ? (
          <p className="mt-6 text-sm">Loading registrations…</p>
        ) : !allowed ? (
          <p className="mt-6 text-sm text-red-800">Administrator access required.</p>
        ) : (
          <div className="mt-6 space-y-4">
            {members.map(m => (
              <article
                key={m.user_id}
                className="rounded-2xl border border-ink-100 bg-white p-5"
              >
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-ink-900">
                      {m.full_name || m.company}
                    </h2>
                    <p className="text-sm text-ink-600">
                      {m.email || 'No email'} · {m.phone}
                    </p>
                    <p className="mt-1 text-xs text-ink-500">
                      {m.primary_role.replaceAll('_', ' ')} · {m.company} · Joined{' '}
                      {new Date(m.joined_at).toLocaleDateString('en-NG')}
                    </p>
                  </div>
                  <span className="text-xs font-bold uppercase">{m.status}</span>
                </div>
                <input
                  value={reason[m.user_id] || ''}
                  onChange={e =>
                    setReason(v => ({ ...v, [m.user_id]: e.target.value }))
                  }
                  placeholder="Reason (minimum 10 characters)"
                  className="mt-3 min-h-[44px] w-full rounded-xl border border-ink-200 px-3.5 py-2.5 text-base sm:text-sm"
                />
                <button
                  disabled={
                    busy === m.user_id ||
                    (reason[m.user_id] || '').trim().length < 10
                  }
                  onClick={() =>
                    void update(
                      m,
                      m.status === 'active' ? 'suspended' : 'active',
                    )
                  }
                  className="secondary-button mt-3"
                >
                  {busy === m.user_id
                    ? 'Saving…'
                    : m.status === 'active'
                      ? 'Suspend membership'
                      : 'Reactivate membership'}
                </button>
                {m.suspension_reason && (
                  <p className="mt-2 text-xs text-amber-800">
                    Last suspension reason: {m.suspension_reason}
                  </p>
                )}
              </article>
            ))}
            {members.length === 0 && (
              <p className="rounded-2xl bg-white p-6 text-sm text-ink-600">
                No registrations yet.
              </p>
            )}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
