// Prism Drift — drawing only: the world's state and the current screen in, pixels out. The
// 1280x720 field is scaled to fit the window and centred; everything is drawn procedurally
// with canvas paths (no image files): a starfield sky, glowing orbs stamped with their facet
// shapes, spiky void shards, and the prism catcher whose top plate wears the active facet's
// colour. Text that holds a number is rebuilt only when the number changes.

import { FACETS, FIELD, FONT, PALETTE, START_LIVES, TARGET_SCORE } from './config.js';
import { createRandom } from './random.js';
import { KIND_ORB, KIND_SHARD, KIND_STAR } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const PANEL_WIDTH = 660;
const STAR_COUNT = 110;

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

/** Draw one facet's shape (triangle, circle, diamond or hexagon) centred at x, y. */
export function drawFacetShape(context, shape, x, y, radius) {
  context.beginPath();
  if (shape === 'circle') {
    context.arc(x, y, radius * 0.72, 0, Math.PI * 2);
  } else if (shape === 'triangle') {
    context.moveTo(x, y - radius);
    context.lineTo(x + radius * 0.9, y + radius * 0.75);
    context.lineTo(x - radius * 0.9, y + radius * 0.75);
    context.closePath();
  } else if (shape === 'diamond') {
    context.moveTo(x, y - radius);
    context.lineTo(x + radius * 0.78, y);
    context.lineTo(x, y + radius);
    context.lineTo(x - radius * 0.78, y);
    context.closePath();
  } else {
    for (let side = 0; side < 6; side += 1) {
      const angle = (Math.PI / 3) * side - Math.PI / 2;
      const px = x + Math.cos(angle) * radius * 0.85;
      const py = y + Math.sin(angle) * radius * 0.85;
      if (side === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
    context.closePath();
  }
  context.fill();
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0, ratio: 1 };
  let backgroundGradient = null;
  let shakeMagnitude = 0;

  const starRandom = createRandom(20261116);
  const stars = [];
  for (let index = 0; index < STAR_COUNT; index += 1) {
    stars.push({
      x: starRandom() * FIELD.width,
      y: starRandom() * FIELD.height,
      size: 1 + starRandom() * 2.2,
      phase: starRandom() * Math.PI * 2,
    });
  }

  const scoreLabel = cachedLabel('SCORE ');
  const levelLabel = cachedLabel('LEVEL ');
  const comboLabel = cachedLabel('COMBO x');
  const finalScoreLabel = cachedLabel('Score ');
  const bestLabel = cachedLabel('Best ');
  const catchesLabel = cachedLabel('Orbs caught ');
  const bestComboLabel = cachedLabel('Best combo x');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    view.ratio = ratio;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    view.scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    view.x = (canvas.width - FIELD.width * view.scale) / 2;
    view.y = (canvas.height - FIELD.height * view.scale) / 2;
    backgroundGradient = context.createLinearGradient(0, 0, 0, FIELD.height);
    backgroundGradient.addColorStop(0, PALETTE.skyTop);
    backgroundGradient.addColorStop(1, PALETTE.skyBottom);
  }

  /** Convert a pointer clientX (CSS pixels) into a field coordinate. */
  function toFieldX(clientX) {
    return (clientX * view.ratio - view.x) / view.scale;
  }

  function shake(amount) {
    shakeMagnitude = Math.max(shakeMagnitude, amount);
  }

  function updateShake(dt) {
    shakeMagnitude = Math.max(0, shakeMagnitude - dt * 46);
  }

  function text(value, x, y, size, color, align, weight = 600) {
    context.font = `${weight} ${size}px ${FONT}`;
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function drawBackground(state) {
    context.fillStyle = backgroundGradient;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    for (const star of stars) {
      const twinkle = 0.45 + 0.55 * Math.abs(Math.sin(state.elapsed * 0.7 + star.phase));
      context.globalAlpha = twinkle * 0.8;
      context.fillStyle = '#cdd8ff';
      context.fillRect(star.x, star.y, star.size, star.size);
    }
    context.globalAlpha = 1;
    context.fillStyle = PALETTE.ground;
    context.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
    context.fillStyle = PALETTE.groundLine;
    context.fillRect(0, FIELD.groundY, FIELD.width, 3);
  }

  function drawOrb(orb) {
    if (orb.kind === KIND_SHARD) {
      context.save();
      context.translate(orb.x, orb.y);
      context.rotate(orb.spin);
      context.fillStyle = '#232946';
      context.strokeStyle = PALETTE.danger;
      context.lineWidth = 2.5;
      context.beginPath();
      const spikes = 8;
      for (let index = 0; index < spikes * 2; index += 1) {
        const radius = index % 2 === 0 ? orb.r : orb.r * 0.55;
        const angle = (Math.PI / spikes) * index;
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;
        if (index === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
      }
      context.closePath();
      context.fill();
      context.stroke();
      context.fillStyle = PALETTE.danger;
      context.beginPath();
      context.arc(0, 0, 4.5, 0, Math.PI * 2);
      context.fill();
      context.restore();
      return;
    }
    if (orb.kind === KIND_STAR) {
      context.save();
      context.translate(orb.x, orb.y);
      context.rotate(Math.sin(orb.spin) * 0.35);
      context.shadowColor = '#ffe9a8';
      context.shadowBlur = 22;
      context.fillStyle = PALETTE.starCore;
      drawFacetShape(context, 'diamond', 0, 0, orb.r * 0.95);
      context.shadowBlur = 0;
      context.fillStyle = PALETTE.star;
      drawFacetShape(context, 'diamond', 0, 0, orb.r * 0.5);
      context.restore();
      return;
    }
    const facet = FACETS[orb.facet];
    context.save();
    context.shadowColor = facet.fill;
    context.shadowBlur = 18;
    context.fillStyle = facet.fill;
    context.beginPath();
    context.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = 'rgba(255, 255, 255, 0.28)';
    context.beginPath();
    context.arc(orb.x - orb.r * 0.32, orb.y - orb.r * 0.36, orb.r * 0.42, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#10142e';
    drawFacetShape(context, facet.shape, orb.x, orb.y, orb.r * 0.52);
    context.restore();
  }

  function drawCatcher(state) {
    const player = state.player;
    const facet = FACETS[player.facet];
    const centreX = player.x + player.width / 2;
    const topY = player.y;
    context.save();
    context.translate(centreX, topY + player.height / 2);
    context.rotate(player.tilt);
    context.translate(-centreX, -(topY + player.height / 2));
    // The hull: a wide shallow bowl.
    context.fillStyle = '#2a3565';
    context.beginPath();
    context.moveTo(player.x, topY + 10);
    context.lineTo(player.x + player.width, topY + 10);
    context.lineTo(player.x + player.width - 18, topY + player.height);
    context.lineTo(player.x + 18, topY + player.height);
    context.closePath();
    context.fill();
    // The active facet plate, glowing in its colour.
    context.shadowColor = facet.fill;
    context.shadowBlur = 20;
    context.fillStyle = facet.fill;
    context.fillRect(player.x - 4, topY - 4, player.width + 8, 15);
    context.shadowBlur = 0;
    context.fillStyle = '#10142e';
    drawFacetShape(context, facet.shape, centreX, topY + 3, 6.5);
    // Facet gems along the hull: the rotation order, the active one lit.
    const count = FACETS.length;
    for (let index = 0; index < count; index += 1) {
      const gx = centreX + (index - (count - 1) / 2) * 26;
      const gy = topY + player.height - 8;
      context.globalAlpha = index === player.facet ? 1 : 0.35;
      context.fillStyle = FACETS[index].fill;
      drawFacetShape(context, FACETS[index].shape, gx, gy, 6);
    }
    context.globalAlpha = 1;
    context.restore();
  }

  function drawHud(state) {
    context.textBaseline = 'top';
    text(scoreLabel(state.score), 26, 20, 30, PALETTE.text, 'left', 800);
    text(levelLabel(state.level), FIELD.width / 2, 64, 24, PALETTE.muted, 'center', 700);
    if (state.combo >= 2) {
      const pulse = 1 + Math.min(0.25, state.combo * 0.02);
      context.save();
      context.translate(FIELD.width / 2, 118);
      context.scale(pulse, pulse);
      text(comboLabel(state.combo), 0, -14, 27, '#ffc94d', 'center', 800);
      context.restore();
    }
    // Core progress: how much of the 1,000 the player has mended.
    const barWidth = 380;
    const barX = (FIELD.width - barWidth) / 2;
    context.fillStyle = 'rgba(255, 255, 255, 0.14)';
    context.fillRect(barX, 26, barWidth, 16);
    const fill = Math.min(1, state.score / TARGET_SCORE);
    const gradient = context.createLinearGradient(barX, 0, barX + barWidth, 0);
    gradient.addColorStop(0, '#2de2c5');
    gradient.addColorStop(0.55, '#ffc94d');
    gradient.addColorStop(1, '#ff5d73');
    context.fillStyle = gradient;
    context.fillRect(barX, 26, barWidth * fill, 16);
    text('CORE', FIELD.width / 2, 46, 15, PALETTE.muted, 'center', 700);
    // Lives as prism gems, lit or dark.
    for (let life = 0; life < START_LIVES; life += 1) {
      const gx = FIELD.width - 34 - life * 36;
      context.globalAlpha = life < state.lives ? 1 : 0.22;
      context.fillStyle = '#ff5d73';
      drawFacetShape(context, 'diamond', gx, 36, 13);
    }
    context.globalAlpha = 1;
  }

  function drawPanel(title, titleColor, lines, prompt, elapsed, extraHeight = 0) {
    const lineHeight = 35;
    const height = 150 + lines.length * lineHeight + 74 + extraHeight;
    const x = (FIELD.width - PANEL_WIDTH) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(x, y, PANEL_WIDTH, height, 18);
    context.fill();
    context.stroke();
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 84, 52, titleColor, 'center', 800);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      text(line.text, FIELD.width / 2, y + 138 + index * lineHeight, line.size ?? 22, line.color ?? PALETTE.muted, 'center', line.weight ?? 600);
    }
    const blink = 0.55 + 0.45 * Math.sin(elapsed * 3.2);
    context.globalAlpha = blink;
    text(prompt, FIELD.width / 2, y + height - 30, 24, '#ffc94d', 'center', 800);
    context.globalAlpha = 1;
    return { x, y, width: PANEL_WIDTH, height };
  }

  function drawFacetLegend(y) {
    const count = FACETS.length;
    const spacing = 128;
    const startX = FIELD.width / 2 - ((count - 1) * spacing) / 2;
    for (let index = 0; index < count; index += 1) {
      const facet = FACETS[index];
      context.fillStyle = facet.fill;
      context.beginPath();
      context.arc(startX + index * spacing, y, 17, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#10142e';
      drawFacetShape(context, facet.shape, startX + index * spacing, y, 9);
      text(facet.name, startX + index * spacing, y + 34, 16, PALETTE.muted, 'center', 700);
    }
  }

  const TITLE_LINES = [
    { text: 'Falling light is breaking the Core. Catch each orb with the', size: 21 },
    { text: 'facet that matches its colour and shape — reach 1,000 to mend it.', size: 21 },
    { text: 'Wrong facet, a dropped orb or a caught void shard costs a life.', size: 21, color: '#ffb3c0' },
    { text: 'Move  ← → · A D · Mouse      Rotate facet  SPACE · Click · Q / E', size: 20, color: PALETTE.text },
    { text: 'Pick a facet directly with 1–4 · Pause P · Mute M', size: 20, color: PALETTE.text },
  ];

  function drawTitle(state, best) {
    const panel = drawPanel('PRISM DRIFT', '#f4f6ff', TITLE_LINES, 'Press SPACE or click to start', state.elapsed, 62);
    drawFacetLegend(panel.y + 138 + TITLE_LINES.length * 35 + 24);
    if (best > 0) {
      context.textBaseline = 'alphabetic';
      text(bestLabel(best), FIELD.width / 2, panel.y + panel.height + 38, 22, '#2de2c5', 'center', 700);
    }
  }

  function draw(state, screen, opts) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const shakeX = shakeMagnitude > 0 ? (Math.random() * 2 - 1) * shakeMagnitude : 0;
    const shakeY = shakeMagnitude > 0 ? (Math.random() * 2 - 1) * shakeMagnitude : 0;
    context.setTransform(view.scale, 0, 0, view.scale, view.x + shakeX * view.scale, view.y + shakeY * view.scale);

    drawBackground(state);
    for (const orb of state.orbs) if (orb.active) drawOrb(orb);
    drawCatcher(state);
    if (opts.particles) opts.particles.draw(context);

    if (screen === SCREEN_TITLE) {
      drawTitle(state, opts.best);
      return;
    }
    drawHud(state);
    if (opts.banner && opts.banner.alpha > 0) {
      context.globalAlpha = opts.banner.alpha;
      context.textBaseline = 'middle';
      text(opts.banner.title, FIELD.width / 2, 196, 46, '#f4f6ff', 'center', 800);
      if (opts.banner.sub) text(opts.banner.sub, FIELD.width / 2, 240, 23, '#ffc94d', 'center', 700);
      context.globalAlpha = 1;
    }
    if (screen === SCREEN_PAUSED) {
      drawPanel('PAUSED', '#f4f6ff', [{ text: 'The drift will wait for you.', size: 22 }], 'Press P to resume', state.elapsed);
    } else if (screen === SCREEN_OVER) {
      drawPanel('PRISM SHATTERED', '#ff5470', [
        { text: finalScoreLabel(state.score), size: 30, color: PALETTE.text, weight: 800 },
        { text: bestLabel(opts.best), size: 22 },
        { text: catchesLabel(state.catches), size: 22 },
        { text: bestComboLabel(state.bestCombo), size: 22 },
      ], 'Press SPACE or click to play again', state.elapsed);
    } else if (screen === SCREEN_WIN) {
      drawPanel('CORE RESTORED!', '#2de2c5', [
        { text: 'You mended the Core with light to spare.', size: 22, color: PALETTE.text },
        { text: finalScoreLabel(state.score), size: 30, color: PALETTE.text, weight: 800 },
        { text: bestLabel(opts.best), size: 22 },
        { text: catchesLabel(state.catches), size: 22 },
        { text: bestComboLabel(state.bestCombo), size: 22 },
      ], 'Press SPACE or click to play again', state.elapsed);
    }
    if (opts.muted) {
      context.textBaseline = 'bottom';
      text('MUTED (M)', FIELD.width - 24, FIELD.height - 14, 16, PALETTE.muted, 'right', 700);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, toFieldX, shake, updateShake };
}
