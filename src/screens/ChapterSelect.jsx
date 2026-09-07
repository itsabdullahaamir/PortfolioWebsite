import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import EpisodeArt from '../components/EpisodeArt.jsx';
import { episodes } from '../data/episodes.js';
import { useProgress } from '../context/ProgressContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { useSound } from '../lib/sound.js';

/**
 * `/chapters` — the nav-bar replacement, spec section 4.2.
 *
 * Rebuilt against a screenshot of the Batman: A Telltale Series episode
 * menu that the user supplied as the reference to take heavy inspiration
 * from. Everything structural on this screen now comes from that image:
 *
 * - The selected episode's key art is FULL-BLEED — it is the background
 *   of the whole screen, not a picture inside a card. There is no panel,
 *   border or shadow around the hero at all. Text sits directly on the
 *   art, top-left, over a left-to-right scrim that exists only to hold
 *   contrast.
 * - Hero text order, matching the reference exactly: small "Episode N",
 *   then the title large in the accent color, then a small all-caps
 *   status line, then the description, then the Start button.
 * - The Start button is a HOLLOW OUTLINED rectangle, not a filled slab.
 *   That is the reference's treatment, and it also hands `--signal` back
 *   to the title, which is the single highest-value place to spend it.
 * - The filmstrip sits at the bottom: thumbnails of the same key art,
 *   the selected one bright with a light border, the rest dimmed, and
 *   labels BELOW each thumbnail rather than inside it.
 * - Unvisited episodes carry a small corner ribbon, the way the
 *   reference tags unplayed episodes with "NEW!".
 * - A season line with circular ◂ ▸ steppers flanking it sits above the
 *   strip, and a row of secondary actions sits below it. That row is
 *   where "← Previous Menu" and the plain-resume escape hatch now live,
 *   which is a better home than either had before.
 *
 * WHAT WAS DELIBERATELY NOT TAKEN: the reference's cool cyan grade and
 * its light sans-serif. Those would have reintroduced exactly the theme
 * jump this screen was rebuilt to remove. Palette stays `--ink`/`--dusk`
 * darks and `--bone`/`--paper` light, type stays Alfa Slab One, and the
 * accent stays `--signal`. The staging was worth copying; the skin was
 * not.
 *
 * `Panel.jsx` and `RevealPanel.jsx` are no longer used here, and that is
 * intentional rather than an oversight. The comic-panel primitive
 * (irregular clip-path, hard offset shadow, halftone) is the language of
 * the CONTENT layer — it belongs on `/chapters/:id`, where panels are
 * literally comic panels. This screen is now cinematic full-bleed art,
 * and hanging paper-panel chrome on it fought the reference on every
 * axis. `RevealPanel` went with it because this layout does not scroll
 * at desktop sizes, so a scroll-triggered reveal had nothing to trigger
 * on and its parallax transform was only a source of overflow.
 *
 * LAYOUT SHIFT, previously reported ("the website changes size per
 * chapter hovering over it"), is now solved structurally rather than by
 * reservation alone: the hero block is `flex-1` and the bottom cluster
 * is pinned beneath it, so text height variation is absorbed by free
 * space instead of moving the page. The title and description still
 * reserve their maximum line counts so the Start button itself does not
 * jump.
 *
 * Selection is ONE piece of state driven by hover, focus, the steppers
 * and Left/Right arrow keys alike. An earlier version split it into a
 * committed id plus a transient hover preview that reset on mouse-out,
 * which cannot coexist with arrow keys — a keyboard move would be
 * silently discarded the next time the cursor left a tile. Tiles
 * navigate on click; the Start button is there for touch and keyboard.
 */

/**
 * Year span for an episode, derived from its panels' `timestamp` fields
 * rather than stored separately — a second copy of the same dates in the
 * data would be one more thing to keep in sync by hand.
 */
function spanFor(episode) {
  const years = [];
  let ongoing = false;
  episode.panels.forEach((panel) => {
    (panel.timestamp.match(/\d{4}/g) ?? []).forEach((year) => years.push(Number(year)));
    if (/present/i.test(panel.timestamp)) ongoing = true;
  });
  if (!years.length) return null;
  const first = Math.min(...years);
  const last = ongoing ? 'Present' : Math.max(...years);
  return String(first) === String(last) ? `${first}` : `${first} — ${last}`;
}

/** First few distinct tags across an episode's panels. */
function tagsFor(episode, limit = 3) {
  const seen = [];
  episode.panels.forEach((panel) => {
    (panel.tags ?? []).forEach((tag) => {
      if (!seen.includes(tag)) seen.push(tag);
    });
  });
  return seen.slice(0, limit);
}

const STEPPER =
  'flex h-9 w-9 items-center justify-center rounded-full border border-bone/30 font-display text-sm leading-none text-bone/70 transition-colors duration-150 hover:border-bone/70 hover:text-bone';

const ACTION =
  'inline-flex items-center gap-2 border border-bone/30 px-4 py-2 font-display text-xs uppercase tracking-[0.16em] text-bone/75 transition-colors duration-150 hover:border-bone/70 hover:text-bone';

export default function ChapterSelect() {
  const { isVisited, lastEpisodeId, visited } = useProgress();
  const { motion: motionEnabled } = useSettings();
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = prefersReducedMotion || !motionEnabled;
  const playSound = useSound();
  const navigate = useNavigate();

  const [selectedId, setSelectedId] = useState(() => lastEpisodeId ?? episodes[0].id);
  const tileRefs = useRef([]);

  const index = Math.max(
    0,
    episodes.findIndex((ep) => ep.id === selectedId),
  );
  const selected = episodes[index];
  const span = spanFor(selected);
  const tags = tagsFor(selected);
  const selectedVisited = isVisited(selected.id);

  /*
    One selection setter for every input. `scroll` is opt-in because
    pointing at a tile with the mouse must never move the row out from
    under the cursor — only a keyboard or stepper move should chase the
    selection into view.
  */
  const select = useCallback(
    (nextIndex, { scroll = false } = {}) => {
      const wrapped = (nextIndex + episodes.length) % episodes.length;
      const ep = episodes[wrapped];
      setSelectedId((current) => {
        if (current !== ep.id) playSound('navigate');
        return ep.id;
      });
      if (scroll) {
        tileRefs.current[wrapped]?.scrollIntoView({
          behavior: reducedMotion ? 'auto' : 'smooth',
          inline: 'center',
          block: 'nearest',
        });
      }
    },
    [playSound, reducedMotion],
  );

  /*
    Left/Right steps between episodes; Enter opens the selected one.
    Scoped to the window rather than a focusable container so both work
    without the visitor having to tab into anything first, matching how
    `MainMenu.jsx` handles Up/Down + Enter — the common case here is a
    mouse hovering a tile (which sets the selection via `onMouseEnter`)
    while DOM focus is still on `<body>`, so nothing native would fire.
    When a tile link or a button genuinely has focus, its own native
    Enter activation is left to run. Text inputs are excluded defensively
    — there are none on this screen today, but this listener would
    otherwise swallow caret movement in the first one anybody adds.
  */
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const active = document.activeElement;
      const tag = active?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        select(index + (event.key === 'ArrowRight' ? 1 : -1), { scroll: true });
        return;
      }

      if (event.key === 'Enter') {
        if (tag === 'A' || tag === 'BUTTON') return;
        event.preventDefault();
        playSound('select');
        navigate(`/chapters/${episodes[index].id}`);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [index, select, navigate, playSound]);

  return (
    /*
      `min-h-screen`, NOT `min-h-full`, and that is a bug fix rather than
      a preference. `App.jsx` wraps every screen in `PageTransition.jsx`,
      which is `display: contents` at rest — an element that generates no
      box, so a percentage `min-height` on this `<main>` has nothing to
      resolve against and collapses to `auto`. This screen is the first
      one short enough for that to show: it measured 737px inside an
      812px viewport, leaving a 75px band of the cream `--paper` body
      background exposed under the artwork. Viewport units skip the
      containing-block chain entirely.
    */
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-ink text-bone">
      {/* Full-bleed key art for the selected episode. Always `lit` — the
          camera is at this window, so the room is what you are looking
          at; the filmstrip is where visited state is communicated. */}
      <div aria-hidden="true" className="absolute inset-0">
        <EpisodeArt scene={selected.scene} lit detail="full" />
      </div>

      {/* Scrims. The left one holds contrast for the text block, the
          bottom one for the filmstrip. Both are pure gradient, no box. */}
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-full sm:w-[72%]"
        style={{
          background:
            'linear-gradient(to right, color-mix(in oklab, var(--ink) 92%, transparent) 0%, color-mix(in oklab, var(--ink) 72%, transparent) 42%, transparent 100%)',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[62%]"
        style={{
          background:
            'linear-gradient(to top, color-mix(in oklab, var(--ink) 95%, transparent) 0%, color-mix(in oklab, var(--ink) 70%, transparent) 46%, transparent 100%)',
        }}
      />

      <div className="relative z-10 flex flex-1 flex-col px-6 pb-7 pt-8 sm:px-12 sm:pb-8 sm:pt-10">
        {/* Hero text, top-left over the art. `flex-1` absorbs the height
            difference between episodes so nothing below can move. */}
        <div className="flex-1">
          <div className="max-w-[34rem]">
            <p className="font-body text-sm uppercase tracking-[0.24em] text-bone/55">
              Episode {selected.number}
            </p>

            {/* Two lines reserved — titles run one or two. Signal use 1
                of 1 on this screen. */}
            <h1 className="mt-2 min-h-[2.1em] font-display text-xl uppercase leading-[1.05] text-signal sm:text-2xl">
              {selected.title}
            </h1>

            <p className="mt-1 font-body text-xs uppercase tracking-[0.2em] text-bone/45">
              {selectedVisited ? 'Viewed' : 'Not yet viewed'}
            </p>

            {/* Reserved at leading-relaxed (1.625em per line): three lines
                on a 375px column, two from `sm` up. Measured per episode at
                each width, not guessed — every contents line renders on
                one line at `lg`, so the second reserved line is headroom
                for a future longer one rather than space in use. */}
            <p className="mt-4 min-h-[4.9em] font-body text-base leading-relaxed text-bone/85 sm:min-h-[3.25em]">
              {selected.subtitle}
            </p>

            <p className="min-h-[2.8em] font-body text-xs uppercase tracking-[0.16em] text-bone/45">
              {selected.panels.length} panels
              {span ? ` · ${span}` : ''}
              {tags.length ? ` · ${tags.join(' · ')}` : ''}
            </p>

            <Link
              to={`/chapters/${selected.id}`}
              onClick={() => playSound('select')}
              className="mt-6 inline-flex w-full items-center justify-center border-2 border-bone/85 px-10 py-4 font-display text-lg uppercase tracking-wide text-bone transition-colors duration-150 hover:border-bone hover:bg-bone hover:text-ink sm:w-auto sm:min-w-[19rem]"
            >
              Start Episode {selected.number}
            </Link>
          </div>
        </div>

        {/* Bottom cluster: season line, filmstrip, secondary actions. */}
        <div className="mt-8 shrink-0">
          <div className="mb-4 flex items-center gap-4">
            <button
              type="button"
              aria-label="Previous episode"
              onClick={() => select(index - 1, { scroll: true })}
              className={STEPPER}
            >
              ◂
            </button>
            <span className="font-display text-sm uppercase tracking-[0.2em] text-bone/85">
              Season 1
            </span>
            <span className="font-body text-xs uppercase tracking-[0.18em] text-bone/40">
              {visited.length} of {episodes.length} viewed · ◂ ▸ to browse
            </span>
            <button
              type="button"
              aria-label="Next episode"
              onClick={() => select(index + 1, { scroll: true })}
              className={`${STEPPER} ml-auto sm:ml-0`}
            >
              ▸
            </button>
          </div>

          {/* Filmstrip. The negative right margin lets the row overrun
              the frame so it reads as continuing rather than as a tidy
              row of five; the native scrollbar is hidden because the
              steppers and arrow keys are the affordance now. */}
          <ul className="no-scrollbar -mr-6 flex items-start gap-3 overflow-x-auto pb-1 sm:-mr-12 sm:gap-4">
            {episodes.map((ep, tileIndex) => {
              const isSelected = ep.id === selected.id;
              const epVisited = isVisited(ep.id);
              return (
                <li
                  key={ep.id}
                  ref={(node) => {
                    tileRefs.current[tileIndex] = node;
                  }}
                  className="shrink-0"
                >
                  <Link
                    to={`/chapters/${ep.id}`}
                    aria-label={`Episode ${ep.number}: ${ep.title}${epVisited ? ' (viewed)' : ' (not yet viewed)'}`}
                    aria-current={isSelected ? 'true' : undefined}
                    onClick={() => playSound('select')}
                    onMouseEnter={() => select(tileIndex)}
                    onFocus={() => select(tileIndex)}
                    className="block w-40 sm:w-48 lg:w-[14.5rem]"
                  >
                    <div
                      className={`relative aspect-video w-full border-2 transition-colors duration-150 ${
                        isSelected ? 'border-bone' : 'border-bone/15'
                      }`}
                    >
                      <EpisodeArt
                        scene={ep.scene}
                        lit={epVisited}
                        detail="low"
                        className={`absolute inset-0 transition-opacity duration-200 ${
                          isSelected ? 'opacity-100' : 'opacity-55'
                        }`}
                      />

                      {/* The reference's "NEW!" tag, inverted to our
                          palette so it does not spend the accent five
                          times over on a first visit. */}
                      {epVisited ? null : (
                        <span className="absolute left-0 top-0 bg-bone px-2 py-[3px] font-display text-[10px] uppercase leading-none tracking-[0.14em] text-ink">
                          New
                        </span>
                      )}
                    </div>

                    <p
                      className={`mt-2 font-body text-[11px] uppercase tracking-[0.2em] transition-colors duration-150 ${
                        isSelected ? 'text-bone/70' : 'text-bone/30'
                      }`}
                    >
                      Episode {ep.number}
                    </p>
                    <p
                      className={`min-h-[2.4em] font-display text-xs uppercase leading-[1.2] transition-colors duration-150 sm:text-sm ${
                        isSelected ? 'text-bone' : 'text-bone/40'
                      }`}
                    >
                      {ep.title}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/" className={ACTION}>
              <span aria-hidden="true">◂</span> Previous menu
            </Link>
            <Link to="/plain" className={ACTION}>
              <span aria-hidden="true">▤</span> Plain resume
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
