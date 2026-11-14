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

  while (filled < target && fails < 600) {
    const x = randInt(r, 0, w - 1);
    const y = randInt(r, 0, h - 1);
    if (occ[idx(x, y)] !== -1) {
      fails++;
      continue;
    }
    let made: Cell[] | null = null;
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
      if (cells.length >= p.minLen) {
        made = cells;
        break;
      }
    }
    if (!made) {
      fails++;
      continue;
    }
    const cid = cats.length;
    for (const c of made) occ[idx(c.x, c.y)] = cid;
    cats.push({
      id: cid,
      cells: made,
      breed: p.breeds[Math.floor(r() * p.breeds.length)],
      sleepy: made.length >= 3 && r() < p.sleepy,
    });
    filled += made.length;
  }
  if (p.rare !== undefined && cats.length) cats[Math.floor(r() * cats.length)].breed = p.rare;
  return { id, w, h, cats, boxes };
}

/** Builds several candidates and keeps the one closest to the target depth. */
export function generateLevel(seed: number, p: GenParams, id: string): Level {
  let best: Level | null = null;
  let bestScore = -Infinity;
  for (let i = 0; i < 6; i++) {
    const lv = generateOnce(seed + i * 7919, p, id);
    const m = metrics(lv);
    if (!m.solvable || m.cats < 2) continue;
    const score = -Math.abs(m.depth - p.depth) * 10 + m.fill * 5 - m.narrow * 0.5;
    if (score > bestScore) {
      bestScore = score;
      best = lv;
    }
  }
  return best ?? generateOnce(seed, p, id);
}
