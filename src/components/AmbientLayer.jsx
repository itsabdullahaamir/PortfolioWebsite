import { useEffect } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useSettings } from '../context/SettingsContext.jsx';

/**
 * Global ambient/motion layer — mounted once in App.jsx, inside
 * SettingsProvider. Two jobs, both scoped by the same combined
 * reduced-motion check (OS prefers-reduced-motion OR the Settings
 * "motion" toggle off — spec section 2 rule 5, and the motion-pass
 * instruction that EITHER one must disable motion):
 *
 * 1. Renders the film grain overlay — mechanic 5 (spec section 5), one of
 *    the two chosen ambient details. Fixed, full-viewport, pointer-events
 *    none, .texture-grain from styles/textures.css animated at ~8fps via
 *    the steps() keyframe there. Disabled outright (not rendered, not
 *    just frozen) under reduced motion.
 * 2. Syncs a `motion-off` class onto <html> whenever the Settings motion
 *    toggle is off, so plain-CSS transitions elsewhere in the app (Panel
 *    hover lift, DialogueChoice hover bar) also honor the in-app toggle,
 *    not just the OS-level media query — see the matching CSS block in
 *    src/index.css for why this can't be done with a media query alone.
 *    This lives here rather than in SettingsContext.jsx itself because
 *    src/context/* is off-limits for this batch (root CLAUDE.md
 *    constraint) — this is a presentational side effect, not state.
 *
 * The other two mechanic-5 options (ambient audio, crosshair cursor) are
 * deliberately not built — spec says pick two, not all four, and audio is
 * flagged as likely scope creep. The second chosen detail (slow panel
 * parallax, max 8px) lives in RevealPanel.jsx instead, since it is scoped
 * per-panel rather than global.
 */
export default function AmbientLayer() {
  const prefersReducedMotion = useReducedMotion();
  const { motion } = useSettings();
  const reduced = prefersReducedMotion || !motion;

  useEffect(() => {
    document.documentElement.classList.toggle('motion-off', !motion);
    return () => document.documentElement.classList.remove('motion-off');
  }, [motion]);

  if (reduced) return null;

  return (
    <div
      aria-hidden="true"
      className="texture-grain texture-grain-animate pointer-events-none fixed inset-0 z-[70]"
    />
  );
}
