// The forward-looking "AI era" projection.
import { motion } from 'framer-motion';
import type { CareerProfile } from '../lib/types';

export default function AIEraPanel({ aiEra }: { aiEra: CareerProfile['aiEra'] }) {
  return (
    <div className="panel aiera-panel">
      <h2 className="section-title">Specialization</h2>
      <div className="aiera-role">{aiEra.projectedRole}</div>
      {aiEra.narrative && <p className="aiera-narrative">{aiEra.narrative}</p>}
      {aiEra.augmentations.length > 0 && (
        <ul className="aiera-augs">
          {aiEra.augmentations.map((a, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + i * 0.08, duration: 0.4 }}
            >
              <span className="aug-spark">✦</span>
              {a}
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
