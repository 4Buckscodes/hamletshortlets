---
name: HAMLET
description: Verified Lagos shortlets. Your stay, sorted.
colors:
  ink: "#0e1f3b"
  ink-deep: "#091528"
  paper: "#f4f3ef"
  surface: "#faf9f6"
  sand: "#eae8e1"
  line: "#dcd9d0"
  line-soft: "#e8e6df"
  field-line: "#8a867b"
  muted: "#5a6578"
  navy: "#0e1f3b"
  gold: "#b8923a"
  gold-ink: "#7a5c14"
  navy-deep: "#091528"
  on-ink-accent: "#d4b268"
  ok: "#256b43"
  ok-soft: "#e1eee4"
  warn: "#8a5a00"
  warn-soft: "#f4e9cf"
  bad: "#a8261c"
  bad-soft: "#f5e0dc"
  night-page: "#0b1322"
  night-surface: "#111b2e"
  night-sand: "#16223a"
  night-text: "#ece9e1"
  night-muted: "#a5aebf"
  night-gold: "#d4b268"
typography:
  display:
    fontFamily: "Newsreader Variable, Newsreader, Georgia, serif"
    fontSize: "clamp(44px, 6vw, 84px)"
    fontWeight: 420
    lineHeight: 0.98
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Newsreader Variable, Newsreader, Georgia, serif"
    fontSize: "clamp(30px, 3.6vw, 44px)"
    fontWeight: 420
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Newsreader Variable, Newsreader, Georgia, serif"
    fontSize: "22px"
    fontWeight: 480
    lineHeight: 1.2
  body:
    fontFamily: "Hanken Grotesk Variable, Hanken Grotesk, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.65
  meta:
    fontFamily: "Hanken Grotesk Variable, Hanken Grotesk, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Hanken Grotesk Variable, Hanken Grotesk, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    letterSpacing: "0.01em"
rounded:
  media: "4px"
  control: "6px"
  card: "6px"
spacing:
  section: "96px"
  section-mobile: "56px"
  gutter: "64px"
components:
  button-primary:
    backgroundColor: "{colors.navy}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
  button-ghost:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
---

# Design System: HAMLET

## Overview

A calm, residential, high-end platform for booking verified Lagos shortlets. Warm stone neutrals carry the page, thin hairlines organise it, and one deep midnight-navy accent with champagne gold as a small second voice marks every action. Nothing is decorated: no gradients, no shadows, no cards inside cards, no stamps, no numbered markers (except true steps), no all-caps labels, no arrows on buttons.

## Colors

- **Paper, surface, sand** form a flat warm-stone ground. Sections are separated by `line` hairlines, and `sand` marks the single quieter band (belief section, footer, page headers).
- **Lagoon** (`#0e1f3b`) is the only accent: primary buttons, links on hover, the wordmark full stop, verification marks. White text on it passes 8:1. In dark mode it lightens to `night-gold`.
- **Ink** is text and the rare dark panel (`ink-panel`), with `on-ink-accent` for accent text on that panel.
- Status colours (ok, warn, bad) appear only as status, always with a word.

## Typography

Newsreader (a text serif with real optical character) carries headlines and stay titles at regular weight, in one voice, with no italic or colour accent on a single word. Hanken Grotesk carries body and interface text at 16px with a 62ch measure. Labels are sentence case, 13px, semibold. Type scale: 13 / 14 / 16 / 18 / 22 / 26 / fluid 30-44 / fluid 44-84.

## Layout

Flat sections, 1240px shell, generous vertical rhythm. Lists use hairline-separated rows (bookings, places, promises); stays use a grid whose lead listing spans two columns. Search is one bar on laptops and one small pill that opens a sheet on phones.

## Elevation

None. Hierarchy comes from type, space and hairlines. Overlays (drawers, sheets) are the only layered surfaces.

## Motion

Motion library handles hover and press on buttons, links, chips and photos (200 to 400ms, small distances, `MotionConfig reducedMotion="user"`). GSAP ScrollTrigger drives the one scroll motion: a short fade-and-rise for content below the fold, batched, and a 6% hero parallax on wide screens. Everything stops under `prefers-reduced-motion`, including the area ticker.

## Do's and Don'ts

- Do keep one accent, hairlines and plain sentence-case labels.
- Do show verification and "nothing to pay until accepted" where a guest hesitates.
- Don't add gradients, shadows, nested cards, pulsing dots or looping motion.
- Don't number sections unless the content is a sequence.
