'use client';

import { useEffect } from 'react';

const REFERRAL_STORAGE_KEY = 'hamlet:referral-code';

export default function ReferralAttributionCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const incoming = params.get('ref')?.trim().toUpperCase();
    if (incoming && /^HML-[A-Z0-9]{4,14}$/.test(incoming)) {
      window.localStorage.setItem(REFERRAL_STORAGE_KEY, incoming);
    }
  }, []);

  return null;
}
