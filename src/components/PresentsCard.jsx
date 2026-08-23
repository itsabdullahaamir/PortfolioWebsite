import { useEffect, useState } from 'react';

/**
 * Beat 1 of the opening sequence — spec section 4.1.
 * Full black screen, small centered text, holds 1.2s, fades out 400ms.
 * Skippable at any time by click/tap/key. Auto-skipped instantly under
 * prefers-reduced-motion (caller decides that via reducedMotion prop).
 */
export default function PresentsCard({ onDone, reducedMotion }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (reducedMotion) {
      onDone();
      return;
    }
    const raf = requestAnimationFrame(() => setVisible(true));
    const fadeOutTimer = setTimeout(() => setVisible(false), 1200);
    const doneTimer = setTimeout(onDone, 1600); // 1.2s hold + 400ms fade
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(fadeOutTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone, reducedMotion]);

  return (
    <button
      type="button"
      onClick={onDone}
      aria-label="Skip intro"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink text-bone"
    >
      <span
        className="font-body text-sm uppercase tracking-[0.3em] transition-opacity duration-[400ms] ease-in"
        style={{ opacity: visible ? 1 : 0 }}
      >
        Abdullah Aamir presents
      </span>
    </button>
  );
}
