'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { getBrowserSupabase } from '@/lib/next-supabase';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import {
  FocusedDrawer,
  FormField,
  FIELD_INPUT_CLASS,
} from '@/components/forms/ProgressiveFormPrimitives';
import { AdminNav } from '../admin-nav';

type DirectoryUser = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  partner_role: string | null;
  company: string | null;
  account_status: string;
  suspension_reason: string | null;
  created_at: string;
};

export default function AdminAccountsPage() {
  const db = useMemo(() => getBrowserSupabase(), []);
  const [allowed, setAllowed] = useState(false);
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [selected, setSelected] = useState<DirectoryUser | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!db) {
      setError('Admin directory is not configured.');
      setLoading(false);
      return;
    }
    const { data: session } = await db.auth.getSession();
    const user = session.session?.user;
    if (!user) {
      window.location.assign('/signin?next=/admin/accounts');
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

    const { data, error: rpcError } = await db.rpc('get_admin_directory');
    if (rpcError) {
      setError(rpcError.message);
    } else {
      setUsers((data || []) as DirectoryUser[]);
    }
    setLoading(false);
  }, [db]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function toggleSuspension(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || !selected) return;
    const nextSuspended = selected.account_status !== 'suspended';
    const nextStatus = nextSuspended ? 'suspended' : 'active';
    const cleanReason =
      reason.trim() ||
      (nextSuspended ? '' : 'Account reinstated by HAMLET operations.');
    if (cleanReason.length < 10) {
      setError('Provide a documented reason of at least 10 characters.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const { error: rpcError } =
        selected.role === 'partner'
          ? await db.rpc('set_partner_account_status', {
              target_partner_id: selected.id,
              next_status: nextStatus,
              reason_note: cleanReason,
              cascade_suspend_properties: true,
            })
          : await db.rpc('set_guest_account_status', {
              target_guest_id: selected.id,
              next_status: nextStatus,
              reason_note: cleanReason,
            });
      if (rpcError) throw new Error(rpcError.message);
      setNotice(
        `${selected.email} is now ${nextSuspended ? 'suspended' : 'active'}.`,
      );
      setSelected(null);
      setReason('');
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Account status update failed.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <main className="shell flex-1 py-8 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">User & Partner Governance</p>
            <h1 className="serif mt-2 text-3xl font-medium text-ink-900 sm:text-5xl">
              Account directory
            </h1>
          </div>
          {allowed && <AdminNav current="accounts" />}
        </div>

        {error && (
          <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800">
            {error}
          </p>
        )}
        {notice && (
          <p className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
            {notice}
          </p>
        )}

        {loading ? (
          <p className="mt-8 text-sm text-ink-600">Loading directory…</p>
        ) : !allowed ? (
          <p className="mt-8 text-sm text-red-800">Administrator access required.</p>
        ) : (
          <div className="mt-6 space-y-3">
            {users.map(u => (
              <article
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-ink-100 bg-white p-5"
              >
                <div>
                  <strong className="text-sm text-ink-900">
                    {u.full_name || u.email}
                  </strong>{' '}
                  · <span className="text-xs text-ink-500">{u.email}</span>
                  <p className="m-0 mt-1 text-xs text-ink-500">
                    Role: <strong className="uppercase text-ink-800">{u.role}</strong>
                    {u.company ? ` · ${u.company}` : ''} · Status:{' '}
                    <strong className="text-ink-900">{u.account_status}</strong>
                  </p>
                </div>

                {u.role !== 'admin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(u);
                      setReason(u.suspension_reason || '');
                    }}
                    className="secondary-button min-h-[40px]"
                  >
                    {u.account_status === 'suspended' ? 'Restore account' : 'Suspend'}
                  </button>
                )}
              </article>
            ))}
          </div>
        )}

        <FocusedDrawer
          open={Boolean(selected)}
          title={
            selected?.account_status === 'suspended'
              ? 'Restore account access'
              : 'Suspend account'
          }
          subtitle={selected?.email}
          onClose={() => setSelected(null)}
        >
          {selected && (
            <form onSubmit={toggleSuspension} className="space-y-4">
              <FormField label="Audit reason">
                {fieldProps => (
                  <textarea
                    {...fieldProps}
                    required={selected.account_status !== 'suspended'}
                    rows={3}
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Documented governance reason…"
                    className={`${FIELD_INPUT_CLASS} resize-y`}
                  />
                )}
              </FormField>

              <button
                type="submit"
                disabled={busy}
                className="primary-button min-h-[48px] w-full"
              >
                {busy
                  ? 'Updating…'
                  : selected.account_status === 'suspended'
                    ? 'Confirm restore'
                    : 'Confirm suspension'}
              </button>
            </form>
          )}
        </FocusedDrawer>
      </main>

      <SiteFooter />
    </div>
  );
}
