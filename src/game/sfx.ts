/**
 * Sound: generated audio files from public/audio (listed in manifest.json) with
 * procedural fallbacks, so the game always has sound even before files exist.
 */
let ctx: AudioContext | null = null;
let muted = false; // effective: player toggle or forced by the platform (ads, portal setting)
let userMuted = false;
let forcedMuted = false;
// browsers only allow audio after a user gesture
let unlocked = false;
const buffers = new Map<string, AudioBuffer>();
let musicSrc: AudioBufferSourceNode | null = null;
let musicWanted: string | null = null;
const BASE = `${import.meta.env.BASE_URL}audio/`;

if (typeof window !== 'undefined')
  window.addEventListener('pointerdown', () => {
    if (!unlocked) {
      unlocked = true;
      void loadAudio();
    }
    if (ctx?.state === 'suspended') void ctx.resume();
  });

function applyMute() {
  const m = userMuted || forcedMuted;
  if (m === muted) return;
  muted = m;
  if (m) {
    stopMusic();
    if (ctx?.state === 'running') void ctx.suspend();
  } else {
    if (ctx?.state === 'suspended') void ctx.resume();
    if (musicWanted) playMusic(musicWanted);
  }
}

/** Player's sound toggle. */
export const setMuted = (m: boolean) => {
  userMuted = m;
  applyMute();
};

/** Platform mute (during ads, or a portal "mute audio" setting); wins over the player's toggle. */
export const setForcedMute = (m: boolean) => {
  forcedMuted = m;
  applyMute();
};

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

/** Loads every file named in audio/manifest.json (names without extension). */
async function loadAudio() {
  const c = ac();
  if (!c) return;
  try {
    const res = await fetch(BASE + 'manifest.json');
    if (!res.ok) return;
    const names: string[] = await res.json();
    await Promise.all(
      names.map(async (n) => {
        try {
          const r = await fetch(`${BASE}${n}.mp3`);
          if (r.ok) buffers.set(n, await c.decodeAudioData(await r.arrayBuffer()));
        } catch {
          /* missing or broken file: procedural fallback */
        }
      }),
    );
    if (musicWanted) playMusic(musicWanted);
  } catch {
    /* no manifest yet */
  }
}

/** Plays a random variant `name_1..name_N` (or `name`) if loaded. */
function file(name: string, vol = 0.8, rate = 1): boolean {
  const c = ac();
  if (!c) return true; // muted or locked: play nothing, no fallback either
  const variants = [...buffers.keys()].filter((k) => k === name || k.startsWith(name + '_'));
  if (!variants.length) return false;
  const src = c.createBufferSource();
  src.buffer = buffers.get(variants[Math.floor(Math.random() * variants.length)])!;
  src.playbackRate.value = rate;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(g).connect(c.destination);
  src.start();
  return true;
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

/** Loops a music file if it exists; remembered so it starts once files load or sound is unmuted. */
export function playMusic(name: string) {
  musicWanted = name;
  const c = ac();
  const buf = buffers.get(name);
  if (!c || !buf || musicSrc?.buffer === buf) return;
  stopMusic();
  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.3, c.currentTime + 1.5);
  src.connect(g).connect(c.destination);
  src.start();
  musicSrc = src;
}

export function stopMusic() {
  try {
    musicSrc?.stop();
  } catch {
    /* already stopped */
  }
  musicSrc = null;
}

const seq = (notes: number[], step: number, type: OscillatorType, vol: number) =>
  notes.forEach((f, i) => tone(f, f * 0.98, step * 1.6, type, vol, i * step));

export const sfx = {
  click: () => file('ui_click', 0.5) || tone(900, 700, 0.06, 'triangle', 0.08),
  meow: (pitch = 1) =>
    file('meow', 0.7, pitch) ||
    (tone(520 * pitch, 820 * pitch, 0.12, 'sawtooth', 0.06), tone(820 * pitch, 430 * pitch, 0.25, 'triangle', 0.1, 0.1)),
  slide: () => file('slide', 0.35),
  purr: () => file('purr', 0.7) || tone(70, 55, 0.35, 'sawtooth', 0.05),
  bonk: () => file('bonk', 0.8) || (tone(180, 60, 0.18, 'square', 0.12), tone(1200, 300, 0.2, 'sawtooth', 0.04, 0.05)),
  wake: () => file('wake', 0.7) || tone(300, 600, 0.2, 'sine', 0.1),
  coin: () => file('coin', 0.5) || tone(1300, 1800, 0.08, 'square', 0.05),
  combo: (n: number) => file('combo', 0.6, Math.min(1.6, 1 + n * 0.08)) || tone(900 + n * 80, 1400 + n * 80, 0.12, 'triangle', 0.08),
  star: () => file('star', 0.7) || tone(1000, 1600, 0.2, 'sine', 0.1),
  task: () => file('task', 0.7) || tone(600, 900, 0.15, 'triangle', 0.1),
  scene: () => file('scene', 0.5),
  chest: () => file('chest', 0.8) || seq([660, 880, 1320], 0.08, 'triangle', 0.1),
  tips: () => file('tips', 0.7) || tone(1500, 2000, 0.1, 'square', 0.05),
  win: () => file('win', 0.7) || seq([523, 659, 784, 1046], 0.1, 'triangle', 0.12),
  lose: () => file('lose', 0.7) || seq([392, 330, 262], 0.15, 'triangle', 0.1),
};
