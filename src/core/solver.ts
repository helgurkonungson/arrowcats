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

export function metrics(level: Level) {
  const s = solve(level);
  const cells = level.cats.reduce((n, c) => n + c.cells.length, 0);
  return {
    solvable: s.solvable,
    depth: s.waves.length,
    narrow: s.waves.length ? Math.min(...s.waves.map((w) => w.length)) : 0,
    cats: level.cats.length,
    fill: (cells + level.boxes.length) / (level.w * level.h),
  };
}
