'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { LAGOS_AREAS } from '@/lib/areas';
import { statusEntry } from '@/lib/statusLabels';
import { StatusPill } from '@/components/ui/StatusPill';
import { getBrowserSupabase } from '@/lib/next-supabase';
import {
  ChipMultiSelect,
  DraftStatusBar,
  FormField,
  StepFooterActions,
  StepProgressHeader,
  StepperCounter,
  useProgressiveDraft,
  FIELD_INPUT_CLASS,
  OptionCardGroup,
} from '@/components/forms/ProgressiveFormPrimitives';

type ExistingApp = {
  id: string;
  full_name: string;
  phone: string;
  company: string;
  role: string;
  areas: string[];
  properties_count: number;
  motivation: string;
  referred_by_code?: string | null;
  status: string;
  review_note: string | null;
  submitted_at: string;
};

interface PartnerApplyDraft {
  role: string;
  fullName: string;
  phone: string;
  company: string;
  referralCode: string;
  areas: string[];
  propertiesCount: number;
  authoritySummary: string;
  payoutBank: string;
  payoutAccountName: string;
  confirmAccuracy: boolean;
  confirmAuthority: boolean;
  confirmReviewConsent: boolean;
}

const INITIAL_DRAFT: PartnerApplyDraft = {
  role: 'Property owner',
  fullName: '',
  phone: '',
  company: '',
  referralCode: '',
  areas: [],
  propertiesCount: 1,
  authoritySummary: '',
  payoutBank: '',
  payoutAccountName: '',
  confirmAccuracy: false,
  confirmAuthority: false,
  confirmReviewConsent: false,
};

const NETWORK_ROLE_TO_APPLICATION_ROLE: Record<string, string> = {
  property_owner: 'Property owner',
  authorised_manager: 'Authorised manager',
  multi_property_operator: 'Multi-property operator',
  closing_agent: 'Closing agent',
};

const APPLICATION_ROLE_TO_NETWORK_ROLE: Record<string, string> = {
  'Property owner': 'property_owner',
  'Property Owner': 'property_owner',
  'Authorised manager': 'authorised_manager',
  'Authorised Manager': 'authorised_manager',
  'Agent (authorised)': 'authorised_manager',
  'Property Manager': 'authorised_manager',
  'Co-host / Hospitality Operator': 'authorised_manager',
  'Multi-property operator': 'multi_property_operator',
  'Shortlet Operator': 'multi_property_operator',
  'Closing agent': 'closing_agent',
  'Closing Agent': 'closing_agent',
  'Referral Partner': 'closing_agent',
};

const APPLY_STEPS = [
  {
    id: 'role',
    title: 'Primary role',
    shortLabel: '1. Role',
  },
  {
    id: 'contact',
    title: 'Contact & business details',
    shortLabel: '2. Contact',
  },
  {
    id: 'focus',
    title: 'Lagos focus',
    shortLabel: '3. Lagos focus',
  },
  {
    id: 'verification',
    title: 'Optional background',
    shortLabel: '4. Background',
  },
  {
    id: 'payout',
    title: 'Payout setup (optional)',
    shortLabel: '5. Payout setup',
  },
  {
    id: 'declarations',
    title: 'Identity verification',
    shortLabel: '6. Verify identity',
  },
] as const;

export default function PartnerApplicationForm() {
  const db = useMemo(() => getBrowserSupabase(), []);
  const {
    values,
    setValues,
    step,
    setStep,
    hydrated,
    hasSavedDraft,
    lastSavedAt,
    clearDraft,
  } = useProgressiveDraft<PartnerApplyDraft>({
    storageKey: 'hamlet:partner-apply:v2',
    initialValues: INITIAL_DRAFT,
    initialStep: 0,
  });

  const [signedIn, setSignedIn] = useState(false);
  const [userId, setUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [roleState, setRoleState] = useState('');
  const [existing, setExisting] = useState<ExistingApp | null>(null);
  const [referralResolved, setReferralResolved] = useState<string>('');
  const [lockedReferralCode, setLockedReferralCode] = useState('');
  const gateNext = `/partners/apply/form${lockedReferralCode ? `?ref=${encodeURIComponent(lockedReferralCode)}` : ''}`;
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const errorRef = useRef<HTMLParagraphElement | null>(null);
  // Validation and submit errors take focus so keyboard and screen-reader users land on them.
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  const [message, setMessage] = useState('');

  const isInventoryRole = [
    'Property owner',
    'Authorised manager',
    'Multi-property operator',
  ].includes(values.role);

  const load = useCallback(async () => {
    if (!db) {
      setError('Partner onboarding is not configured on this deployment.');
      setLoading(false);
      return;
    }

    const urlRef =
      new URLSearchParams(window.location.search).get('ref') ||
      window.localStorage.getItem('hamlet:referral-code');
    if (urlRef?.trim()) {
      const capturedCode = urlRef.trim().toUpperCase();
      setLockedReferralCode(capturedCode);
      setValues(prev => ({ ...prev, referralCode: capturedCode }));
    }

    const { data: session } = await db.auth.getSession();
    const user = session.session?.user;
    if (!user) {
      setSignedIn(false);
      setLoading(false);
      return;
    }
    setSignedIn(true);
    setUserId(user.id);
    setUserEmail(user.email || '');

    const [{ data: profile }, { data: apps }, { data: networkMembership }] =
      await Promise.all([
        db.from('profiles').select('role,full_name,phone,company,referred_by_code').eq('id', user.id).maybeSingle(),
        db
          .from('partner_applications')
          .select(
            'id,full_name,phone,company,role,areas,properties_count,motivation,referred_by_code,status,review_note,submitted_at',
          )
          .eq('applicant_id', user.id)
          .order('submitted_at', { ascending: false })
          .limit(1),
        db
          .from('partner_network_memberships')
          .select('primary_role,company,phone')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

    setRoleState(String(profile?.role || 'guest'));
    const savedReferralCode = String(profile?.referred_by_code || '').trim().toUpperCase();
    if (savedReferralCode) {
      setLockedReferralCode(savedReferralCode);
      setValues(prev => ({ ...prev, referralCode: savedReferralCode }));
    }
    const latest = (apps?.[0] as ExistingApp | undefined) || null;
    setExisting(latest);

    const mappedNetworkRole = networkMembership?.primary_role
      ? NETWORK_ROLE_TO_APPLICATION_ROLE[String(networkMembership.primary_role)]
      : undefined;

    if (latest && latest.status === 'needs_correction') {
      setValues(prev => ({
        ...prev,
        fullName: latest.full_name || prev.fullName,
        phone: latest.phone || prev.phone,
        company: latest.company || prev.company,
        role: latest.role || prev.role,
        areas: latest.areas?.length ? latest.areas : prev.areas,
        propertiesCount: latest.properties_count ?? prev.propertiesCount,
        authoritySummary: latest.motivation || prev.authoritySummary,
        referralCode: latest.referred_by_code || String(profile?.referred_by_code || prev.referralCode),
      }));
    } else if (profile || networkMembership) {
      setValues(prev => ({
        ...prev,
        role:
          prev.role === INITIAL_DRAFT.role && mappedNetworkRole
            ? mappedNetworkRole
            : prev.role,
        fullName: prev.fullName || String(profile?.full_name || ''),
        phone:
          prev.phone ||
          String(networkMembership?.phone || profile?.phone || ''),
        company:
          prev.company ||
          String(networkMembership?.company || profile?.company || ''),
        referralCode: prev.referralCode || String(profile?.referred_by_code || ''),
      }));
    }

    setLoading(false);
  }, [db, setValues]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  // Verify referral code live when entered
  useEffect(() => {
    const code = values.referralCode.trim().toUpperCase();
    const timer = window.setTimeout(async () => {
      if (!db || code.length < 4) {
        setReferralResolved('');
        return;
      }
      const { data, error: lookupError } = await db.rpc('resolve_referral_code', { code_input: code });
      const row = Array.isArray(data) ? data[0] : data;
      if (row && typeof row === 'object' && 'partner_name' in row) {
        setReferralResolved(
          `Referral verified: invited by ${String((row as { partner_name?: string }).partner_name || 'HAMLET partner')}`,
        );
      } else {
        // A failed lookup (e.g. offline) is not the same as an unknown code; only say "not recognised" for a real miss.
        setReferralResolved(
          lookupError
            ? 'We’ll check this referral code when you submit.'
            : lockedReferralCode
              ? 'We couldn’t match this invite code. You can still continue; HAMLET will check it on review.'
              : 'Referral code not recognised. Check it, or leave it blank if you do not have one.',
        );
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [db, values.referralCode, lockedReferralCode]);

  function validateStep(idx: number): string | null {
    if (idx === 1) {
      if (values.fullName.trim().length < 2) return 'Enter your full name.';
      if (!/^\+?[0-9][0-9\s-]{6,18}$/.test(values.phone.trim()))
        return 'Enter a valid phone number, e.g. +234 803 000 0000 or 0803 000 0000.';
      if (values.company.trim().length < 2)
        return 'Enter your business, trading or personal practice name.';
    }
    if (idx === 2) {
      if (values.areas.length < 1) {
        return 'Select at least one Lagos neighbourhood.';
      }
      if (isInventoryRole && values.propertiesCount < 1) {
        return 'Property owners, managers and operators must specify at least 1 property.';
      }
    }
    if (idx === 5) {
      if (
        !values.confirmAccuracy ||
        !values.confirmAuthority ||
        !values.confirmReviewConsent
      ) {
        return 'Confirm all three marketplace declarations before submitting.';
      }
    }
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    const stepErr = validateStep(step);
    if (stepErr) {
      setError(stepErr);
      return;
    }

    if (step < APPLY_STEPS.length - 1) {
      setStep(step + 1);
      return;
    }

    if (!db || !userId) return;
    setBusy(true);

    try {
      const networkRole = APPLICATION_ROLE_TO_NETWORK_ROLE[values.role];
      if (!networkRole) throw new Error('Choose a valid HAMLET partner role.');
      const { error: membershipError } = await db.rpc('join_partner_network', {
        next_role: networkRole,
        next_company: values.company.trim(),
        next_phone: values.phone.trim(),
        referral_code_input: values.referralCode.trim().toUpperCase() || null,
      });
      if (membershipError) throw new Error(membershipError.message);

      const fallbackSummary = `${values.role} operating across ${values.areas.join(', ')}${
        isInventoryRole
          ? ` (${Math.max(1, values.propertiesCount)} ${values.propertiesCount === 1 ? 'property' : 'properties'})`
          : ''
      }.`;
      const compiledMotivation =
        [
          values.authoritySummary.trim() || null,
          values.payoutBank.trim()
            ? `Preferred bank: ${values.payoutBank.trim()} (${values.payoutAccountName.trim() || values.fullName.trim()})`
            : null,
        ]
          .filter(Boolean)
          .join(' | ') || fallbackSummary;

      if (existing && existing.status === 'needs_correction') {
        const { error: rpcError } = await db.rpc('resubmit_partner_application', {
          target_application_id: existing.id,
          application_data: {
            full_name: values.fullName.trim(),
            phone: values.phone.trim(),
            company: values.company.trim(),
            role: values.role,
            areas: values.areas,
            properties_count: isInventoryRole
              ? Math.max(1, values.propertiesCount)
              : 1,
            motivation: compiledMotivation,
            referred_by_code: values.referralCode.trim().toUpperCase() || null,
          },
        });
        if (rpcError) throw new Error(rpcError.message);
        clearDraft();
        setMessage('Your updated identity-verification details have been resubmitted. Your partner workspace remains active.');
      } else {
        const { error: insertError } = await db.from('partner_applications').insert({
          applicant_id: userId,
          full_name: values.fullName.trim(),
          email: userEmail,
          phone: values.phone.trim(),
          company: values.company.trim(),
          role: values.role,
          areas: values.areas,
          properties_count: isInventoryRole ? Math.max(1, values.propertiesCount) : 0,
          motivation: compiledMotivation,
          referred_by_code: values.referralCode.trim().toUpperCase() || null,
        });
        if (insertError) throw new Error(insertError.message);
        clearDraft();
        setMessage(
          'Your identity-verification details have been submitted. Your partner workspace remains active while HAMLET completes the checks required before a payout. Property listings are reviewed separately before they appear publicly.',
        );
      }

      await load();
    } catch (caught) {
      const raw = caught instanceof Error ? caught.message : '';
      setError(
        !raw || /fetch|network|TypeError/i.test(raw)
          ? 'We couldn’t reach HAMLET to submit your details. Check your connection and try again; your answers are saved on this device.'
          : raw,
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-ink-100 bg-white p-6 text-sm text-ink-600">
        Checking your account…
      </div>
    );
  }

  if (!signedIn) {
    return (
      <section className="rounded-3xl border border-ink-200 bg-white p-6 sm:p-8">
        <h2 className="serif m-0 text-2xl font-medium text-ink-900">
          Step 0 — Sign in or create your HAMLET account first
        </h2>
        <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-ink-600">
          This step is for identity and payout verification only. Your partner workspace is available immediately after network registration; you do not need to wait for this review to upload properties, share stays or view earnings.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={`/signin?mode=signup&next=${encodeURIComponent(gateNext)}${lockedReferralCode ? `&ref=${encodeURIComponent(lockedReferralCode)}` : ''}`}
            className="primary-button"
          >
            Create account & continue →
          </Link>
          <Link
            href={`/signin?next=${encodeURIComponent(gateNext)}`}
            className="secondary-button"
          >
            Sign in to existing account
          </Link>
        </div>
      </section>
    );
  }

  if (roleState === 'partner' || roleState === 'admin') {
    return (
      <section className="rounded-3xl border border-emerald-200 bg-white p-6 sm:p-8">
        <div className="flex items-center gap-2 text-emerald-800">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <strong className="text-sm">Partner workspace active</strong>
        </div>
        <h2 className="serif mt-2 text-2xl font-medium text-ink-900">
          Your workspace is ready.
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">
          Open your workspace to submit Lagos stays, confirm booking requests, manage calendars or track referral earnings.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={roleState === 'admin' ? '/admin' : '/partners'}
            className="primary-button"
          >
            {roleState === 'admin' ? 'Open Admin Console →' : 'Open Partner Workspace →'}
          </Link>
          {roleState === 'partner' && (
            <Link href="/partners/properties/new" className="secondary-button">
              Submit a new stay
            </Link>
          )}
        </div>
      </section>
    );
  }

  if (existing && existing.status !== 'needs_correction') {
    return (
      <section className="rounded-3xl border border-ink-200 bg-white p-6 sm:p-8">
        {message && (
          <div role="status" className="mb-5 flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="m-0 font-bold">Received. Thank you.</p>
              <p className="m-0 mt-1">{message} Meanwhile, you can add your first listing from your workspace.</p>
              <Link href="/partners/properties/new" className="hm-link" style={{ marginTop: 8 }}>Add a listing</Link>
            </div>
          </div>
        )}
        <StatusPill tone={statusEntry(existing.status).tone}>Verification: {statusEntry(existing.status).label}</StatusPill>
        <h2 className="serif mt-3 text-2xl font-medium text-ink-900">
          {existing.company} · {existing.role}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">
          Submitted {new Date(existing.submitted_at).toLocaleDateString('en-NG')}. This verification review is only required before a payout. Your partner workspace and listing submissions remain available.
        </p>
        {existing.review_note && (
          <div className="mt-4 rounded-2xl border border-ink-100 bg-paper p-4 text-xs text-ink-700">
            <strong>Reviewer note:</strong> {existing.review_note}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-ink-200 bg-white p-6 shadow-xs sm:p-8">
      {existing?.status === 'needs_correction' && (
        <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" />
            <span>Correction requested on your identity verification</span>
          </div>
          <p className="m-0 mt-1">
            {existing.review_note ||
              'Please update the verification details below, then resubmit. Your workspace remains active.'}
          </p>
        </div>
      )}

      {hydrated && !existing && (
        <DraftStatusBar
          hasSavedDraft={hasSavedDraft}
          lastSavedAt={lastSavedAt}
          onClearDraft={clearDraft}
        />
      )}

      <StepProgressHeader
        steps={APPLY_STEPS}
        currentStep={step}
        onSelectStep={idx => setStep(idx)}
        maxCompletedStep={existing ? APPLY_STEPS.length - 1 : step}
      />

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {step === 0 && (
          <div className="space-y-4">
            <OptionCardGroup
              ariaLabel="Your role on HAMLET"
              columns={1}
              value={values.role}
              onChange={next => setValues(prev => ({ ...prev, role: next }))}
              options={[
                { value: 'Property owner', label: 'Property owner', description: 'You own the home and set its nightly rate. Guests see it with HAMLET’s 20% service fee included.' },
                { value: 'Authorised manager', label: 'Authorised manager', description: 'You manage a home with the owner’s written authority to list it.' },
                { value: 'Multi-property operator', label: 'Multi-property operator', description: 'You run several units across Lagos.' },
                { value: 'Closing agent', label: 'Closing agent', description: 'You bring guests to verified stays and earn 10% of the owner’s agreed rate on bookings you close, paid from HAMLET’s fee.' },
              ]}
            />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <FormField label="Full legal name">
              {fieldProps => (
                <input
                  {...fieldProps}
                  required
                  minLength={2}
                  maxLength={120}
                  autoComplete="name"
                  value={values.fullName}
                  onChange={e =>
                    setValues(prev => ({ ...prev, fullName: e.target.value }))
                  }
                  className={FIELD_INPUT_CLASS}
                />
              )}
            </FormField>

            <FormField label="WhatsApp / mobile phone">
              {fieldProps => (
                <input
                  {...fieldProps}
                  required
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  minLength={7}
                  maxLength={32}
                  value={values.phone}
                  onChange={e =>
                    setValues(prev => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="+234 800 000 0000"
                  className={FIELD_INPUT_CLASS}
                />
              )}
            </FormField>

            <FormField
              label={
                isInventoryRole
                  ? 'Company, estate or trading name'
                  : 'Agency, practice or personal trading name'
              }
            >
              {fieldProps => (
                <input
                  {...fieldProps}
                  required
                  minLength={2}
                  maxLength={160}
                  autoComplete="organization"
                  value={values.company}
                  onChange={e =>
                    setValues(prev => ({ ...prev, company: e.target.value }))
                  }
                  placeholder="e.g. Lekki Crest Apartments / Independent Agent"
                  className={FIELD_INPUT_CLASS}
                />
              )}
            </FormField>

            <FormField
              label="Partner referral code"
              optional
              hint={referralResolved || 'Enter a code if an active HAMLET partner invited you.'}
            >
              {fieldProps => (
                <input
                  {...fieldProps}
                  maxLength={32}
                  value={lockedReferralCode || values.referralCode}
                  readOnly={Boolean(lockedReferralCode)}
                  aria-readonly={Boolean(lockedReferralCode)}
                  onChange={e => {
                    if (!lockedReferralCode) {
                      setValues(prev => ({ ...prev, referralCode: e.target.value.toUpperCase() }));
                    }
                  }}
                  placeholder="Optional code"
                  className={`${FIELD_INPUT_CLASS} font-mono uppercase ${lockedReferralCode ? 'cursor-not-allowed bg-paper/80' : ''}`}
                />
              )}
            </FormField>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-bold text-ink-900">
                Lagos neighbourhoods you cover
              </p>
              <ChipMultiSelect
                options={[...LAGOS_AREAS]}
                selected={values.areas}
                onChange={areas => setValues(prev => ({ ...prev, areas }))}
              />
            </div>

            {isInventoryRole && (
              <StepperCounter
                label="Planned properties"
                value={Math.max(1, values.propertiesCount)}
                min={1}
                max={200}
                onChange={n =>
                  setValues(prev => ({ ...prev, propertiesCount: n }))
                }
              />
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <FormField
              label={
                isInventoryRole
                  ? 'Ownership or management background'
                  : 'Booking or referral network'
              }
              optional
            >
              {fieldProps => (
                <textarea
                  {...fieldProps}
                  maxLength={2000}
                  rows={4}
                  value={values.authoritySummary}
                  onChange={e =>
                    setValues(prev => ({
                      ...prev,
                      authoritySummary: e.target.value,
                    }))
                  }
                  placeholder="Optional context…"
                  className={`${FIELD_INPUT_CLASS} resize-y`}
                />
              )}
            </FormField>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <FormField label="Settlement bank name" optional>
              {fieldProps => (
                <input
                  {...fieldProps}
                  maxLength={100}
                  value={values.payoutBank}
                  onChange={e =>
                    setValues(prev => ({ ...prev, payoutBank: e.target.value }))
                  }
                  placeholder="e.g. GTBank, Zenith Bank, Access Bank"
                  className={FIELD_INPUT_CLASS}
                />
              )}
            </FormField>

            <FormField label="Settlement account name" optional>
              {fieldProps => (
                <input
                  {...fieldProps}
                  maxLength={120}
                  value={values.payoutAccountName}
                  onChange={e =>
                    setValues(prev => ({
                      ...prev,
                      payoutAccountName: e.target.value,
                    }))
                  }
                  placeholder="Must match verified partner or company identity"
                  className={FIELD_INPUT_CLASS}
                />
              )}
            </FormField>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-ink-100 bg-paper p-4 text-xs leading-relaxed text-ink-700">
              <p className="m-0 font-bold text-ink-900">
                {values.fullName} · {values.role} ({values.company})
              </p>
              <p className="m-0 mt-1">
                Lagos areas: {values.areas.join(', ')}
                {isInventoryRole ? ` · ${values.propertiesCount} planned unit(s)` : ''}
              </p>
            </div>

            <div className="space-y-2.5">
              <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-2xl border border-ink-200 p-3.5 text-xs leading-relaxed text-ink-800">
                <input
                  type="checkbox"
                  checked={values.confirmAccuracy}
                  onChange={e =>
                    setValues(prev => ({
                      ...prev,
                      confirmAccuracy: e.target.checked,
                    }))
                  }
                  className="mt-0.5 h-4 w-4 accent-ink-900"
                />
                <span>
                  I confirm that the identity and contact information provided for payout verification are accurate.
                </span>
              </label>

              <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-2xl border border-ink-200 p-3.5 text-xs leading-relaxed text-ink-800">
                <input
                  type="checkbox"
                  checked={values.confirmAuthority}
                  onChange={e =>
                    setValues(prev => ({
                      ...prev,
                      confirmAuthority: e.target.checked,
                    }))
                  }
                  className="mt-0.5 h-4 w-4 accent-ink-900"
                />
                <span>
                  I will only submit or represent Lagos properties where lawful ownership or written authority exists.
                </span>
              </label>

              <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-2xl border border-ink-200 p-3.5 text-xs leading-relaxed text-ink-800">
                <input
                  type="checkbox"
                  checked={values.confirmReviewConsent}
                  onChange={e =>
                    setValues(prev => ({
                      ...prev,
                      confirmReviewConsent: e.target.checked,
                    }))
                  }
                  className="mt-0.5 h-4 w-4 accent-ink-900"
                />
                <span>
                  I understand partner workspace access is immediate, each property is reviewed before public listing, and identity verification is required before payout.
                </span>
              </label>
            </div>
          </div>
        )}

        {error && (
          <p
            id="apply-form-error"
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className="m-0 rounded-2xl bg-red-50 p-3.5 text-sm font-semibold text-red-800 outline-none"
          >
            {error}
          </p>
        )}

        {message && (
          <div
            role="status"
            className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800"
          >
            <p className="m-0">{message}</p>
            <Link
              href="/partners/properties/new"
              className="mt-3 inline-flex min-h-[42px] items-center rounded-full bg-ink-900 px-5 text-xs font-extrabold text-white"
            >
              Upload your first property →
            </Link>
          </div>
        )}

        <StepFooterActions
          canGoBack={step > 0}
          onBack={() => setStep(Math.max(0, step - 1))}
          isLastStep={step === APPLY_STEPS.length - 1}
          nextLabel="Continue"
          submitLabel={
            existing?.status === 'needs_correction'
              ? 'Resubmit verification'
              : 'Submit identity verification'
          }
          busy={busy}
          busyLabel="Submitting…"
        />
      </form>
    </section>
  );
}
