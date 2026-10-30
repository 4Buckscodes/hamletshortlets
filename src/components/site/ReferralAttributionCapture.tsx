'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const REFERRAL_STORAGE_KEY = 'hamlet:referral-code';

export default function ReferralAttributionCapture() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const incoming = searchParams.get('ref')?.trim().toUpperCase() || '';
    if (!incoming) return;

    if (/^HML-[A-Z0-9]{4,14}$/.test(incoming)) {
      window.localStorage.setItem(REFERRAL_STORAGE_KEY, incoming);
    } else {
      window.localStorage.removeItem(REFERRAL_STORAGE_KEY);
    }
  }, [pathname, searchParams]);

  return null;
}
