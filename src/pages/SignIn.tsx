import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ShieldCheck, ArrowRight, User, Building2, KeyRound, ChevronDown, Eye, EyeOff, UserPlus, LogIn, Home,
} from 'lucide-react';
import { HamletMark } from '../components/Logo';
import { useHamlet } from '../lib/store';
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

export default function SignIn() {
  const { signIn, signUpGuest, backendConfigured } = useHamlet();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const creatingAccount = searchParams.get('mode') === 'signup';
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

  const updateAuthParams = (signup: boolean, nextRedirect?: string | null) => {
    const resolvedRedirect =
      nextRedirect !== undefined
        ? nextRedirect
        : signup
          ? safeGuestRedirect
          : safeInternalRedirect;
    const next = new URLSearchParams();
    if (signup) next.set('mode', 'signup');
    if (resolvedRedirect) next.set('redirect', resolvedRedirect);
    setSearchParams(next, { replace: true });
  };

  const switchMode = (signup: boolean) => {
    setError('');
    setInfoMessage('');
    if (signup) {
      if (DEMO_ACCOUNTS.some(acc => acc.email === email)) {
        setEmail('');
        setPassword('');
      }
      setConfirmPassword('');
      updateAuthParams(true);
    } else {
      setConfirmPassword('');
      updateAuthParams(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

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
        const postSignUpDestination = resolvePostSignUpRedirect(redirectParam);
        if (res.needsEmailConfirmation) {
          updateAuthParams(false, postSignUpDestination);
          setPassword('');
          setConfirmPassword('');
          setInfoMessage('Guest account created. Check your email to confirm your address, then sign in below.');
          return;
        }
        toast(
          returningToProperty
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
    if (creatingAccount) updateAuthParams(false);
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
            <h1 className="font-display text-5xl font-black leading-[1.05] text-paper">Verified homes.<br /><span className="italic text-brass-400">Real accountability.</span></h1>
            <p className="mt-5 max-w-md text-[14px] font-medium leading-relaxed text-ink-100">From listing review through booking, stay, issue resolution and settlement — every actor is named, every naira is ledgered.</p>
            <div className="mt-6 space-y-2 text-[12.5px] font-semibold text-ink-200">
              {['Manual, evidence-based verification before any listing goes live', 'Total price visible before you commit — 3% guest fee, 0% owner fee', 'Payment confirmed only by server-side provider webhook'].map(t => (
                <p key={t} className="flex items-start gap-2"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-brass-400" />{t}</p>
              ))}
            </div>
          </div>
          <p className="text-[11px] font-semibold text-ink-400">Lagos pilot · v1.0 · Decision date 11 Oct 2026</p>
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
              aria-selected={!creatingAccount}
              onClick={() => switchMode(false)}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[12.5px] font-bold transition ${
                !creatingAccount
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
              onClick={() => switchMode(true)}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[12.5px] font-bold transition ${
                creatingAccount
                  ? 'bg-jade-700 text-white shadow-xs'
                  : 'text-jade-800 hover:bg-jade-50'
              }`}
            >
              <UserPlus size={15} /> Guest sign up
            </button>
          </div>

          {returningToProperty && (
            <p className="mb-4 flex items-center gap-2 rounded-xl border border-jade-200 bg-jade-50 px-3 py-2.5 text-[11.5px] font-semibold text-jade-900">
              <Home size={14} className="shrink-0 text-jade-700" />
              <span>
                You’ll return directly to your selected stay after {creatingAccount ? 'creating your guest account' : 'signing in'}.
              </span>
            </p>
          )}
          {!creatingAccount && returningToPartnerWorkspace && (
            <p className="mb-4 flex items-center gap-2 rounded-xl border border-brass-400/50 bg-brass-200/30 px-3 py-2.5 text-[11.5px] font-semibold text-ink-900">
              <Building2 size={14} className="shrink-0 text-brass-700" />
              <span>
                Sign in with your authorised partner account to open your requested booking directly in the Partner Workspace.
              </span>
            </p>
          )}
          {!creatingAccount && returningToAdminWorkspace && (
            <p className="mb-4 flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-[11.5px] font-semibold text-ink-800">
              <KeyRound size={14} className="shrink-0 text-ink-700" />
              <span>
                Sign in with your HAMLET operations account to open the requested booking directly.
              </span>
            </p>
          )}

          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-jade-700">
            {creatingAccount ? 'New guest account' : 'Welcome back'}
          </p>
          <h2 className="mt-1 font-display text-3xl font-black text-ink-900">
            {creatingAccount ? 'Create guest account' : 'Sign in'}
          </h2>
          <p className="mt-1 text-[12.5px] font-medium text-ink-500">
            {creatingAccount
              ? 'Create a guest account to request verified Lagos stays, track booking status, complete payment and contact support.'
              : 'One account experience for guests, partners and HAMLET operations — access is role-based.'}
          </p>

          {!creatingAccount && !backendConfigured && (
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
            <p role="status" className="mt-4 rounded-xl border border-jade-200 bg-jade-50 px-3 py-2.5 text-[12px] font-semibold text-jade-900">
              {infoMessage}
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
            {creatingAccount && (
              <label className="block">
                <span className="label">Phone number (optional)</span>
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
            <label className="block">
              <span className="label">Password</span>
              <span className="relative block">
                <input
                  type={show ? 'text' : 'password'}
                  required
                  minLength={creatingAccount ? 6 : undefined}
                  className="input pr-11"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete={creatingAccount ? 'new-password' : 'current-password'}
                  placeholder={creatingAccount ? 'At least 6 characters' : '••••••••'}
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
            {creatingAccount && (
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
                  {creatingAccount
                    ? (returningToProperty ? 'Create guest account & continue' : 'Create guest account')
                    : 'Sign in'}{' '}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Secondary button so Guest Sign Up / Sign In is always one click away */}
          <div className="mt-4">
            {creatingAccount ? (
              <button
                type="button"
                onClick={() => switchMode(false)}
                className="btn-outline w-full !py-3 text-[13px]"
              >
                <LogIn size={15} /> Already have an account? Sign in
              </button>
            ) : (
              <button
                type="button"
                onClick={() => switchMode(true)}
                className="btn-outline w-full !py-3 text-[13px]"
              >
                <UserPlus size={15} /> New to HAMLET? Create guest account
              </button>
            )}
          </div>

          <p className="mt-6 text-center text-[12.5px] font-medium text-ink-500">
            Own or manage a property?{' '}
            <Link to="/partner/register" className="font-bold text-jade-800 hover:underline">Apply as a HAMLET partner</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
