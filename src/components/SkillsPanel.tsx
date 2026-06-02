// Skill proficiency bars, with AI-aligned skills emphasized.
import { motion } from 'framer-motion';
import type { SkillStat } from '../lib/types';

export default function SkillsPanel({ skills }: { skills: SkillStat[] }) {
  if (skills.length === 0) return null;
  return (
    <div className="panel skills-panel">
      <h2 className="section-title">Capabilities</h2>
      <div className="skills-list">
        {skills.map((s, i) => (
          <div key={s.name} className={`skill ${s.aiAligned ? 'ai' : ''}`}>
            <div className="skill-head">
              <span className="skill-name">{s.name}</span>
              <span className="skill-pct">{Math.round(s.level * 100)}%</span>
            </div>
            <div className="skill-bar">
              <motion.span
                initial={{ width: 0 }}
                animate={{ width: `${Math.round(s.level * 100)}%` }}
                transition={{ delay: 0.2 + i * 0.05, duration: 0.6 }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
