import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import GameCanvas from '../game/GameCanvas.jsx';
import { createOverworld } from '../game/scenes/overworld.js';
import { episodes } from '../data/episodes.js';
import { getGame } from '../data/games.js';
import { useProgress } from '../context/ProgressContext.jsx';
import { useToast } from '../components/ToastProvider.jsx';

/**
 * `/floor` -- the walkable overworld behind NEW GAME.
 *
 * This screen is mostly a host: overworld.js draws and runs the world,
 * and everything here exists to make that world reachable by people who
 * are not looking at it.
 *
 * THREE THINGS THIS OWNS THAT THE CANVAS CANNOT
 *   1. The prompt mirror. Whatever the walker is standing in front of is
 *      rendered as real DOM text under the canvas, so a screen reader
 *      and a sighted player are told the same thing at the same time.
 *   2. The control pad. Touch steering exists inside the scene, but real
 *      buttons are better: they are reachable by keyboard, they are
 *      announced, and they do not depend on guessing which half of the
 *      screen to hold.
 *   3. The exits. The Episode Explorer and the plain resume are one
 *      click away at all times, from the header, in addition to the
 *      stairwell that exists inside the world.
 *
 * SPAWN POSITION lives in sessionStorage rather than in ProgressContext
 * because it is a per-visit convenience, not progress: coming out of a
 * room should put you back at that door, but a new session should start
 * you at the desk where the story does.
 */
const SPAWN_KEY = 'tt_floor_spawn';

export default function Floor() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isCleared, isUnlocked, cleared, nextUnclearedId, allEpisodesCleared } = useProgress();
  const [prompt, setPrompt] = useState(null);
  const promptRef = useRef(null);

  const startNear = useMemo(() => {
    try {
      return sessionStorage.getItem(SPAWN_KEY);
    } catch {
      return null;
    }
  }, []);

  const doors = useMemo(
    () =>
      episodes.map((episode, index) => {
        const game = getGame(episode.id);
        return {
          episodeId: episode.id,
          number: episode.number,
          title: game?.title ?? episode.title,
          unlocked: isUnlocked(episode.id),
          cleared: isCleared(episode.id),
          blockedBy: index > 0 ? episodes[index - 1].title : null,
        };
      }),
    // Recomputed only when the cleared set changes -- door state is a
    // pure function of it, and rebuilding on every render would restart
    // the scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cleared],
  );

  const handlePrompt = useCallback((next) => {
    promptRef.current = next;
    setPrompt(next);
  }, []);

  const sceneFactory = useCallback(
    () => createOverworld({ doors, startNear, onPrompt: handlePrompt }),
    [doors, startNear, handlePrompt],
  );

  const handleEvent = useCallback(
    (name, data) => {
      if (name === 'enter') {
        try {
          sessionStorage.setItem(SPAWN_KEY, data.episodeId);
        } catch {
          /* private mode; spawning at the desk is an acceptable fallback */
        }
        navigate(`/play/${data.episodeId}`);
      } else if (name === 'stairs') {
        navigate('/chapters');
      } else if (name === 'desk') {
        navigate('/plain');
      } else if (name === 'locked') {
        showToast('doorLocked');
      }
    },
    [navigate, showToast],
  );

  // Once the spawn has been consumed for this mount, clear it so a
  // later fresh arrival at /floor starts at the desk again.
  useEffect(() => {
    try {
      sessionStorage.removeItem(SPAWN_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const promptLabel = (() => {
    if (!prompt) return 'Walk left or right to find a door.';
    if (prompt.kind === 'stairs') return 'The stairs — the Episode Explorer. Every episode, unlocked.';
    if (prompt.kind === 'desk') return 'The desk — the plain resume. Every fact, on one page.';
    if (!prompt.unlocked) return `Episode ${prompt.number}, ${prompt.title} — locked. Clear the door before it, or take the stairs.`;
    return `Episode ${prompt.number}, ${prompt.title} — ${prompt.cleared ? 'cleared. Enter to replay.' : 'Enter to play.'}`;
  })();

  return (
    <main className="game-surface relative flex min-h-screen flex-col bg-ink">
      <header className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <Link
          to="/"
          className="whitespace-nowrap font-body text-[10px] uppercase tracking-[0.14em] text-bone/60 underline decoration-2 underline-offset-4 hover:text-bone sm:text-xs sm:tracking-[0.2em]"
        >
          ◂ Title
        </Link>
        <p className="hidden font-display text-xs uppercase tracking-[0.24em] text-bone/40 sm:block">
          The floor · {cleared.length} of {episodes.length} doors open
        </p>
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            to="/chapters"
            className="whitespace-nowrap font-body text-[10px] uppercase tracking-[0.14em] text-bone/60 underline decoration-2 underline-offset-4 hover:text-bone sm:text-xs sm:tracking-[0.2em]"
          >
            Explorer
          </Link>
          <Link
            to="/plain"
            className="whitespace-nowrap font-body text-[10px] uppercase tracking-[0.14em] text-bone/60 underline decoration-2 underline-offset-4 hover:text-bone sm:text-xs sm:tracking-[0.2em]"
          >
            Plain resume
          </Link>
        </div>
      </header>

      <div className="relative min-h-[46vh] flex-1">
        <GameCanvas
          scene={sceneFactory}
          onEvent={handleEvent}
          label="A corridor at night with five doors, one per episode. Walk left and right; enter a door to play its chapter."
          announce={promptLabel}
        />
      </div>

      {/*
        The prompt mirror and the control pad. Both are real DOM, both
        keyboard reachable — the canvas is scenery, this is the interface.
      */}
      <div className="border-t-[3px] border-bone/15 bg-shadow/25 px-5 py-4">
        <p className="min-h-[2.5rem] font-body text-sm text-bone/85">{promptLabel}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <PadButton onPress={() => press('ArrowLeft')} label="Walk left">◂</PadButton>
          <PadButton onPress={() => press('ArrowRight')} label="Walk right">▸</PadButton>
          <PadButton onPress={() => press('Enter')} label="Enter the door in front of you" wide>
            Enter
          </PadButton>

          {nextUnclearedId && !allEpisodesCleared ? (
            <p className="ml-auto font-body text-xs uppercase tracking-[0.18em] text-bone/40">
              Next: episode {episodes.findIndex((e) => e.id === nextUnclearedId) + 1}
            </p>
          ) : null}
          {allEpisodesCleared ? (
            <p className="ml-auto font-body text-xs uppercase tracking-[0.18em] text-signal">
              All five doors open
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}

/**
 * The control pad drives the game by dispatching the same key events the
 * engine already listens for, rather than by reaching into the scene.
 * That keeps one input path instead of two: whatever the keyboard can
 * do, these buttons do identically, and a scene never needs to know a
 * touch pad exists.
 */
function press(code) {
  const down = new KeyboardEvent('keydown', { code, bubbles: true });
  const up = new KeyboardEvent('keyup', { code, bubbles: true });
  window.dispatchEvent(down);
  window.setTimeout(() => window.dispatchEvent(up), 130);
}

function PadButton({ children, onPress, label, wide = false }) {
  // Pointer events rather than click, so holding a direction walks
  // continuously instead of stepping once per tap.
  const held = useRef(0);

  const start = (event) => {
    event.preventDefault();
    onPress();
    held.current = window.setInterval(onPress, 110);
  };
  const stop = () => {
    window.clearInterval(held.current);
    held.current = 0;
  };

  useEffect(() => stop, []);

  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onClick={(event) => event.preventDefault()}
      className={`select-none border-[3px] border-bone/30 px-4 py-2 font-display text-base uppercase text-bone/85 transition-colors duration-[120ms] hover:border-bone/60 hover:text-bone ${
        wide ? 'px-6' : ''
      }`}
    >
      {children}
    </button>
  );
}
