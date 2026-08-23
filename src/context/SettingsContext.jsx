import { createContext, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Motion, sound, and typewriter toggles — the OPTIONS menu item (spec 4.1).
 * Persisted so settings survive a reload.
 *
 * `sound` defaults true per direct user request ("the sound of the website
 * should be on, always when a new user comes... they can turn it off if
 * they want"), overriding spec mechanic 5's ambient-audio default-off
 * language — that clause describes a background soundscape (cut, see
 * `../lib/CLAUDE.md`), not the short interaction cues this toggle
 * actually gates. This still can't violate "never autoplay": every cue
 * runs through `../lib/sound.js`, which creates its `AudioContext` lazily
 * and browsers refuse to play audio before a real user gesture regardless
 * of this flag — `StartPrompt.jsx` (Beat 0) guarantees that gesture
 * happens before anything else renders, so defaulting this true just means
 * sound is already on once that first click lands, not that it plays
 * unprompted.
 */

const STORAGE_KEY = 'tt_resume_settings';

const DEFAULTS = {
  motion: true, // false disables parallax/typewriter/transitions on top of prefers-reduced-motion
  sound: true, // on by default; user can toggle off in OPTIONS — see comment above
  typewriter: true,
};

const SettingsContext = createContext(null);

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const toggle = (key) => setSettings((prev) => ({ ...prev, [key]: !prev[key] }));

  const value = useMemo(() => ({ ...settings, toggle }), [settings]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}
