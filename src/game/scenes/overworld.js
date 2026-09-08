import {
  BODY,
  DISPLAY,
  clamp,
  figure,
  fillRough,
  grain,
  halftone,
  litWindow,
  lerp,
  rgba,
  rng,
  text,
  vignette,
  withRim,
} from '../draw.js';

/**
 * THE FLOOR -- the walkable overworld behind NEW GAME.
 *
 * THE IDEA
 * The main menu is a city at night with one window lit. This scene is
 * the inside of that window. You arrive at a desk with the lamp still
 * on, walk out into a corridor, and the corridor has five doors -- one
 * per episode. Through the windows between the doors is the SAME
 * skyline as the title screen, parallaxing as you walk.
 *
 * That last part is the whole reason this scene is drawn rather than
 * built from DOM: it is what makes /floor read as somewhere inside the
 * place you were already standing, instead of as a fifth screen with a
 * fifth mood. The theme jump between the menu and the chapter screen was
 * a real reported defect once already (root CLAUDE.md phase 4); this is
 * the same trap and this is the countermeasure.
 *
 * GATING, AND WHY IT IS ALLOWED
 * Doors open in order: door N is dark until episode N-1 is cleared. That
 * is a real lock, and root CLAUDE.md section 6 rule 1 forbids gating
 * content behind interaction -- so the lock is only legal because this
 * is not the only way in. The stairwell at the start of the corridor
 * goes to /chapters, the ungated Episode Explorer, where all five
 * episodes are readable in any order, and /plain is a click from there.
 * A locked door says so explicitly and points at the stairs. If you ever
 * remove the stairwell, you have broken the spec.
 *
 * COORDINATES
 * Everything below is in WORLD units on the x axis and VIRTUAL units on
 * the y axis (the floor does not scroll vertically). The camera maps
 * world x to screen x. `ctx.H` is 540 and the floor line sits at
 * FLOOR_Y; anything "on the ground" is drawn with its feet at FLOOR_Y.
 */

const FLOOR_Y = 430;
const WALK_SPEED = 210; // world units per second
const DOOR_W = 118;
const DOOR_H = 196;
const DOOR_SPACING = 430;
const FIRST_DOOR_X = 900;
const STAIRS_X = 700;
/*
 * The desk sits under the lamp drawStudy() draws at world x + 96 (see
 * that function -- lampX = x + 96, and x = 150 + shift there), so 246 is
 * DESK_X's own centre, not a guess: 150 + 96 = 246 lines the desk's
 * interactable spot up with the one thing in the room that is already
 * drawn as its visual focus. Do not move this without also moving the
 * lamp in drawStudy(), or the prompt box will float over empty wall.
 */
const DESK_X = 246;
/*
 * How close you must be for a door's prompt to appear.
 *
 * Sized against WALK_SPEED, not picked by eye: at 210 units/second a
 * 92-unit reach gave a 184-unit window, which is under a second of
 * walking, and it was easy to stride straight past a door and see
 * nothing. 115 gives a 230-unit window (~1.1s) while still being far
 * narrower than DOOR_SPACING, so two doors can never both be in reach.
 * The stairwell and door 1 are 200 apart and their zones do overlap
 * slightly; nearestSpot() resolves that by distance, so the overlap is
 * harmless and deterministic.
 */
const REACH = 115;

/**
 * @param {object} config
 * @param {Array}  config.doors      [{ episodeId, number, title, unlocked, cleared }]
 * @param {string} config.startNear  episodeId to spawn beside, or null for the desk
 * @param {(payload:object)=>void} config.onPrompt  called when the focused
 *        interactable changes, so React can mirror it as real DOM text
 *        (a canvas prompt is invisible to a screen reader).
 */
export function createOverworld(config) {
  const { doors = [], startNear = null, onPrompt = () => {} } = config;

  const worldEnd = FIRST_DOOR_X + DOOR_SPACING * Math.max(1, doors.length) + 120;

  // Interactables, in world order. The stairwell is one of them, which
  // is deliberate: the escape hatch is a place in the room, not a
  // caption bolted over it.
  const spots = [
    { kind: 'desk', x: DESK_X, label: 'THE DESK' },
    { kind: 'stairs', x: STAIRS_X, label: 'THE STAIRS', hint: 'Episode Explorer: every episode, unlocked' },
    ...doors.map((door, i) => ({
      kind: 'door',
      x: FIRST_DOOR_X + DOOR_SPACING * i,
      door,
      index: i,
    })),
  ];

  /*
   * Default spawn moved from 190 to 120 (the room's own left clamp) when
   * this desk spot was added. 190 sat only 56 units from DESK_X (246) --
   * well inside REACH (115) -- so a fresh arrival at /floor would have
   * opened straight on the desk prompt before a single step was taken,
   * which reads as broken rather than as arriving at a lit desk. 120 is
   * 126 units away, just outside REACH, so the desk still greets you
   * almost immediately but only once you've actually walked toward it.
   */
  const spawn = (() => {
    if (!startNear) return 120;
    const found = spots.find((s) => s.kind === 'door' && s.door.episodeId === startNear);
    return found ? found.x + 40 : 120;
  })();

  const player = { x: spawn, vx: 0, facing: 1, walkPhase: 0 };
  let camera = player.x;
  let focused = null;
  let lastPromptKey = '';
  let entering = null; // { spot, t } — the door-opening beat before navigation

  // Deterministic skyline, generated once. Same silhouette vocabulary as
  // TitleBackdrop.jsx: overlapping blocks with setbacks and antennas,
  // window grids where lit panes are drawn as real light sources.
  const skyline = buildSkyline(worldEnd);

  function nearestSpot() {
    let best = null;
    let bestDistance = REACH;
    for (const spot of spots) {
      const d = Math.abs(spot.x - player.x);
      if (d < bestDistance) {
        bestDistance = d;
        best = spot;
      }
    }
    return best;
  }

  return {
    init(ctx) {
      onPrompt(null);
      ctx.state.introFade = 0;
    },

    update(dt, ctx) {
      const { input } = ctx;

      if (entering) {
        entering.t += dt;
        if (entering.t > 0.42) {
          const spot = entering.spot;
          entering = null;
          if (spot.kind === 'stairs') ctx.emit('stairs', {});
          else if (spot.kind === 'desk') ctx.emit('desk', {});
          else ctx.emit('enter', { episodeId: spot.door.episodeId });
        }
        return;
      }

      ctx.state.introFade = Math.min(1, (ctx.state.introFade ?? 0) + dt * 1.6);

      // Movement. Pointer-held steering is what makes this playable
      // one-thumbed: hold on either side of the player and you walk that
      // way, which is a far better touch control than a virtual stick.
      let axis = input.axisX();
      const pointer = input.pointer;
      if (!axis && pointer.down && pointer.y > 120) {
        const playerScreenX = player.x - camera + ctx.W / 2;
        const delta = pointer.x - playerScreenX;
        if (Math.abs(delta) > 26) axis = Math.sign(delta);
      }

      player.vx = axis * WALK_SPEED;
      player.x = clamp(player.x + player.vx * dt, 120, worldEnd);
      if (axis) {
        player.facing = axis;
        player.walkPhase += dt * 7.5;
      } else {
        player.walkPhase = 0;
      }

      // Focus + prompt mirroring.
      const next = nearestSpot();
      if (next !== focused) {
        focused = next;
        const key = focused ? `${focused.kind}:${focused.door?.episodeId ?? focused.kind}` : '';
        if (key !== lastPromptKey) {
          lastPromptKey = key;
          if (!focused) onPrompt(null);
          else if (focused.kind === 'stairs') {
            onPrompt({ kind: 'stairs', title: 'The stairs', hint: focused.hint });
          } else if (focused.kind === 'desk') {
            onPrompt({ kind: 'desk', title: 'The desk' });
          } else {
            onPrompt({
              kind: 'door',
              episodeId: focused.door.episodeId,
              number: focused.door.number,
              title: focused.door.title,
              unlocked: focused.door.unlocked,
              cleared: focused.door.cleared,
              blockedBy: focused.door.blockedBy,
            });
          }
          if (focused) ctx.sound('navigate');
        }
      }

      // Enter.
      const wantsEnter = input.pressed('up') || input.pressed('action');
      if (wantsEnter && focused) {
        if (focused.kind === 'stairs' || focused.kind === 'desk' || focused.door.unlocked) {
          ctx.sound('select');
          entering = { spot: focused, t: 0 };
        } else {
          ctx.sound('toast');
          ctx.emit('locked', { episodeId: focused.door.episodeId });
        }
      }
    },

    draw(g, ctx) {
      const { W, H, palette } = ctx;
      // Camera eases toward the player so the world does not snap on a
      // direction change. Clamped so the room's left wall and the far end
      // of the corridor both stay put rather than sliding into the void.
      camera = lerp(camera, player.x, ctx.reducedMotion ? 1 : 0.12);
      camera = clamp(camera, W / 2 - 120, worldEnd - W / 2 + 200);
      const shift = -camera + W / 2;

      g.fillStyle = palette.ink;
      g.fillRect(0, 0, W, H);

      drawSkyline(g, ctx, skyline, shift);
      drawBackWall(g, ctx, shift);
      drawStudy(g, ctx, shift, focused?.kind === 'desk');
      drawStairs(g, ctx, shift);
      for (const spot of spots) {
        if (spot.kind === 'door') drawDoor(g, ctx, spot, shift);
      }
      drawFloor(g, ctx, shift);
      /*
       * Door labels are painted AFTER the floor, not inside drawDoor().
       * They sit at FLOOR_Y + 34 — below the floor line — and drawFloor()
       * fills solid ink from FLOOR_Y down, so drawing them with the door
       * put them under the floor and no episode title was visible on the
       * whole screen.
       */
      for (const spot of spots) {
        if (spot.kind === 'door') drawDoorLabel(g, ctx, spot, shift, focused === spot);
      }
      drawPlayerAt(g, ctx, player, shift);
      if (focused) drawPromptFor(g, ctx, focused, shift);
      if (entering) drawEnterFlash(g, ctx, entering);

      vignette(g, W, H, palette, 0.34);
      grain(g, W, H, ctx.reducedMotion ? 0.025 : 0.038, ctx.reducedMotion, ctx.frame);

      // Opening fade, so arriving from PageTransition.jsx's dolly does
      // not cut hard to a fully lit room.
      const fade = 1 - (ctx.state.introFade ?? 1);
      if (fade > 0.01) {
        g.fillStyle = rgba(palette.ink, fade);
        g.fillRect(0, 0, W, H);
      }
    },

    dispose() {
      onPrompt(null);
    },
  };
}

/* -- Scenery ------------------------------------------------------- */

function buildSkyline(worldEnd) {
  const rand = rng(4821);
  const buildings = [];
  let x = -400;
  while (x < worldEnd + 600) {
    const w = 60 + rand() * 110;
    const h = 90 + rand() * 190;
    const windows = [];
    const cols = Math.max(1, Math.floor(w / 22));
    const rows = Math.max(1, Math.floor(h / 26));
    for (let c = 0; c < cols; c += 1) {
      for (let r = 0; r < rows; r += 1) {
        if (rand() > 0.34) continue;
        windows.push({ x: 8 + c * 22, y: 14 + r * 26, lit: rand() > 0.35 });
      }
    }
    buildings.push({ x, w, h, windows, antenna: rand() > 0.72 });
    x += w + 14 + rand() * 40;
  }
  return buildings;
}

function drawSkyline(g, ctx, buildings, shift) {
  const { palette } = ctx;
  // 0.35 parallax: the city outside moves a third as fast as the
  // corridor, which is what sells depth through the glass.
  const px = shift * 0.35;
  const base = FLOOR_Y - 40;

  g.save();
  /*
   * The sky is the brightest thing in the scene, and it has to be: it is
   * the only surface behind the wall, so it is what the window openings
   * read against. A flat low-alpha dusk fill (the first version) left the
   * openings almost the same value as the wall around them, which is why
   * the windows did not read as windows at all.
   */
  const sky = g.createLinearGradient(0, 0, 0, base);
  sky.addColorStop(0, rgba(palette.dusk, 0.95));
  sky.addColorStop(0.65, rgba(palette.dusk, 0.6));
  sky.addColorStop(1, rgba(palette.dusk, 0.3));
  g.fillStyle = sky;
  g.fillRect(0, 0, ctx.W, base);

  for (const b of buildings) {
    const bx = b.x + px;
    if (bx + b.w < -80 || bx > ctx.W + 80) continue;
    g.fillStyle = palette.ink;
    g.fillRect(bx, base - b.h, b.w, b.h);
    if (b.antenna) {
      g.fillRect(bx + b.w / 2 - 1.5, base - b.h - 26, 3, 26);
    }
    for (const win of b.windows) {
      if (!win.lit) continue;
      // Two passes: a soft bleed around the pane, then the pane. Same
      // reason litWindow() draws twice — a single flat rect reads as a
      // grey square rather than as a light that is on.
      g.fillStyle = rgba(palette.bone, 0.16);
      g.fillRect(bx + win.x - 3, base - b.h + win.y - 3, 14, 17);
      g.fillStyle = rgba(palette.bone, 0.82);
      g.fillRect(bx + win.x, base - b.h + win.y, 8, 11);
    }
  }
  g.restore();
}

function drawBackWall(g, ctx, shift) {
  const { W, palette } = ctx;
  const wallTop = 96;

  /*
   * The wall is drawn near-black, not in flat --shadow.
   *
   * The first version filled this whole band with solid --shadow
   * (#3b342e), and because the wall is roughly 60% of the frame that one
   * fill turned the entire scene into an even mid-brown field: the desk,
   * the chair, the doors and the walker were all ink-on-brown at almost
   * the same contrast, and the lamp had nothing dark to be bright
   * against. The scene read as a murky rectangle.
   *
   * A night interior only works if most of the frame is genuinely dark
   * and light is scarce and local. So: an ink ground, a soft --shadow
   * wash that falls off toward the floor, and actual pools of light cast
   * by the things that emit it (drawn by their own draw functions).
   */
  g.fillStyle = palette.ink;
  g.fillRect(0, wallTop, W, FLOOR_Y - wallTop);
  const wash = g.createLinearGradient(0, wallTop, 0, FLOOR_Y);
  wash.addColorStop(0, rgba(palette.shadow, 0.75));
  wash.addColorStop(0.55, rgba(palette.shadow, 0.34));
  wash.addColorStop(1, rgba(palette.shadow, 0.08));
  g.fillStyle = wash;
  g.fillRect(0, wallTop, W, FLOOR_Y - wallTop);

  /*
   * Windows sit HALFWAY BETWEEN doors, not on the door grid.
   *
   * The first version started this loop at i = -1 with an offset that put
   * a window at world x 710 — ten units from the stairwell at 700 — so
   * the corridor's first window was drawn inside the stairs and neither
   * read. Offsetting forward by half a door spacing puts the first
   * window between doors 1 and 2 and every later one between a pair,
   * whatever DOOR_SPACING is changed to. The stretch before door 1 gets
   * no window on purpose: the stairwell is the feature there.
   */
  const windowX = (i) => FIRST_DOOR_X + DOOR_SPACING / 2 + i * DOOR_SPACING;

  g.save();
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 10; i += 1) {
    const wx = windowX(i) + shift;
    if (wx + 150 < 0 || wx > W) continue;
    g.fillRect(wx, wallTop + 46, 150, 150);
  }
  g.restore();

  // Window frames and sills, drawn back over the holes.
  for (let i = 0; i < 10; i += 1) {
    const wx = windowX(i) + shift;
    if (wx + 150 < 0 || wx > W) continue;
    g.strokeStyle = palette.ink;
    g.lineWidth = 5;
    g.strokeRect(wx, wallTop + 46, 150, 150);
    g.beginPath();
    g.moveTo(wx + 75, wallTop + 46);
    g.lineTo(wx + 75, wallTop + 196);
    g.moveTo(wx, wallTop + 121);
    g.lineTo(wx + 150, wallTop + 121);
    g.stroke();
    // The city outside is brighter than the corridor, so the opening
    // throws a wedge of light onto the wall and the floor below it.
    const spill = g.createLinearGradient(0, wallTop + 196, 0, FLOOR_Y);
    spill.addColorStop(0, rgba(palette.bone, 0.16));
    spill.addColorStop(1, rgba(palette.bone, 0));
    g.fillStyle = spill;
    g.fillRect(wx - 20, wallTop + 196, 190, FLOOR_Y - wallTop - 196);
    g.fillStyle = rgba(palette.bone, 0.2);
    g.fillRect(wx - 6, wallTop + 194, 162, 4);
  }

  /*
   * Ceiling lights, one per door bay. A corridor with no light of its own
   * is just a dark band, and the walker crossing it had nothing to be
   * lit by between doors — the frame went dead in the gaps. These are
   * what give the corridor rhythm and tell you it continues.
   */
  for (let i = -1; i < 10; i += 1) {
    const lx = FIRST_DOOR_X + i * DOOR_SPACING + shift;
    if (lx < -200 || lx > W + 200) continue;
    const pool = g.createRadialGradient(lx, wallTop + 8, 0, lx, wallTop + 8, 300);
    pool.addColorStop(0, rgba(palette.bone, 0.2));
    pool.addColorStop(1, rgba(palette.bone, 0));
    g.fillStyle = pool;
    g.fillRect(lx - 300, wallTop, 600, FLOOR_Y - wallTop);
    g.fillStyle = rgba(palette.bone, 0.55);
    g.fillRect(lx - 26, wallTop, 52, 5);
  }

  // Ceiling line.
  g.fillStyle = palette.ink;
  g.fillRect(0, wallTop - 8, W, 10);
}

function drawStudy(g, ctx, shift, focused = false) {
  const { palette } = ctx;
  const x = 150 + shift;
  if (x > ctx.W + 200 || x < -520) return;

  // The desk lamp -- the light that was on in the title screen's window.
  // It is the brightest thing in the room and it has to look like it:
  // a wide falloff on the wall behind it, then the hot core.
  const lampX = x + 96;
  const lampY = FLOOR_Y - 148;
  const pool = g.createRadialGradient(lampX, lampY, 0, lampX, lampY, 260);
  pool.addColorStop(0, rgba(palette.bone, 0.3));
  pool.addColorStop(0.4, rgba(palette.bone, 0.09));
  pool.addColorStop(1, rgba(palette.bone, 0));
  g.fillStyle = pool;
  g.fillRect(lampX - 260, lampY - 260, 520, 520);
  litWindow(g, lampX - 15, lampY - 12, 30, 18, palette, 1);

  // Spill on the floor beneath it.
  halftone(g, x - 20, FLOOR_Y - 64, 300, 64, rgba(palette.bone, 0.7), 'up', 9, 31);

  // Desk.
  g.fillStyle = palette.ink;
  g.fillRect(x + 10, FLOOR_Y - 108, 190, 12);
  g.fillRect(x + 22, FLOOR_Y - 96, 10, 96);
  g.fillRect(x + 178, FLOOR_Y - 96, 10, 96);
  // Lamp arm.
  g.fillRect(lampX - 2, lampY, 4, 44);
  g.fillRect(lampX - 22, FLOOR_Y - 112, 44, 6);
  // Papers, catching the lamp -- brighter while the desk is the focused
  // interactable, the same subtle cue the doors already use (their
  // handle/border/number all step up in the same way when unlocked).
  // No icon, per this project's do-not-add list -- brightness alone is
  // the whole affordance.
  g.fillStyle = rgba(palette.bone, focused ? 0.94 : 0.72);
  g.fillRect(x + 46, FLOOR_Y - 116, 46, 9);
  g.fillRect(x + 100, FLOOR_Y - 114, 38, 7);

  // Chair, pushed back. Nobody is sitting here -- you are the one who
  // came in after hours.
  g.fillStyle = palette.ink;
  g.fillRect(x + 232, FLOOR_Y - 96, 12, 96);
  g.fillRect(x + 232, FLOOR_Y - 100, 62, 10);
  g.fillRect(x + 284, FLOOR_Y - 60, 10, 60);

  text(g, 'THE DESK', x + 16, 148, {
    size: 15,
    face: DISPLAY,
    color: rgba(palette.bone, focused ? 0.7 : 0.34),
    tracking: 3,
  });
}

function drawStairs(g, ctx, shift) {
  const { palette } = ctx;
  const x = STAIRS_X + shift;
  if (x < -220 || x > ctx.W + 220) return;

  // A recessed stairwell in the wall. Drawn as an opening rather than a
  // door because it must never look like a sixth episode.
  g.fillStyle = palette.ink;
  g.fillRect(x - 62, FLOOR_Y - 168, 124, 168);
  for (let i = 0; i < 6; i += 1) {
    g.fillStyle = rgba(palette.bone, 0.06 + i * 0.02);
    g.fillRect(x - 54 + i * 9, FLOOR_Y - 22 - i * 22, 108 - i * 18, 8);
  }
  g.strokeStyle = rgba(palette.bone, 0.3);
  g.lineWidth = 3;
  g.strokeRect(x - 62, FLOOR_Y - 168, 124, 168);

  text(g, 'STAIRS', x, FLOOR_Y - 184, {
    size: 15,
    face: DISPLAY,
    color: rgba(palette.bone, 0.55),
    align: 'center',
    tracking: 3,
  });
}

function drawDoor(g, ctx, spot, shift) {
  const { palette } = ctx;
  const x = spot.x + shift;
  if (x < -240 || x > ctx.W + 240) return;

  const { door } = spot;
  const top = FLOOR_Y - DOOR_H;
  const left = x - DOOR_W / 2;

  // Transom above the door. Lit = open. This is the single readable
  // signal for gating: a dark transom is a locked door, no icon needed.
  const lit = door.unlocked ? (door.cleared ? 0.55 : 1) : 0;
  if (lit > 0) {
    litWindow(g, left + 12, top - 34, DOOR_W - 24, 24, palette, lit);
    // Light spilling out across the corridor floor.
    halftone(g, left - 46, FLOOR_Y - 54, DOOR_W + 92, 54, rgba(palette.bone, 0.42 * lit), 'up', 9, spot.index * 17 + 3);
  }

  // Frame and leaf.
  g.fillStyle = palette.ink;
  g.fillRect(left - 10, top - 42, DOOR_W + 20, DOOR_H + 42);
  fillRough(g, left, top, DOOR_W, DOOR_H, door.unlocked ? palette.shadow : palette.ink, spot.index * 9 + 5, 3);
  g.strokeStyle = door.unlocked ? rgba(palette.bone, 0.42) : rgba(palette.bone, 0.14);
  g.lineWidth = 3;
  g.strokeRect(left, top, DOOR_W, DOOR_H);

  // Handle.
  g.fillStyle = door.unlocked ? rgba(palette.bone, 0.6) : rgba(palette.bone, 0.16);
  g.fillRect(left + DOOR_W - 26, top + DOOR_H / 2 - 4, 14, 8);

  // Episode number, stencilled on the door.
  text(g, String(door.number), x, top + 66, {
    size: 44,
    face: DISPLAY,
    color: door.unlocked ? rgba(palette.bone, 0.9) : rgba(palette.bone, 0.2),
    align: 'center',
  });

  // Cleared doors get the one --signal mark on this screen.
  if (door.cleared) {
    g.fillStyle = palette.signal;
    g.beginPath();
    g.moveTo(left + DOOR_W - 4, top + 4);
    g.lineTo(left + DOOR_W - 4, top + 30);
    g.lineTo(left + DOOR_W - 30, top + 4);
    g.closePath();
    g.fill();
  }

  // Locked doors get a physical bar rather than a padlock glyph -- an
  // icon set is on this project's do-not-add list (root CLAUDE.md phase 4).
  if (!door.unlocked) {
    g.fillStyle = rgba(palette.bone, 0.22);
    g.save();
    g.translate(x, top + DOOR_H / 2);
    g.rotate(-0.13);
    g.fillRect(-DOOR_W / 2 - 12, -7, DOOR_W + 24, 14);
    g.restore();
  }

}

/** Drawn in its own pass after the floor — see the call site for why. */
function drawDoorLabel(g, ctx, spot, shift, isFocused) {
  const { palette } = ctx;
  const x = spot.x + shift;
  if (x < -240 || x > ctx.W + 240) return;
  const { door } = spot;

  const labelAlpha = isFocused ? 0.95 : door.unlocked ? 0.66 : 0.34;
  text(g, door.title, x, FLOOR_Y + 38, {
    size: 15,
    face: DISPLAY,
    color: rgba(palette.bone, labelAlpha),
    align: 'center',
    tracking: 2.4,
  });
  // The episode number under the title, so the play order is legible
  // without counting doors.
  text(g, `EPISODE ${door.number}`, x, FLOOR_Y + 58, {
    size: 10,
    face: BODY,
    color: rgba(palette.bone, isFocused ? 0.55 : 0.3),
    align: 'center',
    tracking: 1.8,
  });
}

function drawFloor(g, ctx, shift) {
  const { W, H, palette } = ctx;
  g.fillStyle = palette.ink;
  g.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
  g.fillStyle = rgba(palette.bone, 0.16);
  g.fillRect(0, FLOOR_Y, W, 2);

  // Floorboards, so walking reads as motion even on a bare stretch.
  g.fillStyle = rgba(palette.bone, 0.05);
  for (let i = -2; i < 40; i += 1) {
    const bx = i * 96 + (shift % 96);
    g.fillRect(bx, FLOOR_Y + 4, 2, H - FLOOR_Y);
  }
}

/* -- Player + prompt ------------------------------------------------
   Both need the walker, which lives inside createOverworld's closure.
   They take it as an explicit argument rather than closing over it, so
   this module stays a set of pure draw helpers that can be unit-tested
   against a stub context. */

function drawPlayerAt(g, ctx, p, shift) {
  const { palette } = ctx;
  const sx = p.x + shift;
  const pose = p.vx === 0 ? 0 : Math.floor(p.walkPhase % 2) === 0 ? 1 : 2;

  /*
   * The walker is ink, standing on an ink floor, in front of a dark
   * wall. Without deliberate separation it simply vanishes -- which it
   * did in the first pass. Three things fix it, in this order:
   *
   *  1. A pale ground-glow directly under the feet, so there is
   *     something light for the silhouette to sit against.
   *  2. A hard contact shadow on top of that glow, which is what makes
   *     the figure read as standing ON the floor rather than pasted over
   *     it.
   *  3. A rim light that is genuinely wide (4px, 0.85 alpha), not the
   *     hairline the first version used. At this figure height a 2.5px
   *     rim at half alpha is invisible.
   */
  const glow = g.createRadialGradient(sx, FLOOR_Y, 0, sx, FLOOR_Y, 96);
  glow.addColorStop(0, rgba(palette.bone, 0.14));
  glow.addColorStop(1, rgba(palette.bone, 0));
  g.fillStyle = glow;
  g.fillRect(sx - 96, FLOOR_Y - 96, 192, 192);

  g.fillStyle = rgba(palette.ink, 0.95);
  g.beginPath();
  g.ellipse(sx, FLOOR_Y + 3, 26, 6, 0, 0, Math.PI * 2);
  g.fill();

  g.save();
  g.translate(sx, FLOOR_Y);
  withRim(
    g,
    (gg) => figure(gg, 0, 0, 108, pose, p.facing < 0),
    -4 * p.facing,
    -1.5,
    rgba(palette.bone, 0.85),
    palette.ink,
  );
  g.restore();
}

function drawPromptFor(g, ctx, spot, shift) {
  const { palette } = ctx;
  const x = spot.x + shift;
  const y = spot.kind === 'door' ? FLOOR_Y - 300 : FLOOR_Y - 214;

  const locked = spot.kind === 'door' && !spot.door.unlocked;
  const line =
    spot.kind === 'stairs'
      ? 'Episode Explorer'
      : spot.kind === 'desk'
        ? 'The plain resume'
        : locked
          ? `Clear episode ${spot.door.number - 1} first`
          : spot.door.cleared
            ? 'Replay'
            : 'Enter';

  const label = spot.kind === 'stairs' ? 'THE STAIRS' : spot.kind === 'desk' ? 'THE DESK' : spot.door.title;

  g.save();
  g.font = `400 15px ${DISPLAY}`;
  const w = Math.max(g.measureText(label).width, 150) + 44;
  g.restore();

  fillRough(g, x - w / 2, y, w, 62, rgba(palette.ink, 0.94), 71, 3);
  g.strokeStyle = rgba(palette.bone, locked ? 0.24 : 0.5);
  g.lineWidth = 2;
  g.strokeRect(x - w / 2, y, w, 62);

  text(g, label, x, y + 24, {
    size: 15,
    face: DISPLAY,
    color: rgba(palette.bone, locked ? 0.45 : 0.95),
    align: 'center',
    tracking: 2.2,
  });
  text(g, locked ? line : `▲ / E   ${line}`, x, y + 46, {
    size: 12,
    face: BODY,
    color: locked ? rgba(palette.bone, 0.4) : palette.signal,
    align: 'center',
    tracking: 1.2,
  });

  // Pointer down at the door.
  if (!ctx.reducedMotion) {
    const bob = Math.sin(ctx.time * 3.4) * 3;
    g.fillStyle = rgba(palette.bone, locked ? 0.2 : 0.5);
    g.beginPath();
    g.moveTo(x - 7, y + 72 + bob);
    g.lineTo(x + 7, y + 72 + bob);
    g.lineTo(x, y + 82 + bob);
    g.closePath();
    g.fill();
  }
}

function drawEnterFlash(g, ctx, entering) {
  const { W, H, palette } = ctx;
  const t = clamp(entering.t / 0.42, 0, 1);
  g.fillStyle = rgba(palette.ink, t);
  g.fillRect(0, 0, W, H);
}

export { FLOOR_Y };
