import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useSettings } from '../context/SettingsContext.jsx';

/**
 * Per-character text reveal — spec section 3.5 ("Typewriter … 22ms per
 * character, skippable by click or Enter") and the OPTIONS "typewriter"
 * toggle in spec 4.1.
 *
 * Where this is (and is not) used, because it matters: only on genuinely
 * DIALOGUE-styled text — currently `DialogueChoice.jsx`'s prompt line.
 * It is deliberately NOT applied to panel bodies. Those are 30-60 words
 * of actual resume content each, and typing 16 of them out would put a
 * timer between a recruiter and the information, which spec section 2
 * rule 2 ("no timers that gate content") forbids and the 90-second
 * constraint rules out on its own. A short spoken line is the one place
 * the effect is atmosphere rather than an obstacle.
 *
 * Three things this does to stay honest about not gating content:
 *
 * 1. The full string is ALWAYS in the DOM for assistive tech (the
 *    `sr-only` span), regardless of how much has visually appeared. A
 *    screen reader never waits on the animation.
 * 2. The untyped remainder is rendered at `opacity-0` rather than being
 *    absent, so the element occupies its final size from the first
 *    frame. Slicing the string instead would reflow everything below it
 *    on every tick.
 * 3. It short-circuits to the complete text when the typewriter setting
 *    is off, when the Settings motion toggle is off, or under OS
 *    `prefers-reduced-motion` — and it does so by initialising state to
 *    the full length, not by animating quickly, so content is never
 *    briefly mid-reveal.
 *
 * Skipping: click the text, or press Enter while it is still typing.
 * The Enter listener is on `window` and only mounted mid-reveal — the
 * alternative (making the line focusable) would invent a fake control
 * out of a paragraph purely to catch a keypress.
 */

const CHAR_MS = 22; // spec 3.5

export default function Typewriter({ text = '', as: Tag = 'span', className = '' }) {
  const { typewriter, motion } = useSettings();
  const prefersReducedMotion = useReducedMotion();
  const instant = !typewriter || !motion || prefersReducedMotion;

  /*
    Reset-on-prop-change is done during render (React's documented
    pattern) rather than in an effect. Resetting inside the effect would
    mean an extra render pass every time the line changes, with a frame
    of the *previous* line's progress applied to the new text.
  */
  const [progress, setProgress] = useState(() => ({ text, count: instant ? text.length : 0 }));
  if (progress.text !== text || (instant && progress.count !== text.length)) {
    setProgress({ text, count: instant ? text.length : 0 });
  }
  const count = Math.min(progress.count, text.length);

  useEffect(() => {
    if (instant) return undefined;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      // Guard against a tick landing after the prop changed under us.
      setProgress((prev) => (prev.text === text ? { text, count: i } : prev));
      if (i >= text.length) clearInterval(id);
    }, CHAR_MS);
    return () => clearInterval(id);
  }, [text, instant]);

  const typing = count < text.length;

  useEffect(() => {
    if (!typing) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Enter') setProgress({ text, count: text.length });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [typing, text]);

  return (
    <Tag className={className} onClick={() => setProgress({ text, count: text.length })}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.slice(0, count)}
        <span className="opacity-0">{text.slice(count)}</span>
      </span>
    </Tag>
  );
}
