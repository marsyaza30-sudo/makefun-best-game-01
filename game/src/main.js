// Prism Drift — boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps, world events are turned into sound, sparks and banners, and the renderer
// paints what is there. The game moves between five screens: title, play, paused, win and
// game over.
//
// ?seed=N fixes the falling pattern. ?shot=title|play|win|over (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady for a
// screenshot.
import { BEST_KEY, STEP, VIOLET_UNLOCK_LEVEL } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld,
  EVENT_LEVELUP,
  EVENT_OVER,
  EVENT_WIN,
} from './world.js';
import {
  ACTION_CONFIRM,
  ACTION_CYCLE_NEXT,
  ACTION_CYCLE_PREV,
  ACTION_MUTE,
  ACTION_PAUSE,
  createInput,
} from './input.js';
import { createAudio } from './audio.js';
import { createParticles } from './particles.js';
import {
  createRenderer,
  SCREEN_OVER,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_WIN,
} from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const particles = createParticles(createRandom((seed ^ 0x9e3779b9) >>> 0));
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world, particles);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, { best: scene.best, particles, banner: null, muted: false });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let banner = null;
  let bannerTimeLeft = 0;

  window.addEventListener('pointerdown', () => audio.unlock());
  window.addEventListener('keydown', () => audio.unlock());

  function announce(message) {
    status.textContent = message;
  }

  function showBanner(title, sub, seconds = 1.6) {
    banner = { title, sub };
    bannerTimeLeft = seconds;
  }

  function startGame() {
    world.reset();
    particles.clear();
    banner = null;
    bannerTimeLeft = 0;
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.playClick();
    announce('Playing. Catch each orb with the matching facet. Reach 1,000 to mend the Core.');
  }

  function finishGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    if (won) {
      audio.playWin();
      particles.burst(640, 300, '#2de2c5', 30, 380);
      particles.burst(420, 220, '#ffc94d', 22, 320);
      particles.burst(860, 220, '#ff5d73', 22, 320);
      announce(`Core restored. Score ${world.state.score}. Best ${best}.`);
    } else {
      audio.playLose();
      renderer.shake(16);
      announce(`Game over. Score ${world.state.score}. Best ${best}.`);
    }
  }

  // Turn everything the world queued during the last steps into sound, sparks and text.
  function drainEffects() {
    const queue = world.state.fx;
    for (const fx of queue) {
      if (fx.type === 'catch') {
        audio.playCatch(world.state.combo);
        particles.burst(fx.x, fx.y, fx.color, 15, 270);
        particles.ring(fx.x, fx.y, fx.color);
        particles.floatText(fx.x, fx.y - 30, `+${fx.value}`, fx.color, 27);
      } else if (fx.type === 'star') {
        audio.playStar();
        particles.burst(fx.x, fx.y, '#ffe9a8', 22, 320);
        particles.ring(fx.x, fx.y, '#ffffff');
        particles.floatText(fx.x, fx.y - 30, `+${fx.value} STAR`, '#ffe9a8', 28);
      } else if (fx.type === 'hit') {
        audio.playHit();
        renderer.shake(13);
        particles.burst(fx.x, fx.y, fx.color, 24, 340);
        particles.floatText(fx.x, fx.y - 30, 'SHATTERED!', '#ff5470', 28);
        announce(world.state.lives === 1 ? 'Shattered. 1 life left.' : `Shattered. ${world.state.lives} lives left.`);
      } else if (fx.type === 'miss') {
        audio.playMiss();
        renderer.shake(7);
        particles.burst(fx.x, fx.y, fx.color, 10, 200);
        particles.floatText(fx.x, fx.y - 26, 'MISSED', '#9aa7d0', 24);
      } else if (fx.type === 'dodge') {
        audio.playDodge();
        particles.floatText(fx.x, fx.y - 22, `+${fx.value} DODGED`, '#8fa2e8', 22);
      } else if (fx.type === 'level') {
        audio.playLevelUp();
        const sub = fx.value === VIOLET_UNLOCK_LEVEL ? 'Violet facet unlocked — four colours now fall!' : 'The drift speeds up.';
        showBanner(`LEVEL ${fx.value}`, sub);
      }
    }
    queue.length = 0;
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound muted.' : 'Sound on.');
    }
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN) {
      if (actions & ACTION_CONFIRM) startGame();
      return;
    }
    if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
      return;
    }
    // Playing.
    if (actions & ACTION_PAUSE) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
      return;
    }
    const facetRequest = input.takeFacetRequest();
    if (facetRequest >= 0) {
      if (facetRequest !== world.state.player.facet) audio.playCycle();
      world.setFacet(facetRequest);
    }
    if (actions & ACTION_CYCLE_NEXT) {
      world.cycleFacet(1);
      audio.playCycle();
    }
    if (actions & ACTION_CYCLE_PREV) {
      world.cycleFacet(-1);
      audio.playCycle();
    }
  }

  function currentMove() {
    const dir = input.direction();
    let targetX = null;
    if (dir === 0) {
      const pointer = input.pointerX();
      if (pointer !== null) targetX = renderer.toFieldX(pointer);
    }
    return { dir, targetX };
  }

  function stepWorld() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { dir: 0, targetX: null }, true);
      return;
    }
    const events = world.step(STEP, currentMove(), false);
    drainEffects();
    if (events & EVENT_WIN) finishGame(true);
    else if (events & EVENT_OVER) finishGame(false);
    else if (events & EVENT_LEVELUP) announce(`Level ${world.state.level}.`);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const frameSeconds = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    accumulator += frameSeconds;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        stepWorld();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    particles.update(frameSeconds);
    renderer.updateShake(frameSeconds);
    if (bannerTimeLeft > 0) bannerTimeLeft -= frameSeconds;
    const bannerView = banner !== null && bannerTimeLeft > 0
      ? { title: banner.title, sub: banner.sub, alpha: Math.min(1, bannerTimeLeft / 0.35) }
      : null;
    renderer.draw(world.state, screen, { best, particles, banner: bannerView, muted: audio.isMuted() });
  }

  // Leaving the tab pauses a running game rather than letting orbs fall unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Prism Drift. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
