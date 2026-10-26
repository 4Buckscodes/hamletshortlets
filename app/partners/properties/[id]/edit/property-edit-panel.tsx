'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PauseCircle, PlayCircle, CalendarDays } from 'lucide-react';
import {
  getBrowserSupabase,
  PARTNER_PROPERTY_SELECT,
} from '@/lib/next-supabase';
import {
  PropertyListingWizard,
  type PropertyWizardValues,
} from '@/components/forms/PropertyListingWizard';

interface RawPropertyRow {
  id: string;
  title: string;
  property_type: string;
  area: string;
  public_address: string;
  nightly_rate: number;
  cleaning_fee: number;
  refundable_deposit: number;
  bedrooms: number;
  bathrooms: number;
  capacity: number;
  bed_setup: string;
  amenities: string[];
  image_urls: string[];
  house_rules: string[];
  status: string;
  review_note: string | null;
  first_available_date?: string | null;
  calendar_responsible_person?: string | null;
}

export default function PropertyEditPanel({ propertyId }: { propertyId: string }) {
  const db = useMemo(() => getBrowserSupabase(), []);
  const [property, setProperty] = useState<RawPropertyRow | null>(null);
  const [authorityBasis, setAuthorityBasis] = useState('');
  const [submittedRole, setSubmittedRole] = useState('Property owner');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!db) {
      setError('Partner workspace is not configured on this deployment.');
      setLoading(false);
      return;
    }
    const { data: session } = await db.auth.getSession();
    if (!session.session) {
      window.location.assign(
        `/signin?next=${encodeURIComponent(`/partners/properties/${propertyId}/edit`)}`,
      );
      return;
    }

    const [propRes, subRes] = await Promise.all([
      db
        .from('properties')
        .select(PARTNER_PROPERTY_SELECT)
        .eq('id', propertyId)
        .maybeSingle(),
      db
        .from('property_private_records')
        .select('record_data')
        .eq('property_id', propertyId)
        .eq('record_type', 'partner_submission')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (propRes.error || !propRes.data) {
      setError('Property not found or your partner account cannot manage it.');
    } else {
      setProperty(propRes.data as unknown as RawPropertyRow);
    }

    const recordData = (subRes.data?.record_data || null) as {
      authority_basis?: string;
      submitted_role?: string;
    } | null;
    if (recordData) {
      setAuthorityBasis(String(recordData.authority_basis || ''));
      setSubmittedRole(String(recordData.submitted_role || 'Property owner'));
    }

    setLoading(false);
  }, [db, propertyId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function togglePause() {
    if (!db || !property) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (property.status === 'approved') {
        const { error: rpcError } = await db.rpc('set_property_publication_pause', {
          target_property_id: property.id,
          paused: true,
          pause_note: 'Paused by partner from listing management.',
        });
        if (rpcError) throw new Error(rpcError.message);
        setNotice('Listing paused — hidden from public search until you resume it.');
      } else if (property.status === 'paused') {
        const { error: rpcError } = await db.rpc('set_property_publication_pause', {
          target_property_id: property.id,
          paused: false,
          pause_note: 'Resumed by partner from listing management.',
        });
        if (rpcError) throw new Error(rpcError.message);
        setNotice('Listing resumed and visible on the marketplace.');
      }
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not change listing status.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-ink-100 bg-white p-6 text-sm text-ink-600">
        Loading listing…
      </div>
    );
  }

  if (!property) {
    return (
      <div className="rounded-3xl border border-red-200 bg-white p-6 text-sm text-red-800">
        {error || 'Listing not found.'}
      </div>
    );
  }

  const canResubmit = ['draft', 'needs_correction'].includes(property.status);

  const wizardInitial: Partial<PropertyWizardValues> = {
    title: property.title,
    propertyType: property.property_type || 'Apartment',
    area: property.area || 'Victoria Island',
    address: property.public_address || '',
    bedrooms: Number(property.bedrooms ?? 1),
    bathrooms: Number(property.bathrooms ?? 1),
    capacity: Number(property.capacity ?? 2),
    bedSetup: property.bed_setup || '',
    imageUrls: Array.isArray(property.image_urls) ? property.image_urls : [],
    amenities: Array.isArray(property.amenities) ? property.amenities : [],
    houseRulesText: Array.isArray(property.house_rules)
      ? property.house_rules.join('\n')
      : '',
    nightlyRate: Number(property.nightly_rate || 0),
    cleaningFee: Number(property.cleaning_fee || 0),
    deposit: Number(property.refundable_deposit || 0),
    firstAvailableDate: property.first_available_date || '',
    calendarResponsiblePerson: property.calendar_responsible_person || '',
    submittedRole,
    authorityBasis,
  };

  return (
    <div className="space-y-6">
      {/* Operational Status Bar */}
      <section className="rounded-3xl border border-ink-100 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-brass-700">
              {property.area} · Status: {property.status}
            </span>
            <h2 className="serif m-0 mt-1 text-2xl font-medium text-ink-900">
              {property.title}
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/partners/availability?property=${encodeURIComponent(property.id)}`}
              className="secondary-button min-h-[42px]"
            >
              <CalendarDays className="h-4 w-4 shrink-0" />
              Manage calendar
            </Link>

            {(property.status === 'approved' || property.status === 'paused') && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void togglePause()}
                className="primary-button min-h-[42px]"
              >
                {property.status === 'approved' ? (
                  <>
                    <PauseCircle className="h-4 w-4 shrink-0" />
                    Pause bookings
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4 shrink-0" />
                    Resume bookings
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {error && (
          <p role="alert" className="m-0 mt-3 text-xs font-semibold text-red-700">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="m-0 mt-3 text-xs font-semibold text-emerald-700">
            {notice}
          </p>
        )}

        {!canResubmit && (
          <p className="m-0 mt-4 border-t border-ink-100 pt-3 text-xs leading-relaxed text-ink-600">
            To protect active guest quotes and verified audit records, core listing fields are locked while a property is <strong>{property.status}</strong>. You can pause/resume bookings or manage calendar availability above at any time.
          </p>
        )}
      </section>

      {canResubmit && (
        <PropertyListingWizard
          mode="edit"
          propertyId={property.id}
          initialValues={wizardInitial}
          adminReviewNote={property.review_note}
          currentStatus={property.status}
          onCompleted={() => void load()}
        />
      )}
    </div>
  );
}
