import { Board } from './board';
import { Level } from './types';

/** Greedy solver. Exact for this game because removing a cat never blocks another one. */
export function solve(level: Level) {
  const b = new Board(level);
  const waves: number[][] = [];
  while (b.count) {
    const free = b.freeCats();
    if (!free.length) return { solvable: false, waves };
    free.forEach((id) => b.remove(id));
    waves.push(free);
  }
  return { solvable: true, waves };
}

/**
 * A sleepy cat wakes only when a neighbour leaves, so a random sleeper can end up never waking.
 * Wakes (un-sleeps) the sleepers that block the greedy run; keeps every generated level solvable.
 */
export function fixSleepers(level: Level) {
  const b = new Board(level);
  while (b.count) {
    const free = b.freeCats();
    if (free.length) {
      free.forEach((id) => b.remove(id));
      continue;
    }
    const stuck = [...b.asleep].filter((id) => b.check(id).free);
    if (!stuck.length) return;
    for (const id of stuck) {
      b.asleep.delete(id);
      level.cats.find((c) => c.id === id)!.sleepy = false;
    }
  }
}

export function metrics(level: Level) {
  const s = solve(level);
  const cells = level.cats.reduce((n, c) => n + c.cells.length, 0);
  return {
    solvable: s.solvable,
    depth: s.waves.length,
    narrow: s.waves.length ? Math.min(...s.waves.map((w) => w.length)) : 0,
    /** cats free at the start: the fewer, the harder to spot a move */
    first: s.waves[0]?.length ?? 0,
    /** most cats free at one moment (greedy estimate of the worst play order): 1 = strict chain */
    peak: s.solvable ? peakFree(level) : 99,
    cats: level.cats.length,
    fill: (cells + level.boxes.length) / (level.w * level.h),
  };
}

/**
 * Most cats that are free at the same time. Freeness is monotone (removal never blocks), so the
 * player can push this up by first removing cats that unlock many others; we follow exactly that
 * greedy policy (remove the free cat whose removal leaves the most free cats) and keep the max.
 */
export function peakFree(level: Level) {
  const b = new Board(level);
  let peak = 0;
  while (b.count) {
    const free = b.freeCats();
    if (!free.length) break;
    peak = Math.max(peak, free.length);
    let best = free[0];
    let bestN = -1;
    for (const id of free) {
      const c = b.cats.get(id)!;
      const sleeping = new Set(b.asleep);
      b.remove(id);
      const n = b.freeCats().length;
      b.cats.set(id, c);
      b.asleep = sleeping;
      for (const p of c.cells) b.grid[p.y * b.w + p.x] = id;
      if (n > bestN) {
        bestN = n;
        best = id;
      }
    }
    b.remove(best);
  }
  return peak;
}
