import { describe, expect, it } from 'vitest';
import { Board, headDir } from '../src/core/board';
import { generateOnce } from '../src/core/generator';
import { getDaily, getLevel, levelParams } from '../src/core/levels';
import { migrate, defaultSave } from '../src/core/save';
import { metrics, solve } from '../src/core/solver';
import { Level } from '../src/core/types';

const lv = (cats: [number, number][][]): Level => ({
  id: 't', w: 4, h: 4, boxes: [],
  cats: cats.map((c, id) => ({ id, breed: 0, cells: c.map(([x, y]) => ({ x, y })) })),
});

describe('board', () => {
  it('detects head direction and blockers', () => {
    const l = lv([[[1, 1], [1, 2]], [[0, 0], [1, 0], [2, 0]]]);
    const b = new Board(l);
    expect(headDir(b.cats.get(0)!)).toBe(0);
    expect(b.check(0)).toEqual({ free: false, steps: 0, blocker: 1 });
    expect(b.check(1).free).toBe(true);
    b.remove(1);
    expect(b.check(0)).toEqual({ free: true, steps: 1, blocker: -1 });
  });

  it('solver finds deadlock', () => {
    // two cats facing each other on one row
    const l = lv([[[1, 0], [0, 0]], [[2, 0], [3, 0]]]);
    expect(solve(l).solvable).toBe(false);
  });
});

describe('levels', () => {
  it('first 300 levels are solvable, valid and deterministic', () => {
    for (let n = 1; n <= 300; n++) {
      const l = getLevel(n);
      const m = metrics(l);
      expect(m.solvable, `level ${n}`).toBe(true);
      expect(m.cats).toBeGreaterThanOrEqual(2);
      const seen = new Set<number>();
      for (const c of l.cats)
        for (const p of c.cells) {
          const k = p.y * l.w + p.x;
          expect(seen.has(k)).toBe(false);
          seen.add(k);
          expect(p.x >= 0 && p.y >= 0 && p.x < l.w && p.y < l.h).toBe(true);
        }
    }
    const p = levelParams(50);
    expect(generateOnce(123, p, 'a')).toEqual(generateOnce(123, p, 'a'));
  });

  it('daily levels are solvable', () => {
    for (let d = 0; d < 60; d++) {
      const date = new Date(Date.UTC(2026, 10, 15 + d)).toISOString().slice(0, 10);
      expect(solve(getDaily(date)).solvable).toBe(true);
    }
  });
});

describe('save', () => {
  it('migrates garbage and partial saves', () => {
    expect(migrate(null)).toEqual(defaultSave());
    const s = migrate({ level: 7, cafe: [[2]] });
    expect(s.level).toBe(7);
    expect(s.cafe[0][0]).toBe(2);
    expect(s.cafe[0][1]).toBe(-1);
  });
});
