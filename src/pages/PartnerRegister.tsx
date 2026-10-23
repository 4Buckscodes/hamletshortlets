import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Users, BadgePercent, ShieldCheck, ArrowRight, CheckCircle2, ChevronLeft, CircleAlert,
} from 'lucide-react';
import { HamletMark } from '../components/Logo';
import { useHamlet } from '../lib/store';
import { useToast } from '../lib/toast';
import { AREAS } from '../lib/seed';

const ROLES = [
  { value: 'Property Owner', blurb: 'List homes you own' },
  { value: 'Agent (authorised)', blurb: 'Manage listings for owners — with mandate' },
  { value: 'Property Manager', blurb: 'Full management — check-in, maintenance, issues' },
  { value: 'Shortlet Operator', blurb: 'Operate multiple units as a business' },
  { value: 'Co-host / Hospitality Operator', blurb: 'Guest-facing hosting services' },
  { value: 'Referral Partner', blurb: 'Refer owners — commission only when specifically agreed' },
];

export default function PartnerRegister() {
  const { registerPartner, signIn, state, backendConfigured } = useHamlet();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', company: '', role: 'Property Owner',
    propertiesCount: 1, motivation: '',
  });
  const [areas, setAreas] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: k === 'propertiesCount' ? Number(e.target.value) : e.target.value }));

  const toggleArea = (a: string) => setAreas(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (backendConfigured && (!state.session || state.session.role !== 'guest')) {
      setErrors({ account: 'Create or sign in to a guest account before submitting a partner application.' });
      return;
    }
    if (backendConfigured && state.session?.email.toLowerCase() !== form.email.trim().toLowerCase()) {
      setErrors({ account: 'Use the same email address as your signed-in account.' });
      return;
    }
    const errs: Record<string, string> = {};
    if (form.name.trim().length < 3) errs.name = 'Enter the full name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email.';
    if (form.phone.trim().length < 7) errs.phone = 'Enter a reachable phone number.';
    if (form.company.trim().length < 2) errs.company = 'Enter the company or trading name.';
    if (form.propertiesCount < 1) errs.propertiesCount = 'Enter at least one property.';
    if (areas.length === 0) errs.areas = 'Select at least one Lagos area.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSubmitting(true);
    try {
      const result = await registerPartner({ ...form, areas });
      if (!result.ok) { setErrors({ account: result.error ?? 'Could not submit your application.' }); return; }
      if (!backendConfigured) await signIn(form.email, 'demo1234');
      setDone(true);
      toast(backendConfigured ? 'Application submitted for review.' : 'Application submitted — demo partner account signed in.');
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
            <h1 className="mt-3 font-display text-4xl font-black leading-[1.06] text-paper">List on verified<br />ground.</h1>
            <p className="mt-4 max-w-sm text-[13px] font-medium leading-relaxed text-ink-100">One partner registration for owners, agents, property managers, shortlet operators, co-hosts and referral partners. Approval, role-based access, explicit property assignments — and a 0% HAMLET owner fee.</p>
            <ul className="mt-6 space-y-3 text-[12px] font-semibold text-ink-100">
              {[
                { Icon: BadgePercent, t: '0% owner fee — guests pay HAMLET’s 3%, you never do' },
                { Icon: ShieldCheck, t: 'Evidence-based verification builds trust with every guest you receive' },
                { Icon: Users, t: 'Role-based access: you only ever see your own data and authorised properties' },
                { Icon: Building2, t: 'Commissions recorded only when specifically agreed in writing' },
              ].map(({ Icon, t }) => (
                <li key={t} className="flex items-start gap-2.5"><Icon size={16} className="mt-0.5 shrink-0 text-brass-400" />{t}</li>
              ))}
            </ul>
          </div>
          <p className="text-[10.5px] font-semibold text-ink-500">Lagos pilot · Applications reviewed manually · No admin access is ever granted publicly</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center overflow-y-auto p-4 py-10 sm:p-8 lg:col-span-3">
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center">
              <CheckCircle2 size={56} className="mx-auto text-jade-400" />
              <h2 className="mt-5 font-display text-3xl font-black text-paper">Application received.</h2>
              <p className="mt-3 text-[13px] font-medium leading-relaxed text-ink-200">Thank you, {form.name.split(' ')[0]}. Your partner application is in the review queue. HAMLET operations manually reviews every application and property — you will hear from us through the workspace.</p>
              <p className="mt-4 rounded-2xl border border-ink-800 bg-ink-900 px-5 py-3.5 text-[11.5px] font-semibold text-ink-300">{backendConfigured ? 'Your guest account remains active while HAMLET reviews your application. Partner access is granted only after approval.' : <>You are signed in to your demo partner workspace. Properties you submit will enter <span className="text-brass-300">submitted</span> status until reviewed.</>}</p>
              <div className="mt-6 flex justify-center gap-3">
                <button onClick={() => navigate(backendConfigured ? '/account' : '/partner')} className="btn-brass">{backendConfigured ? 'Return to account' : 'Go to workspace'} <ArrowRight size={16} /></button>
                <Link to="/" className="btn-ghost-dark">Back to site</Link>
              </div>
            </motion.div>
          ) : (
            <motion.form key="form" exit={{ opacity: 0, y: -12 }} onSubmit={submit} className="w-full max-w-xl">
              <Link to="/" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-ink-400 hover:text-ink-100"><ChevronLeft size={13} /> Back to hamlet.ng</Link>
              <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.24em] text-brass-400">Apply to join</p>
              <h2 className="mt-1.5 font-display text-3xl font-black text-paper">Partner application</h2>
              <p className="mt-1 text-[12px] font-medium text-ink-300">Every application is reviewed manually. Submitting here never grants admin access — roles and permissions are assigned by HAMLET after verification.</p>
              {backendConfigured && !state.session && <p className="mt-3 rounded-xl border border-brass-500/40 bg-brass-500/10 p-3 text-[11px] font-semibold text-brass-200">Sign in or create a guest account first, then return here to submit your application. <Link to="/signin?mode=signup" className="underline">Create guest account</Link> · <Link to="/signin" className="underline">Sign in</Link></p>}
              {backendConfigured && state.session?.role === 'guest' && <p className="mt-3 rounded-xl border border-jade-700 bg-jade-900/40 p-3 text-[11px] font-semibold text-jade-100">Signed in as {state.session.email}; enter this same email below.</p>}
              {errors.account && <p role="alert" className="mt-3 rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-[11px] font-semibold text-red-200">{errors.account}</p>}

              <div className="mt-6 grid gap-3.5 sm:grid-cols-2">
                <label className="sm:col-span-2"><span className="label-dark">Full name</span><input className={`input-dark ${errors.name ? '!border-red-500' : ''}`} value={form.name} onChange={set('name')} placeholder="Tunde Adeyemi" />{errors.name && <Err msg={errors.name} />}</label>
                <label><span className="label-dark">Email</span><input type="email" className={`input-dark ${errors.email ? '!border-red-500' : ''}`} value={form.email} onChange={set('email')} placeholder="you@company.com" />{errors.email && <Err msg={errors.email} />}</label>
                <label><span className="label-dark">Phone (reachable)</span><input className={`input-dark ${errors.phone ? '!border-red-500' : ''}`} value={form.phone} onChange={set('phone')} placeholder="+234 800 000 0000" />{errors.phone && <Err msg={errors.phone} />}</label>
                <label className="sm:col-span-2"><span className="label-dark">Company / trading name</span><input className={`input-dark ${errors.company ? '!border-red-500' : ''}`} value={form.company} onChange={set('company')} placeholder="e.g. Adeyemi Estates Ltd / private owner" />{errors.company && <Err msg={errors.company} />}</label>
                <div className="sm:col-span-2">
                  <span className="label-dark">Your role</span>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {ROLES.map(r => (
                      <button key={r.value} type="button" onClick={() => setForm(f => ({ ...f, role: r.value }))} title={r.blurb}
                        className={`rounded-xl border px-2.5 py-2.5 text-left text-[10.5px] font-bold leading-tight transition ${form.role === r.value ? 'border-brass-500 bg-brass-500/15 text-brass-200' : 'border-ink-800 text-ink-300 hover:border-ink-600'}`}>{r.value}</button>
                    ))}
                  </div>
                </div>
                <label><span className="label-dark">Properties to list (count)</span><input type="number" min={1} className={`input-dark ${errors.propertiesCount ? '!border-red-500' : ''}`} value={form.propertiesCount} onChange={set('propertiesCount')} />{errors.propertiesCount && <Err msg={errors.propertiesCount} />}</label>
                <div className="sm:col-span-1">
                  <span className="label-dark">Areas of operation {errors.areas && <span className="text-red-400 normal-case">— {errors.areas}</span>}</span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {AREAS.map(a => (
                      <button key={a} type="button" onClick={() => toggleArea(a)} className={`rounded-full border px-2.5 py-1.5 text-[10px] font-bold transition ${areas.includes(a) ? 'border-brass-500 bg-brass-500 text-ink-950' : 'border-ink-800 text-ink-300 hover:border-ink-600'}`}>{a}</button>
                    ))}
                  </div>
                </div>
                <label className="sm:col-span-2"><span className="label-dark">Motivation & experience <span className="normal-case text-ink-500">(optional)</span></span>
                  <textarea className="input-dark min-h-[84px]" value={form.motivation} onChange={set('motivation')} placeholder="Share your experience or tell us why you’d like to work with HAMLET…" />
                </label>
              </div>

              <p className="mt-4 flex items-start gap-2 text-[10px] font-medium leading-relaxed text-ink-500"><CircleAlert size={12} className="mt-0.5 shrink-0" /> By applying you consent to a manual review of your identity, authority and documentation. Providing false information leads to rejection or suspension. Your data is handled under the HAMLET privacy notice (NDPR-aligned).</p>

              <button type="submit" disabled={submitting} className="btn-brass mt-4 w-full !py-4 text-[15px]">{submitting ? 'Submitting…' : 'Submit application'} <ArrowRight size={16} /></button>
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
