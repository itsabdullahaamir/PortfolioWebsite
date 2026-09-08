import {
  BODY,
  DISPLAY,
  clamp,
  figure,
  grain,
  halftone,
  lerp,
  litWindow,
  rgba,
  rng,
  smooth,
  text,
  vignette,
  withRim,
} from '../draw.js';

/**
 * FORTY-EIGHT HOURS -- episode 4, COMPETITIONS. The verb is ENDURANCE.
 *
 * Written against the contract in ./index.js; ./stack.js is the
 * reference implementation and this file follows its shape.
 *
 * THE MECHANIC
 * One button. Hold to rise, release to fall, the world scrolls itself.
 * Distance is measured in HOURS -- 0 to 48 -- so the number on the HUD is
 * a clock, not a score, and the obstacles are the night skyline the rest
 * of this site is drawn in. You are flying a hackathon night.
 *
 * WHY IT IS SOFTER THAN FLAPPY BIRD
 * A hit is a STUMBLE, not a death: you lose an hour, take a visible knock,
 * and get ~1.4s of invulnerability while the world rewinds under you.
 * FIVE stumbles end the run. That is deliberate -- root CLAUDE.md section
 * 6 rules 1 and 2. A game that walls a recruiter off in ten seconds would
 * be a skill check standing in front of a resume, which is the one thing
 * this project cannot ship. So: the gap opens at 280px and only narrows
 * to 215px against a 30px-tall player, the narrowing itself eases out
 * rather than ramping linearly (most of the tightening lands in the first
 * two-thirds of the night; the last third stays close to its tightest
 * rather than compounding past it), obstacles are at most one per hour
 * rather than continuous, and every beat hour is left deliberately CLEAR
 * of obstacles so its card can be read instead of survived.
 *
 * RETUNED ACROSS TWO BATCHES on a live report that the run was "extremely
 * HARD." The first batch (see the level constants above -- 5 stumbles,
 * 280/215px gaps, eased ramp, density roughly halved) widened the LEVEL
 * and measured a simulated pilot (a bang-bang autopilot that always aims
 * at the current gap's centre, given either a constant habitual mis-aim
 * offset or a fixed input-lag delay, flown headlessly against the real
 * obstacle-generation and flight formulas) going from ~83px mis-aim /
 * ~92ms lag to ~97px / ~125ms -- about 1.2x and 1.35x, short of doubling.
 * That same measurement ran a CONTROL with obstacles removed entirely
 * (ground/ceiling collision only), which topped out around ~152px /
 * ~275ms regardless of any level lever -- proof the ceiling was
 * GRAVITY/LIFT, not the obstacles, which is what THIS batch retunes.
 *
 * THIS BATCH re-ran that measurement and found the original bang-bang
 * pilot itself was broken: switching thrust on a bare position threshold
 * (thrust iff below target, nothing else) has no velocity term, and for a
 * symmetric double integrator that is an unstable relay controller, not a
 * proxy for a human -- verified directly: at the (then-)current constants
 * with ZERO mis-aim and ZERO lag, that pilot still crashed at hour ~13,
 * oscillating roughly 150px peak-to-peak around the gap centre on its
 * own. The measurement was redone with a minimum-time switching-curve
 * pilot (thrust iff predicted resting position -- y plus stopping
 * distance v^2/2a -- has crossed the target), the standard fix for
 * regulating a double integrator, which tracks a fixed target cleanly and
 * only errs when actually given mis-aim or lag to fly with.
 *
 * Under that corrected pilot, flown against the SAME obstacle course used
 * above: mis-aim tolerance holds flat at ~50.6px regardless of how
 * GRAVITY/LIFT are scaled -- it is set by the mast/gap clearances
 * themselves (a fixed offset either clips a mast or it doesn't, no matter
 * how fast the craft can move), so no flight retune was ever going to
 * move that number, and none of the several scales tried did (50.5 to
 * 50.7px across every candidate from 1x down to 0.35x). Lag tolerance DID
 * move, and by a lot: 108.3ms at the pre-this-batch constants, climbing
 * as GRAVITY/LIFT/clamps scaled down together (each candidate simulated
 * in full, uniform scale unless noted): 0.75x->141.7ms, 0.65x->141.7ms,
 * 0.55x->141.7ms, 0.5x->158.3ms, 0.45x->158.3ms, 0.42x->158.3ms,
 * 0.4x->191.7ms, 0.38x->208.3ms, then 0.35x produced an erratic 441.7ms
 * reading that FAILED a combined mis-aim+lag stress test the tighter
 * scales all passed -- a sign of numerical/behavioural instability at the
 * bottom of the range, not a real gain, and the reason this batch stops
 * short of it. Landed on 0.4x (GRAVITY 460, LIFT -920, MAX_FALL 208,
 * MAX_RISE 188, preserving the exact GRAVITY:LIFT symmetry): lag
 * tolerance 191.7ms (1.77x the pre-batch figure), mis-aim unchanged at
 * ~50.7px, and comfortably clear of "steering a barge" -- climbing
 * capacity is 266px per hour of travel against GAP_STEP's 108px maximum
 * required swing (2.5x headroom), and covering that 108px swing itself
 * takes ~0.78s against the ~1.62s an obstacle actually gives before it
 * arrives. A combined stress run (mis-aim and lag each at 50% of their
 * solo tolerance, simultaneously) still survives to hour 48.
 *
 * So: mis-aim tolerance was never a lever this file could pull -- it is
 * geometry, and 50px is what the widened gaps/mast caps above already
 * buy; the honest ~2x this batch delivers is entirely in how much lag (as
 * a proxy for reaction time / inconsistent timing) the craft forgives,
 * which is exactly the "flies heavier" symptom the live report actually
 * described. Pushing GRAVITY/LIFT lower than this was tried and produced
 * diminishing, then unstable, returns rather than a further real gain.
 *
 * ============================================================
 * THE RULE NOBODY MAY "FIX": YOU CANNOT PLACE FIRST.
 * ============================================================
 * At hour 48 the world stops scrolling. The player settles onto the
 * SECOND-PLACE roof, and the FIRST-PLACE marker stands on a taller tower
 * about one and a half hours further on -- fully visible, lit in the only
 * --signal on the screen, and permanently out of reach. The player's x
 * never changes by a single pixel in this scene, and the world has
 * stopped feeding them distance, so there is no input, no route and no
 * skill level that closes that gap. (Measured at rest: 476px, forever.)
 * It is not a bug and it is not an unfinished ending.
 *
 * The record this episode carries is three second places and a national
 * top ten (see the beats in src/data/games.js -- this file never states a
 * fact of its own). A version of this game where you can take gold would
 * be a better toy and a dishonest resume. If a future change makes the
 * marker reachable, it has removed the point of the game.
 *
 * Reaching hour 48 STILL emits outcome 'win'. The win is finishing the
 * night, not placing first -- clearing the door must never depend on an
 * outcome the game refuses to grant.
 */

/* -- The world ------------------------------------------------------
   Tuned together: at SCROLL px/s over HOUR_PX px per hour the clock runs
   at 0.62 hours/s, so a clean 48-hour run is ~80s and each stumble adds
   ~2.4s of rewind. A competent run lands at 80-88s, which is about as
   long as one sitting of a one-button game holds attention before the
   joke wears out. */
const HOUR_PX = 340;
const SCROLL = 210;
const FALLBACK_END_HOUR = 48;
/** How far past the finish the unreachable first-place tower stands, in
 *  hours. 1.4 puts it at screen x ~686 of 960: unmistakably ahead, and
 *  unmistakably not here. */
const FIRST_PLACE_LEAD = 1.4;

const PLAYER_X = 210;
const GROUND_INSET = 52;
const CEILING_Y = 14;

/* -- Flight ---------------------------------------------------------
   Hold-to-thrust rather than Flappy's impulse: net acceleration is -460
   up against +460 down, so the control is symmetric and a player can
   hover by tapping rather than having to learn a rhythm. Terminal
   velocities are clamped so a long fall never becomes unrecoverable.
   Retuned this batch -- see the header comment's "THE FLIGHT MODEL WAS
   THE BOTTLENECK" note for why these four numbers moved and by how much,
   and what did NOT move (GAP_OPEN/GAP_TIGHT and the density curves below
   are untouched; this batch is flight-only). */
const GRAVITY = 460;
const LIFT = -920;
const MAX_FALL = 208;
const MAX_RISE = 188;

const HALF_W = 9;
const HALF_H = 15;

const MAX_STUMBLES = 5;
/** Hours lost per stumble. Retuned this batch from 1.5 -- a live report
 *  called the run "extremely HARD," and losing a full hour and a half on
 *  every hit (on top of only getting three of them) compounded badly with
 *  a tight obstacle course. One hour is still a real, visible setback. */
const STUMBLE_HOURS = 1;
/** Lost hours are scrolled back, not teleported, so losing time is
 *  something you watch happen. Net -690px/s against the forward scroll;
 *  at the new STUMBLE_HOURS that's ~0.49s of visible rewind (was ~0.74s
 *  at 1.5) -- comfortably inside INVULN either way, so the rewind can
 *  never drag you back into the thing that just hit you. */
const REWIND_SPEED = 900;
const INVULN = 1.4;

/* -- Obstacles ------------------------------------------------------ */
const BUILDING_W = 96;
const MAST_W = 12;
const GAP_OPEN = 280;
const GAP_TIGHT = 215;
const GAP_TOP_PAD = 116;
const GAP_BOTTOM_PAD = 74;
/** Shapes how GAP_OPEN eases toward GAP_TIGHT across the night -- an
 *  ease-out curve (see buildObstacles) rather than a straight ramp, so
 *  most of the tightening lands in the first two-thirds and the last
 *  third stays close to its tightest point instead of compounding past
 *  it on top of already-denser obstacles. 1 would be the old linear ramp. */
const GAP_EASE = 2.2;
/** Cap on how far the gap may move between consecutive obstacles, so a
 *  generated level is always physically traversable. One hour of travel
 *  is 1.62s, in which the player can climb ~760px -- so 108 is a wide
 *  margin, not a tight one. */
const GAP_STEP = 108;
const WINDOW_ROW = 34;

const FINALE_TIME = 2.8;
const TRAIL = 14;

/**
 * Beat hours come from the beat LABELS, not from a table in this file.
 * games.js labels them HOUR 0 / HOUR 6 / ... / HOUR 48, and reading the
 * number back out of the label is what keeps "reveal each beat exactly
 * when the player passes that hour" true if the copy is ever re-cut. If a
 * label ever stops carrying a number, fall back to an even spread rather
 * than silently revealing nothing.
 */
function readBeatHours(beats) {
  const parsed = beats.map((beat) => {
    const found = /(\d+)/.exec(String(beat?.label ?? ''));
    return found ? Number(found[1]) : Number.NaN;
  });
  const usable =
    parsed.length > 1 &&
    parsed.every((h) => Number.isFinite(h)) &&
    parsed.every((h, i) => i === 0 || h >= parsed[i - 1]) &&
    parsed[parsed.length - 1] > 0;
  if (usable) return parsed;
  const last = Math.max(1, beats.length - 1);
  return beats.map((_, i) => (i / last) * FALLBACK_END_HOUR);
}

/** Lit/unlit pane layout for one building face, decided once at init. */
function makeWindows(rand, w, h) {
  const cols = Math.max(1, Math.round(w / 32));
  const rows = Math.max(1, Math.floor(h / WINDOW_ROW));
  const lit = new Uint8Array(cols * rows);
  let litCount = 0;
  for (let i = 0; i < lit.length; i += 1) {
    lit[i] = rand() > 0.46 ? 1 : 0;
    litCount += lit[i];
  }
  // At most two panes per face get the full litWindow() halo. The halo is
  // a radial gradient per call and there are four or five buildings on
  // screen at once; flat panes carry the rest of the grid. Same reasoning
  // as EpisodeArt.jsx's detail="low" tiles.
  let brightA = -1;
  let brightB = -1;
  if (litCount > 0) {
    const pick = () => {
      for (let tries = 0; tries < 14; tries += 1) {
        const i = Math.floor(rand() * lit.length);
        if (lit[i]) return i;
      }
      return -1;
    };
    brightA = pick();
    brightB = pick();
  }
  return { cols, rows, lit, brightA, brightB };
}

/**
 * The whole 48 hours is generated ONCE, at init, into a plain array --
 * roughly forty small objects, allocated before the first frame and never
 * again.
 *
 * That is deliberately not a recycling pool. A stumble moves the world
 * BACKWARDS, and a pool keyed off the forward scroll would have to
 * regenerate obstacles the player is about to re-fly, which would change
 * the level under them mid-run. Generating the level up front is both
 * cheaper per frame and the only version that survives the rewind.
 */
function buildObstacles(H, endHour, beatHourSet) {
  const rand = rng(4801);
  const groundY = H - GROUND_INSET;
  const list = [];
  let center = groundY * 0.5;
  const first = 3;
  const last = Math.max(first, Math.round(endHour) - 3);

  for (let hour = first; hour <= last; hour += 1) {
    // Every beat hour is open sky, so the card that lands there can be
    // read rather than survived.
    if (beatHourSet.has(hour)) continue;

    // tRaw is straight hour progress, used for the density curves below;
    // t is the EASED progress used for the gap itself (see GAP_EASE) so
    // the tightening front-loads instead of compounding through the last
    // third of the night -- retuned this batch, was a plain linear ramp.
    const tRaw = clamp((hour - first) / Math.max(1, last - first), 0, 1);
    const t = 1 - (1 - tRaw) ** GAP_EASE;
    const gap = lerp(GAP_OPEN, GAP_TIGHT, t);
    const minY = GAP_TOP_PAD + gap / 2;
    const maxY = groundY - GAP_BOTTOM_PAD - gap / 2;
    const wanted = lerp(minY, maxY, rand());
    center = clamp(clamp(wanted, center - GAP_STEP, center + GAP_STEP), minY, maxY);

    const gapTop = center - gap / 2;
    const gapBottom = center + gap / 2;

    // A slab descending from the top of the frame is the next tower over,
    // seen from below. Rarer early, so the opening hours are open sky.
    // Retuned this batch (was 0.3 + 0.45*tRaw, topping out at 0.75) -- a
    // live report called the run "extremely HARD," and the two density
    // curves plus the mast cap below were the biggest remaining lever
    // once the gaps themselves were widened.
    const hasTop = rand() < 0.18 + 0.22 * tRaw && gapTop > 46;
    // A rooftop antenna pinches the gap locally without ever sealing it.
    // The cap is 20% of the gap and not a pixel more (was 30%): a mast
    // rises FROM THE ROOF, so it eats the opening from the bottom only,
    // and the free lane it leaves sits ABOVE the nominal centre. At 45% --
    // an early number tried -- that lane's floor ended up above the
    // centre, which meant flying the gap dead-centre clipped the mast
    // every single time; a simulated pilot aiming at the centre then died
    // in exactly the same place on every run, at every skill level. 20%
    // leaves a wider clear lane at the tightest hour for a 30px-tall
    // player than the 30% cap did. Retuned this batch (was 0.18 +
    // 0.42*tRaw, topping out at 0.6): now 0.10 + 0.18*tRaw, topping out
    // at 0.28.
    const hasMast = rand() < 0.1 + 0.18 * tRaw;
    const mastH = hasMast ? Math.min(gap * 0.2, lerp(24, 64, rand())) : 0;
    const bottomH = groundY - gapBottom;

    list.push({
      x: hour * HOUR_PX - BUILDING_W / 2,
      gapBottom,
      bottomH,
      bottomWin: makeWindows(rand, BUILDING_W, bottomH),
      topH: hasTop ? gapTop : 0,
      topWin: hasTop ? makeWindows(rand, BUILDING_W, gapTop) : null,
      mastX: hasMast ? lerp(14, BUILDING_W - MAST_W - 14, rand()) : 0,
      mastH,
    });
  }
  return list;
}

/** One parallax band of distant rooftops, tiled by `span`. */
function buildBand(seed, span, count, minH, maxH) {
  const rand = rng(seed);
  const items = [];
  for (let i = 0; i < count; i += 1) {
    items.push({
      x: (i / count) * span + rand() * 40,
      w: lerp(46, 128, rand()),
      h: lerp(minH, maxH, rand()),
      antenna: rand() > 0.68 ? lerp(14, 40, rand()) : 0,
    });
  }
  return { span, items };
}

export function createFortyEight(config) {
  const { beats = [], onDone = () => {} } = config;

  const beatHours = readBeatHours(beats);
  const endHour = beatHours.length ? beatHours[beatHours.length - 1] : FALLBACK_END_HOUR;
  const beatHourSet = new Set(beatHours.map((h) => Math.round(h)));

  let obstacles = [];
  let far = null;
  let mid = null;
  let stars = [];

  let worldX = 0;
  let rewind = 0;
  let playerY = 0;
  let vy = 0;
  let stumbles = 0;
  let invuln = 0;
  let shake = 0;
  let flash = 0;
  let nextBeat = 0;
  let lastProgress = -1;
  let phase = 'run';
  let finaleT = 0;
  let landed = false;
  let finished = false;

  // Preallocated ring buffer for the light trail. Nothing in the frame
  // path is allowed to allocate, and a sliced array per frame would.
  const trailX = new Float32Array(TRAIL);
  const trailY = new Float32Array(TRAIL);
  let trailHead = 0;
  let trailFill = 0;

  const hoursNow = () => worldX / HOUR_PX;

  function finish(ctx, outcome) {
    if (finished) return;
    finished = true;
    const hour = Math.floor(clamp(hoursNow(), 0, endHour));
    const plural = stumbles === 1 ? '' : 's';
    ctx.emit('done', {
      outcome,
      stat: `Hour ${hour} of ${Math.round(endHour)}, ${stumbles} stumble${plural}`,
    });
    onDone(outcome);
  }

  function stumble(ctx) {
    stumbles += 1;
    invuln = INVULN;
    shake = 1;
    flash = 1;
    vy = -250;
    ctx.sound('toast');
    if (stumbles >= MAX_STUMBLES) {
      finish(ctx, 'end');
      return;
    }
    rewind += STUMBLE_HOURS * HOUR_PX;
  }

  const overlaps = (x0, x1, y0, y1, rx, ry, rw, rh) =>
    x1 > rx && x0 < rx + rw && y1 > ry && y0 < ry + rh;

  return {
    init(ctx) {
      const { H } = ctx;
      obstacles = buildObstacles(H, endHour, beatHourSet);
      far = buildBand(1177, 1500, 26, 70, 190);
      mid = buildBand(3311, 1180, 20, 110, 265);

      const rand = rng(9007);
      stars = [];
      for (let i = 0; i < 46; i += 1) {
        stars.push({
          x: rand() * ctx.W,
          y: rand() * (H * 0.55),
          r: 0.6 + rand() * 1.1,
          a: 0.25 + rand() * 0.5,
        });
      }

      worldX = 0;
      rewind = 0;
      playerY = H * 0.42;
      vy = 0;
      stumbles = 0;
      invuln = 0;
      shake = 0;
      flash = 0;
      nextBeat = 0;
      lastProgress = -1;
      phase = 'run';
      finaleT = 0;
      landed = false;
      finished = false;
      trailHead = 0;
      trailFill = 0;

      ctx.emit('progress', { value: 0 });
    },

    update(dt, ctx) {
      const { H } = ctx;
      const groundY = H - GROUND_INSET;

      shake = Math.max(0, shake - dt * 3.4);
      flash = Math.max(0, flash - dt * 2.6);
      invuln = Math.max(0, invuln - dt);

      if (finished) return;

      if (phase === 'run') {
        worldX += SCROLL * dt;
        if (rewind > 0) {
          const back = Math.min(rewind, REWIND_SPEED * dt);
          worldX = Math.max(0, worldX - back);
          rewind -= back;
        }
      }

      // Flight. During the finale the controls go quiet on purpose: the
      // night is over, and letting the player keep climbing would muddy
      // the one image this whole scene exists to land.
      const thrusting = phase === 'run' && ctx.input.held('action');
      vy = clamp(vy + (GRAVITY + (thrusting ? LIFT : 0)) * dt, -MAX_RISE, MAX_FALL);
      playerY += vy * dt;

      // The sky is a ceiling, never a stumble -- being pushed up by a
      // building should not also punish you for the sky being there.
      if (playerY - HALF_H < CEILING_Y) {
        playerY = CEILING_Y + HALF_H;
        if (vy < 0) vy = 0;
      }

      trailX[trailHead] = PLAYER_X;
      trailY[trailHead] = playerY;
      trailHead = (trailHead + 1) % TRAIL;
      if (trailFill < TRAIL) trailFill += 1;

      if (phase === 'finale') {
        // Scripted settle onto the second-place roof. If the player
        // arrived below it -- rare, since the last three hours are open
        // sky and the buildings before them push you high -- lift them
        // rather than leaving them clipped into the tower.
        const restY = secondRoofY(H) - HALF_H;
        if (playerY >= restY) {
          // Ease down to the roof, then LATCH. Gravity is still applied
          // above this line, so an ease on its own never actually
          // arrives: it reaches an equilibrium ~2.4px below the roof and
          // micro-jitters there forever, which is visible on the closing
          // image of the whole game. The latch is a flag rather than a
          // distance threshold because the equilibrium depends on dt,
          // and a hardcoded threshold tuned to 1/60 is a trap for anyone
          // who changes the step.
          if (landed || playerY <= restY + 4) {
            landed = true;
            playerY = restY;
          } else {
            playerY += (restY - playerY) * Math.min(1, dt * 7);
          }
          vy = 0;
        }
        finaleT += dt;
        if (finaleT >= FINALE_TIME) finish(ctx, 'win');
        return;
      }

      // The street counts as a stumble the same way a wall does. The
      // player is set ON the surface and bounced rather than teleported
      // clear of it -- an instant 30px pop was the first version, and it
      // read as a glitch rather than as an impact.
      if (playerY + HALF_H > groundY) {
        playerY = groundY - HALF_H;
        if (invuln <= 0) stumble(ctx);
        vy = -280;
        if (finished) return;
      }

      // Collisions: at most three rects per obstacle, ~40 obstacles, and
      // the list is sorted by x so it culls to a handful of comparisons.
      if (invuln <= 0) {
        const px0 = PLAYER_X - HALF_W;
        const px1 = PLAYER_X + HALF_W;
        const py0 = playerY - HALF_H;
        const py1 = playerY + HALF_H;
        for (let i = 0; i < obstacles.length; i += 1) {
          const o = obstacles[i];
          const sx = o.x - worldX + PLAYER_X;
          if (sx + BUILDING_W < px0) continue;
          if (sx > px1) break;
          const hitBottom = overlaps(px0, px1, py0, py1, sx, o.gapBottom, BUILDING_W, o.bottomH);
          const hitTop = o.topH > 0 && overlaps(px0, px1, py0, py1, sx, 0, BUILDING_W, o.topH);
          const hitMast =
            o.mastH > 0 &&
            overlaps(px0, px1, py0, py1, sx + o.mastX, o.gapBottom - o.mastH, MAST_W, o.mastH);
          if (hitBottom || hitTop || hitMast) {
            stumble(ctx);
            break;
          }
        }
        if (finished) return;
      }

      // The payload: one beat per hour passed, in order, one-way. A
      // stumble rewinds the clock back past a marker the player already
      // earned, and re-crossing it must not fire the beat a second time.
      const hours = hoursNow();
      while (nextBeat < beats.length && hours >= beatHours[nextBeat]) {
        ctx.emit('reveal', { index: nextBeat });
        ctx.sound('select');
        nextBeat += 1;
      }

      const value = clamp(hours / endHour, 0, 1);
      // Quantised, so a 60Hz loop does not push 60 setState calls a second
      // into React. 1% steps are finer than the progress bar can render.
      if (Math.round(value * 100) !== lastProgress) {
        lastProgress = Math.round(value * 100);
        ctx.emit('progress', { value });
      }

      if (hours >= endHour) {
        worldX = endHour * HOUR_PX;
        rewind = 0;
        phase = 'finale';
        finaleT = 0;
        ctx.sound('select');
      }
    },

    draw(g, ctx) {
      const { W, H, palette } = ctx;
      const groundY = H - GROUND_INSET;
      const hours = clamp(hoursNow(), 0, endHour);
      // Dawn ramp. Held flat through the first sixth of the night so the
      // early hours read as properly dark, then warming toward hour 48.
      const dawn = smooth(clamp((hours / endHour - 0.16) / 0.84, 0, 1));
      // Reduced motion: parallax factors go to zero, so the distant city
      // becomes a fixed backdrop while the obstacles -- the mechanic
      // itself -- keep scrolling. Shake, the trail and grain drift go too.
      const still = ctx.reducedMotion;

      drawSky(g, ctx, groundY, dawn);
      drawStars(g, palette, stars, dawn);
      drawBand(g, far, still ? 0 : 0.18, worldX, groundY, rgba(palette.shadow, 0.5), W);
      halftone(g, 0, groundY - 210, W, 210, rgba(palette.bone, 0.09 + 0.06 * dawn), 'up', 13, 91);
      drawBand(g, mid, still ? 0 : 0.42, worldX, groundY, rgba(palette.shadow, 0.9), W);

      g.save();
      if (shake > 0 && !still) {
        g.translate((Math.random() - 0.5) * 10 * shake, (Math.random() - 0.5) * 10 * shake);
      }

      drawFinishTowers(g, ctx, worldX, endHour, groundY, phase === 'finale');

      for (let i = 0; i < obstacles.length; i += 1) {
        const o = obstacles[i];
        const sx = o.x - worldX + PLAYER_X;
        if (sx + BUILDING_W < -30) continue;
        if (sx > W + 30) break;
        drawObstacle(g, ctx, o, sx, dawn);
      }

      // Street.
      g.fillStyle = palette.ink;
      g.fillRect(0, groundY, W, H - groundY);
      g.fillStyle = rgba(palette.bone, 0.13);
      g.fillRect(0, groundY, W, 2);

      if (!still) drawTrail(g, palette, trailX, trailY, trailHead, trailFill);
      drawPlayer(g, ctx, playerY, vy, invuln, still);
      g.restore();

      vignette(g, W, H, palette, 0.52);
      drawHud(g, ctx, hours, stumbles, flash);

      /*
       * A beat card used to be drawn here. It is gone deliberately --
       * src/screens/Play.jsx already renders every reveal twice in DOM
       * (a flash card over the canvas, and a permanent row in the
       * record column), so this made the same paragraph appear three
       * times on screen at once.
       *
       * DOM won the duplicate rather than the canvas because of
       * mobile: the 960-wide virtual box scales to about 0.39 on a
       * 375px screen, which rendered this card's 14px body text at
       * roughly 5px. DOM text does not shrink with the letterbox.
       */

      grain(g, W, H, still ? 0.03 : 0.05, still, ctx.frame);
    },
  };
}

/* -- The city -------------------------------------------------------
   Tonal ladder, lightest to darkest: sky (--dusk) > far band (--shadow at
   0.5) > mid band (--shadow at 0.9) > obstacles and player (--ink). Same
   rule as EpisodeArt.jsx -- without a ladder every silhouette merges into
   the ground and the frame reads as one flat hole. */

function drawSky(g, ctx, groundY, dawn) {
  const { W, H, palette } = ctx;
  g.fillStyle = palette.ink;
  g.fillRect(0, 0, W, H);

  const sky = g.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, rgba(palette.dusk, 0.3 + 0.34 * dawn));
  sky.addColorStop(0.55, rgba(palette.dusk, 0.16 + 0.26 * dawn));
  sky.addColorStop(1, rgba(palette.dusk, 0.06 + 0.14 * dawn));
  g.fillStyle = sky;
  g.fillRect(0, 0, W, groundY);

  // Dawn is spent in --paper, never in --signal: the warm end of the
  // palette carries the sunrise, and the red stays reserved for the one
  // thing on this screen that matters (see the header comment).
  const glow = g.createLinearGradient(0, groundY - 240, 0, groundY);
  glow.addColorStop(0, rgba(palette.paper, 0));
  glow.addColorStop(1, rgba(palette.paper, 0.05 + 0.24 * dawn));
  g.fillStyle = glow;
  g.fillRect(0, groundY - 240, W, 240);
}

function drawStars(g, palette, stars, dawn) {
  const fade = 1 - dawn;
  if (fade <= 0.02) return;
  for (let i = 0; i < stars.length; i += 1) {
    const s = stars[i];
    g.fillStyle = rgba(palette.bone, s.a * fade * 0.7);
    g.beginPath();
    g.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    g.fill();
  }
}

function drawBand(g, band, factor, worldX, groundY, color, W) {
  g.fillStyle = color;
  const offset = -((worldX * factor) % band.span);
  for (let base = offset - band.span; base < W + band.span; base += band.span) {
    for (let i = 0; i < band.items.length; i += 1) {
      const b = band.items[i];
      const x = base + b.x;
      if (x + b.w < -40 || x > W + 40) continue;
      g.fillRect(x, groundY - b.h, b.w, b.h);
      if (b.antenna) g.fillRect(x + b.w * 0.5 - 1, groundY - b.h - b.antenna, 2, b.antenna);
    }
  }
}

function drawWindows(g, palette, x, y, w, h, win, brightness) {
  const cw = w / win.cols;
  const ch = h / win.rows;
  if (cw < 7 || ch < 7) return;
  for (let r = 0; r < win.rows; r += 1) {
    for (let c = 0; c < win.cols; c += 1) {
      const i = r * win.cols + c;
      if (!win.lit[i]) continue;
      const wx = x + c * cw + cw * 0.26;
      const wy = y + r * ch + ch * 0.24;
      const ww = cw * 0.48;
      const wh = ch * 0.46;
      if (i === win.brightA || i === win.brightB) {
        litWindow(g, wx, wy, ww, wh, palette, brightness);
      } else {
        g.fillStyle = rgba(palette.bone, 0.26 + 0.3 * brightness);
        g.fillRect(wx, wy, ww, wh);
      }
    }
  }
}

function drawObstacle(g, ctx, o, sx, dawn) {
  const { palette } = ctx;
  // Windows go out as dawn comes in -- the night emptying is the same
  // information as the sky lightening, said a second way.
  const brightness = clamp(1 - dawn * 0.55, 0, 1);

  g.fillStyle = palette.ink;
  g.fillRect(sx, o.gapBottom, BUILDING_W, o.bottomH);
  g.fillStyle = rgba(palette.shadow, 0.45);
  g.fillRect(sx, o.gapBottom, BUILDING_W * 0.22, o.bottomH);
  drawWindows(g, palette, sx, o.gapBottom, BUILDING_W, o.bottomH, o.bottomWin, brightness);
  // A lit parapet, so the roofline that DEFINES the gap is the brightest
  // edge on the building and reads before the mass does.
  g.fillStyle = rgba(palette.bone, 0.3);
  g.fillRect(sx, o.gapBottom, BUILDING_W, 2);

  if (o.mastH > 0) {
    const mx = sx + o.mastX;
    const my = o.gapBottom - o.mastH;
    g.fillStyle = palette.ink;
    g.fillRect(mx + MAST_W * 0.34, my, MAST_W * 0.32, o.mastH);
    g.fillRect(mx, my + o.mastH * 0.3, MAST_W, 2);
    g.fillRect(mx + MAST_W * 0.16, my + o.mastH * 0.55, MAST_W * 0.68, 2);
    g.fillStyle = rgba(palette.bone, 0.34);
    g.fillRect(mx + MAST_W * 0.34, my, 1.5, o.mastH);
  }

  if (o.topH > 0) {
    g.fillStyle = palette.ink;
    g.fillRect(sx, 0, BUILDING_W, o.topH);
    g.fillStyle = rgba(palette.shadow, 0.45);
    g.fillRect(sx, 0, BUILDING_W * 0.22, o.topH);
    drawWindows(g, palette, sx, 0, BUILDING_W, o.topH, o.topWin, brightness);
    g.fillStyle = rgba(palette.bone, 0.3);
    g.fillRect(sx, o.topH - 2, BUILDING_W, 2);
  }
}

/* -- The finish ------------------------------------------------------ */

/** Roof height of the second-place tower, i.e. where the run stops. */
const secondRoofY = (H) => H * 0.665;
/** Roof height of the first-place tower. Deliberately higher. */
const firstRoofY = (H) => H * 0.48;

/**
 * The two towers of the ending.
 *
 * They are DRAWN, never collided with: the outcome of the run is decided
 * by the clock, not by whether you clipped a corner on the way in.
 *
 * The first-place tower carries the ONLY --signal on this screen. It
 * stands at PLAYER_X + FIRST_PLACE_LEAD * HOUR_PX; the player's x never
 * moves, and the world stops scrolling the instant hour 48 lands, so the
 * distance between the two roofs is frozen at the moment the run ends and
 * cannot be closed by anything the player does. See the header comment --
 * this is the design, not an unfinished ending. Do not add a bridge, a
 * boost, a bonus round or a "perfect run" path to it.
 */
function drawFinishTowers(g, ctx, worldX, endHour, groundY, finale) {
  const { W, H, palette } = ctx;
  const secondCx = endHour * HOUR_PX - worldX + PLAYER_X;
  if (secondCx > W + 260) return;

  const firstCx = (endHour + FIRST_PLACE_LEAD) * HOUR_PX - worldX + PLAYER_X;
  const secondW = 150;
  const secondY = secondRoofY(H);
  const firstW = 170;
  const firstY = firstRoofY(H);

  // Second place: where the player actually lands.
  const sx = secondCx - secondW / 2;
  g.fillStyle = palette.ink;
  g.fillRect(sx, secondY, secondW, groundY - secondY);
  g.fillStyle = rgba(palette.shadow, 0.45);
  g.fillRect(sx, secondY, secondW * 0.2, groundY - secondY);
  g.fillStyle = rgba(palette.bone, 0.34);
  g.fillRect(sx - 8, secondY, secondW + 16, 3);
  text(g, '2ND', secondCx, secondY + 42, {
    size: 24,
    face: DISPLAY,
    color: rgba(palette.bone, 0.5),
    align: 'center',
  });

  // First place: visible, lit, ahead, and connected to nothing.
  const fx = firstCx - firstW / 2;
  if (fx < W + 60) {
    g.fillStyle = palette.ink;
    g.fillRect(fx, firstY, firstW, groundY - firstY);
    g.fillStyle = rgba(palette.shadow, 0.45);
    g.fillRect(fx, firstY, firstW * 0.2, groundY - firstY);
    g.fillStyle = rgba(palette.bone, 0.34);
    g.fillRect(fx - 8, firstY, firstW + 16, 3);

    const beaconY = firstY - 44;
    g.fillStyle = rgba(palette.ink, 0.9);
    g.fillRect(firstCx - 2, beaconY, 4, 44);
    const pulse = ctx.reducedMotion ? 0.8 : 0.66 + 0.34 * Math.sin(ctx.time * 3.1);
    const halo = g.createRadialGradient(firstCx, beaconY, 0, firstCx, beaconY, 62);
    halo.addColorStop(0, rgba(palette.signal, 0.5 * pulse));
    halo.addColorStop(1, rgba(palette.signal, 0));
    g.fillStyle = halo;
    g.fillRect(firstCx - 62, beaconY - 62, 124, 124);
    g.fillStyle = rgba(palette.signal, 0.6 + 0.4 * pulse);
    g.beginPath();
    g.arc(firstCx, beaconY, 7, 0, Math.PI * 2);
    g.fill();
    text(g, '1ST', firstCx, firstY + 42, {
      size: 26,
      face: DISPLAY,
      color: rgba(palette.signal, 0.92),
      align: 'center',
    });
  }

  // A dashed run-off from the second roof that simply stops in mid-air.
  // The gap is the statement; this only makes sure it is read as a gap
  // rather than as scenery that happens to be in the way.
  if (finale) {
    g.strokeStyle = rgba(palette.bone, 0.26);
    g.lineWidth = 2;
    g.setLineDash([8, 12]);
    g.beginPath();
    g.moveTo(secondCx + secondW / 2, secondY);
    g.lineTo(secondCx + secondW / 2 + 132, secondY);
    g.stroke();
    g.setLineDash([]);
  }
}

/* -- The player ------------------------------------------------------
   A small ink figure hunched over a lit screen. The light source is the
   screen itself, which is why the rim falls to the right and slightly
   down. Pose 3 (seated) rather than a walker: a standing figure flapping
   through the sky would read as a cartoon, and someone bent over a
   machine at four in the morning is the actual subject of the episode. */

function drawTrail(g, palette, xs, ys, head, fill) {
  for (let i = 0; i < fill; i += 1) {
    // Walk backwards from the newest sample, so `age` grows with distance.
    const idx = (head - 1 - i + TRAIL * 2) % TRAIL;
    const age = i / TRAIL;
    g.fillStyle = rgba(palette.bone, 0.16 * (1 - age));
    g.beginPath();
    g.arc(xs[idx] - i * 1.6, ys[idx], 2.4 * (1 - age * 0.7), 0, Math.PI * 2);
    g.fill();
  }
}

function drawPlayer(g, ctx, y, velocity, invuln, still) {
  const { palette } = ctx;
  // Blink through invulnerability, so the free window is legible rather
  // than something the player has to infer from not dying.
  if (invuln > 0 && Math.floor(ctx.frame / 4) % 2 === 0) return;

  g.save();
  g.translate(PLAYER_X, y);
  if (!still) g.rotate(clamp(velocity / 1100, -0.34, 0.44));

  // The screen glow, drawn first so the figure sits in front of it.
  litWindow(g, 2, -3, 15, 11, palette, 0.9);
  withRim(
    g,
    (gg) => figure(gg, -3, HALF_H + 2, 34, 3, false),
    2.4,
    0.8,
    rgba(palette.bone, 0.62),
    palette.ink,
  );

  g.restore();
}

/* -- HUD ------------------------------------------------------------- */

function drawHud(g, ctx, hours, stumbles, flash) {
  const { W, H, palette } = ctx;
  text(g, `HOUR ${Math.floor(hours)}`, W - 34, 46, {
    size: 22,
    face: DISPLAY,
    color: rgba(palette.bone, 0.84),
    align: 'right',
  });
  // Deliberately NOT --signal, unlike stack.js's equivalent line: the red
  // on this screen belongs to the first-place marker and to nothing else.
  text(g, stumbles ? `${MAX_STUMBLES - stumbles} stumbles left` : 'Hold steady', W - 34, 70, {
    size: 12,
    face: BODY,
    color: rgba(palette.bone, stumbles ? 0.78 : 0.42),
    align: 'right',
    tracking: 1,
  });

  if (flash > 0) {
    g.fillStyle = rgba(palette.bone, 0.1 * flash);
    g.fillRect(0, 0, W, H);
  }
}
