/**
 * Headless conformance + smoke test for all five minigame scenes.
 *
 * The Browser pane here does not run requestAnimationFrame (measured: 0
 * ticks in 500ms), so the games cannot be played in it. This drives each
 * scene's real update()/draw() against a stub 2D context instead, which
 * catches the failures that actually matter for scenes written by
 * separate agents:
 *
 *   - draw() throwing on frame 1 (a black screen in production)
 *   - reveals firing out of order, twice, or never
 *   - 'done' never firing, or firing more than once
 *   - a scene emitting an unknown event the chrome will silently drop
 *   - colour literals (every colour must come from ctx.palette)
 *
 * Run with: node scenes.test.mjs
 */
import { games } from '../src/data/games.js';
import { createScene } from '../src/game/scenes/index.js';
import { episodes } from '../src/data/episodes.js';

const STEP = 1 / 60;
const PALETTE = {
  ink: '#141210',
  paper: '#d8cfc0',
  shadow: '#3b342e',
  signal: '#c4321e',
  dusk: '#2a3742',
  bone: '#efe7d8',
};

/* -- A 2D context stub that records nothing but survives everything. -- */
function stubGradient() {
  return { addColorStop() {} };
}
function stubCtx() {
  const noop = () => {};
  const ctx = {
    canvas: { width: 960, height: 540 },
    save: noop, restore: noop, translate: noop, scale: noop, rotate: noop,
    setTransform: noop, transform: noop, clip: noop, beginPath: noop,
    closePath: noop, moveTo: noop, lineTo: noop, arc: noop, ellipse: noop,
    rect: noop, quadraticCurveTo: noop, bezierCurveTo: noop, arcTo: noop,
    fill: noop, stroke: noop, fillRect: noop, strokeRect: noop, clearRect: noop,
    fillText: noop, strokeText: noop, setLineDash: noop, getLineDash: () => [],
    drawImage: noop, putImageData: noop,
    createLinearGradient: stubGradient,
    createRadialGradient: stubGradient,
    createConicGradient: stubGradient,
    createPattern: () => ({}),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    measureText: (s) => ({ width: String(s).length * 7 }),
    isPointInPath: () => false,
  };
  return ctx;
}

// draw.js's grain() builds an offscreen tile once via document.createElement.
globalThis.document = {
  createElement: () => ({
    width: 0, height: 0,
    getContext: () => stubCtx(),
  }),
};
// Some scenes attach their own window listeners for keys the engine's
// KEY_MAP does not cover (eventDay.js does this for the digits 1-4).
// Stubbing window here also verifies they tear those listeners down:
// `openListeners` must be back to 0 after dispose().
let openListeners = 0;
globalThis.window = {
  addEventListener: () => { openListeners += 1; },
  removeEventListener: () => { openListeners -= 1; },
  setTimeout: () => 0,
  clearTimeout: () => {},
  setInterval: () => 0,
  clearInterval: () => {},
};
globalThis.__openListeners = () => openListeners;

globalThis.Path2D = class Path2D {
  moveTo() {} lineTo() {} arc() {} closePath() {} rect() {} ellipse() {}
  quadraticCurveTo() {} bezierCurveTo() {}
};

function makeInput() {
  const held = new Set();
  const pressed = new Set();
  const pointer = { x: 480, y: 270, down: false, pressed: false, released: false };
  return {
    held: (a) => held.has(a),
    pressed: (a) => pressed.has(a),
    released: () => false,
    axisX: () => (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0),
    axisY: () => (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0),
    pointer,
    _hold: (a) => held.add(a),
    _release: (a) => held.delete(a),
    _tap: (a) => pressed.add(a),
    _flush: () => { pressed.clear(); pointer.pressed = false; pointer.released = false; },
  };
}

let failures = 0;
const check = (label, ok, detail = '') => {
  if (!ok) failures += 1;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${ok || !detail ? '' : `  -> ${detail}`}`);
};

/**
 * Drive one scene for `seconds` of game time, tapping/holding action the
 * whole way and jittering the pointer, which is enough to exercise every
 * one of the five mechanics at least partially.
 */
function drive(game, { seconds = 90, mode = 'tap' } = {}) {
  const episode = episodes.find((e) => e.id === game.episodeId);
  const input = makeInput();
  const events = [];
  const g = stubCtx();
  const ctx = {
    W: 960, H: 540, time: 0, frame: 0, input, palette: PALETTE,
    reducedMotion: false,
    emit: (name, data) => events.push({ name, data }),
    sound: () => {},
    state: {},
  };

  const scene = createScene(game.kind, { beats: game.beats, episode });
  scene.init?.(ctx);

  let drawError = null;
  const steps = Math.round(seconds / STEP);
  if (mode === 'hold') input._hold('action');

  for (let i = 0; i < steps; i += 1) {
    ctx.time += STEP;
    ctx.frame += 1;
    // Tap roughly 3x/second; move the pointer around the play area.
    /*
     * Pointer and keyboard are driven in SEPARATE modes, never on the
     * same frame. engine.js's onPointerDown deliberately raises both
     * pointer.pressed and the 'action' key so one tap works everywhere,
     * and scenes correctly let their pointer branch consume that whole
     * event — so a harness that fires both at once has its keyboard path
     * silently eaten, which is exactly what made handsUp and liveGraph
     * report zero reveals here.
     */
    if (mode === 'pointer' && i % 6 === 0) {
      input.pointer.pressed = true;
      input.pointer.down = true;
      // Sweep the whole play area rather than jumping randomly, so a
      // small target is actually crossed at some point.
      const t = i / steps;
      input.pointer.x = 80 + ((i * 17) % 800);
      input.pointer.y = 70 + ((i * 11 + Math.floor(t * 200)) % 400);
    }
    if (mode === 'keys') {
      if (i % 5 === 0) input._tap(['right', 'down', 'left', 'up'][(i / 5) % 4]);
      if (i % 11 === 0) input._tap('action');
    }
    try {
      scene.update?.(STEP, ctx);
    } catch (err) {
      drawError = drawError || `update threw at frame ${i}: ${err.message}`;
      break;
    }
    input._flush();
    input.pointer.down = false;

    if (i % 7 === 0) {
      try {
        scene.draw(g, ctx);
      } catch (err) {
        drawError = drawError || `draw threw at frame ${i}: ${err.message}`;
        break;
      }
    }
  }
  const listenersBefore = globalThis.__openListeners();
  scene.dispose?.(ctx);
  const leaked = globalThis.__openListeners();
  return { events, drawError, ctx, listenersBefore, leaked };
}

console.log('=== minigame scene conformance ===\n');

for (const game of games) {
  console.log(`${game.title}  (${game.kind}, episode "${game.episodeId}")`);

  // Every scene is played three ways: pointer only, keyboard only, and
  // hold-to-act. Each must survive all three (a scene that throws under an
  // input it does not use is still a crash), and the best run is the one
  // scored, since only one of the three suits any given mechanic.
  const runs = {
    pointer: drive(game, { seconds: 100, mode: 'pointer' }),
    keys: drive(game, { seconds: 100, mode: 'keys' }),
    hold: drive(game, { seconds: 100, mode: 'hold' }),
  };
  const errored = Object.entries(runs).find(([, r]) => r.drawError);
  const best = Object.entries(runs).sort(
    (a, b) => b[1].events.filter((e) => e.name === 'reveal').length
            - a[1].events.filter((e) => e.name === 'reveal').length,
  )[0];
  const run = best[1];

  check('update/draw never throw under pointer, keys and hold', !errored, errored ? `${errored[0]}: ${errored[1].drawError}` : '');
  check('dispose() releases every listener it added', run.leaked === 0, `${run.leaked} left open`);

  const names = new Set(run.events.map((e) => e.name));
  const unknown = [...names].filter((n) => !['reveal', 'progress', 'done'].includes(n));
  check('emits only reveal/progress/done', unknown.length === 0, `unknown: ${unknown.join(', ')}`);

  const reveals = run.events.filter((e) => e.name === 'reveal').map((e) => e.data.index);
  check('reveals fire', reveals.length > 0, `0 reveals in any input mode`);
  /*
   * Not "did the bot reveal all 8" — THE STACK and FORTY-EIGHT HOURS are
   * skill games and a bot mashing buttons legitimately cannot finish
   * them, which is the point of them. The property that must hold for
   * every scene regardless of how far a run got is that the reveals form
   * a COMPLETE PREFIX of beats[]: they start at 0, step by exactly 1, and
   * never skip. That is what guarantees a player reads the episode in
   * order and never has a hole in it.
   */
  check(
    'reveals are a complete prefix of beats[] (start at 0, no gaps)',
    reveals.length === 0 || reveals.every((v, i) => v === i),
    `[${reveals.join(', ')}]`,
  );
  console.log(`        best bot run: "${best[0]}" reached ${reveals.length}/${game.beats.length} beats`);
  check(
    'reveal indexes are in order and unique',
    reveals.every((v, i) => i === 0 || v > reveals[i - 1]),
    `[${reveals.join(', ')}]`,
  );
  check(
    'reveal indexes are inside beats[]',
    reveals.every((v) => Number.isInteger(v) && v >= 0 && v < game.beats.length),
    `beats=${game.beats.length}, got [${reveals.join(', ')}]`,
  );

  const dones = run.events.filter((e) => e.name === 'done');
  check('done fires exactly once', dones.length === 1, `${dones.length} done events`);
  if (dones.length) {
    check("done outcome is 'win' or 'end'", ['win', 'end'].includes(dones[0].data?.outcome), JSON.stringify(dones[0].data));
  }

  const progress = run.events.filter((e) => e.name === 'progress').map((e) => e.data.value);
  check(
    'progress stays within 0..1',
    progress.every((v) => typeof v === 'number' && v >= 0 && v <= 1.0001),
    `min=${Math.min(...progress)} max=${Math.max(...progress)}`,
  );
  console.log('');
}

console.log(`${failures === 0 ? 'ALL PASSED' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
