import { useCallback, useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import StartPrompt from '../components/StartPrompt.jsx';
import PresentsCard from '../components/PresentsCard.jsx';
import TitleReveal from '../components/TitleReveal.jsx';
import MainMenu from '../components/MainMenu.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { useMusic } from '../context/MusicContext.jsx';
import { useSound, hasHadUserGesture } from '../lib/sound.js';

/**
 * `/` — the opening sequence: StartPrompt (beat 0, new this batch, not
 * in spec §4.1's original list) -> PresentsCard (beat 1) -> TitleReveal
 * (beat 2) -> MainMenu (beat 3, terminal — the interactive menu itself,
 * nothing further to auto-advance to).
 *
 * **Beat 0 exists to fix a hard platform constraint, not for decoration.**
 * See `../components/StartPrompt.jsx`'s doc comment for the full
 * rationale — short version: no browser plays audio before a real user
 * gesture, and every earlier attempt at this (retiming `sounds.intro`,
 * deferring to the first incidental click, `hasHadUserGesture()` below)
 * only ever chased that constraint rather than removing it, because nothing
 * in code CAN remove it. A live report ("I can't hear any sound... UNTIL
 * I click on the website which is poor") asked for exactly this instead:
 * an explicit, in-universe "click to start" gate up front, old-school
 * arcade styled, so the click always happens before beat 2 needs it
 * rather than maybe happening in time.
 *
 * Skippable at every beat by any click, tap, or key press. Each beat
 * component already turns a click/tap into "done" via its own full-bleed
 * button; this screen adds a window-level keydown listener as the "any
 * key" half of that contract (Tab/Shift are excluded so normal keyboard
 * focus navigation still works instead of being swallowed as a skip).
 *
 * Reduced motion is now `useReducedMotion()` (Framer Motion's hook, reads
 * the OS `prefers-reduced-motion` media query reactively) combined with
 * the Settings "motion" toggle — replaces the old inline
 * `window.matchMedia` check per the Phase 6 motion-pass sweep (see
 * src/screens/CLAUDE.md). Either one being "reduced" collapses beats 1-2
 * instantly. Beat 0 (StartPrompt) is the one exception — it does NOT
 * auto-skip under reduced motion, on purpose: reduced motion means "turn
 * off animation," not "remove the one gesture Web Audio needs," and
 * auto-skipping it would silently reintroduce the exact bug it exists to
 * fix for the visitors who have that setting on. Its own blink animation
 * still respects reduced motion; the gate itself doesn't.
 *
 * The 3-beat sequence only plays once per browser session. `hasPlayedIntro`
 * is a module-level flag (not React state) precisely because it must
 * survive this component unmounting/remounting on SPA navigation — a
 * recruiter who opens an episode, then clicks "Title" to go back to `/`,
 * should land straight on the menu (beat 3), not replay the presents
 * card and title reveal they already sat through seconds ago. A full page
 * reload re-evaluates the module and resets the flag, so a fresh visit
 * (or an explicit refresh) still gets the full intro.
 *
 * The one-time signature sting (`sounds.intro`, see src/lib/CLAUDE.md) —
 * a short synthesized motif, the "Netflix ta-dum" idea — reuses this
 * exact `hasPlayedIntro` flag rather than a second one: it starts the
 * instant beat 2 (TitleReveal, "the second loading screen") is reached
 * for the first time this session (checked BEFORE the flag flips), never
 * on a later SPA return to `/`. It's cut short — not just left to finish
 * on its own — the moment the beat moves on to MENU, whether that's
 * TitleReveal's own hold timing out or the visitor skipping it early by
 * click/tap/key; `sounds.intro()` returns a `stop()` function for
 * exactly this, called from the effect's cleanup below rather than on a
 * fixed timer, so it tracks the actual beat transition instead of
 * guessing at one. Routes through `useSound()` like every other cue, so
 * it's silent unless the Settings sound toggle is on, and never autoplays
 * before a user gesture regardless of the toggle (browser autoplay
 * policy on the underlying AudioContext — see sound.js). That last part
 * also explains a live report of "the sound doesn't play on reload": if
 * the visitor never clicks/taps/presses a key during beats 1-2 and just
 * watches them auto-advance on their own timers, no user gesture ever
 * occurs on that pageload, so the browser will not let any audio play at
 * all — not a bug here, the same restriction applies to every cue in the
 * app, and is the actual mechanism behind spec's "never autoplay" rule.
 * Skipping a beat (already a supported interaction) supplies the gesture
 * and unlocks audio for the rest of that session.
 *
 * **Fixed this batch — the sting used to burn its one shot silently.**
 * A live report ("I still can't hear shit until I CLICK") turned out to
 * be a real bug, not just the autoplay policy described above: the old
 * effect called `playSound('intro')` and set `hasPlayedIntro = true`
 * unconditionally the instant beat 2 was reached — including when that
 * happened via TitleReveal's own timer with zero gesture yet. The
 * attempt failed silently (correct autoplay behavior), but the flag was
 * already flipped, so a *later* click never got a second chance — the
 * one-shot cue was already "spent" on an attempt nobody could have
 * heard. It now checks `hasHadUserGesture()` (see sound.js) first: if a
 * gesture already happened, it plays immediately as before; if not, it
 * waits for the first real `pointerdown`/`keydown` (still gated to
 * while beat 2 is showing) and plays THEN, so a click genuinely unlocks
 * it instead of arriving too late.
 *
 * **With beat 0 added, that wait branch should be effectively dead code
 * in normal use** — StartPrompt's own click is a real gesture that
 * happens before beat 2 can ever be reached, so `hasHadUserGesture()`
 * should already read `true` by the time this effect runs. It's kept
 * rather than removed: it's a real safety net (covers the unsupported-
 * API case, and any future change that adds another path into beat 2),
 * costs nothing when unused, and removing it would mean re-deriving this
 * exact logic again if that safety net ever turns out to matter.
 *
 * Deliberately NOT wrapped in AnimatePresence: spec 4.1 is explicit that
 * beat 1 -> beat 2 is a hard "Cut to a full-bleed painted background,"
 * not a dissolve, and beat 2 -> beat 3 is explicitly "rather than cutting
 * to a new screen" (the menu materializes over the *same* art, no beat
 * boundary at all). An AnimatePresence exit fade here would briefly
 * reveal the page's own --paper background between beats (nothing is
 * mounted behind the departing beat to fade into) — a visible flash the
 * spec's own stage directions rule out. Each beat already owns its own
 * internal reveal (PresentsCard's text fade, TitleReveal's name
 * resolve, MainMenu's nav fade), which is the motion the spec actually
 * asks for at this boundary; AnimatePresence is used for the moments
 * spec 7 names explicitly instead — episode transitions and toasts (see
 * EpisodeView.jsx and ToastProvider.jsx).
 */
const BEATS = { START: 'start', PRESENTS: 'presents', REVEAL: 'reveal', MENU: 'menu' };

let hasPlayedIntro = false;

export default function TitleScreen() {
  const { motion: motionEnabled } = useSettings();
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = !motionEnabled || prefersReducedMotion;
  const [beat, setBeat] = useState(hasPlayedIntro ? BEATS.MENU : BEATS.START);
  const playSound = useSound();
  const { start: startMusic } = useMusic();

  const advanceFromStart = useCallback(() => setBeat(BEATS.PRESENTS), []);
  const advanceFromPresents = useCallback(() => setBeat(BEATS.REVEAL), []);
  const advanceFromReveal = useCallback(() => setBeat(BEATS.MENU), []);

  // Flips MusicProvider's one-way `started` flag the moment the menu beat
  // is reached — this is what lets BackgroundMusic.jsx (mounted once in
  // App.jsx, outside this component) know it's safe to start playing.
  // Runs again on every later same-session mount of `/` that opens
  // straight on MENU (see the `hasPlayedIntro` note above `BEATS`), but
  // `startMusic()` is a no-op once already true.
  useEffect(() => {
    if (beat === BEATS.MENU) startMusic();
  }, [beat, startMusic]);

  useEffect(() => {
    if (beat !== BEATS.REVEAL || hasPlayedIntro) return undefined;

    let stopIntro = null;
    let removeGestureListeners = null;

    const play = () => {
      hasPlayedIntro = true;
      stopIntro = playSound('intro');
    };

    if (hasHadUserGesture() === false) {
      // No gesture on this pageload yet — playing right now is
      // guaranteed silent under the browser's autoplay policy. Wait for
      // the first real click/tap/key instead of spending the one-shot
      // on an attempt nobody can hear.
      const onGesture = () => {
        removeGestureListeners?.();
        play();
      };
      window.addEventListener('pointerdown', onGesture, { once: true });
      window.addEventListener('keydown', onGesture, { once: true });
      removeGestureListeners = () => {
        window.removeEventListener('pointerdown', onGesture);
        window.removeEventListener('keydown', onGesture);
      };
    } else {
      // A gesture already happened (or the API isn't supported, in
      // which case we can't tell either way) — same immediate attempt
      // as before.
      play();
    }

    return () => {
      removeGestureListeners?.();
      stopIntro?.();
    };
  }, [beat, playSound]);

  useEffect(() => {
    if (beat === BEATS.MENU) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Tab' || event.key === 'Shift') return;
      if (beat === BEATS.START) advanceFromStart();
      else if (beat === BEATS.PRESENTS) advanceFromPresents();
      else if (beat === BEATS.REVEAL) advanceFromReveal();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [beat, advanceFromStart, advanceFromPresents, advanceFromReveal]);

  return (
    <main>
      {beat === BEATS.START ? (
        <StartPrompt onStart={advanceFromStart} reducedMotion={reducedMotion} />
      ) : null}
      {beat === BEATS.PRESENTS ? (
        <PresentsCard onDone={advanceFromPresents} reducedMotion={reducedMotion} />
      ) : null}
      {beat === BEATS.REVEAL ? (
        <TitleReveal onDone={advanceFromReveal} reducedMotion={reducedMotion} />
      ) : null}
      {beat === BEATS.MENU ? <MainMenu reducedMotion={reducedMotion} /> : null}
    </main>
  );
}
