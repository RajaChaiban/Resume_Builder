// One-shot generator: converts the us-atlas states TopoJSON into a plain
// GeoJSON FeatureCollection vendored at src/lib/us-states.geo.json so the app
// renders the US map fully offline with zero runtime topojson dependency.
//
//   node scripts/build-us-geo.mjs
//
// Re-run only when bumping us-atlas. The committed output is what ships.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { feature } from 'topojson-client';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const topo = JSON.parse(
  readFileSync(resolve(ROOT, 'node_modules/us-atlas/states-10m.json'), 'utf8'),
);

const states = feature(topo, topo.objects.states);
// Drop properties we don't use to keep the bundle lean; keep name for a11y.
const lean = {
  type: 'FeatureCollection',
  features: states.features.map((f) => ({
    type: 'Feature',
    properties: { name: f.properties?.name ?? '' },
    geometry: f.geometry,
  })),
};

const out = resolve(ROOT, 'src/lib/us-states.geo.json');
writeFileSync(out, JSON.stringify(lean));
console.log(`Wrote ${lean.features.length} states -> ${out}`);
