'use client';

import { useCallback, useState } from 'react';
import { CheckCircle2, Copy, Plus } from 'lucide-react';
import {
  PropertyListingWizard,
  carryOverOwnerDetails,
  similarUnitStarter,
  type PropertySubmissionResult,
  type PropertyWizardValues,
} from '@/components/forms/PropertyListingWizard';

/**
 * Property intake is intentionally rendered without a client-side role gate.
 * The authenticated API, database RPCs and Storage RLS policies are the
 * authorization boundary. This avoids stale/hydration-dependent browser role
 * checks while still preventing guests and ineligible applicants from
 * persisting listings or uploading media.
 *
 * Batch loop: each listing is saved on its own through the normal per-property
 * endpoint (so verification, duplicate screening and review are unchanged). After a
 * save the partner chooses to add another, or finish — no redirect in between.
 */
type SessionEntry = { id: number; title: string; area: string; savedAsDraft: boolean };

export default function PropertySubmissionForm() {
  const [entries, setEntries] = useState<SessionEntry[]>([]);
  const [last, setLast] = useState<PropertySubmissionResult | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [starter, setStarter] = useState<Partial<PropertyWizardValues> | undefined>(undefined);

  const handleSubmitted = useCallback((result: PropertySubmissionResult) => {
    setEntries(prev => [
      ...prev,
      { id: prev.length + 1, title: result.title, area: result.area, savedAsDraft: result.savedAsDraft },
    ]);
    setLast(result);
    window.scrollTo({ top: 0 });
  }, []);

  const startNext = useCallback(
    (kind: 'blank' | 'similar') => {
      if (!last) return;
      setStarter(
        kind === 'similar' ? similarUnitStarter(last.values) : carryOverOwnerDetails(last.values),
      );
      setLast(null);
      setFormKey(k => k + 1);
      window.scrollTo({ top: 0 });
    },
    [last],
  );

  if (last) {
    const submittedCount = entries.filter(e => !e.savedAsDraft).length;
    const draftCount = entries.length - submittedCount;
    return (
      <div className="rounded-3xl border border-ink-100 bg-white p-6 shadow-xs sm:p-8" role="status">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" aria-hidden />
          <div>
            <h2 className="hm-h3 m-0">
              {last.savedAsDraft ? 'Draft saved' : 'Submitted for review'}: {last.title}
            </h2>
            <p className="mt-1 text-sm text-ink-600">{last.message}</p>
          </div>
        </div>

        <p className="mt-6 text-sm font-semibold text-ink-900">Got another apartment? List it now.</p>
        <p className="mt-1 text-xs text-ink-600">
          Your role and authority details carry over. Each listing is still reviewed on its own, so
          title, address and photos always start blank.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={() => startNext('blank')} className="btn-brass !py-3 text-[13px]">
            <Plus size={16} /> Add another property
          </button>
          <button type="button" onClick={() => startNext('similar')} className="btn-ghost-dark !py-3 text-[13px]">
            <Copy size={16} /> Add a similar unit
          </button>
          <button
            type="button"
            onClick={() => window.location.assign('/partners')}
            className="btn-ghost-dark !py-3 text-[13px]"
          >
            I&apos;m done — go to my workspace
          </button>
        </div>

        {entries.length > 0 && (
          <div className="mt-6 border-t border-ink-100 pt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-500">
              This session: {submittedCount} submitted
              {draftCount > 0 ? `, ${draftCount} saved as draft` : ''}
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink-800">
              {entries.map(entry => (
                <li key={entry.id}>
                  {entry.title}
                  {entry.area ? ` · ${entry.area}` : ''}{' '}
                  <span className="text-xs text-ink-500">
                    ({entry.savedAsDraft ? 'draft' : 'submitted for review'})
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {entries.length > 0 && (
        <p className="mb-4 rounded-2xl bg-emerald-50 p-3 text-xs text-emerald-900" role="status">
          {entries.length} listing{entries.length === 1 ? '' : 's'} saved this session. You&apos;re now adding
          property #{entries.length + 1}. Horatio can draft it from a quick description.
        </p>
      )}
      <PropertyListingWizard
        key={formKey}
        mode="create"
        initialValues={starter}
        onSubmitted={handleSubmitted}
      />
    </div>
  );
}
