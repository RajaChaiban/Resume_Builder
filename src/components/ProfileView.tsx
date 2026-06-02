// Composes the full career visualization from a CareerProfile.
import { useState } from 'react';
import { motion } from 'framer-motion';
import type { CareerProfile } from '../lib/types';
import { mapMode } from '../lib/region';
import { ERA_COLOR, ERA_LABEL } from '../lib/eras';
import type { Era } from '../lib/types';
import Globe from './Globe';
import UsMap from './UsMap';
import WorldAtlas from './WorldAtlas';
import Timeline from './Timeline';
import SkillsPanel from './SkillsPanel';
import AIEraPanel from './AIEraPanel';

type MapView = 'globe' | 'atlas';

const SOURCE_LABEL: Record<CareerProfile['source'], string> = {
  sample: 'Sample profile',
  heuristic: 'Parsed locally',
  claude: 'Enhanced by Claude',
};

// Distinct places in the journey — cities for a US-only career, countries
// otherwise — used for the legend's "N roles · M countries" readout.
function locationCount(profile: CareerProfile): number {
  const located = profile.nodes.filter((n) => n.location);
  const us = mapMode(profile) === 'us';
  const keys = located.map((n) =>
    us ? n.location!.city : n.location!.country ?? n.location!.city,
  );
  return new Set(keys).size;
}

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || '★'
  );
}

export default function ProfileView({ profile }: { profile: CareerProfile }) {
  const [mapView, setMapView] = useState<MapView>('globe');
  // For US-only careers the flat "Atlas" is the detailed US states map;
  // otherwise it's the world atlas. The 3D globe is always available.
  const isUs = mapMode(profile) === 'us';

  return (
    <motion.div
      className="profile"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <header className="profile-head">
        <div className="profile-grid">
          <div className="avatar-monogram" aria-hidden="true">
            <span>{initialsOf(profile.name)}</span>
          </div>
          <div className="profile-main">
            <span className={`source-badge src-${profile.source}`}>
              {SOURCE_LABEL[profile.source]}
            </span>
            <h1 className="profile-name">{profile.name}</h1>
            <div className="profile-title">{profile.title}</div>
            <p className="profile-tagline">{profile.tagline}</p>
            {profile.summary && (
              <p className="profile-summary">{profile.summary}</p>
            )}
            <div className="profile-meta">
              {profile.location && <span>{profile.location}</span>}
              {profile.email && <span>{profile.email}</span>}
              {profile.links.map((l) => (
                <a key={l.url} href={l.url} target="_blank" rel="noreferrer">
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="profile-stack">
        <AIEraPanel aiEra={profile.aiEra} />

        <div className="map-section">
          <div className="map-tabs" role="tablist" aria-label="Map view">
            <button
              role="tab"
              aria-selected={mapView === 'globe'}
              className={`map-tab ${mapView === 'globe' ? 'active' : ''}`}
              onClick={() => setMapView('globe')}
            >
              Globe
            </button>
            <button
              role="tab"
              aria-selected={mapView === 'atlas'}
              className={`map-tab ${mapView === 'atlas' ? 'active' : ''}`}
              onClick={() => setMapView('atlas')}
            >
              Atlas
            </button>
          </div>

          <div className="globe-col">
            {mapView === 'globe' ? (
              <Globe profile={profile} />
            ) : isUs ? (
              <UsMap profile={profile} />
            ) : (
              <WorldAtlas profile={profile} />
            )}
          </div>

          <div className="map-legend">
            {(['pre-ai', 'transition', 'ai-era'] as Era[]).map((era) => (
              <span className="legend-item" key={era}>
                <span
                  className="legend-swatch"
                  style={{ background: ERA_COLOR[era] }}
                />
                {ERA_LABEL[era]}
              </span>
            ))}
            <span className="legend-spacer" />
            <span className="legend-count">
              {profile.nodes.length} role
              {profile.nodes.length === 1 ? '' : 's'} ·{' '}
              {locationCount(profile)}{' '}
              {isUs ? 'cities' : 'countries'}
            </span>
          </div>
        </div>

        <SkillsPanel skills={profile.skills} />
      </div>

      <Timeline nodes={profile.nodes} />
    </motion.div>
  );
}
