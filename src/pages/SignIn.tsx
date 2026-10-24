import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ShieldCheck, ArrowRight, User, Building2, KeyRound, ChevronDown, Eye, EyeOff, UserPlus, LogIn, Home, MailCheck,
} from 'lucide-react';
import { HamletMark } from '../components/Logo';
import { useHamlet } from '../lib/store';
import { HAMLET_TAGLINE, usePageMeta } from '../lib/brand';
import { useToast } from '../lib/toast';
import {
  resolvePostSignInRedirect,
  resolvePostSignUpRedirect,
  sanitizeGuestRedirect,
  sanitizeInternalRedirect,
} from '../lib/authRedirect';

const DEMO_ACCOUNTS = [
  { role: 'Guest', email: 'guest@hamlet.ng', desc: 'Book stays, track lifecycle, pay, report issues', Icon: User, color: 'text-jade-700 bg-jade-50 border-jade-200' },
  { role: 'Partner', email: 'partner@hamlet.ng', desc: 'Owner portal — properties, bookings, earnings (0% owner fee)', Icon: Building2, color: 'text-brass-700 bg-brass-200/40 border-brass-400/50' },
  { role: 'Admin', email: 'admin@hamlet.ng', desc: 'HAMLET operations — reviews, ledger, issues, audit log', Icon: KeyRound, color: 'text-red-800 bg-red-50 border-red-200' },
];

type AuthMode = 'signin' | 'signup' | 'forgot' | 'reset';

export default function SignIn() {
  usePageMeta(
    'Sign In or Create Account | HAMLET',
    'Sign in or create your HAMLET account to book shortlets in Lagos, track reservations, complete checkout, or manage your partner properties.',
  );

  const {
    state,
    signIn,
    signUpGuest,
    requestPasswordReset,
    updatePassword,
    passwordRecoveryPending,
    clearPasswordRecovery,
    backendConfigured,
  } = useHamlet();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawMode = searchParams.get('mode');
  const activeMode: AuthMode = passwordRecoveryPending
    ? 'reset'
    : rawMode === 'signup'
      ? 'signup'
      : rawMode === 'forgot'
        ? 'forgot'
        : rawMode === 'reset'
          ? 'reset'
          : 'signin';
  const creatingAccount = activeMode === 'signup';
  const redirectParam = searchParams.get('redirect');
  const safeGuestRedirect = sanitizeGuestRedirect(redirectParam);
  const safeInternalRedirect = sanitizeInternalRedirect(redirectParam);
  const returningToProperty = Boolean(safeGuestRedirect && safeGuestRedirect.startsWith('/stays/'));
  const returningToPartnerWorkspace = Boolean(
    safeInternalRedirect &&
      (safeInternalRedirect === '/partner' ||
        (safeInternalRedirect.startsWith('/partner/') &&
          !safeInternalRedirect.startsWith('/partner/register'))),
  );
  const returningToAdminWorkspace = Boolean(
    safeInternalRedirect &&
      (safeInternalRedirect === '/admin' || safeInternalRedirect.startsWith('/admin/')),
  );

  const [email, setEmail] = useState(() => (backendConfigured || creatingAccount ? '' : 'guest@hamlet.ng'));
  const [password, setPassword] = useState(() => (backendConfigured || creatingAccount ? '' : 'demo1234'));
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const updateAuthParams = (mode: AuthMode, nextRedirect?: string | null) => {
    const resolvedRedirect =
      nextRedirect !== undefined
        ? nextRedirect
        : mode === 'signup'
          ? safeGuestRedirect
          : safeInternalRedirect;
    const next = new URLSearchParams();
    if (mode !== 'signin') next.set('mode', mode);
    if (resolvedRedirect) next.set('redirect', resolvedRedirect);
    setSearchParams(next, { replace: true });
  };

  const switchMode = (mode: AuthMode) => {
    setError('');
    setInfoMessage('');
    if (mode !== 'reset') clearPasswordRecovery();
    if (mode === 'signup') {
      if (DEMO_ACCOUNTS.some(acc => acc.email === email)) {
        setEmail('');
        setPassword('');
      }
      setConfirmPassword('');
      updateAuthParams('signup');
    } else {
      setConfirmPassword('');
      updateAuthParams(mode);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (activeMode === 'forgot') {
      setLoading(true);
      try {
        const res = await requestPasswordReset(email);
        if (!res.ok) {
          setError(res.error ?? 'Could not send password reset instructions.');
          return;
        }
        setInfoMessage(
          backendConfigured
            ? `If an account exists for ${email.trim()}, a password recovery link has been sent to that inbox.`
            : 'In local demo mode, all sample accounts sign in with demo1234.',
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    if (activeMode === 'reset') {
      if (password.length < 6) {
        setError('New password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      setLoading(true);
      try {
        const res = await updatePassword(password);
        if (!res.ok) {
          setError(res.error ?? 'Could not update your password.');
          return;
        }
        toast('Your password has been updated.');
        setPassword('');
        setConfirmPassword('');
        const target = resolvePostSignInRedirect(state.session?.role, redirectParam);
        navigate(target, { replace: true });
      } finally {
        setLoading(false);
      }
      return;
    }

    if (creatingAccount) {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      if (creatingAccount) {
        const res = await signUpGuest({ name, email, password, phone });
        if (!res.ok) {
          setError(res.error ?? 'Account creation failed.');
          return;
        }
        const postSignUpDestination =
          res.role === 'admin'
            ? '/admin'
            : res.role === 'partner'
              ? '/partner'
              : resolvePostSignUpRedirect(redirectParam);
        if (res.needsEmailConfirmation) {
          updateAuthParams('signin', postSignUpDestination);
          setPassword('');
          setConfirmPassword('');
          setInfoMessage('Account created. Check your email to confirm your address, then sign in below.');
          return;
        }
        toast(
          res.role === 'admin'
            ? 'Welcome to HAMLET — your Administrator Console is ready.'
            : returningToProperty
              ? 'Welcome to HAMLET — returning you to complete your booking request.'
              : 'Welcome to HAMLET — explore verified Lagos stays.',
        );
        navigate(postSignUpDestination, { replace: true });
        return;
      }

      const res = await signIn(email, password);
      if (!res.ok) {
        setError(res.error ?? 'Sign in failed.');
        return;
      }
      toast('Welcome back.');
      navigate(resolvePostSignInRedirect(res.role, redirectParam), { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not complete your request.');
    } finally {
      setLoading(false);
    }
  };

  const quick = (acc: (typeof DEMO_ACCOUNTS)[number]) => {
    if (activeMode !== 'signin') updateAuthParams('signin');
    setEmail(acc.email);
    setPassword('demo1234');
    setError('');
    setInfoMessage('');
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-ink-950 lg:block">
        <img src="/images/lagos-hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-br from-ink-950/80 via-ink-950/55 to-ink-950/90" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link to="/"><div className="flex items-center gap-3"><HamletMark size={40} light /><span className="font-display text-3xl font-black text-paper">HAMLET<span className="text-brass-500">.</span></span></div></Link>
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-brass-300">{HAMLET_TAGLINE}</p>
            <h1 className="mt-2 font-display text-5xl font-black leading-[1.05] text-paper">Shortlet stays,<br /><span className="italic text-brass-400">sorted before you arrive.</span></h1>
            <p className="mt-5 max-w-md text-[14px] font-medium leading-relaxed text-ink-100">Compare locations, amenities, house rules, and total pricing before you commit — with clear booking status and support from request to check-out.</p>
            <div className="mt-6 space-y-2 text-[12.5px] font-semibold text-ink-200">
              {['Manual, evidence-based verification before any listing goes live', 'Total price visible before you commit — 20% domestic markup, 0% owner fee', 'Payment confirmed only by server-side provider webhook'].map(t => (
                <p key={t} className="flex items-start gap-2"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-brass-400" />{t}</p>
              ))}
            </div>
          </div>
          <p className="text-[11px] font-semibold text-ink-400">Lagos pilot · v1.0 · Verified short-stay operations</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-paper px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 lg:hidden"><HamletMark size={32} /><span className="font-display text-2xl font-black text-ink-900">HAMLET<span className="text-brass-500">.</span></span></Link>

          {/* Prominent Sign in / Guest sign up mode switcher */}
          <div role="tablist" aria-label="Account mode" className="mb-6 grid grid-cols-2 gap-1.5 rounded-2xl border border-ink-200 bg-white p-1.5 shadow-xs">
            <button
              type="button"
              role="tab"
              aria-selected={activeMode === 'signin'}
              onClick={() => switchMode('signin')}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[12.5px] font-bold transition ${
                activeMode === 'signin'
                  ? 'bg-ink-900 text-ink-50 shadow-xs'
                  : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
              }`}
            >
              <LogIn size={15} /> Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={creatingAccount}
              onClick={() => switchMode('signup')}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[12.5px] font-bold transition ${
                creatingAccount
                  ? 'bg-jade-700 text-white shadow-xs'
                  : 'text-jade-800 hover:bg-jade-50'
              }`}
            >
              <UserPlus size={15} /> Create account
            </button>
          </div>

          {returningToProperty && (
            <p className="mb-4 flex items-center gap-2 rounded-xl border border-jade-200 bg-jade-50 px-3 py-2.5 text-[11.5px] font-semibold text-jade-900">
              <Home size={14} className="shrink-0 text-jade-700" />
              <span>
                You’ll return directly to your selected stay after {creatingAccount ? 'creating your account' : 'signing in'}.
              </span>
            </p>
          )}
          {activeMode === 'signin' && returningToPartnerWorkspace && (
            <p className="mb-4 flex items-center gap-2 rounded-xl border border-brass-400/50 bg-brass-200/30 px-3 py-2.5 text-[11.5px] font-semibold text-ink-900">
              <Building2 size={14} className="shrink-0 text-brass-700" />
              <span>
                Sign in with your authorised partner account to open your requested booking directly in the Partner Workspace.
              </span>
            </p>
          )}
          {activeMode === 'signin' && returningToAdminWorkspace && (
            <p className="mb-4 flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-[11.5px] font-semibold text-ink-800">
              <KeyRound size={14} className="shrink-0 text-ink-700" />
              <span>
                Sign in with your HAMLET operations account to open the requested booking directly.
              </span>
            </p>
          )}

          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-jade-700">
            {activeMode === 'signup'
              ? 'New HAMLET account'
              : activeMode === 'forgot'
                ? 'Password recovery'
                : activeMode === 'reset'
                  ? 'Choose new password'
                  : 'Welcome back'}
          </p>
          <h2 className="mt-1 font-display text-3xl font-black text-ink-900">
            {activeMode === 'signup'
              ? 'Create your account'
              : activeMode === 'forgot'
                ? 'Reset your password'
                : activeMode === 'reset'
                  ? 'Set a new password'
                  : 'Sign in'}
          </h2>
          <p className="mt-1 text-[12.5px] font-medium text-ink-500">
            {activeMode === 'signup'
              ? 'Request verified Lagos stays, track booking status, complete checkout and contact support. Pre-authorised HAMLET operators are routed directly to the Admin Console.'
              : activeMode === 'forgot'
                ? 'Enter the email address on your HAMLET account to receive a secure password reset link.'
                : activeMode === 'reset'
                  ? 'Enter and confirm your new password (at least 6 characters) to finish securing your account.'
                  : 'One account experience for clients, partners and HAMLET operations — access is role-based.'}
          </p>

          {activeMode === 'signin' && !backendConfigured && (
            <div className="mt-5">
              <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-ink-400">
                <ChevronDown size={12} /> Demo accounts (password: demo1234)
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {DEMO_ACCOUNTS.map(acc => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => quick(acc)}
                    title={acc.desc}
                    className={`flex items-center gap-2.5 rounded-2xl border p-2.5 text-left transition hover:-translate-y-0.5 hover:shadow-md sm:block ${acc.color} ${email === acc.email ? 'ring-2 ring-ink-900' : ''}`}
                  >
                    <acc.Icon size={18} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-black text-ink-900 sm:mt-1.5">{acc.role}</p>
                      <p className="truncate text-[10.5px] font-semibold text-ink-600">{acc.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {infoMessage && (
            <p role="status" className="mt-4 flex items-start gap-2 rounded-xl border border-jade-200 bg-jade-50 px-3 py-2.5 text-[12px] font-semibold text-jade-900">
              <MailCheck size={16} className="mt-0.5 shrink-0 text-jade-700" />
              <span>{infoMessage}</span>
            </p>
          )}

          <form onSubmit={submit} className="mt-5 space-y-3">
            {creatingAccount && (
              <label className="block">
                <span className="label">Full name</span>
                <input
                  type="text"
                  required
                  minLength={2}
                  className="input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoComplete="name"
                  placeholder="Adaeze Okafor"
                />
              </label>
            )}
            {activeMode !== 'reset' && (
              <label className="block">
                <span className="label">Email</span>
                <input
                  type="email"
                  required
                  className="input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </label>
            )}
            {creatingAccount && (
              <label className="block">
                <span className="label">Phone number (recommended for check-in coordination)</span>
                <input
                  type="tel"
                  className="input"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  autoComplete="tel"
                  placeholder="+234 800 000 0000"
                />
              </label>
            )}
            {activeMode !== 'forgot' && (
              <label className="block">
                <span className="flex items-center justify-between">
                  <span className="label !mb-0">{activeMode === 'reset' ? 'New password' : 'Password'}</span>
                  {activeMode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-[11px] font-bold text-jade-800 hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </span>
                <span className="relative mt-1.5 block">
                  <input
                    type={show ? 'text' : 'password'}
                    required
                    minLength={creatingAccount || activeMode === 'reset' ? 6 : undefined}
                    className="input pr-11"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete={creatingAccount || activeMode === 'reset' ? 'new-password' : 'current-password'}
                    placeholder={creatingAccount || activeMode === 'reset' ? 'At least 6 characters' : '••••••••'}
                  />
                  <button
                    type="button"
                    onClick={() => setShow(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
                    aria-label={show ? 'Hide password' : 'Show password'}
                  >
                    {show ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </label>
            )}
            {(creatingAccount || activeMode === 'reset') && (
              <label className="block">
                <span className="label">Confirm password</span>
                <input
                  type={show ? 'text' : 'password'}
                  required
                  minLength={6}
                  className="input"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                />
              </label>
            )}
            {error && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] font-semibold text-red-800">
                {error}
              </p>
            )}
            <button type="submit" disabled={loading} className="btn-jade w-full !py-4 text-[15px]">
              {loading ? 'Please wait…' : (
                <>
                  {activeMode === 'signup'
                    ? (returningToProperty ? 'Create account & continue' : 'Create account')
                    : activeMode === 'forgot'
                      ? 'Send recovery link'
                      : activeMode === 'reset'
                        ? 'Save new password'
                        : 'Sign in'}{' '}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Secondary mode button */}
          <div className="mt-4">
            {activeMode === 'signin' ? (
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="btn-outline w-full !py-3 text-[13px]"
              >
                <UserPlus size={15} /> New to HAMLET? Create account
              </button>
            ) : (
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="btn-outline w-full !py-3 text-[13px]"
              >
                <LogIn size={15} /> Back to sign in
              </button>
            )}
          </div>

          <p className="mt-6 text-center text-[12.5px] font-medium text-ink-500">
            Own or manage a Lagos property?{' '}
            <Link to="/partner/register" className="font-bold text-jade-800 hover:underline">Register & apply as a HAMLET partner</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
