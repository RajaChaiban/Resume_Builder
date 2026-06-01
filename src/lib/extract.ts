// Heuristic extractor: raw resume/cover-letter text -> CareerProfile.
// This is the zero-dependency fallback. The Claude agent produces a richer
// profile with the same shape (see claude/EXTRACT_PROMPT.md).
import { CURRENT_YEAR, eraForYear, type CareerNode, type CareerProfile } from './types';
import { findCityInText, geocode } from './geocode';
import { aiScore, extractSkills } from './skills';

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const URL_RE = /(https?:\/\/[^\s)]+|(?:www\.|linkedin\.com|github\.com)[^\s)]+)/gi;

// Matches "2019 - 2023", "Jan 2019 – Present", "2019 to 2022", "2020–now".
const DATE_RANGE_RE =
  /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?((?:19|20)\d{2})\s*(?:-|–|—|to|until|\/)\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?((?:19|20)\d{2}|present|current|now|today)/i;

function parseYear(token: string): number {
  const t = token.toLowerCase().trim();
  if (/present|current|now|today/.test(t)) return CURRENT_YEAR;
  const m = t.match(/(19|20)\d{2}/);
  return m ? parseInt(m[0], 10) : CURRENT_YEAR;
}

function looksLikeName(line: string): boolean {
  const words = line.trim().split(/\s+/);
  if (words.length < 2 || words.length > 4) return false;
  return words.every((w) => /^[A-Z][a-zA-Z.'-]+$/.test(w));
}

/** Pull a clean list of highlight bullets near an entry. */
function bulletsFrom(lines: string[]): string[] {
  return lines
    .map((l) => l.replace(/^[\s•\-*▪◦·]+/, '').trim())
    .filter((l) => l.length > 25 && l.length < 220)
    .slice(0, 4);
}

export function extractProfile(text: string, fallbackName = 'Your Name'): CareerProfile {
  const raw = text.replace(/\r/g, '');
  const lines = raw.split('\n').map((l) => l.trim());
  const nonEmpty = lines.filter(Boolean);

  // --- identity ---
  const name = nonEmpty.find(looksLikeName) ?? fallbackName;
  const email = raw.match(EMAIL_RE)?.[0];
  const links = [...new Set(raw.match(URL_RE) ?? [])].slice(0, 4).map((url) => ({
    label: /linkedin/i.test(url) ? 'LinkedIn' : /github/i.test(url) ? 'GitHub' : 'Link',
    url: url.startsWith('http') ? url : `https://${url}`,
  }));

  // --- experience: split text into blocks around date ranges ---
  const nodes: CareerNode[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(DATE_RANGE_RE);
    if (!m) continue;
    const startYear = parseYear(m[2]);
    const endYear = parseYear(m[4]);
    if (endYear < startYear) continue;

    // Look at the surrounding window for role / employer / location.
    const ctx = lines.slice(Math.max(0, i - 2), i + 6).filter(Boolean);
    const labelLines = ctx.filter((l) => !DATE_RANGE_RE.test(l));
    const role = labelLines[0] ?? 'Role';
    const employer = (labelLines[1] ?? labelLines[0] ?? 'Company').replace(/[|,].*$/, '').trim();
    const blockText = ctx.join(' ');
    const location =
      geocode(ctx.find((l) => /[A-Z][a-z]+,\s*[A-Z]/.test(l))) ?? findCityInText(blockText);

    nodes.push({
      id: `n${nodes.length}`,
      employer: employer.slice(0, 60),
      role: role.slice(0, 70),
      start: m[1] ? `${m[1].trim()} ${m[2]}` : m[2],
      end: /present|current|now|today/i.test(m[4]) ? 'Present' : m[4],
      startYear,
      endYear,
      location,
      summary: undefined,
      highlights: bulletsFrom(ctx.slice(1)),
      skills: extractSkills(blockText).map((s) => s.name).slice(0, 6),
      aiRelevance: Math.max(aiScore(blockText), eraForYear(endYear) === 'ai-era' ? 0.4 : 0.1),
      era: eraForYear(endYear),
    });
  }

  // De-dupe + sort oldest -> newest.
  const seen = new Set<string>();
  const ordered = nodes
    .filter((n) => {
      const key = `${n.employer}|${n.startYear}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.startYear - b.startYear);

  // --- skills (whole doc) ---
  const skills = extractSkills(raw)
    .map((s, idx) => ({ name: s.name, aiAligned: s.aiAligned, level: 0.5 + ((idx * 7) % 5) / 10 }))
    .slice(0, 12);

  const latest = ordered[ordered.length - 1];
  const title = latest?.role ?? 'Professional';
  const aiAligned = skills.filter((s) => s.aiAligned).map((s) => s.name);

  const profile: CareerProfile = {
    name,
    title,
    tagline: `From ${ordered[0]?.startYear ?? CURRENT_YEAR} to the AI era — a trajectory still accelerating.`,
    summary:
      `${name} has navigated ${ordered.length || 'several'} chapters of work, ` +
      `carrying ${skills.length} distinct capabilities into an era where human judgment ` +
      `is amplified by intelligent machines.`,
    email,
    location: latest?.location ? `${latest.location.city}` : undefined,
    links,
    skills,
    nodes: ordered,
    aiEra: {
      projectedRole: aiAligned.length ? `AI-Augmented ${title}` : `AI-Era ${title}`,
      narrative:
        `The next chapter pairs ${name.split(' ')[0]}'s domain mastery with autonomous AI ` +
        `systems — delegating the rote, amplifying the strategic, and operating at a scale ` +
        `that was impossible a decade ago.`,
      augmentations: [
        'Agentic workflows that execute while you sleep',
        'Real-time synthesis across every prior role',
        aiAligned.length ? `Native fluency in ${aiAligned.slice(0, 2).join(' & ')}` : 'Rapid AI upskilling',
        'Decisions informed by models, owned by a human',
      ],
    },
    source: 'heuristic',
  };
  return profile;
}
