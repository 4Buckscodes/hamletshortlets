'use client';

import Link from 'next/link';
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
import { FormField } from '@/components/forms/ProgressiveFormPrimitives';

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
      const requestedRedirect = readRequestedRedirectFromSearch(window.location.search);
      // Most guests reaching sign-in from a booking are new: open on Create account.
      if (params.get('mode') === 'signup' || (params.get('mode') !== 'signin' && requestedRedirect?.startsWith('/stays/'))) setMode('signup');
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
  const bookingIntent = Boolean(requestedNext?.startsWith('/stays/'));
  const contextHint = requestedNext?.startsWith('/partners')
    ? 'Create your account and open your partner workspace straight away.'
    : requestedNext?.startsWith('/stays/')
      ? 'Your stay, dates and guests are saved. You will come straight back to send the request.'
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
        <div className="hm-notice" style={{ marginBottom: 18, fontWeight: 650 }}>
          <ArrowRight size={16} aria-hidden="true" />
          <span>{contextHint}</span>
        </div>
      )}

      <div role="tablist" aria-label="Authentication mode" className="hm-segmented">
        <button type="button" role="tab" aria-selected={mode === 'signin'} onClick={() => { setMode('signin'); setError(''); setMessage(''); }}>Sign in</button>
        <button type="button" role="tab" aria-selected={mode === 'signup'} onClick={() => { setMode('signup'); setError(''); setMessage(''); }}>Create account</button>
      </div>

      <div className="hm-auth-heading">
        <h2 className="hm-h2">
          {bookingIntent && mode !== 'reset' ? (
            <>
              Almost there. <em>{mode === 'signup' ? 'Create an account' : 'Sign in'}</em> to send your request.
            </>
          ) : mode === 'signup' ? (
            <>
              Create your <em>account.</em>
            </>
          ) : mode === 'reset' ? (
            <>
              Reset your <em>password.</em>
            </>
          ) : (
            <>
              Good to see you <em>again.</em>
            </>
          )}
        </h2>
        <p className="hm-meta">
          {mode === 'signup'
            ? 'Book verified stays or open your partner workspace.'
            : mode === 'reset'
              ? 'We’ll email you a secure link to set a new password.'
              : 'Sign in to manage your bookings or your partner workspace.'}
        </p>
      </div>

      {(mode === 'signin' || (mode === 'signup' && !isPartnerSignup)) && (
        <div className="hm-auth-oauth">
          <GoogleContinueButton mode={mode === 'signup' ? 'signup' : 'signin'} busy={oauthBusy} disabled={busy} onClick={() => void handleGoogleAuth()} />
          <div className="hm-auth-divider">
            <span>or with email</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="hm-auth-fields">
        <FormField label="Email address">
          {fieldProps => <input {...fieldProps} required type="email" inputMode="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="hm-input" />}
        </FormField>

        {mode !== 'reset' && (
          <FormField label="Password">
            {fieldProps => (
              <div className="relative">
                <input {...fieldProps} required minLength={8} type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" className="hm-input" style={{ paddingRight: 52 }} />
                <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="hm-auth-eye">
                  {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
            )}
          </FormField>
        )}

        {mode === 'signup' && lockedReferralCode && (
          <FormField label="Referral code" hint="Applied from invite link.">
            {fieldProps => (
              <input
                {...fieldProps}
                value={lockedReferralCode}
                readOnly
                aria-readonly="true"
                className="hm-input font-mono uppercase"
              />
            )}
          </FormField>
        )}

        {mode === 'signin' && (
          <div className="flex justify-end">
            <button type="button" onClick={() => { setMode('reset'); setError(''); setMessage(''); }} className="hm-link" style={{ fontSize: 13, paddingBottom: 2 }}>Forgot password?</button>
          </div>
        )}

        {error && <p role="alert" className="hm-notice hm-notice-bad">{error}</p>}
        {message && <p role="status" className="hm-notice hm-notice-ok">{message}</p>}

        <div className="hm-auth-actions">
          <button type="submit" disabled={busy || oauthBusy} className="hm-btn hm-btn-primary hm-btn-block">
            {busy ? (mode === 'reset' ? 'Sending link…' : mode === 'signup' ? 'Creating account…' : 'Signing in…') : mode === 'reset' ? 'Send password reset link' : mode === 'signup' ? 'Create my account' : 'Sign in'}
          </button>
          {mode === 'reset' && <button type="button" onClick={() => { setMode('signin'); setError(''); }} className="hm-btn hm-btn-ghost hm-btn-block">Back to sign in</button>}
        </div>
        <p className="hm-field-hint" style={{ margin: 0, textAlign: 'center' }}>
          By continuing you agree to HAMLET’s <Link href="/legal" className="hm-link" style={{ fontSize: 'inherit' }}>terms and privacy notice (NDPR)</Link>.
        </p>
      </form>
    </div>
  );
}
