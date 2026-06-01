// Composes the full career visualization from a CareerProfile.
import { motion } from 'framer-motion';
import type { CareerProfile } from '../lib/types';
import Globe from './Globe';
import Timeline from './Timeline';
import SkillsPanel from './SkillsPanel';
import AIEraPanel from './AIEraPanel';

const SOURCE_LABEL: Record<CareerProfile['source'], string> = {
  sample: 'Sample profile',
  heuristic: 'Parsed locally',
  claude: 'Enhanced by Claude',
};

export default function ProfileView({ profile }: { profile: CareerProfile }) {
  return (
    <motion.div
      className="profile"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <header className="profile-head">
        <span className={`source-badge src-${profile.source}`}>
          {SOURCE_LABEL[profile.source]}
        </span>
        <h1 className="profile-name">{profile.name}</h1>
        <div className="profile-title">{profile.title}</div>
        <p className="profile-tagline">{profile.tagline}</p>
        {profile.summary && <p className="profile-summary">{profile.summary}</p>}
        <div className="profile-meta">
          {profile.location && <span>{profile.location}</span>}
          {profile.email && <span>{profile.email}</span>}
          {profile.links.map((l) => (
            <a key={l.url} href={l.url} target="_blank" rel="noreferrer">
              {l.label}
            </a>
          ))}
        </div>
      </header>

      <div className="profile-grid">
        <div className="globe-col">
          <Globe profile={profile} />
        </div>
        <div className="panels-col">
          <SkillsPanel skills={profile.skills} />
          <AIEraPanel aiEra={profile.aiEra} />
        </div>
      </div>

      <Timeline nodes={profile.nodes} />
    </motion.div>
  );
}
