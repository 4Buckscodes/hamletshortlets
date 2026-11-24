'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { HoratioListingAssistant } from './HoratioListingAssistant';
import { StayVideo } from '@/components/site/StayVideo';
import { ISLAND_AND_LEKKI_AREAS, MAINLAND_AREAS } from '@/lib/areas';
import {
  APPROVED_OWNER_SERVICES_POLICY_COPY,
  calculateGuestPricing,
  DEFAULT_PROPERTY_MEDIA_POLICY,
  guestFacingNightlyNgn,
} from '@/lib/pricing';
import { getBrowserSupabase } from '@/lib/next-supabase';
import { parseYouTubeVideoId } from '@/lib/youtube';
import {
  deletePropertyMediaObjects,
  extractPropertyMediaObjectPath,
} from '@/lib/imageOptimiser';
import {
  PropertyMediaManager,
  type MediaUploadActivityState,
} from '@/components/forms/PropertyMediaManager';
import {
  ChipMultiSelect,
  DraftStatusBar,
  FormField,
  OptionCardGroup,
  StepFooterActions,
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
  youtubeUrl: string;
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

export interface PropertySubmissionResult {
  title: string;
  area: string;
  savedAsDraft: boolean;
  message: string;
  values: PropertyWizardValues;
}

/** Owner-level details that stay the same across the apartments one partner lists in a row. */
export function carryOverOwnerDetails(values: PropertyWizardValues): Partial<PropertyWizardValues> {
  return {
    submittedRole: values.submittedRole,
    authorityBasis: values.authorityBasis,
    calendarResponsiblePerson: values.calendarResponsiblePerson,
  };
}

/**
 * Starting point for "add a similar unit" (e.g. another flat in the same building).
 * Never copies identity-bearing or media fields: title, address, photos and availability
 * stay blank so each listing is verified, duplicate-screened and photographed on its own,
 * and removing one listing's photos can never touch another's.
 */
export function similarUnitStarter(values: PropertyWizardValues): Partial<PropertyWizardValues> {
  return {
    ...carryOverOwnerDetails(values),
    propertyType: values.propertyType,
    area: values.area,
    bedrooms: values.bedrooms,
    bathrooms: values.bathrooms,
    capacity: values.capacity,
    bedSetup: values.bedSetup,
    amenities: [...values.amenities],
    houseRulesText: values.houseRulesText,
    nightlyRate: values.nightlyRate,
    cleaningFee: values.cleaningFee,
    deposit: values.deposit,
  };
}

const DEFAULT_VALUES: PropertyWizardValues = {
  title: '',
  propertyType: 'Apartment',
  area: '',
  address: '',
  bedrooms: 1,
  bathrooms: 1,
  capacity: 2,
  bedSetup: '',
  imageUrls: [],
  youtubeUrl: '',
  amenities: [],
  houseRulesText: '',
  nightlyRate: 0,
  cleaningFee: 0,
  deposit: 0,
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
    description:
      'Upload camera photos directly from your phone or computer — HAMLET automatically optimises, orients, and converts them.',
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
  {
    value: 'Closing agent',
    label: 'Closing agent for the owner',
    description: 'I have the owner’s written permission to list this property and close bookings for it.',
  },
] as const;

export function PropertyListingWizard({
  mode,
  propertyId,
  initialValues,
  adminReviewNote,
  currentStatus,
  onCompleted,
  onSubmitted,
}: {
  mode: 'create' | 'edit';
  propertyId?: string;
  initialValues?: Partial<PropertyWizardValues>;
  adminReviewNote?: string | null;
  currentStatus?: string;
  onCompleted?: () => void;
  /**
   * Create mode only. When provided, it replaces `onCompleted` and receives what was just
   * saved, so a parent can keep the owner in a "list the next property" loop.
   */
  onSubmitted?: (result: PropertySubmissionResult) => void;
}) {
  const db = useMemo(() => getBrowserSupabase(), []);

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
    restoredFromStorage,
    lastSavedAt,
    clearDraft,
  } = useProgressiveDraft<PropertyWizardValues>({
    storageKey,
    initialValues: mergedInitial,
    initialStep: 0,
  });

  const initialPersistedUrls = useMemo(
    () => initialValues?.imageUrls ?? [],
    [initialValues?.imageUrls],
  );

  const [mediaActivity, setMediaActivity] = useState<MediaUploadActivityState>({
    hasActiveUploads: false,
    activeCount: 0,
    failedCount: 0,
    sessionUploadedPaths: [],
  });
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  const [message, setMessage] = useState('');
  const submittingRef = useRef(false);
  const stepHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const stepHeadingWrapRef = useRef<HTMLDivElement | null>(null);
  const errorRef = useRef<HTMLParagraphElement | null>(null);
  const firstStepRender = useRef(true);
  // Each step change brings the new step's title into view and gives it focus.
  useEffect(() => {
    if (firstStepRender.current) {
      firstStepRender.current = false;
      return;
    }
    stepHeadingWrapRef.current?.scrollIntoView({ block: 'start' });
    stepHeadingRef.current?.focus({ preventScroll: true });
  }, [step]);
  const submittedCreateOnceRef = useRef(false);

  const handleChangeImageUrls = useCallback(
    (updater: string[] | ((prev: string[]) => string[])) => {
      setValues(prev => {
        const nextUrls =
          typeof updater === 'function' ? updater(prev.imageUrls) : updater;
        return { ...prev, imageUrls: nextUrls };
      });
    },
    [setValues],
  );

  const handleDiscardDraft = useCallback(() => {
    if (mode === 'create' && mediaActivity.sessionUploadedPaths.length > 0) {
      void deletePropertyMediaObjects(db, mediaActivity.sessionUploadedPaths);
    }
    clearDraft();
  }, [clearDraft, db, mediaActivity.sessionUploadedPaths, mode]);

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


  function validateCurrentStep(targetStep: number, forDraft = false): string | null {
    if (targetStep === 0) {
      if (values.title.trim().length < 8) {
        return 'Enter a clear listing title with at least 8 characters.';
      }
      if (!values.area) {
        return 'Choose the Lagos neighbourhood the property is in.';
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
    if (targetStep === 2) {
      if (values.youtubeUrl.trim() && !parseYouTubeVideoId(values.youtubeUrl)) {
        return 'That video link is not a YouTube video. Paste a youtube.com or youtu.be link, or clear the box.';
      }
      if (mediaActivity.hasActiveUploads) {
        return 'Please wait a moment — your photographs are still optimising and uploading.';
      }
      if (!forDraft && values.imageUrls.length < 1) {
        if (mediaActivity.failedCount > 0) {
          return 'Retry your paused photograph upload or add at least 1 photo before continuing (or click Save as draft).';
        }
        return 'Upload or add at least 1 property photo before continuing (or click Save as draft).';
      }
    }
    if (targetStep === 4) {
      if (!Number.isFinite(values.nightlyRate) || values.nightlyRate < 1000) {
        return 'Enter your nightly rate in naira (at least ₦1,000).';
      }
      if (values.cleaningFee < 0 || values.deposit < 0) {
        return 'Cleaning fee and caution deposit cannot be negative. Leave them at 0 if there is none.';
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
    if (submittingRef.current) return;
    if (mode === 'create' && !saveAsDraft && submittedCreateOnceRef.current) {
      return;
    }

    setError('');
    setMessage('');

    if (mediaActivity.hasActiveUploads) {
      setError(
        'Please wait a moment — your photographs are still optimising and uploading.',
      );
      return;
    }

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

    submittingRef.current = true;
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
          youtubeUrl: values.youtubeUrl.trim(),
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

      // On successful edit, clean up any previously persisted property-media objects
      // that the owner removed from the gallery so no orphaned files linger in Storage.
      if (mode === 'edit' && initialPersistedUrls.length > 0) {
        const currentSet = new Set(values.imageUrls);
        const removedPersistedPaths = initialPersistedUrls
          .filter(oldUrl => !currentSet.has(oldUrl))
          .map(oldUrl => extractPropertyMediaObjectPath(oldUrl))
          .filter((p): p is string => Boolean(p));
        if (removedPersistedPaths.length > 0) {
          void deletePropertyMediaObjects(db, removedPersistedPaths);
        }
      }

      if (mode === 'create' && !saveAsDraft) {
        submittedCreateOnceRef.current = true;
      }

      clearDraft();
      const savedMessage =
        payload.message ||
        (saveAsDraft
          ? 'Draft saved to your partner workspace.'
          : 'Listing submitted for HAMLET review.');
      setMessage(savedMessage);
      if (mode === 'create' && onSubmitted) {
        onSubmitted({
          title: values.title.trim(),
          area: values.area,
          savedAsDraft: saveAsDraft,
          message: savedMessage,
          values,
        });
      } else {
        onCompleted?.();
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not save this listing.',
      );
    } finally {
      submittingRef.current = false;
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
          restoredFromStorage={restoredFromStorage}
          lastSavedAt={lastSavedAt}
          onClearDraft={handleDiscardDraft}
        />
      )}



      <form onSubmit={handleFormSubmit} className="space-y-5" noValidate>
        <div ref={stepHeadingWrapRef} style={{ scrollMarginTop: 96 }}>
          <p className="hm-label">
            Step {step + 1} of {WIZARD_STEPS.length}
          </p>
          <h2 ref={stepHeadingRef} tabIndex={-1} className="hm-h3" style={{ marginTop: 4, outline: 'none' }}>
            {WIZARD_STEPS[step].title}
          </h2>
        </div>
        {/* STEP 1: BASICS & LOCATION */}
        {step === 0 && (
          <div className="space-y-4">
            {mode === 'create' && (
              <HoratioListingAssistant
                onApply={draft =>
                  setValues(prev => ({ ...prev, ...draft, imageUrls: prev.imageUrls }))
                }
              />
            )}
            <FormField label="Listing title">
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
                    <option value="" disabled>
                      Choose neighbourhood
                    </option>
                    <optgroup label="Lagos Island & Lekki">
                      {ISLAND_AND_LEKKI_AREAS.map(area => (
                        <option key={area} value={area}>
                          {area}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Lagos Mainland">
                      {MAINLAND_AREAS.map(area => (
                        <option key={area} value={area}>
                          {area}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                )}
              </FormField>
            </div>

            <FormField
              label="Public street, estate or landmark summary"
              hint="Public area only — exclude door codes or flat numbers."
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

        {/* STEP 3: PHOTOS (kept mounted so active uploads/retries survive step navigation) */}
        <div className={step === 2 ? 'block' : 'hidden'} hidden={step !== 2}>
          <PropertyMediaManager
            db={db}
            imageUrls={values.imageUrls}
            initialPersistedUrls={initialPersistedUrls}
            maxImages={DEFAULT_PROPERTY_MEDIA_POLICY.maxImagesPerListing}
            onChangeImageUrls={handleChangeImageUrls}
            onActivityChange={setMediaActivity}
          />
          <div className="mt-6">
            <FormField
              label="YouTube video tour"
              optional
              hint="Have a walkthrough on YouTube? Paste the link and guests can watch it on your listing. Public or unlisted videos work."
            >
              {fieldProps => (
                <input
                  {...fieldProps}
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  value={values.youtubeUrl}
                  onChange={e =>
                    setValues(prev => ({ ...prev, youtubeUrl: e.target.value }))
                  }
                  placeholder="https://www.youtube.com/watch?v=…"
                  className={FIELD_INPUT_CLASS}
                />
              )}
            </FormField>
            {values.youtubeUrl.trim() && parseYouTubeVideoId(values.youtubeUrl) && (
              <div className="mt-3 max-w-md">
                <StayVideo
                  videoId={parseYouTubeVideoId(values.youtubeUrl) as string}
                  title={values.title || 'Your property'}
                />
              </div>
            )}
          </div>
        </div>

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
              hint="One rule per line."
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
                label="Owner agreed nightly rate (NGN)"
                hint="20% guest service fee added on guest display."
              >
                {fieldProps => (
                  <input
                    {...fieldProps}
                    required
                    type="number"
                    inputMode="numeric"
                    min={1000}
                    step={1}
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
                    step={1}
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
                hint="Excluded from stay pricing · held separately."
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

            {/* Owner pricing preview: always in naira, answering "what do I receive" first. */}
            <div className="rounded-2xl bg-paper p-4 text-sm">
              <p className="hm-label">Example: a 3-night stay</p>
              <dl className="mt-3 space-y-2 text-ink-700">
                <div className="flex justify-between gap-3 font-bold text-ink-900">
                  <dt>You receive (3 nights at your rate)</dt>
                  <dd className="hm-money m-0">₦{samplePricing.ownerAccommodationRateNgn.toLocaleString('en-NG')}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>HAMLET&apos;s 20% guest service fee, added on top</dt>
                  <dd className="hm-money m-0">₦{samplePricing.guestServiceFeeNgn.toLocaleString('en-NG')}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Guests see per night (fee included)</dt>
                  <dd className="hm-money m-0">₦{guestFacingNightlyNgn(values.nightlyRate || 0).toLocaleString('en-NG')}</dd>
                </div>
                {samplePricing.mandatoryChargesTotal > 0 && (
                  <div className="flex justify-between gap-3">
                    <dt>Cleaning and turnover, shown separately</dt>
                    <dd className="hm-money m-0">₦{samplePricing.mandatoryChargesTotal.toLocaleString('en-NG')}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-3 border-t border-ink-200 pt-2 font-bold text-ink-900">
                  <dt>Guest pays for these 3 nights</dt>
                  <dd className="hm-money m-0">₦{samplePricing.guestFacingTotalNgn.toLocaleString('en-NG')}</dd>
                </div>
                {samplePricing.refundableDeposit > 0 && (
                  <div className="flex justify-between gap-3 text-ink-500">
                    <dt>Refundable caution deposit, held separately</dt>
                    <dd className="hm-money m-0">₦{samplePricing.refundableDeposit.toLocaleString('en-NG')}</dd>
                  </div>
                )}
              </dl>
              <details className="mt-3 border-t border-ink-200 pt-3 text-xs text-ink-600">
                <summary className="cursor-pointer font-semibold text-ink-800">HAMLET owner services policy</summary>
                <p className="m-0 mt-2 leading-relaxed">{APPROVED_OWNER_SERVICES_POLICY_COPY}</p>
              </details>
            </div>
          </div>
        )}

        {/* STEP 6: AVAILABILITY */}
        {step === 5 && (
          <div className="space-y-4">
            <FormField label="Earliest available check-in date" optional>
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
              hint="Self-reported until verified by HAMLET."
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
              <FormField label="What did you update?" optional>
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
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className="m-0 rounded-2xl bg-red-50 p-3.5 text-sm font-semibold text-red-800"
            style={{ outline: 'none' }}
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
          nextLabel={
            step === 2 && mediaActivity.hasActiveUploads
              ? 'Optimising photos…'
              : 'Save & continue'
          }
          submitLabel={
            mode === 'edit'
              ? 'Save & resubmit for review'
              : 'Submit for HAMLET review'
          }
          busy={busy || (step === WIZARD_STEPS.length - 1 && mediaActivity.hasActiveUploads)}
          busyLabel={
            mediaActivity.hasActiveUploads
              ? 'Finishing photo uploads…'
              : 'Saving listing…'
          }
          secondaryAction={
            (!currentStatus || currentStatus === 'draft') ? (
              <button
                type="button"
                disabled={busy || mediaActivity.hasActiveUploads}
                onClick={() => void submitListing(true)}
                className="secondary-button min-h-[48px] disabled:opacity-50"
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
