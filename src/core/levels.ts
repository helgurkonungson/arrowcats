import { GenParams, generateLevel } from './generator';
import { Board } from './board';
import { hashStr } from './rng';
import { Cat, Level } from './types';

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const COMMON = 8;
const RARE_FIRST = 8;

type Raw = [number, number][];
const cats = (list: { b: number; c: Raw }[]): Cat[] =>
  list.map((k, id) => ({ id, breed: k.b, cells: k.c.map(([x, y]) => ({ x, y })) }));

/** Handcrafted tutorial levels. */
const TUTORIAL: Level[] = [
  {
    id: 'L1', w: 5, h: 6, boxes: [],
    cats: cats([
      { b: 0, c: [[1, 2], [1, 3], [1, 4]] },
      { b: 1, c: [[3, 3], [3, 2]] },
    ]),
  },
  {
    id: 'L2', w: 5, h: 6, boxes: [],
    cats: cats([
      { b: 0, c: [[2, 3], [2, 4], [2, 5]] },
      { b: 0, c: [[0, 1], [1, 1], [2, 1]] },
      { b: 1, c: [[4, 2], [4, 3]] },
    ]),
  },
  {
    id: 'L3', w: 5, h: 6, boxes: [],
    cats: cats([
      { b: 0, c: [[2, 3], [2, 4], [2, 5]] },
      { b: 0, c: [[3, 2], [2, 2], [1, 2]] },
      { b: 1, c: [[4, 3], [4, 2], [4, 1]] },
      { b: 1, c: [[0, 4], [1, 4]] },
      { b: 0, c: [[0, 0], [1, 0]] },
    ]),
  },
];

export const TUTORIAL_COUNT = TUTORIAL.length;
export const isHard = (n: number) => n > TUTORIAL_COUNT && n % 10 === 0;
export const rareFor = (k: number) => RARE_FIRST + (k % 4);

/**
 * Level where each common breed first appears (index = breed). 2026-11-16 playtest: the home set was
 * complete after level 3 and the street set after one daily; now home completes at 18, street at 75.
 */
export const BREED_AT = [1, 1, 8, 18, 30, 45, 60, 75];
export const breedsAt = (n: number) => BREED_AT.map((at, b) => (at <= n ? b : -1)).filter((b) => b >= 0);

/** Lesson levels (one mechanic per level, core/tutorial.ts). */
export const LESSON = { fewFree: 3, hint: 4, sleepy: 5, feed: 6, boxes: 9 } as const;

/** Sleepy lesson: exactly one sleepy cat, and it is a cat that can leave right away. */
function makeSleepyLesson(lv: Level) {
  for (const c of lv.cats) c.sleepy = false;
  const id = new Board(lv).freeCats()[0];
  const c = lv.cats.find((x) => x.id === id);
  if (c) c.sleepy = true;
}

export function levelParams(n: number): GenParams {
  const tier = Math.max(0, n - 4);
  const hard = isHard(n);
  const saw = [0, 1, 2, -1][tier % 4];
  // tuned 2026-11-16 after playtest "too easy": bigger boards sooner, denser, longer bent cats,
  // and `tangle` makes each new cat block cats that are still free (few exits visible at a time)
  // 2026-11-16 (2nd playtest): arrows games go big fast once the rules are learned – about 10×11 by
  // level 10 and the full 11×14 by level ~14; later levels breathe with the saw (−1 column) and get
  // harder through tangle and depth. 11×14 still gives ~61 px cells on the 720-wide screen.
  // 2026-11-16 (4th playtest): difficulty grows even faster – 11×14 and the 1-cat chain from level 11
  // (levels 4–6 are the booster/sleepy lessons and keep 3 free cats)
  const breath = saw < 0 && tier > 8 ? 1 : 0;
  return {
    w: clamp(8 + Math.floor(tier * 0.6) - breath, 6, 11),
    h: clamp(9 + Math.floor(tier * 0.8) - 2 * breath, 8, 14),
    fill: clamp(0.7 + tier * 0.006 + saw * 0.03 + (hard ? 0.06 : 0), 0.6, 0.94),
    minLen: 2,
    maxLen: clamp(4 + Math.floor(tier / 8), 4, 9),
    turn: clamp(0.3 + tier * 0.006, 0.3, 0.55),
    tangle: clamp(0.5 + tier * 0.06 + (hard ? 0.3 : 0), 0.5, 1),
    // mechanics arrive with their lessons (core/tutorial.ts): sleepy cats at 5, boxes at 9
    boxes: n === LESSON.boxes ? 2 : n > LESSON.boxes && n % 3 === 0 ? 1 + (n % 2) : 0,
    sleepy: n > LESSON.sleepy + 1 ? 0.06 : 0,
    breeds: breedsAt(n),
    depth: clamp(3 + Math.floor(tier / 2) + saw + (hard ? 4 : 0), 2, 22),
    // only a few cats may be free at once: 3 while learning, 2 on 7–10, then 1 (a chain where each
    // exit opens the next). Breathers allow one more, hard levels are strict.
    maxFree: hard ? 1 : clamp((tier < 3 ? 3 : tier < 7 ? 2 : 1) + (saw < 0 ? 1 : 0), 1, 3),
  };
}

const cache = new Map<string, Level>();

export function getLevel(n: number): Level {
  if (n <= TUTORIAL_COUNT) return TUTORIAL[n - 1];
  const key = 'L' + n;
  let lv = cache.get(key);
  if (!lv) {
    lv = generateLevel(hashStr('lvl' + n), levelParams(n), key);
    lv.hard = isHard(n);
    if (n === LESSON.sleepy) makeSleepyLesson(lv);
    // a new breed shows up on the level where it is introduced
    const nb = BREED_AT.indexOf(n);
    if (nb >= 0 && !lv.cats.some((c) => c.breed === nb)) lv.cats[lv.cats.length - 1].breed = nb;
    cache.set(key, lv);
  }
  return lv;
}

/** 'YYYY-MM-DD' in UTC */
export function utcDate(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

const DAILY_EPOCH = Date.UTC(2026, 10, 15);
export const dailyNumber = (date: string) =>
  Math.max(1, Math.round((Date.parse(date + "T00:00:00Z") - DAILY_EPOCH) / 86400000) + 1);

export function getDaily(date: string): Level {
  const key = 'D' + date;
  let lv = cache.get(key);
  if (!lv) {
    // daily uses the home set only and never unlocks breeds (collection comes from levels and visitors)
    const p = { ...levelParams(35), sleepy: 0.1, breeds: [0, 1, 2, 3] };
    lv = generateLevel(hashStr('daily' + date), p, key);
    cache.set(key, lv);
  }
  return lv;
}
