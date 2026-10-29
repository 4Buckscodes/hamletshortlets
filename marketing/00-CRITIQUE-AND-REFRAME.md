# 00 — Critique & Reframe of the Brief

**Read this first.** Everything downstream depends on the correction made here.

**Prepared:** 29 October 2026
**Source of truth:** full crawl of `hamlet.rest` + this repository (`MVP_SPECIFICATION.md`, `docs/PRICING_AND_PAYMENT_CONTRACT.md`, `docs/DEPLOYMENT_AND_ROLLBACK.md`, `public/llms-full.txt`) + Lagos market data (see `01-MARKET-ANALYSIS.md` §7 for sources).

---

## 1. The brief as given

> Crawl hamlet.rest, determine the target market from supply to guests, determine the type of videos that will gain their attention, write 2–3 scripts for each, add a specialised diaspora script, produce a plan, keep the Nigerian local market in mind.

This is a competent brief with the right instincts — it correctly senses that supply must be understood before demand, and it correctly senses that diaspora needs separate treatment. It is directionally right and operationally wrong in five specific places.

---

## 2. Five problems with the brief

### Problem 1 — "From supply to guests" assumes there is supply. There isn't.

The live marketplace at `hamlet.rest/stays` returns, verbatim:

> **"0 stays across Lagos"** · *"No approved stays match this search yet."*

`docs/DEPLOYMENT_AND_ROLLBACK.md` §4 confirms it at the database level: *"`public.properties` on `jopnnevqnwrpldrojmdu` currently has `0` rows."*

And `MVP_SPECIFICATION.md` §2 set the target: **"Initial supply target: 50 approved properties by 31 October 2026."**

Today is 29 October 2026. The platform is at **0 of 50**, with two days left.

**Consequence:** the brief's ordering is inverted. You cannot run a guest-attention campaign against an empty marketplace. Worse — doing so would *prove the brand wrong in public*. HAMLET's entire positioning is honesty ("we never show placeholder or simulated inventory"). A guest who watches a beautiful video, clicks, and lands on "0 stays" doesn't blame the market — they blame the video. That is a permanent brand wound delivered at cost.

**Fix:** the plan is resequenced into **Phase 1 = supply acquisition, Phase 2 = demand capture**. Guest-facing video is *gated* behind a live-inventory threshold. See `06-EXECUTION-PLAN.md`.

---

### Problem 2 — "Gain their attention" is the wrong objective for a trust product.

Attention in Lagos is cheap and abundant. **Trust is the scarce asset**, and the market data says so explicitly.

MO Africa's Detty December research (reported to Forbes Africa) noted that *"a number of bookings were done through agents rather than through booking platforms, which speaks to trust concerns and the power-play of agents in the industry."* Nigerians did not lack platforms. They lacked a reason to believe one.

So the correct objective is not attention — it is **belief transfer**: moving a viewer from "another app" to "this one has receipts." Every script in this pack is built to a proof mechanism, not an attention mechanism. Attention is the by-product.

---

### Problem 3 — The brief treats pricing as settled. It is the single biggest risk in the whole campaign.

`docs/PRICING_AND_PAYMENT_CONTRACT.md` records a **live contradiction inside your own repo**:

- `MVP_SPECIFICATION.md` §3 says: *"HAMLET service fee: **3%** paid by the guest only."*
- The authoritative engine (`src/lib/pricing.ts`, the live Supabase migration, every pricing card on the site) enforces `v2_20pct_markup_10pct_fx_buffer`: domestic guest accommodation = **B × 1.20**, i.e. a **20% markup**, plus a **10% buffer** on USD/GBP quotes.

The doc itself flags this for owner visibility. The 3% figure is dead prose; **20% is what a guest actually pays.**

Now set that against what just happened in the Nigerian market:

- December 2025, a one-bedroom in Lekki Phase 1 peaked at **₦700,000/night** (normal: ₦120k–200k). Vanguard ran it under the headline *"Nigerians boycott shortlet apartments for hotels as booking prices skyrocket."*
- BBNaija's Leo DaSilva posted screenshots of VI and Ikoyi apartments: *"Over $9000 for 11 nights for a just okay place."*
- Ikoyi went from 85% December occupancy to **40% in January**. Victoria Island 80% → **35%**. Lekki Phase 1 87% → **39%**.
- Guests did not just complain. **They left the category and went back to hotels.**

**A Nigerian audience in late 2026 is primed to read "20% markup" as "greedy December, round two."** If a HAMLET video says "transparent pricing, no hidden fees" and a commenter does the maths against the owner's rate, the campaign detonates in the replies — and the replies are where Nigerian purchase decisions actually get made (WhatsApp forwards, IG comment threads).

This is not a reason to hide the fee. HAMLET's whole brand is disclosure, and hiding it would be self-contradiction. It is a reason to **answer the question before it is asked**, on camera, with the allocation shown. Two of the scripts below (`S1-C` and `D3-B`) exist purely for this. There is also a commercial option the owner should weigh — see §4.

---

### Problem 4 — "Diaspora" is treated as one audience. It is at least three, and the most valuable one isn't booking.

The brief asks for "a specialised script for diaspora." Singular. But the diaspora behaves in three economically distinct ways:

| | Who | What they want from HAMLET | Value |
|---|---|---|---|
| **D2-a** | The December returnee (≈495,000 air arrivals, Dec 2024; 90% diaspora) | A verified place, quoted in $ or £, that won't vanish after a transfer | Booking volume, seasonal |
| **D2-b** | The "japa-reversal" tester / remote worker spending 2–8 weeks in Lagos | Stated power + WiFi, monthly-ish stays, a real neighbourhood | High ADR, long stays, low seasonality — the occupancy problem-solver |
| **D3** | **The diaspora landlord** — owns Lagos property, lives in Houston / London / Toronto | Someone accountable to run it, and proof it isn't being misused | **Supply.** This is the highest-value diaspora segment and the brief missed it entirely |

Segment D3 matters most right now, because **HAMLET's binding constraint is supply, not bookings.** A diaspora Nigerian with an empty furnished flat in Oniru or Magodo is not a guest — they are the exact asset Phase 1 needs. Nigeria's diaspora sends ≈$20–23bn home annually and, per Baay Realty, is *"shifting from sending money for consumption to structured investments."* Property they already own and cannot supervise is the obvious entry point.

So the diaspora pack is **four scripts, not one**, and the lead script is a supply play. See `05-SCRIPTS-DIASPORA.md`.

---

### Problem 5 — "Type of videos" without a distribution model produces videos nobody sees.

The brief says "videos." In Nigeria that word hides the actual constraint. The distribution reality:

- **WhatsApp is the internet.** A shortlet recommendation travels as a forwarded video in a family group, not as a paid impression. If a video cannot survive being compressed to 3MB and watched muted on a cracked screen in a Danfo, it does not exist.
- **Data costs money.** Long-form is a search asset (YouTube: "Lagos shortlet scam"), not a feed asset.
- **Most viewing is silent.** Autoplay on mute means **burned-in captions are not optional** — they are the primary copy surface.
- **Polish reads as foreign.** Over-produced brand film underperforms a recognisable face holding a phone in a real Lekki corridor. Nigerian audiences are highly attuned to advertising and skip it fast; they do not skip a person.
- **Search intent is real and unowned.** "Lagos shortlet scam", "is [platform] legit", "shortlet with inverter Yaba" — high-intent queries with weak video answers.

`02-VIDEO-STRATEGY.md` converts all of this into hard format rules that every script obeys.

---

## 3. The reframe

> **HAMLET's first product is not booking. It is verification — and its first customer is not the guest. It is the host.**

Three consequences flow from this:

1. **The wedge is `0% owner fee`.** Lagos has 8,691 active listings averaging **38% occupancy** and **$4.5K annual revenue**, with the average unit struggling near **30% monthly occupancy** and needing ~10 booked nights just to break even. Airbnb takes roughly 14–16% from the host. Diesel has destroyed the margins of anyone running a generator. HAMLET takes **0% from the owner and keeps 100% of B intact.** In a margin-squeezed, supply-saturated market, that is the loudest sentence available — and no incumbent can copy it without breaking their P&L.

2. **The agent is a channel, not a competitor.** Lagos bookings already run through agents. HAMLET's **Closing Agent** role pays them **10% of B, recorded and tracked, with zero properties listed.** Instead of fighting the informal layer, HAMLET is the only platform that *formalises and pays it*. That is a self-recruiting salesforce. Video for this segment should be blunt and money-first.

3. **Demand marketing is a reward for solving supply, not a substitute for it.** Guest-facing video launches only when a real, verified inventory exists to receive the click.

---

## 4. Decisions the owner must make before a single frame is shot

These are genuinely blocking, and no amount of script-writing resolves them.

| # | Decision | Why it blocks | Recommendation |
|---|---|---|---|
| **1** | **Is the 20% guest markup final, or does it drop for pilot?** | Determines whether Phase 2 leads on price or on trust. A 20% markup in post-boycott Lagos is a headwind; 3–5% is a tailwind. | For the first 90 days and first ~200 bookings, consider a **pilot rate (e.g. 5–7%)** marketed as "launch pricing," then graduate. This converts the biggest liability into a scarcity story. Owner + `src/lib/pricing.ts` change only — the doc already describes the controlled path. |
| **2** | **Do we retire the "3% service fee" line from `MVP_SPECIFICATION.md`?** | Two numbers in your own repo. If any early deck, email or landing copy still says 3%, it is a misrepresentation risk under NDPR/consumer-protection norms. | **Yes — reconcile the spec to `v2`.** One-line doc fix, high risk-reduction. |
| **3** | **What is the live-inventory gate for Phase 2?** | Phase 2 spend without it burns money and damages the brand (§2, Problem 1). | **Minimum 15 approved, bookable, photographed stays across ≥3 areas, with ≥2 on the Mainland.** Not 50 — 50 across 16 neighbourhoods is thin everywhere; 15 concentrated is demonstrable. |
| **4** | **Are we shooting in real verified properties, or studio/sample sets?** | The site currently uses *sample* interiors on the homepage and explicitly **rejects stock/sample photos at inspection**. Video built on sample interiors would contradict the core promise. | **Real properties only.** If zero are approved, Phase 1 video must be *about the process* (inspection, verification, host economics) — never a fake room tour. This is a hard rule; see `02-VIDEO-STRATEGY.md` §6. |
| **5** | **Who is the on-camera face?** | Nigerian audiences respond to people, not logos. Also determines whether we need creator partnerships. | **One consistent human host** (founder or a hired Lagos creator) plus rotating real hosts/agents. Not a voiceover over B-roll. |

---

## 5. What this pack contains

| File | Contents |
|---|---|
| `01-MARKET-ANALYSIS.md` | Crawl findings, market sizing, competitor map, regulatory notes, and the full supply→guest target market model (segments S1–S3, D1–D4) |
| `02-VIDEO-STRATEGY.md` | Why belief beats attention, the 7 video types, Nigerian distribution/format rules, art direction, casting, compliance guardrails |
| `03-SCRIPTS-SUPPLY.md` | **6 scripts** — hosts ×3, closing agents ×2, diaspora landlord ×1 |
| `04-SCRIPTS-DEMAND.md` | **6 scripts** — burned-once Nigerian ×2, domestic business/tech traveller ×2, December returnee & group ×2 |
| `05-SCRIPTS-DIASPORA.md` | **4 specialised diaspora scripts** — landlord, December returnee, remote-worker relocation test, long-form YouTube anti-scam search capture |
| `06-EXECUTION-PLAN.md` | Sequenced 90-day plan, gate criteria, three budget tiers, KPI tree, shooting calendar, production checklist, measurement |

**Total: 16 shootable scripts**, each with a hook, shot-by-shot table, VO in register, burned-in text, caption, CTA, platform/aspect spec, production tier, and a "do not" guardrail.

---

## 6. One-line summary of the whole argument

> Lagos does not need another shortlet app. It has 8,691 of them and 38% occupancy. It needs a reason to believe one — so sell **verification to hosts first** (at 0% fee), turn **agents into a paid distribution army** (10%), and only then run guest video, with the **20% question answered on camera before anyone asks it.**
