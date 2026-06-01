// Offline geocoder. A built-in lookup so the globe works with zero network
// calls. Covers major world cities + country centroids as a fallback.
import type { GeoLocation } from './types';

interface CityRow {
  name: string;
  country: string;
  lat: number;
  lng: number;
  aliases?: string[];
}

const CITIES: CityRow[] = [
  { name: 'San Francisco', country: 'USA', lat: 37.7749, lng: -122.4194, aliases: ['sf', 'san francisco bay area'] },
  { name: 'San Jose', country: 'USA', lat: 37.3382, lng: -121.8863 },
  { name: 'Palo Alto', country: 'USA', lat: 37.4419, lng: -122.143 },
  { name: 'Mountain View', country: 'USA', lat: 37.3861, lng: -122.0839 },
  { name: 'Seattle', country: 'USA', lat: 47.6062, lng: -122.3321 },
  { name: 'Los Angeles', country: 'USA', lat: 34.0522, lng: -118.2437, aliases: ['la'] },
  { name: 'New York', country: 'USA', lat: 40.7128, lng: -74.006, aliases: ['nyc', 'new york city', 'manhattan'] },
  { name: 'Boston', country: 'USA', lat: 42.3601, lng: -71.0589 },
  { name: 'Austin', country: 'USA', lat: 30.2672, lng: -97.7431 },
  { name: 'Dallas', country: 'USA', lat: 32.7767, lng: -96.797 },
  { name: 'Houston', country: 'USA', lat: 29.7604, lng: -95.3698 },
  { name: 'Chicago', country: 'USA', lat: 41.8781, lng: -87.6298 },
  { name: 'Denver', country: 'USA', lat: 39.7392, lng: -104.9903 },
  { name: 'Atlanta', country: 'USA', lat: 33.749, lng: -84.388 },
  { name: 'Miami', country: 'USA', lat: 25.7617, lng: -80.1918 },
  { name: 'Washington', country: 'USA', lat: 38.9072, lng: -77.0369, aliases: ['washington dc', 'dc'] },
  { name: 'Toronto', country: 'Canada', lat: 43.6532, lng: -79.3832 },
  { name: 'Vancouver', country: 'Canada', lat: 49.2827, lng: -123.1207 },
  { name: 'Montreal', country: 'Canada', lat: 45.5017, lng: -73.5673 },
  { name: 'London', country: 'UK', lat: 51.5074, lng: -0.1278 },
  { name: 'Manchester', country: 'UK', lat: 53.4808, lng: -2.2426 },
  { name: 'Dublin', country: 'Ireland', lat: 53.3498, lng: -6.2603 },
  { name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522 },
  { name: 'Berlin', country: 'Germany', lat: 52.52, lng: 13.405 },
  { name: 'Munich', country: 'Germany', lat: 48.1351, lng: 11.582 },
  { name: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lng: 4.9041 },
  { name: 'Madrid', country: 'Spain', lat: 40.4168, lng: -3.7038 },
  { name: 'Barcelona', country: 'Spain', lat: 41.3851, lng: 2.1734 },
  { name: 'Lisbon', country: 'Portugal', lat: 38.7223, lng: -9.1393 },
  { name: 'Zurich', country: 'Switzerland', lat: 47.3769, lng: 8.5417 },
  { name: 'Stockholm', country: 'Sweden', lat: 59.3293, lng: 18.0686 },
  { name: 'Milan', country: 'Italy', lat: 45.4642, lng: 9.19 },
  { name: 'Rome', country: 'Italy', lat: 41.9028, lng: 12.4964 },
  { name: 'Warsaw', country: 'Poland', lat: 52.2297, lng: 21.0122 },
  { name: 'Tel Aviv', country: 'Israel', lat: 32.0853, lng: 34.7818 },
  { name: 'Dubai', country: 'UAE', lat: 25.2048, lng: 55.2708 },
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
  { name: 'Sao Paulo', country: 'Brazil', lat: -23.5505, lng: -46.6333, aliases: ['são paulo'] },
  { name: 'Mexico City', country: 'Mexico', lat: 19.4326, lng: -99.1332 },
  { name: 'Buenos Aires', country: 'Argentina', lat: -34.6037, lng: -58.3816 },
  { name: 'Cairo', country: 'Egypt', lat: 30.0444, lng: 31.2357 },
  { name: 'Beirut', country: 'Lebanon', lat: 33.8938, lng: 35.5018 },
  { name: 'Nairobi', country: 'Kenya', lat: -1.2921, lng: 36.8219 },
  { name: 'Lagos', country: 'Nigeria', lat: 6.5244, lng: 3.3792 },
  { name: 'Cape Town', country: 'South Africa', lat: -33.9249, lng: 18.4241 },
];

const COUNTRY_CENTROIDS: Record<string, [number, number]> = {
  usa: [39.5, -98.35],
  'united states': [39.5, -98.35],
  canada: [56.13, -106.35],
  uk: [54.0, -2.0],
  'united kingdom': [54.0, -2.0],
  india: [22.0, 79.0],
  germany: [51.16, 10.45],
  france: [46.6, 2.21],
  australia: [-25.27, 133.78],
  japan: [36.2, 138.25],
  china: [35.86, 104.2],
  brazil: [-14.24, -51.93],
  remote: [20, 0],
};

// Build a fast lookup of every searchable name -> row.
const INDEX = new Map<string, CityRow>();
for (const c of CITIES) {
  INDEX.set(c.name.toLowerCase(), c);
  for (const a of c.aliases ?? []) INDEX.set(a.toLowerCase(), c);
}

function toGeo(c: CityRow): GeoLocation {
  return { city: c.name, country: c.country, lat: c.lat, lng: c.lng };
}

/** Resolve a free-text location ("Austin, TX") to coordinates, or undefined. */
export function geocode(input?: string): GeoLocation | undefined {
  if (!input) return undefined;
  const text = input.toLowerCase();
  // Exact-ish: try each known name as a substring (longest first wins).
  const names = [...INDEX.keys()].sort((a, b) => b.length - a.length);
  for (const name of names) {
    if (text.includes(name)) return toGeo(INDEX.get(name)!);
  }
  for (const [country, [lat, lng]] of Object.entries(COUNTRY_CENTROIDS)) {
    if (text.includes(country)) return { city: input.trim(), country, lat, lng };
  }
  return undefined;
}

/** Scan a blob of text and return the first city it can find. */
export function findCityInText(text: string): GeoLocation | undefined {
  const lower = text.toLowerCase();
  const names = [...INDEX.keys()].sort((a, b) => b.length - a.length);
  for (const name of names) {
    // word-ish boundary to avoid matching "la" inside "platform"
    const re = new RegExp(`(^|[^a-z])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`);
    if (re.test(lower)) return toGeo(INDEX.get(name)!);
  }
  return undefined;
}
