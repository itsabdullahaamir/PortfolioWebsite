import { useState } from 'react';
import { Link } from 'react-router-dom';
import Panel from '../components/Panel.jsx';
import RevealPanel from '../components/RevealPanel.jsx';
import { episodes } from '../data/episodes.js';
import { useProgress } from '../context/ProgressContext.jsx';
import { useSound } from '../lib/sound.js';

/**
 * `/chapters` — the nav-bar replacement, spec section 4.2. Rebuilt this
 * batch to match a live Telltale episode-select screenshot the user
 * supplied directly (their in-game episode menu: a big "now showing"
 * panel with synopsis + a Start button, and a filmstrip of episode tiles
 * underneath it), rather than the plain responsive grid this screen used
 * to be. Structurally still a spec 4.2 layout — nothing here is locked,
 * visited episodes still get a `--signal` corner mark, cover art still
 * falls back to a flat silhouette — the change is purely how the five
 * episodes are arranged.
 *
 * Interaction model, deliberately copying the reference: clicking a
 * filmstrip tile does NOT navigate — it changes which episode the hero
 * panel above is previewing (`selectedId` state). The hero panel's own
 * "Start Episode" button is the actual `Link` that opens `/chapters/:id`.
 * This is one extra step versus a plain grid of links, but every control
 * involved is a real, independently focusable `<button>`/`<a>`, so the
 * screen is still fully keyboard/no-timer/nothing-ever-locked compliant
 * (spec section 2) — a keyboard user just reaches an episode via Tab to
 * the (now-updated) Start button rather than activating a tile directly,
 * same as a controller user would on the actual reference UI.
 *
 * Defaults the hero to `useProgress().lastEpisodeId` (the visitor's most
 * recently opened episode) when one exists, falling back to episode 1 —
 * "resume where you left off" is exactly what the reference screenshot's
 * pre-selected tile communicates.
 *
 * The filmstrip reuses `Panel.jsx` for each tile (not a hand-rolled
 * rectangle) so it carries the same irregular clip-path/hard-shadow
 * language as the hero and every content panel elsewhere in the app.
 * Panel isn't ref-forwarding, so there is no arrow-key roving-focus
 * across tiles here (unlike `MainMenu.jsx`/`DialogueChoice.jsx`) — native
 * Tab order between the tile buttons already satisfies keyboard access,
 * and forwarding refs through the shared Panel primitive for one screen
 * wasn't worth the shared-component risk.
 */
export default function ChapterSelect() {
  const { isVisited, lastEpisodeId } = useProgress();
  const [selectedId, setSelectedId] = useState(lastEpisodeId ?? episodes[0].id);
  const [hoveredId, setHoveredId] = useState(null);
  const playSound = useSound();

  const selected = episodes.find((ep) => ep.id === selectedId) ?? episodes[0];
  const selectedVisited = isVisited(selected.id);

  return (
    <main className="min-h-full px-6 py-10 sm:px-12">
      <div className="mb-8 flex items-center justify-between">
        <Link
          to="/"
          className="font-body text-sm uppercase tracking-widest text-ink underline decoration-2 underline-offset-4"
        >
          ← Title
        </Link>
        <span className="font-display text-sm uppercase tracking-widest text-shadow">Season 1</span>
      </div>

      {/* Hero — the "now showing" panel, spec 4.2's card content
          rearranged to match the reference's info-left / art-right split. */}
      <RevealPanel index={0}>
        <Panel seed={selected.number}>
          <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr]">
            <div className="flex flex-col justify-center gap-3 p-6 sm:p-8">
              <p className="font-display text-sm uppercase tracking-widest text-dusk">
                Episode {selected.number}
              </p>
              <h1 className="font-display text-3xl uppercase leading-tight text-ink sm:text-4xl">
                {selected.title}
              </h1>
              <p className="font-body text-xs uppercase tracking-wide text-shadow">
                {selectedVisited ? '✓ Viewed' : '○ Not yet viewed'}
              </p>
              <p className="font-body text-base text-ink/80">{selected.subtitle}</p>
              <p className="font-body italic text-ink/70">&ldquo;{selected.choicePrompt}&rdquo;</p>
              <Link
                to={`/chapters/${selected.id}`}
                onClick={() => playSound('select')}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 border-[3px] border-ink bg-signal px-6 py-3 font-display text-lg uppercase tracking-wide text-bone shadow-[6px_6px_0_var(--ink)] transition-transform duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[8px_8px_0_var(--ink)] sm:w-auto"
              >
                ▸ Start Episode {selected.number}
              </Link>
            </div>
            <div className="relative order-first lg:order-last">
              <CoverFallback number={selected.number} />
              {selectedVisited ? (
                <span
                  aria-hidden="true"
                  className="absolute right-2 top-2 h-5 w-5 bg-signal"
                  style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }}
                />
              ) : null}
            </div>
          </div>
        </Panel>
      </RevealPanel>

      {/* Filmstrip — episode tiles. Selecting one updates the hero above;
          it does not navigate. */}
      <div className="mt-8">
        <p className="mb-3 font-display text-xs uppercase tracking-widest text-shadow">Episodes</p>
        <ul className="flex gap-4 overflow-x-auto pb-3">
          {episodes.map((ep, index) => {
            const visited = isVisited(ep.id);
            const isSelected = ep.id === selected.id;
            const dimmed = hoveredId !== null && hoveredId !== ep.id && !isSelected;
            return (
              <li key={ep.id} className="shrink-0">
                <RevealPanel index={index}>
                  <Panel
                    as="button"
                    type="button"
                    seed={ep.number}
                    aria-pressed={isSelected}
                    aria-label={`Episode ${ep.number}: ${ep.title}${visited ? ' (viewed)' : ''}`}
                    onClick={() => {
                      setSelectedId(ep.id);
                      if (!isSelected) playSound('navigate');
                    }}
                    onMouseEnter={() => setHoveredId(ep.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onFocus={() => setHoveredId(ep.id)}
                    onBlur={() => setHoveredId(null)}
                    className="block w-32 p-2 text-left transition-opacity duration-150 ease-out sm:w-40"
                    style={{ opacity: dimmed ? 0.7 : 1 }}
                  >
                    <div className="relative">
                      <CoverFallback number={ep.number} small />
                      {visited ? (
                        <span
                          aria-hidden="true"
                          className="absolute right-1 top-1 h-3 w-3 bg-signal"
                          style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }}
                        />
                      ) : null}
                    </div>
                    <p className="mt-2 font-display text-[10px] uppercase tracking-widest text-shadow">
                      Episode {ep.number}
                    </p>
                    <p
                      className={`truncate font-display text-xs uppercase ${isSelected ? 'text-dusk' : 'text-ink'}`}
                    >
                      {isSelected ? '▸ ' : ''}
                      {ep.title}
                    </p>
                  </Panel>
                </RevealPanel>
                {visited ? <span className="sr-only">Visited</span> : null}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-8">
        <Link
          to="/plain"
          className="font-body text-sm uppercase tracking-widest text-ink underline decoration-2 underline-offset-4"
        >
          <span className="text-signal" aria-hidden="true">
            ▸
          </span>{' '}
          View full resume (PDF)
        </Link>
      </div>
    </main>
  );
}

function CoverFallback({ number, small = false }) {
  return (
    <div
      aria-hidden="true"
      className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-shadow to-dusk"
    >
      <span className={`font-display text-bone/20 ${small ? 'text-lg' : 'text-3xl'}`}>EP {number}</span>
    </div>
  );
}
