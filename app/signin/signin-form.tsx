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
import { GoogleContinueButton } from '@/components/auth/GoogleContinueButton';
import { FormField, FIELD_INPUT_CLASS } from '@/components/forms/ProgressiveFormPrimitives';

const OAUTH_CONTEXT_STORAGE_KEY = 'hamlet:oauth-context';
type Mode = 'signin' | 'signup' | 'reset';

export default function SignInForm() {
  const client = useMemo(() => getBrowserSupabase(), []);
  const [mode, setMode] = useState<Mode>('signin');
  const [requestedNext, setRequestedNext] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [lockedReferralCode, setLockedReferralCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'signup') setMode('signup');
      const requestedRedirect = readRequestedRedirectFromSearch(window.location.search);
      setRequestedNext(requestedRedirect?.startsWith('/partners') ? '/partners' : requestedRedirect);
      const referralCode = params.get('ref') || window.localStorage.getItem('hamlet:referral-code');
      if (referralCode?.trim()) setLockedReferralCode(referralCode.trim().toUpperCase());
      const oauthError = params.get('error') || params.get('oauth_error');
      const oauthErrorDesc = params.get('error_description');
      if (oauthError || oauthErrorDesc) setError(formatOAuthErrorMessage(oauthError, oauthErrorDesc));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const isPartnerSignup = Boolean(requestedNext?.startsWith('/partners'));
  const contextHint = requestedNext?.startsWith('/partners')
    ? 'Create your account and open your partner workspace straight away.'
    : requestedNext?.startsWith('/stays/')
      ? 'Your selected stay and dates are saved — you will return after signing in.'
      : null;

  async function resolveRoleAndNavigate(userId: string, isSignup: boolean) {
    if (!client) return;
    if (isSignup) {
      window.location.assign(isPartnerSignup ? '/partners' : resolvePostSignUpRedirect(requestedNext));
      return;
    }
    const [{ data: profile }, { data: membership }] = await Promise.all([
      client.from('profiles').select('role,account_status').eq('id', userId).maybeSingle(),
      client.from('partner_network_memberships').select('status').eq('user_id', userId).maybeSingle(),
    ]);
    const effectiveRole =
      profile?.role === 'admin' ? 'admin' :
      (profile?.role === 'partner' || membership?.status === 'active') && profile?.account_status !== 'suspended'
        ? 'partner' : profile?.role || 'guest';
    window.location.assign(resolveNextAppPostSignInRedirect(effectiveRole, requestedNext));
  }

  async function handleGoogleAuth() {
    setError('');
    setMessage('');
    if (!client) {
      setError('HAMLET account access is not configured on this deployment yet.');
      return;
    }
    if (isPartnerSignup && mode === 'signup') {
      setError('For now, create a partner account with email and password. Google signup will be added after the streamlined flow is validated.');
      return;
    }
    setOauthBusy(true);
    try {
      window.sessionStorage.setItem(
        OAUTH_CONTEXT_STORAGE_KEY,
        JSON.stringify({ intent: mode === 'signup' ? 'signup' : 'signin', next: requestedNext }),
      );
      const redirectTo = buildOAuthCallbackUrl(window.location.origin, {
        intent: mode === 'signup' ? 'signup' : 'signin',
        next: requestedNext,
      });
      const { error: oauthError } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, queryParams: { prompt: 'select_account' } },
      });
      if (oauthError) throw oauthError;
    } catch (caught) {
      setError(formatOAuthErrorMessage(null, caught instanceof Error ? caught.message : 'Could not start Google sign-in.'));
      setOauthBusy(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    if (mode !== 'reset' && password.length < 8) {
      setError('Use a password with at least 8 characters.');
      return;
    }
    if (!client) {
      setError('HAMLET account access is not configured on this deployment yet.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'reset') {
        const { error: resetError } = await client.auth.resetPasswordForEmail(
          cleanEmail,
          { redirectTo: `${window.location.origin}/signin` },
        );
        if (resetError) throw resetError;
        setMessage('If an account exists for that email, a password reset link has been sent.');
        return;
      }

      if (mode === 'signup') {
        const { data, error: authError } = await client.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              referred_by_code: lockedReferralCode || null,
              hamlet_partner_signup: isPartnerSignup,
              hamlet_partner_role: isPartnerSignup ? 'property_owner' : null,
              hamlet_partner_company: isPartnerSignup ? 'HAMLET Partner' : null,
            },
          },
        });
        if (authError) throw authError;
        window.localStorage.removeItem('hamlet:referral-code');
        if (data.session && data.user) {
          await resolveRoleAndNavigate(data.user.id, true);
          return;
        }
        setMessage('Account created. Confirm your email, then sign in to continue to your workspace.');
        setMode('signin');
        return;
      }

      const { data, error: authError } = await client.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (authError) throw authError;
      if (data.user) await resolveRoleAndNavigate(data.user.id, false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'We could not complete that request. Please try again.');
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

      <div role="tablist" aria-label="Authentication mode" className="mb-6 flex gap-1.5 rounded-full bg-paper p-1.5">
        <button type="button" role="tab" aria-selected={mode === 'signin'} onClick={() => { setMode('signin'); setError(''); setMessage(''); }} className={`min-h-[44px] flex-1 rounded-full text-sm font-bold transition ${mode === 'signin' ? 'bg-white text-ink-900 shadow-xs' : 'text-ink-600 hover:text-ink-900'}`}>Sign in</button>
        <button type="button" role="tab" aria-selected={mode === 'signup'} onClick={() => { setMode('signup'); setError(''); setMessage(''); }} className={`min-h-[44px] flex-1 rounded-full text-sm font-bold transition ${mode === 'signup' ? 'bg-white text-ink-900 shadow-xs' : 'text-ink-600 hover:text-ink-900'}`}>Create account</button>
      </div>

      {(mode === 'signin' || (mode === 'signup' && !isPartnerSignup)) && (
        <div className="mb-5 space-y-4">
          <GoogleContinueButton mode={mode === 'signup' ? 'signup' : 'signin'} busy={oauthBusy} disabled={busy} onClick={() => void handleGoogleAuth()} />
          <div className="relative flex items-center py-0.5">
            <div className="flex-grow border-t border-ink-200/80" />
            <span className="mx-3 shrink-0 text-[11px] font-bold uppercase tracking-wider text-ink-400">or continue with email</span>
            <div className="flex-grow border-t border-ink-200/80" />
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Email address">
          {fieldProps => <input {...fieldProps} required type="email" inputMode="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className={FIELD_INPUT_CLASS} />}
        </FormField>

        {mode !== 'reset' && (
          <FormField label="Password">
            {fieldProps => (
              <div className="relative">
                <input {...fieldProps} required minLength={8} type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" className={`${FIELD_INPUT_CLASS} pr-12`} />
                <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink-500 hover:text-ink-900">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            )}
          </FormField>
        )}

        {mode === 'signin' && (
          <div className="flex justify-end">
            <button type="button" onClick={() => { setMode('reset'); setError(''); setMessage(''); }} className="border-0 bg-transparent p-0 text-xs font-semibold text-brass-700 hover:text-ink-900">Forgot password?</button>
          </div>
        )}

        {error && <p role="alert" className="m-0 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold leading-relaxed text-red-800">{error}</p>}
        {message && <p role="status" className="m-0 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold leading-relaxed text-emerald-800">{message}</p>}

        <div className="space-y-2 pt-1">
          <button type="submit" disabled={busy || oauthBusy} className="primary-button min-h-[48px] w-full">
            {busy ? (mode === 'reset' ? 'Sending link…' : mode === 'signup' ? 'Creating account…' : 'Signing in…') : mode === 'reset' ? 'Send password reset link' : mode === 'signup' ? 'Create my account' : 'Sign in to HAMLET'}
          </button>
          {mode === 'reset' && <button type="button" onClick={() => { setMode('signin'); setError(''); }} className="secondary-button min-h-[44px] w-full">Back to sign in</button>}
        </div>
      </form>
    </div>
  );
}
