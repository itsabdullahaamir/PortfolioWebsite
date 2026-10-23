import {
  BODY,
  DISPLAY,
  clamp,
  figure,
  fillRough,
  grain,
  halftone,
  rgba,
  strokeRough,
  text,
  vignette,
} from '../draw.js';

/**
 * RUN IT -- episode 5, PROJECTS.
 *
 * REPLACES `liveGraph.js` ("ONE LIVE GRAPH"), which is deleted. That
 * scene was rebuilt once already after being reported as "pointless and
 * can't be understood", and the rebuild did not fix the real problem:
 * wiring five boxes onto a diagram is a thing you LOOK at, not a thing
 * you DO. You dragged five times, the picture filled in, and nothing you
 * did could be wrong. There was no decision, so there was no game.
 *
 * THE MECHANIC. You write a short program, press RUN, and watch it
 * execute. A runner crosses a course of cells; gaps and walls are in the
 * way. Two instructions:
 *
 *   STEP  advance one cell. Fails if that cell is a gap or a wall.
 *   HOP   advance two cells, clearing whatever is between. Fails if the
 *         landing cell is a gap or a wall.
 *
 * Reach the flag and the level clears. Overshoot it, or walk into a gap,
 * and the run fails ON THE INSTRUCTION THAT WAS WRONG, which is
 * highlighted so you can fix that one slot and run again. That loop --
 * write it, run it, watch it break, fix the one line -- is the verb, and
 * it is why this mechanic was chosen for the projects episode over
 * anything that merely assembles a picture.
 *
 * WHY THE FIRST RUN ALWAYS WINS. Level one is flat ground with no
 * obstacles and every slot pre-filled with STEP, so a visitor who
 * presses RUN without reading anything clears it. That is the tutorial,
 * and it is deliberate twice over: it teaches the loop by letting it
 * succeed, and it guarantees `scripts/verify-scenes.mjs` sees at least
 * one reveal from a bot that is only mashing buttons. Do not add an
 * obstacle to level one.
 *
 * WHY THERE IS A SESSION CLOCK AND A RUN BUDGET. A scene must emit
 * 'done' exactly once, and the verifier drives one input mode by HOLDING
 * action, which produces a single edge and then nothing for the rest of
 * the run. Without a terminal condition independent of input, that mode
 * would never finish. Both budgets are generous and neither gates
 * content: an early end still lands on the results card with every beat
 * printed, reached or not (root CLAUDE.md section 6 rules 1 and 2, the
 * same argument that lets FORTY-EIGHT HOURS carry a clock).
 *
 * CONTRACT. Written against ./stack.js, which is the reference
 * implementation; read that first. In particular: `config.beats` is the
 * only source of copy. The two instruction names below are mechanical UI
 * words, not resume content, which is the same latitude liveGraph.js had
 * for its fallback module labels.
 */

const OP_STEP = 0;
const OP_HOP = 1;
const OP_NAMES = ['STEP', 'HOP'];
const OP_SPAN = [1, 2];

const CELL_W = 68;
const CELL_H = 24;
const COURSE_X = 70;
const COURSE_Y = 296;

const SLOT_W = 76;
const SLOT_GAP = 6;
const SLOT_X = 70;
const SLOT_Y = 398;
const SLOT_H = 58;

const RUN_X = 806;
const RUN_W = 118;

const OP_TIME = 0.36;
const FAIL_HOLD = 1.15;
const CLEAR_HOLD = 1.35;
const RUN_BUDGET = 16;
const SESSION_SECONDS = 80;

/** Cell kinds. FLOOR is walkable; GAP and WALL are not. */
const FLOOR = 0;
const GAP = 1;
const WALL = 2;

/**
 * Build level `n` (1-based). Obstacles are never adjacent and never on
 * cell 1, which is what guarantees the greedy solver below always finds
 * a path -- i.e. every level this generates is solvable.
 */
function buildLevel(n) {
  const length = Math.min(4 + n, 11);
  const cells = new Array(length + 1).fill(FLOOR);
  const wanted = Math.min(n - 1, 3);
  let placed = 0;
  // Deterministic placement: spread obstacles across the middle of the
  // course, skipping anything that would sit next to one already placed.
  for (let i = 2; i < length && placed < wanted; i += 1) {
    const slot = 2 + ((i * 3 + n * 2) % Math.max(1, length - 2));
    if (slot >= length) continue;
    if (cells[slot] !== FLOOR) continue;
    if (cells[slot - 1] !== FLOOR || cells[slot + 1] !== FLOOR) continue;
    cells[slot] = (slot + n) % 2 === 0 ? GAP : WALL;
    placed += 1;
  }
  return { cells, length };
}

/** The canonical solution, used only to decide how many slots a level
 *  gets. The player still has to find it. */
function solve(level) {
  const ops = [];
  let pos = 0;
  let guard = 0;
  while (pos < level.length && guard < 40) {
    guard += 1;
    const next = level.cells[pos + 1];
    if (pos + 1 === level.length || next === FLOOR) {
      ops.push(OP_STEP);
      pos += 1;
    } else {
      ops.push(OP_HOP);
      pos += 2;
    }
  }
  return ops;
}

export function createRunIt(config) {
  const { beats = [], onDone = () => {} } = config;
  const total = beats.length;

  let level = null;
  let levelIndex = 0;
  let program = [];
  let cursor = 0;
  let phase = 'edit'; // 'edit' | 'running' | 'fail' | 'clear'
  let pc = 0;
  let runnerPos = 0;
  let runnerFrom = 0;
  let opClock = 0;
  let holdClock = 0;
  let failedSlot = -1;
  let runsLeft = RUN_BUDGET;
  let cleared = 0;
  let finished = false;
  let elapsed = 0;
  let bump = 0;

  function loadLevel(index) {
    level = buildLevel(index + 1);
    const need = solve(level).length;
    program = new Array(need).fill(OP_STEP);
    cursor = 0;
    pc = 0;
    runnerPos = 0;
    runnerFrom = 0;
    phase = 'edit';
    failedSlot = -1;
  }

  function finish(ctx, outcome) {
    if (finished) return;
    finished = true;
    ctx.emit('done', { outcome, stat: `${cleared} of ${total} levels cleared` });
    onDone(outcome);
  }

  function startRun(ctx) {
    if (phase !== 'edit' || runsLeft <= 0) return;
    runsLeft -= 1;
    phase = 'running';
    pc = 0;
    runnerPos = 0;
    runnerFrom = 0;
    opClock = 0;
    failedSlot = -1;
    ctx.sound?.('navigate');
  }

  function slotAt(x, y) {
    if (y < SLOT_Y || y > SLOT_Y + SLOT_H) return -1;
    for (let i = 0; i < program.length; i += 1) {
      const sx = SLOT_X + i * (SLOT_W + SLOT_GAP);
      if (x >= sx && x <= sx + SLOT_W) return i;
    }
    return -1;
  }

  return {
    init(ctx) {
      levelIndex = 0;
      cleared = 0;
      runsLeft = RUN_BUDGET;
      finished = false;
      elapsed = 0;
      loadLevel(0);
      ctx.emit('progress', { value: 0 });
    },

    update(dt, ctx) {
      if (finished) return;
      elapsed += dt;
      bump = Math.max(0, bump - dt * 3);

      if (elapsed >= SESSION_SECONDS) {
        finish(ctx, cleared >= total ? 'win' : 'end');
        return;
      }

      const input = ctx.input;

      if (phase === 'edit') {
        // Pointer first, and it CONSUMES the event: engine.js raises both
        // pointer.pressed and the 'action' key on one tap so a scene can
        // be written for either, and a scene that handles both on the
        // same frame fires twice (a documented defect in handsUp.js).
        let consumed = false;
        if (input.pointer.pressed) {
          const { x, y } = input.pointer;
          const hit = slotAt(x, y);
          if (hit >= 0) {
            cursor = hit;
            program[hit] = (program[hit] + 1) % OP_NAMES.length;
            ctx.sound?.('navigate');
            consumed = true;
          } else if (x >= RUN_X && x <= RUN_X + RUN_W && y >= SLOT_Y && y <= SLOT_Y + SLOT_H) {
            startRun(ctx);
            consumed = true;
          }
        }
        if (!consumed) {
          if (input.pressed('left')) cursor = (cursor - 1 + program.length) % program.length;
          if (input.pressed('right')) cursor = (cursor + 1) % program.length;
          if (input.pressed('up') || input.pressed('down')) {
            program[cursor] = (program[cursor] + 1) % OP_NAMES.length;
            ctx.sound?.('navigate');
          }
          if (input.pressed('action')) startRun(ctx);
        }
        if (runsLeft <= 0) finish(ctx, cleared >= total ? 'win' : 'end');
        return;
      }

      if (phase === 'running') {
        opClock += dt;
        if (opClock < OP_TIME) return;
        opClock = 0;

        if (pc >= program.length) {
          // Program ran out before the flag.
          failedSlot = program.length - 1;
          phase = 'fail';
          holdClock = 0;
          bump = 1;
          return;
        }

        const op = program[pc];
        const target = runnerPos + OP_SPAN[op];
        runnerFrom = runnerPos;

        if (target > level.length) {
          failedSlot = pc; // overshot the flag
          phase = 'fail';
          holdClock = 0;
          bump = 1;
          return;
        }
        if (level.cells[target] !== FLOOR) {
          failedSlot = pc; // walked into a gap or a wall
          phase = 'fail';
          holdClock = 0;
          bump = 1;
          return;
        }

        runnerPos = target;
        pc += 1;

        if (runnerPos === level.length) {
          phase = 'clear';
          holdClock = 0;
          if (levelIndex < total) {
            ctx.emit('reveal', { index: levelIndex });
            ctx.sound?.('select');
          }
          cleared += 1;
          ctx.emit('progress', { value: clamp(cleared / total, 0, 1) });
        }
        return;
      }

      holdClock += dt;
      if (phase === 'fail' && holdClock >= FAIL_HOLD) {
        // The program is LEFT ALONE. Fixing one slot and running again is
        // the whole mechanic; wiping it would make failure a punishment
        // instead of information.
        phase = 'edit';
        runnerPos = 0;
        runnerFrom = 0;
        pc = 0;
        cursor = failedSlot >= 0 ? failedSlot : cursor;
        if (runsLeft <= 0) finish(ctx, cleared >= total ? 'win' : 'end');
        return;
      }
      if (phase === 'clear' && holdClock >= CLEAR_HOLD) {
        levelIndex += 1;
        if (levelIndex >= total) {
          finish(ctx, 'win');
          return;
        }
        loadLevel(levelIndex);
      }
    },

    draw(g, ctx) {
      const p = ctx.palette;
      const { W, H } = ctx;

      g.fillStyle = p.ink;
      g.fillRect(0, 0, W, H);

      // A pool of light under the course, so the band reads as a lit
      // bench rather than as a floating strip.
      halftone(g, COURSE_X - 30, COURSE_Y - 120, CELL_W * 11 + 60, 150, rgba(p.bone, 0.1), 'up', 7, 31);

      // --- Status line -------------------------------------------------
      text(g, `LEVEL ${levelIndex + 1} OF ${total}`, COURSE_X, 70, {
        size: 13, face: BODY, weight: '600', color: rgba(p.bone, 0.5), tracking: 2.2,
      });
      text(g, `${runsLeft} RUNS LEFT`, W - COURSE_X, 70, {
        size: 13, face: BODY, weight: '600', align: 'right',
        color: runsLeft <= 3 ? p.signal : rgba(p.bone, 0.5), tracking: 2.2,
      });

      const hint =
        phase === 'fail'
          ? 'That instruction failed. Change it and run again.'
          : phase === 'clear'
            ? 'Cleared.'
            : 'Set the instructions, then RUN.';
      text(g, hint, W / 2, 112, {
        size: 17, face: DISPLAY, align: 'center',
        color: phase === 'fail' ? p.signal : rgba(p.bone, 0.8),
      });

      // --- Course ------------------------------------------------------
      for (let i = 0; i <= level.length; i += 1) {
        const x = COURSE_X + i * CELL_W;
        const kind = level.cells[i];
        if (kind === GAP) continue;
        const isFlag = i === level.length;
        const y = kind === WALL ? COURSE_Y - 26 : COURSE_Y;
        const h = kind === WALL ? CELL_H + 26 : CELL_H;
        fillRough(g, x + 3, y, CELL_W - 6, h, rgba(p.bone, kind === WALL ? 0.2 : 0.13), 101 + i * 7, 2.5);
        strokeRough(g, x + 3, y, CELL_W - 6, h, rgba(p.bone, isFlag ? 0.55 : 0.26), 101 + i * 7, 2.5, 1);
        if (isFlag) {
          // The flag: a thin mast and a small pennant, in signal, which is
          // the only accent this scene spends.
          g.strokeStyle = p.signal;
          g.lineWidth = 1.5;
          g.beginPath();
          g.moveTo(x + CELL_W / 2, y - 4);
          g.lineTo(x + CELL_W / 2, y - 48);
          g.stroke();
          g.fillStyle = p.signal;
          g.beginPath();
          g.moveTo(x + CELL_W / 2, y - 48);
          g.lineTo(x + CELL_W / 2 + 26, y - 40);
          g.lineTo(x + CELL_W / 2, y - 32);
          g.closePath();
          g.fill();
        }
      }

      // --- Runner ------------------------------------------------------
      const t = phase === 'running' ? clamp(opClock / OP_TIME, 0, 1) : 1;
      const from = COURSE_X + runnerFrom * CELL_W + CELL_W / 2;
      const to = COURSE_X + runnerPos * CELL_W + CELL_W / 2;
      const rx = from + (to - from) * (ctx.reducedMotion ? 1 : t);
      const arc = phase === 'running' && !ctx.reducedMotion ? Math.sin(t * Math.PI) * 26 : 0;
      const standing = level.cells[runnerPos] === WALL ? COURSE_Y - 26 : COURSE_Y;
      const ry = standing - arc + (phase === 'fail' ? bump * 26 : 0);
      g.fillStyle = rgba(p.bone, phase === 'fail' ? 0.35 : 0.92);
      figure(g, rx, ry, 58, phase === 'running' ? (pc % 2 ? 1 : 2) : 0, false);

      // --- Program bar -------------------------------------------------
      for (let i = 0; i < program.length; i += 1) {
        const x = SLOT_X + i * (SLOT_W + SLOT_GAP);
        const active = phase === 'running' && i === pc;
        const broken = phase === 'fail' && i === failedSlot;
        const sel = phase === 'edit' && i === cursor;
        fillRough(g, x, SLOT_Y, SLOT_W, SLOT_H, rgba(p.bone, active ? 0.17 : 0.07), 400 + i * 11, 2.5);
        strokeRough(
          g, x, SLOT_Y, SLOT_W, SLOT_H,
          broken ? p.signal : rgba(p.bone, sel || active ? 0.6 : 0.22),
          400 + i * 11, 2.5, broken || sel ? 1.4 : 1,
        );
        text(g, OP_NAMES[program[i]], x + SLOT_W / 2, SLOT_Y + 36, {
          size: 15, face: DISPLAY, align: 'center',
          color: broken ? p.signal : rgba(p.bone, active || sel ? 0.95 : 0.6),
        });
        text(g, String(i + 1), x + 6, SLOT_Y + 14, {
          size: 10, face: BODY, weight: '600', color: rgba(p.bone, 0.3),
        });
      }

      // --- RUN button ---------------------------------------------------
      const canRun = phase === 'edit' && runsLeft > 0;
      fillRough(g, RUN_X, SLOT_Y, RUN_W, SLOT_H, rgba(p.signal, canRun ? 0.2 : 0.06), 777, 2.5);
      strokeRough(g, RUN_X, SLOT_Y, RUN_W, SLOT_H, rgba(p.signal, canRun ? 0.9 : 0.3), 777, 2.5, 1.4);
      text(g, 'RUN', RUN_X + RUN_W / 2, SLOT_Y + 38, {
        size: 22, face: DISPLAY, align: 'center', color: rgba(p.signal, canRun ? 1 : 0.35),
      });

      text(g, 'TAP A SLOT TO CHANGE IT  ·  ARROWS AND SPACE ALSO WORK', W / 2, H - 22, {
        size: 11, face: BODY, weight: '600', align: 'center',
        color: rgba(p.bone, 0.3), tracking: 1.6,
      });

      vignette(g, W, H, p);
      grain(g, W, H, 0.03, ctx.reducedMotion, ctx.frame);
    },
  };
}
