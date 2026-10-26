'use client';

import { FormEvent, useMemo, useState } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type Mode = 'signin' | 'signup';

function getSafeNextPath(): string {
  const next = new URLSearchParams(window.location.search).get('next');
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/legacy';
}

function makeBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key);
}

export default function SignInForm() {
  const client = useMemo(() => makeBrowserClient(), []);
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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
        const { error: authError } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (authError) throw authError;
        window.location.assign('/legacy');
        return;
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'We could not complete that request. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, padding: 5, borderRadius: 999, background: '#f1eee7', marginBottom: 24 }}>
        <button type="button" onClick={() => { setMode('signin'); setError(''); setMessage(''); }} aria-pressed={mode === 'signin'} style={{ flex: 1, minHeight: 42, border: 0, borderRadius: 999, cursor: 'pointer', background: mode === 'signin' ? '#fff' : 'transparent', color: 'var(--navy)', fontWeight: 700 }}>Sign in</button>
        <button type="button" onClick={() => { setMode('signup'); setError(''); setMessage(''); }} aria-pressed={mode === 'signup'} style={{ flex: 1, minHeight: 42, border: 0, borderRadius: 999, cursor: 'pointer', background: mode === 'signup' ? '#fff' : 'transparent', color: 'var(--navy)', fontWeight: 700 }}>Create account</button>
      </div>
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
        <button className="primary-button" type="submit" disabled={busy} style={{ width: '100%', opacity: busy ? .7 : 1 }}>
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
