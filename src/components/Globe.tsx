// Interactive globe plotting each located career node, with arcs tracing the
// journey between consecutive roles. Renders fully offline — no texture is
// fetched; the globe uses a dark emissive material instead.
import { useEffect, useMemo, useRef, useState } from 'react';
import GlobeGL, { type GlobeMethods } from 'react-globe.gl';
import * as THREE from 'three';
import type { CareerProfile } from '../lib/types';
import { ERA_COLOR } from '../lib/eras';

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

  // A self-lit, textureless globe so nothing is loaded from the network. The
  // emissive blue keeps the sphere clearly visible against the dark backdrop —
  // a near-black material here reads as empty space, not a globe.
  const globeMaterial = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        color: '#172554',
        emissive: '#1e3a8a',
        emissiveIntensity: 0.55,
        shininess: 12,
        transparent: true,
        opacity: 0.98,
      }),
    [],
  );

  // Auto-rotate and frame the most recent role.
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    const controls = g.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.6;
    controls.enableZoom = true;
    const last = [...profile.nodes].reverse().find((n) => n.location)?.location;
    if (last) g.pointOfView({ lat: last.lat, lng: last.lng, altitude: 2.2 }, 1200);
  }, [profile]);

  return (
    <div ref={wrapRef} className="globe-wrap">
      <GlobeGL
        ref={globeRef}
        width={size.w}
        height={size.h}
        backgroundColor="rgba(0,0,0,0)"
        globeMaterial={globeMaterial}
        showAtmosphere
        atmosphereColor="#6d5dfc"
        atmosphereAltitude={0.18}
        pointsData={points}
        pointLat="lat"
        pointLng="lng"
        pointColor="color"
        pointAltitude={0.02}
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
    </div>
  );
}
