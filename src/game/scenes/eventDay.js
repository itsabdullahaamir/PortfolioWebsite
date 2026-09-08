import {
  BODY,
  DISPLAY,
  clamp,
  figure,
  grain,
  halftone,
  litWindow,
  rgba,
  rng,
  strokeRough,
  text,
  vignette,
  withRim,
} from '../draw.js';

/**
 * EVENT DAY -- episode 3, LEADERSHIP & COMMUNITY.
 *
 * Written against the contract in ./index.js; ./stack.js is the
 * reference implementation and this file follows its shape (a factory
 * returning { init, update, draw }, beats as the only copy, reveal by
 * index, drawing through ../draw.js only, honouring ctx.reducedMotion).
 *
 * THE MECHANIC
 * Four meters -- VOLUNTEERS, SPONSORS, SCHEDULE, THE ROOM -- drain
 * continuously, each at its own rate, and you can work exactly ONE at a
 * time. That single constraint IS the game: there is no combo, no timing
 * window, no skill ceiling to grind. There is only the question of which
 * of four things you are prepared to let slide for the next eight
 * seconds.
 *
 * WHY IT CANNOT BE ACED, ON PURPOSE
 * Total drain across the four meters is deliberately tuned ABOVE what a
 * single refill stream can replace (numbers below), so the board's total
 * charge falls all day no matter how well it is played. A player who
 * never wastes a second still finishes with four low meters rather than
 * four full ones. That is what earns the outro line already written in
 * games.js -- "Nothing here ran on a full tank" -- instead of merely
 * decorating it. A version of this you could ace would be a nicer game
 * and a lie about the work.
 *
 * Each meter also carries a slow sine on top of its base rate, with
 * periods sharing no common factor (17 / 23 / 13 / 29 seconds). The
 * consequence is the point: the worst meter keeps changing hands, so a
 * settled left-to-right rotation stops working and the player has to
 * keep re-reading the board. That is the difference between running a
 * room and running a checklist.
 *
 * FAILURE THAT DOES NOT END THE RUN EARLY -- UNLESS EVERYTHING IS GONE
 * A meter reaching zero is DEAD: it stops draining (there is nothing
 * left to lose), it stays at exactly zero for the rest of the day, and
 * it can no longer be selected or worked -- holding on a dead meter does
 * nothing, because there is nothing there to hold. This used to be
 * recoverable (a "collapse" that could climb back off the floor); a live
 * report called that a bug -- a meter that has already failed reading as
 * still fixable -- so death is now final. The run itself still continues
 * with whatever meters remain, because stopping early would take beats
 * off the table and gate resume content behind skill (root CLAUDE.md
 * section 6 rules 1 and 2); only losing every meter ends the day on the
 * spot, and even then every beat still not yet shown is flushed, in
 * order, before the run ends. Reaching the end of the day with every
 * meter still alive is 'win'; anything else -- one or more dead, or all
 * four gone -- is 'end'. Both land on the same results card.
 *
 * THE TUNING, written down so a later change is a decision and not a
 * nudge:
 *   start    0.80 x 4                        = 3.20 units on the board
 *   drain    0.0515 avg/sec/meter, x a 0.85 -> 1.35 ramp across the day
 *            (1.10 mean), x 4 meters, x 75s  = ~17.0 units lost
 *   refill   0.24/sec, one meter only, x 75s = 18.0 units gained
 *
 * That looks survivable on paper and is not, because refill above a full
 * meter is thrown away and every switch costs a moment. These numbers
 * were picked by simulating the day 60 times a second against five play
 * policies (work the lowest LIVING meter, switching when it leads the
 * next-worst by a margin, losing a fixed moment per switch) -- RE-RUN
 * after this batch made a collapse FINAL (a meter that hits zero is dead
 * for the rest of the day: no drain, unselectable, not refillable) rather
 * than a recoverable 1.5x-drain state a player could climb back out of,
 * since that changes the balance in both directions at once -- a dead
 * meter frees every remaining second of attention onto the survivors
 * (late runs read HIGHER), while a meter lost early is lost for good
 * (no more climbing back to safety):
 *
 *   superhuman  4479 switches, no hesitation  3.06 / 4, 0 lost, win
 *   sharp         50 switches, 0.15s each     1.56 / 4, 0 lost, win
 *   good          30 switches, 0.25s each     1.26 / 4, 0 lost, win
 *   casual        19 switches, 0.40s each     1.23 / 4, 2 lost (first at 68s), end
 *   sloppy        13 switches, 0.60s each     1.68 / 4, 2 lost (first at 34s), end
 *   fixed rotation, never reading the board   1.87 / 4, 2 lost (first at 63s), end
 *
 * Before this batch (the recoverable model): superhuman 234 switches/2.95,
 * sharp 55/1.63, good 42/1.05, casual 33/0.57 with 2 collapses, sloppy
 * 23/0.42 with 6 collapses, fixed rotation 1.00 with 3 collapses -- every
 * policy that used to lose a meter lost more than one, because losing one
 * used to make the OTHERS worse (a permanently 1.5x-draining survivor is
 * still eating attention), where now it makes them easier to hold (a dead
 * meter needs nothing at all). Nobody dies before 34 seconds under any
 * tested policy -- a good player still finishes with all four alive, and
 * losing a meter is now a real, permanent cost rather than a fixable dip,
 * which is closer to what "reached zero" ought to mean. Nothing here
 * looked broken enough to retune START_VALUE, REFILL or the METER_SPECS
 * bases, so none of them changed. Raising REFILL or lowering the bases by
 * even 10% still collapses that whole spread, because the outcome is a
 * small difference between two large numbers; re-run the simulation
 * before touching either.
 *
 * The rhythms are checked the same way: over one day the fastest-
 * draining meter changes hands 14 times, about every five seconds, which
 * is the number that stops a fixed rotation from working.
 *
 * VISUAL
 * A hall being set up at night: back wall, an overhead truss, a lit
 * doorway spilling across the floor, crowd and volunteer silhouettes
 * along the bottom rim-lit toward that door. The meters are the only
 * bright verticals in the room, so the eye goes to the board -- which is
 * also where the mechanic lives.
 */

const DAY = 75; // seconds -- "about 75 seconds", per the brief
const REFILL = 0.24; // units/sec added to whichever meter is being worked
const START_VALUE = 0.8;
const CRITICAL_AT = 0.55; // below this, the worst LIVING meter is worth spending --signal on
const FALLOFF_H = 34; // how far above the fill surface the halftone light reaches

/**
 * Base drain in units/sec, plus each meter's own rhythm: `amp` is a
 * fraction of the base, `period` is in seconds, `phase` offsets the wave
 * so the four never peak together. The periods are coprime for the
 * reason given in the header -- the worst meter has to keep moving.
 */
const METER_SPECS = [
  { name: 'VOLUNTEERS', base: 0.048, period: 17, amp: 0.55, phase: 0 },
  { name: 'SPONSORS', base: 0.043, period: 23, amp: 0.7, phase: 2.1 },
  { name: 'SCHEDULE', base: 0.058, period: 13, amp: 0.4, phase: 4.0 },
  { name: 'THE ROOM', base: 0.057, period: 29, amp: 0.6, phase: 1.1 },
];

/** Digit codes 1-4, mapped by position to meter index. See init(). */
const DIGIT_CODES = ['Digit1', 'Digit2', 'Digit3', 'Digit4'];

export function createEventDay(config) {
  const { beats = [], onDone = () => {} } = config;
  const total = beats.length;

  /** @type {{name:string,value:number,dead:boolean}[]} */
  let meters = [];
  /** Column and room geometry, computed once in init from ctx.W/ctx.H. */
  let geo = null;
  /** Set dressing, seeded once so it never shimmers between frames. */
  let crowd = [];
  let props = [];

  let elapsed = 0;
  let selected = 0;
  let working = -1; // index being worked THIS step, or -1
  let deaths = 0;
  let revealed = 0;
  let lastProgress = -1;
  let finished = false;
  let shake = 0;
  let keyHandler = null;

  /**
   * Reveal milestones as fractions of the day: evenly spaced, all of
   * them landing before the end, so a full run banks every beat with
   * room to read the last one.
   */
  const milestones = [];
  for (let i = 0; i < total; i += 1) milestones.push((i + 1) / (total + 1));

  /**
   * The next LIVING meter in `dir` steps from `from`, wrapping. Returns -1
   * if every meter is dead -- callers must handle that rather than loop
   * forever.
   */
  function nextAlive(from, dir) {
    const n = METER_SPECS.length;
    for (let step = 1; step <= n; step += 1) {
      const idx = (from + dir * step + n * step) % n;
      if (!meters[idx].dead) return idx;
    }
    return -1;
  }

  /** Select an exact index -- used by pointer taps and the 1-4 keys. A
   *  dead meter is not selectable: there is nothing left to work. */
  function selectExact(index, ctx) {
    if (index < 0 || index >= meters.length || meters[index].dead) return;
    if (index === selected) return;
    selected = index;
    ctx.sound('navigate');
  }

  /** Move the selection one LIVING meter left/right, used by the arrow
   *  keys -- a dead column is skipped over rather than landed on. */
  function selectDirection(dir, ctx) {
    const idx = nextAlive(selected, dir);
    if (idx < 0 || idx === selected) return;
    selected = idx;
    ctx.sound('navigate');
  }

  /**
   * Current drain for one meter. Three factors, all deliberate: its own
   * base rate, its own sine rhythm, and the day-long ramp that makes the
   * last third genuinely harder than the first. A dead meter has nothing
   * left to lose, so its drain is always zero -- callers should skip dead
   * meters entirely, but this stays safe either way.
   */
  function drainRate(meter, spec, t) {
    if (meter.dead) return 0;
    const wave = 1 + spec.amp * Math.sin((t / spec.period) * Math.PI * 2 + spec.phase);
    const ramp = 0.85 + 0.5 * clamp(t / DAY, 0, 1);
    return spec.base * wave * ramp;
  }

  function finish(ctx, outcome) {
    if (finished) return;
    finished = true;
    const stat = deaths
      ? `Day survived, ${deaths} meter${deaths === 1 ? '' : 's'} lost`
      : 'Day survived, nothing lost';
    ctx.emit('done', { outcome, stat });
    onDone(outcome);
  }

  /**
   * All geometry as fractions of the virtual box rather than literals,
   * so the board stays centred and proportional if VW/VH ever move
   * (engine.js rule: never assume a size).
   */
  function layout(ctx) {
    const { W, H } = ctx;
    const cellW = W * 0.1375;
    const gap = W * 0.021;
    const totalW = cellW * 4 + gap * 3;
    const x0 = (W - totalW) / 2;
    const top = H * 0.245;
    const h = H * 0.49;
    const barW = W * 0.081;

    const columns = METER_SPECS.map((spec, i) => {
      const cellX = x0 + i * (cellW + gap);
      return {
        cellX,
        cellW,
        cx: cellX + cellW / 2,
        // The bar is narrower than its cell on purpose: the whole cell is
        // the tap target, which matters on a phone, while the drawn
        // column stays tall and thin.
        barX: cellX + (cellW - barW) / 2,
        barW,
        top,
        h,
        labelY: top + h + H * 0.055,
        pipY: top + h + H * 0.09,
        seed: 311 + i * 97,
      };
    });

    return {
      columns,
      x0,
      x1: x0 + totalW,
      floorY: H * 0.867,
      clockY: H * 0.118,
      labelSize: Math.round(H * 0.024),
      doorX: W * 0.055,
      doorY: H * 0.44,
      doorW: W * 0.088,
      doorH: H * 0.4,
      stageX: W * 0.86,
      stageY: H * 0.5,
      stageW: W * 0.09,
      stageH: H * 0.24,
    };
  }

  return {
    init(ctx) {
      const { W, H } = ctx;
      meters = METER_SPECS.map((spec) => ({
        name: spec.name,
        value: START_VALUE,
        dead: false,
      }));
      geo = layout(ctx);
      elapsed = 0;
      selected = 0;
      working = -1;
      deaths = 0;
      revealed = 0;
      lastProgress = -1;
      finished = false;
      shake = 0;

      // Set dressing, generated once. rng() rather than Math.random() so
      // the hall is identical on every reload -- same rule as Panel.jsx's
      // seed prop (see ../draw.js).
      const rand = rng(50807);
      crowd = [];
      for (let i = 0; i < 14; i += 1) {
        const far = rand() > 0.55;
        crowd.push({
          x: W * 0.04 + rand() * W * 0.92,
          // Two bands -- a far row just behind the floor line and a near
          // row at the frame edge -- so the bottom reads as depth rather
          // than as a sticker strip.
          y: far ? geo.floorY + H * 0.02 + rand() * H * 0.03 : H * 0.95 + rand() * H * 0.06,
          h: far ? H * 0.07 + rand() * H * 0.03 : H * 0.11 + rand() * H * 0.04,
          pose: rand() > 0.72 ? 3 : Math.floor(rand() * 3),
          far,
          phase: rand() * Math.PI * 2,
        });
      }
      crowd.sort((a, b) => a.y - b.y);

      // Chair stacks and trestles waiting against the back wall. Height
      // is capped below the meter labels' baseline on purpose: they run
      // the full width of the hall and a tall stack would sit behind a
      // label rather than behind the board.
      props = [];
      for (let i = 0; i < 7; i += 1) {
        props.push({
          x: W * 0.02 + rand() * W * 0.94,
          w: W * 0.05 + rand() * W * 0.06,
          h: H * 0.035 + rand() * H * 0.04,
        });
      }

      // 1-4 select a meter. engine.js's KEY_MAP has no digits and this
      // scene must not edit that file (five scenes share it), so the keys
      // are handled here and released in dispose(). The button/link guard
      // mirrors engine.js's own: the canvas shares the page with real
      // chrome, and a visitor who tabbed to it must keep it working.
      keyHandler = (event) => {
        const index = DIGIT_CODES.indexOf(event.code);
        if (index < 0) return;
        const target = event.target;
        if (target instanceof HTMLElement && target.closest('button, a, input, select, textarea')) {
          return;
        }
        event.preventDefault();
        selectExact(index, ctx);
      };
      window.addEventListener('keydown', keyHandler);

      ctx.emit('progress', { value: 0 });
    },

    dispose() {
      if (keyHandler) window.removeEventListener('keydown', keyHandler);
      keyHandler = null;
    },

    update(dt, ctx) {
      shake = Math.max(0, shake - dt * 4);
      if (finished) return;

      elapsed += dt;

      if (ctx.input.pressed('left')) selectDirection(-1, ctx);
      if (ctx.input.pressed('right')) selectDirection(1, ctx);

      // Who is being worked this step. A pointer that is actually on a
      // column beats the keyboard selection, because tapping a meter must
      // never mean "work the other one I had selected." A dead column is
      // not a valid hit at all -- it neither selects nor works, since
      // there is nothing left there to hold a thumb on.
      working = -1;
      const pointer = ctx.input.pointer;
      const hit = pointer.down
        ? geo.columns.findIndex(
            (col, i) =>
              !meters[i].dead &&
              pointer.x >= col.cellX &&
              pointer.x <= col.cellX + col.cellW &&
              pointer.y >= col.top - 30 &&
              pointer.y <= col.labelY + 10,
          )
        : -1;
      if (hit >= 0) {
        selectExact(hit, ctx);
        working = hit;
      } else if (ctx.input.held('action') && !meters[selected].dead) {
        // Space/Enter, and also a hold anywhere off the board -- so a
        // phone player is never forced to keep a thumb over the meter
        // they are trying to read. Guarded against a dead selection: the
        // selection is only ever moved onto a living meter (see the death
        // handling below), but this stays safe either way.
        working = selected;
      }

      for (let i = 0; i < meters.length; i += 1) {
        const meter = meters[i];
        if (meter.dead) continue; // nothing left to drain or refill

        let value = meter.value - drainRate(meter, METER_SPECS[i], elapsed) * dt;
        if (i === working) value += REFILL * dt;

        if (value <= 0) {
          value = 0;
          meter.dead = true;
          deaths += 1;
          shake = 1;
          ctx.sound('toast');
        }
        meter.value = clamp(value, 0, 1);
      }

      // The selection must never point at a corpse: if the meter the
      // player was on just died, or already was dead, move on to the next
      // living one so the next held frame has somewhere real to go.
      if (meters[selected].dead) {
        const idx = nextAlive(selected, 1);
        if (idx >= 0) selected = idx;
      }

      // Everyone is dead: the room has nothing left to run. This is the
      // one way the day can end before its clock does -- flush every beat
      // not yet shown, in order, before ending, so a total loss still
      // banks the whole episode rather than gating content behind skill.
      if (!finished && meters.every((meter) => meter.dead)) {
        while (revealed < total) {
          ctx.emit('reveal', { index: revealed });
          revealed += 1;
        }
        finish(ctx, 'end');
        return;
      }

      // The payload. Time-based rather than success-based, because this
      // mechanic has no discrete "win" event to hang a beat on, and the
      // beats are the reason the screen exists -- so they are paid out
      // across the day and a full run banks all of them in order.
      const day = clamp(elapsed / DAY, 0, 1);
      while (revealed < total && day >= milestones[revealed]) {
        ctx.emit('reveal', { index: revealed });
        revealed += 1;
        ctx.sound('select');
      }

      // Throttled: emitting per frame would re-render the React chrome 60
      // times a second for a bar that has moved a pixel.
      if (day - lastProgress >= 0.01 || day >= 1) {
        ctx.emit('progress', { value: day });
        lastProgress = day;
      }

      if (elapsed >= DAY) {
        finish(ctx, meters.every((meter) => meter.value > 0) ? 'win' : 'end');
      }
    },

    draw(g, ctx) {
      const { W, H, palette } = ctx;

      g.fillStyle = palette.ink;
      g.fillRect(0, 0, W, H);
      const sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, rgba(palette.dusk, 0.5));
      sky.addColorStop(1, rgba(palette.ink, 1));
      g.fillStyle = sky;
      g.fillRect(0, 0, W, H);

      // The one meter worth spending --signal on: the lowest, and only
      // once it is genuinely in trouble. Root CLAUDE.md section 3 caps the
      // accent at three uses per screen; this screen spends it on one
      // column's fill and that column's readout, and nowhere else -- not
      // on the collapse mark, which is drawn in --bone hatch precisely so
      // the red keeps meaning "this one, now."
      let criticalIndex = -1;
      let lowest = CRITICAL_AT;
      for (let i = 0; i < meters.length; i += 1) {
        if (!meters[i].dead && meters[i].value < lowest) {
          lowest = meters[i].value;
          criticalIndex = i;
        }
      }

      g.save();
      if (shake > 0 && !ctx.reducedMotion) {
        g.translate((Math.random() - 0.5) * 8 * shake, (Math.random() - 0.5) * 8 * shake);
      }

      drawHall(g, ctx, geo, props);

      const pulse = ctx.reducedMotion ? 0 : Math.sin(ctx.time * 6) * 0.5 + 0.5;
      for (let i = 0; i < meters.length; i += 1) {
        drawColumn(g, ctx, geo, geo.columns[i], meters[i], {
          working: i === working,
          selected: i === selected,
          critical: i === criticalIndex,
          rate: drainRate(meters[i], METER_SPECS[i], elapsed),
          pulse,
        });
      }

      // THE ROOM is the meter the room itself reacts to -- index 3.
      drawCrowd(g, ctx, crowd, meters[3] ? meters[3].value : 1);

      g.restore();

      drawClock(g, ctx, geo, elapsed, milestones);

      vignette(g, W, H, palette, 0.5);
      grain(g, W, H, ctx.reducedMotion ? 0.03 : 0.05, ctx.reducedMotion, ctx.frame);
    },
  };
}

/* -- Drawing ---------------------------------------------------------
   Module-level like stack.js's helpers: none of these hold state, and
   keeping them out of the closure makes it obvious that they cannot. */

/**
 * The room: back wall, overhead truss, waiting chair stacks, a lit
 * doorway and its spill across the floor. The doorway is this scene's
 * light source and every rim light in the file points at it.
 */
function drawHall(g, ctx, geo, props) {
  const { W, H, palette } = ctx;

  g.fillStyle = rgba(palette.shadow, 0.34);
  g.fillRect(0, H * 0.13, W, geo.floorY - H * 0.13);

  // Truss and hangers -- the "still being set up" read, in two strokes.
  g.strokeStyle = rgba(palette.bone, 0.12);
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(0, H * 0.155);
  g.lineTo(W, H * 0.155);
  g.moveTo(0, H * 0.178);
  g.lineTo(W, H * 0.178);
  for (let x = W * 0.04; x < W; x += W * 0.075) {
    g.moveTo(x, H * 0.155);
    g.lineTo(x + W * 0.02, H * 0.178);
  }
  g.stroke();

  // litWindow rather than a pale rect: a flat fill reads as a grey
  // square, not as a light source (see ../draw.js).
  litWindow(g, geo.doorX, geo.doorY - geo.doorH, geo.doorW, geo.doorH, palette, 0.9);
  litWindow(g, geo.stageX, geo.stageY - geo.stageH, geo.stageW, geo.stageH, palette, 0.55);

  g.fillStyle = rgba(palette.ink, 0.92);
  g.fillRect(0, geo.floorY, W, H - geo.floorY);
  g.fillStyle = rgba(palette.bone, 0.14);
  g.fillRect(0, geo.floorY, W, 2);
  // Spill on the floor, thinning away from the door.
  halftone(g, geo.doorX, geo.floorY, W * 0.42, H - geo.floorY, rgba(palette.bone, 0.16), 'right', 10, 613);
  // And the wall above the floor falling off upward into the dark.
  halftone(g, 0, geo.floorY - H * 0.18, W, H * 0.18, rgba(palette.bone, 0.09), 'up', 12, 271);

  for (const prop of props) {
    const paint = (gg) => gg.fillRect(prop.x, geo.floorY - prop.h, prop.w, prop.h);
    withRim(g, paint, -2, -1, rgba(palette.bone, 0.16), rgba(palette.ink, 0.92));
  }
}

/**
 * One meter. Ink shaft, bone fill rising inside it, a halftone falloff
 * above the surface so the fill reads as light in a column rather than
 * as a progress bar. A dead meter (value permanently at zero) skips all
 * of that and draws as a struck-out, blacked-out shaft instead -- it
 * must be unmistakable at a glance that this column is gone for good,
 * not just currently empty.
 */
function drawColumn(g, ctx, geo, col, meter, opts) {
  const { palette } = ctx;
  const { working, selected, critical, rate, pulse } = opts;
  const { barX: x, top: y, barW: w, h } = col;

  if (meter.dead) {
    // Blacked out -- darker than the live shaft's --shadow fill, so it
    // reads as a hole in the board rather than merely an empty column.
    g.fillStyle = rgba(palette.ink, 0.82);
    g.fillRect(x, y, w, h);

    // A single strike drawn corner-to-corner is the "struck-out" mark
    // itself -- unambiguous at this size, and cheaper than a hatch fill.
    g.strokeStyle = rgba(palette.bone, 0.3);
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(x + 4, y + h - 4);
    g.lineTo(x + w - 4, y + 4);
    g.stroke();

    strokeRough(g, x, y, w, h, rgba(palette.bone, 0.16), col.seed, 3, 2);

    text(g, '0', col.cx, y - 34, {
      size: 15,
      face: BODY,
      weight: '600',
      color: rgba(palette.bone, 0.28),
      align: 'center',
    });

    text(g, meter.name, col.cx, col.labelY, {
      size: geo.labelSize,
      face: DISPLAY,
      color: rgba(palette.bone, 0.32),
      align: 'center',
      tracking: 1.5,
    });
    return;
  }

  g.fillStyle = rgba(palette.shadow, 0.55);
  g.fillRect(x, y, w, h);

  const inset = 3;
  const fillH = Math.max(0, meter.value * (h - inset * 2));
  const fillY = y + h - inset - fillH;
  const tint = critical ? palette.signal : palette.bone;

  if (fillH > 0) {
    g.fillStyle = rgba(tint, (working ? 0.88 : 0.66) + (working ? pulse * 0.1 : 0));
    g.fillRect(x + inset, fillY, w - inset * 2, fillH);
    // Surface cap: the brightest line in the column, so the level is
    // readable at a glance from anywhere on the board.
    g.fillStyle = rgba(palette.bone, working ? 0.95 : 0.72);
    g.fillRect(x + inset, fillY, w - inset * 2, 2);
    const above = Math.min(FALLOFF_H, fillY - y);
    if (above > 0) {
      halftone(g, x + inset, fillY - above, w - inset * 2, above, rgba(tint, 0.3), 'up', 7, col.seed);
    }
  }

  strokeRough(g, x, y, w, h, rgba(palette.bone, working ? 0.6 : 0.28), col.seed, 3, 2);

  // Selection caret, drawn rather than typed -- a glyph from a font would
  // be one more thing to get wrong at this size. Never drawn on a dead
  // column (handled above, this function returns before reaching here).
  if (selected) {
    g.beginPath();
    g.moveTo(col.cx - 7, y - 26);
    g.lineTo(col.cx + 7, y - 26);
    g.lineTo(col.cx, y - 17);
    g.closePath();
    g.fillStyle = rgba(palette.bone, working ? 0.9 : 0.5);
    g.fill();
  }

  text(g, `${Math.round(meter.value * 100)}`, col.cx, y - 34, {
    size: 15,
    face: BODY,
    weight: '600',
    color: critical ? palette.signal : rgba(palette.bone, 0.5),
    align: 'center',
  });

  text(g, meter.name, col.cx, col.labelY, {
    size: geo.labelSize,
    face: DISPLAY,
    color: rgba(palette.bone, working ? 0.95 : 0.55),
    align: 'center',
    tracking: 1.5,
  });

  // Drain pips: how fast this one is going right now. Without them the
  // per-meter rhythms are invisible, the board looks like four identical
  // bars, and the read-the-room decision flattens into a rotation. The
  // thresholds are the measured 33rd and 66th percentiles of every
  // meter's rate across a whole day, so the three states occur about
  // equally often instead of one of them being effectively dead.
  const pips = rate > 0.07 ? 3 : rate > 0.043 ? 2 : 1;
  g.fillStyle = rgba(palette.bone, 0.32);
  for (let i = 0; i < pips; i += 1) {
    const px = col.cx - (pips - 1) * 6 + i * 12;
    g.beginPath();
    g.moveTo(px - 4, col.pipY - 4);
    g.lineTo(px + 4, col.pipY - 4);
    g.lineTo(px, col.pipY + 3);
    g.closePath();
    g.fill();
  }
}

/**
 * Volunteers and guests along the bottom of the frame, rim-lit toward
 * the doorway on the left. When THE ROOM bottoms out the standing
 * figures sit down: the only place a meter changes the world rather than
 * the HUD, and worth keeping if this file is ever edited.
 */
function drawCrowd(g, ctx, crowd, roomValue) {
  const { palette } = ctx;
  const slump = roomValue < 0.3;
  for (const person of crowd) {
    const bob = ctx.reducedMotion ? 0 : Math.sin(ctx.time * 1.6 + person.phase) * 1.6;
    const pose = slump && person.pose !== 3 ? 3 : person.pose;
    // Anyone to the right of the door faces it.
    const paint = (gg) => figure(gg, person.x, person.y + bob, person.h, pose, person.x > ctx.W * 0.2);
    withRim(
      g,
      paint,
      -2,
      -1,
      rgba(palette.bone, person.far ? 0.16 : 0.24),
      rgba(palette.ink, person.far ? 0.85 : 0.96),
    );
  }
}

/** The day, running left to right, notched at every beat milestone. */
function drawClock(g, ctx, geo, seconds, milestones) {
  const { palette } = ctx;
  const y = geo.clockY;
  const span = geo.x1 - geo.x0;
  const k = clamp(seconds / DAY, 0, 1);

  g.fillStyle = rgba(palette.bone, 0.14);
  g.fillRect(geo.x0, y, span, 3);
  g.fillStyle = rgba(palette.bone, 0.5);
  g.fillRect(geo.x0, y, span * k, 3);

  g.fillStyle = rgba(palette.bone, 0.28);
  for (const m of milestones) g.fillRect(geo.x0 + span * m - 1, y - 6, 2, 6);

  const hx = geo.x0 + span * k;
  g.beginPath();
  g.moveTo(hx, y - 10);
  g.lineTo(hx + 6, y - 1);
  g.lineTo(hx - 6, y - 1);
  g.closePath();
  g.fillStyle = rgba(palette.bone, 0.8);
  g.fill();
}
