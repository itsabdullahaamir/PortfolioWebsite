import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Panel from '../components/Panel.jsx';
import RevealPanel from '../components/RevealPanel.jsx';
import EpisodeArt from '../components/EpisodeArt.jsx';
import { useProgress } from '../context/ProgressContext.jsx';
import { useToast } from '../components/ToastProvider.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { getEpisodeById, getNextEpisode } from '../data/episodes.js';
import { getGame } from '../data/games.js';

/**
 * `/chapters/:id` — the episode READING view, spec section 4.3.
 *
 * REBUILT. The live complaint about this whole area was "the text is all
 * over the place and is a mess, and there is lack of fluency," and this
 * screen was the clearest instance of it. Three things caused that, and
 * all three are gone:
 *
 * 1. WIDTH_CLASSES. Panels used to cycle `full / 2-3-left / 2-3-right`
 *    by index, so both the width AND the left edge of the text moved on
 *    every panel down the page. A reader's eye had no anchor line to
 *    return to — the column literally zig-zagged. There is now ONE
 *    column: every panel shares the same left edge and the same measure
 *    (`max-w-3xl` + `px-6`), and emphasis is carried by type size and
 *    vertical rhythm instead of by position. If you are tempted to
 *    re-introduce staggered widths "for visual interest," that is the
 *    defect, not the interest.
 *
 * 2. The light `--paper` palette. Everything a visitor passes through to
 *    get here — the main menu, `/chapters`, `/floor`, `/play/:id` — is
 *    the dark night city, so arriving here read as the site swapping
 *    themes mid-click. That exact defect was already diagnosed and fixed
 *    once on `ChapterSelect.jsx` (root CLAUDE.md, phase 4); this screen
 *    was the last place it survived. The treatment here is deliberately
 *    the one `ChapterSelect.jsx` established rather than a new one:
 *    `--ink` ground, `--bone` text at graded opacities, `--shadow`/
 *    `--dusk` surfaces via `Panel`'s existing `tone="night"`, hairline
 *    bone rules, Alfa Slab for headings, `--signal` spent twice.
 *
 * 3. The DialogueChoice block. REMOVED, not relocated — see the long
 *    note above the panel list for the reasoning.
 *
 * WHAT IS DELIBERATELY KEPT: `Panel.jsx` and `RevealPanel.jsx`.
 * `ChapterSelect.jsx` dropped both when it went full-bleed, and its own
 * doc comment says why that was right THERE and wrong here: the comic
 * panel primitive is the language of the CONTENT layer, and this is the
 * content layer — these panels are literally the comic panels the
 * primitive exists for. This screen also genuinely scrolls, so
 * `RevealPanel`'s scroll-triggered reveal has something to trigger on.
 *
 * `--signal` BUDGET (spec 3.1, max 3 per screen): exactly two at rest —
 * the episode title, and the "Play this episode" outline button. Nothing
 * else on this screen is allowed the accent; the tag chips, the panel
 * links, the end card and both header links are all `--bone` at graded
 * opacity. (The title card is a transient full-screen overlay that
 * unmounts after 1.4s; its own copy is bone, not signal, so even while
 * it is up the count does not move.)
 *
 * Motion: the combined `useReducedMotion() || !useSettings().motion`
 * check is unchanged and still gates the title card; `RevealPanel` does
 * the same check internally for the panels.
 *
 * `min-h-screen`, NOT `min-h-full` — `PageTransition.jsx` is
 * `display: contents` at rest, so a percentage min-height has nothing to
 * resolve against and collapses to `auto`. That bug has already been
 * caught twice in this repo.
 */

/**
 * Year span for an episode, derived from its own panels' `timestamp`
 * fields rather than stored separately — same helper shape as
 * `ChapterSelect.jsx`, and for the same reason: a second copy of the
 * same dates in the data would be one more thing to keep in sync.
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
  return String(first) === String(last) ? `${first}` : `${first} to ${last}`;
}

const HEADER_LINK =
  'font-body text-xs uppercase tracking-[0.2em] text-bone/55 underline decoration-2 underline-offset-4 transition-colors duration-150 hover:text-bone';

export default function EpisodeView() {
  const { id } = useParams();
  const { visitEpisode, isVisited } = useProgress();
  const { showToast } = useToast();
  const { motion: motionEnabled } = useSettings();
  const episode = useMemo(() => getEpisodeById(id), [id]);

  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = !motionEnabled || prefersReducedMotion;

  const [showTitleCard, setShowTitleCard] = useState(true);

  useEffect(() => {
    setShowTitleCard(true);
  }, [id]);

  useEffect(() => {
    if (!episode) return;
    if (!isVisited(episode.id)) {
      showToast('episodeFirstOpen');
    }
    visitEpisode(episode.id);
    // Intentionally scoped to episode identity only — visitEpisode/
    // isVisited/showToast are stable across renders (see their providers).
  }, [episode?.id]);

  useEffect(() => {
    if (!showTitleCard) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Tab' || event.key === 'Shift') return;
      setShowTitleCard(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showTitleCard]);

  if (!episode) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink px-6 text-center">
        <p className="font-display text-xl uppercase text-bone">Episode not found.</p>
        <Link to="/chapters" className={HEADER_LINK}>
          &#9666; Back to chapters
        </Link>
      </main>
    );
  }

  const game = getGame(episode.id);
  const span = spanFor(episode);

  return (
    <main className="relative min-h-screen bg-ink pb-20 text-bone">
      {/*
        "Chapter open" — spec 3.5: cross-fade to black, then episode title
        card, then content, ~600ms total. Content underneath is already
        mounted (it never gates on the title card, per spec section 2
        rule 2 — no timer blocks content), so dismissing the title card is
        itself the cross-fade into content. Under reduced motion the exit
        duration collapses to 0 (EpisodeTitleCard also calls onDone
        synchronously on mount in that case), so the card never lingers
        mid-fade.
      */}
      <AnimatePresence>
        {showTitleCard ? (
          <EpisodeTitleCard
            episode={episode}
            reducedMotion={reducedMotion}
            onDone={() => setShowTitleCard(false)}
          />
        ) : null}
      </AnimatePresence>

      {/*
        Masthead. The episode's own key art sits behind the header ONLY,
        faint and scrimmed down to `--ink` at the bottom, so the page is
        visibly the same night city the visitor just came from without
        putting artwork behind body copy they have to read. `detail="low"`
        on purpose: full detail would add a Gaussian blur plus a
        displacement filter to a screen `PageTransition.jsx` has to zoom
        (see EpisodeArt.jsx's `detail` note), and none of that fidelity
        survives at 22% opacity anyway.
      */}
      <div className="relative overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 opacity-[0.18]">
          <EpisodeArt scene={episode.scene} lit detail="low" />
        </div>
        {/*
          Two scrims, not one. The vertical one settles the masthead into
          the page; the horizontal one exists because every scene in
          EpisodeArt.jsx is lit from a window on one side, so without it
          the brightest part of the picture lands exactly under the
          right-hand "Plain resume" link and eats its contrast.
        */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, color-mix(in oklab, var(--ink) 78%, transparent) 0%, color-mix(in oklab, var(--ink) 88%, transparent) 45%, var(--ink) 100%)',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to right, color-mix(in oklab, var(--ink) 55%, transparent) 0%, transparent 38%, color-mix(in oklab, var(--ink) 45%, transparent) 100%)',
          }}
        />

        <div className="relative mx-auto w-full max-w-3xl px-6">
          <div className="flex items-center justify-between gap-4 pt-8">
            <Link to="/chapters" className={HEADER_LINK}>
              &#9666; Chapters
            </Link>
            <Link to="/plain" className={HEADER_LINK}>
              Plain resume
            </Link>
          </div>

          <header className="pb-10 pt-12 sm:pt-16">
            <p className="font-body text-xs uppercase tracking-[0.28em] text-bone/50">
              Episode {episode.number}
            </p>
            {/* Signal use 1 of 2. */}
            <h1 className="mt-2 font-display text-xl uppercase leading-[1.05] text-signal sm:text-2xl">
              {episode.title}
            </h1>
            <p className="mt-4 max-w-2xl font-body text-base leading-relaxed text-bone/80">
              {episode.subtitle}
            </p>
            <p className="mt-4 font-body text-xs uppercase tracking-[0.18em] text-bone/45">
              {episode.panels.length} {episode.panels.length === 1 ? 'panel' : 'panels'}
              {span ? ` · ${span}` : ''}
              {isVisited(episode.id) ? ' · Viewed' : ''}
            </p>

            {/*
              Every episode now has a minigame (`../data/games.js`), and
              this is the only place on the reading route that says so.
              Rendered only when `getGame` actually returns one, so the
              screen degrades cleanly if a game is ever removed from the
              data. Signal use 2 of 2.
            */}
            {game ? (
              <Link
                to={`/play/${episode.id}`}
                className="mt-8 inline-flex items-center gap-2 border-2 border-signal px-6 py-3 font-display text-base uppercase tracking-wide text-signal transition-colors duration-150 hover:bg-signal hover:text-ink"
              >
                <span aria-hidden="true">&#9656;</span> Play this episode
              </Link>
            ) : null}
          </header>
        </div>
      </div>

      {/*
        The panels. ONE column, one left edge, one measure — see point 1
        of this file's header comment.

        The `DialogueChoice` block that used to sit ABOVE this list is
        gone, and removed rather than relocated. Three reasons, in order
        of weight: (a) it was a fake choice — every option ran
        `scrollIntoView` to a panel that was already on the page and one
        flick of the wheel away, so it dressed up navigation the reader
        did not need as a decision they had to make; (b) it sat between
        the visitor and the content, which is exactly the 90-second-rule
        failure spec section 2 rule 1 exists to prevent, and moving it
        below the panels would have left a "jump to" menu underneath the
        very things it jumps to; (c) each of its options renders a
        `bg-signal` marker bar, so a 3-option block spends three uses of
        the accent on its own and would have blown spec 3.1's budget of
        three on a control that navigates nowhere. `DialogueChoice.jsx`
        itself is untouched and still available for a real branching
        moment (mechanic 4, phase 8) — this screen just stopped using it
        for a fake one. No content was lost: the episode's own
        `choicePrompt`/`choices` data is still in `episodes.js`.
      */}
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 pt-12 sm:gap-12">
        {episode.panels.map((panel, index) => (
          <RevealPanel key={panel.header} index={index}>
            <EpisodePanel panel={panel} index={index} seed={episode.number * 10 + index} />
          </RevealPanel>
        ))}
      </div>

      <EpisodeEndCard episode={episode} />
    </main>
  );
}

function EpisodeTitleCard({ episode, onDone, reducedMotion }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (reducedMotion) {
      onDone();
      return undefined;
    }
    const raf = requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(onDone, 1400);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [onDone, reducedMotion]);

  return (
    <motion.button
      type="button"
      onClick={onDone}
      aria-label="Skip episode title card"
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.45, ease: 'easeOut' }}
      className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-ink px-6 text-center"
    >
      <span
        className="font-display text-lg uppercase tracking-[0.2em] text-bone/60 transition-opacity duration-500 ease-out"
        style={{ opacity: visible ? 1 : 0 }}
      >
        Episode {episode.number}
      </span>
      <h1
        className="font-display text-xl uppercase text-bone transition-opacity duration-500 ease-out sm:text-2xl"
        style={{ opacity: visible ? 1 : 0, transitionDelay: visible ? '100ms' : '0ms' }}
      >
        {episode.title}
      </h1>
      <p
        className="max-w-xl font-body text-sm uppercase tracking-widest text-bone/70 transition-opacity duration-500 ease-out"
        style={{ opacity: visible ? 1 : 0, transitionDelay: visible ? '200ms' : '0ms' }}
      >
        {episode.subtitle}
      </p>
    </motion.button>
  );
}

/**
 * One comic panel. Full width of the shared column at every breakpoint —
 * the alternating `w-2/3` + `ml-auto` treatment this used to carry is
 * the zig-zag the rebuild exists to remove.
 *
 * Emphasis comes from the type ladder inside the panel instead: a small
 * tracked index/timestamp line, the header in the display face, then the
 * body at reading size. The index number is derived from the panel's
 * position, not stored in the data.
 */
function EpisodePanel({ panel, index, seed }) {
  return (
    <Panel
      as="article"
      id={`panel-${index}`}
      tone="night"
      seed={seed}
      className="scroll-mt-8 p-6 sm:p-7"
    >
      <p className="font-body text-xs uppercase tracking-[0.24em] text-bone/45">
        <span className="text-bone/30">{String(index + 1).padStart(2, '0')}</span>
        <span aria-hidden="true"> &#183; </span>
        {panel.timestamp}
      </p>
      <h2 className="mt-3 font-display text-lg uppercase leading-[1.15] text-bone">{panel.header}</h2>
      <p className="mt-4 font-body text-base leading-relaxed text-bone/85">{panel.body}</p>
      {panel.tags?.length ? (
        <ul className="mt-6 flex flex-wrap gap-2">
          {panel.tags.map((tag) => (
            <li
              key={tag}
              className="border border-bone/25 px-2 py-[3px] font-body text-xs uppercase tracking-[0.14em] text-bone/60"
            >
              {tag}
            </li>
          ))}
        </ul>
      ) : null}
      {panel.link ? (
        <a
          href={panel.link}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-block font-body text-sm uppercase tracking-[0.18em] text-bone/80 underline decoration-2 underline-offset-4 transition-colors duration-150 hover:text-bone"
        >
          &#9656; View the repository
        </a>
      ) : null}
    </Panel>
  );
}

/**
 * End of episode. Left-aligned on the same column edge as everything
 * above it — the old version was a narrow centred box, which broke the
 * single anchor line the rest of the rebuild is built around.
 */
function EpisodeEndCard({ episode }) {
  const next = getNextEpisode(episode.id);
  return (
    <section id="episode-end" className="mx-auto mt-16 w-full max-w-3xl scroll-mt-8 px-6 sm:mt-20">
      <Panel tone="night" seed={episode.number + 50} className="p-6 sm:p-7">
        <p className="font-body text-xs uppercase tracking-[0.28em] text-bone/50">End of episode</p>
        <div className="mt-5 flex flex-col items-start gap-4">
          {next ? (
            <Link
              to={`/chapters/${next.id}`}
              className="font-display text-lg uppercase leading-[1.15] text-bone transition-transform duration-[120ms] ease-out hover:translate-x-1"
            >
              &#9656; Next episode: {next.title}
            </Link>
          ) : (
            <p className="font-body text-base text-bone/70">
              That&rsquo;s the last episode, for now.
            </p>
          )}
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <Link
              to="/chapters"
              className="font-body text-xs uppercase tracking-[0.2em] text-bone/70 underline decoration-2 underline-offset-4 transition-colors duration-150 hover:text-bone"
            >
              &#9666; Back to chapters
            </Link>
            <Link
              to="/plain"
              className="font-body text-xs uppercase tracking-[0.2em] text-bone/55 underline decoration-2 underline-offset-4 transition-colors duration-150 hover:text-bone"
            >
              Plain resume
            </Link>
          </div>
        </div>
      </Panel>
    </section>
  );
}
