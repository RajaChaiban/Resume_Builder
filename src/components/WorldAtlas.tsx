// Flat 2D world map ("Atlas") — the dotted/editorial counterpart to the 3D
// globe, shown via the Globe/Atlas tab for international careers. Matches the
// Claude Design "paper atlas" visual: a faint graticule, land rendered as a
// stippled field of dots, era-colored journey arcs, and glowing role pins.
//
// The dots are sampled from the *real* country geometry (worldRegion.ts) so the
// continents are geographically accurate, not hand-drawn. The journey auto-plays
// on load — arcs draw between jobs in chronological order and each pin pops in as
// the path reaches it. Clicking a pin opens the role(s) worked there. Offline.
import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { geoEquirectangular, geoPath, geoContains, geoGraticule10 } from 'd3-geo';
import type { CareerNode, CareerProfile, Era } from '../lib/types';
import { ERA_COLOR } from '../lib/eras';
import { WORLD_FEATURES } from '../lib/worldRegion';

const W = 960;
const H = 480;
const WORLD_FC = { type: 'FeatureCollection' as const, features: WORLD_FEATURES };
const projection = geoEquirectangular().fitSize([W, H], WORLD_FC);
const pathGen = geoPath(projection);

// Faint lat/lon graticule behind the land, drawn once.
const GRATICULE_D = pathGen(geoGraticule10()) ?? '';

// Stippled land: sample a lon/lat grid and keep the points that fall on land,
// projected to screen space. Computed once at module load.
const LAND_DOTS: [number, number][] = (() => {
  const dots: [number, number][] = [];
  for (let lat = 80; lat >= -58; lat -= 4.2) {
    for (let lng = -180; lng <= 180; lng += 4.2) {
      if (geoContains(WORLD_FC, [lng, lat])) {
        const xy = projection([lng, lat]);
        if (xy) dots.push(xy);
      }
    }
  }
  return dots;
})();

// Journey choreography (seconds): a pin pops in at the start of its step and the
// arc leaving it draws across to the next pin.
const STEP = 0.85;
const DOT_POP = 0.4;
const ARC_DUR = 0.7;

interface Pin {
  key: string; // city key
  x: number;
  y: number;
  era: Era;
  r: number;
  roles: CareerNode[];
}
interface Arc {
  d: string;
  from: Era;
  to: Era;
  id: string;
  srcIndex: number;
}

const cityKey = (n: CareerNode) =>
  `${n.location!.city}|${n.location!.state ?? n.location!.country ?? ''}`;

export default function WorldAtlas({ profile }: { profile: CareerProfile }) {
  const [selected, setSelected] = useState<string | null>(null);
  // Bumping playId remounts the journey layer, restarting the animation.
  const [playId, setPlayId] = useState(0);
  const reduce = useReducedMotion();

  // Reset selection + replay the journey when a new profile loads (render-time
  // sync, React's recommended alternative to a setState-in-effect).
  const [prevProfile, setPrevProfile] = useState(profile);
  if (profile !== prevProfile) {
    setPrevProfile(profile);
    setSelected(null);
    setPlayId((n) => n + 1);
  }

  const { steps, arcs } = useMemo(() => {
    // One step per located role, in chronological order — drives the stagger.
    const located = profile.nodes.filter((n) => n.location);
    const steps = located.map((n) => {
      const [x, y] = projection([n.location!.lng, n.location!.lat]) ?? [0, 0];
      return { node: n, x, y };
    });
    const arcs: Arc[] = [];
    for (let i = 1; i < steps.length; i++) {
      const a = steps[i - 1];
      const b = steps[i];
      if (a.x === b.x && a.y === b.y) continue;
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2 - len * 0.3 - 14;
      arcs.push({
        d: `M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}`,
        from: a.node.era,
        to: b.node.era,
        id: `wa-arc-${i}`,
        srcIndex: i - 1,
      });
    }
    return { steps, arcs };
  }, [profile]);

  // Group steps into one pin per city (a pin keeps every role worked there).
  const pins = useMemo(() => {
    const byCity = new Map<string, Pin & { firstStep: number }>();
    steps.forEach((s, i) => {
      const key = cityKey(s.node);
      const existing = byCity.get(key);
      if (existing) {
        existing.roles.push(s.node);
        existing.era = s.node.era; // latest era wins
        existing.r = Math.max(existing.r, 3 + s.node.aiRelevance * 5);
      } else {
        byCity.set(key, {
          key,
          x: s.x,
          y: s.y,
          era: s.node.era,
          r: 3 + s.node.aiRelevance * 5,
          roles: [s.node],
          firstStep: i,
        });
      }
    });
    return [...byCity.values()];
  }, [steps]);

  const selectedRoles = selected
    ? pins.find((p) => p.key === selected)?.roles ?? []
    : [];
  const selectedName = selected
    ? (() => {
        const r = pins.find((p) => p.key === selected)?.roles[0];
        return r ? r.location!.city : selected;
      })()
    : '';

  return (
    <div className="us-map-wrap atlas-wrap">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="atlas-dotmap"
        role="img"
        aria-label="World career atlas — animated journey between roles"
      >
        <defs>
          {arcs.map((arc) => (
            <linearGradient key={arc.id} id={arc.id} gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={ERA_COLOR[arc.from]} />
              <stop offset="100%" stopColor={ERA_COLOR[arc.to]} />
            </linearGradient>
          ))}
        </defs>

        {/* faint graticule */}
        <path className="atlas-grat" d={GRATICULE_D} />

        {/* stippled land */}
        <g className="atlas-land">
          {LAND_DOTS.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={1.4} />
          ))}
        </g>

        {/* journey — remounts on playId change to replay */}
        <g key={`journey-${playId}`}>
          <g className="atlas-journey">
            {arcs.map((arc) => (
              <motion.path
                key={arc.id}
                d={arc.d}
                stroke={`url(#${arc.id})`}
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

          <g className="atlas-pins">
            {pins.map((p) => {
              const tr = reduce
                ? { duration: 0 }
                : { delay: p.firstStep * STEP, duration: DOT_POP, ease: 'backOut' as const };
              const active = p.key === selected;
              return (
                <g
                  key={p.key}
                  className={`atlas-pin ${active ? 'on' : ''}`}
                  transform={`translate(${p.x},${p.y})`}
                  onClick={() => setSelected((cur) => (cur === p.key ? null : p.key))}
                  role="button"
                  aria-label={`${p.roles[0].location!.city} — ${p.roles.length} role${p.roles.length > 1 ? 's' : ''}`}
                >
                  <motion.circle
                    className="atlas-pin-halo"
                    fill={ERA_COLOR[p.era]}
                    initial={{ r: reduce ? 11 : 0 }}
                    animate={{ r: active ? 14 : 11 }}
                    transition={tr}
                  />
                  <motion.circle
                    className="atlas-pin-dot"
                    fill={ERA_COLOR[p.era]}
                    stroke="#fffaf2"
                    strokeWidth={1.2}
                    initial={{ r: reduce ? 4.4 : 0 }}
                    animate={{ r: active ? 5.4 : 4.4 }}
                    transition={tr}
                  />
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {selected && (
        <aside className="country-card">
          <header className="country-card-head">
            <span className="country-card-name">{selectedName}</span>
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
