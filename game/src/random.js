// Prism Drift — a tiny seeded random generator (mulberry32). A fixed seed always produces the
// same stream, which is what makes the screenshot scenes and the play-tests reproducible: the
// live game seeds it from the clock, a staged scene seeds it from the page's ?seed= value.

export function createRandom(seed) {
  let state = seed >>> 0;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
