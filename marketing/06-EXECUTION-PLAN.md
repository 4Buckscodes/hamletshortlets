# 06 — Execution Plan

**Start date:** 29 October 2026
**Horizon:** 90 days to 27 January 2027, then a seasonal view to December 2027

---

## 1. The timing problem nobody will tell you

**The December 2026 diaspora booking window has already closed.**

The diaspora books **September–November** for a December arrival. It is 29 October. The flights are bought, the flats are held, and the group chats have settled. Anyone telling you to "launch for Detty December" today is selling you a campaign that will arrive after the decision.

This is bad news for one thing only, and it is excellent news for everything else:

| | Reality | Consequence |
|---|---|---|
| **Dec 2026 demand** | Window closed | **Do not spend on diaspora guest acquisition for Dec 2026.** Zero inventory anyway. Skip it without regret |
| **Jan–Aug 2027** | The occupancy desert. Ikoyi 85%→40%, VI 80%→35%, Lekki Ph1 87%→39% into January | **This is HAMLET's best possible launch window.** Hosts are at their most desperate, agents have idle audiences, and long-stay/business demand (DI-3, D2-B) is exactly what fills these months |
| **Sept 2027** | Dec 2027 window opens | **The real deadline.** Everything in the next 10 months exists to be ready for this |

> **Reframe:** HAMLET is not late for Detty December 2026. HAMLET has ten months to be unavoidable for Detty December 2027 — and an entire low season in which to recruit the hosts and agents who will need it. **The low season is the moat.**

---

## 2. The gate — nothing downstream runs until this is true

**GATE A · Supply (Phase 1 → Phase 2 transition)**

All five must hold:

- [ ] **≥ 15 properties** at status `approved` in `public.properties`
- [ ] **≥ 3 distinct areas** represented, **including ≥ 2 Mainland** (Yaba / Surulere / Ikeja GRA / Shomolu-Gbagada)
- [ ] Every approved listing has **real photography** (no stock, no sample interiors) and a **recorded physical-inspection outcome**
- [ ] Every approved listing has **power, WiFi and max-guest** fields populated
- [ ] **Live payments verified end-to-end** — `PAYSTACK_SECRET_KEY` configured, webhook registered and HMAC-verified, one real test booking taken through `requested → awaiting_payment → confirmed → completed`

Until Gate A: **all video CTA routes to `/partners/apply`, `/safety`, `/how-it-works` or a waitlist. Never to `/stays`.**

**GATE B · Commercial (blocks any price claim in paid media)**

- [ ] Owner decision recorded on the **20% markup** — final, or pilot rate (`00` §4 Decision 1)
- [ ] `MVP_SPECIFICATION.md` §3 reconciled to `v2_20pct_markup_10pct_fx_buffer` (kill the dead "3%" prose)
- [ ] Pricing-claims register live and current (§7 below)
- [ ] Legal review of the fee-disclosure scripts (`S1-C`, `DI-4` ch. 5)

**GATE C · Demand amplification (blocks paid guest ads)**

- [ ] Gate A passed **and** ≥ 40 approved properties
- [ ] ≥ 20 completed bookings with reconciled ledger rows
- [ ] Comment sentiment on `S1-C` reviewed for 72h with no unresolved fee controversy
- [ ] Issue-resolution route tested with a real reported issue

---

## 3. The 90-day sequence

### **Weeks 1–2 · Foundation (29 Oct – 11 Nov)**

| # | Action | Owner | Output |
|---|---|---|---|
| 1 | **Owner decisions** on `00` §4 — all five. Especially the markup | Owner | Signed decision memo |
| 2 | Reconcile `MVP_SPECIFICATION.md` to `v2` pricing | Eng | PR |
| 3 | **Build the screen-capture unit** — seeded demo env with clearly-labelled test data, OBS/CapCut template, gold-on-navy caption preset | Eng + Design | Reusable proof asset (used in 11 of 16 scripts) |
| 4 | Cast the **lead face** and the **real agent** for S2-B | Marketing | 2 signed people |
| 5 | Recruit **3–5 partner properties** willing to be filmed under review | Ops | Inspection shoot access |
| 6 | Pidgin **language QA reviewer** retained (30 min/script) | Marketing | Named reviewer |
| 7 | Stand up the **pricing-claims register** (§7) | Marketing | Live doc |

> **Do not shoot anything in week 1.** Decisions 1 and 4 change what gets shot.

### **Weeks 3–6 · Supply engine (12 Nov – 9 Dec)**

Shoot and publish, in this order:

| Order | Script | Tier | Why this order |
|---|---|---|---|
| 1 | **DI-4** — YouTube long-form | T2 | Evergreen, **needs no inventory**, produces 8 clips, establishes category authority first |
| 2 | **S2-A** — "You Already Have The Clients" | T0 | Cheapest, highest-leverage. Agents recruit hosts |
| 3 | **S1-A** — "You Keep All Of It" | T1 | The 0% wedge, once agents are primed to amplify it |
| 4 | **S3-A** — "Somebody Walked Inside Your House" | T2 | Real inspection footage shot alongside #3 |
| 5 | **DI-2** — "The Empty Flat In Magodo" | T1 | 45s cut of #4 — near-zero marginal cost |
| 6 | **S1-B** — "Your Generator Ate Your Profit" | T1 | Host pain, low-season timing is perfect |
| 7 | **S2-B** — "Stop Being The Middleman" | T1 | Requires the real agent cast in week 1 |
| 8 | **S1-C** — "Where Your Guest's Money Goes" | T1 | **Gate B must be closed first.** Publish, then staff comments for 72h |

**Simultaneously:** direct outbound. Video alone will not produce 15 approved properties. Pair every asset with:
- DM outreach to 50 Lagos booking-agent Instagram accounts (S2)
- 3 host-community WhatsApp groups (S1)
- 2 Nigerian-diaspora podcast pre-roll buys (DI-2, DI-4)
- In-person presence at 2 Lagos realtor/agent meetups

### **Weeks 7–10 · The low-season demand build (10 Dec – 6 Jan)**

Gate A likely still open. Build demand-side equity **without** sending anyone to an empty marketplace:

| Script | Mode |
|---|---|
| **D1-A** "The Catfish Flat" | **PRE-GATE SAFE** — brand + waitlist |
| **D1-B** "'24/7 Light'" | **PRE-GATE SAFE** — brand + `/safety` |
| **D3-A** "Never Send The Transfer" | **PRE-GATE SAFE** — evergreen safety asset |
| **D2-A** "Yaba, Sorted" Ep.1 | Filter-UI only, no bookable card |

Launch the **waitlist**. Collect area + dates + budget. This is also your first demand-side data — it tells you which neighbourhoods to recruit supply into. **Recruit hosts to match waitlist demand, not the other way round.**

### **Weeks 11–13 · Gate A push and Phase 2 open (7 Jan – 27 Jan)**

- Hard push to Gate A (target 15 approved)
- Once passed: **D2-B** "The 6am Call" (LinkedIn, business travel — the January audience is corporate, not holiday)
- **DI-3** "Testing Lagos For A Month" (YouTube — January is *peak* relocation-decision month; New Year, new country)
- **D2-A** Episodes 2–4 (Surulere, Ikeja GRA, Shomolu/Gbagada)
- First booking requests. Measure ruthlessly.

### **Held for Sept 2027 (do not run early)**
- **D3-B** "Six Of Us, One Flat"
- **DI-1** "Booking From Houston" — paid geo-fenced US/UK/CA, **1 Oct – 20 Nov 2027**

---

## 4. Budget — three tiers

### Tier 1 · Bootstrap — **≈ ₦700,000 / 90 days**

| Item | Cost |
|---|---|
| Lapel mic (Rode Wireless ME or equivalent) | ₦95,000 |
| Phone tripod + small LED panel | ₦45,000 |
| CapCut Pro + Canva Pro (quarter) | ₦30,000 |
| Screen-capture unit (DIY, existing hardware) | ₦0 |
| **5 × T0 phone scripts** (founder-shot, in-house edit) | ₦0 |
| **2 × T1 creator scripts** (S1-A, S2-B) @ ₦150k | ₦300,000 |
| **1 × T2** — DI-4 only, minimal crew @ ₦200k | ₦200,000 |
| Pidgin QA reviewer (8 scripts × ₦5k) | ₦40,000 |
| **Paid media** | **₦0** |
| **Total** | **₦710,000** |

**Realistic output:** 8 assets + 8 clips from DI-4. Enough to run Phase 1 credibly. **Skip S3-A** — DI-2 covers the diaspora landlord at T1.

### Tier 2 · Standard — **≈ ₦4,200,000 / 90 days** *(recommended)*

| Item | Cost |
|---|---|
| Everything in Bootstrap | ₦710,000 |
| **DI-4** upgraded to full T2 (2-person crew, grade, sound) | +₦600,000 |
| **S3-A** T2 verification documentary | ₦650,000 |
| **6 × T1 creator scripts** @ ₦175k avg | ₦1,050,000 |
| 2 micro-creator retainers (10k–80k followers) @ ₦150k/mo × 3 | ₦900,000 |
| Freelance editor retainer | ₦300,000 |
| **Total** | **≈ ₦4,210,000** |
| **Paid media** | **₦0 in Phase 1** — deliberate. Organic and agent-forwarded first |

**Output:** all 16 scripts + 8 clips. **This is the right spend level for a pre-inventory platform.**

### Tier 3 · Funded — **≈ ₦11,500,000 / 90 days**

Standard (₦4.2m) plus:
- Inspection-team filming kit + a dedicated ops videographer: ₦1.2m
- 4 Nigerian-diaspora podcast sponsorships (US/UK): ₦2.4m
- Agent-community seeding programme (paid placements with 10 agent accounts): ₦1.5m
- Paid social test budget, **agent-recruitment only** (never guest-facing pre-gate): ₦1.5m
- Field marketing: 4 Lagos agent/host meetups: ₦700k

---

## 5. Shooting calendar (Tier 2)

| Week | Shoot | Assets produced |
|---|---|---|
| 3 | **DI-4** (2 days: studio + screen-capture) | 1 long-form + 8 clips |
| 3 | **S2-A** (half day, phone, outdoors) | 1 |
| 4 | **Real inspection day** — crew follows the inspector to 2 properties | Footage bank for **S3-A, DI-2, S1-A, S1-B, D1-A** |
| 4 | **S3-A** (edit from inspection footage + owner video call) | 1 (+1 IG cut) |
| 5 | **S1-A + S1-B** (1 day, host's flat, real host) | 2 |
| 5 | **DI-2** (re-cut from S3-A footage) | 1 |
| 6 | **S2-B** (real agent, half day) | 1 |
| 7 | **S1-C** (studio + screen-capture) | 1 |
| 8 | **D1-A + D1-B** (1 day, set + real street) | 2 |
| 9 | **D3-A** (half day + screen-capture) | 1 |
| 10 | **D2-A** Ep.1 Yaba (1 day, real street footage) | 1 |
| 12 | **D2-B** (set + screen-capture) | 1 |
| 13 | **DI-3** (1 day, 3 neighbourhoods) | 1 |
| *Held* | **D3-B, DI-1** | *Sept 2027* |

**Efficiency rule:** the week-4 inspection day is the **single highest-value shoot** in the plan. One day of following a real inspector produces footage for five scripts. **Never stage it and never shoot it twice if you can shoot it once properly.**

---

## 6. KPI tree

```
NORTH STAR (Phase 1):  Approved, bookable, verified properties
                              │
        ┌─────────────────────┼──────────────────────┐
   Agent network          Host applications      Diaspora landlords
        │                     │                      │
  · Link taps to         · Completed partner     · YouTube watch time
    /partners/apply        applications            on DI-4 (ch.3, ch.6)
  · Agent signups        · Cost per approved     · LinkedIn CTR on DI-2
  · Shares/forwards        listing  ← KEY        · Podcast code redemptions
    per 1k views         · Application →
                           approval rate
                              │
                    ─── GATE A (15 approved) ───
                              │
NORTH STAR (Phase 2):  Completed bookings, reconciled
                              │
        ┌─────────────────────┼──────────────────────┐
   Domestic business       Burned-once            Dec 2027 diaspora
   (D2, fills low season)  (D1, brand volume)     (D3, from Sept 2027)
        │                     │                      │
  · /stays link taps      · Share rate           · Paid ROAS (Oct–Nov 27)
  · Booking requests      · Waitlist signups     · $ / £ quote usage
  · Avg nights per        · Comment sentiment    · Bookings placed from
    booking (target ≥3)   · "24/7 light" line      US/UK/CA origin
                            being quoted back
```

### Reporting cadence

| Frequency | Metric |
|---|---|
| **Daily (first 72h post-publish)** | Comment sentiment, hostile-question log, share count |
| **Weekly** | Link taps by destination, waitlist signups, agent signups, partner applications |
| **Weekly (ops)** | **Properties approved**, application→approval conversion, **cost per approved listing** |
| **Monthly** | Watch-through at 3s and 100%, shares per 1k views, KPI tree rollup |
| **Gate reviews** | Gate A / B / C checklists — pass/fail, in writing |

### The three numbers that matter most

1. **Cost per approved listing** — the efficiency of the entire supply engine. If this is high, nothing else matters.
2. **Shares per 1,000 views** — proves WhatsApp-native distribution is actually working. Nigerian campaigns fail here silently: good view counts, no forwarding, no bookings.
3. **Comment sentiment on the fee** — the early-warning system for the 20% risk. Read every comment on `S1-C` and `DI-4` ch.5 for 72 hours.

### What is *not* a KPI
Views, likes, follower growth, impressions. In a market where the decision is finished in a WhatsApp group, reach metrics will flatter a campaign that is converting nothing.

---

## 7. Pricing-claims register (mandatory)

Every published asset makes pricing claims. The live rate can change (`00` §4 Decision 1). **One register, one owner, checked before every publish.**

| Claim | Exact approved wording | Source of truth | Used in | Status |
|---|---|---|---|---|
| Owner fee | "0% owner fee. You keep 100% of the rate you set." | `src/lib/pricing.ts` → `OWNER_HAMLET_FEE_RATE = 0` | S1-A, S1-B, S1-C, S3-A, DI-2 | ✅ |
| Domestic markup | "The guest pays 20% on top of the owner's rate." | `HAMLET_DOMESTIC_MARKUP_RATE = 0.20` | S1-C, DI-4 | ✅ |
| Markup allocation | "Agent 10% · referrer 2.5% (90 days) · payment reserve 2.5% · HAMLET 5% or 7.5%" | `docs/PRICING_AND_PAYMENT_CONTRACT.md` §1 | S1-C, S2-A, DI-4 | ✅ |
| FX buffer | "A single 10% international currency buffer on $ and £ quotes. It settles in NGN." | `INTERNATIONAL_CURRENCY_BUFFER_RATE = 0.10` | DI-1, D3-B, DI-4 | ✅ |
| Caution deposit | "Itemised separately. 0% markup, 0% FX buffer. Refunded **after** post-checkout inspection." | `booking_caution_deposits` state machine | S1-C, S3-A, DI-1, DI-3, DI-4 | ✅ |
| Payment confirmation | "Confirmed only by a signed server-side Paystack webhook. A screenshot never confirms." | `paystack-webhook` (HMAC-SHA512) | D3-A, DI-1, DI-4 | ✅ |
| Request stage | "Nothing is charged when you request." | `POST /api/booking-requests` | D2-B, D3-A, DI-1, DI-4 | ✅ |
| Hold window | "48 hours to pay once the host confirms." | `transition_booking` / `payment_deadline` | All booking scripts | ✅ |
| Verification | "Four pillars, each labelled verified / self-reported / pending / missing." | `/safety`, `review_partner_property` | S1-A, S2-B, S3-A, DI-2, DI-4 | ✅ |
| Photos | "Stock and sample photos are rejected at review." | Physical-inspection pillar | D1-A, S3-A, DI-4 | ✅ |
| Power | "Stated per listing: inverter, generator, or 24/7 estate power." | Listing field | D1-B, D2-A, D2-B, DI-3, DI-4 | ✅ |
| Access codes | "Gate pins and door codes unlock only after confirmation." | `/safety` | D3-A, DI-1 | ✅ |
| Split payments | ❌ **DOES NOT EXIST.** Say: "One payer books for the group, up to the stated maximum capacity." | — | D3-B | 🚫 |
| Escrow | ❌ **WRONG TERM.** Say "server-verified Paystack settlement." | — | — | 🚫 |
| Star ratings / reviews | ❌ **DISABLED IN PILOT.** Say "private post-stay feedback, reviewed by our operations team." | `MVP_SPECIFICATION.md` §3 | — | 🚫 |
| "3% service fee" | ❌ **DEAD PROSE.** Remove from `MVP_SPECIFICATION.md`. | `docs/PRICING_AND_PAYMENT_CONTRACT.md` §1 | — | 🚫 |
| Cheaper than Airbnb | ❌ **FALSE on the guest side** (20% vs ~14%). | See `03` pricing reality check | — | 🚫 |
| Guaranteed occupancy | ❌ **UNPROVABLE.** Market at 38%. | — | — | 🚫 |
| Live availability | ❌ **0 LISTINGS.** Gate A first. | `/stays` | — | 🚫 |

**Rule:** if a claim is not in this table with a ✅, it does not go in a video, a caption, a comment, or an ad.

---

## 8. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **20% markup triggers a public price backlash** in comments | High | **Severe** — repeats the Dec 2025 dynamic against HAMLET | Gate B before `S1-C`; staff comments 72h; consider a pilot rate (`00` §4); publish the allocation proactively rather than defensively |
| **Guest video drives traffic to "0 stays"** | High if ungated | Severe — permanent brand wound | Gate A is absolute. Pre-gate CTAs only to `/safety`, `/how-it-works`, `/partners/apply`, waitlist |
| **Cannot secure a real property to film** | Medium | High — S3-A, DI-2, S1-A all depend on it | Film the *process* at properties under review; obtain owner consent; never stage an inspection |
| **No real agent will appear on camera** | Medium | Medium — S2-B unshootable | Fall back to S2-A (T0, no real agent needed). Do not cast an actor |
| **Pidgin reads as inauthentic / caricature** | Medium | Medium — kills credibility with the core audience | Mandatory native-speaker QA pass (§ production workflow, `02` §7) |
| **A fraudulent partner passes verification** | Low | **Severe** — the entire brand is verification | Do not claim fraud-proof. Claim the *mechanism*. Public incident-response commitment; the audit log exists for this |
| **Lagos State regulatory change** (Banana Island ban, tax treatment) | Medium | Medium | Frame as "documentation-ready," never as compliance advice. Legal review before any regulatory claim |
| **Competitor copies the 0% fee** | Low | Medium — the wedge narrows | The 0% fee is only copyable at a P&L cost. Move fast; compound the agent network, which is the harder-to-copy asset |
| **Video spend with no booking revenue for 90 days** | Certain | Medium — internal patience | Set expectations now: Phase 1 KPI is **approved listings**, not bookings. Pre-agree the Gate A number with the owner |

---

## 9. Immediate next actions (this week)

1. **Owner decisions** — all five in `00-CRITIQUE-AND-REFRAME.md` §4. Nothing shoots without #1 (markup) and #4 (real vs sample properties).
2. **Reconcile `MVP_SPECIFICATION.md`** — delete the dead "3% service fee" prose. One-line fix, removes a real misrepresentation risk.
3. **Approve Gate A's number** — is it 15, or is the original 50 still the target? **Recommend 15 concentrated** over 50 spread across 16 neighbourhoods.
4. **Build the screen-capture unit** — the demo environment and caption template. It appears in 11 of 16 scripts.
5. **Cast the lead face** and start outreach for the **real closing agent**.
6. **Schedule the week-4 inspection shoot** — one day, five scripts' worth of footage.
7. **Open the pricing-claims register** (§7) and assign an owner.

---

## 10. Summary

> **Sell verification to hosts at 0%. Turn agents into a paid distribution army at 10%. Answer the 20% question on camera before anyone asks it. Use the low season to build what Detty December 2027 will need. And do not send a single guest to an empty marketplace.**
