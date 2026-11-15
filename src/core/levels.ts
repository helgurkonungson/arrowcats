import { GenParams, generateLevel } from './generator';
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
      { b: 2, c: [[2, 3], [2, 4], [2, 5]] },
      { b: 0, c: [[0, 1], [1, 1], [2, 1]] },
      { b: 1, c: [[4, 2], [4, 3]] },
    ]),
  },
  {
    id: 'L3', w: 5, h: 6, boxes: [],
    cats: cats([
      { b: 2, c: [[2, 3], [2, 4], [2, 5]] },
      { b: 0, c: [[3, 2], [2, 2], [1, 2]] },
      { b: 1, c: [[4, 3], [4, 2], [4, 1]] },
      { b: 3, c: [[0, 4], [1, 4]] },
      { b: 0, c: [[0, 0], [1, 0]] },
    ]),
  },
];

export const TUTORIAL_COUNT = TUTORIAL.length;
export const isHard = (n: number) => n > TUTORIAL_COUNT && n % 10 === 0;
export const rareFor = (k: number) => RARE_FIRST + (k % 4);

export function levelParams(n: number): GenParams {
  const tier = Math.max(0, n - 4);
  const hard = isHard(n);
  const saw = [0, 1, 2, -1][tier % 4];
  return {
    w: clamp(5 + Math.floor(tier / 15), 5, 10),
    h: clamp(6 + Math.floor(tier / 12), 6, 13),
    fill: clamp(0.55 + tier * 0.004 + saw * 0.03 + (hard ? 0.08 : 0), 0.5, 0.92),
    minLen: 2,
    maxLen: clamp(3 + Math.floor(tier / 20), 3, 8),
    turn: clamp(0.15 + tier * 0.003, 0.15, 0.45),
    boxes: n >= 40 && n % 3 === 0 ? 1 + (n % 2) : 0,
    sleepy: n === 25 ? 0.3 : n > 25 ? 0.08 : 0,
    breeds: Array.from({ length: clamp(3 + Math.floor(n / 6), 3, COMMON) }, (_, i) => i),
    rare: hard ? rareFor(n / 10 - 1) : undefined,
    depth: clamp(2 + Math.floor(tier / 10) + saw + (hard ? 2 : 0), 1, 12),
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
    const num = dailyNumber(date);
    const p = { ...levelParams(35), sleepy: 0.1, breeds: [...Array(COMMON).keys()], rare: rareFor(num) };
    lv = generateLevel(hashStr('daily' + date), p, key);
    cache.set(key, lv);
  }
  return lv;
}
