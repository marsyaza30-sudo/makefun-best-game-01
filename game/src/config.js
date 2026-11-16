// Prism Drift — shared tuning: the field, the catcher, the facet colours, scoring and level
// pacing. Every other module reads its numbers from here, so the game's balance lives in one
// place and the rest of the code stays free of magic numbers.

export const FIELD = { width: 1280, height: 720, groundY: 652 };

export const CATCHER = { width: 148, height: 36, speed: 800, y: 604 };

export const START_LIVES = 3;
export const TARGET_SCORE = 1000;
export const LEVEL_EVERY = 150;
export const MAX_LEVEL = 10;

export const CATCH_POINTS = 10;
export const STAR_POINTS = 50;
export const DODGE_POINTS = 5;
export const COMBO_BONUS_CAP = 20;

// The prism's facets. Three are open from the start; Violet joins at level 3 and widens the
// matching problem just as the fall speeds up. Each facet owns a shape as well as a colour, so
// a falling orb can be matched by either cue.
export const FACETS = [
  { id: 'coral', name: 'Coral', fill: '#ff5d73', soft: '#ffb3c0', shape: 'triangle' },
  { id: 'teal', name: 'Teal', fill: '#2de2c5', soft: '#b0fff2', shape: 'circle' },
  { id: 'gold', name: 'Gold', fill: '#ffc94d', soft: '#ffe9b0', shape: 'diamond' },
  { id: 'violet', name: 'Violet', fill: '#a78bfa', soft: '#ddd0ff', shape: 'hexagon' },
];

export const VIOLET_UNLOCK_LEVEL = 3;

export const ORB_RADIUS = 23;
export const SHARD_RADIUS = 21;
export const POOL_SIZE = 42;

export const PALETTE = {
  backdrop: '#070a1a',
  skyTop: '#0b1030',
  skyBottom: '#1d1247',
  ground: '#131a3a',
  groundLine: '#3d5a99',
  text: '#f4f6ff',
  muted: '#9aa7d0',
  panel: 'rgba(12, 17, 44, 0.93)',
  panelEdge: '#4a5aa8',
  danger: '#ff5470',
  star: '#ffffff',
  starCore: '#ffe9a8',
};

export const FONT = 'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
export const BEST_KEY = 'prism-drift-best-v1';
export const STEP = 1 / 60;
