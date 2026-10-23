import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { designFrames, designProfile, designWorks, frameIndexOf } from '../data/design.js';
import { useSound } from '../lib/sound.js';

/**
 * `/design` — the graphic-design surface. Real artwork produced for
 * TEDxFASTIslamabad 2026, shown at the size it was published.
 *
 * NOT IN THE ORIGINAL SPEC. Added on direct user request, with the ask
 * being a link that can be sent to someone as proof of the role. That
 * phrasing decided almost every call below:
 *
 * - It is its own route, so the link is one URL with nothing in front of
 *   it. A recruiter who is sent `/design` lands on the work, not on a
 *   title sequence they have to get through first.
 * - It is UNGATED, like `/chapters` and `/plain` and unlike `/floor`.
 *   Root CLAUDE.md section 6 rule 1 would not tolerate anything else.
 * - It is a NIGHT screen (ink ground, bone type) rather than a paper
 *   one. Two reasons, and the second is the real one: it sits one level
 *   in from the menu, so the camera dolly in `PageTransition.jsx` reads
 *   as moving through the same place rather than cutting to a different
 *   theme (the exact defect `ChapterSelect.jsx` was rebuilt for, see the
 *   root CLAUDE.md phase 4); and all ten pieces are dark, high-contrast
 *   TED red artwork, which on a cream ground would each have sat in
 *   their own bright rectangle like slides in a deck.
 *
 * WHY THE SCREEN ITSELF IS ALMOST COLOURLESS. Spec section 3.1 allows
 * three uses of `--signal` per screen. This one spends ONE at rest (the
 * rule under the masthead) and at most two more transiently (a hovered
 * tile's border, the lightbox counter). That is not frugality for its
 * own sake: every piece of artwork on this page is already built out of
 * TED red, and chrome in a near-identical red would have competed with
 * the work it is framing.
 *
 * THE ESCAPE KEY, which is the one genuinely fiddly thing here.
 * `../components/EscapeBack.jsx` owns a window `keydown` listener that
 * sends ESC one level up the route hierarchy, and it is mounted in
 * `App.jsx` — i.e. BEFORE this screen ever mounts. Listeners on the same
 * target fire in registration order within a phase, so a plain listener
 * added here would run second and the visitor would get navigated to `/`
 * instead of having the lightbox closed. The lightbox therefore listens
 * in the CAPTURE phase and calls `stopPropagation()`: capture on `window`
 * runs before the event has reached its target at all, so stopping there
 * cancels the whole bubble phase, `EscapeBack`'s listener included. The
 * alternative was teaching `EscapeBack` about modals, which would make a
 * shared global handler grow a special case every time a screen opened
 * an overlay.
 *
 * IMAGES. Two files per frame, both WebP, both prepared ahead of time
 * (see `../data/design.js`'s image contract): a 640px thumbnail for the
 * tile and a 1200px version for the lightbox. Tiles are `loading="lazy"`
 * and reserve their box from the `w`/`h` recorded in the data, so the
 * grid does not reflow as the bytes land. The full-size file for a given
 * frame is only ever requested when that frame is opened, which is what
 * keeps a ten-piece gallery inside the spec section 7 load budget.
 *
 * `min-h-screen`, not `min-h-full` — `PageTransition.jsx` is
 * `display: contents` at rest, so it generates no box and a percentage
 * height has nothing to resolve against. That exact bug left a band of
 * cream under `ChapterSelect.jsx` once; see the root CLAUDE.md phase 4.
 * `night-surface` is the matching fix for the scrollbar gutter, which
 * paints the body background and would otherwise run a cream stripe down
 * the right edge of a full-bleed dark screen (see `../index.css`).
 *
 * No copy lives in this file. Every reader-facing string comes from
 * `../data/design.js`, same rule as every other screen.
 */

const ACTION =
  'border border-bone/25 px-3 py-2 font-body text-[11px] uppercase tracking-[0.14em] text-bone/70 transition-colors duration-150 hover:border-bone/60 hover:text-bone';

function assetUrl(name, variant) {
  return `${import.meta.env.BASE_URL}design/${name}${variant}.webp`;
}

/** A work's frames all share one aspect ratio, so the column count can be
 *  derived from the first frame rather than carried as a layout field in
 *  the content file: landscape art gets at most two across, portrait art
 *  three, and a single frame is capped so it does not blow up to the full
 *  column width. */
function columnsFor(work) {
  if (work.frames.length === 1) return 'grid-cols-1 max-w-sm';
  if (work.frames[0].w > work.frames[0].h) return 'grid-cols-1 sm:grid-cols-2';
  return 'grid-cols-2 lg:grid-cols-3';
}

function Lightbox({ index, onClose, onStep }) {
  const frame = designFrames[index];
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    // Capture phase + stopPropagation — see this file's doc comment. This
    // has to beat EscapeBack.jsx's window listener, which was registered
    // first and would otherwise navigate away instead of closing this.
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        event.preventDefault();
        onClose();
      } else if (event.key === 'ArrowRight') {
        event.stopPropagation();
        event.preventDefault();
        onStep(1);
      } else if (event.key === 'ArrowLeft') {
        event.stopPropagation();
        event.preventDefault();
        onStep(-1);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onClose, onStep]);

  // The ground is fully opaque rather than a tinted scrim. `--ink` is
  // near-black and the page behind it is high-contrast bone type, so even
  // a five percent bleed left headings legible through the overlay and the
  // artwork ended up being read against somebody else's paragraph.
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${frame.workTitle}: ${frame.caption}`}
      className="fixed inset-0 z-50 flex flex-col bg-ink p-4 sm:p-6"
    >
      {/* The backdrop is its own button so a click anywhere outside the
          artwork closes, without making the whole dialog a click target
          (which would swallow the controls below). */}
      <button
        type="button"
        aria-label={designProfile.closeLabel}
        onClick={onClose}
        className="absolute inset-0 cursor-default border-none bg-transparent"
      />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-display text-xs uppercase tracking-[0.14em] text-bone/60">
            {frame.workTitle}
          </p>
          <p className="mt-1 font-body text-sm text-bone/80">{frame.caption}</p>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className={`${ACTION} shrink-0`}
        >
          {designProfile.closeLabel}
        </button>
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center py-4">
        <img
          src={assetUrl(frame.name, '')}
          alt={`${frame.workTitle}: ${frame.caption}`}
          width={frame.w}
          height={frame.h}
          className="max-h-full w-auto max-w-full object-contain"
        />
      </div>

      <div className="relative z-10 flex items-center justify-center gap-4">
        <button type="button" onClick={() => onStep(-1)} className={ACTION}>
          <span aria-hidden="true">◂</span> {designProfile.previousLabel}
        </button>
        <p className="font-display text-xs tracking-[0.14em] text-signal">
          {index + 1} / {designFrames.length}
        </p>
        <button type="button" onClick={() => onStep(1)} className={ACTION}>
          {designProfile.nextLabel} <span aria-hidden="true">▸</span>
        </button>
      </div>
    </div>
  );
}

export default function DesignGallery() {
  const [openIndex, setOpenIndex] = useState(null);
  const tileRefs = useRef({});
  const playSound = useSound();

  const open = (name) => {
    playSound('select');
    setOpenIndex(frameIndexOf(name));
  };

  const close = useCallback(() => {
    setOpenIndex((current) => {
      // Hand focus back to the tile that opened the lightbox rather than
      // dropping it on <body>, so a keyboard visitor resumes where they
      // left off instead of at the top of the document.
      const frame = current == null ? null : designFrames[current];
      if (frame) tileRefs.current[frame.name]?.focus();
      return null;
    });
  }, []);

  const step = useCallback((delta) => {
    playSound('navigate');
    setOpenIndex((current) => {
      if (current == null) return current;
      return (current + delta + designFrames.length) % designFrames.length;
    });
  }, [playSound]);

  return (
    <main className="night-surface relative min-h-screen bg-ink px-6 pb-20 pt-8 text-bone sm:px-10 lg:px-16">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/" className={ACTION}>
            <span aria-hidden="true">◂</span> {designProfile.backLabel}
          </Link>
          <Link to="/plain" className={ACTION}>
            <span aria-hidden="true">▤</span> {designProfile.resumeLabel}
          </Link>
        </div>

        <header className="mt-10">
          <p className="font-body text-[11px] uppercase tracking-[0.22em] text-bone/55">
            {designProfile.eyebrow} · {designProfile.org}
          </p>
          <h1 className="mt-3 font-display text-2xl uppercase leading-none tracking-tight text-bone sm:text-3xl">
            {designProfile.title}
          </h1>
          <span aria-hidden="true" className="mt-5 block h-[3px] w-16 bg-signal" />
          <p className="mt-5 font-body text-sm uppercase tracking-[0.14em] text-bone/70">
            {designProfile.role} · {designProfile.timespan}
          </p>
          <p className="mt-5 max-w-2xl font-body text-base leading-relaxed text-bone/80">
            {designProfile.summary}
          </p>
          <p className="mt-3 max-w-2xl font-body text-xs leading-relaxed text-bone/50">
            {designProfile.note}
          </p>
        </header>

        {designWorks.map((work) => (
          <section key={work.id} id={work.id} className="mt-16 scroll-mt-8">
            <div className="flex items-baseline gap-3 border-b border-bone/15 pb-3">
              <span className="font-display text-xs text-bone/40">{work.number}</span>
              <h2 className="font-display text-lg uppercase tracking-tight text-bone sm:text-xl">
                {work.title}
              </h2>
            </div>
            <p className="mt-3 font-body text-xs uppercase tracking-[0.14em] text-bone/50">
              {work.kind}
            </p>
            <p className="mt-4 max-w-2xl font-body text-sm leading-relaxed text-bone/80">
              {work.note}
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {work.tags.map((tag) => (
                <li
                  key={tag}
                  className="border border-bone/20 px-2 py-1 font-body text-[11px] uppercase tracking-[0.1em] text-bone/60"
                >
                  {tag}
                </li>
              ))}
            </ul>

            <div className={`mt-6 grid gap-4 ${columnsFor(work)}`}>
              {work.frames.map((frame) => (
                <figure key={frame.name} className="m-0">
                  <button
                    ref={(el) => (tileRefs.current[frame.name] = el)}
                    type="button"
                    onClick={() => open(frame.name)}
                    className="block w-full cursor-zoom-in border border-bone/20 bg-ink p-0 transition-colors duration-150 hover:border-signal"
                  >
                    <img
                      src={assetUrl(frame.name, '-thumb')}
                      alt={`${work.title}: ${frame.caption}`}
                      width={frame.w}
                      height={frame.h}
                      loading="lazy"
                      decoding="async"
                      className="block w-full"
                      style={{ aspectRatio: `${frame.w} / ${frame.h}` }}
                    />
                  </button>
                  <figcaption className="mt-2 font-body text-[11px] uppercase tracking-[0.1em] text-bone/50">
                    {frame.caption}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        ))}

        <div className="mt-16 flex flex-wrap gap-3 border-t border-bone/15 pt-8">
          <Link to="/" className={ACTION}>
            <span aria-hidden="true">◂</span> {designProfile.backLabel}
          </Link>
          <Link to="/plain" className={ACTION}>
            <span aria-hidden="true">▤</span> {designProfile.resumeLabel}
          </Link>
          <Link to="/chapters" className={ACTION}>
            <span aria-hidden="true">▸</span> {designProfile.chaptersLabel}
          </Link>
        </div>
      </div>

      {openIndex != null ? (
        <Lightbox index={openIndex} onClose={close} onStep={step} />
      ) : null}
    </main>
  );
}
