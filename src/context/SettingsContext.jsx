import { createContext, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Motion, sound, and typewriter toggles — the OPTIONS menu item (spec 4.1)
 * and the ambient audio requirement in mechanic 5 ("default OFF, with a
 * clear toggle. Never autoplay."). Persisted so settings survive a reload.
 */

const STORAGE_KEY = 'tt_resume_settings';

const DEFAULTS = {
  motion: true, // false disables parallax/typewriter/transitions on top of prefers-reduced-motion
  sound: false, // must default false — never autoplay
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
