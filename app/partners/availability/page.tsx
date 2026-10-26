'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { getBrowserSupabase } from '@/lib/next-supabase';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import { FormField, FIELD_INPUT_CLASS } from '@/components/forms/ProgressiveFormPrimitives';
import { PartnerNav } from '../partner-nav';

type Property = {
  id: string;
  title: string;
  area: string;
  status: string;
  first_available_date: string | null;
  availability_confirmation_status: string | null;
  calendar_responsible_person: string | null;
  last_availability_update: string | null;
};

type Block = {
  id: string;
  property_id: string;
  start_date: string;
  end_date: string;
  block_type: string;
  note: string | null;
};

export default function PartnerAvailabilityPage() {
  const db = useMemo(() => getBrowserSupabase(), []);
  const [role, setRole] = useState('');
  const [properties, setProperties] = useState<Property[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [propertyId, setPropertyId] = useState('');
  const [firstDate, setFirstDate] = useState('');
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!db) {
      setError('Availability controls are not configured on this deployment.');
      setLoading(false);
      return;
    }
    const { data: session } = await db.auth.getSession();
    const user = session.session?.user;
    if (!user) {
      window.location.assign('/signin?next=/partners/availability');
      return;
    }
    const { data: profile } = await db
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    const userRole = String(profile?.role || 'guest');
    setRole(userRole);
    if (userRole !== 'partner' && userRole !== 'admin') {
      setLoading(false);
      return;
    }

    const [propRes, blockRes] = await Promise.all([
      db
        .from('properties')
        .select(
          'id,title,area,status,first_available_date,availability_confirmation_status,calendar_responsible_person,last_availability_update',
        )
        .order('updated_at', { ascending: false }),
      db
        .from('property_availability_blocks')
        .select('id,property_id,start_date,end_date,block_type,note')
        .order('start_date', { ascending: true }),
    ]);

    if (propRes.error) {
      setError('Could not load your properties.');
    } else {
      const list = (propRes.data || []) as Property[];
      setProperties(list);
      const requestedProp = new URLSearchParams(window.location.search).get('property');
      const selected =
        list.find(p => p.id === requestedProp) ||
        list.find(p => p.id === propertyId) ||
        list[0];
      if (selected) {
        setPropertyId(selected.id);
        setFirstDate(selected.first_available_date || '');
        setResponsiblePerson(selected.calendar_responsible_person || '');
      }
    }
    if (!blockRes.error) {
      setBlocks((blockRes.data || []) as Block[]);
    }
    setLoading(false);
  }, [db, propertyId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function handleSelectProperty(nextId: string) {
    setPropertyId(nextId);
    const found = properties.find(p => p.id === nextId);
    if (found) {
      setFirstDate(found.first_available_date || '');
      setResponsiblePerson(found.calendar_responsible_person || '');
    }
  }

  async function confirmAvailability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || !propertyId) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const { error: rpcError } = await db.rpc(
        'update_property_availability_settings',
        {
          target_property_id: propertyId,
          next_first_available_date: firstDate || null,
          next_confirmation_status: 'confirmed',
          next_responsible_person: responsiblePerson.trim() || null,
        },
      );
      if (rpcError) throw new Error(rpcError.message);
      setNotice('Calendar availability status confirmed.');
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not confirm calendar status.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function addBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || !propertyId || !startDate || !endDate) return;
    if (endDate <= startDate) {
      setError('End date must be after start date.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const { error: rpcError } = await db.rpc('add_property_availability_block', {
        target_property_id: propertyId,
        block_start: startDate,
        block_end: endDate,
        kind: 'owner_block',
        block_source: 'partner',
        block_note: reason.trim() || 'Blocked by property partner',
      });
      if (rpcError) throw new Error(rpcError.message);
      setStartDate('');
      setEndDate('');
      setReason('');
      setNotice('Unavailable date range added to the property calendar.');
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not block those dates.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeBlock(id: string) {
    if (!db) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const { error: rpcError } = await db.rpc('remove_property_availability_block', {
        target_block_id: id,
      });
      if (rpcError) throw new Error(rpcError.message);
      setNotice('Blocked dates removed.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not remove block.');
    } finally {
      setSaving(false);
    }
  }

  const activeBlocks = blocks.filter(b => b.property_id === propertyId);

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <main className="shell flex-1 py-8 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Calendar & Availability</p>
            <h1 className="serif mt-2 text-3xl font-medium text-ink-900 sm:text-5xl">
              Manage unavailable dates
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-600">
              Block maintenance windows, owner stays or external bookings so guests only request open dates.
            </p>
          </div>
          {(role === 'partner' || role === 'admin') && (
            <PartnerNav current="availability" />
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800"
          >
            {error}
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800"
          >
            {notice}
          </p>
        )}

        {loading ? (
          <p className="mt-8 text-sm text-ink-600">Loading calendar…</p>
        ) : properties.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-ink-300 bg-white p-10 text-center text-sm text-ink-500">
            Submit a property listing first before managing calendar blocks.
          </div>
        ) : (
          <div className="mt-8 grid items-start gap-6 lg:grid-cols-12">
            {/* Property selector + Block Date Form */}
            <div className="space-y-6 lg:col-span-7">
              <section className="rounded-3xl border border-ink-100 bg-white p-6">
                <FormField label="Select property">
                  {fieldProps => (
                    <select
                      {...fieldProps}
                      value={propertyId}
                      onChange={e => handleSelectProperty(e.target.value)}
                      className={FIELD_INPUT_CLASS}
                    >
                      {properties.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.title} ({p.area} · {p.status})
                        </option>
                      ))}
                    </select>
                  )}
                </FormField>

                <form onSubmit={addBlock} className="mt-6 space-y-4 border-t border-ink-100 pt-5">
                  <h2 className="serif m-0 text-2xl font-medium text-ink-900">
                    Block unavailable dates
                  </h2>
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <FormField label="Start date">
                      {fieldProps => (
                        <input
                          {...fieldProps}
                          required
                          type="date"
                          value={startDate}
                          onChange={e => setStartDate(e.target.value)}
                          className={FIELD_INPUT_CLASS}
                        />
                      )}
                    </FormField>

                    <FormField label="End date">
                      {fieldProps => (
                        <input
                          {...fieldProps}
                          required
                          type="date"
                          min={startDate || undefined}
                          value={endDate}
                          onChange={e => setEndDate(e.target.value)}
                          className={FIELD_INPUT_CLASS}
                        />
                      )}
                    </FormField>
                  </div>

                  <FormField label="Reason" optional>
                    {fieldProps => (
                      <input
                        {...fieldProps}
                        maxLength={240}
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder="e.g. Owner personal stay / external booking / maintenance"
                        className={FIELD_INPUT_CLASS}
                      />
                    )}
                  </FormField>

                  <button
                    type="submit"
                    disabled={saving}
                    className="primary-button min-h-[48px] w-full"
                  >
                    {saving ? 'Saving…' : 'Block selected dates'}
                  </button>
                </form>
              </section>

              <section className="rounded-3xl border border-ink-100 bg-white p-6">
                <h2 className="serif m-0 text-2xl font-medium text-ink-900">
                  Calendar readiness confirmation
                </h2>
                <form onSubmit={confirmAvailability} className="mt-4 space-y-4">
                  <FormField label="Earliest open check-in date" optional>
                    {fieldProps => (
                      <input
                        {...fieldProps}
                        type="date"
                        value={firstDate}
                        onChange={e => setFirstDate(e.target.value)}
                        className={FIELD_INPUT_CLASS}
                      />
                    )}
                  </FormField>

                  <FormField label="Person responsible for calendar updates" optional>
                    {fieldProps => (
                      <input
                        {...fieldProps}
                        maxLength={120}
                        value={responsiblePerson}
                        onChange={e => setResponsiblePerson(e.target.value)}
                        placeholder="Name or operations desk"
                        className={FIELD_INPUT_CLASS}
                      />
                    )}
                  </FormField>

                  <button
                    type="submit"
                    disabled={saving}
                    className="secondary-button min-h-[48px] w-full"
                  >
                    Confirm calendar is up to date
                  </button>
                </form>
              </section>
            </div>

            {/* Active Blocks List */}
            <section className="rounded-3xl border border-ink-100 bg-white p-6 lg:col-span-5">
              <h2 className="serif m-0 text-2xl font-medium text-ink-900">
                Blocked date ranges ({activeBlocks.length})
              </h2>
              {activeBlocks.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {activeBlocks.map(block => (
                    <div
                      key={block.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-paper p-3.5 text-xs"
                    >
                      <div>
                        <strong className="font-mono text-ink-900">
                          {block.start_date} → {block.end_date}
                        </strong>
                        {block.note && (
                          <p className="m-0 mt-0.5 text-ink-500">{block.note}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void removeBlock(block.id)}
                        aria-label="Remove blocked dates"
                        className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 shrink-0" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-xs leading-relaxed text-ink-500">
                  No manual blocks recorded for this property yet.
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
