/**
 * Visual treatment for a single toast — mechanic 1, spec section 5.
 *
 * Rebuilt again this batch: the previous version (flat translucent bar,
 * two thin rules, centered letter-spaced caps) was itself built on a
 * user description of the real Telltale HUD caption, but the user then
 * supplied an actual screenshot of the in-game control-hint banner and
 * called out that our version was "DEFFO not the style" — solid opaque
 * black, a warning-triangle icon, left-aligned bold sentence-case text,
 * and — the distinctive part — a hand-torn/ink-brushed right edge
 * instead of a clean rectangle. That reference photo is now the source
 * of truth for this component, superseding both the older Panel-chrome
 * spec line AND the flat-HUD-caption version that preceded this one.
 *
 * The jagged edge is a static `clip-path` polygon (right side only —
 * left/top/bottom stay flush, matching the reference's flush-left
 * placement) plus a `drop-shadow` filter so the torn silhouette itself
 * casts the shadow instead of a rectangular box-shadow fighting the cut.
 * Not seeded/randomized like Panel.jsx's jitter — this is one fixed
 * shape, not a per-instance variation.
 *
 * Rendered by ToastProvider, which also owns position (top-left, per
 * the reference) and motion; not meant to be used standalone.
 */
const TORN_EDGE_CLIP =
  'polygon(0 0, 88% 0, 93% 10%, 84% 18%, 96% 27%, 80% 35%, 100% 45%, 82% 55%, 94% 65%, 78% 75%, 90% 85%, 100% 92%, 85% 100%, 0 100%)';

export default function MemoryToast({ message }) {
  return (
    <div
      role="status"
      className="flex max-w-md items-center gap-4 bg-ink py-4 pl-5 pr-14 sm:max-w-lg"
      style={{ clipPath: TORN_EDGE_CLIP, filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.55))' }}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        width="28"
        height="28"
        fill="none"
        className="shrink-0 text-bone"
      >
        <path
          d="M12 3L22 20H2L12 3Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <line x1="12" y1="9.5" x2="12" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="17.5" r="1.1" fill="currentColor" />
      </svg>
      <p className="font-body text-base font-bold leading-snug text-bone md:text-lg">{message}</p>
    </div>
  );
}
