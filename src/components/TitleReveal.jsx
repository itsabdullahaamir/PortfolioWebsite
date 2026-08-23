import { useEffect, useState } from 'react';
import TitleBackdrop from './TitleBackdrop.jsx';

/**
 * Beat 2 of the opening sequence — spec section 4.1.
 * Full-bleed backdrop with the name resolving on top using the
 * comic-cover lettering treatment (spec 3.4): heavy distressed display
 * face, --bone/off-white only (never --signal — that's reserved for UI,
 * not the logotype), a dark gradient under the text for contrast, no
 * card or box behind it.
 *
 * No painted art exists yet (src/assets/title-art/ is empty, see
 * src/assets/CLAUDE.md), so the backdrop is `TitleBackdrop.jsx`, a
 * code-only layered-silhouette placeholder shared with MainMenu.jsx (see
 * that file's doc comment for why a flat gradient wasn't acceptable per
 * spec 4.1). Swapping in the real painted scene later means retiring
 * TitleBackdrop and pointing TITLE_ART_URL below at the asset.
 *
 * The distressed/torn-edge letterform filter (SVG feTurbulence +
 * feDisplacementMap, applied as a CSS `filter: url(#...)` on the name
 * span) and the restrained ink-splatter accent from spec 3.4 are now
 * implemented below — previously deferred, closing that gap.
 *
 * Holds 1.5-2s then calls onDone. Skippable by click/tap at any time via
 * a full-bleed button (same pattern as PresentsCard.jsx); TitleScreen
 * also attaches a window-level keydown listener so any key skips too.
 * Auto-skipped instantly under prefers-reduced-motion.
 */

// import titleArt from '../assets/title-art/scene.webp'; // set this when real art lands
const TITLE_ART_URL = null;
const HOLD_MS = 1800; // 1.5-2s hold per spec 4.1 beat 2

export default function TitleReveal({ onDone, reducedMotion }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (reducedMotion) {
      onDone();
      return undefined;
    }
    const raf = requestAnimationFrame(() => setVisible(true));
    const doneTimer = setTimeout(onDone, HOLD_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(doneTimer);
    };
  }, [onDone, reducedMotion]);

  return (
    <button
      type="button"
      onClick={onDone}
      aria-label="Skip title reveal"
      className={`fixed inset-0 z-40 flex flex-col items-center justify-end gap-2 overflow-hidden pb-20 text-center sm:pb-28 ${
        TITLE_ART_URL ? 'bg-cover bg-center' : ''
      }`}
      style={TITLE_ART_URL ? { backgroundImage: `url(${TITLE_ART_URL})` } : undefined}
    >
      {!TITLE_ART_URL ? <TitleBackdrop reducedMotion={reducedMotion} /> : null}

      {/* Dark gradient under the text for contrast, per spec 3.4. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent"
      />

      {/* SVG filter for the distressed/torn-edge letterform treatment
          (spec 3.4). feTurbulence generates noise, feDisplacementMap
          uses it to jitter the text's edges.

          The frequency must stay HIGH and roughly isotropic. An earlier
          version used baseFrequency="0.01 0.09" with scale="5": the 0.01
          horizontal term is a very low frequency, meaning one long smooth
          wave across the whole word rather than fine noise, so the
          displacement bent the entire name instead of chewing its edges —
          it read as the text being skewed/slanted, not distressed. Fine
          noise (0.055) at a small scale (1.8) roughens the outline only
          and leaves the baseline visually straight. */}
      <svg width="0" height="0" aria-hidden="true">
        <filter id="title-distressed-edge" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.055" numOctaves="3" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.8" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      <span
        className="relative flex flex-col items-center gap-2 px-6 transition-opacity duration-700 ease-out"
        style={{ opacity: visible ? 1 : 0 }}
      >
        <span className="font-body text-xs uppercase tracking-[0.4em] text-bone/70">A game by</span>
        <span className="relative inline-block">
          <span
            className="font-display text-3xl uppercase tracking-wide text-bone sm:text-4xl"
            style={{ filter: 'url(#title-distressed-edge) drop-shadow(2px 2px 0 var(--ink))' }}
          >
            Abdullah Aamir
          </span>
          {/* Restrained ink-splatter accent bleeding from one corner of
              the name, per spec 3.4 — not smeared across the word. */}
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-2 -right-1 h-6 w-10 opacity-80"
            viewBox="0 0 40 24"
          >
            <circle cx="4" cy="3" r="1.6" fill="var(--ink)" />
            <circle cx="10" cy="8" r="3" fill="var(--ink)" />
            <circle cx="17" cy="14" r="1.8" fill="var(--ink)" />
            <path
              d="M10 11 C 9 15, 8 18, 6 21"
              stroke="var(--ink)"
              strokeWidth="1.4"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span className="font-body text-sm uppercase tracking-[0.3em] text-bone/80">
          a resume, sort of
        </span>
      </span>
    </button>
  );
}
