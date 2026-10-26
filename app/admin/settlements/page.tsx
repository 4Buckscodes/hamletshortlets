"use client";

import Link from "next/link";
import AdminNav from "../admin-nav";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type LedgerRow = {
  id: string; booking_id: string; record_type: string; amount: number; provider_reference: string | null;
  status: string; payout_status: string; beneficiary_user_id: string | null; created_at: string;
  bookings?: { reference?: string } | null;
};
const payoutStates = ["pending", "approved", "paid", "reversed", "withheld"];
const payoutLabels: Record<string, string> = { not_applicable: "Not a payout", not_ready: "Not ready", pending: "Pending", approved: "Approved", paid: "Paid", settled: "Settled", reversed: "Reversed", withheld: "Withheld" };
const money = (amount: number) => "₦" + Number(amount || 0).toLocaleString("en-NG");

export default function AdminSettlementsPage() {
  const db = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    return url && key ? createClient(url, key) : null;
  }, []);
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [states, setStates] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!db) { setError("Settlement tools are not configured on this deployment."); setLoading(false); return; }
    const { data: auth } = await db.auth.getSession();
    if (!auth.session) { window.location.assign("/signin?next=/admin/settlements"); return; }
    const { data: profile, error: profileError } = await db.from("profiles").select("role").eq("id", auth.session.user.id).maybeSingle();
    if (profileError || profile?.role !== "admin") { setError("Administrator access is required."); setLoading(false); return; }
    const { data, error: queryError } = await db.from("booking_payment_records")
      .select("id,booking_id,record_type,amount,provider_reference,status,payout_status,beneficiary_user_id,created_at,bookings(reference)")
      .order("created_at", { ascending: false }).limit(250);
    if (queryError) setError("Could not load the settlement ledger. Check database access and refresh.");
    else {
      const list = (data || []) as unknown as LedgerRow[];
      setRows(list);
      setStates(Object.fromEntries(list.map((row) => [row.id, row.payout_status])));
      setError("");
    }
    setLoading(false);
  }, [db]);

  // The async loader synchronizes UI state with Supabase; the updates occur after awaited I/O.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function save(row: LedgerRow) {
    if (!db) return;
    const next = states[row.id];
    if (!payoutStates.includes(next)) { setError("Choose a valid payout status."); return; }
    const note = (notes[row.id] || "").trim();
    if (["paid", "withheld", "reversed"].includes(next) && note.length < 8) {
      setError("Add a note of at least 8 characters for paid, withheld, or reversed payouts."); return;
    }
    setBusy(row.id); setError(""); setNotice("");
    const { error: rpcError } = await db.rpc("update_payout_status", {
      target_entry_id: row.id, next_payout_status: next, payout_note: note || null,
    });
    if (rpcError) setError("The payout update was rejected. Confirm the entry is eligible and your admin account is active.");
    else { setNotice("Saved payout status for " + (row.bookings?.reference || row.booking_id) + "."); await load(); }
    setBusy("");
  }

  const filtered = rows.filter((row) => filter === "all" || row.payout_status === filter || row.record_type === filter);
  const payoutRows = filtered.filter((row) => row.payout_status !== "not_applicable");
  const outstanding = rows.filter((row) => ["pending", "approved"].includes(row.payout_status)).reduce((sum, row) => sum + Number(row.amount || 0), 0);
  return <main style={{ minHeight: "100svh", background: "var(--paper)" }}>
    <header style={{ background: "#fff", borderBottom: "1px solid var(--line)" }}><div className="shell" style={{ minHeight: 68, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}><Link href="/" style={{ fontWeight: 850, fontSize: 19 }}>HAMLET<span style={{ color: "var(--gold)" }}>.REST</span></Link><AdminNav current="settlements" /></div></header>
    <section className="shell" style={{ paddingBlock: 34, maxWidth: 1100 }}>
      <p style={{ color: "#806522", textTransform: "uppercase", letterSpacing: ".12em", fontSize: 11, fontWeight: 800 }}>Finance operations</p>
      <h1 className="serif" style={{ fontSize: "clamp(34px,6vw,52px)", fontWeight: 500, margin: "8px 0 12px" }}>Settlement ledger</h1>
      <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>Review recorded payment allocations and manage partner payout states. This screen does not initiate transfers or mark a guest payment as received; payment confirmation remains the responsibility of the verified provider webhook.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginTop: 22 }}>
        <div style={{ padding: 18, background: "#fff", border: "1px solid var(--line)", borderRadius: 16 }}><p style={{ color: "var(--muted)", margin: 0, fontSize: 12 }}>Ledger entries loaded</p><strong style={{ display: "block", fontSize: 28, marginTop: 6 }}>{rows.length}</strong></div>
        <div style={{ padding: 18, background: "#fff", border: "1px solid var(--line)", borderRadius: 16 }}><p style={{ color: "var(--muted)", margin: 0, fontSize: 12 }}>Pending / approved allocation total</p><strong style={{ display: "block", fontSize: 25, marginTop: 6 }}>{money(outstanding)}</strong><span style={{ fontSize: 11, color: "var(--muted)" }}>Indicative ledger total, not a bank balance</span></div>
      </div>
      {error && <p role="alert" style={{ color: "#9c2f25" }}>{error}</p>}
      {notice && <p role="status" style={{ color: "#24552b" }}>{notice}</p>}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 22 }}>
        <label style={{ fontSize: 13, fontWeight: 700 }}>Filter entries{" "}<select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ marginLeft: 8, padding: 10, border: "1px solid var(--line)", borderRadius: 10, background: "#fff" }}>
          <option value="all">All types and statuses</option>{payoutStates.map((s) => <option key={s} value={s}>{payoutLabels[s]}</option>)}<option value="guest_charge">Guest charges</option><option value="partner_commission">Partner commissions</option><option value="closing_agent_commission">Closing agent commissions</option><option value="referral_reward">Referral rewards</option><option value="refund">Refund records</option><option value="caution_refund">Caution refunds</option>
        </select></label><span style={{ color: "var(--muted)", fontSize: 12 }}>{payoutRows.length} payout/allocation records in current view</span>
      </div>
      {loading ? <p>Loading settlement ledger…</p> : filtered.length ? <div style={{ display: "grid", gap: 12, marginTop: 16 }}>{filtered.map((row) => <article key={row.id} style={{ padding: 18, border: "1px solid var(--line)", borderRadius: 16, background: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div><p style={{ margin: 0, color: "#806522", fontSize: 11, fontWeight: 800 }}>{row.bookings?.reference || row.booking_id}</p><h2 style={{ margin: "6px 0", fontSize: 17 }}>{row.record_type.replaceAll("_", " ")}</h2><p style={{ margin: 0, color: "var(--muted)", fontSize: 12 }}>{new Date(row.created_at).toLocaleString()} · {row.provider_reference ? "Provider ref: " + row.provider_reference : "No provider reference recorded"}</p></div>
          <div style={{ textAlign: "right" }}><strong style={{ fontSize: 21 }}>{money(row.amount)}</strong><p style={{ margin: "5px 0 0", color: "var(--muted)", fontSize: 12 }}>Record status: {row.status}</p></div>
        </div>
        {row.payout_status !== "not_applicable" && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
          <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700 }}>Payout state
            <select value={states[row.id] || row.payout_status} onChange={(e) => setStates((old) => ({ ...old, [row.id]: e.target.value }))} style={{ padding: 11, border: "1px solid var(--line)", borderRadius: 10, background: "#fff" }}>{payoutStates.map((s) => <option key={s} value={s}>{payoutLabels[s]}</option>)}</select>
          </label>
          <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700 }}>Audit note
            <input maxLength={500} value={notes[row.id] || ""} onChange={(e) => setNotes((old) => ({ ...old, [row.id]: e.target.value }))} placeholder="Reason or transfer reference" style={{ padding: 11, border: "1px solid var(--line)", borderRadius: 10 }} />
          </label>
          <div style={{ display: "flex", alignItems: "end" }}><button className="primary-button" disabled={busy === row.id || states[row.id] === row.payout_status} onClick={() => void save(row)}>{busy === row.id ? "Saving…" : "Update payout state"}</button></div>
        </div>}
      </article>)}</div> : <div style={{ marginTop: 20, padding: 28, border: "1px dashed #c8c1b1", borderRadius: 18, background: "#fff" }}>No ledger entries match this filter.</div>}
    </section>
  </main>;
}
