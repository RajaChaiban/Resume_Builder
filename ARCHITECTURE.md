# Architecture

This document describes how **Resume_Enh** is structured: the data model at its
center, the two extraction paths that feed it, and the rendering layer that
reads from it.

---

## Design principles

1. **One source of truth.** Everything downstream — every visual, every score —
   reads from a single `CareerProfile` object. The parser, the Claude agent, and
   the renderers never invent their own shapes; they all produce or consume this
   one type.
2. **Local-first / privacy-first.** All file parsing and geocoding happen in the
   browser. There are no API calls and nothing is uploaded. The optional Claude
   path is explicitly user-driven (copy text out, paste JSON back in).
3. **Graceful degradation.** A heuristic extractor always works with zero
   dependencies on external services. Claude is an *upgrade*, never a
   requirement. Visuals (e.g. the starfield) are decoration and never gate the
   experience.
4. **Framework-agnostic core.** Everything in `src/lib/` is plain TypeScript with
   no React imports. Only `src/components/` and `src/App.tsx` know about React.

---

## High-level flow

```
                    ┌─────────────────────────────────────────────┐
   user file(s)     │                  src/lib                    │
  (PDF/DOCX/TXT) ──►│  parse.ts  ──►  raw text                    │
                    │                   │                          │
                    │     ┌─────────────┴──────────────┐           │
                    │     ▼                            ▼            │
                    │  extract.ts                 (copy text out)   │
                    │  (heuristic)                      │           │
                    │     │                       Claude Code +     │
                    │     │                       EXTRACT_PROMPT    │
                    │     │                             │           │
                    │     │                       profile.json      │
                    │     │                             │           │
                    │     │                    claudeProfile.ts     │
                    │     │                    (validate/normalize) │
                    │     └──────────────┬──────────────┘           │
                    │                    ▼                          │
                    │            CareerProfile  ◄── types.ts        │
                    │            (source of truth)                  │
                    └────────────────────┬─────────────────────────┘
                                         ▼
                              src/components + App.tsx
                       (globe · timeline · skills · narrative)
```

Supporting modules used along the way: `geocode.ts` (location → coordinates)
and `skills.ts` (skill detection + AI-alignment scoring). `sample.ts` provides a
fully-formed `CareerProfile` so the UI is alive before any upload.

---

## The data model (`src/lib/types.ts`)

`CareerProfile` is the contract every layer agrees on:

```ts
CareerProfile {
  name, title, tagline, summary
  email?, location?
  links:  { label, url }[]
  skills: { name, level (0..1), aiAligned }[]
  nodes:  CareerNode[]          // chronological, oldest -> newest
  aiEra:  { projectedRole, narrative, augmentations[] }
  source: 'heuristic' | 'claude' | 'sample'
}
```

Each `CareerNode` is one chapter of work:

```ts
CareerNode {
  id, employer, role
  start, end                    // human labels ("Jan 2019", "Present")
  startYear, endYear            // numeric; "Present" resolves to CURRENT_YEAR
  location?: GeoLocation        // { city, country?, lat, lng }
  summary?, highlights[], skills[]
  aiRelevance: number (0..1)    // how AI-aligned this chapter is
  era: 'pre-ai' | 'transition' | 'ai-era'
}
```

**Era classification** is centralized in `eraForYear()`:

| Year range   | Era          |
|--------------|--------------|
| `< 2017`     | `pre-ai`     |
| `2017–2022`  | `transition` |
| `>= 2023`    | `ai-era`     |

`CURRENT_YEAR` and `AI_ERA_YEAR` (both `2026`) are the constants the timeline
"bends toward."

The `source` field lets the UI signal provenance (sample vs. heuristic vs.
Claude-authored).

---

## Layer 1 — File parsing (`src/lib/parse.ts`)

Converts uploaded files to plain text, all in-browser:

- **PDF** — `pdfjs-dist`, page-by-page text extraction. The PDF worker is wired
  up via Vite's `?url` import so it bundles correctly.
- **DOCX** — `mammoth` browser build (`extractRawText`).
- **TXT / MD / RTF** — `TextDecoder`, with a last-resort binary-content check
  that throws a friendly "unsupported file type" error.

A **12 MB** size guard rejects oversized files. `filesToText()` reads and
concatenates multiple files (e.g. resume **+** cover letter) into one blob.

---

## Layer 2a — Heuristic extraction (`src/lib/extract.ts`)

The always-available, zero-network path. Raw text → `CareerProfile`:

1. **Identity** — finds a name (a 2–4 word capitalized line), an email (regex),
   and up to 4 links (LinkedIn/GitHub/other).
2. **Experience** — scans for **date ranges** (`DATE_RANGE_RE` handles
   `2019 - 2023`, `Jan 2019 – Present`, `2020 to 2022`, etc.). For each match it
   inspects a surrounding window of lines to guess role, employer, location, and
   highlight bullets.
3. **Skills** — `extractSkills()` matches against the curated vocabulary; the
   whole-document scan yields up to 12 skills with synthesized proficiency
   levels.
4. **AI relevance** — `aiScore()` counts AI keyword hits; each node's score is
   floored by its era.
5. **De-dupe + sort** — nodes keyed by `employer|startYear`, ordered oldest →
   newest.
6. **AI-era projection** — builds `projectedRole`, a narrative, and a list of
   "augmentations," weighted by how many AI-aligned skills were found.

Output is tagged `source: 'heuristic'`.

---

## Layer 2b — The Claude bridge (dev backend + `src/lib/claudeProfile.ts`)

The richer path, automated through a local dev backend:

1. The app extracts resume **text** and `POST`s it to `/api/claude`.
2. A Vite dev-server plugin (`claudeBridge` in `vite.config.ts`) loads
   `claude/EXTRACT_PROMPT.md`, pipes it plus the resume text into the **`claude`
   CLI** in headless print mode (`claude -p`, `shell: true` so the Windows `.cmd`
   shim runs), and captures stdout.
3. The plugin extracts the JSON object from the output (strips code fences, takes
   first `{` … last `}`) and returns it as `application/json`.
4. The frontend feeds that JSON to `parseClaudeProfile()`.

`parseClaudeProfile()` **validates and normalizes** the JSON defensively —
coercing types, clamping `level`/`aiRelevance` to `0..1`, resolving
`"Present"` → `CURRENT_YEAR`, geocoding string locations, assigning unique node
ids by index (the model occasionally emits duplicates), and sorting nodes — and
throws friendly errors on malformed input. Output is tagged `source: 'claude'`.

If the bridge is unreachable, the CLI is missing, or the JSON is malformed, the
frontend catches the failure and falls back to the heuristic `extractProfile()`.
Because every path emits the identical `CareerProfile`, the rendering layer is
completely agnostic to which one produced the data.

---

## Supporting modules

### Geocoding (`src/lib/geocode.ts`)
A fully **offline** geocoder so the globe needs no network. A baked-in table of
~60 major world cities (with aliases like `sf`, `nyc`, `bengaluru`) plus
country centroids as a fallback. `geocode()` resolves free text like
`"Austin, TX"`; `findCityInText()` scans a blob for the first recognizable city
with word-boundary matching (so `"la"` doesn't match inside `"platform"`).

### Skills + AI scoring (`src/lib/skills.ts`)
A curated `SKILL_VOCAB` split into AI-aligned (ML, LLMs, RAG, AI Agents…),
general tech (Python, React, AWS…), and transferable (Leadership, Strategy…)
skills, each with aliases. `extractSkills()` does boundary-aware matching;
`aiScore()` returns a `0..1` measure of how "AI-era" a passage reads. This is
what drives the "march into the AI era" weighting across the timeline and globe.

### Sample profile (`src/lib/sample.ts`)
A complete, hand-authored `CareerProfile` ("Ada Vega," `source: 'sample'`)
spanning all three eras, so the experience is populated and alive before any
upload.

---

## Layer 3 — UI components (`src/components/`)

Currently implemented, presentational pieces:

- **`Uploader.tsx`** — drag-and-drop + click-to-browse, accepts multiple files
  (`.pdf,.docx,.txt,.md,.rtf`), animated in with Framer Motion. Hands the file
  list up via an `onFiles` callback.
- **`Loader.tsx`** — a full-screen, multi-phase "the agent is thinking"
  sequence (Reading → Extracting → Geolocating → Scoring → Projecting →
  Rendering) that makes the transform feel intelligent. Also renders an error
  state.
- **`Starfield.tsx`** — a lightweight `<canvas>` particle field (violet/cyan
  twinkling stars) sized to the viewport. Pure decoration; degrades gracefully.

The rendering layer (the headline visualization):

- **`ProfileView.tsx`** — composes the header (name, title, tagline, summary,
  links, `source` badge) + globe + skills + AI-era panels + timeline.
- **`Globe.tsx`** — `react-globe.gl` / `three`. Renders **fully offline**: no
  Earth texture is fetched; the globe uses a dark emissive material plus an
  atmosphere. Each located `CareerNode` becomes a point colored by `era`, with
  animated arcs tracing the journey between consecutive roles. Auto-rotates and
  frames the most recent role.
- **`Timeline.tsx`** — chronological, era-colored cards (role, employer, dates,
  highlights, AI-relevance bar).
- **`SkillsPanel.tsx`** — proficiency bars; AI-aligned skills emphasized.
- **`AIEraPanel.tsx`** — projected role, narrative, and augmentations.

`App.tsx` owns the state machine (`idle` / `loading` / `ready`), shows
`SAMPLE_PROFILE` on first load, drives the `Loader` overlay during processing,
and surfaces parse/bridge errors in the loader before returning to idle.

---

## Status

The pipeline is wired end-to-end and verified: PDF, DOCX, and TXT uploads all
parse locally, run through the Claude bridge (with heuristic fallback), and
render on the globe + timeline. `npm run build` and `npm run lint` are clean.

### Out of scope (future)

- A bundled Earth texture for the globe (currently textureless by design).
- A production server for the Claude bridge (it's dev-only; production builds
  use the heuristic path).
- Multi-profile compare and profile export.

---

## Conventions

- **Core logic stays in `src/lib`** and stays React-free, so it's testable and
  reusable.
- **New data is added by extending `CareerProfile`**, never by passing ad-hoc
  props around — keep the single source of truth.
- **Era and "current year" logic lives only in `types.ts`** (`eraForYear`,
  `CURRENT_YEAR`). Don't hardcode year thresholds elsewhere.
- **Anything user-facing parses locally.** Preserve the privacy guarantee.
