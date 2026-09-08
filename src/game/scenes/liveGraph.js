import {
  BODY,
  DISPLAY,
  clamp,
  fillRough,
  grain,
  halftone,
  lerp,
  litWindow,
  rgba,
  rng,
  smooth,
  strokeRough,
  text,
  vignette,
} from '../draw.js';

/**
 * ONE LIVE GRAPH -- episode 5, PROJECTS. The verb is BUILDING, not
 * dragging-onto-an-ellipse.
 *
 * Written against the contract in ./index.js; ./stack.js is the
 * reference implementation and this file follows its shape (factory ->
 * { init, update, draw }, beats as the only copy, reveal-in-order,
 * draw.js helpers only, no colour literals).
 *
 * WHY THIS WAS REBUILT
 * Reported live, verbatim: "What the FUCK is the Graph Game? It's a
 * TOTAL MESS! It works but it's like pointless and can't be understood."
 * The diagnosis: the screen opened already showing a finished mesh plus
 * faint district clutter, so it read as scribble rather than a city; the
 * five drags all landed on the same vague ellipse, so nothing about the
 * drop point mattered and nothing visibly changed per drag; and the
 * cascade at the end -- genuinely the best part -- paid off nothing,
 * because the player had no model of the graph it was rewriting.
 *
 * THE MECHANIC NOW
 * The graph is not finished until you build it. Each of the five modules
 * owns a dedicated SOCKET node, drawn as an empty pulsing ring while
 * unwired -- a visible destination, not a hope that a drag lands
 * somewhere useful. Wiring a module does not just light a wire: it turns
 * on ONE layer of the picture that was not there before --
 *
 *   LAYOUT   wired -> the district blocks appear and the cluster settles
 *            from a loose sketch into its full size/brightness
 *   ROUTING  wired -> the base route across the city draws in
 *   RISK     wired -> node risk shading/rim appears
 *   DEMAND   wired -> edges become load-weighted (busy roads read thicker)
 *   FEEDBACK wired -> a visible loop draws from the risk socket back into
 *            the routing socket, so "risk feeds back into route weight"
 *            is a shape a player can see, not a claim they take on trust
 *
 * Wiring order is the player's choice, so every layer is gated purely on
 * its own module's wired state and stands alone in any order. Each of
 * those layers rides the SAME `mod.t` ease-in a wire already animates
 * through on connect -- no new per-layer state, and reduced motion
 * already snaps `mod.t` straight to 1 on connect (see connect()), so
 * every layer above inherits that for free.
 *
 * Once the fifth module lands the scene takes the controls back and runs
 * the PROPAGATION CASCADE, unchanged in substance from before: a
 * disruption floods part of the city, the edges crossing it sever, the
 * route that ran through it redraws around the blockage (Dijkstra proves
 * a detour exists before the flood radius is even chosen), node risk
 * shifts, and every wired module visibly re-adapts in turn. That cascade
 * now gets a large, centred, unmissable stage caption for each of its
 * four beats (disruption / edges severed / re-routing / modules
 * re-adapting) in place of the small right-aligned status text that used
 * to carry it -- the cascade is the entire argument of the episode, so it
 * earns the loudest label on the screen instead of the quietest.
 *
 * DIFFICULTY IS DELIBERATELY LOW.
 * This is the closing episode and the goal is comprehension, not
 * challenge. There is no timing window, no aiming, no failure on a
 * mis-drag: a release anywhere inside the graph still connects the armed
 * module to ITS OWN socket. The only pressure is an INSTABILITY reading
 * that creeps up while modules are still unwired and settles once they
 * are all connected -- and at its creep rate a player has roughly a
 * minute of doing literally nothing before it tops out. It CAN end the
 * run ('end'), because a scene with no end state at all is a
 * screensaver, but anyone actually playing reaches 'win'.
 *
 * POINTER: drag from a module onto the graph. Because a release that
 * misses the graph leaves the module ARMED rather than clearing it,
 * tap-module then tap-graph works through the same code path with no
 * second interaction model -- see the pointer block in update().
 *
 * KEYBOARD: Left/Up and Right/Down walk the module ring (skipping ones
 * already wired, so the action key is never a no-op), Space/Enter
 * connects the selected module. The pulsing socket ring tracks whichever
 * module is armed (if any) or otherwise selected, so keyboard play gets
 * the same visible target pointer play does.
 *
 * COPY: every word a player reads about the person still comes from
 * config.beats (unchanged). A new OPTIONAL config.modules -- five
 * { label, role } entries -- may supply the module names/roles the
 * managing session owns; this file falls back to the existing mechanical
 * MODULE_LABELS with an empty role when it is absent, so it keeps
 * working standalone (npm run verify:scenes does not pass config.modules).
 * `role` and the mechanical instruction/caption strings below are all UI
 * strings describing what a module DOES, never a fact about the person.
 *
 * --signal (the red) is still spent exactly twice, both on the one
 * disruption: the flood blot and the re-routed path. The pulsing socket
 * ring is bone, not signal, on purpose -- it must never become a third
 * spend of the accent. Root CLAUDE.md section 3 caps the accent at three
 * uses per screen.
 */

/* -- Layout ---------------------------------------------------------
   Everything is expressed against ctx.W / ctx.H (960 x 540) so nothing
   assumes a canvas size. The module ring is hand-placed rather than
   generated: two on the left, two on the right, one at bottom centre,
   which leaves the top band clear for the HUD and keeps every box clear
   of the graph's own ellipse. */

const MODULE_W = 144;
const MODULE_H = 58;
const WIRE_TARGET = 5;

/** Mechanical labels only -- never a fact. Facts live in config.beats. */
const MODULE_LABELS = ['LAYOUT', 'ROUTING', 'RISK', 'DEMAND', 'FEEDBACK'];

/** Index of each module's mechanical role, matching MODULE_LABELS order
 *  and (when supplied) config.modules order. Named so the layer-gating
 *  code below reads as "the LAYOUT module", not "modules[0]". */
const IDX_LAYOUT = 0;
const IDX_ROUTING = 1;
const IDX_RISK = 2;
const IDX_DEMAND = 3;
const IDX_FEEDBACK = 4;

/** Ring order, walked by the arrow keys: down the left side, across the
 *  bottom, back up the right. An index order that matches the visual
 *  ring is what keeps Left/Right from teleporting the cursor across the
 *  frame. */
const MODULE_SLOTS = [
  { fx: 0.115, fy: 0.26 },
  { fx: 0.115, fy: 0.63 },
  { fx: 0.5, fy: 0.9 },
  { fx: 0.885, fy: 0.63 },
  { fx: 0.885, fy: 0.26 },
];

/* -- Cascade timeline ------------------------------------------------
   Seconds from the moment the fifth module lands. Staged rather than
   simultaneous, because the point being made is that change TRAVELS:
   flood, then sever, then re-route, then the modules answer. If all four
   happened on one frame it would read as a scene transition rather than
   as propagation. */
const FLOOD_IN = [0.0, 1.1];
const SEVER = [1.1, 1.9];
const REROUTE = [1.9, 3.5];
const ADAPT = [3.5, 5.1];
const SETTLE = [5.1, 6.4];
const CASCADE_END = 6.7;

/** 0..1 progress through a [start, end] window of cascade time. */
const stageT = (t, span) => clamp((t - span[0]) / (span[1] - span[0]), 0, 1);

/** The large centred caption shown in place of the small status text
 *  while phase === 'cascade'. Mechanical stage names only. */
function cascadeStageLabel(t) {
  if (t < FLOOD_IN[1]) return 'DISRUPTION HITS';
  if (t < SEVER[1]) return 'EDGES SEVERED';
  if (t < REROUTE[1]) return 'RE-ROUTING';
  if (t < ADAPT[1]) return 'MODULES RE-ADAPTING';
  return 'GRAPH STABILISING';
}

const truncate = (s, max) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

export function createLiveGraph(config) {
  const { beats = [], onDone = () => {} } = config;
  const configModules = Array.isArray(config.modules) ? config.modules : null;
  const total = beats.length;

  /** @type {{x:number,y:number,r:number,seed:number,risk:number,risk1:number,glow:number,flooded:boolean}[]} */
  let nodes = [];
  /** @type {{a:number,b:number,w:number,seed:number,blocked:boolean}[]} */
  let edges = [];
  /** @type {{x:number,y:number,ax:number,ay:number,port:number,label:string,role:string,wired:boolean,t:number,pulse:number,bow:number,seed:number}[]} */
  let modules = [];
  /** node index -> owning module index, for the unwired socket rings. */
  let socketOwner = new Map();

  let baseRoute = [];
  let altRoute = [];
  let flood = { x: 0, y: 0, r: 0 };

  let wired = 0;
  let revealedCount = 0;
  let selected = 0;
  let armed = -1;
  let dragging = false;
  let instability = 0;
  let phase = 'wiring'; // 'wiring' | 'cascade' | 'done'
  let cascadeT = 0;
  let cascadeReveals = [];
  let caption = { index: -1, t: 0 };
  let finished = false;
  let lastProgress = -1;

  /* -- Events ------------------------------------------------------- */

  function reveal(ctx, index) {
    // Reveals are strictly in order and exactly once, per the contract.
    // Guarding on revealedCount rather than trusting the caller means a
    // retimed cascade can never double-fire or skip a beat.
    if (index !== revealedCount || index >= total) return;
    revealedCount += 1;
    ctx.emit('reveal', { index });
    caption = { index, t: 1 };
    const value = clamp(revealedCount / Math.max(1, total), 0, 1);
    if (value !== lastProgress) {
      lastProgress = value;
      ctx.emit('progress', { value });
    }
  }

  function finish(ctx, outcome) {
    if (finished) return;
    finished = true;
    phase = 'done';
    const stat =
      outcome === 'win'
        ? `${WIRE_TARGET} of ${WIRE_TARGET} wired, graph stable`
        : `${wired} of ${WIRE_TARGET} wired`;
    ctx.emit('done', { outcome, stat });
    onDone(outcome);
  }

  /* -- Wiring ------------------------------------------------------- */

  function connect(index, ctx) {
    const mod = modules[index];
    if (!mod || mod.wired || phase !== 'wiring') return;
    mod.wired = true;
    mod.t = ctx.reducedMotion ? 1 : 0;
    nodes[mod.port].glow = 1;
    wired += 1;
    // Instability drops on every connection. The reading is the only
    // pressure in the scene, so it has to visibly answer the player's
    // action rather than merely stop climbing.
    instability = Math.max(0, instability - 0.14);
    ctx.sound('select');

    // The beat index tracks the NUMBER wired, not which module was
    // picked: the contract is reveal-in-order, and free choice of module
    // is worth more here than making beat text agree with a box label.
    reveal(ctx, wired - 1);

    // Move the cursor off what was just wired. Without this, a keyboard
    // player pressing Space five times wires ONE module and then hits
    // four silent no-ops, because connect() refuses an already-wired
    // module and nothing else moves the selection. Caught in a scripted
    // run; it is invisible to anyone testing with a mouse.
    if (modules[selected].wired) advance(1);

    if (wired >= WIRE_TARGET) {
      phase = 'cascade';
      cascadeT = 0;
      // Whatever beats the wiring did not pay out are spread across the
      // cascade -- computed rather than hardcoded, so changing the beat
      // count in games.js cannot silently strand one here.
      cascadeReveals = [];
      const remaining = [];
      for (let i = WIRE_TARGET; i < total; i += 1) remaining.push(i);
      remaining.forEach((beatIndex, n) => {
        const k = remaining.length === 1 ? 0 : n / (remaining.length - 1);
        cascadeReveals.push({ at: lerp(0.55, ADAPT[1] - 0.4, k), index: beatIndex, fired: false });
      });
      ctx.sound('toast');
    }
  }

  /** Cursor step that skips already-wired modules, so Space is never a
   *  no-op. Bounded by the ring length rather than a while(true): once
   *  everything is wired there is no landing spot and it simply stops. */
  function advance(dir) {
    for (let step = 1; step <= modules.length; step += 1) {
      const next = (selected + dir * step + modules.length * step) % modules.length;
      if (!modules[next].wired) {
        const moved = next !== selected;
        selected = next;
        return moved;
      }
    }
    return false;
  }

  function cycle(dir, ctx) {
    if (advance(dir)) ctx.sound('navigate');
  }

  /* -- Hit testing --------------------------------------------------- */

  function moduleAt(x, y) {
    for (let i = 0; i < modules.length; i += 1) {
      const m = modules[i];
      // Generous pad: this is a phone target inside a letterboxed box,
      // where 960 virtual units land on roughly 345 real ones.
      if (Math.abs(x - m.x) <= MODULE_W / 2 + 14 && Math.abs(y - m.y) <= MODULE_H / 2 + 14) {
        return i;
      }
    }
    return -1;
  }

  function inGraph(ctx, x, y) {
    const { cx, cy, rx, ry } = graphBox(ctx);
    const dx = (x - cx) / rx;
    const dy = (y - cy) / ry;
    return dx * dx + dy * dy <= 1.15;
  }

  return {
    init(ctx) {
      const { W, H } = ctx;
      const built = buildGraph(ctx);
      nodes = built.nodes;
      edges = built.edges;
      baseRoute = built.baseRoute;
      altRoute = built.altRoute;
      flood = built.flood;

      const { cx, cy } = graphBox(ctx);

      // Five dedicated sockets: non-adjacent, spread by angle around the
      // hub, so a drag has a specific place to land instead of "anywhere
      // on this ellipse." Deterministic given the seeded graph.
      const sockets = pickSockets(nodes, edges, WIRE_TARGET);
      const socketPool = [...sockets];

      modules = MODULE_SLOTS.map((slot, i) => {
        const x = W * slot.fx;
        const y = H * slot.fy;
        // Anchor: the point on the box edge facing the graph, so a wire
        // leaves the module rather than appearing to grow out of its
        // middle and pass through its own label.
        const toward = Math.atan2(cy - y, cx - x);
        const ax = x + Math.cos(toward) * (MODULE_W / 2);
        const ay = y + Math.sin(toward) * (MODULE_H / 2);

        // Claim whichever remaining socket sits nearest this module's
        // slot -- keeps wires short and roughly non-crossing without
        // needing a real assignment solver for five items.
        let bestPoolIdx = 0;
        let bestD = Infinity;
        socketPool.forEach((s, si) => {
          const d = (nodes[s].x - x) ** 2 + (nodes[s].y - y) ** 2;
          if (d < bestD) {
            bestD = d;
            bestPoolIdx = si;
          }
        });
        const port = socketPool.splice(bestPoolIdx, 1)[0];

        return {
          x,
          y,
          ax,
          ay,
          port,
          label: configModules?.[i]?.label || MODULE_LABELS[i] || `MODULE ${i + 1}`,
          role: configModules?.[i]?.role || '',
          wired: false,
          t: 0,
          pulse: 0,
          bow: i % 2 ? 20 : -20,
          seed: 310 + i * 47,
        };
      });
      socketOwner = new Map(modules.map((m, i) => [m.port, i]));

      wired = 0;
      revealedCount = 0;
      selected = 0;
      armed = -1;
      dragging = false;
      instability = 0;
      phase = 'wiring';
      cascadeT = 0;
      cascadeReveals = [];
      caption = { index: -1, t: 0 };
      finished = false;
      lastProgress = 0;
      ctx.emit('progress', { value: 0 });
    },

    update(dt, ctx) {
      caption.t = Math.max(0, caption.t - dt * 0.42);
      for (const n of nodes) n.glow = Math.max(0, n.glow - dt * 1.3);
      for (const m of modules) {
        if (m.wired && m.t < 1) m.t = Math.min(1, m.t + dt * 3.2);
        m.pulse = Math.max(0, m.pulse - dt * 0.9);
      }

      if (phase === 'wiring') {
        const unwired = WIRE_TARGET - wired;
        // Slow on purpose: about 57 seconds of total inaction from a
        // standing start before this tops out, and every connection
        // knocks it back. It is a reading, not a timer -- nothing here
        // gates a beat behind the clock (root CLAUDE.md 6, rule 2).
        instability = clamp(instability + dt * 0.0035 * unwired, 0, 1);
        if (instability >= 1) {
          finish(ctx, 'end');
          return;
        }

        const p = ctx.input.pointer;
        if (p.pressed) {
          const hit = moduleAt(p.x, p.y);
          if (hit >= 0 && !modules[hit].wired) {
            armed = hit;
            selected = hit;
            dragging = true;
            ctx.sound('navigate');
          } else if (armed >= 0 && inGraph(ctx, p.x, p.y)) {
            // Second half of the tap-module-then-tap-graph path.
            connect(armed, ctx);
            armed = -1;
            dragging = false;
          } else {
            armed = -1;
            dragging = false;
          }
        }
        if (p.released) {
          if (dragging && armed >= 0 && inGraph(ctx, p.x, p.y)) {
            connect(armed, ctx);
            armed = -1;
          }
          // A release that is NOT over the graph deliberately leaves the
          // module armed. That one decision is what makes tap-tap work
          // without a second interaction model: a tap is just a drag
          // that ended where it started.
          dragging = false;
        }

        if (ctx.input.pressed('left') || ctx.input.pressed('up')) cycle(-1, ctx);
        if (ctx.input.pressed('right') || ctx.input.pressed('down')) cycle(1, ctx);
        // engine.js also presses 'action' on pointerdown, so touch would
        // otherwise double-fire as a keyboard connect on whichever
        // module the cursor happened to be sitting on.
        if (ctx.input.pressed('action') && !p.pressed) {
          connect(selected, ctx);
          armed = -1;
        }
        return;
      }

      if (phase === 'cascade') {
        cascadeT += dt;
        for (const r of cascadeReveals) {
          if (!r.fired && cascadeT >= r.at) {
            r.fired = true;
            reveal(ctx, r.index);
          }
        }

        // Instability spikes on the disruption and is pulled back down
        // by the wired modules. The shape of that curve IS the episode's
        // argument, so it is scripted rather than emergent.
        const spike = stageT(cascadeT, FLOOD_IN);
        const recover = stageT(cascadeT, [REROUTE[1], SETTLE[1]]);
        instability = lerp(lerp(instability, 0.86, spike), 0.03, recover);

        // The modules answer one at a time, in ring order, once the new
        // route exists -- staggered so it reads as a wave running back
        // out along the wires rather than five lamps switching at once.
        const adapt = stageT(cascadeT, ADAPT);
        modules.forEach((m, i) => {
          const own = adapt * modules.length - i;
          if (own > 0 && own < 0.25 && m.pulse <= 0) {
            m.pulse = 1;
            nodes[m.port].glow = 0.8;
          }
        });

        if (cascadeT >= REROUTE[1] && cascadeT - dt < REROUTE[1]) ctx.sound('whooshIn');
        if (cascadeT >= CASCADE_END) finish(ctx, 'win');
      }
    },

    draw(g, ctx) {
      const { W, H, palette } = ctx;
      const rm = ctx.reducedMotion;
      const box = graphBox(ctx);

      // Under reduced motion every ramp below is stepped or snapped
      // rather than eased. The cascade still HAPPENS and is still
      // watchable -- it carries content, so it may not be switched off
      // (root CLAUDE.md 6, rule 5 turns off decoration, not substance).
      const floodT = rm ? (cascadeT >= FLOOD_IN[1] ? 1 : 0) : smooth(stageT(cascadeT, FLOOD_IN));
      const severT = rm ? (cascadeT >= SEVER[1] ? 1 : 0) : smooth(stageT(cascadeT, SEVER));
      const rawRoute = stageT(cascadeT, REROUTE);
      const routeT = rm ? Math.ceil(rawRoute * 4) / 4 : smooth(rawRoute);
      const riskSpan = [SEVER[0], ADAPT[1]];
      const riskT = rm ? (cascadeT >= ADAPT[0] ? 1 : 0) : smooth(stageT(cascadeT, riskSpan));
      const live = clamp(wired / WIRE_TARGET, 0, 1);

      /* Ground. Same night as the rest of the game. */
      g.fillStyle = palette.ink;
      g.fillRect(0, 0, W, H);
      const sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, rgba(palette.dusk, 0.5));
      sky.addColorStop(1, rgba(palette.ink, 1));
      g.fillStyle = sky;
      g.fillRect(0, 0, W, H);

      // LAYOUT layer: the district blocks are invisible clutter until
      // this module is wired, then fade in at real strength (was a flat
      // ~0.06 always-on wash -- the exact "scribble, not a city" defect
      // reported live).
      drawDistricts(g, ctx, box, phase === 'wiring' ? modules[IDX_LAYOUT].t : 1);

      /* The graph plate: a pool of light the cluster sits in, brightening
         as modules come online, so the graph reads as a place waking up
         rather than as a chart on black. */
      const plate = g.createRadialGradient(box.cx, box.cy, 0, box.cx, box.cy, box.rx * 1.15);
      plate.addColorStop(0, rgba(palette.bone, 0.09 + 0.06 * live));
      plate.addColorStop(1, rgba(palette.bone, 0));
      g.fillStyle = plate;
      g.fillRect(box.cx - box.rx * 1.2, box.cy - box.rx * 1.2, box.rx * 2.4, box.rx * 2.4);

      /* The disruption -- accent use 1 of 2. */
      if (floodT > 0) drawFlood(g, ctx, flood, floodT);

      /* Edges. Weight is drawn as line width, so a re-weight is a
         thickness you can see rather than a number you must read. Base
         brightness is deliberately higher than before this rebuild (was
         0.12+0.26*live) so the resting graph reads as a clean, legible
         cluster rather than a dim smear even with nothing wired yet. */
      for (let i = 0; i < edges.length; i += 1) {
        const e = edges[i];
        const a = nodes[e.a];
        const b = nodes[e.b];
        const cut = e.blocked ? severT : 0;
        g.beginPath();
        g.moveTo(a.x, a.y);
        g.lineTo(b.x, b.y);
        if (cut > 0.5) {
          g.setLineDash([4, 8]);
          g.strokeStyle = rgba(palette.bone, 0.09);
          g.lineWidth = 1.2;
        } else {
          // DEMAND layer: edges stay a flat weight until that module is
          // wired, then the risk-derived load becomes visible thickness
          // -- the "risk becomes a road-weight multiplier" loop, drawn.
          const demandGate = phase === 'wiring' ? modules[IDX_DEMAND].t : 1;
          const riskAvg = lerp((a.risk + b.risk) / 2, (a.risk1 + b.risk1) / 2, riskT);
          const load = 1 + riskAvg * demandGate * 1.6;
          g.setLineDash([]);
          g.strokeStyle = rgba(palette.bone, 0.22 + 0.2 * live);
          g.lineWidth = (1.3 + 1.5 * live) * load;
        }
        g.stroke();
        g.setLineDash([]);
      }

      /* Routes. ROUTING layer: nothing draws until that module is wired,
         then the base route eases in exactly like a wire animates
         (riding modules[IDX_ROUTING].t, so it needs no new state). Once
         the cascade takes over, this hands off to the existing
         fade-out/redraw pair -- unchanged from before this rebuild. */
      const routingLayerT = modules[IDX_ROUTING].t;
      if (phase === 'wiring') {
        if (routingLayerT > 0.01 && baseRoute.length > 1) {
          strokePath(
            g,
            routePoints(nodes, baseRoute),
            routingLayerT,
            rgba(palette.bone, 0.42 * routingLayerT),
            5,
          );
        }
      } else {
        if (baseRoute.length > 1 && routeT < 1) {
          strokePath(g, routePoints(nodes, baseRoute), 1, rgba(palette.bone, 0.5 * (1 - routeT)), 5);
        }
        if (routeT > 0 && altRoute.length > 1) {
          const pts = routePoints(nodes, altRoute);
          // Bone underlay first: --signal on --ink is a thin read at this
          // scale, and the underlay is what keeps the detour legible when
          // the whole 960px box is letterboxed onto a 375px phone.
          strokePath(g, pts, routeT, rgba(palette.bone, 0.32), 8);
          strokePath(g, pts, routeT, rgba(palette.signal, 0.95), 4); // accent 2 of 2
        }
      }

      /* Nodes. RISK layer gates the shading/rim; LAYOUT layer gates a
         "settle" -- a loose, dim sketch before that module is wired,
         popping to full size/brightness once it is, so "positions
         settle in" is something you watch happen rather than a static
         claim. Sockets belonging to an unwired module draw their ring
         directly after the node they sit on. */
      const activeModuleIdx = phase === 'wiring' ? (armed >= 0 ? armed : selected) : -1;
      for (let i = 0; i < nodes.length; i += 1) {
        const n = nodes[i];
        const riskLayerT = phase === 'wiring' ? modules[IDX_RISK].t : 1;
        const risk = lerp(n.risk, n.risk1, riskT) * riskLayerT;
        const drowned = n.flooded ? severT : 0;
        const settle = phase === 'wiring' ? 0.6 + 0.4 * modules[IDX_LAYOUT].t : 1;
        const settleAlpha = phase === 'wiring' ? 0.55 + 0.45 * modules[IDX_LAYOUT].t : 1;
        const r = n.r * settle * (1 + risk * 0.25) * (1 - drowned * 0.3);
        if (n.glow > 0.05 && drowned < 0.5) {
          litWindow(g, n.x - r * 0.8, n.y - r * 0.8, r * 1.6, r * 1.6, palette, n.glow);
        }
        fillRough(
          g,
          n.x - r,
          n.y - r,
          r * 2,
          r * 2,
          rgba(palette.shadow, (0.95 - drowned * 0.5) * settleAlpha),
          n.seed,
          2,
        );
        strokeRough(
          g,
          n.x - r,
          n.y - r,
          r * 2,
          r * 2,
          rgba(palette.bone, (0.2 + 0.45 * live + risk * 0.3) * (1 - drowned * 0.75) * settleAlpha),
          n.seed + 1,
          2,
          1.6,
        );

        const ownerIdx = socketOwner.get(i);
        if (ownerIdx !== undefined && !modules[ownerIdx].wired) {
          drawSocketRing(g, ctx, { x: n.x, y: n.y, r }, modules[ownerIdx], ownerIdx === activeModuleIdx);
        }
      }

      /* Route endpoints stay lit through the cascade, so the eye has two
         fixed points to read the detour between. */
      if (phase !== 'wiring' && altRoute.length > 1) {
        for (const end of [altRoute[0], altRoute[altRoute.length - 1]]) {
          const n = nodes[end];
          litWindow(g, n.x - 7, n.y - 7, 14, 14, palette, 0.55);
        }
      }

      /* FEEDBACK layer: draws the loop from the RISK socket back into
         the ROUTING socket, so "risk feeds back into route weight" is a
         shape on screen rather than a sentence to take on trust. Rides
         modules[IDX_FEEDBACK].t like every other layer. */
      drawFeedbackLoop(
        g,
        ctx,
        nodes[modules[IDX_RISK].port],
        nodes[modules[IDX_ROUTING].port],
        modules[IDX_FEEDBACK].t,
      );

      /* Wires, the in-flight drag line, then the module boxes on top. */
      for (let i = 0; i < modules.length; i += 1) {
        drawWire(g, ctx, modules[i], nodes[modules[i].port], rm);
      }
      if (dragging && armed >= 0) {
        const m = modules[armed];
        g.setLineDash([7, 7]);
        g.strokeStyle = rgba(palette.bone, 0.5);
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(m.ax, m.ay);
        g.lineTo(ctx.input.pointer.x, ctx.input.pointer.y);
        g.stroke();
        g.setLineDash([]);
      }
      for (let i = 0; i < modules.length; i += 1) {
        drawModule(g, ctx, modules[i], i === selected && phase === 'wiring', i === armed);
      }

      drawHud(g, ctx, { wired, instability, phase, cascadeT, beats, caption });

      vignette(g, W, H, palette, 0.55);
      grain(g, W, H, rm ? 0.03 : 0.05, rm, ctx.frame);
    },
  };
}

/* -- Geometry helpers ------------------------------------------------ */

/** The graph's bounding ellipse in ctx units. Single source of truth --
 *  node placement, hit-testing and the light plate all read it, so the
 *  drop target can never drift away from the drawn cluster. */
function graphBox(ctx) {
  return { cx: ctx.W / 2, cy: ctx.H * 0.5, rx: ctx.W * 0.205, ry: ctx.H * 0.255 };
}

/** Choose `count` non-adjacent, angularly-spread nodes to be dedicated
 *  module sockets -- excluding the hub (index 0), which is the
 *  structural centre of the graph, not a landing point. Non-adjacent so
 *  two sockets never sit at opposite ends of one edge; spread by angle
 *  around the hub so five drag targets read as distributed around the
 *  cluster rather than clumped on one side of the frame. The minimum
 *  angular gap relaxes gradually until enough sockets are found, so this
 *  always terminates on the fixed 13-node graph this scene builds.
 *  Deterministic given the seeded graph -- sockets land on the same
 *  nodes every reload, same reasoning as everything else drawn here. */
function pickSockets(nodes, edges, count) {
  const hub = nodes[0];
  const key = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  const adj = new Set(edges.map((e) => key(e.a, e.b)));
  const isAdjacent = (a, b) => adj.has(key(a, b));

  const candidates = nodes
    .map((n, i) => ({ i, angle: Math.atan2(n.y - hub.y, n.x - hub.x) }))
    .filter((c) => c.i !== 0)
    .sort((a, b) => a.angle - b.angle);

  const angleGap = (a, b) => {
    const d = Math.abs(a - b) % (Math.PI * 2);
    return d > Math.PI ? Math.PI * 2 - d : d;
  };

  let minGap = ((Math.PI * 2) / count) * 0.85;
  let picked = [];
  while (picked.length < count && minGap > -0.01) {
    picked = [];
    for (const c of candidates) {
      const clash = picked.some((p) => isAdjacent(p.i, c.i) || angleGap(p.angle, c.angle) < minGap);
      if (clash) continue;
      picked.push(c);
      if (picked.length >= count) break;
    }
    minGap -= 0.15;
  }
  // Fallback for a pathological graph: fill whatever is left, ignoring
  // the spacing constraint, so this can never return fewer than asked.
  if (picked.length < count) {
    for (const c of candidates) {
      if (picked.length >= count) break;
      if (!picked.some((p) => p.i === c.i)) picked.push(c);
    }
  }
  return picked.map((p) => p.i);
}

const routePoints = (nodes, route) => route.map((i) => ({ x: nodes[i].x, y: nodes[i].y }));

/** Draw the first `t` (0..1) of a polyline BY ARC LENGTH, so a route
 *  redraws at an even speed regardless of how long its segments are.
 *  Interpolating per-segment instead would make the detour visibly
 *  stutter across its short hops. */
function strokePath(g, pts, t, color, width) {
  if (pts.length < 2) return;
  const segs = [];
  let total = 0;
  for (let i = 1; i < pts.length; i += 1) {
    const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    segs.push(d);
    total += d;
  }
  let want = total * clamp(t, 0, 1);
  g.save();
  g.strokeStyle = color;
  g.lineWidth = width;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) {
    const d = segs[i - 1];
    if (want >= d) {
      g.lineTo(pts[i].x, pts[i].y);
      want -= d;
    } else {
      const k = d === 0 ? 0 : want / d;
      g.lineTo(lerp(pts[i - 1].x, pts[i].x, k), lerp(pts[i - 1].y, pts[i].y, k));
      break;
    }
  }
  g.stroke();
  g.restore();
}

/* -- The graph itself ------------------------------------------------
   Built once in init() from a seeded rng, never Math.random(), so the
   city is the same city on every reload and a screenshot of it is
   reproducible -- same reasoning as Panel.jsx's seed prop. */

function buildGraph(ctx) {
  const rand = rng(52731);
  const { cx, cy, rx, ry } = graphBox(ctx);

  const nodes = [];
  const push = (px, py, r, seed) =>
    nodes.push({ x: px, y: py, r, seed, risk: rand() * 0.35, risk1: 0, glow: 0, flooded: false });

  // A hub, an inner ring of five, an outer ring of seven. Structured
  // rather than scattered: a random cloud produces crossings and
  // near-coincident nodes that stop reading as a map at phone scale. The
  // hub is drawn larger than before this rebuild -- part of making the
  // resting graph read as a clear cluster rather than an evenly-grey mesh.
  push(cx + (rand() - 0.5) * 16, cy + (rand() - 0.5) * 12, 16, 11);
  const ring1 = [];
  for (let i = 0; i < 5; i += 1) {
    const a = (i / 5) * Math.PI * 2 + 0.4;
    const j = 0.86 + rand() * 0.22;
    ring1.push(nodes.length);
    push(
      cx + Math.cos(a) * rx * 0.44 * j,
      cy + Math.sin(a) * ry * 0.46 * j,
      8 + rand() * 3,
      40 + i * 7,
    );
  }
  const ring2 = [];
  for (let i = 0; i < 7; i += 1) {
    const a = (i / 7) * Math.PI * 2 + 0.15;
    const j = 0.9 + rand() * 0.16;
    ring2.push(nodes.length);
    push(
      cx + Math.cos(a) * rx * 0.92 * j,
      cy + Math.sin(a) * ry * 0.92 * j,
      7 + rand() * 4,
      120 + i * 9,
    );
  }

  const edges = [];
  const seenKeys = new Set();
  const addEdge = (a, b) => {
    if (a === b) return;
    const k = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (seenKeys.has(k)) return;
    seenKeys.add(k);
    edges.push({
      a,
      b,
      w: Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y),
      seed: 200 + edges.length * 13,
      blocked: false,
    });
  };

  for (const i of ring1) addEdge(0, i);
  for (let i = 0; i < ring1.length; i += 1) addEdge(ring1[i], ring1[(i + 1) % ring1.length]);
  for (let i = 0; i < ring2.length; i += 1) addEdge(ring2[i], ring2[(i + 1) % ring2.length]);
  for (const outer of ring2) {
    const byDistance = [...ring1].sort(
      (a, b) =>
        Math.hypot(nodes[a].x - nodes[outer].x, nodes[a].y - nodes[outer].y) -
        Math.hypot(nodes[b].x - nodes[outer].x, nodes[b].y - nodes[outer].y),
    );
    addEdge(outer, byDistance[0]);
    if (rand() > 0.45) addEdge(outer, byDistance[1]);
  }

  // Thin a few spokes so the mesh is not perfectly regular -- but only
  // where it costs neither connectivity nor a node's second edge. A dead
  // end would let the flood cut the city in two and leave the cascade
  // with no detour to draw, which is the one failure this scene cannot
  // absorb.
  const degree = (n) => edges.filter((e) => e.a === n || e.b === n).length;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const idx = Math.floor(rand() * edges.length);
    const candidate = edges[idx];
    if (degree(candidate.a) <= 2 || degree(candidate.b) <= 2) continue;
    if (connected(nodes.length, edges.filter((_, i) => i !== idx))) edges.splice(idx, 1);
  }

  // The route runs across the city, left edge to right edge: the most
  // legible axis for a detour to be seen against in a 16:9 frame.
  const start = [...ring2].sort((a, b) => nodes[a].x - nodes[b].x)[0];
  const goal = [...ring2].sort((a, b) => nodes[b].x - nodes[a].x)[0];
  const baseRoute = shortestPath(nodes, edges, start, goal, null) || [start, goal];

  // Flood the middle of that route, then SHRINK the blot until a detour
  // provably exists. Solving for the disruption rather than hoping for
  // one is what guarantees the payoff fires on every run.
  const pivot = nodes[baseRoute[Math.floor(baseRoute.length / 2)]];
  let radius = Math.min(rx, ry) * 0.62;
  let alt = null;
  let blockedSet = new Set();
  for (let tries = 0; tries < 7 && !alt; tries += 1) {
    blockedSet = new Set();
    for (let i = 0; i < edges.length; i += 1) {
      const e = edges[i];
      const a = nodes[e.a];
      const b = nodes[e.b];
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const near =
        Math.hypot(a.x - pivot.x, a.y - pivot.y) < radius ||
        Math.hypot(b.x - pivot.x, b.y - pivot.y) < radius ||
        Math.hypot(mid.x - pivot.x, mid.y - pivot.y) < radius * 0.92;
      if (near) blockedSet.add(i);
    }
    const endsClear =
      Math.hypot(nodes[start].x - pivot.x, nodes[start].y - pivot.y) > radius &&
      Math.hypot(nodes[goal].x - pivot.x, nodes[goal].y - pivot.y) > radius;
    if (endsClear) alt = shortestPath(nodes, edges, start, goal, blockedSet);
    if (!alt) radius *= 0.84;
  }

  for (const i of blockedSet) edges[i].blocked = true;
  for (const n of nodes) {
    const d = Math.hypot(n.x - pivot.x, n.y - pivot.y);
    n.flooded = d < radius * 0.8;
    // Post-cascade risk falls off with distance from the disruption.
    // Deriving node risk and edge load from the same field is what makes
    // colour, weight and route agree with each other instead of each
    // doing something unrelated.
    n.risk1 = clamp(n.risk + Math.exp(-(d * d) / (radius * radius * 2.2)) * 0.85, 0, 1);
  }

  return {
    nodes,
    edges,
    baseRoute,
    altRoute: alt || baseRoute,
    flood: { x: pivot.x, y: pivot.y, r: radius },
  };
}

function connected(count, list) {
  const adj = Array.from({ length: count }, () => []);
  for (const e of list) {
    adj[e.a].push(e.b);
    adj[e.b].push(e.a);
  }
  const seen = new Set([0]);
  const queue = [0];
  while (queue.length) {
    const u = queue.pop();
    for (const v of adj[u]) {
      if (!seen.has(v)) {
        seen.add(v);
        queue.push(v);
      }
    }
  }
  return seen.size === count;
}

/** Plain O(n^2) Dijkstra. n is 13 and it runs twice in init(), never per
 *  frame, so a heap would be more code for no measurable gain. */
function shortestPath(nodes, edges, start, goal, blocked) {
  const adj = Array.from({ length: nodes.length }, () => []);
  for (let i = 0; i < edges.length; i += 1) {
    if (blocked && blocked.has(i)) continue;
    adj[edges[i].a].push([edges[i].b, edges[i].w]);
    adj[edges[i].b].push([edges[i].a, edges[i].w]);
  }
  const dist = nodes.map(() => Infinity);
  const prev = nodes.map(() => -1);
  const settled = new Set();
  dist[start] = 0;
  for (let step = 0; step < nodes.length; step += 1) {
    let u = -1;
    let best = Infinity;
    for (let i = 0; i < nodes.length; i += 1) {
      if (!settled.has(i) && dist[i] < best) {
        best = dist[i];
        u = i;
      }
    }
    if (u === -1 || u === goal) break;
    settled.add(u);
    for (const [v, w] of adj[u]) {
      if (dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        prev[v] = u;
      }
    }
  }
  if (dist[goal] === Infinity) return null;
  const path = [goal];
  let c = goal;
  while (prev[c] !== -1) {
    c = prev[c];
    path.unshift(c);
  }
  return path.length > 1 ? path : null;
}

/* -- Drawing --------------------------------------------------------- */

/** Faint blocks behind the graph, same vocabulary as stack.js's
 *  backdrop: this cluster is a district of the same city the rest of the
 *  site is set in, not a diagram floating on black. Gated by `strength`
 *  (0..1, the LAYOUT module's wired state) -- at 0 this returns before
 *  drawing anything, so an unwired scene pays nothing for it, and at 1
 *  the alphas below are meaningfully stronger than the ~0.06 wash this
 *  replaced, which read as noise rather than as a place. */
function drawDistricts(g, ctx, box, strength) {
  if (strength <= 0.01) return;
  const { palette } = ctx;
  const rand = rng(8821);
  g.strokeStyle = rgba(palette.bone, 0.16 * strength);
  g.lineWidth = 1;
  for (let i = 0; i < 14; i += 1) {
    const w = 60 + rand() * 150;
    const h = 40 + rand() * 110;
    const x = box.cx + (rand() - 0.5) * ctx.W * 0.95 - w / 2;
    const y = box.cy + (rand() - 0.5) * ctx.H * 0.85 - h / 2;
    g.strokeRect(x, y, w, h);
  }
  halftone(
    g,
    box.cx - box.rx * 1.3,
    box.cy - box.ry * 1.3,
    box.rx * 2.6,
    box.ry * 2.6,
    rgba(palette.bone, 0.1 * strength),
    'up',
    14,
    404,
  );
}

/** The disruption. Accent use 1 of 2 -- a roughened blot with a jittered
 *  contour rather than a clean circle, because a smooth ellipse would be
 *  the one ruler-drawn shape on an otherwise hand-inked screen. */
function drawFlood(g, ctx, blot, t) {
  const { palette } = ctx;
  const r = blot.r * (0.35 + 0.65 * t);
  const grad = g.createRadialGradient(blot.x, blot.y, 0, blot.x, blot.y, r);
  grad.addColorStop(0, rgba(palette.signal, 0.34 * t));
  grad.addColorStop(0.6, rgba(palette.signal, 0.16 * t));
  grad.addColorStop(1, rgba(palette.signal, 0));
  g.fillStyle = grad;
  g.fillRect(blot.x - r, blot.y - r, r * 2, r * 2);

  const rand = rng(6161);
  g.strokeStyle = rgba(palette.signal, 0.5 * t);
  g.lineWidth = 2;
  g.beginPath();
  for (let i = 0; i <= 22; i += 1) {
    const a = (i / 22) * Math.PI * 2;
    const jitter = r * (0.9 + rand() * 0.18);
    const px = blot.x + Math.cos(a) * jitter;
    const py = blot.y + Math.sin(a) * jitter * 0.86;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
  g.stroke();
}

/** A module's wire: a bowed curve, so five wires converging on one small
 *  cluster stay individually traceable. A pulse rides it while that
 *  module is re-adapting -- a travelling dot is the cheapest honest way
 *  to show causation moving from the graph back out to the module. */
function drawWire(g, ctx, m, port, reducedMotion) {
  const { palette } = ctx;
  const t = m.wired ? m.t : 0;
  if (t <= 0) return;
  const mx = (m.ax + port.x) / 2 + m.bow * 0.4;
  const my = (m.ay + port.y) / 2 + m.bow;

  const at = (k) => ({
    x: (1 - k) ** 2 * m.ax + 2 * (1 - k) * k * mx + k * k * port.x,
    y: (1 - k) ** 2 * m.ay + 2 * (1 - k) * k * my + k * k * port.y,
  });

  g.strokeStyle = rgba(palette.bone, 0.2 + 0.35 * t + m.pulse * 0.3);
  g.lineWidth = 1.6 + 1.6 * t + m.pulse * 1.4;
  g.beginPath();
  g.moveTo(m.ax, m.ay);
  const steps = 16;
  for (let i = 1; i <= steps; i += 1) {
    const p = at((i / steps) * t);
    g.lineTo(p.x, p.y);
  }
  g.stroke();

  if (m.pulse > 0) {
    // Under reduced motion the pulse is a static marker parked at the
    // module end instead of a travelling dot: the module still reads as
    // having answered, without anything moving to say so.
    const p = at(reducedMotion ? 0.12 : 1 - m.pulse);
    g.fillStyle = rgba(palette.bone, 0.85 * m.pulse);
    g.beginPath();
    g.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
    g.fill();
  }
}

/** An unwired module's landing point: a dashed ring around its own
 *  dedicated node, its label beneath it, so a drag has a visible
 *  destination instead of "anywhere on this vague ellipse." Pulses
 *  (radius + alpha, driven off ctx.time so it needs no extra state)
 *  while its owning module is the one currently armed or selected.
 *  Bone only, never --signal -- this can never become a third spend of
 *  the accent (root CLAUDE.md 3 caps it at three uses per screen, and
 *  this scene already spends two on the disruption). */
function drawSocketRing(g, ctx, node, mod, active) {
  const { palette } = ctx;
  const pulse = active ? (ctx.reducedMotion ? 0.65 : 0.5 + 0.5 * Math.sin(ctx.time * 4.4)) : 0;
  const ringR = node.r + 9 + pulse * 4;

  g.save();
  g.setLineDash([3, 5]);
  g.strokeStyle = rgba(palette.bone, 0.35 + pulse * 0.45);
  g.lineWidth = 1.6 + pulse;
  g.beginPath();
  g.arc(node.x, node.y, ringR, 0, Math.PI * 2);
  g.stroke();
  g.setLineDash([]);
  g.restore();

  text(g, mod.label, node.x, node.y + ringR + 14, {
    size: 10,
    face: BODY,
    color: rgba(palette.bone, 0.4 + pulse * 0.35),
    align: 'center',
    tracking: 1.2,
  });
}

/** The FEEDBACK layer: a dashed arc looping from the RISK socket back
 *  into the ROUTING socket, with a small arrowhead so it reads as
 *  directional -- risk feeding back into route weight, not just a sixth
 *  edge. Arcs above the straight line between the two so it is never
 *  mistaken for a graph edge. */
function drawFeedbackLoop(g, ctx, a, b, t) {
  if (t <= 0.01) return;
  const { palette } = ctx;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2 - 46;
  const alpha = 0.55 * t;

  g.save();
  g.globalAlpha = alpha;
  g.setLineDash([3, 6]);
  g.strokeStyle = rgba(palette.bone, 0.6);
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(a.x, a.y);
  g.quadraticCurveTo(mx, my, b.x, b.y);
  g.stroke();
  g.setLineDash([]);
  g.restore();

  const ang = Math.atan2(b.y - my, b.x - mx);
  g.save();
  g.globalAlpha = alpha;
  g.fillStyle = rgba(palette.bone, 0.7);
  g.beginPath();
  g.moveTo(b.x, b.y);
  g.lineTo(b.x - Math.cos(ang - 0.4) * 8, b.y - Math.sin(ang - 0.4) * 8);
  g.lineTo(b.x - Math.cos(ang + 0.4) * 8, b.y - Math.sin(ang + 0.4) * 8);
  g.closePath();
  g.fill();
  g.restore();
}

function drawModule(g, ctx, m, isSelected, isArmed) {
  const { palette } = ctx;
  const x = m.x - MODULE_W / 2;
  const y = m.y - MODULE_H / 2;
  const on = m.wired;
  const hasRole = !!m.role;

  fillRough(g, x, y, MODULE_W, MODULE_H, rgba(palette.shadow, on ? 0.95 : 0.6), m.seed, 3);
  if (m.pulse > 0) {
    fillRough(g, x, y, MODULE_W, MODULE_H, rgba(palette.bone, 0.18 * m.pulse), m.seed, 3);
  }
  const highlighted = isSelected || isArmed;
  strokeRough(
    g,
    x,
    y,
    MODULE_W,
    MODULE_H,
    rgba(palette.bone, highlighted ? 0.85 : on ? 0.5 : 0.22),
    m.seed + 3,
    3,
    highlighted ? 2.6 : 1.8,
  );

  text(g, m.label, m.x, m.y + (hasRole ? -3 : 6), {
    size: hasRole ? 15 : 18,
    face: DISPLAY,
    color: rgba(palette.bone, on ? 0.92 : 0.5),
    align: 'center',
    tracking: 1,
  });

  // The mechanical role line -- config.modules[i].role, or nothing when
  // the managing session hasn't supplied it yet (verify:scenes' harness
  // never does). Truncated rather than wrapped: two lines already fits
  // the box tightly and a third would not.
  if (hasRole) {
    text(g, truncate(m.role, 22), m.x, m.y + 14, {
      size: 9,
      face: BODY,
      color: rgba(palette.bone, on ? 0.6 : 0.35),
      align: 'center',
    });
  }

  // Status lamp: a dead socket, or a real lit window once wired. The one
  // place a module borrows the game's light primitive -- litWindow is
  // expensive enough (two fills plus a gradient) that five of them at
  // rest is the ceiling.
  const lx = x + MODULE_W - 18;
  const ly = y + 8;
  if (on) {
    litWindow(g, lx, ly, 9, 9, palette, 0.5 + m.pulse * 0.5);
  } else {
    g.fillStyle = rgba(palette.bone, 0.16);
    g.fillRect(lx, ly, 9, 9);
  }

  if (isSelected) {
    text(g, '▸', x - 12, m.y + 7, {
      size: 18,
      face: DISPLAY,
      color: rgba(palette.bone, 0.8),
      align: 'center',
    });
  }
}

function drawHud(g, ctx, state) {
  const { W, H, palette } = ctx;
  const { wired: count, instability: inst, phase, cascadeT, beats, caption } = state;

  text(g, `${count} / ${WIRE_TARGET}`, W - 34, 44, {
    size: 22,
    face: DISPLAY,
    color: rgba(palette.bone, 0.82),
    align: 'right',
  });

  // Mechanical status only, never a sentence. Every word a player reads
  // that is ABOUT the person comes from config.beats, never from here.
  // During the cascade this small line steps aside for the large
  // centred stage caption below -- see requirement D: the cascade is
  // the argument of the episode and earns the loudest label on screen.
  let status = 'WIRED';
  if (phase === 'wiring' && count === 0) status = 'DRAG TO WIRE';
  else if (phase === 'done') status = 'STABLE';
  if (phase !== 'cascade') {
    text(g, status, W - 34, 68, {
      size: 12,
      face: BODY,
      color: rgba(palette.bone, 0.45),
      align: 'right',
      tracking: 1.4,
    });
  }

  // Instability meter. Deliberately bone, not --signal: the accent is
  // spent on the disruption, and a red bar would read as a fail state
  // when this is only a reading.
  const bx = 34;
  const by = 38;
  const bw = 176;
  text(g, 'INSTABILITY', bx, by - 8, {
    size: 11,
    face: BODY,
    color: rgba(palette.bone, 0.4),
    tracking: 1.4,
  });
  g.fillStyle = rgba(palette.bone, 0.12);
  g.fillRect(bx, by, bw, 7);
  g.fillStyle = rgba(palette.bone, 0.4 + inst * 0.5);
  g.fillRect(bx, by, bw * clamp(inst, 0, 1), 7);
  g.strokeStyle = rgba(palette.bone, 0.28);
  g.lineWidth = 1;
  g.strokeRect(bx, by, bw, 7);

  // The one mechanical instruction this scene states outright, shown
  // only before the first connection -- gone the instant wiring starts,
  // since the sockets themselves are the instruction from then on.
  if (phase === 'wiring' && count === 0) {
    text(g, 'DRAG EACH MODULE ONTO ITS SOCKET', W / 2, 30, {
      size: 12,
      face: BODY,
      color: rgba(palette.bone, 0.5),
      align: 'center',
      tracking: 1.6,
    });
  }

  // Cascade stage caption -- large, centred, unmissable, replacing the
  // small right-aligned status text for exactly this phase.
  if (phase === 'cascade') {
    text(g, cascadeStageLabel(cascadeT), W / 2, 92, {
      size: 27,
      face: DISPLAY,
      color: rgba(palette.bone, 0.9),
      align: 'center',
      tracking: 3,
    });
  }

  // The beat's own label, echoed on the canvas for a couple of seconds,
  // so a player watching the art is told what just landed without having
  // to look away at the record column. Copy comes from config.beats.
  const beat = beats[caption.index];
  if (beat && caption.t > 0) {
    text(g, beat.label, W / 2, H - 24, {
      size: 17,
      face: DISPLAY,
      color: rgba(palette.bone, 0.8),
      align: 'center',
      tracking: 2,
      alpha: clamp(caption.t * 1.6, 0, 1),
    });
  }
}
