// The "Connect to Claude Code" bridge.
//
// Flow: the app extracts the resume text -> the user runs it through Claude Code
// using claude/EXTRACT_PROMPT.md -> Claude writes a profile.json -> the user
// drops that JSON back into the app for a richer, truly-AI transformation.
//
// This module validates + normalizes that JSON into a CareerProfile.
import { CURRENT_YEAR, eraForYear, type CareerProfile, type CareerNode } from './types';
import { geocode } from './geocode';

function num(v: unknown, fallback: number): number {
  const n = typeof v === 'string' ? parseInt(v, 10) : (v as number);
  return Number.isFinite(n) ? (n as number) : fallback;
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function arr<T = unknown>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

/** Parse + normalize a Claude-generated profile JSON. Throws on garbage. */
export function parseClaudeProfile(jsonText: string): CareerProfile {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(jsonText);
  } catch {
    throw new Error('That is not valid JSON. Paste the full profile.json Claude produced.');
  }
  if (!data || typeof data !== 'object') throw new Error('Expected a JSON object.');

  const rawNodes = arr<Record<string, unknown>>(data.nodes);
  if (rawNodes.length === 0) throw new Error('The profile has no "nodes" (work history) array.');

  const nodes: CareerNode[] = rawNodes.map((n, i) => {
    const startYear = num(n.startYear, num(n.start, CURRENT_YEAR));
    const endYearRaw = n.endYear ?? n.end;
    const endYear =
      typeof endYearRaw === 'string' && /present|current|now/i.test(endYearRaw)
        ? CURRENT_YEAR
        : num(endYearRaw, CURRENT_YEAR);
    const loc = n.location as Record<string, unknown> | string | undefined;
    let location;
    if (loc && typeof loc === 'object' && 'lat' in loc) {
      location = {
        city: str((loc as Record<string, unknown>).city, 'Unknown'),
        country: str((loc as Record<string, unknown>).country) || undefined,
        lat: num((loc as Record<string, unknown>).lat, 0),
        lng: num((loc as Record<string, unknown>).lng, 0),
      };
    } else if (typeof loc === 'string') {
      location = geocode(loc);
    }
    return {
      // Always assign ids by index — the model sometimes emits duplicates,
      // which would collide as React keys downstream.
      id: `n${i}`,
      employer: str(n.employer, 'Company'),
      role: str(n.role, 'Role'),
      start: str(n.start, String(startYear)),
      end: str(n.end, String(endYear)),
      startYear,
      endYear,
      location,
      summary: str(n.summary) || undefined,
      highlights: arr<string>(n.highlights).map(String).slice(0, 5),
      skills: arr<string>(n.skills).map(String).slice(0, 8),
      aiRelevance: Math.min(1, Math.max(0, num(n.aiRelevance, 0.3))),
      era: (str(n.era) as CareerNode['era']) || eraForYear(endYear),
    };
  });

  const aiEra = (data.aiEra as Record<string, unknown>) ?? {};
  const profile: CareerProfile = {
    name: str(data.name, 'Your Name'),
    title: str(data.title, nodes[nodes.length - 1]?.role ?? 'Professional'),
    tagline: str(data.tagline, 'A trajectory bending toward the AI era.'),
    summary: str(data.summary, ''),
    email: str(data.email) || undefined,
    location: str(data.location) || undefined,
    links: arr<Record<string, unknown>>(data.links).map((l) => ({
      label: str(l.label, 'Link'),
      url: str(l.url),
    })),
    skills: arr<Record<string, unknown>>(data.skills).map((s) => ({
      name: str(s.name),
      level: Math.min(1, Math.max(0, num(s.level, 0.5))),
      aiAligned: Boolean(s.aiAligned),
    })),
    nodes: nodes.sort((a, b) => a.startYear - b.startYear),
    aiEra: {
      projectedRole: str(aiEra.projectedRole, 'AI-Era Professional'),
      narrative: str(aiEra.narrative, ''),
      augmentations: arr<string>(aiEra.augmentations).map(String).slice(0, 6),
    },
    source: 'claude',
  };
  return profile;
}
