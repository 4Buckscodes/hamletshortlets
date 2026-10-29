# 01 — Market Analysis: Target Market from Supply to Guests

**Method:** full crawl of `hamlet.rest` (home, `/stays`, `/how-it-works`, `/safety`, `/about`, `/partners/apply`, `/signin`) cross-read against this repository's own source of truth (`public/llms-full.txt`, `MVP_SPECIFICATION.md`, `docs/PRICING_AND_PAYMENT_CONTRACT.md`, `docs/DEPLOYMENT_AND_ROLLBACK.md`, `docs/RELEASE_READINESS.md`), then validated against published Lagos shortlet market data.

---

## 1. What HAMLET actually is (crawl findings)

**Entity:** HAMLET Marketplace Ltd, by **Abundance Abodes** — positioned as *"The Operating System for African Shortlets,"* launching in Lagos.
**Tagline:** *Your stay, sorted.*
**Homepage headline:** *Lagos is big. Your stay, sorted.*
**Locale:** `en_NG`. Canonical: `https://www.hamlet.rest/`.

### 1.1 The product mechanics that matter for marketing

| Mechanic | Detail | Marketing significance |
|---|---|---|
| **Owner fee** | **0%.** Owner receives **100% of listed NGN accommodation rate `B`** plus disclosed mandatory charges | The single most powerful supply-side number in the business. Airbnb takes ~14–16% from hosts |
| **Domestic guest price** | **`B × 1.20`** — a **20% markup** | The single biggest demand-side liability. See `00-CRITIQUE-AND-REFRAME.md` Problem 3 |
| **Markup allocation** | Closing agent **10% of B** · direct referrer **2.5%** (90-day window) · HAMLET **5%** (7.5% without referrer) · payment reserve **2.5%** | Disclosable. Turns the liability into a story: "here is exactly where your 20% goes" |
| **International quotes** | USD ($) / GBP (£) at treasury reference rates **+ a single 10% FX buffer**; settles in **NGN via Paystack**; quote valid **30 minutes** | Diaspora-native. No competitor in the local set quotes in three currencies with a disclosed buffer |
| **Caution deposit** | Itemised separately, **0% markup, 0% FX buffer**, full state machine (`due → received → inspection_pending → refund_approved → refund_completed`) | Answers "they never returned my deposit" — a top-3 Nigerian shortlet complaint |
| **Booking model** | **Request-to-book.** Zero charge at request → host confirms → **48-hour Paystack window** → `confirmed` only on **server-verified webhook** | Kills the screenshot-scam. *"A browser redirect, screenshot or uploaded receipt is never proof of payment"* |
| **Verification** | **4 pillars**, each recorded honestly: `ownership` (title/C of O), `identity` (govt ID), `authority to list` (ownership or signed mandate), `physical inspection` (on-site) | The differentiator. Nobody else in the local set publishes per-listing verification state |
| **Honest labelling** | `verified` / `self_reported` / `pending_review` / `missing`. A partner's checkbox is `self_reported` until a human reviews it | Radically unusual. Most platforms imply verification they never performed |
| **Photography** | **Stock and sample photos are rejected at review.** Photos must be the actual accommodation | Directly attacks the #1 Nigerian shortlet grievance — the catfish listing |
| **Power disclosure** | Per-listing: **inverter / generator / 24/7 estate power**, plus internet & workspace | Critical. Diesel costs are a market-defining pain in 2026 |
| **Access control** | **Gate pins and door codes unlock only after confirmation** | Strong safety story for solo female travellers and diaspora |
| **Cards / privacy** | Card details stay with Paystack, never stored on HAMLET; NDPR-aligned | Trust asset |
| **Reviews** | **Public star ratings intentionally disabled during pilot**; private feedback reviewed by operations | A constraint, not a feature. Cannot market "highly rated." Must be handled carefully — see `02` §6 |
| **Concierge** | **Horatio** — in-app AI assistant for neighbourhoods, pricing, booking holds | A brandable on-screen character. Underused asset |

### 1.2 Geographic coverage (unusually broad, and strategically so)

**Lagos Mainland & environs:** Yaba (Sabo · Alagomeji · Akoka · Ebute Metta · Jibowu), Shomolu (Palmgrove · Onipanu · Pedro · Fadeyi · Bariga), Surulere (Bode Thomas · Adeniran Ogunsanya · Eric Moore · Aguda · Kilo · Iponri), Gbagada (Medina · Ifako), Ilupeju, Ikeja GRA, Maryland (Anthony · Mende), Opebi, Ogudu, Magodo.

**Lagos Island & Lekki corridor:** Victoria Island (Adeola Odeku · Ahmadu Bello), Ikoyi (Old Ikoyi · Falomo), Banana Island, Lekki Phase 1 (Admiralty Way), Oniru, Ajah (Chevron · Orchid Road · Sangotedo).

> **Strategic read:** every competitor's marketing lives in Lekki Phase 1 / VI / Ikoyi. HAMLET's *structured* Mainland coverage — Yaba, Surulere, Shomolu, Ikeja GRA — is an **unowned positioning lane**, and it happens to be where the affordability gap and the fastest demand growth are (Yaba shortlet demand reportedly **+25% in 2025**). This is a real, defensible wedge that costs nothing to claim.

### 1.3 Live supply state — the critical finding

```
https://hamlet.rest/stays  →  "0 stays across Lagos"
                              "No approved stays match this search yet."
```

- `public.properties` on live Supabase (`jopnnevqnwrpldrojmdu`): **0 rows**
- `MVP_SPECIFICATION.md` target: **50 approved properties by 31 October 2026** — **0 of 50 achieved** as of today, 29 October
- Homepage renders the honest empty state: *"New verified stays arriving soon. HAMLET publishes listings only after review — never placeholder or simulated inventory."*
- Pending gates before live payments: Paystack/Resend secrets, migration push, pricing sign-off, domain cutover confirmation

**This is the fact the entire campaign must be built around.**

---

## 2. The Lagos market HAMLET is entering

### 2.1 Size and trajectory

| Metric | Value | Source |
|---|---|---|
| Lagos shortlet market revenue, 2025 | **₦281.03 billion** | Edala Development via Nairametrics / The Guardian |
| 2026 projection | **~₦285.5 billion** | PropCommAfrica |
| 2024 baseline | ₦264.3 billion (5,806 listings studied) | Edala Homes *Lagos Short-let Market 2024* |
| 3-year growth | **+263%** | Estate Intel |
| Active listings (Airbnb/Vrbo/Booking), Jul 2026 | **8,691** (+23.5% YoY) | AirDNA |
| Airbnb-Lagos tracked listings | ~1,361, **+~50% YoY** | Airbtics via PropCommAfrica |

### 2.2 The saturation signal — this is the whole story

| Metric | Value |
|---|---|
| Lagos average occupancy | **38%** (AirDNA, trailing 12 months) |
| Average daily rate (ADR) | **$96** |
| RevPAR | **$35** |
| Average annual revenue per listing | **$4,500** |
| Airbnb-specific platform occupancy (Feb 2025–Jan 2026) | **~43%** |
| Average operator monthly occupancy | **~30%** |
| Break-even threshold | **~10 booked nights/month** |
| Top-10% "best-in-class" occupancy | **70–80%** |

**Read:** aggregate market revenue is rising while **median per-listing revenue is falling.** Listings +50%, occupancy down. That is the textbook signature of **supply saturation**. Some operators are already pulling listings off Airbnb/Booking.com and converting back to annual leases.

**Why this is *good* news for HAMLET:** a saturated market of undifferentiated, unverified supply creates exactly the conditions where a **verification-and-distribution** platform wins. Hosts are desperate for (a) lower platform cost and (b) more bookings. HAMLET offers **0% fee** and **a paid agent army**. The market's pain is HAMLET's pitch. Nobody needs convincing that hosting is hard — they need convincing that this is the better rail.

### 2.3 Submarket performance

| Submarket | Listings | ADR | Occupancy | Revenue |
|---|---|---|---|---|
| **Lekki Phase 1** | 1,621 | ₦253,000 | 63% | ~₦94bn (2024) → **₦93.78bn (2025, flat/down)** |
| **Ikoyi** | — | — | 60–70% | ₦37.5bn (2025) |
| **Banana Island** | **133** | **₦351,000** | **65%** | ₦11bn (2024) |
| **Lekki Phase 2 / Peninsula II** | — | — | — | ~₦70bn |
| **Yaba (1-bed)** | — | **₦55,000** | **53%** | ~₦10.5m/unit/yr |

Lekki Phase 1 is the volume engine but is now **flat year-on-year** — higher rates did not compensate for lost bookings. Banana Island is supply-constrained (133 listings) with the strongest pricing power — and is under **regulatory watch** (see §2.6).

### 2.4 Seasonality — and the 2025 revolt

December is a massive revenue event that also structures annual yield maths. Premium island submarkets ran **40–50 percentage points higher** occupancy in Dec 2024 vs Jan 2024.

**But December 2025 broke the model:**

| | Normal / Sept 2025 | Detty December 2025 |
|---|---|---|
| Lekki Phase 1 (1-bed) | ₦120,000–200,000 | **up to ₦700,000** |
| Victoria Island (1-bed) | ₦120,000–200,000 | ₦180,000–300,000 |
| Ikoyi (1-bed) | ₦120,000–200,000 | ₦180,000–300,000+ |
| Mainland (Yaba/Surulere/Ikeja) | ₦100,000–150,000 | ₦150,000–250,000 |

Occupancy collapse into January: **Ikoyi 85% → 40% · Victoria Island 80% → 35% · Lekki Phase 1 87% → 39%.**

The press response was brutal and national:
- **Vanguard:** *"Detty December: Nigerians boycott shortlet apartments for hotels as booking prices skyrocket."*
- **Businessday:** *"A new twist in Detty December as short-let operators lose out."*
- **BBNaija's Leo DaSilva:** *"Nothing is funnier than the prices of VI and Ikoyi apartments this December... Over $9000 for 11 nights for a just okay place. Hotels will get more bookings this December and you will have to reduce your prices."*
- Industry voice Jennifer Ike: *"Most apartments in Lagos are sitting empty... I will blame it on the price, and greedy hosts."*

**This is the single most important demand-side insight in the entire analysis.** There is a large, emotionally available, recently-burned Nigerian audience who are **not anti-shortlet — they are anti-being-overcharged and anti-being-lied-to.** They are looking for the honest operator. That is precisely the audience HAMLET's architecture was built to serve, and it is why **the price-transparency video is mandatory, not optional.**

Hotels absorbed the overflow because they offered *"fixed pricing, enhanced security, reliable housekeeping, and consistent power supply."* Note what those are: **predictability guarantees.** HAMLET can offer the equivalent — and it already has the machinery.

### 2.5 The Detty December economy (diaspora scale)

| Metric | Value |
|---|---|
| Lagos visitors, Dec 2024 | **~1.2 million** (60% domestic) |
| Air arrivals | ~550,000 |
| **Diaspora share of air arrivals** | **~495,000 (90%)** |
| Lagos Dec hospitality revenue | **₦111.5bn / $71.6m** |
| — Hotels | ₦54bn / $44m from 15,000 bookings |
| — **Shortlet apartments** | **₦21bn / $13m from ~6,000 bookings**, avg nightly **₦120,000** |
| Top source countries | **US (27% of international arrivals)**, UK, Canada, Italy, South Africa |
| Nigeria diaspora remittances | **≈$20–23 billion/year** (~4× FDI) |
| Projected Detty December FX by 2026 | up to **$2 billion** (MO Africa) |

Also: **December is peak shortlet-fraud season.** When demand outstrips supply and people book fast from abroad, scam volume explodes. This is HAMLET's highest-converting emotional territory for the diaspora pack.

### 2.6 Regulatory environment

- **Lagos State partial shortlet ban in Banana Island**, plus adjustments to short-term rental tax treatment — *"a growing state interest in formalising the sector"* (Businessday).
- Implication: **verification and documentation are becoming a compliance requirement, not a differentiator.** HAMLET's 4-pillar evidence trail (title/C of O, govt ID, signed mandate, physical inspection) is exactly what a formalising regulator will demand. This is a genuine moat and a strong B2B/host story: *"when the state asks for your paperwork, you already have it."*
- Guardrail: **do not** market HAMLET as a tax-compliance or licensing solution without legal review. Frame it as documentation-readiness.

### 2.7 Competitive set

| Player | Position | HAMLET's counter |
|---|---|---|
| **Airbnb / Booking.com** | Default global rails; expanding Nigerian inventory but *"have not yet solved local verification at scale"* | 0% owner fee vs ~14–16%; human inspection; NGN settlement; local power disclosure |
| **Spleet** | Raised **$2.6m** (MaC Venture Capital); flexible monthly + short-term | Monthly-flex focus ≠ verified nightly marketplace; no agent commission economy |
| **Muster** | *"The Nigerian answer to Airbnb"* | Volume/listing breadth, not verification depth |
| **Stay Assist** | Multi-vertical hospitality tech (Abuja, Lagos, PH, Benin) | Multi-city spread vs Lagos depth |
| **NimbleCasa / MyCribb / Krent** | Marketplace variants emphasising verification, host support, pricing | Direct overlap on verification — HAMLET must *show* its verification, not claim it |
| **Mushrooms Stays** | Escrow-until-check-in, **split payments** for groups | Split-pay is a real gap in HAMLET. Worth watching / roadmap. Escrow ≠ server-verified settlement |
| **The informal agent** | **Still controls a large share of bookings** — MO Africa: bookings went through agents "rather than booking platforms" | **HAMLET is the only one that pays them: 10% of B, recorded, no inventory needed.** Co-opt, don't compete |

**Positioning gap HAMLET owns:** *verified, disclosed-pricing, agent-inclusive, Mainland-and-Island, tri-currency.* No single competitor holds all five. The **closing-agent economy** in particular is unclaimed territory — and it is the cheapest customer-acquisition channel available.

---

## 3. Target market model: supply → guests

Ordered by *priority*, not by intuition. Supply first, because supply is the constraint.

### SUPPLY SIDE (Phase 1 — the real first market)

#### **S1 — The Squeezed Mid-Tier Host** 🔴 *highest priority*

- **Who:** Owns or operates **1–3 furnished units**, typically Lekki Phase 1, Ajah, Yaba, Surulere, Ikeja GRA, Gbagada, Magodo. Often a converted residential flat, not purpose-built. May be a salary-earner who bought one unit as an investment, or a small operator running several.
- **Their reality:** 38% market occupancy; average units ~30% monthly; needs ~10 booked nights/month just to break even. Diesel prices have destroyed generator-dependent margins. Airbnb takes 14–16%. Some of their peers are converting back to annual leases.
- **Their emotional state:** **Anxious, over-supplied, under-paid, and suspicious of platforms** — because every platform has promised them occupancy and delivered a dashboard.
- **What wins them:** Not a pitch about HAMLET. **A number.** `0% owner fee — you keep 100% of your listed rate.` Plus: *we send you guests via a paid agent network, and we do the verification work that gets you past the state.*
- **What loses them:** Anything that looks like another app launch. Any claim of guaranteed occupancy (there is no inventory to prove it yet, and the market is saturated — they will smell it instantly).
- **Channel:** WhatsApp (industry host groups, agent broadcasts), Instagram Reels, Facebook (still heavily used by Nigerian property owners 35+), in-person at agent meetups, YouTube for the economics explainer.

#### **S2 — The Closing Agent / Booking Agent** 🔴 *highest leverage per naira*

- **Who:** The informal layer that actually moves Lagos bookings. Freelance agents, "shortlet plug" Instagram accounts, realtors who book on the side, concierges, Twitter/X booking pages with 10k–200k followers. They have audiences and no product.
- **Their reality:** They earn by markup and opacity — quoting a guest ₦250k for a ₦180k flat. It works until the guest finds out, and December 2025 taught a lot of guests to find out. They carry **zero inventory risk** but also **zero formal protection**: no contract, no tracked commission, no paper trail, and they get cut out the moment a host goes direct.
- **What wins them:** **10% of B, recorded, tracked, paid — with 0 properties listed.** A shareable link (`?agent=HML-...`). A referral ladder on top (**2.5% recurring for 90 days** on partners they bring in). Legitimacy: they become a *partner*, not a middleman.
- **This is the most underexploited asset in the entire business.** A motivated agent with 50k followers is a distribution channel that costs nothing until it converts.
- **Channel:** Instagram DMs and Reels (this is where they live), WhatsApp broadcasts, X/Twitter, TikTok. Money-first, blunt, no brand film.

#### **S3 — The Diaspora Landlord** 🟠 *highest value per conversion*

- **Who:** Nigerian in Houston / London / Toronto / Atlanta / Dubai who **owns property in Lagos** — a flat in Oniru, a duplex in Magodo, a unit in Ikeja GRA — bought as investment or future retirement home. Sends part of the ≈$20–23bn annual remittance flow.
- **Their reality:** The unit sits empty, or a relative "manages" it with no accountability, or it's listed by someone they can't verify. They cannot physically inspect anything. They have been burned by Nigerian property dealings before — the diaspora's defining financial emotion is **caution after years of failed projects and inconsistent experiences** (Businessday).
- **What wins them:** **Accountability with an audit trail.** 4-pillar verification, recorded inspection, itemised caution-deposit ledger, immutable audit log, NDPR-aligned. They don't need a tenant; they need to *know what's happening in their own house.*
- **Secondary win:** a furnished empty unit is pure loss. Listing it converts a liability into income at **0% fee**.
- **Channel:** YouTube (long-form search: "how to manage my property in Nigeria from abroad"), Instagram, diaspora WhatsApp/Telegram communities, Nigerian-diaspora podcast sponsorships, LinkedIn for the professional cohort.

---

### DEMAND SIDE (Phase 2 — gated on live inventory)

#### **D1 — The "Burned Once" Nigerian** 🟢 *largest, most emotionally available audience*

- **Who:** Any Nigerian who has booked a shortlet and been deceived. Enormous, cross-class, and **actively vocal right now** because of the December 2025 price revolt.
- **The four wounds:** (1) **catfish photos** — the flat looks nothing like the pictures; (2) **no power** — "24/7 light" meant a generator that runs 6pm–11pm if there's diesel; (3) **surprise fees at the door** — cleaning, service charge, "estate levy," deposit they never see again; (4) **the vanished transfer** — sent money to a personal account, arrived, no one opens the gate.
- **What wins them:** Not aspirational interiors. **Receipts.** The verification badge, the price breakdown shown before you pay, the deposit ledger, "screenshots never confirm a booking." This audience converts on *specificity of the guarantee*, not beauty.
- **Language:** Pidgin for the emotional hook, English for the mechanics. This is the segment most responsive to humour and to righteous anger.
- **Channel:** TikTok, Instagram Reels, X/Twitter (where the December discourse happened), WhatsApp forwards.

#### **D2 — The Domestic Business & Tech Traveller** 🟢

- **Who:** Nigerian professionals travelling for work — consultants, auditors, sales teams, conference attendees, medical visitors, startup/tech people in the **Yaba cluster**, corporate visitors to VI/Adeola Odeku, airport-axis travellers in Ikeja GRA/Maryland/Magodo.
- **Their reality:** Needs **stated** power and WiFi because a 3-hour outage is a lost client call. Needs a desk. Needs proximity, not vibes. Books on company money or their own, and needs a receipt. Often 3–14 nights.
- **What wins them:** The **power-and-WiFi-stated-upfront** promise is genuinely differentiated — HAMLET is the only player making it a structured listing field. Plus Mainland coverage (Yaba, Ikeja GRA) at sane prices, and predictable total cost for expense claims.
- **Note:** this segment is the **anti-seasonality solution**. Diaspora fills December; business travellers fill February–November, which is when occupancy falls off a cliff (Ikoyi 85% → 40%).
- **Channel:** LinkedIn, Instagram, YouTube search ("shortlet with inverter Yaba", "serviced apartment Ikeja GRA"), Google.

#### **D3 — The December Returnee & The Group Book** 🟢 *seasonal, high ADR*

- **Who:** The ~495,000 diaspora December arrivals plus their local hosts, and the **friend-group / family-overflow** book — weddings, funerals, detty-dec gatherings, house-hunting trips, 4–8 people splitting a 3-bed.
- **Their reality:** Booking from abroad, 3 months out, in a fraud-peak season, quoted in naira they don't hold. Groups need to split cost. December 2025 taught them that ₦700k/night is not a market rate — it's a ransom.
- **What wins them:** **USD/GBP quote with a disclosed 10% buffer** (no surprise FX), **pay only after confirmation** (no blind transfer from Houston), and the anti-gouging story. The **group-split maths** is a killer hook: a ₦300k/night 3-bed split six ways is **₦50,000 each** — cheaper than a solo mainland studio.
- **Product gap to flag:** HAMLET has **no split-payment feature** (Mushrooms Stays does). Until it ships, market the *group book* (one payer, stated max capacity) and be honest that splitting is off-platform between friends. Do not imply in-product split payments.
- **Channel:** Instagram, TikTok, YouTube, diaspora WhatsApp groups, targeted Meta ads geo-fenced to US/UK/Canada in **September–November** (the booking window — December is too late).

#### **D4 — The Relocation Tester / Remote Worker** 🟡 *emerging, high LTV*

- **Who:** Diaspora Nigerians considering moving back ("reverse japa"), remote workers testing Lagos for 2–8 weeks, and Nigerians relocating between cities who need a landing pad before signing a lease.
- **Their reality:** Needs a *month*, not a night. Judges the city on the flat: is the power real, is the WiFi real, is the neighbourhood what the photos implied. A bad 3-week stay ends a relocation.
- **What wins them:** Neighbourhood truth (HAMLET's `/lagos` guide is genuinely good content), stated power/WiFi, and the verification that the place matches the pictures. Long stays = high ADR + low turnover cost + **occupancy in the dead months**.
- **Channel:** YouTube long-form, Instagram, diaspora communities, remote-work/repatriation newsletters and podcasts.

---

## 4. Prioritisation matrix

| Segment | Reachability | Conversion likelihood | Revenue per conversion | Strategic value | **Phase** |
|---|---|---|---|---|---|
| **S2 Closing agents** | Very high (they're online, organised) | High (money-first offer, no inventory needed) | Indirect but multiplicative | **Force multiplier** | **1 — start here** |
| **S1 Squeezed hosts** | High | Medium-high (0% fee is a strong wedge) | High (each = inventory) | **Solves the binding constraint** | **1 — start here** |
| **S3 Diaspora landlord** | Medium (needs long-form trust content) | Medium (slow, high-consideration) | **Very high** (owns property, may list several) | High LTV + brand halo | **1 — from week 3** |
| **D1 Burned-once Nigerian** | Very high (culturally live topic) | **Blocked by 0 inventory** | Medium | Builds demand-side brand equity early | **2 — teaser only in 1** |
| **D2 Business/tech traveller** | Medium (search-driven) | Blocked by inventory | Medium-high, recurring | **Anti-seasonality** | **2** |
| **D3 December returnee/group** | High in Q4 | Blocked by inventory | High ADR | Seasonal revenue spike | **2 — must start Sept** |
| **D4 Relocation tester** | Medium | Blocked by inventory | High (long stays) | Fills dead months | **2** |

**The uncomfortable truth:** the audience with the *most* demand-side energy (D1, the burned-once Nigerian) is the one HAMLET can least afford to convert today. Phase 1 therefore uses D1 content **as brand-building that routes to the partner CTA**, not the booking CTA — see `04-SCRIPTS-DEMAND.md` for how to do that without lying.

---

## 5. Positioning statement

> **For Lagos hosts and booking agents who are tired of giving 15% to a platform that never inspected the flat,**
> **HAMLET is the verified shortlet marketplace that takes 0% from owners, pays agents a recorded 10%, and confirms every booking only after a human has checked the title, the ID, the mandate and the front door.**
> **Unlike Airbnb, Spleet or Muster, HAMLET publishes its verification state per listing — including when something is only self-reported — because in a market that just spent December 2025 being called out for ₦700,000 nights and catfish photos, honesty is the only differentiator left.**

**Supporting proof hierarchy (never claim above your evidence):**
1. `0% owner fee` — provable, in code, in the pricing contract ✅
2. `4-pillar verification with honest labelling` — provable, in the admin console ✅
3. `Server-verified payment; screenshots never confirm` — provable, webhook-signed ✅
4. `Deposits itemised, 0% markup, tracked to refund` — provable, state machine ✅
5. `Power & WiFi stated per listing` — provable, structured field ✅
6. `Mainland + Island, 16 neighbourhoods` — provable, filter set ✅
7. ~~`Great reviews`~~ — **cannot claim. Public ratings are disabled during pilot** ❌
8. ~~`Guaranteed occupancy`~~ — **cannot claim. Market is saturated at 38%** ❌
9. ~~`Live availability`~~ — **cannot claim. 0 listings** ❌

---

## 6. What the Nigerian local market actually needs (beyond the brief)

The brief said "put in mind the Nigerian local market and what it really needs." Beyond price and photos, the crawl + market data surface six needs HAMLET is unusually well-built to meet — and which should drive content:

1. **Predictability over luxury.** Hotels won December 2025 not on comfort but on *"fixed pricing, security, housekeeping, consistent power."* Sell the guarantee, not the granite countertop.
2. **Power as a stated fact, not a vibe.** Diesel costs have made this existential for hosts and non-negotiable for guests. Inverter vs generator vs 24/7 estate power is a first-class filter. **Content angle: "What does '24/7 light' actually mean?"**
3. **An accountable human.** The market runs on agents because people trust people. HAMLET's partner/agent roles + issue reporting from the booking record formalise this. **Do not market it as "no middlemen" — market it as "middlemen you can hold accountable."**
4. **A deposit that comes back.** The caution-deposit state machine is a genuine, demonstrable answer to a universal complaint.
5. **FX clarity for people earning abroad.** A disclosed 10% buffer beats an opaque card conversion. This is a diaspora-specific need almost nobody addresses on camera.
6. **Documentation for a formalising state.** The Banana Island ban and tax adjustments mean hosts increasingly need a paper trail. HAMLET's audit log is that trail.

---

## 7. Sources

**HAMLET primary (crawled 29 Oct 2026):** `hamlet.rest` `/`, `/stays`, `/how-it-works`, `/safety`, `/about`, `/partners/apply`, `/signin` · repository: `public/llms.txt`, `public/llms-full.txt`, `MVP_SPECIFICATION.md`, `README.md`, `docs/PRICING_AND_PAYMENT_CONTRACT.md`, `docs/PILOT_PRICING_IMPLEMENTATION.md`, `docs/DEPLOYMENT_AND_ROLLBACK.md`, `docs/DATABASE_RELEASE_CHECKLIST.md`, `docs/RELEASE_READINESS.md`, `src/lib/pricing.ts`.

**Market data:**
- AirDNA — *Lagos, Default short-term rental data (2026)*: 8,691 listings, 38% occupancy, $96 ADR, $35 RevPAR, $4.5K avg annual revenue
- Edala Homes — *Lagos Short-let Market 2024* (₦264.3bn, 5,806 listings); 2025 figure ₦281.03bn via Nairametrics / The Guardian Nigeria
- PropCommAfrica — *The 2026 Lagos Shortlet Reality Check* (₦285.5bn 2026 projection; Lekki Ph1 1,621 listings/₦253k ADR/63%; Banana Island 133/₦351k/65%; Dec-vs-Jan occupancy deltas; Airbtics listing growth)
- StreamlineFeed / Casafina — market squeeze, ~30% average monthly occupancy, 10-night break-even, top-10% at 70–80%
- Estate Intel — *Lagos Short-let Market* (+263% over 3 years; ~1,975 purpose-built units in pipeline ≈30% of stock)
- MO Africa Company Ltd via Forbes Africa / NIDCOM / ewohimi.com — Detty December 2024: ₦111.5bn total, ₦54bn hotels (15,000 bookings), ₦21bn shortlets (~6,000 bookings, ₦120k avg nightly), 1.2m Lagos visitors, ~495k diaspora of ~550k air arrivals, US 27% of international, agent-driven bookings & trust concerns
- Vanguard / The Frontier NG — *Detty December: Nigerians boycott shortlet apartments for hotels as booking prices skyrocket* (Dec 2025); Jennifer Ike & Leo DaSilva/Nina commentary
- Mushrooms.ng — Detty December pricing table (₦700k Lekki Ph1 peak); December fraud warning; group-split maths
- Nigeria Housing Market — hotels near capacity, Dec 2025, guest shift to predictable pricing/security/power
- Businessday — *Inside Nigeria's ₦281 Billion Short Let Market: Why Verification Is the Real Business* (competitor map; Banana Island ban; tax treatment); *How to turn $20 billion in diaspora remittances into Nigerian housing*
- Baay Realty — diaspora investment behaviour, shift to structured investment, co-ownership trend

**Note on data quality:** figures are drawn from industry reports and press coverage of varying rigour, and some (AirDNA vs Edala vs Airbtics) count listings differently. Treat absolute numbers as directional and **do not put contested statistics in ad copy** — use them for internal strategy only. Scripts in this pack avoid unverifiable claims; see `02-VIDEO-STRATEGY.md` §6.
