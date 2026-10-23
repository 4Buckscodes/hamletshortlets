import { Link } from 'react-router-dom';
import { ShieldCheck, Building2, Mail, BadgeCheck, Clock3, AlertCircle, XCircle } from 'lucide-react';
import { useHamlet } from '../../lib/store';
import { formatDateTime } from '../../lib/pricing';

export default function PartnerProfile() {
  const { state } = useHamlet();
  const s = state.session!;
  const application = state.applications.find(a => a.applicantId === s.userId || a.email === s.email);

  const statusIcon = {
    pending: <Clock3 size={18} className="text-amber-400" />,
    approved: <BadgeCheck size={18} className="text-jade-400" />,
    needs_correction: <AlertCircle size={18} className="text-orange-400" />,
    rejected: <XCircle size={18} className="text-red-400" />,
  }[application?.status ?? 'pending'];

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-brass-400">Your account</p>
      <h1 className="mt-1.5 font-display text-2xl font-black text-ink-50 sm:text-3xl">Profile & application</h1>

      {/* Identity card */}
      <div className="mt-6 rounded-2xl border border-ink-800 bg-ink-900 p-6">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brass-500 font-display text-xl font-black text-ink-950">{s.name.split(' ').map(w => w[0]).slice(0, 2).join('')}</span>
          <div>
            <h2 className="font-display text-xl font-black text-ink-50">{s.name}</h2>
            <p className="text-[12px] font-bold text-brass-300">{s.partnerRole}</p>
            <p className="text-[12px] font-medium text-ink-400">{s.company}</p>
          </div>
        </div>
        <dl className="mt-5 grid gap-3 border-t border-ink-800 pt-5 text-[12.5px] font-medium text-ink-100 sm:grid-cols-2">
          <div className="flex items-center gap-2.5"><Mail size={15} className="text-ink-500" />{s.email}</div>
          <div className="flex items-center gap-2.5"><Building2 size={15} className="text-ink-500" />{s.company ?? '—'}</div>
        </dl>
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-jade-500/25 bg-jade-500/5 px-4 py-3 text-[11px] font-medium leading-relaxed text-jade-200">
          <ShieldCheck size={14} className="mt-0.5 shrink-0" />
          <span>Your role determines exactly what you can see and do: your own profile, properties you are authorised on, permitted booking data for those properties, and commissions agreed with you in writing. Public registration never grants admin access, and partners can never see other partners' private data.</span>
        </div>
      </div>

      {/* Application status */}
      {application ? (
        <div className="mt-5 rounded-2xl border border-ink-800 bg-ink-900 p-6">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-display text-base font-black text-ink-50">Partner application</h3>
            <span className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-ink-300">{statusIcon}{application.status.replace('_', ' ')}</span>
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
          <p className="text-[13px] font-semibold text-ink-300">Existing partner account — application record predates the pilot system.</p>
          <Link to="/partner/properties/new" className="btn-brass mt-4 !py-2.5 text-[12px]">List a property</Link>
        </div>
      )}
    </div>
  );
}
