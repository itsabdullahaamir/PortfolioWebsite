import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Panel from '../components/Panel.jsx';
import DialogueChoice from '../components/DialogueChoice.jsx';
import RevealPanel from '../components/RevealPanel.jsx';
import { useProgress } from '../context/ProgressContext.jsx';
import { useToast } from '../components/ToastProvider.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { getEpisodeById, getNextEpisode } from '../data/episodes.js';

/**
 * `/chapters/:id` — spec section 4.3. Three parts:
 *   a) title card — episode number (--signal) + title + subtitle, holds
 *      1.4s or dismisses on click/key, auto-skipped under reduced motion.
 *   b) vertical scroll of Panel components, alternating width/offset
 *      (full, 2/3 left, 2/3 right) so the column doesn't read as a plain
 *      list.
 *   c) end-of-episode "NEXT EPISODE" / "BACK TO CHAPTERS" card.
 *
 * Calls useProgress().visitEpisode(id) on mount and fires the
 * `episodeFirstOpen` toast on first visit only. Episode choices render
 * via the existing DialogueChoice.jsx; selecting one scrolls/focuses the
 * target panel in place — it never navigates away (mechanic 2 rule).
 *
 * Mechanic 4 (the `branch` object carried on the `build` episode) and
 * mechanic 6 (choice stats) are Phase 8/7 work — out of this batch's
 * scope per the root CLAUDE.md build-phase table — so they intentionally
 * are not rendered here yet.
 *
 * Motion pass (Phase 6): reduced motion is now `useReducedMotion()`
 * (Framer Motion), combined with the Settings motion toggle, replacing
 * the old inline `window.matchMedia` check. The title card's dismissal
 * is wrapped in `AnimatePresence` for the "chapter open" cross-fade (spec
 * 3.5), and each content panel is wrapped in `RevealPanel.jsx` for the
 * scroll-triggered reveal + slow parallax (spec 3.5 / mechanic 5).
 */
const WIDTH_CLASSES = ['w-full', 'w-full sm:w-2/3', 'w-full sm:w-2/3 sm:ml-auto'];

export default function EpisodeView() {
  const { id } = useParams();
  const { visitEpisode, isVisited } = useProgress();
  const { showToast } = useToast();
  const { motion } = useSettings();
  const episode = useMemo(() => getEpisodeById(id), [id]);

  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = !motion || prefersReducedMotion;

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
      <main className="flex min-h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-display text-xl uppercase text-ink">Episode not found.</p>
        <Link
          to="/chapters"
          className="font-body text-sm uppercase tracking-widest text-ink underline decoration-2 underline-offset-4"
        >
          ▸ Back to chapters
        </Link>
      </main>
    );
  }

  const handleChoiceSelect = (option) => {
    const targetId = option.target === 'next' ? 'episode-end' : option.target;
    const el = document.getElementById(targetId);
    el?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    el?.focus?.();
  };

  return (
    <main className="min-h-full pb-16">
      {/*
        "Chapter open" — spec 3.5: cross-fade to black, then episode title
        card, then content, ~600ms total. Content underneath is already
        mounted (it never gates on the title card, per spec section 2
        rule 2 — no timer blocks content), so dismissing the title card is
        itself the cross-fade into content: AnimatePresence fades the
        title card's black overlay out over ~450ms while content is
        already sitting there at full opacity underneath. Under reduced
        motion the exit duration collapses to 0 (EpisodeTitleCard also
        calls onDone synchronously on mount in that case), so the card
        never lingers mid-fade.
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

      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 pt-8">
        <Link
          to="/chapters"
          className="font-body text-sm uppercase tracking-widest text-ink underline decoration-2 underline-offset-4"
        >
          ← Chapters
        </Link>
        <Link
          to="/plain"
          className="font-body text-sm uppercase tracking-widest text-ink/70 underline decoration-2 underline-offset-4"
        >
          Plain resume
        </Link>
      </div>

      <header className="mx-auto max-w-4xl px-6 pt-6">
        <p className="font-display text-sm uppercase tracking-widest text-shadow">
          Episode {episode.number}
        </p>
        <h1 className="font-display text-2xl uppercase text-ink">{episode.title}</h1>
        <p className="font-body text-base text-ink/70">{episode.subtitle}</p>
      </header>

      {episode.choices?.length ? (
        <div className="mx-auto max-w-4xl px-6">
          <DialogueChoice
            prompt={episode.choicePrompt}
            options={episode.choices}
            onSelect={handleChoiceSelect}
          />
        </div>
      ) : null}

      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-8">
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
        className="font-display text-xl uppercase text-signal transition-opacity duration-500 ease-out"
        style={{ opacity: visible ? 1 : 0 }}
      >
        Episode {episode.number}
      </span>
      <h1
        className="font-display text-3xl uppercase text-bone transition-opacity duration-500 ease-out"
        style={{ opacity: visible ? 1 : 0, transitionDelay: visible ? '100ms' : '0ms' }}
      >
        {episode.title}
      </h1>
      <p
        className="font-body text-sm uppercase tracking-widest text-bone/70 transition-opacity duration-500 ease-out"
        style={{ opacity: visible ? 1 : 0, transitionDelay: visible ? '200ms' : '0ms' }}
      >
        {episode.subtitle}
      </p>
    </motion.button>
  );
}

function EpisodePanel({ panel, index, seed }) {
  return (
    <Panel
      as="article"
      id={`panel-${index}`}
      tabIndex={-1}
      seed={seed}
      className={`${WIDTH_CLASSES[index % 3]} scroll-mt-8 p-5`}
    >
      <p className="font-body text-xs uppercase tracking-widest text-shadow">{panel.timestamp}</p>
      <h2 className="mt-1 font-display text-lg uppercase text-ink">{panel.header}</h2>
      <p className="mt-3 font-body text-sm text-ink/90">{panel.body}</p>
      {panel.tags?.length ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {panel.tags.map((tag) => (
            <li
              key={tag}
              className="border border-ink/40 px-2 py-0.5 font-body text-xs uppercase tracking-wide text-ink/70"
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
          className="mt-4 inline-block font-body text-sm uppercase tracking-widest text-ink underline decoration-2 underline-offset-4 hover:text-signal"
        >
          ▸ View
        </a>
      ) : null}
    </Panel>
  );
}

function EpisodeEndCard({ episode }) {
  const next = getNextEpisode(episode.id);
  return (
    <section id="episode-end" tabIndex={-1} className="mx-auto my-16 max-w-xl px-6 text-center">
      <Panel seed={episode.number + 50} className="p-6">
        <p className="font-display text-sm uppercase tracking-widest text-shadow">End of episode</p>
        <div className="mt-4 flex flex-col gap-3">
          {next ? (
            <Link
              to={`/chapters/${next.id}`}
              className="font-display text-lg uppercase text-ink transition-transform duration-[120ms] ease-out hover:translate-x-1"
            >
              ▸ Next episode: {next.title}
            </Link>
          ) : (
            <p className="font-body text-sm text-ink/70">That&rsquo;s the last episode, for now.</p>
          )}
          <Link
            to="/chapters"
            className="font-body text-sm uppercase tracking-widest text-ink/80 transition-transform duration-[120ms] ease-out hover:translate-x-1"
          >
            ▸ Back to chapters
          </Link>
        </div>
      </Panel>
    </section>
  );
}
