"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Issue = { id: string; reference: string; booking_id: string; reporter_id: string; category: string; severity: string; subject: string; description: string; status: string; assignee_id: string | null; resolution: string | null; created_at: string };
const statuses = ["open", "assigned", "investigating", "escalated", "resolved", "closed"];
const statusNames: Record<string, string> = { open: "Open", assigned: "Assigned", investigating: "Investigating", escalated: "Escalated", resolved: "Resolved", closed: "Closed" };

export default function AdminIssuesPage() {
  const db = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    return url && key ? createClient(url, key) : null;
  }, []);
  const [items, setItems] = useState<Issue[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { status: string; resolution: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!db) { setError("Support desk is not configured on this deployment."); setLoading(false); return; }
    const { data: auth } = await db.auth.getSession();
    if (!auth.session) { window.location.assign("/signin?next=/admin/issues"); return; }
    const { data: profile, error: profileError } = await db.from("profiles").select("role").eq("id", auth.session.user.id).maybeSingle();
    if (profileError || profile?.role !== "admin") { setError("This support desk is restricted to authorised administrators."); setLoading(false); return; }
    const { data, error: queryError } = await db.from("booking_issues")
      .select("id,reference,booking_id,reporter_id,category,severity,subject,description,status,assignee_id,resolution,created_at")
      .order("created_at", { ascending: false });
    if (queryError) setError("Could not load issue reports. Check your administrator access and refresh.");
    else {
      const rows = (data || []) as Issue[];
      setItems(rows);
      setDrafts(Object.fromEntries(rows.map((issue) => [issue.id, { status: issue.status, resolution: issue.resolution || "" }])));
      setError("");
    }
    setLoading(false);
  }, [db]);

  useEffect(() => { void load(); }, [load]);

  async function save(issue: Issue) {
    if (!db) return;
    const draft = drafts[issue.id];
    if (!draft) return;
    if (["resolved", "closed"].includes(draft.status) && !draft.resolution.trim()) {
      setError("Add a resolution note before resolving or closing an issue."); return;
    }
    setSaving(issue.id); setError(""); setMessage("");
    const { data: auth } = await db.auth.getSession();
    if (!auth.session) { window.location.assign("/signin?next=/admin/issues"); return; }
    const { error: updateError } = await db.from("booking_issues").update({
      status: draft.status, resolution: draft.resolution.trim() || null, assignee_id: auth.session.user.id, updated_at: new Date().toISOString(),
    }).eq("id", issue.id);
    if (updateError) setError("The issue could not be updated. Confirm your admin permissions and try again.");
    else { setMessage("Updated " + issue.reference + "."); await load(); }
    setSaving("");
  }

  const priority = (severity: string) => severity === "critical" || severity === "high" ? "#9c2f25" : "var(--muted)";
  return <main style={{ minHeight: "100svh", background: "var(--paper)" }}>
    <header style={{ background: "#fff", borderBottom: "1px solid var(--line)" }}><div className="shell" style={{ minHeight: 68, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}><Link href="/" style={{ fontWeight: 850, fontSize: 19 }}>HAMLET<span style={{ color: "var(--gold)" }}>.REST</span></Link><Link href="/admin/properties" className="secondary-button">Admin workspace</Link></div></header>
    <section className="shell" style={{ paddingBlock: 34, maxWidth: 1050 }}>
      <p style={{ color: "#806522", textTransform: "uppercase", letterSpacing: ".12em", fontSize: 11, fontWeight: 800 }}>Operations</p>
      <h1 className="serif" style={{ fontSize: "clamp(34px,6vw,52px)", fontWeight: 500, margin: "8px 0 12px" }}>Guest issue desk</h1>
      <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>Review reports, record the investigation outcome, and keep a clear status trail for guest support. High and critical reports should be prioritised.</p>
      {error && <p role="alert" style={{ color: "#9c2f25" }}>{error}</p>}
      {message && <p role="status" style={{ color: "#24552b" }}>{message}</p>}
      {loading ? <p>Loading issue reports…</p> : items.length ? <div style={{ display: "grid", gap: 14, marginTop: 22 }}>{items.map((issue) => {
        const draft = drafts[issue.id] || { status: issue.status, resolution: issue.resolution || "" };
        return <article key={issue.id} style={{ padding: 20, border: "1px solid var(--line)", borderRadius: 18, background: "#fff" }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12 }}>
            <div><p style={{ margin: 0, color: "#806522", fontSize: 11, fontWeight: 800 }}>{issue.reference}</p><h2 style={{ margin: "6px 0", fontSize: 20 }}>{issue.subject}</h2><p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>{issue.category} · Booking {issue.booking_id} · {new Date(issue.created_at).toLocaleString()}</p></div>
            <span style={{ alignSelf: "start", color: priority(issue.severity), fontWeight: 850, textTransform: "uppercase", fontSize: 12 }}>{issue.severity} priority</span>
          </div>
          <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.65 }}>{issue.description}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
            <label style={{ display: "grid", gap: 6, fontWeight: 700, fontSize: 13 }}>Status
              <select value={draft.status} onChange={(e) => setDrafts((old) => ({ ...old, [issue.id]: { ...draft, status: e.target.value } }))} style={{ padding: 11, border: "1px solid var(--line)", borderRadius: 10, background: "#fff" }}>{statuses.map((s) => <option key={s} value={s}>{statusNames[s]}</option>)}</select>
            </label>
            <label style={{ display: "grid", gap: 6, fontWeight: 700, fontSize: 13 }}>Resolution / investigation note
              <textarea rows={3} maxLength={4000} value={draft.resolution} onChange={(e) => setDrafts((old) => ({ ...old, [issue.id]: { ...draft, resolution: e.target.value } }))} placeholder="Record the action taken or what happens next…" style={{ padding: 11, border: "1px solid var(--line)", borderRadius: 10, resize: "vertical" }} />
            </label>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 12 }}><span style={{ color: "var(--muted)", fontSize: 12 }}>Current status: {statusNames[issue.status] || issue.status}</span><button className="primary-button" disabled={saving === issue.id} onClick={() => void save(issue)}>{saving === issue.id ? "Saving…" : "Save issue update"}</button></div>
        </article>;
      })}</div> : <div style={{ marginTop: 22, padding: 28, border: "1px dashed #c8c1b1", borderRadius: 18, background: "#fff" }}>No issue reports found.</div>}
    </section>
  </main>;
}
