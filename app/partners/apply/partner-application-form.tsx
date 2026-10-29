'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { LAGOS_AREAS } from '@/lib/areas';
import { getBrowserSupabase } from '@/lib/next-supabase';
import {
  ChipMultiSelect,
  DraftStatusBar,
  FormField,
  OptionCardGroup,
  StepFooterActions,
  StepProgressHeader,
  StepperCounter,
  useProgressiveDraft,
  FIELD_INPUT_CLASS,
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
  areas: ['Victoria Island'],
  propertiesCount: 1,
  authoritySummary: '',
  payoutBank: '',
  payoutAccountName: '',
  confirmAccuracy: false,
  confirmAuthority: false,
  confirmReviewConsent: false,
};

const ROLE_OPTIONS = [
  {
    value: 'Property owner',
    label: 'Property owner',
    badge: '0% owner fee',
    description: 'I own one or more shortlet apartments or homes. I can also close eligible bookings for other properties and introduce new partners.',
  },
  {
    value: 'Authorised manager',
    label: 'Authorised property manager',
    description: 'I manage properties under an owner mandate. I can also close eligible bookings and introduce new partners.',
  },
  {
    value: 'Multi-property operator',
    label: 'Multi-property operator',
    description: 'I operate a portfolio of serviced apartments. I can also close eligible bookings and introduce new partners.',
  },
  {
    value: 'Closing agent',
    label: 'Closing agent',
    badge: '10% booking commission',
    description: 'I help guests book stays across HAMLET, including properties I do not own. I can also introduce new partners and earn eligible referral rewards.',
  },
] as const;

const APPLY_STEPS = [
  {
    id: 'role',
    title: 'How will you work with HAMLET?',
    shortLabel: '1. Role',
    description: 'Tell us your main role so we know who you are and how to contact and support you. It does not limit your earning opportunities.'
  },
  {
    id: 'contact',
    title: 'Contact & business details',
    shortLabel: '2. Contact',
    description: 'Tell us how HAMLET operations can reach you.',
  },
  {
    id: 'focus',
    title: 'Lagos corridors & scope',
    shortLabel: '3. Lagos focus',
    description: 'Select the Lagos Island or Mainland neighbourhoods you cover.',
  },
  {
    id: 'verification',
    title: 'Optional background',
    shortLabel: '4. Background',
    description: 'Add context about your network or property authority if you wish. You can verify your identity later from your dashboard.',
  },
  {
    id: 'payout',
    title: 'Settlement & payout details',
    shortLabel: '5. Payout',
    description: 'Optional settlement bank preference for future approved disbursements.',
  },
  {
    id: 'declarations',
    title: 'Review & declarations',
    shortLabel: '6. Submit',
    description: 'Confirm HAMLET’s marketplace standards and submit for review.',
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
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
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

    const urlRef = new URLSearchParams(window.location.search).get('ref');
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

    const [{ data: profile }, { data: apps }] = await Promise.all([
      db.from('profiles').select('role,full_name,phone,company').eq('id', user.id).maybeSingle(),
      db
        .from('partner_applications')
        .select(
          'id,full_name,phone,company,role,areas,properties_count,motivation,referred_by_code,status,review_note,submitted_at',
        )
        .eq('applicant_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(1),
    ]);

    setRoleState(String(profile?.role || 'guest'));
    const latest = (apps?.[0] as ExistingApp | undefined) || null;
    setExisting(latest);

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
        referralCode: latest.referred_by_code || prev.referralCode,
      }));
    } else if (profile) {
      setValues(prev => ({
        ...prev,
        fullName: prev.fullName || String(profile.full_name || ''),
        phone: prev.phone || String(profile.phone || ''),
        company: prev.company || String(profile.company || ''),
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
      const { data } = await db.rpc('resolve_referral_code', { code_input: code });
      const row = Array.isArray(data) ? data[0] : data;
      if (row && typeof row === 'object' && 'partner_name' in row) {
        setReferralResolved(
          `Referral verified: invited by ${String((row as { partner_name?: string }).partner_name || 'HAMLET partner')}`,
        );
      } else {
        setReferralResolved('Referral code not recognised — leave blank if you do not have one.');
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [db, values.referralCode]);

  function validateStep(idx: number): string | null {
    if (idx === 1) {
      if (values.fullName.trim().length < 2) return 'Enter your full name.';
      if (values.phone.trim().length < 7) return 'Enter a valid phone number.';
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
      const compiledMotivation = [
        values.authoritySummary.trim() || null,
        values.payoutBank.trim()
          ? `Preferred bank: ${values.payoutBank.trim()} (${values.payoutAccountName.trim() || values.fullName.trim()})`
          : null,
      ]
        .filter(Boolean)
        .join(' | ');

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
        setMessage('Your updated partner application has been resubmitted for review.');
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
          'Your partner application has been submitted. HAMLET operations will review your details before activating partner access.',
        );
      }

      await load();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Could not submit your partner application.',
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
        <p className="mt-2 text-sm leading-relaxed text-ink-600">
          Partner applications link directly to your authenticated HAMLET account so we can notify you and unlock your partner workspace as soon as you are approved.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/signin?mode=signup&next=%2Fpartners%2Fapply"
            className="primary-button"
          >
            Create account & continue →
          </Link>
          <Link
            href="/signin?next=%2Fpartners%2Fapply"
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
          <strong className="text-sm">Approved {roleState} account</strong>
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
        <span className="inline-flex rounded-full bg-paper px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-brass-700">
          Application status: {existing.status}
        </span>
        <h2 className="serif mt-3 text-2xl font-medium text-ink-900">
          {existing.company} · {existing.role}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">
          Submitted {new Date(existing.submitted_at).toLocaleDateString('en-NG')}. HAMLET operations reviews every application manually before enabling partner permissions.
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
            <span>Correction requested on your partner application</span>
          </div>
          <p className="m-0 mt-1">
            {existing.review_note ||
              'Please review and update your application details below, then resubmit.'}
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

      <form onSubmit={handleSubmit} className="space-y-5">
        {step === 0 && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-brass-200 bg-paper p-4 text-sm leading-relaxed text-ink-800">
              <p className="m-0 font-bold text-ink-900">One partner account. Multiple ways to earn.</p>
              <p className="m-0 mt-1">
                Once approved, you can earn eligible closing-agent commission on bookings you close across HAMLET, including for properties you do not own, and partner-referral rewards for eligible activity from partners you introduce. Property owners and managers can participate in these earning streams without creating another account. Rewards follow booking attribution, eligibility, and payout rules.
              </p>
            </div>
            <OptionCardGroup
              ariaLabel="Your main partner role"
              options={ROLE_OPTIONS}
              value={values.role}
              onChange={role => setValues(prev => ({ ...prev, role }))}
            />
            <p className="m-0 text-xs leading-relaxed text-ink-600">
              Your selected role describes your main work; it does not lock your account to that role. Eligible partners can close bookings across the marketplace and introduce new partners without signing up again.
            </p>
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
              hint={referralResolved || 'Enter a code if an approved HAMLET partner invited you.'}
            >
              {fieldProps => (
                <input
                  {...fieldProps}
                  maxLength={32}
                  value={values.referralCode}
                  onChange={e =>
                    setValues(prev => ({
                      ...prev,
                      referralCode: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="Optional code"
                  className={`${FIELD_INPUT_CLASS} font-mono uppercase`}
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
                label="How many Lagos properties do you plan to list?"
                hint="You will add individual property details after your partner account is approved."
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
            <div className="rounded-2xl border border-ink-100 bg-paper p-4 text-sm leading-relaxed text-ink-700">
              <p className="m-0 font-bold text-ink-900">Identity verification can wait</p>
              <p className="m-0 mt-1">
                You can submit your initial partner application without providing an ID or explaining your network. Your dashboard will show your current partner level and how to request verification when you are ready. Restricted activities will still require the relevant checks.
              </p>
            </div>
            <FormField
              label={
                isInventoryRole
                  ? 'Ownership or management background'
                  : 'Guest booking or partner referral network in Lagos'
              }
              optional
              hint="Optional. You can leave this blank and add details later."
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
                  placeholder={
                    isInventoryRole
                      ? 'Optional: share a little about your properties or management experience…'
                      : 'Optional: share how you connect guests, property owners or other partners…'
                  }
                  className={`${FIELD_INPUT_CLASS} resize-y`}
                />
              )}
            </FormField>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <p className="m-0 text-xs leading-relaxed text-ink-500">
              Optional at application stage: share your preferred Nigerian settlement bank name and account title so operations can match future approved payouts.
            </p>
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
                  I confirm that the identity and contact information provided in this application are accurate.
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
                  I understand HAMLET reviews all partner accounts and listings manually before publication.
                </span>
              </label>
            </div>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="m-0 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-800"
          >
            {error}
          </p>
        )}

        {message && (
          <p
            role="status"
            className="m-0 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800"
          >
            {message}
          </p>
        )}

        <StepFooterActions
          canGoBack={step > 0}
          onBack={() => setStep(Math.max(0, step - 1))}
          isLastStep={step === APPLY_STEPS.length - 1}
          nextLabel="Continue"
          submitLabel={
            existing?.status === 'needs_correction'
              ? 'Resubmit application'
              : 'Submit partner application'
          }
          busy={busy}
          busyLabel="Submitting…"
        />
      </form>
    </section>
  );
}
