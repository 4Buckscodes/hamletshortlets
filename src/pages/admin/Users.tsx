import { useMemo, useState } from 'react';
import { ShieldCheck, UserCog, Search, Mail, Phone, Building2, Ban, CheckCircle2, PlusCircle, Download } from 'lucide-react';
import { useHamlet } from '../../lib/store';
import { useToast } from '../../lib/toast';
import type { Account, AccountRole } from '../../lib/types';
import { formatDateTime, lagosIsoDateOffset } from '../../lib/pricing';
import { downloadCsvFile } from '../../lib/csv';

export default function AdminUsers() {
  const {
    state,
    authorizeAdminEmail,
    setGuestAccountStatus,
    setPartnerAccountStatus,
  } = useHamlet();
  const { toast } = useToast();

  const [roleFilter, setRoleFilter] = useState<'all' | AccountRole>('all');
  const [query, setQuery] = useState('');

  // Admin provisioning state
  const [adminEmail, setAdminEmail] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [authorizing, setAuthorizing] = useState(false);

  // Account governance modal state
  const [govAccount, setGovAccount] = useState<{ account: Account; nextStatus: 'active' | 'suspended' } | null>(null);
  const [govReason, setGovReason] = useState('');
  const [cascadeProperties, setCascadeProperties] = useState(true);
  const [govSaving, setGovSaving] = useState(false);

  const filteredAccounts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.accounts.filter(acc => {
      if (roleFilter !== 'all' && acc.role !== roleFilter) return false;
      if (!q) return true;
      return [acc.name, acc.email, acc.phone ?? '', acc.company ?? '', acc.partnerRole ?? '']
        .some(field => field.toLowerCase().includes(q));
    });
  }, [state.accounts, roleFilter, query]);

  const counts = useMemo(() => ({
    all: state.accounts.length,
    guest: state.accounts.filter(a => a.role === 'guest').length,
    partner: state.accounts.filter(a => a.role === 'partner').length,
    admin: state.accounts.filter(a => a.role === 'admin').length,
  }), [state.accounts]);

  const handleAuthorizeAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail.trim().includes('@')) {
      toast('Enter a valid email address.', 'error');
      return;
    }
    if (adminNote.trim().length < 6) {
      toast('Provide an authorization reason (min 6 characters) for the audit trail.', 'error');
      return;
    }
    setAuthorizing(true);
    try {
      const res = await authorizeAdminEmail(adminEmail.trim(), adminNote.trim());
      toast(
        res.promotedExisting
          ? `${adminEmail.trim()} promoted to HAMLET Admin Console immediately.`
          : `${adminEmail.trim()} pre-authorized. They will receive Admin Console access automatically when they sign up.`,
      );
      setAdminEmail('');
      setAdminNote('');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not authorize admin email.', 'error');
    } finally {
      setAuthorizing(false);
    }
  };

  const handleAccountGovernance = async () => {
    if (!govAccount) return;
    if (govReason.trim().length < 10) {
      toast('Provide a documented reason (min 10 characters).', 'error');
      return;
    }
    setGovSaving(true);
    try {
      if (govAccount.account.role === 'partner') {
        await setPartnerAccountStatus(
          govAccount.account.id,
          govAccount.nextStatus,
          govReason.trim(),
          cascadeProperties,
        );
      } else {
        await setGuestAccountStatus(
          govAccount.account.id,
          govAccount.nextStatus,
          govReason.trim(),
        );
      }
      toast(`${govAccount.account.name} marked ${govAccount.nextStatus}.`);
      setGovAccount(null);
      setGovReason('');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not update account status.', 'error');
    } finally {
      setGovSaving(false);
    }
  };

  const roleBadge: Record<AccountRole, string> = {
    guest: 'border-sky-400/40 bg-sky-400/10 text-sky-300',
    partner: 'border-brass-400/40 bg-brass-400/10 text-brass-300',
    admin: 'border-red-400/40 bg-red-400/10 text-red-300',
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-brass-400">Identity & governance</p>
          <h1 className="mt-1.5 font-display text-2xl font-black text-ink-50 sm:text-3xl">Clients, partners & admin access</h1>
          <p className="mt-1 max-w-2xl text-[12px] font-medium text-ink-300">
            Unified directory of HAMLET guest accounts, approved partners, and internal administrators. Public sign-ups never grant admin access — only pre-authorized or explicitly promoted accounts enter the Admin Console.
          </p>
        </div>
        <button
          disabled={filteredAccounts.length === 0}
          onClick={() => {
            downloadCsvFile(
              `hamlet-directory-${lagosIsoDateOffset(0)}.csv`,
              ['Name', 'Email', 'Phone', 'Role', 'Partner Role', 'Company', 'Account Status', 'Created At'],
              filteredAccounts.map(a => [
                a.name,
                a.email,
                a.phone ?? '',
                a.role,
                a.partnerRole ?? '',
                a.company ?? '',
                a.accountStatus ?? 'active',
                a.createdAt ?? '',
              ]),
            );
            toast(`Exported ${filteredAccounts.length} user record(s) to CSV.`);
          }}
          className="btn-ghost-dark !border !border-ink-700 !py-2.5 text-[12px] disabled:opacity-40"
        >
          <Download size={14} /> Export directory CSV
        </button>
      </div>

      {/* Admin Provisioning Card */}
      <section className="mt-6 rounded-2xl border border-red-500/25 bg-gradient-to-br from-red-500/10 via-ink-900 to-ink-900 p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <UserCog size={20} className="mt-0.5 shrink-0 text-red-300" />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-base font-black text-ink-50">Provision HAMLET Admin Console access</h2>
            <p className="mt-0.5 text-[12px] font-medium text-ink-300">
              Enter an operator’s email to grant admin access. If they already have a HAMLET account, they are promoted immediately; otherwise their email is pre-authorized on the server and automatically promoted the moment they create their account.
            </p>
            <form onSubmit={handleAuthorizeAdmin} className="mt-4 grid gap-3 sm:grid-cols-12">
              <div className="sm:col-span-5">
                <input
                  type="email"
                  required
                  className="input-dark !py-2.5 text-[12.5px]"
                  placeholder="operator@company.com"
                  value={adminEmail}
                  onChange={e => setAdminEmail(e.target.value)}
                />
              </div>
              <div className="sm:col-span-5">
                <input
                  required
                  minLength={6}
                  className="input-dark !py-2.5 text-[12.5px]"
                  placeholder="Authorization note (e.g. Lagos Operations Lead)"
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <button type="submit" disabled={authorizing} className="btn-brass w-full !py-2.5 text-[12px] disabled:opacity-50">
                  <PlusCircle size={14} /> {authorizing ? 'Saving…' : 'Authorize'}
                </button>
              </div>
            </form>

            {state.adminBootstrapEmails.length > 0 && (
              <div className="mt-4 border-t border-ink-800 pt-3">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink-400">
                  Authorized admin emails ({state.adminBootstrapEmails.length})
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {state.adminBootstrapEmails.map(entry => {
                    const isClaimed = state.accounts.some(
                      a => a.role === 'admin' && a.email.toLowerCase() === entry.email.toLowerCase(),
                    );
                    return (
                      <span
                        key={entry.email}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-ink-700 bg-ink-900 px-3 py-1.5 text-[11px] font-semibold text-ink-200"
                      >
                        <ShieldCheck size={12} className={isClaimed ? 'text-jade-400' : 'text-amber-400'} />
                        <span>{entry.email}</span>
                        <span className="text-[10px] text-ink-500">
                          · {isClaimed ? 'active' : 'awaiting sign-up'}
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Filter & search controls */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {([
            { key: 'all', label: `All (${counts.all})` },
            { key: 'guest', label: `Clients (${counts.guest})` },
            { key: 'partner', label: `Partners (${counts.partner})` },
            { key: 'admin', label: `Admins (${counts.admin})` },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setRoleFilter(tab.key)}
              className={`rounded-xl border px-3.5 py-2 text-[11px] font-bold transition ${roleFilter === tab.key ? 'border-brass-500 bg-brass-500 text-ink-950' : 'border-ink-800 text-ink-300 hover:border-ink-600'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
          <input
            className="input-dark !py-2 !pl-9 text-[12px]"
            placeholder="Search name, email, phone, company…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Directory list */}
      <div className="mt-4 grid gap-3">
        {filteredAccounts.map(acc => {
          const isSuspended = acc.accountStatus === 'suspended';
          const guestBookingsCount = state.bookings.filter(b => b.guestId === acc.id).length;
          const partnerPropsCount = state.properties.filter(p => p.ownerId === acc.id).length;
          return (
            <article key={acc.id} className="rounded-2xl border border-ink-800 bg-ink-900 p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`chip border uppercase ${roleBadge[acc.role]}`}>
                      {acc.role === 'guest' ? 'Client' : acc.role}
                    </span>
                    {acc.partnerRole && (
                      <span className="text-[10.5px] font-bold text-brass-300">{acc.partnerRole}</span>
                    )}
                    <span className={`chip border ${isSuspended ? 'border-red-500/40 bg-red-500/10 text-red-300' : 'border-jade-500/35 bg-jade-500/10 text-jade-300'}`}>
                      {isSuspended ? 'Suspended' : 'Active'}
                    </span>
                  </div>
                  <h3 className="mt-1.5 font-display text-base font-bold text-ink-50">{acc.name}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] font-medium text-ink-300">
                    {acc.email && <span className="inline-flex items-center gap-1.5 break-all"><Mail size={12} className="shrink-0 text-ink-500" />{acc.email}</span>}
                    {acc.phone && <span className="inline-flex items-center gap-1.5"><Phone size={12} className="shrink-0 text-ink-500" />{acc.phone}</span>}
                    {acc.company && <span className="inline-flex items-center gap-1.5"><Building2 size={12} className="shrink-0 text-ink-500" />{acc.company}</span>}
                  </div>
                  <p className="mt-1 text-[10.5px] font-semibold text-ink-500">
                    {acc.role === 'guest' && `${guestBookingsCount} booking request${guestBookingsCount === 1 ? '' : 's'}`}
                    {acc.role === 'partner' && `${partnerPropsCount} submitted propert${partnerPropsCount === 1 ? 'y' : 'ies'}`}
                    {acc.role === 'admin' && 'Full HAMLET operations & audit console'}
                    {acc.createdAt ? ` · Joined ${formatDateTime(acc.createdAt)}` : ''}
                  </p>
                  {acc.suspensionReason && isSuspended && (
                    <p className="mt-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[11px] font-medium text-red-200">
                      Suspension note: {acc.suspensionReason}
                    </p>
                  )}
                </div>

                {acc.role !== 'admin' && (
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {isSuspended ? (
                      <button
                        onClick={() => { setGovAccount({ account: acc, nextStatus: 'active' }); setGovReason(''); }}
                        className="flex items-center gap-1.5 rounded-xl border border-jade-600/40 bg-jade-600/15 px-3.5 py-2 text-[11px] font-bold text-jade-300 hover:bg-jade-600/25"
                      >
                        <CheckCircle2 size={13} /> Reinstate account
                      </button>
                    ) : (
                      <button
                        onClick={() => { setGovAccount({ account: acc, nextStatus: 'suspended' }); setGovReason(''); setCascadeProperties(true); }}
                        className="flex items-center gap-1.5 rounded-xl border border-red-500/35 bg-red-500/10 px-3.5 py-2 text-[11px] font-bold text-red-300 hover:bg-red-500/20"
                      >
                        <Ban size={13} /> Suspend account
                      </button>
                    )}
                  </div>
                )}
              </div>

              {govAccount?.account.id === acc.id && (
                <div className="mt-4 border-t border-ink-800 pt-4">
                  <label className="block">
                    <span className="label-dark">
                      Documented reason to {govAccount.nextStatus === 'suspended' ? 'suspend' : 'reinstate'} {acc.name} (audit-logged)
                    </span>
                    <input
                      autoFocus
                      className="input-dark !py-2 text-[12px]"
                      placeholder="Minimum 10 characters explaining the operational or compliance basis…"
                      value={govReason}
                      onChange={e => setGovReason(e.target.value)}
                    />
                  </label>
                  {acc.role === 'partner' && govAccount.nextStatus === 'suspended' && (
                    <label className="mt-2.5 flex items-center gap-2 text-[11.5px] font-medium text-ink-300">
                      <input type="checkbox" className="accent-[#C9A227]" checked={cascadeProperties} onChange={e => setCascadeProperties(e.target.checked)} />
                      Also suspend all currently approved properties owned by this partner
                    </label>
                  )}
                  <div className="mt-3 flex justify-end gap-2">
                    <button disabled={govSaving} onClick={() => setGovAccount(null)} className="btn-ghost-dark !py-2 text-[11.5px]">Cancel</button>
                    <button
                      disabled={govSaving}
                      onClick={() => void handleAccountGovernance()}
                      className={`rounded-xl px-4 py-2 text-[11.5px] font-bold text-white disabled:opacity-50 ${govAccount.nextStatus === 'suspended' ? 'bg-red-600 hover:bg-red-500' : 'bg-jade-600 hover:bg-jade-500'}`}
                    >
                      {govSaving ? 'Saving…' : govAccount.nextStatus === 'suspended' ? 'Confirm suspension' : 'Confirm reinstatement'}
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}

        {filteredAccounts.length === 0 && (
          <p className="rounded-2xl border border-dashed border-ink-700 py-14 text-center text-[12.5px] font-semibold text-ink-400">
            No user accounts match this filter yet.
          </p>
        )}
      </div>
    </div>
  );
}
