/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Compass,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { useHamlet } from '../lib/store';
import { useCurrency } from '../lib/currency';
import { matchesLagosAreaFilter, LAGOS_AREAS } from '../lib/areas';
import { formatNaira } from '../lib/pricing';
import { myPartnerProperties, propertyIdsOf } from '../lib/partnerUtils';

interface HoratioContextValue {
  isOpen: boolean;
  openHoratio: (initialPrompt?: string) => void;
  closeHoratio: () => void;
}

const HoratioContext = createContext<HoratioContextValue>({
  isOpen: false,
  openHoratio: () => {},
  closeHoratio: () => {},
});

export function useHoratio() {
  return useContext(HoratioContext);
}

interface HoratioReply {
  id: string;
  role: 'user' | 'horatio';
  text: string;
  links?: { label: string; to: string; meta?: string }[];
  note?: string;
}

export function HoratioProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  const openHoratio = useCallback((initialPrompt?: string) => {
    if (initialPrompt) setPendingPrompt(initialPrompt);
    setIsOpen(true);
  }, []);

  const closeHoratio = useCallback(() => {
    setIsOpen(false);
  }, []);

  const value = useMemo(
    () => ({ isOpen, openHoratio, closeHoratio }),
    [isOpen, openHoratio, closeHoratio],
  );

  return (
    <HoratioContext.Provider value={value}>
      {children}
      <HoratioDrawer
        isOpen={isOpen}
        onClose={closeHoratio}
        pendingPrompt={pendingPrompt}
        onConsumePrompt={() => setPendingPrompt(null)}
      />
    </HoratioContext.Provider>
  );
}

function HoratioDrawer({
  isOpen,
  onClose,
  pendingPrompt,
  onConsumePrompt,
}: {
  isOpen: boolean;
  onClose: () => void;
  pendingPrompt: string | null;
  onConsumePrompt: () => void;
}) {
  const { state, backendConfigured } = useHamlet();
  const { formatStayPrice, currency } = useCurrency();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<HoratioReply[]>([]);

  const session = state.session;
  const role = session?.role ?? 'public';

  const approvedProperties = useMemo(
    () => state.properties.filter(p => p.status === 'approved'),
    [state.properties],
  );

  const partnerProps = useMemo(
    () => (role === 'partner' ? myPartnerProperties(state, session?.userId) : []),
    [role, state, session?.userId],
  );

  const partnerPropIds = useMemo(
    () => (role === 'partner' ? new Set(propertyIdsOf(state, session?.userId)) : new Set<string>()),
    [role, state, session?.userId],
  );

  const buildAnswer = useCallback(
    (rawQuery: string): Omit<HoratioReply, 'id' | 'role'> => {
      const q = rawQuery.trim().toLowerCase();

      // 1. Admin / Elsinore operational queries (strictly gated to admin session)
      if (role === 'admin' && /(queue|review|ops|watch|issue|ledger|pending|overview|elsinore)/.test(q)) {
        const pendingProps = state.properties.filter(
          p => p.status === 'submitted' || p.status === 'needs_correction',
        ).length;
        const actionBookings = state.bookings.filter(b =>
          ['requested', 'checking'].includes(b.status),
        ).length;
        const openWatchIssues = state.issues.filter(i =>
          ['open', 'assigned', 'investigating', 'escalated'].includes(i.status),
        ).length;
        const pendingApps = state.applications.filter(a => a.status === 'pending').length;
        const flaggedLedger = state.ledger.filter(
          l => l.status === 'flagged' || l.variance !== 0,
        ).length;

        return {
          text: `Elsinore live operational snapshot: ${pendingProps} listing(s) awaiting property review, ${actionBookings} booking request(s) needing confirmation, ${openWatchIssues} active incident(s) on The Watch, ${pendingApps} partner application(s) pending review, and ${flaggedLedger} ledger item(s) requiring reconciliation.`,
          links: [
            { label: `Property Review (${pendingProps})`, to: '/admin/properties' },
            { label: `The Watch · Issues (${openWatchIssues})`, to: '/admin/issues' },
            { label: `Ledger & Settlement (${flaggedLedger})`, to: '/admin/ledger' },
            { label: `Partner Applications (${pendingApps})`, to: '/admin/applications' },
          ],
          note: 'Suggestion only — verification decisions, refunds, caution-deposit deductions, and account governance remain strictly under human administrator control.',
        };
      }

      // 2. Partner workspace queries (strictly scoped to partner's authorised properties)
      if (role === 'partner' && /(my prop|earning|commission|request|booking|mandate|wayfinder)/.test(q)) {
        const myPendingBookings = state.bookings.filter(
          b => partnerPropIds.has(b.propertyId) && ['requested', 'checking'].includes(b.status),
        );
        const approvedCount = partnerProps.filter(p => p.status === 'approved').length;
        return {
          text: `Your Partner Workspace currently holds ${partnerProps.length} authorised listing(s) (${approvedCount} published) and ${myPendingBookings.length} booking request(s) awaiting availability confirmation.`,
          links: [
            { label: 'Open Booking Requests', to: '/partner/bookings' },
            { label: 'My Properties & Availability', to: '/partner/properties' },
            { label: 'Earnings & Commissions', to: '/partner/earnings' },
            { label: 'Assignments & Mandates', to: '/partner/assignments' },
          ],
          note: 'Horatio only reads properties and bookings you are authorised to manage.',
        };
      }

      // 3. Guest's own bookings / arrival / Wayfinder
      if (/(my booking|arrival|wayfinder|check-in|checkin|paystack|status)/.test(q)) {
        if (role === 'guest' && session) {
          const myBookings = state.bookings.filter(b => b.guestId === session.userId);
          if (myBookings.length === 0) {
            return {
              text: 'You do not have any recorded bookings on this guest account yet. Browse approved Lagos homes to send a booking request — zero payment is taken until the host confirms availability.',
              links: [{ label: 'Explore Lagos stays', to: '/stays' }],
            };
          }
          const awaiting = myBookings.filter(b => b.status === 'awaiting_payment').length;
          const confirmed = myBookings.filter(b => b.status === 'confirmed');
          return {
            text: `You have ${myBookings.length} booking record(s): ${confirmed.length} confirmed and ${awaiting} awaiting payment within the 48-hour Paystack window.`,
            links: [
              { label: 'Open My Account & Bookings', to: '/account' },
              ...confirmed.slice(0, 2).map(b => ({
                label: `Wayfinder · ${b.ref}`,
                to: `/wayfinder/${b.id}`,
                meta: b.propertyTitle,
              })),
            ],
            note: 'Exact entrance pins and check-in codes unlock only on confirmed bookings.',
          };
        }
        return {
          text: 'Every HAMLET booking follows four accountable steps: (1) Request dates & review house rules with zero card charge, (2) Host or HAMLET ops confirms availability, (3) 48-hour Paystack checkout window opens (confirmed only by signed server webhook), and (4) Wayfinder arrival guidance unlocks in your account.',
          links: [
            { label: 'How HAMLET works', to: '/how-it-works' },
            { label: 'Sign in to view your bookings', to: '/signin' },
          ],
        };
      }

      // 4. Pricing, fees, FX buffer, or caution deposit questions
      if (/(price|fee|markup|deposit|caution|usd|gbp|dollar|pound|currency|commission|owner)/.test(q)) {
        return {
          text: 'HAMLET uses one central pricing calculation across search, listing detail, checkout, and the ledger: Owners pay 0% and receive 100% of their listed NGN rate (B). Domestic guest accommodation is B × 1.20 (20% markup). USD ($) and GBP (£) stay quotes convert at the active configured FX rate plus a single 10% currency buffer, settling transparently in NGN via Paystack. Refundable caution deposits are itemised separately, never marked up or buffered, and refunded after post-checkout inspection review.',
          links: [
            { label: 'Fees & settlement policy', to: '/legal/pricing' },
            { label: 'Partner commercial terms', to: '/partner/register' },
          ],
          note: 'Deposits are subject to post-checkout inspection review and are never described as instant or automatic.',
        };
      }

      // 5. Verification, trust, safety, or refund questions
      if (/(verif|trust|safe|pillar|refund|cancel|issue|scam)/.test(q)) {
        return {
          text: 'HAMLET records four verification pillars separately per listing — Ownership, Identity, Authority to list, and Physical Inspection — and labels unreviewed declarations honestly as self-reported or pending review. Refunds, cancellations, and disputes are handled by human operations reviewers against recorded booking terms.',
          links: [
            { label: 'Safety & guest protection', to: '/safety' },
            { label: 'Trust & verification policy', to: '/legal/trust' },
          ],
        };
      }

      // 6. Property discovery by area, capacity, budget, power/Wi-Fi/workspace
      const matchedArea =
        LAGOS_AREAS.find(a => q.includes(a.toLowerCase())) ??
        (q.includes('mainland')
          ? 'Lagos Mainland'
          : q.includes('vi ') || q.endsWith(' vi') || q === 'vi'
            ? 'Victoria Island'
            : q.includes('lekki')
              ? 'Lekki Phase 1'
              : '');

      const wantsPower = /(power|inverter|generator|24\/7)/.test(q);
      const wantsWifi = /(wifi|wi-fi|internet|work|remote|workspace)/.test(q);
      const guestMatch = q.match(/(\d+)\s*(guest|people|person|bed)/);
      const minCount = guestMatch ? Number(guestMatch[1]) : 1;
      const isBedQuery = guestMatch?.[2]?.startsWith('bed') ?? false;

      const matches = approvedProperties.filter(p => {
        if (matchedArea && !matchesLagosAreaFilter(p, matchedArea)) return false;
        if (wantsPower && !p.amenities.includes('24/7 Power') && !p.amenities.includes('Generator')) {
          return false;
        }
        if (wantsWifi && !p.amenities.includes('Wifi') && !p.amenities.includes('Workspace')) {
          return false;
        }
        if (isBedQuery ? p.bedrooms < minCount : p.capacity < minCount) return false;
        return true;
      });

      if (approvedProperties.length === 0) {
        return {
          text: 'There are currently 0 published listings in this live environment while verified Lagos Mainland and Island homes complete manual document and inspection review. Horatio never invents availability or placeholder homes.',
          links: [
            { label: 'Explore Lagos neighbourhood guide', to: '/lagos' },
            { label: 'Apply to list a Lagos property', to: '/partner/register' },
          ],
        };
      }

      if (matches.length > 0) {
        const top = matches.slice(0, 3);
        const searchParams = new URLSearchParams();
        if (matchedArea) searchParams.set('area', matchedArea);
        if (!isBedQuery && minCount > 1) searchParams.set('guests', String(minCount));

        return {
          text: `Found ${matches.length} approved Lagos stay${matches.length === 1 ? '' : 's'}${matchedArea ? ` matching ${matchedArea}` : ''} from live HAMLET inventory (prices shown in ${currency}):`,
          links: [
            ...top.map(p => ({
              label: p.title,
              to: `/stays/${p.id}`,
              meta: `${p.area} · ${p.bedrooms} bd · up to ${p.capacity} guests · ${formatStayPrice(Math.round(p.nightlyRate * 1.2))}/night (+ ${formatNaira(p.deposit)} refundable deposit)`,
            })),
            {
              label: `View all ${matches.length} matching stay${matches.length === 1 ? '' : 's'}`,
              to: `/stays${searchParams.toString() ? `?${searchParams.toString()}` : ''}`,
            },
          ],
          note: !backendConfigured
            ? 'Demo seed mode active — listings above come from local seed data.'
            : 'Live authorised inventory — final availability is confirmed by the host on request.',
        };
      }

      return {
        text: `No currently approved listings matched all of those criteria (${approvedProperties.length} approved home${approvedProperties.length === 1 ? '' : 's'} available across Lagos). Try broadening your area or amenity filter.`,
        links: [
          { label: `Browse all ${approvedProperties.length} approved stays`, to: '/stays' },
          { label: 'Lagos Mainland & Island guide', to: '/lagos' },
        ],
      };
    },
    [
      role,
      session,
      state.properties,
      state.bookings,
      state.issues,
      state.applications,
      state.ledger,
      partnerProps,
      partnerPropIds,
      approvedProperties,
      currency,
      formatStayPrice,
      backendConfigured,
    ],
  );

  const submitQuery = useCallback(
    (promptText: string) => {
      const trimmed = promptText.trim();
      if (!trimmed) return;
      const reply = buildAnswer(trimmed);
      const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setMessages(prev => [
        ...prev,
        { id: `u-${stamp}`, role: 'user', text: trimmed },
        { id: `h-${stamp}`, role: 'horatio', ...reply },
      ]);
      setInput('');
    },
    [buildAnswer],
  );

  useEffect(() => {
    if (isOpen && pendingPrompt) {
      const promptToRun = pendingPrompt;
      onConsumePrompt();
      queueMicrotask(() => {
        submitQuery(promptToRun);
      });
    }
  }, [isOpen, pendingPrompt, onConsumePrompt, submitQuery]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const quickPrompts =
    role === 'admin'
      ? [
          'Show Elsinore & The Watch queues',
          'How do pricing & caution deposits work?',
          'Show approved Lagos Mainland stays',
        ]
      : role === 'partner'
        ? [
            'Summarise my properties & booking requests',
            'Explain partner commissions & 0% owner fee',
            'How does verification work?',
          ]
        : [
            'Stays in Lagos Mainland with 24/7 power',
            'Stays in Victoria Island or Lekki',
            'How do pricing, USD/GBP & deposits work?',
            'How does the 48h booking hold work?',
          ];

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submitQuery(input);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Horatio — HAMLET intelligent assistant"
    >
      <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-xs" onClick={onClose} />
      <aside className="relative flex h-dvh w-full max-w-md flex-col overflow-hidden border-l border-ink-200 bg-paper shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-ink-800 bg-ink-950 px-5 py-4 text-paper">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brass-500 text-ink-950">
                <Sparkles size={14} />
              </span>
              <span className="font-display text-lg font-bold tracking-wide text-white">
                Horatio
              </span>
              <span className="rounded-full border border-brass-400/40 bg-brass-500/15 px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-widest text-brass-300">
                HAMLET Guide
              </span>
            </div>
            <p className="mt-1 text-[11.5px] font-medium text-ink-300">
              Grounded in live authorised HAMLET inventory, pricing & policy — never invented availability.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Horatio"
            className="rounded-lg p-1.5 text-ink-300 transition hover:bg-ink-800 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto overscroll-y-contain p-4 sm:p-5">
          <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-ink-500">
              <ShieldCheck size={14} className="shrink-0 text-emerald-600" />
              <span>Accountable assistance</span>
            </div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-700">
              Ask about approved stays across <strong>Lagos Mainland</strong> or <strong>Lagos Island</strong>, exact fee & caution-deposit rules, or your authorised workspace records.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {quickPrompts.map(prompt => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => submitQuery(prompt)}
                  className="rounded-full border border-ink-200 bg-paper px-3 py-1.5 text-left text-[11px] font-bold text-ink-800 transition hover:border-brass-500 hover:bg-brass-200/30"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {messages.map(msg =>
            msg.role === 'user' ? (
              <div key={msg.id} className="ml-8 rounded-2xl rounded-br-sm bg-ink-900 px-4 py-2.5 text-[13px] font-semibold text-white">
                {msg.text}
              </div>
            ) : (
              <div key={msg.id} className="mr-4 space-y-2.5 rounded-2xl rounded-bl-sm border border-ink-200 bg-white p-4 shadow-2xs">
                <p className="text-[13px] leading-relaxed text-ink-800">{msg.text}</p>
                {msg.links && msg.links.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {msg.links.map(link => (
                      <Link
                        key={`${link.to}-${link.label}`}
                        to={link.to}
                        onClick={onClose}
                        className="group flex items-center justify-between gap-2 rounded-xl border border-ink-100 bg-paper/70 px-3 py-2.5 transition hover:border-brass-500 hover:bg-white"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[12.5px] font-bold text-ink-900 group-hover:text-ink-950">
                            {link.label}
                          </p>
                          {link.meta && (
                            <p className="mt-0.5 truncate text-[11px] font-medium text-ink-500">
                              {link.meta}
                            </p>
                          )}
                        </div>
                        <ArrowRight size={14} className="shrink-0 text-brass-600 transition group-hover:translate-x-0.5" />
                      </Link>
                    ))}
                  </div>
                )}
                {msg.note && (
                  <p className="border-t border-ink-100 pt-2 text-[10.5px] font-medium text-ink-500">
                    {msg.note}
                  </p>
                )}
              </div>
            ),
          )}
        </div>

        {/* Footer input */}
        <form onSubmit={onSubmit} className="border-t border-ink-200 bg-white p-3.5">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask Horatio about stays, areas, pricing…"
              aria-label="Ask Horatio"
              className="input !py-2.5 text-[13px]"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Send question to Horatio"
              className="btn-dark !px-3.5 !py-2.5"
            >
              <Send size={15} />
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] font-semibold text-ink-400">
            <span className="inline-flex items-center gap-1">
              <Compass size={11} className="shrink-0" /> Suggestion & discovery only
            </span>
            <span className="inline-flex items-center gap-1">
              <Building2 size={11} className="shrink-0" /> HAMLET · Abundance Abodes
            </span>
          </div>
        </form>
      </aside>
    </div>
  );
}
