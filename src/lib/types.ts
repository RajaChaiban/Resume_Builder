// Core data model shared by the parser, the Claude agent, and every renderer.
// A CareerProfile is the single source of truth the visuals read from.

export type Era = 'pre-ai' | 'transition' | 'ai-era';

export interface GeoLocation {
  city: string;
  country?: string;
  lat: number;
  lng: number;
}

export interface CareerNode {
  id: string;
  employer: string;
  role: string;
  start: string; // human label, e.g. "Jan 2019"
  end: string; // "Present" or e.g. "2023"
  startYear: number;
  endYear: number; // resolves "Present" to the current year
  location?: GeoLocation;
  summary?: string;
  highlights: string[];
  skills: string[];
  aiRelevance: number; // 0..1 — how AI-aligned this chapter is
  era: Era;
}

export interface SkillStat {
  name: string;
  level: number; // 0..1
  aiAligned: boolean;
}

export interface CareerProfile {
  name: string;
  title: string; // current / headline title
  tagline: string; // one futuristic line
  summary: string; // rewritten, forward-looking summary
  email?: string;
  location?: string;
  links: { label: string; url: string }[];
  skills: SkillStat[];
  nodes: CareerNode[]; // chronological, oldest -> newest
  aiEra: {
    projectedRole: string; // where this trajectory points in the AI era
    narrative: string;
    augmentations: string[]; // AI superpowers grafted onto their craft
  };
  source: 'heuristic' | 'claude' | 'sample';
}

export const CURRENT_YEAR = 2026;
export const AI_ERA_YEAR = 2026; // the inflection point the timeline bends toward

export function eraForYear(year: number): Era {
  if (year >= 2023) return 'ai-era';
  if (year >= 2017) return 'transition';
  return 'pre-ai';
}
