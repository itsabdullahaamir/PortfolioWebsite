/**
 * Synthesized UI sound effects for the OPTIONS "Sound" toggle.
 *
 * Spec §5 mechanic 5's "ambient audio" was cut earlier as likely scope
 * creep — that refers to a background soundscape, one of four optional
 * atmosphere picks (we took film grain + panel parallax instead). Short
 * interaction feedback (a tick on menu navigation, a blip on selecting a
 * choice, a chime on the memory toast) is a different thing, and it is
 * exactly what a "Sound" toggle in OPTIONS implies exists. Cutting it
 * entirely, as an earlier pass did, left a control in the UI that did
 * nothing — which reads as broken, not restrained.
 *
 * Built with the Web Audio API rather than shipping audio files:
 *   - Zero bytes added to the bundle (spec §7's 200KB budget).
 *   - Creating/resuming an AudioContext requires a user gesture in every
 *     modern browser, so this cannot autoplay by construction — spec's
 *     "never autoplay" rule is enforced by the platform, not by
 *     discipline that could later lapse.
 *
 * `useSound()` is the integration point components should use — it
 * already checks `useSettings().sound` and no-ops when it's off, so
 * callers never need their own if-statement.
 */

import { useCallback } from 'react';
import { useSettings } from '../context/SettingsContext.jsx';

let ctx = null;

function getContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return null;
  if (!ctx) ctx = new AudioContextCtor();
  // Swallow the rejection: on a fresh pageload with no user gesture yet
  // (e.g. the intro sequence auto-advancing on its own timers, untouched),
  // browsers refuse to resume a suspended context and this promise
  // rejects. That's correct, expected autoplay-policy behavior, not an
  // error — the sound engine has no way to force audio to play before a
  // real gesture, nor should it (that's the platform enforcing spec's
  // "never autoplay" rule). Left unhandled, it would just spam the
  // console with an unhandled-rejection warning for something that isn't
  // actually a bug.
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

/**
 * Whether this pageload has already had a genuine user gesture (click,
 * tap, keypress) — the thing Web Audio's autoplay policy actually gates
 * on, via the standard User Activation API. Returns `null`, not a
 * guess, when the browser doesn't support that API (older Safari/
 * Firefox) rather than false.
 *
 * Exists so a caller can avoid calling a cue at a moment it already
 * knows will be silent — see `TitleScreen.jsx`'s use of this for
 * `sounds.intro`, which used to fire (and mark itself "played") on a
 * timer with no gesture yet, burning its one shot on a guaranteed-silent
 * attempt; a later click never got a second chance because the flag was
 * already flipped. Every other cue in this file stays fire-and-forget —
 * they're not one-shot, so a silent attempt just means "try again next
 * time," which is fine.
 */
export function hasHadUserGesture() {
  if (typeof navigator === 'undefined' || !navigator.userActivation) return null;
  return navigator.userActivation.hasBeenActive;
}

/*
  One short envelope: fast linear attack, exponential decay. The
  exponential decay is what makes this read as a UI "tick" rather than a
  musical note ringing out — a linear fade sounds like a synth patch, an
  exponential one sounds like something being tapped.

  `delay` (seconds, default 0) schedules the note relative to "now"
  rather than playing it immediately — this is what lets `sounds.intro`
  below chain several `blip()` calls into one short motif instead of
  needing a separate sequencer.

  Returns the `{ osc, amp }` node pair (or null if no AudioContext is
  available) so a caller composing several blips into one sequence —
  again, `sounds.intro` — can cut them off early instead of only ever
  being able to let them finish naturally.
*/
function blip({ freq, duration, type = 'sine', gain = 0.07, glideTo, delay = 0 }) {
  const audioCtx = getContext();
  if (!audioCtx) return null;

  const osc = audioCtx.createOscillator();
  const amp = audioCtx.createGain();
  const start = audioCtx.currentTime + delay;

  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, start + duration);

  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.linearRampToValueAtTime(gain, start + 0.006);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(amp);
  amp.connect(audioCtx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.03);

  return { osc, amp };
}

/*
  Ramps every voice in `voices` down to silence over ~50ms and stops its
  oscillator, instead of just letting `blip()`'s own scheduled envelope
  finish naturally — used by `sounds.intro`'s returned stop function so
  the sting can be cut off cleanly if the beat it's playing under ends
  before the tune would have finished on its own (see TitleScreen.jsx).
  `cancelScheduledValues` first, since a voice mid-glide/mid-decay still
  has future automation queued that would otherwise fight this ramp.
*/
function fadeOutVoices(voices) {
  const audioCtx = getContext();
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  voices.forEach((voice) => {
    if (!voice) return;
    const { osc, amp } = voice;
    try {
      amp.gain.cancelScheduledValues(now);
      amp.gain.setValueAtTime(amp.gain.value, now);
      amp.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
      osc.stop(now + 0.06);
    } catch {
      // Already stopped/finished — nothing to fade.
    }
  });
}

export const sounds = {
  // Roving focus (arrow keys / hover) on menu or choice items. Fires
  // often, so it has to stay quiet and short or it becomes tiring.
  navigate: () => blip({ freq: 420, duration: 0.05, type: 'triangle', gain: 0.04 }),

  // An item is actually activated (click/Enter) — firmer and a touch
  // lower than navigate, so it reads as "confirmed" rather than "moved".
  select: () => blip({ freq: 300, duration: 0.09, type: 'sine', gain: 0.075, glideTo: 190 }),

  // The memory toast appearing (spec 3.5 mechanic 1) — covers
  // episodeFirstOpen, panelExpand, choiceMade, pdfDownload, and the
  // title-screen easter egg, since all of them route through
  // ToastProvider.showToast(). Deliberately the darkest, least energetic
  // cue in the set: low starting pitch, glides DOWN rather than up, and
  // holds a touch longer — a quiet acknowledgment landing in the corner
  // of the screen, not a chime celebrating an achievement. The other two
  // cues both glide up/stay bright because they're momentary interaction
  // feedback; this one is closer to a mood beat, per the "something
  // darker" note from the reference screenshot.
  toast: () => blip({ freq: 260, duration: 0.22, type: 'sine', gain: 0.05, glideTo: 170 }),

  // The one-time signature sting — the "Netflix ta-dum" idea, adapted to
  // this site's tone. A three-note minor motif (C3 - Eb3 - G3, i.e. a
  // plain C-minor triad ascending) played dark/moody with
  // `triangle`/`sine` rather than bright brass, ending on a held chord
  // that glides slightly DOWN (G3 -> F3) instead of resolving up — a
  // settle, not a fanfare, matching the darker `toast` cue's design note
  // ("something darker works here"). Fired exactly once per browser
  // session by TitleScreen.jsx, guarded by the same `hasPlayedIntro` flag
  // that already skips beats 1-2 on repeat visits to `/` within a
  // session — see that file. Total length ~1.5s if left to finish
  // naturally (lengthened from an earlier ~0.9s cut on direct feedback
  // that it felt too short — the held chord's duration/delay grew, not
  // its note count), comfortably inside TitleReveal's 1.8s hold. It now
  // starts on beat 2 (TitleReveal) rather than beat 3 (the menu) and is
  // still cut short if that beat ends early (a skip) — see the returned
  // stop function below and TitleScreen.jsx's usage of it.
  //
  // Gain retuned louder TWICE now. First pass ("that sound is a bit TOO
  // small... make it louder and proper") went from ~0.05 to ~0.13-0.18.
  // Still reported as "EXTREMELY LOW... can't hear it at 100 percent
  // volume without headphones" on real speakers, so this second pass is
  // a much bigger jump — roughly another 3x on top of the first, not an
  // incremental nudge. The three simultaneous chord voices (sub-bass +
  // root + shimmer, all starting at ~0.32s) are balanced so their peaks
  // sum to about 0.95 rather than each just being cranked independently
  // — Web Audio sums overlapping voices at the destination with no
  // automatic normalization, so pushing every voice to a "loud" gain
  // independently would clip (harsh digital distortion) instead of
  // actually sounding louder. This is well above the "well under 0.1"
  // guidance the other cues follow, which is deliberate: this is the one
  // signature moment in the app, not a repeated UI tick, so it's allowed
  // to actually announce itself. The closing note is also still a real
  // three-layer chord hit (sub-bass root an octave down for weight, the
  // G3->F3 root/glide carrying the melody, quiet octave-up shimmer)
  // rather than one oscillator turned up — layering plus headroom is
  // what makes a synth hit read as "proper" and loud without distorting.
  //
  // Returns a `stop()` function (rather than nothing, like every other
  // cue) so the caller can end the sting early — "play it the moment the
  // second loading screen comes, stop when the menu loads" needs the
  // tune to be interruptible, since TitleReveal's hold can end sooner
  // than 0.9s (a click/tap/key skips it at any time, per spec 4.1's "no
  // forced interaction").
  intro: () => {
    const voices = [
      blip({ freq: 130.81, duration: 0.22, type: 'triangle', gain: 0.44, delay: 0 }), // C3
      blip({ freq: 155.56, duration: 0.22, type: 'triangle', gain: 0.46, delay: 0.18 }), // Eb3
      blip({ freq: 65.41, duration: 1.1, type: 'sine', gain: 0.3, delay: 0.38 }), // C2 sub-bass
      blip({ freq: 196.0, duration: 1.1, type: 'sine', gain: 0.5, glideTo: 174.61, delay: 0.38 }), // G3 -> F3
      blip({ freq: 392.0, duration: 1.0, type: 'triangle', gain: 0.15, glideTo: 349.23, delay: 0.39 }), // G4 -> F4 shimmer
    ];
    return () => fadeOutVoices(voices);
  },
};

/**
 * `useSound()('navigate' | 'select' | 'toast' | 'intro')` — gated on the
 * Settings sound toggle so no caller needs its own `if (sound)` check.
 * Returns whatever the underlying cue returns (`undefined` for most;
 * `intro` returns a `stop()` function — see `sounds.intro` above) so a
 * caller that needs to cut a cue short still can.
 */
export function useSound() {
  const { sound } = useSettings();
  return useCallback(
    (name) => {
      if (!sound) return undefined;
      return sounds[name]?.();
    },
    [sound],
  );
}
