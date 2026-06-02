// Interactive globe plotting each located career node, with arcs tracing the
// journey between consecutive roles. Country polygons give the sphere real
// continents + borders, every country is named on hover, and clicking a country
// where the person worked opens a panel describing what they did there.
// Renders fully offline — no texture or geometry is fetched; country geometry is
// vendored at src/lib/world-countries.geo.json (see scripts/build-world-geo.mjs).
import { useEffect, useMemo, useRef, useState } from 'react';
import GlobeGL, { type GlobeMethods } from 'react-globe.gl';
import * as THREE from 'three';
import type { CareerProfile } from '../lib/types';
import { ERA_COLOR } from '../lib/eras';
import {
  WORLD_FEATURES,
  rolesByCountry,
  type CountryFeature,
} from '../lib/worldRegion';

// Country fill palette — earthy "printed map" tones on the cream sphere. Subtle
// ink by default so plotted roles stay the focus, with worked (teal), hovered,
// and selected (terracotta) states lifting a country out of the paper.
const CAP_BASE = 'rgba(40, 35, 28, 0.10)';
const CAP_WORKED = 'rgba(47, 107, 98, 0.34)';
const CAP_HOVER = 'rgba(63, 128, 121, 0.46)';
const CAP_SELECTED = 'rgba(191, 99, 54, 0.46)';
const SIDE = 'rgba(40, 35, 28, 0.12)';
const STROKE_BASE = 'rgba(40, 35, 28, 0.22)';
const STROKE_WORKED = 'rgba(47, 107, 98, 0.6)';

interface PointDatum {
  lat: number;
  lng: number;
  color: string;
  label: string;
  size: number;
}

interface ArcDatum {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: [string, string];
}

export default function Globe({ profile }: { profile: CareerProfile }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [size, setSize] = useState({ w: 600, h: 460 });
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  // Keep the canvas sized to its container.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { points, arcs } = useMemo(() => {
    const located = profile.nodes.filter((n) => n.location);
    const points: PointDatum[] = located.map((n) => ({
      lat: n.location!.lat,
      lng: n.location!.lng,
      color: ERA_COLOR[n.era],
      label: `${n.role} · ${n.employer} (${n.location!.city})`,
      size: 0.4 + n.aiRelevance * 0.6,
    }));
    const arcs: ArcDatum[] = [];
    for (let i = 1; i < located.length; i++) {
      const a = located[i - 1].location!;
      const b = located[i].location!;
      arcs.push({
        startLat: a.lat,
        startLng: a.lng,
        endLat: b.lat,
        endLng: b.lng,
        color: [ERA_COLOR[located[i - 1].era], ERA_COLOR[located[i].era]],
      });
    }
    return { points, arcs };
  }, [profile]);

  // Group located roles by the country whose polygon contains them (see
  // worldRegion.ts) so worked countries can be highlighted and described.
  const rolesByCountryMap = useMemo(() => rolesByCountry(profile), [profile]);

  // A textureless "printed paper" globe so nothing is loaded from the network.
  // A warm cream base with a soft emissive lift keeps the sphere reading as a
  // light, matte sheet on the paper background — not a glossy planet.
  const globeMaterial = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        color: '#efe6d4',
        emissive: '#e7dcc6',
        emissiveIntensity: 0.35,
        shininess: 3,
        transparent: true,
        opacity: 1,
      }),
    [],
  );

  // Keep the globe still — the user drags to rotate it — and frame the most
  // recent role so there's a sensible starting view.
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    const controls = g.controls();
    controls.autoRotate = false;
    controls.enableZoom = true;
    const last = [...profile.nodes].reverse().find((n) => n.location)?.location;
    if (last) g.pointOfView({ lat: last.lat, lng: last.lng, altitude: 2.2 }, 1200);
  }, [profile]);

  const capColor = (name: string) => {
    if (name === selected) return CAP_SELECTED;
    if (name === hovered) return CAP_HOVER;
    return rolesByCountryMap.has(name) ? CAP_WORKED : CAP_BASE;
  };

  const selectedRoles = selected ? rolesByCountryMap.get(selected) ?? [] : [];

  return (
    <div ref={wrapRef} className="globe-wrap">
      <GlobeGL
        ref={globeRef}
        width={size.w}
        height={size.h}
        backgroundColor="rgba(0,0,0,0)"
        globeMaterial={globeMaterial}
        showAtmosphere
        atmosphereColor="#3f8079"
        atmosphereAltitude={0.15}
        polygonsData={WORLD_FEATURES}
        polygonAltitude={(d) => {
          const name = (d as CountryFeature).properties.name;
          if (name === selected) return 0.05;
          if (name === hovered) return 0.04;
          return rolesByCountryMap.has(name) ? 0.02 : 0.008;
        }}
        polygonCapColor={(d) => capColor((d as CountryFeature).properties.name)}
        polygonSideColor={() => SIDE}
        polygonStrokeColor={(d) =>
          rolesByCountryMap.has((d as CountryFeature).properties.name)
            ? STROKE_WORKED
            : STROKE_BASE
        }
        polygonLabel={(d) => {
          const name = (d as CountryFeature).properties.name;
          const roles = rolesByCountryMap.get(name);
          const tail = roles?.length
            ? `<span class="globe-tip-sub">${roles.length} role${
                roles.length > 1 ? 's' : ''
              } · click for details</span>`
            : '';
          return `<div class="globe-tip"><b>${name}</b>${tail}</div>`;
        }}
        onPolygonHover={(d) =>
          setHovered(d ? (d as CountryFeature).properties.name : null)
        }
        onPolygonClick={(d) => {
          const name = (d as CountryFeature).properties.name;
          setSelected((cur) => (cur === name ? null : name));
        }}
        polygonsTransitionDuration={250}
        pointsData={points}
        pointLat="lat"
        pointLng="lng"
        pointColor="color"
        pointAltitude={0.04}
        pointRadius={(d) => (d as PointDatum).size}
        pointLabel="label"
        pointsMerge={false}
        arcsData={arcs}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor="color"
        arcStroke={0.5}
        arcDashLength={0.4}
        arcDashGap={0.15}
        arcDashAnimateTime={2200}
        arcAltitudeAutoScale={0.4}
      />

      {selected && (
        <aside className="country-card">
          <header className="country-card-head">
            <span className="country-card-name">{selected}</span>
            <button
              className="country-card-close"
              onClick={() => setSelected(null)}
              aria-label="Close"
            >
              ×
            </button>
          </header>
          {selectedRoles.length === 0 ? (
            <p className="country-card-empty">No roles recorded here.</p>
          ) : (
            <ul className="country-card-roles">
              {selectedRoles.map((n) => (
                <li key={n.id} className={`country-role era-${n.era}`}>
                  <div className="country-role-title">{n.role}</div>
                  <div className="country-role-meta">
                    {n.employer} · {n.location!.city} · {n.start} – {n.end}
                  </div>
                  {n.summary && <p className="country-role-summary">{n.summary}</p>}
                  {n.highlights.length > 0 && (
                    <ul className="country-role-highlights">
                      {n.highlights.slice(0, 3).map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </aside>
      )}
    </div>
  );
}
