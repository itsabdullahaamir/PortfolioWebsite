import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { episodes } from '../data/episodes.js';

/**
 * Tracks visited episodes for: the CONTINUE menu item (spec 4.1), the
 * RECRUITER CONFIDENCE meter (mechanic 3), and visited-episode corner
 * marks on the chapter select grid (spec 4.2).
 *
 * Persisted to localStorage under 'tt_resume_progress' per spec section 5.
 */

const STORAGE_KEY = 'tt_resume_progress';
const BASE_CONFIDENCE = 20;

const ProgressContext = createContext(null);

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { visited: [], lastEpisodeId: null };
    const parsed = JSON.parse(raw);
    return {
      visited: Array.isArray(parsed.visited) ? parsed.visited : [],
      lastEpisodeId: parsed.lastEpisodeId ?? null,
    };
  } catch {
    return { visited: [], lastEpisodeId: null };
  }
}

export function ProgressProvider({ children }) {
  const [progress, setProgress] = useState(loadProgress);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  const visitEpisode = useCallback((episodeId) => {
    setProgress((prev) => {
      const visited = prev.visited.includes(episodeId)
        ? prev.visited
        : [...prev.visited, episodeId];
      return { visited, lastEpisodeId: episodeId };
    });
  }, []);

  const isVisited = useCallback(
    (episodeId) => progress.visited.includes(episodeId),
    [progress.visited],
  );

  // Mechanic 3: 20% base, fills to 100% across all episodes.
  const confidence = useMemo(() => {
    const perEpisode = (100 - BASE_CONFIDENCE) / episodes.length;
    return Math.min(100, BASE_CONFIDENCE + progress.visited.length * perEpisode);
  }, [progress.visited.length]);

  const hasSave = progress.visited.length > 0;

  const value = useMemo(
    () => ({
      visited: progress.visited,
      lastEpisodeId: progress.lastEpisodeId,
      visitEpisode,
      isVisited,
      confidence,
      hasSave,
      allEpisodesVisited: progress.visited.length >= episodes.length,
    }),
    [progress, visitEpisode, isVisited, confidence, hasSave],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used within a ProgressProvider');
  return ctx;
}
