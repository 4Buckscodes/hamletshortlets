'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { Upload, Star, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { LAGOS_AREAS } from '@/lib/areas';
import { calculateGuestPricing, guestFacingNightlyNgn } from '@/lib/pricing';
import { useCurrency } from '@/lib/currency';
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

export interface PropertyWizardValues {
  title: string;
  propertyType: string;
  area: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  capacity: number;
  bedSetup: string;
  imageUrls: string[];
  amenities: string[];
  houseRulesText: string;
  nightlyRate: number;
  cleaningFee: number;
  deposit: number;
  firstAvailableDate: string;
  calendarResponsiblePerson: string;
  submittedRole: string;
  authorityBasis: string;
  correctionNote: string;
}

const DEFAULT_VALUES: PropertyWizardValues = {
  title: '',
  propertyType: 'Apartment',
  area: 'Victoria Island',
  address: '',
  bedrooms: 2,
  bathrooms: 2,
  capacity: 4,
  bedSetup: '2 queen beds',
  imageUrls: [],
  amenities: ['24/7 Estate Power', 'Fibre Wi-Fi', 'Air Conditioning', 'Gated Security'],
  houseRulesText: 'No smoking indoors\nNo unauthorised parties or events',
  nightlyRate: 120000,
  cleaningFee: 25000,
  deposit: 100000,
  firstAvailableDate: '',
  calendarResponsiblePerson: '',
  submittedRole: 'Property owner',
  authorityBasis: '',
  correctionNote: '',
};

const WIZARD_STEPS = [
  {
    id: 'basics',
    title: 'Property basics & Lagos location',
    shortLabel: '1. Basics',
    description: 'Set the listing title, stay type, Lagos corridor and public area description.',
  },
  {
    id: 'space',
    title: 'Rooms & guest capacity',
    shortLabel: '2. Space',
    description: 'Tell guests how many bedrooms, bathrooms and sleeping spaces are available.',
  },
  {
    id: 'photos',
    title: 'Property photos & cover order',
    shortLabel: '3. Photos',
    description: 'Upload clear JPEG/PNG/WebP photos directly or paste HTTPS image links.',
  },
  {
    id: 'amenities',
    title: 'Amenities & house rules',
    shortLabel: '4. Amenities',
    description: 'Select on-site amenities and set clear stay rules.',
  },
  {
    id: 'pricing',
    title: 'Pricing & guest total preview',
    shortLabel: '5. Pricing',
    description: 'Enter your owner base rate (B) in NGN and preview what guests see.',
  },
  {
    id: 'availability',
    title: 'Availability & calendar owner',
    shortLabel: '6. Calendar',
    description: 'Set the earliest available check-in date and who confirms requests.',
  },
  {
    id: 'authority',
    title: 'Authority & final review',
    shortLabel: '7. Submit',
    description: 'Declare your authority to list (stored as self-reported until reviewed) and submit.',
  },
] as const;

const PROPERTY_TYPES = ['Apartment', 'Studio', 'Penthouse', 'Duplex', 'Terrace', 'Maisonette', 'Villa'];

const AMENITY_PRESETS = [
  '24/7 Estate Power',
  'Inverter Backup',
  'Fibre Wi-Fi',
  'Dedicated Workspace',
  'Air Conditioning',
  'Fitted Kitchen',
  'Gated Security',
  'Secure Parking',
  'Swimming Pool',
  'Gym Access',
  'Smart TV',
  'Washing Machine',
];

const AUTHORITY_ROLES = [
  {
    value: 'Property owner',
    label: 'Direct property owner',
    description: 'I hold title or deed to this property.',
  },
  {
    value: 'Authorised manager',
    label: 'Authorised property manager',
    description: 'I hold a signed management mandate from the property owner.',
  },
  {
    value: 'Multi-property operator',
    label: 'Shortlet operator / lessee',
    description: 'I operate this unit under a valid shortlet lease or corporate agreement.',
  },
] as const;

export function PropertyListingWizard({
  mode,
  propertyId,
  initialValues,
  adminReviewNote,
  currentStatus,
  onCompleted,
}: {
  mode: 'create' | 'edit';
  propertyId?: string;
  initialValues?: Partial<PropertyWizardValues>;
  adminReviewNote?: string | null;
  currentStatus?: string;
  onCompleted?: () => void;
}) {
  const db = useMemo(() => getBrowserSupabase(), []);
  const { formatPrice, formatCautionDeposit } = useCurrency();

  const mergedInitial = useMemo(
    () => ({ ...DEFAULT_VALUES, ...initialValues }),
    [initialValues],
  );

  const storageKey =
    mode === 'edit' && propertyId
      ? `hamlet:property-wizard:edit:${propertyId}`
      : 'hamlet:property-wizard:new:v2';

  const {
    values,
    setValues,
    step,
    setStep,
    hydrated,
    hasSavedDraft,
    lastSavedAt,
    clearDraft,
  } = useProgressiveDraft<PropertyWizardValues>({
    storageKey,
    initialValues: mergedInitial,
    initialStep: 0,
  });

  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Check potential duplicate title + area as user completes Step 1
  useEffect(() => {
    const timer = window.setTimeout(async () => {
      if (!db || values.title.trim().length < 8) {
        setDuplicateWarning('');
        return;
      }
      const { data } = await db
        .from('properties')
        .select('id,title,area')
        .eq('area', values.area)
        .ilike('title', values.title.trim())
        .limit(2);
      const conflict = (data ?? []).find(row => row.id !== propertyId);
      if (conflict) {
        setDuplicateWarning(
          `Heads up: another listing in ${values.area} already uses a very similar title ("${conflict.title}"). Make sure this is not a duplicate submission.`,
        );
      } else {
        setDuplicateWarning('');
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [db, propertyId, values.area, values.title]);

  const samplePricing = useMemo(() => {
    const cleanFee = Math.max(0, Math.round(Number(values.cleaningFee) || 0));
    return calculateGuestPricing({
      accommodationSubtotal: Math.max(0, Math.round(Number(values.nightlyRate) || 0)) * 3,
      mandatoryCharges:
        cleanFee > 0 ? [{ label: 'Cleaning fee', amount: cleanFee }] : [],
      refundableDeposit: Math.max(0, Math.round(Number(values.deposit) || 0)),
    });
  }, [values.cleaningFee, values.deposit, values.nightlyRate]);

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!files.length) return;
    if (!db) {
      setError('Storage upload is not configured on this deployment.');
      return;
    }

    setError('');
    setUploading(true);
    setUploadStatus(`Uploading ${files.length} photo${files.length === 1 ? '' : 's'}…`);

    try {
      const { data: sessionData } = await db.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) {
        throw new Error('Sign in with your approved partner account before uploading photos.');
      }

      const uploadedUrls: string[] = [];
      for (const file of files) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
          throw new Error(`"${file.name}" must be JPEG, PNG or WebP.`);
        }
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`"${file.name}" exceeds the 5 MB limit.`);
        }
        const safeName = file.name
          .toLowerCase()
          .replace(/[^a-z0-9._-]+/g, '-')
          .slice(0, 60);
        const objectPath = `${userId}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 7)}-${safeName}`;

        const { error: uploadError } = await db.storage
          .from('property-media')
          .upload(objectPath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        const { data: pub } = db.storage.from('property-media').getPublicUrl(objectPath);
        if (pub?.publicUrl) {
          uploadedUrls.push(pub.publicUrl);
        }
      }

      setValues(prev => ({
        ...prev,
        imageUrls: [...prev.imageUrls, ...uploadedUrls].slice(0, 12),
      }));
      setUploadStatus(
        `Uploaded ${uploadedUrls.length} photo${uploadedUrls.length === 1 ? '' : 's'}.`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Photo upload failed. You can retry or paste an HTTPS image link below.',
      );
      setUploadStatus('');
    } finally {
      setUploading(false);
    }
  }

  function addPhotoUrl() {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'https:') {
        setError('Photo links must start with https://');
        return;
      }
      setValues(prev => ({
        ...prev,
        imageUrls: prev.imageUrls.includes(trimmed)
          ? prev.imageUrls
          : [...prev.imageUrls, trimmed].slice(0, 12),
      }));
      setUrlInput('');
      setError('');
    } catch {
      setError('Enter a valid HTTPS photo URL.');
    }
  }

  function makeCoverPhoto(idx: number) {
    setValues(prev => {
      const next = [...prev.imageUrls];
      const [picked] = next.splice(idx, 1);
      if (picked) next.unshift(picked);
      return { ...prev, imageUrls: next };
    });
  }

  function removePhoto(idx: number) {
    setValues(prev => ({
      ...prev,
      imageUrls: prev.imageUrls.filter((_, i) => i !== idx),
    }));
  }

  function validateCurrentStep(targetStep: number, forDraft = false): string | null {
    if (targetStep === 0) {
      if (values.title.trim().length < 8) {
        return 'Enter a clear listing title with at least 8 characters.';
      }
      if (values.address.trim().length < 10) {
        return 'Describe the public street, estate or landmark in at least 10 characters.';
      }
    }
    if (targetStep === 1) {
      if (values.capacity < 1 || values.capacity > 50) {
        return 'Guest capacity must be between 1 and 50.';
      }
    }
    if (targetStep === 2 && !forDraft) {
      if (values.imageUrls.length < 1) {
        return 'Upload or add at least 1 property photo before continuing (or click Save as draft).';
      }
    }
    if (targetStep === 4) {
      if (!Number.isFinite(values.nightlyRate) || values.nightlyRate < 1000) {
        return 'Enter a valid owner nightly base rate in NGN.';
      }
    }
    if (targetStep === 6 && !forDraft) {
      if (values.authorityBasis.trim().length < 9) {
        return 'Briefly explain your ownership or management mandate (at least 9 characters).';
      }
    }
    return null;
  }

  async function submitListing(saveAsDraft: boolean) {
    setError('');
    setMessage('');

    const stepCheck =
      validateCurrentStep(0, saveAsDraft) ||
      validateCurrentStep(1, saveAsDraft) ||
      validateCurrentStep(2, saveAsDraft) ||
      validateCurrentStep(4, saveAsDraft) ||
      validateCurrentStep(6, saveAsDraft);

    if (stepCheck) {
      setError(stepCheck);
      return;
    }

    if (!db) {
      setError('Partner submissions are not configured on this deployment.');
      return;
    }

    setBusy(true);
    try {
      const { data: sessionData } = await db.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        window.location.assign('/signin?next=/partners');
        return;
      }

      const houseRules = values.houseRulesText
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);

      const response = await fetch('/api/partner/properties', {
        method: mode === 'edit' ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          propertyId,
          saveAsDraft,
          title: values.title,
          propertyType: values.propertyType,
          area: values.area,
          address: values.address,
          bedrooms: values.bedrooms,
          bathrooms: values.bathrooms,
          capacity: values.capacity,
          bedSetup: values.bedSetup,
          imageUrls: values.imageUrls,
          amenities: values.amenities,
          houseRules,
          nightlyRate: Math.round(Number(values.nightlyRate)),
          cleaningFee: Math.round(Number(values.cleaningFee || 0)),
          deposit: Math.round(Number(values.deposit || 0)),
          firstAvailableDate: values.firstAvailableDate,
          calendarResponsiblePerson: values.calendarResponsiblePerson,
          submittedRole: values.submittedRole,
          authorityBasis: values.authorityBasis,
          correctionNote: values.correctionNote,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || 'We could not save this listing.');
      }

      clearDraft();
      setMessage(
        payload.message ||
          (saveAsDraft
            ? 'Draft saved to your partner workspace.'
            : 'Listing submitted for HAMLET review.'),
      );
      onCompleted?.();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not save this listing.',
      );
    } finally {
      setBusy(false);
    }
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (step < WIZARD_STEPS.length - 1) {
      const err = validateCurrentStep(step, false);
      if (err) {
        setError(err);
        return;
      }
      setStep(step + 1);
      return;
    }

    void submitListing(false);
  }

  return (
    <div className="rounded-3xl border border-ink-100 bg-white p-6 shadow-xs sm:p-8">
      {/* Admin Correction Feedback Banner */}
      {adminReviewNote && (
        <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" />
            <span>HAMLET review feedback ({currentStatus || 'needs_correction'}):</span>
          </div>
          <p className="m-0 mt-1.5 whitespace-pre-wrap">{adminReviewNote}</p>
        </div>
      )}

      {hydrated && mode === 'create' && (
        <DraftStatusBar
          hasSavedDraft={hasSavedDraft}
          lastSavedAt={lastSavedAt}
          onClearDraft={clearDraft}
        />
      )}

      <StepProgressHeader
        steps={WIZARD_STEPS}
        currentStep={step}
        onSelectStep={idx => setStep(idx)}
        maxCompletedStep={mode === 'edit' ? WIZARD_STEPS.length - 1 : step}
      />

      <form onSubmit={handleFormSubmit} className="space-y-5">
        {/* STEP 1: BASICS & LOCATION */}
        {step === 0 && (
          <div className="space-y-4">
            <FormField
              label="Listing title"
              hint="Clear, factual description — e.g. 'Bright 2-Bedroom Apartment off Admiralty Way'."
            >
              {fieldProps => (
                <input
                  {...fieldProps}
                  required
                  minLength={8}
                  maxLength={120}
                  value={values.title}
                  onChange={e =>
                    setValues(prev => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="e.g. Modern 2-Bedroom Apartment in Yaba"
                  className={FIELD_INPUT_CLASS}
                />
              )}
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Property type">
                {fieldProps => (
                  <select
                    {...fieldProps}
                    value={values.propertyType}
                    onChange={e =>
                      setValues(prev => ({
                        ...prev,
                        propertyType: e.target.value,
                      }))
                    }
                    className={FIELD_INPUT_CLASS}
                  >
                    {PROPERTY_TYPES.map(pt => (
                      <option key={pt} value={pt}>
                        {pt}
                      </option>
                    ))}
                  </select>
                )}
              </FormField>

              <FormField label="Lagos neighbourhood">
                {fieldProps => (
                  <select
                    {...fieldProps}
                    value={values.area}
                    onChange={e =>
                      setValues(prev => ({ ...prev, area: e.target.value }))
                    }
                    className={FIELD_INPUT_CLASS}
                  >
                    {LAGOS_AREAS.map(area => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                )}
              </FormField>
            </div>

            <FormField
              label="Public street, estate or landmark summary"
              hint="Shown publicly on the listing card (do not put door codes or private flat numbers here)."
            >
              {fieldProps => (
                <input
                  {...fieldProps}
                  required
                  minLength={10}
                  maxLength={240}
                  value={values.address}
                  onChange={e =>
                    setValues(prev => ({ ...prev, address: e.target.value }))
                  }
                  placeholder="e.g. Off Herbert Macaulay Way, Alagomeji, Yaba, Lagos"
                  className={FIELD_INPUT_CLASS}
                />
              )}
            </FormField>

            {duplicateWarning && (
              <p className="m-0 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs font-medium text-amber-900">
                {duplicateWarning}
              </p>
            )}
          </div>
        )}

        {/* STEP 2: SPACE & CAPACITY */}
        {step === 1 && (
          <div className="space-y-3">
            <StepperCounter
              label="Bedrooms"
              hint="Set 0 for an open-plan studio."
              value={values.bedrooms}
              min={0}
              max={20}
              onChange={n => setValues(prev => ({ ...prev, bedrooms: n }))}
            />
            <StepperCounter
              label="Bathrooms"
              value={values.bathrooms}
              min={1}
              max={20}
              onChange={n => setValues(prev => ({ ...prev, bathrooms: n }))}
            />
            <StepperCounter
              label="Maximum guests"
              hint="Include adults and children."
              value={values.capacity}
              min={1}
              max={30}
              onChange={n => setValues(prev => ({ ...prev, capacity: n }))}
            />

            <FormField label="Bed arrangement" optional>
              {fieldProps => (
                <input
                  {...fieldProps}
                  maxLength={120}
                  value={values.bedSetup}
                  onChange={e =>
                    setValues(prev => ({ ...prev, bedSetup: e.target.value }))
                  }
                  placeholder="e.g. 1 king bed, 1 queen bed"
                  className={FIELD_INPUT_CLASS}
                />
              )}
            </FormField>
          </div>
        )}

        {/* STEP 3: PHOTOS */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-dashed border-ink-200 bg-paper p-5 text-center">
              <Upload className="mx-auto h-6 w-6 text-brass-600" />
              <p className="m-0 mt-2 text-sm font-bold text-ink-900">
                Upload property photos (JPEG, PNG or WebP · max 5 MB each)
              </p>
              <p className="m-0 mt-1 text-xs text-ink-500">
                Photos render at full natural clarity. Your first photo becomes the listing cover.
              </p>
              <label className="primary-button mt-4 inline-flex cursor-pointer">
                <span>{uploading ? 'Uploading…' : 'Choose photos from device'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={uploading}
                  onChange={e => void handleFileUpload(e)}
                  className="sr-only"
                />
              </label>
              {uploadStatus && (
                <p className="m-0 mt-2 text-xs font-semibold text-emerald-700">
                  {uploadStatus}
                </p>
              )}
            </div>

            {/* Optional HTTPS URL fallback */}
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder="Or paste an https:// photo URL…"
                className={`${FIELD_INPUT_CLASS} flex-1`}
              />
              <button
                type="button"
                onClick={addPhotoUrl}
                className="secondary-button min-h-[48px] shrink-0"
              >
                Add URL
              </button>
            </div>

            {values.imageUrls.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {values.imageUrls.map((url, idx) => (
                  <div
                    key={`${url}-${idx}`}
                    className="overflow-hidden rounded-2xl border border-ink-200 bg-white"
                  >
                    <div className="relative aspect-[4/3] bg-ink-100">
                      <img
                        src={url}
                        alt={`Property photo ${idx + 1}`}
                        className="h-full w-full object-cover opacity-100"
                      />
                      {idx === 0 && (
                        <span className="absolute left-2 top-2 rounded-full bg-ink-950/85 px-2.5 py-0.5 text-[10px] font-bold text-white">
                          Cover photo
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-1 p-2">
                      {idx > 0 ? (
                        <button
                          type="button"
                          onClick={() => makeCoverPhoto(idx)}
                          className="inline-flex min-h-[34px] cursor-pointer items-center gap-1 rounded-lg px-2 text-[11px] font-bold text-ink-700 hover:bg-paper"
                        >
                          <Star className="h-3 w-3 shrink-0" />
                          Make cover
                        </button>
                      ) : (
                        <span className="px-2 text-[11px] font-semibold text-emerald-700">
                          Primary
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        aria-label={`Remove photo ${idx + 1}`}
                        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5 shrink-0" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 4: AMENITIES & HOUSE RULES */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-sm font-bold text-ink-900">
                Select available amenities
              </p>
              <ChipMultiSelect
                options={AMENITY_PRESETS}
                selected={values.amenities}
                onChange={next => setValues(prev => ({ ...prev, amenities: next }))}
              />
            </div>

            <FormField
              label="House rules"
              optional
              hint="Enter one rule per line (shown to guests before requesting dates)."
            >
              {fieldProps => (
                <textarea
                  {...fieldProps}
                  rows={4}
                  value={values.houseRulesText}
                  onChange={e =>
                    setValues(prev => ({
                      ...prev,
                      houseRulesText: e.target.value,
                    }))
                  }
                  className={`${FIELD_INPUT_CLASS} resize-y`}
                />
              )}
            </FormField>
          </div>
        )}

        {/* STEP 5: PRICING & GUEST PREVIEW */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                label="Owner nightly base rate (NGN)"
                hint="0% owner fee — you keep 100% of B."
              >
                {fieldProps => (
                  <input
                    {...fieldProps}
                    required
                    type="number"
                    inputMode="numeric"
                    min={1000}
                    step={500}
                    value={values.nightlyRate}
                    onChange={e =>
                      setValues(prev => ({
                        ...prev,
                        nightlyRate: Number(e.target.value),
                      }))
                    }
                    className={FIELD_INPUT_CLASS}
                  />
                )}
              </FormField>

              <FormField label="Cleaning fee (NGN)" optional>
                {fieldProps => (
                  <input
                    {...fieldProps}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={500}
                    value={values.cleaningFee}
                    onChange={e =>
                      setValues(prev => ({
                        ...prev,
                        cleaningFee: Number(e.target.value),
                      }))
                    }
                    className={FIELD_INPUT_CLASS}
                  />
                )}
              </FormField>

              <FormField
                label="Refundable caution deposit (NGN)"
                optional
                hint="0% markup · held separately."
              >
                {fieldProps => (
                  <input
                    {...fieldProps}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1000}
                    value={values.deposit}
                    onChange={e =>
                      setValues(prev => ({
                        ...prev,
                        deposit: Number(e.target.value),
                      }))
                    }
                    className={FIELD_INPUT_CLASS}
                  />
                )}
              </FormField>
            </div>

            {/* Live Central Pricing Preview */}
            <div className="rounded-2xl border border-ink-200 bg-paper p-4 text-xs">
              <p className="m-0 font-extrabold uppercase tracking-wider text-brass-700">
                Live pricing preview (sample 3-night stay)
              </p>
              <div className="mt-3 space-y-1.5 text-ink-700">
                <div className="flex justify-between">
                  <span>Your net owner payout (3 nights · 0% owner fee)</span>
                  <strong className="font-mono text-ink-900">
                    ₦{samplePricing.ownerListedPriceNgn.toLocaleString('en-NG')}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Guest-facing nightly stay rate</span>
                  <strong className="font-mono text-ink-900">
                    {formatPrice(guestFacingNightlyNgn(values.nightlyRate || 0))} / night
                  </strong>
                </div>
                <div className="flex justify-between border-t border-ink-200 pt-2 text-sm font-bold text-ink-900">
                  <span>Sample 3-night guest stay total</span>
                  <span className="font-mono">
                    {formatPrice(samplePricing.guestTotal)}
                  </span>
                </div>
                {samplePricing.refundableDeposit > 0 && (
                  <div className="flex justify-between text-ink-500">
                    <span>Separate refundable caution deposit (0% markup)</span>
                    <span className="font-mono">
                      {formatCautionDeposit(samplePricing.refundableDeposit)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: AVAILABILITY */}
        {step === 5 && (
          <div className="space-y-4">
            <FormField
              label="Earliest available check-in date"
              optional
              hint="Leave blank if the property is ready immediately once approved."
            >
              {fieldProps => (
                <input
                  {...fieldProps}
                  type="date"
                  value={values.firstAvailableDate}
                  onChange={e =>
                    setValues(prev => ({
                      ...prev,
                      firstAvailableDate: e.target.value,
                    }))
                  }
                  className={FIELD_INPUT_CLASS}
                />
              )}
            </FormField>

            <FormField
              label="Person responsible for confirming calendar requests"
              optional
              hint="Helps HAMLET operations know who verifies date holds."
            >
              {fieldProps => (
                <input
                  {...fieldProps}
                  maxLength={120}
                  value={values.calendarResponsiblePerson}
                  onChange={e =>
                    setValues(prev => ({
                      ...prev,
                      calendarResponsiblePerson: e.target.value,
                    }))
                  }
                  placeholder="e.g. Tunde Adeyemi (Operations Lead)"
                  className={FIELD_INPUT_CLASS}
                />
              )}
            </FormField>
          </div>
        )}

        {/* STEP 7: AUTHORITY & REVIEW */}
        {step === 6 && (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-bold text-ink-900">
                Your relationship to this property
              </p>
              <OptionCardGroup
                ariaLabel="Submitted partner role"
                options={AUTHORITY_ROLES}
                value={values.submittedRole}
                onChange={role =>
                  setValues(prev => ({ ...prev, submittedRole: role }))
                }
              />
            </div>

            <FormField
              label="Authority & verification summary"
              hint="Recorded honestly as self-reported until HAMLET operations reviews supporting evidence."
            >
              {fieldProps => (
                <textarea
                  {...fieldProps}
                  required
                  minLength={9}
                  maxLength={600}
                  rows={3}
                  value={values.authorityBasis}
                  onChange={e =>
                    setValues(prev => ({
                      ...prev,
                      authorityBasis: e.target.value,
                    }))
                  }
                  placeholder="e.g. Direct owner with C of O / signed 12-month shortlet management mandate from property owner."
                  className={`${FIELD_INPUT_CLASS} resize-y`}
                />
              )}
            </FormField>

            {mode === 'edit' && (
              <FormField
                label="What did you update?"
                optional
                hint="Shared with the HAMLET reviewer when resubmitting."
              >
                {fieldProps => (
                  <input
                    {...fieldProps}
                    maxLength={400}
                    value={values.correctionNote}
                    onChange={e =>
                      setValues(prev => ({
                        ...prev,
                        correctionNote: e.target.value,
                      }))
                    }
                    placeholder="e.g. Uploaded clearer living room photos and updated estate address"
                    className={FIELD_INPUT_CLASS}
                  />
                )}
              </FormField>
            )}

            {/* Concise Review Summary */}
            <div className="rounded-2xl border border-ink-100 bg-paper p-4 text-xs leading-relaxed text-ink-700">
              <p className="m-0 font-bold text-ink-900">
                {values.title || 'Untitled listing'} · {values.area}
              </p>
              <p className="m-0 mt-1">
                {values.propertyType} · {values.bedrooms} bd · {values.bathrooms} ba · up to{' '}
                {values.capacity} guests · {values.imageUrls.length} photo
                {values.imageUrls.length === 1 ? '' : 's'}
              </p>
              <p className="m-0 mt-1">
                Owner base rate: <strong>₦{Number(values.nightlyRate || 0).toLocaleString('en-NG')}/night</strong> ·
                Cleaning: <strong>₦{Number(values.cleaningFee || 0).toLocaleString('en-NG')}</strong> ·
                Caution deposit: <strong>₦{Number(values.deposit || 0).toLocaleString('en-NG')}</strong>
              </p>
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
          <div
            role="status"
            className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
            <span>{message}</span>
          </div>
        )}

        <StepFooterActions
          canGoBack={step > 0}
          onBack={() => setStep(Math.max(0, step - 1))}
          isLastStep={step === WIZARD_STEPS.length - 1}
          nextLabel="Save & continue"
          submitLabel={
            mode === 'edit'
              ? 'Save & resubmit for review'
              : 'Submit for HAMLET review'
          }
          busy={busy}
          busyLabel="Saving listing…"
          secondaryAction={
            (!currentStatus || currentStatus === 'draft') ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void submitListing(true)}
                className="secondary-button min-h-[48px]"
              >
                Save as draft
              </button>
            ) : undefined
          }
        />
      </form>
    </div>
  );
}
