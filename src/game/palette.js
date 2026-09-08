/**
 * Runtime palette resolution — the ONE bridge between the CSS design
 * tokens and anything drawn on a <canvas>.
 *
 * Why this file exists at all: root CLAUDE.md section 3 forbids hardcoding a hex
 * value in a component, and the game layer is where that rule is easiest
 * to break by accident, because a canvas has no stylesheet. Every scene
 * receives the object returned by `readPalette()` on its context and
 * draws with `palette.ink` / `palette.bone` / etc. rather than a literal.
 * Change src/styles/tokens.css and the game changes with it.
 *
 * The values are read once per mount (and again on resize, which is
 * cheap) rather than per frame — getComputedStyle forces style
 * recalculation and would be a per-frame stall for no benefit, since
 * tokens.css declares these statically.
 */

const TOKENS = ['ink', 'paper', 'shadow', 'signal', 'dusk', 'bone'];

// Mirrors tokens.css. Only ever used if getComputedStyle returns nothing,
// which happens in a detached/SSR-ish render before the sheet applies.
const FALLBACK = {
  ink: '#141210',
  paper: '#d8cfc0',
  shadow: '#3b342e',
  signal: '#c4321e',
  dusk: '#2a3742',
  bone: '#efe7d8',
};

export function readPalette() {
  if (typeof window === 'undefined') return { ...FALLBACK };
  const styles = getComputedStyle(document.documentElement);
  const palette = {};
  for (const token of TOKENS) {
    const value = styles.getPropertyValue(`--${token}`).trim();
    palette[token] = value || FALLBACK[token];
  }
  return palette;
}

/**
 * `rgba()` around a token, for the many places a scene needs a token at
 * partial opacity (haze, scrims, trailing motion). Kept here rather than
 * in each scene so nobody is tempted to write a literal rgba() with the
 * palette's numbers inlined — which would silently stop tracking the
 * tokens.
 */
export function alpha(hex, a) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** Linear blend between two hex tokens. Returns a hex string. */
export function mix(a, b, t) {
  const parse = (hex) => {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const n = parseInt(full, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  const k = Math.max(0, Math.min(1, t));
  const to = (x, y) => Math.round(x + (y - x) * k);
  return `rgb(${to(r1, r2)}, ${to(g1, g2)}, ${to(b1, b2)})`;
}
