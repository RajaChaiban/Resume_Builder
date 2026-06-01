import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import './App.css';
import { filesToText } from './lib/parse';
import { extractProfile } from './lib/extract';
import { parseClaudeProfile } from './lib/claudeProfile';
import { SAMPLE_PROFILE } from './lib/sample';
import type { CareerProfile } from './lib/types';
import Starfield from './components/Starfield';
import Uploader from './components/Uploader';
import Loader from './components/Loader';
import ProfileView from './components/ProfileView';

type Status = 'idle' | 'loading' | 'ready';

/**
 * Try the local Claude bridge first; fall back to the heuristic extractor if
 * the dev backend is unavailable or the CLI errors. Either way we get a
 * CareerProfile of the same shape.
 */
async function buildProfile(text: string): Promise<CareerProfile> {
  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(error || 'Claude bridge failed.');
    }
    return parseClaudeProfile(await res.text());
  } catch (bridgeErr) {
    console.warn('Claude bridge unavailable, using heuristic extractor.', bridgeErr);
    return extractProfile(text);
  }
}

function App() {
  const [profile, setProfile] = useState<CareerProfile>(SAMPLE_PROFILE);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | undefined>();

  async function handleFiles(files: File[]) {
    setStatus('loading');
    setError(undefined);
    try {
      const text = await filesToText(files);
      if (text.trim().length < 20) {
        throw new Error("That file didn't contain readable text. Try a PDF, DOCX, or TXT resume.");
      }
      const next = await buildProfile(text);
      setProfile(next);
      setStatus('ready');
    } catch (e) {
      setError((e as Error).message);
      // Stay on the loader briefly so the error is visible, then return to idle.
      setStatus('loading');
      setTimeout(() => {
        setStatus((s) => (s === 'loading' ? 'idle' : s));
      }, 3200);
    }
  }

  return (
    <div className="app">
      <Starfield />

      <div className="app-inner">
        <div className="hero-band">
          <div className="hero-mesh" aria-hidden="true">
            <span className="hero-orb hero-orb-1" />
            <span className="hero-orb hero-orb-2" />
            <span className="hero-orb hero-orb-3" />
          </div>
          <div className="hero-content">
            <div className="hero-eyebrow">
              <span className="hero-eyebrow-dot" />
              Local&nbsp;·&nbsp;Private&nbsp;·&nbsp;Runs entirely in your browser
            </div>
            <div className="brand">RESUME&nbsp;→&nbsp;FUTURE</div>
            <p className="brand-sub">
              Upload your resume and watch your career rendered as a journey into the AI era.
            </p>
            <Uploader onFiles={handleFiles} disabled={status === 'loading'} />
          </div>
        </div>

        <ProfileView profile={profile} />
      </div>

      <AnimatePresence>
        {status === 'loading' && <Loader error={error} />}
      </AnimatePresence>
    </div>
  );
}

export default App;
