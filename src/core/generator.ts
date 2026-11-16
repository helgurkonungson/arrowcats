import { mulberry32, randInt, shuffle } from './rng';
import { metrics } from './solver';
import { Cat, Cell, Dir, DX, DY, Level } from './types';

export interface GenParams {
  w: number;
  h: number;
  fill: number;
  minLen: number;
  maxLen: number;
  /** chance to turn on each body step */
  turn: number;
  boxes: number;
  sleepy: number;
  breeds: number[];
  rare?: number;
  /** target number of greedy waves */
  depth: number;
  /** 0..1: how hard placement tries to block cats that are still free (tangled, few exits at a time) */
  tangle?: number;
}

/**
 * Reverse construction: every new cat gets a head direction whose exit path is clear
 * of all cats placed before it. Removing cats in reverse placement order always works.
 */
export function generateOnce(seed: number, p: GenParams, id: string): Level {
  const r = mulberry32(seed);
  const { w, h } = p;
  const occ = new Int32Array(w * h).fill(-1);
  const idx = (x: number, y: number) => y * w + x;
  const inb = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h;

  const boxes: Cell[] = [];
  for (let t = 0; boxes.length < p.boxes && t < 50; t++) {
    const x = randInt(r, 1, w - 2);
    const y = randInt(r, 1, h - 2);
    if (occ[idx(x, y)] === -1) {
      occ[idx(x, y)] = -2;
      boxes.push({ x, y });
    }
  }

  const cats: Cat[] = [];
  const target = Math.floor(p.fill * w * h);
  let filled = boxes.length;
  let fails = 0;

  // exit lanes of placed cats: cell -> cats whose way out crosses it; blocked[c] = cats sitting in c's lane
  const laneOf = new Map<number, number[]>();
  const blocked: number[] = [];

  /** One random cat with its head at (x, y), or null. */
  const tryCat = (x: number, y: number): { cells: Cell[]; lane: number[] } | null => {
    for (const d of shuffle(r, [0, 1, 2, 3] as Dir[])) {
      const path = new Set<number>();
      let px = x + DX[d];
      let py = y + DY[d];
      let ok = true;
      while (inb(px, py)) {
        if (occ[idx(px, py)] !== -1) {
          ok = false;
          break;
        }
        path.add(idx(px, py));
        px += DX[d];
        py += DY[d];
      }
      if (!ok) continue;
      const bx = x - DX[d];
      const by = y - DY[d];
      if (!inb(bx, by) || occ[idx(bx, by)] !== -1) continue;

      const len = randInt(r, p.minLen, p.maxLen);
      const cells: Cell[] = [{ x, y }, { x: bx, y: by }];
      const used = new Set([idx(x, y), idx(bx, by)]);
      let cx = bx;
      let cy = by;
      let md = d; // direction of travel along this body segment
      while (cells.length < len) {
        const perp = shuffle(r, [((md + 1) % 4) as Dir, ((md + 3) % 4) as Dir]);
        const order = r() < p.turn ? [...perp, md] : [md, ...perp];
        let moved = false;
        for (const nd of order) {
          const nx = cx - DX[nd];
          const ny = cy - DY[nd];
          const k = idx(nx, ny);
          if (!inb(nx, ny) || occ[k] !== -1 || used.has(k) || path.has(k)) continue;
          cells.push({ x: nx, y: ny });
          used.add(k);
          cx = nx;
          cy = ny;
          md = nd;
          moved = true;
          break;
        }
        if (!moved) break;
      }
      if (cells.length >= p.minLen) return { cells, lane: [...path] };
    }
    return null;
  };

  /** How many still-free cats this body would block (more = deeper, more tangled puzzle). */
  const blocksFree = (cells: Cell[]) => {
    const hit = new Set<number>();
    for (const c of cells) for (const o of laneOf.get(idx(c.x, c.y)) ?? []) if (!blocked[o]) hit.add(o);
    return hit.size;
  };

  const tries = Math.max(1, Math.round(1 + (p.tangle ?? 0) * 11));
  while (filled < target && fails < 1500) {
    let made: { cells: Cell[]; lane: number[] } | null = null;
    let bestScore = -1;
    for (let t = 0; t < tries; t++) {
      const x = randInt(r, 0, w - 1);
      const y = randInt(r, 0, h - 1);
      if (occ[idx(x, y)] !== -1) continue;
      const c = tryCat(x, y);
      if (!c) continue;
      // prefer blocking free cats, then longer bodies; random tie-break
      const score = blocksFree(c.cells) * 10 + c.cells.length + r();
      if (score > bestScore) {
        bestScore = score;
        made = c;
      }
    }
    if (!made) {
      fails++;
      continue;
    }
    const cid = cats.length;
    for (const c of made.cells) {
      const k = idx(c.x, c.y);
      occ[k] = cid;
      for (const o of laneOf.get(k) ?? []) blocked[o] = (blocked[o] ?? 0) + 1;
    }
    blocked[cid] = 0;
    for (const k of made.lane) laneOf.set(k, [...(laneOf.get(k) ?? []), cid]);
    cats.push({
      id: cid,
      cells: made.cells,
      breed: p.breeds[Math.floor(r() * p.breeds.length)],
      sleepy: made.cells.length >= 3 && r() < p.sleepy,
    });
    filled += made.cells.length;
  }
  if (p.rare !== undefined && cats.length) cats[Math.floor(r() * cats.length)].breed = p.rare;
  return { id, w, h, cats, boxes };
}

/** Builds several candidates and keeps the one closest to the target depth. */
export function generateLevel(seed: number, p: GenParams, id: string): Level {
  let best: Level | null = null;
  let bestScore = -Infinity;
  for (let i = 0; i < 10; i++) {
    const lv = generateOnce(seed + i * 7919, p, id);
    const m = metrics(lv);
    if (!m.solvable || m.cats < 2) continue;
    const score = -Math.abs(m.depth - p.depth) * 10 + m.fill * 5 - m.narrow * 0.5 - (m.first / m.cats) * 20;
    if (score > bestScore) {
      bestScore = score;
      best = lv;
    }
  }
  return best ?? generateOnce(seed, p, id);
}
