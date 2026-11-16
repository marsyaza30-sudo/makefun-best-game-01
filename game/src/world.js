// Prism Drift — the rules and the state, with no drawing and no browser in it: the catcher,
// the pool of falling orbs, stars and void shards, spawning, collisions, score, combo, lives
// and levels. step() advances one fixed step and returns what happened as bit flags, and every
// visible side effect is queued in state.fx for the game loop to turn into sound and sparks,
// so this file can be run headlessly and tested on its own.

import {
  CATCH_POINTS,
  CATCHER,
  COMBO_BONUS_CAP,
  DODGE_POINTS,
  FACETS,
  FIELD,
  LEVEL_EVERY,
  MAX_LEVEL,
  ORB_RADIUS,
  POOL_SIZE,
  SHARD_RADIUS,
  STAR_POINTS,
  START_LIVES,
  TARGET_SCORE,
  VIOLET_UNLOCK_LEVEL,
} from './config.js';

export const KIND_ORB = 0;
export const KIND_STAR = 1;
export const KIND_SHARD = 2;

export const EVENT_CATCH = 1;
export const EVENT_STAR = 2;
export const EVENT_HIT = 4;
export const EVENT_MISS = 8;
export const EVENT_DODGE = 16;
export const EVENT_LEVELUP = 32;
export const EVENT_WIN = 64;
export const EVENT_OVER = 128;

export function facetCountForLevel(level) {
  return level >= VIOLET_UNLOCK_LEVEL ? FACETS.length : 3;
}

function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value));
}

export function createWorld(random) {
  const player = {
    x: (FIELD.width - CATCHER.width) / 2,
    y: CATCHER.y,
    width: CATCHER.width,
    height: CATCHER.height,
    facet: 0,
    tilt: 0,
  };
  const orbs = [];
  for (let index = 0; index < POOL_SIZE; index += 1) {
    orbs.push({
      active: false,
      kind: KIND_ORB,
      facet: 0,
      x: 0,
      y: 0,
      r: ORB_RADIUS,
      speed: 0,
      spin: 0,
      wobble: 0,
    });
  }
  const state = {
    player,
    orbs,
    score: 0,
    lives: START_LIVES,
    combo: 0,
    bestCombo: 0,
    level: 1,
    elapsed: 0,
    spawnTimer: 0.55,
    catches: 0,
    dodges: 0,
    over: false,
    won: false,
    fx: [],
  };

  function reset() {
    player.x = (FIELD.width - CATCHER.width) / 2;
    player.facet = 0;
    player.tilt = 0;
    for (const orb of orbs) orb.active = false;
    state.score = 0;
    state.lives = START_LIVES;
    state.combo = 0;
    state.bestCombo = 0;
    state.level = 1;
    state.elapsed = 0;
    state.spawnTimer = 0.55;
    state.catches = 0;
    state.dodges = 0;
    state.over = false;
    state.won = false;
    state.fx.length = 0;
  }

  function availableFacets() {
    return facetCountForLevel(state.level);
  }

  function cycleFacet(direction) {
    const count = availableFacets();
    player.facet = (((player.facet + direction) % count) + count) % count;
  }

  function setFacet(index) {
    if (index >= 0 && index < availableFacets()) player.facet = index;
  }

  function freeOrb() {
    for (const orb of orbs) if (!orb.active) return orb;
    return null;
  }

  function spawnInterval() {
    return Math.max(0.4, 0.92 - (state.level - 1) * 0.055);
  }

  function spawn() {
    const orb = freeOrb();
    if (orb === null) return;
    const roll = random();
    orb.active = true;
    orb.x = 46 + random() * (FIELD.width - 92);
    orb.y = -32;
    orb.spin = random() * Math.PI * 2;
    orb.wobble = random() * Math.PI * 2;
    orb.speed = 245 + (state.level - 1) * 30 + random() * 80;
    if (state.level >= 2 && roll < 0.15) {
      orb.kind = KIND_SHARD;
      orb.r = SHARD_RADIUS;
      orb.facet = -1;
    } else if (roll < 0.23) {
      orb.kind = KIND_STAR;
      orb.r = ORB_RADIUS;
      orb.facet = -1;
    } else {
      orb.kind = KIND_ORB;
      orb.r = ORB_RADIUS;
      orb.facet = Math.floor(random() * availableFacets());
    }
  }

  function report(type, x, y, value, color) {
    state.fx.push({ type, x, y, value, color });
  }

  function loseLife(events) {
    state.lives -= 1;
    state.combo = 0;
    if (state.lives <= 0 && !state.won) {
      state.over = true;
      events |= EVENT_OVER;
    }
    return events;
  }

  function resolveCatch(orb) {
    let events = 0;
    const facet = FACETS[orb.facet] ?? null;
    if (orb.kind === KIND_STAR) {
      state.score += STAR_POINTS;
      state.combo += 1;
      state.catches += 1;
      report('star', orb.x, orb.y, STAR_POINTS, '#ffe9a8');
      events |= EVENT_STAR;
    } else if (orb.kind === KIND_ORB && orb.facet === player.facet) {
      const points = CATCH_POINTS + Math.min(state.combo, COMBO_BONUS_CAP);
      state.score += points;
      state.combo += 1;
      state.catches += 1;
      report('catch', orb.x, orb.y, points, facet.fill);
      events |= EVENT_CATCH;
    } else {
      const color = orb.kind === KIND_SHARD ? '#ff5470' : facet.fill;
      report('hit', orb.x, orb.y, 0, color);
      events |= EVENT_HIT;
      events |= loseLife(events);
    }
    if (state.combo > state.bestCombo) state.bestCombo = state.combo;
    orb.active = false;
    return events;
  }

  function resolveGround(orb) {
    let events = 0;
    if (orb.kind === KIND_ORB) {
      report('miss', orb.x, FIELD.groundY - 14, 0, FACETS[orb.facet].fill);
      events |= EVENT_MISS;
      events |= loseLife(events);
    } else if (orb.kind === KIND_SHARD) {
      state.score += DODGE_POINTS;
      state.dodges += 1;
      report('dodge', orb.x, FIELD.groundY - 14, DODGE_POINTS, '#8fa2e8');
      events |= EVENT_DODGE;
    } else {
      report('fade', orb.x, FIELD.groundY - 14, 0, '#ffffff');
    }
    orb.active = false;
    return events;
  }

  /**
   * One fixed step. `move` is { dir, targetX }: dir steers by keyboard, targetX (a field
   * coordinate from the pointer) steers directly and wins when it is not null. With `harmless`
   * set — the title screen's backdrop — things fall and drift but nothing is caught, scored
   * or lost.
   */
  function step(dt, move, harmless) {
    let events = 0;
    state.elapsed += dt;

    const centre = player.x + player.width / 2;
    if (!harmless && move.targetX !== null && move.dir === 0) {
      const dx = move.targetX - centre;
      const reach = CATCHER.speed * 1.7 * dt;
      player.x += clamp(dx, -reach, reach);
      player.tilt += (clamp(dx * 0.0011, -0.16, 0.16) - player.tilt) * 0.4;
    } else if (!harmless) {
      player.x += move.dir * CATCHER.speed * dt;
      player.tilt += (move.dir * 0.13 - player.tilt) * 0.35;
    } else {
      player.x = (FIELD.width - player.width) / 2 + Math.sin(state.elapsed * 0.45) * 190;
      player.tilt = Math.cos(state.elapsed * 0.45) * 0.07;
    }
    player.x = clamp(player.x, 0, FIELD.width - player.width);

    if (!state.over && !state.won) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        spawn();
        state.spawnTimer += spawnInterval() * (0.72 + random() * 0.55);
      }
    }

    const catcherCentre = player.x + player.width / 2;
    for (const orb of orbs) {
      if (!orb.active) continue;
      orb.y += orb.speed * dt;
      orb.spin += dt * 2.2;
      orb.x += Math.sin(state.elapsed * 2 + orb.wobble) * 11 * dt;
      if (harmless) {
        if (orb.y - orb.r > FIELD.groundY) orb.active = false;
        continue;
      }
      const inBand = orb.y + orb.r > player.y && orb.y - orb.r < player.y + player.height;
      if (inBand && Math.abs(orb.x - catcherCentre) < player.width / 2 + orb.r * 0.55) {
        events |= resolveCatch(orb);
      } else if (orb.y - orb.r > FIELD.groundY) {
        events |= resolveGround(orb);
      }
      if (state.over) break;
    }

    if (!harmless) {
      const nextLevel = Math.min(MAX_LEVEL, 1 + Math.floor(state.score / LEVEL_EVERY));
      if (nextLevel > state.level) {
        state.level = nextLevel;
        report('level', FIELD.width / 2, 190, nextLevel, '#f4f6ff');
        events |= EVENT_LEVELUP;
      }
      if (!state.won && !state.over && state.score >= TARGET_SCORE) {
        state.won = true;
        events |= EVENT_WIN;
      }
    }
    return events;
  }

  reset();
  return { state, reset, step, cycleFacet, setFacet, availableFacets };
}
