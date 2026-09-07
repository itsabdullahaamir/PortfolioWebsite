import { profile } from '../data/profile.js';

/**
 * Beat 0 — new this batch, ahead of spec §4.1's original 3-beat opening
 * sequence (PresentsCard -> TitleReveal -> MainMenu). A full-bleed
 * "PRESS START"-style gate: solid --ink screen, click/tap/any-key to
 * enter — the "old school" arcade cue the user asked for directly.
 *
 * Why this exists: no browser will play ANY audio (Web Audio, <audio>,
 * <video>) before a genuine user gesture happens on that pageload — a
 * hard, universal platform restriction, not something fixable in code
 * (see TitleScreen.jsx and src/lib/sound.js's doc comments for the full
 * history of chasing this constraint before landing here). Every
 * previous attempt tried to catch an INCIDENTAL click during beats 1-2;
 * this screen asks for the click up front instead, in-universe, so
 * `sounds.intro` (the "Netflix ta-dum" signature sting fired from
 * TitleScreen.jsx) reliably has a real gesture to work with every time,
 * not just when a visitor happens to interact early enough.
 *
 * This is a deliberate, narrow exception to spec §2 rule 1 ("no forced
 * interaction"): one unavoidable click before anything else renders,
 * where the rest of the app has none. Justified specifically because it
 * serves a hard technical requirement (sound literally cannot work
 * without a gesture — this isn't gating content for its own sake), it's
 * a single click/tap/key, not a sequence of choices, and it does not
 * touch the plain-text escape hatch at all — `/plain` is a separate
 * route, reachable directly, untouched by this screen or the rest of the
 * opening sequence.
 *
 * **Rebuilt this batch** on direct live feedback that the screen was
 * "waaay too small" — the previous version was two skinny centered lines
 * (one blinking CTA, one hint) floating alone in an otherwise empty
 * --ink void, with nothing to actually hook a visitor before asking for
 * a click. It now leads with an identity block — an eyebrow tag, the
 * name and headline read from `../data/profile.js` (same source
 * `MainMenu.jsx` already draws its own identity block from, so the two
 * never drift), and a `--signal` divider — ABOVE the CTA, so the very
 * first thing rendered tells a recruiter whose site this is before it
 * asks for anything, rather than a bare instruction with no context.
 * The eyebrow tagline is shell chrome (same precedent as
 * `PresentsCard.jsx`'s "presents" framing — see src/screens/CLAUDE.md's
 * "site owner's name/tagline and UI chrome... treated as shell identity,
 * not resume content" rule), not resume copy, so it's fine to write
 * directly here rather than pull from data/. The CTA and hint line grew
 * a size step each (text-3xl/5xl and text-sm/base, up from 2xl/3xl and
 * xs) so the block reads as a real title-card composition rather than
 * an afterthought bolted onto a black screen.
 *
 * Deliberately NOT auto-skipped under reduced motion, unlike PresentsCard
 * and TitleReveal — reduced motion means "don't animate," not "don't
 * require this gesture," and skipping it would silently reintroduce the
 * exact bug this screen exists to fix for exactly the visitors who
 * enabled that setting. The blink is what reduced motion turns off (now
 * scoped to just the CTA line, not the whole block); the gate itself
 * stays.
 */
export default function StartPrompt({ onStart, reducedMotion }) {
  return (
    <button
      type="button"
      onClick={onStart}
      aria-label="Start the experience"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-ink px-6 text-center sm:gap-10"
    >
      <div className="flex flex-col items-center gap-3 sm:gap-4">
        <span className="font-body text-xs uppercase tracking-[0.4em] text-bone/50">
          An Interactive Resume
        </span>
        <span className="font-display text-4xl uppercase leading-none tracking-tight text-bone sm:text-6xl md:text-7xl">
          {profile.name}
        </span>
        <span className="max-w-md font-body text-sm text-bone/70 sm:text-base">
          {profile.headline}
        </span>
        <span aria-hidden="true" className="mt-1 h-[2px] w-16 bg-signal sm:w-20" />
      </div>

      <div className="flex flex-col items-center gap-3">
        <span
          className="block max-w-[260px] font-display text-lg uppercase tracking-[0.08em] text-bone sm:max-w-none sm:text-xl md:text-2xl xl:text-3xl"
          style={{ animation: reducedMotion ? undefined : 'prompt-blink 1.4s steps(1) infinite' }}
        >
          ▸ Start the Experience
        </span>
        <span className="font-body text-sm uppercase tracking-[0.3em] text-bone/50">
          Click, tap, or press any key
        </span>
      </div>
    </button>
  );
}
