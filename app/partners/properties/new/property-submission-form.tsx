'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getBrowserSupabase } from '@/lib/next-supabase';
import { PropertyListingWizard } from '@/components/forms/PropertyListingWizard';

export default function PropertySubmissionForm() {
  const db = useMemo(() => getBrowserSupabase(), []);
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let active = true;
    async function verifyPartner() {
      if (!db) {
        if (active) setChecking(false);
        return;
      }
      const { data: session } = await db.auth.getSession();
      const user = session.session?.user;
      if (!user) {
        window.location.assign('/signin?next=/partners/properties/new');
        return;
      }
      const [{ data: profile }, { data: applications }] = await Promise.all([
        db.from('profiles').select('role').eq('id', user.id).maybeSingle(),
        db
          .from('partner_applications')
          .select('id,status,role')
          .eq('applicant_id', user.id)
          .in('status', ['pending', 'needs_correction'])
          .order('submitted_at', { ascending: false })
          .limit(1),
      ]);
      const application = applications?.[0];
      const canStartListing =
        application &&
        ['Property owner', 'Authorised manager', 'Multi-property operator'].includes(
          String(application.role),
        );
      if (active) {
        setAllowed(
          profile?.role === 'partner' ||
            profile?.role === 'admin' ||
            Boolean(canStartListing),
        );
        setChecking(false);
      }
    }
    void verifyPartner();
    return () => {
      active = false;
    };
  }, [db]);

  if (checking) {
    return (
      <div className="rounded-3xl border border-ink-100 bg-white p-6 text-sm text-ink-600">
        Checking partner permissions…
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="rounded-3xl border border-ink-200 bg-white p-7">
        <h2 className="serif m-0 text-2xl font-medium text-ink-900">
          Apply as a property partner first
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">
          Submit your partner application to unlock property uploads immediately. HAMLET reviews each property before it can appear publicly; partner verification is completed separately before earnings can be paid.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/partners/apply" className="primary-button">
            Open partner application →
          </Link>
        </div>
      </div>
    );
  }

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
