"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Booking = { id: string; reference: string; status: string; check_in: string; check_out: string; properties?: { title?: string } | null };
type Issue = { id: string; reference: string; booking_id: string; category: string; severity: string; subject: string; description: string; status: string; resolution: string | null; created_at: string };
const issueStatus: Record<string, string> = { open: "Open", assigned: "Assigned", investigating: "Being investigated", escalated: "Escalated", resolved: "Resolved", closed: "Closed" };
const categories = ["Property not as described", "Access or check-in problem", "Cleanliness or maintenance", "Safety concern", "Payment or refund", "Cancellation", "Other"];

export default function AccountIssuesPage() {
  const db = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    return url && key ? createClient(url, key) : null;
  }, []);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [bookingId, setBookingId] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [severity, setSeverity] = useState("medium");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!db) { setError("Issue reporting is not configured on this deployment."); setLoading(false); return; }
    const { data: auth } = await db.auth.getSession();
    if (!auth.session) { window.location.assign("/signin?next=/account/issues"); return; }
    const [bookingResult, issueResult] = await Promise.all([
      db.from("bookings").select("id,reference,status,check_in,check_out,properties(title)").order("created_at", { ascending: false }),
      db.from("booking_issues").select("id,reference,booking_id,category,severity,subject,description,status,resolution,created_at").order("created_at", { ascending: false }),
    ]);
    if (bookingResult.error) setError("We could not load your bookings. Refresh and try again.");
    else setBookings((bookingResult.data || []) as unknown as Booking[]);
    if (issueResult.error) setError("We could not load your reported issues. Refresh and try again.");
    else setIssues((issueResult.data || []) as Issue[]);
    setLoading(false);
  }, [db]);

  useEffect(() => { void load(); }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || !bookingId) { setError("Choose the booking this issue relates to."); return; }
    setSaving(true); setError(""); setMessage("");
    const { data: auth } = await db.auth.getSession();
    const userId = auth.session?.user.id;
    if (!userId) { window.location.assign("/signin?next=/account/issues"); return; }
    const reference = "HAM-ISS-" + crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
    const { error: insertError } = await db.from("booking_issues").insert({
      reference, booking_id: bookingId, reporter_id: userId, category, severity,
      subject: subject.trim(), description: description.trim(), status: "open",
    });
    if (insertError) {
      setError(insertError.code === "42501" ? "You can only report an issue for one of your own bookings." : "We could not submit the issue. Please check your connection and try again.");
    } else {
      setMessage("Your report has been submitted. Keep the reference below for follow-up: " + reference);
      setSubject(""); setDescription(""); setSeverity("medium");
      await load();
    }
    setSaving(false);
  }

  const bookingLabel = (id: string) => {
    const b = bookings.find((item) => item.id === id);
    return b ? (b.properties?.title || "HAMLET stay") + " · " + b.reference : "Booking";
  };

  return <main style={{ minHeight: "100svh", background: "var(--paper)" }}>
    <header style={{ background: "#fff", borderBottom: "1px solid var(--line)" }}><div className="shell" style={{ minHeight: 68, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}><Link href="/" style={{ fontWeight: 850, fontSize: 19 }}>HAMLET<span style={{ color: "var(--gold)" }}>.REST</span></Link><Link href="/account/bookings" className="secondary-button">My bookings</Link></div></header>
    <section className="shell" style={{ paddingBlock: 34, maxWidth: 900 }}>
      <p style={{ color: "#806522", textTransform: "uppercase", letterSpacing: ".12em", fontSize: 11, fontWeight: 800 }}>Guest support</p>
      <h1 className="serif" style={{ fontSize: "clamp(34px,6vw,52px)", fontWeight: 500, margin: "8px 0 12px" }}>Report a booking issue</h1>
      <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>Tell our team what happened. Reports are linked to your booking and can be reviewed by authorised HAMLET staff and the relevant property partner.</p>
      {error && <p role="alert" style={{ color: "#9c2f25" }}>{error}</p>}
      {message && <p role="status" style={{ padding: 14, borderRadius: 12, background: "#edf5ed", color: "#24552b" }}>{message}</p>}
      <form onSubmit={submit} style={{ display: "grid", gap: 14, marginTop: 22, padding: 22, border: "1px solid var(--line)", borderRadius: 18, background: "#fff" }}>
        <label style={{ display: "grid", gap: 7, fontWeight: 700, fontSize: 13 }}>Booking
          <select required value={bookingId} onChange={(e) => setBookingId(e.target.value)} style={{ width: "100%", padding: 12, border: "1px solid var(--line)", borderRadius: 10, background: "#fff" }}>
            <option value="">Choose a booking</option>{bookings.map((b) => <option key={b.id} value={b.id}>{b.properties?.title || "HAMLET stay"} · {b.reference} ({b.status})</option>)}
          </select>
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
          <label style={{ display: "grid", gap: 7, fontWeight: 700, fontSize: 13 }}>Issue type
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: "100%", padding: 12, border: "1px solid var(--line)", borderRadius: 10, background: "#fff" }}>{categories.map((c) => <option key={c}>{c}</option>)}</select>
          </label>
          <label style={{ display: "grid", gap: 7, fontWeight: 700, fontSize: 13 }}>Urgency
            <select value={severity} onChange={(e) => setSeverity(e.target.value)} style={{ width: "100%", padding: 12, border: "1px solid var(--line)", borderRadius: 10, background: "#fff" }}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical — immediate safety concern</option></select>
          </label>
        </div>
        <label style={{ display: "grid", gap: 7, fontWeight: 700, fontSize: 13 }}>Short summary
          <input required maxLength={120} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Could not access the apartment" style={{ width: "100%", padding: 12, border: "1px solid var(--line)", borderRadius: 10 }} />
        </label>
        <label style={{ display: "grid", gap: 7, fontWeight: 700, fontSize: 13 }}>What happened?
          <textarea required minLength={10} maxLength={5000} rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Include dates, what you expected, and what help you need. Please do not include passwords or full payment card details." style={{ width: "100%", padding: 12, border: "1px solid var(--line)", borderRadius: 10, resize: "vertical" }} />
        </label>
        <button className="primary-button" type="submit" disabled={saving || loading || !bookings.length}>{saving ? "Submitting report…" : "Submit issue report"}</button>
        {!loading && !bookings.length && <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>You need a booking on your account before reporting a booking issue.</p>}
      </form>
      <section style={{ marginTop: 34 }}>
        <h2 className="serif" style={{ fontSize: 28, fontWeight: 500 }}>Your reports</h2>
        {loading ? <p>Loading your reports…</p> : issues.length ? <div style={{ display: "grid", gap: 12 }}>{issues.map((issue) => <article key={issue.id} style={{ padding: 18, border: "1px solid var(--line)", borderRadius: 16, background: "#fff" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between" }}><strong>{issue.subject}</strong><span style={{ borderRadius: 999, padding: "5px 9px", background: "#f1eee7", fontSize: 12, fontWeight: 750 }}>{issueStatus[issue.status] || issue.status}</span></div>
          <p style={{ margin: "8px 0", color: "var(--muted)", fontSize: 13 }}>{issue.reference} · {bookingLabel(issue.booking_id)} · {issue.category} · {issue.severity}</p>
          <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{issue.description}</p>
          {issue.resolution && <p style={{ padding: 12, background: "#f6f4ee", borderRadius: 10 }}><strong>Resolution update:</strong> {issue.resolution}</p>}
        </article>)}</div> : <p style={{ color: "var(--muted)" }}>You have not reported any issues yet.</p>}
      </section>
    </section>
  </main>;
}
