'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import {
  buildOAuthCallbackUrl,
  formatOAuthErrorMessage,
  readRequestedRedirectFromSearch,
  resolveNextAppPostSignInRedirect,
  resolvePostSignUpRedirect,
} from '@/lib/authRedirect';
import { getBrowserSupabase } from '@/lib/next-supabase';
import { dispatchPendingCommunications } from '@/lib/communications';
import { GoogleContinueButton } from '@/components/auth/GoogleContinueButton';
import {
  FormField,
  StepFooterActions,
  StepProgressHeader,
  FIELD_INPUT_CLASS,
} from '@/components/forms/ProgressiveFormPrimitives';

const OAUTH_CONTEXT_STORAGE_KEY = 'hamlet:oauth-context';

type Mode = 'signin' | 'signup' | 'reset';

const SIGNUP_STEPS = [
  {
    id: 'credentials',
    title: 'Account credentials',
    shortLabel: '1. Login details',
  },
  {
    id: 'profile',
    title: 'Your guest details',
    shortLabel: '2. Your name',
  },
] as const;

export default function SignInForm() {
  const client = useMemo(() => getBrowserSupabase(), []);
  const [mode, setMode] = useState<Mode>('signin');
  const [signupStep, setSignupStep] = useState(0);
  const [requestedNext, setRequestedNext] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [lockedReferralCode, setLockedReferralCode] = useState('');

  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'signup') {
        setMode('signup');
      }
      setRequestedNext(readRequestedRedirectFromSearch(window.location.search));
      const referralCode =
        new URLSearchParams(window.location.search).get('ref') ||
        window.localStorage.getItem('hamlet:referral-code');
      if (referralCode?.trim()) setLockedReferralCode(referralCode.trim().toUpperCase());

      const oauthError = params.get('error') || params.get('oauth_error');
      const oauthErrorDesc = params.get('error_description');
      if (oauthError || oauthErrorDesc) {
        setError(formatOAuthErrorMessage(oauthError, oauthErrorDesc));
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const contextHint = useMemo(() => {
    if (!requestedNext) return null;
    if (requestedNext.startsWith('/stays/')) {
      return 'Your selected stay and dates are saved — you will return right after signing in.';
    }
    if (requestedNext.startsWith('/partners/apply')) {
      return 'Sign in or create an account to continue directly to the Partner Application.';
    }
    return `You will continue to ${requestedNext.split('?')[0]} after signing in.`;
  }, [requestedNext]);

  async function resolveRoleAndNavigate(userId: string, isSignup: boolean) {
    if (!client) return;
    if (isSignup) {
      await dispatchPendingCommunications(client);
      window.location.assign(resolvePostSignUpRedirect(requestedNext));
      return;
    }
    const { data: profile } = await client
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    await dispatchPendingCommunications(client);
    const target = resolveNextAppPostSignInRedirect(
      profile?.role as string | undefined,
      requestedNext,
    );
    window.location.assign(target);
  }

  async function handleGoogleAuth() {
    setError('');
    setMessage('');

    if (!client) {
      setError(
        'HAMLET account access is not configured on this deployment yet. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
      );
      return;
    }

    const intent = mode === 'signup' ? 'signup' : 'signin';
    setOauthBusy(true);
    try {
      try {
        window.sessionStorage.setItem(
          OAUTH_CONTEXT_STORAGE_KEY,
          JSON.stringify({ intent, next: requestedNext }),
        );
        if (lockedReferralCode) {
          window.localStorage.setItem('hamlet:referral-code', lockedReferralCode);
        }
      } catch {
        // Storage unavailable in restricted browser contexts — URL query params still carry state.
      }

      const redirectTo = buildOAuthCallbackUrl(window.location.origin, {
        intent,
        next: requestedNext,
      });

      const { error: oauthError } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            prompt: 'select_account',
          },
        },
      });
      if (oauthError) {
        throw oauthError;
      }
    } catch (caught) {
      const rawMsg =
        caught instanceof Error
          ? caught.message
          : 'Could not start Google sign-in right now.';
      setError(formatOAuthErrorMessage(null, rawMsg));
      setOauthBusy(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }

    if (mode !== 'reset' && password.length < 8) {
      setError('Use a password with at least 8 characters.');
      return;
    }

    if (mode === 'signup' && signupStep === 0) {
      setSignupStep(1);
      return;
    }

    if (mode === 'signup' && name.trim().length < 2) {
      setError('Enter your full name (at least 2 characters).');
      return;
    }

    if (!client) {
      setError(
        'HAMLET account access is not configured on this deployment yet. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
      );
      return;
    }

    if (mode === 'reset') {
      setBusy(true);
      try {
        const redirectTo =
          typeof window !== 'undefined'
            ? `${window.location.origin}/signin`
            : undefined;
        const { error: resetError } = await client.auth.resetPasswordForEmail(
          cleanEmail,
          redirectTo ? { redirectTo } : undefined,
        );
        if (resetError) throw resetError;
        setMessage(
          'If an account exists for that email, a password reset link has been sent.',
        );
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : 'Could not request a password reset right now.',
        );
      } finally {
        setBusy(false);
      }
      return;
    }

    setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error: authError } = await client.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: name.trim(),
              phone: phone.trim() || null,
              referred_by_code: lockedReferralCode || null,
            },
          },
        });
        if (authError) throw authError;
        window.localStorage.removeItem('hamlet:referral-code');
        if (data.session && data.user) {
          await resolveRoleAndNavigate(data.user.id, true);
          return;
        }
        setMessage(
          'Your account was created. Check your email for a confirmation link, then sign in below to continue.',
        );
        setMode('signin');
        setSignupStep(0);
      } else {
        const { data, error: authError } = await client.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (authError) throw authError;
        if (data.user) {
          await resolveRoleAndNavigate(data.user.id, false);
          return;
        }
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'We could not complete that request. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {contextHint && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-brass-300 bg-brass-200/35 px-3.5 py-2.5 text-xs font-semibold text-ink-800">
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-brass-700" />
          <span>{contextHint}</span>
        </div>
      )}

      {/* Mode Switcher */}
      <div
        role="tablist"
        aria-label="Authentication mode"
        className="mb-6 flex gap-1.5 rounded-full bg-paper p-1.5"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'signin'}
          onClick={() => {
            setMode('signin');
            setError('');
            setMessage('');
          }}
          className={`min-h-[44px] flex-1 cursor-pointer rounded-full text-sm font-bold transition ${
            mode === 'signin'
              ? 'bg-white text-ink-900 shadow-xs'
              : 'text-ink-600 hover:text-ink-900'
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'signup'}
          onClick={() => {
            setMode('signup');
            setSignupStep(0);
            setError('');
            setMessage('');
          }}
          className={`min-h-[44px] flex-1 cursor-pointer rounded-full text-sm font-bold transition ${
            mode === 'signup'
              ? 'bg-white text-ink-900 shadow-xs'
              : 'text-ink-600 hover:text-ink-900'
          }`}
        >
          Create account
        </button>
      </div>

      {mode === 'signup' && (
        <StepProgressHeader
          steps={SIGNUP_STEPS}
          currentStep={signupStep}
          onSelectStep={idx => setSignupStep(idx)}
          maxCompletedStep={email.includes('@') && password.length >= 8 ? 1 : 0}
        />
      )}

      {(mode === 'signin' || (mode === 'signup' && signupStep === 0)) && (
        <div className="mb-5 space-y-4">
          <GoogleContinueButton
            mode={mode === 'signup' ? 'signup' : 'signin'}
            busy={oauthBusy}
            disabled={busy}
            onClick={() => void handleGoogleAuth()}
          />

          {mode === 'signup' && lockedReferralCode && (
            <p className="m-0 rounded-2xl border border-ink-100 bg-paper/75 px-3.5 py-2 text-[11px] font-medium text-ink-600">
              Referral link attached:{' '}
              <span className="font-mono font-bold text-ink-900">{lockedReferralCode}</span>
            </p>
          )}

          <div className="relative flex items-center py-0.5">
            <div className="flex-grow border-t border-ink-200/80" />
            <span className="mx-3 shrink-0 text-[11px] font-bold uppercase tracking-wider text-ink-400">
              {mode === 'signup' ? 'or sign up with email' : 'or continue with email'}
            </span>
            <div className="flex-grow border-t border-ink-200/80" />
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {(mode === 'signin' || mode === 'reset' || signupStep === 0) && (
          <>
            <FormField label="Email address">
              {fieldProps => (
                <input
                  {...fieldProps}
                  required
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={FIELD_INPUT_CLASS}
                />
              )}
            </FormField>

            {mode !== 'reset' && (
              <FormField label="Password">
                {fieldProps => (
                  <div className="relative">
                    <input
                      {...fieldProps}
                      required
                      minLength={8}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className={`${FIELD_INPUT_CLASS} pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-ink-500 hover:text-ink-900"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 shrink-0" />
                      ) : (
                        <Eye className="h-4 w-4 shrink-0" />
                      )}
                    </button>
                  </div>
                )}
              </FormField>
            )}

            {mode === 'signin' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setMode('reset');
                    setError('');
                    setMessage('');
                  }}
                  className="cursor-pointer border-0 bg-transparent p-0 text-xs font-semibold text-brass-700 hover:text-ink-900"
                >
                  Forgot password?
                </button>
              </div>
            )}
          </>
        )}

        {mode === 'signup' && signupStep === 1 && (
          <>
            <FormField label="Full name">
              {fieldProps => (
                <input
                  {...fieldProps}
                  required
                  minLength={2}
                  maxLength={120}
                  autoComplete="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your full name"
                  className={FIELD_INPUT_CLASS}
                />
              )}
            </FormField>

            {lockedReferralCode && (
              <FormField label="Referral code" hint="Applied from invite link.">
                {fieldProps => (
                  <input
                    {...fieldProps}
                    value={lockedReferralCode}
                    readOnly
                    aria-readonly="true"
                    className={`${FIELD_INPUT_CLASS} cursor-not-allowed bg-paper/80 font-mono uppercase`}
                  />
                )}
              </FormField>
            )}

            <FormField label="Phone number" optional>
              {fieldProps => (
                <input
                  {...fieldProps}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={32}
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+234 800 000 0000"
                  className={FIELD_INPUT_CLASS}
                />
              )}
            </FormField>
          </>
        )}

        {error && (
          <p
            role="alert"
            className="m-0 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold leading-relaxed text-red-800"
          >
            {error}
          </p>
        )}

        {message && (
          <p
            role="status"
            className="m-0 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold leading-relaxed text-emerald-800"
          >
            {message}
          </p>
        )}

        {mode === 'signin' ? (
          <button
            type="submit"
            disabled={busy || oauthBusy}
            className="primary-button mt-2 min-h-[48px] w-full"
          >
            {busy ? 'Signing in…' : 'Sign in to HAMLET'}
          </button>
        ) : mode === 'reset' ? (
          <div className="space-y-2 pt-1">
            <button
              type="submit"
              disabled={busy || oauthBusy}
              className="primary-button min-h-[48px] w-full"
            >
              {busy ? 'Sending link…' : 'Send password reset link'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError('');
              }}
              className="secondary-button min-h-[44px] w-full"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <StepFooterActions
            canGoBack={signupStep > 0}
            onBack={() => setSignupStep(0)}
            isLastStep={signupStep === 1}
            nextLabel="Continue"
            submitLabel="Create my account"
            busy={busy || oauthBusy}
            busyLabel="Creating account…"
          />
        )}
      </form>
    </div>
  );
}
