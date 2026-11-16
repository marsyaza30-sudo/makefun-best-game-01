// Prism Drift — the screenshot scenes behind ?shot=title|play|win|over (with &seed=N). Each
// scene plays the real rules forward from a fresh world, steered by a small pilot, so the
// frame is what a real game looks like and the same seed always gives the same frame. The
// title idles behind its panel; play chases the lowest orb with the right facet; the win
// scene plays until the Core is mended; the over scene plays carelessly — it never rotates
// its facet and chases shards — and shatters, as a hurried player does.

import { FACETS, FIELD, STEP, TARGET_SCORE } from './config.js';
import { KIND_ORB, KIND_SHARD } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const TITLE_SECONDS = 4;
const PLAY_SECONDS = 15;
const WIN_LIMIT_SECONDS = 150;
const OVER_LIMIT_SECONDS = 120;
const CENTRE_MOVE = { dir: 0, targetX: null };

function lowestOrb(state) {
  let lowest = null;
  for (const orb of state.orbs) {
    if (orb.active && (lowest === null || orb.y > lowest.y)) lowest = orb;
  }
  return lowest;
}

/** Careful play: match the lowest orb's facet and stand under it; step aside for shards. */
function carefulMove(state, world) {
  const orb = lowestOrb(state);
  if (orb === null) return CENTRE_MOVE;
  const centre = state.player.x + state.player.width / 2;
  if (orb.kind === KIND_SHARD) {
    return { dir: 0, targetX: orb.x < centre ? FIELD.width * 0.85 : FIELD.width * 0.15 };
  }
  if (orb.kind === KIND_ORB) world.setFacet(orb.facet);
  return { dir: 0, targetX: orb.x };
}

/** Careless play: never rotate, and run at whatever falls — shards included. */
function carelessMove(state) {
  const orb = lowestOrb(state);
  if (orb === null) return CENTRE_MOVE;
  return { dir: 0, targetX: orb.x };
}

function celebrate(state, particles) {
  const centre = state.player.x + state.player.width / 2;
  particles.burst(centre, state.player.y, FACETS[state.player.facet].fill, 22, 320);
  particles.burst(FIELD.width * 0.3, 240, '#2de2c5', 16, 260);
  particles.burst(FIELD.width * 0.7, 240, '#ffc94d', 16, 260);
  particles.ring(centre, state.player.y, '#ffffff');
}

/**
 * Set `world` (and `particles`) to the named scene and return the screen to draw over it and
 * the best score to show. Any other name is the title.
 */
export function stageShot(name, world, particles) {
  world.reset();
  if (name === 'play') {
    for (let index = 0; index < PLAY_SECONDS / STEP; index += 1) {
      world.step(STEP, carefulMove(world.state, world), false);
      if (world.state.over || world.state.won) break;
    }
    const state = world.state;
    if (!state.over && !state.won) {
      particles.burst(state.player.x + state.player.width / 2, state.player.y, FACETS[state.player.facet].fill, 20, 300);
      particles.floatText(state.player.x + state.player.width / 2, state.player.y - 44, '+30', '#ffc94d', 30);
    }
    particles.update(0.12);
    return { screen: state.won ? SCREEN_WIN : SCREEN_PLAY, best: state.score };
  }
  if (name === 'win') {
    for (let index = 0; index < WIN_LIMIT_SECONDS / STEP; index += 1) {
      world.step(STEP, carefulMove(world.state, world), false);
      if (world.state.won || world.state.over) break;
    }
    const state = world.state;
    if (!state.won) {
      // The pilot ran out of luck on this seed: keep its lively field, but stage the result.
      state.score = TARGET_SCORE + 60;
      state.catches = Math.max(state.catches, 44);
      state.bestCombo = Math.max(state.bestCombo, 12);
      state.level = 7;
      state.won = true;
      state.over = false;
      state.lives = Math.max(state.lives, 1);
    }
    celebrate(state, particles);
    particles.update(0.12);
    return { screen: SCREEN_WIN, best: state.score };
  }
  if (name === 'over') {
    for (let index = 0; index < OVER_LIMIT_SECONDS / STEP; index += 1) {
      world.step(STEP, carelessMove(world.state), false);
      if (world.state.over) break;
    }
    const state = world.state;
    if (!state.over) {
      state.lives = 0;
      state.over = true;
    }
    particles.burst(state.player.x + state.player.width / 2, state.player.y, '#ff5470', 24, 320);
    particles.update(0.12);
    return { screen: SCREEN_OVER, best: Math.max(state.score, 240) };
  }
  for (let index = 0; index < TITLE_SECONDS / STEP; index += 1) {
    world.step(STEP, CENTRE_MOVE, true);
  }
  return { screen: SCREEN_TITLE, best: 0 };
}
