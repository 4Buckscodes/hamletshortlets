import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Users, BadgePercent, ShieldCheck, ArrowRight, CheckCircle2, ChevronLeft, CircleAlert,
  RefreshCcw, Eye, EyeOff, LogIn, AlertTriangle, Clock3, Gift,
} from 'lucide-react';
import { HamletMark } from '../components/Logo';
import { useHamlet, getPersistedPartnerRefCode } from '../lib/store';
import { usePageMeta } from '../lib/brand';
import { useToast } from '../lib/toast';
import { AREAS } from '../lib/seed';
import { formatDateTime } from '../lib/pricing';

const ROLES = [
  { value: 'Property Owner', blurb: 'List homes you own directly' },
  { value: 'Agent (authorised)', blurb: 'Manage listings for owners — with mandate' },
  { value: 'Property Manager', blurb: 'Full management — check-in, maintenance, issues' },
  { value: 'Shortlet Operator', blurb: 'Operate multiple units as a business' },
  { value: 'Co-host / Hospitality Operator', blurb: 'Guest-facing hosting services' },
  { value: 'Closing Agent', blurb: 'Close guest bookings — earn 10% commission' },
  { value: 'Referral Partner', blurb: 'Refer partners — earn 2.5% for 90 days after activation' },
];

export default function PartnerRegister() {
  usePageMeta(
    'List Your Lagos Shortlet Property | HAMLET Partners',
    'Own or manage a shortlet in Lagos? Join the HAMLET partner network to showcase your property, manage bookings, and reach serious guests.',
  );

  const {
    registerPartner,
    resubmitPartnerApplication,
    resolveReferralCode,
    refreshState,
    signIn,
    state,
    backendConfigured,
  } = useHamlet();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const session = state.session;

  const existingApplication = useMemo(() => {
    if (!session) return undefined;
    return state.applications.find(
      a =>
        a.applicantId === session.userId ||
        a.email.toLowerCase() === session.email.toLowerCase(),
    );
  }, [state.applications, session]);

  const isCorrectionMode = existingApplication?.status === 'needs_correction';

  const [done, setDone] = useState(false);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [form, setForm] = useState(() => ({
    name: existingApplication?.name ?? session?.name ?? '',
    email: existingApplication?.email ?? session?.email ?? '',
    phone: existingApplication?.phone ?? session?.phone ?? '',
    company: existingApplication?.company ?? session?.company ?? '',
    role: existingApplication?.role ?? 'Property Owner',
    propertiesCount: existingApplication?.propertiesCount ?? 1,
    motivation: existingApplication?.motivation ?? '',
  }));
  const [areas, setAreas] = useState<string[]>(() => existingApplication?.areas ?? []);
  const [referralCode, setReferralCode] = useState<string>(
    () => searchParams.get('ref') ?? existingApplication?.referredByCode ?? getPersistedPartnerRefCode(),
  );
  const [resolvedReferrer, setResolvedReferrer] = useState<{ valid: boolean; referrerName?: string; referrerCompany?: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const trimmed = referralCode.trim();
    if (!trimmed) {
      Promise.resolve().then(() => { if (active) setResolvedReferrer(null); });
      return () => { active = false; };
    }
    void resolveReferralCode(trimmed).then(res => {
      if (active) setResolvedReferrer(res);
    });
    return () => { active = false; };
  }, [referralCode, resolveReferralCode]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: k === 'propertiesCount' ? Number(e.target.value) : e.target.value }));

  const toggleArea = (a: string) =>
    setAreas(prev => (prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]));

  const handleRefreshStatus = async () => {
    setRefreshing(true);
    try {
      await refreshState();
      toast('Latest application & role status loaded.');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not refresh status.', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveEmail = session ? session.email : form.email.trim().toLowerCase();
    const errs: Record<string, string> = {};
    if (form.name.trim().length < 2) errs.name = 'Enter your full name.';
    if (!/^\S+@\S+\.\S+$/.test(effectiveEmail)) errs.email = 'Enter a valid email address.';
    if (form.phone.trim().length < 7) errs.phone = 'Enter a reachable phone number.';
    if (form.company.trim().length < 2) errs.company = 'Enter your company or trading name.';
    const isNonListingAgentRole = form.role === 'Closing Agent' || form.role === 'Referral Partner';
    if (form.propertiesCount < (isNonListingAgentRole ? 0 : 1)) {
      errs.propertiesCount = isNonListingAgentRole
        ? 'Properties count cannot be negative.'
        : 'Enter at least one property.';
    }
    if (areas.length === 0) errs.areas = 'Select at least one Lagos area.';
    if (form.motivation.trim().length < 20) {
      errs.motivation = 'Briefly describe your portfolio & authority basis (at least 20 characters).';
    }

    if (backendConfigured && !session) {
      if (password.length < 6) {
        errs.password = 'Choose a password of at least 6 characters.';
      } else if (password !== confirmPassword) {
        errs.confirmPassword = 'Passwords do not match.';
      }
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      if (isCorrectionMode && existingApplication) {
        await resubmitPartnerApplication(existingApplication.id, {
          name: form.name.trim(),
          phone: form.phone.trim(),
          company: form.company.trim(),
          role: form.role,
          areas,
          propertiesCount: form.propertiesCount,
          motivation: form.motivation.trim(),
          referralCode: referralCode.trim(),
        });
        toast('Updated partner application resubmitted for HAMLET review.');
        setDone(true);
        return;
      }

      const result = await registerPartner({
        ...form,
        email: effectiveEmail,
        areas,
        password: password || undefined,
        referralCode: referralCode.trim() || undefined,
      });
      if (!result.ok) {
        setErrors({ account: result.error ?? 'Could not submit your application.' });
        return;
      }
      if (result.needsEmailConfirmation) {
        setNeedsEmailConfirm(true);
        setDone(true);
        toast('Account created — confirm your email to complete your partner application.');
        return;
      }
      if (!backendConfigured) await signIn(effectiveEmail, password || 'demo1234');
      setDone(true);
      toast(
        backendConfigured
          ? 'Partner account created & application submitted for manual review.'
          : 'Application submitted — demo partner workspace ready.',
      );
    } catch (error) {
      setErrors({ account: error instanceof Error ? error.message : 'Could not submit your application.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-ink-950 lg:grid-cols-5">
      {/* Value panel */}
      <div className="relative hidden overflow-hidden lg:col-span-2 lg:block">
        <img src="/images/prop/penthouse.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-br from-ink-950/85 via-ink-950/60 to-ink-950" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Link to="/" className="flex items-center gap-2.5"><HamletMark size={30} light /><span className="font-display text-xl font-black text-paper">HAMLET<span className="text-brass-500">.</span></span></Link>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-brass-400">HAMLET Partner Network</p>
            <h1 className="mt-3 font-display text-4xl font-black leading-[1.06] text-paper">Bring your property<br />to the right guests.</h1>
            <p className="mt-4 max-w-sm text-[13px] font-medium leading-relaxed text-ink-100">Own or manage a shortlet in Lagos? HAMLET helps property owners, managers, and hospitality partners showcase their spaces clearly, connect with serious guests, and manage bookings in one organised place.</p>
            <ul className="mt-6 space-y-3 text-[12px] font-semibold text-ink-100">
              {[
                { Icon: BadgePercent, t: '0% owner fee — owners receive 100% of their listed rate; guests pay HAMLET’s 20% domestic markup' },
                { Icon: ShieldCheck, t: 'List even if currently occupied — publish now for future available dates' },
                { Icon: Users, t: 'Closing agents earn 10% · Direct partner referrers earn 2.5% for 90 days after activation' },
                { Icon: Building2, t: 'All attributions & commissions recorded independently in the controlled ledger' },
              ].map(({ Icon, t }) => (
                <li key={t} className="flex items-start gap-2.5"><Icon size={16} className="mt-0.5 shrink-0 text-brass-400" />{t}</li>
              ))}
            </ul>
          </div>
          <p className="text-[10.5px] font-semibold text-ink-500">Lagos pilot · Applications reviewed manually · No admin access is ever granted publicly</p>
        </div>
      </div>

      {/* Form / Status panel */}
      <div className="flex items-center justify-center overflow-y-auto p-4 py-10 sm:p-8 lg:col-span-3">
        <AnimatePresence mode="wait">
          {session && (session.role === 'partner' || session.role === 'admin') ? (
            <motion.div key="already-partner" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md rounded-3xl border border-ink-800 bg-ink-900 p-6 text-center sm:p-8">
              <CheckCircle2 size={52} className="mx-auto text-jade-400" />
              <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.22em] text-brass-400">
                {session.role === 'admin' ? 'Administrator active' : 'Approved partner active'}
              </p>
              <h2 className="mt-1.5 font-display text-2xl font-black text-paper">
                {session.role === 'admin' ? 'Your Admin Console is ready' : 'Your Partner Workspace is active'}
              </h2>
              <p className="mt-2 text-[13px] font-medium leading-relaxed text-ink-300">
                Signed in as <strong className="text-ink-100">{session.email}</strong>. Manage properties, availability confirmations and earnings directly from your workspace.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate(session.role === 'admin' ? '/admin' : '/partner')}
                  className="btn-brass"
                >
                  Open {session.role === 'admin' ? 'Admin Console' : 'Partner Workspace'} <ArrowRight size={16} />
                </button>
                <Link to="/" className="btn-ghost-dark">Back to site</Link>
              </div>
            </motion.div>
          ) : done ? (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center">
              <CheckCircle2 size={56} className="mx-auto text-jade-400" />
              <h2 className="mt-5 font-display text-3xl font-black text-paper">
                {needsEmailConfirm ? 'Confirm your email' : 'Application in review.'}
              </h2>
              <p className="mt-3 text-[13px] font-medium leading-relaxed text-ink-200">
                {needsEmailConfirm
                  ? `We created your HAMLET account for ${form.email}. Confirm the link sent to your inbox, then sign in here to submit your partner details.`
                  : `Thank you, ${form.name.split(' ')[0]}. Your partner application for ${form.company} is in the HAMLET operations review queue.`}
              </p>
              <p className="mt-4 rounded-2xl border border-ink-800 bg-ink-900 px-5 py-3.5 text-[11.5px] font-semibold text-ink-300">
                {backendConfigured
                  ? 'You can track your application review status anytime from your HAMLET account. As soon as HAMLET operations approves your application, your Partner Workspace unlocks automatically.'
                  : <>You are signed in to your demo partner workspace. Properties you submit will enter <span className="text-brass-300">submitted</span> status until reviewed.</>}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate(needsEmailConfirm ? '/signin?redirect=%2Fpartner%2Fregister' : backendConfigured ? '/account' : '/partner')}
                  className="btn-brass"
                >
                  {needsEmailConfirm ? 'Go to sign in' : backendConfigured ? 'Track status in my account' : 'Go to workspace'} <ArrowRight size={16} />
                </button>
                <Link to="/" className="btn-ghost-dark">Back to site</Link>
              </div>
            </motion.div>
          ) : existingApplication && existingApplication.status === 'pending' ? (
            <motion.div key="pending-tracker" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg rounded-3xl border border-ink-800 bg-ink-900 p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-[10.5px] font-extrabold uppercase tracking-wider text-amber-300">
                  <Clock3 size={13} /> Pending manual review
                </span>
                {backendConfigured && (
                  <button
                    type="button"
                    disabled={refreshing}
                    onClick={() => void handleRefreshStatus()}
                    className="btn-ghost-dark !border !border-ink-700 !px-3 !py-1.5 text-[11px] disabled:opacity-50"
                  >
                    <RefreshCcw size={12} className={refreshing ? 'animate-spin' : ''} /> Refresh status
                  </button>
                )}
              </div>
              <h2 className="mt-4 font-display text-2xl font-black text-paper">{existingApplication.company}</h2>
              <p className="mt-1 text-[12px] font-medium text-ink-300">
                {existingApplication.role} · {existingApplication.propertiesCount} propert{existingApplication.propertiesCount === 1 ? 'y' : 'ies'} · {existingApplication.areas.join(', ')}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-ink-500">
                Submitted {formatDateTime(existingApplication.submittedAt)}
              </p>
              <p className="mt-4 rounded-2xl border border-ink-800 bg-ink-950/70 p-4 text-[12px] font-medium leading-relaxed text-ink-200">
                HAMLET operations is reviewing your identity, company details and authority scope. Once approved, refreshing this page or signing in will take you straight into the Partner Workspace.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/account" className="btn-brass !py-2.5 text-[12px]">Go to my account <ArrowRight size={14} /></Link>
                <Link to="/" className="btn-ghost-dark !py-2.5 text-[12px]">Back to site</Link>
              </div>
            </motion.div>
          ) : (
            <motion.form key="form" exit={{ opacity: 0, y: -12 }} onSubmit={submit} className="w-full max-w-xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link to="/" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-ink-400 hover:text-ink-100"><ChevronLeft size={13} /> Back to HAMLET</Link>
                {!session && (
                  <Link
                    to="/signin?redirect=%2Fpartner%2Fregister"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-ink-800 bg-ink-900 px-3 py-1.5 text-[11px] font-bold text-brass-300 hover:border-brass-500/40"
                  >
                    <LogIn size={13} /> Already have an account? Sign in
                  </Link>
                )}
              </div>

              <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.24em] text-brass-400">
                {isCorrectionMode ? 'Respond to reviewer feedback' : 'Apply to join'}
              </p>
              <h2 className="mt-1.5 font-display text-3xl font-black text-paper">
                {isCorrectionMode ? 'Update & resubmit partner application' : 'Partner registration & application'}
              </h2>
              <p className="mt-1 text-[12px] font-medium text-ink-300">
                {isCorrectionMode
                  ? 'Address the correction note from HAMLET operations below and resubmit your application for review.'
                  : !session && backendConfigured
                    ? 'Create your HAMLET account and submit your partner application in one step. Every application is manually verified by HAMLET operations.'
                    : 'Every application is reviewed manually. Submitting here never grants admin access — roles and permissions are assigned by HAMLET after verification.'}
              </p>

              {isCorrectionMode && existingApplication?.reviewNote && (
                <div role="alert" className="mt-4 flex items-start gap-2.5 rounded-2xl border border-orange-500/45 bg-orange-950/35 p-4 text-[12px] font-semibold text-orange-200">
                  <AlertTriangle size={17} className="mt-0.5 shrink-0 text-orange-400" />
                  <div>
                    <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-orange-300">Correction requested by HAMLET operations</p>
                    <p className="mt-1 leading-relaxed">{existingApplication.reviewNote}</p>
                  </div>
                </div>
              )}

              {existingApplication?.status === 'rejected' && existingApplication.reviewNote && (
                <div className="mt-4 rounded-2xl border border-red-500/35 bg-red-950/30 p-3.5 text-[11.5px] font-semibold text-red-200">
                  Previous application note: {existingApplication.reviewNote}
                </div>
              )}

              {session?.role === 'guest' && !isCorrectionMode && (
                <p className="mt-3 rounded-xl border border-jade-700 bg-jade-900/40 p-3 text-[11px] font-semibold text-jade-100">
                  Signed in as <strong>{session.email}</strong> — your partner application will be linked directly to this account.
                </p>
              )}

              {errors.account && <p role="alert" className="mt-3 rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-[11px] font-semibold text-red-200">{errors.account}</p>}

              <div className="mt-6 grid gap-3.5 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="label-dark">Full name</span>
                  <input className={`input-dark ${errors.name ? '!border-red-500' : ''}`} value={form.name} onChange={set('name')} placeholder="Tunde Adeyemi" />
                  {errors.name && <Err msg={errors.name} />}
                </label>

                <label>
                  <span className="label-dark">Email</span>
                  <input
                    type="email"
                    disabled={Boolean(session)}
                    className={`input-dark disabled:opacity-65 ${errors.email ? '!border-red-500' : ''}`}
                    value={session ? session.email : form.email}
                    onChange={set('email')}
                    placeholder="you@company.com"
                  />
                  {errors.email && <Err msg={errors.email} />}
                </label>

                <label>
                  <span className="label-dark">Phone (reachable WhatsApp / mobile)</span>
                  <input className={`input-dark ${errors.phone ? '!border-red-500' : ''}`} value={form.phone} onChange={set('phone')} placeholder="+234 800 000 0000" />
                  {errors.phone && <Err msg={errors.phone} />}
                </label>

                {backendConfigured && !session && (
                  <>
                    <label>
                      <span className="label-dark">Create account password</span>
                      <span className="relative block">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          className={`input-dark pr-10 ${errors.password ? '!border-red-500' : ''}`}
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          autoComplete="new-password"
                          placeholder="At least 6 characters"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(v => !v)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-200"
                        >
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </span>
                      {errors.password && <Err msg={errors.password} />}
                    </label>

                    <label>
                      <span className="label-dark">Confirm password</span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className={`input-dark ${errors.confirmPassword ? '!border-red-500' : ''}`}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        placeholder="Re-enter password"
                      />
                      {errors.confirmPassword && <Err msg={errors.confirmPassword} />}
                    </label>
                  </>
                )}

                <label className="sm:col-span-2">
                  <span className="label-dark">Company / trading name (or private owner name)</span>
                  <input className={`input-dark ${errors.company ? '!border-red-500' : ''}`} value={form.company} onChange={set('company')} placeholder="e.g. Adeyemi Estates Ltd / Private Deeded Owner" />
                  {errors.company && <Err msg={errors.company} />}
                </label>

                <div className="sm:col-span-2">
                  <span className="label-dark">Your partner role</span>
                  <div className="grid grid-cols-1 gap-1.5 min-[420px]:grid-cols-2 sm:grid-cols-3">
                    {ROLES.map(r => {
                      const nonInventory = r.value === 'Closing Agent' || r.value === 'Referral Partner';
                      return (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() =>
                            setForm(f => ({
                              ...f,
                              role: r.value,
                              propertiesCount: nonInventory
                                ? 0
                                : f.propertiesCount === 0
                                  ? 1
                                  : f.propertiesCount,
                            }))
                          }
                          className={`rounded-xl border px-3 py-2.5 text-left transition ${form.role === r.value ? 'border-brass-500 bg-brass-500/15 text-brass-200' : 'border-ink-800 text-ink-300 hover:border-ink-600'}`}
                        >
                          <span className="block text-[11px] font-bold leading-tight">{r.value}</span>
                          <span className="mt-0.5 block text-[9.5px] font-medium leading-snug text-ink-400">{r.blurb}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label>
                  <span className="label-dark">Properties to list (0 if closing/referral only)</span>
                  <input type="number" min={0} className={`input-dark ${errors.propertiesCount ? '!border-red-500' : ''}`} value={form.propertiesCount} onChange={set('propertiesCount')} />
                  {errors.propertiesCount && <Err msg={errors.propertiesCount} />}
                </label>

                <div className="sm:col-span-1">
                  <span className="label-dark">Lagos areas of operation {errors.areas && <span className="normal-case text-red-400">— {errors.areas}</span>}</span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {AREAS.map(a => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => toggleArea(a)}
                        className={`rounded-full border px-2.5 py-1.5 text-[10px] font-bold transition ${areas.includes(a) ? 'border-brass-500 bg-brass-500 text-ink-950' : 'border-ink-800 text-ink-300 hover:border-ink-600'}`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="sm:col-span-2">
                  <span className="label-dark flex items-center gap-1.5"><Gift size={12} className="text-brass-400" /> Partner referral code (optional)</span>
                  <input
                    className="input-dark font-mono uppercase"
                    value={referralCode}
                    onChange={e => setReferralCode(e.target.value)}
                    placeholder="e.g. HML-ADEWALE-1A2B"
                  />
                  {referralCode.trim() && resolvedReferrer && (
                    <span className={`mt-1 block text-[10.5px] font-bold ${resolvedReferrer.valid ? 'text-jade-400' : 'text-amber-300'}`}>
                      {resolvedReferrer.valid
                        ? `Referred by ${resolvedReferrer.referrerName}${resolvedReferrer.referrerCompany ? ` (${resolvedReferrer.referrerCompany})` : ''} — verified server-side on approval.`
                        : 'Code not matched to an active approved partner (self-referrals and unrecognised codes are ignored).'}
                    </span>
                  )}
                </label>

                <label className="sm:col-span-2">
                  <span className="label-dark">Portfolio, authority basis & operational experience</span>
                  <textarea
                    className={`input-dark min-h-[88px] ${errors.motivation ? '!border-red-500' : ''}`}
                    value={form.motivation}
                    onChange={set('motivation')}
                    placeholder="Describe your Lagos properties, whether you hold title deeds or a signed owner mandate, power/security setup, and hosting experience…"
                  />
                  {errors.motivation && <Err msg={errors.motivation} />}
                </label>
              </div>

              <p className="mt-4 flex items-start gap-2 text-[10px] font-medium leading-relaxed text-ink-500">
                <CircleAlert size={12} className="mt-0.5 shrink-0" /> By applying you consent to a manual review of your identity, authority and documentation. Providing false information leads to rejection or suspension. Your data is handled under the HAMLET privacy notice (NDPR-aligned).
              </p>

              <button type="submit" disabled={submitting} className="btn-brass mt-4 w-full !py-4 text-[15px]">
                {submitting
                  ? 'Submitting…'
                  : isCorrectionMode
                    ? 'Save corrections & resubmit'
                    : !session && backendConfigured
                      ? 'Create account & submit partner application'
                      : 'Submit partner application'}{' '}
                <ArrowRight size={16} />
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Err({ msg }: { msg: string }) {
  return <span className="mt-1 block text-[10px] font-bold text-red-400">{msg}</span>;
}
