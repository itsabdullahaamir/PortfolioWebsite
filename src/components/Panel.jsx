import { useMemo } from 'react';

/**
 * The comic panel primitive — spec section 3.3. Everything else in the
 * content layer is built from this. Do not restyle borders/shadows
 * per-instance; change the shared rules here instead.
 *
 * - 3px border, irregular clip-path (2-6px per-corner jitter, varied
 *   per panel via `seed` so no two panels look identical).
 * - Hard offset shadow, no blur: 6px 6px 0 ink, growing to 8px on hover.
 * - Low-opacity halftone texture (see styles/textures.css .texture-halftone).
 * - Hover: lifts 2px, 120ms ease-out. That is the whole interaction.
 *
 * `tone` selects the surface, and it is a SHARED rule rather than a
 * per-instance override on purpose (see the paragraph above). `paper` is
 * the original and the default — ink border on paper, for the daylit
 * document screens. `night` exists for `ChapterSelect.jsx`, which sits
 * over the same night city as the title screen: there, an ink border on
 * an ink-ish ground is invisible, so the border inverts to bone and the
 * fill lifts off `--ink` toward `--dusk` far enough that the hard ink
 * shadow still reads as a shadow. The halftone flips with it, since
 * dark dots on a dark surface are just an opacity cost.
 *
 * Colors come through `style`, not Tailwind arbitrary values, because
 * `color-mix()` expressions do not survive class-name round-tripping
 * cleanly and this component already sets `style` for its clip-path.
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

const TONES = {
  paper: {
    texture: 'texture-halftone',
    style: { borderColor: 'var(--ink)', background: 'var(--paper)' },
  },
  night: {
    texture: 'texture-halftone-light',
    style: {
      borderColor: 'color-mix(in oklab, var(--bone) 30%, transparent)',
      background: 'color-mix(in oklab, var(--dusk) 34%, var(--ink))',
    },
  },
};

export default function Panel({
  seed = 1,
  as: Tag = 'div',
  tone = 'paper',
  className = '',
  children,
  ...rest
}) {
  const clipPath = useMemo(() => buildClipPath(seed), [seed]);
  const { texture, style } = TONES[tone] ?? TONES.paper;

  return (
    <Tag
      className={`group relative border-[3px] transition-[box-shadow,transform] duration-[120ms] ease-out shadow-[6px_6px_0_var(--ink)] hover:-translate-y-[2px] hover:shadow-[8px_8px_0_var(--ink)] ${className}`}
      style={{ clipPath, ...style }}
      {...rest}
    >
      <span aria-hidden="true" className={`${texture} pointer-events-none absolute inset-0`} />
      <div className="relative">{children}</div>
    </Tag>
  );
}
