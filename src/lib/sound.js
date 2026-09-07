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
let masterInput = null;

/*
  Every cue up to now connected straight to `audioCtx.destination`, which
  caps out at 1.0 (hard, ugly digital clipping past that) — so the only
  lever previous passes had was "raise each voice's own gain," and that
  lever ran out: real-speaker reports of "way too low" kept coming back
  even after gains were already pushed to the edge of what destination
  could take without distorting. This is a genuine ceiling, not a tuning
  miss, so this batch adds real headroom instead of pushing raw gain
  again.

  Chain: source voices -> `glue` (a gentle compressor that evens out the
  peaks across simultaneously-playing voices, e.g. `intro`'s 3-voice
  chord) -> `makeup` (a fixed gain stage that then boosts the now-tamed
  signal well past what raw destination gain could survive) -> `limiter`
  (a hard brickwall compressor right at the ceiling, so `makeup`'s boost
  can never actually clip) -> destination. This is the standard
  "compress, then make up the gain, then limit" mastering chain — it's
  what lets the perceived loudness go up several times over without the
  harsh distortion a naive gain increase would cause once voices sum
  above 1.0.
*/
function getMasterInput(audioCtx) {
  if (masterInput) return masterInput;

  const glue = audioCtx.createDynamicsCompressor();
  glue.threshold.setValueAtTime(-28, audioCtx.currentTime);
  glue.knee.setValueAtTime(18, audioCtx.currentTime);
  glue.ratio.setValueAtTime(8, audioCtx.currentTime);
  glue.attack.setValueAtTime(0.002, audioCtx.currentTime);
  glue.release.setValueAtTime(0.12, audioCtx.currentTime);

  const makeup = audioCtx.createGain();
  makeup.gain.setValueAtTime(3.2, audioCtx.currentTime);

  const limiter = audioCtx.createDynamicsCompressor();
  limiter.threshold.setValueAtTime(-1.5, audioCtx.currentTime);
  limiter.knee.setValueAtTime(0, audioCtx.currentTime);
  limiter.ratio.setValueAtTime(20, audioCtx.currentTime);
  limiter.attack.setValueAtTime(0.001, audioCtx.currentTime);
  limiter.release.setValueAtTime(0.08, audioCtx.currentTime);

  glue.connect(makeup);
  makeup.connect(limiter);
  limiter.connect(audioCtx.destination);

  masterInput = glue;
  return masterInput;
}

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
  amp.connect(getMasterInput(audioCtx));
  osc.start(start);
  osc.stop(start + duration + 0.03);

  return { osc, amp };
}

/*
  White-noise source buffer for `whoosh()` below, generated once and
  reused. Two seconds is plenty — the source loops, so the buffer only
  has to be long enough that the loop point isn't audible as a periodic
  tick.

  Noise rather than an oscillator because a whoosh is broadband air, not
  a pitch: what makes it read as movement is a resonant band sweeping
  ACROSS the noise floor, which is what the bandpass in `whoosh()` does.
  Still zero shipped bytes — same reasoning as every other cue here.
*/
let noiseBuffer = null;

function getNoiseBuffer(audioCtx) {
  if (noiseBuffer) return noiseBuffer;
  const length = Math.floor(audioCtx.sampleRate * 2);
  const buffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buffer;
  return buffer;
}

/*
  The route-change "whoosh" — the camera-move cue for
  `components/PageTransition.jsx`. Direct user request: "a WHOOSH slow
  sound effect as we move into the center of the screen with the
  buildings moving away."

  Two layers, because a bandpass sweep alone is thin and reads as a
  hiss:
    1. Looped white noise through a bandpass whose centre frequency
       sweeps exponentially across the whole move (200 -> 2000 Hz going
       IN, reversed coming OUT). The sweep direction is the entire
       reason this cue takes a `direction` — rising as the camera pushes
       forward, falling as it pulls back, so the sound tells you which
       way you're travelling even before the screen has changed.
    2. A quiet sine sub gliding the same direction, which is what gives
       the move weight rather than just air.

  The amplitude envelope peaks around 40% through and decays away rather
  than cutting off, so it swells with the zoom and is already receding
  by the time the incoming screen settles. Deliberately ~1s and gentle:
  this fires on EVERY navigation, so it has to sit under the motion
  rather than announce itself.
*/
function whoosh({ direction = 'in', duration = 1 } = {}) {
  const audioCtx = getContext();
  if (!audioCtx) return;

  const now = audioCtx.currentTime;
  const goingOut = direction === 'out';

  const source = audioCtx.createBufferSource();
  source.buffer = getNoiseBuffer(audioCtx);
  source.loop = true;

  const band = audioCtx.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.setValueAtTime(1.1, now);
  band.frequency.setValueAtTime(goingOut ? 2000 : 200, now);
  band.frequency.exponentialRampToValueAtTime(goingOut ? 200 : 2000, now + duration);

  const amp = audioCtx.createGain();
  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.linearRampToValueAtTime(0.38, now + duration * 0.4);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  source.connect(band);
  band.connect(amp);
  amp.connect(getMasterInput(audioCtx));
  source.start(now);
  source.stop(now + duration + 0.05);

  blip({
    freq: goingOut ? 98 : 52,
    duration: duration * 0.9,
    type: 'sine',
    gain: 0.2,
    glideTo: goingOut ? 46 : 106,
  });
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
  navigate: () => blip({ freq: 420, duration: 0.05, type: 'triangle', gain: 0.1 }),

  // An item is actually activated (click/Enter) — firmer and a touch
  // lower than navigate, so it reads as "confirmed" rather than "moved".
  select: () => blip({ freq: 300, duration: 0.09, type: 'sine', gain: 0.16, glideTo: 190 }),

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
  toast: () => blip({ freq: 260, duration: 0.22, type: 'sine', gain: 0.12, glideTo: 170 }),

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
  // Gain was retuned louder twice already, and STILL came back as
  // inaudible without headphones ("way too low" — not just this cue, but
  // navigate/select/toast too). That third report is what exposed the
  // real bug: every cue connected straight to `audioCtx.destination`,
  // which hard-clips past gain 1.0, so raw per-voice gain had already
  // hit its ceiling — there was no more room to push. `getMasterInput()`
  // above now routes every voice through a compressor -> makeup-gain ->
  // limiter chain instead, which is what actually bought the headroom to
  // get louder without distortion; the per-voice gains below are a
  // smaller supporting bump, not the main fix this time. Individual
  // voice gains still matter as the compressor's input level, so they
  // stay balanced so peaks sum to about 0.95 pre-chain rather than each
  // just being cranked independently.
  //
  // Returns a `stop()` function (rather than nothing, like every other
  // cue) so the caller can end the sting early — "play it the moment the
  // second loading screen comes, stop when the menu loads" needs the
  // tune to be interruptible, since TitleReveal's hold can end sooner
  // than 0.9s (a click/tap/key skips it at any time, per spec 4.1's "no
  // forced interaction").
  // Route-change camera move (`components/PageTransition.jsx`). Two
  // names rather than one cue taking an argument, so `useSound()` keeps
  // its single-string API and callers never touch `sounds` directly.
  // `whooshIn` = pushing forward into a submenu, `whooshOut` = pulling
  // back to the menu behind it. See `whoosh()` above.
  whooshIn: () => whoosh({ direction: 'in' }),
  whooshOut: () => whoosh({ direction: 'out' }),

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
 * `useSound()('navigate' | 'select' | 'toast' | 'whooshIn' |
 * 'whooshOut' | 'intro')` — gated on the
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
