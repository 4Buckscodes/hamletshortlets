import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, User, Building2, KeyRound, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { HamletMark } from '../components/Logo';
import { useHamlet } from '../lib/store';
import { useToast } from '../lib/toast';

const DEMO_ACCOUNTS = [
  { role: 'Guest', email: 'guest@hamlet.ng', desc: 'Book stays, track lifecycle, pay, report issues', Icon: User, color: 'text-jade-700 bg-jade-50 border-jade-200' },
  { role: 'Partner', email: 'partner@hamlet.ng', desc: 'Owner portal — properties, bookings, earnings (0% owner fee)', Icon: Building2, color: 'text-brass-700 bg-brass-200/40 border-brass-400/50' },
  { role: 'Admin', email: 'admin@hamlet.ng', desc: 'HAMLET operations — reviews, ledger, issues, audit log', Icon: KeyRound, color: 'text-red-800 bg-red-50 border-red-200' },
];

export default function SignIn() {
  const { signIn, signUpGuest, backendConfigured } = useHamlet();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState(backendConfigured ? '' : 'guest@hamlet.ng');
  const [password, setPassword] = useState(backendConfigured ? '' : 'demo1234');
  const [name, setName] = useState('');
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      if (creatingAccount) {
        const res = await signUpGuest({ name, email, password });
        if (!res.ok) { setError(res.error ?? 'Account creation failed.'); return; }
        if (res.needsEmailConfirmation) {
          setError('Account created. Check your email to confirm it, then sign in here.');
          setCreatingAccount(false);
          return;
        }
        toast('Your guest account is ready.');
        navigate('/account');
        return;
      }
      const res = await signIn(email, password);
      if (!res.ok) { setError(res.error ?? 'Sign in failed.'); return; }
      toast('Welcome back.');
      navigate(res.role === 'admin' ? '/admin' : res.role === 'partner' ? '/partner' : '/account');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not complete your request.');
    } finally {
      setLoading(false);
    }
  };

  const quick = (acc: (typeof DEMO_ACCOUNTS)[number]) => {
    setEmail(acc.email); setPassword('demo1234'); setError('');
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-ink-950 lg:block">
        <img src="/images/lagos-hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-br from-ink-950/80 via-ink-950/55 to-ink-950/90" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link to="/"><div className="flex items-center gap-3"><HamletMark size={40} /><span className="font-display text-3xl font-black text-paper">HAMLET<span className="text-brass-500">.</span></span></div></Link>
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
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-jade-700">Welcome back</p>
          <h2 className="mt-1 font-display text-3xl font-black text-ink-900">Sign in</h2>
          <p className="mt-1 text-[12.5px] font-medium text-ink-500">One account experience for guests, partners and HAMLET operations — access is role-based.</p>

          {!backendConfigured && <div className="mt-5">
            <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-ink-400"><ChevronDown size={12} /> Demo accounts (password: demo1234)</p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map(acc => (
                <button key={acc.email} onClick={() => quick(acc)} title={acc.desc}
                  className={`rounded-2xl border p-2.5 text-left transition hover:-translate-y-0.5 hover:shadow-md ${acc.color} ${email === acc.email ? 'ring-2 ring-ink-900' : ''}`}>
                  <acc.Icon size={18} />
                  <p className="mt-1.5 text-[11px] font-black text-ink-900">{acc.role}</p>
                  <p className="truncate text-[10.5px] font-semibold text-ink-600">{acc.email}</p>
                </button>
              ))}
            </div>
          </div>}

          <form onSubmit={submit} className="mt-5 space-y-3">
            {creatingAccount && <label className="block">
              <span className="label">Full name</span>
              <input type="text" required minLength={2} className="input" value={name} onChange={e => setName(e.target.value)} autoComplete="name" placeholder="Your full name" />
            </label>}
            <label className="block">
              <span className="label">Email</span>
              <input type="email" required className="input" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" />
            </label>
            <label className="block">
              <span className="label">Password</span>
              <span className="relative block">
                <input type={show ? 'text' : 'password'} required className="input pr-11" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" placeholder="••••••••" />
                <button type="button" onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700" aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </span>
            </label>
            {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] font-semibold text-red-800">{error}</p>}
            <button type="submit" disabled={loading} className="btn-jade w-full !py-4 text-[15px]">{loading ? 'Please wait…' : <>{creatingAccount ? 'Create guest account' : 'Sign in'} <ArrowRight size={16} /></>}</button>
          </form>

          {backendConfigured && <button
            type="button"
            onClick={() => { setCreatingAccount(value => !value); setError(''); }}
            className="mt-4 w-full text-center text-[12.5px] font-bold text-jade-800 hover:underline"
          >{creatingAccount ? 'Already have an account? Sign in' : 'New to HAMLET? Create a guest account'}</button>}

          <p className="mt-6 text-center text-[12.5px] font-medium text-ink-500">
            Own or manage a property?{' '}
            <Link to="/partner/register" className="font-bold text-jade-800 hover:underline">Apply as a HAMLET partner</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
