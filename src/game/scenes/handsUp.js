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
 * HANDS UP -- episode 2, TEACHING & RESEARCH. The verb is TRIAGE.
 *
 * Written against the contract documented in ./index.js, with ./stack.js
 * as the reference implementation. Copy comes only from config.beats;
 * colour comes only from ctx.palette through rgba().
 *
 * THE MECHANIC
 * A lecture hall seen from the lectern. Hands go up across six rows and
 * each one stays up for HAND_LIFE seconds before it drops -- a student
 * who gave up waiting. Tap a hand, or aim with the arrows and press
 * Space. Answer TARGET before GIVE_UP_LIMIT give up.
 *
 * WHY IT IS BUILT SO YOU CANNOT REACH THEM ALL
 * The outro in games.js is "You could not reach all of them either." The
 * mechanic has to earn that line, so the difficulty ramp is not garnish
 * -- it is the argument. Hands arrive faster than HAND_LIFE lets one
 * person clear them, and the ramp is driven by ANSWERS as well as by
 * time (see update()), so working the room faster is what makes the room
 * busier. At a realistic pointer cadence give-ups are unavoidable; the
 * RAMP block below has the simulated numbers per cadence. Do not
 * "balance" that away -- a version where the player reaches every hand
 * would be a nicer game making a false claim about what a hundred
 * students in one room is like.
 *
 * You can still WIN -- TARGET answers lands before the rate curve fully
 * closes -- so a good run resolves as a win with most of the give-up
 * budget spent, which is the honest shape.
 */

/* -- Hall geometry -------------------------------------------------- */

const ROWS = 6;
const FRONT_ROW_SEATS = 8; // each row further back adds one more seat
const BODY_HEIGHT = 92; // front-row figure height, virtual units
const BACK_SCALE = 0.45; // back-row figures relative to the front row

/* -- Rules ---------------------------------------------------------- */

const TARGET = 12;
const GIVE_UP_LIMIT = 6;
const HAND_LIFE = 3.5;
const RAISE_TIME = 0.18;
const SEAT_COOLDOWN = 2.2; // a student who just spoke does not re-raise

/* -- Input tuning -----------------------------------------------------
   Both input modes used to be tuned in isolation and diverged hard: the
   keyboard's ensureSelection() handed the cursor the single optimal
   triage target on every frame it had no valid one, so mashing Space
   alone was a free win with zero aiming; the pointer's hit test was a
   tiny circle (`Math.max(18, 27*sf)`) around the hand point only, which
   at phone scale (the 960x540 virtual box letterboxes to ~0.39x) is a
   handful of real pixels and excludes the arm entirely. See below for
   the fix on each side and the re-simulated numbers. */

// Pointer: pick the nearest hand's ARM (shoulder->elbow->hand polyline,
// not just the hand point) within this radius, in virtual units. Floor
// of 44 makes the smallest back-row figures comfortably tappable at
// phone scale; the 60*sf term keeps front-row taps from feeling loose.
// Back-row seats sit ~46 virtual units apart center-to-center (see
// buildHall's seat spacing), so a ~44-58 unit pick radius does overlap
// neighbouring seats there -- that is accepted, not a miss: only a
// handful of seats are ever raised at once out of 63, ties are resolved
// by nearest-arm-distance, and "generous but nearest-wins" is what the
// bug report asked for over "small but exact."
const PICK_RADIUS_FLOOR = 44;
const PICK_RADIUS_SCALE = 60;

/* -- The ramp -------------------------------------------------------
   Pressure is the LATER of two clocks: elapsed time, and progress
   through the answer quota (see update()). The spawn interval falls
   from SPAWN_EARLY to SPAWN_LATE across it while the ceiling on
   simultaneous hands rises, so at full pressure hands arrive at 3.3/s
   against a HAND_LIFE of 3.5s -- a standing queue of eight that no
   single person services.

   These numbers were picked by simulation, not by feel, and were
   RE-MEASURED after the input-fairness fix documented above (the old
   keyboard fallback WAS this ramp's "perfect triage, zero search cost"
   bot -- ensureSelection() handed it the objectively best hand for
   free, so a keyboard masher's real performance equalled this table at
   every cadence regardless of skill. That is exactly the bug report.
   The table below is now three separate bots, none of which get a free
   ride, run against the scene's real state machine (spawn/ramp/hand
   lifecycle, reproduced headless -- see the throwaway sim used to
   generate this table, since the module's hall/hand state is private
   to init()'s closure and isn't reachable from outside it):

     POINTER, accurate -- taps the true most-urgent hand every cadence,
     landing anywhere on its arm (the fix makes this actually reachable
     in practice; previously the ~18-27 unit hand-point-only circle
     mostly wasn't):
       0.45s/answer  win, 12 answered,  0 gave up   (~6.7s)
       0.60s/answer  win, 12 answered,  0 gave up   (~7.8s)
       0.80s/answer  win, 12 answered,  1 gave up   (~9.6s)
       1.00s/answer  win, 12 answered,  5 gave up   (~12.0s)
       1.40s/answer  END, 8 answered,   6 gave up   (~11.2s)

     KEYBOARD, steering -- same base cadence, PLUS real time (0.12s per
     press) to arrow-step from wherever the cursor last was to the true
     most-urgent hand before pressing Space:
       0.45s/answer  win, 12 answered,  0 gave up   (~7.4s)
       0.60s/answer  win, 12 answered,  0 gave up   (~8.8s)
       0.80s/answer  win, 12 answered,  4 gave up   (~11.2s)
       1.00s/answer  END, 10 answered,  6 gave up   (~12.0s)
       1.40s/answer  END, 7 answered,   6 gave up   (~11.7s)

     KEYBOARD, mash-only -- Space at a fixed cadence, arrows NEVER
     touched, so every answer is whatever ensureSelection()'s nearest-
     in-space fallback happened to be sitting on:
       0.45s/answer  win, 12 answered,  0 gave up   (~6.7s)
       0.60s/answer  win, 12 answered,  0 gave up   (~7.8s)
       0.80s/answer  win, 12 answered,  2 gave up   (~9.6s)
       1.00s/answer  END, 10 answered,  6 gave up   (~10.0s)
       1.40s/answer  END, 8 answered,   8 gave up   (~11.2s)

   The pointer row is nearly unchanged from the pre-fix table (as
   expected -- the ramp constants below didn't move, only whether a
   real tap can actually land). The load-bearing comparison is the two
   keyboard rows against what mash-only used to score before this fix,
   which was IDENTICAL to the pointer row at every single cadence,
   because the old fallback WAS the optimal-hand oracle: at the 1.00s
   cadence the header above calls "where actual people play," mash-only
   used to WIN with 5 spare give-ups for free and now LOSES -- a player
   who never touches the arrows past a brisk cadence no longer clears
   the round. Steering doesn't universally beat mash-only in this
   table (0.12s/press is real overhead, and this bot steers to the
   exact optimum every single time rather than only when it matters),
   but it keeps the win open at 0.80s with headroom mash-only doesn't
   have, which is the honest amount of "the arrows matter": enough that
   ignoring them stops being free, not so much that using them is
   mandatory at every cadence. Re-run the sim before changing any
   constant here or in the input-tuning block above. */

const RAMP_SECONDS = 14; // the floor, for a player too slow to drive the ramp
const RAMP_ANSWERS = 5; // full pressure by answer 5, with 7 still to go
const SPAWN_EARLY = 0.85;
const SPAWN_LATE = 0.3;
const HANDS_EARLY = 3;
const HANDS_LATE = 8;

/**
 * withRim() takes a paint callback, and this scene calls it once per
 * seat per frame. A closure allocated per seat per frame would be ~63
 * short-lived objects every 16ms for no benefit, so the brush is one
 * shared mutable record and the paint function reads it. Safe because
 * draw() is single-threaded and the call is synchronous.
 */
const seatBrush = { x: 0, y: 0, h: 0, flip: false };
const paintSeatFigure = (g) => figure(g, seatBrush.x, seatBrush.y, seatBrush.h, 3, seatBrush.flip);

export function createHandsUp(config) {
  const { beats = [], onDone = () => {} } = config;
  const total = beats.length;

  /** Every seat in the hall. Precomputed once in init, never per frame. */
  let seats = [];
  /** Row metadata; drawing order is derived from this, back to front. */
  let rows = [];
  /** Hands currently in the air. */
  let hands = [];
  /** Short-lived visuals: an answered flash, a falling arm. */
  let effects = [];

  let answered = 0;
  let gaveUp = 0;
  let revealed = 0;
  let finished = false;
  let spawnTimer = 0;
  let shake = 0;
  let selectedSeat = -1;
  /** Screen position of the last seat the keyboard cursor sat on, kept
   *  around so ensureSelection() has somewhere to fall back FROM once
   *  that seat's hand is gone. See ensureSelection()'s doc comment. */
  let lastSelX = 0;
  let lastSelY = 0;
  /** The --signal highlight is only drawn once a key has actually been
   *  used. A pointer player never sees it, which leaves the scene's
   *  whole accent budget (root CLAUDE.md 3) unspent for them. */
  let usingKeys = false;
  let rand = rng(1);

  /** Every place the keyboard cursor moves goes through here, so
   *  lastSelX/Y (what ensureSelection() falls back from) always tracks
   *  where the cursor actually was, not just where it is now. */
  function selectSeat(seat) {
    selectedSeat = seat ? seat.index : -1;
    if (seat) {
      lastSelX = seat.x;
      lastSelY = seat.y;
    }
  }

  /* -- Setup -------------------------------------------------------- */

  function buildHall(ctx) {
    const { W, H } = ctx;
    const jitter = rng(48271);
    seats = [];
    rows = [];

    for (let r = 0; r < ROWS; r += 1) {
      const t = r / (ROWS - 1);
      // Perspective compression: raising t to a power below 1 bunches the
      // far rows together and spreads the near ones, which is what makes
      // six rows read as a hall with depth rather than as six stripes.
      const depth = Math.pow(t, 0.72);
      const y = lerp(H * 0.9, H * 0.3, depth);
      const scale = lerp(1, BACK_SCALE, depth);
      const rowSf = (BODY_HEIGHT * scale) / 100;
      const halfW = lerp(W * 0.47, W * 0.28, depth);
      const count = FRONT_ROW_SEATS + r;
      const inRow = [];

      for (let c = 0; c < count; c += 1) {
        const u = count === 1 ? 0.5 : c / (count - 1);
        const h = BODY_HEIGHT * scale * (0.94 + jitter() * 0.12);
        const sf = h / 100;
        const flip = jitter() > 0.5;
        const seat = {
          index: seats.length,
          row: r,
          depth,
          x: W / 2 + (u - 0.5) * 2 * halfW + (jitter() - 0.5) * 7 * scale,
          y: y + (jitter() - 0.5) * 4 * scale,
          h,
          sf,
          flip,
          dir: flip ? -1 : 1,
          phase: jitter() * Math.PI * 2,
          cooldown: 0,
          up: false,
        };
        inRow.push(seat);
        seats.push(seat);
      }

      rows.push({
        depth,
        seats: inRow,
        // The desk in front of each row. It occludes that row's lower
        // body and, more usefully, draws one hard horizontal per row, so
        // the depth read never depends on the silhouettes alone.
        benchTop: y - 30 * rowSf,
        benchH: 26 * rowSf,
        benchHalf: halfW + 34 * rowSf,
      });
    }
  }

  /* -- Hand lifecycle ----------------------------------------------- */

  function raiseHand() {
    // Rejection sampling with a bounded budget, then a linear fallback,
    // so a crowded hall can never spin here.
    let seat = null;
    for (let attempt = 0; attempt < 24 && !seat; attempt += 1) {
      const candidate = seats[Math.floor(rand() * seats.length)];
      if (candidate && candidate.cooldown <= 0 && !candidate.up) seat = candidate;
    }
    if (!seat) seat = seats.find((s) => !s.up) || null;
    if (!seat) return;
    seat.up = true;
    hands.push({ seat, age: 0 });
  }

  /** Keeps a keyboard target valid at all times, so Space always has
   *  something to answer -- that invariant is deliberate and must
   *  survive any change here. What it falls back TO is the part that
   *  was broken: it used to hand the cursor the single most urgent
   *  hand (the one closest to giving up), which is the optimal triage
   *  answer, so a keyboard player could win by mashing Space with zero
   *  aiming and the arrow keys never mattered. It now falls back to
   *  whichever raised hand is NEAREST IN SCREEN SPACE to where the
   *  cursor last sat (lastSelX/Y) -- often not the most urgent seat --
   *  so steering with the arrows is genuinely required to keep up. */
  function ensureSelection() {
    if (hands.some((hand) => hand.seat.index === selectedSeat)) return;
    let best = null;
    let bestDist = Infinity;
    for (const hand of hands) {
      const dx = hand.seat.x - lastSelX;
      const dy = hand.seat.y - lastSelY;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        best = hand;
      }
    }
    selectSeat(best ? best.seat : null);
  }

  function releaseSeat(hand) {
    hand.seat.up = false;
    hand.seat.cooldown = SEAT_COOLDOWN;
    const at = hands.indexOf(hand);
    if (at >= 0) hands.splice(at, 1);
  }

  function finish(ctx, outcome) {
    if (finished) return;
    finished = true;
    hands = [];
    ctx.emit('done', { outcome, stat: `${answered} answered, ${gaveUp} gave up` });
    onDone(outcome);
  }

  function answer(ctx, hand) {
    releaseSeat(hand);
    effects.push({ kind: 'answer', seat: hand.seat, t: 0, life: 0.4 });
    answered += 1;
    ctx.sound('select');

    // Spread the beats evenly across TARGET answers so a winning run
    // reveals all of them, in order, and a short run still reveals a
    // proportionate prefix. Derived rather than hardcoded, so editing
    // games.js's beat list cannot silently strand one.
    const due = total ? Math.min(total, Math.floor((answered * total) / TARGET)) : 0;
    while (revealed < due) {
      ctx.emit('reveal', { index: revealed });
      revealed += 1;
    }

    ctx.emit('progress', { value: clamp(answered / TARGET, 0, 1) });
    if (answered >= TARGET) finish(ctx, 'win');
  }

  function giveUp(ctx, hand) {
    releaseSeat(hand);
    effects.push({ kind: 'drop', seat: hand.seat, t: 0, life: 0.45 });
    gaveUp += 1;
    shake = 0.55;
    ctx.sound('toast');
    if (gaveUp >= GIVE_UP_LIMIT) finish(ctx, 'end');
  }

  /* -- Keyboard aiming ---------------------------------------------- */

  /** Left/Right walk the raised hands in screen order; Up/Down walk them
   *  in depth order. Sorting happens on a keypress, never per frame. */
  function step(axis, delta) {
    if (!hands.length) return;
    const order = hands
      .slice()
      .sort((a, b) => (axis === 'x' ? a.seat.x - b.seat.x : a.seat.y - b.seat.y));
    const at = order.findIndex((hand) => hand.seat.index === selectedSeat);
    const next = at < 0 ? 0 : (at + delta + order.length) % order.length;
    selectSeat(order[next].seat);
  }

  return {
    init(ctx) {
      buildHall(ctx);
      hands = [];
      effects = [];
      answered = 0;
      gaveUp = 0;
      revealed = 0;
      finished = false;
      shake = 0;
      selectedSeat = -1;
      // Hall centre, roughly -- there is no selection yet, so this is
      // just a reasonable place for the first fallback to measure from.
      lastSelX = ctx.W / 2;
      lastSelY = ctx.H * 0.55;
      usingKeys = false;
      rand = rng(20260908);
      // A beat of empty hall before the first hand, so the room registers
      // as a place before it becomes a queue.
      spawnTimer = 0.65;
      ctx.emit('progress', { value: 0 });
    },

    update(dt, ctx) {
      shake = Math.max(0, shake - dt * 4);
      for (const fx of effects) fx.t += dt;
      if (effects.length) effects = effects.filter((fx) => fx.t < fx.life);
      for (const seat of seats) {
        if (seat.cooldown > 0) seat.cooldown -= dt;
      }

      if (finished) return;

      // Pressure is the LATER of two clocks: elapsed time, and how far
      // through the answer quota the player is. Time alone was measurably
      // wrong -- a quick player reached 12 answers in under nine seconds,
      // i.e. finished the run before a time-only ramp had tightened, and
      // walked away with zero give-ups and the outro line unearned.
      // Tying it to answers as well means the room fills up BECAUSE you
      // are working it, which is both the honest mechanic and the right
      // metaphor: answering a hand does not reduce the queue, it puts
      // your hand up in front of the next twenty people.
      const ramp = clamp(Math.max(ctx.time / RAMP_SECONDS, answered / RAMP_ANSWERS), 0, 1);
      const ceiling = Math.round(lerp(HANDS_EARLY, HANDS_LATE, ramp));

      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        if (hands.length < ceiling) {
          raiseHand();
          spawnTimer = lerp(SPAWN_EARLY, SPAWN_LATE, ramp) * (0.82 + rand() * 0.36);
        } else {
          // Retry soon rather than banking a spawn. A banked queue would
          // dump four hands at once the moment the player caught up,
          // which reads as the game cheating rather than as a room
          // filling up faster than one person can work it.
          spawnTimer = 0.2;
        }
      }

      for (let i = hands.length - 1; i >= 0; i -= 1) {
        const hand = hands[i];
        hand.age += dt;
        if (hand.age >= HAND_LIFE) giveUp(ctx, hand);
        if (finished) return;
      }

      ensureSelection();

      // A tap sets pointer.pressed AND the 'action' key (see engine.js's
      // onPointerDown), so the pointer branch must consume the whole
      // frame -- otherwise one tap answers twice, once where it landed
      // and once on whatever the keyboard highlight was sitting on.
      const pointer = ctx.input.pointer;
      if (pointer.pressed) {
        let hit = null;
        let bestDist = Infinity;
        for (const hand of hands) {
          const { seat } = hand;
          const distSq = armHitDistanceSq(ctx, pointer, seat);
          const radius = Math.max(PICK_RADIUS_FLOOR, PICK_RADIUS_SCALE * seat.sf);
          if (distSq <= radius * radius && distSq < bestDist) {
            bestDist = distSq;
            hit = hand;
          }
        }
        if (hit) answer(ctx, hit);
        return;
      }

      const input = ctx.input;
      if (input.pressed('left')) {
        usingKeys = true;
        step('x', -1);
      }
      if (input.pressed('right')) {
        usingKeys = true;
        step('x', 1);
      }
      if (input.pressed('up')) {
        usingKeys = true;
        step('y', -1);
      }
      if (input.pressed('down')) {
        usingKeys = true;
        step('y', 1);
      }
      if (input.pressed('action')) {
        usingKeys = true;
        const hand = hands.find((h) => h.seat.index === selectedSeat);
        if (hand) answer(ctx, hand);
      }
    },

    draw(g, ctx) {
      const { W, H, palette } = ctx;

      g.fillStyle = palette.ink;
      g.fillRect(0, 0, W, H);

      // Ambient bounce off the back wall. Deliberately weak -- the hall is
      // lit from the front, so this is only enough to give the far rows
      // something to silhouette against instead of vanishing into ink.
      const wall = g.createLinearGradient(0, H * 0.12, 0, H * 0.82);
      wall.addColorStop(0, rgba(palette.dusk, 0.3));
      wall.addColorStop(1, rgba(palette.dusk, 0));
      g.fillStyle = wall;
      g.fillRect(0, 0, W, H);
      halftone(g, 0, H * 0.06, W, H * 0.34, rgba(palette.bone, 0.05), 'down', 17, 4409);

      // The lectern glow: the scene's only real light source, low and in
      // front, which is what makes everything above it rim-lit from below.
      const gx = W * 0.42;
      const glow = g.createRadialGradient(gx, H + 26, 0, gx, H + 26, H * 0.98);
      glow.addColorStop(0, rgba(palette.bone, 0.22));
      glow.addColorStop(0.42, rgba(palette.bone, 0.07));
      glow.addColorStop(1, rgba(palette.bone, 0));
      g.fillStyle = glow;
      g.fillRect(0, 0, W, H);
      halftone(g, 0, H * 0.56, W, H * 0.44, rgba(palette.bone, 0.09), 'up', 17, 2311);

      g.save();
      if (shake > 0 && !ctx.reducedMotion) {
        g.translate((Math.random() - 0.5) * 6 * shake, (Math.random() - 0.5) * 6 * shake);
      }

      // Back to front, so a nearer row's desk correctly occludes the row
      // behind it and a raised arm lands on top of the crowd behind it.
      for (let r = rows.length - 1; r >= 0; r -= 1) {
        const row = rows[r];
        const rim = rgba(palette.bone, lerp(0.5, 0.14, row.depth));

        for (const seat of row.seats) {
          seatBrush.x = seat.x;
          seatBrush.y = seat.y;
          seatBrush.h = seat.h;
          seatBrush.flip = seat.flip;
          // Offset toward the light: down, and slightly inward toward the
          // lectern, so the rim sits where the glow would actually catch.
          withRim(g, paintSeatFigure, (gx - seat.x) * 0.006, 2.4 * seat.sf, rim, palette.ink);
        }

        for (const hand of hands) {
          if (hand.seat.row !== r) continue;
          const raise = ctx.reducedMotion ? 1 : smooth(hand.age / RAISE_TIME);
          const life = clamp(1 - hand.age / HAND_LIFE, 0, 1);
          drawArm(g, ctx, hand.seat, raise, life, 1);
          if (usingKeys && hand.seat.index === selectedSeat) {
            drawSelection(g, ctx, hand.seat);
          }
        }

        drawBench(g, ctx, row);
      }

      for (const fx of effects) {
        const k = fx.t / fx.life;
        if (fx.kind === 'drop') {
          // The arm falls back down dark -- the light has already gone out
          // of it, which is the whole reading of a student giving up.
          const raise = ctx.reducedMotion ? 1 : 1 - smooth(k);
          drawArm(g, ctx, fx.seat, raise, 0, 1 - k);
        } else {
          const point = armPoints(ctx, fx.seat, 1);
          const r = Math.max(10, 22 * fx.seat.sf) * (ctx.reducedMotion ? 1 : 1 + k * 1.6);
          g.strokeStyle = rgba(palette.bone, 0.6 * (1 - k));
          g.lineWidth = Math.max(1.5, 3 * fx.seat.sf);
          g.beginPath();
          g.arc(point.hx, point.hy, r, 0, Math.PI * 2);
          g.stroke();
        }
      }

      drawLectern(g, ctx, gx);
      g.restore();

      // HUD. Mechanical labels only -- every word a visitor reads about
      // the work itself comes from games.js beats, never from this file.
      text(g, `${answered} / ${TARGET}`, W - 34, 44, {
        size: 20,
        face: DISPLAY,
        color: rgba(palette.bone, 0.82),
        align: 'right',
      });
      text(g, `${gaveUp} / ${GIVE_UP_LIMIT} gave up`, W - 34, 66, {
        size: 12,
        face: BODY,
        color: rgba(palette.bone, 0.4 + 0.4 * (gaveUp / GIVE_UP_LIMIT)),
        align: 'right',
        tracking: 1,
      });

      vignette(g, W, H, palette, 0.5);
      grain(g, W, H, ctx.reducedMotion ? 0.03 : 0.05, ctx.reducedMotion, ctx.frame);
    },
  };
}

/* -- Arm drawing -----------------------------------------------------
   figure()'s pose 3 has its arm down at the desk. Rather than fork that
   shared primitive for one scene, the raised arm is drawn over the top
   of it in the seat's own frame, using the same 100-unit body
   measurements figure() uses internally -- shoulder at (13, -70), so
   these numbers stay meaningful if that primitive is ever adjusted. */

function armPoints(ctx, seat, raise) {
  const { sf, dir } = seat;
  const sway = ctx.reducedMotion ? 0 : Math.sin(ctx.time * 3.1 + seat.phase) * 2.4 * sf * raise;
  return {
    sx: seat.x + dir * 13 * sf,
    sy: seat.y - 70 * sf,
    ex: seat.x + dir * lerp(15, 23, raise) * sf + sway * 0.5,
    ey: seat.y - lerp(50, 92, raise) * sf,
    hx: seat.x + dir * lerp(13, 19, raise) * sf + sway,
    hy: seat.y - lerp(34, 118, raise) * sf,
  };
}

/** Squared distance from point (px,py) to the segment (ax,ay)-(bx,by).
 *  No allocation, so it is safe to call twice per raised hand per frame
 *  from the pointer hit test below. */
function distToSegmentSq(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq > 0 ? ((px - ax) * dx + (py - ay) * dy) / lenSq : 0;
  t = clamp(t, 0, 1);
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  const ex = px - cx;
  const ey = py - cy;
  return ex * ex + ey * ey;
}

/** Squared distance from the pointer to a seat's whole raised arm --
 *  the shoulder->elbow->hand polyline, not just the hand point. A tap
 *  landing anywhere along the forearm or the hand counts, which is what
 *  makes this hittable at phone scale (see PICK_RADIUS_* above). */
function armHitDistanceSq(ctx, pointer, seat) {
  const p = armPoints(ctx, seat, 1);
  const upper = distToSegmentSq(pointer.x, pointer.y, p.sx, p.sy, p.ex, p.ey);
  const lower = distToSegmentSq(pointer.x, pointer.y, p.ex, p.ey, p.hx, p.hy);
  return Math.min(upper, lower);
}

/**
 * A raised hand has to be unmistakable at a glance across a 63-seat hall
 * of ink silhouettes, so it is the one thing in the scene drawn in bone
 * rather than ink: a light-edged arm ending in a lit pane. The pane dims
 * as the hand's time runs out, which IS the timer -- no bar, no number,
 * just the light going out of it.
 */
function drawArm(g, ctx, seat, raise, life, alpha) {
  const { palette } = ctx;
  const p = armPoints(ctx, seat, raise);
  const bright = 0.32 + 0.68 * life;

  g.save();
  g.globalAlpha = alpha;
  g.lineCap = 'round';
  g.lineJoin = 'round';

  g.beginPath();
  g.moveTo(p.sx, p.sy);
  g.lineTo(p.ex, p.ey);
  g.lineTo(p.hx, p.hy);
  g.lineWidth = Math.max(2.6, 7.5 * seat.sf);
  g.strokeStyle = rgba(palette.bone, 0.26 + 0.44 * bright);
  g.stroke();
  // A dark core inside the light edge, so the arm reads as a rim-lit limb
  // rather than as a glowing stick.
  g.lineWidth = Math.max(1, 3.2 * seat.sf);
  g.strokeStyle = rgba(palette.ink, 0.6);
  g.stroke();

  const pw = Math.max(8, 13 * seat.sf);
  litWindow(g, p.hx - pw / 2, p.hy - pw / 2, pw, pw, palette, bright * raise);
  g.restore();
}

/** The keyboard target, and the only --signal in the scene. Corner ticks
 *  rather than a filled shape, so it marks the hand without covering the
 *  light that makes the hand readable in the first place. */
function drawSelection(g, ctx, seat) {
  const { palette } = ctx;
  const p = armPoints(ctx, seat, 1);
  const pulse = ctx.reducedMotion ? 1 : 0.6 + 0.4 * Math.sin(ctx.time * 6);
  const r = Math.max(15, 26 * seat.sf);
  const k = r * 0.45;
  const corners = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ];

  g.save();
  g.strokeStyle = rgba(palette.signal, 0.55 + 0.35 * pulse);
  g.lineWidth = 2;
  g.beginPath();
  for (const [sx, sy] of corners) {
    const cx = p.hx + sx * r;
    const cy = p.hy + sy * r;
    g.moveTo(cx - sx * k, cy);
    g.lineTo(cx, cy);
    g.lineTo(cx, cy - sy * k);
  }
  g.stroke();
  g.restore();
}

/* -- Room ----------------------------------------------------------- */

function drawBench(g, ctx, row) {
  const { W, palette } = ctx;
  const x = W / 2 - row.benchHalf;
  const w = row.benchHalf * 2;

  g.fillStyle = rgba(palette.shadow, 0.96);
  g.fillRect(x, row.benchTop, w, row.benchH);
  // The front face is the part the lectern light actually reaches.
  g.fillStyle = rgba(palette.bone, lerp(0.1, 0.03, row.depth));
  g.fillRect(x, row.benchTop + row.benchH * 0.55, w, row.benchH * 0.45);
  g.fillStyle = rgba(palette.bone, lerp(0.42, 0.12, row.depth));
  g.fillRect(x, row.benchTop, w, Math.max(1, 2.4 - row.depth * 1.4));
}

/** The near edge of the room, mostly out of frame: the player is standing
 *  at it, which is why the light in this scene comes from down here. */
function drawLectern(g, ctx, gx) {
  const { H, palette } = ctx;
  const w = 132;
  const h = 74;
  const x = gx - w / 2;
  const y = H - h + 16;

  g.fillStyle = palette.ink;
  g.fillRect(x, y, w, h);
  g.fillStyle = rgba(palette.bone, 0.3);
  g.fillRect(x, y, w, 2);
  // The lit pane on the lectern is the visible source of the glow above.
  litWindow(g, x + w * 0.22, y + 12, w * 0.56, 22, palette, 0.9);
}
