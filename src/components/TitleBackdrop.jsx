import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from './ToastProvider.jsx';

/**
 * Shared full-bleed "environment scene" for opening-sequence beats 2 and 3
 * (spec section 4.1) — TitleReveal.jsx and MainMenu.jsx. Spec 4.1 is
 * explicit that beat 2 -> beat 3 is the menu fading in over the *same*
 * scene, not a cut to a new screen, so this is one component both files
 * mount rather than two copies that could drift apart.
 *
 * No commissioned/painted art exists yet (src/assets/title-art/ is empty
 * — see src/assets/CLAUDE.md). This is a code-only stand-in for that
 * scene. Composition notes, because they are the whole point of this
 * file and easy to undo by accident:
 *
 * - FOUR depth layers (hills -> far city -> mid city -> near city), each
 *   a separate parallax plane and each a LIGHTER-to-DARKER step toward
 *   camera, so the city reads as having depth rather than being one
 *   silhouette strip. Distance haze is what sells this, not detail.
 * - The skyline occupies roughly 70% of the frame height (tallest towers
 *   ~66% plus antennas). An earlier version filled only ~20%, which left
 *   a huge empty gradient above and read as a color swatch with shapes
 *   glued to the bottom edge.
 * - Buildings are hand-placed with deliberately mismatched widths,
 *   heights, setbacks, roof styles, water tanks and antennas, and they
 *   OVERLAP each other. A skyline built from evenly-spaced same-shape
 *   blocks reads as generated; irregularity and occlusion are what make
 *   it read as a place.
 * - Windows are a real grid per building (lit + unlit), with the lit ones
 *   given an actual blur-glow halo. A pale rect with no halo does not
 *   read as light — it reads as a gray square, which was the previous
 *   version's bug.
 *
 * Every layer's viewBox aspect ratio is matched to the aspect its
 * container actually gets at a typical desktop size, so
 * preserveAspectRatio="none" costs effectively no distortion there while
 * still degrading gracefully (a taller, narrower skyline) on mobile.
 *
 * Interactive touches, all optional decoration — a recruiter who never
 * moves the mouse sees a complete, readable title card, per spec's "no
 * forced interaction" rule:
 * - mouse-parallax depth across the four layers,
 * - click-spawned embers (beat 3 only, see `interactive` below),
 * - THE easter egg: one building in the near layer is completely dark
 *   except for a single lit window. Clicking it reveals a silhouette
 *   still at a desk up there and fires a memory toast. See SOLO_* below.
 *
 * Two things were tried here and deliberately CUT, so nobody re-adds them
 * thinking they were an oversight:
 * - A figure that walked edge-to-edge across the scene on a timer. A flat
 *   silhouette sliding across the frame reads as an amateur animated GIF
 *   pasted over the art, not as painted key art.
 * - Its replacement, a lone figure standing on a near rooftop. Better,
 *   but at the scale the near layer actually renders it was a ~30px
 *   smudge nobody could find, so its interactivity may as well not have
 *   existed. The lit window does the same "someone is out there" job
 *   using the scene's own vocabulary, at a size that reads.
 * - A 3-clicks-any-window -> shooting star easter egg. Replaced by the
 *   solo window: one findable, meaningful secret beats a hidden combo
 *   nobody discovers, and the solo window telegraphs itself (it is the
 *   only light on an otherwise black building) without needing a hint.
 *
 * Everything animated is gated on the `reducedMotion` prop — under it
 * embers never spawn, fog and window flicker are frozen, and the easter
 * egg still WORKS (it is content, not motion) but reveals instantly.
 *
 * Pointer tracking is on `window`, not on this component's own div, and
 * that is load-bearing rather than lazy: MainMenu.jsx renders a full-
 * height `<nav>` as a SIBLING on top of this backdrop, so pointer events
 * over the menu never reach a handler attached here. With the handler on
 * the element, parallax worked on beat 2 (where nothing covers the
 * scene) and silently died on beat 3 — which is exactly the bug this
 * addresses. Same reasoning for the ember click listener.
 *
 * `interactive` gates ONLY click-to-spawn-embers. TitleReveal.jsx (beat
 * 2) leaves it false because beat 2's entire screen is a click-anywhere-
 * to-skip button. Nothing in this file calls stopPropagation, on purpose:
 * an impatient click on a window during beat 2 must still bubble up and
 * skip the beat.
 *
 * When real art lands in src/assets/title-art/, retire this component
 * outright (do not layer it under a photo) and point TITLE_ART_URL in
 * the two callers at the asset.
 */

const EMBER_MAX = 24;

/*
  The easter-egg window. Which building carries it is decided by the
  `solo: true` flag on a near-layer entry below (not by a coordinate
  duplicated up here, which would silently point at the wrong building
  the first time the skyline is reordered). That building renders with
  every one of its windows dark except this pane, which is what makes
  the single light findable without any hint text. It is drawn larger
  than a normal window (vs the near layer's 10x13) both to be a viable
  click target and to read as "the one room still on".
*/
const SOLO_W = 17;
const SOLO_H = 21;

// Deterministic pseudo-random, same approach as Panel.jsx's seededJitter:
// window layouts must not reshuffle on every re-render.
function seeded(n) {
  const x = Math.sin(n) * 10000;
  return x - Math.floor(x);
}

/*
  Layer geometry. `h` is the container height as a % of the viewport;
  `vb` is the viewBox height. viewBox width is always 1600, so the
  viewBox aspect (1600/vb) is tuned to match the container's real aspect
  on a typical desktop (~2.5:1 for the far layer at 70vh) — see the note
  at the top about preserveAspectRatio="none".

  Buildings are listed with `x` (left), `w` (width), `h` (height above
  the layer baseline), and optional `setback` (a narrower block stacked
  on top), `tank` (rooftop water tower), `antenna` (mast height), and
  `roof: 'peak'`.
*/
const LAYERS = {
  far: {
    heightPct: 70,
    vb: 640,
    parallax: 5,
    fill: 'color-mix(in oklab, var(--ink) 52%, var(--dusk))',
    windowSpec: { ww: 6, wh: 8, gx: 16, gy: 20, litRate: 0.1, litOpacity: 0.5 },
    buildings: [
      { x: -20, w: 110, h: 240 },
      { x: 80, w: 80, h: 360, setback: 46 },
      { x: 150, w: 120, h: 280 },
      { x: 255, w: 70, h: 480, antenna: 22 },
      { x: 315, w: 130, h: 320, setback: 60 },
      { x: 430, w: 90, h: 600, antenna: 30 },
      { x: 512, w: 110, h: 400 },
      { x: 610, w: 80, h: 280, roof: 'peak' },
      { x: 678, w: 140, h: 460, setback: 70 },
      { x: 806, w: 95, h: 340 },
      { x: 890, w: 120, h: 590, antenna: 26 },
      { x: 998, w: 80, h: 390 },
      { x: 1066, w: 130, h: 290 },
      { x: 1184, w: 95, h: 500, setback: 52 },
      { x: 1268, w: 110, h: 350 },
      { x: 1366, w: 75, h: 440, antenna: 18 },
      { x: 1430, w: 140, h: 280 },
      { x: 1558, w: 90, h: 480 },
    ],
  },
  mid: {
    heightPct: 46,
    vb: 420,
    parallax: 9,
    fill: 'color-mix(in oklab, var(--ink) 80%, var(--dusk))',
    windowSpec: { ww: 8, wh: 11, gx: 21, gy: 26, litRate: 0.16, litOpacity: 0.85 },
    buildings: [
      { x: -30, w: 170, h: 180 },
      { x: 130, w: 100, h: 280, setback: 56 },
      { x: 220, w: 140, h: 150 },
      { x: 350, w: 80, h: 350, antenna: 20 },
      { x: 420, w: 150, h: 220 },
      { x: 560, w: 110, h: 140, roof: 'peak' },
      { x: 660, w: 130, h: 300, tank: true },
      { x: 780, w: 90, h: 180 },
      { x: 860, w: 170, h: 250, setback: 84 },
      { x: 1020, w: 100, h: 160 },
      { x: 1110, w: 120, h: 330, antenna: 18 },
      { x: 1220, w: 140, h: 200 },
      { x: 1350, w: 90, h: 140, roof: 'peak' },
      { x: 1430, w: 160, h: 280, tank: true },
      { x: 1580, w: 110, h: 170 },
    ],
  },
  near: {
    heightPct: 26,
    vb: 240,
    parallax: 14,
    fill: 'var(--ink)',
    windowSpec: { ww: 10, wh: 13, gx: 26, gy: 32, litRate: 0.14, litOpacity: 1 },
    buildings: [
      { x: -40, w: 240, h: 140, tank: true },
      { x: 190, w: 170, h: 100 },
      { x: 350, w: 210, h: 180, tank: true, antenna: 24 },
      { x: 550, w: 160, h: 110, roof: 'peak' },
      // `solo`: every window on this one is dark except the easter-egg
      // pane. Keep it centre-ish and unobstructed by its neighbours.
      { x: 700, w: 250, h: 160, solo: true },
      { x: 940, w: 180, h: 120, tank: true },
      { x: 1110, w: 220, h: 190, antenna: 20 },
      { x: 1320, w: 170, h: 110 },
      { x: 1480, w: 240, h: 170, tank: true },
    ],
  },
};

function windowsFor(building, baseline, spec, seedBase) {
  const { ww, wh, gx, gy, litRate } = spec;
  const bodyTop = baseline - building.h;
  const left = building.x + 10;
  const right = building.x + building.w - 10;
  const top = bodyTop + 16;
  const bottom = baseline - 8;
  const out = [];
  let i = 0;
  for (let y = top; y + wh <= bottom; y += gy) {
    for (let x = left; x + ww <= right; x += gx) {
      const r = seeded(seedBase + i * 7.31 + x * 0.13 + y * 0.29);
      i += 1;
      // Lit windows are the minority; a band of "visible but dark" panes
      // gives the facade texture so it isn't a featureless block.
      if (r < litRate) out.push({ x, y, lit: true, key: `${x}-${y}` });
      else if (r < litRate + 0.3) out.push({ x, y, lit: false, key: `${x}-${y}` });
    }
  }
  return out;
}

function BuildingShape({ b, baseline, fill }) {
  const bodyTop = baseline - b.h;
  const parts = [];

  if (b.roof === 'peak') {
    const peak = Math.min(28, b.w * 0.35);
    parts.push(
      <polygon
        key="peak"
        points={`${b.x},${bodyTop + peak} ${b.x + b.w / 2},${bodyTop} ${b.x + b.w},${bodyTop + peak}`}
        fill={fill}
      />,
      <rect key="body" x={b.x} y={bodyTop + peak} width={b.w} height={b.h - peak} fill={fill} />,
    );
  } else {
    parts.push(<rect key="body" x={b.x} y={bodyTop} width={b.w} height={b.h} fill={fill} />);
  }

  if (b.setback) {
    const sw = b.setback;
    parts.push(
      <rect key="setback" x={b.x + (b.w - sw) / 2} y={bodyTop - 34} width={sw} height={34} fill={fill} />,
    );
  }

  if (b.tank) {
    const tx = b.x + b.w * 0.62;
    parts.push(
      <g key="tank" fill={fill}>
        <rect x={tx} y={bodyTop - 20} width={26} height={16} />
        <polygon points={`${tx - 3},${bodyTop - 20} ${tx + 13},${bodyTop - 28} ${tx + 29},${bodyTop - 20}`} />
        <rect x={tx + 3} y={bodyTop - 5} width={3} height={6} />
        <rect x={tx + 20} y={bodyTop - 5} width={3} height={6} />
      </g>,
    );
  }

  if (b.antenna) {
    const ax = b.x + b.w / 2;
    const antennaTop = bodyTop - (b.setback ? 34 : 0);
    parts.push(
      <g key="antenna" fill={fill}>
        <rect x={ax - 1.5} y={antennaTop - b.antenna} width={3} height={b.antenna} />
        <rect x={ax - 6} y={antennaTop - b.antenna * 0.55} width={12} height={2} />
      </g>,
    );
  }

  return <g>{parts}</g>;
}

/*
  The easter-egg pane's position: top-most row of the solo building, one
  column in from its right edge — a corner office on the top floor, which
  is both the most legible spot against the sky and the most "still up
  there at 3am" reading of the same shape.
*/
function soloWindowFor(building, baseline) {
  return {
    x: building.x + building.w - 10 - SOLO_W - 14,
    y: baseline - building.h + 18,
  };
}

function CityLayer({
  layer,
  layerKey,
  style,
  reducedMotion,
  soloFound,
  onSoloClick,
  interactiveWindows,
}) {
  const { vb, buildings, fill, windowSpec } = layer;
  const glowId = `window-glow-${layerKey}`;

  const lit = [];
  const dark = [];
  const soloBuilding = buildings.find((b) => b.solo);
  buildings.forEach((b, bi) => {
    windowsFor(b, vb, windowSpec, bi * 131.7).forEach((w) => {
      // The solo building is blacked out entirely — its only light is the
      // easter-egg pane, rendered separately below.
      if (b.solo) dark.push({ ...w, key: `${bi}-${w.key}` });
      else (w.lit ? lit : dark).push({ ...w, key: `${bi}-${w.key}` });
    });
  });
  const solo = soloBuilding ? soloWindowFor(soloBuilding, vb) : null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 w-full"
      style={{ height: `${layer.heightPct}%`, ...style }}
    >
      <svg viewBox={`0 0 1600 ${vb}`} preserveAspectRatio="none" className="h-full w-full">
        <defs>
          <filter id={glowId} x="-250%" y="-250%" width="600%" height="600%">
            <feGaussianBlur stdDeviation={windowSpec.ww * 0.9} />
          </filter>
        </defs>

        {buildings.map((b) => (
          <BuildingShape key={b.x} b={b} baseline={vb} fill={fill} />
        ))}

        {/* Unlit panes: barely-there texture so facades aren't blank slabs. */}
        <g fill="var(--bone)" opacity="0.06">
          {dark.map((w) => (
            <rect key={w.key} x={w.x} y={w.y} width={windowSpec.ww} height={windowSpec.wh} />
          ))}
        </g>

        {/* Lit panes render twice: a blurred halo (the actual "this is a
            light source" cue) and a crisp core on top of it. */}
        <g filter={`url(#${glowId})`} fill="var(--bone)" opacity={windowSpec.litOpacity * 0.55}>
          {lit.map((w) => (
            <rect key={w.key} x={w.x} y={w.y} width={windowSpec.ww} height={windowSpec.wh} />
          ))}
        </g>
        <g fill="var(--bone)">
          {lit.map((w, i) => (
            <rect
              key={w.key}
              x={w.x}
              y={w.y}
              width={windowSpec.ww}
              height={windowSpec.wh}
              opacity={windowSpec.litOpacity}
              style={{
                animation: reducedMotion ? undefined : `window-flicker ${5 + (i % 4)}s ease-in-out infinite`,
                animationDelay: reducedMotion ? undefined : `${(i * 0.7) % 6}s`,
              }}
            />
          ))}
        </g>

        {/* The easter egg. Halo + core like every other lit pane, but
            bigger, steadier (it breathes rather than flickers — someone
            is working, not a stairwell light), and clickable. */}
        {solo ? (
          <g>
            <rect
              x={solo.x}
              y={solo.y}
              width={SOLO_W}
              height={SOLO_H}
              fill="var(--bone)"
              opacity={soloFound ? 0.75 : 0.5}
              filter={`url(#${glowId})`}
              style={{
                animation: reducedMotion ? undefined : 'solo-glow 5.5s ease-in-out infinite',
              }}
            />
            <rect x={solo.x} y={solo.y} width={SOLO_W} height={SOLO_H} fill="var(--bone)" />

            {/* Revealed on click: someone at a desk, seen from outside —
                head, shoulders, and the lit slab of a monitor. */}
            {soloFound ? (
              <g fill="var(--ink)">
                <circle cx={solo.x + SOLO_W * 0.42} cy={solo.y + SOLO_H * 0.34} r={SOLO_W * 0.16} />
                <path
                  d={`M${solo.x + SOLO_W * 0.2},${solo.y + SOLO_H * 0.72}
                      q${SOLO_W * 0.22},${-SOLO_H * 0.24} ${SOLO_W * 0.44},0 Z`}
                />
                <rect
                  x={solo.x + SOLO_W * 0.66}
                  y={solo.y + SOLO_H * 0.44}
                  width={SOLO_W * 0.2}
                  height={SOLO_H * 0.26}
                />
              </g>
            ) : null}

            {/* Hit target, generously oversized — the pane itself is ~17
                user units, which is only a handful of real pixels once the
                near layer is scaled down. */}
            <rect
              x={solo.x - 12}
              y={solo.y - 12}
              width={SOLO_W + 24}
              height={SOLO_H + 24}
              fill="transparent"
              style={{
                pointerEvents: interactiveWindows ? 'auto' : 'none',
                cursor: interactiveWindows ? 'pointer' : undefined,
              }}
              onClick={interactiveWindows ? onSoloClick : undefined}
            />
          </g>
        ) : null}
      </svg>
    </div>
  );
}

export default function TitleBackdrop({
  reducedMotion = false,
  interactive = false,
  variant = 'title',
}) {
  /*
    `distant` is ChapterSelect.jsx's mode: the same city, further back.
    Three differences, and all three are doing a job:

    - The NEAR layer is not rendered. That is the design (on /chapters
      you are looking at the skyline from further away, and the screen's
      own content occupies the foreground the near layer would fight),
      and it is also two thirds of this component's ~1,450 <rect>s gone,
      which matters because the route dolly in PageTransition.jsx has to
      zoom whichever screen is incoming. Dropping the near layer also
      drops the easter-egg window, which is correct — that secret belongs
      to the title screen, and duplicating it here would cheapen it.
    - No pointer parallax, so no window-level pointermove listener at
      all. A backdrop that leans around behind a screen you are trying
      to read is distraction, not depth.
    - A heavier scrim on top, since real content sits over this rather
      than a title card with its own scrim.
  */
  const distant = variant === 'distant';
  const containerRef = useRef(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [soloFound, setSoloFound] = useState(false);

  const [embers, setEmbers] = useState([]);
  const emberSeqRef = useRef(0);

  const { showToast } = useToast();

  /*
    Pointer tracking lives on `window`, not on this component's own div.
    MainMenu.jsx stacks a full-height <nav> over this backdrop as a
    sibling, so an element-level handler here never sees pointer events
    once the menu is up — parallax worked on beat 2 and silently died on
    beat 3. A window listener sees the move wherever it happens and we
    resolve it against our own rect.
  */
  useEffect(() => {
    if (reducedMotion || distant) return undefined;
    const onMove = (event) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect?.width || !rect?.height) return;
      setPointer({
        x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
        y: ((event.clientY - rect.top) / rect.height) * 2 - 1,
      });
    };
    const onLeave = () => setPointer({ x: 0, y: 0 });
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, [reducedMotion, distant]);

  const parallax = (strength) =>
    reducedMotion || distant
      ? undefined
      : { transform: `translate3d(${pointer.x * strength}px, ${pointer.y * strength * 0.5}px, 0)` };

  const spawnEmbers = useCallback((clientX, clientY) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect?.width || !rect?.height) return;
    const originX = ((clientX - rect.left) / rect.width) * 100;
    const originY = ((clientY - rect.top) / rect.height) * 100;
    const burst = Array.from({ length: 4 }, (_, i) => ({
      id: emberSeqRef.current++,
      x: originX,
      y: originY,
      dx: (seeded(emberSeqRef.current + i * 3.7) - 0.5) * 36,
      duration: Math.round(800 + seeded(emberSeqRef.current + i * 9.1) * 300),
      size: 2 + seeded(emberSeqRef.current + i * 5.3) * 2,
    }));
    setEmbers((prev) => [...prev, ...burst].slice(-EMBER_MAX));
    burst.forEach((ember) => {
      setTimeout(() => setEmbers((prev) => prev.filter((e) => e.id !== ember.id)), ember.duration + 50);
    });
  }, []);

  /*
    Ember clicks are also a window listener, for the same reason parallax
    is (see above) — clicks on beat 3 land on the <nav> stacked over this
    component. Real controls are excluded so choosing a menu item isn't
    also a firework; everything else in the frame is fair game.
  */
  useEffect(() => {
    if (!interactive || reducedMotion || distant) return undefined;
    const onClick = (event) => {
      if (event.target.closest?.('button, a, [role="button"]')) return;
      spawnEmbers(event.clientX, event.clientY);
    };
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, [interactive, reducedMotion, distant, spawnEmbers]);

  /*
    The easter egg fires regardless of reduced motion — it is content, not
    decoration. Under reduced motion the reveal simply appears rather than
    glowing into place.

    The toast fires on EVERY click, not just the first — an earlier
    version gated it behind `soloFound` so re-clicking did nothing, which
    read as broken rather than restrained (the visual reveal is the only
    thing that's genuinely one-time; the notification isn't). Repeat
    clicks cycle through toastVariants' `lateNightWindow` pool via the
    session counter already inside showToast(), so it doesn't repeat the
    exact same line every time either.
  */
  const handleSoloClick = useCallback(() => {
    setSoloFound(true);
    showToast('lateNightWindow');
  }, [showToast]);

  return (
    <div ref={containerRef} aria-hidden="true" className="absolute inset-0 overflow-hidden">
      {/* Sky: cool dusk up top sinking into warm dark toward the horizon. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-dusk via-shadow to-ink" />

      {/* Horizon haze — the warm glow the whole skyline is backlit by. */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%]"
        style={{
          background:
            'radial-gradient(130% 100% at 50% 100%, color-mix(in oklab, var(--bone) 20%, transparent) 0%, transparent 72%)',
          ...parallax(2),
        }}
      />

      {/* Hills — the back wall of the scene, soft bezier curves so the
          silhouette isn't all right angles. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] w-full" style={parallax(3)}>
        <svg viewBox="0 0 1600 340" preserveAspectRatio="none" className="h-full w-full">
          <path
            d="M0,340 L0,210 C140,150 260,250 400,190 C540,130 640,220 780,175 C920,130 1030,215 1170,170 C1300,128 1420,200 1600,165 L1600,340 Z"
            fill="color-mix(in oklab, var(--ink) 34%, var(--dusk))"
          />
        </svg>
      </div>

      <CityLayer
        layer={LAYERS.far}
        layerKey="far"
        style={parallax(LAYERS.far.parallax)}
        reducedMotion={reducedMotion}
        interactiveWindows={false}
      />

      {/* Distance haze between the far and mid cities — this band is what
          makes the far towers read as "further away" instead of just
          "shorter". Sits between the two layers on purpose. */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[46%]"
        style={{
          background:
            'linear-gradient(to top, transparent 0%, color-mix(in oklab, var(--dusk) 42%, transparent) 55%, transparent 100%)',
        }}
      />

      <CityLayer
        layer={LAYERS.mid}
        layerKey="mid"
        style={parallax(LAYERS.mid.parallax)}
        reducedMotion={reducedMotion}
      />

      {/* Drifting fog, sitting low across the mid/near city rooftops. */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-[20%] h-[12%] opacity-[0.13] blur-[3px]"
        style={{
          background: 'linear-gradient(90deg, transparent, var(--bone), transparent)',
          animation: reducedMotion ? undefined : 'fog-drift 26s ease-in-out infinite alternate',
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-[9%] h-[10%] opacity-[0.1] blur-[4px]"
        style={{
          background: 'linear-gradient(90deg, transparent, var(--bone), transparent)',
          animation: reducedMotion ? undefined : 'fog-drift 34s ease-in-out infinite alternate-reverse',
        }}
      />

      {/* `interactiveWindows` is gated on `interactive` (i.e. beat 3 only)
          for the same reason embers are: during beat 2 every click skips
          the beat, so a click that happened to land on the easter-egg
          window would fire it and its toast on the way out — the reveal
          would land on a screen the visitor has already left. On the menu
          they can actually stop and look at it. */}
      {distant ? null : (
        <CityLayer
          layer={LAYERS.near}
          layerKey="near"
          style={parallax(LAYERS.near.parallax)}
          reducedMotion={reducedMotion}
          interactiveWindows={interactive}
          soloFound={soloFound}
          onSoloClick={handleSoloClick}
        />
      )}

      <div className="texture-halftone pointer-events-none absolute inset-0" />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: distant
            ? 'radial-gradient(120% 90% at 50% 40%, color-mix(in oklab, var(--ink) 44%, transparent) 0%, color-mix(in oklab, var(--ink) 82%, transparent) 100%)'
            : 'radial-gradient(120% 90% at 50% 40%, transparent 42%, color-mix(in oklab, var(--ink) 58%, transparent) 100%)',
        }}
      />

      {embers.map((ember) => (
        <span
          key={ember.id}
          className="pointer-events-none absolute rounded-full bg-bone"
          style={{
            left: `${ember.x}%`,
            top: `${ember.y}%`,
            width: ember.size,
            height: ember.size,
            '--ember-dx': `${ember.dx}px`,
            animation: `ember-rise ${ember.duration}ms ease-out forwards`,
          }}
        />
      ))}
    </div>
  );
}
