import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useSettings } from '../context/SettingsContext.jsx';

/**
 * Motion wrapper around Panel (or any panel-shaped content) — wraps from
 * the outside only, never touches Panel.jsx's own clip-path/shadow/seed
 * logic (root CLAUDE.md hard constraint explicitly allows motion wrapping
 * around Panel, just not inside it).
 *
 * Two spec-driven behaviors, both gated on the same combined
 * reduced-motion check (OS prefers-reduced-motion OR Settings motion
 * toggle off):
 *
 * 1. "Panel reveal on scroll" (spec 3.5): fade + 12px rise, 300ms,
 *    staggered 60ms per panel via the `index` prop, triggered once via
 *    `whileInView`.
 * 2. Mechanic 5's second chosen ambient detail: a very slow parallax on
 *    panel backgrounds while scrolling, capped at the spec-mandated max
 *    of 8px travel. Implemented as a small continuous translateY driven
 *    by this panel's own scroll progress through the viewport, applied on
 *    an inner wrapper so it never fights the outer entrance animation's
 *    own `y` transform.
 *
 * Under reduced motion, no `initial`/`whileInView`/`style` animation props
 * are passed at all — content is visible immediately, in full, never
 * mid-animation (spec section 2 rule 5). This intentionally does NOT
 * branch to a plain, ref-less `<div>` under reduced motion: `useScroll`
 * needs a ref that stays attached to the DOM across renders, and
 * rendering two different element shapes depending on `reduced` would
 * both break that target and re-mount the DOM node (losing scroll/layout
 * state) the moment the Settings motion toggle flips at runtime. Instead
 * the same `motion.div` + ref renders every time; only the animation
 * props are conditional, and an un-animated `motion.div` behaves like a
 * plain one.
 */
export default function RevealPanel({ index = 0, className = '', children }) {
  const prefersReducedMotion = useReducedMotion();
  const { motion: motionEnabled } = useSettings();
  const reduced = prefersReducedMotion || !motionEnabled;

  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const parallaxY = useTransform(scrollYProgress, [0, 1], [-8, 8]);

  const revealProps = reduced
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.25 },
        transition: { duration: 0.3, delay: index * 0.06, ease: 'easeOut' },
      };

  return (
    <motion.div ref={ref} className={className} {...revealProps}>
      {/*
        h-full here (not just on the outer div) so a `className="h-full"`
        passed in still reaches the wrapped Panel — ChapterSelect.jsx's
        grid relies on that full chain to keep cards equal height via
        CSS grid's default `align-items: stretch`. This inner div is a
        no-op height-wise whenever the outer one isn't itself stretched.
      */}
      <motion.div className="h-full" style={reduced ? undefined : { y: parallaxY }}>
        {children}
      </motion.div>
    </motion.div>
  );
}
