'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { getBrowserSupabase } from '@/lib/next-supabase';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import { PartnerNav } from '../partner-nav';

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

export default function PartnerPayoutVerificationPage() {
  const db = useMemo(() => getBrowserSupabase(), []);
  const [userId, setUserId] = useState('');
  const [identity, setIdentity] = useState<File | null>(null);
  const [agreement, setAgreement] = useState<File | null>(null);
  const [bankName, setBankName] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [beneficiary, setBeneficiary] = useState('');
  const [last4, setLast4] = useState('');
  const [version, setVersion] = useState('v1');
  const [statuses, setStatuses] = useState<{identity_status:string;bank_status:string;agreement_status:string} | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    const init = async () => {
      if (!db) return;
      const { data } = await db.auth.getSession();
      const user = data.session?.user;
      if (!user) { window.location.assign('/signin?next=/partners/payout-verification'); return; }
      if (active) setUserId(user.id);
      const { data: membership } = await db.from('partner_network_memberships').select('status').eq('user_id', user.id).maybeSingle();
      if (membership?.status !== 'active') { if (active) setError('Join the HAMLET partner network before submitting payout details. Your guest account remains available.'); return; }
      const { data: current } = await db.from('partner_payout_verifications').select('identity_status,bank_status,agreement_status,bank_name,bank_code,beneficiary_name,account_number_last4,agreement_version').eq('partner_id', user.id).maybeSingle();
      if (active && current) {
        setStatuses(current);
        setBankName(current.bank_name || '');
        setBankCode(current.bank_code || '');
        setBeneficiary(current.beneficiary_name || '');
        setLast4(current.account_number_last4 || '');
        setVersion(current.agreement_version || 'v1');
      }
    };
    void init();
    return () => { active = false; };
  }, [db]);

  function validateFile(file: File | null, label: string) {
    if (!file) throw new Error(`Choose your ${label}.`);
    if (!ACCEPTED.includes(file.type)) throw new Error(`${label} must be PDF, JPG, PNG or WEBP.`);
    if (file.size > MAX_BYTES) throw new Error(`${label} must be 10 MB or smaller.`);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || !userId) return;
    setBusy(true); setError(''); setNotice('');
    try {
      validateFile(identity, 'identity document');
      validateFile(agreement, 'signed agreement');
      if (bankName.trim().length < 2 || bankCode.trim().length < 2 || beneficiary.trim().length < 2 || !/^\d{4}$/.test(last4)) throw new Error('Enter the bank name, bank code, beneficiary name and final four account digits.');
      const upload = async (file: File, category: 'identity' | 'agreement') => {
        const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]/g, '-').slice(-90);
        const path = `${userId}/${category}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await db.storage.from('partner-verification-documents').upload(path, file, { upsert: false, contentType: file.type });
        if (uploadError) throw new Error(uploadError.message);
        return path;
      };
      const [identityPath, agreementPath] = await Promise.all([upload(identity!, 'identity'), upload(agreement!, 'agreement')]);
      const { error: rpcError } = await db.rpc('submit_partner_payout_verification', {
        identity_doc_path: identityPath,
        payout_bank_name: bankName.trim(),
        payout_bank_code: bankCode.trim(),
        payout_beneficiary_name: beneficiary.trim(),
        payout_account_last4: last4,
        signed_agreement_doc_path: agreementPath,
        signed_agreement_version: version.trim() || 'v1',
      });
      if (rpcError) throw new Error(rpcError.message);
      setNotice('Your documents and bank details have been submitted privately. HAMLET will review each requirement separately.');
      setIdentity(null); setAgreement(null);
      const { data: current } = await db.from('partner_payout_verifications').select('identity_status,bank_status,agreement_status').eq('partner_id', userId).maybeSingle();
      if (current) setStatuses(current);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Submission failed.');
    } finally { setBusy(false); }
  }

  return <div className="flex min-h-dvh flex-col bg-paper"><SiteHeader/><main className="shell flex-1 py-8 sm:py-12">
    <p className="eyebrow">Partner workspace · payout readiness</p><h1 className="serif mt-2 text-3xl font-medium text-ink-900 sm:text-5xl">Payout verification</h1>
    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-600">Submit identity evidence, bank beneficiary details and your signed HAMLET partner agreement. These checks do not delay partner registration, guest bookings or property submissions. Payouts remain on hold until all checks pass.</p>
    <div className="mt-5"><PartnerNav current="payout-verification" hideNewListingAction/></div>
    {statuses && <div className="mt-5 grid gap-3 sm:grid-cols-3">{[['Identity',statuses.identity_status],['Bank beneficiary',statuses.bank_status],['Agreement',statuses.agreement_status]].map(([label,status])=><div key={label} className="rounded-2xl border border-ink-100 bg-white p-4"><p className="text-xs text-ink-500">{label}</p><p className="mt-1 text-sm font-bold capitalize text-ink-900">{status}</p></div>)}</div>}
    {error && <p role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
    <form onSubmit={submit} className="mt-6 max-w-3xl space-y-5 rounded-3xl border border-ink-100 bg-white p-5 sm:p-7">
      <div><h2 className="serif text-2xl text-ink-900">Identity document</h2><p className="mt-1 text-xs text-ink-500">PDF, JPG, PNG or WEBP · maximum 10 MB · stored privately</p><input required type="file" accept=".pdf,image/jpeg,image/png,image/webp" onChange={e=>setIdentity(e.target.files?.[0] || null)} className="mt-3 block w-full text-sm"/></div>
      <div><h2 className="serif text-2xl text-ink-900">Bank beneficiary</h2><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-ink-700">Bank name<input required value={bankName} onChange={e=>setBankName(e.target.value)} className="mt-1 min-h-[44px] w-full rounded-xl border border-ink-200 px-3 text-sm"/></label><label className="text-xs font-bold text-ink-700">Bank code<input required value={bankCode} onChange={e=>setBankCode(e.target.value)} className="mt-1 min-h-[44px] w-full rounded-xl border border-ink-200 px-3 text-sm"/></label><label className="text-xs font-bold text-ink-700">Beneficiary name<input required value={beneficiary} onChange={e=>setBeneficiary(e.target.value)} className="mt-1 min-h-[44px] w-full rounded-xl border border-ink-200 px-3 text-sm"/></label><label className="text-xs font-bold text-ink-700">Last four account digits<input required inputMode="numeric" maxLength={4} pattern="[0-9]{4}" value={last4} onChange={e=>setLast4(e.target.value.replace(/\D/g,'').slice(0,4))} className="mt-1 min-h-[44px] w-full rounded-xl border border-ink-200 px-3 text-sm"/></label></div><p className="mt-2 text-xs text-ink-500">Do not enter your full account number or card PIN here. HAMLET stores only the final four digits and an administrator-recorded bank verification reference.</p></div>
      <div><h2 className="serif text-2xl text-ink-900">Signed partner agreement</h2><label className="mt-2 block text-xs font-bold text-ink-700">Agreement version<input required value={version} onChange={e=>setVersion(e.target.value)} className="mt-1 min-h-[44px] w-full rounded-xl border border-ink-200 px-3 text-sm"/></label><p className="mt-3 text-xs text-ink-500">Upload the completed and signed agreement · PDF, JPG, PNG or WEBP · maximum 10 MB</p><input required type="file" accept=".pdf,image/jpeg,image/png,image/webp" onChange={e=>setAgreement(e.target.files?.[0] || null)} className="mt-2 block w-full text-sm"/></div>
      <button type="submit" disabled={busy || !userId} className="primary-button min-h-[48px] w-full">{busy ? 'Uploading securely…' : 'Submit payout verification'}</button>
    </form>
  </main><SiteFooter/></div>;
}
