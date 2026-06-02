import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import './App.css';
import { filesToText } from './lib/parse';
import { extractProfile } from './lib/extract';
import { parseClaudeProfile } from './lib/claudeProfile';
import { SAMPLE_PROFILE } from './lib/sample';
import type { CareerProfile } from './lib/types';
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
      <div className="bg" aria-hidden="true" />
      <span className="orb v" aria-hidden="true" />
      <span className="orb c" aria-hidden="true" />

      <div className="app-inner">
        <section className="hero-band">
          <div className="hero-inner">
            <div className="pill hero-eyebrow">
              <span className="pulse-dot" /> A RÉSUMÉ, REIMAGINED
            </div>
            <h1 className="brand">
              Interactive <span className="accent-word">Résumé</span>
            </h1>
            <div className="hero-rule" />
            <p className="brand-sub">
              Turn a résumé into a living document — every role mapped across the
              globe, every capability scored, and a look at where you go next.
            </p>
            <Uploader onFiles={handleFiles} disabled={status === 'loading'} />
            <div className="hero-foot">
              <span>100% offline</span>
              <span className="dot-sep">·</span>
              <span>No account</span>
              <span className="dot-sep">·</span>
              <span>Nothing leaves your device</span>
            </div>
          </div>
        </section>

        <ProfileView profile={profile} />
      </div>

      <AnimatePresence>
        {status === 'loading' && <Loader error={error} />}
      </AnimatePresence>
    </div>
  );
}

export default App;
