/** Tiny procedural sound effects (no audio files needed for the prototype). */
let ctx: AudioContext | null = null;
let muted = false;
// browsers only allow audio after a user gesture
let unlocked = false;
if (typeof window !== 'undefined')
  window.addEventListener('pointerdown', () => {
    unlocked = true;
    if (ctx?.state === 'suspended') void ctx.resume();
  });

export const setMuted = (m: boolean) => (muted = m);

function ac(): AudioContext | null {
  if (muted || !unlocked) return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(f0: number, f1: number, dur: number, type: OscillatorType, vol = 0.15, delay = 0) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t0);
  o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

export const sfx = {
  click: () => tone(900, 700, 0.06, 'triangle', 0.08),
  meow: (pitch = 1) => {
    tone(520 * pitch, 820 * pitch, 0.12, 'sawtooth', 0.06);
    tone(820 * pitch, 430 * pitch, 0.25, 'triangle', 0.1, 0.1);
  },
  purr: () => tone(70, 55, 0.35, 'sawtooth', 0.05),
  bonk: () => {
    tone(180, 60, 0.18, 'square', 0.12);
    tone(1200, 300, 0.2, 'sawtooth', 0.04, 0.05);
  },
  wake: () => tone(300, 600, 0.2, 'sine', 0.1),
  coin: () => tone(1300, 1800, 0.08, 'square', 0.05),
  win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.18, 'triangle', 0.12, i * 0.1)),
  lose: () => [392, 330, 262].forEach((f, i) => tone(f, f * 0.95, 0.25, 'triangle', 0.1, i * 0.15)),
};
