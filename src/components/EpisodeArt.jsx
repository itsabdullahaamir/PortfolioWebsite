import { useId } from 'react';

/**
 * Episode key art — one backlit scene per episode, drawn in this app's
 * own printed-ink language rather than as a smooth vector diagram.
 *
 * WHY THIS REWRITE (the third pass on this component). The previous
 * version got the STAGING right — one big window, one large subject in
 * front of it, dark foreground band, vignette — and that staging is kept
 * here unchanged. What it got wrong was reported as "it isn't meeting
 * the style requirements," and a live screenshot of `/chapters` showed
 * five concrete defects behind that:
 *
 *   1. ALL FIVE SCENES RENDERED IDENTICALLY. Each scene's distinguishing
 *      props (the lecture board, the podium, the crowd, the pegboard)
 *      were filled `var(--ink)` and drawn against an `--ink` background,
 *      so they were invisible. Only episode 2's monitor and episode 4's
 *      clock ever read, because those two were the only props filled
 *      with the LIGHT gradient. The art was not under-drawn; it was
 *      drawn in a color that could not be seen.
 *   2. The figure was a snowman — an ellipse head on a symmetric
 *      trapezoid, no neck, no shoulder slope, no arms.
 *   3. No rim light. A 100%-ink silhouette against a glow reads as a
 *      hole punched in the frame, not as a person standing in front of
 *      a window.
 *   4. No texture at all. Every other surface in this app is
 *      deliberately printed and distressed — `Panel.jsx`'s torn
 *      clip-path, `TitleReveal.jsx`'s `feTurbulence` lettering,
 *      `textures.css`'s halftone and film grain. This was the one
 *      surface in ruler-straight vector, so it read as a diagram.
 *   5. Identical camera in all five — the same window rectangle at the
 *      same coordinates every episode.
 *
 * THE FIVE FIXES, in the same order:
 *
 *   1. A TONAL LADDER (`T` below). Scene parts are assigned to `far` /
 *      `mid` / `near` depth groups with genuinely different values, so a
 *      prop can sit against the wall and still be seen. Nothing but the
 *      nearest plane is pure `--ink` any more.
 *   2. Hand-authored figure paths with a neck, sloping shoulders,
 *      hanging arms and deliberate left/right asymmetry — plus a fourth
 *      pose (`gesture`) so the lecturer and the speaker are not the same
 *      person standing the same way.
 *   3. `Rim` draws every silhouette twice: a `--bone` copy offset a few
 *      units TOWARD the window, then the ink copy on top. The sliver of
 *      bone that survives along the light-facing edge is the rim. This
 *      is the single change that makes the subject read as backlit, and
 *      unlike a blur-based glow it survives being scaled to a 176px
 *      thumbnail.
 *   4. Print texture: contours run through a `feTurbulence` +
 *      `feDisplacementMap` roughening filter (the same technique
 *      `TitleReveal.jsx` uses on the name), and the light's falloff is a
 *      HALFTONE DOT field masked by a radial gradient instead of a
 *      smooth ramp — so the glow breaks into dots at its edge the way a
 *      printed one would.
 *   5. Per-scene camera. Each scene owns its window rectangle: episode 5
 *      puts it on the LEFT and lights the subject from that side, the
 *      others vary position, width, height and mullion count. This is
 *      what stops the filmstrip reading as five copies of one thumbnail.
 *
 * PALETTE. Unchanged and deliberately NOT the Batman reference's cyan
 * grade: light is `--bone` into `--paper`, darks are `--ink` and
 * `--dusk`. No `--signal` anywhere in this file — the accent belongs to
 * the two controls on the screen that earned it.
 *
 * CONTINUITY. The window still shows the title screen's skyline out
 * through the glass: you are inside one of the lit windows from `/`,
 * looking out.
 *
 * `detail`:
 * - `'full'` (hero) — bloom, god rays, haze, contour roughening, halftone.
 * - `'low'` (filmstrip tiles) — same composition, tonal ladder and rim
 *   light, but NO filters of any kind. This is a performance rule, not a
 *   fidelity one: blur and displacement are invisible at 176px, and five
 *   tiles plus a hero at full detail would put ~18 live filters on a
 *   screen `PageTransition.jsx` has to zoom, which is the exact shape of
 *   the lag reported against the route dolly. The rim and the ladder are
 *   plain fills, cost nothing, and are what actually carry the read at
 *   thumbnail size.
 *
 * `lit` is the visited state: the same drawing with the light turned
 * down, never a different drawing.
 */

const VB_W = 1600;
const VB_H = 900;

/*
  Tonal ladder. The fix for defect 1 — four separable darks instead of
  one. Anything against the back wall uses `far`, anything standing in
  the room uses `mid`, and only the plane nearest camera is pure ink.
*/
const T = {
  wall: 'color-mix(in oklab, var(--ink) 54%, var(--dusk))',
  far: 'color-mix(in oklab, var(--ink) 70%, var(--dusk))',
  mid: 'color-mix(in oklab, var(--ink) 86%, var(--dusk))',
  near: 'var(--ink)',
};

/* --------------------------------------------------------------------
   Figures. Back-view silhouettes drawn in a local 200 x 420 box and
   scaled by the caller, so a scene positions a figure by height rather
   than by editing path coordinates. Asymmetry is deliberate throughout:
   a perfectly mirrored body is most of why the old one read as a snowman.
   ------------------------------------------------------------------ */

const POSES = {
  // Standing, seen from behind, arms hanging. The default subject.
  stand: (
    <>
      <ellipse cx="102" cy="50" rx="35" ry="41" />
      <path
        d="M102,88 C88,88 86,96 86,104 C64,112 52,136 44,168 C38,196 33,236 29,300
           L27,318 L49,322 L57,258 L60,238 L56,420 L150,420 L146,240 L150,262
           L160,320 L182,314 L176,296 C170,232 165,192 158,164 C150,132 138,110 118,104
           C118,96 116,88 102,88 Z"
      />
    </>
  ),
  // Standing, one arm raised across the light. The lecturer / speaker.
  gesture: (
    <>
      <ellipse cx="96" cy="52" rx="35" ry="41" />
      <path
        d="M96,90 C82,90 80,98 80,106 C58,114 46,138 39,170 C33,198 28,238 24,302
           L22,320 L44,324 L52,260 L55,240 L51,420 L145,420 L142,238
           C150,214 162,186 180,152 L196,124 L174,112 L156,148
           C148,176 141,196 134,208 C130,158 128,116 112,106 C112,98 110,90 96,90 Z"
      />
    </>
  ),
  // Seated, seen from behind — head and shoulders above a desk.
  sit: (
    <>
      <ellipse cx="99" cy="78" rx="35" ry="41" />
      <path
        d="M99,116 C86,116 84,124 84,132 C60,142 48,168 42,204
           C37,238 34,300 33,420 L167,420 C166,300 163,236 157,202
           C151,166 138,140 115,132 C115,124 113,116 99,116 Z"
      />
    </>
  ),
  // Hunched forward over a desk. Head low, back rounded, one arm out.
  hunch: (
    <>
      <ellipse cx="128" cy="142" rx="34" ry="39" />
      <path
        d="M38,420 C34,332 44,254 72,214 C90,188 114,176 138,182
           C158,196 170,242 176,298 L184,420 Z
           M150,214 C170,222 190,240 196,262 L176,272 C168,254 154,242 142,236 Z"
      />
    </>
  ),
};

/**
 * Rim light. Draws the silhouette twice — a `--bone` copy nudged toward
 * the light source, then the ink copy on top. The few units of bone that
 * survive along the light-facing contour ARE the rim.
 */
function Rim({ dx, dy = -5, strength = 0.34, tone = T.near, children }) {
  return (
    <>
      <g fill="var(--bone)" opacity={strength} transform={`translate(${dx} ${dy})`}>
        {children}
      </g>
      <g fill={tone}>{children}</g>
    </>
  );
}

function Figure({ pose = 'stand', x, y, h }) {
  const s = h / 420;
  return <g transform={`translate(${x - (200 * s) / 2} ${y}) scale(${s})`}>{POSES[pose]}</g>;
}

/** A row of head-and-shoulders silhouettes — an audience, receding. */
function CrowdRow({ y, r, step, phase = 0 }) {
  const items = [];
  for (let x = -80 + phase; x < VB_W + 100; x += step) {
    items.push(
      <g key={x}>
        <ellipse cx={x} cy={y} rx={r} ry={r * 1.08} />
        <path
          d={`M${x - r * 2.2},${y + r * 3.6}
              C${x - r * 2.1},${y + r * 1.2} ${x - r * 1.1},${y + r * 0.9} ${x},${y + r * 0.9}
              C${x + r * 1.1},${y + r * 0.9} ${x + r * 2.1},${y + r * 1.2} ${x + r * 2.2},${
            y + r * 3.6
          } Z`}
        />
      </g>,
    );
  }
  return <g>{items}</g>;
}

/* --------------------------------------------------------------------
   Scenes.

   Each returns its own `win` rectangle (defect 5 — the camera moves
   between episodes) plus depth groups. `far` renders at `T.far` against
   the wall, `mid` at `T.mid`, `subject` and `near` at ink with rim
   light. `glow` is the light gradient, for anything that is itself a
   light source.
   ------------------------------------------------------------------ */

/* Episode 1 — EDUCATION. A lecture hall from the back row: a lit board
   as a second light source, a lecturer mid-gesture, and raked bench rows
   between the camera and the front.
   The camera here is the most distinct of the five on purpose. Measured
   against the other four, this scene and episode 3 (also a figure in
   front of a right-hand window with an audience below) were the only
   pair that read as the same thumbnail — 6.8 mean per-cell luminance
   difference where every other pair scored 15-25. So this window is WIDE
   and HIGH rather than tall, and the foreground is horizontal bench
   slabs rather than episode 3's domed heads: at 176px the silhouette
   language of the two scenes is now different, not just the props. */
function lecture({ glow }) {
  return {
    win: { x: 930, y: 92, w: 560, h: 330, cols: 3, rows: 1 },
    subject: { pose: 'gesture', x: 800, y: 296, h: 560 },
    far: (
      <g>
        {/* The board — a lit plane, so it separates from the wall. */}
        <rect x="150" y="210" width="620" height="330" fill={glow} opacity="0.17" />
        <rect x="150" y="210" width="620" height="330" fill="none" stroke={T.mid} strokeWidth="16" />
        <g stroke="var(--bone)" strokeWidth="7" opacity="0.3" strokeLinecap="round">
          <line x1="200" y1="270" x2="520" y2="266" />
          <line x1="200" y1="318" x2="660" y2="314" />
          <line x1="200" y1="366" x2="440" y2="362" />
          <line x1="200" y1="428" x2="600" y2="424" />
          <line x1="200" y1="476" x2="370" y2="472" />
        </g>
      </g>
    ),
    mid: (
      <g>
        {/* Lectern beside the speaker. */}
        <path d="M604,900 L636,600 L760,600 L788,900 Z" />
        <rect x="586" y="566" width="220" height="42" />
      </g>
    ),
    near: (
      <g>
        {/* Raked bench rows, each wider and lower than the one behind. */}
        <path d="M-40,700 L1640,700 L1640,742 L-40,742 Z" />
        <path d="M-60,772 L1660,772 L1660,824 L-60,824 Z" />
        <path d="M-80,856 L1680,856 L1680,944 L-80,944 Z" />
        {/* A few heads above the front bench, small and irregular. */}
        <ellipse cx="250" cy="676" rx="30" ry="32" />
        <ellipse cx="560" cy="682" rx="28" ry="30" />
        <ellipse cx="1180" cy="674" rx="31" ry="33" />
        <ellipse cx="1450" cy="684" rx="27" ry="29" />
      </g>
    ),
  };
}

/* Episode 2 — TEACHING & RESEARCH. A study at night. The monitor is the
   second light source and carries the graph, which is what makes this
   thumbnail unmistakable at 176px. */
function study({ glow }) {
  const nodes = [
    [318, 486],
    [452, 428],
    [548, 528],
    [392, 596],
    [520, 640],
  ];
  const edges = [
    [0, 1],
    [1, 2],
    [0, 3],
    [2, 4],
    [3, 4],
    [1, 3],
  ];
  return {
    win: { x: 900, y: 100, w: 420, h: 520, cols: 2, rows: 3 },
    subject: { pose: 'sit', x: 1030, y: 322, h: 500 },
    far: (
      <g>
        {/* Shelving on the back wall — depth without incident. */}
        <rect x="120" y="150" width="560" height="16" />
        <rect x="120" y="266" width="470" height="16" />
        {[140, 190, 224, 268, 316, 360, 404].map((x, i) => (
          <rect
            key={x}
            x={x}
            y={166 - (i % 3) * 8}
            width={22 + (i % 4) * 6}
            height={100 + (i % 3) * 8}
          />
        ))}
      </g>
    ),
    mid: null,
    near: (
      <g>
        {/* Monitor: dark bezel with a lit screen punched out of it. */}
        <rect x="230" y="352" width="450" height="356" />
        <rect x="424" y="708" width="62" height="56" />
        <rect x="380" y="760" width="150" height="22" />
        <rect x="268" y="390" width="374" height="280" fill={glow} />
        <g opacity="0.86">
          <g stroke="var(--ink)" strokeWidth="9" strokeLinecap="round">
            {edges.map(([a, b]) => (
              <line
                key={`${a}-${b}`}
                x1={nodes[a][0]}
                y1={nodes[a][1]}
                x2={nodes[b][0]}
                y2={nodes[b][1]}
              />
            ))}
          </g>
          <g fill="var(--ink)">
            {nodes.map(([cx, cy]) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="22" />
            ))}
          </g>
        </g>
        {/* Desk edge, and a mug that has been there a while. */}
        <rect x="-40" y="782" width="1700" height="170" />
        <path d="M760,782 L760,712 L846,712 L846,782 Z" />
        <path d="M846,724 C884,724 884,764 846,764 Z" />
      </g>
    ),
  };
}

/* Episode 3 — LEADERSHIP & COMMUNITY. A hall, from behind the audience.
   Mic stand and podium nearest camera, speaker lit from the window. */
function hall() {
  return {
    win: { x: 1090, y: 150, w: 330, h: 460, cols: 1, rows: 3 },
    subject: { pose: 'gesture', x: 940, y: 274, h: 570 },
    far: (
      <g>
        {/* Ceiling rig — three hanging lamps, the room's own lighting. */}
        {[280, 520, 760].map((x) => (
          <g key={x}>
            <rect x={x - 4} y="60" width="8" height="86" />
            <path d={`M${x - 54},210 L${x - 22},146 L${x + 22},146 L${x + 54},210 Z`} />
          </g>
        ))}
        {/* A banner behind the stage. */}
        <path d="M180,150 L620,150 L620,470 L400,420 L180,470 Z" opacity="0.55" />
      </g>
    ),
    mid: (
      <g>
        {/* Podium and mic, both angled so nothing here is axis-aligned. */}
        <path d="M232,900 L272,556 L470,556 L512,900 Z" />
        <rect x="212" y="520" width="280" height="44" />
        <path
          d="M330,520 C330,440 400,432 420,368"
          fill="none"
          stroke={T.mid}
          strokeWidth="12"
          strokeLinecap="round"
        />
        <ellipse cx="424" cy="352" rx="26" ry="34" transform="rotate(18 424 352)" />
      </g>
    ),
    near: (
      <g>
        <CrowdRow y={716} r={26} step={168} phase={90} />
        <CrowdRow y={806} r={34} step={210} phase={-20} />
        <rect x="-40" y="880" width="1700" height="64" />
      </g>
    ),
  };
}

/* Episode 4 — COMPETITIONS. The night shift: a wall clock reading three,
   a laptop, and somebody who should have gone home. */
function nightShift({ glow }) {
  return {
    win: { x: 870, y: 160, w: 400, h: 440, cols: 2, rows: 2 },
    subject: { pose: 'hunch', x: 1000, y: 350, h: 470 },
    far: (
      <g>
        {/* Whiteboard, mostly scribbled out. */}
        <rect x="170" y="560" width="420" height="220" fill="none" stroke={T.far} strokeWidth="14" />
        <g stroke="var(--bone)" strokeWidth="6" opacity="0.16" strokeLinecap="round">
          <line x1="212" y1="610" x2="470" y2="606" />
          <line x1="212" y1="650" x2="540" y2="646" />
          <line x1="212" y1="690" x2="400" y2="686" />
        </g>
      </g>
    ),
    mid: null,
    near: (
      <g>
        {/* Clock: dark rim, lit face, hands at three. */}
        <circle cx="330" cy="286" r="158" />
        <circle cx="330" cy="286" r="124" fill={glow} />
        <g fill="var(--ink)">
          <rect x="318" y="184" width="24" height="112" rx="8" />
          <rect x="330" y="274" width="92" height="24" rx="8" />
          <circle cx="330" cy="286" r="14" />
        </g>
        {/* Laptop, screen wedged open away from us. */}
        <path d="M690,724 L992,724 L946,516 L742,516 Z" />
        <path d="M752,530 L936,530 L972,708 L714,708 Z" fill={glow} opacity="0.5" />
        <rect x="646" y="724" width="392" height="34" />
        {/* Two cups. Nobody drinks the second one. */}
        <rect x="380" y="640" width="92" height="106" rx="6" />
        <path d="M472,664 C516,664 516,714 472,714 Z" />
        <rect x="512" y="676" width="74" height="70" rx="6" />
        <rect x="-40" y="756" width="1700" height="190" />
      </g>
    ),
  };
}

/* Episode 5 — PROJECTS. A workbench, and the only scene lit from the
   LEFT — the clearest single signal in the filmstrip that these are five
   different pictures. */
function workbench({ glow }) {
  return {
    win: { x: 210, y: 130, w: 360, h: 470, cols: 2, rows: 2 },
    subject: { pose: 'stand', x: 1010, y: 300, h: 540 },
    far: (
      <g>
        {/* Pegboard: a row of hung tools along the top right. */}
        <rect x="700" y="120" width="740" height="14" />
        <rect x="756" y="134" width="26" height="180" />
        <rect x="736" y="298" width="70" height="46" rx="6" />
        <rect x="880" y="134" width="20" height="150" />
        <path d="M846,284 L934,284 L910,338 L870,338 Z" />
        <rect x="1010" y="134" width="18" height="196" />
        <circle cx="1019" cy="352" r="42" />
        <rect x="1150" y="134" width="24" height="132" />
        <path d="M1122,266 L1202,266 L1188,326 L1136,326 Z" />
        <rect x="1290" y="134" width="18" height="216" />
        <rect x="1258" y="350" width="82" height="34" rx="6" />
      </g>
    ),
    mid: null,
    near: (
      <g>
        {/* Bench slab, thick and nearest camera. */}
        <rect x="-40" y="736" width="1700" height="220" />
        <rect x="-40" y="716" width="1700" height="26" />
        {/* A second monitor, small, angled away. */}
        <path d="M1268,716 L1560,716 L1536,536 L1300,536 Z" />
        <path d="M1318,556 L1518,556 L1538,700 L1290,700 Z" fill={glow} opacity="0.62" />
        {/* Board and parts on the bench. */}
        <rect x="640" y="646" width="230" height="76" rx="4" />
        <g fill={T.wall}>
          {[
            [672, 668],
            [716, 668],
            [760, 668],
            [804, 668],
            [694, 700],
            [738, 700],
            [782, 700],
          ].map(([x, y]) => (
            <rect key={`${x}-${y}`} x={x} y={y} width="26" height="18" />
          ))}
        </g>
      </g>
    ),
  };
}

const SCENES = {
  lecture,
  study,
  hall,
  nightshift: nightShift,
  workbench,
};

/** The city, seen out through the glass — the title screen's skyline. */
function CityThroughGlass({ win }) {
  const cols = [
    { o: 0.0, w: 0.19, h: 0.3 },
    { o: 0.15, w: 0.14, h: 0.48 },
    { o: 0.27, w: 0.22, h: 0.22 },
    { o: 0.46, w: 0.15, h: 0.4 },
    { o: 0.58, w: 0.2, h: 0.27 },
    { o: 0.75, w: 0.17, h: 0.44 },
    { o: 0.88, w: 0.18, h: 0.24 },
  ];
  return (
    <g>
      <g opacity="0.36" fill="var(--dusk)">
        {cols.map((b) => (
          <rect
            key={b.o}
            x={win.x + b.o * win.w}
            y={win.y + win.h * (1 - b.h)}
            width={b.w * win.w}
            height={b.h * win.h}
          />
        ))}
      </g>
      {/* A handful of lit panes over there, same as here. */}
      <g fill="var(--bone)" opacity="0.55">
        {[
          [0.05, 0.2],
          [0.18, 0.36],
          [0.31, 0.14],
          [0.49, 0.28],
          [0.62, 0.18],
          [0.79, 0.34],
          [0.83, 0.2],
        ].map(([dx, dy]) => (
          <rect
            key={`${dx}-${dy}`}
            x={win.x + dx * win.w}
            y={win.y + win.h * (1 - dy)}
            width={win.w * 0.035}
            height={win.h * 0.03}
          />
        ))}
      </g>
    </g>
  );
}

export default function EpisodeArt({
  scene = 'lecture',
  lit = false,
  detail = 'full',
  className = '',
}) {
  const uid = useId().replace(/:/g, '');
  const glowId = `art-glow-${uid}`;
  const lightId = `art-light-${uid}`;
  const skyId = `art-sky-${uid}`;
  const vignetteId = `art-vig-${uid}`;
  const winClipId = `art-winclip-${uid}`;
  const roughId = `art-rough-${uid}`;
  const dotId = `art-dot-${uid}`;
  const fallId = `art-fall-${uid}`;

  const build = SCENES[scene] ?? SCENES.lecture;
  const { win, subject, far, mid, near } = build({ glow: `url(#${lightId})` });

  const full = detail === 'full';
  // Visited/unvisited is the same drawing with the light turned down —
  // but only so far. On a tile this dimming compounds with the lighter
  // vignette above AND with the filmstrip's own CSS dimming of
  // unselected tiles, and three multiplied dimmings is how the art went
  // black. Unvisited tiles therefore hold more light than unvisited
  // heroes do; the visited/unvisited distinction still reads because
  // it is a comparison between neighbouring tiles, not an absolute.
  const lightOpacity = lit ? 1 : full ? 0.55 : 0.78;

  const winCx = win.x + win.w / 2;
  const winCy = win.y + win.h / 2;
  // The rim falls on the side facing the window, so its sign follows
  // which side of the subject the window is actually on in this scene.
  const rimDx = winCx > subject.x ? 7 : -7;
  const lightFromLeft = rimDx < 0;

  // Contour roughening — the same feTurbulence/feDisplacementMap
  // technique TitleReveal.jsx uses on the name, at a smaller scale. Hero
  // only: invisible at thumbnail size and not worth a filter there.
  const rough = full ? `url(#${roughId})` : undefined;

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className={`block h-full w-full ${className}`}
    >
      <defs>
        <linearGradient id={skyId} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0%" stopColor={T.wall} />
          <stop offset="52%" stopColor="color-mix(in oklab, var(--ink) 86%, var(--dusk))" />
          <stop offset="100%" stopColor="var(--ink)" />
        </linearGradient>
        <linearGradient id={lightId} x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0%" stopColor="var(--bone)" />
          <stop offset="58%" stopColor="var(--paper)" />
          <stop offset="100%" stopColor="color-mix(in oklab, var(--paper) 66%, var(--shadow))" />
        </linearGradient>
        {/*
          The vignette is deliberately lighter on tiles. A 176px thumbnail
          is nearly all "edge", so a hero-strength vignette eats the whole
          picture: measured on the previous build, 75% of every tile's
          pixels fell between luminance 18 and 25 out of 255 — flat black,
          which is the same unreadable-at-thumbnail-size failure this
          component was rebuilt to fix in the first place.
        */}
        <radialGradient id={vignetteId} cx="0.56" cy="0.44" r={full ? '0.78' : '0.95'}>
          <stop offset={full ? '42%' : '55%'} stopColor="var(--ink)" stopOpacity="0" />
          <stop offset="100%" stopColor="var(--ink)" stopOpacity={full ? '0.94' : '0.66'} />
        </radialGradient>
        <clipPath id={winClipId}>
          <rect x={win.x} y={win.y} width={win.w} height={win.h} />
        </clipPath>

        {full ? (
          <>
            <filter id={glowId} x="-70%" y="-70%" width="240%" height="240%">
              <feGaussianBlur stdDeviation="62" />
            </filter>
            {/*
              Contour roughening. `scale` is small on purpose: this should
              read as a hand-inked edge, not as a melted shape.
            */}
            <filter id={roughId} x="-6%" y="-6%" width="112%" height="112%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.014"
                numOctaves="2"
                seed="7"
                result="noise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale="11"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
            {/*
              Printed falloff: a halftone dot field masked so the dots are
              dense near the window and gone by the frame edge, so the
              light breaks into dots at its edge the way an ink one does
              instead of ramping smoothly like a gradient.
            */}
            <pattern id={dotId} width="13" height="13" patternUnits="userSpaceOnUse">
              <circle cx="4" cy="4" r="2.1" fill="var(--bone)" />
            </pattern>
            <radialGradient
              id={fallId}
              gradientUnits="userSpaceOnUse"
              cx={winCx}
              cy={winCy}
              r={Math.max(win.w, win.h) * 1.9}
            >
              <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
              <stop offset="46%" stopColor="#fff" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
            <mask id={`${fallId}-m`}>
              <rect x="0" y="0" width={VB_W} height={VB_H} fill={`url(#${fallId})`} />
            </mask>
          </>
        ) : null}
      </defs>

      <rect x="0" y="0" width={VB_W} height={VB_H} fill={`url(#${skyId})`} />

      <g opacity={lightOpacity}>
        {/* Bloom. The single most important element for reading this as
            a light source rather than a pale rectangle. */}
        {full ? (
          <rect
            x={win.x}
            y={win.y}
            width={win.w}
            height={win.h}
            fill="var(--paper)"
            opacity="0.62"
            filter={`url(#${glowId})`}
          />
        ) : null}

        {/* God rays, thrown down and away from the window — so they
            follow the camera when a scene lights from the other side. */}
        {full ? (
          <g fill="var(--bone)" opacity="0.09">
            <polygon
              points={`${win.x},${win.y + 90} ${win.x + win.w},${win.y + 40} ${
                lightFromLeft ? VB_W + 240 : 120
              },900 ${lightFromLeft ? VB_W - 120 : -240},900`}
            />
            <polygon
              points={`${win.x + 60},${win.y + 260} ${win.x + win.w},${win.y + 210} ${
                lightFromLeft ? VB_W - 200 : 520
              },900 ${lightFromLeft ? VB_W - 520 : 200},900`}
            />
          </g>
        ) : null}

        {/* The window itself. */}
        <g clipPath={`url(#${winClipId})`}>
          <rect x={win.x} y={win.y} width={win.w} height={win.h} fill={`url(#${lightId})`} />
          <CityThroughGlass win={win} />
        </g>
        <g fill="color-mix(in oklab, var(--ink) 88%, var(--dusk))">
          {Array.from({ length: win.cols }, (_, i) => (
            <rect
              key={`v${i}`}
              x={win.x + (win.w / (win.cols + 1)) * (i + 1) - 9}
              y={win.y}
              width="18"
              height={win.h}
            />
          ))}
          {Array.from({ length: win.rows }, (_, i) => (
            <rect
              key={`h${i}`}
              x={win.x}
              y={win.y + (win.h / (win.rows + 1)) * (i + 1) - 8}
              width={win.w}
              height="16"
            />
          ))}
        </g>
        <rect
          x={win.x - 12}
          y={win.y - 12}
          width={win.w + 24}
          height={win.h + 24}
          fill="none"
          stroke="var(--ink)"
          strokeWidth="22"
        />
      </g>

      {/* Everything below is the room, roughened as one group so the
          contours share a single displacement field and stay consistent
          with each other rather than each wobbling independently. */}
      <g filter={rough}>
        {far ? (
          <g fill={T.far} opacity={lit ? 1 : full ? 0.72 : 0.9}>
            {far}
          </g>
        ) : null}

        {/* Haze between the light and the subject — this is what
            separates the silhouette from the window instead of letting
            it read as a sticker pasted on top. */}
        {full ? (
          <rect
            x="0"
            y={win.y + win.h * 0.55}
            width={VB_W}
            height="320"
            fill="var(--bone)"
            opacity={lit ? 0.07 : 0.04}
            filter={`url(#${glowId})`}
          />
        ) : null}

        {mid ? (
          <Rim dx={rimDx} strength={0.2} tone={T.mid}>
            {mid}
          </Rim>
        ) : null}

        <Rim dx={rimDx} strength={0.38}>
          <Figure pose={subject.pose} x={subject.x} y={subject.y} h={subject.h} />
        </Rim>

        <Rim dx={rimDx} dy={-4} strength={0.16}>
          {near}
        </Rim>
      </g>

      {/* Printed falloff. Sits above the room so the dots lie on the
          scene the way ink lies on paper. */}
      {full ? (
        <rect
          x="0"
          y="0"
          width={VB_W}
          height={VB_H}
          fill={`url(#${dotId})`}
          mask={`url(#${fallId}-m)`}
          opacity={lit ? 0.16 : 0.1}
        />
      ) : null}

      <rect x="0" y="0" width={VB_W} height={VB_H} fill={`url(#${vignetteId})`} />
    </svg>
  );
}
