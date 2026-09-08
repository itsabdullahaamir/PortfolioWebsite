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

// Episode ids have been renamed more than once as episodes.js was
// reorganized (chronology -> category, then a further content pass).
// A visitor whose localStorage predates one of those renames can be
// carrying stale ids that no longer match anything in the current
// `episodes` array. Reconciling against the live id set here — rather
// than trusting whatever length localStorage reports — is what stops
// visited.length from ever exceeding episodes.length (previously
// visible live as "10 of 5 viewed" on ChapterSelect.jsx).
const VALID_IDS = new Set(episodes.map((ep) => ep.id));

function sanitizeVisited(visited) {
  if (!Array.isArray(visited)) return [];
  return visited.filter((id) => VALID_IDS.has(id));
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { visited: [], cleared: [], lastEpisodeId: null };
    const parsed = JSON.parse(raw);
    return {
      visited: sanitizeVisited(parsed.visited),
      cleared: sanitizeVisited(parsed.cleared),
      lastEpisodeId: parsed.lastEpisodeId ?? null,
    };
  } catch {
    return { visited: [], cleared: [], lastEpisodeId: null };
  }
}

export function ProgressProvider({ children }) {
  const [progress, setProgress] = useState(loadProgress);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  const visitEpisode = useCallback((episodeId) => {
    if (!VALID_IDS.has(episodeId)) return;
    setProgress((prev) => {
      const visited = prev.visited.includes(episodeId)
        ? prev.visited
        : [...prev.visited, episodeId];
      return { ...prev, visited, lastEpisodeId: episodeId };
    });
  }, []);

  const isVisited = useCallback(
    (episodeId) => progress.visited.includes(episodeId),
    [progress.visited],
  );

  /*
   * `cleared` is deliberately a SEPARATE set from `visited`, not a
   * stronger version of it.
   *
   * `visited` means "read the episode" and is set by EpisodeView.jsx —
   * it drives the CONTINUE menu item and the Explorer's viewed count.
   * `cleared` means "finished that episode's minigame" and is the only
   * thing the overworld's door gating reads. Keeping them apart is what
   * lets /chapters stay completely ungated (root CLAUDE.md section 6
   * rules 1 and 3: content is never behind a game) while the walkable
   * floor still has real locked doors: reading episode 3 in the Explorer
   * does not unlock door 3 on the floor, and clearing door 3 does not
   * pretend you read it.
   */
  const clearEpisode = useCallback((episodeId) => {
    if (!VALID_IDS.has(episodeId)) return;
    setProgress((prev) =>
      prev.cleared.includes(episodeId)
        ? prev
        : { ...prev, cleared: [...prev.cleared, episodeId] },
    );
  }, []);

  const isCleared = useCallback(
    (episodeId) => progress.cleared.includes(episodeId),
    [progress.cleared],
  );

  /**
   * A door is unlocked when every episode before it in play order has
   * been cleared. The first is always open, so a visitor arriving with
   * empty storage is never staring at five locked doors.
   */
  const isUnlocked = useCallback(
    (episodeId) => {
      const index = episodes.findIndex((ep) => ep.id === episodeId);
      if (index <= 0) return index === 0;
      return episodes
        .slice(0, index)
        .every((ep) => progress.cleared.includes(ep.id));
    },
    [progress.cleared],
  );

  /** The next door the visitor should walk to, or null once all are done. */
  const nextUnclearedId = useMemo(() => {
    const next = episodes.find((ep) => !progress.cleared.includes(ep.id));
    return next ? next.id : null;
  }, [progress.cleared]);

  // Mechanic 3: 20% base, fills to 100% across all episodes.
  const confidence = useMemo(() => {
    const perEpisode = (100 - BASE_CONFIDENCE) / episodes.length;
    return Math.min(100, BASE_CONFIDENCE + progress.visited.length * perEpisode);
  }, [progress.visited.length]);

  const hasSave = progress.visited.length > 0;

  const value = useMemo(
    () => ({
      visited: progress.visited,
      cleared: progress.cleared,
      lastEpisodeId: progress.lastEpisodeId,
      visitEpisode,
      isVisited,
      clearEpisode,
      isCleared,
      isUnlocked,
      nextUnclearedId,
      confidence,
      hasSave,
      allEpisodesVisited: progress.visited.length >= episodes.length,
      allEpisodesCleared: progress.cleared.length >= episodes.length,
    }),
    [
      progress,
      visitEpisode,
      isVisited,
      clearEpisode,
      isCleared,
      isUnlocked,
      nextUnclearedId,
      confidence,
      hasSave,
    ],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used within a ProgressProvider');
  return ctx;
}
