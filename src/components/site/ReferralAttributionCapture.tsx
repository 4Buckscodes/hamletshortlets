'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { getBrowserSupabase } from '@/lib/next-supabase';
import {
  extractShareTokenFromSearchParams,
  getOrCreateVisitorSessionKey,
  readVisitorSessionKey,
  storePropertyShareTokenHint,
} from '@/lib/share-engine';

const REFERRAL_STORAGE_KEY = 'hamlet:referral-code';

export default function ReferralAttributionCapture() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const shareToken = extractShareTokenFromSearchParams(searchParams);
    if (shareToken) {
      const stayMatch = pathname?.match(/^\/stays\/([^/?#]+)/);
      const propertyIdFromPath = stayMatch?.[1] ? decodeURIComponent(stayMatch[1]) : null;
      if (propertyIdFromPath) {
        storePropertyShareTokenHint(propertyIdFromPath, shareToken);
      }

      const visitorSessionKey = getOrCreateVisitorSessionKey();
      if (visitorSessionKey) {
        void (async () => {
          try {
            const db = getBrowserSupabase();
            let accessToken: string | undefined;
            if (db) {
              const { data } = await db.auth.getSession();
              accessToken = data.session?.access_token;
            }
            const res = await fetch('/api/share/visit', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
              },
              body: JSON.stringify({
                shareToken,
                visitorSessionKey,
              }),
            });
            const payload = (await res.json().catch(() => null)) as {
              valid?: boolean;
              property_id?: string;
            } | null;
            if (payload?.valid && payload.property_id) {
              storePropertyShareTokenHint(payload.property_id, shareToken);
            }
          } catch {
            // Never disrupt normal browsing if analytics or network fails
          }
        })();
      }
      return;
    }

    const incoming = searchParams.get('ref')?.trim().toUpperCase() || '';
    if (!incoming) return;

    if (/^HML-[A-Z0-9]{4,14}$/.test(incoming)) {
      window.localStorage.setItem(REFERRAL_STORAGE_KEY, incoming);
    } else {
      window.localStorage.removeItem(REFERRAL_STORAGE_KEY);
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    const db = getBrowserSupabase();
    if (!db) return;

    const bindIfPresent = async (accessToken?: string | null) => {
      const visitorSessionKey = readVisitorSessionKey();
      if (!accessToken || !visitorSessionKey) return;
      try {
        await fetch('/api/share/bind', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ visitorSessionKey }),
        });
      } catch {
        // Best-effort non-blocking session bind
      }
    };

    void db.auth.getSession().then(({ data }) => {
      void bindIfPresent(data.session?.access_token);
    });

    const { data: sub } = db.auth.onAuthStateChange((_event, session) => {
      void bindIfPresent(session?.access_token);
    });

    return () => {
      sub?.subscription?.unsubscribe();
    };
  }, []);

  return null;
}
