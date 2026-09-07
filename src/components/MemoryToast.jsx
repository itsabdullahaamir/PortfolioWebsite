import { useId } from 'react';

/**
 * Visual treatment for a single toast — mechanic 1, spec section 5.
 *
 * Rebuilt again this batch: direct feedback was that a hard-cut edge —
 * whether the old wide sawtooth or last batch's toned-down single-bite
 * version — isn't what was being asked for at all. The actual ask is a
 * *faded* border: the ink color itself dissolving into the scene behind
 * it, the way a decayed, barren environment bleeds at its edges rather
 * than being cleanly cut out of one. A `clip-path`, restrained or not,
 * can only ever produce a crisp silhouette — it can't fade.
 *
 * So the edge is no longer a shape at all. It's an SVG `<mask>`: a radial
 * gradient (solid through the middle, transparent at the rim — using
 * `objectBoundingBox` units so the ellipse automatically matches this
 * box's own aspect ratio, no matter how many lines the message wraps to)
 * run through the same `feTurbulence` + `feDisplacementMap` pairing
 * `TitleReveal.jsx` already uses for its distressed lettering, at the
 * same baseFrequency register, so the fade rim comes out ragged and
 * eroded rather than a clean photographic vignette — closer to ash or
 * decayed cloth than a camera effect. That mask is applied only to the
 * ink background layer (an absolutely-positioned div), never to the
 * icon or text, so the message stays fully legible while the card
 * itself dissolves at its border. `filter: drop-shadow` on the outer
 * wrapper reads that same alpha, so the shadow fades with it too instead
 * of tracing a hard rectangle underneath a soft edge.
 *
 * Rendered by ToastProvider, which also owns position (top-left) and
 * motion; not meant to be used standalone.
 */
export default function MemoryToast({ message }) {
  const uid = useId();
  const fadeId = `toast-fade-${uid}`;
  const erodeId = `toast-erode-${uid}`;
  const maskId = `toast-mask-${uid}`;

  return (
    <div
      role="status"
      className="relative flex max-w-md items-center gap-4 px-10 py-6 sm:max-w-lg"
      style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}
    >
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <filter id={erodeId} x="-30%" y="-70%" width="160%" height="240%">
            <feTurbulence type="fractalNoise" baseFrequency="0.05 0.09" numOctaves="2" seed="7" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="20" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <radialGradient id={fadeId} cx="50%" cy="50%" r="68%">
            <stop offset="0%" stopColor="#fff" stopOpacity="1" />
            <stop offset="58%" stopColor="#fff" stopOpacity="1" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <mask id={maskId} maskUnits="objectBoundingBox" x="-30%" y="-70%" width="160%" height="240%">
            {/* Sized to exactly the real box (not the overscanned region
                above) so the radial gradient's objectBoundingBox frame maps
                0-100% to the toast's actual edges — the filter's own -30%/
                -70% region just gives its displaced pixels room to spill
                past this rect without being clipped. */}
            <rect x="0" y="0" width="100%" height="100%" fill={`url(#${fadeId})`} filter={`url(#${erodeId})`} />
          </mask>
        </defs>
      </svg>
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, var(--shadow) 0, var(--ink) 18px)',
          maskImage: `url(#${maskId})`,
          WebkitMaskImage: `url(#${maskId})`,
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
        }}
      />
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-shadow">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" className="text-bone">
          <path
            d="M12 3L22 20H2L12 3Z"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <line x1="12" y1="9.5" x2="12" y2="14" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
          <circle cx="12" cy="17.5" r="1.15" fill="currentColor" />
        </svg>
      </span>
      <p className="relative font-body text-base font-bold leading-snug text-bone md:text-lg">{message}</p>
    </div>
  );
}
