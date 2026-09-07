import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { playlist } from '../lib/musicPlaylist.js';

/**
 * Tracks whether the main-menu "radio" (`../components/BackgroundMusic.jsx`)
 * has ever been started this session, AND (new this batch) which track is
 * current — moved here from `BackgroundMusic.jsx`'s own local state so the
 * OPTIONS panel in `MainMenu.jsx` can drive Previous/Next Track controls
 * without owning the `<audio>` element itself. `BackgroundMusic.jsx` still
 * owns playback (the element, play/pause, fade-in); this context only owns
 * *which* track index is selected.
 *
 * `TitleScreen.jsx` calls `start()` the moment its beat sequence reaches
 * MENU (`MainMenu.jsx`) — the same moment `BackgroundMusic.jsx` used to
 * mount under the old design — so playback still never starts during beats
 * 0-2 (StartPrompt/PresentsCard/TitleReveal), only once the menu itself is
 * showing. `start()` is a one-way flip for the rest of the browser session
 * (no `stop()`): once the radio has been switched on, it should keep
 * playing across every further menu-ish navigation (back to `/`, `/plain`)
 * per direct user request — only `/chapters*` pauses it, and that's a
 * route check inside `BackgroundMusic.jsx` itself, not a reason to ever
 * flip `started` back to false.
 *
 * Track selection is a small history stack rather than a bare index, so
 * `previous()` can genuinely go back to what was just playing instead of
 * jumping to another random track (which is what plain "pick a new random
 * index" would do for both directions, making "previous" meaningless).
 * `history` is the ordered list of track indices visited this session;
 * `pointer` is where in that list playback currently is.
 * - `next()`: if the pointer is already behind the end of `history` (the
 *   visitor pressed Previous earlier and hasn't caught back up), it just
 *   moves forward through existing history — a "redo." Otherwise it draws
 *   the next track from a shuffled bag (see below) and appends it.
 * - `previous()`: moves the pointer back one slot, if there's anywhere to
 *   go — a no-op at the start of history.
 * Matches the shuffle-with-history behavior of typical music players
 * rather than a plain forward/back through playlist order, consistent
 * with `BackgroundMusic.jsx`'s existing "shuffled, not sequential" design
 * (see that file — direct user request, not spec).
 *
 * SHUFFLE IS A BAG, NOT A DIE ROLL. This used to pick each next track
 * with `Math.random()`, excluding only the one currently playing. That is
 * memoryless, so with 14 tracks a song could legitimately come back two
 * or three skips later — reported live as "sometimes the same track comes
 * back after 2-3 tracks." It was not a bug in the sense of a wrong line;
 * independent draws simply repeat that often (the chance of *some* repeat
 * inside any 4-track window is already over 20%), which is exactly why
 * real music players do not shuffle this way.
 *
 * `bag` is a shuffled permutation of every playlist index, consumed from
 * the front, one track per `next()`. Only when it empties is a fresh one
 * built. That gives the guarantee the die roll could not: every track
 * plays once before any track plays twice.
 *
 * A bag alone is not quite enough, though, and this is the part worth
 * reading before "simplifying" it. A track can sit at the END of one bag
 * and near the START of the next, so its two plays land two or three
 * skips apart across the seam — which is the exact symptom being fixed,
 * not a lesser version of it. So `refillBag()` is handed the tail of what
 * just played and builds the new bag position by position, taking the
 * first track in a shuffled pool that is not inside the no-repeat window
 * `GAP`. It always terminates (worst case it falls back to the pool's
 * next track), unlike rejection-sampling a whole permutation.
 *
 * `GAP` is half the playlist — seven of the fourteen tracks today —
 * deliberately not `length - 1`: forbidding every recent track fully
 * determines the next bag's order, which degenerates shuffle into a fixed
 * rotation.
 *
 * The bag lives in the same state object as `history`/`pointer`, not in a
 * ref, so `next()` stays a pure state update: mutating a ref inside a
 * state updater would be re-run (and so double-consume the bag) under
 * React StrictMode's intentional double-invocation.
 */

/** Fisher-Yates over every playlist index. */
function shuffledIndices() {
  const order = playlist.map((_, index) => index);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/**
 * How many tracks must play before a track may repeat. Half the playlist,
 * floored, and never the whole of it — see the note above on why
 * `length - 1` would collapse shuffle into a rotation.
 */
const GAP = Math.max(1, Math.min(Math.floor(playlist.length / 2), playlist.length - 1));

/**
 * A fresh bag whose opening tracks don't land back inside the no-repeat
 * window of `recent` (the tail of what just played, most recent last).
 * Draws from a pre-shuffled pool, so "the first legal candidate" is still
 * a random one; falls back to the pool's next track if nothing legal
 * remains, which keeps this terminating rather than merely very likely to.
 */
function refillBag(recent) {
  const pool = shuffledIndices();
  const played = [...recent];
  const bag = [];

  while (pool.length) {
    const window = played.slice(-GAP);
    const found = pool.findIndex((track) => !window.includes(track));
    const [track] = pool.splice(found === -1 ? 0 : found, 1);
    bag.push(track);
    played.push(track);
  }
  return bag;
}

const MusicContext = createContext(null);

export function MusicProvider({ children }) {
  const [started, setStarted] = useState(false);
  const start = useCallback(() => setStarted(true), []);

  // One state object (not separate history/pointer/bag states) so `next()`
  // always reads and writes all three in a single, atomic update — no risk
  // of one updater seeing a value another hasn't committed yet, and no way
  // for the bag to drift out of step with the history it feeds.
  const [playback, setPlayback] = useState(() => {
    const bag = shuffledIndices();
    // The opening track is the first draw from the bag, not a separate
    // roll, so it counts against the "once each before any repeat"
    // guarantee like every other track does.
    return { history: [bag.length ? bag.shift() : 0], pointer: 0, bag };
  });

  const trackIndex = playback.history[playback.pointer];

  const next = useCallback(() => {
    setPlayback(({ history, pointer, bag }) => {
      // Behind the end of history: the visitor pressed Previous earlier,
      // so walk forward through what already played instead of drawing.
      if (pointer < history.length - 1) return { history, pointer: pointer + 1 };
      if (playlist.length <= 1) return { history, pointer, bag };

      const remaining = bag.length ? bag : refillBag(history.slice(-GAP));
      const [drawn, ...rest] = remaining;
      return { history: [...history, drawn], pointer: pointer + 1, bag: rest };
    });
  }, []);

  const previous = useCallback(() => {
    setPlayback(({ history, pointer, bag }) => ({
      history,
      pointer: Math.max(0, pointer - 1),
      bag,
    }));
  }, []);

  const value = useMemo(
    () => ({
      started,
      start,
      trackIndex,
      next,
      previous,
      hasPrevious: playback.pointer > 0,
      hasMultipleTracks: playlist.length > 1,
    }),
    [started, start, trackIndex, next, previous, playback.pointer],
  );
  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
}

export function useMusic() {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error('useMusic must be used within a MusicProvider');
  return ctx;
}
