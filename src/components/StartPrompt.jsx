/**
 * Beat 0 — new this batch, ahead of spec §4.1's original 3-beat opening
 * sequence (PresentsCard -> TitleReveal -> MainMenu). A full-bleed
 * "PRESS START"-style gate: solid --ink screen, one line of blinking
 * --bone display text dead center, click/tap/any-key to enter — the
 * "old school" arcade cue the user asked for directly.
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
 * Deliberately NOT auto-skipped under reduced motion, unlike PresentsCard
 * and TitleReveal — reduced motion means "don't animate," not "don't
 * require this gesture," and skipping it would silently reintroduce the
 * exact bug this screen exists to fix for exactly the visitors who
 * enabled that setting. The blink is what reduced motion turns off; the
 * gate itself stays.
 */
export default function StartPrompt({ onStart, reducedMotion }) {
  return (
    <button
      type="button"
      onClick={onStart}
      aria-label="Start the experience"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-ink text-center"
    >
      <span
        className="font-display text-2xl uppercase tracking-[0.2em] text-bone sm:text-3xl"
        style={{ animation: reducedMotion ? undefined : 'prompt-blink 1.4s steps(1) infinite' }}
      >
        ▸ Start the Experience
      </span>
      <span className="font-body text-xs uppercase tracking-[0.3em] text-bone/50">
        Click, tap, or press any key
      </span>
    </button>
  );
}
