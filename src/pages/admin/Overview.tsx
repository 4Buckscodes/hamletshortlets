import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home, BadgeCheck, Receipt, LifeBuoy, TrendingUp, ArrowRight, ShieldAlert, Gauge, Target,
} from 'lucide-react';
import { useHamlet } from '../../lib/store';
import { formatNaira, formatDateTime } from '../../lib/pricing';

export default function AdminOverview() {
  const { state } = useHamlet();

  const approved = state.properties.filter(p => p.status === 'approved');
  const inReview = state.properties.filter(p => ['submitted', 'needs_correction'].includes(p.status));
  const suspended = state.properties.filter(p => p.status === 'suspended');
  const guestFees = state.ledger.filter(l => l.type === 'guest_service_fee' && ['settled', 'reconciled', 'recorded'].includes(l.status)).reduce((s, l) => s + l.amount, 0);
  const guestCharges = state.ledger.filter(l => l.type === 'guest_charge').reduce((s, l) => s + l.amount, 0);
  const providerCharges = state.ledger.filter(l => l.type === 'provider_charge').reduce((s, l) => s + l.amount, 0);
  const openIssues = state.issues.filter(i => !['resolved', 'closed'].includes(i.status));
  const critical = openIssues.filter(i => i.severity === 'critical' || i.status === 'escalated');
  const varianceTotal = state.ledger.reduce((s, l) => s + Math.abs(l.variance), 0);
  const confirmedCompleted = state.bookings.filter(b => ['confirmed', 'completed'].includes(b.status)).length;
  const kpis = [
    { label: 'Approved properties', value: `${approved.length}/50`, sub: inReview.length > 0 ? `${inReview.length} in review pipeline` : 'Supply target met or in pipeline', Icon: Home, tone: approved.length >= 50 ? 'text-jade-400' : 'text-brass-400' },
    { label: 'Confirmed + completed stays', value: String(confirmedCompleted), sub: 'Pilot success = completed bookings', Icon: BadgeCheck, tone: 'text-jade-400' },
    { label: 'Guest fee revenue (3%)', value: formatNaira(guestFees), sub: 'Guest-paid only · owner fee 0%', Icon: Receipt, tone: 'text-brass-300' },
    { label: 'Open issues', value: String(openIssues.length), sub: critical.length > 0 ? `${critical.length} critical/escalated` : 'None critical', Icon: LifeBuoy, tone: critical.length > 0 ? 'text-red-400' : 'text-sky-400' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Pilot command header */}
      <div className="rounded-2xl border border-brass-500/25 bg-gradient-to-br from-brass-500/10 via-ink-900 to-ink-900 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.24em] text-brass-400"><Gauge size={13} /> Lagos launch · pilot scoreboard</p>
            <h1 className="mt-1.5 font-display text-2xl font-black text-paper sm:text-3xl">Launch operations, live</h1>
            <p className="mt-1 max-w-md text-[12px] font-medium text-ink-300">Success is measured by completed bookings, trustworthy supply, reconciled transactions, resolved issues and repeat demand — not registrations.</p>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right">
              <p className="font-display text-4xl font-black text-brass-400">{approved.length}<span className="text-xl text-ink-500">/50</span></p>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink-400">approved supply target</p>
              <p className="text-[10px] font-semibold text-ink-500">due 31 Oct 2026 · 9 days left</p>
            </div>
            <div className="h-14 w-14">
              <svg viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="24" stroke="#1C2F24" strokeWidth="7" fill="none" />
                <circle cx="28" cy="28" r="24" stroke="#C9A227" strokeWidth="7" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 24}`} strokeDashoffset={`${2 * Math.PI * 24 * (1 - approved.length / 50)}`} transform="rotate(-90 28 28)" className="transition-all duration-700" />
              </svg>
            </div>
          </div>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-ink-800">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-brass-600 via-brass-400 to-brass-300" initial={{ width: 0 }} animate={{ width: `${Math.min(100, (approved.length / 50) * 100)}%` }} transition={{ duration: 1.1, ease: 'easeOut' }} />
        </div>
      </div>

      {/* KPI grid */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map(k => (
          <div key={k.label} className="rounded-2xl border border-ink-800 bg-ink-900 p-4 sm:p-5">
            <k.Icon size={19} className={k.tone} />
            <p className="mt-2.5 truncate font-display text-lg font-black leading-tight text-ink-50 sm:text-2xl">{k.value}</p>
            <p className="mt-1 text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-ink-400">{k.label}</p>
            <p className="mt-0.5 text-[10px] font-semibold leading-snug text-ink-500">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-5">
        {/* Attention queue */}
        <section className="rounded-2xl border border-ink-800 bg-ink-900 xl:col-span-3">
          <div className="flex items-center justify-between border-b border-ink-800 px-5 py-4">
            <h2 className="flex items-center gap-2 font-display text-base font-black text-ink-50"><ShieldAlert size={17} className="text-brass-400" /> Needs attention now</h2>
          </div>
          <div className="divide-y divide-ink-800">
            {inReview.map(p => (
              <Link key={p.id} to="/admin/properties" className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-ink-850">
                <span className={`chip border ${p.status === 'submitted' ? 'border-amber-400/40 bg-amber-400/10 text-amber-300' : 'border-orange-400/40 bg-orange-400/10 text-orange-300'}`}>{p.status === 'submitted' ? 'In review' : 'Correction'}</span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-ink-100">{p.title}</span>
                <ArrowRight size={14} className="text-ink-500" />
              </Link>
            ))}
            {critical.map(i => (
              <Link key={i.id} to="/admin/issues" className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-ink-850">
                <span className="chip border border-red-400/50 bg-red-400/10 text-red-300">{i.severity === 'critical' ? 'CRITICAL' : 'ESCALATED'}</span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-ink-100">{i.ref} — {i.subject}</span>
                <ArrowRight size={14} className="text-ink-500" />
              </Link>
            ))}
            {suspended.length > 0 && (
              <Link to="/admin/properties" className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-ink-850">
                <span className="chip border border-red-500/50 bg-red-500/15 text-red-300">Suspended</span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-ink-100">{suspended.length} listing(s) suspended — reinspection pending</span>
                <ArrowRight size={14} className="text-ink-500" />
              </Link>
            )}
            {varianceTotal > 0 && (
              <Link to="/admin/ledger" className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-ink-850">
                <span className="chip border border-red-400/50 bg-red-400/10 text-red-300">Ledger variance</span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-ink-100">{formatNaira(varianceTotal)} unreconciled — under review</span>
                <ArrowRight size={14} className="text-ink-500" />
              </Link>
            )}
            {inReview.length === 0 && critical.length === 0 && suspended.length === 0 && varianceTotal === 0 && (
              <p className="px-5 py-10 text-center text-[12.5px] font-semibold text-ink-400">Queue clear. The operation is running clean.</p>
            )}
          </div>
          {/* Deferred / launch dependencies tracker */}
          <div className="border-t border-ink-800 px-5 py-4">
            <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-ink-500"><Target size={12} /> Explicit sign-offs required before scale</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {['Nigerian legal review', 'Payment provider onboarding', 'Written processing-fee policy', 'Privacy notice / DPIA', 'Operational SOP', 'Support escalation coverage', 'Production config & backups'].map(t => (
                <span key={t} className="rounded-md border border-ink-700 bg-ink-850 px-2 py-1 text-[9.5px] font-bold text-ink-300">{t}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Financial pulse */}
        <section className="rounded-2xl border border-ink-800 bg-ink-900 p-5 xl:col-span-2">
          <h2 className="flex items-center gap-2 font-display text-base font-black text-ink-50"><TrendingUp size={17} className="text-brass-400" /> Financial pulse</h2>
          <dl className="mt-4 space-y-3 text-[12px] font-semibold">
            {[
              ['Gross guest charges (ledger)', formatNaira(guestCharges)],
              ['HAMLET guest fees (3%)', formatNaira(guestFees)],
              ['Provider charges (policy undecided)', formatNaira(providerCharges)],
              ['Ledger variance (absolute)', varianceTotal === 0 ? '₦0 — reconciled' : formatNaira(varianceTotal)],
            ].map(([k, v]) => (
              <div key={k as string} className="flex items-baseline justify-between gap-3 border-b border-ink-800 pb-3 last:border-0">
                <dt className="text-ink-400">{k}</dt>
                <dd className="tabular-nums text-ink-50">{v}</dd>
              </div>
            ))}
          </dl>
          <Link to="/admin/ledger" className="btn-brass mt-4 w-full !py-3 text-[12px]">Open ledger & settlement <ArrowRight size={14} /></Link>
          <div className="mt-5">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink-500">Recent audit events</p>
            <ol className="mt-2 space-y-1.5">
              {state.audit.slice(0, 4).map(a => (
                <li key={a.id} className="text-[10.5px] font-medium leading-snug text-ink-300"><span className="font-mono text-brass-400">{formatDateTime(a.at).split('·')[0].trim()}</span> · <span className="font-bold text-ink-100">{a.action.replace(/_/g, ' ')}</span> · {a.target}</li>
              ))}
            </ol>
            <Link to="/admin/audit" className="mt-2 inline-block text-[10.5px] font-extrabold uppercase tracking-wide text-brass-400 hover:text-brass-300">Full audit log →</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
