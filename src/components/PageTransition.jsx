import { useEffect, useLayoutEffect, useState } from 'react';
import { motion, useIsPresent, useReducedMotion } from 'framer-motion';
import { useSettings } from '../context/SettingsContext.jsx';
import { useSound } from '../lib/sound.js';

/**
 * Route-change transition, mounted once per screen by `App.jsx` (wraps
 * every matched route element, keyed on `location.pathname` via
 * `AnimatePresence mode="wait"`). Not spec-mandated — added on direct
 * user request, then rebuilt on a follow-up: the first version was a
 * horizontal `--ink` curtain wiping across the screen, and the ask was
 * for something else entirely — "rather than the sliding animation...
 * the side options and everything slowly fades away, a WHOOSH slow
 * sound effect as we move into the center of the screen with the
 * buildings moving away and we enter the specific menu, and then the
 * same effect in reverse if we come back to the main menu."
 *
 * So this is now a **dolly**, not a wipe: a camera push along the z axis
 * rather than anything sliding sideways.
 *
 *   Going deeper (`/` -> `/chapters`, `/chapters` -> an episode,
 *   `/` -> `/plain`): the screen you are leaving scales UP past the
 *   camera and fades out — the menu items drift outward and dissolve,
 *   the skyline behind them grows and slips off the edges, which is what
 *   "the buildings moving away" looks like when the camera is the thing
 *   moving. The screen you are arriving at starts small (further away)
 *   and grows to rest.
 *
 *   Coming back (`/chapters` -> `/`, `/plain` -> `/`): exactly that in
 *   reverse. The screen you are leaving recedes and shrinks, and the menu
 *   you are returning to comes back toward you from beyond the camera,
 *   settling into place.
 *
 * Direction is decided by route depth, not by history — `/` is depth 0,
 * `/chapters` and `/plain` are 1, `/chapters/:id` is 2. Shallower than
 * where you were means "out", anything else means "in". Depth rather
 * than a back/forward flag because the browser Back button and an
 * in-page "<- Title" link should read identically: both are the camera
 * pulling back out to the menu.
 *
 * An opaque `--ink` veil sits BEHIND the moving screen and crossfades
 * (out fades it to full black, in fades it away again), so the moment
 * between the two screens is a dip to black rather than a flash of bare
 * `--paper` — `mode="wait"` means the outgoing screen is fully gone
 * before the incoming one mounts, and without the veil that gap shows
 * the body background.
 *
 * ## Why the wrapper changes `display` instead of just animating
 *
 * The previous version of this file animated `opacity` only, and its
 * doc comment explained why: a CSS `transform` on any ancestor creates a
 * new containing block for `position: fixed` descendants, and several
 * screens (`TitleScreen.jsx`'s beats, `MainMenu.jsx`, `EpisodeView.jsx`'s
 * title card) are `fixed inset-0` and rely on that resolving against the
 * viewport. A zoom is a transform, so that constraint had to be solved,
 * not worked around.
 *
 * It is solved by making the wrapper only exist as a box while it is
 * actually animating:
 *
 *   - **While animating** the wrapper is `fixed inset-0 overflow-hidden`
 *     — i.e. exactly viewport-sized. It is now a containing block for
 *     those `fixed inset-0` children, but because its own box IS the
 *     viewport they resolve to precisely the same rectangle they would
 *     have anyway. `overflow-hidden` gives the zoom its frame.
 *   - **At rest** it is `display: contents`, which generates no box at
 *     all — so there is no transform, no containing block, and no layout
 *     participation. Every screen behaves exactly as if this wrapper
 *     were not there, which is the state it spends nearly all of its
 *     time in.
 *
 * `settled` flips on `onAnimationComplete`, with a timer as a backstop
 * because `AnimatePresence initial={false}` skips the enter animation on
 * the very first mount (no page-load zoom, deliberate) and therefore
 * never fires that callback — without the backstop the first screen you
 * land on would stay `fixed`/`overflow-hidden` forever and long pages
 * like `/plain` could not scroll.
 *
 * ## Scroll
 *
 * `App.jsx`'s `AnimatedOutlet` resets scroll to the top on every route
 * change. That fires while the OUTGOING screen is still on screen, which
 * would yank a scrolled episode back to its title card mid-fade, so the
 * exiting wrapper freezes the scroll position it had. `noteRouteChange()`
 * records `window.scrollY` at the one moment it is still correct — during
 * `AnimatedOutlet`'s render, after the navigation but before that layout
 * effect runs — and the exiting instance applies it as a negative
 * `marginTop` on an inner plain div. Negative margin rather than a
 * `translateY`, because a second transform on an ancestor would reopen
 * the `position: fixed` problem above — margin is layout, not transform.
 *
 * ## Performance
 *
 * Reported live as "the website lags a bit whilst doing this", and the
 * cause is what is being zoomed: the main menu alone is ~1,450 SVG
 * `<rect>`s (`TitleBackdrop.jsx`'s four parallax planes and their
 * per-building window grids) plus three `feGaussianBlur` window-glow
 * filters. A browser re-rasterizes vector content whenever the scale it
 * is drawn at changes, so an un-promoted zoom re-draws that entire scene
 * on every frame.
 *
 * Three things address it, and the first two only work together:
 *
 *   1. The moving wrapper carries `.route-stage` (`src/index.css`),
 *      which is `will-change: transform, opacity` + `contain: paint`.
 *      That promotes the scene to its own compositor layer, so it
 *      rasterizes once and the zoom becomes a GPU texture transform.
 *      Attached only while moving — a permanently promoted full-viewport
 *      layer costs GPU memory for nothing.
 *   2. `html.route-moving` pauses decorative CSS animation for the
 *      duration of the move (refcounted, since an outgoing and an
 *      incoming instance can both be moving across a commit). This is
 *      not a separate nice-to-have: a promoted layer only stays cheap
 *      while its contents hold still, and window-flicker/solo-glow
 *      (SVG opacity), fog-drift (SVG transform) and the film grain
 *      (background-position) all repaint continuously, which would force
 *      the layer to re-rasterize and put the per-frame cost right back.
 *      `animation-play-state` rather than cancelling, so they resume
 *      exactly where they were. Framer Motion is unaffected — it drives
 *      this transition through inline styles and WAAPI, neither of which
 *      `animation-play-state` touches.
 *   3. The peak zoom is 1.3 rather than the 1.45 first shipped (and 1.24
 *      rather than 1.32 coming back). Rasterizing at 1.45 costs ~2.1x
 *      the pixels of 1.0; 1.3 costs ~1.7x. Scaling BELOW 1 is cheap by
 *      comparison, which is why the arrival values (0.86 / 0.84) were
 *      left alone.
 *
 * Under reduced motion (OS or the Settings toggle) this renders plain
 * `children` with no wrapper at all, so there is nothing for
 * `AnimatePresence` to animate and the route swap is instant, per spec
 * section 2 rule 5. The whoosh is suppressed there too — it is the sound
 * of a camera move that is not happening.
 */

/* Route depth. Order matters: the episode pattern has to be tested
   before the bare `/chapters` one. Anything unrecognised is 0 (menu
   level), so a future route added without touching this file gets the
   same treatment as the title screen rather than an arbitrary depth. */
const ROUTE_DEPTHS = [
  [/^\/chapters\/[^/]+/, 2],
  [/^\/chapters\/?$/, 1],
  [/^\/plain\/?$/, 1],
  // The game surface mirrors the reading surface's depths: the walkable
  // floor sits one level in from the menu (like /chapters), and a room
  // on it sits one level further (like an episode). So walking into a
  // door dollies IN and leaving a room dollies back OUT, which is the
  // same camera grammar the rest of the site already uses.
  [/^\/play\/[^/]+/, 2],
  [/^\/floor\/?$/, 1],
];

function depthOf(pathname) {
  const match = ROUTE_DEPTHS.find(([pattern]) => pattern.test(pathname));
  return match ? match[1] : 0;
}

/* Module-level rather than component state because the two instances
   that need it cannot share any: on a navigation the OUTGOING screen (an
   element `AnimatePresence` is holding onto, whose props are frozen at
   the values it last rendered with) and the INCOMING one both have to
   agree on which way the camera is moving. `App.jsx` calls
   `noteRouteChange()` from `AnimatedOutlet`'s render, which runs before
   either child renders, so both read the same freshly-computed value.
   Made idempotent on repeat calls with the same pathname so React
   StrictMode's double-render does not flip the direction underneath the
   second pass. */
let lastPathname = null;
let lastDirection = 'in';
let exitScrollY = 0;

export function noteRouteChange(pathname) {
  if (pathname === lastPathname) return lastDirection;
  const previous = lastPathname;
  lastPathname = pathname;
  if (previous !== null) {
    lastDirection = depthOf(pathname) < depthOf(previous) ? 'out' : 'in';
    // The scroll position the outgoing screen is sitting at. Captured
    // here because this is the last moment it exists: `AnimatedOutlet`
    // resets scroll to 0 in a layout effect immediately after this
    // render, and the outgoing screen is about to become `position:
    // fixed`, which would show it from its top. See the "Scroll" section
    // of the doc comment above.
    exitScrollY = typeof window === 'undefined' ? 0 : window.scrollY;
  }
  return lastDirection;
}

/* Refcounted rather than a plain boolean class toggle: during a route
   change an outgoing instance and an incoming one can both consider
   themselves "moving" for a commit or two, and whichever unmounts first
   must not strip the class out from under the other. */
let movingCount = 0;

function setRouteMoving(on) {
  movingCount = Math.max(0, movingCount + (on ? 1 : -1));
  document.documentElement.classList.toggle('route-moving', movingCount > 0);
}

/* Accelerating on the way out (the camera picks up speed as it commits
   to the move) and decelerating on the way in (it arrives and settles).
   Using the same curve for both would make the whole thing read as one
   mechanical slide, which is what this replaced. */
const EASE_DEPART = [0.5, 0, 0.9, 0.35];
const EASE_ARRIVE = [0.12, 0.7, 0.28, 1];

const EXIT_DURATION = 0.52;
const ENTER_DURATION = 0.58;

function contentVariants(direction) {
  const pushingIn = direction !== 'out';
  return {
    initial: { opacity: 0, scale: pushingIn ? 0.86 : 1.24 },
    animate: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: ENTER_DURATION,
        ease: EASE_ARRIVE,
        // Opacity finishes early and linearly: the screen should be
        // fully readable while it is still drifting the last few percent
        // into place, not arrive and only then become legible.
        opacity: { duration: ENTER_DURATION * 0.7, ease: 'linear' },
      },
    },
    exit: {
      opacity: 0,
      scale: pushingIn ? 1.3 : 0.84,
      transition: {
        duration: EXIT_DURATION,
        ease: EASE_DEPART,
        // "Slowly fades away" — the fade lags the zoom slightly so the
        // items are visibly moving before they start disappearing.
        opacity: {
          duration: EXIT_DURATION * 0.86,
          ease: EASE_DEPART,
          delay: EXIT_DURATION * 0.14,
        },
      },
    },
  };
}

const veilVariants = {
  initial: { opacity: 1 },
  animate: { opacity: 0, transition: { duration: ENTER_DURATION * 0.8, ease: 'linear' } },
  exit: { opacity: 1, transition: { duration: EXIT_DURATION * 0.85, ease: 'linear' } },
};

export default function PageTransition({ children }) {
  const prefersReducedMotion = useReducedMotion();
  const { motion: motionEnabled } = useSettings();
  const disabled = prefersReducedMotion || !motionEnabled;

  const isPresent = useIsPresent();
  const playSound = useSound();
  const [settled, setSettled] = useState(false);
  // Captured once, at mount, so this instance keeps animating the way it
  // arrived even if another navigation changes the module-level value.
  const [direction] = useState(() => lastDirection);

  // Animating, or on the way out and animating again. Only in this state
  // does the wrapper generate a box — see the doc comment above.
  const active = !settled || !isPresent;

  // Only the outgoing screen needs the frozen offset; `mode="wait"`
  // guarantees there is at most one of those at a time, so reading the
  // module value directly is unambiguous.
  const frozenScroll = isPresent ? 0 : exitScrollY;

  // The whoosh belongs to the outgoing half of the move — it starts the
  // moment the camera does, and is already receding by the time the new
  // screen settles. `lastDirection` rather than this instance's captured
  // `direction`: the sweep has to describe the move happening NOW, and
  // for the exiting screen that was decided after it mounted.
  useEffect(() => {
    if (disabled || isPresent) return;
    playSound(lastDirection === 'out' ? 'whooshOut' : 'whooshIn');
  }, [disabled, isPresent, playSound]);

  // Layout effect, not a plain effect: this has to be on the element
  // before the browser paints the first animated frame, or that frame
  // pays the full un-promoted cost the class exists to avoid.
  useLayoutEffect(() => {
    if (disabled || !active) return undefined;
    setRouteMoving(true);
    return () => setRouteMoving(false);
  }, [disabled, active]);

  useEffect(() => {
    if (disabled || settled) return undefined;
    const timer = setTimeout(() => setSettled(true), ENTER_DURATION * 1000 + 150);
    return () => clearTimeout(timer);
  }, [disabled, settled]);

  if (disabled) return children;

  return (
    <>
      <motion.div
        aria-hidden="true"
        initial="initial"
        animate="animate"
        exit="exit"
        variants={veilVariants}
        className="pointer-events-none fixed inset-0 z-20 bg-ink"
        style={{ display: active ? 'block' : 'none' }}
      />
      <motion.div
        initial="initial"
        animate="animate"
        exit="exit"
        variants={contentVariants(direction)}
        onAnimationComplete={() => setSettled(true)}
        className={active ? 'route-stage fixed inset-0 z-30 overflow-hidden' : 'contents'}
      >
        <div style={frozenScroll ? { marginTop: -frozenScroll } : undefined}>{children}</div>
      </motion.div>
    </>
  );
}
