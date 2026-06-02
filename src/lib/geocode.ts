// Offline geocoder. A built-in lookup so the globe + US map work with zero
// network calls. Resolves "City, ST" (US) and "City, Country" (international),
// with graceful fallbacks: an unknown US city still lands on its state centroid,
// and an unknown international city still lands on its country centroid.
//
// Matching is WORD-BOUNDARY based on purpose — naive substring matching caused
// "Orlando" to resolve to "L.A." (the "la" alias lives inside "orLAndo").
import type { GeoLocation } from './types';

interface CityRow {
  name: string;
  country: string;
  state?: string;
  lat: number;
  lng: number;
  aliases?: string[];
}

// --- US states: 2-letter code -> name + centroid (decimal degrees). ---
interface StateRow {
  name: string;
  lat: number;
  lng: number;
}
const US_STATES: Record<string, StateRow> = {
  AL: { name: 'Alabama', lat: 32.806, lng: -86.791 },
  AK: { name: 'Alaska', lat: 61.37, lng: -152.404 },
  AZ: { name: 'Arizona', lat: 33.729, lng: -111.431 },
  AR: { name: 'Arkansas', lat: 34.97, lng: -92.373 },
  CA: { name: 'California', lat: 36.117, lng: -119.682 },
  CO: { name: 'Colorado', lat: 39.059, lng: -105.311 },
  CT: { name: 'Connecticut', lat: 41.598, lng: -72.755 },
  DE: { name: 'Delaware', lat: 39.319, lng: -75.507 },
  DC: { name: 'District of Columbia', lat: 38.907, lng: -77.037 },
  FL: { name: 'Florida', lat: 27.766, lng: -81.687 },
  GA: { name: 'Georgia', lat: 33.04, lng: -83.643 },
  HI: { name: 'Hawaii', lat: 21.094, lng: -157.498 },
  ID: { name: 'Idaho', lat: 44.24, lng: -114.478 },
  IL: { name: 'Illinois', lat: 40.349, lng: -88.986 },
  IN: { name: 'Indiana', lat: 39.849, lng: -86.258 },
  IA: { name: 'Iowa', lat: 42.011, lng: -93.21 },
  KS: { name: 'Kansas', lat: 38.526, lng: -96.726 },
  KY: { name: 'Kentucky', lat: 37.668, lng: -84.67 },
  LA: { name: 'Louisiana', lat: 31.169, lng: -91.867 },
  ME: { name: 'Maine', lat: 44.693, lng: -69.381 },
  MD: { name: 'Maryland', lat: 39.064, lng: -76.741 },
  MA: { name: 'Massachusetts', lat: 42.23, lng: -71.53 },
  MI: { name: 'Michigan', lat: 43.327, lng: -84.536 },
  MN: { name: 'Minnesota', lat: 45.694, lng: -93.9 },
  MS: { name: 'Mississippi', lat: 32.741, lng: -89.679 },
  MO: { name: 'Missouri', lat: 38.456, lng: -92.288 },
  MT: { name: 'Montana', lat: 46.921, lng: -110.454 },
  NE: { name: 'Nebraska', lat: 41.125, lng: -98.268 },
  NV: { name: 'Nevada', lat: 38.313, lng: -117.055 },
  NH: { name: 'New Hampshire', lat: 43.452, lng: -71.564 },
  NJ: { name: 'New Jersey', lat: 40.298, lng: -74.521 },
  NM: { name: 'New Mexico', lat: 34.84, lng: -106.248 },
  NY: { name: 'New York', lat: 42.166, lng: -74.948 },
  NC: { name: 'North Carolina', lat: 35.63, lng: -79.806 },
  ND: { name: 'North Dakota', lat: 47.528, lng: -99.784 },
  OH: { name: 'Ohio', lat: 40.389, lng: -82.764 },
  OK: { name: 'Oklahoma', lat: 35.565, lng: -96.929 },
  OR: { name: 'Oregon', lat: 44.572, lng: -122.071 },
  PA: { name: 'Pennsylvania', lat: 40.59, lng: -77.209 },
  RI: { name: 'Rhode Island', lat: 41.68, lng: -71.512 },
  SC: { name: 'South Carolina', lat: 33.856, lng: -80.945 },
  SD: { name: 'South Dakota', lat: 44.299, lng: -99.438 },
  TN: { name: 'Tennessee', lat: 35.747, lng: -86.692 },
  TX: { name: 'Texas', lat: 31.054, lng: -97.563 },
  UT: { name: 'Utah', lat: 40.15, lng: -111.862 },
  VT: { name: 'Vermont', lat: 44.045, lng: -72.71 },
  VA: { name: 'Virginia', lat: 37.769, lng: -78.17 },
  WA: { name: 'Washington', lat: 47.401, lng: -121.49 },
  WV: { name: 'West Virginia', lat: 38.491, lng: -80.954 },
  WI: { name: 'Wisconsin', lat: 44.268, lng: -89.616 },
  WY: { name: 'Wyoming', lat: 42.756, lng: -107.302 },
};
// Full state name -> code, so "New York" or "Florida" qualifiers also resolve.
const STATE_NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(US_STATES).map(([code, s]) => [s.name.toLowerCase(), code]),
);

const CITIES: CityRow[] = [
  // --- United States ---
  { name: 'San Francisco', country: 'USA', state: 'CA', lat: 37.7749, lng: -122.4194, aliases: ['san francisco bay area'] },
  { name: 'San Jose', country: 'USA', state: 'CA', lat: 37.3382, lng: -121.8863 },
  { name: 'Palo Alto', country: 'USA', state: 'CA', lat: 37.4419, lng: -122.143 },
  { name: 'Mountain View', country: 'USA', state: 'CA', lat: 37.3861, lng: -122.0839 },
  { name: 'San Diego', country: 'USA', state: 'CA', lat: 32.7157, lng: -117.1611 },
  { name: 'Sacramento', country: 'USA', state: 'CA', lat: 38.5816, lng: -121.4944 },
  { name: 'Oakland', country: 'USA', state: 'CA', lat: 37.8044, lng: -122.2712 },
  { name: 'Los Angeles', country: 'USA', state: 'CA', lat: 34.0522, lng: -118.2437 },
  { name: 'Seattle', country: 'USA', state: 'WA', lat: 47.6062, lng: -122.3321 },
  { name: 'New York', country: 'USA', state: 'NY', lat: 40.7128, lng: -74.006, aliases: ['new york city', 'manhattan', 'brooklyn'] },
  { name: 'Albany', country: 'USA', state: 'NY', lat: 42.6526, lng: -73.7562 },
  { name: 'Buffalo', country: 'USA', state: 'NY', lat: 42.8864, lng: -78.8784 },
  { name: 'Rochester', country: 'USA', state: 'NY', lat: 43.1566, lng: -77.6088 },
  { name: 'Boston', country: 'USA', state: 'MA', lat: 42.3601, lng: -71.0589 },
  { name: 'Cambridge', country: 'USA', state: 'MA', lat: 42.3736, lng: -71.1097 },
  { name: 'Austin', country: 'USA', state: 'TX', lat: 30.2672, lng: -97.7431 },
  { name: 'Dallas', country: 'USA', state: 'TX', lat: 32.7767, lng: -96.797 },
  { name: 'Houston', country: 'USA', state: 'TX', lat: 29.7604, lng: -95.3698 },
  { name: 'San Antonio', country: 'USA', state: 'TX', lat: 29.4241, lng: -98.4936 },
  { name: 'Fort Worth', country: 'USA', state: 'TX', lat: 32.7555, lng: -97.3308 },
  { name: 'Chicago', country: 'USA', state: 'IL', lat: 41.8781, lng: -87.6298 },
  { name: 'Denver', country: 'USA', state: 'CO', lat: 39.7392, lng: -104.9903 },
  { name: 'Boulder', country: 'USA', state: 'CO', lat: 40.015, lng: -105.2705 },
  { name: 'Atlanta', country: 'USA', state: 'GA', lat: 33.749, lng: -84.388 },
  { name: 'Miami', country: 'USA', state: 'FL', lat: 25.7617, lng: -80.1918 },
  { name: 'Orlando', country: 'USA', state: 'FL', lat: 28.5383, lng: -81.3792 },
  { name: 'Tampa', country: 'USA', state: 'FL', lat: 27.9506, lng: -82.4572 },
  { name: 'Jacksonville', country: 'USA', state: 'FL', lat: 30.3322, lng: -81.6557 },
  { name: 'Gainesville', country: 'USA', state: 'FL', lat: 29.6516, lng: -82.3248 },
  { name: 'Tallahassee', country: 'USA', state: 'FL', lat: 30.4383, lng: -84.2807 },
  { name: 'Washington', country: 'USA', state: 'DC', lat: 38.9072, lng: -77.0369, aliases: ['washington dc', 'washington d.c'] },
  { name: 'Philadelphia', country: 'USA', state: 'PA', lat: 39.9526, lng: -75.1652 },
  { name: 'Pittsburgh', country: 'USA', state: 'PA', lat: 40.4406, lng: -79.9959 },
  { name: 'Phoenix', country: 'USA', state: 'AZ', lat: 33.4484, lng: -112.074 },
  { name: 'Portland', country: 'USA', state: 'OR', lat: 45.5152, lng: -122.6784 },
  { name: 'Minneapolis', country: 'USA', state: 'MN', lat: 44.9778, lng: -93.265 },
  { name: 'Detroit', country: 'USA', state: 'MI', lat: 42.3314, lng: -83.0458 },
  { name: 'Nashville', country: 'USA', state: 'TN', lat: 36.1627, lng: -86.7816 },
  { name: 'Charlotte', country: 'USA', state: 'NC', lat: 35.2271, lng: -80.8431 },
  { name: 'Raleigh', country: 'USA', state: 'NC', lat: 35.7796, lng: -78.6382 },
  { name: 'Salt Lake City', country: 'USA', state: 'UT', lat: 40.7608, lng: -111.891 },
  { name: 'Las Vegas', country: 'USA', state: 'NV', lat: 36.1699, lng: -115.1398 },
  { name: 'Columbus', country: 'USA', state: 'OH', lat: 39.9612, lng: -82.9988 },
  { name: 'Newark', country: 'USA', state: 'NJ', lat: 40.7357, lng: -74.1724 },
  { name: 'Princeton', country: 'USA', state: 'NJ', lat: 40.3573, lng: -74.6672 },
  // --- Canada ---
  { name: 'Toronto', country: 'Canada', lat: 43.6532, lng: -79.3832 },
  { name: 'Vancouver', country: 'Canada', lat: 49.2827, lng: -123.1207 },
  { name: 'Montreal', country: 'Canada', lat: 45.5017, lng: -73.5673 },
  { name: 'Ottawa', country: 'Canada', lat: 45.4215, lng: -75.6972 },
  // --- Europe ---
  { name: 'London', country: 'UK', lat: 51.5074, lng: -0.1278 },
  { name: 'Manchester', country: 'UK', lat: 53.4808, lng: -2.2426 },
  { name: 'Edinburgh', country: 'UK', lat: 55.9533, lng: -3.1883 },
  { name: 'Dublin', country: 'Ireland', lat: 53.3498, lng: -6.2603 },
  { name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522 },
  { name: 'Berlin', country: 'Germany', lat: 52.52, lng: 13.405 },
  { name: 'Munich', country: 'Germany', lat: 48.1351, lng: 11.582 },
  { name: 'Frankfurt', country: 'Germany', lat: 50.1109, lng: 8.6821 },
  { name: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lng: 4.9041 },
  { name: 'Madrid', country: 'Spain', lat: 40.4168, lng: -3.7038 },
  { name: 'Barcelona', country: 'Spain', lat: 41.3851, lng: 2.1734 },
  { name: 'Lisbon', country: 'Portugal', lat: 38.7223, lng: -9.1393 },
  { name: 'Zurich', country: 'Switzerland', lat: 47.3769, lng: 8.5417 },
  { name: 'Geneva', country: 'Switzerland', lat: 46.2044, lng: 6.1432 },
  { name: 'Stockholm', country: 'Sweden', lat: 59.3293, lng: 18.0686 },
  { name: 'Copenhagen', country: 'Denmark', lat: 55.6761, lng: 12.5683 },
  { name: 'Oslo', country: 'Norway', lat: 59.9139, lng: 10.7522 },
  { name: 'Milan', country: 'Italy', lat: 45.4642, lng: 9.19 },
  { name: 'Rome', country: 'Italy', lat: 41.9028, lng: 12.4964 },
  { name: 'Warsaw', country: 'Poland', lat: 52.2297, lng: 21.0122 },
  { name: 'Vienna', country: 'Austria', lat: 48.2082, lng: 16.3738 },
  { name: 'Brussels', country: 'Belgium', lat: 50.8503, lng: 4.3517 },
  { name: 'Athens', country: 'Greece', lat: 37.9838, lng: 23.7275 },
  { name: 'Istanbul', country: 'Turkey', lat: 41.0082, lng: 28.9784 },
  { name: 'Moscow', country: 'Russia', lat: 55.7558, lng: 37.6173 },
  // --- Middle East / Africa ---
  { name: 'Tel Aviv', country: 'Israel', lat: 32.0853, lng: 34.7818 },
  { name: 'Dubai', country: 'UAE', lat: 25.2048, lng: 55.2708 },
  { name: 'Abu Dhabi', country: 'UAE', lat: 24.4539, lng: 54.3773 },
  { name: 'Doha', country: 'Qatar', lat: 25.2854, lng: 51.531 },
  { name: 'Riyadh', country: 'Saudi Arabia', lat: 24.7136, lng: 46.6753 },
  { name: 'Beirut', country: 'Lebanon', lat: 33.8938, lng: 35.5018 },
  { name: 'Amman', country: 'Jordan', lat: 31.9454, lng: 35.9284 },
  { name: 'Cairo', country: 'Egypt', lat: 30.0444, lng: 31.2357 },
  { name: 'Nairobi', country: 'Kenya', lat: -1.2921, lng: 36.8219 },
  { name: 'Lagos', country: 'Nigeria', lat: 6.5244, lng: 3.3792 },
  { name: 'Cape Town', country: 'South Africa', lat: -33.9249, lng: 18.4241 },
  { name: 'Johannesburg', country: 'South Africa', lat: -26.2041, lng: 28.0473 },
  // --- Asia / Pacific ---
  { name: 'Bangalore', country: 'India', lat: 12.9716, lng: 77.5946, aliases: ['bengaluru'] },
  { name: 'Hyderabad', country: 'India', lat: 17.385, lng: 78.4867 },
  { name: 'Mumbai', country: 'India', lat: 19.076, lng: 72.8777 },
  { name: 'Delhi', country: 'India', lat: 28.7041, lng: 77.1025, aliases: ['new delhi'] },
  { name: 'Pune', country: 'India', lat: 18.5204, lng: 73.8567 },
  { name: 'Chennai', country: 'India', lat: 13.0827, lng: 80.2707 },
  { name: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { name: 'Hong Kong', country: 'China', lat: 22.3193, lng: 114.1694 },
  { name: 'Shanghai', country: 'China', lat: 31.2304, lng: 121.4737 },
  { name: 'Beijing', country: 'China', lat: 39.9042, lng: 116.4074 },
  { name: 'Shenzhen', country: 'China', lat: 22.5431, lng: 114.0579 },
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503 },
  { name: 'Seoul', country: 'South Korea', lat: 37.5665, lng: 126.978 },
  { name: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093 },
  { name: 'Melbourne', country: 'Australia', lat: -37.8136, lng: 144.9631 },
  // --- Latin America ---
  { name: 'Mexico City', country: 'Mexico', lat: 19.4326, lng: -99.1332 },
  { name: 'Sao Paulo', country: 'Brazil', lat: -23.5505, lng: -46.6333, aliases: ['são paulo'] },
  { name: 'Rio de Janeiro', country: 'Brazil', lat: -22.9068, lng: -43.1729 },
  { name: 'Buenos Aires', country: 'Argentina', lat: -34.6037, lng: -58.3816 },
  { name: 'Santiago', country: 'Chile', lat: -33.4489, lng: -70.6693 },
  { name: 'Bogota', country: 'Colombia', lat: 4.711, lng: -74.0721 },
  { name: 'Lima', country: 'Peru', lat: -12.0464, lng: -77.0428 },
];

// Country-name aliases the resolver maps to a canonical country + centroid.
const COUNTRY_CENTROIDS: Record<string, { country: string; lat: number; lng: number }> = {
  usa: { country: 'USA', lat: 39.5, lng: -98.35 },
  'u.s.a': { country: 'USA', lat: 39.5, lng: -98.35 },
  'u.s': { country: 'USA', lat: 39.5, lng: -98.35 },
  us: { country: 'USA', lat: 39.5, lng: -98.35 },
  'united states': { country: 'USA', lat: 39.5, lng: -98.35 },
  canada: { country: 'Canada', lat: 56.13, lng: -106.35 },
  uk: { country: 'UK', lat: 54.0, lng: -2.0 },
  'united kingdom': { country: 'UK', lat: 54.0, lng: -2.0 },
  england: { country: 'UK', lat: 52.36, lng: -1.17 },
  ireland: { country: 'Ireland', lat: 53.41, lng: -8.24 },
  france: { country: 'France', lat: 46.6, lng: 2.21 },
  germany: { country: 'Germany', lat: 51.16, lng: 10.45 },
  spain: { country: 'Spain', lat: 40.46, lng: -3.75 },
  portugal: { country: 'Portugal', lat: 39.4, lng: -8.22 },
  italy: { country: 'Italy', lat: 41.87, lng: 12.57 },
  netherlands: { country: 'Netherlands', lat: 52.13, lng: 5.29 },
  switzerland: { country: 'Switzerland', lat: 46.82, lng: 8.23 },
  sweden: { country: 'Sweden', lat: 60.13, lng: 18.64 },
  poland: { country: 'Poland', lat: 51.92, lng: 19.15 },
  austria: { country: 'Austria', lat: 47.52, lng: 14.55 },
  belgium: { country: 'Belgium', lat: 50.5, lng: 4.47 },
  greece: { country: 'Greece', lat: 39.07, lng: 21.82 },
  turkey: { country: 'Turkey', lat: 38.96, lng: 35.24 },
  russia: { country: 'Russia', lat: 61.52, lng: 105.32 },
  india: { country: 'India', lat: 22.0, lng: 79.0 },
  china: { country: 'China', lat: 35.86, lng: 104.2 },
  japan: { country: 'Japan', lat: 36.2, lng: 138.25 },
  'south korea': { country: 'South Korea', lat: 35.91, lng: 127.77 },
  singapore: { country: 'Singapore', lat: 1.35, lng: 103.82 },
  australia: { country: 'Australia', lat: -25.27, lng: 133.78 },
  uae: { country: 'UAE', lat: 23.42, lng: 53.85 },
  'united arab emirates': { country: 'UAE', lat: 23.42, lng: 53.85 },
  qatar: { country: 'Qatar', lat: 25.35, lng: 51.18 },
  'saudi arabia': { country: 'Saudi Arabia', lat: 23.89, lng: 45.08 },
  israel: { country: 'Israel', lat: 31.05, lng: 34.85 },
  lebanon: { country: 'Lebanon', lat: 33.85, lng: 35.86 },
  lb: { country: 'Lebanon', lat: 33.85, lng: 35.86 },
  jordan: { country: 'Jordan', lat: 30.59, lng: 36.24 },
  egypt: { country: 'Egypt', lat: 26.82, lng: 30.8 },
  kenya: { country: 'Kenya', lat: -0.02, lng: 37.91 },
  nigeria: { country: 'Nigeria', lat: 9.08, lng: 8.68 },
  'south africa': { country: 'South Africa', lat: -30.56, lng: 22.94 },
  mexico: { country: 'Mexico', lat: 23.63, lng: -102.55 },
  brazil: { country: 'Brazil', lat: -14.24, lng: -51.93 },
  argentina: { country: 'Argentina', lat: -38.42, lng: -63.62 },
  chile: { country: 'Chile', lat: -35.68, lng: -71.54 },
  colombia: { country: 'Colombia', lat: 4.57, lng: -74.3 },
  peru: { country: 'Peru', lat: -9.19, lng: -75.02 },
  remote: { country: 'Remote', lat: 20, lng: 0 },
};

// Fast lookup of every searchable city name/alias -> row.
const CITY_INDEX = new Map<string, CityRow>();
for (const c of CITIES) {
  CITY_INDEX.set(c.name.toLowerCase(), c);
  for (const a of c.aliases ?? []) CITY_INDEX.set(a.toLowerCase(), c);
}
const CITY_NAMES = [...CITY_INDEX.keys()].sort((a, b) => b.length - a.length);

function toGeo(c: CityRow): GeoLocation {
  return { city: c.name, country: c.country, state: c.state, lat: c.lat, lng: c.lng };
}

/** Word-boundary test so "la" never matches inside "Orlando". */
function containsWord(haystack: string, needle: string): boolean {
  const re = new RegExp(
    `(^|[^a-z0-9])${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`,
  );
  return re.test(haystack);
}

/** Look up a known city by exact name/alias (word-boundary scan, longest-first). */
function findKnownCity(text: string): CityRow | undefined {
  for (const name of CITY_NAMES) {
    if (containsWord(text, name)) return CITY_INDEX.get(name);
  }
  return undefined;
}

/**
 * Resolve a "City, Qualifier" pair where the qualifier is a US state (code or
 * name) or a country. Unknown US cities fall back to the state centroid;
 * unknown international cities fall back to the country centroid.
 */
// Reduce a possibly-noisy city phrase ("Vice President of Operations Dubai") to
// its trailing 1-3 capitalized words ("Dubai") — the actual place name.
function cleanCityToken(phrase: string): string {
  const m = phrase
    .trim()
    .match(/([A-Z][a-zA-Z.'-]+(?:\s+(?:de|of|the)?\s*[A-Z][a-zA-Z.'-]+){0,2})\s*$/);
  return (m ? m[1] : phrase).trim();
}

function resolvePair(cityRaw: string, qualRaw: string): GeoLocation | undefined {
  const qualKey = qualRaw.trim().toLowerCase().replace(/\./g, '');
  const cityKey = cityRaw.trim().toLowerCase();
  // The city token may be embedded in a phrase ("... Operations Dubai"); look
  // for a known city inside it before falling back to the trailing-words token.
  const known = CITY_INDEX.get(cityKey) ?? findKnownCity(cityKey);

  // US state by 2-letter code or full name?
  const stateCode = US_STATES[qualKey.toUpperCase()]
    ? qualKey.toUpperCase()
    : STATE_NAME_TO_CODE[qualKey];
  if (stateCode) {
    if (known && known.country === 'USA') return toGeo(known);
    const st = US_STATES[stateCode];
    return { city: cleanCityToken(cityRaw), country: 'USA', state: stateCode, lat: st.lat, lng: st.lng };
  }

  // Country qualifier?
  const country = COUNTRY_CENTROIDS[qualKey];
  if (country) {
    if (known) return toGeo(known);
    return { city: cleanCityToken(cityRaw), country: country.country, lat: country.lat, lng: country.lng };
  }
  return undefined;
}

// "City, ST" or "City, Country" — captures the place token and its qualifier.
const PAIR_RE = /([A-Za-z][A-Za-z.\s'-]+?),\s*([A-Za-z][A-Za-z.\s]{0,24}?)(?=$|[|·•\n,])/;

/** Resolve a free-text location ("Austin, TX", "Dubai, UAE") to coordinates. */
export function geocode(input?: string): GeoLocation | undefined {
  if (!input) return undefined;
  const text = input.trim();

  // 1) Structured "City, Qualifier" — the most reliable signal.
  const pair = text.match(PAIR_RE);
  if (pair) {
    const resolved = resolvePair(pair[1], pair[2]);
    if (resolved) return resolved;
  }

  // 2) A known city named anywhere in the string (word-boundary).
  const known = findKnownCity(text.toLowerCase());
  if (known) return toGeo(known);

  // 3) A bare country name anywhere in the string.
  const lower = ` ${text.toLowerCase().replace(/\./g, '')} `;
  for (const [name, c] of Object.entries(COUNTRY_CENTROIDS)) {
    if (containsWord(lower, name)) {
      return { city: text.replace(/,.*$/, '').trim() || c.country, country: c.country, lat: c.lat, lng: c.lng };
    }
  }
  return undefined;
}

/** Scan a blob of text and return the first city it can find (word-boundary). */
export function findCityInText(text: string): GeoLocation | undefined {
  const lower = text.toLowerCase();
  const known = findKnownCity(lower);
  return known ? toGeo(known) : undefined;
}
