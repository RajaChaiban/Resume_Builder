# Design: Wire the Resume_Enh pipeline end-to-end

**Date:** 2026-06-01
**Status:** Approved

## Goal

Make the app functional end-to-end: accept resume files (PDF/DOCX/TXT/MD/RTF),
run them through Claude Code via a local dev backend, and render the resulting
`CareerProfile` on an interactive globe + timeline. The heuristic extractor is
the offline fallback when the Claude bridge is unavailable.

## Decisions

- **Claude integration:** local dev backend. A Vite dev-server middleware
  (`POST /api/claude`) shells out to the `claude` CLI in headless print mode.
  Keeps the API key server-side; resume text stays on the machine.
- **Visualization:** full globe + timeline using `react-globe.gl` / `three`,
  plus skills and AI-era narrative panels.

## Components

### Backend — Vite middleware (`vite.config.ts`)
- Registers `POST /api/claude`. Reads `{ text }`.
- Loads `claude/EXTRACT_PROMPT.md`, combines it with the resume text, and pipes
  it to `claude -p` via stdin (`shell: true` on Windows so the `.cmd` shim runs).
- Extracts the JSON object from Claude's stdout (strips ``` fences, takes first
  `{` … last `}`), returns it as `application/json`.
- On any failure (spawn ENOENT, non-zero exit, bad JSON) returns HTTP 500 with
  `{ error }` so the frontend can fall back.

### Prompt — `claude/EXTRACT_PROMPT.md`
Instructs Claude to read the piped resume text and emit ONLY a JSON object
matching the `CareerProfile` schema (schema inlined). No prose, no code fences.

### Frontend
- **App.tsx** — owns the flow. Renders `SAMPLE_PROFILE` on load. On upload:
  `filesToText()` → `Loader` → `POST /api/claude` → `parseClaudeProfile()`.
  On bridge failure, fall back to `extractProfile()` (heuristic). `source` field
  drives a provenance badge. Errors surface in the loader.
- **ProfileView.tsx** — composes header + globe + timeline + skills + AI-era.
- **Globe.tsx** — `react-globe.gl`; offline (no texture URL — dark emissive
  material + atmosphere). Points per located node colored by era; arcs between
  consecutive located nodes. Auto-rotates.
- **Timeline.tsx** — chronological era-colored cards (role, employer, dates,
  highlights, AI-relevance bar).
- **SkillsPanel.tsx** — level bars; AI-aligned skills emphasized.
- **AIEraPanel.tsx** — projected role, narrative, augmentations.

## Data flow

file(s) → `filesToText` → text →
  try `/api/claude` → `parseClaudeProfile` (source `claude`)
  catch → `extractProfile` (source `heuristic`)
→ `CareerProfile` → `ProfileView`.

`SAMPLE_PROFILE` (source `sample`) shown before any upload.

## Error handling

- Parse errors (bad/oversized file) → friendly message in the loader; stay idle.
- Bridge unreachable / `claude` not installed → silent fallback to heuristic;
  badge shows `heuristic`.
- Claude returns malformed JSON → `parseClaudeProfile` throws → fallback.

## Testing

`npm run build` (tsc) + `npm run lint`; start dev server; verify PDF, DOCX, TXT
parse; `/api/claude` responds and falls back cleanly without the CLI; profile
renders on globe + timeline.

## Out of scope (later)

Bundled Earth texture, production server build, multi-profile compare, export.
