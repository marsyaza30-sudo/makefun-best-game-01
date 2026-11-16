// Prism Drift — the juice: spark bursts, expanding catch rings and floating score text. One
// pooled system owns all three; the world never draws, it only reports what happened, and the
// game loop turns those reports into effects here. Nothing allocates in the hot loop beyond
// the fixed pools created up front.

import { FONT } from './config.js';

const MAX_SPARKS = 320;
const MAX_RINGS = 24;
const MAX_TEXTS = 32;

export function createParticles(random) {
  const sparks = [];
  const rings = [];
  const texts = [];
  for (let index = 0; index < MAX_SPARKS; index += 1) {
    sparks.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, ttl: 1, size: 2, color: '#ffffff' });
  }
  for (let index = 0; index < MAX_RINGS; index += 1) {
    rings.push({ active: false, x: 0, y: 0, life: 0, ttl: 1, color: '#ffffff' });
  }
  for (let index = 0; index < MAX_TEXTS; index += 1) {
    texts.push({ active: false, x: 0, y: 0, life: 0, ttl: 1, value: '', color: '#ffffff', size: 26 });
  }

  function burst(x, y, color, count = 16, power = 280) {
    let spawned = 0;
    for (const spark of sparks) {
      if (spawned >= count) break;
      if (spark.active) continue;
      const angle = random() * Math.PI * 2;
      const speed = power * (0.3 + random() * 0.7);
      spark.active = true;
      spark.x = x;
      spark.y = y;
      spark.vx = Math.cos(angle) * speed;
      spark.vy = Math.sin(angle) * speed - 90;
      spark.life = 0;
      spark.ttl = 0.4 + random() * 0.4;
      spark.size = 2 + random() * 3.5;
      spark.color = color;
      spawned += 1;
    }
  }

  function ring(x, y, color) {
    for (const item of rings) {
      if (item.active) continue;
      item.active = true;
      item.x = x;
      item.y = y;
      item.life = 0;
      item.ttl = 0.35;
      item.color = color;
      return;
    }
  }

  function floatText(x, y, value, color, size = 27) {
    for (const item of texts) {
      if (item.active) continue;
      item.active = true;
      item.x = x;
      item.y = y;
      item.life = 0;
      item.ttl = 0.95;
      item.value = value;
      item.color = color;
      item.size = size;
      return;
    }
  }

  function update(dt) {
    for (const spark of sparks) {
      if (!spark.active) continue;
      spark.life += dt;
      if (spark.life >= spark.ttl) {
        spark.active = false;
        continue;
      }
      spark.vy += 520 * dt;
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
    }
    for (const item of rings) {
      if (!item.active) continue;
      item.life += dt;
      if (item.life >= item.ttl) item.active = false;
    }
    for (const item of texts) {
      if (!item.active) continue;
      item.life += dt;
      if (item.life >= item.ttl) {
        item.active = false;
        continue;
      }
      item.y -= 46 * dt;
    }
  }

  function draw(context) {
    for (const item of rings) {
      if (!item.active) continue;
      const progress = item.life / item.ttl;
      context.globalAlpha = 1 - progress;
      context.strokeStyle = item.color;
      context.lineWidth = 3;
      context.beginPath();
      context.arc(item.x, item.y, 8 + progress * 52, 0, Math.PI * 2);
      context.stroke();
    }
    for (const spark of sparks) {
      if (!spark.active) continue;
      context.globalAlpha = 1 - spark.life / spark.ttl;
      context.fillStyle = spark.color;
      context.beginPath();
      context.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
      context.fill();
    }
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    for (const item of texts) {
      if (!item.active) continue;
      context.globalAlpha = 1 - item.life / item.ttl;
      context.font = `700 ${item.size}px ${FONT}`;
      context.fillStyle = item.color;
      context.fillText(item.value, item.x, item.y);
    }
    context.globalAlpha = 1;
  }

  function clear() {
    for (const spark of sparks) spark.active = false;
    for (const item of rings) item.active = false;
    for (const item of texts) item.active = false;
  }

  return { burst, ring, floatText, update, draw, clear };
}
