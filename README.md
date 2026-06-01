# Resume_Enh

Turn a plain resume into a **cinematic, AI-era career visualization** — entirely in your browser.

Drop in a PDF, DOCX, or text resume (and optionally a cover letter). The app reads it locally, reconstructs your career as a structured timeline, geolocates every chapter onto an interactive globe, scores how "AI-aligned" each step was, and projects where your trajectory points in the AI era.

> **Privacy by design:** every file is parsed in-browser. Nothing is uploaded to any server.

---

## What it does

- **Local file parsing** — PDF (`pdfjs-dist`), DOCX (`mammoth`), and TXT/MD/RTF, all client-side.
- **Heuristic extraction** — a zero-dependency parser turns raw resume text into a structured `CareerProfile`: identity, links, dated work history, per-role skills, and an AI-relevance score.
- **Optional Claude upgrade** — run your resume text through Claude Code to produce a richer `profile.json`, then drop that JSON back into the app for an AI-authored transformation. (See [Architecture → The Claude bridge](./ARCHITECTURE.md#the-claude-bridge).)
- **Offline geocoding** — a built-in city/country lookup maps your career locations to coordinates with **no network calls**.
- **AI-era narrative** — skills are weighted by AI alignment, eras are classified (`pre-ai` → `transition` → `ai-era`), and a forward-looking "projected role" is generated.
- **Ambient visuals** — a canvas starfield, an animated "agent is thinking" loader, and drag-and-drop upload, all with Framer Motion transitions.

---

## Tech stack

| Area        | Choice |
|-------------|--------|
| Framework   | React 19 + TypeScript |
| Build tool  | Vite |
| Animation   | Framer Motion |
| 3D / globe  | `three` + `react-globe.gl` |
| File parsing| `pdfjs-dist`, `mammoth` |
| Linting     | ESLint (typescript-eslint) |

---

## Getting started

```bash
npm install      # install dependencies
npm run dev      # start the dev server (Vite, with HMR)
npm run build    # type-check (tsc -b) + production build
npm run preview  # preview the production build
npm run lint     # run ESLint
```

Then open the URL Vite prints (typically `http://localhost:5173`).

---

## Project status

The pipeline is **wired end-to-end and tested** (PDF, DOCX, and TXT uploads all
parse → enhance → render):

- `src/App.tsx` orchestrates the flow: `Uploader` → local parse → Claude bridge
  (with heuristic fallback) → `Loader` → rendered `CareerProfile`.
- The visualization (`ProfileView`) renders an interactive globe (`react-globe.gl`),
  an era-colored timeline, a skills panel, and the AI-era projection.
- A Vite dev-server plugin exposes `POST /api/claude`, which shells out to the
  `claude` CLI to produce a richer profile.

### The Claude bridge (dev backend)

When you run `npm run dev`, uploads are sent to a local `POST /api/claude`
endpoint that runs your resume text through the `claude` CLI
(see [`claude/EXTRACT_PROMPT.md`](./claude/EXTRACT_PROMPT.md)) and returns a
`CareerProfile`. Requirements / notes:

- The [`claude` CLI](https://docs.claude.com/en/docs/claude-code) must be
  installed and on your `PATH` (it's invoked server-side, so no API key touches
  the browser).
- **Fallback:** if the CLI is missing or errors, the app silently falls back to
  the offline heuristic extractor — the UI always works. The source badge shows
  which path produced the profile (`Enhanced by Claude` vs `Parsed locally`).
- The bridge is **dev-only** (it lives in `configureServer`); a production build
  serves the static frontend with the heuristic path only.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full design and data model.

---

## Repository layout

```
Resume_Enh/
├── index.html              # Vite entry HTML
├── claude/
│   └── EXTRACT_PROMPT.md   # prompt the dev backend feeds the claude CLI
├── src/
│   ├── main.tsx            # React root
│   ├── App.tsx             # orchestrates upload -> parse -> claude/heuristic -> render
│   ├── lib/                # core logic (framework-agnostic)
│   │   ├── types.ts        # CareerProfile data model (source of truth)
│   │   ├── parse.ts        # File -> plain text (PDF/DOCX/TXT)
│   │   ├── extract.ts      # text -> CareerProfile (heuristic)
│   │   ├── claudeProfile.ts# Claude profile.json -> CareerProfile
│   │   ├── geocode.ts      # offline city/country -> coordinates
│   │   ├── skills.ts       # skill vocabulary + AI scoring
│   │   └── sample.ts       # demo profile shown on load
│   ├── components/
│   │   ├── Uploader.tsx    # drag-and-drop / browse upload
│   │   ├── Loader.tsx      # multi-phase "thinking" sequence
│   │   ├── Starfield.tsx   # ambient canvas particle field
│   │   ├── ProfileView.tsx # composes the full visualization
│   │   ├── Globe.tsx       # react-globe.gl career map
│   │   ├── Timeline.tsx    # era-colored career track
│   │   ├── SkillsPanel.tsx # skill proficiency bars
│   │   └── AIEraPanel.tsx  # AI-era projection
│   └── types/shims.d.ts    # type shims (mammoth browser entry)
├── public/                 # favicon, icons
└── vite.config.ts          # Vite config + /api/claude dev bridge plugin
```
