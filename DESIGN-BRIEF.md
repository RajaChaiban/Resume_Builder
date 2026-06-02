# Design Brief — Resume → Future

> **How to use this file.** Paste the **§0 Ready-to-paste prompt** into `/design`,
> claude.ai (artifacts), or your Figma AI flow to generate improved mockups.
> The rest of the document (§1–§9) is the supporting context the design tool
> should honor. **Generating from this brief changes _no_ frontend code** — it
> produces mockups/specs you review, then port deliberately.

---

## §0 — Ready-to-paste prompt

You are a senior product designer specializing in premium, dark-themed fintech
and data-visualization products (Bloomberg-meets-Stripe). Redesign and elevate
the screens of **"Resume → Future"**, a web app that turns a plain résumé PDF
into an animated, AI-era career visualization (a 3D globe / US map of where the
person worked, plus capability bars and a forward-looking "Specialization"
projection).

Keep the existing **dark aesthetic, brand palette, and design tokens** (see
§3) — do not introduce a new color system. Improve **visual hierarchy, depth,
spacing rhythm, motion choreography, information density, responsive behavior,
and the loading/empty/error states**. Deliver high-fidelity mockups for each
surface in §4 at **desktop (1280px)** and **mobile (390px)**, plus a short
rationale per screen citing which principle you applied. Respect the
**constraints in §6** (offline, dark, accessibility AA, preserve all
functionality). Do **not** redesign the data — only the presentation.

---

## §1 — Product context

- **What it is:** Upload a résumé (PDF/DOCX/TXT) → it's parsed locally and
  rendered as a "journey into the AI era": a geographic visualization of every
  role, capability bars, a future-role projection, and a chronological timeline.
- **Emotional goal:** make an ordinary résumé feel like a premium, forward-
  looking product — "this person is keeping pace with the AI era."
- **Audience:** the candidate showing it off, and recruiters/hiring managers
  viewing it. Must read as credible and polished, not gimmicky.
- **Tech (for feasibility, not for the mockups):** React 19 + Vite, framer-motion,
  react-globe.gl / three.js (3D globe), d3-geo (flat US map), fully offline.

## §2 — Aesthetic direction

**Bloomberg-meets-Stripe, dark.** Marketing surfaces (hero, upload) are
generous and gradient-rich; data surfaces (globe, capabilities, timeline) are
dense and information-first. Both share one token system. Depth comes from
**layered near-invisible shadows + thin borders + inset highlights**, never one
chunky drop shadow. Accent color is **signal, not decoration** (interaction
states and "worked here" highlights only).

## §3 — Design tokens (current — keep these)

```
Color
  --era-pre   #64748b   (slate)      // earliest career chapters
  --era-trans #38bdf8   (sky)        // transition era
  --era-ai    #a855f7   (purple)     // AI era
  --violet    #6d5dfc   (primary accent)
  --cyan      #22d3ee   (secondary accent / links)
  --pink      #ff7ae0   (highlight gradient end)
  --ink       #e7e9f3   (primary text)
  --ink-dim   #9aa0c0   (secondary text)
  --surface   rgba(18,20,40,0.62)    // panel glass
  --surface-2 rgba(28,30,58,0.50)    // card glass
  --line      rgba(140,130,255,0.18) // hairline border
  --line-hi   rgba(140,130,255,0.34) // hover/active border
  page bg     radial gradient #1a1740 → #0a0b1e → #06060f over a starfield

Type
  Sans/headings: system-ui, "Segoe UI", Roboto
  Mono (numerics, eyebrows, dates): ui-monospace, Consolas
  Hero display: clamp(2.6rem, 6vw, 4.4rem), weight 800, letter-spacing -2px,
                gradient fill #fff → #c7c2ff → #7ee7ff

Shape & motion
  radius: cards 14–20px, pills 999px
  easing: cubic-bezier(0.4, 0, 0.2, 1), 180–350ms
  signature motions: gradient-mesh orbs (slow), live-pulse dot, diagonal shine
                     sweep on hover, traveling glint on AI-aligned bars
```

## §4 — Surfaces to redesign (current state → objective)

1. **Hero / upload** — *Current:* "RESUME → FUTURE" gradient headline, eyebrow
   pill with pulsing dot, gradient-mesh orbs, dashed dropzone with shine-on-
   hover. *Objective:* already strong; push the dropzone to feel more like a
   premium "drop target" (clearer affordance, supported-file chips, drag-active
   state), and tighten vertical rhythm between headline → subtitle → dropzone.

2. **Profile header** — *Current:* monogram avatar (initials, gradient ring),
   source badge ("Enhanced by Claude"), gradient name, title, italic tagline,
   summary, contact links. *Objective:* strengthen it as a "hero card" — consider
   a contained header card vs. loose centered text; better contact-link
   treatment (icon chips); clearer separation from the panels below.

3. **Specialization panel (top)** — *Current:* eyebrow title, gradient role line,
   narrative paragraph, 2-column ✦ augmentation list. *Objective:* make the
   projected role feel like the headline payoff; consider a subtle "future"
   visual motif; balance the 2-col list typographically.

4. **Globe / US map (centered, max-width ~820px)** — *Current:* dark emissive
   sphere with country polygons, "worked" countries highlighted, era-colored
   points + animated journey arcs, click a country/dot → description card.
   *Objective:* the viewport has dead space around the sphere — give it presence
   (framing, a faint coordinate/grid motif, legend for the dot colors, a hint
   that it's draggable/zoomable). The flat US map should feel like a sibling, not
   a downgrade. Design the **selection card** (role title, employer · city ·
   dates, summary, highlights) as a polished, consistent component for both.

5. **Capabilities panel (under the globe)** — *Current:* 2-column skill bars,
   gradient fills, AI-aligned bars have a traveling glint, percentages in mono.
   *Objective:* improve scan-ability with 12–14 skills — consider grouping or a
   category rail; refine the bar/label/percentage rhythm; keep tabular-nums.

6. **Trajectory timeline** — *Current:* horizontally-scrolling cards, colored top
   accent per chapter, dates (mono) → role → employer · city → up-to-3 highlights
   → a thin AI-relevance bar. *Objective:* make the horizontal scroll feel
   intentional (edge fade, scroll affordance, snap), strengthen the chapter
   accent, and clarify what the bottom bar means (or restyle it as a clean
   "AI-relevance" meter with a tiny label).

7. **Loading / empty / error states** — *Current:* a multi-step loader
   ("Reading your history → Extracting roles → Geolocating → Scoring → Projecting
   → Rendering"). *Objective:* design these as first-class premium states
   (skeletons matching real layout, a graceful error line that names the cause +
   suggests an action, an inviting empty/idle state).

## §5 — Cross-cutting improvement themes

- **Depth:** every elevated surface = thin border + inset top highlight + a tight
  contact shadow + a wide accent-tinted ambient shadow. No flat panels.
- **Hierarchy:** three text rungs (ink / ink-dim / muted). One focal element per
  surface. Don't let everything compete.
- **Rhythm:** consistent vertical spacing scale; align the centered stack
  (specialization → globe → capabilities) to one max-width so edges line up.
- **Motion:** micro and easing-driven; hover = lift + shadow tighten, never just
  a color change. Reuse the existing shine/pulse/glint vocabulary.
- **Density (data surfaces):** monospace tabular numerics, compact rows, state as
  pills not buttons, bordered rows not zebra striping.
- **Responsive:** graceful collapse to single column < 920px; the narrowed cards
  must still look premium (drop decoration, not the card).

## §6 — Constraints (must honor)

- **Dark theme only** (a light variant is out of scope unless explicitly added).
- **Offline:** no external fonts, images, or texture fetches — system fonts and
  CSS gradients only.
- **Preserve all functionality:** globe/map interactivity, click-to-select cards,
  capability data, timeline, upload flow.
- **Accessibility:** WCAG AA contrast on text; visible focus states; the globe
  needs a non-visual fallback (the timeline already lists everything).
- **Keep the token system** — extend it if needed, don't replace it.
- **Don't redesign the data model or copy** — presentation only.

## §7 — Deliverables expected from the design tool

- High-fidelity mockup of each §4 surface at **1280px** and **390px**.
- A one-screen "design system" board: tokens, the card component, the pill, the
  skill bar, the selection card, button/link states.
- For each screen, 2–4 bullets of rationale ("added X per depth principle").
- Optional: a redlined spacing/typography spec for the trickiest surface (the
  globe viewport + selection card).

## §8 — Explicit non-goals

- No new color palette, no light mode, no marketing illustrations/photos.
- No new features or data — visual/interaction polish only.
- No framework/library swap.

## §9 — How to apply the results safely (after mockups are approved)

1. Review mockups against this brief (use `/design-qa` for an accessibility +
   consistency pass).
2. Have Claude Code implement approved screens **on a branch or git worktree**,
   reusing existing tokens/class names so nothing else shifts.
3. Verify each change live with Chrome DevTools (screenshot diff) before merging.
4. Keep `main` / the running dev server untouched until you approve the diff.
