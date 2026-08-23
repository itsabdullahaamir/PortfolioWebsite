import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import MemoryToast from './MemoryToast.jsx';
import { pickToastVariant } from '../data/toastVariants.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { useSound } from '../lib/sound.js';

/**
 * Global toast queue — mechanic 1, spec section 5.
 * Rules from spec, enforced here so no caller has to remember them:
 *   - Never show two at once. Queue depth capped at 3, older discarded.
 *   - Hard cap of 8 toasts per session; silently stop after that.
 *   - Holds 3.2s, then fades out (250ms in per spec 3.5; fade-out timing
 *     is implementation's own, spec only mandates the hold + fade shape).
 *   - aria-live="polite", flavor-priority only.
 *
 * Motion pass (Phase 6, spec 3.5 "Toast appear" row): slides in + fades
 * in over 250ms, holds (HOLD_MS below), then fades out — via
 * AnimatePresence/motion instead of the plain conditional render this
 * used before. Reads combined reduced motion (OS prefers-reduced-motion
 * OR the Settings motion toggle) and collapses to an instant, un-animated
 * show/hide in that case — this is a toast, not gating content, so
 * "instant" here just means no slide/fade, not that the toast is
 * suppressed.
 *
 * Position moved from bottom-left to top-left this batch, flush against
 * both edges — the user supplied an actual Telltale screenshot of the
 * in-game notification (see MemoryToast.jsx) and it anchors top-left,
 * not bottom-left. Slide direction changed to match (drops in from
 * above instead of sliding in from the side).
 *
 * Repositioned again + enlarged this batch: live feedback was that the
 * toast read as smaller than the top-left corner it sat in and wanted
 * more breathing room from the edge. The wrapper is no longer flush
 * (`left-4 top-4`, `left-8 top-6` at `sm:`) and both it and
 * MemoryToast.jsx grew their max-width/padding/icon/text sizes to match.
 */

const MAX_QUEUE = 3;
const SESSION_CAP = 8;
const HOLD_MS = 3200;

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const sessionCount = useRef(0);
  const prefersReducedMotion = useReducedMotion();
  const { motion: motionEnabled } = useSettings();
  const reducedMotion = !motionEnabled || prefersReducedMotion;
  const playSound = useSound();

  const showToast = useCallback(
    (trigger) => {
      if (sessionCount.current >= SESSION_CAP) return;
      sessionCount.current += 1;
      const message = pickToastVariant(trigger, sessionCount.current);
      // One integration point covers every toast trigger in the app
      // (episodeFirstOpen, panelExpand, choiceMade, pdfDownload, and the
      // title-screen easter egg) rather than sprinkling playSound calls
      // at every showToast() call site.
      playSound('toast');
      setQueue((prev) => {
        const next = [...prev, { id: sessionCount.current, message }];
        return next.slice(-MAX_QUEUE);
      });
    },
    [playSound],
  );

  // Pull from queue whenever nothing is currently showing.
  useEffect(() => {
    if (!current && queue.length > 0) {
      setCurrent(queue[0]);
      setQueue((prev) => prev.slice(1));
    }
  }, [current, queue]);

  // Hold the current toast, then clear it so the effect above pulls the next one.
  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => setCurrent(null), HOLD_MS);
    return () => clearTimeout(timer);
  }, [current]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed left-4 top-4 z-50 max-w-md sm:left-8 sm:top-6 sm:max-w-lg"
      >
        <AnimatePresence>
          {current ? (
            <motion.div
              key={current.id}
              initial={reducedMotion ? false : { opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -16 }}
              transition={{ duration: reducedMotion ? 0 : 0.25, ease: 'easeOut' }}
            >
              <MemoryToast message={current.message} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
