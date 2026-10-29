# 02 — Video Strategy: Types, Formats & Rules for Nigeria

---

## 1. The objective is belief, not attention

Nigerian social feeds are saturated with polished property video. Drone shots of Lekki, slow pans across marble islands, Afrobeats underneath — the audience has seen tens of thousands of these and has learned that **beauty is not evidence**. December 2025 confirmed it: the flats that looked best online charged ₦700,000 a night.

So HAMLET's video objective is:

> **Move the viewer from "another app" to "these people have receipts" — in under 45 seconds, on mute, on a compressed WhatsApp forward.**

Every script in this pack carries an explicit **proof mechanism**: a screen recording, a document, a number, a real door, a real inspector, a real ledger row. If a script has no proof mechanism, it does not ship.

**Secondary objective:** make the video *forwardable*. In Nigeria, distribution is a family group chat and an agent's broadcast list, not a paid impression. A video gets shared when it makes the sharer look informed or protective — *"see this, before you book anything."* Write hooks that give the sharer a reason.

---

## 2. The seven video types

Each type maps to a segment from `01-MARKET-ANALYSIS.md` §3.

| # | Type | Segment | Length | Platform | Proof mechanism | Scripts |
|---|---|---|---|---|---|---|
| **T1** | **Host Economics Explainer** | S1 | 45–75s | IG Reels, Facebook, WhatsApp, YouTube | Live on-screen maths: B → 0% → what the owner receives vs Airbnb | `S1-A`, `S1-B`, `S1-C` |
| **T2** | **Agent Money Pitch** | S2 | 25–40s | IG Reels, TikTok, X | Commission ledger screen + shareable `?agent=` link | `S2-A`, `S2-B` |
| **T3** | **Verification Documentary** | S1, S3, D1 | 45–120s | YouTube, IG, LinkedIn | Real inspector at a real door; the 4 pillars as filmed work | `S3-A`, `DI-2`, `DI-4` (ch. 3) |
| **T4** | **Burned-Once React / Testimonial** | D1, D3 | 30–50s | TikTok, IG Reels, X | Contrast: the lie vs the ledger; real price breakdown | `D1-A`, `D1-B`, `D3-A`, `S1-C` (hybrid) |
| **T5** | **Neighbourhood Utility** | D2, D4 | 45–90s | IG Reels, YouTube Shorts, TikTok | Real street footage + stated power/WiFi facts | `D2-A`, `D2-B`, `DI-3` |
| **T6** | **Diaspora Search-Capture (long-form)** | S3, D3, D4 | 9–11 min | YouTube | Walkthrough of the actual booking + payment verification flow | `DI-4` |
| **T7** | **Seasonal Demand Spike** | D3 | 30–58s | IG, TikTok, Meta ads (geo: US/UK/CA) | USD quote screen + group-split maths | `D3-B`, `DI-1` |

---

## 3. Nigerian distribution reality → hard format rules

These are not preferences. They are constraints derived from how video actually travels in Nigeria.

### R1 · WhatsApp-first engineering
- **Export a dedicated WhatsApp cut** of every video: H.264, **≤ 16 MB**, 720p acceptable, **≤ 60s**. This is the version that does the work.
- Must survive 3 generations of re-compression: **high contrast, no fine detail, no thin serif text at small size, no low-contrast greys.**
- Include a **spoken + written CTA** with the URL (`hamlet.rest`), because a forwarded video loses its caption.

### R2 · Silent-readable by default
- **Burned-in captions on 100% of videos**, positioned in the **middle-upper third** (TikTok/Reels UI covers the bottom ~15% and the right edge).
- Caption style: **bold sans (Inter ExtraBold), 2–4 words per line, navy `#0e1f3b` on paper `#f8f5ee` chip** — matches the site palette, stays legible after compression.
- **Never use Playfair Display for captions.** It is a display serif; it dies at 3MB. Reserve it for title cards only, at large sizes.
- The video must be fully comprehensible with audio off. Test it that way before export.

### R3 · The 3-second rule is really a 1.5-second rule
- Nigerian scroll speed is fast and ad-blindness is extreme. **The hook must be a face + a number or a confrontation in frame 1.**
- **No logo sting at the start. Ever.** Logo goes at the end, small.
- No drone establishing shot. No slow fade. No "In the heart of Lagos..."

### R4 · Data cost is a design constraint
- Long-form is a **search asset** (YouTube), never a feed asset.
- For feed video: **under 75 seconds** for domestic, under 45 seconds for money pitches. Retention collapse after 60s is steep on metered data.

### R5 · Language register — code-switch deliberately
- **Pidgin for the emotional hook and the wound. English for the mechanics and the numbers.**
- Rationale: pidgin carries authenticity and emotion and signals "this is for us"; English carries precision and is required for financial/legal claims. Reversing this — pidgin for the fee maths — reads as unserious about money.
- **Never write caricature pidgin.** Use it as a native speaker would, in short bursts. Every pidgin line in this pack should be checked by a Lagos-based native speaker before shooting. See §7.
- Subtitles in **standard English** regardless of spoken register, so the video works across Nigeria (Hausa/Yoruba/Igbo first-language viewers) and with the diaspora.

### R6 · People beat production
- **A recognisable human face holding a phone in a real corridor outperforms a produced brand film** in this market, for this audience, at this price point.
- Priority: **casting and writing > camera and lighting.** Budget accordingly (see `06` §4).

### R7 · Comment sections are the conversion surface
- In Nigeria the purchase decision is finished in the replies and in WhatsApp threads, not in the video.
- Every video ships with a **pinned comment** containing: the price-breakdown explanation, the link, and a direct answer to the most likely hostile question.
- **Staff the comments for 72 hours** after posting. Unanswered "how much is the fee?" in a Nigerian comment thread is a lost campaign.

### R8 · Vertical by default
- **9:16 primary** (Reels, TikTok, WhatsApp Status, YouTube Shorts).
- **16:9 secondary** only for YouTube long-form (T6) and the economics explainer where a screen recording needs room.
- **1:1 fallback** for Facebook and X in-feed.

---

## 4. Art direction

Derived from the live brand tokens in `app/globals.css`:

| Token | Hex | Use in video |
|---|---|---|
| `--navy` | **`#0e1f3b`** | Title cards, lower-thirds, caption chips (text), end card background |
| `--navy-deep` | **`#091528`** | Night exteriors grade, end card, contrast shadows |
| `--gold` (brass) | **`#c9a44a`** | **The proof accent.** Verification badges, the "0%" number, underline emphasis, the confirmed tick |
| `--paper` | **`#f8f5ee`** | Background for explainer/maths segments, caption chips |
| `--clay` | **`#efeade`** | Secondary surface, document mock backgrounds |
| `--line` | **`#e8e4da`** | Dividers, table rules in screen-capture segments |

**Typography:** `Inter Variable` for all body/caption/number work. `Playfair Display Variable` for title cards and the end card wordmark only.

**The visual signature — "gold on navy for proof."** Every time something is *verified, confirmed, or disclosed*, it appears in gold `#c9a44a` on navy. Over 8–10 videos this becomes a recognisable cue: viewers start to associate the gold flash with "this part is real." It is cheap, ownable, and directly serves the belief objective.

**Grade:** natural, slightly warm, high contrast. **Do not colour-grade interiors toward aspirational teal-and-orange.** The brand promise is that the photos match the flat; the video grade must match the photos. Shoot flat and correct for accuracy, not for mood.

**Horatio** (the in-app AI concierge) is an available brand character. Use sparingly — a gold `Sparkles` icon moment when a script needs "ask and get an answer in seconds." Do not build a mascot-driven campaign around it; the trust story is human.

---

## 5. Casting & creator rules

1. **One consistent lead face** for the whole Phase 1 run — the founder, or one hired Lagos creator. Consistency builds recall; a new face per video builds nothing.
2. **Real hosts and real agents on camera**, named, in their own units. An actual Lekki host saying "I keep 100% of my rate" is worth fifty pieces of copy.
3. **Real inspectors.** The verification documentary (T3) must show a person doing the work: clipboard, phone camera, opening a cupboard, checking the inverter, photographing the C of O. **This is the most differentiated footage HAMLET can possibly shoot, and no competitor can fake it.**
4. **Micro-creators over mega-influencers.** For S2 (agents) and D1 (burned-once), 10k–80k follower accounts with high comment density beat a 1M celebrity. Nigerian audiences discount celebrity endorsements as paid; they do not discount a person who is visibly in the trade.
5. **Avoid BBNaija-tier celebrity** for the price-transparency content specifically. That audience association is now tied to the December 2025 *complaint* about prices; a celebrity face there invites the wrong frame.
6. **Never use a "foreign" accent or a generic pan-African voiceover.** If the voice is not Lagos, the video is not Lagos.

---

## 6. Compliance guardrails — non-negotiable

HAMLET's brand *is* honesty. A marketing claim the product cannot support is not a minor slip; it is the exact behaviour the platform exists to punish. These rules come straight from the repo's own governance culture (`MVP_SPECIFICATION.md` §4: *"No public reviews or claims of live availability until those features are genuinely connected"*).

| 🚫 Never | ✅ Instead |
|---|---|
| Show a room tour of a property that is **not an approved live listing** | Shoot the *process* — inspection, verification, host economics. Or shoot a **real approved** listing once inventory exists |
| Use the site's **sample/stock interiors** (`hero-sample-*.jpg`) as if they were real inventory | Label any sample footage on screen as *"sample interior"* exactly as the homepage does |
| Claim **"highly rated"** or show star ratings | **Public ratings are disabled during pilot.** Say *"private post-stay feedback, reviewed by our operations team"* |
| Claim **"guaranteed occupancy"** or any booking volume | The market is saturated at 38%. Claim **0% fee** and **agent distribution** — both true and both stronger |
| Claim **"book now"** or **"available tonight"** while `/stays` shows 0 | Route demand-phase CTA to **waitlist / partner CTA**, never to an empty search |
| Quote a **3% service fee** (dead prose in `MVP_SPECIFICATION.md`) | The live rate is **20% domestic markup + 10% FX buffer**. Use the real numbers or use none |
| Imply **in-product split payments** for groups | Not shipped. Say *"one payer books for the group, up to the listed max capacity"* |
| Say **"escrow"** | HAMLET uses **server-verified Paystack settlement**, not escrow. Different mechanism; different legal meaning |
| Position as a **tax/licensing compliance solution** | Say *"documentation-ready"* and route to legal review before claiming more |
| Use **contested market statistics** in ad copy | Numbers like occupancy and market size are internal strategy only — sources disagree |
| Promise **instant deposit refunds** | Deposits refund **only after post-checkout inspection review** — say exactly that |
| Suggest a **screenshot or transfer confirms a booking** | The opposite is a core claim: *"screenshots never confirm."* Never dramatise a fake confirmation |

**Legal/consumer-protection note:** all pricing claims must match `src/lib/pricing.ts` at time of publication. If the owner changes the markup (see `00` §4, Decision 1), **every published asset must be re-checked**. Maintain a single pricing-claims register; see `06-EXECUTION-PLAN.md` §7.

---

## 7. Production workflow

**Language QA step (mandatory):** every pidgin line goes to a Lagos-based native speaker for a naturalness pass before shooting. Written pidgin by a non-native reads instantly as advertising and kills the video. This is a 30-minute check that protects the whole asset.

**Three production tiers** — every script in this pack is tagged with one:

| Tier | What it is | Cost | Best for |
|---|---|---|---|
| **T0 · Phone** | iPhone/Android, natural light, lapel mic (₦15k), burned captions in CapCut | **~₦0–25k** | T2 agent pitches, T4 react/testimonial, WhatsApp cuts |
| **T1 · Creator** | Local creator + phone/small camera, basic lighting, real location, editor | **~₦75k–250k/video** | T1 host economics, T5 neighbourhood, T7 seasonal |
| **T2 · Produced** | 2-person crew, real inspector shoot, screen-capture unit, grade, sound | **~₦400k–1.2m/video** | T3 verification documentary, T6 YouTube long-form |

**Screen-capture unit:** a dedicated, repeatable setup for recording the actual product UI (property card → 4-pillar grid → price breakdown → booking request → 48-hour hold → Paystack → confirmed state). Most of HAMLET's proof is *in the interface*, and screen capture is the cheapest, most credible way to show it. **Build this once; reuse across every script.** Requires a seeded demo environment with clearly-labelled test data — never present demo data as live inventory (§6).

---

## 8. Channel plan

| Channel | Role | Segments | Notes |
|---|---|---|---|
| **WhatsApp (Status + broadcast + groups)** | **Primary distribution.** Where a booking decision actually gets made | All | Every video needs the ≤16MB cut. Seed via agents (S2) — they already have broadcast lists |
| **Instagram Reels** | Discovery + agent community | S2, S1, D1, D3 | Nigerian shortlet culture lives here. Agent/plug accounts are the nodes |
| **TikTok** | Volume reach for the burned-once narrative | D1, D3 | Best for T4 react format. Youngest audience, highest share rate |
| **YouTube (long-form + Shorts)** | **Search capture & trust.** "Lagos shortlet scam", "manage property in Nigeria from abroad", "shortlet with inverter Yaba" | S3, D2, D4 | High intent, weak video competition, long shelf life. The diaspora lands here |
| **Facebook** | Hosts 35+, property-owner groups | S1 | Underrated and cheap in Nigerian real-estate owner demographics |
| **X / Twitter** | Discourse. This is where the December 2025 price revolt happened | D1, S2 | Reactive + meme-native. Staff it |
| **LinkedIn** | Corporate travel bookers, diaspora professionals | D2, S3 | Small but high-value; T3 and T5 repurposed |
| **Meta / Google Ads** | Paid amplification **only in Phase 2**, gated on inventory | D2, D3 | Geo-fence US/UK/Canada **Sept–Nov** for December demand. Do not run Phase 1 paid guest ads |

---

## 9. Measurement — the KPI that matters

Not views. Not likes.

| Metric | Why | Target signal |
|---|---|---|
| **Forwards / shares per 1,000 views** | The only metric that proves WhatsApp-native distribution is working | > 8 shares/1k views |
| **Watch-through at 3s and at 100%** | Hook quality and length discipline | >70% at 3s; >35% at 100% (≤45s cuts) |
| **Link taps to `/partners/apply`** | Phase 1 conversion | Primary Phase 1 KPI |
| **Completed partner applications** | Actual supply pipeline | Track to `partner_applications` table |
| **Approved properties** | **The real goal of Phase 1** | Toward the 50-property target |
| **Link taps to `/stays` + booking requests** | Phase 2 conversion, gated | Only meaningful post-inventory |
| **Cost per approved listing** | Efficiency of the whole supply engine | The number to optimise |
| **Comment sentiment on fee disclosure** | Early warning on the 20% risk | Manual review, 72h post-publish |

Full KPI tree and reporting cadence in `06-EXECUTION-PLAN.md` §6.
