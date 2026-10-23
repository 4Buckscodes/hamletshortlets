import { useMemo, useState } from 'react';
import { Search, ScrollText, ShieldCheck } from 'lucide-react';
import { useHamlet } from '../../lib/store';
import { formatDateTime } from '../../lib/pricing';

export default function AdminAudit() {
  const { state } = useHamlet();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const entries = useMemo(
    () => state.audit.filter(a => !q || [a.actor, a.action, a.target, a.detail, a.actorRole].join(' ').toLowerCase().includes(q)),
    [state.audit, q],
  );

  const actionTone = (action: string) => {
    if (/suspend|reject|revoke|flag|expired/.test(action)) return 'text-red-300 border-red-500/30 bg-red-500/10';
    if (/approve|verified|confirm|settle|closed|completed/.test(action)) return 'text-jade-300 border-jade-500/30 bg-jade-500/10';
    if (/correct|update|assign/.test(action)) return 'text-amber-300 border-amber-500/30 bg-amber-500/10';
    return 'text-ink-200 border-ink-700 bg-ink-800';
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-brass-400">Accountability record</p>
          <h1 className="mt-1.5 flex items-center gap-3 font-display text-2xl font-black text-ink-50 sm:text-3xl"><ScrollText size={26} className="text-brass-400" />Audit log</h1>
          <p className="mt-1 max-w-2xl text-[12px] font-medium text-ink-300">Every status change, permission grant/revocation, financial adjustment and webhook event — with actor, role, target and timestamp. Append-only in the pilot; production ships to immutable storage.</p>
        </div>
        <label className="flex w-full min-w-52 items-center gap-2 rounded-xl border border-ink-800 bg-ink-900 px-3.5 py-2.5 sm:w-auto sm:max-w-xs">
          <Search size={15} className="text-ink-500" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search actor, action, target…" className="w-full bg-transparent text-[12.5px] font-medium text-ink-50 outline-none placeholder:text-ink-500" />
        </label>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-ink-800">
        <ol className="divide-y divide-ink-800">
          {entries.map(a => (
            <li key={a.id} className="flex flex-wrap items-start gap-3 bg-ink-900/60 px-5 py-3.5 transition hover:bg-ink-850 sm:flex-nowrap">
              <span className="w-36 shrink-0 pt-0.5 text-[10px] font-semibold leading-snug text-ink-500">{formatDateTime(a.at)}</span>
              <span className={`chip border !px-2 !py-1 text-[9.5px] font-extrabold uppercase tracking-wide ${actionTone(a.action)} shrink-0`}>{a.action.replace(/_/g, ' ')}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[11.5px] font-semibold leading-snug text-ink-100">{a.detail}</p>
                <p className="mt-0.5 text-[10px] font-medium text-ink-500"><span className="font-bold text-ink-300">{a.actor}</span> ({a.actorRole}) → <span className="font-mono">{a.target}</span></p>
              </div>
            </li>
          ))}
          {entries.length === 0 && <li className="bg-ink-900/60 px-5 py-12 text-center text-[12px] font-semibold text-ink-500">No audit events match that search.</li>}
        </ol>
      </div>
      <p className="mt-4 flex items-center gap-2 text-[10px] font-medium text-ink-500"><ShieldCheck size={12} /> {entries.length} event{entries.length === 1 ? '' : 's'} shown · Sensitive guest, identity and incident data is restricted to authorised roles (NDPR-aligned).</p>
    </div>
  );
}
