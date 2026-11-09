'use client';

import { PropertyListingWizard } from '@/components/forms/PropertyListingWizard';

/**
 * Property intake is intentionally rendered without a client-side role gate.
 * The authenticated API, database RPCs and Storage RLS policies are the
 * authorization boundary. This avoids stale/hydration-dependent browser role
 * checks while still preventing guests and ineligible applicants from
 * persisting listings or uploading media.
 */
export default function PropertySubmissionForm() {
  return (
    <PropertyListingWizard
      mode="create"
      onCompleted={() => {
        window.setTimeout(() => {
          window.location.assign('/partners');
        }, 900);
      }}
    />
  );
}
