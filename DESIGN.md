---
name: HAMLET
description: Verified Lagos shortlets. Your stay, sorted.
colors:
  forest: "#172119"
  forest-deep: "#101a14"
  forest-raised: "#22302a"
  ivory: "#f6f1e7"
  surface: "#fffdf7"
  sand: "#ede9dc"
  line: "#d9ddcf"
  line-soft: "#e6e7dc"
  field-line: "#cdd3c3"
  muted: "#5b655a"
  lime: "#d9f24b"
  lime-ink: "#4c5916"
  coral: "#ff6948"
  coral-ink: "#c93d1c"
  blue: "#2e50e8"
  blue-deep: "#1938c0"
  ok: "#256b43"
  ok-soft: "#e1f0e5"
  warn: "#8a5a00"
  warn-soft: "#f8ecd0"
  bad: "#a8261c"
  bad-soft: "#f9e1dd"
  info: "#1938c0"
  info-soft: "#e4e9fd"
  night-page: "#0e1511"
  night-surface: "#161f1a"
  night-sand: "#1c2721"
  night-text: "#eef0e6"
  night-muted: "#a9b2a4"
typography:
  display:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "clamp(44px, 6vw, 88px)"
    fontWeight: 850
    lineHeight: 0.9
    letterSpacing: "-0.075em"
  headline:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "clamp(32px, 4vw, 48px)"
    fontWeight: 850
    lineHeight: 0.95
    letterSpacing: "-0.06em"
  accent:
    fontFamily: "Playfair Display Variable, Playfair Display, Georgia, serif"
    fontWeight: 500
    letterSpacing: "-0.045em"
  title:
    fontFamily: "Playfair Display Variable, Playfair Display, Georgia, serif"
    fontSize: "22px"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.7
  meta:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 800
    letterSpacing: "0.16em"
rounded:
  field: "10px"
  media: "10px"
  card: "14px"
  search: "16px"
  pill: "999px"
spacing:
  "1": "8px"
  "2": "16px"
  "3": "24px"
  "4": "32px"
  "6": "48px"
  "8": "64px"
  "12": "96px"
components:
  button-primary:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    padding: "0 22px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.blue-deep}"
  button-lime:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.forest}"
    rounded: "{rounded.pill}"
    height: "48px"
  button-ghost:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.forest}"
    rounded: "{rounded.pill}"
    height: "48px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.forest}"
    rounded: "{rounded.pill}"
    height: "44px"
  chip-on:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.ivory}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "24px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.forest}"
    rounded: "{rounded.field}"
    height: "48px"
  search-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.search}"
    height: "72px"
  band:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.ivory}"
---

# Design System: HAMLET

## Overview

**Creative North Star: "The Lagos Arrival Edit"**

HAMLET reads like an editorial about arriving somewhere real. Every page opens on a forest band: the title, its context and the tabs, set in heavy Inter with one soft Playfair phrase that carries the feeling. Below it, the work happens on ivory paper: real interiors, plain facts, one clear action. The pacing is a magazine's (numbered sections, captioned photographs, generous air), but the job is practical: a guest on a phone, on mobile data, should see a real place, its all-in price and the way to request it within seconds.

The system is quiet so the photographs and the one blue action can be loud. Lime and coral are bright notes used sparingly; navy, gold and stock illustration are retired. Motion marks arrival and confirms touch, never decorates.

The approved homepage and the HAMLET design guideline canvas are the source; `src/components/ui/hamlet-ui.css` (the `hm-` kit) is the implementation.

**Key Characteristics:**
- Dark opens, light works: forest band on top, ivory working area below.
- Two-voice headlines: a heavy Inter statement, then one Playfair phrase.
- Numbered editorial labels on public pages ("01 / Pick your pace"); plain labels in workspaces.
- Photography leads; captions sit on a dark gradient.
- One loud action per view, in blue.
- Mobile first: the hero, its action and the first listing fit the first screen.

## Colors

A forest ground with two bright notes and one action blue.

### Primary
- **Action Blue** (#2e50e8): the single primary action per view: "Find my stay", "Request to book", "Pay securely", "Save". Hover deepens to Deep Action Blue (#1938c0).

### Secondary
- **Arrival Lime** (#d9f24b): on dark only. Active tab, stamp, live dot, the lime CTA in a band, the selected chip on dark. Never text on light.
- **Lagos Coral** (#ff6948): the Playfair accent phrase on dark, the link underline. Coral Ink (#c93d1c) is its light-surface form, at 24px and above.

### Neutral
- **Forest** (#172119): bands, header, footer, primary text, the selected chip on light.
- **Ivory** (#f6f1e7): page background.
- **Surface** (#fffdf7): cards, inputs, the search card, tables.
- **Sand** (#ede9dc): search and filter strips, table heads, summary boxes.
- **Line** (#d9ddcf) and **Field Line** (#cdd3c3): every 1px border; fields use the stronger one.
- **Muted** (#5b655a): secondary text (5.4:1 on ivory).
- **Lime Ink** (#4c5916): section labels on light (7.5:1).
- **Status pairs:** OK, Warn, Bad and Info each come as an ink on a soft tint, always as a pill.
- **Night palette:** dark mode follows the device (manual override in the footer and menu). Page #0e1511, surface #161f1a, sand #1c2721, text #eef0e6, muted #a9b2a4; the label colour becomes lime, coral ink lightens to #ff7b5c, photos dim to 90%.

### Named Rules
**The One Blue Rule.** One blue button per view. A second action is ghost or a link; two blue buttons side by side is a bug.

**The Lime Stays Dark Rule.** Lime is a fill behind forest text or an accent on forest. Lime or coral text on ivory at body size is forbidden.

**The Retired Colours Rule.** The old navy (#0e1f3b) and gold (#c9a44a) never return, including in the logo, favicon, share artwork and footer.

## Typography

**Display Font:** Inter Variable (self-hosted Latin subset, with system-ui)
**Accent / Title Font:** Playfair Display Variable (self-hosted Latin subset, with Georgia)

**Character:** Heavy, tightly tracked Inter states the fact; a single Playfair phrase in coral says how it feels. Titles of real places (stay cards, booking cards, locations) are set in Playfair so they read as names, not UI.

### Hierarchy
- **Display** (850, clamp(44px, 6vw, 88px), 0.9): page and hero titles in the band. Homepage hero scales with the viewport height so the whole hero fits the first screen.
- **Headline** (850, clamp(32px, 4vw, 48px), 0.95): section headlines on ivory.
- **Accent** (Playfair 500): one phrase per headline, coral on dark, coral ink on light. Never more than one.
- **Title** (Playfair 500, 20–28px, 1.15): stay names, card titles, section titles inside pages.
- **Body** (400, 15px, 1.7): paragraphs, max 65–75ch.
- **Meta** (400, 13px, 1.6): secondary lines, captions, hints.
- **Label** (800, 11px, +0.16em, uppercase): numbered section labels and field captions. 11px is the floor for any text.

### Named Rules
**The One Serif Phrase Rule.** Each headline gets exactly one Playfair phrase. Two serif phrases in one heading dilute the voice.

**The 11px Floor Rule.** Nothing on any page is smaller than 11px. Form fields are 16px on phones so iOS never zooms.

## Layout

A 1240px container with 32px side margins (18px on phones); workspaces use the same width. Spacing follows an 8-point scale (8, 16, 24, 32, 48, 64, 96). Sections sit 96px apart on desktop and 64px on phones; tight sections use 48px / 32px.

Two templates cover every route. **Public:** forest header, a forest band (label, two-voice title, intro, optional photo pair and area ticker), an optional sand strip for search and filters, ivory content, forest footer. **Workspace:** the same header, a forest band with the title and pill tabs (active tab lime), then the working area.

Breakpoints: one row above 1024px, two rows from 761–1024px, a single column at 760px and below.

### Named Rules
**The First Screen Rule.** On a 390×844 phone and a 1366×768 laptop, the hero, its primary action and (on Stays) the first listing are visible without scrolling. Decorative band photos are skipped on phones and never downloaded.

**The Results First Rule.** On listing pages, results come before exploration (neighbourhood rails, guides).

## Elevation & Depth

Flat by default. Surfaces separate by tone (ivory, surface, sand, forest) and a 1px line, not by shadow. Only interactive cards lift on hover (`0 18px 40px -28px rgba(23,33,25,.45)`, a 3px rise), and only floating layers (menus, sheets, dialogs, the price popover) carry a soft shadow.

### Named Rules
**The Flat-At-Rest Rule.** No card has a shadow at rest. A shadow means "this floats" or "you are touching this".

## Shapes

Edges that agree: cards 14px, fields and photos 10px, the search card 16px, and every button, chip and tab a full pill. Arrow buttons are circles. Photos are clipped to their radius and captioned on a bottom gradient; the area ticker and full-width bands bleed edge to edge while their content stays in the container.

## Components

### Buttons
- **Shape:** full pill (999px), 48px tall (40px small).
- **Primary:** Action Blue with white text; the arrow icon slides 3px right on hover; the button rises 2px with a soft shadow; pressing scales to 0.98.
- **Lime:** forest text on lime, the primary action inside a band ("Find a stay", "Find a new stay", "Sign in").
- **Ghost:** surface fill and line border on light; transparent with a 36% ivory border on dark.
- **Link:** text with a coral underline that grows from 38% to full width on hover.

### Chips
- **Style:** pill, 44px touch height on phones, surface fill, line border.
- **State:** selected chips fill forest with ivory text on light, lime with forest text on dark. Rows of chips scroll sideways on phones without a visible scrollbar.

### Cards / Containers
- **Corner Style:** 14px.
- **Background:** surface on ivory; forest for the one trust panel ("Verified by HAMLET").
- **Shadow Strategy:** flat at rest (see Elevation).
- **Border:** 1px line.
- **Internal Padding:** 24px (18px on phones).

### Inputs / Fields
- **Style:** surface fill, 1px field line, 10px radius, 48px tall; labels sit above in small bold type; empty dates read "Add date".
- **Focus:** a lime ring.
- **Error:** message below in bad ink, field border #a8261c.

### Navigation
- **Header:** forest, the wordmark, text links, Horatio and Partner ghost pills, a lime Sign in pill. On phones a menu button opens a full-screen forest drawer.
- **Tabs:** pill tabs inside the band; the active tab is lime.
- **Footer:** forest, four columns (accordion on phones), the System / Light / Dark switch.

### Search card (signature)
One surface card with 16px radius and four fields (Destination, Check in, Check out, Guests) plus a blue button, 72px tall. On Stays it sits in a sand strip under the band, followed by corridor chips, Property type, Bedrooms, Price range and Sort. On phones it collapses to a single summary pill that opens the full form.

### Stay card (signature)
A 4:3 photo with a caps location tag on a dark pill, the title in Playfair, one meta line, then the all-in nightly price "fees included" (the 20% service fee is inside the price, never shown as an add-on), and a round arrow. The whole card is the link.

### Booking card (signature)
Price "/ night · fees included", dates, guests, an optional note, a sand breakdown (stay, cleaning, total, refundable caution deposit), one blue "Request to book" and "You won't be charged yet. The partner reviews your request first." On phones it opens as a bottom sheet from a sticky price bar.

### Area ticker and stamp (signature)
Lagos area names in Playfair scroll slowly across the band's foot and pause on hover; the lime "YOUR STAY" stamp sways at the photo's top right. Both keep moving, slower, under reduced motion; every other animation stops.

## Do's and Don'ts

### Do:
- **Do** open every page with the forest band and set the title as one heavy statement plus one Playfair phrase.
- **Do** use exactly one blue action per view and make it reachable on the first phone screen.
- **Do** show "fees included" next to every guest price and itemise the refundable caution deposit separately.
- **Do** keep text at 11px or larger, contrast at 4.5:1 (3:1 at 24px+), touch targets at 44px and form fields at 16px on phones.
- **Do** use real listing photos and real states; show an honest empty state when there is nothing yet.
- **Do** reveal sections once on scroll (rise 26px, fade, 700ms, 80ms grid stagger) and stop all of it under reduced motion except the ticker and stamp.

### Don't:
- **Don't** use navy (#0e1f3b), gold (#c9a44a), stock illustrations or icons as hero art.
- **Don't** put lime or coral text on ivory at body size.
- **Don't** add shadows to cards at rest or stack cards inside cards.
- **Don't** show placeholder homes, invented reviews, ratings or availability.
- **Don't** add buttons for features that do not exist yet (share, save, map) as decoration.
- **Don't** let a phone page bury its first listing or booking action below decorative content.
