import {
  BODY,
  DISPLAY,
  clamp,
  grain,
  halftone,
  rgba,
  rng,
  text,
  vignette,
} from '../draw.js';

/**
 * THE STACK -- episode 1, EDUCATION.
 *
 * REFERENCE IMPLEMENTATION. The other four minigames are written against
 * the same contract; if you are building one of those, read this file
 * first and copy its shape:
 *
 *   1. A factory `createX(config)` returning { init, update, draw }.
 *   2. `config.beats` is the ONLY source of copy. Never write a fact
 *      into a scene file -- games.js owns the words, the scene owns the
 *      mechanic.
 *   3. Reveal by index, in order: ctx.emit('reveal', { index }) exactly
 *      once per beat, when the player earns it.
 *   4. ctx.emit('progress', { value }) with 0..1 whenever it changes.
 *   5. ctx.emit('done', { outcome, stat }) once, at the end. `outcome`
 *      is 'win' | 'end'. There is no 'lose': a run that ends early still
 *      shows the results card with whatever was uncovered, because a
 *      dead end that hides content would gate the resume behind skill
 *      (root CLAUDE.md section 6 rule 1).
 *   6. Draw only through ../draw.js helpers and ctx.palette. No colour
 *      literals, no other font stacks.
 *   7. Honour ctx.reducedMotion: drop shake, drift and idle bobbing;
 *      keep the mechanic.
 *
 * THE MECHANIC
 * A block slides back and forth above the tower. Tap/Space drops it.
 * The overlap with the block below becomes the new block; the overhang
 * falls away. Eight blocks, one per row of the transcript, and the tower
 * is drawn as a building with lit windows -- so what you are physically
 * building is another tower in the same skyline the title screen shows.
 * That is the whole reason this mechanic was chosen over a quiz.
 *
 * It gets harder honestly: each landing speeds the slide up slightly,
 * and sloppy drops narrow the tower, so a careless early run makes the
 * late blocks genuinely hard. It is still Flappy-tier -- one button, no
 * combos, readable in one glance.
 */

const BLOCK_H = 44;
const START_W = 300;
const BASE_SPEED = 190;
const MIN_W = 24;

export function createStack(config) {
  const { beats = [], onDone = () => {} } = config;

  /** @type {{x:number,w:number,seed:number}[]} bottom-up */
  let tower = [];
  let moving = null;
  let landed = 0;
  let misses = 0;
  let finished = false;
  let shake = 0;
  /** Overhang shards still falling, purely decorative. */
  let debris = [];
  let flash = 0;

  const total = beats.length;

  function spawnBlock() {
    const below = tower[tower.length - 1];
    moving = {
      x: below.x - 150 + (landed % 2 ? 300 : 0),
      w: below.w,
      dir: landed % 2 ? -1 : 1,
      speed: BASE_SPEED + landed * 16,
      seed: 900 + landed * 13,
    };
  }

  function finish(ctx, outcome) {
    if (finished) return;
    finished = true;
    ctx.emit('done', { outcome, stat: `${landed} of ${total} placed` });
    onDone(outcome);
  }

  return {
    init(ctx) {
      // The foundation is free -- you never lose on block one.
      tower = [{ x: (ctx.W - START_W) / 2, w: START_W, seed: 7 }];
      landed = 0;
      misses = 0;
      finished = false;
      debris = [];
      spawnBlock();
      ctx.emit('progress', { value: 0 });
    },

    update(dt, ctx) {
      shake = Math.max(0, shake - dt * 4);
      flash = Math.max(0, flash - dt * 3);
      for (const d of debris) {
        d.vy += 900 * dt;
        d.y += d.vy * dt;
        d.rot += d.spin * dt;
      }
      debris = debris.filter((d) => d.y < ctx.H + 400);

      if (finished || !moving) return;

      // Slide.
      moving.x += moving.dir * moving.speed * dt;
      const limit = 40;
      if (moving.x < limit) {
        moving.x = limit;
        moving.dir = 1;
      } else if (moving.x + moving.w > ctx.W - limit) {
        moving.x = ctx.W - limit - moving.w;
        moving.dir = -1;
      }

      if (!ctx.input.pressed('action')) return;

      // Drop.
      const below = tower[tower.length - 1];
      const left = Math.max(moving.x, below.x);
      const right = Math.min(moving.x + moving.w, below.x + below.w);
      const overlap = right - left;

      if (overlap <= 0) {
        // Missed the tower entirely.
        misses += 1;
        shake = 1;
        ctx.sound('toast');
        debris.push({
          x: moving.x,
          y: ctx.H - 90 - landed * BLOCK_H,
          w: moving.w,
          vy: -60,
          rot: 0,
          spin: 2.4,
        });
        if (misses >= 3) {
          finish(ctx, 'end');
          return;
        }
        spawnBlock();
        return;
      }

      // Land. The overhang falls away as debris.
      if (moving.x < left) {
        debris.push({
          x: moving.x,
          y: ctx.H - 90 - landed * BLOCK_H,
          w: left - moving.x,
          vy: -40,
          rot: 0,
          spin: -2,
        });
      }
      if (moving.x + moving.w > right) {
        debris.push({
          x: right,
          y: ctx.H - 90 - landed * BLOCK_H,
          w: moving.x + moving.w - right,
          vy: -40,
          rot: 0,
          spin: 2,
        });
      }

      tower.push({ x: left, w: Math.max(MIN_W, overlap), seed: 40 + landed * 31 });
      landed += 1;
      flash = 1;
      ctx.sound('select');

      // The payload: one beat per placed block, in order.
      if (landed - 1 < total) ctx.emit('reveal', { index: landed - 1 });
      ctx.emit('progress', { value: clamp(landed / total, 0, 1) });

      if (landed >= total) {
        finish(ctx, 'win');
        return;
      }
      spawnBlock();
    },

    draw(g, ctx) {
      const { W, H, palette } = ctx;

      g.fillStyle = palette.ink;
      g.fillRect(0, 0, W, H);

      // Night sky and a suggestion of the wider skyline, so this tower is
      // being built somewhere rather than floating in a void.
      const sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, rgba(palette.dusk, 0.55));
      sky.addColorStop(1, rgba(palette.ink, 1));
      g.fillStyle = sky;
      g.fillRect(0, 0, W, H);
      drawBackdrop(g, ctx);

      g.save();
      if (shake > 0 && !ctx.reducedMotion) {
        g.translate((Math.random() - 0.5) * 9 * shake, (Math.random() - 0.5) * 9 * shake);
      }

      // The camera rises as the tower does, so the top block stays in a
      // comfortable band instead of climbing off the frame.
      const camera = Math.max(0, landed * BLOCK_H - 150);
      g.translate(0, camera);

      const groundY = H - 46;
      g.fillStyle = palette.ink;
      g.fillRect(0, groundY - camera + camera, W, 200);
      g.fillStyle = rgba(palette.bone, 0.14);
      g.fillRect(0, groundY, W, 2);

      for (let i = 0; i < tower.length; i += 1) {
        const block = tower[i];
        const y = groundY - (i + 1) * BLOCK_H;
        drawFloorBlock(g, ctx, block, y, i, i === tower.length - 1 ? flash : 0);
      }

      for (const d of debris) {
        g.save();
        g.translate(d.x + d.w / 2, d.y);
        g.rotate(d.rot);
        g.fillStyle = rgba(palette.shadow, 0.85);
        g.fillRect(-d.w / 2, -BLOCK_H / 2, d.w, BLOCK_H);
        g.restore();
      }

      if (moving && !finished) {
        const y = groundY - (tower.length + 1) * BLOCK_H;
        drawFloorBlock(g, ctx, moving, y, tower.length, 0, true);
        // Drop line, so the timing is readable rather than guessed.
        g.strokeStyle = rgba(palette.signal, 0.5);
        g.lineWidth = 2;
        g.setLineDash([6, 8]);
        g.beginPath();
        g.moveTo(moving.x + moving.w / 2, y + BLOCK_H);
        g.lineTo(moving.x + moving.w / 2, groundY - tower.length * BLOCK_H);
        g.stroke();
        g.setLineDash([]);
      }

      g.restore();

      // HUD.
      text(g, `${landed} / ${total}`, W - 34, 44, {
        size: 20,
        face: DISPLAY,
        color: rgba(palette.bone, 0.82),
        align: 'right',
      });
      text(g, misses ? `${3 - misses} tries left` : 'Drop it clean', W - 34, 66, {
        size: 12,
        face: BODY,
        color: misses ? palette.signal : rgba(palette.bone, 0.45),
        align: 'right',
        tracking: 1,
      });

      vignette(g, W, H, palette, 0.5);
      grain(g, W, H, ctx.reducedMotion ? 0.03 : 0.05, ctx.reducedMotion, ctx.frame);
    },
  };
}

/**
 * A tower block, drawn as a floor of a building: ink mass, lit window
 * grid, rim on the lit side. Same vocabulary as the skyline in
 * overworld.js and TitleBackdrop.jsx, on purpose -- when the run ends,
 * what you have built should look like it belongs in that city.
 */
function drawFloorBlock(g, ctx, block, y, index, flash = 0, ghost = false) {
  const { palette } = ctx;
  const rand = rng(block.seed || index + 1);

  g.fillStyle = ghost ? rgba(palette.shadow, 0.5) : palette.shadow;
  g.fillRect(block.x, y, block.w, BLOCK_H);

  // Lit windows, spaced to the block's own width so a narrow block does
  // not end up with a single lonely pane.
  const cols = Math.max(1, Math.floor(block.w / 30));
  const cellW = block.w / cols;
  for (let c = 0; c < cols; c += 1) {
    const lit = rand() > 0.32;
    const wx = block.x + c * cellW + cellW * 0.28;
    const wy = y + BLOCK_H * 0.28;
    const ww = cellW * 0.44;
    const wh = BLOCK_H * 0.44;
    if (ww < 4) continue;
    g.fillStyle = lit
      ? rgba(palette.bone, ghost ? 0.35 : 0.72 + flash * 0.28)
      : rgba(palette.ink, 0.7);
    g.fillRect(wx, wy, ww, wh);
  }

  // Edges.
  g.strokeStyle = rgba(palette.bone, ghost ? 0.3 : 0.35);
  g.lineWidth = 2;
  g.strokeRect(block.x, y, block.w, BLOCK_H);

  if (flash > 0) {
    g.fillStyle = rgba(palette.bone, 0.22 * flash);
    g.fillRect(block.x, y, block.w, BLOCK_H);
  }
}

function drawBackdrop(g, ctx) {
  const { W, H, palette } = ctx;
  const rand = rng(1177);
  const base = H - 46;
  g.fillStyle = rgba(palette.ink, 0.85);
  for (let i = 0; i < 16; i += 1) {
    const w = 50 + rand() * 90;
    const h = 60 + rand() * 150;
    const x = rand() * (W + 120) - 60;
    g.fillRect(x, base - h, w, h);
  }
  halftone(g, 0, base - 120, W, 120, rgba(palette.bone, 0.16), 'up', 12, 91);
}
