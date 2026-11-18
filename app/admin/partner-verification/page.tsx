'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getBrowserSupabase } from '@/lib/next-supabase';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import { AdminNav } from '../admin-nav';

type Verification = {
  partner_id: string;
  identity_status: string;
  bank_status: string;
  agreement_status: string;
  identity_document_path: string | null;
  bank_name: string | null;
  bank_code: string | null;
  beneficiary_name: string | null;
  account_number_last4: string | null;
  signed_agreement_path: string | null;
  agreement_version: string | null;
  bank_verification_reference: string | null;
  review_note: string | null;
  submitted_at: string | null;
};

const statusOptions = ['pending', 'verified', 'rejected'];

export default function AdminPartnerVerificationPage() {
  const db = useMemo(() => getBrowserSupabase(), []);
  const [allowed, setAllowed] = useState(false);
  const [rows, setRows] = useState<Verification[]>([]);
  const [decisions, setDecisions] = useState<Record<string, { identity: string; bank: string; agreement: string; reference: string; note: string }>>({});
  const [documents, setDocuments] = useState<Record<string, { identity?: string; agreement?: string }>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!db) { setError('Administrator workspace is not configured.'); setLoading(false); return; }
    const { data: session } = await db.auth.getSession();
    const user = session.session?.user;
    if (!user) { window.location.assign('/signin?next=/admin/partner-verification'); return; }
    const { data: profile } = await db.from('profiles').select('role,account_status').eq('id', user.id).maybeSingle();
    if (profile?.role !== 'admin' || profile.account_status !== 'active') { setAllowed(false); setLoading(false); return; }
    setAllowed(true);
    const { data, error: queryError } = await db.from('partner_payout_verifications')
      .select('partner_id,identity_status,bank_status,agreement_status,identity_document_path,bank_name,bank_code,beneficiary_name,account_number_last4,signed_agreement_path,agreement_version,bank_verification_reference,review_note,submitted_at')
      .order('submitted_at', { ascending: false });
    if (queryError) { setError(queryError.message); setLoading(false); return; }
    const items = (data || []) as Verification[];
    setRows(items);
    setDecisions(Object.fromEntries(items.map(row => [row.partner_id, {
      identity: row.identity_status, bank: row.bank_status, agreement: row.agreement_status,
      reference: row.bank_verification_reference || '', note: row.review_note || '',
    }])));
    setLoading(false);
  }, [db]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function openDocument(partnerId: string, path: string | null, kind: 'identity' | 'agreement') {
    if (!db || !path) return;
    setBusy(partnerId); setError('');
    const { data, error: signedError } = await db.storage.from('partner-verification-documents').createSignedUrl(path, 90);
    if (signedError || !data?.signedUrl) setError(signedError?.message || 'Could not create a secure document link.');
    else setDocuments(prev => ({ ...prev, [partnerId]: { ...prev[partnerId], [kind]: data.signedUrl } }));
    setBusy('');
  }

  async function save(row: Verification) {
    if (!db) return;
    const decision = decisions[row.partner_id];
    if (!decision) return;
    setBusy(row.partner_id); setError(''); setNotice('');
    const { error: rpcError } = await db.rpc('review_partner_payout_verification', {
      target_partner_id: row.partner_id,
      next_identity_status: decision.identity,
      next_bank_status: decision.bank,
      next_agreement_status: decision.agreement,
      bank_reference: decision.reference.trim() || null,
      admin_note: decision.note.trim() || null,
    });
    if (rpcError) setError(rpcError.message);
    else { setNotice('Verification decisions recorded and audit logged.'); await load(); }
    setBusy('');
  }

  function update(partnerId: string, key: 'identity' | 'bank' | 'agreement' | 'reference' | 'note', value: string) {
    setDecisions(prev => ({ ...prev, [partnerId]: { ...prev[partnerId], [key]: value } }));
  }

  return <div className="flex min-h-dvh flex-col bg-paper"><SiteHeader />
    <main className="shell flex-1 py-8 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Financial controls</p><h1 className="serif mt-2 text-3xl font-medium text-ink-900 sm:text-5xl">Partner payout verification</h1><p className="mt-2 max-w-2xl text-sm text-ink-600">Review identity, bank beneficiary and signed agreement independently. Approval here does not replace property ownership, authority or inspection review.</p></div>{allowed && <AdminNav current="partner-verification" />}</div>
      {error && <p role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
      {loading ? <p className="mt-8 text-sm text-ink-600">Loading verification submissions…</p> : !allowed ? <p className="mt-8 text-sm text-red-800">Active administrator access required.</p> : rows.length === 0 ? <p className="mt-8 rounded-3xl border border-dashed border-ink-300 bg-white p-10 text-center text-sm text-ink-600">No payout verification submissions yet.</p> :
        <div className="mt-7 space-y-5">{rows.map(row => { const d = decisions[row.partner_id]; return <section key={row.partner_id} className="rounded-3xl border border-ink-100 bg-white p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">Partner account</p><h2 className="mt-1 break-all font-mono text-sm text-ink-900">{row.partner_id}</h2><p className="mt-1 text-xs text-ink-500">Submitted {row.submitted_at ? new Date(row.submitted_at).toLocaleString() : '—'}</p></div><span className="rounded-full bg-paper px-3 py-1 text-xs font-bold text-ink-700">Payout checks</span></div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {(['identity','bank','agreement'] as const).map(kind => <div key={kind} className="rounded-2xl border border-ink-100 p-4"><p className="text-xs font-extrabold uppercase tracking-wider text-ink-700">{kind === 'identity' ? 'Identity document' : kind === 'bank' ? 'Bank beneficiary' : 'Signed agreement'}</p><p className="mt-2 text-sm font-semibold text-ink-900">Current: {row[kind === 'identity' ? 'identity_status' : kind === 'bank' ? 'bank_status' : 'agreement_status']}</p>{kind !== 'bank' ? <button type="button" disabled={busy === row.partner_id} onClick={() => void openDocument(row.partner_id, kind === 'identity' ? row.identity_document_path : row.signed_agreement_path, kind)} className="secondary-button mt-3 min-h-[38px] w-full text-xs">Open private document</button> : <div className="mt-3 space-y-1 text-xs text-ink-600"><p>{row.bank_name || 'Bank not supplied'} · {row.bank_code || '—'}</p><p>{row.beneficiary_name || 'Beneficiary not supplied'}</p><p>Account ending {row.account_number_last4 || '—'}</p></div>}{documents[row.partner_id]?.[kind] && <a className="mt-2 block break-all text-xs font-semibold text-brass-700 underline" href={documents[row.partner_id][kind]} target="_blank" rel="noreferrer">Open signed link (90 seconds)</a>}<label className="mt-4 block text-xs font-bold text-ink-700">Decision<select value={d?.[kind] || 'pending'} onChange={e => update(row.partner_id, kind, e.target.value)} className="mt-1 min-h-[42px] w-full rounded-xl border border-ink-200 bg-white px-3 text-sm">{statusOptions.map(option => <option key={option} value={option}>{option}</option>)}</select></label></div>)}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2"><label className="text-xs font-bold text-ink-700">Bank verification reference<input value={d?.reference || ''} onChange={e => update(row.partner_id,'reference',e.target.value)} placeholder="Provider/bank confirmation reference" className="mt-1 min-h-[42px] w-full rounded-xl border border-ink-200 px-3 text-sm" /></label><label className="text-xs font-bold text-ink-700">Reviewer note<input value={d?.note || ''} onChange={e => update(row.partner_id,'note',e.target.value)} placeholder="Record checks performed or corrections needed" className="mt-1 min-h-[42px] w-full rounded-xl border border-ink-200 px-3 text-sm" /></label></div>
          <div className="mt-4 flex justify-end"><button type="button" disabled={busy === row.partner_id} onClick={() => void save(row)} className="primary-button min-h-[44px]">{busy === row.partner_id ? 'Saving…' : 'Save verification decisions'}</button></div>
        </section>; })}</div>}
    </main><SiteFooter /></div>;
}
