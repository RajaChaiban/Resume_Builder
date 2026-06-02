// Flat 2D world map ("Atlas") — the pannable/zoomable counterpart to the 3D
// globe, shown via the Globe/Atlas tab for international careers. Same data as
// the globe: worked countries are highlighted, era-colored points mark each
// role, and clicking a worked country opens the same description card.
//
// The journey auto-plays on load: the arcs between jobs draw one-by-one in
// chronological order and each dot pops in as the path reaches it, tracing the
// person's movement from role to role. A replay control re-runs the sequence.
// Fully offline (country geometry vendored in worldRegion.ts).
import { useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import type { CareerNode, CareerProfile, Era } from '../lib/types';
import { ERA_COLOR } from '../lib/eras';
import { WORLD_FEATURES, rolesByCountry } from '../lib/worldRegion';

const W = 960;
const H = 500;
const projection = geoNaturalEarth1().fitSize([W, H], {
  type: 'FeatureCollection',
  features: WORLD_FEATURES,
});
const pathGen = geoPath(projection);
const COUNTRY_PATHS = WORLD_FEATURES.map((f) => ({
  name: f.properties.name,
  d: pathGen(f),
})).filter((c): c is { name: string; d: string } => c.d != null);

const K_MIN = 1;
const K_MAX = 6;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// Journey choreography. Each leg gets STEP seconds; a dot pops in at the start
// of its step and the arc leaving it draws across the gap to the next dot.
const STEP = 0.85;
const DOT_POP = 0.4;
const ARC_DUR = 0.7;

interface DotDatum {
  x: number;
  y: number;
  era: Era;
  r: number;
}
interface ArcDatum {
  d: string;
  from: Era;
  to: Era;
  id: string;
  srcIndex: number; // index of the dot this arc departs from
}

export default function WorldAtlas({ profile }: { profile: CareerProfile }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState({ k: 1, panX: 0, panY: 0 });
  // Bumping playId remounts the journey layer, which restarts the animation.
  const [playId, setPlayId] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const reduce = useReducedMotion();

  // Reset pan/zoom + selection and replay the journey when a new profile loads
  // (render-time sync, React's recommended alternative to a setState-in-effect).
  const [prevProfile, setPrevProfile] = useState(profile);
  if (profile !== prevProfile) {
    setPrevProfile(profile);
    setView({ k: 1, panX: 0, panY: 0 });
    setSelected(null);
    setPlayId((n) => n + 1);
  }

  const rolesMap = useMemo(() => rolesByCountry(profile), [profile]);

  const { points, arcs } = useMemo(() => {
    const pts: DotDatum[] = [];
    const proj: [number, number][] = [];
    const eras: Era[] = [];
    for (const n of profile.nodes) {
      if (!n.location) continue;
      const xy = projection([n.location.lng, n.location.lat]);
      if (!xy) continue;
      proj.push(xy);
      eras.push(n.era);
      pts.push({ x: xy[0], y: xy[1], era: n.era, r: 3 + n.aiRelevance * 5 });
    }
    const arcs: ArcDatum[] = [];
    for (let i = 1; i < proj.length; i++) {
      const [ax, ay] = proj[i - 1];
      const [bx, by] = proj[i];
      if (ax === bx && ay === by) continue;
      const len = Math.hypot(bx - ax, by - ay);
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2 - len * 0.3;
      arcs.push({
        d: `M${ax},${ay} Q${mx},${my} ${bx},${by}`,
        from: eras[i - 1],
        to: eras[i],
        id: `wa-arc-${i}`,
        srcIndex: i - 1,
      });
    }
    return { points: pts, arcs };
  }, [profile]);

  // Zoom anchored to the viewport centre keeps the math simple and predictable.
  const zoomBy = (factor: number) =>
    setView((v) => ({ ...v, k: clamp(v.k * factor, K_MIN, K_MAX) }));

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 1.2 : 1 / 1.2);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, moved: false };
    (e.currentTarget as SVGSVGElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.current.moved = true;
    const rect = svgRef.current?.getBoundingClientRect();
    const scale = rect ? W / rect.width : 1; // screen px -> viewBox units
    drag.current.x = e.clientX;
    drag.current.y = e.clientY;
    setView((v) => ({ ...v, panX: v.panX + dx * scale, panY: v.panY + dy * scale }));
  };
  const endDrag = () => {
    const moved = drag.current?.moved;
    drag.current = null;
    return moved;
  };

  const pickCountry = (name: string) => {
    if (drag.current?.moved) return; // ignore clicks that were really pans
    if (rolesMap.has(name)) setSelected((cur) => (cur === name ? null : name));
    else setSelected(null);
  };

  // translate keeps the viewport centre fixed while scaling, then applies pan.
  const tx = (W / 2) * (1 - view.k) + view.panX;
  const ty = (H / 2) * (1 - view.k) + view.panY;
  const dotScale = 1 / view.k; // keep markers a constant on-screen size

  const selectedRoles = selected ? rolesMap.get(selected) ?? [] : [];

  return (
    <div className="us-map-wrap atlas-wrap">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="us-map atlas-map"
        role="img"
        aria-label="World career atlas — animated journey between roles"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        <defs>
          {arcs.map((arc) => (
            <linearGradient key={arc.id} id={arc.id} gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={ERA_COLOR[arc.from]} />
              <stop offset="100%" stopColor={ERA_COLOR[arc.to]} />
            </linearGradient>
          ))}
        </defs>

        <g transform={`translate(${tx},${ty}) scale(${view.k})`}>
          <g className="atlas-countries">
            {COUNTRY_PATHS.map((c) => {
              const worked = rolesMap.has(c.name);
              return (
                <path
                  key={c.name}
                  d={c.d}
                  className={`${worked ? 'worked' : ''} ${c.name === selected ? 'selected' : ''}`}
                  onClick={() => pickCountry(c.name)}
                >
                  {worked && <title>{c.name} — click for details</title>}
                </path>
              );
            })}
          </g>

          {/* Journey layer — remounts on playId change to replay the sequence. */}
          <g key={`journey-${playId}`}>
            <g className="atlas-journey">
              {arcs.map((arc) => (
                <motion.path
                  key={arc.id}
                  d={arc.d}
                  stroke={`url(#${arc.id})`}
                  vectorEffect="non-scaling-stroke"
                  initial={{ pathLength: reduce ? 1 : 0 }}
                  animate={{ pathLength: 1 }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : { delay: arc.srcIndex * STEP + DOT_POP * 0.5, duration: ARC_DUR, ease: 'easeInOut' }
                  }
                />
              ))}
            </g>

            <g className="us-dots atlas-dots">
              {points.map((p, i) => {
                const haloR = p.r * 2.2 * dotScale;
                const dotR = p.r * dotScale;
                const tr = reduce ? { duration: 0 } : { delay: i * STEP, duration: DOT_POP, ease: 'backOut' as const };
                return (
                  <g key={i} transform={`translate(${p.x},${p.y})`}>
                    <motion.circle
                      className="us-dot-halo"
                      fill={ERA_COLOR[p.era]}
                      initial={{ r: reduce ? haloR : 0 }}
                      animate={{ r: haloR }}
                      transition={tr}
                    />
                    <motion.circle
                      fill={ERA_COLOR[p.era]}
                      initial={{ r: reduce ? dotR : 0 }}
                      animate={{ r: dotR }}
                      transition={tr}
                    />
                  </g>
                );
              })}
            </g>
          </g>
        </g>
      </svg>

      <div className="atlas-zoom" aria-hidden="true">
        <button onClick={() => zoomBy(1.3)} aria-label="Zoom in">+</button>
        <button onClick={() => zoomBy(1 / 1.3)} aria-label="Zoom out">−</button>
      </div>

      <button
        className="atlas-replay"
        onClick={() => setPlayId((n) => n + 1)}
        aria-label="Replay the journey animation"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Replay journey
      </button>

      {selected && (
        <aside className="country-card">
          <header className="country-card-head">
            <span className="country-card-name">{selected}</span>
            <button className="country-card-close" onClick={() => setSelected(null)} aria-label="Close">
              ×
            </button>
          </header>
          {selectedRoles.length === 0 ? (
            <p className="country-card-empty">No roles recorded here.</p>
          ) : (
            <ul className="country-card-roles">
              {selectedRoles.map((n: CareerNode) => (
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
