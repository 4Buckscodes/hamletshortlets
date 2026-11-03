'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ArrowRight, Loader2, ShieldAlert } from 'lucide-react';
import {
  buildNextSignInPath,
  extractOAuthDisplayName,
  formatOAuthErrorMessage,
  readRequestedRedirectFromSearch,
  resolveOAuthPostAuthRedirect,
} from '@/lib/authRedirect';
import { getBrowserSupabase, isMissingSchemaObjectError } from '@/lib/next-supabase';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';

const OAUTH_CONTEXT_STORAGE_KEY = 'hamlet:oauth-context';
const REFERRAL_STORAGE_KEY = 'hamlet:referral-code';

interface StoredOAuthContext {
  intent?: 'signin' | 'signup';
  next?: string | null;
}

interface CallbackProfileRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  company: string | null;
  role: string | null;
  referred_by_code?: string | null;
}

function readStoredOAuthContext(): StoredOAuthContext {
  try {
    const raw = window.sessionStorage.getItem(OAUTH_CONTEXT_STORAGE_KEY);
    window.sessionStorage.removeItem(OAUTH_CONTEXT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredOAuthContext;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export default function AuthCallbackPage() {
  const client = useMemo(() => getBrowserSupabase(), []);
  const handledRef = useRef(false);
  const [error, setError] = useState('');
  const [fallbackSignInHref, setFallbackSignInHref] = useState('/signin');

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    let cancelled = false;
    let subscriptionCleanup: (() => void) | undefined;

    async function completeOAuth() {
      const searchParams = new URLSearchParams(window.location.search);
      const hashRaw = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(hashRaw);

      const stored = readStoredOAuthContext();
      const intentParam = searchParams.get('intent') || stored.intent || 'signin';
      const requestedNext =
        readRequestedRedirectFromSearch(window.location.search) ??
        stored.next ??
        null;

      const returnHref = buildNextSignInPath({
        signup: intentParam === 'signup',
        next: requestedNext,
      });
      if (!cancelled) {
        setFallbackSignInHref(returnHref);
      }

      const rawError = searchParams.get('error') || hashParams.get('error');
      const rawErrorDesc =
        searchParams.get('error_description') || hashParams.get('error_description');
      if (rawError || rawErrorDesc) {
        if (!cancelled) {
          setError(formatOAuthErrorMessage(rawError, rawErrorDesc));
        }
        return;
      }

      if (!client) {
        if (!cancelled) {
          setError(
            'HAMLET account access is not configured on this deployment yet. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
          );
        }
        return;
      }

      try {
        let {
          data: { session },
        } = await client.auth.getSession();

        const authCode = searchParams.get('code');
        if (!session && authCode) {
          const { data, error: exchangeError } =
            await client.auth.exchangeCodeForSession(authCode);
          if (exchangeError) {
            throw exchangeError;
          }
          session = data.session;
        }

        if (!session) {
          session = await new Promise<Session | null>(resolve => {
            const timeout = window.setTimeout(() => {
              resolve(null);
            }, 3500);
            const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
              if (nextSession) {
                window.clearTimeout(timeout);
                data.subscription.unsubscribe();
                resolve(nextSession);
              }
            });
            subscriptionCleanup = () => {
              window.clearTimeout(timeout);
              data.subscription.unsubscribe();
            };
          });
        }

        if (!session?.user) {
          if (!cancelled) {
            setError(
              'We could not verify an active sign-in session from Google. Please try again or continue with your email address.',
            );
          }
          return;
        }

        const user = session.user;
        const { data: profileData } = await client
          .from('profiles')
          .select('id,full_name,phone,company,role')
          .eq('id', user.id)
          .maybeSingle();

        const profile = (profileData as CallbackProfileRow | null) ?? null;

        // Backfill display name from Google metadata when the profile row has an empty name
        const existingName = (profile?.full_name || '').trim();
        if (existingName.length < 2) {
          const candidateName = extractOAuthDisplayName(
            user.user_metadata as Record<string, unknown> | undefined,
            user.email,
          );
          if (candidateName.length >= 2) {
            await client.rpc('update_own_profile', {
              next_full_name: candidateName,
              next_phone: profile?.phone || null,
              next_company: profile?.company || null,
            });
          }
        }

        // Best-effort OAuth guest referral claim when a locked referral code was captured
        const storedReferralCode = window.localStorage
          .getItem(REFERRAL_STORAGE_KEY)
          ?.trim()
          .toUpperCase();

        const createdAtMs = user.created_at ? Date.parse(user.created_at) : Number.NaN;
        const isNewlyCreatedAccount =
          Number.isFinite(createdAtMs) && Date.now() - createdAtMs < 2 * 60 * 1000;

        const destination = resolveOAuthPostAuthRedirect({
          role: profile?.role,
          intent: intentParam,
          next: requestedNext,
          isNewlyCreatedAccount,
        });

        if (storedReferralCode) {
          const { error: claimError } = await client.rpc(
            'claim_oauth_signup_referral',
            { code_input: storedReferralCode },
          );
          if (
            !claimError &&
            !destination.startsWith('/partners/apply')
          ) {
            window.localStorage.removeItem(REFERRAL_STORAGE_KEY);
          } else if (claimError && !isMissingSchemaObjectError(claimError)) {
            // Invalid/self-referral or non-eligible account: do not block sign-in; clear stale guest code unless continuing to partner application
            if (!destination.startsWith('/partners/apply')) {
              window.localStorage.removeItem(REFERRAL_STORAGE_KEY);
            }
          }
        }

        if (!cancelled) {
          window.location.replace(destination);
        }
      } catch (caught) {
        if (!cancelled) {
          const rawMsg =
            caught instanceof Error ? caught.message : 'Authentication could not be completed.';
          setError(formatOAuthErrorMessage(null, rawMsg));
        }
      }
    }

    void completeOAuth();

    return () => {
      cancelled = true;
      subscriptionCleanup?.();
    };
  }, [client]);

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <main className="shell flex flex-1 items-center justify-center py-12 sm:py-16">
        <div className="w-full max-w-md">
          <section className="rounded-3xl border border-ink-200 bg-white p-6 shadow-md sm:p-8">
            <p className="eyebrow">Your stay, sorted.</p>

            {error ? (
              <>
                <div className="mt-3 flex items-center gap-2.5 text-red-700">
                  <ShieldAlert className="h-5 w-5 shrink-0" />
                  <h1 className="serif m-0 text-2xl font-medium text-ink-900">
                    Sign-in not completed
                  </h1>
                </div>
                <p
                  role="alert"
                  className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold leading-relaxed text-red-800"
                >
                  {error}
                </p>
                <div className="mt-5 flex flex-col gap-2.5">
                  <Link href={fallbackSignInHref} className="primary-button min-h-[48px] w-full">
                    Return to sign in <ArrowRight className="h-4 w-4 shrink-0" />
                  </Link>
                  <Link href="/stays" className="secondary-button min-h-[44px] w-full">
                    Explore Lagos stays
                  </Link>
                </div>
              </>
            ) : (
              <div role="status" aria-live="polite" className="mt-3">
                <h1 className="serif m-0 text-2xl font-medium text-ink-900 sm:text-3xl">
                  Signing you in to HAMLET…
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  Verifying your Google account and preparing your workspace.
                </p>
                <div className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-ink-100 bg-paper px-4 py-2 text-xs font-bold text-ink-700">
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brass-700" />
                  <span>Completing secure redirect…</span>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
