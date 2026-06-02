// One-shot generator: converts the world-atlas countries TopoJSON into a plain
// GeoJSON FeatureCollection vendored at src/lib/world-countries.geo.json so the
// globe renders continents + country borders fully offline, with zero runtime
// topojson dependency.
//
//   node scripts/build-world-geo.mjs
//
// Re-run only when bumping world-atlas. The committed output is what ships.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { feature } from 'topojson-client';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const topo = JSON.parse(
  readFileSync(resolve(ROOT, 'node_modules/world-atlas/countries-110m.json'), 'utf8'),
);

const countries = feature(topo, topo.objects.countries);
// Drop properties we don't use to keep the bundle lean; keep name for labels
// and a numeric id so React keys stay stable.
const lean = {
  type: 'FeatureCollection',
  features: countries.features
    // Antarctica adds bulk and never carries a career node — drop it.
    .filter((f) => (f.properties?.name ?? '') !== 'Antarctica')
    .map((f) => ({
      type: 'Feature',
      id: f.id,
      properties: { name: f.properties?.name ?? '' },
      geometry: f.geometry,
    })),
};

const out = resolve(ROOT, 'src/lib/world-countries.geo.json');
writeFileSync(out, JSON.stringify(lean));
console.log(`Wrote ${lean.features.length} countries -> ${out}`);
