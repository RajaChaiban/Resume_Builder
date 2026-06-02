// Compact zig-zag career timeline. Chapters alternate above / below a single
// center rail so the whole journey fits on the page with no horizontal scroll.
// Each chapter shows its dates, role, employer · city, and the skills gained —
// a clean chronological pipeline (no AI-relevance meter, no era framing).
import { motion } from 'framer-motion';
import type { CareerNode } from '../lib/types';

function Chapter({ node, index }: { node: CareerNode; index: number }) {
  // First chapter hangs below the rail, the next above, and so on.
  const side = index % 2 === 0 ? 'down' : 'up';
  return (
    <div className={`tl-col ${side}`} style={{ gridColumn: index + 1 }}>
      <motion.article
        className="tl-mini"
        initial={{ opacity: 0, y: side === 'up' ? 16 : -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 + index * 0.08, duration: 0.5 }}
      >
        <div className="tl-dates">
          {node.start} — {node.end}
        </div>
        <div className="tl-role">{node.role}</div>
        <div className="tl-emp">
          <strong>{node.employer}</strong>
          {node.location && (
            <>
              <span className="dot-sep">·</span>
              {node.location.city}
            </>
          )}
        </div>
        {node.skills.length > 0 && (
          <div className="tl-skills">
            <div className="tl-skillgroup">
              <span className="tl-skill-label">Skills gained</span>
              <div className="tl-chips">
                {node.skills.map((s) => (
                  <span className="tl-chip tech" key={s}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </motion.article>
      <span className="tl-pnode" />
    </div>
  );
}

export default function Timeline({ nodes }: { nodes: CareerNode[] }) {
  if (nodes.length === 0) return null;
  return (
    <div className="panel timeline">
      <h2 className="section-title">Trajectory</h2>
      <div
        className="tl-grid"
        style={{ gridTemplateColumns: `repeat(${nodes.length}, minmax(0, 1fr))` }}
      >
        <div className="tl-rail" aria-hidden="true" />
        {nodes.map((n, i) => (
          <Chapter key={n.id} node={n} index={i} />
        ))}
      </div>
    </div>
  );
}
