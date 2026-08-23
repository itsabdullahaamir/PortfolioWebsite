/**
 * Visual treatment for a single toast — mechanic 1, spec section 5.
 *
 * Rebuilt again this batch: the previous version (flat translucent bar,
 * two thin rules, centered letter-spaced caps) was itself built on a
 * user description of the real Telltale HUD caption, but the user then
 * supplied an actual screenshot of the in-game control-hint banner and
 * called out that our version was "DEFFO not the style" — solid opaque
 * black, a warning-triangle icon, left-aligned bold sentence-case text,
 * and — the distinctive part — a hand-torn/ink-brushed edge instead of a
 * clean rectangle. That reference photo is now the source of truth for
 * this component, superseding both the older Panel-chrome spec line AND
 * the flat-HUD-caption version that preceded this one.
 *
 * The jagged edge is a static `clip-path` polygon plus a `drop-shadow`
 * filter so the torn silhouette itself casts the shadow instead of a
 * rectangular box-shadow fighting the cut. Not seeded/randomized like
 * Panel.jsx's jitter — this is one fixed shape, not a per-instance
 * variation.
 *
 * **Fixed earlier — two live-reported glitches, both in this same
 * clip-path:** (1) the torn edge only existed on the right (left/top/
 * bottom were flush) — mirrored onto the left edge too, so both
 * vertical sides read as torn claw-like teeth. (2) the notch depth (up
 * to 22% of the box's own width, on the old polygon) cut further inward
 * than the padding accounted for, so at some vertical positions the ink
 * background had a bite missing exactly where the message text sat —
 * the text itself was never actually outside the box, it just had no
 * opaque background behind it there, which read as "the text is
 * rendering outside the box." Fixed at the root rather than patched
 * with more padding alone: notch depth is capped at 6% on each side
 * (both corners of every edge run land back on the exact bounding-box
 * edge, only the middle of each run bows inward), and `px-10` gives
 * every notch depth a real margin — at this component's max width
 * (`sm:max-w-lg`, 32rem/512px) 6% is ~31px, comfortably inside the 40px
 * padding, so no notch can ever reach text regardless of how many lines
 * the message wraps to (wrapping only stretches the polygon's
 * percentages vertically, never changes the horizontal 6% figure).
 *
 * **Fixed this batch — the top edge.** It was still a dead-straight
 * line between the two top corners, which read as a computer-drawn
 * rectangle sitting above two hand-torn sides — not the single
 * consistently rough banner the reference photo shows. The top now
 * gets the same "flush corner, shallow inward bite, back to flush"
 * language as the sides, but in fixed pixels (`Npx`, not `%`) rather
 * than percent-of-box: the sides use percent because their reference
 * axis is height, which already varies a lot with message length, so a
 * proportional bite keeps looking right at any height; the top's
 * reference axis is width, and a percent-of-width bite would make the
 * tear shallower on a one-line toast (~284px wide, seen live) and
 * deeper on a two-line one (~512px) purely from wrapping, not from
 * anything about the tear itself — pixels keep the same paper-texture
 * depth (6–9px) regardless. `py-4` (16px) comfortably clears the 9px
 * max dip. A `background` gradient (ink fading from `--shadow`, the
 * next palette step up per `tokens.css`, into flat `--ink` over the
 * top ~16px) rides along under that jagged clip so the top *reads* as
 * rough too, not just clips as rough — a perfectly flat fill under a
 * jagged cutline still looks like a clean color block with a fancy
 * edge; a paper tear also darkens/varies right at the tear line, which
 * a gradient here approximates cheaply (no image asset, still one
 * `bg-ink`-rooted color pairing from `tokens.css`, nothing hardcoded).
 *
 * Rendered by ToastProvider, which also owns position (top-left, per
 * the reference) and motion; not meant to be used standalone.
 */
const TORN_EDGE_CLIP =
  'polygon(' +
  '0 0, ' +
  '8% 7px, 16% 0, 24% 9px, 33% 0, 41% 6px, 50% 0, 58% 9px, 67% 0, 75% 6px, 84% 0, 92% 7px, 100% 0, ' +
  '95% 8%, 100% 16%, 94% 24%, 100% 33%, 96% 41%, 100% 50%, 94% 58%, 100% 67%, 96% 75%, 100% 84%, 95% 92%, 100% 100%, ' +
  '0 100%, ' +
  '5% 92%, 0 84%, 6% 76%, 0 68%, 4% 59%, 0 50%, 6% 42%, 0 33%, 4% 24%, 0 16%, 5% 8%' +
  ')';

export default function MemoryToast({ message }) {
  return (
    <div
      role="status"
      className="flex max-w-md items-center gap-4 px-10 py-4 sm:max-w-lg"
      style={{
        clipPath: TORN_EDGE_CLIP,
        filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.55))',
        background: 'linear-gradient(to bottom, var(--shadow) 0, var(--ink) 16px)',
      }}
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
