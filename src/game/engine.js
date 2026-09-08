/**
 * The 2D engine shared by the overworld and every minigame.
 *
 * This is deliberately small and deliberately frozen: five separate
 * minigame scenes are written against the Scene interface below, so the
 * cost of changing this file is five rewrites. Add to the scene CONTEXT
 * if a scene needs something new; avoid changing what is already there.
 *
 * -- Coordinate system ----------------------------------------------
 * Every scene draws into a fixed virtual box of VW x VH (960 x 540)
 * regardless of the real canvas size. The engine letterboxes that box
 * into whatever space it is given and applies the transform before
 * calling draw(), so a scene never does its own scaling maths and level
 * geometry is identical on a 375px phone and a 2560px monitor.
 *
 * Letterbox bars are painted --ink, which is also the ground colour of
 * every scene in this game, so on a tall phone the bars read as frame
 * rather than as a broken layout.
 *
 * -- Timestep --------------------------------------------------------
 * update() runs at a fixed 60Hz via an accumulator, so physics is
 * identical on a 60Hz and a 144Hz display -- a variable dt would make
 * jump heights in the runner scene depend on the visitor's monitor.
 * draw() runs once per animation frame. The accumulator is clamped to 5
 * steps so a backgrounded tab returning after 30 seconds replays a third
 * of a second, not 1,800 physics steps in one blocking frame.
 *
 * -- Scene interface (the frozen contract) ---------------------------
 *   const scene = {
 *     init?(ctx)        // once, when the scene becomes active
 *     update?(dt, ctx)  // fixed step; dt is ALWAYS 1/60
 *     draw(g, ctx)      // g is a 2D context already transformed to the
 *                       // virtual box; (0,0) top-left, (960,540)
 *                       // bottom-right, clipped to the box
 *     dispose?(ctx)     // cleanup on unmount / scene swap
 *   }
 *
 * -- Scene context ---------------------------------------------------
 *   ctx.W, ctx.H          960, 540 -- always. Use these, not literals.
 *   ctx.time              seconds since this scene's init
 *   ctx.frame             integer frames since init
 *   ctx.input             see createInput() below
 *   ctx.palette           { ink, paper, shadow, signal, dusk, bone }
 *   ctx.reducedMotion     boolean; honour it (root CLAUDE.md 6 rule 5)
 *   ctx.emit(name, data)  send an event up to React
 *   ctx.sound(name)       play a cue from src/lib/sound.js
 *   ctx.state             free-form object a scene may stash things on
 */

export const VW = 960;
export const VH = 540;

const STEP = 1 / 60;
const MAX_STEPS = 5;

/* -- Input -----------------------------------------------------------
   Actions are named, never raw keys, so a scene says pressed('action')
   and the mapping from Space/Enter/Z/tap lives in exactly one place.
   held() is level-triggered (is it down right now); pressed() is
   edge-triggered and cleared after each update step, so one keypress can
   never fire twice. */

const KEY_MAP = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  Space: 'action',
  Enter: 'action',
  KeyZ: 'action',
  KeyE: 'action',
  Escape: 'cancel',
  KeyX: 'cancel',
};

function createInput(canvas, toVirtual) {
  const held = new Set();
  const pressed = new Set();
  const released = new Set();
  const pointer = { x: -1, y: -1, down: false, pressed: false, released: false };

  const press = (action) => {
    if (!held.has(action)) pressed.add(action);
    held.add(action);
  };
  const release = (action) => {
    held.delete(action);
    released.add(action);
  };

  const onKeyDown = (event) => {
    const action = KEY_MAP[event.code];
    if (!action) return;
    // Never swallow keys aimed at a real control. The canvas shares the
    // page with real button/link chrome (pause, skip, back), and a
    // visitor who tabbed to those must still be able to activate them.
    const target = event.target;
    if (target instanceof HTMLElement && target.closest('button, a, input, select, textarea')) {
      return;
    }
    // Space and the arrows scroll the page by default, which fights
    // every scene here. Escape is deliberately NOT prevented --
    // EscapeBack.jsx owns it globally.
    if (action !== 'cancel') event.preventDefault();
    press(action);
  };

  const onKeyUp = (event) => {
    const action = KEY_MAP[event.code];
    if (action) release(action);
  };

  // A tab switch mid-hold never delivers the keyup, which would leave a
  // runner scene holding 'action' forever after the visitor came back.
  const onBlur = () => {
    for (const action of held) released.add(action);
    held.clear();
    pointer.down = false;
  };

  const setPointer = (event) => {
    const rect = canvas.getBoundingClientRect();
    const p = toVirtual(event.clientX - rect.left, event.clientY - rect.top);
    pointer.x = p.x;
    pointer.y = p.y;
  };

  const onPointerDown = (event) => {
    setPointer(event);
    pointer.down = true;
    pointer.pressed = true;
    // Touch doubles as the single-button control, so every scene that
    // reads pressed('action') is tap-playable with no extra work.
    press('action');
    try {
      canvas.setPointerCapture?.(event.pointerId);
    } catch {
      /* capture is a nicety; losing it only affects drag-outside */
    }
  };

  const onPointerMove = (event) => setPointer(event);

  const onPointerUp = (event) => {
    setPointer(event);
    pointer.down = false;
    pointer.released = true;
    release('action');
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  return {
    held: (action) => held.has(action),
    pressed: (action) => pressed.has(action),
    released: (action) => released.has(action),
    /** Horizontal axis as -1 / 0 / 1 -- the overworld's main read. */
    axisX: () => (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0),
    axisY: () => (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0),
    pointer,
    /** Called by the loop after each update step. */
    flush() {
      pressed.clear();
      released.clear();
      pointer.pressed = false;
      pointer.released = false;
    },
    destroy() {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    },
  };
}

/* -- The loop ------------------------------------------------------ */

export function createGame(canvas, options = {}) {
  const { palette, reducedMotion = false, emit = () => {}, sound = () => {} } = options;

  const g = canvas.getContext('2d', { alpha: false });
  let scene = null;
  let raf = 0;
  let running = false;
  let last = 0;
  let accumulator = 0;

  // Letterbox transform, recomputed on resize only.
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  const toVirtual = (cssX, cssY) => ({
    x: (cssX - offsetX) / scale,
    y: (cssY - offsetY) / scale,
  });

  const input = createInput(canvas, toVirtual);

  const ctx = {
    W: VW,
    H: VH,
    time: 0,
    frame: 0,
    input,
    palette,
    reducedMotion,
    emit,
    sound,
    state: {},
    dpr: 1,
    cssW: 1,
    cssH: 1,
  };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = Math.max(1, Math.round(rect.width));
    const cssH = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    // "contain" fit: the whole virtual box is always visible, never
    // cropped, so no scene can hide a control off-screen on some device.
    scale = Math.min(cssW / VW, cssH / VH);
    offsetX = (cssW - VW * scale) / 2;
    offsetY = (cssH - VH * scale) / 2;
    ctx.dpr = dpr;
    ctx.cssW = cssW;
    ctx.cssH = cssH;
  }

  function render() {
    const dpr = ctx.dpr || 1;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Bars are the same ink as every scene's ground, so they read as
    // frame, not as a gap.
    g.fillStyle = palette.ink;
    g.fillRect(0, 0, ctx.cssW, ctx.cssH);

    g.save();
    g.translate(offsetX, offsetY);
    g.scale(scale, scale);
    g.beginPath();
    g.rect(0, 0, VW, VH);
    g.clip();
    scene?.draw?.(g, ctx);
    g.restore();
  }

  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    if (!last) last = now;
    let delta = (now - last) / 1000;
    last = now;
    // Clamp a long stall (backgrounded tab, GC pause) rather than
    // catching up on it.
    if (delta > MAX_STEPS * STEP) delta = MAX_STEPS * STEP;
    accumulator += delta;

    let steps = 0;
    while (accumulator >= STEP && steps < MAX_STEPS) {
      ctx.time += STEP;
      ctx.frame += 1;
      scene?.update?.(STEP, ctx);
      input.flush();
      accumulator -= STEP;
      steps += 1;
    }
    render();
  }

  const onResize = () => {
    resize();
    render();
  };

  return {
    get context() {
      return ctx;
    },
    setScene(next) {
      if (scene) scene.dispose?.(ctx);
      scene = next;
      ctx.time = 0;
      ctx.frame = 0;
      ctx.state = {};
      accumulator = 0;
      scene?.init?.(ctx);
      render();
    },
    start() {
      if (running) return;
      resize();
      running = true;
      last = 0;
      window.addEventListener('resize', onResize);
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    },
    destroy() {
      this.stop();
      if (scene) scene.dispose?.(ctx);
      scene = null;
      input.destroy();
    },
    /** Exposed for tests and for overlay hit-testing. */
    toVirtual,
    resize,
  };
}
