// Chronological, era-colored track of career chapters.
import { motion } from 'framer-motion';
import type { CareerNode, Era } from '../lib/types';

const ERA_LABEL: Record<Era, string> = {
  'pre-ai': 'Pre-AI',
  transition: 'Transition',
  'ai-era': 'AI Era',
};

function Node({ node, index }: { node: CareerNode; index: number }) {
  return (
    <motion.div
      className={`tl-card era-${node.era}`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.08, duration: 0.5 }}
    >
      <div className="tl-dates">
        {node.start} – {node.end}
        <span className="tl-era">{ERA_LABEL[node.era]}</span>
      </div>
      <div className="tl-role">{node.role}</div>
      <div className="tl-employer">
        {node.employer}
        {node.location ? ` · ${node.location.city}` : ''}
      </div>
      {node.highlights.length > 0 && (
        <ul className="tl-highlights">
          {node.highlights.slice(0, 3).map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ul>
      )}
      <div className="tl-ai" title={`AI relevance ${Math.round(node.aiRelevance * 100)}%`}>
        <span style={{ width: `${Math.round(node.aiRelevance * 100)}%` }} />
      </div>
    </motion.div>
  );
}

export default function Timeline({ nodes }: { nodes: CareerNode[] }) {
  if (nodes.length === 0) return null;
  return (
    <div className="timeline">
      <h2 className="section-title">Trajectory</h2>
      <div className="tl-track">
        {nodes.map((n, i) => (
          <Node key={n.id} node={n} index={i} />
        ))}
      </div>
    </div>
  );
}
