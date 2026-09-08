import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import GameCanvas from '../game/GameCanvas.jsx';
import { createScene } from '../game/scenes/index.js';
import { getGame, gameOrder } from '../data/games.js';
import { getEpisodeById } from '../data/episodes.js';
import { useProgress } from '../context/ProgressContext.jsx';

/**
 * `/play/:id` -- the shared chrome around every minigame.
 *
 * The five scene modules render a game and emit events. Everything
 * around the game -- the brief card, the record of what you have
 * uncovered, the results card, the escape hatches -- lives here, once,
 * so the five games stay consistent and a new one is a scene file and a
 * games.js entry, nothing more.
 *
 * THE THREE STATES
 *   brief    what this game is, WHAT PART OF THE RESUME it is, how it is
 *            played, and the whole list of what it will uncover. Shown
 *            before the canvas mounts, so nobody is dropped into a
 *            mechanic they have not been told about.
 *   playing  canvas + the record column, which lists every line of the
 *            record from the first second and fills them in as they land.
 *   results  the outro, the full record, and the ways onward.
 *
 * WHY THE RESUME IS ON SCREEN THE WHOLE TIME
 * Reported live: "it's like we are MORE indulged into the game that the
 * Resume is BARELY JUST NOT THERE." That was true, and it was this
 * file's fault rather than the scenes'. The record column used to start
 * empty ("Nothing yet. Play to fill it.") and grow, so for the first
 * thirty seconds of every game there was literally no resume on screen,
 * and the brief card never said what the mechanic had to do with the
 * person. Three fixes, all here:
 *
 *   1. `game.why` (new field in games.js) states the metaphor in plain
 *      words -- what you are handling while you play -- on the brief
 *      card and again on the results card.
 *   2. The record column is PRE-SEEDED with every beat's label, dim,
 *      from before the first frame. The shape of the episode is visible
 *      immediately and the game fills it in; the resume is the thing
 *      being worked on, not a reward for finishing.
 *   3. The results card prints the FULL record, including the lines a
 *      short run did not reach. A run that ends early may cost you the
 *      door; it may never cost you the content (root CLAUDE.md section 6
 *      rules 1 and 2).
 *
 * WHY THE ESCAPE HATCHES ARE ALWAYS ON SCREEN
 * "Read it straight" (to /chapters/:id) is present in all three states,
 * not tucked into a menu. The game is a way to read this episode, never
 * the way. The results card additionally offers the next door after a
 * failed run, so a visitor who cannot beat a minigame is never walled
 * off from the rest of the floor.
 *
 * WHY THE PLAYING LAYOUT IS HEIGHT-BOUND
 * Reported live: "in level 3 the screen goes into scrollable at the end."
 * The record column's list has no height of its own, so once eight beats
 * had landed the aside grew past the viewport and took the whole page
 * with it -- the canvas scrolled out from under the player mid-game. The
 * playing layout is now exactly one viewport tall on `lg` with the list
 * scrolling INSIDE the column (`min-h-0`, which a flex child needs
 * before `overflow-y-auto` will do anything).
 */
export default function Play() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { clearEpisode, isCleared } = useProgress();

  const game = useMemo(() => getGame(id), [id]);
  const episode = useMemo(() => getEpisodeById(id), [id]);

  const [phase, setPhase] = useState('brief');
  const [revealed, setRevealed] = useState([]);
  const [progress, setProgress] = useState(0);
  const [outcome, setOutcome] = useState(null);
  const [stat, setStat] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [latest, setLatest] = useState(null);

  // A factory identity that only changes when we actually want a fresh
  // game. GameCanvas rebuilds the engine when `scene` changes, so a
  // stable reference is what stops a parent re-render from restarting a
  // run mid-play.
  const [runKey, setRunKey] = useState(0);
  const sceneFactory = useCallback(
    () =>
      createScene(game.kind, {
        beats: game.beats,
        episode,
        // Optional, liveGraph only. Mechanical box labels live in
        // games.js because a scene file may not contain copy.
        modules: game.modules,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [game, episode, runKey],
  );

  const handleEvent = useCallback(
    (name, data) => {
      if (name === 'reveal') {
        const beat = game.beats[data.index];
        if (!beat) return;
        setRevealed((prev) => (prev.some((b) => b.label === beat.label) ? prev : [...prev, beat]));
        setLatest(beat);
      } else if (name === 'progress') {
        setProgress(data.value ?? 0);
      } else if (name === 'done') {
        setOutcome(data.outcome);
        setStat(data.stat ?? '');
        setPhase('results');
        if (data.outcome === 'win') clearEpisode(id);
      }
    },
    [game, clearEpisode, id],
  );

  if (!game || !episode) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink px-6 text-center">
        <p className="font-display text-xl uppercase text-bone">No such episode.</p>
        <Link to="/floor" className="font-body text-sm uppercase tracking-widest text-signal underline">
          Back to the floor
        </Link>
      </main>
    );
  }

  const startRun = () => {
    setRevealed([]);
    setProgress(0);
    setOutcome(null);
    setLatest(null);
    setAttempts((n) => n + 1);
    setRunKey((n) => n + 1);
    setPhase('playing');
  };

  const nextId = (() => {
    const index = gameOrder.indexOf(id);
    return index >= 0 && index < gameOrder.length - 1 ? gameOrder[index + 1] : null;
  })();

  const isRevealed = (beat) => revealed.some((b) => b.label === beat.label);

  return (
    <main className="game-surface relative min-h-screen bg-ink">
      {phase === 'brief' ? (
        <BriefCard game={game} episode={episode} onStart={startRun} cleared={isCleared(id)} />
      ) : null}

      {phase !== 'brief' ? (
        <div className="flex min-h-screen flex-col lg:h-screen lg:min-h-0 lg:flex-row lg:overflow-hidden">
          <div className="relative min-h-[52vh] flex-1 lg:min-h-0">
            <GameCanvas
              scene={sceneFactory}
              onEvent={handleEvent}
              paused={phase === 'results'}
              label={`${game.title}. ${game.brief} ${game.controls.key}.`}
              announce={latest ? `${latest.label}. ${latest.text}` : ''}
            />
            <ProgressBar value={progress} />
            {latest && phase === 'playing' ? <RevealFlash beat={latest} /> : null}
          </div>

          <RecordColumn
            game={game}
            episode={episode}
            isRevealed={isRevealed}
            count={revealed.length}
            episodeId={id}
            onLeave={() => navigate('/floor')}
          />
        </div>
      ) : null}

      {phase === 'results' ? (
        <ResultsCard
          game={game}
          episode={episode}
          isRevealed={isRevealed}
          count={revealed.length}
          outcome={outcome}
          stat={stat}
          attempts={attempts}
          nextId={nextId}
          onReplay={startRun}
          onUnlockAnyway={() => {
            clearEpisode(id);
            navigate('/floor');
          }}
        />
      ) : null}
    </main>
  );
}

/**
 * The brief. Answers, in this order: which episode of the resume is
 * this, what does the mechanic stand for, how do I play it, what will I
 * learn, and how do I skip straight to reading it.
 *
 * The "what this uncovers" list is deliberately the beat LABELS and not
 * their text: enough to see the shape of the episode and decide whether
 * to play, not so much that playing is pointless.
 */
function BriefCard({ game, episode, onStart, cleared }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl border-[3px] border-bone/30 bg-shadow/40 p-7 sm:p-10">
        <p className="font-body text-xs uppercase tracking-[0.28em] text-bone/50">
          Episode {episode.number} · {episode.title}
        </p>
        <h1 className="mt-2 font-display text-2xl uppercase leading-none text-signal">{game.title}</h1>
        <p className="mt-1 font-body text-sm text-bone/55">{episode.subtitle}</p>

        <p className="mt-5 border-l-[3px] border-bone/25 pl-4 font-body text-base leading-snug text-bone/85">
          {game.why}
        </p>

        <dl className="mt-6 space-y-3 border-t border-bone/15 pt-5">
          <div>
            <dt className="font-body text-xs uppercase tracking-[0.2em] text-bone/45">
              How it plays · {game.verb}
            </dt>
            <dd className="mt-1 font-body text-sm text-bone/80">{game.brief}</dd>
          </div>
          <div>
            <dt className="font-body text-xs uppercase tracking-[0.2em] text-bone/45">Goal</dt>
            <dd className="mt-1 font-body text-sm text-bone/80">{game.goal}</dd>
          </div>
          <div>
            <dt className="font-body text-xs uppercase tracking-[0.2em] text-bone/45">Controls</dt>
            <dd className="mt-1 font-body text-sm text-bone/80">
              {game.controls.key} · {game.controls.pointer}
            </dd>
          </div>
        </dl>

        <div className="mt-6 border-t border-bone/15 pt-5">
          <p className="font-body text-xs uppercase tracking-[0.2em] text-bone/45">
            What you will uncover · {game.beats.length} lines
          </p>
          <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {game.beats.map((beat, i) => (
              <li key={beat.label} className="font-display text-[11px] uppercase tracking-[0.16em] text-bone/60">
                {beat.label}
                {i < game.beats.length - 1 ? <span className="ml-3 text-bone/25">·</span> : null}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onStart}
            className="border-[3px] border-signal bg-transparent px-6 py-3 font-display text-lg uppercase text-signal transition-transform duration-[120ms] ease-out hover:translate-x-1"
          >
            ▸ {cleared ? 'Play again' : 'Begin'}
          </button>
          <Link
            to={`/chapters/${episode.id}`}
            className="font-body text-sm uppercase tracking-widest text-bone/70 underline decoration-2 underline-offset-4 hover:text-bone"
          >
            Read it straight
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
          <Link
            to="/floor"
            className="font-body text-xs uppercase tracking-[0.2em] text-bone/45 hover:text-bone/80"
          >
            ◂ Back to the floor
          </Link>
          <Link
            to="/plain"
            className="font-body text-xs uppercase tracking-[0.2em] text-bone/45 hover:text-bone/80"
          >
            Plain resume
          </Link>
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ value }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-bone/10">
      <div
        className="h-full bg-signal transition-[width] duration-300 ease-out"
        style={{ width: `${Math.round(value * 100)}%` }}
      />
    </div>
  );
}

/**
 * The beat you just earned, shown large over the game for a moment.
 * This is the payload -- if a visitor plays and learns nothing, the whole
 * concept has failed -- so it is deliberately hard to miss, and it is
 * also written permanently into the record column so nothing scrolls
 * past unread.
 */
function RevealFlash({ beat }) {
  return (
    <div
      key={beat.label}
      className="pointer-events-none absolute inset-x-4 bottom-4 mx-auto max-w-lg border-l-[3px] border-signal bg-ink/92 px-4 py-3 sm:inset-x-8"
    >
      <p className="font-display text-xs uppercase tracking-[0.2em] text-signal">{beat.label}</p>
      <p className="mt-1 font-body text-sm leading-snug text-bone">{beat.text}</p>
    </div>
  );
}

/**
 * The record. Every line of the episode is listed from the first frame,
 * unreached ones dim and headed only by their label; a line fills in
 * with its text the moment the game pays it out. So the column is a
 * table of contents that is being completed, rather than an empty box
 * that might eventually contain something.
 */
function RecordColumn({ game, episode, isRevealed, count, episodeId, onLeave }) {
  return (
    <aside className="flex w-full shrink-0 flex-col border-t-[3px] border-bone/15 bg-shadow/25 p-5 lg:h-full lg:w-80 lg:border-l-[3px] lg:border-t-0">
      <p className="font-body text-[10px] uppercase tracking-[0.24em] text-bone/40">
        Episode {episode.number} · {episode.title}
      </p>
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-sm uppercase tracking-[0.2em] text-bone/70">The record</h2>
        <span className="shrink-0 font-body text-xs text-bone/45">
          {count} / {game.beats.length}
        </span>
      </div>

      <ol className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {game.beats.map((beat) => {
          const open = isRevealed(beat);
          return (
            <li
              key={beat.label}
              className={`border-l-2 pl-3 ${open ? 'border-bone/25' : 'border-bone/10'}`}
            >
              <p
                className={`font-display text-[11px] uppercase tracking-[0.18em] ${
                  open ? 'text-bone/55' : 'text-bone/30'
                }`}
              >
                {beat.label}
              </p>
              {open ? (
                <p className="font-body text-sm leading-snug text-bone/90">{beat.text}</p>
              ) : (
                <p className="font-body text-xs text-bone/25">Not reached yet.</p>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-5 flex flex-col gap-2 border-t border-bone/15 pt-4">
        <Link
          to={`/chapters/${episodeId}`}
          className="font-body text-xs uppercase tracking-[0.2em] text-bone/70 underline decoration-2 underline-offset-4 hover:text-bone"
        >
          Read it straight
        </Link>
        <button
          type="button"
          onClick={onLeave}
          className="text-left font-body text-xs uppercase tracking-[0.2em] text-bone/45 hover:text-bone/80"
        >
          ◂ Leave the room
        </button>
      </div>
    </aside>
  );
}

/**
 * The results card prints the WHOLE record, not a score.
 *
 * Lines you reached are printed plainly; lines you did not are printed
 * too, marked as unreached. That is not a consolation prize -- it is the
 * rule: the game may be lost, the resume may not be locked. The stat and
 * the outcome are one small line at the top, because the numbers are the
 * least interesting thing on this screen.
 */
function ResultsCard({
  game,
  episode,
  isRevealed,
  count,
  outcome,
  stat,
  attempts,
  nextId,
  onReplay,
  onUnlockAnyway,
}) {
  const won = outcome === 'win';
  const missed = game.beats.length - count;
  return (
    <div className="absolute inset-0 z-30 flex items-start justify-center overflow-y-auto bg-ink/94 px-6 py-12">
      <div className="my-auto w-full max-w-lg border-[3px] border-bone/30 bg-shadow/40 p-7 sm:p-9">
        <p className="font-body text-xs uppercase tracking-[0.28em] text-bone/50">
          {won ? 'Door open' : 'Run ended'} · {stat}
        </p>
        <h2 className="mt-2 font-display text-xl uppercase leading-tight text-bone">{game.title}</h2>
        <p className="mt-1 font-body text-sm text-bone/55">
          Episode {episode.number} · {episode.title}
        </p>

        <p className="mt-4 border-l-[3px] border-signal pl-4 font-body text-base text-bone/85">
          {game.outro}
        </p>
        <p className="mt-3 font-body text-sm leading-snug text-bone/60">{game.why}</p>

        <h3 className="mt-7 font-body text-xs uppercase tracking-[0.2em] text-bone/45">
          The record · {count} of {game.beats.length} uncovered
        </h3>
        <ol className="mt-3 space-y-3 border-t border-bone/15 pt-4">
          {game.beats.map((beat) => {
            const open = isRevealed(beat);
            return (
              <li key={beat.label} className={`border-l-2 pl-3 ${open ? 'border-bone/30' : 'border-bone/10'}`}>
                <p className="font-display text-[11px] uppercase tracking-[0.18em] text-bone/55">
                  {beat.label}
                  {open ? null : <span className="ml-2 text-bone/30">· not reached</span>}
                </p>
                <p className={`font-body text-sm leading-snug ${open ? 'text-bone/90' : 'text-bone/45'}`}>
                  {beat.text}
                </p>
              </li>
            );
          })}
        </ol>
        {missed > 0 ? (
          <p className="mt-3 font-body text-xs text-bone/40">
            The lines you did not reach are printed anyway. The game can be lost; the record cannot be
            locked.
          </p>
        ) : null}

        <div className="mt-7 flex flex-col gap-3">
          <Link
            to={`/chapters/${episode.id}`}
            className="border-[3px] border-signal px-5 py-2.5 text-center font-display text-base uppercase text-signal transition-transform duration-[120ms] ease-out hover:translate-x-1"
          >
            ▸ Read the full episode
          </Link>
          <button
            type="button"
            onClick={onReplay}
            className="border-[3px] border-bone/30 px-5 py-2.5 font-display text-base uppercase text-bone/85 transition-transform duration-[120ms] ease-out hover:translate-x-1"
          >
            ▸ Run it again
          </button>
          <Link
            to="/floor"
            className="px-1 py-1 font-body text-sm uppercase tracking-widest text-bone/70 underline decoration-2 underline-offset-4 hover:text-bone"
          >
            {won && nextId ? 'Back to the floor, next door is open' : 'Back to the floor'}
          </Link>
          <Link
            to="/plain"
            className="px-1 py-1 font-body text-xs uppercase tracking-[0.2em] text-bone/45 underline decoration-1 underline-offset-4 hover:text-bone/80"
          >
            All of it on one page: the plain resume
          </Link>
          {/*
            The skill-check release valve. Only offered once someone has
            actually struggled, so it never undercuts a first win — but it
            has to exist, because a locked door plus a game you cannot
            beat would put resume content behind a reflex test.
          */}
          {!won && attempts >= 2 ? (
            <button
              type="button"
              onClick={onUnlockAnyway}
              className="px-1 py-1 text-left font-body text-xs uppercase tracking-[0.2em] text-bone/45 underline decoration-1 underline-offset-4 hover:text-bone/80"
            >
              Open the next door anyway
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
