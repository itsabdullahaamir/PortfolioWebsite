import { createStack } from './stack.js';
import { createHandsUp } from './handsUp.js';
import { createEventDay } from './eventDay.js';
import { createFortyEight } from './fortyEight.js';
import { createLiveGraph } from './liveGraph.js';

/**
 * Scene registry -- the join between a game's `kind` in
 * src/data/games.js and the module that renders it.
 *
 * THE CONTRACT EVERY FACTORY HONOURS
 * Each factory takes ONE config object and returns a scene as defined in
 * ../engine.js:
 *
 *   createX({ beats, episode, onDone }) -> { init?, update?, draw, dispose? }
 *
 *   beats    the array from games.js. The ONLY source of copy in the
 *            scene. A scene that hardcodes a fact is a bug: games.js and
 *            episodes.js are the resume, and a game surface that invents
 *            a credential is the one failure this project cannot absorb.
 *   episode  the matching episodes.js record, for a title or a tag. Read
 *            only.
 *   onDone   optional side-channel; prefer ctx.emit.
 *
 * EVENTS a scene emits through ctx.emit (see Play.jsx for the receiver):
 *   'reveal'   { index }            exactly once per beat, in order
 *   'progress' { value }            0..1, whenever it changes
 *   'done'     { outcome, stat }    once. outcome is 'win' | 'end'.
 *
 * There is deliberately no 'lose' outcome. A run that ends early still
 * lands on the results card showing everything uncovered, and the card
 * still offers the door onward -- because content must never sit behind
 * a skill check (root CLAUDE.md section 6 rules 1 and 2). The game is
 * allowed to be lost. The resume is not allowed to be locked.
 *
 * See ./stack.js for the reference implementation.
 */
const FACTORIES = {
  stack: createStack,
  handsUp: createHandsUp,
  eventDay: createEventDay,
  fortyEight: createFortyEight,
  liveGraph: createLiveGraph,
};

export function createScene(kind, config) {
  const factory = FACTORIES[kind];
  if (!factory) throw new Error(`Unknown minigame kind: ${kind}`);
  return factory(config);
}

export const sceneKinds = Object.keys(FACTORIES);
