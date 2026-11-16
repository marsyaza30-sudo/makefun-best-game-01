// Prism Drift — every sound is synthesized live with WebAudio oscillators: no audio files, no
// network, nothing to load. The context is created lazily on the first user gesture (browsers
// refuse one before that), and each effect is a short shaped tone or two, so a catch chirps
// higher as the combo climbs and a shatter drops like breaking glass.

export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;

  function unlock() {
    if (context !== null) {
      if (context.state === 'suspended') context.resume();
      return;
    }
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    context = new AudioCtor();
    master = context.createGain();
    master.gain.value = 0.16;
    master.connect(context.destination);
  }

  function tone(frequency, duration, options = {}) {
    if (context === null || muted) return;
    const type = options.type ?? 'sine';
    const volume = options.volume ?? 1;
    const slideTo = options.slideTo ?? null;
    const delay = options.delay ?? 0;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (slideTo !== null) oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), start + duration);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }

  function playCatch(combo) {
    const step = Math.min(combo, 12);
    const base = 520 * Math.pow(1.059, step);
    tone(base, 0.12, { type: 'triangle', volume: 0.8 });
    tone(base * 1.5, 0.1, { type: 'sine', volume: 0.5, delay: 0.03 });
  }

  function playStar() {
    tone(880, 0.1, { type: 'sine', volume: 0.7 });
    tone(1174, 0.1, { type: 'sine', volume: 0.7, delay: 0.06 });
    tone(1568, 0.16, { type: 'sine', volume: 0.7, delay: 0.12 });
  }

  function playCycle() {
    tone(340, 0.05, { type: 'square', volume: 0.25 });
  }

  function playHit() {
    tone(300, 0.28, { type: 'sawtooth', volume: 0.8, slideTo: 70 });
    tone(1400, 0.08, { type: 'square', volume: 0.3, slideTo: 300 });
  }

  function playMiss() {
    tone(220, 0.2, { type: 'triangle', volume: 0.6, slideTo: 110 });
  }

  function playDodge() {
    tone(660, 0.07, { type: 'sine', volume: 0.35, slideTo: 990 });
  }

  function playLevelUp() {
    tone(523, 0.1, { type: 'triangle', volume: 0.7 });
    tone(659, 0.1, { type: 'triangle', volume: 0.7, delay: 0.08 });
    tone(784, 0.18, { type: 'triangle', volume: 0.8, delay: 0.16 });
  }

  function playWin() {
    const notes = [523, 659, 784, 1046, 784, 1046, 1318];
    notes.forEach((note, index) => tone(note, 0.22, { type: 'triangle', volume: 0.75, delay: index * 0.11 }));
  }

  function playLose() {
    const notes = [392, 330, 262, 196];
    notes.forEach((note, index) => tone(note, 0.3, { type: 'triangle', volume: 0.7, delay: index * 0.16 }));
  }

  function playClick() {
    tone(740, 0.06, { type: 'sine', volume: 0.5 });
  }

  function toggleMute() {
    muted = !muted;
    return muted;
  }

  function isMuted() {
    return muted;
  }

  return {
    unlock,
    playCatch,
    playStar,
    playCycle,
    playHit,
    playMiss,
    playDodge,
    playLevelUp,
    playWin,
    playLose,
    playClick,
    toggleMute,
    isMuted,
  };
}
