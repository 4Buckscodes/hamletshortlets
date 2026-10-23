import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Building2, Mail, BadgeCheck, Clock3, AlertCircle, XCircle, Phone, KeyRound } from 'lucide-react';
import { useHamlet } from '../../lib/store';
import { useToast } from '../../lib/toast';
import { formatDateTime } from '../../lib/pricing';

export default function PartnerProfile() {
  const { state, updateProfile, updatePassword } = useHamlet();
  const { toast } = useToast();
  const s = state.session!;
  const application = state.applications.find(a => a.applicantId === s.userId || a.email === s.email);

  const [fullName, setFullName] = useState(s.name);
  const [phone, setPhone] = useState(s.phone ?? application?.phone ?? '');
  const [company, setCompany] = useState(s.company ?? application?.company ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const statusIcon = {
    pending: <Clock3 size={18} className="text-amber-400" />,
    approved: <BadgeCheck size={18} className="text-jade-400" />,
    needs_correction: <AlertCircle size={18} className="text-orange-400" />,
    rejected: <XCircle size={18} className="text-red-400" />,
  }[application?.status ?? 'pending'];

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await updateProfile({ name: fullName, phone, company });
      if (!res.ok) {
        toast(res.error ?? 'Could not save profile.', 'error');
        return;
      }
      toast('Partner profile updated.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast('Password must be at least 6 characters.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast('Passwords do not match.', 'error');
      return;
    }
    setSavingPassword(true);
    try {
      const res = await updatePassword(newPassword);
      if (!res.ok) {
        toast(res.error ?? 'Could not update password.', 'error');
        return;
      }
      setNewPassword('');
      setConfirmPassword('');
      toast('Partner password updated.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-brass-400">Your account</p>
      <h1 className="mt-1.5 font-display text-2xl font-black text-ink-50 sm:text-3xl">Profile, security & application</h1>

      {/* Identity card */}
      <div className="mt-6 rounded-2xl border border-ink-800 bg-ink-900 p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brass-500 font-display text-lg font-black text-ink-950 sm:h-16 sm:w-16 sm:text-xl">{s.name.split(' ').map(w => w[0]).slice(0, 2).join('')}</span>
          <div className="min-w-0">
            <h2 className="break-words font-display text-xl font-black text-ink-50">{s.name}</h2>
            <p className="text-[12px] font-bold text-brass-300">{s.partnerRole}</p>
            <p className="break-words text-[12px] font-medium text-ink-400">{s.company}</p>
          </div>
        </div>
        <dl className="mt-5 grid gap-3 border-t border-ink-800 pt-5 text-[12.5px] font-medium text-ink-100 sm:grid-cols-3">
          <div className="flex min-w-0 items-center gap-2.5"><Mail size={15} className="shrink-0 text-ink-500" /><span className="break-all">{s.email}</span></div>
          <div className="flex min-w-0 items-center gap-2.5"><Phone size={15} className="shrink-0 text-ink-500" /><span className="break-words">{s.phone || application?.phone || 'Add phone below'}</span></div>
          <div className="flex min-w-0 items-center gap-2.5"><Building2 size={15} className="shrink-0 text-ink-500" /><span className="break-words">{s.company ?? '—'}</span></div>
        </dl>
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-jade-500/25 bg-jade-500/5 px-4 py-3 text-[11px] font-medium leading-relaxed text-jade-200">
          <ShieldCheck size={14} className="mt-0.5 shrink-0" />
          <span>Your role determines exactly what you can see and do: your own profile, properties you are authorised on, permitted booking data for those properties, and commissions agreed with you in writing. Public registration never grants admin access, and partners can never see other partners' private data.</span>
        </div>
      </div>

      {/* Editable contact & password security */}
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <form onSubmit={handleSaveProfile} className="rounded-2xl border border-ink-800 bg-ink-900 p-4 sm:p-6">
          <h3 className="font-display text-base font-black text-ink-50">Update contact details</h3>
          <p className="mt-1 text-[11.5px] font-medium text-ink-400">Keep your operational phone and trading name accurate for HAMLET coordination.</p>
          <label className="mt-4 block">
            <span className="label-dark">Full name</span>
            <input className="input-dark" required minLength={2} value={fullName} onChange={e => setFullName(e.target.value)} />
          </label>
          <label className="mt-3 block">
            <span className="label-dark">Phone (reachable mobile / WhatsApp)</span>
            <input className="input-dark" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+234 800 000 0000" />
          </label>
          <label className="mt-3 block">
            <span className="label-dark">Company / trading name</span>
            <input className="input-dark" value={company} onChange={e => setCompany(e.target.value)} />
          </label>
          <button type="submit" disabled={savingProfile} className="btn-brass mt-4 w-full !py-2.5 text-[12px] disabled:opacity-50">
            {savingProfile ? 'Saving…' : 'Save profile'}
          </button>
        </form>

        <form onSubmit={handleSavePassword} className="rounded-2xl border border-ink-800 bg-ink-900 p-4 sm:p-6">
          <h3 className="flex items-center gap-2 font-display text-base font-black text-ink-50"><KeyRound size={15} className="text-brass-400" /> Change password</h3>
          <p className="mt-1 text-[11.5px] font-medium text-ink-400">Rotate your partner account password at any time.</p>
          <label className="mt-4 block">
            <span className="label-dark">New password</span>
            <input type="password" required minLength={6} className="input-dark" value={newPassword} onChange={e => setNewPassword(e.target.value)} autoComplete="new-password" placeholder="At least 6 characters" />
          </label>
          <label className="mt-3 block">
            <span className="label-dark">Confirm new password</span>
            <input type="password" required minLength={6} className="input-dark" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" placeholder="Re-enter password" />
          </label>
          <button type="submit" disabled={savingPassword} className="btn-ghost-dark mt-4 w-full !border !border-ink-700 !py-2.5 text-[12px] disabled:opacity-50">
            {savingPassword ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>

      {/* Application status */}
      {application ? (
        <div className="mt-5 rounded-2xl border border-ink-800 bg-ink-900 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-base font-black text-ink-50">Partner application</h3>
            <span className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-ink-300 [&>svg]:shrink-0">{statusIcon}{application.status.replace('_', ' ')}</span>
          </div>
          <dl className="mt-4 grid gap-3 text-[12px] font-medium text-ink-100 sm:grid-cols-2">
            <div><dt className="text-[9.5px] font-extrabold uppercase tracking-widest text-ink-500">Submitted</dt><dd className="mt-0.5">{formatDateTime(application.submittedAt)}</dd></div>
            <div><dt className="text-[9.5px] font-extrabold uppercase tracking-widest text-ink-500">Role applied for</dt><dd className="mt-0.5">{application.role}</dd></div>
            <div><dt className="text-[9.5px] font-extrabold uppercase tracking-widest text-ink-500">Areas</dt><dd className="mt-0.5">{application.areas.join(', ')}</dd></div>
            <div><dt className="text-[9.5px] font-extrabold uppercase tracking-widest text-ink-500">Portfolio</dt><dd className="mt-0.5">{application.propertiesCount} propert{application.propertiesCount === 1 ? 'y' : 'ies'}</dd></div>
            <div className="sm:col-span-2"><dt className="text-[9.5px] font-extrabold uppercase tracking-widest text-ink-500">Motivation</dt><dd className="mt-0.5 leading-relaxed text-ink-200">{application.motivation}</dd></div>
          </dl>
          {application.reviewNote && (
            <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[12px] font-medium text-amber-100"><span className="font-extrabold uppercase text-[10px] tracking-widest">Reviewer note:</span><br />{application.reviewNote}</p>
          )}
          {application.status === 'approved' && <p className="mt-4 text-[12px] font-semibold text-jade-300">Approved — you may submit properties for review from the My Properties section.</p>}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-ink-700 px-6 py-8 text-center">
          <p className="text-[13px] font-semibold text-ink-300">Approved HAMLET partner account.</p>
          <Link to="/partner/properties/new" className="btn-brass mt-4 !py-2.5 text-[12px]">List a property</Link>
        </div>
      )}
    </div>
  );
}
