/**
 * Shared drawing primitives for every canvas scene.
 *
 * Why this exists: the five minigames are built separately, and without a
 * shared vocabulary they would drift into five different-looking games
 * inside one site -- exactly the theme-jump defect that forced
 * ChapterSelect.jsx to be rebuilt (see root CLAUDE.md phase 4). Every
 * scene draws through these helpers so the ink language stays identical:
 * flat silhouettes, a rim light toward whatever the light source is,
 * roughened contours rather than ruler-straight vector, and halftone
 * falloff instead of smooth gradients.
 *
 * This mirrors the language already established in
 * src/components/EpisodeArt.jsx and src/components/TitleBackdrop.jsx --
 * the tonal ladder, the Rim helper, the double-drawn lit window. It is
 * reimplemented here rather than shared because those are SVG/React and
 * this is immediate-mode canvas, but the RULES are the same and should
 * stay the same. If you change the look here, look at those two files.
 *
 * NEVER write a colour literal in a scene. Everything takes a colour
 * from ctx.palette (see ./palette.js).
 */

/* -- Deterministic randomness ---------------------------------------
   Scenes must look the same on every frame and every reload, so any
   "hand-drawn" jitter has to come from a seeded generator, not
   Math.random(). Same reasoning as Panel.jsx's seed prop. */
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

/* -- Geometry ------------------------------------------------------- */

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const lerp = (a, b, t) => a + (b - a) * t;
/** Smooth 0..1 ramp. Cheaper and calmer than an easing library here. */
export const smooth = (t) => {
  const k = clamp(t, 0, 1);
  return k * k * (3 - 2 * k);
};

/**
 * A rectangle with a hand-torn contour. Depth is in absolute virtual
 * units and deliberately small (2-6px at this scale) -- the same
 * restraint Panel.jsx settled on. A deeper jitter reads as a flame or a
 * thorn outline rather than torn paper; that was a real defect in
 * MemoryToast.jsx and is worth not repeating.
 */
export function roughRect(g, x, y, w, h, seed = 1, depth = 4) {
  const rand = rng(seed);
  const bite = () => (rand() - 0.5) * depth * 2;
  g.beginPath();
  g.moveTo(x + bite(), y + bite());
  g.lineTo(x + w * 0.5 + bite(), y + bite() * 0.6);
  g.lineTo(x + w + bite(), y + bite());
  g.lineTo(x + w + bite() * 0.6, y + h * 0.5 + bite());
  g.lineTo(x + w + bite(), y + h + bite());
  g.lineTo(x + w * 0.5 + bite(), y + h + bite() * 0.6);
  g.lineTo(x + bite(), y + h + bite());
  g.lineTo(x + bite() * 0.6, y + h * 0.5 + bite());
  g.closePath();
}

export function fillRough(g, x, y, w, h, color, seed = 1, depth = 4) {
  roughRect(g, x, y, w, h, seed, depth);
  g.fillStyle = color;
  g.fill();
}

export function strokeRough(g, x, y, w, h, color, seed = 1, depth = 4, width = 2) {
  roughRect(g, x, y, w, h, seed, depth);
  g.strokeStyle = color;
  g.lineWidth = width;
  g.stroke();
}

/* -- Light ---------------------------------------------------------- */

/**
 * A lit window: blurred halo plus crisp core, drawn twice.
 *
 * This is the single most important primitive in the whole game, because
 * the entire visual concept is "light seen from the dark." A flat pale
 * rectangle reads as a grey square, not as a light source -- that was
 * the exact defect that forced TitleBackdrop.jsx's round 3 rebuild. Do
 * not simplify this to one fillRect.
 */
export function litWindow(g, x, y, w, h, palette, intensity = 1) {
  const k = clamp(intensity, 0, 1);
  if (k <= 0) return;

  // Halo. A radial gradient rather than a canvas shadow blur: shadowBlur
  // is a per-draw filter and is the single most expensive thing you can
  // put in a 60Hz loop.
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.max(w, h) * 1.9;
  const halo = g.createRadialGradient(cx, cy, 0, cx, cy, r);
  halo.addColorStop(0, rgba(palette.bone, 0.34 * k));
  halo.addColorStop(0.35, rgba(palette.bone, 0.13 * k));
  halo.addColorStop(1, rgba(palette.bone, 0));
  g.fillStyle = halo;
  g.fillRect(cx - r, cy - r, r * 2, r * 2);

  // Core.
  g.fillStyle = rgba(palette.bone, 0.62 + 0.32 * k);
  g.fillRect(x, y, w, h);

  // Mullions, so a big pane reads as a window and not as a blank slab.
  if (w > 26 && h > 26) {
    g.strokeStyle = rgba(palette.ink, 0.55);
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x + w / 2, y);
    g.lineTo(x + w / 2, y + h);
    g.moveTo(x, y + h / 2);
    g.lineTo(x + w, y + h / 2);
    g.stroke();
  }
}

/**
 * Rim light. Draws whatever `paint` draws twice: once offset toward the
 * light in --bone, then the real ink shape on top. Lifted straight from
 * EpisodeArt.jsx, where it was chosen over a blur-based glow because it
 * is a plain fill that costs nothing and survives being scaled down.
 *
 * Without it, a 100%-ink silhouette in front of a glow reads as a hole
 * punched in the frame rather than as a person standing there.
 */
export function withRim(g, paint, dx, dy, rimColor, inkColor) {
  g.save();
  g.translate(dx, dy);
  g.fillStyle = rimColor;
  paint(g);
  g.restore();
  g.fillStyle = inkColor;
  paint(g);
}

/**
 * Halftone dot falloff -- the printed-ink stand-in for a gradient ramp.
 * Used for light spill on a floor and for shading a large flat area.
 * `dir` is 'down' | 'up' | 'left' | 'right' and says which way the dots
 * thin out.
 */
export function halftone(g, x, y, w, h, color, dir = 'down', spacing = 9, seed = 7) {
  const rand = rng(seed);
  g.fillStyle = color;
  for (let py = y; py < y + h; py += spacing) {
    for (let px = x; px < x + w; px += spacing) {
      let t;
      if (dir === 'down') t = 1 - (py - y) / h;
      else if (dir === 'up') t = (py - y) / h;
      else if (dir === 'right') t = 1 - (px - x) / w;
      else t = (px - x) / w;
      if (rand() > t * t) continue;
      const r = 0.6 + t * 1.9;
      g.beginPath();
      g.arc(px, py, r, 0, Math.PI * 2);
      g.fill();
    }
  }
}

/* -- Figures --------------------------------------------------------
   One human silhouette, used by the overworld walker and by any scene
   that needs a crowd. Deliberately asymmetric with a real neck, sloping
   shoulders and hanging arms: a symmetric no-neck no-arms capsule reads
   as a snowman, which was a named defect in EpisodeArt.jsx's rebuild. */

/**
 * @param pose  0 stand | 1 step-left | 2 step-right | 3 seated
 * @param flip  face left instead of right
 */
export function figure(g, x, y, h, pose = 0, flip = false) {
  const s = h / 100; // all measurements below are in a 100-unit-tall body
  g.save();
  g.translate(x, y);
  g.scale(flip ? -s : s, s);

  const path = new Path2D();

  // Head -- slightly forward of centre, which is most of what stops the
  // silhouette reading as a snowman.
  path.moveTo(2, -100);
  path.arc(3, -89, 11, 0, Math.PI * 2);

  // Torso: narrow neck, sloping shoulders, taper to the waist.
  path.moveTo(-2, -79);
  path.lineTo(6, -79); // neck
  path.lineTo(15, -70); // right shoulder, dropped
  path.lineTo(17, -40);
  path.lineTo(13, -22);
  path.lineTo(-11, -22);
  path.lineTo(-15, -42);
  path.lineTo(-13, -71); // left shoulder, slightly higher: asymmetry
  path.closePath();

  if (pose === 3) {
    // Seated: thighs forward, shins down. The desk figure.
    path.moveTo(-11, -24);
    path.lineTo(24, -20);
    path.lineTo(24, -9);
    path.lineTo(-10, -12);
    path.closePath();
    path.moveTo(16, -11);
    path.lineTo(24, -11);
    path.lineTo(23, 0);
    path.lineTo(15, 0);
    path.closePath();
    // Arm reaching to the desk.
    path.moveTo(9, -66);
    path.lineTo(15, -64);
    path.lineTo(27, -30);
    path.lineTo(21, -27);
    path.closePath();
  } else {
    // Legs. Stride opens on the stepping poses.
    const stride = pose === 1 ? 9 : pose === 2 ? -9 : 0;
    path.moveTo(-10, -24);
    path.lineTo(-2, -24);
    path.lineTo(-3 - stride, 0);
    path.lineTo(-11 - stride, 0);
    path.closePath();
    path.moveTo(3, -24);
    path.lineTo(12, -24);
    path.lineTo(12 + stride, 0);
    path.lineTo(4 + stride, 0);
    path.closePath();
    // Arms, hanging, counter-swung against the legs.
    const swing = -stride * 0.6;
    path.moveTo(-14, -68);
    path.lineTo(-8, -68);
    path.lineTo(-6 + swing, -32);
    path.lineTo(-12 + swing, -31);
    path.closePath();
    path.moveTo(11, -69);
    path.lineTo(16, -69);
    path.lineTo(15 - swing, -33);
    path.lineTo(10 - swing, -34);
    path.closePath();
  }

  g.fill(path);
  g.restore();
}

/* -- Type -----------------------------------------------------------
   Faces come from the CSS tokens (root CLAUDE.md 3: display face is
   titles only, never body copy) -- restated here because canvas has no
   stylesheet to enforce it. */

export const DISPLAY = "'Alfa Slab One', 'Oswald', 'Archivo Black', sans-serif";
export const BODY = "'Inter', 'Source Sans 3', 'Public Sans', sans-serif";

export function text(g, str, x, y, options = {}) {
  const {
    size = 18,
    face = BODY,
    color = '#fff',
    align = 'left',
    baseline = 'alphabetic',
    weight = '400',
    tracking = 0,
    alpha: a = 1,
  } = options;

  g.save();
  g.globalAlpha = a;
  g.font = `${weight} ${size}px ${face}`;
  g.textAlign = tracking ? 'left' : align;
  g.textBaseline = baseline;
  g.fillStyle = color;

  if (!tracking) {
    g.fillText(str, x, y);
    g.restore();
    return;
  }

  // Canvas has no letter-spacing in every browser we target, and the
  // uppercase tracked labels are a signature of this design, so it is
  // worth drawing per-character.
  const chars = [...str];
  const total = chars.reduce((sum, c) => sum + g.measureText(c).width + tracking, 0) - tracking;
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  for (const c of chars) {
    g.fillText(c, cx, y);
    cx += g.measureText(c).width + tracking;
  }
  g.restore();
}

/** Word-wrap helper. Returns the lines; does not draw. */
export function wrap(g, str, maxWidth, size, face = BODY, weight = '400') {
  g.save();
  g.font = `${weight} ${size}px ${face}`;
  const words = str.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (g.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  g.restore();
  return lines;
}

/* -- Colour --------------------------------------------------------- */

/** rgba() from a hex token. Duplicated from palette.js's alpha() so a
 *  scene only needs one import; kept in sync by being three lines. */
export function rgba(hex, a) {
  const h = String(hex).replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/* -- Atmosphere ------------------------------------------------------ */

/**
 * The vignette every scene closes with, so the frame edges fall into ink
 * and the lit middle carries the eye. Call last, before any HUD.
 */
export function vignette(g, w, h, palette, strength = 0.55) {
  const grad = g.createRadialGradient(w / 2, h / 2, h * 0.22, w / 2, h / 2, h * 0.92);
  grad.addColorStop(0, rgba(palette.ink, 0));
  grad.addColorStop(1, rgba(palette.ink, strength));
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
}

/**
 * Film grain, matching the .texture-grain overlay AmbientLayer.jsx
 * mounts over the DOM screens. Without it the canvas reads as clean
 * vector against a grained page. Generated once into an offscreen tile
 * and repeated -- regenerating noise per frame is a guaranteed stall.
 */
let grainTile = null;
export function grain(g, w, h, amount = 0.05, reducedMotion = false, frame = 0) {
  if (!grainTile) {
    const size = 96;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const tg = canvas.getContext('2d');
    const image = tg.createImageData(size, size);
    const rand = rng(20260908);
    for (let i = 0; i < image.data.length; i += 4) {
      const v = Math.floor(rand() * 255);
      image.data[i] = v;
      image.data[i + 1] = v;
      image.data[i + 2] = v;
      image.data[i + 3] = 255;
    }
    tg.putImageData(image, 0, 0);
    grainTile = canvas;
  }
  g.save();
  g.globalAlpha = amount;
  // 'soft-light', not 'overlay'. Overlay against an --ink ground pushes
  // mid-grey noise hard toward brown and visibly muddies the whole
  // frame; soft-light keeps the blacks black and only breaks up the
  // flat areas, which is all this is for.
  g.globalCompositeOperation = 'soft-light';
  // A still grain under reduced motion; a drifting one otherwise.
  if (!reducedMotion) {
    const j = (frame % 6) * 13;
    g.translate(-j, -(j % 17));
  }
  const pattern = g.createPattern(grainTile, 'repeat');
  g.fillStyle = pattern;
  g.fillRect(-40, -40, w + 80, h + 80);
  g.restore();
}
