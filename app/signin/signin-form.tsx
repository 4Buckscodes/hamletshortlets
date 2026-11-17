'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type Mode = 'signin' | 'signup';

function getSafeNextPath(): string {
  const next = new URLSearchParams(window.location.search).get('next');
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/account/bookings';
}

function makeBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true } });
}

export default function SignInForm() {
  const client = useMemo(() => makeBrowserClient(), []);
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!client) return;
    let active = true;
    const { data: listener } = client.auth.onAuthStateChange((event, session) => {
      if (active && session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        const next = getSafeNextPath();
        window.location.replace(next);
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [client]);

  async function continueWithGoogle() {
    setError('');
    setMessage('');
    if (!client) {
      setError('HAMLET account access is not configured on this deployment yet.');
      return;
    }
    setOauthBusy(true);
    try {
      const callback = new URL('/signin', window.location.origin);
      callback.searchParams.set('next', getSafeNextPath());
      const { error: authError } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: callback.toString(), queryParams: { prompt: 'select_account' } },
      });
      if (authError) throw authError;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Google sign-in could not be started. Please try again.');
      setOauthBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!client) {
      setError('HAMLET account access is not configured on this deployment yet. Please try again later.');
      return;
    }
    if (mode === 'signup' && name.trim().length < 2) {
      setError('Enter your full name to create your account.');
      return;
    }
    if (password.length < 8) {
      setError('Use a password with at least 8 characters.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error: authError } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name.trim(), phone: phone.trim() || null } },
        });
        if (authError) throw authError;
        if (data.session) {
          window.location.assign(getSafeNextPath());
          return;
        }
        setMessage('Your account request was created. Check your email for a confirmation link, then return here to sign in.');
        setMode('signin');
      } else {
        const { error: authError } = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        window.location.assign(getSafeNextPath());
        return;
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'We could not complete that request. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || oauthBusy;
  return (
    <div>
      <div className="auth-switch" style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button type="button" onClick={() => { setMode('signin'); setError(''); setMessage(''); }} aria-pressed={mode === 'signin'} style={{ flex: 1, minHeight: 42, border: 0, borderRadius: 999, cursor: 'pointer', background: mode === 'signin' ? '#fff' : 'transparent', color: 'var(--navy)', fontWeight: 700 }}>Sign in</button>
        <button type="button" onClick={() => { setMode('signup'); setError(''); setMessage(''); }} aria-pressed={mode === 'signup'} style={{ flex: 1, minHeight: 42, border: 0, borderRadius: 999, cursor: 'pointer', background: mode === 'signup' ? '#fff' : 'transparent', color: 'var(--navy)', fontWeight: 700 }}>Create account</button>
      </div>
      <button type="button" onClick={() => void continueWithGoogle()} disabled={disabled} style={{ width: '100%', minHeight: 48, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10, border: '1px solid #dedbd3', borderRadius: 12, background: '#fff', color: 'var(--navy)', fontWeight: 700, cursor: disabled ? 'wait' : 'pointer', opacity: disabled ? .65 : 1 }}>
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.9c-.58 2.96-2.25 5.48-4.73 7.18l7.62 5.91c4.45-4.1 7.19-10.14 7.19-17.56Z"/><path fill="#FBBC05" d="M10.54 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.98-6.19Z"/><path fill="#34A853" d="M24 48c6.47 0 11.91-2.13 15.88-5.89l-7.62-5.91c-2.12 1.42-4.83 2.27-8.26 2.27-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>
        {oauthBusy ? 'Connecting to Google…' : 'Continue with Google'}
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0', color: 'var(--muted)', fontSize: 12 }}><span style={{ height: 1, background: '#dedbd3', flex: 1 }} /><span>or continue with email</span><span style={{ height: 1, background: '#dedbd3', flex: 1 }} /></div>
      <form onSubmit={submit} style={{ display: 'grid', gap: 15 }}>
        {mode === 'signup' && <>
          <label style={{ display: 'grid', gap: 7, fontSize: 14, fontWeight: 650 }}>Full name
            <input required autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" style={fieldStyle} />
          </label>
          <label style={{ display: 'grid', gap: 7, fontSize: 14, fontWeight: 650 }}>Phone number <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span>
            <input autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+234…" style={fieldStyle} />
          </label>
        </>}
        <label style={{ display: 'grid', gap: 7, fontSize: 14, fontWeight: 650 }}>Email address
          <input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={fieldStyle} />
        </label>
        <label style={{ display: 'grid', gap: 7, fontSize: 14, fontWeight: 650 }}>Password
          <input required type="password" minLength={8} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" style={fieldStyle} />
        </label>
        {error && <p role="alert" style={{ margin: 0, padding: 12, borderRadius: 12, background: '#fff0ee', color: '#9f2d20', fontSize: 14, lineHeight: 1.5 }}>{error}</p>}
        {message && <p role="status" style={{ margin: 0, padding: 12, borderRadius: 12, background: '#edf7ef', color: '#236238', fontSize: 14, lineHeight: 1.5 }}>{message}</p>}
        <button className="primary-button" type="submit" disabled={disabled} style={{ width: '100%', opacity: disabled ? .7 : 1 }}>
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in to HAMLET' : 'Create my account'}
        </button>
      </form>
      <p style={{ color: 'var(--muted)', fontSize: 12, lineHeight: 1.65, marginTop: 18 }}>
        By continuing, you agree to use HAMLET responsibly. Account permissions are controlled by HAMLET; creating an account does not automatically grant partner or administrator access.
      </p>
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 48,
  border: '1px solid #dedbd3',
  borderRadius: 12,
  background: '#fff',
  color: 'var(--navy)',
  padding: '0 14px',
  outlineOffset: 2,
};
