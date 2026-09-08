import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { createGame } from './engine.js';
import { readPalette } from './palette.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { useSound } from '../lib/sound.js';

/**
 * React host for a canvas scene. The only place the engine touches the
 * component tree.
 *
 * The scene is passed as a FACTORY, not as an instance, so this
 * component owns the lifetime: React may mount/unmount freely (strict
 * mode double-invokes effects in dev, PageTransition.jsx swaps screens)
 * and each mount gets a clean scene rather than one carrying state from
 * a previous mount.
 *
 * Accessibility: a canvas is opaque to a screen reader, and the game is
 * NOT the only route to this content -- /chapters (the Episode Explorer)
 * and /plain both carry the same material ungated, which is what keeps
 * this compliant with root CLAUDE.md section 6 rules 1 and 3. What this
 * component still owes is a description of what is on screen and an
 * announcement whenever the game reveals a fact, so a visitor using a
 * reader is told what a sighted player is being shown. That is the
 * `liveRef` region below.
 *
 * Reduced motion does not switch the game off -- a visitor who pressed
 * NEW GAME asked for it, and a blank screen would be a worse answer than
 * a calm one. It is forwarded to scenes on ctx.reducedMotion, and every
 * scene is expected to drop decorative motion (grain drift, shake,
 * parallax, idle bobbing) while keeping the mechanic itself intact.
 */
export default function GameCanvas({
  scene,
  onEvent,
  label,
  announce = '',
  className = '',
  paused = false,
}) {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const liveRef = useRef(null);
  const onEventRef = useRef(onEvent);
  const playSound = useSound();
  const { motion } = useSettings();
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = !motion || prefersReducedMotion;
  // Declared after `playSound`, not before: seeding a ref with a `const`
  // that has not been initialised yet is a temporal dead zone crash, and
  // it is one a bundler will happily build.
  const soundRef = useRef(playSound);

  /*
   * Both callbacks live in refs, and `reducedMotion` is pushed onto the
   * live context rather than being a dependency, because ANY value in
   * this effect's dependency array tears the engine down and starts the
   * scene over.
   *
   * `useSound()` is memoised on the Sound setting and `useReducedMotion`
   * tracks the Motion setting — so with either in the deps, a visitor who
   * opened OPTIONS mid-run and toggled Sound or Motion would have their
   * run silently restarted from zero. The scene still sees the new value
   * on the very next frame; it just does not get rebuilt to receive it.
   */
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    soundRef.current = playSound;
  }, [playSound]);

  useEffect(() => {
    const game = gameRef.current;
    if (game) game.context.reducedMotion = reducedMotion;
  }, [reducedMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    // `reducedMotion` and `playSound` are read straight from the closure
    // here, NOT from a ref: this effect only re-runs when `scene` changes,
    // and on the render that triggers it both are already current. The ref
    // above exists only to keep later toggles reaching a running game.
    const game = createGame(canvas, {
      palette: readPalette(),
      reducedMotion,
      emit: (name, data) => onEventRef.current?.(name, data),
      sound: (name) => soundRef.current?.(name),
    });
    gameRef.current = game;
    game.setScene(scene());
    game.start();

    // The canvas is sized by CSS; a ResizeObserver is what catches a
    // layout change that no window resize event accompanies (the browser
    // chrome collapsing on mobile scroll, a sidebar opening).
    const observer = new ResizeObserver(() => game.resize());
    observer.observe(canvas);

    return () => {
      observer.disconnect();
      game.destroy();
      gameRef.current = null;
    };
    // `scene` is the ONLY dependency: it is a factory whose identity the
    // caller controls, so changing it is the one case where rebuilding
    // the game is the intent. See the block comment above for why
    // `reducedMotion` and `playSound` deliberately are not listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;
    if (paused) game.stop();
    else game.start();
  }, [paused]);

  return (
    <>
      {/*
        Positioned absolutely against the (always `relative`) wrapper
        rather than sized with `h-full`.

        `height: 100%` resolves against the parent's height, and both
        call sites put this inside a `flex-1` column child that has a
        min-height but no definite height — so the percentage had nothing
        to resolve against, collapsed to `auto`, and the canvas fell back
        to roughly its intrinsic size. Measured on a 375x812 phone: a
        188px-tall scene sitting in a 471px slot, with ~700px of dead
        black below it. `inset-0` sidesteps the containing-block chain
        the same way `min-h-screen` does elsewhere in this project.
      */}
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={label}
        className={`absolute inset-0 block h-full w-full touch-none select-none ${className}`}
      />
      {/*
        Reveals are announced here rather than by re-labelling the canvas:
        aria-label changes on a role="img" are not reliably announced,
        while a polite live region is. Kept visually hidden rather than
        `display: none`, which would remove it from the accessibility
        tree entirely.
      */}
      <p ref={liveRef} aria-live="polite" className="sr-only">
        {announce}
      </p>
    </>
  );
}
