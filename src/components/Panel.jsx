import { useMemo } from 'react';

/**
 * The comic panel primitive — spec section 3.3. Everything else in the
 * content layer is built from this. Do not restyle borders/shadows
 * per-instance; change the shared rules here instead.
 *
 * - 3px ink border, irregular clip-path (2-6px per-corner jitter, varied
 *   per panel via `seed` so no two panels look identical).
 * - Hard offset shadow, no blur: 6px 6px 0 ink, growing to 8px on hover.
 * - Low-opacity halftone texture (see styles/textures.css .texture-halftone).
 * - Hover: lifts 2px, 120ms ease-out. That is the whole interaction.
 */

// Deterministic pseudo-random from a seed so re-renders don't reshuffle the shape.
function seededJitter(seed, index, min, max) {
  const x = Math.sin(seed * 999 + index * 37.13) * 10000;
  const frac = x - Math.floor(x);
  return min + frac * (max - min);
}

function buildClipPath(seed) {
  // 8-point polygon (one jittered point per corner region) so the
  // rectangle reads as hand-cut rather than a perfect rect.
  const j = (i, min = 2, max = 6) => seededJitter(seed, i, min, max);
  return `polygon(
    ${j(0)}px 0,
    100% 0,
    calc(100% - ${j(1)}px) ${j(2)}px,
    100% calc(100% - ${j(3)}px),
    calc(100% - ${j(4)}px) 100%,
    ${j(5)}px 100%,
    0 calc(100% - ${j(6)}px),
    0 ${j(7)}px
  )`.replace(/\s+/g, ' ');
}

export default function Panel({ seed = 1, as: Tag = 'div', className = '', children, ...rest }) {
  const clipPath = useMemo(() => buildClipPath(seed), [seed]);

  return (
    <Tag
      className={`group relative border-[3px] border-ink bg-paper transition-[box-shadow,transform] duration-[120ms] ease-out shadow-[6px_6px_0_var(--ink)] hover:-translate-y-[2px] hover:shadow-[8px_8px_0_var(--ink)] ${className}`}
      style={{ clipPath }}
      {...rest}
    >
      <span
        aria-hidden="true"
        className="texture-halftone pointer-events-none absolute inset-0"
      />
      <div className="relative">{children}</div>
    </Tag>
  );
}
