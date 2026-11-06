'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Handshake,
  MessageCircle,
  PauseCircle,
  PlayCircle,
  Plus,
  Share2,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import {
  getBrowserSupabase,
  isMissingSchemaObjectError,
  PARTNER_PROPERTY_SELECT,
} from '@/lib/next-supabase';
import {
  formatDate,
  formatKoboAsNaira,
  formatNaira,
  nairaToKobo,
  validateAndComputeAgentDealTerms,
  type AgentDealBillingUnit,
  type AgentDealStructure,
} from '@/lib/pricing';
import {
  buildAuthorisedDealShareUrl,
  buildDealWhatsAppSummary,
  filterAvailableAgentDeals,
  type AcceptedDealTermsSnapshot,
  type AgentDealExclusivity,
  type AgentDealRecord,
} from '@/lib/competitive-readiness';
import {
  FocusedDrawer,
  FormField,
  FIELD_INPUT_CLASS,
} from '@/components/forms/ProgressiveFormPrimitives';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import { PartnerNav } from '../partner-nav';

type ManagedPropertyOption = {
  id: string;
  title: string;
  area: string;
  nightly_rate: number;
  status: string;
};

type MyAcceptedDealEntry = {
  acceptance_id: string;
  deal_id: string;
  deal_code: string;
  property_id: string;
  property_title: string;
  property_area: string;
  decision: 'accepted' | 'declined';
  accepted_terms_snapshot: AcceptedDealTermsSnapshot;
  share_token: string | null;
  deal_live_status: string;
  responded_at: string;
};

type MyAttributedBookingEntry = {
  booking_id: string;
  reference: string;
  property_id: string;
  property_title: string;
  check_in: string;
  check_out: string;
  booking_status: string;
  agent_deal_id: string | null;
  agreed_earnings_ngn: number;
  payout_status: string;
  created_at: string;
};

export default function PartnerDealBoardPage() {
  const db = useMemo(() => getBrowserSupabase(), []);
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('');
  const [activeTab, setActiveTab] = useState<'board' | 'my-deals' | 'owner-deals'>('board');
  const [schemaReady, setSchemaReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [deals, setDeals] = useState<AgentDealRecord[]>([]);
  const [managedProperties, setManagedProperties] = useState<ManagedPropertyOption[]>([]);
  const [myDeals, setMyDeals] = useState<MyAcceptedDealEntry[]>([]);
  const [attributedBookings, setAttributedBookings] = useState<MyAttributedBookingEntry[]>([]);

  // Filters
  const [areaFilter, setAreaFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [structureFilter, setStructureFilter] = useState<'' | AgentDealStructure>('');
  const [maxSellingFilter, setMaxSellingFilter] = useState('');
  const [minPayoutFilter, setMinPayoutFilter] = useState('');

  // Owner Create/Edit Deal Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingDealId, setEditingDealId] = useState('');
  const [dealPropertyId, setDealPropertyId] = useState('');
  const [dealTitle, setDealTitle] = useState('');
  const [dealStructure, setDealStructure] = useState<AgentDealStructure>('fixed_agent_payout');
  const [billingUnit, setBillingUnit] = useState<AgentDealBillingUnit>('per_night');
  const [sellingPriceInput, setSellingPriceInput] = useState('200000');
  const [agentPayoutInput, setAgentPayoutInput] = useState('60000');
  const [ownerNetInput, setOwnerNetInput] = useState('140000');
  const [minStayInput, setMinStayInput] = useState('2');
  const [startsOnInput, setStartsOnInput] = useState(() => new Date().toISOString().slice(0, 10));
  const [expiresOnInput, setExpiresOnInput] = useState('');
  const [exclusivityInput, setExclusivityInput] = useState<AgentDealExclusivity>('open_network');
  const [exclusivePartnerCode, setExclusivePartnerCode] = useState('');
  const [responsibilitiesInput, setResponsibilitiesInput] = useState(
    'Owner/manager confirms calendar availability and handles check-in; agent introduces guest via authorised HAMLET link.',
  );
  const [cancellationInput, setCancellationInput] = useState(
    'Standard HAMLET cancellation and stay completion verification policy applies.',
  );

  const load = useCallback(async () => {
    if (!db) {
      setError('Partner Deal Board is not configured on this deployment.');
      setLoading(false);
      return;
    }
    const { data: session } = await db.auth.getSession();
    const user = session.session?.user;
    if (!user) {
      window.location.assign('/signin?next=/partners/deals');
      return;
    }
    setUserId(user.id);

    const { data: profile } = await db
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    const userRole = String(profile?.role || 'guest');
    setRole(userRole);
    if (userRole !== 'partner' && userRole !== 'admin') {
      setLoading(false);
      return;
    }

    const [dealsRes, earningsRes, propsRes] = await Promise.all([
      db
        .from('agent_deals')
        .select(
          'id,deal_code,property_id,created_by,title,deal_structure,billing_unit,unit_nights,authorised_selling_price_ngn,owner_allocation_ngn,agent_payout_ngn,min_stay_nights,starts_on,expires_on,booking_responsibilities,cancellation_conditions,exclusivity,exclusive_agent_id,status,terms_version,created_at,updated_at,properties(id,title,area,property_type,bedrooms,capacity,nightly_rate,refundable_deposit,status)',
        )
        .order('updated_at', { ascending: false }),
      db.rpc('get_my_agent_deal_earnings'),
      db
        .from('properties')
        .select(PARTNER_PROPERTY_SELECT)
        .order('updated_at', { ascending: false }),
    ]);

    if (dealsRes.error && isMissingSchemaObjectError(dealsRes.error)) {
      setSchemaReady(false);
      setLoading(false);
      return;
    }

    setSchemaReady(true);
    if (dealsRes.error) {
      setError(dealsRes.error.message);
    } else {
      setDeals((dealsRes.data || []) as unknown as AgentDealRecord[]);
    }

    if (!earningsRes.error && earningsRes.data) {
      const payload = earningsRes.data as {
        deals?: MyAcceptedDealEntry[];
        attributed_bookings?: MyAttributedBookingEntry[];
      };
      setMyDeals(Array.isArray(payload.deals) ? payload.deals : []);
      setAttributedBookings(
        Array.isArray(payload.attributed_bookings) ? payload.attributed_bookings : [],
      );
    }

    if (!propsRes.error && Array.isArray(propsRes.data)) {
      const rows = (propsRes.data as unknown as ManagedPropertyOption[]).filter(
        p => p.status === 'approved' || p.status === 'paused',
      );
      setManagedProperties(rows);
      if (rows.length > 0 && !dealPropertyId) {
        setDealPropertyId(rows[0].id);
      }
    }

    setLoading(false);
  }, [db, dealPropertyId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const managedPropertyIds = useMemo(
    () => new Set(managedProperties.map(p => p.id)),
    [managedProperties],
  );

  const acceptedMap = useMemo(() => {
    const m = new Map<string, MyAcceptedDealEntry>();
    for (const item of myDeals) {
      m.set(item.deal_id, item);
    }
    return m;
  }, [myDeals]);

  const availableBoardDeals = useMemo(() => {
    const externalDeals = deals.filter(d => !managedPropertyIds.has(d.property_id));
    return filterAvailableAgentDeals(
      externalDeals,
      {
        area: areaFilter,
        propertyType: typeFilter,
        dealStructure: structureFilter,
        maxSellingPriceNgn: maxSellingFilter ? Number(maxSellingFilter) : null,
        minAgentPayoutNgn: minPayoutFilter ? Number(minPayoutFilter) : null,
      },
      userId,
    );
  }, [
    deals,
    managedPropertyIds,
    areaFilter,
    typeFilter,
    structureFilter,
    maxSellingFilter,
    minPayoutFilter,
    userId,
  ]);

  const ownerManagedDeals = useMemo(
    () => deals.filter(d => managedPropertyIds.has(d.property_id) || d.created_by === userId),
    [deals, managedPropertyIds, userId],
  );

  const livePreviewTerms = useMemo(() => {
    try {
      return validateAndComputeAgentDealTerms({
        dealStructure,
        billingUnit,
        authorisedSellingPriceNgn: Number(sellingPriceInput || 0),
        agentPayoutNgn:
          dealStructure === 'fixed_agent_payout' ? Number(agentPayoutInput || 0) : undefined,
        ownerAllocationNgn:
          dealStructure === 'owner_net_rate' ? Number(ownerNetInput || 0) : undefined,
      });
    } catch {
      return null;
    }
  }, [dealStructure, billingUnit, sellingPriceInput, agentPayoutInput, ownerNetInput]);

  async function handleAcceptOrDecline(dealId: string, decision: 'accepted' | 'declined') {
    if (!db) return;
    setError('');
    setNotice('');
    setBusyId(dealId);
    try {
      const { error: rpcError } = await db.rpc('respond_to_agent_deal', {
        target_deal_id: dealId,
        decision_input: decision,
      });
      if (rpcError) throw new Error(rpcError.message);
      setNotice(
        decision === 'accepted'
          ? 'Deal terms accepted and frozen. Your authorised share link is now unlocked.'
          : 'Deal offer declined.',
      );
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not record deal response.');
    } finally {
      setBusyId('');
    }
  }

  async function handleCopyOrShare(
    entry: MyAcceptedDealEntry,
    mode: 'copy_link' | 'copy_summary' | 'whatsapp' | 'native',
  ) {
    if (!db || !entry.share_token) {
      setError('Accept the deal on an approved property first to generate an authorised link.');
      return;
    }
    setError('');
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://hamlet.rest';
    const shareUrl = buildAuthorisedDealShareUrl({
      propertyId: entry.property_id,
      shareToken: entry.share_token,
      dealCode: entry.deal_code,
      origin,
    });
    const summary = buildDealWhatsAppSummary({
      propertyTitle: entry.property_title,
      area: entry.property_area,
      dealStructure: entry.accepted_terms_snapshot.deal_structure,
      billingUnit: entry.accepted_terms_snapshot.billing_unit,
      authorisedSellingPriceNgn: entry.accepted_terms_snapshot.authorised_selling_price_ngn,
      minStayNights: entry.accepted_terms_snapshot.min_stay_nights,
      shareUrl,
    });

    void db.rpc('record_partner_share_action', {
      target_property_id: entry.property_id,
      action_type: mode === 'whatsapp' ? 'whatsapp_handoff' : 'copy_link',
      action_meta: { deal_code: entry.deal_code, deal_id: entry.deal_id },
      source_surface: 'partner_deal_board',
    });

    if (mode === 'copy_link') {
      await navigator.clipboard.writeText(shareUrl);
      setNotice(`Authorised deal link (${entry.deal_code}) copied.`);
      return;
    }
    if (mode === 'copy_summary') {
      await navigator.clipboard.writeText(summary.text);
      setNotice('WhatsApp-ready property deal summary copied.');
      return;
    }
    if (mode === 'native' && typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({
        title: `${entry.property_title} — HAMLET`,
        text: summary.text,
        url: shareUrl,
      });
      return;
    }
    window.open(summary.whatsappUrl, '_blank', 'noopener,noreferrer');
  }

  function openNewDealDrawer() {
    setEditingDealId('');
    setDealTitle('');
    setDealStructure('fixed_agent_payout');
    setBillingUnit('per_night');
    setSellingPriceInput('200000');
    setAgentPayoutInput('60000');
    setOwnerNetInput('140000');
    setMinStayInput('2');
    setStartsOnInput(new Date().toISOString().slice(0, 10));
    setExpiresOnInput('');
    setExclusivityInput('open_network');
    setExclusivePartnerCode('');
    setDrawerOpen(true);
  }

  function openEditDealDrawer(deal: AgentDealRecord) {
    setEditingDealId(deal.id);
    setDealPropertyId(deal.property_id);
    setDealTitle(deal.title);
    setDealStructure(deal.deal_structure);
    setBillingUnit(deal.billing_unit);
    setSellingPriceInput(String(deal.authorised_selling_price_ngn));
    setAgentPayoutInput(String(deal.agent_payout_ngn));
    setOwnerNetInput(String(deal.owner_allocation_ngn));
    setMinStayInput(String(deal.min_stay_nights));
    setStartsOnInput(deal.starts_on);
    setExpiresOnInput(deal.expires_on || '');
    setExclusivityInput(deal.exclusivity);
    setResponsibilitiesInput(deal.booking_responsibilities);
    setCancellationInput(deal.cancellation_conditions);
    setDrawerOpen(true);
  }

  async function handleSaveOwnerDeal(event: FormEvent) {
    event.preventDefault();
    if (!db) return;
    setError('');
    setNotice('');
    setBusyId('saving-deal');
    try {
      const computed = validateAndComputeAgentDealTerms({
        dealStructure,
        billingUnit,
        authorisedSellingPriceNgn: Number(sellingPriceInput),
        agentPayoutNgn:
          dealStructure === 'fixed_agent_payout' ? Number(agentPayoutInput) : undefined,
        ownerAllocationNgn:
          dealStructure === 'owner_net_rate' ? Number(ownerNetInput) : undefined,
      });

      let exclusiveAgentUuid: string | null = null;
      if (exclusivityInput === 'exclusive_agent') {
        const { data: lookup, error: lookupErr } = await db.rpc(
          'lookup_partner_by_referral_code',
          { code_input: exclusivePartnerCode },
        );
        if (lookupErr) throw new Error(lookupErr.message);
        const found = lookup as { found?: boolean; id?: string } | null;
        if (!found?.found || !found.id) {
          throw new Error(
            'Enter a valid active partner referral code (e.g. HML-...) for an exclusive deal.',
          );
        }
        exclusiveAgentUuid = found.id;
      }

      const { error: saveErr } = await db.rpc('upsert_owner_agent_deal', {
        deal_payload: {
          id: editingDealId || null,
          property_id: dealPropertyId,
          title: dealTitle,
          deal_structure: computed.dealStructure,
          billing_unit: computed.billingUnit,
          authorised_selling_price_ngn: computed.authorisedSellingPriceNgn,
          owner_allocation_ngn: computed.ownerAllocationNgn,
          agent_payout_ngn: computed.agentPayoutNgn,
          min_stay_nights: Number(minStayInput || 1),
          starts_on: startsOnInput,
          expires_on: expiresOnInput || null,
          booking_responsibilities: responsibilitiesInput,
          cancellation_conditions: cancellationInput,
          exclusivity: exclusivityInput,
          exclusive_agent_id: exclusiveAgentUuid,
          status: 'published',
        },
      });
      if (saveErr) throw new Error(saveErr.message);

      setDrawerOpen(false);
      setNotice(
        editingDealId
          ? 'Agent deal updated (previous agent acceptances retain their frozen snapshot).'
          : 'Agent deal published to the HAMLET Deal Board.',
      );
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save agent deal.');
    } finally {
      setBusyId('');
    }
  }

  async function handleOwnerDealStatus(
    dealId: string,
    nextStatus: 'published' | 'paused' | 'withdrawn',
  ) {
    if (!db) return;
    setError('');
    setNotice('');
    setBusyId(dealId);
    try {
      const { error: statusErr } = await db.rpc('set_owner_agent_deal_status', {
        target_deal_id: dealId,
        next_status: nextStatus,
      });
      if (statusErr) throw new Error(statusErr.message);
      setNotice(`Deal status updated to ${nextStatus}.`);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update deal status.');
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="min-h-screen bg-paper text-ink-900">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="eyebrow">HAMLET Agent Deal Board</span>
            <h1 className="serif mt-2 text-3xl font-medium text-ink-900 sm:text-4xl">
              Authorised property deals & margins
            </h1>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-ink-600">
              Owners and managers publish clear selling prices and payouts. Agents must accept deal terms before marketing a property or generating an attributed booking link.
            </p>
          </div>
          {managedProperties.length > 0 && (
            <button
              type="button"
              onClick={openNewDealDrawer}
              className="primary-button min-h-[44px]"
            >
              <Plus className="h-4 w-4 shrink-0" />
              Publish property deal
            </button>
          )}
        </div>

        <div className="mt-6">
          <PartnerNav current="deals" />
        </div>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-900">
            {error}
          </div>
        )}
        {notice && (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-950">
            {notice}
          </div>
        )}

        {loading ? (
          <div className="mt-8 rounded-3xl border border-ink-100 bg-white p-10 text-center text-sm text-ink-500">
            Loading Deal Board…
          </div>
        ) : role !== 'partner' && role !== 'admin' ? (
          <div className="mt-8 rounded-3xl border border-ink-100 bg-white p-8">
            <h2 className="serif text-2xl font-medium text-ink-900">
              Partner approval required
            </h2>
            <p className="mt-2 text-sm text-ink-600">
              Apply for a HAMLET partner account to access owner-authorised shortlet deals.
            </p>
            <Link href="/partners/apply" className="primary-button mt-4 inline-flex">
              Apply as partner →
            </Link>
          </div>
        ) : !schemaReady ? (
          <div className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
            The Deal Board database migration has not yet been applied to this environment.
          </div>
        ) : (
          <>
            {/* Sub-navigation */}
            <div className="mt-6 flex flex-wrap gap-2 border-b border-ink-200 pb-4">
              <button
                type="button"
                onClick={() => setActiveTab('board')}
                className={
                  activeTab === 'board'
                    ? 'rounded-full bg-ink-950 px-4 py-2 text-xs font-bold text-white'
                    : 'rounded-full border border-ink-200 bg-white px-4 py-2 text-xs font-bold text-ink-700'
                }
              >
                Available deals ({availableBoardDeals.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('my-deals')}
                className={
                  activeTab === 'my-deals'
                    ? 'rounded-full bg-ink-950 px-4 py-2 text-xs font-bold text-white'
                    : 'rounded-full border border-ink-200 bg-white px-4 py-2 text-xs font-bold text-ink-700'
                }
              >
                My accepted deals & earnings (
                {myDeals.filter(d => d.decision === 'accepted').length})
              </button>
              {managedProperties.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('owner-deals')}
                  className={
                    activeTab === 'owner-deals'
                      ? 'rounded-full bg-ink-950 px-4 py-2 text-xs font-bold text-white'
                      : 'rounded-full border border-ink-200 bg-white px-4 py-2 text-xs font-bold text-ink-700'
                  }
                >
                  My property deal offers ({ownerManagedDeals.length})
                </button>
              )}
            </div>

            {activeTab === 'board' && (
              <section className="mt-6">
                <div className="grid gap-3 rounded-3xl border border-ink-100 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
                  <input
                    type="text"
                    value={areaFilter}
                    onChange={e => setAreaFilter(e.target.value)}
                    placeholder="Filter by Lagos area…"
                    className={FIELD_INPUT_CLASS}
                  />
                  <input
                    type="text"
                    value={typeFilter}
                    onChange={e => setTypeFilter(e.target.value)}
                    placeholder="Property type…"
                    className={FIELD_INPUT_CLASS}
                  />
                  <select
                    value={structureFilter}
                    onChange={e =>
                      setStructureFilter(e.target.value as '' | AgentDealStructure)
                    }
                    className={FIELD_INPUT_CLASS}
                  >
                    <option value="">All deal structures</option>
                    <option value="fixed_agent_payout">Fixed Agent Payout</option>
                    <option value="owner_net_rate">Owner Net Rate</option>
                  </select>
                  <input
                    type="number"
                    min={0}
                    value={maxSellingFilter}
                    onChange={e => setMaxSellingFilter(e.target.value)}
                    placeholder="Max selling price (₦)"
                    className={FIELD_INPUT_CLASS}
                  />
                  <input
                    type="number"
                    min={0}
                    value={minPayoutFilter}
                    onChange={e => setMinPayoutFilter(e.target.value)}
                    placeholder="Min agent payout (₦)"
                    className={FIELD_INPUT_CLASS}
                  />
                </div>

                {availableBoardDeals.length > 0 ? (
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {availableBoardDeals.map(deal => {
                      const accepted = acceptedMap.get(deal.id);
                      const unitLabel = deal.billing_unit === 'per_week' ? 'week' : 'night';
                      return (
                        <article
                          key={deal.id}
                          className="flex flex-col justify-between rounded-3xl border border-ink-100 bg-white p-5 sm:p-6"
                        >
                          <div>
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <span className="text-[11px] font-extrabold uppercase tracking-wider text-brass-700">
                                  {deal.properties?.area || 'Lagos'} · {deal.deal_code}
                                </span>
                                <h2 className="serif m-0 mt-1 text-2xl font-medium text-ink-900">
                                  {deal.title}
                                </h2>
                                <p className="m-0 mt-0.5 text-xs text-ink-600">
                                  {deal.properties?.title || deal.property_id}
                                </p>
                              </div>
                              <span className="rounded-full bg-paper px-3 py-1 text-[11px] font-bold text-ink-800">
                                {deal.deal_structure === 'fixed_agent_payout'
                                  ? 'Fixed Agent Payout'
                                  : 'Owner Net Rate'}
                              </span>
                            </div>

                            <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-paper p-3 text-xs">
                              <div>
                                <p className="m-0 text-[11px] text-ink-500">
                                  Authorised selling
                                </p>
                                <p className="m-0 mt-0.5 font-mono font-extrabold text-ink-950">
                                  {formatNaira(deal.authorised_selling_price_ngn)}/{unitLabel}
                                </p>
                              </div>
                              <div>
                                <p className="m-0 text-[11px] text-ink-500">Owner allocation</p>
                                <p className="m-0 mt-0.5 font-mono font-bold text-ink-800">
                                  {formatNaira(deal.owner_allocation_ngn)}/{unitLabel}
                                </p>
                              </div>
                              <div>
                                <p className="m-0 text-[11px] text-emerald-800">Your payout</p>
                                <p className="m-0 mt-0.5 font-mono font-extrabold text-emerald-800">
                                  {formatNaira(deal.agent_payout_ngn)}/{unitLabel}
                                </p>
                              </div>
                            </div>

                            <dl className="mt-3 space-y-1.5 text-xs text-ink-600">
                              <div>
                                <strong className="text-ink-900">Minimum stay:</strong>{' '}
                                {deal.min_stay_nights}{' '}
                                {deal.min_stay_nights === 1 ? 'night' : 'nights'} ·{' '}
                                <strong className="text-ink-900">Valid:</strong>{' '}
                                {formatDate(deal.starts_on)}
                                {deal.expires_on ? ` → ${formatDate(deal.expires_on)}` : ' (ongoing)'}
                              </div>
                              <div>
                                <strong className="text-ink-900">Responsibilities:</strong>{' '}
                                {deal.booking_responsibilities}
                              </div>
                              <div>
                                <strong className="text-ink-900">Cancellation:</strong>{' '}
                                {deal.cancellation_conditions}
                              </div>
                            </dl>
                          </div>

                          <div className="mt-5 border-t border-ink-100 pt-4">
                            {accepted?.decision === 'accepted' ? (
                              <div className="space-y-3">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                                  <span>
                                    Terms accepted on {formatDate(accepted.responded_at)} — authorised to share
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => void handleCopyOrShare(accepted, 'whatsapp')}
                                    className="primary-button min-h-[40px] text-xs"
                                  >
                                    <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                                    WhatsApp share
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleCopyOrShare(accepted, 'copy_link')}
                                    className="secondary-button min-h-[40px] text-xs"
                                  >
                                    <Copy className="h-3.5 w-3.5 shrink-0" />
                                    Copy deal link
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void handleCopyOrShare(accepted, 'copy_summary')
                                    }
                                    className="secondary-button min-h-[40px] text-xs"
                                  >
                                    Copy summary
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-[11px] font-semibold text-ink-500">
                                  Accept terms to unlock your tracked HAMLET deal link
                                </span>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    disabled={busyId === deal.id}
                                    onClick={() =>
                                      void handleAcceptOrDecline(deal.id, 'accepted')
                                    }
                                    className="primary-button min-h-[42px] text-xs"
                                  >
                                    <Handshake className="h-3.5 w-3.5 shrink-0" />
                                    Accept deal
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busyId === deal.id}
                                    onClick={() =>
                                      void handleAcceptOrDecline(deal.id, 'declined')
                                    }
                                    className="secondary-button min-h-[42px] text-xs"
                                  >
                                    Decline
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-6 rounded-3xl border border-dashed border-ink-300 bg-white p-8 text-center text-sm text-ink-600">
                    No published agent deal offers match the selected filters right now.
                  </div>
                )}
              </section>
            )}

            {activeTab === 'my-deals' && (
              <section className="mt-6 space-y-6">
                <div className="rounded-2xl border border-ink-100 bg-white p-4 text-xs text-ink-700">
                  <div className="flex items-center gap-2 font-bold text-ink-900">
                    <ShieldCheck className="h-4 w-4 text-brass-700" />
                    <span>Private partner ledger</span>
                  </div>
                  <p className="m-0 mt-1">
                    Your accepted deal snapshots, attributed bookings, and payout statuses are strictly private to your account. Other agents cannot view your margins or client bookings.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {myDeals
                    .filter(item => item.decision === 'accepted')
                    .map(item => {
                      const snap = item.accepted_terms_snapshot;
                      const unitLabel = snap.billing_unit === 'per_week' ? 'week' : 'night';
                      return (
                        <article
                          key={item.acceptance_id}
                          className="rounded-3xl border border-ink-100 bg-white p-5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[11px] font-extrabold uppercase tracking-wider text-brass-700">
                                {item.property_area} · {item.deal_code}
                              </span>
                              <h3 className="serif m-0 mt-1 text-xl font-medium text-ink-900">
                                {item.property_title}
                              </h3>
                            </div>
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-900">
                              Frozen v{snap.terms_version}
                            </span>
                          </div>
                          <p className="m-0 mt-2 text-xs text-ink-600">
                            Authorised selling:{' '}
                            <strong className="font-mono text-ink-900">
                              {formatNaira(snap.authorised_selling_price_ngn)}/{unitLabel}
                            </strong>{' '}
                            · Agreed agent payout:{' '}
                            <strong className="font-mono text-emerald-800">
                              {formatNaira(snap.agent_payout_ngn)}/{unitLabel}
                            </strong>
                          </p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void handleCopyOrShare(item, 'whatsapp')}
                              className="primary-button min-h-[40px] text-xs"
                            >
                              <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                              WhatsApp
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleCopyOrShare(item, 'copy_link')}
                              className="secondary-button min-h-[40px] text-xs"
                            >
                              <Copy className="h-3.5 w-3.5 shrink-0" />
                              Copy link
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleCopyOrShare(item, 'native')}
                              className="secondary-button min-h-[40px] text-xs"
                            >
                              <Share2 className="h-3.5 w-3.5 shrink-0" />
                              Share
                            </button>
                          </div>
                        </article>
                      );
                    })}
                </div>

                <div>
                  <h2 className="serif text-2xl font-medium text-ink-900">
                    Attributed bookings ({attributedBookings.length})
                  </h2>
                  {attributedBookings.length > 0 ? (
                    <div className="mt-3 space-y-3">
                      {attributedBookings.map(b => (
                        <div
                          key={b.booking_id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-white p-4 text-xs"
                        >
                          <div>
                            <p className="m-0 font-bold text-ink-900">
                              {b.reference} · {b.property_title}
                            </p>
                            <p className="m-0 mt-0.5 text-ink-600">
                              {b.check_in} → {b.check_out} · Booking:{' '}
                              <strong>{b.booking_status.replace(/_/g, ' ')}</strong>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="m-0 font-mono text-sm font-extrabold text-emerald-800">
                              {formatNaira(b.agreed_earnings_ngn)}
                            </p>
                            <p className="m-0 text-[11px] font-semibold text-ink-500">
                              Payout: {b.payout_status.replace(/_/g, ' ')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-ink-500">
                      Bookings completed via your authorised HAMLET deal links will appear here with payout status.
                    </p>
                  )}
                </div>
              </section>
            )}

            {activeTab === 'owner-deals' && (
              <section className="mt-6">
                {ownerManagedDeals.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {ownerManagedDeals.map(deal => {
                      const unitLabel = deal.billing_unit === 'per_week' ? 'week' : 'night';
                      return (
                        <article
                          key={deal.id}
                          className="flex flex-col justify-between rounded-3xl border border-ink-100 bg-white p-5"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-[11px] font-extrabold uppercase tracking-wider text-brass-700">
                                  {deal.deal_code} · v{deal.terms_version}
                                </span>
                                <h3 className="serif m-0 mt-1 text-xl font-medium text-ink-900">
                                  {deal.title}
                                </h3>
                                <p className="m-0 text-xs text-ink-500">
                                  {deal.properties?.title || deal.property_id}
                                </p>
                              </div>
                              <span className="rounded-full bg-paper px-3 py-1 text-xs font-bold text-ink-800">
                                {deal.status}
                              </span>
                            </div>

                            <p className="m-0 mt-3 text-xs text-ink-700">
                              Selling:{' '}
                              <strong className="font-mono">
                                {formatNaira(deal.authorised_selling_price_ngn)}/{unitLabel}
                              </strong>{' '}
                              · Owner:{' '}
                              <strong className="font-mono">
                                {formatNaira(deal.owner_allocation_ngn)}
                              </strong>{' '}
                              · Agent:{' '}
                              <strong className="font-mono text-emerald-800">
                                {formatNaira(deal.agent_payout_ngn)}
                              </strong>
                            </p>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2 border-t border-ink-100 pt-3">
                            <button
                              type="button"
                              onClick={() => openEditDealDrawer(deal)}
                              className="secondary-button min-h-[38px] text-xs"
                            >
                              Edit terms
                            </button>
                            {deal.status === 'published' ? (
                              <button
                                type="button"
                                disabled={busyId === deal.id}
                                onClick={() => void handleOwnerDealStatus(deal.id, 'paused')}
                                className="secondary-button min-h-[38px] text-xs"
                              >
                                <PauseCircle className="h-3.5 w-3.5 shrink-0" />
                                Pause
                              </button>
                            ) : (
                              deal.status !== 'withdrawn' && (
                                <button
                                  type="button"
                                  disabled={busyId === deal.id}
                                  onClick={() =>
                                    void handleOwnerDealStatus(deal.id, 'published')
                                  }
                                  className="secondary-button min-h-[38px] text-xs"
                                >
                                  <PlayCircle className="h-3.5 w-3.5 shrink-0" />
                                  Publish
                                </button>
                              )
                            )}
                            {deal.status !== 'withdrawn' && (
                              <button
                                type="button"
                                disabled={busyId === deal.id}
                                onClick={() =>
                                  void handleOwnerDealStatus(deal.id, 'withdrawn')
                                }
                                className="secondary-button min-h-[38px] text-xs text-red-800"
                              >
                                <XCircle className="h-3.5 w-3.5 shrink-0" />
                                Withdraw
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-3xl border border-dashed border-ink-300 bg-white p-8 text-center">
                    <p className="m-0 text-sm text-ink-600">
                      Publish an authorised deal on any of your approved properties to let verified HAMLET agents market it under fixed, transparent terms.
                    </p>
                    <button
                      type="button"
                      onClick={openNewDealDrawer}
                      className="primary-button mt-4 inline-flex"
                    >
                      <Plus className="h-4 w-4 shrink-0" />
                      Create first deal
                    </button>
                  </div>
                )}
              </section>
            )}
          </>
        )}

        <FocusedDrawer
          open={drawerOpen}
          title={editingDealId ? 'Edit property deal offer' : 'Publish property deal offer'}
          subtitle="Clear owner allocation & agent payout — agents cannot alter authorised selling prices."
          onClose={() => setDrawerOpen(false)}
        >
          <form onSubmit={handleSaveOwnerDeal} className="space-y-4">
            <FormField label="Property">
              {fieldProps => (
                <select
                  {...fieldProps}
                  value={dealPropertyId}
                  onChange={e => setDealPropertyId(e.target.value)}
                  required
                  className={FIELD_INPUT_CLASS}
                >
                  {managedProperties.map(prop => (
                    <option key={prop.id} value={prop.id}>
                      {prop.title} ({prop.area})
                    </option>
                  ))}
                </select>
              )}
            </FormField>

            <FormField label="Deal headline">
              {fieldProps => (
                <input
                  {...fieldProps}
                  type="text"
                  required
                  minLength={4}
                  maxLength={140}
                  value={dealTitle}
                  onChange={e => setDealTitle(e.target.value)}
                  placeholder="e.g. Executive Weekly Corporate Offer"
                  className={FIELD_INPUT_CLASS}
                />
              )}
            </FormField>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Deal structure">
                {fieldProps => (
                  <select
                    {...fieldProps}
                    value={dealStructure}
                    onChange={e => setDealStructure(e.target.value as AgentDealStructure)}
                    className={FIELD_INPUT_CLASS}
                  >
                    <option value="fixed_agent_payout">1. Fixed Agent Payout</option>
                    <option value="owner_net_rate">2. Owner Net Rate</option>
                  </select>
                )}
              </FormField>

              <FormField label="Billing unit">
                {fieldProps => (
                  <select
                    {...fieldProps}
                    value={billingUnit}
                    onChange={e => setBillingUnit(e.target.value as AgentDealBillingUnit)}
                    className={FIELD_INPUT_CLASS}
                  >
                    <option value="per_night">Per night</option>
                    <option value="per_week">Per week (7 nights)</option>
                  </select>
                )}
              </FormField>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Authorised selling price (₦)">
                {fieldProps => (
                  <input
                    {...fieldProps}
                    type="number"
                    min={1000}
                    step={500}
                    required
                    value={sellingPriceInput}
                    onChange={e => setSellingPriceInput(e.target.value)}
                    className={FIELD_INPUT_CLASS}
                  />
                )}
              </FormField>

              {dealStructure === 'fixed_agent_payout' ? (
                <FormField label="Fixed agent payout (₦)">
                  {fieldProps => (
                    <input
                      {...fieldProps}
                      type="number"
                      min={0}
                      step={500}
                      required
                      value={agentPayoutInput}
                      onChange={e => setAgentPayoutInput(e.target.value)}
                      className={FIELD_INPUT_CLASS}
                    />
                  )}
                </FormField>
              ) : (
                <FormField label="Owner net allocation (₦)">
                  {fieldProps => (
                    <input
                      {...fieldProps}
                      type="number"
                      min={1000}
                      step={500}
                      required
                      value={ownerNetInput}
                      onChange={e => setOwnerNetInput(e.target.value)}
                      className={FIELD_INPUT_CLASS}
                    />
                  )}
                </FormField>
              )}
            </div>

            {livePreviewTerms && (
              <div className="rounded-2xl border border-ink-100 bg-paper p-3.5 text-xs">
                <p className="m-0 font-bold text-ink-900">
                  Exact kobo-verified split ({livePreviewTerms.billingUnit.replace('_', ' ')}):
                </p>
                <p className="m-0 mt-1 text-ink-700">
                  Authorised selling:{' '}
                  <strong className="font-mono">
                    {formatKoboAsNaira(
                      nairaToKobo(livePreviewTerms.authorisedSellingPriceNgn),
                      true,
                    )}
                  </strong>{' '}
                  = Owner allocation{' '}
                  <strong className="font-mono">
                    {formatKoboAsNaira(nairaToKobo(livePreviewTerms.ownerAllocationNgn), true)}
                  </strong>{' '}
                  + Agent payout{' '}
                  <strong className="font-mono text-emerald-800">
                    {formatKoboAsNaira(nairaToKobo(livePreviewTerms.agentPayoutNgn), true)}
                  </strong>
                </p>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <FormField label="Min stay (nights)">
                {fieldProps => (
                  <input
                    {...fieldProps}
                    type="number"
                    min={1}
                    max={60}
                    required
                    value={minStayInput}
                    onChange={e => setMinStayInput(e.target.value)}
                    className={FIELD_INPUT_CLASS}
                  />
                )}
              </FormField>
              <FormField label="Start date">
                {fieldProps => (
                  <input
                    {...fieldProps}
                    type="date"
                    required
                    value={startsOnInput}
                    onChange={e => setStartsOnInput(e.target.value)}
                    className={FIELD_INPUT_CLASS}
                  />
                )}
              </FormField>
              <FormField label="Expiry date" optional>
                {fieldProps => (
                  <input
                    {...fieldProps}
                    type="date"
                    value={expiresOnInput}
                    onChange={e => setExpiresOnInput(e.target.value)}
                    className={FIELD_INPUT_CLASS}
                  />
                )}
              </FormField>
            </div>

            <FormField label="Agent availability">
              {fieldProps => (
                <select
                  {...fieldProps}
                  value={exclusivityInput}
                  onChange={e =>
                    setExclusivityInput(e.target.value as AgentDealExclusivity)
                  }
                  className={FIELD_INPUT_CLASS}
                >
                  <option value="open_network">Open to active HAMLET partner agents</option>
                  <option value="exclusive_agent">Exclusive to one designated partner</option>
                </select>
              )}
            </FormField>

            {exclusivityInput === 'exclusive_agent' && (
              <FormField label="Designated partner referral code">
                {fieldProps => (
                  <input
                    {...fieldProps}
                    type="text"
                    required
                    value={exclusivePartnerCode}
                    onChange={e => setExclusivePartnerCode(e.target.value)}
                    placeholder="e.g. HML-8F3K2A"
                    className={FIELD_INPUT_CLASS}
                  />
                )}
              </FormField>
            )}

            <FormField label="Booking responsibilities">
              {fieldProps => (
                <textarea
                  {...fieldProps}
                  rows={2}
                  required
                  value={responsibilitiesInput}
                  onChange={e => setResponsibilitiesInput(e.target.value)}
                  className={`${FIELD_INPUT_CLASS} resize-y`}
                />
              )}
            </FormField>

            <FormField label="Cancellation conditions">
              {fieldProps => (
                <textarea
                  {...fieldProps}
                  rows={2}
                  required
                  value={cancellationInput}
                  onChange={e => setCancellationInput(e.target.value)}
                  className={`${FIELD_INPUT_CLASS} resize-y`}
                />
              )}
            </FormField>

            <button
              type="submit"
              disabled={busyId === 'saving-deal'}
              className="primary-button min-h-[48px] w-full"
            >
              {busyId === 'saving-deal'
                ? 'Saving deal…'
                : editingDealId
                  ? 'Save updated deal'
                  : 'Publish deal offer'}
            </button>
          </form>
        </FocusedDrawer>
      </main>

      <SiteFooter />
    </div>
  );
}
