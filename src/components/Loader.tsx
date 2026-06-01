// Full-screen "the agent is thinking" sequence. Cycles through phases so the
// transform feels like an intelligent process, not a spinner.
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const PHASES = [
  'Reading your history',
  'Extracting roles & milestones',
  'Geolocating your journey',
  'Scoring AI alignment',
  'Projecting your AI-era future',
  'Rendering your constellation',
];

export default function Loader({ error }: { error?: string }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (error) return;
    const id = setInterval(() => setPhase((p) => Math.min(p + 1, PHASES.length - 1)), 700);
    return () => clearInterval(id);
  }, [error]);

  return (
    <motion.div className="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="loader-orb">
        <span />
        <span />
        <span />
      </div>
      {error ? (
        <div className="loader-error">{error}</div>
      ) : (
        <div className="loader-phases">
          {PHASES.map((p, i) => (
            <div key={p} className={`loader-phase ${i === phase ? 'active' : ''} ${i < phase ? 'done' : ''}`}>
              <span className="tick">{i < phase ? '✓' : '○'}</span>
              {p}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
