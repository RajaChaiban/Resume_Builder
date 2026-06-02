// Maps located career roles onto the atlas country whose polygon contains them.
// Matching by geometry (not the free-text country spelling a resume carries)
// keeps "USA" / "UK" / etc. aligned with the vendored atlas names, so the globe
// can highlight worked countries and open a per-country description panel.
import { geoContains } from 'd3-geo';
import type { Feature, Geometry } from 'geojson';
import type { CareerNode, CareerProfile } from './types';
import rawWorldGeo from './world-countries.geo.json';

export type CountryProps = { name: string };
export type CountryFeature = Feature<Geometry, CountryProps>;

export const WORLD_FEATURES = (
  rawWorldGeo as unknown as { features: CountryFeature[] }
).features;

/**
 * Group a profile's located roles by the country that geographically contains
 * each role, keyed by the atlas country name. Roles whose coordinates fall in no
 * country polygon (mid-ocean, Antarctica, etc.) are skipped.
 */
export function rolesByCountry(
  profile: CareerProfile,
  features: CountryFeature[] = WORLD_FEATURES,
): Map<string, CareerNode[]> {
  const map = new Map<string, CareerNode[]>();
  for (const n of profile.nodes) {
    if (!n.location) continue;
    const pt: [number, number] = [n.location.lng, n.location.lat];
    const hit = features.find((f) => geoContains(f, pt));
    if (!hit) continue;
    const key = hit.properties.name;
    const bucket = map.get(key);
    if (bucket) bucket.push(n);
    else map.set(key, [n]);
  }
  return map;
}
