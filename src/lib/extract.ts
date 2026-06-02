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

// A "City, ST" or "City, Country" tail that resume lines park at the right edge.
const LOCATION_TAIL_RE =
  /([A-Z][A-Za-z.\s'-]+,\s*(?:[A-Z]{2}|[A-Z]\.[A-Z]\.|[A-Z][a-zA-Z.]+))\s*$/;

/** Strip a trailing "City, ST" location and a trailing date range off a line. */
function stripTail(line: string): string {
  return line
    .replace(DATE_RANGE_RE, '')
    .replace(LOCATION_TAIL_RE, '')
    .replace(/[\s|,·–—-]+$/, '')
    .trim();
}

// Resume section headers are short, (mostly) uppercase, digit-free lines.
function sectionOf(line: string): string | null {
  const t = line.trim();
  if (t.length > 42 || /\d/.test(t)) return null;
  const letters = t.replace(/[^A-Za-z]/g, '');
  if (letters.length < 4) return null;
  const upperRatio = (t.replace(/[^A-Z]/g, '').length || 0) / letters.length;
  if (upperRatio < 0.7) return null;
  if (/experience|employment|work history/i.test(t)) return 'experience';
  if (/education|academic/i.test(t)) return 'education';
  if (/skill|technical|competenc/i.test(t)) return 'skills';
  if (/project/i.test(t)) return 'projects';
  if (/leadership|involvement|volunteer|activit|award|certif|language|additional|reference|interest|hobb/i.test(t))
    return 'other';
  return null; // an uppercase line that isn't a known header (e.g. an employer)
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

  // --- experience: section-aware, two-column-aware block parsing ---
  // Real resumes use a two-column layout where the employer and date range share
  // one line and the role + "City, ST" share the next. We only mine the WORK
  // EXPERIENCE section so education/leadership date ranges don't become "jobs".
  const nodes: CareerNode[] = [];
  let section: string | null = null; // null until the first header is seen
  let sawExperienceHeader = false;

  const nextNonEmpty = (from: number): number => {
    for (let j = from; j < lines.length; j++) if (lines[j]) return j;
    return -1;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const header = sectionOf(line);
    if (header) {
      section = header;
      if (header === 'experience') sawExperienceHeader = true;
      continue;
    }
    // Only mine roles inside WORK EXPERIENCE. If a resume has no recognizable
    // header at all, fall back to scanning everything (section stays null).
    if (sawExperienceHeader && section !== 'experience') continue;

    const m = line.match(DATE_RANGE_RE);
    if (!m) continue;
    const startYear = parseYear(m[2]);
    const endYear = parseYear(m[4]);
    if (endYear < startYear) continue;

    // This line carries the date range -> it's the employer line. The role +
    // location live on the next non-empty line in this layout.
    const employer = stripTail(line) || 'Company';
    const roleIdx = nextNonEmpty(i + 1);
    const roleLine = roleIdx >= 0 ? lines[roleIdx] : '';

    // Resolve the location from the role line (then the employer line, then any
    // known city in the block). geocode() pulls the real city out of a phrase.
    const block = lines.slice(i, roleIdx >= 0 ? roleIdx + 6 : i + 6).filter(Boolean);
    const blockText = block.join(' ');
    const location = geocode(roleLine) ?? geocode(line) ?? findCityInText(blockText);

    // The role is the role-line text up to where the city name begins (role and
    // "City, ST" run together once the PDF's two columns are flattened).
    let role = roleLine;
    const cityAt = location ? roleLine.toLowerCase().indexOf(location.city.toLowerCase()) : -1;
    if (cityAt > 0) role = roleLine.slice(0, cityAt);
    role = stripTail(role) || 'Role';

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
      highlights: bulletsFrom(block.slice(2)),
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
