// Decides which geographic visualization fits a profile: a flat US map when
// the whole career is US-based, otherwise the 3D globe for international reach.
import type { CareerProfile } from './types';

export type MapMode = 'us' | 'globe';

// Country spellings the geocoder emits (or a resume might carry) for the US.
const US_COUNTRIES = new Set(['usa', 'us', 'united states', 'united states of america']);

function isUs(country?: string): boolean {
  return country != null && US_COUNTRIES.has(country.trim().toLowerCase());
}

/**
 * 'us'  → every located role sits in the United States (show the US map).
 * 'globe' → at least one role is abroad, or nothing is located at all.
 */
export function mapMode(profile: CareerProfile): MapMode {
  const located = profile.nodes.filter((n) => n.location);
  if (located.length === 0) return 'globe';
  return located.every((n) => isUs(n.location!.country)) ? 'us' : 'globe';
}
